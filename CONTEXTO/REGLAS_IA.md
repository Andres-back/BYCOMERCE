# REGLAS_LLM.md

# OBJETIVO

Definir las reglas obligatorias para cualquier IA, agente, LLM o desarrollador que participe en el proyecto.

Estas reglas tienen prioridad sobre cualquier sugerencia o decisión individual.

---

# CEREBRO DEL PROYECTO

Ubicación oficial:

D:\DEV\TIENDA\CONTEXTO

Este directorio contiene toda la documentación del sistema.

Es la fuente de verdad del proyecto.

---

# REGLA 1

ANTES DE MODIFICAR CÓDIGO

Leer la documentación relevante dentro de:

D:\DEV\TIENDA\CONTEXTO

---

# REGLA 2

NO INVENTAR ARQUITECTURA

Si una decisión ya existe en Obsidian:

Seguir la documentación.

No proponer alternativas innecesarias.

---

# REGLA 3

NO DUPLICAR FUNCIONALIDAD

Antes de crear:

- Servicio
    
- Componente
    
- Hook
    
- Endpoint
    
- Tabla
    
- DTO
    

Buscar si ya existe.

---

# REGLA 4

UNA SOLA FUENTE DE VERDAD

Inventario es dueño de:

Productos

Stock

Categorías

Variantes

Ningún otro módulo debe duplicar estos datos.

---

# REGLA 5

RESPETAR MULTI TENANT

Toda entidad comercial debe incluir:

tenant_id

Toda consulta debe filtrar:

tenant_id

---

# REGLA 6

RESPETAR STACK OFICIAL

Backend:

NestJS

Frontend:

Next.js

ORM:

Prisma

Base de Datos:

PostgreSQL + PostGIS

Cache:

Redis

Storage:

MinIO

Infraestructura:

Docker

---

# REGLA 7

NO CAMBIAR TECNOLOGÍAS

No sustituir:

Prisma

PostgreSQL

Redis

MinIO

NestJS

NextJS

Sin aprobación explícita.

---

# REGLA 8

DOCUMENTAR CAMBIOS IMPORTANTES

Toda modificación relevante debe:

Actualizar documentación.

---

# REGLA 9

MANTENER MODULARIDAD

Cada módulo debe permanecer aislado.

Ejemplos:

Inventario

POS

Marketplace

CRM

Pedidos

Reportes

---

# REGLA 10

NO ACCESO DIRECTO A BASE DE DATOS DESDE FRONTEND

Frontend  
↓  
API  
↓  
Backend  
↓  
Base de Datos

Siempre.

---

# REGLA 11

NO HARDCODEAR

Nunca hardcodear:

- URLs
    
- Tokens
    
- Secretos
    
- Claves API
    
- Configuración
    

Usar variables de entorno.

---

# REGLA 12

RESPETAR DOCKER

Los servicios oficiales son:

nginx

frontend

backend

postgres

redis

minio

pgadmin

---

# REGLA 13

HOSTS OFICIALES

Base de datos:

Host: postgres

Puerto: 5432

Base:

mocoastore

---

Redis:

Host: redis

Puerto: 6379

---

MinIO:

Host: minio

Puerto: definido por entorno

---

# REGLA 14

DOMINIO OFICIAL

Dominio principal:

mocoastore.alexsters.works

---

# REGLA 15

NO ELIMINAR CÓDIGO SIN ANÁLISIS

Antes de eliminar:

Analizar dependencias.

Analizar impacto.

---

# REGLA 16

CAMBIOS QUIRÚRGICOS

Modificar únicamente:

Lo solicitado.

No refactorizar partes no relacionadas.

No mover archivos innecesariamente.

---

# REGLA 17

RESPETAR ESTRUCTURA DE CARPETAS

No crear carpetas arbitrarias.

Seguir estructura oficial.

---

# REGLA 18

NO ROMPER COMPATIBILIDAD

Todo cambio debe:

Mantener compilación.

Mantener tests.

Mantener funcionalidades existentes.

---

# REGLA 19

USAR TIPADO FUERTE

TypeScript estricto.

Evitar any.

Evitar tipado implícito.

---

# REGLA 20

USAR PRISMA COMO CAPA DE ACCESO

No escribir SQL innecesario.

Priorizar Prisma.

---

# REGLA 21

AUDITORÍA

Toda operación crítica debe registrar:

Usuario

Tenant

Fecha

Acción

---

# REGLA 22

EVENTOS DEL SISTEMA

Toda operación importante debe generar eventos.

Ejemplos:

VENTA_REALIZADA

PRODUCTO_CREADO

PEDIDO_CONFIRMADO

CLIENTE_CREADO

---

# REGLA 23

NO DUPLICAR DATOS

Productos:

Una sola tabla.

Clientes:

Una sola tabla.

Inventario:

Una sola fuente de verdad.

---

# REGLA 24

RESPETAR DOCUMENTACIÓN

Si existe conflicto entre:

Código

y

Documentación

La IA debe informar el conflicto.

Nunca asumir.

---

# REGLA 25

SI FALTA CONTEXTO

No inventar.

Buscar documentación relacionada.

Solicitar aclaración.

---

# FLUJO OBLIGATORIO DE TRABAJO

1. Leer documentación.
    
2. Analizar impacto.
    
3. Identificar módulos afectados.
    
4. Realizar cambios mínimos.
    
5. Validar compilación.
    
6. Actualizar documentación.
    
7. Registrar decisiones importantes.
    

---

# OBJETIVO FINAL

Permitir que cualquier LLM:

GPT

Codex

Claude

Gemini

DeepSeek

o futuros agentes

puedan trabajar sobre el proyecto sin pérdida de contexto, sin duplicar funcionalidades y sin romper la arquitectura definida.