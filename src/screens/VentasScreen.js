import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppShell from '../components/AppShell';
import { cancelCarrito, createCarrito, getCarritos } from '../services/carritoService';
import { createVenta, devolverVenta, devolverVentaParcial, getVentaDetalle, getVentas } from '../services/ventaService';
import { getInventarioDisponible } from '../services/inventarioService';
import { loadSession, saveSession } from '../services/sessionService';
import { getCajas } from '../services/cajaService';
import { getRoleCode } from '../utils/accessControl';
import { getActiveEnvironment } from '../config/environments';

function getVentasEnvironment() {
  return getActiveEnvironment();
}

function getDefaultSedeId() {
  return getVentasEnvironment().defaultSedeId;
}

function getDefaultCajaId() {
  return getVentasEnvironment().defaultCajaId;
}

function getDefaultSedeLabel() {
  return getVentasEnvironment().defaultSedeLabel;
}

function getDefaultCajaLabel() {
  return getVentasEnvironment().defaultCajaLabel;
}

function getEnvironmentAdminEmail() {
  return getVentasEnvironment().adminEmail;
}

function getEnvironmentLabelLower() {
  return getVentasEnvironment().label.toLowerCase();
}

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

function getPrecioDeVenta(item) {
  const value = Number(item?.precioDeVenta);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function hasPrecioDeVenta(item) {
  return getPrecioDeVenta(item) !== null;
}

function formatPrecioDeVenta(item) {
  const precio = getPrecioDeVenta(item);
  return precio === null ? 'sin configurar' : formatCurrency(precio);
}

function extractCarritoItems(carrito) {
  if (Array.isArray(carrito?.items)) return carrito.items;
  if (Array.isArray(carrito?.productos)) return carrito.productos;
  if (Array.isArray(carrito?.detalle)) return carrito.detalle;
  return [];
}

function getUserDisplayName(user) {
  return user?.email || user?.nombre || 'sin responsable';
}

function getShortId(value) {
  const text = String(value || '');
  return text.length <= 8 ? text : text.slice(-6);
}

function formatDateTime(value) {
  if (!value) {
    return 'sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('es-CO');
}

function buildCarritoProductLines(carrito) {
  const carritoItems = extractCarritoItems(carrito);

  if (carritoItems.length === 0) {
    return ['Sin detalle de productos'];
  }

  return carritoItems.map((item) => {
    const nombre = item?.productoNombre || item?.nombre || 'Producto';
    const cantidadItem = Number(item?.cantidad);
    const unidadItem = item?.unidadVenta || item?.unidad || 'und';
    const subtotalItem = Number(item?.subtotal);
    const cantidadTexto = Number.isFinite(cantidadItem) ? cantidadItem : 0;
    const subtotalTexto = Number.isFinite(subtotalItem)
      ? ` = ${formatCurrency(subtotalItem)}`
      : '';

    return `${nombre} (${cantidadTexto} ${unidadItem})${subtotalTexto}`;
  });
}

function buildCarritoProductSummary(carrito) {
  return buildCarritoProductLines(carrito).join(' | ');
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
  const [sedeId, setSedeId] = useState(() => getDefaultSedeId());
  const [usuarioId, setUsuarioId] = useState('');
  const [cajaId, setCajaId] = useState(() => getDefaultCajaId());
  const [cajaOperativaLabel, setCajaOperativaLabel] = useState('sin caja');
  const [cajaRealAbierta, setCajaRealAbierta] = useState(false);
  const [cajaEstadoOperativo, setCajaEstadoOperativo] = useState('sin validar');
  const [bearerToken, setBearerToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authResult, setAuthResult] = useState('Todavía no has iniciado sesión.');
  const [loggingIn, setLoggingIn] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [payloadPreview, setPayloadPreview] = useState('');
  const [carritoResult, setCarritoResult] = useState('Todavía no has intentado crear el carrito real.');
  const [creatingCarrito, setCreatingCarrito] = useState(false);
  const [carritoCreadoId, setCarritoCreadoId] = useState('');
  const [carritosQueryResult, setCarritosQueryResult] = useState('Todavía no has consultado carritos.');
  const [carritosActivos, setCarritosActivos] = useState([]);
  const [carritoSeleccionadoActivo, setCarritoSeleccionadoActivo] = useState(null);
  const [ventaConfirmada, setVentaConfirmada] = useState(false);
  const [loadingCarritos, setLoadingCarritos] = useState(false);
  const [cancellingCarrito, setCancellingCarrito] = useState(false);
  const [motivoCancelacionCarrito, setMotivoCancelacionCarrito] = useState('');
  const [returningVentaId, setReturningVentaId] = useState('');
  const [returnConfirmVentaId, setReturnConfirmVentaId] = useState('');
  const [returnVentaNotice, setReturnVentaNotice] = useState({ ventaId: '', message: '' });

  const [returnMode, setReturnMode] = useState('total');
  const [partialReturnVentaId, setPartialReturnVentaId] = useState('');
  const [partialReturnItems, setPartialReturnItems] = useState([]);
  const [partialReturnSubmittingVentaId, setPartialReturnSubmittingVentaId] = useState('');
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [loadingVentasRecientes, setLoadingVentasRecientes] = useState(false);
  const [ventasRecientesNotice, setVentasRecientesNotice] = useState('');
  const [ventaResult, setVentaResult] = useState('Todavía no has intentado crear la venta real.');
  const [creatingVenta, setCreatingVenta] = useState(false);
  const [ventaCreadaId, setVentaCreadaId] = useState('');
  const [lastSaleSummary, setLastSaleSummary] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [inventarioResult, setInventarioResult] = useState('Todavía no has consultado inventario disponible.');
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [inventarioItems, setInventarioItems] = useState([]);
  const [recentSelections, setRecentSelections] = useState([]);
  const cantidadInputRef = useRef(null);
  const roleCode = getRoleCode(authUser);
  const isCajero = roleCode === 'cajero';

  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await loadSession();

        if (!session) {
          return;
        }

        const restoredUser = session.usuario || session.authUser || null;
        const restoredSedeId =
          session.sedeId || extractSedeIdFromUser(restoredUser) || getDefaultSedeId();

        setBearerToken(session.token || '');
        setAuthUser(restoredUser);
        setUsuarioId(session.usuarioId || restoredUser?._id || '');
        setSedeId(restoredSedeId);
        setCajaId(session.cajaId || getDefaultCajaId());
        setMetodoPago(session.metodoPago || 'efectivo');
        setRecentSelections(session.recentSelections || []);
        setAuthResult(
          `Sesión restaurada: ${restoredUser?.email || 'usuario'}`
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
      precioDeVenta: item.precioDeVenta,
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
        .filter(Boolean);
    });
  }

  useEffect(() => {
    async function hydrateCajaOperativaLabel() {
      if (!String(cajaId || '').trim()) {
        setCajaRealAbierta(false);
        setCajaEstadoOperativo('sin caja');

        if ((authUser?.email || '') === getEnvironmentAdminEmail()) {
          setCajaOperativaLabel(getDefaultCajaLabel());
          return;
        }

        setCajaOperativaLabel('sin caja');
        return;
      }

      if (!String(bearerToken || '').trim() || !String(sedeId || '').trim()) {
        setCajaRealAbierta(false);
        setCajaEstadoOperativo('sin validar');
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
          const codigo = match.codigo ? ` (${match.codigo})` : '';
          const estadoNormalizado = String(match.estado || '').trim().toLowerCase();
          const abierta = estadoNormalizado === 'abierta';

          setCajaOperativaLabel(nombre + codigo);
          setCajaRealAbierta(abierta);
          setCajaEstadoOperativo(abierta ? 'abierta' : (match.estado || 'cerrada'));
          return;
        }

        setCajaRealAbierta(false);
        setCajaEstadoOperativo('no encontrada');
        setCajaOperativaLabel('configurada');
      } catch (error) {
        setCajaRealAbierta(false);
        setCajaEstadoOperativo('sin validar');
        setCajaOperativaLabel('configurada');
      }
    }

    hydrateCajaOperativaLabel();
  }, [bearerToken, sedeId, cajaId, authUser]);

  function handleSelectInventarioItem(item) {
    const precioDeVenta = getPrecioDeVenta(item);

    setSelectedInventario(item);
    setProductoNombre(item.productoNombre);
    setUnidadVenta(item.unidadBase);
    setPrecioUnitario(precioDeVenta === null ? '' : String(precioDeVenta));
    addRecentSelection(item);

    if (precioDeVenta === null) {
      setFormError(
        'Este producto no tiene precio de venta configurado. Pideselo al administrador en Productos.'
      );
      return;
    }

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

    if (!hasPrecioDeVenta(selectedInventario)) {
      setFormError(
        'Este producto no tiene precio de venta configurado. Pideselo al administrador en Productos.'
      );
      return;
    }

    const precioConfigurado = getPrecioDeVenta(selectedInventario);

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

    if (precioNumero !== precioConfigurado) {
      setFormError('El precio debe salir del precio de venta configurado.');
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
      precioDeVenta: selectedInventario.precioDeVenta,
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
    setCarritoResult('Todavía no has intentado crear el carrito real.');
    setVentaResult('Todavía no has intentado crear la venta real.');
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
      setInventarioResult(`Consultando inventario disponible en ${getEnvironmentLabelLower()}...`);

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
      setCarritoResult(`Creando carrito real en ${getEnvironmentLabelLower()}...`);
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
      setCarritosQueryResult(`Consultando carritos activos en ${getEnvironmentLabelLower()}...`);

      const response = await getCarritos(
        {
          estado: 'activo',
          sedeId: sedeId.trim(),
          ...(isCajero ? { cobrables: true } : {}),
          ...(!isCajero && usuarioId.trim() ? { usuarioId: usuarioId.trim() } : {}),
        },
        bearerToken.trim()
      );

      const activos = Array.isArray(response?.data) ? response.data : [];
      const selectedStillActive = activos.find((carrito) => carrito?._id === carritoCreadoId);

      setCarritosActivos(activos);

      if (carritoCreadoId) {
        setVentaConfirmada(false);

        if (selectedStillActive) {
          setCarritoSeleccionadoActivo(selectedStillActive);
        } else {
          setCarritoCreadoId('');
          setCarritoSeleccionadoActivo(null);
        }
      }

      if (isCajero && activos.length === 0) {
        setCarritosQueryResult('No hay carritos cobrables para esta sede.');
      } else {
        setCarritosQueryResult(`Carritos activos encontrados: ${activos.length}`);
      }
    } catch (error) {
      setCarritosActivos([]);
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

    if (!cajaRealAbierta) {
      setVentaResult('No hay una caja real abierta para esta sede. Ve a Cajas, abre una caja y vuelve a Ventas.');
      return;
    }

    if (!carritoCreadoId.trim()) {
      setVentaResult('Primero debes seleccionar un carrito activo.');
      return;
    }

    if (!cajaId.trim()) {
      setVentaResult('Debes tener un cajaId valido antes de crear la venta.');
      return;
    }

    const carritoIdParaVender = carritoCreadoId.trim();
    const carritoSeleccionadoPorId = carritosActivos.find(
      (carrito) => carrito?._id === carritoIdParaVender
    );
    const carritoParaVender =
      carritoSeleccionadoPorId ||
      (carritoSeleccionadoActivo?._id === carritoIdParaVender ? carritoSeleccionadoActivo : null);

    if (!carritoParaVender) {
      const message = 'Vuelve a consultar y selecciona un carrito activo antes de cobrar.';
      setVentaConfirmada(false);
      setVentaResult(message);
      Alert.alert('Carrito no confirmado', message);
      return;
    }

    if (!ventaConfirmada) {
      const message =
        'Antes de cobrar, confirma visualmente el carrito seleccionado: ID corto, total e items.';
      setVentaResult(message);
      Alert.alert('Confirma el carrito antes de cobrar', message);
      return;
    }

    try {
      setCreatingVenta(true);
      setVentaResult(`Creando venta real en ${getEnvironmentLabelLower()}...`);

      const payload = {
        carritoId: carritoIdParaVender,
        cajaId: cajaId.trim(),
        metodoPago,
        notas: notas.trim(),
      };
      const carritoIdVendido = carritoIdParaVender;

      const response = await createVenta(payload, bearerToken.trim());
      const createdId = response?.data?._id || '';
      const ventaCreada = response?.data || {};
      const carritoSeleccionadoPorId = carritosActivos.find(
        (carrito) => carrito?._id === carritoIdVendido
      );
      const carritoDesdeResponse =
        ventaCreada?.carritoId && typeof ventaCreada.carritoId === 'object'
          ? ventaCreada.carritoId
          : null;
      const carritoVenta =
        carritoSeleccionadoActivo ||
        carritoSeleccionadoPorId ||
        carritoDesdeResponse ||
        null;
      const itemsDeCarrito = extractCarritoItems(carritoVenta);
      const ventaItems = itemsDeCarrito.length > 0 ? itemsDeCarrito : items;
      const ventaTotal = Number(
        ventaCreada?.total ?? carritoVenta?.total ?? carritoSeleccionadoActivo?.total ?? totalVenta
      );
      const productosResumen = ventaItems.map((item) => {
        const nombre = item?.productoNombre || item?.nombre || 'Producto';
        const cantidadItem = Number(item?.cantidad);
        const unidadItem = item?.unidadVenta || item?.unidad || 'und';
        const cantidadTexto = Number.isFinite(cantidadItem) ? cantidadItem : 0;
        return `${nombre} (${cantidadTexto} ${unidadItem})`;
      });

      setVentaCreadaId(createdId);
      setVentaResult(JSON.stringify(response, null, 2));
      setPayloadPreview(JSON.stringify(buildPreviewObject(carritoCreadoId, createdId), null, 2));
      setLastSaleSummary({
        ventaId: createdId,
        cajaId: cajaId.trim(),
        metodoPago,
        totalVenta: Number.isFinite(ventaTotal) ? ventaTotal : 0,
        itemsCount: ventaItems.length,
        productos: productosResumen,
      });
      setCarritosActivos((current) =>
        current.filter((carrito) => carrito?._id !== carritoIdVendido)
      );
      setCarritoSeleccionadoActivo(null);
      setVentaConfirmada(false);
      setItems([]);
      setCarritoCreadoId('');
      resetForm();
    } catch (error) {
      setVentaResult(`Error: ${error.message}`);
    } finally {
      setCreatingVenta(false);
    }
  }

  function getReturnPendingQuantity(item) {
    const cantidad = Number(item?.cantidad || 0);
    const cantidadDevuelta = Number(item?.cantidadDevuelta || 0);

    return Math.max(cantidad - cantidadDevuelta, 0);
  }

  function isDivisibleReturnUnit(unidadVenta) {
    const normalizedUnit = String(unidadVenta || '').trim().toLowerCase();

    return [
      'kg',
      'kilo',
      'kilos',
      'kilogramo',
      'kilogramos',
      'lb',
      'libra',
      'libras',
      'g',
      'gr',
      'gramo',
      'gramos',
    ].includes(normalizedUnit);
  }

  function canPreparePartialReturn(venta) {
    const itemsVenta = Array.isArray(venta?.items) ? venta.items : [];

    if (itemsVenta.length > 1) {
      return true;
    }

    return itemsVenta.some((item) => {
      const pendiente = getReturnPendingQuantity(item);

      return pendiente > 1 || (pendiente > 0 && isDivisibleReturnUnit(item?.unidadVenta));
    });
  }

  async function handleLoadVentasRecientes() {
    const activeToken = String(bearerToken || '').trim();

    if (!activeToken) {
      const message = 'Primero valida acceso en Home para cargar ventas recientes.';
      setVentasRecientesNotice(message);
      setVentaResult(message);
      return;
    }

    try {
      setLoadingVentasRecientes(true);
      setVentasRecientesNotice('Cargando ventas recientes...');

      const response = await getVentas({}, activeToken);
      const rows = Array.isArray(response?.data) ? response.data : [];

      const visibles = rows
        .filter((venta) => ['completada', 'parcialmente_devuelta'].includes(venta?.estado))
        .sort((a, b) => {
          const aPartial = canPreparePartialReturn(a) ? 1 : 0;
          const bPartial = canPreparePartialReturn(b) ? 1 : 0;

          if (aPartial !== bPartial) {
            return bPartial - aPartial;
          }

          const aItems = Array.isArray(a?.items) ? a.items.length : 0;
          const bItems = Array.isArray(b?.items) ? b.items.length : 0;
          return bItems - aItems;
        });

      setVentasRecientes(visibles.slice(0, 20));

      const partialCandidateCount = visibles.filter((venta) => canPreparePartialReturn(venta)).length;
      const message = `Ventas recientes cargadas: ${visibles.slice(0, 20).length} | Candidatas parciales: ${partialCandidateCount}`;
      setVentasRecientesNotice(message);
      setVentaResult(message);
    } catch (error) {
      const message = `Error cargando ventas recientes: ${error.message}`;
      setVentasRecientesNotice(message);
      setVentaResult(message);
    } finally {
      setLoadingVentasRecientes(false);
    }
  }

  function buildPartialReturnItems(ventaDetalle) {
    const items = Array.isArray(ventaDetalle?.items) ? ventaDetalle.items : [];

    return items.map((item) => {
      const cantidad = Number(item?.cantidad || 0);
      const cantidadDevuelta = Number(item?.cantidadDevuelta || 0);
      const pendiente = Math.max(cantidad - cantidadDevuelta, 0);

      return {
        productoNombre: item?.productoNombre || '',
        unidadVenta: item?.unidadVenta || '',
        cantidad,
        cantidadDevuelta,
        pendiente,
        precioUnitario: Number(item?.precioUnitario || 0),
        cantidadSeleccionada: 0,
      };
    });
  }

  function normalizePartialReturnQuantityInput(value, pendiente) {
    const rawValue = String(value || '').replace(',', '.').trim();

    if (!rawValue) {
      return '';
    }

    if (rawValue === '-' || rawValue.includes('-')) {
      return '';
    }

    if (!/^\d*\.?\d*$/.test(rawValue)) {
      return '';
    }

    const numericValue = Number(rawValue);
    const maxValue = Number(pendiente || 0);

    if (!Number.isFinite(numericValue)) {
      return '';
    }

    if (numericValue < 0) {
      return '';
    }

    if (numericValue > maxValue) {
      return String(maxValue);
    }

    return rawValue;
  }

  function handlePartialReturnQuantityChange(index, value) {
    setPartialReturnItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          cantidadSeleccionada: normalizePartialReturnQuantityInput(value, item?.pendiente),
        };
      })
    );
  }

  function getPartialReturnTotal() {
    return partialReturnItems.reduce((total, item) => {
      const cantidadSeleccionada = Number(item?.cantidadSeleccionada || 0);
      const precioUnitario = Number(item?.precioUnitario || 0);
      const pendiente = Number(item?.pendiente || 0);

      if (
        !Number.isFinite(cantidadSeleccionada) ||
        cantidadSeleccionada <= 0 ||
        cantidadSeleccionada > pendiente
      ) {
        return total;
      }

      return total + cantidadSeleccionada * precioUnitario;
    }, 0);
  }

  function getSelectedPartialReturnItems() {
    return partialReturnItems
      .map((item) => {
        const cantidad = Number(item?.cantidadSeleccionada || 0);
        const pendiente = Number(item?.pendiente || 0);

        return {
          productoNombre: item?.productoNombre || '',
          unidadVenta: item?.unidadVenta || '',
          cantidad,
          pendiente,
        };
      })
      .filter((item) => item.cantidad > 0 && item.cantidad <= item.pendiente);
  }

  async function handleConfirmDevolucionParcial(venta) {
    const ventaId = venta?._id || venta?.id || partialReturnVentaId || '';
    const activeToken = String(bearerToken || '').trim();

    if (!activeToken) {
      const message = 'Primero valida acceso en Home para confirmar devolución parcial.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    if (!ventaId) {
      const message = 'No se pudo devolver parcialmente: ventaId inválido.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    const selectedItems = getSelectedPartialReturnItems();

    if (selectedItems.length === 0) {
      const message = 'Selecciona al menos un ítem con cantidad válida para devolver.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    const hasInvalidItem = partialReturnItems.some((item) => {
      const cantidad = Number(item?.cantidadSeleccionada || 0);
      const pendiente = Number(item?.pendiente || 0);

      return cantidad < 0 || cantidad > pendiente;
    });

    if (hasInvalidItem) {
      const message = 'Hay cantidades inválidas. Revisa que ninguna supere el pendiente.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    const motivo = `Devolución parcial desde app móvil - venta ${ventaId}`;
    const notas = 'Devolución parcial solicitada desde Ventas.';

    try {
      setPartialReturnSubmittingVentaId(ventaId);
      setReturnVentaNotice({ ventaId, message: 'Confirmando devolución parcial...' });
      setVentaResult('Confirmando devolución parcial...');

      const response = await devolverVentaParcial({
        ventaId,
        motivo,
        notas,
        items: selectedItems.map((item) => ({
          productoNombre: item.productoNombre,
          unidadVenta: item.unidadVenta,
          cantidad: item.cantidad,
        })),
        token: activeToken,
      });

      const data = response?.data || response?.venta || {};
      const devolucion = response?.devolucion || data?.devolucion || {};
      const updatedItems = buildPartialReturnItems(data);

      if (updatedItems.length > 0) {
        setPartialReturnItems(updatedItems);
      }

      setVentasRecientes((current) =>
        current.map((ventaReciente) =>
          String(ventaReciente?._id || ventaReciente?.id || '') === ventaId
            ? {
                ...ventaReciente,
                estado: data?.estado || ventaReciente?.estado,
                items: Array.isArray(data?.items) ? data.items : ventaReciente?.items,
              }
            : ventaReciente
        )
      );

      const successMessage = [
        'Devolución parcial registrada correctamente.',
        `Estado: ${data?.estado || 'parcialmente_devuelta'}`,
        `Total reversado: ${formatCurrency(devolucion.totalReversado || 0)}`,
        `Items devueltos: ${Array.isArray(devolucion.itemsDevueltos) ? devolucion.itemsDevueltos.length : selectedItems.length}`,
        `Inventarios actualizados: ${devolucion.inventariosActualizados || 0}`,
        `Kardex creados: ${devolucion.kardexCreados || 0}`,
      ].join('\n');

      setReturnVentaNotice({ ventaId, message: successMessage });
      setVentaResult(successMessage);
    } catch (error) {
      const message = `Error al confirmar devolución parcial: ${error.message}`;
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
    } finally {
      setPartialReturnSubmittingVentaId('');
    }
  }

  async function handleLoadVentaDetalle(venta) {
    const ventaId = venta?._id || venta?.id || '';

    const activeToken = String(bearerToken || '').trim();

    if (!activeToken) {
      const message = 'Primero valida acceso en Home para preparar devolución parcial.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    if (!ventaId) {
      const message = 'No se pudo cargar detalle: ventaId inválido.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    try {
      const response = await getVentaDetalle({ ventaId, token: activeToken });
      const data = response?.data || response?.venta || response || {};
      const detalleItems = buildPartialReturnItems(data);

      setPartialReturnVentaId(ventaId);
      setPartialReturnItems(detalleItems);
      setReturnMode('parcial');

      const message = [
        'Detalle de venta cargado para devolución parcial.',
        `Items disponibles: ${detalleItems.length}`,
      ].join('\n');

      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
    } catch (error) {
      const message = `Error cargando detalle de venta: ${error.message}`;
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
    }
  }

  async function handleDevolverVenta(venta) {

    const ventaId = venta?._id || venta?.id || '';


    const activeToken = String(bearerToken || '').trim();


    if (!activeToken) {
      const message = 'Primero valida acceso en Home para devolver ventas.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    if (!ventaId) {
      const message = 'No se pudo devolver: ventaId inválido.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    const shouldSkipConfirm = Boolean(venta?.skipConfirm);

    if (!shouldSkipConfirm && venta?.estado && venta.estado !== 'completada') {
      const message = 'Solo se pueden devolver ventas completadas.';
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }

    if (!shouldSkipConfirm && returnConfirmVentaId !== ventaId) {
      const message = [
        'Confirma la devolución total de esta venta.',
        'Esta acción anula la venta y revierte inventario, caja y kardex según backend.',
        'Toca “Confirmar devolución total” para ejecutar.',
      ].join('\\n');

      setReturnConfirmVentaId(ventaId);
      setReturnVentaNotice({ ventaId, message });
      setVentaResult(message);
      return;
    }


    const motivo = `Devolución desde app móvil - venta ${ventaId}`;
    const notas = 'Devolución total solicitada desde Ventas.';


    try {


      const response = await devolverVenta({
        ventaId,
        motivo,
        notas,
        token: activeToken,
      });


      const data = response?.data || response?.venta || response || {};
      const devolucion = response?.devolucion || data?.devolucion || {};
      const successMessage = [
        'Venta devuelta correctamente.',
        `Estado: ${data?.estado || 'anulada'}`,
        `Inventarios actualizados: ${devolucion.inventariosActualizados || 0}`,
        `Kardex creados: ${devolucion.kardexCreados || 0}`,
      ].join('\\n');

      setReturnVentaNotice({ ventaId, message: successMessage });
      setVentaResult(successMessage);
    } catch (error) {
      const errorMessage = `Error al devolver venta: ${error.message}`;
      setReturnVentaNotice({ ventaId, message: errorMessage });
      setVentaResult(errorMessage);
    } finally {
      setReturningVentaId('');
      setReturnConfirmVentaId('');
    }
  }

  async function handleCancelarCarritoActivo(carrito) {
    if (isCajero) {
      return;
    }

    if (!bearerToken.trim()) {
      setCarritosQueryResult('Primero valida acceso en Home para cancelar carritos.');
      return;
    }

    const carritoId = String(carrito?._id || '').trim();
    if (!carritoId) {
      setCarritosQueryResult('No se pudo cancelar: carritoId inválido.');
      return;
    }

    try {
      setCancellingCarrito(true);
      setCarritosQueryResult(`Cancelando carrito activo en ${getEnvironmentLabelLower()}...`);
      const response = await cancelCarrito(
        carritoId,
        motivoCancelacionCarrito.trim() || 'Cancelación operativa',
        bearerToken.trim()
      );
      const data = response?.data || {};
      const canceladoPor = getUserDisplayName(data?.cancelledByUsuarioId);
      const fechaCancelacion = data?.fechaCancelacion
        ? new Date(data.fechaCancelacion).toLocaleString('es-CO')
        : 'sin valor';
      const motivo = data?.motivoCancelacion || 'Cancelación operativa';

      setCarritosQueryResult(
        `Carrito cancelado\ncarritoId: ${data?._id || carritoId}\nestado: ${data?.estado || 'cancelado'}\ncancelado por: ${canceladoPor}\nfecha cancelación: ${fechaCancelacion}\nmotivo: ${motivo}`
      );
      setCarritosActivos((current) => current.filter((row) => row?._id !== carritoId));
      if (carritoCreadoId === carritoId) {
        setCarritoCreadoId('');
        setCarritoSeleccionadoActivo(null);
        setVentaConfirmada(false);
      }
    } catch (error) {
      setCarritosQueryResult(`Error: ${error.message}`);
    } finally {
      setCancellingCarrito(false);
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
          Sede: {(authUser?.sedeId?.nombre || authUser?.sedeId?.codigo || ((sedeId ? 'configurada' : 'sin sede') === 'configurada' && (authUser?.email || '') === getEnvironmentAdminEmail() ? getDefaultSedeLabel() : (sedeId ? 'configurada' : 'sin sede')))}
        </Text>
        <Text style={styles.cardText}>
          Caja operativa: {(cajaOperativaLabel === 'sin caja' && (authUser?.email || '') === getEnvironmentAdminEmail()) ? getDefaultCajaLabel() : cajaOperativaLabel}
        </Text>
        <Text style={styles.cardText}>
          Estado de caja real: {cajaEstadoOperativo}
        </Text>
        <Text style={styles.cardText}>
          Método de pago: {metodoPago}
        </Text>
      </View>

      {!isCajero ? (
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
                    Stock: {item.stockDisponible} | Precio venta: {formatPrecioDeVenta(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
      ) : null}

      {!isCajero ? (
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
              Precio de venta aplicado: {formatPrecioDeVenta(selectedInventario)}
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
            <Text style={styles.cancelEditButtonText}>Cancelar edición</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notas y método de pago</Text>
        <TextInput
          value={notas}
          onChangeText={setNotas}
          placeholder={`Ej: Venta de prueba desde frontend ${getEnvironmentLabelLower()}`}
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

        {!isCajero ? (
          <Pressable style={styles.prepareButton} onPress={handlePrepararPayload}>
            <Text style={styles.prepareButtonText}>Preparar payload local</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Flujo real</Text>

        {!cajaRealAbierta ? (
          <Text style={styles.cardText}>
            No hay una caja abierta real para esta sede. Ve a Cajas, abre una caja y vuelve a Ventas.
          </Text>
        ) : null}

        {!isCajero ? (
          <>
            <Pressable
              style={[
                styles.realButton,
                creatingCarrito && styles.actionDisabledButton,
              ]}
              onPress={handleCrearCarritoReal}
              disabled={creatingCarrito}
            >
              <Text style={styles.realButtonText}>{`Crear carrito real en ${getEnvironmentLabelLower()}`}</Text>
            </Pressable>

            {creatingCarrito ? <ActivityIndicator size="large" style={styles.loader} /> : null}

            {carritoCreadoId ? (
              <Text style={styles.successText}>carritoId creado: {carritoCreadoId}</Text>
            ) : null}
          </>
        ) : null}

        <Pressable style={styles.queryButton} onPress={handleConsultarCarritos}>
          <Text style={styles.queryButtonText}>Consultar carritos activos</Text>
        </Pressable>

        {loadingCarritos ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        {carritosActivos.length > 0 ? (
          <View style={styles.suggestionsBox}>
            <Text style={styles.label}>Carritos activos</Text>
            {!isCajero ? (
              <>
                <Text style={styles.label}>Motivo de cancelación (opcional)</Text>
                <TextInput
                  value={motivoCancelacionCarrito}
                  onChangeText={setMotivoCancelacionCarrito}
                  placeholder="Ej: duplicado operativo"
                  style={styles.input}
                />
              </>
            ) : null}
            {carritosActivos.map((carrito) => (
              (() => {
                const carritoItems = extractCarritoItems(carrito);
                const productosResumen = carritoItems.length > 0
                  ? carritoItems
                      .map((item) => {
                        const nombre = item?.productoNombre || item?.nombre || 'Producto';
                        const cantidadItem = Number(item?.cantidad);
                        const unidadItem = item?.unidadVenta || item?.unidad || 'und';
                        const subtotalItem = Number(item?.subtotal);
                        const cantidadTexto = Number.isFinite(cantidadItem) ? cantidadItem : 0;
                        const subtotalTexto = Number.isFinite(subtotalItem)
                          ? ` = ${formatCurrency(subtotalItem)}`
                          : '';
                        return `${nombre} (${cantidadTexto} ${unidadItem})${subtotalTexto}`;
                      })
                      .join(' | ')
                  : 'Sin detalle de productos';
                const requiereRevisionQa = carritoItems.some((item) => {
                  const nombre = String(item?.productoNombre || item?.nombre || '').toLowerCase();
                  return (
                    nombre.includes('qa') ||
                    nombre.includes('test') ||
                    nombre.includes('prueba') ||
                    nombre.includes('carrito')
                  );
                });

                return (
                  <Pressable
                    key={carrito._id}
                    style={[
                      styles.suggestionItem,
                      carritoCreadoId === carrito._id && styles.suggestionItemSelected,
                    ]}
                    onPress={() => {
                      setCarritoCreadoId(carrito._id);
                      setCarritoSeleccionadoActivo(carrito);
                      setVentaConfirmada(false);
                      setVentaResult(
                        `Carrito seleccionado para revisar: #${getShortId(carrito._id)} | total ${formatCurrency(carrito?.total)}`
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.suggestionTitle,
                        carritoCreadoId === carrito._id && styles.suggestionTitleSelected,
                      ]}
                    >
                      ID: {carrito._id}
                    </Text>
                    <Text
                      style={[
                        styles.suggestionMeta,
                        carritoCreadoId === carrito._id && styles.suggestionMetaSelected,
                      ]}
                    >
                      Total: {formatCurrency(carrito?.total)} | Estado: {carrito?.estado || 'activo'} |
                      {' '}Items: {carritoItems.length}
                    </Text>
                    <Text
                      style={[
                        styles.suggestionMeta,
                        carritoCreadoId === carrito._id && styles.suggestionMetaSelected,
                      ]}
                    >
                      Productos: {productosResumen}
                    </Text>
                    {requiereRevisionQa ? (
                      <Text
                        style={[
                          styles.suggestionMeta,
                          carritoCreadoId === carrito._id && styles.suggestionMetaSelected,
                        ]}
                      >
                        Revisar: carrito de prueba o QA
                      </Text>
                    ) : null}
                    {!isCajero ? (
                      <Pressable
                        style={[
                          styles.cancelEditButton,
                          cancellingCarrito && styles.actionDisabledButton,
                        ]}
                        onPress={() => handleCancelarCarritoActivo(carrito)}
                        disabled={cancellingCarrito}
                      >
                        <Text style={styles.cancelEditButtonText}>Cancelar carrito activo</Text>
                      </Pressable>
                    ) : null}

                    {!isCajero && carrito?.estado === 'completada' ? (
                      <Pressable
                        style={[
                          styles.cancelEditButton,
                          returningVentaId === carrito._id && styles.actionDisabledButton,
                          returnConfirmVentaId === carrito._id && {
                            backgroundColor: '#b91c1c',
                          },
                        ]}
                        onPress={() => handleDevolverVenta(carrito)}
                        disabled={returningVentaId === carrito._id}
                      >
                        <Text style={styles.cancelEditButtonText}>
                          {returningVentaId === carrito._id
                            ? 'Devolviendo venta...'
                            : returnConfirmVentaId === carrito._id
                              ? 'Confirmar devolución total'
                              : 'Devolver venta'}
                        </Text>
                      </Pressable>
                    ) : null}

                    {returnConfirmVentaId === carrito._id ? (
                      <Pressable
                        style={styles.cancelEditButton}
                        onPress={() => handleLoadVentaDetalle(carrito)}
                      >
                        <Text style={styles.cancelEditButtonText}>
                          Preparar devolución parcial
                        </Text>
                      </Pressable>
                    ) : null}

                    {partialReturnVentaId === carrito._id && partialReturnItems.length > 0 ? (
                      <Text style={styles.suggestionMeta}>
                        Items cargados para devolución parcial: {partialReturnItems.length}
                      </Text>
                    ) : null}

                    {returnVentaNotice?.ventaId === carrito?._id &&
                    returnVentaNotice?.message ? (
                      <Text
                        style={[
                          styles.suggestionMeta,
                          {
                            marginTop: 8,
                            color:
                              returnConfirmVentaId === carrito._id
                                ? '#f59e0b'
                                : '#dc2626',
                          },
                        ]}
                      >
                        {returnVentaNotice.message}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })()
            ))}
          </View>
        ) : null}

        {carritoSeleccionadoActivo ? (
          (() => {
            const selectedCartItems = buildCarritoProductLines(carritoSeleccionadoActivo);
            const selectedCreatedAt = formatDateTime(
              carritoSeleccionadoActivo?.createdAt || carritoSeleccionadoActivo?.updatedAt
            );

            return (
              <View style={styles.cartConfirmationBox}>
                <Text style={styles.cartConfirmationTitle}>
                  Confirma el carrito antes de cobrar
                </Text>
                <Text style={styles.cartConfirmationText}>
                  ID corto: #{getShortId(carritoSeleccionadoActivo?._id)}
                </Text>
                <Text style={styles.cartConfirmationText}>
                  ID completo: {carritoSeleccionadoActivo?._id}
                </Text>
                <Text style={styles.cartConfirmationText}>
                  Creado: {selectedCreatedAt}
                </Text>
                <Text style={styles.cartConfirmationText}>
                  Total a cobrar: {formatCurrency(carritoSeleccionadoActivo?.total)}
                </Text>
                <Text style={styles.cartConfirmationText}>
                  Estado: {carritoSeleccionadoActivo?.estado || 'activo'}
                </Text>
                <Text style={styles.cartConfirmationWarning}>
                  Revisa producto por producto. Si este no es el carrito correcto, selecciona otro.
                </Text>

                {selectedCartItems.map((line, index) => (
                  <Text key={`selected-cart-line-${index}`} style={styles.cartConfirmationText}>
                    • {line}
                  </Text>
                ))}

                <Pressable
                  style={[
                    styles.cartConfirmButton,
                    ventaConfirmada ? styles.cartConfirmButtonActive : null,
                  ]}
                  onPress={() => setVentaConfirmada((current) => !current)}
                >
                  <Text style={styles.cartConfirmButtonText}>
                    {ventaConfirmada
                      ? 'Carrito confirmado para cobrar'
                      : 'Confirmo que este es el carrito correcto'}
                  </Text>
                </Pressable>
              </View>
            );
          })()
        ) : carritoCreadoId ? (
          <Text style={styles.successText}>
            Carrito seleccionado para cobrar: {carritoCreadoId}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.saleButton,
            (!cajaRealAbierta || creatingVenta) && styles.actionDisabledButton,
          ]}
          onPress={handleCrearVentaReal}
          disabled={!cajaRealAbierta || creatingVenta}
        >
          <Text style={styles.saleButtonText}>{`Crear venta real en ${getEnvironmentLabelLower()}`}</Text>
        </Pressable>

        {creatingVenta ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        {ventaCreadaId ? (
          <Text style={styles.successText}>ventaId creada: {ventaCreadaId}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ventas recientes</Text>
        <Text style={styles.cardText}>
          Carga ventas completadas o parcialmente devueltas para preparar una devolución parcial.
        </Text>

        <Pressable
          style={[
            styles.queryButton,
            loadingVentasRecientes ? styles.buttonDisabled : null,
          ]}
          disabled={loadingVentasRecientes}
          onPress={handleLoadVentasRecientes}
        >
          <Text style={styles.queryButtonText}>
            {loadingVentasRecientes ? 'Cargando ventas...' : 'Cargar ventas recientes'}
          </Text>
        </Pressable>

        {loadingVentasRecientes ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        {ventasRecientesNotice ? (
          <Text style={styles.suggestionMeta}>{ventasRecientesNotice}</Text>
        ) : null}

        {ventasRecientes.length > 0 ? (
          <View style={styles.suggestionsBox}>
            {ventasRecientes.map((venta) => {
              const ventaId = String(venta?._id || venta?.id || '');
              const estadoVenta = venta?.estado || 'sin estado';
              const totalVentaReciente = Number(venta?.total || 0);
              const itemsVenta = Array.isArray(venta?.items) ? venta.items : [];
              const isPartialCandidate = canPreparePartialReturn(venta);

              return (
                <View key={ventaId} style={styles.suggestionItem}>
                  <Text style={styles.suggestionTitle}>
                    Venta #{getShortId(ventaId)}
                  </Text>
                  <Text style={styles.suggestionMeta}>
                    Estado: {estadoVenta} | Total: {formatCurrency(totalVentaReciente)}
                  </Text>
                  <Text style={styles.suggestionMeta}>
                    Items: {itemsVenta.length}
                  </Text>

                  {isPartialCandidate ? (
                    <Pressable
                      style={styles.cancelEditButton}
                      onPress={() => handleLoadVentaDetalle(venta)}
                    >
                      <Text style={styles.cancelEditButtonText}>
                        Preparar devolución parcial
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.deleteButton,
                        returningVentaId === ventaId ? styles.buttonDisabled : null,
                      ]}
                      disabled={returningVentaId === ventaId}
                      onPress={() => handleDevolverVenta(venta)}
                    >
                      <Text style={styles.returnWarning}>
                        {returnConfirmVentaId === ventaId
                          ? 'Confirmar devolución total'
                          : 'Devolver venta total'}
                      </Text>
                    </Pressable>
                  )}

                  {partialReturnVentaId === ventaId && partialReturnItems.length > 0 ? (
                    <View style={styles.suggestionsBox}>
                      <Text style={styles.suggestionMeta}>
                        Items cargados para devolución parcial: {partialReturnItems.length}
                      </Text>

                      {partialReturnItems.map((item, itemIndex) => {
                        const cantidadSeleccionada = Number(item?.cantidadSeleccionada || 0);
                        const pendiente = Number(item?.pendiente || 0);
                        const cantidadInvalida =
                          cantidadSeleccionada < 0 ||
                          cantidadSeleccionada > pendiente;

                        return (
                          <View
                            key={`${item.productoNombre}-${item.unidadVenta}-${itemIndex}`}
                            style={styles.suggestionItem}
                          >
                            <Text style={styles.suggestionTitle}>
                              {item.productoNombre || 'Producto sin nombre'}
                            </Text>
                            <Text style={styles.suggestionMeta}>
                              Vendido: {item.cantidad} {item.unidadVenta} | Devuelto: {item.cantidadDevuelta} | Pendiente: {item.pendiente}
                            </Text>
                            <Text style={styles.suggestionMeta}>
                              Precio unitario: {formatCurrency(item.precioUnitario)}
                            </Text>

                            <TextInput
                              style={styles.input}
                              value={String(item.cantidadSeleccionada || '')}
                              onChangeText={(value) =>
                                handlePartialReturnQuantityChange(itemIndex, value)
                              }
                              placeholder="Cantidad a devolver"
                              placeholderTextColor="#94a3b8"
                              keyboardType="decimal-pad"
                            />

                            {cantidadInvalida ? (
                              <Text style={styles.errorText}>
                                La cantidad no puede superar el pendiente.
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}

                      <Text style={styles.suggestionMeta}>
                        Total parcial estimado: {formatCurrency(getPartialReturnTotal())}
                      </Text>

                      <Pressable
                        style={[
                          styles.deleteButton,
                          partialReturnSubmittingVentaId === ventaId ? styles.buttonDisabled : null,
                        ]}
                        disabled={partialReturnSubmittingVentaId === ventaId}
                        onPress={() => handleConfirmDevolucionParcial(venta)}
                      >
                        <Text style={styles.returnWarning}>
                          {partialReturnSubmittingVentaId === ventaId
                            ? 'Confirmando devolución parcial...'
                            : 'Confirmar devolución parcial'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {returnVentaNotice?.ventaId === ventaId && returnVentaNotice?.message ? (
                    <Text style={styles.suggestionMeta}>
                      {returnVentaNotice.message}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Herramientas</Text>

        <Pressable
          style={styles.technicalToggleButton}
          onPress={() => setShowTechnicalDetails((current) => !current)}
        >
          <Text style={styles.technicalToggleButtonText}>
            {showTechnicalDetails ? 'Ocultar detalles técnicos' : 'Mostrar detalles técnicos'}
          </Text>
        </Pressable>
      </View>

      {!isCajero ? (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen provisional</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Items</Text>
            <Text style={styles.summaryChipValue}>{items.length}</Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Método</Text>
            <Text style={styles.summaryChipValue}>{metodoPago}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Caja</Text>
            <Text style={styles.summaryChipValue}>{cajaOperativaLabel}</Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Total</Text>
            <Text style={styles.summaryChipValue}>{formatCurrency(totalVenta)}</Text>
          </View>
        </View>

        {items.length === 0 ? (
          <Text style={styles.cardText}>Todavía no hay items para resumir.</Text>
        ) : (
          <View>
            {items.map((item) => (
              <Text key={`summary-${item.id}`} style={styles.cardText}>
                {item.productoNombre}: {item.cantidad} {item.unidadVenta} x {formatCurrency(item.precioUnitario)} = {formatCurrency(item.subtotal)}
              </Text>
            ))}
          </View>
        )}

        <Pressable style={styles.clearCartButton} onPress={handleVaciarCarritoLocal}>
          <Text style={styles.clearCartButtonText}>Vaciar carrito local</Text>
        </Pressable>
      </View>
      ) : null}

      {!isCajero ? (
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
          <Text style={styles.emptyText}>Todavía no has agregado items.</Text>
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
      ) : null}

      {lastSaleSummary ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerTitle}>Venta creada con exito</Text>
          <Text style={styles.successBannerText}>ventaId: {lastSaleSummary.ventaId}</Text>
          <Text style={styles.successBannerText}>Caja: {cajaOperativaLabel}</Text>
          <Text style={styles.successBannerText}>Método de pago aplicado: {lastSaleSummary.metodoPago}</Text>
          <Text style={styles.successBannerText}>total: {formatCurrency(lastSaleSummary.totalVenta)}</Text>
          <Text style={styles.successBannerText}>items: {lastSaleSummary.itemsCount}</Text>
          <Text style={styles.successBannerText}>
            productos: {lastSaleSummary.productos.join(' | ')}
          </Text>

          {!isCajero ? (
            <Pressable
              style={styles.deleteButton}
              onPress={() => {
                const ventaId = String(lastSaleSummary.ventaId || '');

                if (returnConfirmVentaId !== ventaId) {
                  const message = [
                    'Confirma la devolución total de esta venta.',
                    'Esta acción anula la venta y revierte inventario, caja y kardex según backend.',
                    'Toca “Confirmar devolución total” para ejecutar.',
                  ].join('\n');

                  setReturnConfirmVentaId(ventaId);
                  setReturnVentaNotice({ ventaId, message });
                  setVentaResult(message);
                  return;
                }

                setReturnVentaNotice({ ventaId, message: `Devolviendo venta ${ventaId}...` });
                setVentaResult(`Devolviendo venta ${ventaId}...`);

                handleDevolverVenta({
                  _id: ventaId,
                  estado: 'completada',
                  skipConfirm: true,
                });
              }}
            >
              <Text style={styles.deleteButtonText}>
                {returningVentaId === String(lastSaleSummary.ventaId || '')
                  ? 'Devolviendo venta...'
                  : returnConfirmVentaId === String(lastSaleSummary.ventaId || '')
                    ? 'Confirmar devolución total'
                    : 'Devolver venta'}
              </Text>
            </Pressable>
          ) : null}

          {returnVentaNotice?.message ? (
            <Text style={styles.successBannerText}>
              {returnVentaNotice.message}
            </Text>
          ) : null}
        </View>
      ) : null}

      {showTechnicalDetails ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payload local y contratos reales</Text>
            <Text style={styles.payloadText}>
              {payloadPreview || 'Todavía no has preparado el payload.'}
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
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 6,
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
    backgroundColor: '#111827',
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
    backgroundColor: '#1f6feb',
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
  actionDisabledButton: {
    opacity: 0.55,
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
  cartConfirmationBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 12,
  },
  cartConfirmationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 8,
  },
  cartConfirmationText: {
    fontSize: 14,
    color: '#7c2d12',
    lineHeight: 20,
    marginBottom: 4,
  },
  cartConfirmationWarning: {
    fontSize: 14,
    color: '#9a3412',
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },
  cartConfirmButton: {
    backgroundColor: '#9a3412',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cartConfirmButtonActive: {
    backgroundColor: '#15803d',
  },
  cartConfirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  technicalToggleButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d7de',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  technicalToggleButtonText: {
    color: '#111827',
    fontSize: 15,
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
