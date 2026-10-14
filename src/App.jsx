
import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/research";

const sampleQuestions = [
  "Compare Python and Java for beginners in India.",
  "Compare popular machine learning models for image classification.",
  "Find the best resources to learn data structures and algorithms.",
];

function App() {
  const [question, setQuestion] = useState("");
  const [criteriaText, setCriteriaText] = useState(
    "Accuracy of information\nLearning difficulty\nPractical applications"
  );
  const [sourcesText, setSourcesText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const criteria = criteriaText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const preferredSources = sourcesText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  async function handleResearch(event) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Please enter a research question.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          criteria,
          sources: preferredSources,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Research request failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Cannot connect to the backend. Make sure Flask is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  function selectSample(sample) {
    setQuestion(sample);
    setResult(null);
    setError("");
  }

  function getStatusClass(status) {
    if (status === "Supported") return "supported";
    if (status === "Contradicted") return "contradicted";
    return "insufficient";
  }

  const claims = Array.isArray(result?.claim_verification)
    ? result.claim_verification
    : [];

  const sources = Array.isArray(result?.sources) ? result.sources : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">R</div>
          <div>
            <h2>Research Agent</h2>
            <p>Evidence-based research</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div className="nav-item active">
          <span>⌕</span>
          Research workspace
        </div>

        <div className="nav-item">
          <span>✓</span>
          Claim verification
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Local AI engine</strong>
            <p>Ollama · llama3.2:1b</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">WORKSPACE / RESEARCH</span>
            <h1>Research workspace</h1>
          </div>

          <div className="topbar-badge">
            <span className="status-dot" />
            Local AI
          </div>
        </header>

        <section className="hero">
          <div className="hero-tag">
            <span>✦</span> AI-POWERED RESEARCH
          </div>

          <h2>
            Turn questions into
            <br />
            <span>evidence-backed insights.</span>
          </h2>

          <p>
            Research a topic, evaluate it against your criteria, and inspect
            the evidence behind individual claims.
          </p>
        </section>

        <section className="workspace-grid">
          <form className="research-form" onSubmit={handleResearch}>
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h3>Research question</h3>
                <p>What would you like to investigate?</p>
              </div>
            </div>

            <textarea
              className="question-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: Compare Python and Java for beginners in India..."
              rows={5}
            />

            <div className="section-heading form-section-heading">
              <span className="section-number">02</span>
              <div>
                <h3>Evaluation criteria</h3>
                <p>One criterion per line</p>
              </div>
            </div>

            <textarea
              className="settings-input"
              value={criteriaText}
              onChange={(event) => setCriteriaText(event.target.value)}
              placeholder={"Cost\nReliability\nEase of use"}
              rows={3}
            />

            <div className="section-heading form-section-heading">
              <span className="section-number">03</span>
              <div>
                <h3>Preferred sources</h3>
                <p>Optional domains, one per line</p>
              </div>
            </div>

            <textarea
              className="settings-input"
              value={sourcesText}
              onChange={(event) => setSourcesText(event.target.value)}
              placeholder={"python.org\noracle.com"}
              rows={2}
            />

            <button
              type="submit"
              className="research-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Researching and checking claims...
                </>
              ) : (
                <>
                  Run research <span>↗</span>
                </>
              )}
            </button>

            <p className="form-note">
              Research and verification may take a minute because the local
              AI model performs multiple steps.
            </p>

            {error && (
              <div className="error-message">
                <strong>Something went wrong</strong>
                <p>{error}</p>
                <p>
                  Check that Flask and Ollama are running, then try again.
                </p>
              </div>
            )}
          </form>

          <aside className="examples-panel">
            <div className="section-heading">
              <span className="section-number">✦</span>
              <div>
                <h3>Try an example</h3>
                <p>Start with a sample question</p>
              </div>
            </div>

            <div className="sample-list">
              {sampleQuestions.map((sample, index) => (
                <button
                  type="button"
                  className="sample-card"
                  key={sample}
                  onClick={() => selectSample(sample)}
                >
                  <span className="sample-index">0{index + 1}</span>
                  <span>{sample}</span>
                  <span className="sample-arrow">↗</span>
                </button>
              ))}
            </div>

            <div className="process-card">
              <span className="process-icon">◎</span>
              <h3>How it works</h3>

              <div className="process-step">
                <span>1</span>
                <div>
                  <strong>Search the web</strong>
                  <p>Collect relevant source excerpts.</p>
                </div>
              </div>

              <div className="process-step">
                <span>2</span>
                <div>
                  <strong>Generate a report</strong>
                  <p>Use your question and criteria.</p>
                </div>
              </div>

              <div className="process-step">
                <span>3</span>
                <div>
                  <strong>Assess individual claims</strong>
                  <p>Compare claims with retrieved evidence.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {result && (
          <section className="results-section">
            <div className="results-title">
              <div>
                <span className="section-kicker">RESEARCH OUTPUT</span>
                <h2>Your research report</h2>
              </div>

              <span className="result-model">
                {result.model || "Local AI model"}
              </span>
            </div>

            <article className="report-card">
              <div className="report-card-heading">
                <span className="report-icon">✦</span>
                <div>
                  <h3>Research summary</h3>
                  <p>Generated from retrieved web evidence</p>
                </div>
              </div>

              <div className="report-answer">
                {result.answer || "No report was returned."}
              </div>
            </article>

            <section className="verification-section">
              <div className="sources-heading">
                <div>
                  <span className="section-kicker">
                    04 / CLAIM CHECK
                  </span>
                  <h3>Claim-level evidence verification</h3>
                </div>

                <span className="muted-text">
                  {claims.length} claims assessed
                </span>
              </div>

              {result.verification_status === "unavailable" && (
                <div className="verification-warning">
                  Claim verification could not be completed. The research
                  report is available, but its claims have not been assessed.
                  {result.verification_note
                    ? ` ${result.verification_note}`
                    : ""}
                </div>
              )}

              {result.verification_status === "completed" &&
                claims.length === 0 && (
                  <div className="verification-warning">
                    No checkable claims were extracted from this report.
                  </div>
                )}

              {claims.length > 0 && (
                <>
                  <div className="verification-summary">
                    <div className="summary-stat">
                      <span className="summary-number">
                        {
                          claims.filter(
                            (item) => item.status === "Supported"
                          ).length
                        }
                      </span>
                      <span className="summary-label">Supported</span>
                    </div>

                    <div className="summary-stat">
                      <span className="summary-number">
                        {
                          claims.filter(
                            (item) => item.status === "Contradicted"
                          ).length
                        }
                      </span>
                      <span className="summary-label">Contradicted</span>
                    </div>

                    <div className="summary-stat">
                      <span className="summary-number">
                        {
                          claims.filter(
                            (item) =>
                              item.status !== "Supported" &&
                              item.status !== "Contradicted"
                          ).length
                        }
                      </span>
                      <span className="summary-label">
                        Insufficient evidence
                      </span>
                    </div>
                  </div>

                  <div className="claim-list">
                    {claims.map((item, index) => {
                      const status = [
                        "Supported",
                        "Contradicted",
                      ].includes(item.status)
                        ? item.status
                        : "Insufficient evidence";

                      const referencedSources = Array.isArray(
                        item.source_ids
                      )
                        ? item.source_ids
                        : [];

                      return (
                        <article
                          className="claim-card"
                          key={item.claim_id || index}
                        >
                          <div className="claim-header">
                            <span className="claim-id">
                              {item.claim_id || `C${index + 1}`}
                            </span>

                            <span
                              className={`claim-status ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <p className="claim-text">
                            {item.claim || "Claim text unavailable."}
                          </p>

                          <div className="claim-reason">
                            <strong>ASSESSMENT</strong>
                            <p>
                              {item.reason ||
                                "No explanation was returned."}
                            </p>
                          </div>

                          <div className="claim-sources">
                            <strong>EVIDENCE REFERENCES</strong>

                            {referencedSources.length > 0 ? (
                              <div className="claim-source-links">
                                {referencedSources.map((sourceId) => {
                                  const source = sources.find(
                                    (entry) =>
                                      entry.source_id === sourceId
                                  );

                                  if (!source) {
                                    return (
                                      <span
                                        key={sourceId}
                                        className="claim-source-tag"
                                      >
                                        {sourceId}
                                      </span>
                                    );
                                  }

                                  return (
                                    <a
                                      key={sourceId}
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="claim-source-tag"
                                    >
                                      {sourceId}: {source.title || "Source"} ↗
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="muted-text">
                                No relevant source was identified.
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="verification-disclaimer">
                Important: these are AI-generated assessments based on
                retrieved search excerpts, not independent proof of truth.
                Supported means the available excerpts appear to support
                the claim. Open the original sources before relying on
                important information.
              </p>
            </section>

            <section className="criteria-section">
              <div className="sources-heading">
                <div>
                  <span className="section-kicker">YOUR REQUIREMENTS</span>
                  <h3>Evaluation criteria</h3>
                </div>
              </div>

              <div className="criteria-tags">
                {(Array.isArray(result.criteria)
                  ? result.criteria
                  : []
                ).map((criterion, index) => (
                  <span className="criteria-tag" key={`${criterion}-${index}`}>
                    ✓ {criterion}
                  </span>
                ))}
              </div>
            </section>

            <section className="sources-section">
              <div className="sources-heading">
                <div>
                  <span className="section-kicker">RETRIEVED EVIDENCE</span>
                  <h3>Research sources</h3>
                </div>

                <span className="muted-text">
                  {sources.length} sources
                </span>
              </div>

              {sources.length === 0 ? (
                <p className="muted-text">No sources were returned.</p>
              ) : (
                <div className="source-list">
                  {sources.map((source, index) => (
                    <article
                      className="source-card"
                      key={source.source_id || source.url || index}
                    >
                      <div className="source-number">
                        {source.source_id || `S${index + 1}`}
                      </div>

                      <div className="source-content">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-title"
                        >
                          {source.title || source.url || "Untitled source"} ↗
                        </a>

                        {source.url && (
                          <p className="source-url">{source.url}</p>
                        )}

                        <p className="source-snippet">
                          {source.snippet || "No excerpt available."}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {result.verification_note && (
              <p className="verification-disclaimer">
                {result.verification_note}
              </p>
            )}
          </section>
        )}

        <footer className="footer">
          Research Agent · React + Flask + Ollama
          <span>AI assessments require human review.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
