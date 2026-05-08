# Documentación kingFruver Frontend Shadow

Este directorio contiene documentación operativa, funcional y de capacitación para el frontend shadow de kingFruver.

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

En Producción, el módulo **Referencias costo** no es visible para:

- Admin,
- Supervisor.

Esto protege producción mientras el backend productivo no tenga integrado el módulo correspondiente.

## Guías disponibles

### Referencias costo en ambiente Shadow

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

### En Producción

Admin y Supervisor no deben ver la tarjeta:

```text
Referencias costo
```

Este comportamiento es intencional para proteger el ambiente productivo.

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

## Última actualización funcional relacionada

La documentación actual asume que frontend `main` incluye:

- filtros de Referencias costo,
- separación Pendientes / Históricas,
- sede amigable en Referencias costo,
- protección de producción ocultando Referencias costo fuera de Shadow.
