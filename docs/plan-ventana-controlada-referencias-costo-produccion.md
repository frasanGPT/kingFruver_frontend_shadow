# Plan operativo: Ventana controlada Referencias costo a Producción

## Objetivo

Este documento define cómo planear una futura ventana controlada para integrar **Referencias costo** a Producción.

Este documento no ejecuta la ventana.

La regla principal es:

- Primero se planea.
- Después se revisa.
- Solo con aprobación explícita se ejecuta.
- Producción no se toca durante esta fase documental.

---

## Estado actual

Frontend:

- `main` está limpio.
- Referencias costo está visible en Shadow para Admin y Supervisor.
- Referencias costo está oculta en Producción para Admin y Supervisor.
- La documentación ya aclara que Referencias costo no mueve `stockDisponible`.

Backend:

- El PR backend existe como Draft.
- Branch backend: `feat/referencias-costo-minimo`.
- Último commit conocido: `aeef271 docs: clarify referencias-costo stock scope in backend`.
- El PR backend no debe marcarse como Ready todavía.
- El PR backend no debe mergearse todavía.

Render:

- Shadow está live con `aeef271`.
- Shadow `/health` está OK.
- Producción `/health` está OK.
- Producción sigue usando backend `main` protegido.

---

## Regla de seguridad

Durante esta fase:

- No marcar PR backend como Ready for review.
- No mergear backend a `main`.
- No hacer deploy manual en Producción.
- No activar la tarjeta Referencias costo en frontend Producción.
- No ejecutar comandos con tokens reales.
- No pegar tokens reales en GitHub, documentación, chats o capturas.
- No ejecutar endpoints productivos de creación, revisión o aplicación.
- No modificar datos reales de Producción.

---

## Alcance funcional de Referencias costo

Referencias costo es un flujo de decisión comercial de costo/precio.

Al aplicar una referencia, el alcance esperado es:

- actualizar `costoPromedio`,
- actualizar `precioDeVenta`,
- conservar trazabilidad administrativa.

Referencias costo no debe actualizar `stockDisponible`.

El stock físico debe seguir viviendo en:

- Compras,
- Lotes,
- Kardex,
- Ventas,
- ajustes futuros de inventario.

Esta regla evita que una decisión comercial de costo/precio simule una entrada física de mercancía.

---

## Participantes de la ventana

Antes de ejecutar una ventana real, se deben definir responsables:

- Responsable técnico backend:
- Responsable técnico frontend:
- Responsable funcional Admin:
- Responsable funcional Supervisor:
- Responsable de validar Producción:
- Responsable de rollback:
- Persona que autoriza iniciar:
- Persona que autoriza cerrar:

Ninguna ventana debe ejecutarse si no están claros los responsables.

---

## Precondiciones obligatorias

Antes de considerar ejecución:

- [ ] PR backend revisado.
- [ ] PR backend sin conflictos contra `origin/main`.
- [ ] `git diff --check origin/main...HEAD` limpio.
- [ ] `merge-tree` sin marcadores de conflicto visibles.
- [ ] Shadow live con el último commit backend.
- [ ] Shadow `/health` OK.
- [ ] Producción `/health` OK antes de iniciar.
- [ ] Plan de rollback revisado.
- [ ] Datos de prueba definidos.
- [ ] Tokens de prueba disponibles localmente, sin pegarlos en documentación.
- [ ] Roles y permisos revisados.
- [ ] Ventana aprobada explícitamente.
- [ ] Hora de inicio definida.
- [ ] Hora máxima de finalización definida.
- [ ] Criterios de abortar definidos.

---

## Ficha Go / No-Go antes de ejecutar

Esta ficha debe completarse antes de considerar cualquier ejecución real.

Completar esta ficha no autoriza ejecutar la ventana.

### Responsables mínimos

- Responsable técnico backend:
- Responsable técnico frontend:
- Responsable funcional Admin:
- Responsable funcional Supervisor:
- Responsable de validar Producción:
- Responsable de rollback:
- Persona que autoriza iniciar:
- Persona que autoriza abortar:
- Persona que autoriza cerrar:

### Datos controlados de prueba

- Sede de prueba:
- Producto de prueba:
- Inventario de prueba:
- Referencia de costo de prueba:
- Usuario Admin de prueba:
- Usuario Supervisor de prueba:
- Usuario Cajero de prueba:
- Usuario Vendedor de prueba:

### Autorizaciones requeridas

Antes de ejecutar una ventana real, responder:

- [ ] ¿Está aprobado marcar el PR backend como Ready for review?
- [ ] ¿Está aprobado mergear backend a `main`?
- [ ] ¿Está aprobado esperar o disparar deploy de Render Producción según el plan?
- [ ] ¿Está aprobado validar endpoints productivos con datos controlados?
- [ ] ¿Está aprobado preparar un PR frontend posterior para mostrar la tarjeta en Producción?
- [ ] ¿Está aprobado abortar si aparece un criterio No-Go?

Si alguna respuesta está pendiente, la ventana no debe ejecutarse.

### Criterios Go

Solo hay Go si se cumple todo:

- [ ] Todos los responsables están definidos.
- [ ] La ventana tiene hora de inicio.
- [ ] La ventana tiene hora máxima de cierre.
- [ ] El plan de rollback fue leído y aceptado.
- [ ] Los datos de prueba están definidos.
- [ ] Los tokens necesarios están preparados solo de forma local.
- [ ] Shadow está sano.
- [ ] Producción `/health` está OK antes de iniciar.
- [ ] El PR backend fue revisado.
- [ ] No hay conflictos visibles contra `origin/main`.
- [ ] El alcance de stock está claro: Referencias costo no mueve `stockDisponible`.

### Criterios No-Go

Hay No-Go si ocurre cualquiera de estos casos:

- Falta un responsable clave.
- Falta autorización explícita.
- No está claro el rollback.
- No hay datos controlados de prueba.
- Hay riesgo de modificar datos reales no autorizados.
- Producción `/health` falla antes de iniciar.
- Shadow no está sano.
- Hay conflictos visibles contra `origin/main`.
- No se puede confirmar el estado del PR backend Draft.
- Se intenta usar o compartir tokens reales en documentación, GitHub, chats o capturas.
- Hay dudas sobre permisos esperados por rol.
- No está claro cómo abortar y volver a estado seguro.

Con cualquier No-Go, la decisión correcta es mantener Producción protegida y reprogramar.

---

## Datos de prueba requeridos

Antes de ejecutar una ventana real, deben definirse datos controlados:

- Sede de prueba:
- Producto de prueba:
- Inventario de prueba:
- Referencia de costo de prueba:
- Usuario Admin de prueba:
- Usuario Supervisor de prueba:
- Usuario Cajero de prueba:
- Usuario Vendedor de prueba:

No usar productos reales críticos sin aprobación.

No usar datos que puedan afectar operación diaria.

---

## Permisos esperados

Admin Producción:

- Puede listar referencias.
- Puede consultar detalle.
- Puede crear referencias.
- Puede revisar referencias.
- Puede aplicar referencias.

Supervisor Producción:

- Puede listar referencias.
- Puede consultar detalle.
- Puede crear referencias.
- No puede revisar.
- No puede aplicar.

Cajero Producción:

- No puede acceder a Referencias costo.

Vendedor Producción:

- No puede acceder a Referencias costo.

Roles sin permiso deben recibir:

`403 FORBIDDEN`

---

## Endpoints a validar durante una ventana real

Lectura:

- `GET /api/referencias-costo`
- `GET /api/referencias-costo/:id`

Creación:

- `POST /api/referencias-costo`

Revisión:

- `PATCH /api/referencias-costo/:id/revisar`

Aplicación:

- `PATCH /api/referencias-costo/:id/aplicar`

Health:

- `GET /health`

---

## Variables locales para una ventana real

Estas variables deben prepararse solo en la terminal local durante una ventana aprobada.

No pegarlas en GitHub, documentación, chats ni capturas.

- `TOKEN_ADMIN_PROD`
- `TOKEN_SUPERVISOR_PROD`
- `TOKEN_CAJERO_PROD`
- `TOKEN_VENDEDOR_PROD`
- `REFERENCIA_COSTO_ID`

---

## Secuencia planeada de una ventana real

Esta secuencia es solo una guía futura.

No ejecutar durante esta fase documental.

### 1. Confirmar estado previo

- Frontend `main` limpio.
- Backend feature limpio.
- PR backend todavía Draft antes de iniciar.
- Producción `/health` OK.
- Shadow `/health` OK.

### 2. Confirmar aprobación

- Confirmar quién autoriza.
- Confirmar hora de inicio.
- Confirmar hora máxima de cierre.
- Confirmar rollback.

### 3. Preparar backend

- Revisar PR backend.
- Si la ventana ya fue aprobada, marcar Ready for review.
- Mergear backend a `main` solo dentro de la ventana aprobada.

### 4. Validar Render Producción

- Esperar deploy automático o ejecutar deploy según plan aprobado.
- Confirmar commit live en Render Producción.
- Validar `/health`.
- Confirmar `env: production`.
- Confirmar `db.connected: true`.

### 5. Validar endpoints Producción

- Validar lectura con Admin.
- Validar lectura con Supervisor.
- Validar bloqueo Cajero.
- Validar bloqueo Vendedor.
- Validar que Supervisor no pueda revisar ni aplicar.
- Validar creación/revisión/aplicación solo con datos de prueba aprobados.

### 6. Activar frontend Producción

Solo después de validar backend Producción:

- Crear PR frontend para permitir tarjeta Referencias costo en Producción.
- Validar que Admin Producción ve Referencias costo.
- Validar que Supervisor Producción ve Referencias costo.
- Validar que Cajero Producción no ve Referencias costo.
- Validar que Vendedor Producción no ve Referencias costo.

### 7. Cerrar ventana

- Registrar resultados.
- Registrar commit backend live.
- Registrar commit frontend live, si aplica.
- Registrar validaciones realizadas.
- Registrar si hubo rollback o no.
- Actualizar documentación.

---

## Criterios de éxito

La ventana solo se considera exitosa si:

- Producción `/health` responde OK.
- Backend Producción expone endpoints esperados.
- Admin puede usar el flujo aprobado.
- Supervisor puede crear/listar/consultar, pero no aplicar.
- Cajero no tiene acceso.
- Vendedor no tiene acceso.
- Referencias costo no altera `stockDisponible`.
- Shadow sigue funcionando.
- No hay errores críticos en Render logs.
- La documentación queda actualizada.

---

## Criterios para abortar

Abortar la ventana si ocurre cualquiera de estos casos:

- Producción `/health` falla.
- Render Producción no despliega correctamente.
- Hay errores críticos en logs.
- Admin no puede acceder a endpoints esperados.
- Supervisor recibe permisos superiores a los esperados.
- Cajero o Vendedor acceden a Referencias costo.
- Se detecta riesgo de modificar datos reales no autorizados.
- No se puede confirmar rollback.
- Falta una persona responsable clave.

---

## Plan de rollback

Si algo falla antes de activar frontend Producción:

1. Mantener tarjeta oculta en Producción.
2. Revisar Render logs.
3. Revertir backend si el problema afecta Producción.
4. Confirmar `/health` Producción.
5. Documentar incidente.

Si algo falla después de activar frontend Producción:

1. Revertir PR frontend que muestra Referencias costo en Producción.
2. Confirmar que Admin/Supervisor Producción ya no ven la tarjeta.
3. Revisar backend.
4. Revertir backend si es necesario.
5. Confirmar `/health` Producción.
6. Documentar incidente.

---

## Evidencias a capturar

Durante una ventana real, capturar:

- Commit backend mergeado.
- Commit backend live en Render Producción.
- Resultado `/health` Producción.
- Resultado endpoints Admin.
- Resultado endpoints Supervisor.
- Resultado `403 FORBIDDEN` Cajero.
- Resultado `403 FORBIDDEN` Vendedor.
- Captura frontend Admin Producción.
- Captura frontend Supervisor Producción.
- Confirmación de que Shadow sigue funcionando.
- Confirmación de cierre o rollback.

No capturar tokens reales.

---

## Estado de este documento

Este documento solo planea una ventana futura.

No autoriza ejecución.

No modifica Producción.

No cambia el estado del PR backend Draft.

La ejecución real requiere aprobación explícita posterior.
