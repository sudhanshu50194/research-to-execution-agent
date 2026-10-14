
from flask import Flask, request, jsonify
from flask_cors import CORS
from ddgs import DDGS
import requests
import json
import re

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/research": {
            "origins": [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
            ]
        }
    },
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:1b"

VALID_STATUSES = {
    "Supported",
    "Contradicted",
    "Insufficient evidence",
}


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Research Agent backend is running!",
        "model": MODEL_NAME,
        "features": [
            "Web search",
            "AI research reports",
            "Source links",
            "Claim-level evidence assessment",
            "Uncertainty warnings",
        ],
    })


def search_web(question, max_results=5):
    """Retrieve search-result titles, URLs and snippets."""
    results = []

    with DDGS() as search:
        search_results = search.text(
            question,
            max_results=max_results,
        )

        for item in search_results:
            url = item.get("href", "")
            title = item.get("title", "")
            snippet = item.get("body", "")

            if url and title:
                results.append({
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                })

    return results


def call_ollama(prompt, timeout=180):
    """Generate a response using the local Ollama model."""
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
            },
        },
        timeout=timeout,
    )

    response.raise_for_status()

    answer = response.json().get("response", "").strip()

    if not answer:
        raise ValueError("Ollama returned an empty response.")

    return answer


def parse_json_response(text):
    """Parse JSON, including JSON wrapped in Markdown fences."""
    cleaned = text.strip()

    cleaned = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to recover the first JSON object.
    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start != -1 and end > start:
        return json.loads(cleaned[start:end + 1])

    raise ValueError("The AI did not return valid JSON.")


def build_evidence(sources):
    """Give every retrieved result a stable source ID."""
    evidence_parts = []

    for index, source in enumerate(sources, start=1):
        source["source_id"] = f"S{index}"

        evidence_parts.append(
            f"[{source['source_id']}]\n"
            f"Title: {source['title']}\n"
            f"URL: {source['url']}\n"
            f"Search excerpt: {source['snippet']}"
        )

    return "\n\n".join(evidence_parts)


def extract_claims(answer, evidence):
    """Extract checkable factual claims from the AI report."""
    prompt = f"""
You are a factual-claim extraction assistant.

Extract up to 8 distinct, checkable factual claims from the report.

Rules:
- Extract only claims actually stated in the report.
- Prefer specific factual statements over opinions or recommendations.
- Split sentences containing multiple factual claims.
- Do not add new facts.
- Do not decide whether claims are true.
- Ignore headings, general advice, and statements about limitations.
- If there are no checkable claims, return an empty list.
- Return valid JSON only, with no Markdown fences.

Use this exact JSON structure:
{{
  "claims": [
    {{
      "claim_id": "C1",
      "claim": "One factual statement"
    }}
  ]
}}

Report:
{answer}

Available search evidence:
{evidence}
"""

    raw = call_ollama(prompt)
    parsed = parse_json_response(raw)

    claims = parsed.get("claims", [])

    if not isinstance(claims, list):
        return []

    cleaned_claims = []

    for index, item in enumerate(claims[:8], start=1):
        if not isinstance(item, dict):
            continue

        claim_text = item.get("claim", "")

        if not isinstance(claim_text, str) or not claim_text.strip():
            continue

        cleaned_claims.append({
            "claim_id": f"C{index}",
            "claim": claim_text.strip(),
        })

    return cleaned_claims


def verify_claims(claims, sources):
    """Assess each extracted claim against the available excerpts."""
    if not claims:
        return []

    evidence = build_evidence_for_verification(sources)

    claims_text = "\n".join(
        f"{item['claim_id']}: {item['claim']}"
        for item in claims
    )

    prompt = f"""
You are a cautious evidence assessment assistant.

Assess every claim against the supplied search-result excerpts only.

Allowed statuses:
- Supported: the supplied excerpts directly support the claim.
- Contradicted: the supplied excerpts directly conflict with the claim.
- Insufficient evidence: the excerpts do not establish whether the
  claim is true or false.

Rules:
- Do not use outside knowledge.
- A missing mention is not proof that a claim is false.
- Do not treat a source title alone as proof.
- Do not invent quotations or source IDs.
- Use only source IDs shown in the supplied evidence.
- Include only sources relevant to your assessment.
- Explain the reason briefly.
- If evidence is ambiguous or weak, use Insufficient evidence.
- Return one assessment for every supplied claim.
- Return valid JSON only, with no Markdown fences.

Use this exact JSON structure:
{{
  "verifications": [
    {{
      "claim_id": "C1",
      "status": "Supported",
      "reason": "Brief explanation based on the excerpts.",
      "source_ids": ["S1"]
    }}
  ]
}}

Claims:
{claims_text}

Retrieved search evidence:
{evidence}
"""

    raw = call_ollama(prompt)
    parsed = parse_json_response(raw)
    raw_items = parsed.get("verifications", [])

    if not isinstance(raw_items, list):
        raw_items = []

    # Accept only claims and source IDs that actually exist.
    claim_lookup = {
        item["claim_id"]: item
        for item in claims
    }

    source_ids = {
        source["source_id"]
        for source in sources
    }

    result_lookup = {}

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        claim_id = item.get("claim_id")

        if claim_id not in claim_lookup:
            continue

        status = item.get("status", "Insufficient evidence")

        if status not in VALID_STATUSES:
            status = "Insufficient evidence"

        raw_source_ids = item.get("source_ids", [])

        if not isinstance(raw_source_ids, list):
            raw_source_ids = []

        valid_source_ids = [
            source_id
            for source_id in raw_source_ids
            if isinstance(source_id, str)
            and source_id in source_ids
        ]

        # A supported or contradicted claim needs evidence references.
        if status in {"Supported", "Contradicted"} and not valid_source_ids:
            status = "Insufficient evidence"

        reason = item.get("reason", "")

        if not isinstance(reason, str):
            reason = ""

        result_lookup[claim_id] = {
            "claim_id": claim_id,
            "status": status,
            "reason": reason.strip(),
            "source_ids": valid_source_ids,
        }

    # Missing assessments are never silently treated as verified.
    final_results = []

    for claim in claims:
        assessment = result_lookup.get(claim["claim_id"])

        if assessment is None:
            assessment = {
                "claim_id": claim["claim_id"],
                "status": "Insufficient evidence",
                "reason": (
                    "The AI did not return a valid assessment "
                    "for this claim."
                ),
                "source_ids": [],
            }

        final_results.append({
            **claim,
            **assessment,
        })

    return final_results


def build_evidence_for_verification(sources):
    """Format source excerpts with their assigned IDs."""
    return "\n\n".join(
        f"[{source['source_id']}]\n"
        f"Title: {source['title']}\n"
        f"URL: {source['url']}\n"
        f"Search excerpt: {source['snippet']}"
        for source in sources
    )


@app.route("/research", methods=["POST"])
def research():
    data = request.get_json(silent=True) or {}

    question = data.get("question", "")
    criteria = data.get("criteria", [])
    preferred_sources = data.get("sources", [])

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "error": "Please enter a research question."
        }), 400

    question = question.strip()

    if not isinstance(criteria, list):
        criteria = []

    if not isinstance(preferred_sources, list):
        preferred_sources = []

    # Step 1: Retrieve web search results.
    try:
        sources = search_web(question, max_results=5)

    except Exception:
        app.logger.exception("Web search failed")

        return jsonify({
            "error": (
                "Web search failed. Check your internet "
                "connection and try again."
            )
        }), 502

    if not sources:
        return jsonify({
            "error": (
                "No search results were found. "
                "Try a different question."
            ),
            "sources": [],
        }), 404

    # Step 2: Assign source IDs for citation and verification.
    evidence = build_evidence(sources)

    # Step 3: Generate the research report.
    research_prompt = f"""
You are an evidence-conscious research assistant.

Answer the user's question using only the supplied search excerpts.

Rules:
- Treat excerpts as limited evidence, not complete webpages.
- Do not claim that you opened or verified full pages.
- Do not invent facts, statistics, quotations, or citations.
- Cite results using their source IDs, such as [S1] or [S2].
- Use a citation only when its excerpt supports the claim.
- Say "Not verified" if the evidence is insufficient.
- Explain conflicts if excerpts disagree.
- Consider the user's evaluation criteria.
- Do not invent scores or unsupported rankings.
- Finish with a short section called "Limitations".

Question:
{question}

Evaluation criteria:
{json.dumps(criteria, ensure_ascii=False)}

User-preferred sources:
{json.dumps(preferred_sources, ensure_ascii=False)}

Retrieved search evidence:
{evidence}

Write a clear, structured research report.
"""

    try:
        answer = call_ollama(research_prompt)

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": (
                "Cannot connect to Ollama. "
                "Make sure Ollama is running."
            )
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "The AI took too long to respond. Try again."
        }), 504

    except requests.exceptions.RequestException:
        app.logger.exception("Research generation failed")

        return jsonify({
            "error": "The local AI request failed."
        }), 502

    # Step 4: Extract claims and assess them individually.
    verification_status = "completed"
    claim_verification = []
    verification_message = (
        "Claims were assessed against retrieved search excerpts. "
        "This is an AI-generated assessment, not independent "
        "confirmation of the truth of each claim."
    )

    try:
        claims = extract_claims(answer, evidence)
        claim_verification = verify_claims(claims, sources)

    except (
        requests.exceptions.RequestException,
        ValueError,
        TypeError,
        KeyError,
    ):
        app.logger.exception("Claim verification failed")

        verification_status = "unavailable"
        verification_message = (
            "The research report was generated, but claim-level "
            "verification could not be completed. Do not treat "
            "the report as independently fact-checked."
        )

    # Step 5: Return the report, sources, and claim assessments.
    return jsonify({
        "answer": answer,
        "model": MODEL_NAME,
        "sources": sources,
        "criteria": criteria,
        "status": "success",
        "verification_status": verification_status,
        "claim_verification": claim_verification,
        "verification_note": verification_message,
    }), 200


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False,
    )
