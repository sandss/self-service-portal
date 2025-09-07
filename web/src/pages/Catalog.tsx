import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import ImportCatalog from "../components/ImportCatalog";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { api } from "../api";
import "../styles/rjsf-form.css";

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
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    itemId?: string;
    version?: string;
    itemName?: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false
  });

  useEffect(() => {
    console.log("Loading catalog items...");
    loadCatalogItems();
  }, []);

  const loadCatalogItems = () => {
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
  };

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

  const handleDeleteItem = (itemId: string, itemName: string) => {
    setDeleteDialog({
      isOpen: true,
      itemId,
      itemName,
      isLoading: false
    });
  };

  const handleDeleteVersion = (itemId: string, version: string, itemName: string) => {
    setDeleteDialog({
      isOpen: true,
      itemId,
      version,
      itemName,
      isLoading: false
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.itemId) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (deleteDialog.version) {
        // Delete specific version
        await api.deleteCatalogItemVersion(deleteDialog.itemId, deleteDialog.version);
        console.log(`Deleted version ${deleteDialog.version} of ${deleteDialog.itemId}`);
      } else {
        // Delete entire item
        await api.deleteCatalogItem(deleteDialog.itemId);
        console.log(`Deleted item ${deleteDialog.itemId}`);
      }
      
      // Refresh catalog items
      loadCatalogItems();
      
      // Reset selection if deleted item was selected
      if (selected === deleteDialog.itemId) {
        if (!deleteDialog.version || items.find(i => i.id === deleteDialog.itemId)?.versions.length === 1) {
          setSelected("");
          setVersion("");
          setDescriptor(null);
        }
      }
      
      setDeleteDialog({ isOpen: false, isLoading: false });
    } catch (err) {
      console.error("Error deleting:", err);
      setError(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, isLoading: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Catalog</h1>
              <p className="text-gray-600 mt-2">Choose from available automation tasks and services</p>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
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
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
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
                
                <ImportCatalog 
                  onDone={() => {
                    setShowImport(false);
                    setError("");
                    // Refresh catalog items after successful import
                    loadCatalogItems();
                  }}
                />
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
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all duration-200 relative group"
                >
                  {/* Delete button - only visible on hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id, item.id.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' '));
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete catalog item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => setSelected(item.id)}
                  >
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
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <div className="text-orange-600 text-sm font-medium">
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
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:bg-orange-50 transition-all relative group"
                  >
                    {/* Delete version button - only visible on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = items.find(i => i.id === selected);
                          if (item && item.versions.length > 1) {
                            handleDeleteVersion(selected, v, selected.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' '));
                          } else {
                            setError("Cannot delete the last version of a catalog item. Delete the entire item instead.");
                            setTimeout(() => setError(""), 5000);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete this version"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div 
                      className="cursor-pointer"
                      onClick={() => setVersion(v)}
                    >
                      <div className="font-medium text-gray-900">Version {v}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {v === "1.0.0" ? "Stable release" : "Latest version"}
                      </div>
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
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    className="bg-orange-600 text-white rounded-lg px-6 py-3 hover:bg-orange-700 transition-colors font-medium flex items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed" 
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

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title={deleteDialog.version ? "Delete Version" : "Delete Catalog Item"}
          message={
            deleteDialog.version
              ? `Are you sure you want to delete version ${deleteDialog.version} of "${deleteDialog.itemName}"? This action cannot be undone.`
              : `Are you sure you want to delete the entire catalog item "${deleteDialog.itemName}" and all its versions? This action cannot be undone.`
          }
          confirmText={deleteDialog.version ? "Delete Version" : "Delete Item"}
          isLoading={deleteDialog.isLoading}
        />
      </div>
    </div>
  );
}
