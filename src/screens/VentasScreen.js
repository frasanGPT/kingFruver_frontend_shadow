import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppShell from '../components/AppShell';
import { createCarrito, getCarritos } from '../services/carritoService';
import { createVenta } from '../services/ventaService';
import { getInventarioDisponible } from '../services/inventarioService';
import { loadSession, saveSession } from '../services/sessionService';
import { getCajas } from '../services/cajaService';

const SHADOW_DEFAULT_SEDE_ID = '69aa0d3cd908c9f5f152fc2c';
const SHADOW_DEFAULT_CAJA_ID = '69aecd84319a254c552951a8';
const SHADOW_ADMIN_EMAIL = 'admin.shadow@kingfruver.local';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function parseDecimalInput(value) {
  if (typeof value !== 'string') {
    return NaN;
  }

  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

function isIntegerUnit(unidadVenta) {
  return unidadVenta === 'und' || unidadVenta === 'caja';
}

function formatQuantityForInput(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return String(value).replace('.', ',');
}

function extractSedeIdFromUser(usuario) {
  if (!usuario?.sedeId) {
    return '';
  }

  if (typeof usuario.sedeId === 'string') {
    return usuario.sedeId;
  }

  if (typeof usuario.sedeId === 'object' && usuario.sedeId._id) {
    return usuario.sedeId._id;
  }

  return '';
}

export default function VentasScreen({ onBack }) {
  const [productoNombre, setProductoNombre] = useState('');
  const [unidadVenta, setUnidadVenta] = useState('kg');
  const [cantidad, setCantidad] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [selectedInventario, setSelectedInventario] = useState(null);
  const [items, setItems] = useState([]);
  const [formError, setFormError] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [notas, setNotas] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [sedeId, setSedeId] = useState(SHADOW_DEFAULT_SEDE_ID);
  const [usuarioId, setUsuarioId] = useState('');
  const [cajaId, setCajaId] = useState(SHADOW_DEFAULT_CAJA_ID);
  const [cajaOperativaLabel, setCajaOperativaLabel] = useState('sin caja');
  const [bearerToken, setBearerToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authResult, setAuthResult] = useState('Todavia no has iniciado sesion.');
  const [loggingIn, setLoggingIn] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [payloadPreview, setPayloadPreview] = useState('');
  const [carritoResult, setCarritoResult] = useState('Todavia no has intentado crear el carrito real.');
  const [creatingCarrito, setCreatingCarrito] = useState(false);
  const [carritoCreadoId, setCarritoCreadoId] = useState('');
  const [carritosQueryResult, setCarritosQueryResult] = useState('Todavia no has consultado carritos.');
  const [loadingCarritos, setLoadingCarritos] = useState(false);
  const [ventaResult, setVentaResult] = useState('Todavia no has intentado crear la venta real.');
  const [creatingVenta, setCreatingVenta] = useState(false);
  const [ventaCreadaId, setVentaCreadaId] = useState('');
  const [lastSaleSummary, setLastSaleSummary] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [inventarioResult, setInventarioResult] = useState('Todavia no has consultado inventario disponible.');
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [inventarioItems, setInventarioItems] = useState([]);
  const [recentSelections, setRecentSelections] = useState([]);
  const cantidadInputRef = useRef(null);

  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await loadSession();

        if (!session) {
          return;
        }

        const restoredUser = session.usuario || session.authUser || null;
        const restoredSedeId =
          session.sedeId || extractSedeIdFromUser(restoredUser) || SHADOW_DEFAULT_SEDE_ID;

        setBearerToken(session.token || '');
        setAuthUser(restoredUser);
        setUsuarioId(session.usuarioId || restoredUser?._id || '');
        setSedeId(restoredSedeId);
        setCajaId(session.cajaId || SHADOW_DEFAULT_CAJA_ID);
        setMetodoPago(session.metodoPago || 'efectivo');
        setRecentSelections(session.recentSelections || []);
        setAuthResult(
          `Sesion restaurada: ${restoredUser?.email || 'usuario'}`
        );
      } catch (error) {
        setAuthResult('No se pudo restaurar la sesión guardada.');
      } finally {
        setRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    async function persistSessionPreferences() {
      if (!bearerToken || !authUser?._id) {
        return;
      }

      try {
        await saveSession({
          token: bearerToken,
          usuario: authUser,
          usuarioId,
          sedeId,
          cajaId,
          metodoPago,
          recentSelections,
        });
      } catch (error) {
      }
    }

    persistSessionPreferences();
  }, [bearerToken, authUser, usuarioId, sedeId, cajaId, metodoPago, recentSelections]);

  const totalVenta = useMemo(() => {
    return items.reduce((acc, item) => acc + item.subtotal, 0);
  }, [items]);

  const sugerenciasInventario = useMemo(() => {
    const texto = productoNombre.trim().toLowerCase();

    const normalizedItems = inventarioItems.map((item) => {
      const nombre = String(item.productoNombre || '').toLowerCase();
      const stock = Number(item.stockDisponible || 0);

      let rank = 3;

      if (!texto) {
        rank = 0;
      } else if (nombre === texto) {
        rank = 0;
      } else if (nombre.startsWith(texto)) {
        rank = 1;
      } else if (nombre.includes(texto)) {
        rank = 2;
      }

      return {
        item,
        nombre,
        stock,
        rank,
      };
    });

    return normalizedItems
      .filter((entry) => {
        if (!texto) {
          return true;
        }

        return entry.rank < 3;
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
      .map((entry) => entry.item)
      .slice(0, 8);
  }, [inventarioItems, productoNombre]);

  function resetForm() {
    setProductoNombre('');
    setUnidadVenta('kg');
    setCantidad('');
    setPrecioUnitario('');
    setSelectedInventario(null);
    setFormError('');
    setEditingItemId(null);
  }

  function buildPayloadLocal() {
    return {
      fechaLocal: new Date().toISOString(),
      metodoPago,
      notas: notas.trim(),
      items: items.map((item) => ({
        productoNombre: item.productoNombre,
        unidadVenta: item.unidadVenta,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      total: totalVenta,
    };
  }

  function buildContratoCarritoReal() {
    return {
      sedeId: sedeId.trim() || 'PENDIENTE_SEDE_ID',
      ...(usuarioId.trim() ? { usuarioId: usuarioId.trim() } : {}),
      items: items.map((item) => ({
        productoNombre: item.productoNombre,
        unidadVenta: item.unidadVenta,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      })),
      notas: notas.trim(),
    };
  }

  function buildPreviewObject(carritoIdValue = '', ventaIdValue = '') {
    return {
      payloadLocal: buildPayloadLocal(),
      contratoCarritoReal: buildContratoCarritoReal(),
      contratoVentaReal: {
        carritoId: carritoIdValue || 'PENDIENTE_ID_DEL_CARRITO_CREADO',
        cajaId: cajaId.trim() || 'PENDIENTE_CAJA_ID',
        metodoPago,
        notas: notas.trim(),
      },
      idsCreados: {
        carritoId: carritoIdValue || null,
        ventaId: ventaIdValue || null,
      },
    };
  }

  function handleProductoNombreChange(value) {
    setProductoNombre(value);

    if (selectedInventario && value !== selectedInventario.productoNombre) {
      setSelectedInventario(null);
      setUnidadVenta('kg');
      setPrecioUnitario('');
    }

    setFormError('');
  }

  function buildRecentEntry(item) {
    return {
      _id: item._id,
      productoNombre: item.productoNombre,
      unidadBase: item.unidadBase,
      stockDisponible: item.stockDisponible,
      costoPromedio: item.costoPromedio,
      activo: item.activo,
    };
  }

  function addRecentSelection(item) {
    const recentEntry = buildRecentEntry(item);
    const uniqueKey = `${recentEntry.productoNombre}::${recentEntry.unidadBase}`;

    setRecentSelections((current) => {
      const filtered = current.filter((entry) => {
        return `${entry.productoNombre}::${entry.unidadBase}` !== uniqueKey;
      });

      return [recentEntry, ...filtered].slice(0, 6);
    });
  }

  function syncRecentSelectionsWithInventario(nextInventarioItems) {
    setRecentSelections((current) => {
      return current
        .map((recentItem) => {
          const updatedItem = nextInventarioItems.find((inventarioItem) => {
            useEffect(() => {
    async function hydrateCajaOperativaLabel() {
      if (!String(cajaId || '').trim()) {
        if ((authUser?.email || '') === 'admin.shadow@kingfruver.local') {
          setCajaOperativaLabel('Caja Shadow (CJSH01)');
          return;
        }

        setCajaOperativaLabel('sin caja');
        return;
      }

      if (!String(bearerToken || '').trim() || !String(sedeId || '').trim()) {
        setCajaOperativaLabel('configurada');
        return;
      }

      try {
        const response = await getCajas({
          token: bearerToken,
          sedeId,
          activo: true,
        });

        const rows = response && response.data ? response.data : [];
        const match = rows.find((caja) => caja && caja._id === cajaId);

        if (match) {
          const nombre = match.nombre || 'Caja';
          const codigo = match.codigo ? ' (' + match.codigo + ')' : '';
          setCajaOperativaLabel(nombre + codigo);
          return;
        }

        setCajaOperativaLabel('configurada');
      } catch (error) {
        setCajaOperativaLabel('configurada');
      }
    }

    hydrateCajaOperativaLabel();
  }, [bearerToken, sedeId, cajaId, authUser]);

  return (
              inventarioItem.productoNombre === recentItem.productoNombre &&
              inventarioItem.unidadBase === recentItem.unidadBase
            );
          });

          if (!updatedItem) {
            return null;
          }

          return buildRecentEntry(updatedItem);
        })
        .filter(Boolean)
        .slice(0, 6);
    });
  }

  function handleSelectInventarioItem(item) {
    setSelectedInventario(item);
    setProductoNombre(item.productoNombre);
    setUnidadVenta(item.unidadBase);
    setPrecioUnitario(String(item.costoPromedio ?? ''));
    addRecentSelection(item);
    setFormError('');

    setTimeout(() => {
      if (cantidadInputRef.current && typeof cantidadInputRef.current.focus === 'function') {
        cantidadInputRef.current.focus();
      }
    }, 80);
  }

  function handleAgregarOActualizarItem() {
    const nombreLimpio = productoNombre.trim();
    const cantidadNumero = parseDecimalInput(cantidad);
    const precioNumero = parseDecimalInput(precioUnitario);

    if (!selectedInventario) {
      setFormError('Debes escoger el producto desde las sugerencias de inventario.');
      return;
    }

    if (selectedInventario.productoNombre !== nombreLimpio) {
      setFormError('El producto ya no coincide con la sugerencia elegida. Seleccionalo otra vez.');
      return;
    }

    if (selectedInventario.unidadBase !== unidadVenta) {
      setFormError('La unidad debe salir del inventario seleccionado.');
      return;
    }

    if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      setFormError('La cantidad debe ser un numero mayor que cero.');
      return;
    }

    if (isIntegerUnit(unidadVenta) && !Number.isInteger(cantidadNumero)) {
      setFormError(`La unidad ${unidadVenta} solo permite cantidades enteras.`);
      return;
    }

    if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
      setFormError('El precio desde inventario no es valido.');
      return;
    }

    const existingMatchingItem = !editingItemId
      ? items.find((item) => {
          return (
            item.productoNombre === nombreLimpio &&
            item.unidadVenta === unidadVenta &&
            Number(item.precioUnitario) === precioNumero
          );
        })
      : null;

    const cantidadTotalPropuesta = existingMatchingItem
      ? Number(existingMatchingItem.cantidad) + cantidadNumero
      : cantidadNumero;

    if (cantidadTotalPropuesta > Number(selectedInventario.stockDisponible || 0)) {
      setFormError(
        `La cantidad total supera el stock disponible (${selectedInventario.stockDisponible}).`
      );
      return;
    }

    const inventarioRef = {
      _id: selectedInventario._id,
      productoNombre: selectedInventario.productoNombre,
      unidadBase: selectedInventario.unidadBase,
      stockDisponible: selectedInventario.stockDisponible,
      costoPromedio: selectedInventario.costoPromedio,
      activo: selectedInventario.activo,
    };

    const itemBase = {
      productoNombre: nombreLimpio,
      unidadVenta,
      cantidad: cantidadNumero,
      precioUnitario: precioNumero,
      subtotal: cantidadNumero * precioNumero,
      inventarioRef,
    };

    if (editingItemId) {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === editingItemId ? { ...item, ...itemBase } : item
        )
      );
      resetForm();
      return;
    }

    if (existingMatchingItem) {
      setItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== existingMatchingItem.id) {
            return item;
          }

          const nuevaCantidad = Number(item.cantidad) + cantidadNumero;

          return {
            ...item,
            productoNombre: nombreLimpio,
            unidadVenta,
            cantidad: nuevaCantidad,
            precioUnitario: precioNumero,
            subtotal: nuevaCantidad * precioNumero,
            inventarioRef,
          };
        })
      );
      resetForm();
      return;
    }

    const nuevoItem = {
      id: String(Date.now()),
      ...itemBase,
    };

    setItems((currentItems) => [nuevoItem, ...currentItems]);
    resetForm();
  }

  function handleEliminarItem(itemId) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

    if (editingItemId === itemId) {
      resetForm();
    }
  }

  function handleEditarItem(item) {
    setProductoNombre(item.productoNombre);
    setUnidadVenta(item.unidadVenta);
    setCantidad(formatQuantityForInput(item.cantidad));
    setPrecioUnitario(String(item.precioUnitario));
    setSelectedInventario(item.inventarioRef || null);
    setFormError('');
    setEditingItemId(item.id);
  }

  function handleCancelarEdicion() {
    resetForm();
  }

  function handleVaciarCarritoLocal() {
    setItems([]);
    setCarritoCreadoId('');
    setVentaCreadaId('');
    setPayloadPreview('');
    setCarritoResult('Todavia no has intentado crear el carrito real.');
    setVentaResult('Todavia no has intentado crear la venta real.');
    setLastSaleSummary(null);
    resetForm();
  }

  function handlePrepararPayload() {
    if (items.length === 0) {
      setPayloadPreview('Debes agregar al menos un item antes de preparar el payload.');
      return;
    }

    setPayloadPreview(
      JSON.stringify(buildPreviewObject(carritoCreadoId, ventaCreadaId), null, 2)
    );
  }

  async function handleCargarInventarioDisponible() {
    if (!bearerToken.trim()) {
      setInventarioResult('Primero valida acceso en Home para consultar inventario.');
      return;
    }

    if (!sedeId.trim()) {
      setInventarioResult('Debes tener un sedeId valido antes de consultar inventario.');
      return;
    }

    try {
      setLoadingInventario(true);
      setInventarioResult('Consultando inventario disponible en shadow...');

      const response = await getInventarioDisponible({
        sedeId: sedeId.trim(),
        token: bearerToken.trim(),
      });

      const disponibles = (response?.data || []).filter((item) => {
        return item.activo === true && Number(item.stockDisponible) > 0;
      });

      setInventarioItems(disponibles);
      syncRecentSelectionsWithInventario(disponibles);
      setInventarioResult(
        `Inventario cargado: ${disponibles.length} registros disponibles para la sede.`
      );
    } catch (error) {
      setInventarioItems([]);
      setInventarioResult(`Error: ${error.message}`);
    } finally {
      setLoadingInventario(false);
    }
  }

  async function handleCrearCarritoReal() {
    if (!bearerToken.trim()) {
      setCarritoResult('Primero valida acceso en Home para crear el carrito real.');
      return;
    }

    if (!sedeId.trim()) {
      setCarritoResult('Debes tener un sedeId valido antes de crear el carrito.');
      return;
    }

    if (items.length === 0) {
      setCarritoResult('Debes agregar al menos un item antes de crear el carrito real.');
      return;
    }

    try {
      setCreatingCarrito(true);
      setCarritoResult('Creando carrito real en shadow...');

      const payload = buildContratoCarritoReal();
      const response = await createCarrito(payload, bearerToken.trim());
      const createdId = response?.data?._id || '';

      setCarritoCreadoId(createdId);
      setVentaCreadaId('');
      setCarritoResult(JSON.stringify(response, null, 2));
      setPayloadPreview(JSON.stringify(buildPreviewObject(createdId, ''), null, 2));
    } catch (error) {
      setCarritoResult(`Error: ${error.message}`);
    } finally {
      setCreatingCarrito(false);
    }
  }

  async function handleConsultarCarritos() {
    if (!bearerToken.trim()) {
      setCarritosQueryResult('Primero valida acceso en Home para consultar carritos.');
      return;
    }

    if (!sedeId.trim()) {
      setCarritosQueryResult('Debes tener un sedeId valido antes de consultar carritos.');
      return;
    }

    try {
      setLoadingCarritos(true);
      setCarritosQueryResult('Consultando carritos activos en shadow...');

      const response = await getCarritos(
        {
          estado: 'activo',
          sedeId: sedeId.trim(),
          ...(usuarioId.trim() ? { usuarioId: usuarioId.trim() } : {}),
        },
        bearerToken.trim()
      );

      setCarritosQueryResult(JSON.stringify(response, null, 2));
    } catch (error) {
      setCarritosQueryResult(`Error: ${error.message}`);
    } finally {
      setLoadingCarritos(false);
    }
  }

  async function handleCrearVentaReal() {
    if (!bearerToken.trim()) {
      setVentaResult('Primero valida acceso en Home para crear la venta real.');
      return;
    }

    if (!carritoCreadoId.trim()) {
      setVentaResult('Primero debes crear el carrito real.');
      return;
    }

    if (!cajaId.trim()) {
      setVentaResult('Debes tener un cajaId valido antes de crear la venta.');
      return;
    }

    try {
      setCreatingVenta(true);
      setVentaResult('Creando venta real en shadow...');

      const payload = {
        carritoId: carritoCreadoId.trim(),
        cajaId: cajaId.trim(),
        metodoPago,
        notas: notas.trim(),
      };

      const response = await createVenta(payload, bearerToken.trim());
      const createdId = response?.data?._id || '';

      setVentaCreadaId(createdId);
      setVentaResult(JSON.stringify(response, null, 2));
      setPayloadPreview(JSON.stringify(buildPreviewObject(carritoCreadoId, createdId), null, 2));
      setLastSaleSummary({
        ventaId: createdId,
        cajaId: cajaId.trim(),
        metodoPago,
        totalVenta,
        itemsCount: items.length,
        productos: items.map((item) => `${item.productoNombre} (${item.cantidad} ${item.unidadVenta})`),
      });
      setItems([]);
      setCarritoCreadoId('');
      resetForm();
    } catch (error) {
      setVentaResult(`Error: ${error.message}`);
    } finally {
      setCreatingVenta(false);
    }
  }

  return (
    <AppShell
      title="Ventas"
      subtitle="Primer modulo real"
      description="Venta real + productos obligatoriamente seleccionados desde inventario."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contexto operativo</Text>

        <Text style={styles.cardText}>
          Usuario: {authUser?.email || 'sin usuario'}
        </Text>
        <Text style={styles.cardText}>
          Sede: {authUser?.sedeId?.nombre || authUser?.sedeId?.codigo || (sedeId ? 'configurada' : 'sin sede')}
        </Text>
        <Text style={styles.cardText}>
          Caja operativa: {(cajaOperativaLabel === 'sin caja' && (authUser?.email || '') === 'admin.shadow@kingfruver.local') ? 'Caja Shadow (CJSH01)' : cajaOperativaLabel}
        </Text>
        <Text style={styles.cardText}>
          Método de pago: {metodoPago}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Productos disponibles</Text>

        {recentSelections.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.label}>Recientes</Text>
            <View style={styles.recentChipsRow}>
              {recentSelections.map((item) => (
                <Pressable
                  key={`recent-${item.productoNombre}-${item.unidadBase}`}
                  style={styles.recentChip}
                  onPress={() => handleSelectInventarioItem(item)}
                >
                  <Text style={styles.recentChipTitle}>
                    {item.productoNombre} ({item.unidadBase})
                  </Text>
                  <Text style={styles.recentChipMeta}>
                    Stock: {item.stockDisponible}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.queryButton} onPress={handleCargarInventarioDisponible}>
          <Text style={styles.queryButtonText}>Cargar inventario disponible</Text>
        </Pressable>

        {loadingInventario ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Text style={styles.payloadText}>{inventarioResult}</Text>

        {sugerenciasInventario.length > 0 ? (
          <View style={styles.suggestionsBox}>
            <Text style={styles.label}>Sugerencias</Text>

            {sugerenciasInventario.map((item) => {
              const isSelectedSuggestion =
                selectedInventario &&
                selectedInventario.productoNombre === item.productoNombre &&
                selectedInventario.unidadBase === item.unidadBase;

              return (
                <Pressable
                  key={`${item._id}-${item.unidadBase}`}
                  style={[
                    styles.suggestionItem,
                    isSelectedSuggestion && styles.suggestionItemSelected,
                  ]}
                  onPress={() => handleSelectInventarioItem(item)}
                >
                  <View style={styles.suggestionHeaderRow}>
                    <Text
                      style={[
                        styles.suggestionTitle,
                        isSelectedSuggestion && styles.suggestionTitleSelected,
                      ]}
                    >
                      {item.productoNombre} ({item.unidadBase})
                    </Text>

                    {isSelectedSuggestion ? (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Elegido</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.suggestionMeta,
                      isSelectedSuggestion && styles.suggestionMetaSelected,
                    ]}
                  >
                    Stock: {item.stockDisponible} | Costo ref: {formatCurrency(item.costoPromedio || 0)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {editingItemId ? 'Editar item' : 'Agregar item'}
        </Text>

        <Text style={styles.label}>Producto</Text>
        <TextInput
          value={productoNombre}
          onChangeText={handleProductoNombreChange}
          placeholder="Escribe y luego toca una sugerencia"
          style={styles.input}
        />

        {selectedInventario ? (
          <View style={styles.selectedBox}>
            <View style={styles.selectedBoxTopRow}>
              <Text style={styles.selectedBoxTitle}>Producto activo para vender</Text>
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>Listo</Text>
              </View>
            </View>

            <Text style={styles.selectedBoxText}>
              {selectedInventario.productoNombre} ({selectedInventario.unidadBase})
            </Text>
            <Text style={styles.selectedBoxText}>
              Stock disponible: {selectedInventario.stockDisponible}
            </Text>
            <Text style={styles.selectedBoxText}>
              Precio desde inventario: {formatCurrency(selectedInventario.costoPromedio || 0)}
            </Text>
          </View>
        ) : (
          <Text style={styles.helperText}>
            Debes escoger el producto desde las sugerencias de inventario.
          </Text>
        )}

        <Text style={styles.label}>Unidad de venta</Text>
        <TextInput
          value={unidadVenta}
          editable={false}
          style={styles.inputDisabled}
        />

        <Text style={styles.label}>Cantidad</Text>
        <TextInput
          ref={cantidadInputRef}
          value={cantidad}
          onChangeText={setCantidad}
          placeholder={isIntegerUnit(unidadVenta) ? 'Ej: 2' : 'Ej: 0,25'}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Precio unitario desde inventario</Text>
        <TextInput
          value={precioUnitario}
          editable={false}
          placeholder="Se llena desde inventario"
          style={styles.inputDisabled}
        />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleAgregarOActualizarItem}>
          <Text style={styles.primaryButtonText}>
            {editingItemId ? 'Guardar cambios' : 'Agregar item'}
          </Text>
        </Pressable>

        {editingItemId ? (
          <Pressable style={styles.cancelEditButton} onPress={handleCancelarEdicion}>
            <Text style={styles.cancelEditButtonText}>Cancelar edicion</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notas y metodo de pago</Text>
        <TextInput
          value={notas}
          onChangeText={setNotas}
          placeholder="Ej: Venta de prueba desde frontend shadow"
          multiline
          textAlignVertical="top"
          style={styles.notesInput}
        />

        <Text style={styles.label}>Método de pago</Text>
        <View style={styles.methodRow}>
          {['efectivo', 'transferencia', 'mixto', 'otro'].map((method) => {
            const active = metodoPago === method;
            return (
              <Pressable
                key={method}
                style={[styles.methodButton, active && styles.methodButtonActive]}
                onPress={() => setMetodoPago(method)}
              >
                <Text style={[styles.methodButtonText, active && styles.methodButtonTextActive]}>
                  {method}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.prepareButton} onPress={handlePrepararPayload}>
          <Text style={styles.prepareButtonText}>Preparar payload local</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Flujo real</Text>

        <Pressable style={styles.realButton} onPress={handleCrearCarritoReal}>
          <Text style={styles.realButtonText}>Crear carrito real en shadow</Text>
        </Pressable>

        {creatingCarrito ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        {carritoCreadoId ? (
          <Text style={styles.successText}>carritoId creado: {carritoCreadoId}</Text>
        ) : null}

        <Pressable style={styles.queryButton} onPress={handleConsultarCarritos}>
          <Text style={styles.queryButtonText}>Consultar carritos activos</Text>
        </Pressable>

        {loadingCarritos ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Pressable style={styles.saleButton} onPress={handleCrearVentaReal}>
          <Text style={styles.saleButtonText}>Crear venta real en shadow</Text>
        </Pressable>

        {creatingVenta ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        {ventaCreadaId ? (
          <Text style={styles.successText}>ventaId creada: {ventaCreadaId}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Herramientas</Text>

        <Pressable
          style={styles.technicalToggleButton}
          onPress={() => setShowTechnicalDetails((current) => !current)}
        >
          <Text style={styles.technicalToggleButtonText}>
            {showTechnicalDetails ? 'Ocultar detalles tecnicos' : 'Mostrar detalles tecnicos'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen provisional</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Items</Text>
            <Text style={styles.summaryChipValue}>{items.length}</Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Metodo</Text>
            <Text style={styles.summaryChipValue}>{metodoPago}</Text>
          </View>
        </View>

        <Text style={styles.summaryTotal}>Total: {formatCurrency(totalVenta)}</Text>

        <Pressable style={styles.clearCartButton} onPress={handleVaciarCarritoLocal}>
          <Text style={styles.clearCartButtonText}>Vaciar carrito local</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items cargados</Text>

        {selectedInventario ? (
          <View style={styles.stockHighlightBox}>
            <Text style={styles.stockHighlightTitle}>
              Producto elegido: {selectedInventario.productoNombre} ({selectedInventario.unidadBase})
            </Text>
            <Text style={styles.stockHighlightText}>
              Stock disponible actual: {selectedInventario.stockDisponible}
            </Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <Text style={styles.emptyText}>Todavia no has agregado items.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productoNombre}</Text>
                <Text style={styles.itemMeta}>
                  Cantidad: {item.cantidad} {item.unidadVenta} | Unitario: {formatCurrency(item.precioUnitario)}
                </Text>
                <Text style={styles.itemMeta}>
                  Subtotal: {formatCurrency(item.subtotal)}
                </Text>
              </View>

              <View style={styles.itemActions}>
                <Text style={styles.itemSubtotal}>
                  {formatCurrency(item.subtotal)}
                </Text>

                <Pressable
                  style={styles.editButton}
                  onPress={() => handleEditarItem(item)}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleEliminarItem(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {lastSaleSummary ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerTitle}>Venta creada con exito</Text>
          <Text style={styles.successBannerText}>ventaId: {lastSaleSummary.ventaId}</Text>
          <Text style={styles.successBannerText}>cajaId: {lastSaleSummary.cajaId}</Text>
          <Text style={styles.successBannerText}>metodoPago: {lastSaleSummary.metodoPago}</Text>
          <Text style={styles.successBannerText}>total: {formatCurrency(lastSaleSummary.totalVenta)}</Text>
          <Text style={styles.successBannerText}>items: {lastSaleSummary.itemsCount}</Text>
          <Text style={styles.successBannerText}>
            productos: {lastSaleSummary.productos.join(' | ')}
          </Text>
        </View>
      ) : null}

      {showTechnicalDetails ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payload local y contratos reales</Text>
            <Text style={styles.payloadText}>
              {payloadPreview || 'Todavia no has preparado el payload.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado de crear carrito real</Text>
            <Text style={styles.payloadText}>{carritoResult}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado de consultar carritos</Text>
            <Text style={styles.payloadText}>{carritosQueryResult}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado de crear venta real</Text>
            <Text style={styles.payloadText}>{ventaResult}</Text>
          </View>
        </>
      ) : null}

      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
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
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  helperText: {
    width: '100%',
    fontSize: 13,
    lineHeight: 20,
    color: '#6b7280',
    marginBottom: 12,
  },
  selectedBox: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  selectedBoxTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  selectedPill: {
    backgroundColor: '#dbeafe',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  selectedBoxText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e3a8a',
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
  inputDisabled: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
    fontSize: 16,
    color: '#374151',
  },
  notesInput: {
    width: '100%',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    fontSize: 16,
  },
  presetRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#eef2ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  presetButtonText: {
    color: '#3730a3',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  sessionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  methodRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  methodButton: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  methodButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  methodButtonTextActive: {
    color: '#ffffff',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 10,
  },
  loginButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  prepareButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  prepareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  realButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  realButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  queryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  queryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saleButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  saleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 12,
  },
  cancelEditButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelEditButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 15,
    marginBottom: 8,
    color: '#4b5563',
  },
  summaryRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  summaryTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  clearCartButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  clearCartButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
  stockHighlightBox: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stockHighlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 4,
  },
  stockHighlightText: {
    fontSize: 14,
    color: '#1e3a8a',
  },
  recentSection: {
    width: '100%',
    marginBottom: 12,
  },
  recentChipsRow: {
    width: '100%',
  },
  recentChip: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  recentChipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 2,
  },
  recentChipMeta: {
    fontSize: 12,
    color: '#9a3412',
  },
  suggestionsBox: {
    width: '100%',
    marginTop: 12,
  },
  suggestionItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  suggestionItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  suggestionHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  suggestionTitleSelected: {
    color: '#1d4ed8',
  },
  selectedBadge: {
    backgroundColor: '#dbeafe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  suggestionMeta: {
    fontSize: 13,
    color: '#4b5563',
  },
  suggestionMetaSelected: {
    color: '#1e40af',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#dbeafe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  editButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#b42318',
    fontSize: 14,
    fontWeight: '600',
  },
  payloadText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#111827',
  },
  successBanner: {
    width: '100%',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  successBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 10,
  },
  successBannerText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#166534',
    marginBottom: 2,
  },
});
