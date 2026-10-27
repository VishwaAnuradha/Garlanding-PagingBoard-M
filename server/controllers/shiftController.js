import { getPoolForAirport, sql } from '../config/db.js';
import { toBusinessDateTime } from '../utils/businessDate.js';

const SHIFT_TYPES = ['Day/Night', '24 Hours'];
const VALID_SESSION_STATUSES = new Set(['PENDING', 'ACTIVE', 'CLOSED']);

export function normalizeSessionStatus(value) {
  if (value === null || value === undefined || value === '') return 'PENDING';
  const normalized = String(value).trim().toUpperCase();
  if (!VALID_SESSION_STATUSES.has(normalized)) return 'PENDING';
  return normalized;
}

export function ensureSingleActiveSession(targetSession, sessions) {
  const targetId = Number(targetSession?.id);
  const activeSessions = (sessions || []).filter(session => Number(session?.id) !== targetId && normalizeSessionStatus(session?.status) === 'ACTIVE');

  if (!activeSessions.length) {
    return {
      canActivate: true,
      sessionsToClose: [],
      message: 'Only one session can stay active. The current active session has been closed before switching this one on.'
    };
  }

  return {
    canActivate: true,
    sessionsToClose: activeSessions.map(session => Number(session.id)),
    message: 'Only one session can stay active. The current active session has been closed before switching this one on.'
  };
}

export function formatSqlDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  // SQL Server DATETIME stores a wall-clock value, not a timezone. Do not use
  // toISOString() here: it converts Sri Lanka time to UTC (08:30 becomes 03:00).
  const pad = value => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function findShiftOverlap(newStartAt, newEndAt, existingSessions = []) {
  const candidateStart = new Date(newStartAt);
  const candidateEnd = new Date(newEndAt);

  if (Number.isNaN(candidateStart.valueOf()) || Number.isNaN(candidateEnd.valueOf()) || candidateEnd <= candidateStart) {
    return null;
  }

  return existingSessions.find(existing => {
    const existingStart = new Date(existing.startAt);
    const existingEnd = new Date(existing.endAt);
    if (Number.isNaN(existingStart.valueOf()) || Number.isNaN(existingEnd.valueOf())) {
      return false;
    }
    return candidateStart < existingEnd && candidateEnd > existingStart;
  }) || null;
}

export function buildShiftSessions(shiftType, requestedStartAt, requestedEndAt) {
  if (shiftType !== 'Day/Night') {
    const startAt = new Date(requestedStartAt);
    const endAt = new Date(requestedEndAt ?? requestedStartAt);
    return [{ startAt, endAt, shiftType }];
  }

  const baseDate = new Date(requestedStartAt);
  const endDate = new Date(requestedEndAt ?? requestedStartAt);
  
  if (Number.isNaN(baseDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return [];
  }

  const diffTime = endDate.getTime() - baseDate.getTime();
  if (diffTime < 0) {
    return [];
  }

  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  let daysToCreate = Math.max(1, diffDays);
  
  const sessions = [];

  for (let i = 0; i < daysToCreate; i++) {
    const currentBase = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);

    const startDay = new Date(currentBase.getFullYear(), currentBase.getMonth(), currentBase.getDate(), 8, 30, 0, 0);
    const endDay = new Date(currentBase.getFullYear(), currentBase.getMonth(), currentBase.getDate(), 16, 30, 0, 0);
    const startNight = new Date(currentBase.getFullYear(), currentBase.getMonth(), currentBase.getDate(), 16, 30, 0, 0);
    const endNight = new Date(currentBase.getFullYear(), currentBase.getMonth(), currentBase.getDate() + 1, 8, 30, 0, 0);

    sessions.push({ startAt: startDay, endAt: endDay, shiftType: 'Day' });
    sessions.push({ startAt: startNight, endAt: endNight, shiftType: 'Night' });
  }

  return sessions;
}

const formatSession = row => ({
  id: row.Id,
  startAt: toBusinessDateTime(row.StartAt),
  endAt: toBusinessDateTime(row.EndAt),
  shiftType: row.ShiftType,
  active: Boolean(row.Active),
  status: row.Status || 'PENDING',
  activatedAt: row.ActivatedAt
});

export async function getShifts(req, res) {
  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const result = await pool.request().query(`
    SELECT TOP 100
      sessionId AS Id,
      sessionStartTime AS StartAt,
      sessionEndTime AS EndAt,
      shiftType AS ShiftType,
      CASE WHEN sessionStatus = 'ACTIVE' THEN 1 ELSE 0 END AS Active,
      sessionStatus AS Status,
      finalizedDateTime AS ActivatedAt
    FROM dbo.tblSESSION
    ORDER BY sessionStartTime DESC, sessionId DESC
  `);
  res.json({ sessions: result.recordset.map(formatSession) });
}

export async function createShift(req, res) {
  const shiftType = String(req.body.shiftType || '');
  const scheduledStartAt = new Date(req.body.startAt || new Date());
  const scheduledEndAt = new Date(req.body.endAt || req.body.startAt || new Date());

  if (!SHIFT_TYPES.includes(shiftType)) return res.status(400).json({ message: 'Select Day or Night shift.' });

  const shiftSessions = buildShiftSessions(shiftType, scheduledStartAt, scheduledEndAt);
  if (!shiftSessions.length) return res.status(400).json({ message: 'Invalid shift timing.' });

  const sessionsToCreate = shiftSessions.map(({ startAt, endAt, shiftType: type }) => ({ startAt, endAt, shiftType: type }));
  if (shiftType !== 'Day/Night') {
    const [firstSession] = sessionsToCreate;
    if (Number.isNaN(firstSession.startAt.valueOf()) || Number.isNaN(firstSession.endAt.valueOf()) || firstSession.endAt <= firstSession.startAt) {
      return res.status(400).json({ message: 'The session end date and time must be after the start.' });
    }
  }

  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const allExistingSessions = await pool.request().query(`
    SELECT sessionId AS id, sessionStartTime AS startAt, sessionEndTime AS endAt, shiftType, sessionStatus AS status
    FROM dbo.tblSESSION
  `);

  for (const session of sessionsToCreate) {
    if (session.endAt <= session.startAt) {
      return res.status(400).json({ message: 'The session end date and time must be after the start.' });
    }

    const overlap = findShiftOverlap(session.startAt, session.endAt, allExistingSessions.recordset.map(row => ({
      startAt: row.startAt,
      endAt: row.endAt,
      status: row.status,
      shiftType: row.shiftType,
    })));

    if (overlap) {
      const start = new Date(overlap.startAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const end = new Date(overlap.endAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return res.status(409).json({
        message: `This shift overlaps with an existing session from ${start} to ${end}. Please choose a different date or update the existing shift.`
      });
    }
  }

  const inserted = [];
  for (const session of sessionsToCreate) {
    const sqlStartAt = formatSqlDateTime(session.startAt);
    const sqlEndAt = formatSqlDateTime(session.endAt);

    const result = await pool.request()
      .input('startAt', sql.NVarChar, sqlStartAt)
      .input('endAt', sql.NVarChar, sqlEndAt)
      .input('shiftType', session.shiftType)
      .query(`
        INSERT INTO dbo.tblSESSION (sessionStartTime, sessionEndTime, shiftType, sessionStatus)
        OUTPUT inserted.sessionId AS Id, inserted.sessionStartTime AS StartAt, inserted.sessionEndTime AS EndAt,
               inserted.shiftType AS ShiftType, 0 AS Active, inserted.sessionStatus AS Status, NULL AS ActivatedAt
        VALUES (CONVERT(DATETIME, @startAt, 120), CONVERT(DATETIME, @endAt, 120), @shiftType, NULL)
      `);

    inserted.push(formatSession(result.recordset[0]));
  }

  const now = new Date();
  const activeSessionIndex = inserted.findIndex(s => s.startAt <= now && s.endAt > now);
  
  if (activeSessionIndex !== -1) {
    const activeSession = inserted[activeSessionIndex];
    await pool.request().input('id', activeSession.id).query(`
      UPDATE dbo.tblSESSION SET sessionStatus = 'CLOSED' WHERE sessionStatus = 'ACTIVE' AND sessionId <> @id;
      UPDATE dbo.tblSESSION SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE() WHERE sessionId = @id;
    `);
    inserted.forEach((session, index) => {
      session.active = index === activeSessionIndex;
      session.status = index === activeSessionIndex ? 'ACTIVE' : 'PENDING';
    });
  }

  res.status(201).json({ sessions: inserted });
}

export async function activateShift(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid shift session.' });

  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    const exists = await request.input('id', id).query('SELECT sessionId FROM dbo.tblSESSION WHERE sessionId = @id');
    if (!exists.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Shift session not found.' });
    }

    const allSessions = await new sql.Request(transaction).query('SELECT sessionId AS id, sessionStatus AS status FROM dbo.tblSESSION');
    const guard = ensureSingleActiveSession({ id }, allSessions.recordset);

    if (guard.sessionsToClose.length) {
      await new sql.Request(transaction).input('targetId', id).query(`
        UPDATE dbo.tblSESSION
        SET sessionStatus = 'CLOSED', finalizedDateTime = GETDATE()
        WHERE sessionStatus = 'ACTIVE' AND sessionId <> @targetId
      `);
    }

    const updated = await new sql.Request(transaction).input('id', id)
      .query(`
        UPDATE dbo.tblSESSION
        SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE()
        OUTPUT inserted.sessionId AS Id, inserted.sessionStartTime AS StartAt, inserted.sessionEndTime AS EndAt,
               inserted.shiftType AS ShiftType, 1 AS Active, inserted.sessionStatus AS Status, inserted.finalizedDateTime AS ActivatedAt
        WHERE sessionId = @id
      `);

    await transaction.commit();
    res.json({ session: formatSession(updated.recordset[0]), message: guard.message });
  } catch (error) {
    if (transaction._aborted !== true) await transaction.rollback();
    throw error;
  }
}

export async function updateShiftStatus(req, res) {
  const id = Number(req.params.id);
  const requestedStatus = normalizeSessionStatus(req.body?.status);

  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid shift session.' });
  if (!VALID_SESSION_STATUSES.has(requestedStatus)) return res.status(400).json({ message: 'Select a valid session status: Pending, Active, or Closed.' });

  const pool = getPoolForAirport(req.user?.airport || 'BIA');
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await new sql.Request(transaction).input('id', id).query('SELECT sessionId AS id, sessionStatus AS status FROM dbo.tblSESSION WHERE sessionId = @id');
    if (!session.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Shift session not found.' });
    }

    const currentStatus = normalizeSessionStatus(session.recordset[0].status);

    if (requestedStatus === 'ACTIVE') {
      const allSessions = await new sql.Request(transaction).query('SELECT sessionId AS id, sessionStatus AS status FROM dbo.tblSESSION');
      const guard = ensureSingleActiveSession({ id }, allSessions.recordset);
      if (guard.sessionsToClose.length) {
        await new sql.Request(transaction).input('targetId', id).query(`
          UPDATE dbo.tblSESSION
          SET sessionStatus = 'CLOSED', finalizedDateTime = GETDATE()
          WHERE sessionStatus = 'ACTIVE' AND sessionId <> @targetId
        `);
      }
    }

    if (requestedStatus === 'PENDING') {
      await new sql.Request(transaction).input('id', id).query(`
        UPDATE dbo.tblSESSION
        SET sessionStatus = NULL, finalizedDateTime = GETDATE()
        WHERE sessionId = @id
      `);
    } else if (requestedStatus === 'CLOSED') {
      await new sql.Request(transaction).input('id', id).query(`
        UPDATE dbo.tblSESSION
        SET sessionStatus = 'CLOSED', finalizedDateTime = GETDATE()
        WHERE sessionId = @id
      `);
    } else {
      await new sql.Request(transaction).input('id', id).query(`
        UPDATE dbo.tblSESSION
        SET sessionStatus = 'ACTIVE', finalizedDateTime = GETDATE()
        WHERE sessionId = @id
      `);
    }

    const updated = await new sql.Request(transaction).input('id', id).query(`
      SELECT sessionId AS Id, sessionStartTime AS StartAt, sessionEndTime AS EndAt,
             shiftType AS ShiftType,
             CASE WHEN sessionStatus = 'ACTIVE' THEN 1 ELSE 0 END AS Active,
             sessionStatus AS Status,
             finalizedDateTime AS ActivatedAt
      FROM dbo.tblSESSION WHERE sessionId = @id
    `);

    await transaction.commit();
    res.json({
      session: formatSession(updated.recordset[0]),
      previousStatus: currentStatus,
      message: requestedStatus === 'ACTIVE'
        ? 'The selected session is now active. Only one session can remain active in the system.'
        : `The session status changed to ${requestedStatus}.`
    });
  } catch (error) {
    if (transaction._aborted !== true) await transaction.rollback();
    throw error;
  }
}
