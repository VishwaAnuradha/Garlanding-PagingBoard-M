import express from 'express';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import printerService from 'pdf-to-printer';

const execFileAsync = promisify(execFile);
const printerApi = printerService.default || printerService;
const { print } = printerApi;
const router = express.Router();

async function checkPrinterHardwareStatus(printerName) {
  if (process.platform !== 'win32') return { online: true };
  try {
    const escaped = printerName.replace(/'/g, "''");
    const script = `
$p = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq '${escaped}' }
if (-not $p) { 'NOT_FOUND'; exit }
if ($p.WorkOffline) { 'WORK_OFFLINE'; exit }
if (($p.PrinterState -band 2) -ne 0) { 'PRINTER_ERROR'; exit }
if ($p.ExtendedPrinterStatus -in 7,9,11) { 'STATUS_ERROR_' + $p.ExtendedPrinterStatus; exit }
$usb = Get-PnpDevice | Where-Object { ($_.FriendlyName -like '*EPSON*' -or $_.InstanceId -like '*EPSON*') -and $_.Class -eq 'USB' }
if ($usb -and -not ($usb | Where-Object { $_.Present -eq $true })) { 'USB_DISCONNECTED'; exit }
'ONLINE'
`.trim();

    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 4000 });
    const status = stdout.trim();
    return {
      online: status === 'ONLINE',
      reason: status
    };
  } catch (err) {
    return { online: false, reason: err.message };
  }
}

async function cancelStuckPrintJobs(printerName) {
  if (process.platform !== 'win32') return;
  try {
    const escaped = printerName.replace(/'/g, "''");
    const script = `Get-PrintJob -PrinterName '${escaped}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue`;
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 3000 });
  } catch {}
}

async function getPrinterStatuses() {
  if (process.platform !== 'win32') return [];
  try {
    const command = [
      '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false);',
      'Get-CimInstance Win32_Printer -Property Name,WorkOffline,PrinterStatus,PrinterState,ExtendedPrinterStatus,DetectedErrorState |',
      'Select-Object Name,WorkOffline,PrinterStatus,PrinterState,ExtendedPrinterStatus,DetectedErrorState | ConvertTo-Json -Compress'
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      timeout: 8000,
      maxBuffer: 1024 * 1024
    });
    if (!stdout.trim()) return [];
    const result = JSON.parse(stdout);
    const printers = Array.isArray(result) ? result : [result];
    return printers.map(printer => {
      const offline = printer.WorkOffline === true || 
                      Number(printer.PrinterStatus) === 7 ||
                      Number(printer.ExtendedPrinterStatus) === 7 ||
                      Number(printer.ExtendedPrinterStatus) === 9 ||
                      Number(printer.ExtendedPrinterStatus) === 11 ||
                      (Number(printer.PrinterState) & 2) !== 0;
      const errorState = Number(printer.DetectedErrorState);
      const hasDeviceError = Number.isFinite(errorState) && errorState >= 3;
      return {
        name: String(printer.Name || ''),
        available: !offline && !hasDeviceError,
        message: offline ? 'Offline' : hasDeviceError ? 'Printer reports an error' : 'Ready'
      };
    });
  } catch {
    return [];
  }
}

router.get('/printers', async (_req, res, next) => {
  try {
    const statuses = await getPrinterStatuses();
    const printersWithStatus = statuses.map(s => ({
      name: s.name,
      available: s.available,
      status: s.message || 'Ready'
    }));
    const defaultPrinter = printersWithStatus.find(p => p.name.includes('EPSON') || p.name.includes('Receipt'))?.name || printersWithStatus[0]?.name || null;
    res.json({
      printers: printersWithStatus,
      defaultPrinter
    });
  } catch (error) {
    next(error);
  }
});

router.post('/print', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res, next) => {
  let temporaryDirectory;
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'The PDF document is empty or was not provided.' });
    }
    if (req.body.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ message: 'The document data is not a valid PDF file.' });
    }

    const statuses = await getPrinterStatuses();

    const targetPrinterName = String(req.query.printer || '').trim() ||
      statuses.find(p => p.name.includes('EPSON') || p.name.includes('TM-T81') || p.name.includes('Receipt'))?.name ||
      statuses[0]?.name ||
      'EPSON TM-T81III Receipt';

    const selectedPrinter = statuses.find(p => p.name.toLowerCase() === targetPrinterName.toLowerCase());
    if (!selectedPrinter) {
      return res.status(503).json({ message: `Printer "${targetPrinterName}" is offline or unavailable.` });
    }

    // Check hardware connectivity (detects unplugged USB / offline / paper errors)
    const hardwareStatus = await checkPrinterHardwareStatus(selectedPrinter.name);
    if (!hardwareStatus.online) {
      await cancelStuckPrintJobs(selectedPrinter.name);
      const reasonDetail = hardwareStatus.reason === 'USB_DISCONNECTED'
        ? 'USB cable disconnected'
        : hardwareStatus.reason === 'WORK_OFFLINE'
        ? 'Device set to offline'
        : 'Device offline or paper error';
      return res.status(503).json({ 
        message: `Printer hardware is unavailable (${reasonDetail}).` 
      });
    }

    temporaryDirectory = await mkdtemp(join(tmpdir(), 'pos-print-'));
    const pdfPath = join(temporaryDirectory, `${randomUUID()}.pdf`);
    await writeFile(pdfPath, req.body);

    const printOptions = {
      printer: selectedPrinter.name,
      silent: true
    };
    if (req.query.paperSize) printOptions.paperSize = String(req.query.paperSize);
    if (req.query.scale) printOptions.scale = String(req.query.scale);

    await print(pdfPath, printOptions);

    res.json({ success: true, message: `Ticket sent to ${selectedPrinter.name}.` });
  } catch (error) {
    console.error('Direct print error:', error);
    res.status(503).json({ message: `Direct printing failed: ${error.message}` });
  } finally {
    if (temporaryDirectory) {
      try {
        await rm(temporaryDirectory, { recursive: true, force: true });
      } catch {}
    }
  }
});

export default router;
