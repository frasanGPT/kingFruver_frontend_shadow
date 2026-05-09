# Documentación kingFruver Frontend Shadow

Este directorio contiene documentación operativa, funcional, de capacitación y de preparación para Producción del frontend shadow de kingFruver.

## Regla operativa de ambientes

kingFruver trabaja con dos ambientes principales:

- **Shadow**
- **Producción**

### Shadow

Shadow se usa para:

- demostraciones,
- cursos de uso,
- capacitación de usuarios,
- estudio de casos de uso nuevos,
- pruebas de modificaciones antes de pasar algo a productivo.

En Shadow, el módulo **Referencias costo** está visible para:

- Admin,
- Supervisor.

### Producción

Producción queda protegida.

No se debe pasar nada a producción sin validación previa en Shadow.

En Producción, el módulo **Referencias costo** no es visible actualmente para:

- Admin,
- Supervisor.

Este comportamiento es intencional y temporal. Protege Producción mientras backend productivo no tenga integrado el módulo completo.

Esto no significa que Referencias costo se descarta para Producción. El servicio tiene un plan controlado de integración futura.

---

## Guías disponibles

### Índice de documentación

Archivo:

```text
docs/README.md
```

Contenido principal:

- regla Shadow / Producción,
- documentos disponibles,
- estado esperado del módulo,
- checklist rápido,
- convención para nueva documentación.

---

### Capacitación: Referencias costo en ambiente Shadow

Archivo:

```text
docs/capacitacion-referencias-costo-shadow.md
```

Contenido principal:

- propósito del módulo,
- roles del flujo,
- uso correcto en Shadow,
- flujo Supervisor,
- flujo Admin,
- estados de una referencia,
- filtros disponibles,
- separación Pendientes / Históricas,
- buenas prácticas,
- casos de uso sugeridos,
- checklist previo a capacitación.

---

### Checklist operativo: Demo Referencias costo en Shadow

Archivo:

```text
docs/checklist-demo-referencias-costo-shadow.md
```

Contenido principal:

- validación previa de frontend/backend,
- validación de acceso por ambiente,
- confirmación de Shadow Admin/Supervisor,
- confirmación de Producción protegida,
- flujo demo Supervisor,
- flujo demo Admin,
- validación de filtros,
- qué no hacer durante una demo,
- cierre operativo.

---

### Guion corto: Demo Referencias costo en Shadow

Archivo:

```text
docs/guion-demo-referencias-costo-shadow.md
```

Contenido principal:

- apertura de demo,
- explicación del problema que resuelve,
- explicación de roles,
- validación de ambiente,
- demo Supervisor,
- demo Admin,
- explicación de estados,
- explicación de filtros,
- cierre sugerido de 5 a 10 minutos.

---

### Plan controlado: Integración de Referencias costo a Producción

Archivo:

```text
docs/plan-integracion-referencias-costo-produccion.md
```

Contenido principal:

- regla temporal actual de Producción protegida,
- fases para llevar Referencias costo a Producción,
- revisión del PR backend Draft,
- definición de ventana controlada,
- merge backend/main solo con decisión explícita,
- validación de Render Producción,
- validación de `/health` producción,
- matriz de endpoints y permisos esperados,
- comandos `curl` sugeridos para futura validación,
- criterios `403 FORBIDDEN` para roles sin permiso,
- activación posterior de la tarjeta en frontend Producción,
- rollback / plan de reversa.

---

### Plan operativo: Ventana controlada Referencias costo a Producción

Archivo:

```text
docs/plan-ventana-controlada-referencias-costo-produccion.md
```

Contenido principal:

- planeación de una futura ventana controlada,
- responsables y precondiciones,
- datos de prueba y permisos esperados,
- secuencia planeada de ejecución futura,
- criterios de éxito,
- criterios para abortar,
- plan de rollback,
- evidencias a capturar,
- regla de no ejecución sin aprobación explícita.

---

## Estado esperado del módulo Referencias costo

### En Shadow

Admin y Supervisor deben ver la tarjeta:

```text
Referencias costo
```

Dentro del módulo debe mostrarse:

```text
Sede usada: Sede Shadow (SH01)
```

El módulo debe permitir:

- consultar referencias,
- crear referencias con rol Supervisor/Admin,
- revisar, descartar o aplicar con rol Admin,
- filtrar por estado,
- filtrar por producto,
- separar Pendientes e Históricas.

### En Producción actualmente

Admin y Supervisor no deben ver la tarjeta:

```text
Referencias costo
```

Este comportamiento es intencional para proteger el ambiente productivo mientras backend producción no soporte el módulo.

### En Producción futuro

Cuando backend Producción soporte Referencias costo y se complete la ventana controlada:

- Admin Producción podrá ver Referencias costo,
- Supervisor Producción podrá ver Referencias costo,
- Cajero Producción no deberá ver Referencias costo,
- Vendedor Producción no deberá ver Referencias costo.

Ese cambio debe hacerse solo después de validar backend Producción y actualizar la protección actual del frontend.

---

## Plan de Producción: puntos técnicos clave

El plan de Producción ya incluye una matriz real de endpoints y permisos esperados:

- `GET /api/referencias-costo` → `referencias-costo:read`
- `GET /api/referencias-costo/:id` → `referencias-costo:read`
- `POST /api/referencias-costo` → `referencias-costo:create`
- `PATCH /api/referencias-costo/:id/revisar` → `referencias-costo:review`
- `PATCH /api/referencias-costo/:id/aplicar` → `referencias-costo:apply`

Regla esperada por rol:

- Admin: acceso completo por wildcard `*`.
- Supervisor: lectura y creación.
- Cajero: sin acceso.
- Vendedor: sin acceso.

Alcance funcional de inventario:

- Referencias costo no mueve `stockDisponible`.
- Referencias costo ajusta `costoPromedio` y `precioDeVenta` con trazabilidad.
- El stock físico sigue viviendo en Compras, Lotes, Kardex, Ventas y ajustes futuros de inventario.
- Esta regla evita que una decisión comercial de costo/precio simule una entrada física de mercancía.

El plan también incluye plantillas `curl` con variables locales para una futura ventana controlada:

- `TOKEN_ADMIN_PROD`
- `TOKEN_SUPERVISOR_PROD`
- `TOKEN_CAJERO_PROD`
- `TOKEN_VENDEDOR_PROD`
- `REFERENCIA_COSTO_ID`

No se deben pegar tokens reales en documentación, GitHub, chats ni capturas.

---

## Checklist rápido antes de una capacitación

Antes de iniciar una capacitación en Shadow:

- [ ] Expo Go abre correctamente.
- [ ] El ambiente activo es Shadow.
- [ ] Admin Shadow puede iniciar sesión.
- [ ] Supervisor Shadow puede iniciar sesión.
- [ ] Admin Shadow ve Referencias costo.
- [ ] Supervisor Shadow ve Referencias costo.
- [ ] Producción Admin no ve Referencias costo.
- [ ] Producción Supervisor no ve Referencias costo.
- [ ] Referencias costo abre sin error rojo.
- [ ] El listado carga datos reales de Shadow.
- [ ] Se ve filtro por estado.
- [ ] Se ve filtro por producto.
- [ ] Se ve Sede usada: Sede Shadow (SH01).

---

## Checklist rápido antes de una futura activación en Producción

Antes de activar Referencias costo en Producción:

- [ ] Backend PR revisado.
- [ ] Backend PR mergeado a `main` con decisión explícita.
- [ ] Render producción desplegado.
- [ ] `/health` producción OK.
- [ ] Endpoints Referencias costo disponibles en Producción.
- [ ] Matriz endpoints/permisos validada.
- [ ] Admin Producción validado.
- [ ] Supervisor Producción validado.
- [ ] Cajero Producción no ve Referencias costo.
- [ ] Vendedor Producción no ve Referencias costo.
- [ ] Frontend cambia protección solo después de backend listo.
- [ ] Documentación actualizada.

---

## Convención de documentación

Los documentos deben mantenerse dentro de:

```text
docs/
```

Cuando se agregue nueva documentación, se recomienda:

1. crear una rama dedicada,
2. agregar o modificar archivos Markdown,
3. validar con `git diff --check`,
4. crear PR,
5. mergear a `main` solo después de revisar que no toque código si el cambio es documental.

---

## Última actualización funcional relacionada

La documentación actual asume que frontend `main` incluye:

- filtros de Referencias costo,
- separación Pendientes / Históricas,
- sede amigable en Referencias costo,
- protección de producción ocultando Referencias costo fuera de Shadow,
- Home con `GET /health` y estado de backend antes del login,
- plan controlado de Producción con matriz endpoints/permisos,
- comandos sugeridos para validar endpoints en una futura ventana controlada.
