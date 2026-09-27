import { jsPDF } from 'jspdf';

/** CSV / PDF helpers for offline bookkeeping. No data leaves the browser. */

function cell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(','));
  return [header, ...body].join('\n');
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename, columns, rows) {
  download(filename, buildCsv(columns, rows), 'text/csv;charset=utf-8;');
}

/** Simple landscape table — enough for bookkeeping, no extra dependency. */
export function downloadPdf(filename, title, columns, rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const lineHeight = 6;
  let y = margin;

  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} · ${rows.length} ligne(s)`, margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.text(columns.map((c) => c.label).join(' | '), margin, y);
  y += lineHeight;

  rows.forEach((row) => {
    if (y > 195) {
      doc.addPage();
      y = margin;
    }
    const line = columns
      .map((c) => {
        const value = row[c.key];
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      })
      .join(' | ')
      .slice(0, 210);
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(filename);
}