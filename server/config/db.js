import dotenv from 'dotenv';
import sql from 'mssql';
import { AsyncLocalStorage } from 'node:async_hooks';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = dirname(fileURLToPath(import.meta.url));
const serverEnvPath = resolve(configDirectory, '..', '.env');
const rootEnvPath = resolve(configDirectory, '..', '..', '.env');

// Load shared defaults first; a server-specific file can override them.
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath, override: true });

// ─── Single-pool (legacy default) ────────────────────────────────────────────
let pool;
let hrEmployeePool;
let ucfePool;
const useWindowsAuthentication = String(process.env.SQL_AUTH_MODE || '').toLowerCase() === 'windows';
const sqlServer = process.env.SQL_SERVER || process.env.DB_SERVER || 'localhost';
const sqlInstance = process.env.SQL_INSTANCE || process.env.DB_INSTANCE;
const sqlDatabase = process.env.SQL_DATABASE || process.env.DB_NAME || process.env.DB_BIA || 'Garlanding';
const sqlUser = process.env.SQL_USER || process.env.DB_USER;
const sqlPassword = process.env.SQL_PASSWORD || process.env.DB_PASSWORD;

// ─── Airport → Database name mapping (from .env) ─────────────────────────────
const AIRPORT_DB_MAP = {
  BIA: process.env.DB_BIA || 'Garlanding',
  CIAR: process.env.DB_CIAR || 'Garlanding-CIAR',
  JIA: process.env.DB_JIA || 'Garlanding-JIA',
  MRIA: process.env.DB_MRIA || 'Garlanding-MRIA',
  BTIA: process.env.DB_BTIA || 'Garlanding-BTIA',
};
const requestAirport = new AsyncLocalStorage();
const AIRPORT_CODES = Object.keys(AIRPORT_DB_MAP);

// ─── Per-airport pool cache ───────────────────────────────────────────────────
/** @type {Map<string, import('mssql').ConnectionPool>} */
const airportPools = new Map();

function asBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function asInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Build a mssql config object for a database, allowing airport-specific overrides. */
function buildConfig(databaseName, airportCode) {
  const airportPrefix = airportCode ? `SQL_${airportCode}_` : '';
  const airportSetting = name => airportPrefix ? process.env[`${airportPrefix}${name}`] : undefined;
  const server = airportSetting('SERVER') || sqlServer;
  const instance = airportSetting('INSTANCE') || sqlInstance;
  const port = airportSetting('PORT') || process.env.SQL_PORT;
  const authMode = airportSetting('AUTH_MODE') || process.env.SQL_AUTH_MODE || '';
  const user = airportSetting('USER') || sqlUser;
  const password = airportSetting('PASSWORD') || sqlPassword;
  const config = {
    server,
    database: databaseName,
    connectionTimeout: asInt(process.env.SQL_CONNECT_TIMEOUT, 15000),
    requestTimeout: asInt(process.env.SQL_REQUEST_TIMEOUT, 30000),
    ...(port ? { port: Number(port) } : {}),
    options: {
      useUTC: false,
      encrypt: asBoolean(process.env.SQL_ENCRYPT, false),
      trustServerCertificate: asBoolean(process.env.SQL_TRUST_SERVER_CERTIFICATE, true),
      cancelTimeout: asInt(process.env.SQL_CANCEL_TIMEOUT, 30000),
      connectTimeout: asInt(process.env.SQL_CONNECT_TIMEOUT, 15000),
      ...(instance && !server.includes('\\') && !server.includes(',') ? { instanceName: instance } : {}),
    },
  };
  if (String(authMode).toLowerCase() === 'windows') config.options.trustedConnection = true;
  else Object.assign(config, { user, password });
  return config;
}

// ─── Original single pool (unchanged — backward compatible) ──────────────────
export function getPool() {
  const airportCode = requestAirport.getStore();
  if (airportCode) return getPoolForAirport(airportCode);

  if (sqlDatabase === AIRPORT_DB_MAP.BIA) {
    return getPoolForAirport('BIA');
  }

  if (!pool) {
    pool = new sql.ConnectionPool(buildConfig(sqlDatabase));
    pool.on('error', (error) => {
      console.error('SQL Server connection pool error:', error.message);
    });
  }
  return pool;
}

export function getHrEmployeePool() {
  if (!hrEmployeePool) {
    const databaseName = process.env.HR_SQL_DATABASE || 'HR_EMPLOYEE';
    hrEmployeePool = new sql.ConnectionPool(buildConfig(databaseName));
    hrEmployeePool.on('error', (error) => {
      console.error(`SQL pool error [${databaseName}]:`, error.message);
    });
  }
  return hrEmployeePool;
}

export function getUcfePool() {
  if (!ucfePool) {
    const databaseName = process.env.UCFE_SQL_DATABASE || 'UCFE';
    ucfePool = new sql.ConnectionPool(buildConfig(databaseName));
    ucfePool.on('error', (error) => {
      console.error(`SQL pool error [${databaseName}]:`, error.message);
    });
  }
  return ucfePool;
}

export function runWithAirportDatabase(airportCode, callback) {
  const code = String(airportCode || '').trim().toUpperCase();
  if (!Object.hasOwn(AIRPORT_DB_MAP, code)) {
    throw new Error(`Unknown airport code: "${airportCode}". Valid codes: ${AIRPORT_CODES.join(', ')}.`);
  }
  return requestAirport.run(code, callback);
}

// ─── Airport-aware pool ───────────────────────────────────────────────────────
/**
 * Returns a pool for the given airport code.
 * Pools are created lazily and cached for reuse.
 *
 * @param {string} airportCode  One of: 'BIA' | 'CIAR' | 'JIA' | 'MRIA' | 'BTIA'
 * @returns {import('mssql').ConnectionPool}
 */
export function getPoolForAirport(airportCode) {
  const code = String(airportCode || '').trim().toUpperCase();
  const dbName = AIRPORT_DB_MAP[code];

  if (!Object.hasOwn(AIRPORT_DB_MAP, code)) {
    throw new Error(`Unknown airport code: "${airportCode}". Valid codes: ${Object.keys(AIRPORT_DB_MAP).join(', ')}.`);
  }

  if (!airportPools.has(code)) {
    const newPool = new sql.ConnectionPool(buildConfig(dbName, code));
    newPool.on('error', (error) => {
      console.error(`SQL pool error [${code} → ${dbName}]:`, error.message);
    });
    airportPools.set(code, newPool);
  }

  return airportPools.get(code);
}

export async function connectAirportDatabase(airportCode) {
  const pool = getPoolForAirport(airportCode);
  if (!pool.connected) await pool.connect();
  return pool;
}

export { sql };

export default async function connectDatabase() {
  if (!useWindowsAuthentication && (!sqlUser || !sqlPassword)) throw new Error('Set SQL_USER and SQL_PASSWORD (or DB_USER and DB_PASSWORD), or set SQL_AUTH_MODE=windows.');
  await getUcfePool().connect();

  const airportConnections = await Promise.all(AIRPORT_CODES.map(async code => {
    try {
      await getPoolForAirport(code).connect();
      return { code, connected: true };
    } catch (error) {
      console.error(`SQL Server connection failed for airport ${code} (${AIRPORT_DB_MAP[code]}):`, error.message);
      return { code, connected: false };
    }
  }));

  const defaultPool = getPool();
  if (defaultPool && !defaultPool.connected) {
    try {
      await defaultPool.connect();
    } catch (error) {
      console.error(`SQL Server connection failed for default database (${sqlDatabase}):`, error.message);
    }
  }

  return airportConnections.filter(result => result.connected).map(result => result.code);
}
