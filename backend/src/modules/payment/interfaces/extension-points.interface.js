/**
 * Payment Engine EXTENSION POINTS (contracts only, per the phase scope).
 *
 *  - PdfGenerator: invoice PDF rendering is behind this interface — the engine
 *    stores only the reference. A future implementation (Puppeteer / a PDF
 *    service) is injected via DI; the default no-op returns null so invoices are
 *    fully usable without a PDF.
 *  - SettlementProvider: settlements are an ABSTRACTION — grouping + math live in
 *    the SettlementService; the actual payout execution is delegated here.
 */
export class PdfGenerator {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<{ key: string|null, url: string|null }>} */
  async generate(invoice) {
    return { key: null, url: null };
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export class SettlementProvider {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /** @returns {Promise<{ status: string, reference?: string }>} */
  async execute(settlement) {
    throw new Error('SettlementProvider.execute() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

export const noopPdfGenerator = new PdfGenerator();
export default PdfGenerator;
