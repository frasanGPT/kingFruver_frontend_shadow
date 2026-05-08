import { getApiBaseUrl } from '../config/api';

const DEFAULT_TIMEOUT_MS = 10000;

function buildUrl(path) {
  return `${getApiBaseUrl()}${path}`;
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

export async function apiGet(path, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    const response = await fetch(buildUrl(path), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: timeout.signal,
    });

    return await parseJsonResponse(response, path, 'GET');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`GET ${path} timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    timeout.clear();
  }
}

export async function apiPost(path, body, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    return await parseJsonResponse(response, path, 'POST');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`POST ${path} timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    timeout.clear();
  }
}

export async function apiPatch(path, body, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    const response = await fetch(buildUrl(path), {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    return await parseJsonResponse(response, path, 'PATCH');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`PATCH ${path} timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    timeout.clear();
  }
}
