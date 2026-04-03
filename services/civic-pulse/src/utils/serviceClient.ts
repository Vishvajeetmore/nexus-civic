import axios, { type Method } from 'axios';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'service-template');

/**
 * Build a full URL while handling duplicate/missing slashes safely.
 */
function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Call another Nexus Civic service with automatic timeout + error handling.
 * Returns null (instead of throwing) when the downstream service is unavailable.
 *
 * Usage:
 * const result = await callService(process.env.GIG_FORGE_URL!, 'GET', '/health');
 * if (!result) { ...fallback... }
 */
export async function callService(
  serviceUrl: string,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  data?: unknown,
  timeoutMs = 5000
): Promise<unknown | null> {
  const url = joinUrl(serviceUrl, path);

  try {
    const response = await axios({
      url,
      method: method as Method,
      data,
      timeout: timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.data;
  } catch (error) {
    logger.warn('Cross-service request failed; returning null', {
      url,
      method,
      timeoutMs,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
