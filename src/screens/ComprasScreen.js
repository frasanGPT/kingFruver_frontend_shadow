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
import { createCompra, devolverCompra, getCompras } from '../services/compraService';
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

  const raw = String(value).trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');

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

const PRESENTATION_OPTIONS = [
  {
    value: 'unidad_base',
    label: 'Unidad base',
    description: 'Compra directa en kg, lb, und o caja',
  },
  {
    value: 'costal',
    label: 'Costal',
    description: 'Presentación física que se convierte a inventario',
  },
  {
    value: 'bulto',
    label: 'Bulto',
    description: 'Presentación física que se convierte a inventario',
  },
  {
    value: 'paquete',
    label: 'Paquete',
    description: 'Presentación física que se convierte a inventario',
  },
  {
    value: 'kit',
    label: 'Kit',
    description: 'Conjunto que se convierte a unidades base',
  },
  {
    value: 'set',
    label: 'Set',
    description: 'Conjunto que se convierte a unidades base',
  },
];

const CONTENT_UNIT_OPTIONS = [
  {
    value: 'kg',
    label: 'kg',
    description: 'Kilogramos',
  },
  {
    value: 'g',
    label: 'g',
    description: 'Gramos',
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

function normalizePresentationInput(value) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  const aliases = {
    unidad_base: 'unidad_base',
    base: 'unidad_base',
    directa: 'unidad_base',
    normal: 'unidad_base',

    costal: 'costal',
    costales: 'costal',

    bulto: 'bulto',
    bultos: 'bulto',

    paquete: 'paquete',
    paquetes: 'paquete',
    paq: 'paquete',

    kit: 'kit',
    kits: 'kit',

    set: 'set',
    sets: 'set',
  };

  return aliases[text] || '';
}

function getPresentationDescription(value) {
  const option = PRESENTATION_OPTIONS.find((item) => item.value === value);
  return option ? option.description : 'Presentación no permitida';
}

function normalizeContentUnitInput(value) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  const aliases = {
    kg: {
      unidadContenido: 'kg',
      unidadBaseInventario: 'kg',
      factorABase: 1,
      description: 'Kilogramos',
    },
    kilo: {
      unidadContenido: 'kg',
      unidadBaseInventario: 'kg',
      factorABase: 1,
      description: 'Kilogramos',
    },
    kilos: {
      unidadContenido: 'kg',
      unidadBaseInventario: 'kg',
      factorABase: 1,
      description: 'Kilogramos',
    },
    kilogramo: {
      unidadContenido: 'kg',
      unidadBaseInventario: 'kg',
      factorABase: 1,
      description: 'Kilogramos',
    },
    kilogramos: {
      unidadContenido: 'kg',
      unidadBaseInventario: 'kg',
      factorABase: 1,
      description: 'Kilogramos',
    },

    g: {
      unidadContenido: 'g',
      unidadBaseInventario: 'kg',
      factorABase: 0.001,
      description: 'Gramos',
    },
    gr: {
      unidadContenido: 'g',
      unidadBaseInventario: 'kg',
      factorABase: 0.001,
      description: 'Gramos',
    },
    gramo: {
      unidadContenido: 'g',
      unidadBaseInventario: 'kg',
      factorABase: 0.001,
      description: 'Gramos',
    },
    gramos: {
      unidadContenido: 'g',
      unidadBaseInventario: 'kg',
      factorABase: 0.001,
      description: 'Gramos',
    },

    lb: {
      unidadContenido: 'lb',
      unidadBaseInventario: 'lb',
      factorABase: 1,
      description: 'Libras',
    },
    lbs: {
      unidadContenido: 'lb',
      unidadBaseInventario: 'lb',
      factorABase: 1,
      description: 'Libras',
    },
    libra: {
      unidadContenido: 'lb',
      unidadBaseInventario: 'lb',
      factorABase: 1,
      description: 'Libras',
    },
    libras: {
      unidadContenido: 'lb',
      unidadBaseInventario: 'lb',
      factorABase: 1,
      description: 'Libras',
    },

    und: {
      unidadContenido: 'und',
      unidadBaseInventario: 'und',
      factorABase: 1,
      description: 'Unidades',
    },
    unid: {
      unidadContenido: 'und',
      unidadBaseInventario: 'und',
      factorABase: 1,
      description: 'Unidades',
    },
    unidad: {
      unidadContenido: 'und',
      unidadBaseInventario: 'und',
      factorABase: 1,
      description: 'Unidades',
    },
    unidades: {
      unidadContenido: 'und',
      unidadBaseInventario: 'und',
      factorABase: 1,
      description: 'Unidades',
    },

    caja: {
      unidadContenido: 'caja',
      unidadBaseInventario: 'caja',
      factorABase: 1,
      description: 'Cajas',
    },
    cajas: {
      unidadContenido: 'caja',
      unidadBaseInventario: 'caja',
      factorABase: 1,
      description: 'Cajas',
    },
  };

  return aliases[text] || null;
}

function formatQuantityPreview(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  return number.toLocaleString('es-CO', {
    maximumFractionDigits: 4,
  });
}

function roundPresentationValue(value) {
  return Number(Number(value || 0).toFixed(4));
}

function buildPurchasePresentationPreview({
  presentacionCompra,
  cantidadCompra,
  contenidoPorPresentacion,
  unidadContenido,
  unidadCompra,
}) {
  const normalizedPresentation = normalizePresentationInput(presentacionCompra) || 'unidad_base';
  const cantidadPresentaciones = parseDecimalInput(cantidadCompra);
  const unidadBaseDirecta = normalizeUnitInput(unidadCompra);

  if (normalizedPresentation === 'unidad_base') {
    return {
      valid: Number.isFinite(cantidadPresentaciones) && cantidadPresentaciones > 0 && Boolean(unidadBaseDirecta),
      message: 'Compra directa en unidad base.',
      presentacionCompra: 'unidad_base',
      cantidadPresentaciones,
      contenidoPorPresentacion: 1,
      unidadContenido: unidadBaseDirecta,
      unidadBaseInventario: unidadBaseDirecta,
      cantidadInventario: cantidadPresentaciones,
    };
  }

  const contenido = parseDecimalInput(contenidoPorPresentacion);
  const contentUnit = normalizeContentUnitInput(unidadContenido);

  if (!contentUnit) {
    return {
      valid: false,
      message: 'Selecciona una unidad de contenido válida.',
      presentacionCompra: normalizedPresentation,
      cantidadPresentaciones,
      contenidoPorPresentacion: contenido,
      unidadContenido: '',
      unidadBaseInventario: '',
      cantidadInventario: NaN,
    };
  }

  const cantidadInventario = roundPresentationValue(
    cantidadPresentaciones * contenido * contentUnit.factorABase
  );

  return {
    valid:
      Boolean(normalizedPresentation) &&
      Number.isFinite(cantidadPresentaciones) &&
      cantidadPresentaciones > 0 &&
      Number.isFinite(contenido) &&
      contenido > 0 &&
      Number.isFinite(cantidadInventario) &&
      cantidadInventario > 0,
    message: 'Presentación convertida a unidad base de inventario.',
    presentacionCompra: normalizedPresentation,
    cantidadPresentaciones,
    contenidoPorPresentacion: contenido,
    unidadContenido: contentUnit.unidadContenido,
    unidadBaseInventario: contentUnit.unidadBaseInventario,
    cantidadInventario,
  };
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
  const [createNotice, setCreateNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [returningCompraId, setReturningCompraId] = useState('');
  const [returnConfirmCompraId, setReturnConfirmCompraId] = useState('');
  const [returnNotice, setReturnNotice] = useState({ compraId: '', message: '' });

  const [proveedorId, setProveedorId] = useState('');
  const [origenCompra, setOrigenCompra] = useState('EN_BODEGA');
  const [productoNombre, setProductoNombre] = useState('');
  const [unidadCompra, setUnidadCompra] = useState('kg');
  const [presentacionCompra, setPresentacionCompra] = useState('unidad_base');
  const [contenidoPorPresentacion, setContenidoPorPresentacion] = useState('1');
  const [unidadContenido, setUnidadContenido] = useState('kg');
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

  function setCreateFeedback(message) {
    setCreateNotice(message);
    setScreenResult(message);
  }

  function clearNewProductConfirmation() {
    setNewProductConfirmed(false);
    setCreateNotice('');
  }

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

  const presentationPreview = useMemo(() => {
    return buildPurchasePresentationPreview({
      presentacionCompra,
      cantidadCompra,
      contenidoPorPresentacion,
      unidadContenido,
      unidadCompra,
    });
  }, [cantidadCompra, contenidoPorPresentacion, presentacionCompra, unidadCompra, unidadContenido]);

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
    clearNewProductConfirmation();
  }

  function handleUnidadCompraChange(value) {
    const canonicalUnit = normalizeUnitInput(value);
    setUnidadCompra(canonicalUnit);
    setSelectedExistingProduct(null);
    clearNewProductConfirmation();

    if (presentacionCompra === 'unidad_base') {
      setUnidadContenido(canonicalUnit);
    }

    if (!canonicalUnit) {
      setScreenResult('Unidad no permitida. Usa una unidad existente: kg, lb, und o caja.');
    }
  }

  function handlePresentacionCompraChange(value) {
    const normalizedPresentation = normalizePresentationInput(value);

    if (!normalizedPresentation) {
      setScreenResult('Presentación no permitida. Usa unidad base, costal, bulto, paquete, kit o set.');
      return;
    }

    setPresentacionCompra(normalizedPresentation);

    if (normalizedPresentation === 'unidad_base') {
      const baseUnit = selectedExistingProduct
        ? normalizeUnitInput(selectedExistingProduct.unidadBase)
        : normalizeUnitInput(unidadCompra);

      setContenidoPorPresentacion('1');
      setUnidadContenido(baseUnit || 'kg');
    } else if (!normalizeContentUnitInput(unidadContenido)) {
      setUnidadContenido(
        selectedExistingProduct
          ? normalizeUnitInput(selectedExistingProduct.unidadBase)
          : normalizeUnitInput(unidadCompra) || 'kg'
      );
    }
  }

  function handleUnidadContenidoChange(value) {
    const contentUnit = normalizeContentUnitInput(value);

    if (!contentUnit) {
      setScreenResult('Unidad de contenido no permitida. Usa kg, g, lb, und o caja.');
      return;
    }

    setUnidadContenido(contentUnit.unidadContenido);
  }

  function handleSelectExistingProduct(item) {
    setSelectedExistingProduct(item);
    setProductoNombre(item.productoNombre);
    setUnidadCompra(item.unidadBase);
    setUnidadContenido(item.unidadBase);
    clearNewProductConfirmation();
    setScreenResult('Producto existente seleccionado: ' + formatInventoryOption(item));
  }

  function handleConfirmNewProduct() {
    const confirmedUnit = presentationPreview.valid
      ? presentationPreview.unidadBaseInventario
      : normalizeUnitInput(unidadCompra) || unidadCompra;
    const message = 'Producto nuevo confirmado: ' + productoNombre.trim() + ' (' + confirmedUnit + '). Ya puedes registrar la compra.';
    setSelectedExistingProduct(null);
    setNewProductConfirmed(true);
    setCreateFeedback(message);
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
    if (!presentationPreview.valid) {
      return presentationPreview.message || 'Revisa la presentación de compra antes de registrar.';
    }
    if (presentationPreview.unidadBaseInventario !== unidadCompraFinal) {
      return selectedExistingProduct
        ? 'La presentación calcula inventario en ' + presentationPreview.unidadBaseInventario + ', pero el producto seleccionado está en ' + unidadCompraFinal + '. Ajusta la presentación o selecciona otro producto.'
        : 'La presentación calcula inventario en ' + presentationPreview.unidadBaseInventario + ', pero la unidad base seleccionada es ' + unidadCompraFinal + '. Ajusta la unidad base o la presentación antes de registrar.';
    }
    if (selectedExistingProduct === null && exactExistingProductMatch !== null) {
      return 'Ya existe un producto equivalente. Selecciónalo en la lista para evitar duplicados.';
    }
    if (selectedExistingProduct === null && hasExistingProductSuggestions) {
      return 'Encontramos productos parecidos en inventario. Selecciona una coincidencia antes de registrar la compra.';
    }
    if (selectedExistingProduct === null && newProductConfirmed === false) {
      return 'Toca primero “Confirmo que es un producto nuevo”. Luego presiona Registrar compra.';
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) return 'La cantidad debe ser mayor a cero.';
    if (!Number.isFinite(costo) || costo <= 0) return 'El costo total debe ser mayor a cero.';
    if (!Number.isFinite(fleteNumber) || fleteNumber < 0) return 'El flete no puede ser negativo.';

    return '';
  }

  async function handleDevolverCompra(compra) {
    if (!canCreate) {
      setScreenResult('Solo admin puede devolver compras.');
      return;
    }

    if (!compra || !compra.id) {
      setScreenResult('No se pudo identificar la compra a devolver.');
      return;
    }

    if (compra.estado !== 'recibida') {
      setScreenResult('Solo se pueden devolver compras recibidas.');
      return;
    }

    if (returnConfirmCompraId !== compra.id) {
      const message = [
        'Confirma la devolución total de esta compra.',
        `Compra: ${compra.id}`,
        'Esta acción anula la compra, descuenta inventario, bloquea lotes y registra kardex.',
        'Toca “Confirmar devolución total” para ejecutar.',
      ].join('\n');

      setReturnConfirmCompraId(compra.id);
      setReturnNotice({ compraId: compra.id, message });
      setScreenResult(message);
      return;
    }

    const motivo = `Devolución desde app móvil - compra ${compra.id}`;
    const notasDevolucion = 'Devolución total solicitada desde Compras.';

    setReturningCompraId(compra.id);
    setReturnConfirmCompraId('');
    setReturnNotice({ compraId: compra.id, message: `Devolviendo compra ${compra.id}...` });
    setScreenResult(`Devolviendo compra ${compra.id}...`);

    try {
      const response = await devolverCompra({
        compraId: compra.id,
        motivo,
        notas: notasDevolucion,
        token,
      });

      const data = response?.data || {};
      const devolucion = response?.devolucion || {};

      const successMessage = [
        'Compra devuelta correctamente.',
        `Compra: ${data?._id || compra.id}`,
        `Estado: ${data?.estado || 'anulada'}`,
        `Lotes actualizados: ${devolucion.lotesActualizados || 0}`,
        `Inventarios actualizados: ${devolucion.inventariosActualizados || 0}`,
        `Kardex creados: ${devolucion.kardexCreados || 0}`,
      ].join('\n');

      setReturnNotice({ compraId: compra.id, message: successMessage });
      setScreenResult(successMessage);

      await loadData();
    } catch (error) {
      const errorMessage = `Error al devolver compra: ${error.message}`;
      setReturnNotice({ compraId: compra.id, message: errorMessage });
      setScreenResult(errorMessage);
    } finally {
      setReturningCompraId('');
      setReturnConfirmCompraId('');
    }
  }

  async function handleCreateCompra() {
    const validationError = validateCreateForm();

    if (validationError) {
      setCreateFeedback(validationError);
      return;
    }

    try {
      setCreating(true);
      setCreateFeedback('Registrando compra real...');

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
            unidadCompra: presentationPreview.unidadBaseInventario,
            cantidadCompra: presentationPreview.cantidadInventario,
            costoTotalItem: parseDecimalInput(costoTotalItem),
            presentacionCompra: presentationPreview.presentacionCompra,
            cantidadPresentaciones: presentationPreview.cantidadPresentaciones,
            contenidoPorPresentacion: presentationPreview.contenidoPorPresentacion,
            unidadContenido: presentationPreview.unidadContenido,
            unidadBaseInventario: presentationPreview.unidadBaseInventario,
            cantidadInventario: presentationPreview.cantidadInventario,
            unidadVentaPrincipal: presentationPreview.unidadBaseInventario,
          },
        ],
      };

      const response = await createCompra({ compra, token });

      if (response && response.ok === true) {
        setProductoNombre('');
        setSelectedExistingProduct(null);
        clearNewProductConfirmation();
        setPresentacionCompra('unidad_base');
        setContenidoPorPresentacion('1');
        setUnidadContenido('kg');
        setCantidadCompra('');
        setCostoTotalItem('');
        setFlete('');
        setNotas('');
        setCreateFeedback('Compra registrada correctamente. Recargando listado...');
        await loadData(token, 'Compra registrada correctamente.', session);
        setCreateFeedback('Compra registrada correctamente. Revisa el listado y usa “Devolver compra” si aplica.');
        return;
      }

      throw new Error((response && (response.message || response.error)) || 'No se pudo registrar la compra.');
    } catch (error) {
      setCreateFeedback('Error registrando compra: ' + error.message);
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
          Esta compra recibida genera lote, inventario y kardex en la unidad base calculada.
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
                clearNewProductConfirmation();
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
          <>
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
            <Text style={styles.helperText}>
              {newProductConfirmed
                ? 'Confirmación recibida. Ya puedes registrar esta compra.'
                : 'Este paso es obligatorio para crear productos nuevos y evitar duplicados.'}
            </Text>
          </>
        ) : null}

        <Text style={styles.label}>Unidad *</Text>
        <Text style={styles.helperText}>
          Selecciona la unidad base de inventario y venta. Las presentaciones se configuran abajo y se convierten a esta unidad.
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

        <Text style={styles.label}>Presentación de compra *</Text>
        <Text style={styles.helperText}>
          La presentación no es unidad de inventario. Se convierte a kg, lb, und o caja antes de registrar.
        </Text>

        <View style={styles.unitSelector}>
          {PRESENTATION_OPTIONS.map((option) => {
            const active = presentacionCompra === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.unitOption,
                  active ? styles.unitOptionActive : null,
                ]}
                onPress={() => handlePresentacionCompraChange(option.value)}
                disabled={!canCreate || creating}
              >
                <Text style={styles.unitOptionLabel}>{option.label}</Text>
                <Text style={styles.unitOptionDescription}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {presentacionCompra !== 'unidad_base' ? (
          <>
            <Text style={styles.label}>Contenido por presentación *</Text>
            <TextInput
              style={styles.input}
              value={contenidoPorPresentacion}
              onChangeText={setContenidoPorPresentacion}
              placeholder="Ej: 50"
              keyboardType="decimal-pad"
              editable={canCreate && !creating}
            />

            <Text style={styles.label}>Unidad del contenido *</Text>
            <View style={styles.unitSelector}>
              {CONTENT_UNIT_OPTIONS.map((option) => {
                const active = unidadContenido === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.unitOption,
                      active ? styles.unitOptionActive : null,
                    ]}
                    onPress={() => handleUnidadContenidoChange(option.value)}
                    disabled={!canCreate || creating}
                  >
                    <Text style={styles.unitOptionLabel}>{option.label}</Text>
                    <Text style={styles.unitOptionDescription}>{option.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.unitLockedCard}>
          <Text style={styles.productOptionTitle}>Impacto calculado en inventario</Text>
          <Text style={styles.productOptionMeta}>
            {presentationPreview.valid
              ? formatQuantityPreview(presentationPreview.cantidadInventario) + ' ' + presentationPreview.unidadBaseInventario
              : 'Completa cantidad y presentación para calcular inventario.'}
          </Text>
          <Text style={styles.helperText}>
            {presentacionCompra === 'unidad_base'
              ? 'Compra directa en unidad base.'
              : cantidadCompra + ' ' + getPresentationDescription(presentacionCompra).toLowerCase() + ' × ' + contenidoPorPresentacion + ' ' + unidadContenido}
          </Text>
        </View>

        {selectedExistingProduct &&
        presentationPreview.valid &&
        presentationPreview.unidadBaseInventario !== normalizeUnitInput(selectedExistingProduct.unidadBase) ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              La presentación calcula inventario en {presentationPreview.unidadBaseInventario}, pero el producto seleccionado está en {selectedExistingProduct.unidadBase}. Ajusta la presentación antes de registrar.
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>
          {presentacionCompra === 'unidad_base' ? 'Cantidad *' : 'Cantidad de presentaciones *'}
        </Text>
        <TextInput
          style={styles.input}
          value={cantidadCompra}
          onChangeText={setCantidadCompra}
          placeholder={presentacionCompra === 'unidad_base' ? 'Ej: 10' : 'Ej: 2 costales'}
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
            {creating
              ? 'Registrando...'
              : selectedExistingProduct === null &&
                  productoNombre.trim().length > 0 &&
                  exactExistingProductMatch === null &&
                  hasExistingProductSuggestions === false &&
                  newProductConfirmed === false
                ? 'Confirma producto nuevo primero'
                : 'Registrar compra'}
          </Text>
        </Pressable>

        {createNotice ? (
          <Text style={styles.createNoticeText}>{createNotice}</Text>
        ) : null}
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
                  {compraItem.presentacionCompra && compraItem.presentacionCompra !== 'unidad_base'
                    ? ' · presentación: ' + compraItem.cantidadPresentaciones + ' ' + compraItem.presentacionCompra + ' de ' + compraItem.contenidoPorPresentacion + ' ' + compraItem.unidadContenido
                    : ''}
                </Text>
              ))}

              {canCreate && item.estado === 'recibida' ? (
                <Pressable
                  style={[
                    styles.returnButton,
                    returnConfirmCompraId === item.id ? styles.returnButtonConfirm : null,
                    returningCompraId === item.id ? styles.disabledButton : null,
                  ]}
                  onPress={() => handleDevolverCompra(item)}
                  disabled={returningCompraId === item.id || creating}
                >
                  <Text style={styles.returnButtonText}>
                    {returningCompraId === item.id
                      ? 'Devolviendo...'
                      : returnConfirmCompraId === item.id
                        ? 'Confirmar devolución total'
                        : 'Devolver compra'}
                  </Text>
                </Pressable>
              ) : null}

              {returnNotice.compraId === item.id && returnNotice.message ? (
                <Text style={styles.returnNoticeText}>{returnNotice.message}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Volver al inicio</Text>
      </Pressable>

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
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  returnButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  returnButtonConfirm: {
    backgroundColor: '#b91c1c',
  },
  returnButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  returnNoticeText: {
    marginTop: 8,
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  createNoticeText: {
    marginTop: 10,
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
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
