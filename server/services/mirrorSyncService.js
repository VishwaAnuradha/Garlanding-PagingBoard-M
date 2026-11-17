import { getMirrorPool, sql } from '../config/db.js';

let isSchemaEnsured = false;

/**
 * Ensures required columns (CREDIT, SessionId, RECEIPT_NO) exist in the mirror database.
 */
async function ensureMirrorSchema(mirrorPool) {
  if (isSchemaEnsured) return;
  try {
    const query = `
      IF COL_LENGTH('dbo.TICKETING_G', 'SessionId') IS NULL
        ALTER TABLE dbo.TICKETING_G ADD SessionId INT NULL;

      IF COL_LENGTH('dbo.TICKETING_P', 'SessionId') IS NULL
        ALTER TABLE dbo.TICKETING_P ADD SessionId INT NULL;

      IF COL_LENGTH('dbo.TICKETING_C', 'SessionId') IS NULL
        ALTER TABLE dbo.TICKETING_C ADD SessionId INT NULL;

      IF COL_LENGTH('dbo.TICKETING_C', 'RECEIPT_NO') IS NULL
        ALTER TABLE dbo.TICKETING_C ADD RECEIPT_NO INT NULL;

      IF COL_LENGTH('dbo.TICKETING_G', 'CREDIT') IS NULL
        ALTER TABLE dbo.TICKETING_G ADD CREDIT INT NOT NULL CONSTRAINT DF_MIRROR_TICKETING_G_CREDIT DEFAULT 0;

      IF COL_LENGTH('dbo.TICKETING_P', 'CREDIT') IS NULL
        ALTER TABLE dbo.TICKETING_P ADD CREDIT INT NOT NULL CONSTRAINT DF_MIRROR_TICKETING_P_CREDIT DEFAULT 0;

      IF COL_LENGTH('dbo.TICKETING_C', 'CREDIT') IS NULL
        ALTER TABLE dbo.TICKETING_C ADD CREDIT INT NOT NULL CONSTRAINT DF_MIRROR_TICKETING_C_CREDIT DEFAULT 0;

      IF COL_LENGTH('dbo.SESSIONINCOME', 'SessionId') IS NULL
        ALTER TABLE dbo.SESSIONINCOME ADD SessionId INT NULL;

      IF OBJECT_ID('dbo.ERRORTICKETING') IS NOT NULL
      BEGIN
        IF COL_LENGTH('dbo.ERRORTICKETING', 'SessionId') IS NULL
          ALTER TABLE dbo.ERRORTICKETING ADD SessionId INT NULL;
        IF COL_LENGTH('dbo.ERRORTICKETING', 'CREDIT') IS NULL
          ALTER TABLE dbo.ERRORTICKETING ADD CREDIT INT NOT NULL CONSTRAINT DF_MIRROR_ERRORTICKETING_CREDIT DEFAULT 0;
        IF COL_LENGTH('dbo.ERRORTICKETING', 'RECEIPT_NO') IS NULL
          ALTER TABLE dbo.ERRORTICKETING ADD RECEIPT_NO INT NULL;
      END
    `;
    await mirrorPool.request().query(query);
    isSchemaEnsured = true;
  } catch (err) {
    console.warn('Mirror schema check warning:', err.message);
  }
}

/**
 * Inserts a newly issued ticket into the remote mirror database (Garlanding_3 on 10.64.30.48).
 */
export async function syncSaleToMirror(sale) {
  const mirrorPool = getMirrorPool();
  if (!mirrorPool) return; // Mirroring not configured or disabled

  if (!mirrorPool.connected) {
    await mirrorPool.connect();
  }

  await ensureMirrorSchema(mirrorPool);

  const ticketTypeId = Number(sale.ticketType) === 1 ? 1 : 2;
  const targetTable = ticketTypeId === 1 ? 'dbo.TICKETING_G' : 'dbo.TICKETING_P';

  const subTableCols = ticketTypeId === 1 
    ? 'SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, SessionId, CREDIT'
    : 'SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, verified, SessionId, CREDIT';

  const subTableVals = ticketTypeId === 1
    ? '@subSerialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, \'N\', @createdAt, @sessionId, @credit'
    : '@subSerialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, \'N\', @createdAt, 0, @sessionId, @credit';

  const subId = sale.subId ?? sale.serialNo ?? sale.id;
  const subSerialNo = sale.serialNo ?? sale.subId ?? sale.id;
  const cSerialNo = sale.id ?? sale.receiptNo ?? sale.serialNo;
  const receiptNo = sale.receiptNo ?? subId;

  await mirrorPool.request()
    .input('id', sql.Int, sale.id)
    .input('subId', sql.Int, subId)
    .input('serialNo', sql.Int, cSerialNo)
    .input('subSerialNo', sql.Int, subSerialNo)
    .input('receiptNo', sql.Int, receiptNo)
    .input('flightNo', sql.VarChar, String(sale.flightNo || '').toUpperCase())
    .input('company', sql.VarChar, String(sale.company || ''))
    .input('ticketTypeId', sql.Int, ticketTypeId)
    .input('qty', sql.Int, Number(sale.qty || 1))
    .input('charge', sql.Decimal(18, 2), Number(sale.amount || 0))
    .input('userId', sql.VarChar, String(sale.userId || ''))
    .input('createdAt', sql.DateTime, new Date(sale.createdAt || Date.now()))
    .input('sessionId', sql.Int, sale.sessionId ? Number(sale.sessionId) : null)
    .input('credit', sql.Int, sale.credit ? 1 : 0)
    .query(`
      -- 1. Insert into Sub-Table (TICKETING_G or TICKETING_P)
      IF NOT EXISTS (SELECT 1 FROM ${targetTable} WHERE SERIALNO = @subSerialNo)
      BEGIN
        IF COLUMNPROPERTY(OBJECT_ID('${targetTable}'), 'ID', 'IsIdentity') = 1
        BEGIN
          SET IDENTITY_INSERT ${targetTable} ON;
          INSERT INTO ${targetTable} (ID, ${subTableCols})
          VALUES (@subId, ${subTableVals});
          SET IDENTITY_INSERT ${targetTable} OFF;
        END
        ELSE
        BEGIN
          INSERT INTO ${targetTable} (ID, ${subTableCols})
          VALUES (@subId, ${subTableVals});
        END
      END;

      -- 2. Insert into TICKETING_C
      IF NOT EXISTS (SELECT 1 FROM dbo.TICKETING_C WHERE SERIALNO = @serialNo)
      BEGIN
        IF COLUMNPROPERTY(OBJECT_ID('dbo.TICKETING_C'), 'ID', 'IsIdentity') = 1
        BEGIN
          SET IDENTITY_INSERT dbo.TICKETING_C ON;
          INSERT INTO dbo.TICKETING_C (ID, SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, SessionId, CREDIT, RECEIPT_NO)
          VALUES (@id, @serialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, 'N', @createdAt, @sessionId, @credit, @receiptNo);
          SET IDENTITY_INSERT dbo.TICKETING_C OFF;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.TICKETING_C (ID, SERIALNO, F_NO, COMPANY, TICKET_TYPE_ID, QTY, CHARGE, USERID, SESSIONENDFLAG, DATETIME, SessionId, CREDIT, RECEIPT_NO)
          VALUES (@id, @serialNo, @flightNo, @company, @ticketTypeId, @qty, @charge, @userId, 'N', @createdAt, @sessionId, @credit, @receiptNo);
        END
      END;
    `);

  console.log(`[Mirror] Ticket #${subSerialNo} mirrored to 10.64.30.48 (Garlanding_3)`);
}

/**
 * Mirrors a voided / error ticket to ERRORTICKETING on the mirror database.
 */
export async function syncVoidToMirror(ticket) {
  const mirrorPool = getMirrorPool();
  if (!mirrorPool) return;

  if (!mirrorPool.connected) {
    await mirrorPool.connect();
  }

  await ensureMirrorSchema(mirrorPool);

  const ticketTypeId = Number(ticket.ticketTypeId || ticket.ticketType) === 1 ? 1 : 2;
  const subTable = ticketTypeId === 1 ? 'dbo.TICKETING_G' : 'dbo.TICKETING_P';
  const subSerial = ticket.receiptNo || ticket.subId || ticket.serialNo;

  try {
    await mirrorPool.request()
      .input('id', sql.Int, ticket.id)
      .input('serialNo', sql.Int, ticket.serialNo)
      .input('subSerial', sql.Int, subSerial)
      .input('ticketTypeId', sql.Int, ticketTypeId)
      .input('userId', sql.VarChar, String(ticket.userId || ''))
      .input('createdAt', sql.DateTime, new Date(ticket.createdAt || Date.now()))
      .input('charge', sql.Decimal(18, 2), Number(ticket.amount || ticket.charge || 0))
      .input('qty', sql.Int, Number(ticket.qty || 1))
      .input('flightNo', sql.VarChar, String(ticket.flightNo || ''))
      .input('company', sql.VarChar, String(ticket.company || ''))
      .input('sessionId', sql.Int, ticket.sessionId ? Number(ticket.sessionId) : null)
      .input('credit', sql.Int, ticket.credit ? 1 : 0)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.ERRORTICKETING WHERE SERIALNO = @serialNo AND TICKET_TYPE_ID = @ticketTypeId)
        BEGIN
          IF COLUMNPROPERTY(OBJECT_ID('dbo.ERRORTICKETING'), 'ID', 'IsIdentity') = 1
          BEGIN
            INSERT INTO dbo.ERRORTICKETING (SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME, CHARGE, QTY, F_NO, COMPANY, RECEIPT_NO, SessionId, CREDIT)
            VALUES (@serialNo, @ticketTypeId, @userId, 'N', @createdAt, @charge, @qty, @flightNo, @company, @id, @sessionId, @credit);
          END
          ELSE
          BEGIN
            INSERT INTO dbo.ERRORTICKETING (ID, SERIALNO, TICKET_TYPE_ID, USERID, SESSIONENDFLAG, DATETIME, CHARGE, QTY, F_NO, COMPANY, RECEIPT_NO, SessionId, CREDIT)
            VALUES (@serialNo, @serialNo, @ticketTypeId, @userId, 'N', @createdAt, @charge, @qty, @flightNo, @company, @id, @sessionId, @credit);
          END
        END;

        DELETE FROM dbo.TICKETING_C WHERE ID = @id OR SERIALNO = @serialNo;
        DELETE FROM ${subTable} WHERE SERIALNO = @subSerial;
      `);

    console.log(`[Mirror] Voided ticket #${ticket.serialNo} mirrored to 10.64.30.48 (Garlanding_3)`);
  } catch (err) {
    console.warn('[Mirror] Error syncing void to mirror:', err.message);
  }
}
