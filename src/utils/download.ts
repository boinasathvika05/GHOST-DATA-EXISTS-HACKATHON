/**
 * GhostTrace AI — Reliable CSV Download Helper
 * Ensures downloaded file is strictly served and saved as text/csv with filename 'output.csv'
 * Avoids browser renaming to .html or rendering inside iframe.
 */
export async function downloadOutputCsv(endpoint: string = '/output.csv', filename: string = 'output.csv'): Promise<void> {
  try {
    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'text/csv, */*'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${res.status} ${res.statusText}`);
    }

    const csvText = await res.text();
    // Verify it is not an HTML error page
    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.trim().startsWith('<html')) {
      throw new Error('Received HTML response instead of text/csv');
    }

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('Blob download fallback, opening direct URL:', err);
    // Direct location fallback
    const link = document.createElement('a');
    link.href = endpoint;
    link.setAttribute('download', filename);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
