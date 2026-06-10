# BACKUPS.md

# OBJETIVO

Definir la estrategia de backups de Mocoa Market.

Alcance:

- Qué se respalda.
- Frecuencia.
- Retención.
- Almacenamiento.
- Pruebas de restauración.
- Procedimiento ante desastre.

Detalle de infraestructura: [[INFRAESTRUCTURA.md]].

Detalle de disaster recovery: este documento.

---

# DECISIÓN ARQUITECTÓNICA

- Backups diarios automatizados.
- Retención 30 días online + 12 meses en archivo.
- Almacenamiento: disco local + S3 (Backblaze B2 o Wasabi, costo bajo).
- Cifrado en reposo.
- Pruebas de restauración mensuales.

Razones:

- 30 días online cubren la mayoría de incidentes humanos.
- 12 meses en archivo cubren compliance y recuperación tardía.
- Backblaze B2 es $5/TB/mes, suficiente para MVP.

---

# QUÉ SE RESPALDA

## Crítico (obligatorio)

| Recurso | Método | Frecuencia |
|---------|--------|-----------|
| PostgreSQL | pg_dump completo | Diario |
| PostgreSQL WAL | archive continuo | Continuo |
| MinIO (storage) | rsync / mc mirror | Diario |
| Archivos de config | tar de .env, docker-compose | Diario |
| Redis snapshots | BGSAVE | Cada 6h |

## Importante (recomendado)

- Código del repo (Git, ya cubierto).
- Secrets (gestor externo, ej. Bitwarden / 1Password).
- Logs antiguos (rotación y archivo).

## No se respalda

- Cache de aplicación (regenerable).
- Datos de test.
- Containers de Docker (regenerables desde imágenes).

---

# POSTGRESQL

## Backup lógico (pg_dump)

```bash
#!/bin/bash
# /app/scripts/backup-postgres.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/mocoastore/postgres
BACKUP_FILE=$BACKUP_DIR/mocoastore_$TIMESTAMP.sql.gz

mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U $DB_USER -d $DB_NAME --format=custom --compress=9 > $BACKUP_FILE

# Subir a S3
aws s3 cp $BACKUP_FILE s3://mocoa-backups/postgres/$TIMESTAMP.sql.gz

# Limpiar locales > 7 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

## Backup físico (si se requiere)

`pg_basebackup` para copiar el cluster completo.

Útil para restauraciones más rápidas en DBs grandes.

## WAL archiving (Point-in-time recovery)

Configurar en `postgresql.conf`:

```
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://mocoa-backups/wal/%f'
```

Permite restaurar a un punto exacto en el tiempo.

---

# MINIO (STORAGE)

## Backup incremental

```bash
#!/bin/bash
# /app/scripts/backup-storage.sh

SOURCE=minio
DEST=s3://mocoa-backups/storage/$(date +%Y/%m/%d)

docker run --rm -it \
  -e MC_HOST_minio=http://minio:9000 \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  minio/mc mirror --remove --overwrite $SOURCE $DEST
```

## Versionado en MinIO

Habilitar versionado de buckets para recuperación de archivos borrados.

---

# REDIS

## Snapshot BGSAVE

```bash
docker compose exec -T redis redis-cli BGSAVE
```

Copia el dump a `/data/dump.rdb`.

Respaldo programado cada 6h:

```bash
#!/bin/bash
docker compose exec -T redis redis-cli BGSAVE
sleep 10
docker compose cp redis:/data/dump.rdb /var/backups/mocoastore/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
```

## Importancia

- Redis es cache, no fuente de verdad.
- Si se pierde, se regenera automáticamente.
- Backup es para reducir tiempo de warmup.

---

# ARCHIVOS DE CONFIGURACIÓN

```bash
#!/bin/bash
# /app/scripts/backup-config.sh

tar -czf /var/backups/mocoastore/config/config_$(date +%Y%m%d).tar.gz \
  /app/mocoa-market/.env \
  /app/mocoa-market/docker-compose.yml \
  /app/mocoa-market/infra/

aws s3 cp /var/backups/mocoastore/config/config_$(date +%Y%m%d).tar.gz s3://mocoa-backups/config/
```

Secrets NO se respaldan en este archivo (van en gestor externo).

---

# CRONOGRAMA

| Backup | Frecuencia | Hora |
|--------|-----------|------|
| Postgres full | Diario | 03:00 |
| Postgres WAL | Continuo | - |
| Storage | Diario | 04:00 |
| Redis snapshot | Cada 6h | 00, 06, 12, 18 |
| Config | Diario | 02:00 |
| Logs archive | Semanal | Dom 05:00 |

Configurar en crontab del VPS:

```cron
0 3 * * * /app/scripts/backup-postgres.sh
0 4 * * * /app/scripts/backup-storage.sh
0 */6 * * * /app/scripts/backup-redis.sh
0 2 * * * /app/scripts/backup-config.sh
0 5 * * 0 /app/scripts/backup-archive-logs.sh
```

---

# RETENCIÓN

## Online (disco local)

| Tipo | Retención |
|------|-----------|
| Postgres full | 7 días |
| Redis snapshot | 3 días |
| Storage | 3 días |
| Config | 30 días |

## S3 (costo-eficiente)

| Tipo | Retención |
|------|-----------|
| Postgres full | 30 días |
| Storage | 30 días |
| Config | 12 meses |
| Logs archive | 6 meses |

## Glaciar / archivo (fase 2)

Después de 30 días en S3, mover a Glacier / B2 Archive:

- Postgres monthly: 12 meses en Glacier.
- Costo: $1/TB/mes en Glacier.

---

# CIFRADO

- Backups en S3: SSE-S3 (cifrado AES-256 server-side).
- Backups locales: GPG con clave del servidor.
- Clave de GPG fuera del VPS (en gestor de secretos del equipo).

```bash
# Cifrar antes de subir
gpg --symmetric --cipher-algo AES256 backup.sql.gz
```

---

# PRUEBAS DE RESTAURACIÓN

## Mensual

Último domingo del mes, 02:00 (cron).

```bash
#!/bin/bash
# /app/scripts/test-restore.sh

# 1. Descargar último backup
LATEST=$(aws s3 ls s3://mocoa-backups/postgres/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://mocoa-backups/postgres/$LATEST /tmp/test_restore.sql.gz

# 2. Levantar Postgres temporal
docker run -d --name pg-test-restore -e POSTGRES_PASSWORD=test postgres:15

# 3. Restaurar
gunzip -c /tmp/test_restore.sql.gz | docker exec -i pg-test-restore psql -U postgres

# 4. Validar
docker exec pg-test-restore psql -U postgres -c "SELECT count(*) FROM users;"

# 5. Limpiar
docker rm -f pg-test-restore
rm /tmp/test_restore.sql.gz

# 6. Notificar
echo "Restore test OK" | mail -s "Backup test" admin@mocoastore.alexsters.works
```

## Semestral

Test completo de disaster recovery:

- Restaurar en VPS nuevo.
- Levantar todos los servicios.
- Ejecutar smoke tests.
- Medir RTO (Recovery Time Objective).

---

# RTO Y RPO

## RPO (Recovery Point Objective)

Máxima pérdida de datos aceptable: **15 minutos**.

Logrado con WAL archiving continuo.

## RTO (Recovery Time Objective)

Máximo tiempo de inactividad aceptable: **1 hora**.

Logrado con backups pre-cargados en S3 + scripts de restore ensayados.

---

# PROCEDIMIENTO ANTE DESASTRE

## Escenario 1: Datos corruptos por bug

```
1. Detectar el problema (alertas, error rate).
2. Identificar el último punto bueno (logs, eventos).
3. Restaurar backup más reciente pre-problema.
4. Aplicar WAL hasta el punto seguro.
5. Validar.
6. Continuar operación.
```

## Escenario 2: VPS completo caído

```
1. Levantar VPS nuevo desde cero.
2. Restaurar últimos backups desde S3.
3. Aplicar migraciones si es necesario.
4. Actualizar DNS (baja TTL durante incidente).
5. Validar.
6. Post-mortem.
```

## Escenario 3: Tenant eliminó sus datos

```
1. Verificar en AUDIT_LOGS quién y cuándo.
2. Si fue error del usuario:
   - Restaurar backup completo en DB temporal.
   - Extraer solo los datos del tenant.
   - Importar en prod.
3. Si fue malicioso:
   - Evaluar consecuencias legales.
   - No restaurar sin aprobación.
```

---

# ALMACENAMIENTO

## Local

`/var/backups/mocoastore/`

Permisos: `chmod 700`, owner `deploy:deploy`.

## Remoto

S3-compatible (recomendado: Backblaze B2 o Wasabi por costo).

Configuración:

```
S3_BUCKET=mocoa-backups
S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com  # o el provider
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
```

Costo estimado: $5-10 USD/mes para MVP.

---

# MONITOREO DE BACKUPS

## Verificación diaria

```bash
#!/bin/bash
# /app/scripts/verify-backups.sh

# Verificar último backup de postgres
LATEST=$(aws s3 ls s3://mocoa-backups/postgres/ | sort | tail -n 1 | awk '{print $4}')
if [ -z "$LATEST" ]; then
  echo "ERROR: no postgres backups found"
  exit 1
fi

AGE_HOURS=$(( ($(date +%s) - $(date -d "$(echo $LATEST | sed 's/.sql.gz//' | awk -F_ '{print $1" "$2}' | sed 's/_/ /')" +%s)) / 3600 ))
if [ $AGE_HOURS -gt 26 ]; then
  echo "WARN: last backup is $AGE_HOURS hours old"
  exit 2
fi

echo "OK: last backup is $AGE_HOURS hours old"
```

Cron diario. Si falla, alerta a SUPER_ADMIN.

## Alertas

- Backup no ejecutado en 26h.
- Backup > 500MB (anormal).
- Restore test falla.

Detalle: [[MONITOREO.md]].

---

# EVENTOS RELACIONADOS

- `backup.executed`
- `backup.failed`
- `backup.verified`
- `restore.tested`
- `restore.executed`
- `disaster.recovered`

Detalle: [[EVENTOS.md]].

---

# AUDITORÍA

- `BACKUP_EXECUTED`
- `BACKUP_FAILED`
- `BACKUP_RESTORED`
- `BACKUP_VERIFIED`

Detalle: [[AUDITORIA.md]].

---

# REGLAS CRÍTICAS

- Backup diario sin excepción.
- 3-2-1: 3 copias, 2 medios diferentes, 1 offsite.
- Test de restore mensual obligatorio.
- Backups cifrados en reposo.
- Clave de cifrado fuera del VPS.
- Retención 30 días online + 12 meses archivo.
- Alertas si backup falla o no se ejecuta.
- Documentar cada restore (fecha, motivo, resultado).
- Disaster recovery probado semestralmente.
- No confiar en un solo backup; múltiples puntos en el tiempo.
