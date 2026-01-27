// ==================== GLOBAL STATE ====================
let fullTestData = null;
let testData = null;
let selectedAudience = null;
let currentLevelIndex = 3; // Starts at B2 (Index 3)
let currentAudioIndex = 0;
let currentQuestionIndex = 0;
let scores = {};
let audioListenCounts = {};
let currentAudioPlayer = null;
let highestPassedLevel = "Pre-A1";
let rawDataLog = []; 
let questionRevealTime = 0; 

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7wJgU_e-HXBVCyM6mKdZ1mW9UrmNpSggKwyQqHw7xlLByVRevjH4prvE8WnUEeuPg/exec";

const levelFeedback = {
    "C2": "Masterly command; understands virtually everything heard at native speed.",
    "C1": "Strong understanding of complex professional and academic scenarios.",
    "B2": "Understands main ideas of complex text on concrete and abstract topics.",
    "B1": "Understands main points of clear standard speech on familiar matters.",
    "A2": "Understands phrases and high-frequency vocabulary related to immediate needs.",
    "A1": "Recognizes familiar words and basic phrases when people speak slowly.",
    "Pre-A1": "Beginner level; recognizes basic words with significant support."
};

// Map levels to their index in the JSON array
const levelMap = { "A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4, "C2": 5 };

// ==================== INITIALIZATION ====================
async function init() {
    try {
        const response = await fetch('data/questions.json');
        if (!response.ok) throw new Error("Could not find questions.json");
        fullTestData = await response.json();
        setupVersionSelection();
        showScreen('welcomeScreen');
    } catch (err) {
        console.error("Init error:", err);
    }
}

function setupVersionSelection() {
    const adultBtn = document.getElementById('adultBtn');
    const ypBtn = document.getElementById('ypBtn');
    const startBtn = document.getElementById('startTestBtn');
    const beginBtn = document.getElementById('beginTestBtn');

    if (adultBtn) adultBtn.onclick = () => selectVersion('adult');
    if (ypBtn) ypBtn.onclick = () => selectVersion('young_people');
    
    if (startBtn) {
        startBtn.onclick = () => {
            if (!selectedAudience) return alert("Please select a version.");
            document.getElementById('versionNotice').innerText = `Selected Version: ${selectedAudience === 'adult' ? "Adult" : "Young Learners"}`;
            showScreen('confirmScreen');
        };
    }
    if (beginBtn) beginBtn.onclick = () => startAssessment();
}

function selectVersion(version) {
    selectedAudience = version;
    testData = fullTestData.versions.find(v => v.audience === version);
    
    // UI Updates
    document.querySelectorAll('.version-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(version === 'adult' ? 'adultBtn' : 'ypBtn').classList.add('active');
    document.getElementById('startTestBtn').style.display = 'inline-block';
}

function startAssessment() {
    scores = {}; audioListenCounts = {}; rawDataLog = [];
    testData.levels.forEach(lvl => { scores[lvl.level_id] = { correct: 0 }; });
    
    currentLevelIndex = levelMap["B2"]; // Anchor at B2
    currentAudioIndex = 0; currentQuestionIndex = 0;
    
    document.getElementById('current-task').innerHTML = 'Status: <span class="status-badge">Testing B2</span>';
    showScreen('testScreen');
    loadQuestion();
}

// ==================== ADAPTIVE LOGIC (AMENDED WITH BUG FIXES) ====================
function evaluateLevelResult() {
    const levelId = testData.levels[currentLevelIndex].level_id;
    const passed = scores[levelId].correct >= 6; // 75% pass mark

    console.log(`Level ${levelId} complete. Passed: ${passed}. Score: ${scores[levelId].correct}`);

    if (levelId === "B2") {
        passed ? goToLevel("C1") : goToLevel("A2");
    } 
    else if (levelId === "C1") {
        passed ? goToLevel("C2") : finishTest("B2");
    } 
    else if (levelId === "C2") {
        finishTest(passed ? "C2" : "C1");
    } 
    else if (levelId === "A2") {
        passed ? goToLevel("B1") : goToLevel("A1");
    } 
    else if (levelId === "B1") {
        finishTest(passed ? "B1" : "A2");
    } 
    else if (levelId === "A1") {
        finishTest(passed ? "A1" : "Pre-A1");
    }
}

function goToLevel(levelKey) {
    // 1. Logic Fix: Validate level exists in map to prevent "undefined" hangs
    if (levelMap[levelKey] === undefined) {
        console.error(`Logic Error: ${levelKey} is not defined in levelMap.`);
        finishTest("Error");
        return;
    }

    // 2. Update global index
    currentLevelIndex = levelMap[levelKey];
    
    // 3. Reset track/question counters for the new level
    currentAudioIndex = 0;
    currentQuestionIndex = 0;

    // 4. Update UI status in sidebar
    const statusElem = document.getElementById('current-task');
    if (statusElem) {
        statusElem.innerHTML = `Status: <span class="status-badge">Testing ${levelKey}</span>`;
    }

    console.log(`Transitioning to ${levelKey} (Index: ${currentLevelIndex})`);
    loadQuestion();
}

// ==================== ENGINE & UTILITIES ====================

function loadQuestion() {
    const level = testData.levels[currentLevelIndex];
    const audio = level.audios[currentAudioIndex];
    const question = audio.questions[currentQuestionIndex];
    const trackId = audio.track_id;

    const testUI = document.getElementById('testUI');
    testUI.innerHTML = `
        <div class="test-header"><span>Level: ${level.level_id}</span></div>
        <div class="audio-section" style="margin-bottom:20px;">
            <button id="playBtn" class="btn start-btn">▶ PLAY AUDIO</button>
            <p>Scenario: ${audio.scenario}</p>
        </div>
        <div id="questionArea" style="display:none;">
            <h3>${question.text}</h3>
            <div class="options-grid">
                ${question.options.map(opt => `<button class="btn version-btn option-btn" onclick="handleAnswerSubmit('${opt[0]}')">${opt}</button>`).join('')}
            </div>
            <button class="btn pass-btn" onclick="handleAnswerSubmit('PASS')">I don't know / Pass</button>
        </div>
    `;

    if (currentQuestionIndex > 0 || (audioListenCounts[trackId] > 0)) {
        document.getElementById('questionArea').style.display = 'block';
        questionRevealTime = Date.now();
    }
    setupAudio(trackId);
}

function setupAudio(trackId) {
    if (currentAudioPlayer) currentAudioPlayer.pause();
    currentAudioPlayer = new Audio(`audio/${trackId}.mp3`);
    const playBtn = document.getElementById('playBtn');
    
    if (audioListenCounts[trackId] > 0) playBtn.innerText = "↺ PLAY AGAIN";

    playBtn.onclick = () => {
        currentAudioPlayer.currentTime = 0;
        currentAudioPlayer.play();
        playBtn.disabled = true;
        if (audioListenCounts[trackId] > 0) audioListenCounts[trackId]++;
    };

    currentAudioPlayer.onended = () => {
        playBtn.disabled = false;
        if (!audioListenCounts[trackId]) {
            audioListenCounts[trackId] = 1;
            document.getElementById('questionArea').style.display = 'block';
            questionRevealTime = Date.now(); 
        }
    };
}

function handleAnswerSubmit(selected) {
    const timeTaken = ((Date.now() - questionRevealTime) / 1000).toFixed(2);
    const level = testData.levels[currentLevelIndex];
    const audio = level.audios[currentAudioIndex];
    const question = audio.questions[currentQuestionIndex];
    
    let res = "incorrect";
    if (selected === question.answer) { res = "correct"; scores[level.level_id].correct++; }
    else if (selected === 'PASS') { res = "pass"; }

    rawDataLog.push({
        CEFR_Level: level.level_id, Audio_ID: audio.track_id, Question_Num: currentQuestionIndex + 1,
        Response: res, Time_Taken_Sec: timeTaken, Replays: (audioListenCounts[audio.track_id] || 1) - 1
    });

    currentQuestionIndex++;
    if (currentQuestionIndex < 4) {
        loadQuestion();
    } else if (currentAudioIndex === 0) {
        currentAudioIndex = 1; currentQuestionIndex = 0; loadQuestion();
    } else {
        evaluateLevelResult();
    }
}

function sendDataToGoogle(finalLevel) {
    const payload = rawDataLog.map(row => ({
        ...row, Final_Assessment: finalLevel, Audience: selectedAudience, Timestamp: new Date().toISOString()
    }));

    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Sync Error:", err));
}

function finishTest(finalLevel) {
    sendDataToGoogle(finalLevel);
    document.getElementById('current-task').innerHTML = 'Status: <span class="status-badge" style="background:#e67e22; color:white;">Complete</span>';
    document.getElementById('testUI').innerHTML = `
        <div class="welcome-content">
            <h1>Assessment Complete</h1>
            <div style="font-size: 4rem; font-weight: bold; color: var(--primary);">${finalLevel}</div>
            <p>${levelFeedback[finalLevel] || "Thank you for participating."}</p>
            <button class="btn start-btn" onclick="location.reload()">Restart</button>
        </div>
    `;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

window.onload = init;
