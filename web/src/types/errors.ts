export interface CatalogError {
  type: 'NETWORK' | 'VALIDATION' | 'API' | 'UNKNOWN';
  message: string;
  code?: string;
  details?: any;
}

export interface JobResult {
  job_id: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  data?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: CatalogError;
}

export class CatalogApiError extends Error {
  constructor(
    public catalogError: CatalogError,
    message?: string
  ) {
    super(message || catalogError.message);
    this.name = 'CatalogApiError';
  }

  static fromResponse(response: Response, message?: string): CatalogApiError {
    return new CatalogApiError({
      type: 'API',
      message: message || `API Error: ${response.status}`,
      code: response.status.toString()
    });
  }

  static fromNetworkError(error: Error): CatalogApiError {
    return new CatalogApiError({
      type: 'NETWORK',
      message: `Network Error: ${error.message}`,
      details: error
    });
  }
}
