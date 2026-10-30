/**
 * Safe Fetch & API Utility for UBCEXX Tube & Admin Portal
 * 
 * Protects frontend against "Failed to execute 'json' on 'Response': 
 * Unexpected token '<', '<!doctype ...' is not valid JSON" errors by:
 * 1. Verifying response status (res.ok)
 * 2. Verifying Content-Type header includes application/json before parsing
 * 3. Extracting readable server error messages if non-JSON or HTML is returned
 */

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Safely fetches an API endpoint and parses JSON.
 * Throws a descriptive error if server returns HTML 404/500 or non-JSON content.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (networkErr: any) {
    throw new Error(`Network connection error: ${networkErr.message || 'Server unreachable'}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    let preview = '';
    try {
      const rawText = await res.text();
      // Clean up whitespace and slice first 120 chars
      preview = rawText.slice(0, 120).replace(/\s+/g, ' ').trim();
    } catch {
      // Ignore reading error
    }

    const endpointStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : 'endpoint');
    if (!res.ok) {
      throw new Error(
        `Server returned HTTP ${res.status} ${res.statusText} for ${endpointStr}. Expected JSON but received ${contentType || 'non-JSON'} content.`
      );
    }
    throw new Error(
      `Invalid response from ${endpointStr}: Expected application/json but received ${contentType || 'HTML/text'}. ${preview ? `Preview: ${preview}` : ''}`
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    throw new Error(`Failed to parse JSON response: ${jsonErr.message}`);
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;
    const err: any = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

/**
 * Safe fetch wrapper that returns { ok, status, data, error } without throwing.
 */
export async function safeFetchResult<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    const data = await safeFetchJson<T>(input, init);
    return { ok: true, status: 200, data, error: null };
  } catch (err: any) {
    return {
      ok: false,
      status: err.status || 500,
      data: err.data || null,
      error: err.message || 'Unknown error occurred',
    };
  }
}
