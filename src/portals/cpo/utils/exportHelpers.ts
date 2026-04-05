export const exportToCSV = (data: Record<string, any>[], filename: string, options?: { utf8Bom?: boolean }) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val == null ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const body = csvRows.join('\n');
  const payload = options?.utf8Bom ? `\uFEFF${body}` : body;
  const blob = new Blob([payload], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPrintPDF = (title: string, htmlContent: string) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #333; }
      h1 { color: #ff6a00; font-size: 24px; margin-bottom: 8px; }
      .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
      th { background-color: #f8f9fa; font-weight: 600; }
      @media print { body { padding: 0; } }
    </style>
    </head><body>
    <h1>${title}</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()}</div>
    ${htmlContent}
    <script>window.print();</script>
    </body></html>
  `);
  win.document.close();
};
