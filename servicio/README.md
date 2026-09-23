# Instalar como servicio de Windows (cliente)

Sí es posible. El bot no usa puerto web: es un proceso Node que debe quedar **siempre encendido**. En el PC del cliente se recomienda un **servicio de Windows** con [NSSM](https://nssm.cc/).

## Requisitos en el cliente

1. Node.js LTS instalado (`node -v` en CMD).
2. Carpeta del proyecto con `npm install` ya ejecutado.
3. Archivo `.env` configurado (DB + SMTP).
4. Vistas SQL creadas en la base Medimujer.
5. Permisos de **Administrador** para instalar el servicio.

## Pasos (NSSM)

1. Descarga NSSM: https://nssm.cc/download  
2. Copia `win64\nssm.exe` a la carpeta `servicio\` de este proyecto.  
3. Clic derecho en `servicio\install-servicio.bat` → **Ejecutar como administrador**.

Queda el servicio:

- **Nombre interno:** `MedimujerEmailRecordatorios`
- **Nombre visible:** MEDIMUJER - Recordatorios por Correo
- **Inicio:** Automático (con Windows)
- **Logs:** `logs\servicio-out.log` y `logs\servicio-err.log`
- **Si se cae:** reinicia a los 10 segundos

## Comandos útiles

En `services.msc` busca “MEDIMUJER - Recordatorios por Correo”.

O con NSSM (desde `servicio\`):

```bat
nssm status MedimujerEmailRecordatorios
nssm stop MedimujerEmailRecordatorios
nssm start MedimujerEmailRecordatorios
nssm restart MedimujerEmailRecordatorios
```

## Desinstalar

Clic derecho en `servicio\uninstall-servicio.bat` → **Ejecutar como administrador**.

## Notas

- El servicio usa el mismo `.env` de la carpeta del proyecto.
- Si cambias el `.env`, reinicia el servicio.
- La cuenta del servicio debe poder llegar a SQL Server y a Internet (SMTP).
- No hace falta abrir puertos entrantes en el firewall del cliente.
