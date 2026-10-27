-- ============================================================
-- normalize_paging_board_ticket_type.sql
-- Normalize legacy Paging Board TICKET_TYPE_ID values from 3 to 2.
-- ============================================================

BEGIN TRY
  BEGIN TRANSACTION;

  UPDATE dbo.TICKETING_C
  SET TICKET_TYPE_ID = 2
  WHERE TICKET_TYPE_ID = 3;

  UPDATE dbo.TICKETING_P
  SET TICKET_TYPE_ID = 2
  WHERE TICKET_TYPE_ID = 3;

  UPDATE dbo.ERRORTICKETING
  SET TICKET_TYPE_ID = 2
  WHERE TICKET_TYPE_ID = 3;

  UPDATE dbo.SESSIONINCOME
  SET TICKET_TYPE = 2
  WHERE TICKET_TYPE = 3;

  UPDATE dbo.TICKETTYPEDETAILS
  SET TICKET_TYPE_ID = 2
  WHERE ID = 2
    OR CAST([DESCRIPTION] AS NVARCHAR(MAX)) LIKE '%PAGING%';

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  THROW;
END CATCH;
GO