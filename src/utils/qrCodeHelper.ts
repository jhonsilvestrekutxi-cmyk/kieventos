import QRCode from 'qrcode';

/**
 * Generates a clean client-side data URL or SVG for QR codes
 * without relying on external third-party servers.
 */
export async function generateQrDataUrl(text: string, size = 180): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#1c1917', // stone-900
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.warn('[QR Generator] Error generating QR code, falling back to public CDN:', err);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

/**
 * Synchronous SVG string generator for instant rendering
 */
export async function generateQrSvgString(text: string, size = 180): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#1c1917',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    return '';
  }
}
