import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to automatically attach authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration (401 errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  register: async (username, password, role) => {
    const response = await api.post('/auth/register', { username, password, role });
    return response.data;
  }
};

export const xmlService = {
  list: async () => {
    const response = await api.get('/xml/list-xml');
    return response.data;
  },
  read: async (filename, version = null) => {
    const url = version ? `/xml/read-xml/${filename}?version=${version}` : `/xml/read-xml/${filename}`;
    const response = await api.get(url, { responseType: 'text' });
    return response.data;
  },
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/xml/upload-xml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  edit: async (filename, content, changeNotes = 'Updated configuration') => {
    const response = await api.put(`/xml/edit-xml/${filename}`, {
      content,
      change_notes: changeNotes,
    });
    return response.data;
  },
  delete: async (filename) => {
    const response = await api.delete(`/xml/delete-xml/${filename}`);
    return response.data;
  },
  getVersionHistory: async (filename) => {
    const response = await api.get(`/xml/version-history/${filename}`);
    return response.data;
  },
  rollback: async (filename, version, changeNotes = 'Rollback initiated') => {
    const response = await api.post(`/xml/rollback/${filename}`, {
      version,
      change_notes: changeNotes,
    });
    return response.data;
  },
  compare: async (filename, v1, v2) => {
    const response = await api.get(`/xml/compare/${filename}?v1=${v1}&v2=${v2}`);
    return response.data;
  }
};

export const backupService = {
  list: async () => {
    const response = await api.get('/backups');
    return response.data;
  },
  restore: async (backupId, changeNotes = 'Restored backup') => {
    const response = await api.post('/backups/restore-backup', {
      backup_id: backupId,
      change_notes: changeNotes,
    });
    return response.data;
  },
  delete: async (backupId) => {
    const response = await api.delete(`/backups/backup/${backupId}`);
    return response.data;
  }
};

export const updateService = {
  list: async () => {
    const response = await api.get('/updates/update-history');
    return response.data;
  },
  upload: async (version, releaseNotes, file) => {
    const formData = new FormData();
    formData.append('version', version);
    if (releaseNotes) formData.append('release_notes', releaseNotes);
    formData.append('file', file);
    
    const response = await api.post('/updates/upload-update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getDownloadUrl: (version) => {
    return `${API_BASE_URL}/updates/download-update/${version}`;
  }
};

export const clientService = {
  list: async () => {
    const response = await api.get('/clients');
    return response.data;
  }
};

export const logService = {
  list: async (query = '', action = '') => {
    let url = '/logs';
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (action) params.push(`action=${encodeURIComponent(action)}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    const response = await api.get(url);
    return response.data;
  },
  getExportUrl: () => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/logs/export?token=${token}`; // Token can also be handled as query or auth in backend, but standard download link works
  }
};

export default api;
