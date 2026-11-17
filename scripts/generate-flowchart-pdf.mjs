import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Airport Arrival Services Counter System - System Flowchart</title>
<style>
  @page {
    size: A3 landscape;
    margin: 12mm 15mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .page {
    page-break-after: always;
    min-height: 270mm;
    position: relative;
    padding: 10px 0;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Header Bar */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f3e6d;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .doc-title {
    font-size: 24px;
    font-weight: 800;
    color: #0f3e6d;
    letter-spacing: -0.5px;
  }
  .doc-subtitle {
    font-size: 13px;
    color: #475569;
    font-weight: 500;
    margin-top: 3px;
  }
  .doc-meta {
    text-align: right;
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
    margin-left: 4px;
  }

  /* Legend */
  .legend-bar {
    display: flex;
    gap: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 14px;
    margin-bottom: 14px;
    font-size: 11.5px;
    align-items: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend-chip {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  /* SVG Container */
  .svg-container {
    width: 100%;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    padding: 8px;
    display: flex;
    justify-content: center;
  }
  svg {
    max-width: 100%;
    height: auto;
  }

  /* Footer */
  .doc-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #cbd5e1;
    padding-top: 8px;
    font-size: 10px;
    color: #94a3b8;
  }

  /* Page 2: Detailed Workflow Specifications */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .card-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f3e6d;
  }
  .card-badge {
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .step-list {
    list-style: none;
    font-size: 12px;
    line-height: 1.6;
    color: #334155;
  }
  .step-list li {
    position: relative;
    padding-left: 20px;
    margin-bottom: 8px;
  }
  .step-list li::before {
    content: "•";
    position: absolute;
    left: 4px;
    color: #0284c7;
    font-weight: bold;
    font-size: 16px;
    line-height: 1;
  }
  .rule-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    font-size: 11.5px;
    color: #1e40af;
    margin-top: 10px;
    line-height: 1.5;
  }
  .warning-box {
    background: #fff1f2;
    border-left: 4px solid #f43f5e;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    font-size: 11.5px;
    color: #9f1239;
    margin-top: 10px;
    line-height: 1.5;
  }
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-top: 8px;
  }
  table.doc-table th {
    background: #f1f5f9;
    color: #334155;
    text-align: left;
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    font-weight: 600;
  }
  table.doc-table td {
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    color: #334155;
  }
  table.doc-table tr:nth-child(even) {
    background: #f8fafc;
  }
</style>
</head>
<body>

<!-- PAGE 1: FULL ARCHITECTURE FLOWCHART -->
<div class="page">
  <div class="doc-header">
    <div>
      <div class="doc-title">Airport Arrival Services Counter System</div>
      <div class="doc-subtitle">Operational Runtime Architecture &amp; End-to-End System Flowchart</div>
    </div>
    <div class="doc-meta">
      <div><strong>Supported Airports:</strong> BIA, CIAR, JIA, MRIA, BTIA</div>
      <div><strong>Supported Services:</strong> Garlanding &amp; Paging Board Tickets</div>
      <div><strong>Target Platforms:</strong> Web Browser POS • Node.js/Express API • MS SQL Server</div>
    </div>
  </div>

  <div class="legend-bar">
    <strong style="color: #0f3e6d; margin-right: 4px;">Legend:</strong>
    <div class="legend-item"><span class="legend-chip" style="background:#3b82f6;"></span><span>User / Client Action</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#8b5cf6;"></span><span>API Gateway / Decision</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#059669;"></span><span>Staff Sales &amp; POS</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#d97706;"></span><span>Session Close &amp; IFS Sync</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#4f46e5;"></span><span>Admin &amp; Reporting</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#0284c7;"></span><span>Database Store (SQL)</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#e11d48;"></span><span>Failure / Void Exception</span></div>
    <div class="legend-item"><span class="legend-chip" style="background:#475569;"></span><span>Hardware (Receipt Printer)</span></div>
  </div>

  <div class="svg-container">
    <svg viewBox="0 0 1620 910" width="1620" height="910" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Arrowhead Marker -->
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b"/>
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669"/>
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#e11d48"/>
        </marker>
        <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb"/>
        </marker>

        <!-- Drop Shadows & Filters -->
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.08"/>
        </filter>
        <filter id="shadow-accent" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#0284c7" flood-opacity="0.18"/>
        </filter>
      </defs>

      <!-- SUBGRAPH BACKGROUNDS (CONTAINERS) -->
      <!-- Protected API Request Processing -->
      <rect x="520" y="240" width="1070" height="150" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1.5" />
      <text x="535" y="262" font-size="12" font-weight="700" fill="#475569" letter-spacing="0.5">PROTECTED API REQUEST PROCESSING GATEWAY (TOKEN &amp; AIRPORT-SCOPED MIDDLEWARE)</text>

      <!-- Subgraph: Staff Sales & Printing Flow -->
      <rect x="20" y="440" width="530" height="425" rx="10" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="35" y="465" font-size="13" font-weight="700" fill="#166534">STAFF SALES &amp; RECEIPT PRINTING FLOW (SUBGRAPH)</text>

      <!-- Subgraph: Session Close Flow -->
      <rect x="575" y="440" width="465" height="425" rx="10" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="590" y="465" font-size="13" font-weight="700" fill="#92400e">SESSION CLOSE &amp; IFS INTEGRATION FLOW (SUBGRAPH)</text>

      <!-- Subgraph: Administration & Reporting Flow -->
      <rect x="1065" y="440" width="525" height="425" rx="10" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1080" y="465" font-size="13" font-weight="700" fill="#5b21b6">ADMINISTRATION &amp; REPORTING FLOW (SUBGRAPH)</text>

      <!-- 1. ENTRY & LOGIN FLOW -->
      <!-- Start Pill -->
      <rect x="40" y="25" width="220" height="44" rx="22" fill="#0284c7" filter="url(#shadow)"/>
      <text x="150" y="52" fill="#ffffff" font-size="12.5" font-weight="700" text-anchor="middle">User opens web application</text>

      <!-- Line Start -> Login -->
      <line x1="260" y1="47" x2="310" y2="47" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- Login Input -->
      <rect x="310" y="25" width="230" height="44" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="425" y="45" font-size="11.5" font-weight="600" fill="#0f172a" text-anchor="middle">Enter SSN, Password &amp;</text>
      <text x="425" y="59" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Select Airport (BIA/CIAR/etc.)</text>

      <!-- Line Login -> AuthAPI -->
      <line x1="540" y1="47" x2="590" y2="47" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- AuthAPI -->
      <rect x="590" y="25" width="210" height="44" rx="6" fill="#f1f5f9" stroke="#334155" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="695" y="44" font-size="11" font-weight="700" fill="#334155" text-anchor="middle">POST /api/auth/login</text>
      <text x="695" y="58" font-size="10" fill="#64748b" text-anchor="middle">Authenticate credentials</text>

      <!-- Line AuthAPI -> UCFE -->
      <line x1="800" y1="47" x2="850" y2="47" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- UCFE Database (Cylinder) -->
      <g filter="url(#shadow)">
        <path d="M 850 35 C 850 29 930 29 930 35 L 930 63 C 930 69 850 69 850 63 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.8"/>
        <ellipse cx="890" cy="35" rx="40" ry="8" fill="#bae6fd" stroke="#0284c7" stroke-width="1.8"/>
        <text x="890" y="52" font-size="10.5" font-weight="700" fill="#0369a1" text-anchor="middle">UCFE Auth</text>
        <text x="890" y="63" font-size="9" fill="#0284c7" text-anchor="middle">Database</text>
      </g>

      <!-- Line UCFE -> Credentials Decision -->
      <line x1="930" y1="47" x2="990" y2="47" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- Credentials Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="1080,20 1160,47 1080,74 1000,47" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="1080" y="44" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Credentials &amp;</text>
        <text x="1080" y="56" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Role Valid?</text>
      </g>

      <!-- Credentials No -> LoginError -->
      <rect x="1220" y="25" width="160" height="44" rx="6" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1300" y="44" font-size="11" font-weight="700" fill="#9f1239" text-anchor="middle">Sign-in Error</text>
      <text x="1300" y="58" font-size="9.5" fill="#be123c" text-anchor="middle">Show invalid credentials</text>
      <path d="M 1160 47 L 1220 47" stroke="#e11d48" stroke-width="2" marker-end="url(#arrow-red)"/>
      <text x="1190" y="40" font-size="10" font-weight="700" fill="#e11d48" text-anchor="middle">No</text>

      <!-- Credentials Yes -> Role Decision -->
      <path d="M 1080 74 L 1080 105" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <text x="1098" y="93" font-size="10.5" font-weight="700" fill="#059669">Yes</text>

      <!-- Role Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="1080,105 1160,135 1080,165 1000,135" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="1080" y="132" font-size="10.5" font-weight="700" fill="#5b21b6" text-anchor="middle">Application</text>
        <text x="1080" y="145" font-size="10.5" font-weight="700" fill="#5b21b6" text-anchor="middle">Role?</text>
      </g>

      <!-- ROLE BRANCH 1: STAFF (Leftwards) -->
      <path d="M 1000 135 L 560 135" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)"/>
      <text x="790" y="127" font-size="11" font-weight="700" fill="#1d4ed8" text-anchor="middle">Staff</text>

      <!-- StaffSession Box -->
      <rect x="330" y="112" width="230" height="46" rx="6" fill="#f0f9ff" stroke="#0284c7" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="445" y="132" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Find or Activate Current</text>
      <text x="445" y="146" font-size="10" fill="#0284c7" text-anchor="middle">Airport Shift Session</text>

      <!-- Connect to Airport DB -->
      <line x1="330" y1="135" x2="270" y2="135" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- Shared Airport SQL Server DB Indicator -->
      <g filter="url(#shadow)">
        <path d="M 160 115 C 160 107 270 107 270 115 L 270 155 C 270 163 160 163 160 155 Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.8"/>
        <ellipse cx="215" cy="115" rx="55" ry="9" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="1.8"/>
        <text x="215" y="136" font-size="10.5" font-weight="700" fill="#1e3a8a" text-anchor="middle">Selected Airport</text>
        <text x="215" y="148" font-size="9.5" fill="#1d4ed8" text-anchor="middle">SQL Server DB</text>
      </g>

      <!-- Connect Airport DB -> ActiveSession Decision -->
      <line x1="215" y1="163" x2="215" y2="185" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- ActiveShift Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="215,185 295,212 215,240 135,212" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="215" y="209" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Active Shift</text>
        <text x="215" y="221" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Available?</text>
      </g>

      <!-- ActiveShift No -> NoShift Box -->
      <path d="M 135 212 L 40 212" stroke="#e11d48" stroke-width="2" marker-end="url(#arrow-red)"/>
      <text x="95" y="204" font-size="10" font-weight="700" fill="#e11d48" text-anchor="middle">No</text>
      <rect x="0" y="235" width="220" height="42" rx="6" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="110" y="254" font-size="10" font-weight="700" fill="#9f1239" text-anchor="middle">Block Sales Session</text>
      <text x="110" y="267" font-size="9" fill="#be123c" text-anchor="middle">Notify: Contact Administrator</text>

      <!-- ActiveShift Yes -> StaffToken -->
      <path d="M 295 212 L 350 212" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <text x="320" y="204" font-size="10" font-weight="700" fill="#059669" text-anchor="middle">Yes</text>
      <rect x="350" y="190" width="160" height="44" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="430" y="209" font-size="10.5" font-weight="700" fill="#15803d" text-anchor="middle">Return Staff Token</text>
      <text x="430" y="222" font-size="9" fill="#166534" text-anchor="middle">(Role, Airport, SessionID)</text>

      <!-- StaffToken -> Counter Screen -->
      <path d="M 430 234 L 430 270" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <rect x="350" y="270" width="160" height="44" rx="6" fill="#059669" filter="url(#shadow)"/>
      <text x="430" y="291" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Counter Sales Screen</text>
      <text x="430" y="304" font-size="9.5" fill="#d1fae5" text-anchor="middle">Garlanding / Paging POS</text>

      <!-- ROLE BRANCH 2: ADMIN / SUPER ADMIN (Rightwards) -->
      <path d="M 1160 135 L 1260 135" stroke="#4f46e5" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="1210" y="127" font-size="10" font-weight="700" fill="#4338ca" text-anchor="middle">Admin / SuperAdmin</text>

      <!-- AdminDB Box -->
      <rect x="1260" y="112" width="220" height="46" rx="6" fill="#eef2ff" stroke="#6366f1" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1370" y="131" font-size="10.5" font-weight="700" fill="#4338ca" text-anchor="middle">Confirm Selected Airport</text>
      <text x="1370" y="145" font-size="9.5" fill="#4f46e5" text-anchor="middle">Database is Available</text>

      <!-- AdminDB -> AdminToken -->
      <line x1="1370" y1="158" x2="1370" y2="185" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="1280" y="185" width="180" height="44" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1370" y="204" font-size="10.5" font-weight="700" fill="#6d28d9" text-anchor="middle">Return Admin Token</text>
      <text x="1370" y="217" font-size="9" fill="#5b21b6" text-anchor="middle">(Signed JWT, Role, Airport)</text>

      <!-- AdminToken -> AdminArea -->
      <line x1="1370" y1="229" x2="1370" y2="270" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="1280" y="270" width="180" height="44" rx="6" fill="#4f46e5" filter="url(#shadow)"/>
      <text x="1370" y="291" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Administration Area</text>
      <text x="1370" y="304" font-size="9.5" fill="#e0e7ff" text-anchor="middle">Dashboard, Shifts &amp; Reports</text>


      <!-- 2. PROTECTED API REQUEST PROCESSING (MIDDLEWARE) -->
      <!-- Connect Counter -> TokenCheck -->
      <path d="M 510 292 L 560 292" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <!-- Connect AdminArea -> TokenCheck -->
      <path d="M 1280 292 L 1230 292" stroke="#4f46e5" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- TokenCheck -->
      <rect x="560" y="270" width="190" height="44" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="655" y="289" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Validate Bearer Token</text>
      <text x="655" y="303" font-size="9.5" fill="#64748b" text-anchor="middle">Verify signature &amp; expiry</text>

      <!-- Line TokenCheck -> AirportScope -->
      <line x1="750" y1="292" x2="800" y2="292" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- AirportScope -->
      <rect x="800" y="270" width="190" height="44" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="895" y="289" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">Airport DB Scope</text>
      <text x="895" y="303" font-size="9.5" fill="#64748b" text-anchor="middle">Select scoped airport connection</text>

      <!-- Line AirportScope -> RoleCheck Decision -->
      <line x1="990" y1="292" x2="1040" y2="292" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- RoleCheck Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="1130,265 1220,292 1130,319 1040,292" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="1130" y="289" font-size="9.5" font-weight="700" fill="#5b21b6" text-anchor="middle">Admin Permission</text>
        <text x="1130" y="301" font-size="9.5" font-weight="700" fill="#5b21b6" text-anchor="middle">Needed?</text>
      </g>

      <!-- Decision Branches from RoleCheck -->
      <!-- 1. No: Counter Action -> CounterAction -->
      <path d="M 1130 319 L 1130 360 L 760 360" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <text x="960" y="353" font-size="10" font-weight="700" fill="#059669" text-anchor="middle">No: Counter Action Allowed</text>

      <rect x="560" y="338" width="200" height="44" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="660" y="357" font-size="11" font-weight="700" fill="#15803d" text-anchor="middle">Counter Staff Action</text>
      <text x="660" y="371" font-size="9.5" fill="#166534" text-anchor="middle">Ticket sales, printing &amp; session close</text>

      <!-- 2. Yes & Authorised -> AdminAction -->
      <path d="M 1220 292 L 1360 292 L 1360 338" stroke="#4f46e5" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="1300" y="284" font-size="9" font-weight="700" fill="#4338ca">Yes &amp; Authorised</text>

      <rect x="1270" y="338" width="180" height="44" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1360" y="357" font-size="11" font-weight="700" fill="#6d28d9" text-anchor="middle">Allow Admin Action</text>
      <text x="1360" y="371" font-size="9.5" fill="#5b21b6" text-anchor="middle">Settings, shifts, users, reports</text>

      <!-- 3. Yes & Not Authorised -> Denied -->
      <path d="M 1130 265 L 1130 248 L 1480 248 L 1480 338" stroke="#e11d48" stroke-width="1.8" marker-end="url(#arrow-red)"/>
      <text x="1300" y="244" font-size="9.5" font-weight="700" fill="#e11d48">Yes &amp; Not Authorised</text>

      <rect x="1460" y="338" width="120" height="44" rx="6" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1520" y="357" font-size="11" font-weight="700" fill="#9f1239" text-anchor="middle">Access Denied</text>
      <text x="1520" y="371" font-size="9" fill="#be123c" text-anchor="middle">403 Forbidden</text>


      <!-- 3. STAFF SALES & PRINTING FLOW (SUBGRAPH LEFT) -->
      <!-- Feed from CounterAction to SalesFlow & CloseFlow -->
      <path d="M 560 360 L 285 360 L 285 480" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <path d="M 660 382 L 660 480" stroke="#d97706" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- SaleInput -->
      <rect x="180" y="480" width="210" height="42" rx="6" fill="#ffffff" stroke="#059669" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="285" y="498" font-size="11" font-weight="700" fill="#065f46" text-anchor="middle">Enter Ticket Sale Details</text>
      <text x="285" y="512" font-size="9.5" fill="#047857" text-anchor="middle">Service, Ref, Company, Cash/Card</text>

      <!-- Line SaleInput -> CreateSale -->
      <line x1="285" y1="522" x2="285" y2="545" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>

      <!-- CreateSale -->
      <rect x="170" y="545" width="230" height="42" rx="6" fill="#d1fae5" stroke="#059669" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="285" y="563" font-size="11" font-weight="700" fill="#065f46" text-anchor="middle">Create Garlanding / Paging Sale</text>
      <text x="285" y="577" font-size="9.5" fill="#047857" text-anchor="middle">Calculate price &amp; assign ticket number</text>

      <!-- Line CreateSale -> TicketData -->
      <line x1="285" y1="587" x2="285" y2="610" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>

      <!-- TicketData -->
      <rect x="170" y="610" width="230" height="42" rx="6" fill="#ffffff" stroke="#059669" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="285" y="628" font-size="11" font-weight="700" fill="#065f46" text-anchor="middle">Save Ticket in Airport DB</text>
      <text x="285" y="642" font-size="9" fill="#047857" text-anchor="middle">Links record to active shift session</text>

      <!-- Line TicketData -> TicketPDF -->
      <line x1="285" y1="652" x2="285" y2="675" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>

      <!-- TicketPDF -->
      <rect x="175" y="675" width="220" height="42" rx="6" fill="#f0fdf4" stroke="#059669" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="285" y="693" font-size="11" font-weight="700" fill="#065f46" text-anchor="middle">Generate Ticket PDF (jsPDF)</text>
      <text x="285" y="707" font-size="9.5" fill="#047857" text-anchor="middle">Client renders formatted ticket receipt</text>

      <!-- Line TicketPDF -> PrintAPI -->
      <line x1="285" y1="717" x2="285" y2="740" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>

      <!-- PrintAPI & Printer -->
      <rect x="180" y="740" width="210" height="42" rx="6" fill="#f1f5f9" stroke="#475569" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="285" y="758" font-size="10.5" font-weight="700" fill="#1e293b" text-anchor="middle">POST /api/print Service</text>
      <text x="285" y="772" font-size="9" fill="#475569" text-anchor="middle">Sends to Windows Receipt Printer</text>

      <!-- Line to PrintOK Decision -->
      <line x1="285" y1="782" x2="285" y2="805" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- PrintOK Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="285,805 355,830 285,855 215,830" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="285" y="828" font-size="9.5" font-weight="700" fill="#4c1d95" text-anchor="middle">Printed</text>
        <text x="285" y="839" font-size="9.5" font-weight="700" fill="#4c1d95" text-anchor="middle">Successfully?</text>
      </g>

      <!-- PrintOK YES -> Totals -->
      <path d="M 355 830 L 410 830" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
      <text x="382" y="822" font-size="10" font-weight="700" fill="#059669" text-anchor="middle">Yes</text>

      <rect x="410" y="810" width="125" height="40" rx="6" fill="#dcfce7" stroke="#15803d" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="472" y="827" font-size="10" font-weight="700" fill="#15803d" text-anchor="middle">Refresh Totals</text>
      <text x="472" y="840" font-size="8.5" fill="#166534" text-anchor="middle">Session totals updated</text>

      <!-- PrintOK NO -> Void -->
      <path d="M 215 830 L 165 830" stroke="#e11d48" stroke-width="2" marker-end="url(#arrow-red)"/>
      <text x="190" y="822" font-size="10" font-weight="700" fill="#e11d48" text-anchor="middle">No</text>

      <rect x="35" y="810" width="130" height="40" rx="6" fill="#ffe4e6" stroke="#e11d48" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="100" y="827" font-size="10" font-weight="700" fill="#9f1239" text-anchor="middle">Void Ticket</text>
      <text x="100" y="840" font-size="8.5" fill="#be123c" text-anchor="middle">Log Error-Ticket</text>

      <!-- Void loops back to Airport DB & updates Totals -->
      <path d="M 100 810 L 100 780 L 100 631 L 170 631" stroke="#e11d48" stroke-dasharray="3,3" stroke-width="1.8" marker-end="url(#arrow-red)"/>
      <text x="105" y="720" font-size="8.5" font-weight="700" fill="#e11d48">Void in DB</text>


      <!-- 4. SESSION CLOSE & IFS FLOW (SUBGRAPH MIDDLE) -->
      <!-- CloseRequest -->
      <rect x="670" y="480" width="230" height="42" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="785" y="498" font-size="11" font-weight="700" fill="#92400e" text-anchor="middle">Enter Session Close Details</text>
      <text x="785" y="512" font-size="9.5" fill="#b45309" text-anchor="middle">Shift times &amp; optional manual counts</text>

      <!-- Line CloseRequest -> CloseSale -->
      <line x1="785" y1="522" x2="785" y2="548" stroke="#d97706" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- CloseSale -->
      <rect x="670" y="548" width="230" height="42" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="785" y="566" font-size="11" font-weight="700" fill="#92400e" text-anchor="middle">POST /api/sales/close-session</text>
      <text x="785" y="580" font-size="9.5" fill="#b45309" text-anchor="middle">Compute totals &amp; close current session</text>

      <!-- Line CloseSale -> SessionData -->
      <line x1="785" y1="590" x2="785" y2="615" stroke="#d97706" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- SessionData -->
      <rect x="660" y="615" width="250" height="52" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="785" y="633" font-size="10.5" font-weight="700" fill="#92400e" text-anchor="middle">Store Session Income &amp; Manual Sales</text>
      <text x="785" y="647" font-size="9" fill="#78350f" text-anchor="middle">Close active session; activate next eligible</text>
      <text x="785" y="659" font-size="8.5" fill="#64748b" text-anchor="middle">Commits to Airport SQL Database</text>

      <!-- Branches from SessionData: 1. IFS Sync | 2. Summary Receipts -->
      <!-- Branch 1: IFS Sync -->
      <path d="M 660 641 L 600 641 L 600 705 L 610 705" stroke="#d97706" stroke-width="2" marker-end="url(#arrow)"/>

      <rect x="610" y="685" width="165" height="42" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="692" y="703" font-size="10" font-weight="700" fill="#92400e" text-anchor="middle">Sync with IFS System</text>
      <text x="692" y="716" font-size="8.5" fill="#b45309" text-anchor="middle">Send session ledger data</text>

      <!-- IFS Database Cylinder -->
      <g filter="url(#shadow)" transform="translate(640, 740)">
        <path d="M 0 10 C 0 3 100 3 100 10 L 100 38 C 100 45 0 45 0 38 Z" fill="#fed7aa" stroke="#ea580c" stroke-width="1.8"/>
        <ellipse cx="50" cy="10" rx="50" ry="7" fill="#ffedd5" stroke="#ea580c" stroke-width="1.8"/>
        <text x="50" y="27" font-size="9.5" font-weight="700" fill="#9a3412" text-anchor="middle">IFS Integration DB</text>
        <text x="50" y="38" font-size="8" fill="#c2410c" text-anchor="middle">dbAsslAppToIFS</text>
      </g>
      <line x1="692" y1="727" x2="692" y2="745" stroke="#ea580c" stroke-width="1.8" marker-end="url(#arrow)"/>

      <!-- Branch 2: Summary Receipts -->
      <path d="M 910 641 L 935 641 L 935 685" stroke="#d97706" stroke-width="2" marker-end="url(#arrow)"/>

      <rect x="830" y="685" width="200" height="42" rx="6" fill="#ffffff" stroke="#d97706" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="930" y="703" font-size="10" font-weight="700" fill="#92400e" text-anchor="middle">Generate Summary Receipts</text>
      <text x="930" y="716" font-size="8.5" fill="#78350f" text-anchor="middle">Garlanding &amp; Paging Board PDFs</text>

      <!-- Line to Printer -->
      <line x1="930" y1="727" x2="930" y2="755" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="835" y="755" width="190" height="38" rx="6" fill="#f1f5f9" stroke="#475569" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="930" y="772" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">Print 2x Summary Receipts</text>
      <text x="930" y="784" font-size="8.5" fill="#475569" text-anchor="middle">Receipt Printer</text>

      <!-- Line to Logout -->
      <line x1="930" y1="793" x2="930" y2="818" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="845" y="818" width="170" height="36" rx="18" fill="#475569" filter="url(#shadow)"/>
      <text x="930" y="840" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Sign Out Counter Staff</text>


      <!-- 5. ADMINISTRATION & REPORTING FLOW (SUBGRAPH RIGHT) -->
      <!-- Feed from AdminAction to AdminChoice -->
      <path d="M 1360 382 L 1360 480" stroke="#4f46e5" stroke-width="2" marker-end="url(#arrow)"/>

      <!-- AdminChoice Decision Diamond -->
      <g filter="url(#shadow)">
        <polygon points="1360,480 1445,505 1360,530 1275,505" fill="#ffffff" stroke="#8b5cf6" stroke-width="2"/>
        <text x="1360" y="502" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Select Admin</text>
        <text x="1360" y="513" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Function</text>
      </g>

      <!-- Admin Feature 1: Shifts -->
      <path d="M 1275 505 L 1100 505 L 1100 560" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)"/>
      <rect x="1075" y="560" width="95" height="44" rx="5" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1122" y="579" font-size="9.5" font-weight="700" fill="#312e81" text-anchor="middle">Shift Mgmt</text>
      <text x="1122" y="593" font-size="8" fill="#4338ca" text-anchor="middle">Create/update</text>

      <!-- Admin Feature 2: Settings & Prices -->
      <path d="M 1315 520 L 1205 520 L 1205 560" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)"/>
      <rect x="1180" y="560" width="95" height="44" rx="5" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1227" y="579" font-size="9.5" font-weight="700" fill="#312e81" text-anchor="middle">Settings</text>
      <text x="1227" y="593" font-size="8" fill="#4338ca" text-anchor="middle">Prices &amp; setup</text>

      <!-- Admin Feature 3: Users -->
      <line x1="1360" y1="530" x2="1360" y2="560" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)"/>
      <rect x="1312" y="560" width="95" height="44" rx="5" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1359" y="579" font-size="9.5" font-weight="700" fill="#312e81" text-anchor="middle">User Mgmt</text>
      <text x="1359" y="593" font-size="8" fill="#4338ca" text-anchor="middle">Roles &amp; access</text>

      <!-- Admin Feature 4: Review / Reports -->
      <path d="M 1405 520 L 1475 520 L 1475 560" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)"/>
      <rect x="1425" y="560" width="100" height="44" rx="5" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1475" y="579" font-size="9.5" font-weight="700" fill="#312e81" text-anchor="middle">Review &amp; Rep</text>
      <text x="1475" y="593" font-size="8" fill="#4338ca" text-anchor="middle">History, Errors</text>

      <!-- Admin Feature 5: HR Employees -->
      <path d="M 1445 505 L 1550 505 L 1550 560" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)"/>
      <rect x="1535" y="560" width="85" height="44" rx="5" fill="#ffffff" stroke="#4f46e5" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="1577" y="579" font-size="9.5" font-weight="700" fill="#312e81" text-anchor="middle">HR Records</text>
      <text x="1577" y="593" font-size="8" fill="#4338ca" text-anchor="middle">Read-only</text>

      <!-- All features connect to Airport DB or HR DB -->
      <path d="M 1122 604 L 1122 650 L 1475 650" stroke="#64748b" stroke-width="1.5"/>
      <path d="M 1227 604 L 1227 650" stroke="#64748b" stroke-width="1.5"/>
      <path d="M 1359 604 L 1359 650" stroke="#64748b" stroke-width="1.5"/>
      
      <!-- Reports generate PDF & print -->
      <line x1="1475" y1="604" x2="1475" y2="675" stroke="#4f46e5" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="1390" y="675" width="170" height="44" rx="6" fill="#ede9fe" stroke="#6d28d9" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1475" y="694" font-size="10" font-weight="700" fill="#4c1d95" text-anchor="middle">Generate Sales Report PDF</text>
      <text x="1475" y="707" font-size="8.5" fill="#6d28d9" text-anchor="middle">Download or print sales data</text>

      <!-- Send report to Printer -->
      <line x1="1475" y1="719" x2="1475" y2="765" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
      <rect x="1410" y="765" width="130" height="38" rx="6" fill="#f1f5f9" stroke="#475569" stroke-width="1.8" filter="url(#shadow)"/>
      <text x="1475" y="782" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">Windows Printer</text>
      <text x="1475" y="794" font-size="8.5" fill="#475569" text-anchor="middle">Report hardcopy</text>

      <!-- HR DB Cylinder -->
      <g filter="url(#shadow)" transform="translate(1530, 675)">
        <path d="M 0 10 C 0 3 85 3 85 10 L 85 38 C 85 45 0 45 0 38 Z" fill="#f3e8ff" stroke="#9333ea" stroke-width="1.8"/>
        <ellipse cx="42.5" cy="10" rx="42.5" ry="7" fill="#e9d5ff" stroke="#9333ea" stroke-width="1.8"/>
        <text x="42.5" y="27" font-size="9.5" font-weight="700" fill="#6b21a8" text-anchor="middle">HR Database</text>
        <text x="42.5" y="38" font-size="8" fill="#7e22ce" text-anchor="middle">HR_EMPLOYEE (RO)</text>
      </g>
      <line x1="1577" y1="604" x2="1577" y2="675" stroke="#9333ea" stroke-width="1.8" marker-end="url(#arrow)"/>

    </svg>
  </div>

  <div class="doc-footer">
    <span>Airport Arrival Services Counter System • System Runtime Flowchart</span>
    <span>Page 1 of 2</span>
  </div>
</div>

<!-- PAGE 2: ARCHITECTURAL SPECIFICATIONS & FLOW RULES -->
<div class="page">
  <div class="doc-header">
    <div>
      <div class="doc-title">Operational Workflow Specifications &amp; Rules</div>
      <div class="doc-subtitle">Detailed Breakdown of Flowchart Branches, API Contracts &amp; Failover Policies</div>
    </div>
    <div class="doc-meta">
      <div><strong>System Version:</strong> 1.0 (Production Architecture)</div>
      <div><strong>Airports Supported:</strong> BIA, CIAR, JIA, MRIA, BTIA</div>
      <div><strong>Security:</strong> Scoped Bearer Token + Role Guard</div>
    </div>
  </div>

  <div class="grid-2">
    <!-- Card 1: Authentication & Airport Scoping -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">1. Authentication &amp; Multi-Airport Scoping</span>
        <span class="card-badge" style="background: #e0f2fe; color: #0369a1;">Security Gateway</span>
      </div>
      <ul class="step-list">
        <li><strong>Sign-in Credential Verification:</strong> The counter staff or administrator provides their SSN, password, and designated airport at <code>POST /api/auth/login</code>. Credentials are authenticated against the central <code>UCFE</code> SQL database.</li>
        <li><strong>Role-Based Routing:</strong> Upon successful authentication, the system evaluates the application role:
          <br>• <strong>Staff:</strong> Queries the selected airport SQL database for an active shift session. If valid, issues a signed JWT containing <code>role: 'staff'</code>, <code>airport</code>, and <code>sessionId</code>.
          <br>• <strong>Administrator / SuperAdmin:</strong> Confirms the target airport SQL database is accessible and issues a signed administrative token.</li>
        <li><strong>Database Isolation:</strong> Every subsequent request includes the airport in the bearer token. Middleware automatically scopes SQL connection pools to that airport's specific database (e.g., <code>DB_BIA</code>, <code>DB_CIAR</code>, <code>DB_JIA</code>).</li>
      </ul>
      <div class="rule-box">
        <strong>Shift Prerequisite Rule:</strong> Staff cannot enter the counter POS screen or issue tickets without an active shift. If no shift exists, sales are strictly blocked with instructions to contact an administrator.
      </div>
    </div>

    <!-- Card 2: Sales & Hardware Printing Lifecycle -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">2. Counter Sales &amp; Hardware Printing Lifecycle</span>
        <span class="card-badge" style="background: #dcfce7; color: #15803d;">POS Operation</span>
      </div>
      <ul class="step-list">
        <li><strong>Ticket Recording:</strong> Staff enters ticket specifications (Service: Garlanding or Paging Board, client/guest reference, company name, passenger count, and payment method: Cash or Card).</li>
        <li><strong>Pre-Print Persistence:</strong> The ticket is committed to the airport SQL Server database <em>prior</em> to physical printing, ensuring transactional traceability.</li>
        <li><strong>Client-Side PDF Generation:</strong> The web client generates a formatted receipt PDF via <code>jsPDF</code> and transmits it to <code>POST /api/print</code>.</li>
        <li><strong>Hardware Execution:</strong> The Express API interacts with the local Windows receipt printer via <code>pdf-to-printer</code>.</li>
      </ul>
      <div class="warning-box">
        <strong>Hardware Exception &amp; Auto-Void Policy:</strong> If the receipt printer jams, disconnects, or fails:
        <br>1. The client immediately sends an automatic void request for the saved ticket.
        <br>2. The API flags the ticket as voided and writes an audit record in the <strong>Error Tickets</strong> table.
        <br>3. Shift session totals are recalculated to ensure no revenue discrepancies exist.
      </div>
    </div>

    <!-- Card 3: Shift Session Close & IFS Synchronization -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">3. Shift Session Close &amp; External Invoicing</span>
        <span class="card-badge" style="background: #fef3c7; color: #92400e;">Financial Settlement</span>
      </div>
      <ul class="step-list">
        <li><strong>Closing Request:</strong> Staff initiates session closure by providing actual shift end times and optional manual ticket quantities.</li>
        <li><strong>Session Reconciliation:</strong> The API executes session close logic:
          <br>• Aggregates total Garlanding and Paging Board sales, cash, and card amounts.
          <br>• Persists system and manual counts into the shift session record.
          <br>• Closes the active session status and activates the next scheduled shift session.</li>
        <li><strong>IFS Financial Synchronization:</strong> Session closing automatically triggers asynchronous synchronization to the external IFS database (<code>dbAsslAppToIFS</code>) when configured.</li>
        <li><strong>Dual Summary Receipts:</strong> The client triggers printing of two summary receipts (one for Garlanding, one for Paging Board) before automatically logging out the counter staff.</li>
      </ul>
    </div>

    <!-- Card 4: Administration, HR & Reporting Subsystems -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">4. Administration, HR Integration &amp; Reports</span>
        <span class="card-badge" style="background: #ede9fe; color: #6d28d9;">Back-Office</span>
      </div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Endpoint Area</th>
            <th>Primary Responsibilities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Shifts</strong></td>
            <td><code>/api/sales/shifts</code></td>
            <td>Configure operational shift timings, manage roster, create and activate shifts.</td>
          </tr>
          <tr>
            <td><strong>Prices &amp; Settings</strong></td>
            <td><code>/api/sales/settings</code></td>
            <td>Configure Garlanding and Paging Board unit rates, airport specific fees.</td>
          </tr>
          <tr>
            <td><strong>User Management</strong></td>
            <td><code>/api/users/*</code></td>
            <td>Assign user roles (staff, admin, superAdmin) and configure airport access.</td>
          </tr>
          <tr>
            <td><strong>Audit &amp; Errors</strong></td>
            <td><code>/api/sales/error-tickets</code></td>
            <td>Inspect failed-print tickets, verify void justifications, audit counter logs.</td>
          </tr>
          <tr>
            <td><strong>HR Integration</strong></td>
            <td><code>GET /api/hr/employees</code></td>
            <td>Read-only lookup from central <code>HR_EMPLOYEE</code> SQL database.</td>
          </tr>
          <tr>
            <td><strong>Sales Reports</strong></td>
            <td><code>/api/sales/reports</code></td>
            <td>Aggregate cross-shift analytics, generate downloadable and printable PDFs.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="doc-footer">
    <span>Airport Arrival Services Counter System • System Operational Specifications</span>
    <span>Page 2 of 2</span>
  </div>
</div>

</body>
</html>
`;

const htmlPath = resolve('scripts', 'flowchart-document.html');
const pdfPath = resolve('Airport_Arrival_Services_System_Flowchart.pdf');

writeFileSync(htmlPath, htmlContent, 'utf-8');
console.log(`Saved HTML document to ${htmlPath}`);

// Run Edge Headless
const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
if (!existsSync(edgePath)) {
  console.error(`Edge executable not found at ${edgePath}`);
  process.exit(1);
}

console.log('Generating PDF via Microsoft Edge headless...');
try {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf="${pdfPath}"`,
    `"${htmlPath}"`
  ].join(' ');

  execSync(`"${edgePath}" ${args}`, { stdio: 'inherit' });
  console.log(`Successfully generated PDF: ${pdfPath}`);
} catch (err) {
  console.error('Failed to generate PDF:', err.message);
  process.exit(1);
}
