import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShiftSessions, formatSqlDateTime, normalizeSessionStatus, ensureSingleActiveSession, findShiftOverlap } from '../controllers/shiftController.js';
import { toBusinessDateTime } from '../utils/businessDate.js';

test('SQL datetime formatting preserves the local wall-clock time', () => {
  const date = new Date(2026, 7, 24, 8, 30, 0);
  assert.equal(formatSqlDateTime(date), '2026-08-24 08:30:00');
});

test('Day/Night creates two fixed windows at 08:30 and 16:30 with separate Day and Night rows', () => {
  const sessions = buildShiftSessions('Day/Night', new Date('2026-08-18T12:00:00'));
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].shiftType, 'Day');
  assert.equal(sessions[1].shiftType, 'Night');

  assert.equal(sessions[0].startAt.getHours(), 8);
  assert.equal(sessions[0].startAt.getMinutes(), 30);
  assert.equal(sessions[0].endAt.getHours(), 16);
  assert.equal(sessions[0].endAt.getMinutes(), 30);

  assert.equal(sessions[1].startAt.getHours(), 16);
  assert.equal(sessions[1].startAt.getMinutes(), 30);
  assert.equal(sessions[1].endAt.getHours(), 8);
  assert.equal(sessions[1].endAt.getMinutes(), 30);
});

test('toBusinessDateTime re-tags stored wall-clock fields as business time', () => {
  // The mssql driver builds a JS Date from the stored wall-clock fields. Its
  // getFullYear()/getHours()/... return those fields, so we can re-tag them with
  // the business timezone offset (Sri Lanka is +05:30) regardless of the local zone.
  const driverDate = new Date(2026, 7, 24, 8, 30, 0);
  assert.equal(toBusinessDateTime(driverDate), '2026-08-24T08:30:00+05:30');
});

test('normalizeSessionStatus accepts the supported admin states and defaults pending values', () => {
  assert.equal(normalizeSessionStatus('active'), 'ACTIVE');
  assert.equal(normalizeSessionStatus('closed'), 'CLOSED');
  assert.equal(normalizeSessionStatus('PENDING'), 'PENDING');
  assert.equal(normalizeSessionStatus(null), 'PENDING');
  assert.equal(normalizeSessionStatus(undefined), 'PENDING');
});

test('ensureSingleActiveSession always keeps only one active session', () => {
  const result = ensureSingleActiveSession({ id: 12, status: 'ACTIVE' }, [
    { id: 8, status: 'ACTIVE' },
    { id: 10, status: 'CLOSED' },
    { id: 12, status: 'CLOSED' },
  ]);

  assert.equal(result.canActivate, true);
  assert.deepEqual(result.sessionsToClose, [8]);
  assert.equal(result.message, 'Only one session can stay active. The current active session has been closed before switching this one on.');
});

test('findShiftOverlap detects overlapping session windows', () => {
  const existing = [
    { startAt: new Date('2026-09-01T08:30:00'), endAt: new Date('2026-09-01T16:30:00') },
    { startAt: new Date('2026-09-02T16:30:00'), endAt: new Date('2026-09-03T08:30:00') },
  ];

  const overlap = findShiftOverlap(new Date('2026-09-01T12:00:00'), new Date('2026-09-01T18:00:00'), existing);
  assert.ok(overlap);
  assert.equal(overlap.startAt.toISOString(), new Date('2026-09-01T08:30:00').toISOString());

  const noConflict = findShiftOverlap(new Date('2026-09-04T08:30:00'), new Date('2026-09-04T16:30:00'), existing);
  assert.equal(noConflict, null);
});
