# Fase 8.3 — Plan técnico: pagos divididos y métodos reales

## Decisión

No reemplazar mixto directamente por tarjeta.
La solución correcta es agregar pagos divididos con pagos[].

## Métodos futuros

- efectivo
- transferencia
- tarjeta_debito
- tarjeta_credito
- otro

## Regla futura

La suma de pagos debe ser igual al total de la venta.

## Compatibilidad

Las ventas antiguas mantienen metodoPago.
Las ventas nuevas podrán usar pagos[].

## Impacto futuro

- Venta debe guardar pagos[].
- Caja debe acumular por método real.
- Arqueo debe guardar tarjeta débito y crédito.
- Reportes deben sumar por pagos[].
- Devoluciones totales deben reversar cada pago.
- Devoluciones parciales futuras dependen de pagos[].

## No hacer todavía

- No cambiar enum metodoPago aún.
- No tocar backend todavía.
- No tocar modelos todavía.
- No migrar datos históricos todavía.
