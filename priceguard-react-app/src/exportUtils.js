// ─── PriceGuard AI — Export Utilities ────────────────────────────────────────

export function buildCSV(data, columns) {
  const header = columns.join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return '';
      if (typeof v === 'number') return v.toFixed(2);
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  );
  return [header, ...rows].join('\r\n');
}

export function exportCSV(data, filename, columns) {
  if (!data || !data.length) return;
  const cols = columns || Object.keys(data[0]);
  const csv = buildCSV(data, cols);

  // Try Web Share API for mobile (iOS/Android)
  if (navigator.share && navigator.canShare) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], filename, { type: 'text/csv;charset=utf-8;' });
    
    if (navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'PriceGuard AI Data',
        text: 'Exported ticket data from PriceGuard AI'
      }).catch(() => {
        // Fallback to blob download if share fails
        fallbackBlobDownload(csv, filename);
      });
      return;
    }
  }

  // Fallback: Open in new tab for mobile browsers
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    const encoded = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const win = window.open(encoded, '_blank');
    if (!win) {
      // If popup blocked, try blob download
      fallbackBlobDownload(csv, filename);
    }
    return;
  }

  // Desktop: Blob download
  fallbackBlobDownload(csv, filename);
}

function fallbackBlobDownload(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
