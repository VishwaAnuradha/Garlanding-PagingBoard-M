import { jsPDF } from '../client/node_modules/jspdf/dist/jspdf.es.min.js';
import { writeFile } from 'node:fs/promises';

const documentTitle = 'Airport Arrival Services Counter System';
const outputPath = 'Airport_Arrival_Services_Counter_System_Overview.pdf';
const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();
const margin = 18;
const contentWidth = pageWidth - margin * 2;
let y = 24;

function pageHeader() {
  pdf.setFillColor(17, 54, 95);
  pdf.rect(0, 0, pageWidth, 14, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(documentTitle, margin, 9);
  pdf.setTextColor(0, 0, 0);
}

function pageFooter() {
  const page = pdf.getNumberOfPages();
  pdf.setDrawColor(200, 206, 214);
  pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(95, 99, 104);
  pdf.text('System overview generated from README.md', margin, pageHeight - 8);
  pdf.text(`Page ${page}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
}

function newPage() {
  pageFooter();
  pdf.addPage();
  pageHeader();
  y = 24;
}

function ensureSpace(height) {
  if (y + height > pageHeight - 20) newPage();
}

function title(text) {
  ensureSpace(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(21);
  pdf.setTextColor(17, 54, 95);
  pdf.text(text, margin, y);
  pdf.setTextColor(0, 0, 0);
  y += 11;
}

function heading(text) {
  ensureSpace(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(17, 54, 95);
  pdf.text(text, margin, y);
  pdf.setTextColor(0, 0, 0);
  y += 7;
}

function paragraph(text, options = {}) {
  pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
  pdf.setFontSize(options.size || 10);
  const lines = pdf.splitTextToSize(text, contentWidth);
  const height = lines.length * 5 + 3;
  ensureSpace(height);
  pdf.text(lines, margin, y);
  y += height;
}

function bullet(text) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(text, contentWidth - 7);
  const height = lines.length * 5 + 2;
  ensureSpace(height);
  pdf.setFillColor(17, 54, 95);
  pdf.circle(margin + 1.5, y - 1.3, 0.9, 'F');
  pdf.text(lines, margin + 6, y);
  y += height;
}

function table(headers, rows, widths) {
  const rowHeight = 8;
  const cellText = (text, width) => pdf.splitTextToSize(String(text), width - 4);
  const drawRow = (values, isHeader = false) => {
    const lines = values.map((value, i) => cellText(value, widths[i]));
    const height = Math.max(rowHeight, ...lines.map(line => line.length * 4.2 + 3));
    ensureSpace(height + 1);
    let x = margin;
    values.forEach((_, i) => {
      pdf.setFillColor(isHeader ? 17 : 242, isHeader ? 54 : 246, isHeader ? 95 : 250);
      pdf.setDrawColor(205, 211, 220);
      pdf.rect(x, y - 5, widths[i], height, 'FD');
      pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(isHeader ? 255 : 0, isHeader ? 255 : 0, isHeader ? 255 : 0);
      pdf.text(lines[i], x + 2, y);
      pdf.setTextColor(0, 0, 0);
      x += widths[i];
    });
    y += height;
  };
  drawRow(headers, true);
  rows.forEach(row => drawRow(row));
  y += 4;
}

pageHeader();
title(documentTitle);
paragraph('System Overview and SRS Foundation', { bold: true, size: 12 });
paragraph('System identification: A multi-airport point-of-sale and session-management system for airport-arrival services. The supported services are Garlanding and Paging Board tickets; the system is not limited to taxi sales.');

heading('Purpose and scope');
paragraph('The application supports airport-arrival service counters at BIA, CIAR, JIA, MRIA, and BTIA. It covers the operational workflow from authenticated staff login through ticket issue, payment, receipt printing, shift-session closing, and reporting.');
paragraph('The repository contains the React web client, Express API, and SQL maintenance scripts. It depends on separately managed authentication, airport, HR, IFS, and printer services; those dependencies are not provisioned by this project.');

heading('Primary actors and external systems');
table(['Actor / system', 'Responsibility'], [
  ['Counter staff', 'Use an active shift; create sales, print tickets, view daily totals, and close a session.'],
  ['Administrator', 'Manage shifts, users, prices and settings; review history and errors; access dashboards and reports.'],
  ['Super administrator', 'Access authorised sales-reporting functions.'],
  ['UCFE authentication service', 'Verifies credentials and supplies the application role.'],
  ['Airport SQL Server databases', 'Store tickets, sessions, users, settings, and reporting data for each airport.'],
  ['HR employee database', 'Provides read-only employee information to administrators.'],
  ['IFS integration database', 'Receives completed-session information when available.'],
  ['Receipt printer', 'Provides status and prints ticket, summary, and report PDFs.'],
], [50, 124]);

heading('Key functional requirements');
[
  'The system shall authenticate users through UCFE and enforce staff, administrator, and super-administrator permissions.',
  'The system shall require an active shift session before counter staff can issue sales.',
  'The system shall record Garlanding and Paging Board ticket sales with a reference, company, quantity, and cash or card payment method.',
  'The system shall generate receipt PDFs and send them to an available selected printer.',
  'The system shall void a sale and retain an error-ticket record when printing fails.',
  'The system shall allow staff to close their sales session, capture manual quantities when required, and print session summaries.',
  'The system shall allow administrators to manage users, shifts, settings, ticket history, error tickets, and sales reports.',
  'The system shall keep administration and sales data scoped to the airport selected at login.',
].forEach(bullet);

heading('Technology and architecture');
table(['Layer', 'Implementation'], [
  ['Web client', 'React 18, Vite, Tailwind CSS, jsPDF'],
  ['API', 'Node.js and Express'],
  ['Data access', 'Microsoft SQL Server through mssql and msnodesqlv8'],
  ['Authentication', 'UCFE credentials and signed application session tokens'],
  ['Printing', 'Client PDF generation with the pdf-to-printer API integration'],
], [50, 124]);

heading('Deployment prerequisites');
[
  'Node.js 18 or later.',
  'SQL Server connectivity for the airport databases and UCFE authentication database.',
  'Read access to the optional HR employee database and connectivity to the optional IFS database.',
  'A Windows workstation with an installed receipt printer when direct printing is required.',
].forEach(bullet);

heading('Configuration summary');
paragraph('Configure credentials and connection settings in a root .env file or server/.env. The server-specific file takes precedence. Required setup includes the SQL Server endpoint, authentication mode, credentials where applicable, the airport database map, a SESSION_SECRET, and PORT. Never commit environment files or credentials.');
paragraph('Supported airport codes: BIA, CIAR, JIA, MRIA, and BTIA. A shared SQL connection can be overridden per airport with SQL_<AIRPORT>_SERVER, SQL_<AIRPORT>_INSTANCE, SQL_<AIRPORT>_PORT, SQL_<AIRPORT>_AUTH_MODE, SQL_<AIRPORT>_USER, and SQL_<AIRPORT>_PASSWORD.');

heading('Main API areas');
table(['Path', 'Purpose'], [
  ['POST /api/auth/login', 'Authenticate a user and select an airport.'],
  ['/api/sales/*', 'Sales, sessions, summaries, history, reports, settings, dashboard, and shifts.'],
  ['/api/users/*', 'Administrator user management.'],
  ['GET /api/hr/employees', 'Read-only administrator access to HR employees.'],
  ['/api/printers and POST /api/print', 'Printer discovery and direct PDF printing.'],
], [63, 111]);

paragraph('All sales, user-management, and HR routes require a bearer session token. Administrator functions additionally require an admin or superAdmin role.');

pageFooter();
await writeFile(outputPath, Buffer.from(pdf.output('arraybuffer')));
console.log(`Created ${outputPath}`);
