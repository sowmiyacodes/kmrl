import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";

// Set worker via CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


export default function SmartDocumentHub() {
  const { role } = useParams(); // role from URL
  const navigate = useNavigate();
  const [docs, setDocs] = useState(() => {
    try {
      const raw = localStorage.getItem("smart_docs_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("smart_docs_v1", JSON.stringify(docs));
  }, [docs]);

  // Role-based visibility
  const visibleDocsForRole = (r, list) => {
    if (r === "admin") return list;
    if (r === "engineer") return list.filter(d => ["engineering", "safety", "general"].includes(d.category));
    if (r === "finance") return list.filter(d => ["finance", "general"].includes(d.category));
    return list.filter(d => d.category === "general");
  };

  const visibleDocs = visibleDocsForRole(role, docs);
  const filteredByQuery = visibleDocs.filter(d => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (d.name || "").toLowerCase().includes(q) ||
           (d.summary || "").toLowerCase().includes(q) ||
           (d.rawText || "").toLowerCase().includes(q);
  });

  const counts = docs.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

  // ---------------------
  // File Text Extraction
  // ---------------------
  async function extractTextFromFile(file) {
    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + "\n";
        }
        return text;
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(String(e.target.result || file.name));
          reader.readAsText(file);
        });
      }
    } catch (err) {
      console.error("Error extracting text:", err);
      return file.name; // fallback
    }
  }

  // ---------------------
  // Upload Handling
  // ---------------------
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

  // ---------------------
  // Summary & Classification
  // ---------------------
  function createSummary(text, wordLimit = 30) {
    if (!text) return "(No text content)";
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    return words.length <= wordLimit ? words.join(" ") : words.slice(0, wordLimit).join(" ") + "...";
  }

  function classifyText(text) {
    const t = (text || "").toLowerCase();
    const finance = ["invoice","bill","payment","purchase order","po","vendor","contract"];
    const engineering = ["drawing","design","engineer","maintenance","job card","rolling stock","depot","track"];
    const safety = ["safety","bulletin","incident","accident","compliance","cmrs"];
    const hr = ["hr","training","policy","employee","payroll"];
    const regulatory = ["commissioner","ministry","directive","regulation","environment"];

    const scores = { finance:0, engineering:0, safety:0, hr:0, regulatory:0 };
    finance.forEach(k=>{if(t.includes(k)) scores.finance++;});
    engineering.forEach(k=>{if(t.includes(k)) scores.engineering++;});
    safety.forEach(k=>{if(t.includes(k)) scores.safety++;});
    hr.forEach(k=>{if(t.includes(k)) scores.hr++;});
    regulatory.forEach(k=>{if(t.includes(k)) scores.regulatory++;});

    const picked = Object.keys(scores).reduce((a,b)=>scores[a]>=scores[b]?a:b);
    return Object.values(scores).every(v=>v===0)?"general":picked;
  }

  function handleDelete(id) {
    setDocs(prev => prev.filter(d => d.id !== id));
    if (selectedDoc && selectedDoc.id === id) setSelectedDoc(null);
  }

  // ---------------------
  // Render
  // ---------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Smart Document Hub — {role.charAt(0).toUpperCase() + role.slice(1)}</h1>
          </div>
          <button
            onClick={()=>navigate("/signin")}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >Sign Out</button>
        </header>

        {/* Upload & Search */}
        <section className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} />
            <p className="text-xs text-gray-500 mt-1">TXT / PDF / DOCX. Scanned images require OCR.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              placeholder="Search documents..."
              value={query}
              onChange={e=>setQuery(e.target.value)}
              className="p-2 border rounded-md w-72"
            />
            <button onClick={()=>setQuery("")} className="px-3 py-2 bg-gray-100 rounded-md">Clear</button>
          </div>
        </section>

        {/* Dashboard & Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dashboard */}
          <aside className="col-span-1 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Dashboard</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div>All documents: <strong>{docs.length}</strong></div>
              <div>Visible to role ({role}): <strong>{visibleDocs.length}</strong></div>
              <div className="mt-2 space-y-1">
                {Object.entries(counts).map(([cat,num])=>(
                  <div key={cat} className="flex justify-between capitalize">{cat} <span>{num}</span></div>
                ))}
              </div>
            </div>
          </aside>

          {/* Document List */}
          <main className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">Documents</h3>
            <div className="border rounded-md overflow-hidden">
              {filteredByQuery.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No documents match search/role.</div>
              ) : (
                <ul>
                  {filteredByQuery.map(d=>(
                    <li key={d.id} className="flex items-start gap-4 px-4 py-3 border-b last:border-b-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-500">DOC</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</div>
                          </div>
                          <div className="text-sm text-gray-600 capitalize">{d.category}</div>
                        </div>
                        <div className="text-sm text-gray-700 mt-2">{d.summary}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={()=>setSelectedDoc(d)} className="px-3 py-1 border rounded-md">Preview</button>
                          <a href={d.blobUrl} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded-md">Open</a>
                          {role==="admin" && (
                            <button onClick={()=>handleDelete(d.id)} className="px-3 py-1 border rounded-md text-red-600">Delete</button>
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
            <div className="bg-white rounded-lg max-w-3xl w-full shadow-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold">{selectedDoc.name}</h3>
                  <div className="text-xs text-gray-500">Category: {selectedDoc.category}</div>
                  <div className="text-xs text-gray-500">Uploaded: {new Date(selectedDoc.uploadedAt).toLocaleString()}</div>
                </div>
                <button onClick={()=>setSelectedDoc(null)} className="px-3 py-1 border rounded-md">Close</button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Summary</h4>
                  <p className="text-sm text-gray-700 mt-2">{selectedDoc.summary}</p>
                  <h4 className="font-medium mt-4">Extract (first 500 chars)</h4>
                  <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded mt-2 max-h-48 overflow-auto">{selectedDoc.rawText.slice(0,500)}</pre>
                </div>
                <div>
                  <h4 className="font-medium">Actions</h4>
                  <div className="flex flex-col gap-2 mt-2">
                    <a href={selectedDoc.blobUrl} target="_blank" rel="noreferrer" className="px-3 py-2 border rounded-md text-center">Open Original File</a>
                    <button onClick={()=>navigator.clipboard.writeText(selectedDoc.summary||selectedDoc.name)} className="px-3 py-2 border rounded-md">Copy Summary</button>
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
