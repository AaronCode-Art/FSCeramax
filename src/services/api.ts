const API_BASE_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
export const API_UNAUTHORIZED_EVENT = "ceramax:unauthorized";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function responseMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("message" in body)) return undefined;
  const message = body.message;
  if (typeof message !== "string" || !message.trim()) return undefined;
  if (!("errors" in body) || typeof body.errors !== "object" || body.errors === null || Array.isArray(body.errors)) {
    return message;
  }
  const details = Object.entries(body.errors)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([field, detail]) => `${field}: ${detail}`);
  return details.length ? `${message}: ${details.join("; ")}` : message;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<unknown> {
  if (!API_BASE_URL) {
    throw new ApiError("La API no está configurada. Define VITE_API_URL en el entorno del frontend.", 0);
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo nuevamente.", 0);
    }
    if (error instanceof TypeError) {
      throw new ApiError("No se pudo conectar con la API. Verifica que el backend esté disponible.", 0);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const responseText = await response.text();
  let body: unknown;
  if (responseText) {
    try {
      body = JSON.parse(responseText) as unknown;
    } catch {
      if (response.ok) throw new ApiError("La API devolvió una respuesta no válida.", response.status);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
    }
    const message = responseMessage(body)
      ?? (response.status >= 500
        ? "Ocurrió un error en el servidor. Inténtalo nuevamente más tarde."
        : `La solicitud no pudo completarse (${response.status}).`);
    throw new ApiError(message, response.status);
  }

  return body;
}

export async function apiDownload(
  path: string,
  token: string,
): Promise<{ blob: Blob; filename: string }> {
  if (!API_BASE_URL) {
    throw new ApiError("La API no está configurada. Define VITE_API_URL en el entorno del frontend.", 0);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo nuevamente.", 0);
    }
    if (error instanceof TypeError) {
      throw new ApiError("No se pudo conectar con la API. Verifica que el backend esté disponible.", 0);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const responseText = await response.text();
    let body: unknown;
    if (responseText) {
      try {
        body = JSON.parse(responseText) as unknown;
      } catch {
        body = undefined;
      }
    }
    if (response.status === 401) {
      window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
    }
    const message = responseMessage(body)
      ?? (response.status >= 500
        ? "Ocurrió un error en el servidor. Inténtalo nuevamente más tarde."
        : `La solicitud no pudo completarse (${response.status}).`);
    throw new ApiError(message, response.status);
  }

  const disposition = response.headers.get("Content-Disposition");
  const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
    ?? "reporte";
  return { blob: await response.blob(), filename };
}
