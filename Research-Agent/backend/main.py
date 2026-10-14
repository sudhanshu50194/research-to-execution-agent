# import os, json, requests
# from pathlib import Path
# from bs4 import BeautifulSoup
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from dotenv import load_dotenv
# from google import genai
# from google.genai import types

# load_dotenv(Path(__file__).parent / ".env")
# client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
# MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# app = FastAPI()
# app.add_middleware(CORSMiddleware, allow_origins=["*"],
#                    allow_methods=["*"], allow_headers=["*"])

# class Req(BaseModel):
#     question: str
#     criteria: list[str]
#     sources: list[str]          # permitted URLs only

# def fetch_text(url: str) -> str:
#     try:
#         r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
#         soup = BeautifulSoup(r.text, "html.parser")
#         for t in soup(["script", "style", "nav", "footer"]):
#             t.decompose()
#         return " ".join(soup.get_text(" ").split())[:8000]
#     except Exception as e:
#         return f"[FETCH_FAILED: {e}]"

# SYSTEM = """You are a research agent. Use ONLY the provided source texts.
# Return ONLY valid JSON, no markdown, in this shape:
# {
#  "summary": "short answer to the question",
#  "comparison": [
#    {"option": "name",
#     "scores": {"<criterion>": {"verdict": "meets|partial|fails|unknown",
#                                "evidence": "exact short quote from source",
#                                "source": "url"}}}
#  ],
#  "recommendation": "which option and why, based on criteria",
#  "unverified": ["things you could not verify from the sources"]
# }
# Never invent facts. If a source doesn't say it, mark verdict 'unknown' and add it to unverified."""

# @app.post("/research")
# def research(req: Req):
#     docs = {u: fetch_text(u) for u in req.sources}
#     content = (f"QUESTION: {req.question}\n"
#                f"CRITERIA: {json.dumps(req.criteria)}\n\n"
#                + "\n\n".join(f"SOURCE {u}:\n{t}" for u, t in docs.items()))
#     try:
#         resp = client.models.generate_content(
#             model=MODEL,
#             contents=content,
#             config=types.GenerateContentConfig(
#                 system_instruction=SYSTEM,
#                 response_mime_type="application/json",
#                 max_output_tokens=16000,
#             ),
#         )
#         text = (resp.text or "").strip()
#         finish = resp.candidates[0].finish_reason if resp.candidates else None
#     except Exception as e:
#         return {"error": f"Gemini API error: {e}"}

#     print("FINISH REASON:", finish)
#     print("RAW RESPONSE:", text[:3000])

#     # fences hata do aur sirf { ... } wala hissa nikalo
#     cleaned = text.replace("```json", "").replace("```", "").strip()
#     start, end = cleaned.find("{"), cleaned.rfind("}")
#     if start != -1 and end != -1:
#         cleaned = cleaned[start:end + 1]
#     try:
#         return json.loads(cleaned)
#     except Exception as e:
#         return {"error": f"Model returned invalid JSON ({e}). Finish reason: {finish}",
#                 "raw": text[:2000]}

import os, json, requests
from pathlib import Path
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
import time

load_dotenv(Path(__file__).parent / ".env")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# # Fixed model name to a valid Gemini model
# MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
MODEL = "gemini-flash-latest"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class Req(BaseModel):
    question: str
    criteria: list[str]
    sources: list[str] # permitted URLs only

def fetch_text(url: str) -> str:
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for t in soup(["script", "style", "nav", "footer"]):
            t.decompose()
        return " ".join(soup.get_text(" ").split())[:8000]
    except Exception as e:
        return f"[FETCH_FAILED: {e}]"

SYSTEM = """You are a research agent. Use ONLY the provided source texts.
Return ONLY valid JSON, no markdown, in this shape:
{
 "summary": "short answer to the question",
 "comparison": [
   {"option": "name",
    "scores": {"<criterion>": {"verdict": "meets|partial|fails|unknown",
                             "evidence": "exact short quote from source",
                             "source": "url"}}}
 ],
 "recommendation": "which option and why, based on criteria",
 "unverified": ["things you could not verify from the sources"]
}
Never invent facts. If a source doesn't say it, mark verdict 'unknown' and add it to unverified."""



@app.post("/research")
def research(req: Req):
    if not req.sources:
        return {"error": "At least one source URL is required for research."}

    docs = {u: fetch_text(u) for u in req.sources}
    content = (f"QUESTION: {req.question}\n"
               f"CRITERIA: {json.dumps(req.criteria)}\n\n"
               + "\n\n".join(f"SOURCE {u}:\n{t}" for u, t in docs.items()))

    # Retry logic for 503 Overload errors
    max_retries = 3
    resp = None
    last_error = None

    for attempt in range(max_retries):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                contents=content,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM,
                    response_mime_type="application/json",
                    max_output_tokens=8192,
                ),
            )
            break # Agar success ho gaya toh loop se bahar aa jao
        except Exception as e:
            last_error = e
            if "503" in str(e) or "UNAVAILABLE" in str(e):
                time.sleep(2 * (attempt + 1)) # Thoda ruk kar dobara try karega
                continue
            else:
                break # Agar koi aur error hai toh turant rok do

    if not resp:
        return {"error": f"Gemini API error (Server Busy): {last_error}"}

    text = (resp.text or "").strip()
    finish = resp.candidates[0].finish_reason if resp.candidates else None

    cleaned = text.replace("```json", "").replace("```", "").strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end != -1:
        cleaned = cleaned[start:end + 1]

    try:
        return json.loads(cleaned)
    except Exception as e:
        return {
            "error": f"Model returned invalid JSON ({e}). Finish reason: {finish}",
            "raw": text[:2000]
        }
