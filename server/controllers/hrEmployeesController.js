import { getHrEmployeePool } from '../config/db.js';

export async function getHrEmployees(_req, res) {
  const result = await getHrEmployeePool().request().query(`
    SELECT TOP (1000)
      [service_no], [NIC], [name], [DOB], [sex], [address],
      [appointment_date], [civil_state], [designation_id],
      [salary_scale_id], [location_id], [division_id], [title_id],
      CASE WHEN [img] IS NULL THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS [has_image],
      [confirm_date], [employee_type_id], [status_id], [office_phone],
      [pass_no], [section_id], [DOMarriage], [Nationality], [race],
      [NamewithIni], [lastName], [NameAsNIC], [religionId], [AlloDivision],
      [empCeasedType], [empCeasedDate], [RetirementDate], [NameAsBC],
      [dutyPatternId], [WorkStationId]
    FROM [dbo].[Employee]
    ORDER BY [service_no]
  `);

  res.json(result.recordset);
}
