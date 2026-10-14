
import { useState } from "react";

const badge = {
  meets: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  fails: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

export default function App() {
  const [question, setQuestion] = useState("");
  const [criteria, setCriteria] = useState("");
  const [sources, setSources] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!question.trim() || !criteria.trim() || !sources.trim()) {
      setError("Please enter a question, criteria, and at least one source URL.");
      return;
    }

    setLoading(true);
    setData(null);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          criteria: criteria.split("\n").map(c => c.trim()).filter(Boolean),
          sources: sources.split("\n").map(s => s.trim()).filter(Boolean),
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || `Request failed (${res.status})`);
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Research failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  // Use the same criteria columns for every option.
  const criteriaList = [
    ...new Set([
      ...criteria.split("\n").map(c => c.trim()).filter(Boolean),
      ...(data?.comparison || []).flatMap(row =>
        Object.keys(row.scores || {})
      ),
    ]),
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Research-to-Execution Agent
        </h1>

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <input
            className={input}
            placeholder="Research question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />

          <textarea
            className={input}
            rows={3}
            placeholder="Criteria (one per line)"
            value={criteria}
            onChange={e => setCriteria(e.target.value)}
          />

          <textarea
            className={input}
            rows={3}
            placeholder="Permitted source URLs (one per line)"
            value={sources}
            onChange={e => setSources(e.target.value)}
          />

          <button
            onClick={run}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Researching..." : "Run Agent"}
          </button>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        {data && !data.error && (
          <>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold mb-2">Summary</h2>
              <p className="text-sm text-slate-700">{data.summary}</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <h2 className="font-semibold mb-3">Comparison</h2>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b bg-slate-50">
                    <th className="p-3">Option</th>
                    {criteriaList.map(c => (
                      <th key={c} className="p-3 min-w-40">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(data.comparison || []).map((row, index) => (
                    <tr
                      key={row.option || index}
                      className="border-b align-top"
                    >
                      <td className="p-3 font-medium">{row.option}</td>

                      {criteriaList.map(c => {
                        const score = Object.entries(row.scores || {}).find(
                          ([key]) =>
                            key.trim().toLowerCase() === c.trim().toLowerCase()
                        )?.[1];

                        return (
                          <td key={c} className="p-3 min-w-40">
                            {score ? (
                              <div className="space-y-2">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs ${
                                    badge[score.verdict] || badge.unknown
                                  }`}
                                >
                                  {score.verdict || "unknown"}
                                </span>

                                {score.evidence && (
                                  <p className="text-xs italic text-slate-500">
                                    "{score.evidence}"
                                  </p>
                                )}

                                {score.source && (
                                  <a
                                    href={score.source}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-teal-600 underline"
                                  >
                                    View source
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                unknown — no criterion data returned
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
              <h2 className="font-semibold mb-2">Recommendation</h2>
              <p className="text-sm">{data.recommendation}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="font-semibold mb-2">Could not verify</h2>
              <ul className="list-disc ml-5 text-sm">
                {(data.unverified || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
