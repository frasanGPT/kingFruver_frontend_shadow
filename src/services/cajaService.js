import { API_BASE_URL } from '../config/api';
import { apiGet } from './apiClient';

const DEFAULT_TIMEOUT_MS = 20000;

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

async function parseJsonResponse(response, path, method) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`${method} ${path} returned invalid JSON`);
    }
  }

  if (!response.ok) {
    const backendMessage =
      data?.message || data?.error || `${method} ${path} failed with status ${response.status}`;
    throw new Error(backendMessage);
  }

  return data;
}

async function apiPatch(path, body, token) {
  const timeout = createTimeoutSignal(DEFAULT_TIMEOUT_MS);

  try {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body || {}),
      signal: timeout.signal,
    });

    return await parseJsonResponse(response, path, 'PATCH');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`PATCH ${path} timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    timeout.clear();
  }
}

export async function getCajas({ token, sedeId, estado, activo = true }) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams();

  if (sedeId) {
    params.append('sedeId', sedeId);
  }

  if (estado) {
    params.append('estado', estado);
  }

  if (activo === true) {
    params.append('activo', 'true');
  }

  if (activo === false) {
    params.append('activo', 'false');
  }

  const query = params.toString();
  const path = query ? `/api/cajas?${query}` : '/api/cajas';

  return apiGet(path, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    headers,
  });
}

export async function openCaja({ id, saldoApertura, token }) {
  return apiPatch(`/api/cajas/${id}/open`, { saldoApertura }, token);
}

export async function closeCajaWithArqueo({ id, contadoEfectivo, notas, token }) {
  return apiPatch(
    `/api/cajas/${id}/close-with-arqueo`,
    { contadoEfectivo, notas },
    token
  );
}
