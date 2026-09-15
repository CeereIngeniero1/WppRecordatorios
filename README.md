# Recordatorios por correo — MEDIMUJER / Ceere

Bot Node.js que notifica citas médicas por **correo electrónico** (sin WhatsApp):

1. **Confirmación** cuando se programa la cita.
2. **Recordatorio** el día anterior, si la cita es mañana.

## Regla anti-doble aviso

Si **hoy** programan una cita **para mañana**, solo se envía el correo de programación (se marca `Correo = 2`). No se envía además el recordatorio de mañana.

| Situación | Correos | `CompromisoVI.Correo` |
|-----------|---------|------------------------|
| Programan cita para dentro de varios días | Confirmación ahora | `0 → 1` |
| Llega el día anterior a esa cita | Recordatorio | `1 → 2` |
| Programan hoy una cita para mañana | Solo confirmación | `0 → 2` |

## Qué hace el ciclo

1. Conecta a SQL Server.
2. Consulta `[Cnsta Correo CitasProgramadas]` (`Correo = 0`) → email tipo `asignada`.
3. Consulta `[Cnsta Correo CitasManana]` (`Correo = 1`, fecha = mañana) → email tipo `recordatorio`.
4. Si el envío falla, no marca y reintenta en el siguiente ciclo.

Opera entre **8:00 y 20:00**.

## Requisitos

- Node.js 18+
- SQL Server con **ambas** vistas creadas
- Cuenta SMTP

## Instalación

```bash
npm install
copy .env.example .env
```

Completa el `.env` (DB + SMTP). Ver `.env.example`.

### Vistas SQL (obligatorias — créalas en la BD)

Ejecuta en SSMS:

1. [`sql/Cnsta_Correo_CitasProgramadas.sql`](sql/Cnsta_Correo_CitasProgramadas.sql)
2. [`sql/Cnsta_Correo_CitasManana.sql`](sql/Cnsta_Correo_CitasManana.sql)

## Arranque

```bash
npm start
```

O `iniciar_bot.bat` en Windows.

## Estructura

```
index.js                              Ciclo: programadas + mañana
database.js                           Pool SQL
services/citasService.js              SELECT vistas + UPDATE Correo
services/emailService.js              Plantillas HTML SMTP
services/emailNotificacionService.js  Envío + estados 1/2
sql/Cnsta_Correo_CitasProgramadas.sql
sql/Cnsta_Correo_CitasManana.sql
```

## Flujo

```
ciclo (8h–20h)
  → vista CitasProgramadas (Correo=0) → email asignada → Correo 1 o 2
  → vista CitasManana (Correo=1, fecha=mañana) → email recordatorio → Correo 2
  → espera 1 min / N min → repetir
```

## Dependencias

`dotenv`, `mssql`, `nodemailer`

## Notas

- No se modifica `Id Estado` de la cita (sigue en 58).
- `WhatsApp` no se usa.
- No subas `.env` al repositorio.
