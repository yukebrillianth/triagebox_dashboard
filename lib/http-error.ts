/**
 * Structured HTTP error class for API error handling.
 *
 * Provides typed error properties and convenience getters
 * for common error categories (rate limit, server error, client error).
 */
export class HttpError extends Error {
  public status: number;
  public statusText: string;
  public data: unknown;
  public validationErrors?: Record<string, { field: string; message: string }>;

  constructor(
    status: number,
    statusText: string,
    data: unknown,
    message?: string
  ) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500 && !this.isRateLimit;
  }
}

/**
 * Sanitize error message to avoid leaking internal server details.
 * Strips messages that look like stack traces, SQL errors, or internal paths.
 */
function sanitizeErrorMessage(message: string): string {
  const UNSAFE_PATTERNS = [
    /stack\s*trace/i,
    /at\s+\w+\s*\(/i,
    /SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i,
    /\/usr\/|\/var\/|\/home\//i,
    /ECONNREFUSED|ENOTFOUND/i,
    /panic:|goroutine\s/i,
  ];

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(message)) {
      return 'Terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  return message;
}

/**
 * Extract a user-friendly error message from any error type.
 *
 * Handles HttpError instances with status-specific messages,
 * network errors, timeouts, and unknown errors.
 *
 * @example
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   const msg = getErrorMessage(error);
 *   toast.error(msg);
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.isRateLimit) {
      return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.';
    }
    if (error.isServerError) {
      return 'Terjadi gangguan server, silakan coba lagi.';
    }
    if (error.status === 401) {
      return 'Sesi Anda telah berakhir. Silakan login ulang.';
    }
    if (error.status === 403) {
      return 'Anda tidak memiliki akses ke fitur ini.';
    }
    if (error.status === 404) {
      return 'Data yang dicari tidak ditemukan.';
    }
    if (error.status === 0) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
    }

    if (error.validationErrors) {
      const messages = Object.values(error.validationErrors)
        .map((e) => e.message)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join('. ');
      }
    }

    return sanitizeErrorMessage(error.message);
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Permintaan timeout. Silakan coba lagi.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
}

/**
 * Extract per-field validation errors from an HttpError.
 * Returns a Record<fieldName, errorMessage> suitable for react-hook-form setError().
 *
 * @example
 * const validationErrors = getValidationErrors(error);
 * if (validationErrors) {
 *   Object.entries(validationErrors).forEach(([field, message]) => {
 *     setError(field as keyof FormValues, { type: 'server', message });
 *   });
 * }
 */
export function getValidationErrors(
  error: unknown
): Record<string, string> | null {
  if (error instanceof HttpError && error.validationErrors) {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(error.validationErrors)) {
      result[key] = val.message;
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  return null;
}
