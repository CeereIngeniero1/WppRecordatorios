/*
================================================================================
Vista: [dbo].[Cnsta Correo CitasManana]
Proyecto: email_recordatorios_ceere
Base de datos esperada: Medimujer
================================================================================

PROPÓSITO
---------
Citas cuya FECHA es MAÑANA, con confirmación ya enviada (Correo = 1),
pendientes del recordatorio (aún no Correo = 2).

Evita doble aviso si HOY programaron la cita para MAÑANA:
  solo se exige Fecha Digitación < hoy. Así reciben únicamente el correo
  de programación (Correo = 1) y no entran en esta vista el mismo día.

COLUMNAS
--------
Mismas alias que [Cnsta Correo CitasProgramadas].

FILTROS
-------
  - Correo = 1
  - Id Estado = 58
  - Fecha de la cita = mañana
  - Fecha Digitación < hoy   ← no re-avisar si se programó hoy
  - E-mail válido
  - Hora entre 06:00 y 22:00

ACTUALIZACIÓN DESDE LA APP
--------------------------
Tras recordatorio exitoso:
  UPDATE CompromisoVI SET Correo = 2 WHERE [Id CompromisoVI] = @id

ESTADOS CompromisoVI.Correo
---------------------------
  0 = sin notificación
  1 = confirmación de programación enviada
  2 = recordatorio de mañana enviado

INSTALACIÓN
-----------
Ejecutar en SSMS contra Medimujer (o DB_NAME del .env).
================================================================================
*/

USE [Medimujer]
GO

IF OBJECT_ID(N'[dbo].[Cnsta Correo CitasManana]', N'V') IS NOT NULL
    DROP VIEW [dbo].[Cnsta Correo CitasManana];
GO

CREATE VIEW [dbo].[Cnsta Correo CitasManana]
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
    (C.Correo = 1)
    AND (C.[Id Estado] = 58)
    AND (CAST(C.[Fecha Inicio CompromisoVI] AS DATE) = CAST(DATEADD(DAY, 1, GETDATE()) AS DATE))
    AND (CAST(C.[Fecha Digitación CompromisoVI] AS DATE) < CAST(GETDATE() AS DATE))
    AND (E2.[E-mail Nro 1 EntidadII] IS NOT NULL)
    AND (LTRIM(RTRIM(E2.[E-mail Nro 1 EntidadII])) <> '')
    AND (E2.[E-mail Nro 1 EntidadII] LIKE '%@%.%')
    AND (CAST(C.[Hora Inicio CompromisoVI] AS TIME) >= CAST('06:00:00' AS TIME))
    AND (CAST(C.[Hora Inicio CompromisoVI] AS TIME) <= CAST('22:00:00' AS TIME))
ORDER BY
    CAST(C.[Hora Inicio CompromisoVI] AS TIME);
GO
