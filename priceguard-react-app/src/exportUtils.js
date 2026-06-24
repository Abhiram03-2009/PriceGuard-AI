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
  const csv = buildCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Open in new tab so browser shows the "Save As" dialog or previews in Sheets
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
