import { api } from './api';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/auth/profile');
    return data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignorar fallo si el token ya expiró
    }
  },
  refresh: async () => {
    const { data } = await api.post('/auth/refresh');
    return data;
  },
};
