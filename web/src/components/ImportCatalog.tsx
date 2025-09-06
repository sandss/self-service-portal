import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ImportCatalogProps {
  onDone?: () => void;
}

export default function ImportCatalog({ onDone }: ImportCatalogProps) {
  const [tab, setTab] = useState<"form" | "bundle" | "git">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // FORM (local folder path)
  const [localPath, setLocalPath] = useState("/app/catalog_local/items/backup-config");
  
  const importForm = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`${API}/catalog/local/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: localPath })
      });
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(errorText);
      }
      setSuccess("Local folder imported successfully!");
      setTimeout(() => onDone?.(), 1500);
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  // BUNDLE upload
  const [bundleFile, setBundleFile] = useState<File | null>(null);
  
  const importBundle = async () => {
    if (!bundleFile) return;
    try {
      setLoading(true);
      setError("");
      const fd = new FormData();
      fd.append("file", bundleFile);
      const r = await fetch(`${API}/catalog/bundle/import`, {
        method: "POST",
        body: fd
      });
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(errorText);
      }
      const result = await r.json();
      setSuccess(`Bundle imported: ${result.item_id}@${result.version}`);
      setTimeout(() => onDone?.(), 1500);
    } catch (err: any) {
      setError(err.message || "Bundle import failed");
    } finally {
      setLoading(false);
    }
  };

  // GIT manual import
  const [repoUrl, setRepoUrl] = useState("https://github.com/yourorg/catalog-repo.git");
  const [ref, setRef] = useState("backup-config@1.2.0");
  
  const importGit = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`${API}/catalog/git/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, ref })
      });
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(errorText);
      }
      const result = await r.json();
      setSuccess(`Git import queued! Job ID: ${result.job_id}`);
      setTimeout(() => onDone?.(), 1500);
    } catch (err: any) {
      setError(err.message || "Git import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button 
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            tab === "form" 
              ? "bg-orange-50 text-orange-700 border-b-2 border-orange-700" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("form")}
        >
          📁 Local Folder
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            tab === "bundle" 
              ? "bg-orange-50 text-orange-700 border-b-2 border-orange-700" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("bundle")}
        >
          📦 Bundle Upload
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
            tab === "git" 
              ? "bg-orange-50 text-orange-700 border-b-2 border-orange-700" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("git")}
        >
          🔗 Git Repository
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Tab Content */}
      {tab === "form" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local folder path (inside container):
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={localPath}
              onChange={e => setLocalPath(e.target.value)}
              placeholder="/app/catalog_local/items/backup-config"
            />
            <p className="text-xs text-gray-500 mt-1">
              Path to catalog item folder containing manifest.yaml, schema.json, etc.
            </p>
          </div>
          <button
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={importForm}
            disabled={loading || !localPath.trim()}
          >
            {loading ? "Importing..." : "Import Local Folder"}
          </button>
        </div>
      )}

      {tab === "bundle" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload .tar.gz bundle:
            </label>
            <input
              type="file"
              accept=".tar.gz,.tgz"
              onChange={e => setBundleFile(e.target.files?.[0] ?? null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bundle should contain manifest.yaml, schema.json, ui.json (optional), and task.py (optional)
            </p>
          </div>
          <button
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={importBundle}
            disabled={loading || !bundleFile}
          >
            {loading ? "Importing..." : "Import Bundle"}
          </button>
        </div>
      )}

      {tab === "git" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository URL (HTTPS or SSH):
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/yourorg/catalog-repo.git"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tag (item@version):
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="backup-config@1.2.0"
            />
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-orange-900 mb-2">GitHub Webhook Setup</h4>
            <p className="text-xs text-orange-700 mb-2">
              For automatic imports, configure a GitHub webhook:
            </p>
            <code className="text-xs bg-white px-2 py-1 rounded border text-orange-800">
              {API}/catalog/git/webhook/github
            </code>
            <p className="text-xs text-orange-600 mt-2">
              Enable "Tag push" events to automatically sync when you push new tags.
            </p>
          </div>
          
          <button
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={importGit}
            disabled={loading || !repoUrl.trim() || !ref.trim()}
          >
            {loading ? "Importing..." : "Import from Git"}
          </button>
        </div>
      )}
    </div>
  );
}
