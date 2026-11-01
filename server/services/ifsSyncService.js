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

  const appConfigs = [
    {
      appId: 7,
      passengerName: 'Garlanding ticket',
      unitPrice: garlanding.unitPrice ?? 500,
      netAmount: Number(((garlanding.unitPrice ?? 500) / 1.2102435).toFixed(2)), // 413.14 for 500
      cashQty: garlanding.cashQty || 0,
      creditQty: garlanding.creditQty || 0,
      minSerial: garlanding.minSerial ?? '',
      maxSerial: garlanding.maxSerial ?? '',
    },
    {
      appId: 10,
      passengerName: 'Paging board ticket',
      unitPrice: pagingBoard.unitPrice ?? 300,
      netAmount: Number(((pagingBoard.unitPrice ?? 300) / 1.2102435).toFixed(2)), // 247.88 for 300
      cashQty: pagingBoard.cashQty || 0,
      creditQty: pagingBoard.creditQty || 0,
      minSerial: pagingBoard.minSerial ?? '',
      maxSerial: pagingBoard.maxSerial ?? '',
    },
  ];

  for (const app of appConfigs) {
    // Collect non-zero payment lines
    const paymentLines = [];
    if (app.cashQty > 0) {
      paymentLines.push({
        paymentType: 'Cash',
        qty: app.cashQty,
        totalSalesPrice: app.cashQty * app.unitPrice,
      });
    }
    if (app.creditQty > 0) {
      paymentLines.push({
        paymentType: 'CC',
        qty: app.creditQty,
        totalSalesPrice: app.creditQty * app.unitPrice,
      });
    }

    if (paymentLines.length === 0) {
      continue;
    }

    // 1. Create a log entry in dbo.tblAPILog
    let logId = null;
    try {
      const logResult = await ifsPool.request()
        .input('appId', sql.Int, app.appId)
        .input('sessionId', sql.Int, sessionId)
        .input('dateTime', sql.DateTime, new Date(sessionEndedAt))
        .query(`
          INSERT INTO dbo.tblAPILog (appId, sessionId, orderNo, errorDescription, jsonData, dateTime)
          OUTPUT inserted.logId
          VALUES (@appId, @sessionId, NULL, NULL, NULL, @dateTime);
        `);
      logId = logResult.recordset[0]?.logId ?? null;
    } catch (err) {
      console.error(`Failed to insert into tblAPILog for appId ${app.appId}:`, err.message);
    }

    // 2. Insert lines into dbo.tblSessionData and dbo.tblSessionLineData
    for (const line of paymentLines) {
      try {
        const sessionDataResult = await ifsPool.request()
          .input('logId', sql.Int, logId)
          .input('appId', sql.Int, app.appId)
          .input('sessionId', sql.Int, sessionId)
          .input('passengerName', sql.VarChar(50), app.passengerName)
          .input('qty', sql.Int, line.qty)
          .input('salesPrice', sql.Decimal(18, 2), app.unitPrice)
          .input('fromReceiptNo', sql.VarChar(50), String(app.minSerial || ''))
          .input('toReceiptNo', sql.VarChar(50), String(app.maxSerial || ''))
          .input('fromDate', sql.VarChar(50), fromDateTimeStr)
          .input('toDate', sql.VarChar(50), toDateTimeStr)
          .input('fromTime', sql.VarChar(50), fromDateTimeStr)
          .input('toTime', sql.VarChar(50), toDateTimeStr)
          .input('status', sql.VarChar(50), 'Approved')
          .input('netAmount', sql.Decimal(18, 2), app.netAmount)
          .input('userName', sql.VarChar(100), userNameStr)
          .input('salesPrice2', sql.Decimal(18, 2), line.totalSalesPrice)
          .input('paymentType', sql.VarChar(50), line.paymentType)
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

        // 3. Insert into dbo.tblSessionLineData
        if (appLineId) {
          await ifsPool.request()
            .input('appId', sql.Int, app.appId)
            .input('sessionId', sql.Int, sessionId)
            .input('salesPrice', sql.Decimal(18, 2), line.totalSalesPrice)
            .input('billingType', sql.VarChar(50), 'system')
            .input('appLineId', sql.Int, appLineId)
            .input('qty', sql.Int, line.qty)
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
      } catch (err) {
        console.error(`Failed to insert into tblSessionData / tblSessionLineData for appId ${app.appId} (${line.paymentType}):`, err.message);
      }
    }
  }
}
