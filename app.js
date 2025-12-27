// ==================== GLOBAL STATE ====================
let testData = null;
let scoringRules = null;
let currentLevelIndex = 0;
let currentAudioIndex = 0;
let currentQuestionIndex = 0;
let scores = {};
let audioListenCounts = {};
let responseLog = [];
let questionStartTime = 0;
let totalQuestions = 0;
let currentAudioPlayer = null;
let audioProgressInterval = null;
let hasCompletedFirstListen = false;
let currentAudioTrackId = '';

// ==================== INITIALIZATION ====================

async function initTest() {
    try {
        console.log("Initializing test...");
        
        const qResponse = await fetch('data/questions.json');
        testData = await qResponse.json();
        console.log("Test data loaded:", testData.test_name);
        
        const sResponse = await fetch('data/scoring_rules.json');
        scoringRules = await sResponse.json();
        console.log("Scoring rules loaded");

        // Calculate total questions
        totalQuestions = testData.levels.reduce((total, level) => {
            return total + level.audios.reduce((audioTotal, audio) => {
                return audioTotal + audio.questions.length;
            }, 0);
        }, 0);
        console.log(`Total questions: ${totalQuestions}`);

        // Initialize scores for each level
        testData.levels.forEach(lvl => {
            scores[lvl.level_id] = { 
                correct: 0, 
                total: 0,
                totalListens: 0,
                totalTime: 0,
                questionsAnswered: 0
            };
        });

        // Set up event listeners
        document.getElementById('startBtn').addEventListener('click', startTest);
        document.getElementById('playBtn').addEventListener('click', playAudio);
        document.getElementById('nextBtn').addEventListener('click', handleAnswerSubmit);
        document.getElementById('exportJsonBtn').addEventListener('click', exportToJSON);
        document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
        document.getElementById('restartBtn').addEventListener('click', () => location.reload());
        
        // Modal event listeners
        document.getElementById('modalResumeBtn').addEventListener('click', resumeTest);
        document.getElementById('modalRestartBtn').addEventListener('click', restartTest);

        // Check for Session Resume
        const saved = sessionStorage.getItem('listeningTestProgress');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Show custom modal instead of browser confirm
            showResumeModal(data);
            
        } else {
            // No saved test - show welcome screen
            showScreen('welcome');
            document.getElementById('totalQuestionsDisplay').textContent = totalQuestions;
        }
        
        console.log("Initialization complete");
        
    } catch (err) {
        console.error("Initialization Error:", err);
        alert("Failed to load test data. Please check your data files.");
    }
}

// ==================== MODAL FUNCTIONS ====================

function showResumeModal(savedData) {
    const modal = document.getElementById('resumeModal');
    modal.style.display = 'flex';
    
    // Store the saved data for later use
    window.savedTestData = savedData;
}

function hideResumeModal() {
    const modal = document.getElementById('resumeModal');
    modal.style.display = 'none';
    window.savedTestData = null;
}

function resumeTest() {
    const data = window.savedTestData;
    if (!data) {
        hideResumeModal();
        showScreen('welcome');
        return;
    }
    
    currentLevelIndex = data.currentLevelIndex;
    currentAudioIndex = data.currentAudioIndex;
    currentQuestionIndex = data.currentQuestionIndex;
    scores = data.scores;
    audioListenCounts = data.audioListenCounts;
    responseLog = data.responseLog || [];
    currentAudioTrackId = data.currentAudioTrackId || '';
    hasCompletedFirstListen = data.hasCompletedFirstListen || false;
    
    hideResumeModal();
    showScreen('test');
    loadQuestion();
}

function restartTest() {
    // Clear session storage and start fresh
    sessionStorage.clear();
    hideResumeModal();
    
    // Reset all state variables
    currentLevelIndex = 0;
    currentAudioIndex = 0;
    currentQuestionIndex = 0;
    scores = {};
    audioListenCounts = {};
    responseLog = [];
    currentAudioTrackId = '';
    hasCompletedFirstListen = false;
    
    // Reinitialize scores
    testData.levels.forEach(lvl => {
        scores[lvl.level_id] = { 
            correct: 0, 
            total: 0,
            totalListens: 0,
            totalTime: 0,
            questionsAnswered: 0
        };
    });
    
    showScreen('welcome');
    document.getElementById('totalQuestionsDisplay').textContent = totalQuestions;
}

// ==================== CORE FUNCTIONS ====================

function startTest() {
    console.log("Starting test...");
    showScreen('test');
    loadQuestion();
}

function loadQuestion() {
    // Stop any currently playing audio
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer = null;
    }
    
    // Clear progress interval
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
        audioProgressInterval = null;
    }
    
    // Reset audio progress bar
    document.getElementById('audioProgressFill').style.width = '0%';
    document.getElementById('audioCurrentTime').textContent = '0:00';
    document.getElementById('audioDuration').textContent = '0:00';
    
    const level = testData.levels[currentLevelIndex];
    const audio = level.audios[currentAudioIndex];
    const q = audio.questions[currentQuestionIndex];
    
    // Check if we're starting a new audio track
    if (audio.track_id !== currentAudioTrackId) {
        console.log(`Starting new audio track: ${audio.track_id}`);
        currentAudioTrackId = audio.track_id;
        hasCompletedFirstListen = false;
    }

    console.log(`Loading question: Level ${level.level_id}, Audio ${audio.track_id}, Question ${currentQuestionIndex + 1}, First Listen: ${hasCompletedFirstListen}`);

    // Update UI - check if elements exist first
    const levelDisplay = document.getElementById('levelDisplay');
    const questionText = document.getElementById('questionText');
    const currentAudioDisplay = document.getElementById('currentAudioDisplay');
    const questionCounter = document.getElementById('questionCounter');
    
    if (levelDisplay) levelDisplay.textContent = `Level: ${level.level_id}`;
    if (questionText) questionText.textContent = q.text;
    if (currentAudioDisplay) currentAudioDisplay.textContent = `${audio.title} - ${audio.scenario}`;
    if (questionCounter) questionCounter.textContent = `Question ${currentQuestionIndex + 1} of 4 for this audio`;
    
    // Update options
    for (let i = 0; i < 4; i++) {
        const optionElement = document.getElementById(`option${i+1}`);
        if (optionElement && q.options[i]) {
            optionElement.textContent = q.options[i];
        }
    }

    // Reset radio buttons
    const radioButtons = document.querySelectorAll('input[name="answer"]');
    radioButtons.forEach(r => {
        r.checked = false;
        r.disabled = !hasCompletedFirstListen;
    });
    
    // Update listen counter
    const trackId = audio.track_id;
    const listenCount = audioListenCounts[trackId] || 0;
    const listenCountDisplay = document.getElementById('listenCountDisplay');
    if (listenCountDisplay) listenCountDisplay.textContent = `Listens: ${listenCount}`;
    
    // Unlock logic
    const nextBtn = document.getElementById('nextBtn');
    const listenWarning = document.getElementById('listenWarning');
    
    if (nextBtn) {
        if (!hasCompletedFirstListen) {
            nextBtn.disabled = true;
            nextBtn.textContent = '➡ Listen to Audio First';
            if (listenWarning) listenWarning.style.display = 'block';
        } else {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Submit Answer';
            if (listenWarning) listenWarning.style.display = 'none';
        }
    }

    // Reset audio button
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.textContent = '▶ Play Audio';
        playBtn.style.background = '#3498db';
        playBtn.disabled = false;
    }
    
    updateProgress();
    questionStartTime = Date.now();
}

function playAudio() {
    console.log("Play audio button clicked");
    
    const level = testData.levels[currentLevelIndex];
    const audioData = level.audios[currentAudioIndex];
    const trackId = audioData.track_id;
    const audioPath = `audio/${trackId}.mp3`;
    
    console.log(`Attempting to play: ${audioPath}`);
    
    // Update button state immediately
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.textContent = 'Playing...';
        playBtn.style.background = '#e74c3c';
        playBtn.disabled = true;
    }
    
    // Create audio element if it doesn't exist or if it's a different track
    if (!currentAudioPlayer || currentAudioPlayer.src.indexOf(trackId) === -1) {
        if (currentAudioPlayer) {
            currentAudioPlayer.pause();
        }
        
        currentAudioPlayer = new Audio(audioPath);
        
        // Set up event listeners
        currentAudioPlayer.addEventListener('canplay', () => {
            console.log(`Audio can play: ${audioPath}`);
            updateAudioDuration();
        });
        
        currentAudioPlayer.addEventListener('error', (e) => {
            console.error(`Audio error:`, e.target.error);
            
            if (playBtn) {
                playBtn.textContent = '▶ Play Audio';
                playBtn.style.background = '#3498db';
                playBtn.disabled = false;
            }
            
            alert(`Audio playback failed. Please check the console for details.`);
        });
        
        currentAudioPlayer.addEventListener('play', () => {
            console.log(`Audio started playing: ${audioPath}`);
            
            if (audioProgressInterval) {
                clearInterval(audioProgressInterval);
            }
            audioProgressInterval = setInterval(updateAudioProgress, 100);
        });
        
        currentAudioPlayer.addEventListener('ended', () => {
            console.log(`Audio finished playing: ${audioPath}`);
            
            if (!hasCompletedFirstListen) {
                hasCompletedFirstListen = true;
                console.log(`First compulsory listen complete for ${trackId}`);
                
                const radioButtons = document.querySelectorAll('input[name="answer"]');
                radioButtons.forEach(r => {
                    r.disabled = false;
                });
                
                const nextBtn = document.getElementById('nextBtn');
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.textContent = 'Submit Answer';
                }
                
                const listenWarning = document.getElementById('listenWarning');
                if (listenWarning) listenWarning.style.display = 'none';
            }
            
            if (!audioListenCounts[trackId]) {
                audioListenCounts[trackId] = 1;
            } else {
                audioListenCounts[trackId] = (audioListenCounts[trackId] || 0) + 1;
            }
            
            const listenCountDisplay = document.getElementById('listenCountDisplay');
            if (listenCountDisplay) listenCountDisplay.textContent = `Listens: ${audioListenCounts[trackId]}`;
            
            scores[level.level_id].totalListens = (scores[level.level_id].totalListens || 0) + 1;
            
            if (playBtn) {
                playBtn.textContent = '▶ Play Again';
                playBtn.style.background = '#3498db';
                playBtn.disabled = false;
            }
            
            if (audioProgressInterval) {
                clearInterval(audioProgressInterval);
                audioProgressInterval = null;
            }
            
            updateAudioProgress();
            
            saveProgress();
        });
        
        currentAudioPlayer.addEventListener('seeking', (e) => {
            console.log("Attempted to seek in audio - blocking");
            currentAudioPlayer.currentTime = Math.max(0, currentAudioPlayer.currentTime - 0.1);
        });
        
        currentAudioPlayer.addEventListener('pause', (e) => {
            console.log("Attempted to pause audio - resuming");
            if (!currentAudioPlayer.ended) {
                currentAudioPlayer.play().catch(err => {
                    console.error("Could not resume audio:", err);
                });
            }
        });
    }
    
    currentAudioPlayer.play().catch(error => {
        console.error("Failed to start audio playback:", error);
        
        if (playBtn) {
            playBtn.textContent = '▶ Play Audio';
            playBtn.style.background = '#3498db';
            playBtn.disabled = false;
        }
        
        if (error.name === 'NotAllowedError') {
            alert("Browser blocked audio playback. Please try clicking the play button again.");
        } else {
            alert(`Audio playback failed: ${error.message}`);
        }
    });
}

function updateAudioProgress() {
    if (!currentAudioPlayer) return;
    
    const progressFill = document.getElementById('audioProgressFill');
    const currentTimeElement = document.getElementById('audioCurrentTime');
    
    if (currentAudioPlayer.duration && !isNaN(currentAudioPlayer.duration)) {
        const progressPercent = (currentAudioPlayer.currentTime / currentAudioPlayer.duration) * 100;
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
        
        if (currentTimeElement) {
            currentTimeElement.textContent = formatTime(currentAudioPlayer.currentTime);
        }
    }
}

function updateAudioDuration() {
    if (!currentAudioPlayer || !currentAudioPlayer.duration || isNaN(currentAudioPlayer.duration)) return;
    
    const durationElement = document.getElementById('audioDuration');
    if (durationElement) {
        durationElement.textContent = formatTime(currentAudioPlayer.duration);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleAnswerSubmit() {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) {
        alert("Please select an answer or choose 'I don't know / Skip'!");
        return;
    }

    if (currentAudioPlayer && !currentAudioPlayer.paused) {
        currentAudioPlayer.pause();
    }
    
    if (audioProgressInterval) {
        clearInterval(audioProgressInterval);
        audioProgressInterval = null;
    }

    const level = testData.levels[currentLevelIndex];
    const audio = level.audios[currentAudioIndex];
    const q = audio.questions[currentQuestionIndex];
    
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    let isCorrect = 0;
    let isSkipped = 0;

    if (selected.value === "skip") {
        isSkipped = 1;
    } else {
        const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        if (parseInt(selected.value) === answerMap[q.answer]) {
            isCorrect = 1;
            scores[level.level_id].correct++;
        }
    }
    
    scores[level.level_id].total++;
    scores[level.level_id].totalTime += timeSpent;
    scores[level.level_id].questionsAnswered = (scores[level.level_id].questionsAnswered || 0) + 1;
    
    responseLog.push({
        level: level.level_id,
        audio: audio.track_id,
        question: currentQuestionIndex + 1,
        questionText: q.text,
        correct: isCorrect,
        time: timeSpent,
        skipped: isSkipped,
        listens: audioListenCounts[audio.track_id] || 0,
        selectedOption: selected.value,
        correctAnswer: q.answer,
        timestamp: new Date().toISOString()
    });

    currentQuestionIndex++;
    if (currentQuestionIndex >= audio.questions.length) {
        currentQuestionIndex = 0;
        currentAudioIndex++;
        
        currentAudioTrackId = '';
        hasCompletedFirstListen = false;
        
        if (currentAudioIndex >= level.audios.length) {
            currentAudioIndex = 0; 
            currentLevelIndex++;
            
            if (currentLevelIndex >= testData.levels.length) {
                sessionStorage.removeItem('listeningTestProgress');
                showResults(); 
            } else {
                saveProgress();
                loadQuestion();
            }
        } else {
            saveProgress();
            loadQuestion();
        }
    } else {
        saveProgress();
        loadQuestion();
    }
}

// ==================== DATA & UI ====================

function saveProgress() {
    const data = { 
        currentLevelIndex, currentAudioIndex, currentQuestionIndex, 
        scores, audioListenCounts, responseLog,
        currentAudioTrackId, hasCompletedFirstListen
    };
    sessionStorage.setItem('listeningTestProgress', JSON.stringify(data));
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    const screen = document.getElementById(id + 'Screen');
    if (screen) {
        screen.style.display = 'flex';
    }
}

function updateProgress() {
    const total = totalQuestions;
    const current = (currentLevelIndex * 8) + (currentAudioIndex * 4) + currentQuestionIndex;
    const pct = Math.round((current / total) * 100);
    const fill = document.getElementById('testProgressFill');
    const text = document.getElementById('testProgressText');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `Progress: ${pct}%`;
}

function showResults() {
    showScreen('results');
    
    let totalCorrect = 0;
    let totalQuestionsAnswered = 0;
    let finalLevel = "Below A1";

    Object.values(scores).forEach(s => {
        totalCorrect += s.correct || 0;
        totalQuestionsAnswered += s.questionsAnswered || 0;
    });

    if (scoringRules && scoringRules.scoring_logic) {
        for (let i = 0; i < testData.levels.length; i++) {
            const lvlId = testData.levels[i].level_id;
            const rule = scoringRules.scoring_logic.find(r => r.level === lvlId);
            if (scores[lvlId] && scores[lvlId].correct >= rule.min_score) {
                finalLevel = lvlId;
            }
        }
    }

    const finalPlacement = document.getElementById('finalPlacement');
    const correctAnswers = document.getElementById('correctAnswers');
    const totalQuestionsDisplay = document.getElementById('totalQuestionsDisplay');
    
    if (finalPlacement) finalPlacement.textContent = `Placement: ${finalLevel}`;
    if (correctAnswers) correctAnswers.textContent = totalCorrect;
    if (totalQuestionsDisplay) totalQuestionsDisplay.textContent = totalQuestionsAnswered;

    const tableBody = document.getElementById('resultsBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        testData.levels.forEach(level => {
            const score = scores[level.level_id];
            if (score && score.questionsAnswered > 0) {
                const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
                const avgTime = score.questionsAnswered > 0 ? Math.round(score.totalTime / score.questionsAnswered) : 0;
                const avgListens = score.questionsAnswered > 0 ? Math.round((score.totalListens || 0) / 8 * 10) / 10 : 0;
                const wrongAnswers = score.total - score.correct - (score.skipped || 0);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${level.level_id}</strong></td>
                    <td>${score.correct}/${score.total} (${accuracy}%)</td>
                    <td>${avgListens.toFixed(1)}</td>
                    <td>${avgTime}s</td>
                    <td>${wrongAnswers}</td>
                    <td>${score.correct >= 5 ? 'PASS' : 'FAIL'}</td>
                `;
                tableBody.appendChild(row);
            }
        });
    }
}

function exportToCSV() {
    let csv = "Level,Audio,Question,QuestionText,Correct (0-1),Time (sec),Skipped (0-1),Listens,SelectedOption,CorrectAnswer,Timestamp\n";
    
    responseLog.forEach(row => {
        const safeQuestionText = row.questionText.replace(/"/g, '""');
        csv += `"${row.level}","${row.audio}","${row.question}","${safeQuestionText}",${row.correct},${row.time},${row.skipped},${row.listens},"${row.selectedOption}","${row.correctAnswer}","${row.timestamp}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `listening_test_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
}

function exportToJSON() {
    const data = { 
        testInfo: {
            name: testData.test_name,
            date: new Date().toISOString(),
            totalQuestions: totalQuestions
        },
        summary: scores, 
        detailed_log: responseLog,
        audioListenCounts: audioListenCounts
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `listening_test_${new Date().toISOString().split('T')[0]}.json`);
    a.click();
}

initTest();