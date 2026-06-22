// Shared constants — belt ranks, membership defaults, roles, products.

export const CINTURONES = [
  "Blanco", "Blanco/Amarillo", "Amarillo", "Amarillo/Verde",
  "Verde", "Verde/Azul", "Azul", "Azul/Rojo",
  "Rojo", "Rojo/Negro", "Negro",
];

export const COSTOS_ASCENSO = {
  "Blanco":          { siguiente: "Blanco/Amarillo", costo: 45  },
  "Blanco/Amarillo": { siguiente: "Amarillo",        costo: 50  },
  "Amarillo":        { siguiente: "Amarillo/Verde",  costo: 55  },
  "Amarillo/Verde":  { siguiente: "Verde",           costo: 60  },
  "Verde":           { siguiente: "Verde/Azul",      costo: 65  },
  "Verde/Azul":      { siguiente: "Azul",            costo: 70  },
  "Azul":            { siguiente: "Azul/Rojo",       costo: 75  },
  "Azul/Rojo":       { siguiente: "Rojo",            costo: 80  },
  "Rojo":            { siguiente: "Rojo/Negro",      costo: 90  },
  "Rojo/Negro":      { siguiente: "Negro",           costo: 100 },
  "Negro":           { siguiente: null,              costo: 0   },
};

export const MEMBRESIAS = [
  { id: "basica",     nombre: "Básico",     sesiones: 8,   color: "#3b82f6" },
  { id: "estandar",   nombre: "Estándar",   sesiones: 12,  color: "#2563EB" },
  { id: "premium",    nombre: "Completo",   sesiones: 999, color: "#a855f7" },
  { id: "trimestral", nombre: "Trimestral", sesiones: 999, color: "#22c55e" },
  { id: "semestral",  nombre: "Semestral",  sesiones: 999, color: "#06b6d4" },
  { id: "anual",      nombre: "Anual",      sesiones: 999, color: "#f43f5e" },
];

export const PERMISOS = {
  superadmin: ["superadmin"],
  admin:    ["dashboard","students","clases_prueba","payments","cobranza","ventas","attendance","examenes","finance","events","users","inventario","gastos","configuracion","kiosco"],
  profesor: ["attendance","students","clases_prueba","ventas","examenes","kiosco"],
  alumno:   ["mi_asistencia","mis_pagos","mi_historial"],
};

export const CINTURON_COLOR = {
  Blanco:             "#ffffff",
  "Blanco/Amarillo":  "#fef08a",
  Amarillo:           "#fbbf24",
  "Amarillo/Verde":   "#a3e635",
  Verde:              "#22c55e",
  "Verde/Azul":       "#34d399",
  Azul:               "#3b82f6",
  "Azul/Rojo":        "#a78bfa",
  Rojo:               "#ef4444",
  "Rojo/Negro":       "#f97316",
  Negro:              "#374151",
};

export const PAGO_ESTADO_CONFIG = {
  "pagado":    { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "Al día"    },
  "al día":    { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "Al día"    },
  "parcial":   { bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30",   label: "Parcial"   },
  "vencido":   { bg: "bg-red-500/20",     text: "text-red-400",     border: "border-red-500/30",     label: "Vencido"   },
  "pendiente": { bg: "bg-slate-500/20",   text: "text-slate-400",   border: "border-slate-500/30",   label: "Pendiente" },
  "pausado":   { bg: "bg-purple-500/20",  text: "text-purple-400",  border: "border-purple-500/30",  label: "Pausado"   },
};

export const PRODUCTOS = [
  { id: "agua_p",     nombre: "Agua pequeña",       precio: 0.50,  cat: "bebidas"     },
  { id: "agua_g",     nombre: "Agua grande",         precio: 0.75,  cat: "bebidas"     },
  { id: "pow_p",      nombre: "Powerade pequeño",    precio: 0.75,  cat: "bebidas"     },
  { id: "pow_g",      nombre: "Powerade grande",     precio: 1.15,  cat: "bebidas"     },
  { id: "canilleras", nombre: "Canilleras",          precio: 30.00, cat: "implementos" },
  { id: "braceras",   nombre: "Braceras",            precio: 30.00, cat: "implementos" },
  { id: "guantes",    nombre: "Guantes",             precio: 30.00, cat: "implementos" },
  { id: "empeineras", nombre: "Empeineras",          precio: 30.00, cat: "implementos" },
  { id: "bucal",      nombre: "Bucal",               precio: 5.00,  cat: "implementos" },
  { id: "ing",        nombre: "Protector inguinal",  precio: 25.00, cat: "implementos" },
  { id: "peto",       nombre: "Peto",                precio: 45.00, cat: "implementos" },
  { id: "cab_sm",     nombre: "Cabezal sin mica",    precio: 45.00, cat: "implementos" },
  { id: "cab_cm",     nombre: "Cabezal con mica",    precio: 60.00, cat: "implementos" },
  { id: "dobok_tr",   nombre: "Dobok tradicional",   precio: 55.00, cat: "uniformes"   },
  { id: "dobok_po",   nombre: "Dobok poomsae",       precio: 65.00, cat: "uniformes"   },
];
