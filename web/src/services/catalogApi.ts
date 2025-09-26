import { api, API_BASE_URL } from '../api';
import { CatalogItem, CatalogDescriptor } from '../types/catalog';
import { JobResult, CatalogApiError } from '../types/errors';

export class CatalogApiService {
  private static instance: CatalogApiService;
  
  static getInstance(): CatalogApiService {
    if (!CatalogApiService.instance) {
      CatalogApiService.instance = new CatalogApiService();
    }
    return CatalogApiService.instance;
  }

  async getCatalogItems(): Promise<CatalogItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/catalog`);
      if (!response.ok) {
        throw CatalogApiError.fromResponse(response);
      }
      return response.json();
    } catch (error) {
      if (error instanceof CatalogApiError) throw error;
      throw CatalogApiError.fromNetworkError(error as Error);
    }
  }

  async getDescriptor(itemId: string, version: string): Promise<CatalogDescriptor> {
    try {
      const response = await fetch(`${API_BASE_URL}/catalog/${itemId}/${version}`);
      if (!response.ok) {
        throw CatalogApiError.fromResponse(response);
      }
      return response.json();
    } catch (error) {
      if (error instanceof CatalogApiError) throw error;
      throw CatalogApiError.fromNetworkError(error as Error);
    }
  }

  async createJob(data: any, itemId: string, version: string): Promise<JobResult> {
    try {
      const jobData = {
        report_type: `${itemId}:${version}`,
        parameters: data.formData || data
      };
      const response = await api.createJob(jobData);
      return response;
    } catch (error) {
      throw CatalogApiError.fromNetworkError(error as Error);
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    try {
      await api.deleteCatalogItem(itemId);
    } catch (error) {
      throw CatalogApiError.fromNetworkError(error as Error);
    }
  }

  async deleteVersion(itemId: string, version: string): Promise<void> {
    try {
      await api.deleteCatalogItemVersion(itemId, version);
    } catch (error) {
      throw CatalogApiError.fromNetworkError(error as Error);
    }
  }
}

export const catalogApi = CatalogApiService.getInstance();
