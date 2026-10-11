import { jsPDF } from 'jspdf';
import { WeddingConfig, Guest } from '../types';

/**
 * High-definition luxury Wedding Invitation PDF Generator
 * Creates an elegant, printable A5 luxury wedding card ready to print or share via WhatsApp
 */
export async function generateWeddingInvitationPdf(config: WeddingConfig, guest?: Guest): Promise<{ doc: jsPDF; blob: Blob; filename: string }> {
  // A5 dimensions in mm: 148 x 210 (portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background tint
  doc.setFillColor(252, 250, 246); // Warm ivory/alabaster
  doc.rect(0, 0, width, height, 'F');

  // Outer ornate double border
  doc.setDrawColor(180, 142, 70); // Rich Gold #b48e46
  doc.setLineWidth(0.8);
  doc.rect(8, 8, width - 16, height - 16);

  doc.setDrawColor(218, 192, 134); // Soft gold
  doc.setLineWidth(0.3);
  doc.rect(10.5, 10.5, width - 21, height - 21);

  // Corner decorative marks
  const cornerSize = 4;
  const drawCorner = (x: number, y: number, dx: number, dy: number) => {
    doc.setDrawColor(180, 142, 70);
    doc.setLineWidth(0.6);
    doc.line(x, y, x + dx * cornerSize, y);
    doc.line(x, y, x, y + dy * cornerSize);
  };
  drawCorner(12, 12, 1, 1);
  drawCorner(width - 12, 12, -1, 1);
  drawCorner(12, height - 12, 1, -1);
  drawCorner(width - 12, height - 12, -1, -1);

  let curY = 24;

  // Header monogram / title
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('C O N V I T E   D E   C A S A M E N T O', width / 2, curY, { align: 'center' });
  curY += 7;

  // Small ornate divider line
  doc.setDrawColor(218, 192, 134);
  doc.setLineWidth(0.4);
  doc.line(width / 2 - 25, curY, width / 2 + 25, curY);
  curY += 8;

  // Blessing text
  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.text('Com a bênção de Deus e de nossas famílias', width / 2, curY, { align: 'center' });
  curY += 12;

  // Couple names (GROOM FIRST, THEN BRIDE as strictly required)
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';

  doc.setTextColor(45, 30, 20); // Deep dark bronze/charcoal
  doc.setFont('times', 'bold');
  doc.setFontSize(23);
  doc.text(groom, width / 2, curY, { align: 'center' });
  curY += 7;

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.text('&', width / 2, curY, { align: 'center' });
  curY += 8;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(23);
  doc.text(bride, width / 2, curY, { align: 'center' });
  curY += 12;

  // Invitation intro
  doc.setTextColor(100, 90, 80);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('Têm a imensa honra e alegria de convidar você e sua família', width / 2, curY, { align: 'center' });
  curY += 5;
  doc.text('para a celebração do seu matrimónio.', width / 2, curY, { align: 'center' });
  curY += 11;

  // Wedding Date & Time
  let dateFormatted = '19 de Setembro de 2026';
  let timeFormatted = '16:00 Horas';
  try {
    const d = new Date(config.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
      timeFormatted = d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) + ' Horas';
    }
  } catch (e) {}

  // Date banner box
  doc.setFillColor(245, 238, 226);
  doc.setDrawColor(218, 192, 134);
  doc.setLineWidth(0.3);
  doc.roundedRect(20, curY, width - 40, 16, 2, 2, 'FD');

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(dateFormatted.toUpperCase(), width / 2, curY + 6.5, { align: 'center' });

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Às ${timeFormatted}`, width / 2, curY + 12, { align: 'center' });
  curY += 22;

  // Venue information
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('LOCAL DA CERIMÓNIA & RECEPÇÃO', width / 2, curY, { align: 'center' });
  curY += 5;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  const venueTitle = config.venue?.ceremonyName || 'Espaço Jardins da Welwitschia';
  doc.text(venueTitle, width / 2, curY, { align: 'center' });
  curY += 5;

  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  const venueAddress = config.venue?.ceremonyAddress || 'Luanda, Angola';
  const splitAddress = doc.splitTextToSize(venueAddress, width - 46);
  doc.text(splitAddress, width / 2, curY, { align: 'center' });
  curY += (splitAddress.length * 4) + 4;

  // Dress code
  const dressCode = config.dressCode?.title || 'Esporte Fino / Gala';
  doc.setTextColor(130, 110, 80);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.text(`Traje Recomendado: ${dressCode}`, width / 2, curY, { align: 'center' });
  curY += 8;

  // Personalized Guest Box or General RSVP Card
  if (guest) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 192, 134);
    doc.setLineWidth(0.4);
    doc.roundedRect(16, curY, width - 32, 38, 3, 3, 'FD');

    // Guest title
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text('PASSE EXCLUSIVO DE CONVIDADO (RSVP)', 22, curY + 6);

    doc.setTextColor(30, 30, 30);
    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.text(guest.name, 22, curY + 13);

    doc.setTextColor(100, 95, 90);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Mesa: ${guest.tableNumber || 'Reservada'}  •  Assentos: 1 + ${guest.maxPlusOnes} acompanhante(s)`, 22, curY + 19);

    doc.setTextColor(180, 142, 70);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.text(`Token: ${guest.rsvpToken}`, 22, curY + 25);

    // Online confirmation link
    const inviteLink = `${window.location.origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`;
    doc.setTextColor(100, 100, 100);
    doc.setFont('times', 'italic');
    doc.setFontSize(7);
    doc.text('Acesse online para confirmar seu lugar:', 22, curY + 31);
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.text(inviteLink, 22, curY + 35);

    // Try embedding QR Code image
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=rsvp:${guest.rsvpToken}`;
      const imgData = await fetchImageAsBase64(qrUrl);
      if (imgData) {
        doc.addImage(imgData, 'PNG', width - 46, curY + 4, 26, 26);
        doc.setFont('times', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text('QR para Portaria', width - 33, curY + 33, { align: 'center' });
      }
    } catch (e) {
      // QR code skip gracefully if offline
    }

    curY += 44;
  } else {
    // General card without single guest binding
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 192, 134);
    doc.setLineWidth(0.4);
    doc.roundedRect(18, curY, width - 36, 28, 3, 3, 'FD');

    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('CONFIRMAÇÃO DE PRESENÇA (RSVP)', width / 2, curY + 7, { align: 'center' });

    doc.setTextColor(80, 75, 70);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text('Por gentileza, confirme sua presença até 15 dias antes da cerimônia.', width / 2, curY + 14, { align: 'center' });

    const baseLink = `${window.location.origin}/?clientId=${config.clientId || 'client_1'}`;
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(baseLink, width / 2, curY + 21, { align: 'center' });

    curY += 34;
  }

  // Footer message
  const footerMsg = config.customFooter || `Com amor, sempre. — ${groom} & ${bride}`;
  doc.setTextColor(150, 135, 115);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.text(footerMsg, width / 2, height - 14, { align: 'center' });

  const safeFilename = `Convite_${groom}_e_${bride}${guest ? '_' + guest.name.replace(/[^a-zA-Z0-9]/g, '_') : ''}.pdf`;
  const blob = doc.output('blob');

  return { doc, blob, filename: safeFilename };
}

/**
 * Downloads the generated wedding invitation PDF
 */
export async function downloadWeddingPdf(config: WeddingConfig, guest?: Guest): Promise<void> {
  const { doc, filename } = await generateWeddingInvitationPdf(config, guest);
  doc.save(filename);
}

/**
 * Formats a ready-to-send WhatsApp invite message
 */
export function formatWhatsAppMessage(config: WeddingConfig, guest?: Guest): string {
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';
  let dateFormatted = '19 de Setembro de 2026';
  try {
    const d = new Date(config.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  const inviteUrl = guest 
    ? `${window.location.origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`
    : `${window.location.origin}/?clientId=${config.clientId || 'client_1'}`;

  const greeting = guest ? `Olá, *${guest.name}*!` : `Olá!`;
  const tablePart = guest?.tableNumber ? `\n🪑 *Mesa Reservada:* ${guest.tableNumber}` : '';
  const seatsPart = guest?.maxPlusOnes ? `\n👥 *Assentos Disponíveis:* 1 titular + ${guest.maxPlusOnes} acompanhante(s)` : '';

  return `💍 *CONVITE DE CASAMENTO* 💍

${greeting}

É com imensa alegria e carinho que convidamos você para celebrar o nosso matrimónio!

🤵👰 *${groom} & ${bride}*
📅 *Data:* ${dateFormatted}
📍 *Local:* ${config.venue?.ceremonyName || 'Espaço Jardins da Welwitschia'}${tablePart}${seatsPart}

Acesse o seu convite digital interativo e confirme a sua presença aqui:
👉 ${inviteUrl}

Sua presença tornará o nosso dia ainda mais inesquecível! ❤️`;
}

/**
 * Opens WhatsApp directly with prefilled invite message
 */
export function sendInviteViaWhatsApp(config: WeddingConfig, guest?: Guest): void {
  const message = formatWhatsAppMessage(config, guest);
  const rawPhone = guest?.phone ? guest.phone.replace(/[^0-9]/g, '') : '';
  
  let url = '';
  if (rawPhone && rawPhone.length >= 8) {
    url = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(message)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }
  
  window.open(url, '_blank');
}

/**
 * Helper to fetch image as Base64 for PDF embedding
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}
