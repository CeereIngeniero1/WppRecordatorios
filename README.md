# Recordatorios por correo — MEDIMUJER / Ceere

Bot Node.js que envía un **correo electrónico de confirmación** cuando se programa una cita médica. Ya no usa WhatsApp.

## Qué hace

1. Se conecta a SQL Server (base Medimujer / Ceere).
2. Consulta la vista `[Cnsta Correo CitasProgramadas]` (citas con `Correo = 0` y estado programado).
3. Envía un email HTML al paciente con los datos de la cita.
4. Si el envío es exitoso, marca `CompromisoVI.Correo = 1` para no volver a notificar.
5. Si el envío falla, **no** marca la cita y la reintenta en el siguiente ciclo.

Opera solo entre **8:00 y 20:00**. Fuera de ese horario espera 15 minutos y vuelve a evaluar.

## Requisitos

- Node.js 18+ recomendado
- Acceso a SQL Server con la vista creada
- Cuenta SMTP (ej. `recordatorio@medimujer.com`)

## Instalación

```bash
npm install
```

Copia la configuración de entorno:

```bash
copy .env.example .env
```

Completa en `.env`:

| Variable | Descripción |
|----------|-------------|
| `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME` | Conexión SQL Server |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE` | SMTP (puerto 465 → `EMAIL_SECURE=true`) |
| `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | Credenciales y remitente |
| `EMAIL_TEST_MODE`, `EMAIL_TEST_ADDRESS` | Si es `true`, redirige todos los correos a la dirección de prueba |
| `POLLING_INTERVAL_EMPTY_MINUTES` | Minutos de espera si no hay citas (default 15) |

### Vista SQL (obligatoria)

Ejecuta en SQL Server el script:

[`sql/Cnsta_Correo_CitasProgramadas.sql`](sql/Cnsta_Correo_CitasProgramadas.sql)

La vista filtra citas futuras en estado `58`, con email válido y `CompromisoVI.Correo = 0`.

## Cómo arrancar

```bash
npm start
```

O en Windows: doble clic en `iniciar_bot.bat`.

## Estructura del proyecto

```
index.js                          Orquestador y ciclo de polling
database.js                       Pool SQL Server (exige variables .env)
services/citasService.js          Lectura de la vista + UPDATE Correo
services/emailService.js          Plantilla HTML y envío SMTP
services/emailNotificacionService.js  Pipeline: enviar y marcar estado
sql/Cnsta_Correo_CitasProgramadas.sql  Definición y documentación de la vista
.env.example                      Plantilla de configuración
```

## Flujo resumido

```
Arranque → connectDB → ciclo (8h–20h)
    → SELECT vista [Cnsta Correo CitasProgramadas]
    → por cada cita: enviarEmailCita (tipo asignada)
    → si OK → UPDATE CompromisoVI SET Correo = 1
    → espera 1 min (si hubo citas) o N min (si vacío) → repetir
```

## Dependencias

Solo las necesarias:

- `dotenv` — variables de entorno
- `mssql` — SQL Server
- `nodemailer` — envío de correo

## Notas

- `CompromisoVI.Correo` es la bandera de notificación por email (`0` pendiente, `1` enviado). No se modifica `Id Estado` de la cita.
- `CompromisoVI.WhatsApp` ya no se usa en este bot.
- No subas el archivo `.env` al repositorio (está en `.gitignore`).
