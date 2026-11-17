import { getIfsPool, sql } from '../config/db.js';

function formatIfsDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.valueOf())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hours = d.getHours();
  const hh = String(hours % 12 || 12).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${sec} ${ampm}`;
}

export async function syncSessionToIfs({
  sessionId,
  operatorId,
  operatorName = '',
  sessionStartedAt,
  sessionEndedAt,
  garlanding = {},
  pagingBoard = {},
  manualGarlanding = {},
  manualPagingBoard = {},
}) {
  const ifsPool = getIfsPool();
  if (!ifsPool) {
    console.warn('IFS pool not configured. Skipping IFS sync.');
    return;
  }
  if (!ifsPool.connected) {
    await ifsPool.connect();
  }

  const fromDateTimeStr = formatIfsDateTime(sessionStartedAt);
  const toDateTimeStr = formatIfsDateTime(sessionEndedAt);
  const userNameStr = operatorName ? `${operatorId}-${operatorName}` : String(operatorId || '');
  const epfNumeric = Number.parseInt(operatorId, 10);
  const epfVal = Number.isInteger(epfNumeric) ? epfNumeric : null;

  // 1. Create a log entry in dbo.tblAPILog for each application (appId 7 and appId 10)
  const logIdsByApp = {};
  for (const appId of [7, 10]) {
    try {
      const logResult = await ifsPool.request()
        .input('appId', sql.Int, appId)
        .input('sessionId', sql.Int, sessionId)
        .input('dateTime', sql.DateTime, new Date(sessionEndedAt))
        .query(`
          INSERT INTO dbo.tblAPILog (appId, sessionId, orderNo, errorDescription, jsonData, dateTime)
          OUTPUT inserted.logId
          VALUES (@appId, @sessionId, NULL, NULL, NULL, @dateTime);
        `);
      logIdsByApp[appId] = logResult.recordset[0]?.logId ?? null;
    } catch (err) {
      console.error(`Failed to insert into tblAPILog for appId ${appId}:`, err.message);
    }
  }

  // 2. Define the 4 parent lines for dbo.tblSessionData (one per product + payment mode)
  // Each line combines system + manual quantity so dbo.tblSessionData has strictly 4 rows.
  // The system/manual breakdown is stored in dbo.tblSessionLineData, linked by appLineId.
  const sessionDataEntries = [
    {
      appId: 7,
      passengerName: 'Garlanding ticket',
      unitPrice: garlanding.unitPrice ?? 500,
      netAmount: Number(((garlanding.unitPrice ?? 500) / 1.2102435).toFixed(2)), // 413.14 for 500
      paymentType: 'Cash',
      fromReceiptNo: String(garlanding.minSerial ?? ''),
      toReceiptNo: String(garlanding.maxSerial ?? ''),
      systemQty: Number(garlanding.cashQty || 0),
      manualQty: Number(manualGarlanding.cashQty || 0),
    },
    {
      appId: 7,
      passengerName: 'Garlanding ticket',
      unitPrice: garlanding.unitPrice ?? 500,
      netAmount: Number(((garlanding.unitPrice ?? 500) / 1.2102435).toFixed(2)),
      paymentType: 'CC',
      fromReceiptNo: String(garlanding.minSerial ?? ''),
      toReceiptNo: String(garlanding.maxSerial ?? ''),
      systemQty: Number(garlanding.creditQty || 0),
      manualQty: Number(manualGarlanding.creditQty || 0),
    },
    {
      appId: 10,
      passengerName: 'Paging board ticket',
      unitPrice: pagingBoard.unitPrice ?? 300,
      netAmount: Number(((pagingBoard.unitPrice ?? 300) / 1.2102435).toFixed(2)), // 247.88 for 300
      paymentType: 'Cash',
      fromReceiptNo: String(pagingBoard.minSerial ?? ''),
      toReceiptNo: String(pagingBoard.maxSerial ?? ''),
      systemQty: Number(pagingBoard.cashQty || 0),
      manualQty: Number(manualPagingBoard.cashQty || 0),
    },
    {
      appId: 10,
      passengerName: 'Paging board ticket',
      unitPrice: pagingBoard.unitPrice ?? 300,
      netAmount: Number(((pagingBoard.unitPrice ?? 300) / 1.2102435).toFixed(2)),
      paymentType: 'CC',
      fromReceiptNo: String(pagingBoard.minSerial ?? ''),
      toReceiptNo: String(pagingBoard.maxSerial ?? ''),
      systemQty: Number(pagingBoard.creditQty || 0),
      manualQty: Number(manualPagingBoard.creditQty || 0),
    },
  ];

  // 3. Insert into dbo.tblSessionData (strictly 4 rows) and dbo.tblSessionLineData (breakdown)
  for (const entry of sessionDataEntries) {
    const logId = logIdsByApp[entry.appId] ?? null;
    const totalQty = entry.systemQty + entry.manualQty;
    const totalSalesPrice = totalQty * entry.unitPrice;

    try {
      const sessionDataResult = await ifsPool.request()
        .input('logId', sql.Int, logId)
        .input('appId', sql.Int, entry.appId)
        .input('sessionId', sql.Int, sessionId)
        .input('passengerName', sql.VarChar(50), entry.passengerName)
        .input('qty', sql.Int, totalQty)
        .input('salesPrice', sql.Decimal(18, 2), entry.unitPrice)
        .input('fromReceiptNo', sql.VarChar(50), entry.fromReceiptNo)
        .input('toReceiptNo', sql.VarChar(50), entry.toReceiptNo)
        .input('fromDate', sql.VarChar(50), fromDateTimeStr)
        .input('toDate', sql.VarChar(50), toDateTimeStr)
        .input('fromTime', sql.VarChar(50), fromDateTimeStr)
        .input('toTime', sql.VarChar(50), toDateTimeStr)
        .input('status', sql.VarChar(50), 'Approved')
        .input('netAmount', sql.Decimal(18, 2), entry.netAmount)
        .input('userName', sql.VarChar(100), userNameStr)
        .input('salesPrice2', sql.Decimal(18, 2), totalSalesPrice)
        .input('paymentType', sql.VarChar(50), entry.paymentType)
        .input('currency', sql.VarChar(50), 'LKR')
        .query(`
          INSERT INTO dbo.tblSessionData (
            logId, appId, sessionId, PassengerName, Qty, SalesPrice,
            FromReceiptNo, ToReceiptNo, FromDate, ToDate, FromTime, ToTime,
            status, comment, netAmount, userName, itmQty, SalesPrice2,
            PaymentType, Currency, Site, Bank, SlipNo
          )
          OUTPUT inserted.appLineId
          VALUES (
            @logId, @appId, @sessionId, @passengerName, @qty, @salesPrice,
            @fromReceiptNo, @toReceiptNo, @fromDate, @toDate, @fromTime, @toTime,
            @status, NULL, @netAmount, @userName, NULL, @salesPrice2,
            @paymentType, @currency, NULL, NULL, NULL
          );
        `);

      const appLineId = sessionDataResult.recordset[0]?.appLineId;

      if (appLineId) {
        const breakdowns = [
          { billingType: 'system', qty: entry.systemQty, salesPrice: entry.systemQty * entry.unitPrice },
          { billingType: 'manual', qty: entry.manualQty, salesPrice: entry.manualQty * entry.unitPrice },
        ];

        for (const breakdown of breakdowns) {
          await ifsPool.request()
            .input('appId', sql.Int, entry.appId)
            .input('sessionId', sql.Int, sessionId)
            .input('salesPrice', sql.Decimal(18, 2), breakdown.salesPrice)
            .input('billingType', sql.VarChar(50), breakdown.billingType)
            .input('appLineId', sql.Int, appLineId)
            .input('qty', sql.Int, breakdown.qty)
            .input('epf', sql.Int, epfVal)
            .input('dateTime', sql.DateTime, new Date(sessionEndedAt))
            .query(`
              INSERT INTO dbo.tblSessionLineData (
                appId, sessionId, salesPrice, billingType, appLineId, qty, EPF, datetime
              )
              VALUES (
                @appId, @sessionId, @salesPrice, @billingType, @appLineId, @qty, @epf, @dateTime
              );
            `);
        }
      }
    } catch (err) {
      console.error(`Failed to insert into tblSessionData / tblSessionLineData for appId ${entry.appId} (${entry.paymentType}):`, err.message);
    }
  }
}
