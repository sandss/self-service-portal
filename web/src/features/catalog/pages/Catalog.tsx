import { useMemo, useCallback } from "react";
import { ConfirmationDialog, ErrorAlert } from "../../../shared/components";
import { 
  CatalogHeader,
  ImportModal,
  CatalogViewRouter,
  CatalogLayout
} from "../components";
import {
  useCatalogItems,
  useItemSelection,
  useCatalogForm,
  useDeleteOperations,
  useButtonLabeling,
  useModalState,
  useErrorManagement,
  useCatalogNavigation
} from "../hooks";
import "../../../styles/rjsf-form.css";

export default function Catalog() {
  // Modal state management
  const { showImport, openImport, closeImport } = useModalState();
  
  // Custom hooks for business logic
  const { items, loading: itemsLoading, error: itemsError, refreshCatalog, clearError: clearItemsError } = useCatalogItems();
  const { selected, version, descriptor, loading: descriptorLoading, error: selectionError, selectItem, selectVersion, reset: resetSelection, clearError: clearSelectionError } = useItemSelection();
  const { isCreatingJob, result, error: formError, submitJob, clearError: clearFormError } = useCatalogForm();
  const { deleteDialog, error: deleteError, handleDeleteItem, handleDeleteVersion, confirmDelete, cancelDelete, clearError: clearDeleteError } = useDeleteOperations(refreshCatalog, resetSelection);
  
  // Navigation state
  const { currentView } = useCatalogNavigation(selected, descriptor);
  
  // Error management
  const { error, clearAllErrors } = useErrorManagement(
    [itemsError, selectionError, formError, deleteError],
    [clearItemsError, clearSelectionError, clearFormError, clearDeleteError]
  );
  
  // Loading state
  const loading = itemsLoading || descriptorLoading;
  
  // Use button labeling hook
  useButtonLabeling(descriptor);

  const enqueue = async (data: any) => {
    await submitJob(data, selected, version);
  };

  // Memoized handlers to prevent unnecessary re-renders
  const handleImportOpen = useCallback(() => {
    openImport();
  }, [openImport]);

  const handleImportClose = useCallback(() => {
    closeImport();
    clearAllErrors();
  }, [closeImport, clearAllErrors]);

  const handleImportDone = useCallback(() => {
    closeImport();
    clearAllErrors();
    refreshCatalog();
  }, [closeImport, clearAllErrors, refreshCatalog]);

  const handleDeleteConfirm = useCallback(() => {
    confirmDelete(selected);
  }, [confirmDelete, selected]);

  // Memoized values
  const confirmationTitle = useMemo(() => 
    deleteDialog.version ? "Delete Version" : "Delete Catalog Item"
  , [deleteDialog.version]);

  const confirmationMessage = useMemo(() => 
    deleteDialog.version
      ? `Are you sure you want to delete version ${deleteDialog.version} of "${deleteDialog.itemName}"? This action cannot be undone.`
      : `Are you sure you want to delete the entire catalog item "${deleteDialog.itemName}" and all its versions? This action cannot be undone.`
  , [deleteDialog.version, deleteDialog.itemName]);

  const confirmText = useMemo(() => 
    deleteDialog.version ? "Delete Version" : "Delete Item"
  , [deleteDialog.version]);

  return (
    <CatalogLayout>
      <CatalogHeader onImport={handleImportOpen} />

      {error && <ErrorAlert message={error} onClose={clearAllErrors} />}

      <CatalogViewRouter
        currentView={currentView}
        items={items}
        selected={selected}
        version={version}
        descriptor={descriptor}
        loading={loading}
        isCreatingJob={isCreatingJob}
        result={result}
        onSelectItem={selectItem}
        onDeleteItem={handleDeleteItem}
        onSelectVersion={selectVersion}
        onDeleteVersion={handleDeleteVersion}
        onSubmit={enqueue}
        onBack={resetSelection}
      />

      <ImportModal
        isOpen={showImport}
        onClose={handleImportClose}
        onDone={handleImportDone}
      />

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={cancelDelete}
        onConfirm={handleDeleteConfirm}
        title={confirmationTitle}
        message={confirmationMessage}
        confirmText={confirmText}
        isLoading={deleteDialog.isLoading}
      />
    </CatalogLayout>
  );
}
