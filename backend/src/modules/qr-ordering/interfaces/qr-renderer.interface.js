/**
 * QR image renderer contract. Rendering a QR matrix into an image is a
 * presentation concern kept behind this seam so the backend (and the `qrcode`
 * dependency) is swappable and QR-encoding logic never leaks into controllers or
 * services. A concrete renderer returns a PNG buffer for a given payload string.
 */
export class QrRenderer {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /**
   * @param {string} payload  The string to encode (the scan URL).
   * @param {object} [options]
   * @returns {Promise<Buffer>} PNG image buffer.
   */
  async toBuffer(payload, options) {
    throw new Error('QrRenderer.toBuffer() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

/**
 * Default renderer backed by the `qrcode` package. The import is LAZY (dynamic)
 * so the module loads even when the dependency is not installed; it only throws
 * if you actually render without it. Swap via DI for a different backend.
 */
export class QrcodeRenderer extends QrRenderer {
  async toBuffer(payload, options = {}) {
    let qrcode;
    try {
      qrcode = (await import('qrcode')).default;
    } catch {
      throw new Error(
        'QR image rendering requires the "qrcode" package. Install it, or bind a custom QrRenderer.',
      );
    }
    return qrcode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      margin: options.margin ?? 2,
      width: options.width ?? 512,
    });
  }
}

export const qrcodeRenderer = new QrcodeRenderer();
export default QrRenderer;
