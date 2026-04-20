import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AppShell from '../components/AppShell';
import SummaryStatsRow from '../components/SummaryStatsRow';
import StatusBadge from '../components/StatusBadge';
import StateNoticeCard from '../components/StateNoticeCard';
import { getInventarioDisponible } from '../services/inventarioService';
import { loadSession } from '../services/sessionService';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function getStockLevel(stock) {
  const value = Number(stock || 0);

  if (value >= 50) {
    return { label: 'alto', variant: 'success' };
  }

  if (value >= 20) {
    return { label: 'medio', variant: 'warning' };
  }

  return { label: 'bajo', variant: 'danger' };
}

export default function ProductosScreen({ onBack }) {
  const [token, setToken] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [unidadFiltro, setUnidadFiltro] = useState('todos');
  const [inventarioItems, setInventarioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screenResult, setScreenResult] = useState('Cargando productos...');

  const availableUnits = useMemo(() => {
    const units = Array.from(
      new Set(
        inventarioItems
          .map((item) => String(item.unidadBase || '').trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));

    return ['todos', ...units];
  }, [inventarioItems]);

  const stockSummaryByUnit = useMemo(() => {
    const sourceItems = Array.isArray(filteredItems) ? filteredItems : [];
    const summary = {};

    sourceItems.forEach((item) => {
      const unit = String(item.unidadBase || 'sin_unidad');
      const stock = Number(item.stockDisponible || 0);
      summary[unit] = (summary[unit] || 0) + stock;
    });

    return Object.entries(summary)
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([unidad, total]) => ({
        unidad,
        total,
      }));
  }, [filteredItems]);

  const detectedUnitsText = useMemo(() => {
    return availableUnits.filter((unit) => unit != 'todos').join(', ') || 'sin datos';
  }, [availableUnits]);

  const filteredItems = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    const normalized = inventarioItems.map((item) => {
      const nombre = String(item.productoNombre || '').toLowerCase();
      const unidad = String(item.unidadBase || '').toLowerCase();
      const stock = Number(item.stockDisponible || 0);

      let rank = 2;

      if (!text) {
        rank = 0;
      } else if (nombre === text) {
        rank = 0;
      } else if (nombre.startsWith(text) || unidad.startsWith(text)) {
        rank = 1;
      } else if (nombre.includes(text) || unidad.includes(text)) {
        rank = 2;
      } else {
        rank = 99;
      }

      return {
        item,
        nombre,
        unidad,
        stock,
        rank,
      };
    });

    return normalized
      .filter((entry) => {
        const pasaTexto = entry.rank < 99;
        const pasaUnidad =
          unidadFiltro === 'todos' ? true : entry.unidad === unidadFiltro;

        return pasaTexto && pasaUnidad;
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }

        if (a.stock !== b.stock) {
          return b.stock - a.stock;
        }

        return a.nombre.localeCompare(b.nombre, 'es');
      })
      .map((entry) => entry.item);
  }, [inventarioItems, searchText, unidadFiltro]);

  const visibleCount = useMemo(() => {
    return filteredItems.length;
  }, [filteredItems]);

  const stockAcumulado = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      return acc + Number(item.stockDisponible || 0);
    }, 0);
  }, [filteredItems]);

  const selectedUnitStockTotal = useMemo(() => {
    if (unidadFiltro === 'todos') {
      return null;
    }

    return filteredItems.reduce((acc, item) => {
      return acc + Number(item.stockDisponible || 0);
    }, 0);
  }, [filteredItems, unidadFiltro]);

  const summaryItems = useMemo(() => {
    const items = [
      { label: 'Visibles', value: String(visibleCount) },
      { label: 'Registros', value: String(inventarioItems.length) },
      { label: 'Filtro', value: unidadFiltro },
    ];

    if (unidadFiltro !== 'todos') {
      items.push({
        label: 'Stock visible',
        value: String(selectedUnitStockTotal || 0),
      });
    }

    return items;
  }, [visibleCount, inventarioItems.length, unidadFiltro, selectedUnitStockTotal]);

  async function loadProductos() {
    try {
      setLoading(true);
      setScreenResult('Cargando productos desde inventario real...');

      const session = await loadSession();

      if (!session?.token) {
        setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
        setInventarioItems([]);
        return;
      }

      setToken(session.token || '');
      setSedeId(session.sedeId || '');

      const response = await getInventarioDisponible({
        sedeId: session.sedeId || '',
        token: session.token,
      });

      const rows = (response?.data || []).filter((item) => {
        return item.activo === true && Number(item.stockDisponible || 0) > 0;
      });

      setInventarioItems(rows);
      setScreenResult(`Productos cargados: ${rows.length}.`);
    } catch (error) {
      setInventarioItems([]);
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProductos();
  }, []);

  return (
    <AppShell
      title="Productos"
      subtitle="Base operativa"
      description="Consulta real de productos disponibles desde inventario shadow."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de carga</Text>
        <Text style={styles.resultText}>{screenResult}</Text>
        {loading ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Pressable style={styles.reloadButton} onPress={loadProductos}>
          <Text style={styles.reloadButtonText}>Recargar productos</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Búsqueda y filtros</Text>

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre o unidad"
          style={styles.input}
        />

        <View style={styles.filterRow}>
          {['todos', 'kg', 'lb', 'und', 'caja'].map((unidad) => {
            const active = unidadFiltro === unidad;

            return (
              <Pressable
                key={unidad}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setUnidadFiltro(unidad)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {unidad}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          Unidades detectadas desde inventario: {detectedUnitsText}{'\n'}
          Token cargado: {token ? 'si' : 'no'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>

        <SummaryStatsRow items={summaryItems} />

        <Text style={styles.helperText}>Acumulado por unidad</Text>
        {stockSummaryByUnit.map((row) => (
          <Text key={row.unidad} style={styles.productMeta}>
            {row.unidad}: {row.total}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado de productos</Text>

        {filteredItems.length === 0 ? (
          <StateNoticeCard
            title="Sin resultados"
            description="No hay productos disponibles para mostrar con el filtro actual."
          />
        ) : (
          filteredItems.map((item) => {
            const stockLevel = getStockLevel(item.stockDisponible);

            return (
              <View key={`${item._id}-${item.unidadBase}`} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productHeaderMain}>
                    <Text style={styles.productTitle}>{item.productoNombre}</Text>
                    <Text style={styles.productUnitText}>{item.unidadBase}</Text>
                  </View>

                  <StatusBadge
                    label={stockLevel.label}
                    variant={stockLevel.variant}
                  />
                </View>

                <View style={styles.productDetailRow}>
                  <Text style={styles.productLabel}>Stock disponible</Text>
                  <Text style={styles.productValue}>{item.stockDisponible}</Text>
                </View>

                <View style={styles.productDetailRow}>
                  <Text style={styles.productLabel}>Costo promedio</Text>
                  <Text style={styles.productValue}>
                    {formatCurrency(item.costoPromedio || 0)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <Pressable style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Volver al inicio</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    fontSize: 16,
  },
  filterRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6b7280',
  },
  summaryRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  summaryChipLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryChipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
  },
  loader: {
    marginTop: 12,
  },
  reloadButton: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
  productCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  productHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productHeaderMain: {
    flex: 1,
    paddingRight: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  productUnitText: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  stockBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  stockBadgeHigh: {
    backgroundColor: '#dcfce7',
  },
  stockBadgeMedium: {
    backgroundColor: '#fef3c7',
  },
  stockBadgeLow: {
    backgroundColor: '#fee2e2',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  productDetailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    marginTop: 8,
  },
  productLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  productValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  button: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
