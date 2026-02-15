# vibesOnly

Voice-based workforce skills assessment platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with:
   ```
   ANTHROPIC_API_KEY=your_key
   PORT=3000
   ```

3. Run server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000

## Usage

**For Participants:**
- Open the app
- Select a scenario
- Hold the "Hold to Speak" button to speak
- Listen to AI responses via text-to-speech
- Click "End Conversation" when done

**For Staff/Admin:**
- Open http://localhost:3000/admin.html
- View all sessions
- Click a session to see transcript and analysis

## Architecture

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express
- **LLM**: Claude API (Anthropic)
- **Speech-to-Text**: Browser built-in Speech Recognition (free)
- **Text-to-Speech**: Browser built-in Web Speech API (free)
- **Storage**: JSON files in `/data/sessions/`

## Adding Scenarios

Add JSON files to `data/scenarios/` with this format:

```json
{
  "id": "unique-id",
  "name": "Scenario Name",
  "description": "Brief description",
  "systemPrompt": "Instructions for the AI character",
  "characterName": "Character name",
  "initialMessage": "Opening message"
}
```

## Development

```bash
npm start       # Start server
```

## Hosting

- **Frontend**: Can be deployed to GitHub Pages, Netlify, Vercel
- **Backend**: Can be deployed to Render, Railway, or similar
- Note: For production, you'll need to update API_URL in frontend JS to point to your hosted backend
