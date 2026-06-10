# ESTRUCTURA_PROYECTO.md

# OBJETIVO

Definir la estructura oficial del proyecto.

Todo desarrollador o IA deberá respetar esta organización.

No crear carpetas fuera de esta estructura sin documentación previa.

---

# RAÍZ DEL PROYECTO

```text
D:\DEV\TIENDA
│
├── CONTEXTO
├── backend
├── frontend
├── infra
├── storage
├── scripts
├── docs
└── backups
```

---

# CONTEXTO

```text
CONTEXTO
│
├── 01-NEGOCIO
├── 02-ARQUITECTURA
├── 03-BACKEND
├── 04-FRONTEND
├── 05-DATABASE
├── 06-MODULOS
├── 07-IA
├── 08-DEVOPS
└── 09-ADR
```

Contiene toda la documentación oficial.

Es la fuente de verdad del proyecto.

---

# FRONTEND

Framework:

Next.js

```text
frontend
│
├── public
├── src
│   ├── app
│   ├── modules
│   ├── components
│   ├── hooks
│   ├── services
│   ├── providers
│   ├── stores
│   ├── lib
│   ├── types
│   ├── utils
│   └── styles
│
├── tests
└── package.json
```

---

# APP ROUTER

```text
app
│
├── (public)
│
├── admin
│
├── auth
│
├── dashboard
│
├── marketplace
│
├── negocio
│   └── [slug]
│
└── api
```

---

# MÓDULOS FRONTEND

```text
modules
│
├── inventory
├── pos
├── marketplace
├── catalog
├── crm
├── orders
├── delivery
├── reports
├── settings
└── auth
```

Cada módulo debe ser independiente.

---

# COMPONENTS

```text
components
│
├── ui
├── forms
├── tables
├── charts
├── layouts
└── shared
```

---

# SERVICES

Solo llamadas API.

```text
services
│
├── api
├── inventory
├── pos
├── marketplace
├── orders
└── crm
```

---

# BACKEND

Framework:

NestJS

```text
backend
│
├── prisma
├── src
├── test
├── uploads
└── package.json
```

---

# BACKEND SRC

```text
src
│
├── common
├── config
├── database
├── modules
├── events
├── jobs
├── guards
├── interceptors
├── filters
└── main.ts
```

---

# MÓDULOS BACKEND

```text
modules
│
├── auth
├── users
├── tenants
├── plans
├── inventory
├── suppliers
├── purchases
├── pos
├── customers
├── orders
├── delivery
├── marketplace
├── reports
├── settings
└── audit
```

---

# ESTRUCTURA DE MÓDULO NESTJS

Ejemplo:

```text
inventory
│
├── controllers
├── services
├── repositories
├── dto
├── entities
├── events
├── guards
├── inventory.module.ts
```

---

# PRISMA

```text
prisma
│
├── schema.prisma
├── migrations
├── seed
└── scripts
```

---

# INFRA

```text
infra
│
├── docker
├── nginx
├── scripts
├── backups
└── monitoring
```

---

# DOCKER

```text
docker
│
├── backend
├── frontend
├── postgres
├── redis
├── minio
└── nginx
```

---

# STORAGE

```text
storage
│
├── products
├── invoices
├── receipts
├── expenses
├── tenants
└── temp
```

Compatible con MinIO.

---

# BACKUPS

```text
backups
│
├── postgres
├── storage
└── logs
```

---

# EVENTOS

```text
events
│
├── inventory
├── pos
├── orders
├── delivery
├── customers
└── audit
```

---

# CONFIGURACIÓN

Variables de entorno.

```text
.env
.env.development
.env.production
```

Nunca hardcodear.

---

# CONVENCIONES

Carpetas:

kebab-case

Ejemplo:

inventory-module

---

Archivos:

kebab-case

Ejemplo:

inventory.service.ts

---

Clases:

PascalCase

Ejemplo:

InventoryService

---

Interfaces:

PascalCase

Ejemplo:

InventoryItem

---

Enums:

PascalCase

Ejemplo:

OrderStatus

---

# MULTI TENANT

Todo módulo comercial debe soportar:

tenant_id

Obligatoriamente.

---

# AUDITORÍA

Todo módulo crítico debe registrar:

usuario

tenant

fecha

acción

---

# REGLAS

No crear carpetas arbitrarias.

No mezclar responsabilidades.

No duplicar lógica.

No duplicar modelos.

No duplicar servicios.

No duplicar DTOs.

---

# FUENTE DE VERDAD

Documentación:

D:\DEV\TIENDA\CONTEXTO

Toda IA deberá consultar primero la documentación antes de generar o modificar código.

La estructura aquí definida es obligatoria para todo el proyecto.