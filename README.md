# ENGLISH LISTENING PLACEMENT TEST

## Stage 2 toward a reliable, comprehensive English language placement test aligned to CEFR levels

This project is a **web-based English listening placement test** designed for research and educational purposes. 

**Current Version: 2.0.0 (Development Phase)** This version marks the transition from a static prototype (Stage 1) to a dynamic, research-oriented assessment tool (Stage 2) capable of capturing complex performance metrics.

---

## ✨ Features (New in v2.0.0)

- **Binary Adaptive Logic:** Replaces linear testing with a branching search model. The test begins at the **B2 (Upper Intermediate)** anchor point and adapts upwards or downwards based on performance, minimizing test fatigue.
- **Automated Data Sync:** Integrated with **Google Apps Script**. All performance data (Placement, Latency, and Replays) is automatically synced to a secure Google Sheet for centralized analysis.
- **Cognitive Load Metrics:** Captures **Response Latency** (time taken to answer) and **Replay Frequency** to allow for future analysis of learner effort and cognitive load.
- **New Dashboard Layout:** Professional two-column interface with a dedicated research sidebar on the right.
- **CEFR Range:** Full coverage from Beginner (Pre-A1/A1) to Mastery (C2).
- **Informed Consent:** Integrated Data Protection Statement on the welcome screen ensuring ethical transparency for all participants regarding anonymous data collection.

---

## 🌐 Live Demo

You can try the application here:

👉 **[https://andywatkin01.github.io/English_placement_listening_test/](https://andywatkin01.github.io/English_placement_listening_test/)**

---

## 📌 Project Purpose

- To validate an **adaptive branching algorithm** for language placement.
- To collect high-fidelity data on **listening processing effort** (latency and replays).
- To provide a foundation for introducing formal measures of **cognitive load** in language assessment.

---

## 🛠️ Built With

- **HTML5 & CSS3** – Flexbox-based dashboard layout featuring a right-aligned sidebar.
- **JavaScript (Vanilla)** – Branching logic, session management, and asynchronous data transmission via POST.
- **Google Apps Script** – Backend data handling and Google Sheets integration.

---

## 🚀 How to Use

1. **Select Version:** Choose between Adult/Professional or Young Learners.
2. **Review Documentation:** Use the right-hand sidebar to access the README, Project Overview, and Validation Report.
3. **Take the Test:** Listen to the audio tracks. Questions appear after the first mandatory listen.
4. **Data Sync:** Your anonymized results will automatically sync to the research database upon completion.

---

## ⚠️ Data Protection & Disclaimer

This application collects **anonymous performance data only**. No personally identifiable information (names, emails, or IP addresses) is collected or stored. This test is currently in a **Development/Research Phase** and should be used as a preliminary indicator rather than a high-stakes certification tool.

---

## 🗂️ Project Structure

- `index.html` – Responsive dashboard with right-aligned research sidebar.
- `app.js` – Contains the binary adaptive logic and Google Sheets sync functions.
- `/images/` – Contains `Logo.png` (centered in sidebar) and other UI assets.
- `/data/` – `questions.json` containing the CEFR-aligned content.

---

## 📈 Future Development

- Implementation of formal cognitive load measurement scales.
- Statistical analysis of response latency vs. CEFR accuracy.
- Expansion of the item bank for specialized Young Learner contexts.

---

## 🙌 Contact & Acknowledgements

**Project Lead:** Anthony Watkin  
**Email:** [anthony.watkin01@gmail.com](mailto:anthony.watkin01@gmail.com)

---

### Recent Updates
- **v2.0.0**: Migration to Adaptive Branching Logic and automated Google Cloud data syncing.
- **v1.1.0**: Question sequence optimization for A2 and B1 levels.