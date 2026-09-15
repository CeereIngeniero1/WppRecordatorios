/*
================================================================================
Vista: [dbo].[Cnsta Correo CitasProgramadas]
Proyecto: email_recordatorios_ceere (notificaciones por correo al programar cita)
Base de datos esperada: Medimujer (o la instancia Ceere/Medimujer en uso)
================================================================================

PROPÓSITO
---------
Citas pendientes del correo de PROGRAMACIÓN (CompromisoVI.Correo = 0),
estado 58 y fecha/hora futura. Complementa [Cnsta Correo CitasManana]
(recordatorio del día anterior).

ESTADOS CompromisoVI.Correo
---------------------------
  0 = sin notificación
  1 = confirmación de programación enviada
  2 = recordatorio de mañana enviado

COLUMNAS DEVUELTAS (consumo en Node: services/citasService.js)
--------------------------------------------------------------
  Estado_Correo       CompromisoVI.Correo
  Id_Compromiso       Id CompromisoVI
  Hora_inicio / Hora_Fin / Fecha_inicio
  Documento_Paciente, Nom_Paciente
  Correo              E-mail del paciente (EntidadII)
  Tel, Documento_Profecional, Nom_profesional

FILTROS
-------
  - Correo = 0
  - Id Estado = 58
  - E-mail válido
  - Hora entre 06:00 y 22:00
  - Fecha+hora de la cita > GETDATE()
  TOP (50)

ACTUALIZACIÓN DESDE LA APP
--------------------------
Tras confirmación exitosa:
  UPDATE CompromisoVI SET Correo = 1 WHERE [Id CompromisoVI] = @id

Si la cita es mañana y se programó hoy, el recordatorio no se envía:
la vista [Cnsta Correo CitasManana] exige Fecha Digitación < hoy.

INSTALACIÓN
-----------
Ejecutar este script en SQL Server Management Studio contra la BD Medimujer
(o la BD configurada en DB_NAME del .env). Si la vista ya existe, DROP primero.
================================================================================
*/

USE [Medimujer]
GO

IF OBJECT_ID(N'[dbo].[Cnsta Correo CitasProgramadas]', N'V') IS NOT NULL
    DROP VIEW [dbo].[Cnsta Correo CitasProgramadas];
GO

CREATE VIEW [dbo].[Cnsta Correo CitasProgramadas]
AS
SELECT TOP (50)
    C.Correo AS Estado_Correo,
    C.[Id CompromisoVI] AS Id_Compromiso,
    CONVERT(NVARCHAR(30), C.[Hora Inicio CompromisoVI], 121) AS Hora_inicio,
    CONVERT(NVARCHAR(30), C.[Hora Fin CompromisoVI], 121) AS Hora_Fin,
    CONVERT(NVARCHAR(30), C.[Fecha Inicio CompromisoVI], 121) AS Fecha_inicio,
    C.[Entidad Atendida] AS Documento_Paciente,
    E.[Nombre Completo Entidad] AS Nom_Paciente,
    E2.[E-mail Nro 1 EntidadII] AS Correo,
    E2.[Teléfono Celular EntidadII] AS Tel,
    C.[Entidad Que Atendio] AS Documento_Profecional,
    EP.[Nombre Completo Entidad] AS Nom_profesional,
    C.[Id Estado],
    C.[Fecha Inicio CompromisoVI]
FROM dbo.CompromisoVI AS C
INNER JOIN dbo.Entidad AS E
    ON C.[Entidad Atendida] = E.[Documento Entidad]
INNER JOIN dbo.EntidadII AS E2
    ON E.[Documento Entidad] = E2.[Documento Entidad]
INNER JOIN dbo.Entidad AS EP
    ON C.[Entidad Que Atendio] = EP.[Documento Entidad]
WHERE
    (C.Correo = 0)
    AND (C.[Id Estado] = 58)
    AND (E2.[E-mail Nro 1 EntidadII] IS NOT NULL)
    AND (LTRIM(RTRIM(E2.[E-mail Nro 1 EntidadII])) <> '')
    AND (E2.[E-mail Nro 1 EntidadII] LIKE '%@%.%')
    AND (CAST(C.[Hora Inicio CompromisoVI] AS TIME) >= CAST('06:00:00' AS TIME))
    AND (CAST(C.[Hora Inicio CompromisoVI] AS TIME) <= CAST('22:00:00' AS TIME))
    AND (
        DATEADD(
            SECOND,
            DATEDIFF(SECOND, CAST('00:00:00' AS TIME), CAST(C.[Hora Inicio CompromisoVI] AS TIME)),
            CAST(C.[Fecha Inicio CompromisoVI] AS DATETIME)
        ) > GETDATE()
    )
ORDER BY
    DATEADD(
        SECOND,
        DATEDIFF(SECOND, CAST('00:00:00' AS TIME), CAST(C.[Hora Inicio CompromisoVI] AS TIME)),
        CAST(C.[Fecha Inicio CompromisoVI] AS DATETIME)
    );
GO
