import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppShell from '../components/AppShell';
import StateNoticeCard from '../components/StateNoticeCard';
import { getActiveEnvironment } from '../config/environments';
import { createCompra, getCompras } from '../services/compraService';
import { getInventarioDisponible } from '../services/inventarioService';
import { getProveedores } from '../services/proveedorService';
import { loadSession } from '../services/sessionService';

function getRoleCode(usuario) {
  if (usuario && usuario.roleId && usuario.roleId.codigo) return usuario.roleId.codigo;
  if (usuario && usuario.rol) return usuario.rol;
  return '';
}

function getId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id;
  if (value.id) return value.id;
  return '';
}

function normalizeSingleDecimalSeparator(raw, separator) {
  const parts = raw.split(separator);

  if (parts.length === 2) {
    const [left, right] = parts;

    if (right.length === 3 && left.length >= 1 && left.length <= 3) {
      return left + right;
    }

    return `${left}.${right}`;
  }

  const groupParts = parts.slice(1);
  const allGroupsLookLikeThousands = groupParts.every((part) => part.length === 3);

  if (allGroupsLookLikeThousands) {
    return parts.join('');
  }

  const last = parts[parts.length - 1];
  const leading = parts.slice(0, -1).join('');

  return `${leading}.${last}`;
}

function parseDecimalInput(value) {
  if (value === null || value === undefined) {
    return NaN;
  }

  const raw = String(value).trim().replace(/\s/g, '');

  if (!raw) {
    return NaN;
  }

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    const lastCommaIndex = raw.lastIndexOf(',');
    const lastDotIndex = raw.lastIndexOf('.');
    const decimalSeparator = lastCommaIndex > lastDotIndex ? ',' : '.';
    const groupSeparator = decimalSeparator === ',' ? '.' : ',';

    normalized = raw
      .split(groupSeparator)
      .join('')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    normalized = normalizeSingleDecimalSeparator(raw, ',');
  } else if (hasDot) {
    normalized = normalizeSingleDecimalSeparator(raw, '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return NaN;
  }

  return Number(normalized);
}

const CANONICAL_UNIT_OPTIONS = [
  {
    value: 'kg',
    label: 'kg',
    description: 'Kilogramos',
  },
  {
    value: 'lb',
    label: 'lb',
    description: 'Libras',
  },
  {
    value: 'und',
    label: 'und',
    description: 'Unidades',
  },
  {
    value: 'caja',
    label: 'caja',
    description: 'Cajas',
  },
];

function normalizeUnitInput(value) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  const aliases = {
    kg: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    kilogramo: 'kg',
    kilogramos: 'kg',

    lb: 'lb',
    lbs: 'lb',
    libra: 'lb',
    libras: 'lb',
    pound: 'lb',
    pounds: 'lb',

    und: 'und',
    unid: 'und',
    unidad: 'und',
    unidades: 'und',

    caja: 'caja',
    cajas: 'caja',
  };

  return aliases[text] || '';
}

function getUnitDescription(value) {
  const option = CANONICAL_UNIT_OPTIONS.find((item) => item.value === value);
  return option ? option.description : 'Unidad no permitida';
}

function normalizeProductName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeInventoryProduct(item) {
  const productoNombre = item && item.productoNombre ? item.productoNombre : 'Producto sin nombre';
  const unidadBase = item && item.unidadBase ? item.unidadBase : '';

  return {
    id: getId(item),
    productoNombre,
    unidadBase,
    stockDisponible: item && item.stockDisponible !== undefined ? item.stockDisponible : 0,
    costoPromedio: item && item.costoPromedio !== undefined ? item.costoPromedio : 0,
    precioDeVenta: item && item.precioDeVenta !== undefined ? item.precioDeVenta : null,
    activo: item && item.activo === true,
    normalizedName: normalizeProductName(productoNombre),
  };
}

function formatInventoryOption(item) {
  return [
    item.productoNombre,
    item.unidadBase ? '(' + item.unidadBase + ')' : '',
    'stock: ' + item.stockDisponible,
  ]
    .filter(Boolean)
    .join(' ');
}

function getSedeIdFromSession(session) {
  const environment = getActiveEnvironment();
  const usuario = session && session.usuario ? session.usuario : null;

  return (
    getId(session && session.sedeId ? session.sedeId : null) ||
    getId(usuario && usuario.sedeId ? usuario.sedeId : null) ||
    environment.defaultSedeId ||
    ''
  );
}

function normalizeProveedor(item) {
  return {
    id: getId(item),
    nombre: item && item.nombre ? item.nombre : 'Sin nombre',
    documento: item && item.documento ? item.documento : '',
    activo: item && item.activo === true,
  };
}

function normalizeCompra(item) {
  const proveedor = item && item.proveedorId ? item.proveedorId : null;
  const sede = item && item.sedeId ? item.sedeId : null;
  const items = Array.isArray(item && item.items ? item.items : null) ? item.items : [];

  return {
    id: getId(item),
    estado: item && item.estado ? item.estado : 'sin estado',
    origenCompra: item && item.origenCompra ? item.origenCompra : 'sin origen',
    proveedorNombre: proveedor && proveedor.nombre ? proveedor.nombre : 'sin proveedor',
    sedeCodigo: sede && sede.codigo ? sede.codigo : 'sin sede',
    items,
    totalItems: items.length,
    createdAt: item && item.createdAt ? item.createdAt : '',
  };
}

export default function ComprasScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [screenResult, setScreenResult] = useState('Carga compras reales desde el backend.');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [proveedorId, setProveedorId] = useState('');
  const [origenCompra, setOrigenCompra] = useState('EN_BODEGA');
  const [productoNombre, setProductoNombre] = useState('');
  const [unidadCompra, setUnidadCompra] = useState('kg');
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [costoTotalItem, setCostoTotalItem] = useState('');
  const [flete, setFlete] = useState('');
  const [notas, setNotas] = useState('');
  const [inventarioItems, setInventarioItems] = useState([]);
  const [selectedExistingProduct, setSelectedExistingProduct] = useState(null);
  const [newProductConfirmed, setNewProductConfirmed] = useState(false);

  const roleCode = getRoleCode(session && session.usuario ? session.usuario : null);
  const token = session && session.token ? session.token : '';
  const sedeId = getSedeIdFromSession(session);
  const canCreate = roleCode === 'admin';

  const proveedorSeleccionado = useMemo(() => {
    return proveedores.find((item) => item.id === proveedorId) || null;
  }, [proveedores, proveedorId]);

  const normalizedProductSearch = normalizeProductName(productoNombre);

  const filteredExistingProducts = useMemo(() => {
    const activeItems = inventarioItems.filter((item) => item.activo === true);

    if (normalizedProductSearch.length < 2) {
      return activeItems.slice(0, 8);
    }

    return activeItems
      .filter((item) => item.normalizedName.includes(normalizedProductSearch))
      .slice(0, 8);
  }, [inventarioItems, normalizedProductSearch]);

  const exactExistingProductMatch = useMemo(() => {
    if (normalizedProductSearch.length === 0) {
      return null;
    }

    return (
      inventarioItems.find((item) => {
        return item.normalizedName === normalizedProductSearch && item.unidadBase === unidadCompra;
      }) || null
    );
  }, [inventarioItems, normalizedProductSearch, unidadCompra]);

  const hasExistingProductSuggestions =
    normalizedProductSearch.length >= 2 && filteredExistingProducts.length > 0;

  async function loadData(currentToken, successMessage, currentSession) {
    const effectiveToken = currentToken || token;
    const effectiveSession = currentSession || session;
    const effectiveSedeId = getSedeIdFromSession(effectiveSession);

    if (!effectiveToken) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    try {
      setLoading(true);
      setScreenResult('Consultando proveedores y compras...');

      const proveedoresResponse = await getProveedores({ token: effectiveToken, activo: true });
      const comprasResponse = await getCompras({ token: effectiveToken });
      const inventarioResponse = effectiveSedeId
        ? await getInventarioDisponible({ sedeId: effectiveSedeId, token: effectiveToken })
        : { data: [] };

      const proveedoresData = Array.isArray(proveedoresResponse && proveedoresResponse.data ? proveedoresResponse.data : null)
        ? proveedoresResponse.data
        : [];
      const comprasData = Array.isArray(comprasResponse && comprasResponse.data ? comprasResponse.data : null)
        ? comprasResponse.data
        : [];
      const inventarioData = Array.isArray(inventarioResponse && inventarioResponse.data ? inventarioResponse.data : null)
        ? inventarioResponse.data
        : [];

      const normalizedProveedores = proveedoresData.map(normalizeProveedor);
      const normalizedCompras = comprasData.map(normalizeCompra);
      const normalizedInventario = inventarioData.map(normalizeInventoryProduct);

      setProveedores(normalizedProveedores);
      setCompras(normalizedCompras);
      setInventarioItems(normalizedInventario);

      if (!proveedorId && normalizedProveedores.length > 0) {
        setProveedorId(normalizedProveedores[0].id);
      }

      const loadedMessage =
        'Compras cargadas: ' +
        normalizedCompras.length +
        '. Proveedores activos: ' +
        normalizedProveedores.length +
        '. Productos existentes: ' +
        normalizedInventario.length +
        '.';

      setScreenResult(successMessage ? successMessage + ' ' + loadedMessage : loadedMessage);
    } catch (error) {
      setScreenResult('Error cargando compras: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const restoredSession = await loadSession();

        if (mounted === false) return;

        setSession(restoredSession);

        if (restoredSession && restoredSession.token) {
          await loadData(restoredSession.token, undefined, restoredSession);
        } else {
          setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
        }
      } catch (error) {
        if (mounted) {
          setScreenResult('Error cargando sesión: ' + error.message);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  function handleProductNameChange(value) {
    setProductoNombre(value);
    setSelectedExistingProduct(null);
    setNewProductConfirmed(false);
  }

  function handleUnidadCompraChange(value) {
    const canonicalUnit = normalizeUnitInput(value);
    setUnidadCompra(canonicalUnit);
    setSelectedExistingProduct(null);
    setNewProductConfirmed(false);

    if (!canonicalUnit) {
      setScreenResult('Unidad no permitida. Usa una unidad existente: kg, lb, und o caja.');
    }
  }

  function handleSelectExistingProduct(item) {
    setSelectedExistingProduct(item);
    setProductoNombre(item.productoNombre);
    setUnidadCompra(item.unidadBase);
    setNewProductConfirmed(false);
    setScreenResult('Producto existente seleccionado: ' + formatInventoryOption(item));
  }

  function handleConfirmNewProduct() {
    setSelectedExistingProduct(null);
    setNewProductConfirmed(true);
    setScreenResult('Producto nuevo confirmado: ' + productoNombre.trim() + ' (' + unidadCompra + ').');
  }

  function validateCreateForm() {
    const cantidad = parseDecimalInput(cantidadCompra);
    const costo = parseDecimalInput(costoTotalItem);
    const fleteNumber = flete.trim() ? parseDecimalInput(flete) : 0;

    if (!token) return 'No hay sesión activa.';
    if (!canCreate) return 'Solo el administrador puede registrar compras.';
    if (!sedeId) return 'No se encontró sede operativa para la compra.';
    const productoNombreFinal = selectedExistingProduct
      ? selectedExistingProduct.productoNombre
      : productoNombre.trim();
    const unidadCompraFinal = selectedExistingProduct
      ? normalizeUnitInput(selectedExistingProduct.unidadBase)
      : normalizeUnitInput(unidadCompra);

    if (!proveedorId) return 'Selecciona un proveedor.';
    if (!productoNombreFinal) return 'El nombre del producto es obligatorio.';
    if (!['kg', 'lb', 'und', 'caja'].includes(unidadCompraFinal)) return 'Unidad inválida. Usa kg, lb, und o caja.';
    if (selectedExistingProduct === null && exactExistingProductMatch !== null) {
      return 'Ya existe un producto equivalente. Selecciónalo en la lista para evitar duplicados.';
    }
    if (selectedExistingProduct === null && hasExistingProductSuggestions) {
      return 'Encontramos productos parecidos en inventario. Selecciona una coincidencia antes de registrar la compra.';
    }
    if (selectedExistingProduct === null && newProductConfirmed === false) {
      return 'Confirma explícitamente que este producto es nuevo antes de registrar la compra.';
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) return 'La cantidad debe ser mayor a cero.';
    if (!Number.isFinite(costo) || costo <= 0) return 'El costo total debe ser mayor a cero.';
    if (!Number.isFinite(fleteNumber) || fleteNumber < 0) return 'El flete no puede ser negativo.';

    return '';
  }

  async function handleCreateCompra() {
    const validationError = validateCreateForm();

    if (validationError) {
      setScreenResult(validationError);
      return;
    }

    try {
      setCreating(true);
      setScreenResult('Registrando compra...');

      const compra = {
        sedeId,
        proveedorId,
        origenCompra,
        flete: flete.trim() ? parseDecimalInput(flete) : 0,
        notas: notas.trim() || undefined,
        items: [
          {
            productoNombre: selectedExistingProduct
              ? selectedExistingProduct.productoNombre
              : productoNombre.trim(),
            unidadCompra: selectedExistingProduct
              ? normalizeUnitInput(selectedExistingProduct.unidadBase)
              : normalizeUnitInput(unidadCompra),
            cantidadCompra: parseDecimalInput(cantidadCompra),
            costoTotalItem: parseDecimalInput(costoTotalItem),
          },
        ],
      };

      const response = await createCompra({ compra, token });

      if (response && response.ok === true) {
        setProductoNombre('');
        setSelectedExistingProduct(null);
        setNewProductConfirmed(false);
        setCantidadCompra('');
        setCostoTotalItem('');
        setFlete('');
        setNotas('');
        await loadData(token, 'Compra registrada correctamente.', session);
        return;
      }

      throw new Error((response && (response.message || response.error)) || 'No se pudo registrar la compra.');
    } catch (error) {
      setScreenResult('Error registrando compra: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      title="Compras"
      subtitle="Registro de abastecimiento"
      description="Registra compras asociadas a proveedor y sede. Todavía no mueve inventario."
      layout="top"
    >
      <View style={styles.actionsRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </Pressable>

        <Pressable
          style={[styles.reloadButton, loading ? styles.disabledButton : null]}
          onPress={() => loadData()}
          disabled={loading}
        >
          <Text style={styles.reloadButtonText}>
            {loading ? 'Cargando...' : 'Recargar compras'}
          </Text>
        </Pressable>
      </View>

      <StateNoticeCard title="Resultado" description={screenResult} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Sesión actual</Text>
        <Text style={styles.summaryText}>Rol: {roleCode || 'sin rol'}</Text>
        <Text style={styles.summaryText}>Sede usada: {sedeId || 'sin sede'}</Text>
        <Text style={styles.summaryText}>Compras cargadas: {compras.length}</Text>
        <Text style={styles.summaryText}>Proveedores activos: {proveedores.length}</Text>
        <Text style={styles.summaryText}>Productos existentes: {inventarioItems.length}</Text>
        <Text style={styles.summaryText}>
          Registrar compra: {canCreate ? 'disponible para admin' : 'solo lectura'}
        </Text>
      </View>

      {canCreate ? (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registrar compra</Text>
        <Text style={styles.helperText}>
          Esta compra queda confirmada, pero todavía no genera lote ni inventario.
        </Text>

        <Text style={styles.label}>Proveedor</Text>
        <ScrollView style={styles.providerList} nestedScrollEnabled>
          {proveedores.map((item) => (
            <Pressable
              key={item.id || item.nombre}
              style={[
                styles.providerOption,
                proveedorId === item.id ? styles.providerOptionSelected : null,
              ]}
              onPress={() => setProveedorId(item.id)}
              disabled={!canCreate || creating}
            >
              <Text style={styles.providerOptionText}>{item.nombre}</Text>
              <Text style={styles.providerOptionSubtext}>
                {item.documento || 'sin documento'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.helperText}>
          Seleccionado: {proveedorSeleccionado ? proveedorSeleccionado.nombre : 'ninguno'}
        </Text>

        <Text style={styles.label}>Origen</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[
              styles.toggleButton,
              origenCompra === 'EN_BODEGA' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => setOrigenCompra('EN_BODEGA')}
            disabled={!canCreate || creating}
          >
            <Text style={styles.toggleText}>En bodega</Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleButton,
              origenCompra === 'EN_FINCA' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => setOrigenCompra('EN_FINCA')}
            disabled={!canCreate || creating}
          >
            <Text style={styles.toggleText}>En finca</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Producto *</Text>
        <Text style={styles.helperText}>
          Busca y selecciona un producto existente para evitar duplicados por mayúsculas, acentos o escritura.
        </Text>
        <TextInput
          style={styles.input}
          value={productoNombre}
          onChangeText={handleProductNameChange}
          placeholder="Ej: Mango de azúcar"
          editable={canCreate && !creating}
        />

        {selectedExistingProduct ? (
          <View style={styles.productSelectedCard}>
            <Text style={styles.productOptionTitle}>Producto existente seleccionado</Text>
            <Text style={styles.productOptionMeta}>
              {formatInventoryOption(selectedExistingProduct)}
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedExistingProduct(null);
                setNewProductConfirmed(false);
              }}
              disabled={!canCreate || creating}
            >
              <Text style={styles.secondaryButtonText}>Cambiar selección</Text>
            </Pressable>
          </View>
        ) : null}

        {filteredExistingProducts.length > 0 ? (
          <View style={styles.productList}>
            <Text style={styles.helperText}>Coincidencias en inventario existente:</Text>
            {filteredExistingProducts.map((item) => (
              <Pressable
                key={item.id || item.productoNombre + item.unidadBase}
                style={[
                  styles.productOption,
                  exactExistingProductMatch && exactExistingProductMatch.id === item.id
                    ? styles.productOptionSelected
                    : null,
                ]}
                onPress={() => handleSelectExistingProduct(item)}
                disabled={!canCreate || creating}
              >
                <Text style={styles.productOptionTitle}>{item.productoNombre}</Text>
                <Text style={styles.productOptionMeta}>
                  Unidad: {item.unidadBase || 'sin unidad'} | Stock: {item.stockDisponible} | Costo prom.: ${item.costoPromedio}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedExistingProduct === null && exactExistingProductMatch !== null ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Ya existe un producto equivalente para esta unidad. Selecciónalo arriba para consolidar inventario.
            </Text>
          </View>
        ) : null}

        {selectedExistingProduct === null &&
        exactExistingProductMatch === null &&
        hasExistingProductSuggestions ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Encontramos productos parecidos en inventario. Para evitar duplicados, selecciona una coincidencia de la lista.
            </Text>
          </View>
        ) : null}

        {selectedExistingProduct === null &&
        productoNombre.trim().length > 0 &&
        hasExistingProductSuggestions === false ? (
          <Pressable
            style={[
              styles.secondaryButton,
              newProductConfirmed ? styles.secondaryButtonActive : null,
            ]}
            onPress={handleConfirmNewProduct}
            disabled={!canCreate || creating || exactExistingProductMatch !== null}
          >
            <Text style={styles.secondaryButtonText}>
              {newProductConfirmed
                ? 'Producto nuevo confirmado'
                : 'Confirmo que es un producto nuevo'}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Unidad *</Text>
        <Text style={styles.helperText}>
          Selecciona una unidad existente. Por ahora no se crean unidades nuevas como paquete, kit o set.
        </Text>

        {selectedExistingProduct ? (
          <View style={styles.unitLockedCard}>
            <Text style={styles.productOptionTitle}>Unidad del producto seleccionado</Text>
            <Text style={styles.productOptionMeta}>
              {selectedExistingProduct.unidadBase} · {getUnitDescription(selectedExistingProduct.unidadBase)}
            </Text>
          </View>
        ) : (
          <View style={styles.unitSelector}>
            {CANONICAL_UNIT_OPTIONS.map((option) => {
              const active = unidadCompra === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.unitOption,
                    active ? styles.unitOptionActive : null,
                  ]}
                  onPress={() => handleUnidadCompraChange(option.value)}
                  disabled={!canCreate || creating}
                >
                  <Text style={styles.unitOptionLabel}>{option.label}</Text>
                  <Text style={styles.unitOptionDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Cantidad *</Text>
        <TextInput
          style={styles.input}
          value={cantidadCompra}
          onChangeText={setCantidadCompra}
          placeholder="Ej: 10"
          keyboardType="decimal-pad"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Costo total item *</Text>
        <TextInput
          style={styles.input}
          value={costoTotalItem}
          onChangeText={setCostoTotalItem}
          placeholder="Ej: 35000"
          keyboardType="decimal-pad"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Flete</Text>
        <TextInput
          style={styles.input}
          value={flete}
          onChangeText={setFlete}
          placeholder="0"
          keyboardType="decimal-pad"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={styles.input}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones"
          editable={canCreate && !creating}
        />

        <Pressable
          style={[styles.primaryButton, (!canCreate || creating) ? styles.disabledButton : null]}
          onPress={handleCreateCompra}
          disabled={!canCreate || creating}
        >
          <Text style={styles.primaryButtonText}>
            {creating ? 'Registrando...' : 'Registrar compra'}
          </Text>
        </Pressable>
      </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registro de compra</Text>
          <Text style={styles.cardText}>
            Disponible solo para administrador. Como supervisor puedes revisar el resumen y el historial de compras.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado de compras</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Consultando compras...</Text>
          </View>
        ) : null}

        <ScrollView style={styles.list} nestedScrollEnabled>
          {compras.length === 0 ? (
            <Text style={styles.emptyText}>No hay compras cargadas.</Text>
          ) : null}

          {compras.map((item) => (
            <View key={item.id || item.createdAt} style={styles.compraCard}>
              <Text style={styles.compraTitle}>{item.proveedorNombre}</Text>
              <Text style={styles.compraText}>Estado: {item.estado}</Text>
              <Text style={styles.compraText}>Origen: {item.origenCompra}</Text>
              <Text style={styles.compraText}>Sede: {item.sedeCodigo}</Text>
              <Text style={styles.compraText}>Items: {item.totalItems}</Text>
              {item.items.map((compraItem, index) => (
                <Text key={index} style={styles.compraItemText}>
                  • {compraItem.productoNombre} · {compraItem.cantidadCompra} {compraItem.unidadCompra} · ${compraItem.costoTotalItem}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  backButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: '#111827',
    fontWeight: '800',
  },
  reloadButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#ffffff',
  },
  productList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  productOption: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  productOptionSelected: {
    borderColor: '#111827',
    backgroundColor: '#e5e7eb',
  },
  productOptionTitle: {
    fontWeight: '900',
    color: '#111827',
    marginBottom: 3,
  },
  productOptionMeta: {
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
  },
  productSelectedCard: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
  },
  unitLockedCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  unitOption: {
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  unitOptionActive: {
    borderColor: '#111827',
    backgroundColor: '#e5e7eb',
  },
  unitOptionLabel: {
    fontWeight: '900',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  unitOptionDescription: {
    color: '#4b5563',
    fontSize: 12,
  },
  warningCard: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#fffbeb',
  },
  warningText: {
    color: '#92400e',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  secondaryButtonActive: {
    backgroundColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '900',
  },
  providerList: {
    maxHeight: 180,
    marginBottom: 10,
  },
  providerOption: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  providerOptionSelected: {
    borderColor: '#111827',
    backgroundColor: '#e5e7eb',
  },
  providerOptionText: {
    fontWeight: '900',
    color: '#111827',
  },
  providerOptionSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  toggleButtonActive: {
    backgroundColor: '#e5e7eb',
    borderColor: '#111827',
  },
  toggleText: {
    color: '#111827',
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#4b5563',
  },
  list: {
    maxHeight: 460,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  compraCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  compraTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  compraText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  compraItemText: {
    fontSize: 13,
    color: '#111827',
    marginTop: 4,
  },
});
