export const LAYOUT_CLASSES = {
  container: "min-h-screen bg-gray-50 p-6",
  wrapper: "max-w-7xl mx-auto",
} as const;

export const BUTTON_CLASSES = {
  primary: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors",
  secondary: "mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors",
  danger: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors",
  submit: "bg-orange-600 text-white rounded-lg px-6 py-3 hover:bg-orange-700 transition-colors font-medium flex items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

export const CATALOG_VIEWS = {
  CATALOG: 'catalog',
  VERSIONS: 'versions', 
  FORM: 'form',
} as const;

export const CATALOG_MESSAGES = {
  LOADING_ITEMS: "Loading catalog items...",
  LOADING_FORM: "Loading configuration form...",
  CREATE_SUCCESS: "Task Submitted Successfully!",
  DELETE_CONFIRM_ITEM: "Are you sure you want to delete the entire catalog item",
  DELETE_CONFIRM_VERSION: "Are you sure you want to delete version",
  CANNOT_DELETE_LAST_VERSION: "Cannot delete the last version of a catalog item. Delete the entire item instead.",
  BACK_TO_CATALOG: "Back to Catalog",
} as const;

export const API_ENDPOINTS = {
  CATALOG: '/catalog',
  JOBS: '/jobs',
} as const;
