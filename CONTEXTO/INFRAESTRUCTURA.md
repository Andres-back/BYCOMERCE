# INFRAESTRUCTURA.md

## OBJETIVO

Definir la infraestructura oficial del proyecto.

Este documento servirá como referencia para cualquier desarrollador o IA que participe en el sistema.

---

# PROVEEDOR PRINCIPAL

Proveedor:

Contabo

Tipo:

VPS Linux

La arquitectura inicial debe optimizar costos y maximizar rendimiento.

NO diseñar inicialmente para AWS, Azure o GCP.

Diseñar primero para Contabo.

La arquitectura deberá permitir migración futura a nube empresarial sin reescritura significativa.

---

# FASE 1 - MVP

Infraestructura inicial:

1 VPS Contabo

Funciones:

- Frontend
    
- Backend
    
- PostgreSQL
    
- Redis
    
- Storage local temporal
    
- Nginx
    

Objetivo:

Reducir costos de lanzamiento.

Meta:

0 a 100 comercios.

---

# FASE 2

2 VPS Contabo

Servidor 1

- Frontend
    
- Backend
    

Servidor 2

- PostgreSQL
    
- Redis
    
- Backups
    

Meta:

100 a 1.000 comercios.

---

# FASE 3

Cluster de VPS

Separar:

- Frontend
    
- Backend
    
- Base de datos
    
- Redis
    
- Storage
    

Meta:

1.000 a 10.000 comercios.

---

# SISTEMA OPERATIVO

Ubuntu Server LTS

Versión estable vigente.

---

# CONTENERIZACIÓN

Docker obligatorio.

Todo servicio debe ejecutarse mediante contenedores.

Ejemplo:

- frontend
    
- backend
    
- postgres
    
- redis
    
- nginx
    

---

# ORQUESTACIÓN

Fase MVP:

Docker Compose

Fase Escalamiento:

Kubernetes

No implementar Kubernetes desde el inicio.

---

# REVERSE PROXY

Nginx

Responsabilidades:

- SSL
    
- Proxy inverso
    
- Balanceo futuro
    
- Compresión
    
- Caché
    

---

# FRONTEND

Framework:

Next.js

Despliegue:

Docker Container

---

# BACKEND

Framework:

NestJS

Despliegue:

Docker Container

---

# BASE DE DATOS

Motor:

PostgreSQL

Reglas:

- Índices obligatorios.
    
- Migraciones mediante Prisma.
    
- Backups automáticos.
    

---

# CACHE

Redis

Usos:

- Sesiones.
    
- Caché.
    
- Eventos.
    
- WebSockets.
    

---

# ALMACENAMIENTO

Fase MVP:

Disco VPS.

Fase crecimiento:

S3 Compatible Storage.

Archivos:

- Logos.
    
- Productos.
    
- Facturas.
    
- Comprobantes.
    
- Imágenes de gastos.
    

Nunca almacenar binarios dentro de PostgreSQL.

---

# BACKUPS

Frecuencia:

Diaria.

Retención:

30 días.

Respaldar:

- PostgreSQL.
    
- Archivos.
    
- Configuración.
    

---

# MONITOREO

Implementar:

- Logs centralizados.
    
- Uso de CPU.
    
- Uso de RAM.
    
- Espacio en disco.
    
- Estado de contenedores.
    

---

# SEGURIDAD

HTTPS obligatorio.

Firewall obligatorio.

Fail2Ban.

Actualizaciones periódicas.

Secretos fuera del repositorio.

Variables de entorno cifradas.

---

# DOMINIOS

Estructura inicial:

app.mocoastore.alexsters.works

Panel administrativo.

mocoastore.alexsters.works

Marketplace.

mocoastore.alexsters.works/negocio/nombre

Landing pública.

---

# OBJETIVO DE COSTOS

Mantener infraestructura inicial por debajo de:

USD 20-40 mensuales.

Hasta alcanzar tracción comercial.

Escalar únicamente cuando métricas reales lo justifiquen.

---

# REGLA DE ARQUITECTURA

Toda decisión técnica futura debe considerar:

1. Compatibilidad con Contabo.
    
2. Costos reducidos.
    
3. Facilidad de mantenimiento.
    
4. Escalabilidad gradual.
    
5. Despliegue automatizado.