# Checklist operativo: Demo Referencias costo en Shadow

## Objetivo

Este checklist sirve para preparar y ejecutar una demostración del módulo **Referencias costo** en ambiente **Shadow**, sin tocar Producción.

La regla principal es:

- En **Shadow**, Admin y Supervisor sí ven Referencias costo.
- En **Producción**, Admin y Supervisor no ven Referencias costo.

---

## 1. Antes de iniciar la demo

Validar en terminal:

```bash
cd ~/kingFruver_workarea/kingFruver_frontend_shadow
git status
git log --oneline -3
```

Resultado esperado:

- branch: `main`
- working tree clean
- `origin/main` actualizado

Validar backend Shadow:

```bash
curl -i https://kingfruver-api-shadow.onrender.com/health
```

Resultado esperado:

- HTTP 200
- `env: shadow`
- `db.connected: true`

Validar backend Producción solo con health, sin tocar datos:

```bash
curl -i https://kingfruver-api-prod.onrender.com/health
```

Resultado esperado:

- HTTP 200
- `env: production`
- `db.connected: true`

---

## 2. Levantar Expo Go

Desde frontend shadow:

```bash
cd ~/kingFruver_workarea/kingFruver_frontend_shadow
npx expo start
```

Escanear el QR con Expo Go en iPhone.

---

## 3. Validación de acceso por ambiente

### Shadow Admin

- [ ] Seleccionar ambiente Shadow.
- [ ] Iniciar sesión como Admin Shadow.
- [ ] Confirmar que en Home aparece la tarjeta **Referencias costo**.
- [ ] Entrar a Referencias costo.
- [ ] Confirmar que abre sin error rojo.
- [ ] Confirmar que carga listado real.
- [ ] Confirmar que muestra:
  - [ ] Filtrar por estado
  - [ ] Filtrar por producto
  - [ ] Sede usada: Sede Shadow (SH01)

### Shadow Supervisor

- [ ] Cerrar sesión.
- [ ] Mantener ambiente Shadow.
- [ ] Iniciar sesión como Supervisor Shadow.
- [ ] Confirmar que en Home aparece la tarjeta **Referencias costo**.
- [ ] Entrar a Referencias costo.
- [ ] Confirmar que abre sin error rojo.
- [ ] Confirmar que carga listado real.
- [ ] Confirmar que muestra:
  - [ ] Filtrar por estado
  - [ ] Filtrar por producto
  - [ ] Sede usada: Sede Shadow (SH01)

### Producción Admin

- [ ] Cerrar sesión.
- [ ] Seleccionar ambiente Producción.
- [ ] Iniciar sesión como Admin Producción.
- [ ] Confirmar que en Home **NO** aparece la tarjeta **Referencias costo**.

### Producción Supervisor

- [ ] Cerrar sesión.
- [ ] Mantener ambiente Producción.
- [ ] Iniciar sesión como Supervisor Producción.
- [ ] Confirmar que en Home **NO** aparece la tarjeta **Referencias costo**.

---

## 4. Demo del flujo Supervisor en Shadow

Usar solo ambiente Shadow.

- [ ] Iniciar sesión como Supervisor Shadow.
- [ ] Entrar a Referencias costo.
- [ ] Seleccionar un producto del inventario.
- [ ] Revisar:
  - [ ] producto
  - [ ] unidad
  - [ ] stock disponible
  - [ ] costo promedio actual
  - [ ] precio de venta actual
- [ ] Ingresar cantidad nueva.
- [ ] Ingresar costo total compra.
- [ ] Ingresar flete asignado si aplica.
- [ ] Agregar observación de supervisor.
- [ ] Guardar referencia.
- [ ] Confirmar que aparece en estado **Pendiente**.

---

## 5. Demo del flujo Admin en Shadow

Usar solo ambiente Shadow.

- [ ] Iniciar sesión como Admin Shadow.
- [ ] Entrar a Referencias costo.
- [ ] Revisar una referencia pendiente.
- [ ] Confirmar datos:
  - [ ] producto
  - [ ] unidad
  - [ ] costo anterior
  - [ ] costo propuesto
  - [ ] precio venta anterior
  - [ ] preparado por
  - [ ] email del responsable
- [ ] Explicar las acciones disponibles:
  - [ ] Revisar después
  - [ ] Descartar
  - [ ] Aplicar

---

## 6. Demo de filtros

En Shadow, con Admin o Supervisor:

- [ ] Filtro estado: Todos.
- [ ] Confirmar separación:
  - [ ] Pendientes
  - [ ] Históricas
- [ ] Filtro estado: Pendientes.
- [ ] Filtro estado: Revisadas.
- [ ] Filtro estado: Descartadas.
- [ ] Filtro estado: Aplicadas.
- [ ] Filtro por producto.
- [ ] Combinar producto + estado.
- [ ] Confirmar que si no hay resultados aparece:
  - `No hay referencias para este filtro.`

---

## 7. Qué no hacer durante una demo

- [ ] No usar Producción para probar Referencias costo.
- [ ] No modificar datos productivos.
- [ ] No hacer merge de backend durante la capacitación.
- [ ] No aplicar referencias sin explicar el impacto.
- [ ] No usar usuarios que no correspondan al rol.
- [ ] No mezclar pruebas de Cajero/Vendedor con este flujo.

---

## 8. Cierre de la demo

- [ ] Cerrar sesión en Expo Go.
- [ ] Cerrar Expo en terminal con `Control + C`.
- [ ] Confirmar frontend limpio:

```bash
cd ~/kingFruver_workarea/kingFruver_frontend_shadow
git status
```

Resultado esperado:

- `On branch main`
- `nothing to commit, working tree clean`

---

## 9. Resultado esperado final

Al terminar la demo:

- Shadow sigue funcional.
- Producción sigue protegida.
- No se hicieron cambios en código.
- No se tocó backend producción.
- Los asistentes entienden que:
  - Supervisor prepara.
  - Admin decide.
  - Vendedor no participa.
  - Cajero no participa.
