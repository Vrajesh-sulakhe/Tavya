import type { DashboardPayload } from "@/domain/types";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export interface RequestJsonOptions {
  method?: string;
  body?: unknown;
  fallbackError?: string;
}

interface ErrorPayload {
  error?: string;
  issues?: Array<{ message: string }>;
}

/**
 * Performs a typed JSON HTTP request and normalizes API validation or auth failures
 * into {@link ApiRequestError} instances.
 */
export async function requestJson<T>(
  url: string,
  options?: RequestJsonOptions
): Promise<T> {
  const hasBody = options?.body !== undefined;
  const res = await fetch(url, {
    method: options?.method ?? "GET",
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ErrorPayload;
    const message =
      err.issues?.[0]?.message ??
      err.error ??
      options?.fallbackError ??
      "Request failed";
    throw new ApiRequestError(res.status, message);
  }

  return (await res.json()) as T;
}

/**
 * Extracts a {@link DashboardPayload} from endpoints returning either the snapshot
 * directly or wrapped inside a `{ dashboard }` envelope.
 */
export function unwrapDashboardPayload(
  response: DashboardPayload | { dashboard: DashboardPayload }
): DashboardPayload {
  return "dashboard" in response ? response.dashboard : response;
}
