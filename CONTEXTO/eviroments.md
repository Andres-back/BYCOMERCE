# ENVIRONMENTS.md

# PRODUCCIÓN

## Dominio Principal

mocoastore.alexsters.works

---

# BASE DE DATOS PRINCIPAL

Motor:

PostgreSQL

Host Docker Interno:

postgres

Puerto:

5432

Base de Datos:

mocoastore

---

# CONEXIÓN INTERNA

DATABASE_URL=

postgresql://USUARIO:PASSWORD@postgres:5432/mocoastore

---

# RED DOCKER

Todos los servicios se comunican mediante la red interna Docker.

Hosts válidos:

postgres
redis
minio
backend
frontend
nginx

No utilizar IPs internas fijas.

Siempre utilizar nombres de servicio Docker.

---

# URLS OFICIALES

Marketplace:

https://mocoastore.alexsters.works

API:

https://mocoastore.alexsters.works/api

Panel Administrativo:

https://mocoastore.alexsters.works/admin

Landing Comercios:

https://mocoastore.alexsters.works/negocio/{slug}

Ejemplo:

https://mocoastore.alexsters.works/negocio/zapateria-andres

---

# REGLAS

Toda configuración debe provenir de variables de entorno.

Nunca hardcodear:

- Usuarios
- Contraseñas
- Tokens
- Claves API

La documentación de Obsidian es la fuente oficial de configuración.