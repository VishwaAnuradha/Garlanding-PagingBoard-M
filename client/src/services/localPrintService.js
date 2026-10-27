const printHelperUrl = (import.meta.env.VITE_PRINT_HELPER_URL || 'http://127.0.0.1:8765').replace(/\/+$/, '');

async function request(path, options) {
  let response;
  // Try dedicated print helper port first, fallback to main API server
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    response = await fetch(`${printHelperUrl}${path}`, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch {
    try {
      response = await fetch(path, options);
    } catch {
      throw new Error('Cannot connect to the printer service. Ensure the system server is running.');
    }
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`The printer service returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok) throw new Error(data.message || 'The printer request failed.');
  return data;
}

export async function getLocalPrinters() {
  return request('/api/printers');
}

export async function printReportPdf(blob, printerName) {
  const params = new URLSearchParams();
  if (printerName) params.set('printer', printerName);
  return request(`/api/print?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: blob
  });
}
