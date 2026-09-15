/*
================================================================================
Vista: [dbo].[Cnsta Correo CitasProgramadas]
Proyecto: email_recordatorios_ceere (notificaciones por correo al programar cita)
Base de datos esperada: Medimujer (o la instancia Ceere/Medimujer en uso)
================================================================================

PROPÓSITO
---------
Devuelve citas médicas pendientes de notificación por CORREO electrónico cuando
la cita está programada (estado 58), aún no se ha enviado el aviso de correo
(CompromisoVI.Correo = 0) y la cita es futura.

Reemplaza el uso de [Cnsta Wpp CitasProgramadas], que filtraba por WhatsApp y
teléfono celular. Esta vista usa la columna CompromisoVI.Correo (int) como
bandera de envío y exige un e-mail válido en EntidadII.

COLUMNAS DEVUELTAS (consumo en Node: services/citasService.js)
--------------------------------------------------------------
  Estado_Correo       CompromisoVI.Correo (0 = pendiente, 1 = enviado)
  Id_Compromiso       Id CompromisoVI
  Hora_inicio         Hora Inicio CompromisoVI (NVARCHAR estilo 121)
  Hora_Fin            Hora Fin CompromisoVI
  Fecha_inicio        Fecha Inicio CompromisoVI
  Documento_Paciente  Entidad Atendida
  Nom_Paciente        Nombre completo del paciente
  Correo              E-mail del paciente (EntidadII) — usado por emailService
  Tel                 Celular (informativo; no requerido)
  Documento_Profecional / Nom_profesional

FILTROS
-------
  - Correo = 0                         → pendiente de notificación email
  - Id Estado = 58                     → cita programada
  - E-mail no nulo, no vacío, con '@'  → canal email usable
  - Hora entre 06:00 y 22:00
  - Fecha+hora de la cita > GETDATE()  → solo citas futuras
  TOP (50) ordenadas por fecha/hora ascendente

ACTUALIZACIÓN DESDE LA APP
--------------------------
Tras envío exitoso de email, el bot ejecuta:
  UPDATE CompromisoVI SET Correo = 1 WHERE [Id CompromisoVI] = @id

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
