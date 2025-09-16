import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";

// PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function SmartDocumentHub() {
  const { role } = useParams();
  const navigate = useNavigate();

  const [docs, setDocs] = useState(() => {
    try {
      const raw = localStorage.getItem("smart_docs_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeSubMenu, setActiveSubMenu] = useState("uploadFile");
  const [newDocs, setNewDocs] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("smart_docs_v1", JSON.stringify(docs));
  }, [docs]);

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

  async function extractTextFromFile(file) {
    try {
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

        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://127.0.0.1:5000/ocr", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        return data.original || file.name;
      }

      if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(String(e.target.result || file.name));
        reader.readAsText(file);
      });
    } catch {
      return file.name;
    }
  }

  async function handleUpload(e) {
    const files = e.target.files || [];
    if (!files.length) return;

    const uploaded = [];
    for (const f of Array.from(files)) {
      const rawText = await extractTextFromFile(f);
      const category = classifyText(rawText + " " + f.name);
      const summary = rawText.slice(0, 50); // first 50 chars for summary

      uploaded.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        uploadedBy: role,
        category,
        summary,
        rawText: rawText, // full content for preview
        blobUrl: URL.createObjectURL(f),
      });
    }

    setDocs((prev) => [...uploaded, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = null;
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
  }

  async function fetchEmails() {
    setLoadingEmails(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/check_emails");
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

  function handlePreview(doc) {
    setPreviewDoc(doc);
    setPreviewContent(doc.rawText || "No content available for preview");
  }

  const renderSubMenuContent = () => {
    switch (activeSubMenu) {
      case "uploadFile":
        return (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUpload}
              className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: TXT / PDF / DOCX. Scanned images via OCR.
            </p>

            {docs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h2 className="font-semibold text-lg mb-2 text-gray-700">Uploaded Documents</h2>
                {docs.map(d => (
                  <div key={d.id} className="p-2 border rounded-md flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <p className="font-medium text-gray-800">{d.name}</p>
                      <p className="text-sm text-gray-500">
                        Category: {d.category} | Uploaded By: {d.uploadedBy} | {new Date(d.uploadedAt).toLocaleString()}
                      </p>
                      <p className="text-sm mt-1 text-gray-600">{d.summary}</p>
                    </div>
                    <div className="flex space-x-2">
                      <a
                        href={d.blobUrl}
                        download={d.name}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handlePreview(d)}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
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
            <button
              onClick={fetchEmails}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={loadingEmails}
            >
              {loadingEmails ? "Fetching..." : "Fetch Emails"}
            </button>

            {newDocs.length === 0 ? (
              <p className="mt-2 text-gray-600">No new email documents.</p>
            ) : (
              newDocs.map(doc => (
                <div
                  key={doc.id}
                  className="p-2 border rounded-md shadow-sm bg-gray-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800">{doc.name}</p>
                    <p className="text-sm text-gray-600">{doc.subject}</p>
                    <p className="text-sm text-gray-500">{doc.summary}</p>
                  </div>
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        );

      case "newPopups":
        return <div><p>No new pop-ups yet.</p></div>;

      case "viewTable":
        return (
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b">Name</th>
                  <th className="px-4 py-2 border-b">Category</th>
                  <th className="px-4 py-2 border-b">Uploaded By</th>
                  <th className="px-4 py-2 border-b">Date</th>
                  <th className="px-4 py-2 border-b">Summary</th>
                  <th className="px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDocs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2">{d.name}</td>
                    <td className="px-4 py-2">{d.category}</td>
                    <td className="px-4 py-2">{d.uploadedBy}</td>
                    <td className="px-4 py-2">{new Date(d.uploadedAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{d.summary}</td>
                    <td className="px-4 py-2 flex space-x-2">
                      <a
                        href={d.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handlePreview(d)}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
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
  <div className="flex items-center space-x-4">
<button
  onClick={() => window.open("/translator.html", "_blank")}
  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
>
  Translate & Preview
</button>


    <h1 className="text-2xl font-bold text-gray-800">
      Smart Document Hub — {role.charAt(0).toUpperCase() + role.slice(1)}
    </h1>
  </div>
  <button
    onClick={() => navigate("/signin")}
    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
  >
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
                viewTable: "View Table",
              };
              return (
                <div key={idx}>
                  <p className="font-semibold mb-1 text-gray-700">{labels[key]}</p>
                  <button
                    className={`px-3 py-2 rounded w-full font-medium ${
                      activeSubMenu === key
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    } transition`}
                    onClick={() => setPreviewDoc(null) || setActiveSubMenu(key)}
                  >
                    {labels[key]}
                  </button>
                </div>
              );
            })}
          </aside>

          {/* Main Content */}
          <main className="col-span-3">{renderSubMenuContent()}</main>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Preview — {previewDoc.name}
              </h2>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Close
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>Category:</strong> {previewDoc.category} | 
                <strong> Uploaded By:</strong> {previewDoc.uploadedBy} | 
                <strong> Date:</strong> {new Date(previewDoc.uploadedAt).toLocaleString()}
              </p>
            </div>
            
            <div className="p-4 border rounded bg-gray-50">
              <h3 className="font-semibold text-gray-700 mb-2">Document Content</h3>
              <div className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
                {previewContent}
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <a
                href={previewDoc.blobUrl}
                download={previewDoc.name}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Download
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}