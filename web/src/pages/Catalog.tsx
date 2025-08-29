import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

type Item = { id: string; versions: string[]; latest?: string };

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Catalog() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [descriptor, setDescriptor] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [error, setError] = useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState({
    itemId: "",
    version: "",
    schema: "",
    uiSchema: "",
    manifest: "",
    taskCode: ""
  });

  useEffect(() => {
    console.log("Loading catalog items...");
    fetch(`${API}/catalog`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        console.log("Catalog items loaded:", d);
        setItems(d.items);
      })
      .catch(err => {
        console.error("Error loading catalog:", err);
        setError("Failed to load catalog items");
      });
  }, []);

  useEffect(() => {
    if (!selected || !version) { 
      setDescriptor(null); 
      return;
    }
    
    console.log(`Loading descriptor for ${selected}@${version}...`);
    setLoading(true);
    setError("");
    
    fetch(`${API}/catalog/${selected}/${version}/descriptor`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(desc => {
        console.log("Descriptor loaded:", desc);
        setDescriptor(desc);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading descriptor:", err);
        setError("Failed to load item descriptor");
        setLoading(false);
      });
  }, [selected, version]);

  // Effect to add button labels after form renders and watch for new buttons
  useEffect(() => {
    if (!descriptor) return;

    const updateButtonLabels = () => {
      // Only target the main "Add" button at the bottom of array fields
      const addButtons = document.querySelectorAll('.rjsf .array-item-add button');
      
      // Only target the last button in each array item (which should be the remove button)
      const arrayItems = document.querySelectorAll('.rjsf .array-item');
      
      // Handle main add buttons
      addButtons.forEach(button => {
        const htmlButton = button as HTMLButtonElement;
        if (htmlButton.textContent === '' || htmlButton.textContent?.trim() === '') {
          htmlButton.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Device
          `;
        }
      });
      
      // Handle remove buttons (last button in each array item)
      arrayItems.forEach(item => {
        const buttons = item.querySelectorAll('button');
        if (buttons.length > 0) {
          const removeButton = buttons[buttons.length - 1] as HTMLButtonElement;
          // Check if it looks like a remove button (empty or has remove-like content)
          if ((removeButton.textContent === '' || removeButton.textContent?.trim() === '') && 
              !removeButton.innerHTML.includes('Add Device')) {
            removeButton.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            `;
          }
        }
      });
    };

    // Initial button labeling
    updateButtonLabels();

    // Set up MutationObserver to watch for new buttons
    const formContainer = document.querySelector('.rjsf');
    if (formContainer) {
      const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // Check if new buttons were added
                if (element.matches('button') || element.querySelector('button')) {
                  shouldUpdate = true;
                }
              }
            });
          }
        });
        
        if (shouldUpdate) {
          // Small delay to ensure DOM is fully updated
          setTimeout(updateButtonLabels, 10);
        }
      });

      observer.observe(formContainer, {
        childList: true,
        subtree: true
      });

      // Cleanup observer on unmount
      return () => observer.disconnect();
    }
  }, [descriptor]);

  const [importJobId, setImportJobId] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string>("");
  const [importProgress, setImportProgress] = useState<number>(0);

  const handleImport = async () => {
    if (!importData.itemId || !importData.version || !importData.schema) {
      setError("Please fill in required fields: Item ID, Version, and Schema");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setImportJobId("");
      setImportStatus("");
      setImportProgress(0);

      // Parse JSON to validate format
      const schema = JSON.parse(importData.schema);
      const uiSchema = importData.uiSchema ? JSON.parse(importData.uiSchema) : {};
      const manifest = importData.manifest ? JSON.parse(importData.manifest) : {
        id: importData.itemId,
        name: importData.itemId,
        version: importData.version,
        description: `Imported catalog item: ${importData.itemId}`,
        entrypoint: "task:run"
      };

      const importPayload = {
        itemId: importData.itemId,
        version: importData.version,
        schema,
        uiSchema,
        manifest,
        taskCode: importData.taskCode || undefined  // Only include if provided
      };

      const response = await fetch(`${API}/catalog/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importPayload)
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Import job queued:", result);
      
      setImportJobId(result.job_id);
      setImportStatus(result.status);
      setLoading(false);
      
      // Start polling for job status
      pollImportStatus(result.job_id);
      
    } catch (err: any) {
      console.error("Import error:", err);
      setError(`Import failed: ${err.message}`);
      setLoading(false);
    }
  };

  const pollImportStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API}/catalog/import/status/${jobId}`);
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }
        
        const status = await response.json();
        console.log("Job status:", status);
        
        setImportStatus(status.status);
        setImportProgress(status.progress || 0);
        
        if (status.status === "SUCCEEDED") {
          clearInterval(pollInterval);
          // Refresh catalog items
          const catalogResponse = await fetch(`${API}/catalog`);
          const catalogData = await catalogResponse.json();
          setItems(catalogData.items);
          
          // Reset import form
          setImportData({
            itemId: "",
            version: "",
            schema: "",
            uiSchema: "",
            manifest: "",
            taskCode: ""
          });
          setShowImport(false);
          setResult({ 
            message: `Successfully imported ${importData.itemId} v${importData.version}`,
            details: status.result
          });
          
        } else if (status.status === "FAILED") {
          clearInterval(pollInterval);
          setError(`Import failed: ${status.error?.error_message || "Unknown error"}`);
        }
        
      } catch (err: any) {
        console.error("Status polling error:", err);
        clearInterval(pollInterval);
        setError(`Failed to check import status: ${err.message}`);
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (importStatus === "RUNNING" || importStatus === "QUEUED") {
        setError("Import is taking longer than expected. Please check the status manually.");
      }
    }, 300000);
  };

  const fillSampleData = () => {
    setImportData({
      itemId: "user-registration",
      version: "1.0.0",
      schema: JSON.stringify({
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string", title: "Full Name" },
          email: { type: "string", format: "email", title: "Email Address" },
          department: { 
            type: "string", 
            title: "Department",
            enum: ["IT", "HR", "Finance", "Operations"]
          },
          notifications: { 
            type: "boolean", 
            title: "Email Notifications",
            default: true
          }
        }
      }, null, 2),
      uiSchema: JSON.stringify({
        name: { "ui:placeholder": "Enter your full name" },
        email: { "ui:help": "We'll use this for account notifications" },
        department: { "ui:widget": "select" },
        notifications: { "ui:help": "Receive email updates about your account" },
        "ui:order": ["name", "email", "department", "notifications"]
      }, null, 2),
      manifest: JSON.stringify({
        id: "user-registration",
        name: "user-registration",
        displayName: "User Registration Form",
        description: "Collect user information for new account registration",
        version: "1.0.0",
        entrypoint: "task:run",
        tags: ["user", "registration", "form"],
        category: "User Management"
      }, null, 2),
      taskCode: `import asyncio

def validate(inputs):
    """Validate input data before processing"""
    required_fields = ["name", "email"]
    for field in required_fields:
        if not inputs.get(field):
            raise ValueError(f"Field '{field}' is required")
    
    # Validate email format
    email = inputs.get("email", "")
    if "@" not in email:
        raise ValueError("Invalid email format")
    
    return inputs

async def run(inputs):
    """Process user registration"""
    # Simulate user registration process
    await asyncio.sleep(0.5)
    
    return {
        "success": True,
        "user_id": f"user_{hash(inputs['email']) % 10000}",
        "message": f"User {inputs['name']} registered successfully",
        "department": inputs.get("department", "Unassigned"),
        "notifications_enabled": inputs.get("notifications", True)
    }`
    });
  };

  const enqueue = async (data: any) => {
    try {
      setIsCreatingJob(true);
      console.log("Submitting job:", data.formData);
      const r = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ 
          report_type: "catalog", 
          parameters: { 
            item_id: selected, 
            version, 
            inputs: data.formData 
          } 
        })
      });
      
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const response = await r.json();
      console.log("Job created:", response);
      setResult({ job_id: response.job_id });
      
      // Small delay to ensure job is stored in Redis before redirecting
      setTimeout(() => {
        navigate(`/jobs/${response.job_id}`);
      }, 500);
    } catch (err) {
      console.error("Error creating job:", err);
      setError("Failed to create job");
      setIsCreatingJob(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <style>{`
        /* RJSF Custom Styling - No Bootstrap Required */
        .rjsf {
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        /* Form container */
        .rjsf form {
          display: block;
        }
        
        /* Field containers - RJSF generates divs with specific classes */
        .rjsf .field,
        .rjsf .field-string,
        .rjsf .field-array,
        .rjsf > div,
        .rjsf form > div {
          margin-bottom: 1.5rem;
        }
        
        /* Labels - RJSF generates labels */
        .rjsf label {
          display: block;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        
        /* Required indicator */
        .rjsf label .required::before {
          content: "*";
          color: #ef4444;
          margin-right: 0.25rem;
        }
        
        /* All input types */
        .rjsf input,
        .rjsf textarea,
        .rjsf select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
          background-color: #ffffff;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .rjsf input:focus,
        .rjsf textarea:focus,
        .rjsf select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .rjsf input::placeholder,
        .rjsf textarea::placeholder {
          color: #9ca3af;
        }
        
        /* Description text */
        .rjsf .field-description {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        /* Help text */
        .rjsf .help-block {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
          font-style: italic;
          line-height: 1.4;
        }
        
        /* Error styling */
        .rjsf .field-error input,
        .rjsf .field-error textarea,
        .rjsf .field-error select {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        .rjsf .error-detail {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }
        
        /* Button base styling */
        .rjsf button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease-in-out;
          text-decoration: none;
          min-height: 2.5rem;
        }
        
        /* Primary/Add buttons - only the main array add button */
        .rjsf .array-item-add button,
        .rjsf button.btn-add {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          position: relative;
          min-width: 120px;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .rjsf .array-item-add button:hover,
        .rjsf button.btn-add:hover {
          background-color: #2563eb;
          border-color: #2563eb;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        /* Move up/down buttons should remain unstyled or get minimal styling */
        .rjsf .array-item button:not(.array-item-remove):not(:last-child) {
          background-color: #6b7280;
          color: white;
          border-color: #6b7280;
          min-width: auto;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }
        
        .rjsf .array-item button:not(.array-item-remove):not(:last-child):hover {
          background-color: #4b5563;
          border-color: #4b5563;
        }
        
        /* Remove buttons */
        .rjsf button.array-item-remove {
          background-color: #ef4444;
          color: white;
          border-color: #ef4444;
          padding: 0.375rem 0.75rem;
          min-height: 2rem;
          position: relative;
          min-width: 100px;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .rjsf button.array-item-remove:hover {
          background-color: #dc2626;
          border-color: #dc2626;
        }
        
        /* Button SVG styling */
        .rjsf button svg {
          flex-shrink: 0;
        }
        
        /* Submit button */
        .rjsf button[type="submit"] {
          background-color: #10b981;
          color: white;
          border-color: #10b981;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          margin-top: 1.5rem;
        }
        
        .rjsf button[type="submit"]:hover {
          background-color: #059669;
          border-color: #059669;
        }
        
        /* Array field styling */
        .rjsf .field-array > .array-item-list {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          background-color: #f9fafb;
          margin-top: 0.5rem;
        }
        
        /* Individual array items */
        .rjsf .array-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background-color: white;
          transition: all 0.15s ease-in-out;
        }
        
        .rjsf .array-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .rjsf .array-item > div:first-child {
          flex: 1;
        }
        
        .rjsf .array-item button {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        
        /* Array add button container */
        .rjsf .array-item-add {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }
        
        /* Fieldset styling for complex objects */
        .rjsf fieldset {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background-color: #fafafa;
        }
        
        .rjsf fieldset legend {
          font-weight: 600;
          color: #1f2937;
          padding: 0 0.5rem;
          background-color: white;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        /* Focus states for better accessibility */
        .rjsf .array-item:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* Hide default RJSF submit button since we're providing our own */
        .rjsf form > div:last-child > button[type="submit"] {
          display: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Catalog</h1>
              <p className="text-gray-600 mt-2">Choose from available automation tasks and services</p>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import Catalog Item
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">                <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Import Catalog Item</h3>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setError("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Help Text */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Import Format</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Import catalog items by providing JSON Schema and optional UI Schema configurations.
                      </p>
                    </div>
                    <button
                      onClick={fillSampleData}
                      className="ml-4 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Fill Sample Data
                    </button>
                  </div>
                  <details className="text-sm text-blue-600">
                    <summary className="cursor-pointer font-medium">View Example</summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Schema Example:</strong>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">{`{
  "type": "object",
  "required": ["name", "email"],
  "properties": {
    "name": {"type": "string", "title": "Name"},
    "email": {"type": "string", "format": "email"}
  }
}`}</pre>
                      </div>
                      <div>
                        <strong>UI Schema Example:</strong>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">{`{
  "name": {"ui:placeholder": "Enter your name"},
  "email": {"ui:help": "We'll never share your email"}
}`}</pre>
                      </div>
                    </div>
                  </details>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={importData.itemId}
                      onChange={(e) => setImportData({...importData, itemId: e.target.value})}
                      placeholder="e.g., backup-config"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Version <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={importData.version}
                      onChange={(e) => setImportData({...importData, version: e.target.value})}
                      placeholder="e.g., 1.0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JSON Schema <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={importData.schema}
                    onChange={(e) => setImportData({...importData, schema: e.target.value})}
                    placeholder='{"type": "object", "properties": {...}}'
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UI Schema (Optional)
                  </label>
                  <textarea
                    value={importData.uiSchema}
                    onChange={(e) => setImportData({...importData, uiSchema: e.target.value})}
                    placeholder='{"ui:order": [...], "fieldName": {"ui:widget": "..."}}'
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manifest (Optional)
                  </label>
                  <textarea
                    value={importData.manifest}
                    onChange={(e) => setImportData({...importData, manifest: e.target.value})}
                    placeholder='{"name": "...", "description": "...", "tags": [...]}'
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Code (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Python code for the task.py file. Should include validate() and run() functions.
                  </p>
                  <textarea
                    value={importData.taskCode}
                    onChange={(e) => setImportData({...importData, taskCode: e.target.value})}
                    placeholder='import asyncio

def validate(inputs):
    """Validate input data"""
    return inputs

async def run(inputs):
    """Execute the task"""
    await asyncio.sleep(0.1)
    return {"success": True}'
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setError("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || (importStatus !== "" && importStatus !== "FAILED")}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Validating..." : 
                     importStatus === "QUEUED" ? "Queued..." :
                     importStatus === "RUNNING" ? "Importing..." : 
                     "Import"}
                  </button>
                </div>
                
                {/* Import Progress */}
                {importJobId && (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Import Progress
                      </h4>
                      <span className="text-sm text-gray-600">
                        Job ID: {importJobId}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium ${
                          importStatus === "SUCCEEDED" ? "text-green-600" :
                          importStatus === "FAILED" ? "text-red-600" :
                          importStatus === "RUNNING" ? "text-blue-600" :
                          "text-gray-600"
                        }`}>
                          Status: {importStatus}
                        </span>
                        <span className="text-gray-600">{importProgress}%</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            importStatus === "SUCCEEDED" ? "bg-green-500" :
                            importStatus === "FAILED" ? "bg-red-500" :
                            "bg-blue-500"
                          }`}
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {importStatus === "SUCCEEDED" && (
                      <div className="text-sm text-green-600">
                        ✓ Import completed successfully
                      </div>
                    )}
                    
                    {importStatus === "FAILED" && (
                      <div className="text-sm text-red-600">
                        ✗ Import failed - check error message above
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!selected && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelected(item.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {item.id.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {item.id === 'backup-config' 
                            ? 'Archive device configurations to secure storage'
                            : `Automated ${item.id.replace('-', ' ')} service`
                          }
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {item.versions.length} version{item.versions.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-blue-600 text-sm font-medium">
                        Configure →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && !descriptor && (
          <div>
            <button
              onClick={() => { setSelected(""); setVersion(""); setDescriptor(null); }}
              className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Catalog
            </button>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Version</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.find(i => i.id === selected)?.versions.map(v => (
                  <div
                    key={v}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                    onClick={() => setVersion(v)}
                  >
                    <div className="font-medium text-gray-900">Version {v}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {v === "1.0.0" ? "Stable release" : "Latest version"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center text-gray-600">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading configuration form...
            </div>
          </div>
        )}

        {descriptor && descriptor.schema && (
          <div>
            <button
              onClick={() => { setSelected(""); setVersion(""); setDescriptor(null); }}
              className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Catalog
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {descriptor.manifest?.name || selected}
                </h2>
                {descriptor.manifest?.description && (
                  <p className="text-gray-600">{descriptor.manifest.description}</p>
                )}
                <div className="flex items-center mt-3 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                    Version {version}
                  </span>
                </div>
              </div>
              
              <div className="rjsf">
                <Form
                  schema={descriptor.schema}
                  uiSchema={descriptor.ui || {}}
                  validator={validator}
                  onSubmit={enqueue}
                >
                  <button 
                    className="bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors font-medium flex items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                    disabled={isCreatingJob}
                  >
                    {isCreatingJob ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-7 4h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Execute Task
                      </>
                    )}
                  </button>
                </Form>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-green-900">Task Submitted Successfully!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <div className="font-mono bg-white px-3 py-2 rounded border">
                    Job ID: {result.job_id}
                  </div>
                  <p className="mt-2">Your task has been queued for execution. Track its progress on the Jobs Dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
