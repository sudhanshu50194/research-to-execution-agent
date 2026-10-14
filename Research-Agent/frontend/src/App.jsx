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

  const run = async () => {
    setLoading(true); setData(null);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        criteria: criteria.split("\n").filter(Boolean),
        sources: sources.split("\n").filter(Boolean),
      }),
    });
    setData(await res.json());
    setLoading(false);
  };

  const input = "w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Research-to-Execution Agent</h1>

        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <input className={input} placeholder="Research question"
                 value={question} onChange={e => setQuestion(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Criteria (one per line)"
                    value={criteria} onChange={e => setCriteria(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Permitted source URLs (one per line)"
                    value={sources} onChange={e => setSources(e.target.value)} />
          <button onClick={run} disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? "Researching..." : "Run Agent"}
          </button>
        </div>

        {data?.error && <p className="text-red-600">{data.error}</p>}

        {data && !data.error && (
          <>
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold mb-2">Summary</h2>
              <p className="text-sm text-slate-700">{data.summary}</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <h2 className="font-semibold mb-3">Comparison</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Option</th>
                    {Object.keys(data.comparison[0]?.scores || {}).map(c =>
                      <th key={c} className="p-2">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.map(row => (
                    <tr key={row.option} className="border-b align-top">
                      <td className="p-2 font-medium">{row.option}</td>
                      {Object.entries(row.scores).map(([c, s]) => (
                        <td key={c} className="p-2 space-y-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${badge[s.verdict]}`}>{s.verdict}</span>
                          {s.evidence && <p className="text-xs italic text-slate-500">"{s.evidence}"</p>}
                          {s.source && <a href={s.source} target="_blank" rel="noreferrer"
                                          className="text-xs text-teal-600 underline">source</a>}
                        </td>
                      ))}
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
                {data.unverified?.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}