import 'dotenv/config';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import cors from 'cors';
import express from 'express';
import printerService from 'pdf-to-printer';

const execFileAsync = promisify(execFile);
const printerApi = printerService.default || printerService;
const { getDefaultPrinter, getPrinters, print } = printerApi;
const app = express();
const port = Number(process.env.PRINT_HELPER_PORT || 8765);
const allowedOrigins = new Set(
  (process.env.PRINT_HELPER_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('This website is not allowed to use the local printer helper.'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.get('/api/printers', async (_req, res, next) => {
  try {
    const [printers, defaultPrinter, statuses] = await Promise.all([
      getPrinters(),
      getDefaultPrinter(),
      getPrinterStatuses()
    ]);
    const printerList = printers.length > 0 
      ? printers 
      : statuses.map(s => ({ name: s.name }));
    const printersWithStatus = printerList.map(printer => {
      const status = statuses.find(item => item.name.toLowerCase() === printer.name.toLowerCase());
      return {
        name: printer.name,
        available: status ? status.available : true,
        status: status?.message || 'Ready'
      };
    });

    res.json({
      printers: printersWithStatus,
      defaultPrinter: defaultPrinter?.name || printersWithStatus.find(p => p.name.includes('EPSON') || p.name.includes('Receipt'))?.name || null
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/print', express.raw({ type: 'application/pdf', limit: '10mb' }), async (req, res, next) => {
  let temporaryDirectory;
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'The report PDF is empty or was not provided.' });
    }
    if (req.body.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ message: 'The report data is not a valid PDF file.' });
    }

    const printerName = String(req.query.printer || '').trim();
    if (!printerName) return res.status(400).json({ message: 'Select a printer.' });

    const [printers, statuses] = await Promise.all([getPrinters(), getPrinterStatuses()]);
    const selectedPrinter = printers.find(printer => printer.name === printerName);
    if (!selectedPrinter) {
      return res.status(503).json({ message: `Printer "${printerName}" is offline or unavailable.` });
    }
    const status = statuses.find(item => item.name.toLowerCase() === printerName.toLowerCase());
    if (status && !status.available) {
      return res.status(503).json({ message: `Printer "${printerName}" is unavailable (${status.message || 'Offline'}).` });
    }

    temporaryDirectory = await mkdtemp(join(tmpdir(), 'sales-report-'));
    const pdfPath = join(temporaryDirectory, `${randomUUID()}.pdf`);
    await writeFile(pdfPath, req.body);
    await print(pdfPath, {
      printer: selectedPrinter.name,
      paperSize: 'A4',
      orientation: 'portrait',
      scale: 'fit',
      silent: true
    });

    res.json({ message: `Sales report sent to ${selectedPrinter.name}.` });
  } catch (error) {
    next(error);
  } finally {
    if (temporaryDirectory) {
      try {
        await rm(temporaryDirectory, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Could not remove temporary sales-report print file:', cleanupError.message);
      }
    }
  }
});

app.use((error, _req, res, _next) => {
  console.error('Local print helper error:', error.message);
  const statusCode = error.message.includes('not allowed') ? 403 : 503;
  res.status(statusCode).json({
    message: statusCode === 403
      ? error.message
      : 'The printer could not be reached. Check that the printer is connected and ready, then try again.'
  });
});

async function getPrinterStatuses() {
  const command = [
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false);',
    'Get-CimInstance Win32_Printer -Property Name,WorkOffline,PrinterStatus,DetectedErrorState |',
    'Select-Object Name,WorkOffline,PrinterStatus,DetectedErrorState | ConvertTo-Json -Compress'
  ].join(' ');
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    timeout: 10000,
    maxBuffer: 1024 * 1024
  });
  if (!stdout.trim()) return [];

  const result = JSON.parse(stdout);
  const printers = Array.isArray(result) ? result : [result];
  return printers.map(printer => {
    const offline = printer.WorkOffline === true || Number(printer.PrinterStatus) === 7;
    const errorState = Number(printer.DetectedErrorState);
    const hasDeviceError = Number.isFinite(errorState) && errorState >= 3;
    const available = !offline && !hasDeviceError;
    return {
      name: String(printer.Name || ''),
      available,
      message: offline ? 'Offline' : hasDeviceError ? 'Printer reports an error' : 'Ready'
    };
  });
}

if (process.platform !== 'win32') {
  throw new Error('The local printer helper currently supports Windows only.');
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Local printer helper running at http://127.0.0.1:${port}`);
});
