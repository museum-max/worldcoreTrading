/**
 * Resilient fetch wrapper for AI Studio iframe / transient dev-server reloads.
 * Retries TypeError network hiccups and transient 502/503/504 responses with backoff.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    try {
      const response = await fetch(url, options);
      if (response.status >= 502 && response.status <= 504 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err: any) {
      if (err?.name === 'AbortError' || options.signal?.aborted) {
        throw err;
      }
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }

  throw lastErr;
}
