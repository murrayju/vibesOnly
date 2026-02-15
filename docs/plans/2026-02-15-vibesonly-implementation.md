# vibesOnly Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a voice-based workforce skills assessment platform where participants have AI-simulated workplace conversations, and staff receive rubric-based analysis.

**Architecture:** 
- Backend: Node.js + Express server with whisper.cpp for local STT
- Frontend: Vanilla HTML/CSS/JS web app with voice recording and TTS playback
- Storage: JSON files in /data/sessions/
- AI: Claude API for conversation and analysis

**Tech Stack:** Node.js, Express, whisper.cpp, @anthropic-ai/sdk, vanilla HTML/CSS/JS

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `.env`
- Create: `server.js`
- Create: `README.md`

**Step 1: Create package.json**

```bash
mkdir -p vibesOnly && cd vibesOnly && npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express cors dotenv @anthropic-ai/sdk
```

**Step 3: Create .env file**

```
ANTHROPIC_API_KEY=your_key_here
PORT=3000
```

**Step 4: Create basic server.js**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 5: Test server**

Run: `node server.js`
Expected: "Server running on port 3000"

**Step 6: Commit**

```bash
git add package.json .env server.js .gitignore
git commit -m "feat: basic Express server setup"
```

---

## Task 2: Whisper.cpp Integration

**Files:**
- Create: `scripts/download-model.sh`
- Modify: `server.js`

**Step 1: Create download script for whisper model**

```bash
mkdir -p scripts
```

**Step 2: Add whisper transcription function to server.js**

First, install whisper (we'll use a Node wrapper):

```bash
npm install whisper-node
```

**Step 3: Add transcription endpoint**

```javascript
const whisper = require('whisper-node');

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio } = req.body; // base64 encoded audio
    // Save audio to temp file
    const buffer = Buffer.from(audio, 'base64');
    const tempPath = './temp_audio.wav';
    require('fs').writeFileSync(tempPath, buffer);
    
    // Transcribe
    const result = await whisper.transcribe(tempPath);
    
    // Clean up
    require('fs').unlinkSync(tempPath);
    
    res.json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});
```

**Step 4: Test endpoint**

Run: `node server.js` in one terminal
In another: `curl -X POST http://localhost:3000/api/health`
Expected: {"status":"ok"}

**Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add whisper transcription endpoint"
```

---

## Task 3: Claude API Integration

**Files:**
- Modify: `server.js`

**Step 1: Add Claude client setup**

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

**Step 2: Add conversation endpoint**

```javascript
app.post('/api/conversation', async (req, res) => {
  try {
    const { transcript, scenario, message } = req.body;
    
    // Build messages array
    const messages = [];
    
    // Add system prompt with scenario
    const systemPrompt = `${scenario.systemPrompt}\n\nYou are roleplaying as: ${scenario.characterName}`;
    
    // Add previous transcript as context
    if (transcript && transcript.length > 0) {
      transcript.forEach(msg => {
        messages.push(msg);
      });
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });
    
    res.json({ 
      response: response.content[0].text,
      role: 'assistant'
    });
  } catch (error) {
    console.error('Claude error:', error);
    res.status(500).json({ error: 'Conversation failed' });
  }
});
```

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add Claude conversation endpoint"
```

---

## Task 4: Session Management & Storage

**Files:**
- Create: `data/scenarios/workplace-conflict.json`
- Modify: `server.js`

**Step 1: Create scenario file**

```json
{
  "id": "workplace-conflict",
  "name": "Workplace Conflict",
  "description": "A scenario where the participant must address a performance issue with a coworker",
  "systemPrompt": "You are a workplace manager having a difficult conversation with an employee about their conflict with a coworker. The employee has been short-tempered with colleagues and it's affecting team morale. You want to see how they handle feedback and whether they can acknowledge the issue constructively.",
  "characterName": "Sarah (the participant's coworker)",
  "initialMessage": "Hey, I wanted to talk to you about something. I heard you've been having some issues with the team lately. Can we chat?"
}
```

**Step 2: Add session endpoints to server.js**

```javascript
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', 'sessions');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Get all scenarios
app.get('/api/scenarios', (req, res) => {
  const scenariosDir = path.join(__dirname, 'data', 'scenarios');
  ensureDir(scenariosDir);
  
  const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
  const scenarios = files.map(f => {
    const data = fs.readFileSync(path.join(scenariosDir, f), 'utf-8');
    return JSON.parse(data);
  });
  
  res.json(scenarios);
});

// Start new session
app.post('/api/sessions', (req, res) => {
  const { scenarioId } = req.body;
  const sessionId = Date.now().toString();
  const sessionDir = path.join(DATA_DIR, sessionId);
  
  ensureDir(sessionDir);
  
  // Load scenario
  const scenarioPath = path.join(__dirname, 'data', 'scenarios', `${scenarioId}.json`);
  const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));
  
  // Initialize transcript
  const transcript = [{
    role: 'assistant',
    content: scenario.initialMessage
  }];
  
  fs.writeFileSync(
    path.join(sessionDir, 'transcript.json'),
    JSON.stringify(transcript, null, 2)
  );
  
  res.json({ sessionId, scenario, transcript });
});

// Get session
app.get('/api/sessions/:id', (req, res) => {
  const sessionDir = path.join(DATA_DIR, req.params.id);
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const transcript = JSON.parse(
    fs.readFileSync(path.join(sessionDir, 'transcript.json'), 'utf-8')
  );
  
  let analysis = null;
  const analysisPath = path.join(sessionDir, 'analysis.json');
  if (fs.existsSync(analysisPath)) {
    analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  }
  
  res.json({ transcript, analysis });
});
```

**Step 3: Commit**

```bash
git add data/scenarios/workplace-conflict.json server.js
git commit -f "feat: add session management and storage"
```

---

## Task 5: Analysis Endpoint

**Files:**
- Modify: `server.js`

**Step 1: Add analysis endpoint**

```javascript
app.post('/api/sessions/:id/analyze', async (req, res) => {
  try {
    const sessionDir = path.join(DATA_DIR, req.params.id);
    const transcriptPath = path.join(sessionDir, 'transcript.json');
    
    if (!fs.existsSync(sessionDir)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
    
    const analysisPrompt = `You are evaluating a participant's performance in a workplace roleplay scenario. 
    
Analyze the following transcript and provide scores (1-5) for each dimension, along with specific feedback:

Transcript:
${transcript.map(m => `${m.role === 'user' ? 'Participant' : 'AI'}: ${m.content}`).join('\n')}

Provide your analysis in this JSON format:
{
  "conflictResolution": { "score": 1-5, "feedback": "..." },
  "professionalism": { "score": 1-5, "feedback": "..." },
  "articulation": { "score": 1-5, "feedback": "..." },
  "learning": { "score": 1-5, "feedback": "..." },
  "overallSummary": "..."
}`;
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }]
    });
    
    // Parse JSON from response (Claude should return valid JSON)
    let analysis;
    try {
      analysis = JSON.parse(response.content[0].text);
    } catch {
      // If not valid JSON, store as raw text
      analysis = { rawAnalysis: response.content[0].text };
    }
    
    fs.writeFileSync(
      path.join(sessionDir, 'analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

**Step 2: Commit**

```bash
git add server.js
git commit -m "feat: add analysis endpoint"
```

---

## Task 6: Frontend - Basic Structure

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vibesOnly</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>vibesOnly</h1>
      <p class="subtitle">Workforce Skills Assessment</p>
    </header>
    
    <main id="app">
      <!-- Scenario selection -->
      <div id="scenario-select" class="view">
        <h2>Choose a Scenario</h2>
        <div id="scenarios-list"></div>
      </div>
      
      <!-- Conversation -->
      <div id="conversation" class="view hidden">
        <div id="transcript"></div>
        <div id="controls">
          <button id="record-btn">Hold to Speak</button>
          <button id="end-btn">End Conversation</button>
        </div>
        <div id="status"></div>
      </div>
      
      <!-- Results -->
      <div id="results" class="view hidden">
        <h2>Conversation Complete</h2>
        <p>Thank you for completing this exercise.</p>
        <button id="new-btn">Start New Session</button>
      </div>
    </main>
  </div>
  
  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Create styles.css**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #333;
  font-size: 2rem;
}

.subtitle {
  color: #666;
  margin-top: 5px;
}

.view {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.hidden {
  display: none;
}

#scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.scenario-card {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scenario-card:hover {
  border-color: #4a90d9;
  background: #f8f9fa;
}

#transcript {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
}

.message {
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 8px;
}

.message.user {
  background: #e3f2fd;
  margin-left: 20px;
}

.message.assistant {
  background: #f3e5f5;
  margin-right: 20px;
}

.message strong {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
}

#controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

#record-btn {
  background: #4a90d9;
  color: white;
}

#record-btn:hover {
  background: #357abd;
}

#record-btn.recording {
  background: #d94a4a;
}

#end-btn {
  background: #666;
  color: white;
}

#new-btn {
  background: #4a90d9;
  color: white;
  margin-top: 20px;
}

#status {
  text-align: center;
  margin-top: 10px;
  color: #666;
}
```

**Step 3: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "feat: add frontend HTML and CSS"
```

---

## Task 7: Frontend - App Logic

**Files:**
- Create: `public/app.js`

**Step 1: Create app.js**

```javascript
const API_URL = 'http://localhost:3000/api';

let currentSessionId = null;
let currentScenario = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let speechSynthesis = window.speechSynthesis;
let speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

async function loadScenarios() {
  const response = await fetch(`${API_URL}/scenarios`);
  const scenarios = await response.json();
  
  const list = document.getElementById('scenarios-list');
  list.innerHTML = scenarios.map(s => `
    <div class="scenario-card" data-id="${s.id}">
      <h3>${s.name}</h3>
      <p>${s.description}</p>
    </div>
  `).join('');
  
  list.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => startSession(card.dataset.id));
  });
}

async function startSession(scenarioId) {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId })
  });
  
  const { sessionId, scenario, transcript } = await response.json();
  currentSessionId = sessionId;
  currentScenario = scenario;
  
  document.getElementById('scenario-select').classList.add('hidden');
  document.getElementById('conversation').classList.remove('hidden');
  
  displayTranscript(transcript);
  speak(scenario.initialMessage);
  initSpeechRecognition();
}

function displayTranscript(messages) {
  const container = document.getElementById('transcript');
  container.innerHTML = messages.map(m => `
    <div class="message ${m.role}">
      <strong>${m.role === 'user' ? 'You' : 'AI'}</strong>
      ${m.content}
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

function initSpeechRecognition() {
  if (!speechRecognition) {
    alert('Speech recognition not supported in this browser');
    return;
  }
  
  recognition = new speechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onstart = () => {
    setStatus('Listening...');
  };
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');
    
    setStatus(`Heard: ${transcript}`);
  };
  
  recognition.onend = () => {
    setStatus('');
  };
  
  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e);
    setStatus('Error listening');
  };
}

async function sendMessage(text) {
  setStatus('Processing...');
  
  // Add user message to transcript
  const transcript = getCurrentTranscript();
  transcript.push({ role: 'user', content: text });
  displayTranscript(transcript);
  
  try {
    const response = await fetch(`${API_URL}/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: currentScenario,
        transcript: transcript.slice(0, -1),
        message: text
      })
    });
    
    const { response: aiResponse } = await response.json();
    
    // Save to transcript
    transcript.push({ role: 'assistant', content: aiResponse });
    displayTranscript(transcript);
    
    // Save to backend
    await fetch(`${API_URL}/sessions/${currentSessionId}/transcript`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
    
    // Speak response
    speak(aiResponse);
  } catch (error) {
    console.error('Error:', error);
    setStatus('Error processing message');
  }
}

function getCurrentTranscript() {
  const container = document.getElementById('transcript');
  const messages = container.querySelectorAll('.message');
  const transcript = [];
  
  messages.forEach(msg => {
    const role = msg.classList.contains('user') ? 'user' : 'assistant';
    const content = msg.textContent.replace(/^(You|AI)\s*/, '');
    transcript.push({ role, content });
  });
  
  return transcript;
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

async function endConversation() {
  setStatus('Analyzing conversation...');
  
  try {
    const response = await fetch(`${API_URL}/sessions/${currentSessionId}/analyze`, {
      method: 'POST'
    });
    
    const analysis = await response.json();
    
    document.getElementById('conversation').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    
    console.log('Analysis:', analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    setStatus('Error analyzing conversation');
  }
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

// Event listeners
document.getElementById('record-btn').addEventListener('mousedown', () => {
  if (recognition) {
    isRecording = true;
    recognition.start();
    document.getElementById('record-btn').classList.add('recording');
  }
});

document.getElementById('record-btn').addEventListener('mouseup', () => {
  if (recognition && isRecording) {
    isRecording = false;
    recognition.stop();
    document.getElementById('record-btn').classList.remove('recording');
    
    // Get the final transcript
    const status = document.getElementById('status').textContent;
    if (status.startsWith('Heard:')) {
      const text = status.replace('Heard:', '').trim();
      if (text) {
        sendMessage(text);
      }
    }
  }
});

document.getElementById('end-btn').addEventListener('click', endConversation);

document.getElementById('new-btn').addEventListener('click', () => {
  location.reload();
});

// Initialize
loadScenarios();
```

**Step 2: Need to add transcript PUT endpoint to server.js first**

```javascript
// Add to server.js
app.put('/api/sessions/:id/transcript', (req, res) => {
  const sessionDir = path.join(DATA_DIR, req.params.id);
  const transcriptPath = path.join(sessionDir, 'transcript.json');
  
  fs.writeFileSync(transcriptPath, JSON.stringify(req.body.transcript, null, 2));
  
  res.json({ success: true });
});
```

**Step 3: Commit**

```bash
git add public/app.js server.js
git commit -m "feat: add frontend JavaScript"
```

---

## Task 8: Add transcript PUT endpoint

**Files:**
- Modify: `server.js`

**Step 1: Add PUT endpoint**

Add after the session POST endpoint:

```javascript
app.put('/api/sessions/:id/transcript', (req, res) => {
  const sessionDir = path.join(DATA_DIR, req.params.id);
  const transcriptPath = path.join(sessionDir, 'transcript.json');
  
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  fs.writeFileSync(transcriptPath, JSON.stringify(req.body.transcript, null, 2));
  
  res.json({ success: true });
});
```

**Step 2: Commit**

```bash
git add server.js
git commit -m "feat: add transcript update endpoint"
```

---

## Task 9: Staff Dashboard

**Files:**
- Create: `public/admin.html`
- Create: `public/admin.js`
- Modify: `server.js`

**Step 1: Add sessions list endpoint**

```javascript
app.get('/api/admin/sessions', (req, res) => {
  ensureDir(DATA_DIR);
  const sessions = fs.readdirSync(DATA_DIR).filter(f => {
    return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
  });
  
  const sessionsList = sessions.map(id => {
    const sessionDir = path.join(DATA_DIR, id);
    const transcriptPath = path.join(sessionDir, 'transcript.json');
    const analysisPath = path.join(sessionDir, 'analysis.json');
    
    let summary = null;
    if (fs.existsSync(transcriptPath)) {
      const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
      const firstUser = transcript.find(m => m.role === 'user');
      summary = firstUser ? firstUser.content.substring(0, 100) + '...' : 'No messages';
    }
    
    return { id, summary };
  });
  
  res.json(sessionsList);
});
```

**Step 2: Create admin.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vibesOnly - Admin</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>vibesOnly Admin</h1>
      <p class="subtitle">Session Dashboard</p>
    </header>
    
    <main>
      <div class="view">
        <h2>Sessions</h2>
        <div id="sessions-list"></div>
      </div>
    </main>
  </div>
  
  <script src="admin.js"></script>
</body>
</html>
```

**Step 3: Create admin.js**

```javascript
const API_URL = 'http://localhost:3000/api';

async function loadSessions() {
  const response = await fetch(`${API_URL}/admin/sessions`);
  const sessions = await response.json();
  
  const list = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    list.innerHTML = '<p>No sessions yet</p>';
    return;
  }
  
  list.innerHTML = sessions.map(s => `
    <div class="scenario-card" data-id="${s.id}">
      <h3>Session ${s.id}</h3>
      <p>${s.summary || 'No transcript'}</p>
    </div>
  `).join('');
  
  list.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => loadSession(card.dataset.id));
  });
}

async function loadSession(id) {
  const response = await fetch(`${API_URL}/sessions/${id}`);
  const { transcript, analysis } = await response.json();
  
  console.log('Transcript:', transcript);
  console.log('Analysis:', analysis);
  
  alert('Session loaded! Check console for full transcript and analysis.');
}

loadSessions();
```

**Step 4: Commit**

```bash
git add public/admin.html public/admin.js server.js
git commit -m "feat: add admin dashboard"
```

---

## Task 10: Testing & Verification

**Files:**
- Test all endpoints manually

**Step 1: Start server**

```bash
node server.js
```

**Step 2: Test health endpoint**

```bash
curl http://localhost:3000/api/health
```

**Step 3: Test scenarios**

```bash
curl http://localhost:3000/api/scenarios
```

**Step 4: Test start session**

```bash
curl -X POST http://localhost:3000/api/sessions -H "Content-Type: application/json" -d '{"scenarioId":"workplace-conflict"}'
```

**Step 5: Verify files created**

```bash
ls data/sessions/*/transcript.json
```

---

## Task 11: Final Review

**Files:**
- Verify: All files created
- Verify: API key in .env
- Verify: README updated

**Step 1: Create comprehensive README**

```markdown
# vibesOnly

Voice-based workforce skills assessment platform.

## Setup

1. Install dependencies:
   npm install

2. Create .env file with:
   ANTHROPIC_API_KEY=your_key
   PORT=3000

3. Run server:
   node server.js

4. Open http://localhost:3000

## Development

- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin.html

## Architecture

- Backend: Node.js + Express
- Speech-to-Text: whisper-node
- LLM: Claude API
- Storage: JSON files

## License

MIT
```

**Step 2: Final commit**

```bash
git add README.md
git commit -m "feat: complete vibesOnly MVP"
```

---

**Plan complete!**
