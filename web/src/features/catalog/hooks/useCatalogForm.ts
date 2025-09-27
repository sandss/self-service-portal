import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useCatalogForm() {
  const navigate = useNavigate();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const submitJob = async (data: any, selected: string, version: string) => {
    try {
      setIsCreatingJob(true);
      setError("");
      console.log("Submitting job:", data.formData);
      
      const response = await fetch(`${API}/jobs`, {
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
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const jobResponse = await response.json();
      console.log("Job created:", jobResponse);
      setResult({ job_id: jobResponse.job_id });
      
      // Small delay to ensure job is stored in Redis before redirecting
      setTimeout(() => {
        navigate(`/jobs/${jobResponse.job_id}`);
      }, 500);
    } catch (err) {
      console.error("Error creating job:", err);
      setError("Failed to create job");
      setIsCreatingJob(false);
    }
  };

  const clearResult = () => {
    setResult(null);
  };

  const clearError = () => {
    setError("");
  };

  return {
    isCreatingJob,
    result,
    error,
    submitJob,
    clearResult,
    clearError
  };
}
