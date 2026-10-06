const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

interface ApiErrorResponse {
  message?: string
  errors?: unknown
}

export async function getJson<TResponse>(token: string, path: string): Promise<TResponse> {
  return requestJson<TResponse>(token, path, { method: 'GET' })
}

export async function sendJson<TResponse, TBody>(
  token: string,
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body: TBody,
): Promise<TResponse> {
  return requestJson<TResponse>(token, path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function sendFormData<TResponse>(token: string, path: string, method: 'POST' | 'PUT', body: FormData): Promise<TResponse> {
  return requestJson<TResponse>(token, path, { method, body })
}

export async function deleteResource(token: string, path: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!response.ok) throw await responseError(response)
}

export async function getBlob(token: string, path: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })
  if (!response.ok) throw await responseError(response)
  return response.blob()
}

export async function postJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  return requestJson<TResponse>(undefined, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function requestJson<TResponse>(
  token: string | undefined,
  path: string,
  init: RequestInit,
): Promise<TResponse> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté iniciado e inténtalo de nuevo.')
  }

  const responseText = await response.text()
  let payload: unknown = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw errorFromPayload(payload, response.status)
  }

  if (response.status === 204) return undefined as TResponse
  if (payload === null) {
    throw new Error('El servidor devolvió una respuesta vacía o inválida.')
  }
  return payload as TResponse
}

async function responseError(response: Response): Promise<Error> {
  const responseText = await response.text()
  let payload: unknown = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown
    } catch {
      payload = null
    }
  }
  return errorFromPayload(payload, response.status)
}

function errorFromPayload(payload: unknown, status: number) {
  if (isApiErrorResponse(payload)) {
    const message = payload.message ?? `No se pudo completar la solicitud (${status}).`
    const details = isFieldErrors(payload.errors)
      ? Object.entries(payload.errors).map(([field, error]) => `${fieldLabel(field)}: ${error}`)
      : []
    return new Error(details.length > 0 ? `${message}: ${details.join('; ')}` : message)
  }
  const message = `No se pudo completar la solicitud (${status}).`
  return new Error(message)
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null && 'message' in value
    && (typeof value.message === 'string' || value.message === undefined)
}

function isFieldErrors(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every((error) => typeof error === 'string')
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    codigo: 'Código de personal',
    rolId: 'Rol',
    sucursalId: 'Sucursal',
    tipoDocumento: 'Tipo de documento',
    numeroDocumento: 'Número de documento',
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    email: 'Correo electrónico',
    password: 'Contraseña',
    telefono: 'Teléfono',
    activo: 'Estado',
  }
  return labels[field] ?? field
}
