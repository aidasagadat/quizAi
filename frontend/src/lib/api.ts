import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/auth';

const api: AxiosInstance = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((cfg) => {
  const t = useAuthStore.getState().accessToken;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const state = useAuthStore.getState();
  const rt = state.refreshToken;
  if (!rt) return null;
  try {
    const r = await axios.post('/api/v1/auth/refresh', { refreshToken: rt });
    state.setTokens(r.data.accessToken, r.data.refreshToken);
    return r.data.accessToken;
  } catch {
    state.logout();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original: any = err.config;
    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;
      refreshing = refreshing || doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(err);
  },
);

export default api;
