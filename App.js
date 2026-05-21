import React, { useState } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import SectionPlaceholderScreen from './src/screens/SectionPlaceholderScreen';
import VentasScreen from './src/screens/VentasScreen';
import CajasScreen from './src/screens/CajasScreen';
import ProductosScreen from './src/screens/ProductosScreen';
import ReportesScreen from './src/screens/ReportesScreen';
import UsuariosScreen from './src/screens/UsuariosScreen';
import SeguridadScreen from './src/screens/SeguridadScreen';
import ProveedoresScreen from './src/screens/ProveedoresScreen';
import ComprasScreen from './src/screens/ComprasScreen';
import ReferenciasCostoScreen from './src/screens/ReferenciasCostoScreen';
import KardexAuditoriaScreen from './src/screens/KardexAuditoriaScreen';

export default function App() {
const [route, setRoute] = useState({ name: 'home', params: null });

function handleOpenSection(sectionName) {
if (sectionName === 'Ventas') {
setRoute({ name: 'ventas', params: null });
return;
}
if (sectionName === 'Cajas') {
  setRoute({ name: 'cajas', params: null });
  return;
}

if (sectionName === 'Productos') {
  setRoute({ name: 'productos', params: null });
  return;
}

if (sectionName === 'Reportes') {
  setRoute({ name: 'reportes', params: null });
  return;
}

if (sectionName === 'Usuarios') {
  setRoute({ name: 'usuarios', params: null });
  return;
}

if (sectionName === 'Seguridad') {
  setRoute({ name: 'seguridad', params: null });
  return;
}

if (sectionName === 'Proveedores') {
  setRoute({ name: 'proveedores', params: null });
  return;
}

if (sectionName === 'Compras') {
  setRoute({ name: 'compras', params: null });
  return;
}

if (sectionName === 'Referencias costo') {
  setRoute({ name: 'referencias-costo', params: null });
  return;
}

if (sectionName === 'Kardex y auditoría') {
  setRoute({ name: 'kardex-auditoria', params: null });
  return;
}

setRoute({
  name: 'section-placeholder',
  params: { sectionName },
});
}

function handleBackToHome() {
setRoute({ name: 'home', params: null });
}

if (route.name === 'ventas') {
return <VentasScreen onBack={handleBackToHome} />;
}

if (route.name === 'cajas') {
return <CajasScreen onBack={handleBackToHome} />;
}

if (route.name === 'productos') {
return <ProductosScreen onBack={handleBackToHome} />;
}

if (route.name === 'reportes') {
return <ReportesScreen onBack={handleBackToHome} />;
}

if (route.name === 'usuarios') {
return <UsuariosScreen onBack={handleBackToHome} />;
}

if (route.name === 'seguridad') {
return <SeguridadScreen onBack={handleBackToHome} />;
}

if (route.name === 'proveedores') {
return <ProveedoresScreen onBack={handleBackToHome} />;
}

if (route.name === 'compras') {
return <ComprasScreen onBack={handleBackToHome} />;
}

if (route.name === 'referencias-costo') {
return <ReferenciasCostoScreen onBack={handleBackToHome} />;
}

if (route.name === 'kardex-auditoria') {
return <KardexAuditoriaScreen onBack={handleBackToHome} />;
}

if (route.name === 'section-placeholder') {
return (
<SectionPlaceholderScreen sectionName={route.params.sectionName} onBack={handleBackToHome} />
);
}

return <HomeScreen onOpenSection={handleOpenSection} />;
}