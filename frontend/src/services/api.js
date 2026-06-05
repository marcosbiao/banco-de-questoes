const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

export function buildApiUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value.filter(Boolean).join(',')];
      }

      if (typeof value === 'string') {
        return [key, value.trim()];
      }

      return [key, value];
    })
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

  return url.toString();
}

function filenameFromContentDisposition(header) {
  if (!header) return '';

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const filenameMatch = header.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || '';
}

export async function apiRequest(path, options = {}) {
  const { params, body, headers, ...fetchOptions } = options;
  const response = await fetch(buildApiUrl(path, params), {
    method: fetchOptions.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const validationMessage = data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : null;

    throw new Error(validationMessage || data?.message || 'Erro ao comunicar com a API.');
  }

  return data;
}

export async function apiDownload(path, options = {}) {
  const { params, headers, ...fetchOptions } = options;
  const response = await fetch(buildApiUrl(path, params), {
    method: fetchOptions.method || 'GET',
    headers: {
      ...headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

    throw new Error(data?.message || 'Erro ao baixar arquivo da API.');
  }

  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(response.headers.get('Content-Disposition')),
  };
}
