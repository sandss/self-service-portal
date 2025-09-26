import { useState } from 'react';
import { api } from '../api';

interface DeleteDialogState {
  isOpen: boolean;
  itemId?: string;
  version?: string;
  itemName?: string;
  isLoading: boolean;
}

export function useDeleteOperations(onItemDeleted: () => void, onSelectionReset: () => void) {
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    isLoading: false
  });
  const [error, setError] = useState<string>("");

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

  const confirmDelete = async (selectedItemId?: string) => {
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
      onItemDeleted();
      
      // Reset selection if deleted item was selected
      if (selectedItemId === deleteDialog.itemId) {
        onSelectionReset();
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

  const clearError = () => {
    setError("");
  };

  return {
    deleteDialog,
    error,
    handleDeleteItem,
    handleDeleteVersion,
    confirmDelete,
    cancelDelete,
    clearError
  };
}
