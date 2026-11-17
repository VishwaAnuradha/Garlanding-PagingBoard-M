import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { printReportPdf } from '../services/localPrintService';

let cachedAaslLogo = null;

/**
 * Generates high-contrast monochrome PNG of the official AASL logo
 * for thermal POS printing to avoid gray dithering.
 */
function getAaslLogoBlackDataUrl() {
  if (cachedAaslLogo) return cachedAaslLogo;
  try {
    const canvas = document.createElement('canvas');
    // SVG viewBox is 460 x 155. Double resolution (920 x 310) for sharp thermal rendering.
    canvas.width = 920;
    canvas.height = 310;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(2, 2);
    ctx.fillStyle = '#000000';
    const path = new Path2D(
      'M230 4 0 155h120l57-62-25 62h54l24-125 25 125h55l-25-62 58 62h117L230 4Zm-61 79 37-55-15 55h-22Zm100 0-15-55 37 55h-22Z'
    );
    ctx.fill(path);
    cachedAaslLogo = canvas.toDataURL('image/png');
    return cachedAaslLogo;
  } catch {
    return null;
  }
}

function drawFallbackLogo(pdf, center, y) {
  // Fallback vector in pure black (not color) to prevent thermal dithering
  pdf.setFillColor(0, 0, 0);
  pdf.triangle(center, y, center - 9, y + 6.5, center + 9, y + 6.5, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.triangle(center, y + 2.2, center - 3.2, y + 5.8, center + 3.2, y + 5.8, 'F');
  pdf.setFillColor(0, 0, 0);
  pdf.rect(center - 0.7, y + 3.2, 1.4, 3.3, 'F');
}

export const AIRPORT_INFO = {
  BIA: { code: 'BIA', name: 'Bandaranaike International Airport', location: 'Katunayake' },
  CIAR: { code: 'CIAR', name: 'Colombo International Airport Ratmalana', location: 'Ratmalana' },
  JIA: { code: 'JIA', name: 'Jaffna International Airport', location: 'Palaly' },
  MRIA: { code: 'MRIA', name: 'Mattala Rajapaksa International Airport', location: 'Mattala' },
  BTIA: { code: 'BTIA', name: 'Batticaloa International Airport', location: 'Batticaloa' }
};

export async function generateTicketPdf(sale) {
  const airportCode = String(sale.airport || 'BIA').trim().toUpperCase();
  const airportMeta = AIRPORT_INFO[airportCode] || AIRPORT_INFO.BIA;

  // Standard POS receipt roll: 80mm width, 185mm length (includes cutter feed clearance)
  const pdf = new jsPDF({ unit: 'mm', format: [80, 185] });
  const center = 40;
  const left = 6;
  const right = 74;
  const colColon = 27;
  const colValue = 29.5;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date(sale.createdAt || Date.now()));

  const get = type => parts.find(p => p.type === type)?.value || '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}:${get('second')}`;
  const sessionId = sale.sessionId ?? sale.SessionId ?? '';
  const userId = sale.userId ?? sale.USERID ?? sale.epfNumber ?? sale.ssn ?? '';
  const rawType = sale.ticketType ?? sale.ticketTypeId ?? sale.targetTable;
  const isPaging = rawType === 2 || rawType === 3 || rawType === '2' || rawType === '3' 
    || String(rawType || '').toUpperCase().includes('PAGING');
  const type = isPaging ? 'PAGING BOARD' : 'GARLANDING';
  const prefix = type === 'PAGING BOARD' ? 'AP' : 'AG';
  const serial = `${airportCode} - ${prefix}${String(sale.serialNo ?? sale.id).padStart(8, '0')}`;
  const formattedAmount = `Rs. ${Number(sale.amount).toFixed(2)}`;

  let y = 6;

  // 1. Official AASL Logo (Sharp pure black)
  const logoDataUrl = getAaslLogoBlackDataUrl();
  const logoWidth = 24;
  const logoHeight = (logoWidth * 155) / 460; // 8.08mm
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', center - logoWidth / 2, y, logoWidth, logoHeight);
    y += logoHeight + 3.5;
  } else {
    drawFallbackLogo(pdf, center, y);
    y += 10;
  }

  // 2. Header Texts (Centered)
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Airport & Aviation Services Sri Lanka (PVT) Limited', center, y, { align: 'center' });
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(airportMeta.name, center, y, { align: 'center' });
  y += 3.5;
  pdf.text(airportMeta.location, center, y, { align: 'center' });
  y += 5.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('GARLANDING & PAGING BOARD COUNTER', center, y, { align: 'center' });
  y += 5;

  // Header separator
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([0.8, 0.8], 0);
  pdf.line(left, y, right, y);
  pdf.setLineDashPattern([], 0);
  y += 4.5;

  // 3. Aligned Ticket Fields
  const drawField = (label, val, isBold = false) => {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.text(label, left, y);
    pdf.text(':', colColon, y);
    pdf.text(String(val), colValue, y);
  };

  drawField('Serial No', serial);
  y += 4.5;

  // Date and Time on the same line, perfectly aligned
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Date', left, y);
  pdf.text(':', colColon, y);
  pdf.text(date, colValue, y);
  pdf.text(`Time : ${time}`, right, y, { align: 'right' });
  y += 4.5;

  // Ticket Type (GARLANDING / PAGING BOARD)
  drawField('Ticket Type', type);
  y += 4.5;

  // Payment Type (Cash / Credit)
  const isCredit = sale.credit === 1 || sale.credit === true || sale.credit === '1' 
    || sale.paymentMethod === 'CREDIT_CARD' || sale.paymentMethod === 'CREDIT';
  const paymentTypeLabel = isCredit ? 'Credit' : 'Cash';

  drawField('Payment Type', paymentTypeLabel);
  y += 4.5;

  drawField('No of Items', String(sale.qty || 1).padStart(2, '0'));
  y += 4.5;

  if (sessionId !== '' && sessionId != null) {
    drawField('Session ID', sessionId);
    y += 4.5;
  }

  if (userId !== '' && userId != null) {
    drawField('User ID', userId);
    y += 4.5;
  }

  drawField('Amount', formattedAmount, true);
  y += 4.5;

  const isPagingBoard = type === 'PAGING BOARD';
  const referenceLabel = isPagingBoard ? 'Serial No' : 'Flight No';

  if (sale.flightNo) {
    drawField(referenceLabel, sale.flightNo);
    y += 4.5;
  }

  if (sale.company) {
    drawField('Company', sale.company);
    y += 4.5;
  }

  y += 1;

  // 4. Total Amount Block with Dividers
  pdf.setLineDashPattern([0.8, 0.8], 0);
  pdf.line(left, y, right, y);
  y += 4.2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text('TOTAL', left, y);
  pdf.text(formattedAmount, right, y, { align: 'right' });
  y += 2.5;

  pdf.line(left, y, right, y);
  pdf.setLineDashPattern([], 0);
  y += 5;

  // 5. Centered QR Code
  try {
    const qrPayload = JSON.stringify({
      serial,
      referenceNo: sale.flightNo || '',
      company: sale.company || '',
      ticketType: type,
      quantity: sale.qty,
      amount: Number(sale.amount)
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 140 });
    pdf.addImage(qrDataUrl, 'PNG', center - 13, y, 26, 26);
    y += 29;
  } catch {
    y += 3;
  }

  // 6. Thank You
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('-- THANK YOU --', center, y, { align: 'center' });
  y += 5;

  // 7. Dashed Perforation Tear-off Line
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(left, y, right, y);
  pdf.setLineDashPattern([], 0);
  y += 5;

  // 8. Bottom Stub (Counter copy)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(`Serial No : ${serial}`, left, y);
  
  y += 4.2;

  pdf.text(`Date : ${date}`, left, y);
  pdf.text(`Time : ${time}`, right, y, { align: 'right' });
  y += 4.2;

  if (sessionId !== '' && sessionId != null) {
    pdf.text(`Session ID : ${sessionId}`, left, y);
    y += 4.2;
  }

  pdf.text(`Ticket Type : ${type} (${paymentTypeLabel})`, left, y);
  y += 4.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Total :', left, y);
  pdf.text(formattedAmount, right, y, { align: 'right' });
  y += 5.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text('Developed by AASL IT Division', center, y, { align: 'center' });
  y += 12; // Safe bottom feed clearance to prevent paper cutter truncation

  return pdf.output('blob');
}

export async function printTicketSilently(sale, printerName = 'EPSON TM-T81III Receipt') {
  const blob = await generateTicketPdf(sale);
  return printReportPdf(blob, printerName);
}

/**
 * Generates an 80mm thermal receipt roll PDF for Session Close Summary
 * matching the official AASL Jaffna / BIA PASS Session Summary format.
 */
export async function generateSessionSummaryReceiptPdf(sessionData) {
  const airportCode = String(sessionData.airport || 'BIA').trim().toUpperCase();
  const airportMeta = AIRPORT_INFO[airportCode] || AIRPORT_INFO.BIA;

  // 80mm width thermal roll, 215mm height
  const pdf = new jsPDF({ unit: 'mm', format: [80, 215] });
  const center = 40;
  const left = 6;
  const right = 74;
  const colColon = 27;
  const colValue = 29.5;

  let y = 6;

  // 1. Official AASL Logo
  const logoDataUrl = getAaslLogoBlackDataUrl();
  const logoWidth = 24;
  const logoHeight = (logoWidth * 155) / 460;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', center - logoWidth / 2, y, logoWidth, logoHeight);
    y += logoHeight + 3.5;
  } else {
    drawFallbackLogo(pdf, center, y);
    y += 10;
  }

  // 2. Header Texts
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Airport & Aviation Services (Sri Lanka)(PVT) Ltd.', center, y, { align: 'center' });
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(airportMeta.name, center, y, { align: 'center' });
  y += 3.5;
  pdf.text(airportMeta.location, center, y, { align: 'center' });
  y += 5.5;

  // Receipt Title (GARLANDING / PAGING BOARD SESSION SUMMARY RECEIPT)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(sessionData.title || 'SESSION SUMMARY RECEIPT', center, y, { align: 'center' });
  y += 5.5;

  const drawRow = (label, val, isBold = false) => {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.text(label, left, y);
    pdf.text(':', colColon, y);
    pdf.text(String(val ?? '-'), colValue, y);
  };

  const drawSaleRow = (label, count, amount, isBold = false) => {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(8);
    pdf.text(label, left, y);
    pdf.text(':', colColon, y);
    pdf.text(String(count), colValue, y);
    pdf.text(`Rs ${Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, right, y, { align: 'right' });
  };

  const formatDateTime = dt => {
    if (!dt) return '-';
    try {
      const d = new Date(dt);
      return d.toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return String(dt);
    }
  };

  drawRow('User ID', sessionData.userId);
  y += 4.2;

  drawRow('Name', sessionData.userName || sessionData.userId);
  y += 4.2;

  

  drawRow('Session Start', formatDateTime(sessionData.sessionStartedAt));
  y += 4.2;

  drawRow('Session End', formatDateTime(sessionData.sessionEndedAt));
  y += 4.2;

  drawRow('Start Serial', sessionData.startSerial || '-');
  y += 4.2;

  drawRow('End Serial', sessionData.endSerial || '-');
  y += 4.2;

  drawRow('Cancel Tickets', String(sessionData.cancelTickets ?? 0));
  y += 5.5;

  // --- SYSTEM SALES ---
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('--- SYSTEM SALES ---', left, y);
  y += 4.5;

  drawSaleRow('Cash Passes', sessionData.systemCashQty ?? 0, sessionData.systemCashAmount ?? 0);
  y += 4.2;

  drawSaleRow('Credit Passes', sessionData.systemCreditQty ?? 0, sessionData.systemCreditAmount ?? 0);
  y += 4.2;

  drawSaleRow('System Total', `${sessionData.systemTotalQty ?? 0} passes`, sessionData.systemTotalAmount ?? 0, true);
  y += 5.5;

  // --- MANUAL SALES ---
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('--- MANUAL SALES ---', left, y);
  y += 4.5;

  drawSaleRow('Manual Cash', sessionData.manualCashQty ?? 0, sessionData.manualCashAmount ?? 0);
  y += 4.2;

  drawSaleRow('Manual Credit', sessionData.manualCreditQty ?? 0, sessionData.manualCreditAmount ?? 0);
  y += 5.5;

  // GRAND TOTAL
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.line(left, y, right, y);
  y += 4.2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('GRAND TOTAL', left, y);
  pdf.text(':', colColon, y);
  pdf.text(`${sessionData.grandTotalQty ?? 0} passes`, colValue, y);
  pdf.text(`Rs ${Number(sessionData.grandTotalAmount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, right, y, { align: 'right' });
  y += 2.5;

  pdf.line(left, y, right, y);
  y += 6;

  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Summary ID : #${sessionData.sessionId}`, left, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('-- SESSION CLOSED --', center, y, { align: 'center' });
  y += 4.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text('Developed by AASL IT Division', center, y, { align: 'center' });
  y += 12; // Safe cutter clearance

  return pdf;
}

export async function printSessionSummaryReceiptSilently(sessionData, printerName = 'EPSON TM-T81III Receipt') {
  const pdf = await generateSessionSummaryReceiptPdf(sessionData);
  return printReportPdf(pdf.output('blob'), printerName);
}
