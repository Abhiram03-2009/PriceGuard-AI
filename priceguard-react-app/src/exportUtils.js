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

  // iOS-compatible CSV export using Blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
