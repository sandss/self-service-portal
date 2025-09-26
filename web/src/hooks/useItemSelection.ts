import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useItemSelection() {
  const [selected, setSelected] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [descriptor, setDescriptor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!selected || !version) { 
      setDescriptor(null); 
      return;
    }
    
    const loadDescriptor = async () => {
      try {
        console.log(`Loading descriptor for ${selected}@${version}...`);
        setLoading(true);
        setError("");
        
        const response = await fetch(`${API}/catalog/${selected}/${version}/descriptor`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const desc = await response.json();
        console.log("Descriptor loaded:", desc);
        setDescriptor(desc);
      } catch (err) {
        console.error("Error loading descriptor:", err);
        setError("Failed to load item descriptor");
      } finally {
        setLoading(false);
      }
    };

    loadDescriptor();
  }, [selected, version]);

  const selectItem = (itemId: string) => {
    setSelected(itemId);
    setVersion("");
    setDescriptor(null);
    setError("");
  };

  const selectVersion = (versionId: string) => {
    setVersion(versionId);
    setError("");
  };

  const reset = () => {
    setSelected("");
    setVersion("");
    setDescriptor(null);
    setError("");
  };

  const clearError = () => {
    setError("");
  };

  return {
    selected,
    version,
    descriptor,
    loading,
    error,
    selectItem,
    selectVersion,
    reset,
    clearError
  };
}
