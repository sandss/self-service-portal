export function useErrorManagement(errors: Array<string | null>, clearFunctions: Array<() => void>) {
  const combinedError = errors.find(error => error) || null;
  
  const clearAllErrors = () => {
    clearFunctions.forEach(clearFn => clearFn());
  };
  
  return { 
    error: combinedError, 
    clearAllErrors 
  };
}
