export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  async fetchJobs(params: {
    state?: string;
    q?: string;
    page?: number;
    page_size?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/jobs?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }
    return response.json();
  },

  async fetchJob(jobId: string) {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch job');
    }
    return response.json();
  },

  async createJob(jobData: {
    report_type: string;
    parameters: Record<string, any>;
    user_id?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });
    if (!response.ok) {
      throw new Error('Failed to create job');
    }
    return response.json();
  },

  async retryJob(jobId: string) {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/retry`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to retry job');
    }
    return response.json();
  },

  async seedJobs() {
    const response = await fetch(`${API_BASE_URL}/dev/seed`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to seed jobs');
    }
    return response.json();
  },

  async deleteCatalogItem(itemId: string) {
    const response = await fetch(`${API_BASE_URL}/catalog/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete catalog item: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteCatalogItemVersion(itemId: string, version: string) {
    const response = await fetch(`${API_BASE_URL}/catalog/${itemId}/${version}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete catalog item version: ${response.statusText}`);
    }
    return response.json();
  },

  getWebSocketUrl() {
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    return `${wsProtocol}://${API_BASE_URL.replace(/^https?:\/\//, '')}/ws/jobs`;
  },
};
