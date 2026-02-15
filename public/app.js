const API_URL = window.location.origin + '/api';

let currentSessionId = null;
let currentScenario = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

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

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        setStatus('Transcribing...');
        
        try {
          const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64 })
          });
          
          const data = await response.json();
          
          if (data.text && data.text.trim()) {
            sendMessage(data.text.trim());
          } else {
            setStatus('No speech detected. Try again.');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setStatus('Error transcribing');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      reader.readAsDataURL(audioBlob);
    };
    
    mediaRecorder.start();
    isRecording = true;
    document.getElementById('record-btn').classList.add('recording');
    document.getElementById('record-btn').textContent = 'Stop Speaking';
    setStatus('Listening...');
    
  } catch (err) {
    console.error('Error starting recording:', err);
    setStatus('Error accessing microphone');
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById('record-btn').classList.remove('recording');
    document.getElementById('record-btn').textContent = 'Start Speaking';
  }
}

async function sendMessage(text) {
  setStatus('Processing...');
  
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
    
    transcript.push({ role: 'assistant', content: aiResponse });
    displayTranscript(transcript);
    
    await fetch(`${API_URL}/sessions/${currentSessionId}/transcript`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
    
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
  setStatus('Speaking...');
  
  fetch(`${API_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  .then(res => res.json())
  .then(data => {
    const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
    audio.onended = () => setStatus('');
    audio.onerror = () => setStatus('');
    audio.play();
  })
  .catch(err => {
    console.error('TTS error:', err);
    setStatus('');
  });
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

document.getElementById('record-btn').addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

document.getElementById('end-btn').addEventListener('click', endConversation);

document.getElementById('new-btn').addEventListener('click', () => {
  location.reload();
});

loadScenarios();
