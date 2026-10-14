# Research-to-Execution Agent

A small project that researches a question using **only the sources you permit**, compares the findings against **your criteria**, and produces a **comparison table + recommendation**. Every claim is linked to its source with an evidence quote, and anything that could not be verified is listed separately.

- **Frontend:** React + Tailwind CSS (Vite)
- **Backend:** Python (FastAPI)
- **AI:** Google Gemini API (free tier)

---

## Project structure

```
Research-Agent/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env              <- you create this (API key)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── index.css
    ├── package.json
    └── vite.config.js
```

---

## What to install first (one time)

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10 or higher | https://www.python.org/downloads/ |
| Node.js (includes npm) | 18 or higher | https://nodejs.org/ |
| Gemini API key | free | https://aistudio.google.com/apikey |

Check they are installed:

```bash
python --version
node --version
npm --version
```

---

## Backend setup (Python)

Open a terminal in the `backend` folder.

### 1. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
```

If PowerShell says *"running scripts is disabled"*, run this once and activate again:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Mac / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` at the start of your prompt.

### 2. Install the Python packages

```bash
pip install -r requirements.txt
```

Or install them manually:

```bash
pip install fastapi uvicorn requests beautifulsoup4 google-genai python-dotenv
```

`requirements.txt`:
```
fastapi
uvicorn
requests
beautifulsoup4
google-genai
python-dotenv
```

### 3. Add your API key

Create a file named `.env` inside the `backend` folder (not inside `venv`):

```
GEMINI_API_KEY=your_key_here
```

Optional, to change the model without touching the code:

```
GEMINI_MODEL=gemini-3.8-flash
```

> Do not put quotes around the key. Do not upload `.env` to GitHub.

### 4. Run the backend

```bash
python -m uvicorn main:app --reload --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`.
Open http://127.0.0.1:8000/docs to check the API is alive.

---

## Frontend setup (React + Tailwind)

Open a **second** terminal in the `frontend` folder.

### 1. Install the packages

```bash
npm install
npm install tailwindcss @tailwindcss/vite
```

### 2. Make sure these files are set up

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()] })
```

`src/index.css`:
```css
@import "tailwindcss";
```

### 3. Run the frontend

```bash
npm run dev
```

Open the link shown in the terminal (usually http://localhost:5173).

> Keep **both** terminals running: backend on port 8000, frontend on port 5173.

---

## How to use

1. **Question:** what you want to find out.
2. **Criteria:** one criterion per line.
3. **Sources:** one permitted URL per line.
4. Click **Run Agent**.

You get a summary, a comparison table (with evidence quotes and source links), a recommendation, and a **"Could not verify"** list.

### Example

**Question**
```
Which programming language is best for a beginner building web backends?
```

**Criteria**
```
Is dynamically typed
Has automatic garbage collection
Supports multiple programming paradigms
First released before 2000
Has a large beginner community
```

**Sources**
```
https://en.wikipedia.org/wiki/Python_(programming_language)
https://en.wikipedia.org/wiki/JavaScript
https://en.wikipedia.org/wiki/Go_(programming_language)
```

---

## Common problems

| Problem | Fix |
|---------|-----|
| `uvicorn is not recognized` | Activate the venv first, and use `python -m uvicorn ...` |
| `Could not resolve '@tailwindcss/vite'` | Run `npm install tailwindcss @tailwindcss/vite` in `frontend` |
| `.env` key not found | `.env` must be in `backend/` (not inside `venv/`) and named exactly `.env` |
| `404 model ... no longer available` | Set `GEMINI_MODEL` in `.env` to a model that is currently available in Google AI Studio |
| `503 UNAVAILABLE` / `429` | Google is busy or the free limit was hit. Wait a minute and try again |
| `Model returned invalid JSON` | Run again; check the backend terminal for `RAW RESPONSE` |
| Page loads but "Run Agent" fails | Make sure the backend is running on port 8000 |
| Server keeps restarting on Windows | Run with `--reload-exclude venv`, or move the project out of OneDrive |

---

## Notes

- The Gemini free tier has rate limits, and Google may use free-tier data to improve its products. Do not paste private or confidential content.
- Some websites block scraping or load content with JavaScript. Wikipedia and simple documentation pages work best.
- Only the URLs you provide are used as sources.