# Garlanding Ticket Counter

MERN + Tailwind CSS point-of-sale application for airport garlanding tickets.

## Run locally

1. In SSMS, open and execute [database/setup.sql](database/setup.sql). It creates the `Garlanding` database if needed and adds `dbo.AppSales` and `dbo.AppSalesDay`.
2. Copy `server/.env.example` to `server/.env`. If SSMS uses Windows Authentication, set `SQL_AUTH_MODE=windows`; no password is required. For SQL Server Authentication, set `SQL_AUTH_MODE=sql` and enter `SQL_USER` and `SQL_PASSWORD`. For SQL Express use `SQL_SERVER=localhost` and `SQL_INSTANCE=SQLEXPRESS`; for a fixed-port instance, set `SQL_PORT` instead.
3. Install dependencies: `npm install` then `npm run install:all`.
4. Run `npm run dev` and open the client URL shown in the terminal (normally `http://localhost:5173`).

Sales are stored in SQL Server and separated by the counter's local calendar day. You can view every sale and session close in SSMS under `Garlanding` → `Tables` → `dbo.AppSales` and `dbo.AppSalesDay`. The API uses Sri Lanka time by default (`Asia/Colombo`); change `BUSINESS_TIMEZONE` if needed.

Administrators can view up to 1,000 read-only employee records from `HR_EMPLOYEE.dbo.Employee` using the **HR employees** link in the admin menu. The HR database is accessed with the SQL Server connection settings above; set `HR_SQL_DATABASE` in `server/.env` only if the database has a different name. The SQL login must have read access to the Employee table.

Airport databases use the shared SQL Server connection settings by default. If an airport database requires different credentials or a different SQL Server endpoint, set airport-specific overrides such as `SQL_CIAR_USER` and `SQL_CIAR_PASSWORD` (optionally `SQL_CIAR_AUTH_MODE`, `SQL_CIAR_SERVER`, `SQL_CIAR_INSTANCE`, or `SQL_CIAR_PORT`). The same pattern applies to `BIA`, `JIA`, `MRIA`, and `BTIA`. Admin login and API requests now report an unavailable airport database clearly instead of proceeding with a closed connection pool.

## Direct sales-report printing (Windows)

Direct printing requires the local print helper to run on each Windows computer connected to a printer. Install the project dependencies, then start the helper in a separate terminal with `npm run print-helper --prefix server`. Keep it running while using the admin sales-report page. The page lists installed printers, marks unavailable printers, and sends the generated report PDF to the selected printer without opening the browser print dialog.

The helper listens only on `127.0.0.1:8765`. By default, it accepts requests from the local Vite development origins `http://localhost:5173` and `http://127.0.0.1:5173`. For a different client origin, add it to `PRINT_HELPER_ALLOWED_ORIGINS` in `server/.env` as a comma-separated list, then restart the helper. To use another helper URL, set `VITE_PRINT_HELPER_URL` in the client build environment and rebuild the client.

## Staff login

All staff use the shared password `MyPassword123`. Enter any valid EPF number and select Shift A, B, C, or D; no user-registration or account-creation step is required.
