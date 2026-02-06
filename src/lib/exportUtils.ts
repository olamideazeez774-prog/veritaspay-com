import { formatDateTime, formatCurrency } from "@/lib/format";
import type { SystemLog } from "@/hooks/useSystemLogs";

export function exportLogsToCSV(logs: SystemLog[], filename: string) {
  const headers = ["Timestamp", "Event Type", "Category", "Description", "Actor", "Amount", "Status", "Related ID"];
  const rows = logs.map(log => [
    formatDateTime(log.created_at),
    log.event_type,
    log.category,
    `"${log.description.replace(/"/g, '""')}"`,
    log.actor_email || "",
    log.amount != null ? log.amount.toString() : "",
    log.status || "",
    log.related_id || "",
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv");
}

export function exportLogsToPDF(logs: SystemLog[], title: string, summary?: Record<string, string>) {
  // Generate a print-friendly HTML document
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #333; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 16px; font-size: 12px; }
  .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .summary-card { background: #f5f5f5; border-radius: 6px; padding: 8px 14px; }
  .summary-card .label { font-size: 10px; color: #888; text-transform: uppercase; }
  .summary-card .value { font-size: 16px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .amount { text-align: right; font-weight: 600; }
  @media print { body { margin: 10px; } }
</style></head><body>
<h1>${title}</h1>
<div class="subtitle">Generated: ${formatDateTime(new Date())}</div>
${summary ? `<div class="summary">${Object.entries(summary).map(([k, v]) => `<div class="summary-card"><div class="label">${k}</div><div class="value">${v}</div></div>`).join("")}</div>` : ""}
<table>
<thead><tr><th>Time</th><th>Event</th><th>Description</th><th>Actor</th><th style="text-align:right">Amount</th><th>Status</th></tr></thead>
<tbody>${logs.map(log => `<tr>
<td>${formatDateTime(log.created_at)}</td>
<td>${log.event_type.replace(/_/g, " ")}</td>
<td>${log.description}</td>
<td>${log.actor_email || "-"}</td>
<td class="amount">${log.amount != null ? formatCurrency(log.amount) : "-"}</td>
<td>${log.status || "-"}</td>
</tr>`).join("")}</tbody>
</table>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
