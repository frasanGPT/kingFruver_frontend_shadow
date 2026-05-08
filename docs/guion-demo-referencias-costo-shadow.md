# Guion corto: Demo Referencias costo en Shadow

## Objetivo del guion

Este guion sirve para presentar el módulo **Referencias costo** en una demo o capacitación corta de 5 a 10 minutos, usando exclusivamente el ambiente **Shadow**.

La idea es explicar el flujo de forma simple:

- El Supervisor prepara la referencia.
- El Admin decide.
- Cajero y Vendedor no participan.
- Shadow se usa para demostrar y practicar.
- Producción queda protegida.

---

## 1. Apertura

Tiempo sugerido: 1 minuto.

Mensaje sugerido:

> Hoy vamos a ver el módulo Referencias costo en ambiente Shadow. Este módulo ayuda a controlar los cambios de costo antes de que se conviertan en una decisión comercial. La idea es que el Supervisor prepare la información y que el Admin decida si esa referencia se revisa, se descarta o se aplica.

Puntos clave:

- Estamos en **Shadow**.
- No estamos tocando Producción.
- Este ambiente sirve para capacitación, demos y pruebas.
- En Producción, Referencias costo no está visible para Admin ni Supervisor.

---

## 2. Explicar por qué existe el módulo

Tiempo sugerido: 1 minuto.

Mensaje sugerido:

> En una operación real, los costos pueden cambiar por compras, fletes o variaciones del proveedor. Si ese cambio se maneja de forma informal, se pierde trazabilidad. Referencias costo permite dejar una evidencia clara de qué producto se revisó, qué costo se propuso, quién lo preparó y qué decisión tomó administración.

Problema que resuelve:

- Evita cambios improvisados.
- Da trazabilidad.
- Separa preparación y decisión.
- Permite estudiar casos antes de aplicarlos.

---

## 3. Explicar roles

Tiempo sugerido: 1 minuto.

### Supervisor

Mensaje sugerido:

> El Supervisor prepara la referencia. Es quien registra la información base: producto, cantidad, costo total, flete si aplica y observaciones.

Puede:

- Ver Referencias costo en Shadow.
- Entrar al módulo.
- Crear referencias.
- Consultar el listado.
- Usar filtros.

### Admin

Mensaje sugerido:

> El Admin toma la decisión. Puede revisar, descartar o aplicar una referencia, y si la aplica puede definir el precio de venta decidido.

Puede:

- Ver Referencias costo en Shadow.
- Revisar referencias.
- Descartar referencias.
- Aplicar referencias.
- Consultar filtros e historial.

### Cajero y Vendedor

Mensaje sugerido:

> Cajero y Vendedor no participan en este flujo. Por eso no deben ver la tarjeta Referencias costo.

---

## 4. Validar ambiente y acceso

Tiempo sugerido: 1 minuto.

Mostrar en la app:

1. Ambiente Shadow.
2. Usuario Admin o Supervisor Shadow.
3. Home con tarjeta **Referencias costo** visible.

Mensaje sugerido:

> Confirmamos que estamos en Shadow y que el usuario tiene el rol correcto. En Shadow, Admin y Supervisor sí ven Referencias costo.

Luego explicar la regla de Producción:

> En Producción, esta tarjeta no se muestra para Admin ni Supervisor porque el backend productivo todavía no debe exponerse a este módulo. Producción queda protegida.

---

## 5. Mostrar pantalla Referencias costo

Tiempo sugerido: 1 minuto.

Al entrar al módulo, mostrar:

- Resultado.
- Sesión actual.
- Rol.
- Sede usada: `Sede Shadow (SH01)`.
- Registros.
- Pendientes.
- Productos activos.
- Formulario de creación, si aplica.
- Listado.
- Filtro por estado.
- Filtro por producto.

Mensaje sugerido:

> Aquí vemos la sesión actual y la sede Shadow. Esto es importante porque nos confirma que la demo está ocurriendo en el ambiente correcto.

---

## 6. Demo del Supervisor

Tiempo sugerido: 2 minutos.

Usar usuario Supervisor Shadow.

Pasos para mostrar:

1. Entrar a Referencias costo.
2. Seleccionar un producto.
3. Revisar unidad, stock, costo promedio y precio actual.
4. Ingresar cantidad nueva.
5. Ingresar costo total.
6. Ingresar flete si aplica.
7. Agregar observación.
8. Guardar referencia.

Mensaje sugerido:

> El Supervisor no está tomando la decisión final. Está preparando una referencia para que el Admin pueda revisarla. Al guardar, la referencia queda pendiente.

Resultado esperado:

- Estado: Pendiente.
- La referencia aparece en el listado.
- Se conserva trazabilidad del responsable.

---

## 7. Demo del Admin

Tiempo sugerido: 2 minutos.

Usar usuario Admin Shadow.

Pasos para mostrar:

1. Entrar a Referencias costo.
2. Revisar referencias pendientes.
3. Mostrar datos de una referencia:
   - producto,
   - unidad,
   - costo anterior,
   - costo propuesto,
   - precio anterior,
   - preparado por,
   - email.
4. Explicar acciones:
   - Revisar después.
   - Descartar.
   - Aplicar.

Mensaje sugerido:

> El Admin puede tomar una decisión. Si todavía no está seguro, puede revisar después. Si no sirve, puede descartarla. Si la referencia es válida, puede aplicarla y definir el precio de venta decidido.

---

## 8. Explicar estados

Tiempo sugerido: 1 minuto.

### Pendiente

Referencia creada, sin decisión final.

### Revisada

El Admin decidió revisarla después.

### Descartada

El Admin decidió no usarla.

### Aplicada

El Admin aplicó la referencia y decidió el precio.

Mensaje sugerido:

> Los estados ayudan a entender qué referencias están activas y cuáles ya hacen parte del historial.

---

## 9. Mostrar filtros

Tiempo sugerido: 1 minuto.

Mostrar:

- Filtro por estado.
- Filtro por producto.
- Combinación producto + estado.
- Separación Pendientes / Históricas en vista Todos.

Mensaje sugerido:

> Los filtros son útiles cuando hay muchos registros. Puedo ver solo pendientes, solo aplicadas o referencias de un producto específico. Cuando no hay resultados, el sistema muestra un mensaje claro.

Mensaje esperado si no hay resultados:

`No hay referencias para este filtro.`

---

## 10. Cierre de la demo

Tiempo sugerido: 1 minuto.

Mensaje sugerido:

> En resumen, Referencias costo ayuda a controlar cambios de costo con trazabilidad. El Supervisor prepara, el Admin decide, y todo se valida primero en Shadow. Producción queda protegida y no muestra este módulo hasta que exista una decisión de integración segura.

Recordatorio final:

- Shadow se usa para capacitación y pruebas.
- Producción no se toca.
- Admin y Supervisor ven el módulo en Shadow.
- Admin y Supervisor no ven el módulo en Producción.

---

## 11. Frase corta para cerrar

> Referencias costo permite que el Supervisor prepare cambios de costo y que el Admin decida con trazabilidad, primero en Shadow y sin exponer Producción.

---

## 12. Checklist verbal rápido

Antes de terminar, confirmar verbalmente:

- ¿Estamos en Shadow?
- ¿Se entiende qué hace Supervisor?
- ¿Se entiende qué hace Admin?
- ¿Se entiende que Cajero y Vendedor no participan?
- ¿Se entiende que Producción no muestra Referencias costo?
- ¿Se entiende que no se debe practicar este flujo en Producción?
