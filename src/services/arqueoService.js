import { apiGet } from './apiClient';

export async function getArqueos(filters = {}, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams();

  if (filters.cajaId) {
    params.append('cajaId', filters.cajaId);
  }

  if (filters.sedeId) {
    params.append('sedeId', filters.sedeId);
  }

  const query = params.toString();
  const path = query ? `/api/arqueos?${query}` : '/api/arqueos';

  return apiGet(path, {
    timeoutMs: 20000,
    headers,
  });
}
