import { apiGet, apiPatch, apiPost } from './apiClient';

export async function createCarrito(payload, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiPost('/api/carritos', payload, {
    timeoutMs: 20000,
    headers,
  });
}

export async function getCarritos(filters = {}, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams();

  if (filters.estado) {
    params.append('estado', filters.estado);
  }

  if (filters.sedeId) {
    params.append('sedeId', filters.sedeId);
  }

  if (filters.usuarioId) {
    params.append('usuarioId', filters.usuarioId);
  }

  if (filters.cobrables === true) {
    params.append('cobrables', 'true');
  }

  const query = params.toString();
  const path = query ? `/api/carritos?${query}` : '/api/carritos';

  return apiGet(path, {
    timeoutMs: 20000,
    headers,
  });
}

export async function cancelCarrito(id, motivo, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiPatch(
    `/api/carritos/${id}/cancel`,
    { motivo },
    {
      timeoutMs: 20000,
      headers,
    }
  );
}
