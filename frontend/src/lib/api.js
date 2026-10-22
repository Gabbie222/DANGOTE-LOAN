import axios from 'axios';

export const api = axios.create({ baseURL: 'http://localhost:4000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken });
        const { data } = await refreshing;
        refreshing = null;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Money helpers: amounts move through the API as integer kobo. Never floats.
export const toKobo = (naira) => Math.round(Number(naira) * 100);
export const fromKobo = (kobo) => (kobo || 0) / 100;
export const formatNaira = (kobo) =>
  `₦${fromKobo(kobo).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
