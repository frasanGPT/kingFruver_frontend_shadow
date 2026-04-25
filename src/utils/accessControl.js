export function extractSedeIdFromUser(usuario) {
  if (usuario === null || usuario === undefined) {
    return "";
  }

  if (typeof usuario.sedeId === "string") {
    return usuario.sedeId;
  }

  if (usuario.sedeId && typeof usuario.sedeId === "object" && usuario.sedeId._id) {
    return usuario.sedeId._id;
  }

  return "";
}

export function getRoleCode(usuario) {
  if (usuario === null || usuario === undefined) {
    return "";
  }

  if (usuario.roleId && typeof usuario.roleId === "object" && usuario.roleId.codigo) {
    return String(usuario.roleId.codigo);
  }

  return "";
}

export function getPermissions(usuario) {
  if (usuario === null || usuario === undefined) {
    return [];
  }

  if (
    usuario.roleId &&
    typeof usuario.roleId === "object" &&
    Array.isArray(usuario.roleId.permisos)
  ) {
    return usuario.roleId.permisos;
  }

  return [];
}

export function hasPermission(usuario, permissionCode) {
  const roleCode = getRoleCode(usuario);
  const permisos = getPermissions(usuario);

  if (roleCode === "admin") {
    return true;
  }

  if (permisos.includes("*")) {
    return true;
  }

  return permisos.includes(permissionCode);
}

export function buildModuleAccess(usuario) {
  const roleCode = getRoleCode(usuario);
  const productos = hasPermission(usuario, "inventario:read");
  const ventas =
    roleCode !== "supervisor" &&
    (hasPermission(usuario, "ventas:create") || hasPermission(usuario, "ventas:read"));
  const cajas = hasPermission(usuario, "cajas:read");
  const reportes =
    roleCode !== "cajero" &&
    hasPermission(usuario, "ventas:read") &&
    hasPermission(usuario, "arqueos:read") &&
    hasPermission(usuario, "cajas:read");

  return {
    Productos: productos,
    Ventas: ventas,
    Cajas: cajas,
    Reportes: reportes,
  };
}
