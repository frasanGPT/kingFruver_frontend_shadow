# Plan controlado: Integración de Referencias costo a Producción

## Objetivo

Este documento define el camino seguro para llevar el módulo **Referencias costo** a ambiente **Producción**, sin romper el servicio actual y sin exponer una tarjeta que dependa de endpoints todavía no disponibles en backend productivo.

La regla actual es temporal:

- En **Shadow**, Admin y Supervisor sí ven **Referencias costo**.
- En **Producción**, Admin y Supervisor no ven **Referencias costo**.

La meta futura es que Producción también tenga el módulo, pero solo cuando backend producción soporte el flujo completo y haya una ventana controlada de integración.

---

## 1. Estado actual

### Frontend

El frontend ya tiene integrado en `main`:

- Pantalla Referencias costo.
- Filtro por estado.
- Filtro por producto.
- Separación Pendientes / Históricas.
- Sede amigable.
- Protección para ocultar Referencias costo fuera de Shadow.
- Documentación de capacitación/demo.
- Home con validación del backend antes del login.

### Backend

El backend tiene el flujo Referencias costo en la rama:

`feat/referencias-costo-minimo`

El PR backend existe y sigue en estado **Draft**.

No se debe mergear todavía porque:

- `backend/main` alimenta Producción.
- Producción debe mantenerse estable.
- Antes de exponer el módulo en Producción hay que validar backend, datos, permisos y despliegue.

---

## 2. Principio de seguridad

No se debe activar la tarjeta **Referencias costo** en Producción hasta que se cumplan estas condiciones:

- Backend Referencias costo mergeado correctamente a `main`.
- Render producción desplegado con el nuevo backend.
- `/health` producción responde correctamente.
- Endpoints de Referencias costo existen y responden en Producción.
- Permisos de Admin y Supervisor están preparados.
- Flujo mínimo validado en Producción con datos controlados.
- Se decide explícitamente levantar la protección del frontend.

---

## 3. Fases de integración

### Fase 1: Mantener Shadow funcional

Objetivo:

Mantener Shadow como ambiente de demostración, capacitación, prueba y validación.

Validaciones:

- Admin Shadow ve Referencias costo.
- Supervisor Shadow ve Referencias costo.
- Producción Admin no ve Referencias costo.
- Producción Supervisor no ve Referencias costo.
- Backend Shadow responde `/health`.
- Backend Producción responde `/health`.

Estado esperado:

- Shadow operativo.
- Producción protegida.

---

### Fase 2: Revisión final del PR backend

Objetivo:

Revisar el PR backend sin hacer merge.

Validar:

- Branch backend: `feat/referencias-costo-minimo`.
- Working tree limpio.
- Branch sincronizada con remoto.
- `git diff --check origin/main...HEAD` sin salida.
- `merge-tree` sin conflictos visibles.
- Archivos esperados:
  - `scripts/seeds/seed_roles.js`
  - `src/modules/referencias-costo/referenciaCosto.controller.js`
  - `src/modules/referencias-costo/referenciaCosto.model.js`
  - `src/modules/referencias-costo/referenciaCosto.routes.js`
  - `src/modules/referencias-costo/referenciaCosto.service.js`
  - `src/server.js`

No hacer:

- No marcar Ready for review todavía si no hay ventana definida.
- No mergear.
- No tocar Producción.

---

### Fase 3: Definir ventana controlada

Antes de mergear backend/main, definir:

- Fecha y hora.
- Responsable.
- Tiempo disponible para validación.
- Plan de reversa.
- Qué usuarios se usarán.
- Qué datos se pueden tocar.
- Qué endpoints se van a validar.
- Qué significa éxito.
- Qué significa rollback.

Recomendación:

Hacerlo en un momento donde no haya operación crítica.

---

### Fase 4: Merge backend a main

Solo cuando haya decisión explícita.

Pasos generales:

1. Confirmar backend limpio.
2. Confirmar PR backend actualizado contra `origin/main`.
3. Marcar PR backend como Ready for review.
4. Confirmar que GitHub indique que no hay conflictos.
5. Mergear a `main`.
6. Esperar deploy de Render producción.
7. Confirmar commit live en Render producción.

No hacer:

- No activar todavía la tarjeta en Producción desde frontend.
- No asumir que el deploy está listo sin validar `/health`.

---

### Fase 5: Validar backend Producción

Después del deploy:

Validar:

```bash
curl -i https://kingfruver-api-prod.onrender.com/health
```

Resultado esperado:

- HTTP 200.
- `env: production`.
- `db.connected: true`.

Luego validar endpoints del módulo de forma controlada.

### Matriz de endpoints y permisos esperados

| Método | Endpoint | Permiso requerido | Admin | Supervisor | Cajero | Vendedor |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/referencias-costo` | `referencias-costo:read` | Sí | Sí | No | No |
| GET | `/api/referencias-costo/:id` | `referencias-costo:read` | Sí | Sí | No | No |
| POST | `/api/referencias-costo` | `referencias-costo:create` | Sí | Sí | No | No |
| PATCH | `/api/referencias-costo/:id/revisar` | `referencias-costo:review` | Sí | No | No | No |
| PATCH | `/api/referencias-costo/:id/aplicar` | `referencias-costo:apply` | Sí | No | No | No |

Notas:

- Admin tiene permiso wildcard `*`, por eso cubre `read`, `create`, `review` y `apply`.
- Supervisor solo debe tener `referencias-costo:read` y `referencias-costo:create`.
- Cajero y Vendedor no deben tener permisos de Referencias costo.
- Si un rol sin permiso llama un endpoint protegido, la respuesta esperada es `403 FORBIDDEN`.

Validaciones mínimas sugeridas:

- Admin Producción puede listar referencias.
- Admin Producción puede consultar detalle.
- Admin Producción puede crear, revisar y aplicar según el flujo aprobado.
- Supervisor Producción puede listar, consultar detalle y crear.
- Supervisor Producción no puede revisar ni aplicar.
- Cajero Producción no puede acceder a endpoints de Referencias costo.
- Vendedor Producción no puede acceder a endpoints de Referencias costo.

---

### Fase 6: Activar tarjeta en Producción desde frontend

Solo después de validar backend producción.

Cambio esperado:

Modificar protección actual del frontend para permitir que Producción muestre **Referencias costo** a los roles aprobados.

Estado futuro deseado:

- Shadow:
  - Admin ve Referencias costo.
  - Supervisor ve Referencias costo.

- Producción:
  - Admin ve Referencias costo.
  - Supervisor ve Referencias costo.
  - Cajero no ve Referencias costo.
  - Vendedor no ve Referencias costo.

Este cambio debe hacerse en una rama nueva, por ejemplo:

`feat/enable-referencias-costo-prod-card`

Validaciones obligatorias:

- Babel OK.
- `git diff --check` limpio.
- Expo Go Shadow:
  - Admin visible.
  - Supervisor visible.
- Expo Go Producción:
  - Admin visible.
  - Supervisor visible.
  - Cajero no visible.
  - Vendedor no visible.
- Backend producción responde correctamente.

---

### Fase 7: Documentar cambio de estado

Actualizar documentación:

- `docs/README.md`
- `docs/capacitacion-referencias-costo-shadow.md`
- `docs/checklist-demo-referencias-costo-shadow.md`
- `docs/guion-demo-referencias-costo-shadow.md`

Actualizar la regla:

Antes:

- Producción Admin/Supervisor no ven Referencias costo.

Después:

- Producción Admin/Supervisor ven Referencias costo, porque backend producción ya soporta el módulo.

---

## 4. Checklist antes de activar Producción

- [ ] Backend PR revisado.
- [ ] Backend PR mergeado a main.
- [ ] Render producción desplegado.
- [ ] `/health` producción OK.
- [ ] Endpoints Referencias costo disponibles en Producción.
- [ ] Permisos verificados.
- [ ] Admin Producción validado.
- [ ] Supervisor Producción validado.
- [ ] Cajero Producción no ve Referencias costo.
- [ ] Vendedor Producción no ve Referencias costo.
- [ ] Frontend cambia protección solo después de backend listo.
- [ ] Documentación actualizada.

---

## 5. Criterios de éxito

La integración se considera exitosa si:

- Producción sigue estable.
- Backend producción responde correctamente.
- Admin y Supervisor Producción pueden usar Referencias costo.
- Cajero y Vendedor no ven Referencias costo.
- Shadow sigue funcionando.
- La documentación refleja el nuevo estado.
- No quedan ramas temporales sin cerrar.

---

## 6. Plan de reversa

Si algo falla:

1. No activar tarjeta en Producción si aún está oculta.
2. Si ya fue activada, revertir el PR frontend que la muestra en Producción.
3. Revisar Render logs backend.
4. Si el backend falla en producción, revertir o corregir backend según el tipo de error.
5. Mantener Shadow como ambiente funcional para continuar capacitación.

---

## 7. Nota operativa

La ocultación actual de **Referencias costo** en Producción no significa que el servicio se descarta.

Significa que el servicio está en fase controlada:

- Primero Shadow.
- Luego backend producción.
- Luego frontend producción.
- Finalmente capacitación/uso productivo.
