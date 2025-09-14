import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function SmartDocumentHub() {
  const { role } = useParams();
  const navigate = useNavigate();

  // ----------------- State -----------------
  const [docs, setDocs] = useState(() => {
    try {
      const raw = localStorage.getItem("smart_docs_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState("uploadFile");
  const [newDocs, setNewDocs] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const fileInputRef = useRef(null);

  // ----------------- LocalStorage -----------------
  useEffect(() => {
    localStorage.setItem("smart_docs_v1", JSON.stringify(docs));
  }, [docs]);

  // ----------------- Role-based visibility -----------------
  const visibleDocsForRole = (r, list) => {
    if (r === "admin") return list;
    if (r === "engineer")
      return list.filter((d) =>
        ["engineering", "safety", "general"].includes(d.category)
      );
    if (r === "finance")
      return list.filter((d) => ["finance", "general"].includes(d.category));
    return list.filter((d) => d.category === "general");
  };
  const visibleDocs = visibleDocsForRole(role, docs);

  // ----------------- File extraction -----------------
  async function extractTextFromFile(file) {
    try {
      // PDF
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => item.str).join(" ") + "\n";
          }
          if (text.trim().length > 0) return text;
        } catch {
          console.warn("Falling back to OCR for scanned PDF");
        }

        // OCR via Flask
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://127.0.0.1:5000/ocr", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        return data.original || file.name;
      }

      // DOCX
      if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      // TXT or others
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(String(e.target.result || file.name));
        reader.readAsText(file);
      });
    } catch {
      return file.name;
    }
  }

  // ----------------- Upload -----------------
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
        uploadedBy: role,
        category,
        summary,
        rawText: rawText.slice(0, 20000),
        blobUrl: URL.createObjectURL(f),
      });
    }

    setDocs((prev) => [...uploaded, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = null;
  }

  function createSummary(text, wordLimit = 30) {
    if (!text) return "(No text content)";
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    return words.length <= wordLimit
      ? words.join(" ")
      : words.slice(0, wordLimit).join(" ") + "...";
  }

  function classifyText(text) {
    const t = (text || "").toLowerCase();
    const finance = ["invoice", "bill", "payment", "purchase order", "po", "vendor", "contract"];
    const engineering = ["drawing", "design", "engineer", "maintenance", "job card", "rolling stock", "depot", "track"];
    const safety = ["safety", "bulletin", "incident", "accident", "compliance", "cmrs"];
    const hr = ["hr", "training", "policy", "employee", "payroll"];
    const regulatory = ["commissioner", "ministry", "directive", "regulation", "environment"];

    const scores = { finance: 0, engineering: 0, safety: 0, hr: 0, regulatory: 0 };
    finance.forEach(k => t.includes(k) && scores.finance++);
    engineering.forEach(k => t.includes(k) && scores.engineering++);
    safety.forEach(k => t.includes(k) && scores.safety++);
    hr.forEach(k => t.includes(k) && scores.hr++);
    regulatory.forEach(k => t.includes(k) && scores.regulatory++);

    const picked = Object.keys(scores).reduce((a, b) => (scores[a] >= scores[b] ? a : b));
    return Object.values(scores).every(v => v === 0) ? "general" : picked;
  }

  function handleDelete(id) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedDoc && selectedDoc.id === id) setSelectedDoc(null);
  }

  // ----------------- Fetch Emails -----------------
  async function fetchEmails() {
    setLoadingEmails(true);
    try {
      const res = await fetch("http://127.0.0.1:5001/check_emails");
      const data = await res.json();
      const newFiles = data.messages.map((m, index) => ({
        id: `${Date.now()}-${index}`,
        name: m.filename,
        subject: m.subject,
        downloadUrl: m.downloadUrl,
        summary: "From email attachment",
      }));
      setNewDocs(newFiles);
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setLoadingEmails(false);
    }
  }

  // ----------------- Render -----------------
  const renderSubMenuContent = () => {
    switch (activeSubMenu) {
      case "uploadFile":
        return (
          <div>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="border p-2 rounded w-full"/>
            <p className="text-xs text-gray-500 mt-1">Supported: TXT / PDF / DOCX. Scanned images via OCR.</p>

            {docs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h2 className="font-semibold text-lg mb-2">Uploaded Documents</h2>
                {docs.map(d => (
                  <div key={d.id} className="p-2 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-gray-600">Category: {d.category} | Uploaded By: {d.uploadedBy} | {new Date(d.uploadedAt).toLocaleString()}</p>
                      <p className="text-sm mt-1">{d.summary}</p>
                    </div>
                  <div className="flex space-x-4">
                      <a
                        href={d.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all text-base"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-lg hover:bg-red-700 transform hover:scale-105 transition-all text-base"
                      >
                        Delete
                      </button>
</div>


                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "email":
        return (
          <div className="space-y-2">
            <button onClick={fetchEmails} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition" disabled={loadingEmails}>
              {loadingEmails ? "Fetching..." : "Fetch Emails"}
            </button>

            {newDocs.length === 0 ? (
              <p className="mt-2 text-gray-600">No new email documents.</p>
            ) : (
              newDocs.map(doc => (
                <div key={doc.id} className="p-2 border rounded-md shadow-sm bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-600">{doc.subject}</p>
                    <p className="text-sm text-gray-500">{doc.summary}</p>
                  </div>
                  <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download</a>
                </div>
              ))
            )}
          </div>
        );
      case "newPopups":
        return <div><p>No new pop-ups yet.</p></div>;
      case "viewTable":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse shadow rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Category</th>
                  <th className="px-3 py-2 border-b">Uploaded By</th>
                  <th className="px-3 py-2 border-b">Date</th>
                  <th className="px-3 py-2 border-b">Summary</th>
                  <th className="px-3 py-2 border-b">Download</th>
                </tr>
              </thead>
              <tbody>
                {visibleDocs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 border-b">
                    <td className="px-3 py-2">{d.name}</td>
                    <td className="px-3 py-2">{d.category}</td>
                    <td className="px-3 py-2">{d.uploadedBy}</td>
                    <td className="px-3 py-2">{new Date(d.uploadedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{d.summary}</td>
                    <td className="px-3 py-2">
                      <a href={d.blobUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            Smart Document Hub — {role.charAt(0).toUpperCase() + role.slice(1)}
          </h1>
          <button onClick={() => navigate("/signin")} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">
            Sign Out
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="col-span-1 bg-white p-4 rounded-lg shadow-sm flex flex-col space-y-2">
            {["uploadFile", "email", "newPopups", "viewTable"].map((key, idx) => {
              const labels = {
                uploadFile: "Upload File",
                email: "Email Summary",
                newPopups: "New Popups",
                viewTable: "View Table"
              };
              return (
                <div key={idx}>
                  <p className="font-semibold mb-1">{labels[key]}</p>
                  <button
                    className={`px-3 py-2 rounded w-full ${activeSubMenu === key ? "bg-blue-500 text-white" : "bg-gray-100"}`}
                    onClick={() => setActiveSubMenu(key)}
                  >
                    {labels[key]}
                  </button>
                </div>
              );
            })}
          </aside>

          {/* Main Content */}
          <main className="col-span-3 bg-white p-4 rounded-lg shadow-sm">
            {renderSubMenuContent()}
          </main>
        </div>
      </div>
    </div>
  );
}