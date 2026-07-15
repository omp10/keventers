import { describe, expect, it } from 'vitest';

import { CsvExporter, ExcelExporter, exporterRegistry } from '../interfaces/exporter.interface.js';
import { EXPORT_FORMAT } from '../constants/analytics.constants.js';

describe('CsvExporter', () => {
  it('renders header + rows and escapes commas/quotes', () => {
    const out = new CsvExporter().export(
      [{ name: 'Burger, Deluxe', qty: 3 }, { name: 'He said "hi"', qty: 1 }],
      [{ key: 'name', label: 'Name' }, { key: 'qty', label: 'Qty' }],
    );
    expect(out.mimeType).toBe('text/csv');
    const lines = out.content.trim().split('\n');
    expect(lines[0]).toBe('Name,Qty');
    expect(lines[1]).toBe('"Burger, Deluxe",3');
    expect(lines[2]).toBe('"He said ""hi""",1');
  });

  it('infers columns when none are given', () => {
    const out = new CsvExporter().export([{ a: 1, b: 2 }]);
    expect(out.content.split('\n')[0]).toBe('a,b');
  });
});

describe('ExporterRegistry', () => {
  it('has CSV ready and Excel/PDF as not-yet-ready interfaces', () => {
    expect(exporterRegistry.isReady(EXPORT_FORMAT.CSV)).toBe(true);
    expect(exporterRegistry.isReady(EXPORT_FORMAT.EXCEL)).toBe(false);
    expect(exporterRegistry.isReady(EXPORT_FORMAT.PDF)).toBe(false);
  });

  it('an unimplemented exporter throws when invoked', () => {
    expect(() => new ExcelExporter().export([], [])).toThrow(/not implemented/i);
  });

  it('a real exporter can be registered without changing the service', () => {
    class MyExcel extends ExcelExporter {
      export() { return { content: 'xlsx', mimeType: 'application/vnd.ms-excel', extension: 'xlsx' }; }
    }
    const reg = new (exporterRegistry.constructor)();
    reg.register(new MyExcel());
    expect(reg.get(EXPORT_FORMAT.EXCEL).export().content).toBe('xlsx');
  });
});
