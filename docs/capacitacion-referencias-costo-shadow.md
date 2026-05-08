# Capacitación: Referencias costo en ambiente Shadow

## 1. Propósito del módulo

El módulo **Referencias costo** permite registrar y revisar cambios de costo antes de tomar una decisión comercial sobre el precio de venta.

La idea del flujo es que el sistema no cambie costos o precios de manera informal, sino que deje trazabilidad de:

- quién preparó la referencia,
- qué producto se está evaluando,
- cuál era el costo anterior,
- cuál es el costo propuesto,
- cuál era el precio de venta anterior,
- qué decisión tomó administración,
- y si finalmente la referencia fue aplicada o no.

Este módulo se usa primero en **Shadow** para capacitación, demostraciones, pruebas y estudio de casos de uso.

---

## 2. Ambiente correcto para capacitación

La capacitación debe hacerse en:

**Ambiente Shadow**

En Expo Go, al iniciar sesión, se debe confirmar que el ambiente activo sea Shadow.

En el módulo Referencias costo debe aparecer:

**Sede usada: Sede Shadow (SH01)**

No se debe hacer capacitación en Producción.

---

## 3. Roles del flujo

### Admin

El administrador puede:

- ver la tarjeta **Referencias costo**,
- entrar al módulo,
- consultar referencias,
- revisar referencias,
- descartar referencias,
- aplicar referencias,
- decidir precio de venta,
- ver filtros y estados.

### Supervisor

El supervisor puede:

- ver la tarjeta **Referencias costo**,
- entrar al módulo,
- consultar referencias,
- crear una referencia de costo,
- ver filtros y estados.

El supervisor prepara la información para que administración tome una decisión.

### Cajero

El cajero no participa en este flujo.

En Shadow y Producción no debe ver la tarjeta **Referencias costo**.

### Vendedor

El vendedor no participa en este flujo.

En Shadow y Producción no debe ver la tarjeta **Referencias costo**.

---

## 4. Regla operativa del proyecto

El modelo operativo del sistema es:

- **Admin configura**
- **Supervisor controla**
- **Vendedor prepara**
- **Cajero cobra**

El módulo Referencias costo pertenece al flujo de control y decisión comercial, por eso participan principalmente Supervisor y Admin.

---

## 5. Entrada al módulo

Desde Home, en ambiente Shadow, los usuarios Admin y Supervisor deben ver la tarjeta:

**Referencias costo**

Al entrar al módulo, se debe validar que la pantalla muestre:

- Resultado
- Sesión actual
- Rol
- Sede usada: Sede Shadow (SH01)
- Registros
- Pendientes
- Productos activos
- Crear referencia
- Aplicar referencia
- Formulario de creación si el rol tiene acceso
- Listado
- Filtros

---

## 6. Flujo del Supervisor

El Supervisor usa el módulo para preparar una referencia de costo.

### Pasos

1. Entrar a Expo Go.
2. Seleccionar ambiente Shadow.
3. Iniciar sesión como Supervisor Shadow.
4. Entrar a **Referencias costo**.
5. Confirmar que diga:
   - **Sede usada: Sede Shadow (SH01)**
6. Seleccionar un producto del inventario.
7. Revisar que el producto muestre:
   - nombre,
   - unidad,
   - stock disponible,
   - costo promedio actual,
   - precio de venta actual.
8. Ingresar:
   - cantidad nueva,
   - costo total compra,
   - flete asignado si aplica,
   - observaciones.
9. Guardar la referencia.
10. Confirmar que la referencia aparece en el listado.

### Resultado esperado

La referencia queda en estado:

**Pendiente**

---

## 7. Flujo del Admin

El Admin usa el módulo para revisar y tomar decisiones.

### Pasos

1. Entrar a Expo Go.
2. Seleccionar ambiente Shadow.
3. Iniciar sesión como Admin Shadow.
4. Entrar a **Referencias costo**.
5. Confirmar que diga:
   - **Sede usada: Sede Shadow (SH01)**
6. Revisar el listado.
7. Ubicar una referencia pendiente.
8. Revisar:
   - producto,
   - unidad,
   - costo anterior,
   - costo propuesto,
   - precio venta anterior,
   - preparado por,
   - email del responsable.
9. Escribir observación admin si corresponde.
10. Elegir una acción:
   - revisar después,
   - descartar,
   - aplicar.

---

## 8. Estados de una referencia

### Pendiente

La referencia fue creada por Supervisor o Admin, pero todavía no tiene decisión final.

Color esperado:

**amarillo suave**

### Revisada

El Admin decidió revisarla después.

Color esperado:

**azul suave**

### Descartada

El Admin decidió no usar esa referencia.

Color esperado:

**rojo suave**

### Aplicada

El Admin aplicó la referencia y actualizó los valores correspondientes.

Color esperado:

**verde suave**

---

## 9. Filtros disponibles

El módulo tiene filtros para facilitar capacitación y revisión.

### Filtro por estado

Opciones:

- Todos
- Pendientes
- Revisadas
- Descartadas
- Aplicadas

### Filtro por producto

Permite ver solo las referencias de un producto específico.

### Combinación de filtros

Los filtros se complementan.

Ejemplo:

- Producto: Papa capira
- Estado: Pendientes

Resultado esperado:

Solo se muestran referencias pendientes de Papa capira.

---

## 10. Separación Pendientes / Históricas

Cuando el filtro de estado está en **Todos**, el listado separa visualmente:

### Pendientes

Referencias que todavía requieren decisión.

### Históricas

Referencias que ya fueron:

- revisadas,
- descartadas,
- aplicadas.

Esto ayuda a explicar en capacitación qué está activo y qué ya hace parte del historial.

---

## 11. Buenas prácticas durante capacitación

Durante una capacitación se recomienda:

- usar solo ambiente Shadow,
- explicar primero el rol de cada usuario,
- iniciar mostrando el Home,
- confirmar que Producción no muestra Referencias costo,
- crear ejemplos pequeños,
- usar productos de prueba,
- explicar cada estado antes de aplicar una referencia,
- no aplicar referencias sin explicar el efecto,
- documentar cualquier caso de uso nuevo que aparezca durante la capacitación.

---

## 12. Qué no hacer durante capacitación

No se debe:

- usar ambiente Producción para probar este módulo,
- cambiar datos reales de producción,
- aplicar referencias sin explicar el impacto,
- capacitar con usuarios que no correspondan al rol,
- mezclar pruebas de cajero o vendedor con este flujo,
- hacer cambios en backend durante la demostración,
- hacer merge de backend a producción sin decisión explícita.

---

## 13. Casos de uso sugeridos para practicar

### Caso 1: Crear referencia pendiente

Rol:

Supervisor

Objetivo:

Crear una referencia de costo y dejarla pendiente para revisión del Admin.

Resultado esperado:

La referencia aparece en el listado como **Pendiente**.

---

### Caso 2: Revisar después

Rol:

Admin

Objetivo:

Marcar una referencia como revisada sin aplicarla.

Resultado esperado:

La referencia cambia a estado **Revisada**.

---

### Caso 3: Descartar referencia

Rol:

Admin

Objetivo:

Descartar una referencia que no debe usarse.

Resultado esperado:

La referencia cambia a estado **Descartada**.

---

### Caso 4: Aplicar referencia

Rol:

Admin

Objetivo:

Aplicar una referencia válida y decidir precio de venta.

Resultado esperado:

La referencia cambia a estado **Aplicada**.

---

### Caso 5: Usar filtros

Rol:

Admin o Supervisor

Objetivo:

Filtrar referencias por estado y producto.

Resultado esperado:

El listado cambia según los filtros seleccionados.

---

## 14. Checklist de validación antes de una capacitación

Antes de iniciar una capacitación, validar:

- [ ] Expo Go abre correctamente.
- [ ] Ambiente Shadow está disponible.
- [ ] Usuario Admin Shadow puede iniciar sesión.
- [ ] Usuario Supervisor Shadow puede iniciar sesión.
- [ ] En Shadow, Admin ve Referencias costo.
- [ ] En Shadow, Supervisor ve Referencias costo.
- [ ] En Producción, Admin no ve Referencias costo.
- [ ] En Producción, Supervisor no ve Referencias costo.
- [ ] Referencias costo abre sin error rojo.
- [ ] El listado carga datos reales de Shadow.
- [ ] Se ve filtro por estado.
- [ ] Se ve filtro por producto.
- [ ] Se ve Sede usada: Sede Shadow (SH01).

---

## 15. Estado actual del módulo

El módulo Referencias costo está habilitado para uso en Shadow.

En Producción, la tarjeta Referencias costo está oculta para proteger el ambiente productivo mientras backend producción no tenga integrado el módulo correspondiente.

---

## 16. Resumen para explicar en una frase

Referencias costo permite que el Supervisor prepare cambios de costo y que el Admin los revise, descarte o aplique con trazabilidad, primero en Shadow antes de cualquier paso a Producción.