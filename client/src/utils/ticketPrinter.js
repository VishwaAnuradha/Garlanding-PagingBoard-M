import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { printReportPdf } from '../services/localPrintService';

function drawLogo(pdf, center, y) {
  // Draw stylized AASL blue triangles logo
  pdf.setFillColor(38, 52, 125);
  pdf.triangle(center, y, center - 9, y + 6.5, center + 9, y + 6.5, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.triangle(center, y + 2.2, center - 3.2, y + 5.8, center + 3.2, y + 5.8, 'F');
  pdf.setFillColor(38, 52, 125);
  pdf.rect(center - 0.7, y + 3.2, 1.4, 3.3, 'F');
}

export async function generateTicketPdf(sale) {
  // Standard POS receipt roll: 80mm width, 160mm length
  const pdf = new jsPDF({ unit: 'mm', format: [80, 160] });
  const center = 40;
  const left = 6;
  const right = 74;

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
  const type = sale.ticketType === 2 || sale.ticketType === 3 || sale.ticketType === 'PAGING BOARD' ? 'PAGING BOARD' : 'GARLANDING';
  const prefix = type === 'PAGING BOARD' ? 'AP' : 'AG';
  const serial = `BIA - ${prefix}${String(sale.serialNo ?? sale.id).padStart(8, '0')}`;
  const amount = `Rs : ${Number(sale.amount).toFixed(2)}`;

  let y = 8;
  drawLogo(pdf, center, y);
  y += 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Airport & Aviation Services (Sri Lanka) Limited', center, y, { align: 'center' });
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Bandaranaike International Airport', center, y, { align: 'center' });
  y += 3.5;
  pdf.text('Katunayake', center, y, { align: 'center' });
  y += 5.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('ARRIVAL TAXI COUNTER', center, y, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Serial No : ${serial}`, left, y);
  y += 4.5;
  pdf.text(`Date : ${date}`, left, y);
  pdf.text(`Time : ${time}`, right, y, { align: 'right' });
  y += 4.5;
  pdf.text(`Ticket Type : ${type}`, left, y);
  y += 4.5;
  pdf.text(`Amount : ${amount}`, left, y);
  y += 4.5;
  pdf.text(`No of Items : ${String(sale.qty || 1).padStart(2, '0')}`, left, y);
  y += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Total : ${amount}`, left, y);
  y += 4;

  // QR Code
  try {
    const qrPayload = JSON.stringify({
      serial,
      referenceNo: sale.flightNo,
      company: sale.company,
      ticketType: type,
      quantity: sale.qty,
      amount: Number(sale.amount)
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 120 });
    pdf.addImage(qrDataUrl, 'PNG', center - 13, y, 26, 26);
    y += 28;
  } catch {
    y += 4;
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Ref No : ${sale.flightNo || ''}`, left, y);
  y += 4.5;
  pdf.text(`Company : ${sale.company || ''}`, left, y);
  y += 7;

  pdf.text('-- THANK YOU --', center, y, { align: 'center' });
  y += 5;

  // Dashed tear-off line
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(left, y, right, y);
  y += 5;

  // Stub
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(`Serial No : ${serial}`, left, y);
  pdf.text(`( Ref. ${sale.flightNo || ''} )`, right, y, { align: 'right' });
  y += 4.5;
  pdf.text(`Date : ${date}`, left, y);
  pdf.text(`Time : ${time}`, right, y, { align: 'right' });
  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total : ${amount}`, left, y);
  y += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text('Developed by AASL IT Division', center, y, { align: 'center' });

  return pdf.output('blob');
}

export async function printTicketSilently(sale, printerName = 'EPSON TM-T81III Receipt') {
  const blob = await generateTicketPdf(sale);
  return printReportPdf(blob, printerName);
}
