# vibesOnly Design

**Date**: 2026-02-15

## Project Overview

A voice-based workforce skills assessment platform where participants have AI-simulated workplace conversations, and staff receive rubric-based analysis.

## Architecture

### Frontend
- Single-page web app (vanilla HTML/CSS/JS)
- Browser Web Speech API for text-to-speech (reads AI responses aloud)
- Audio recording for speech input
- Communicates with backend via REST API

### Backend
- Node.js + Express server
- whisper.cpp for local speech-to-text transcription
- Stores conversations and analyses as JSON files

### Data Flow
1. Participant opens app → clicks "Start"
2. Backend loads scenario + system prompt
3. Participant speaks → browser records → sends audio to backend
4. Backend runs whisper.cpp → returns transcript → sends to Claude
5. Claude response → returns to frontend → text-to-speech reads it aloud
6. Repeat until participant ends conversation
7. Backend sends full transcript to Claude for analysis → saves both
8. Staff view dashboard of all sessions

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express
- **LLM**: Claude API (Anthropic)
- **Speech-to-Text**: whisper.cpp (local, open-source)
- **Text-to-Speech**: Browser Web Speech API (free)
- **Storage**: JSON files
- **Hosting**: GitHub Pages (frontend) + Render/Railway (backend)

## Data Storage

```
/data
  /sessions
    /{session-id}
      transcript.json    # Full conversation
      analysis.json      # Rubric scores and feedback
```

## Analysis Rubric

Dimensions (1-5 scale):
- **Conflict Resolution** - How did they handle the disagreement?
- **Professionalism** - Tone, respect, appropriateness
- **Articulation** - How clearly did they express their position?
- **Learning/Growth** - Did they show willingness to understand and adapt?

Claude provides scores and text feedback for each dimension.

## Configuration

- Anthropic API key stored in `.env` file (not committed to repo)
- Scenarios stored in `/scenarios/` directory as JSON files
