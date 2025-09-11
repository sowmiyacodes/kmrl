import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function SmartDocumentHub() {
  const { role: routeRole } = useParams();
  const [role, setRole] = useState(routeRole || "engineer");
  const [docs, setDocs] = useState(() => {
    try {
      const raw = localStorage.getItem("smart_docs_v1");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("smart_docs_v1", JSON.stringify(docs));
  }, [docs]);

  // Rule-based classifier
  function classifyText(text) {
    const t = (text || "").toLowerCase();
    const finance = ["invoice", "bill", "payment", "purchase order", "po", "vendor", "contract"];
    const engineering = ["drawing", "design", "engineer", "maintenance", "job card", "rolling stock", "depot", "track"];
    const safety = ["safety", "bulletin", "incident", "accident", "compliance", "cmrs"];
    const hr = ["hr", "training", "policy", "employee", "payroll"];
    const regulatory = ["commissioner", "ministry", "directive", "regulation", "environment"];

    const scores = { finance: 0, engineering: 0, safety: 0, hr: 0, regulatory: 0 };
    finance.forEach(k => { if (t.includes(k)) scores.finance++; });
    engineering.forEach(k => { if (t.includes(k)) scores.engineering++; });
    safety.forEach(k => { if (t.includes(k)) scores.safety++; });
    hr.forEach(k => { if (t.includes(k)) scores.hr++; });
    regulatory.forEach(k => { if (t.includes(k)) scores.regulatory++; });

    const picked = Object.keys(scores).reduce((a, b) => (scores[a] >= scores[b] ? a : b));
    const allZero = Object.values(scores).every(v => v === 0);
    return allZero ? "general" : picked;
  }

  function extractTextFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(String(e.target.result || file.name));
      reader.readAsText(file);
    });
  }

  async function handleUpload(e) {
    const files = e.target.files || [];
    if (!files.length) return;
    const uploaded = [];
    for (const f of Array.from(files)) {
      const rawText = await extractTextFromFile(f);
      const category = classifyText(rawText + " " + f.name);
      const summary = createSummary(rawText);

      uploaded.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        category,
        summary,
        rawText: rawText.slice(0, 20000),
        blobUrl: URL.createObjectURL(f),
      });
    }
    setDocs(prev => [...uploaded, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = null;
  }

  function createSummary(text, wordLimit = 30) {
    if (!text) return "(No text content; see original)";
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    if (words.length <= wordLimit) return words.join(" ");
    return words.slice(0, wordLimit).join(" ") + "...";
  }

  function handleDelete(id) {
    setDocs(docs.filter(d => d.id !== id));
    if (selectedDoc && selectedDoc.id === id) setSelectedDoc(null);
  }

  function visibleDocsForRole(r, list) {
    if (r === "admin") return list;
    if (r === "engineer") return list.filter(d => ["engineering", "safety", "general"].includes(d.category));
    if (r === "finance") return list.filter(d => ["finance", "general"].includes(d.category));
    return list.filter(d => d.category === "general");
  }

  const visibleDocs = visibleDocsForRole(role, docs);
  const filteredByQuery = visibleDocs.filter(d => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (d.name || "").toLowerCase().includes(q) || (d.summary || "").toLowerCase().includes(q) || (d.rawText || "").toLowerCase().includes(q);
  });

  const counts = docs.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Smart Document Hub — KMRL</h1>
            <p className="text-sm text-gray-600">Upload, categorize, summarize, search, role-based access</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <label className="text-sm text-gray-700">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="p-2 border rounded-md bg-white text-gray-800"
            >
              <option value="admin">Admin</option>
              <option value="engineer">Engineer</option>
              <option value="finance">Finance</option>
            </select>
          </div>
        </header>

        {/* Upload + Search */}
        <section className="bg-white rounded-lg p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <input ref={fileInputRef} onChange={handleUpload} type="file" multiple
                   className="p-2 border border-gray-300 rounded-md w-full md:w-auto"/>
            <p className="text-xs text-gray-500 mt-1">PDF / DOC / TXT accepted. Scanned files require OCR integration.</p>
          </div>
          <div className="flex items-center gap-3">
            <input placeholder="Search documents..." value={query} onChange={e => setQuery(e.target.value)}
                   className="p-2 border border-gray-300 rounded-md w-full md:w-72"/>
            <button onClick={() => setQuery("")}
                    className="px-3 py-2 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200">Clear</button>
          </div>
        </section>

        {/* Dashboard + Document list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Dashboard */}
          <aside className="col-span-1 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-900">Dashboard</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div>All documents: <strong>{docs.length}</strong></div>
              <div>Visible to role ({role}): <strong>{visibleDocs.length}</strong></div>
              <div>Categories:</div>
              <div className="mt-2 space-y-1">
                {Object.entries(counts).length === 0 && <div className="text-xs text-gray-500">No uploads yet</div>}
                {Object.entries(counts).map(([cat, num]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="capitalize">{cat}</div>
                    <div className="font-medium">{num}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900">Quick tips</h4>
              <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Upload docs and watch auto-tagging.</li>
                <li>Search by filename or summary text.</li>
                <li>Switch role to test access control.</li>
              </ul>
            </div>
          </aside>

          {/* Document list */}
          <main className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-900">Documents</h3>
            <div className="border rounded-md overflow-hidden">
              {filteredByQuery.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No documents match the search/role.</div>
              ) : (
                <ul>
                  {filteredByQuery.map(d => (
                    <li key={d.id} className="flex items-start gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 rounded-md">
                      <div className="w-12 shrink-0">
                        <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-500">DOC</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{d.name}</div>
                            <div className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium text-white capitalize
                              ${d.category === "finance" ? "bg-orange-500" :
                                d.category === "engineering" ? "bg-blue-600" :
                                d.category === "safety" ? "bg-red-500" :
                                d.category === "hr" ? "bg-green-500" :
                                d.category === "regulatory" ? "bg-purple-600" : "bg-gray-500"}`}>
                              {d.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 mt-2">{d.summary}</div>

                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => setSelectedDoc(d)} className="px-3 py-1 border rounded-md text-gray-800 hover:bg-gray-100">Preview</button>
                          <a href={d.blobUrl} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded-md text-gray-800 hover:bg-gray-100">Open</a>
                          {role === "admin" && (
                            <button onClick={() => handleDelete(d.id)} className="px-3 py-1 border rounded-md text-red-600 hover:bg-red-100">Delete</button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </main>

        </div>

        {/* Preview Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full shadow-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedDoc.name}</h3>
                  <div className="text-xs text-gray-500 mt-1">Category: <span className="capitalize">{selectedDoc.category}</span></div>
                  <div className="text-xs text-gray-500">Uploaded: {new Date(selectedDoc.uploadedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDoc(null)} className="px-3 py-1 border rounded-md hover:bg-gray-100">Close</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Summary</h4>
                  <p className="text-sm text-gray-700 mt-2">{selectedDoc.summary}</p>

                  <h4 className="font-medium text-gray-900 mt-4">Extract (first 500 chars)</h4>
                  <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded mt-2 max-h-48 overflow-auto">{selectedDoc.rawText.slice(0, 500)}</pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Actions</h4>
                  <div className="mt-2 flex flex-col gap-2">
                    <a href={selectedDoc.blobUrl} target="_blank" rel="noreferrer" className="px-3 py-2 border rounded-md text-center text-gray-800 hover:bg-gray-100">
                      Open original file
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(selectedDoc.summary || selectedDoc.name)} className="px-3 py-2 border rounded-md hover:bg-gray-100">
                      Copy summary
                    </button>
                    <div className="text-xs text-gray-500 mt-3">Note: For scanned docs add OCR integration (Tesseract.js) or server-side OCR.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
