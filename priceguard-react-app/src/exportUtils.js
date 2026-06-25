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

  // Build a data: URI so browsers open or trigger download reliably
  // (avoids blob URL revocation issues on mobile/strict CSPs)
  const encoded = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const a = document.createElement('a');
  a.href = encoded;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
