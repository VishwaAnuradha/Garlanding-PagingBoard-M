import { jsPDF } from 'jspdf';
import { formatReportDate, formatReportMoney as money, formatReportSerial, getSessionReportSummary } from './sessionReportSummary';

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - margin * 2; // 182mm

export function createSalesReportPdf(report) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const summary = getSessionReportSummary(report);
  const center = pageWidth / 2;
  let y = 14;

  const logo = getLogoData();
  if (logo) {
    pdf.addImage(logo, 'PNG', center - 10, y, 20, 6.7);
    y += 11;
  } else {
    drawFallbackLogo(pdf, center, y);
    y += 11;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.text('Airport & Aviation Services (Sri Lanka) (Private) Limited', center, y, { align: 'center' });
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text('Bandaranaike International Airport', center, y, { align: 'center' });
  y += 4.5;
  pdf.setFontSize(8);
  pdf.text('Katunayake', center, y, { align: 'center' });
  y += 7;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  const reportTitle = report.ticketTypes?.length === 1
    ? report.ticketTypes[0] === 'PAGING_BOARD'
      ? 'PAGINGBOARD SESSION SUMMARY REPORT'
      : 'GARLANDING SESSION SUMMARY REPORT'
    : 'DEPARTURE ENTRY TICKET SESSION SUMMARY REPORT';
  pdf.text(reportTitle, center, y, { align: 'center' });
  y += 7;

  const users = report.users?.length ? report.users.join(', ') : '-';
  const airport = report.airport || 'BIA';
  const ticketTypes = (report.ticketTypes || ['GARLANDING', 'PAGING_BOARD'])
    .map(type => type === 'PAGING_BOARD' ? 'Paging Board' : 'Garlanding')
    .join(', ');

  const detailRows = [
    { left: ['Start Serial No', formatReportSerial(report.startSerialNo, airport, report.ticketTypes)], right: ['End Serial No', formatReportSerial(report.endSerialNo, airport, report.ticketTypes)] },
    { left: ['Start Date/Time', formatReportDate(report.shift?.startAt || report.date)], right: ['End Date/Time', formatReportDate(report.shift?.endAt || report.date)] },
    { left: ['No of Cancelled Tickets', String(report.cancelledTickets ?? 0)], right: ['Session ID', String(report.shift?.id ?? report.date ?? '-')] },
    { left: ['No of Visitors', String(summary.totalQty)], right: ['Ticket Type', ticketTypes] },
    { left: ['User', users], right: ['Airport', airport] }
  ];

  const halfWidth = contentWidth / 2;
  const col1LabelX = margin;
  const col1ColonX = margin + 35;
  const col1ValX = margin + 37.5;

  const col2LabelX = margin + halfWidth + 2;
  const col2ColonX = margin + halfWidth + 35;
  const col2ValX = margin + halfWidth + 37.5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  detailRows.forEach(row => {
    // Left column
    pdf.setFont('helvetica', 'normal');
    pdf.text(row.left[0], col1LabelX, y);
    pdf.text(':', col1ColonX, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(row.left[1] ?? '-'), col1ValX, y);

    // Right column
    if (row.right) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(row.right[0], col2LabelX, y);
      pdf.text(':', col2ColonX, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(row.right[1] ?? '-'), col2ValX, y);
    }
    y += 5.2;
  });
  y += 3;

  // Section 1 - Session & Banking Summary (Spacious rows & generous gap)
  y = drawSectionTitle(pdf, '1. SESSION & BANKING SUMMARY', margin, y);
  y = drawTable(
    pdf,
    margin,
    y,
    contentWidth,
    ['Session Total Income', 'Total Visitors / Tickets', 'Deposit Slip No', 'Bank', 'Remark'],
    [[money(summary.totalAmount), String(summary.totalQty), report.depositSlipNo || '-', report.bank || '-', report.remark || '-']],
    [0.26, 0.22, 0.20, 0.14, 0.18],
    { rowHeight: 9 }
  );
  y += 7.5; // Gap between Section 1 and Section 2 & 3

  // Section 2 & 3 side by side
  const gap = 4;
  const halfTableWidth = (contentWidth - gap) / 2;
  const rightTableX = margin + halfTableWidth + gap;

  drawSectionTitle(pdf, '2. SYSTEM TICKET SALES', margin, y);
  drawSectionTitle(pdf, '3. MANUAL TICKET SALES', rightTableX, y);
  y += 4.5;

  const systemRows = [
    ['Cash Tickets', String(summary.system.cashQty), money(summary.system.cashAmount)],
    ['Credit Tickets', String(summary.system.creditQty), money(summary.system.creditAmount)],
    ['Subtotal (Tickets)', String(summary.system.ticketQty), money(summary.system.totalAmount)]
  ];
  const manualRows = [
    ['Manual Cash Sales', String(summary.manual.cashQty), money(summary.manual.cashAmount)],
    ['Manual Credit Sales', String(summary.manual.creditQty), money(summary.manual.creditAmount)],
    ['Subtotal (Manual)', String(summary.manual.cashQty + summary.manual.creditQty), money(summary.manual.cashAmount + summary.manual.creditAmount)]
  ];

  drawTable(pdf, margin, y, halfTableWidth, ['Sales Mode', 'No of Tickets', 'Amount (Rs)'], systemRows, [0.44, 0.26, 0.30], { rowHeight: 8.2, boldLastRow: true });
  y = drawTable(pdf, rightTableX, y, halfTableWidth, ['Sales Mode', 'No of Tickets', 'Amount (Rs)'], manualRows, [0.44, 0.26, 0.30], { rowHeight: 8.2, boldLastRow: true });
  y += 7.5; // Gap between Section 2/3 and Section 4

  // Section 4 - Total Sales & Revenue Collection
  y = drawSectionTitle(pdf, '4. TOTAL SALES & REVENUE COLLECTION', margin, y);
  y = drawTable(pdf, margin, y, contentWidth, ['Collection Method', 'Total Tickets / Visitors', 'Total Collection (Rs)'], [
    ['Total Cash Collection (Tickets + Manual)', String(summary.cashQty), money(summary.cashAmount)],
    ['Total Credit Collection (Tickets + Manual)', String(summary.creditQty), money(summary.creditAmount)],
    ['GRAND TOTAL REVENUE', String(summary.totalQty), money(summary.totalAmount)]
  ], [0.44, 0.26, 0.30], { rowHeight: 8.5, boldLastRow: true });
  y += 8; // Gap before Declaration

  // Declaration
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.8);
  pdf.text('I do hereby declare that the above information to the best of my knowledge is true & correct.', margin, y);
  y += 14; // Increased gap between declaration and 01 signature line

  // ASA Signatures with comfortable spacing
  drawSignature(pdf, margin, y, '01');
  y += 18;
  drawSignature(pdf, margin, y, '02');

  // Supervisor & Duty Officer Signatures positioned gracefully to cover the empty page area
  const lineY = 256;
  const leftLineStart = margin + 5;
  const leftLineEnd = margin + 75;
  const leftCenter = (leftLineStart + leftLineEnd) / 2;

  const rightLineEnd = pageWidth - margin - 5;
  const rightLineStart = rightLineEnd - 70;
  const rightCenter = (rightLineStart + rightLineEnd) / 2;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  pdf.line(leftLineStart, lineY, leftLineEnd, lineY);
  pdf.line(rightLineStart, lineY, rightLineEnd, lineY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(40);
  pdf.text('Name and Official Seal of the Supervisor', leftCenter, lineY + 5, { align: 'center' });
  pdf.text('Signature of the Duty Officer', rightCenter, lineY + 5, { align: 'center' });

  // Page Footer (anchored near bottom of A4)
  const footerY = 283;
  pdf.setDrawColor(180);
  pdf.setLineWidth(0.2);
  pdf.line(margin, footerY, pageWidth - margin, footerY);
  pdf.setTextColor(100);
  pdf.setFontSize(7);
  pdf.text(`Print Date/Time: ${formatReportDate(report.generatedAt)}`, margin, footerY + 4.5);
  pdf.text('1 of 1', pageWidth - margin, footerY + 4.5, { align: 'right' });
  pdf.setTextColor(0);

  return pdf.output('blob');
}

export function downloadSalesReportPdf(report) {
  const blob = createSalesReportPdf(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameDate = report.shift?.startAt ? report.shift.startAt.slice(0, 10) : report.date || 'report';
  const fileNameId = report.shift?.id ? `_session_${report.shift.id}` : '';
  a.download = `sales_report_${fileNameDate}${fileNameId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getLogoData() {
  const image = document.getElementById('sales-report-logo');
  if (!image?.complete || !image.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 155;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the airport logo for the PDF report.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function drawFallbackLogo(pdf, center, y) {
  pdf.setFillColor(38, 52, 125);
  pdf.triangle(center, y, center - 10, y + 7, center + 10, y + 7, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.triangle(center, y + 2.5, center - 3.5, y + 6.2, center + 3.5, y + 6.2, 'F');
  pdf.setFillColor(38, 52, 125);
  pdf.rect(center - 0.8, y + 3.5, 1.6, 3.5, 'F');
}

function drawSectionTitle(pdf, title, x, y) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0);
  pdf.text(title, x, y);
  return y + 3;
}

function drawTable(pdf, x, y, width, headers, rows, proportions, { rowHeight, boldLastRow = false }) {
  const columnWidths = proportions.map(proportion => width * proportion);
  const allRows = [headers, ...rows];

  allRows.forEach((row, rowIndex) => {
    let cellX = x;
    const isHeader = rowIndex === 0;
    const isLast = rowIndex === allRows.length - 1;
    const isBold = isHeader || (boldLastRow && isLast);

    row.forEach((cell, columnIndex) => {
      const cellWidth = columnWidths[columnIndex];
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.2);

      if (isHeader) {
        pdf.setFillColor(245, 247, 250);
        pdf.rect(cellX, y, cellWidth, rowHeight, 'FD');
      } else {
        pdf.rect(cellX, y, cellWidth, rowHeight);
      }

      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setFontSize(isHeader ? 7.2 : 7.6);
      pdf.setTextColor(0);

      const cellText = String(cell ?? '');
      const lines = pdf.splitTextToSize(cellText, cellWidth - 2);
      const textY = y + (rowHeight / 2) + (lines.length > 1 ? 0.7 : 1.3);
      pdf.text(lines, cellX + cellWidth / 2, textY, { align: 'center', maxWidth: cellWidth - 1 });
      cellX += cellWidth;
    });
    y += rowHeight;
  });
  return y;
}

function drawSignature(pdf, x, y, number) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(number, x, y);
  pdf.setLineWidth(0.25);
  pdf.setDrawColor(0);
  pdf.line(x + 7, y, x + 95, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  pdf.text('Name of ASA', x + 7, y + 4);
  pdf.setTextColor(0);
}
