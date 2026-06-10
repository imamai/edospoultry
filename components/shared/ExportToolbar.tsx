"use client";
import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";

export interface ExportCol { key: string; header: string }

interface Props {
  data:     Record<string, unknown>[];
  columns:  ExportCol[];
  filename: string;
  title?:   string;
}

export function ExportToolbar({ data, columns, filename, title }: Props) {
  const [open, setOpen] = useState(false);

  const flat = () =>
    data.map(r =>
      columns.reduce((acc, c) => {
        acc[c.header] = r[c.key] ?? "";
        return acc;
      }, {} as Record<string, unknown>)
    );

  function csv() {
    const rows = flat();
    const hdr  = columns.map(c => c.header).join(",");
    const body = rows.map(r =>
      columns.map(c => {
        const v = String(r[c.header] ?? "");
        return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")
    );
    dl(`${filename}.csv`, new Blob([[hdr, ...body].join("\n")], { type: "text/csv;charset=utf-8;" }));
    setOpen(false);
  }

  function excel() {
    const ws = XLSX.utils.json_to_sheet(flat(), { header: columns.map(c => c.header) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setOpen(false);
  }

  function pdf() {
    const rows = flat();
    const win  = window.open("", "_blank");
    if (!win) return;
    const trs = rows.map(r =>
      `<tr>${columns.map(c => `<td>${r[c.header] ?? ""}</td>`).join("")}</tr>`
    ).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>${title ?? filename}</title>
<style>
body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
h2{margin-bottom:10px;font-size:14px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
th{background:#f0f0f0;font-weight:bold}
tr:nth-child(even){background:#fafafa}
</style></head>
<body><h2>${title ?? filename}</h2>
<p style="font-size:10px;color:#666;margin-bottom:8px">Generated: ${new Date().toLocaleString()}</p>
<table><thead><tr>${columns.map(c => `<th>${c.header}</th>`).join("")}</tr></thead>
<tbody>${trs}</tbody></table>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`);
    win.document.close();
    setOpen(false);
  }

  function dl(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
      >
        <Download size={15} /> Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden w-44">
            <button onClick={csv}   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <FileText       size={14} className="text-green-600" /> CSV
            </button>
            <button onClick={excel} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <FileSpreadsheet size={14} className="text-blue-600" /> Excel (.xlsx)
            </button>
            <button onClick={pdf}   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Printer        size={14} className="text-red-500"  /> Print / PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
