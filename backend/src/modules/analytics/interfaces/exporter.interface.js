import { EXPORT_FORMAT } from '../constants/analytics.constants.js';

/**
 * Report EXPORTER interface + registry. A CSV exporter is fully implemented
 * (dependency-free); Excel/PDF are declared interfaces with inert stubs — a real
 * renderer (exceljs / pdfkit) drops in later WITHOUT changing the export service.
 * Each exporter maps a list of row objects + column spec to a serialized report.
 *
 * @typedef {{ key:string, label:string }} Column
 */
export class Exporter {
  /** @type {string} */
  static format = 'base';
  /** @returns {{ content: string|Buffer, mimeType: string, extension: string }} */
  export(_rows, _columns) {
    throw new Error(`${new.target.format} exporter not implemented`);
  }
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC-4180 CSV exporter (no external dependency). */
export class CsvExporter extends Exporter {
  static format = EXPORT_FORMAT.CSV;
  export(rows = [], columns = []) {
    const cols = columns.length ? columns : inferColumns(rows);
    const header = cols.map((c) => csvCell(c.label ?? c.key)).join(',');
    const body = rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(',')).join('\n');
    return { content: `${header}\n${body}\n`, mimeType: 'text/csv', extension: 'csv' };
  }
}

/** Excel exporter INTERFACE (rendering added later, e.g. exceljs). */
export class ExcelExporter extends Exporter {
  static format = EXPORT_FORMAT.EXCEL;
  export() {
    throw new Error('Excel export not implemented yet — register a concrete ExcelExporter');
  }
}

/** PDF exporter INTERFACE (rendering added later, e.g. pdfkit). */
export class PdfExporter extends Exporter {
  static format = EXPORT_FORMAT.PDF;
  export() {
    throw new Error('PDF export not implemented yet — register a concrete PdfExporter');
  }
}

function inferColumns(rows) {
  const keys = new Set();
  for (const r of rows) for (const k of Object.keys(r ?? {})) keys.add(k);
  return [...keys].map((k) => ({ key: k, label: k }));
}

/** Registry: pick the exporter for a format. Register a real Excel/PDF impl to enable it. */
export class ExporterRegistry {
  constructor() {
    this.map = new Map([
      [EXPORT_FORMAT.CSV, new CsvExporter()],
      [EXPORT_FORMAT.EXCEL, new ExcelExporter()],
      [EXPORT_FORMAT.PDF, new PdfExporter()],
    ]);
  }
  register(exporter) {
    this.map.set(exporter.constructor.format, exporter);
    return this;
  }
  get(format) {
    return this.map.get(format) ?? null;
  }
  supported() {
    return [...this.map.keys()];
  }
  isReady(format) {
    const e = this.get(format);
    return Boolean(e) && format === EXPORT_FORMAT.CSV; // only CSV renders in this phase
  }
}

export const exporterRegistry = new ExporterRegistry();
export default exporterRegistry;
