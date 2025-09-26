import { useState, useEffect } from 'react';

type Item = { id: string; versions: string[]; latest?: string };

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useCatalogItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const loadCatalogItems = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("Loading catalog items...");
      
      const response = await fetch(`${API}/catalog`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log("Catalog items loaded:", data);
      setItems(data.items);
    } catch (err) {
      console.error("Error loading catalog:", err);
      setError("Failed to load catalog items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogItems();
  }, []);

  const refreshCatalog = () => {
    loadCatalogItems();
  };

  const clearError = () => {
    setError("");
  };

  return {
    items,
    loading,
    error,
    refreshCatalog,
    clearError
  };
}
