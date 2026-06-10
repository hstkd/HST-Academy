import { useState, useEffect, useCallback, useRef } from "react";

const LOGO_SRC = "https://i.imgur.com/tQZkiMl.png";

const SUPABASE_URL = "https://khmqgetdhjidpboniuoj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobXFnZXRkaGppZHBib25pdW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk0OTYsImV4cCI6MjA5NDk3NTQ5Nn0.jIZzqrQAnObmFHixbvRxBcYijw3qxCT0bxWaC99EL68";

const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

// club_id global — se setea al login
let CURRENT_CLUB_ID = null;
const GLOBAL_TABLES = ["clubs","suscripciones"]; // users SI se filtra por club_id

const db = {
  get: async (table, filters = "", bypassClub = false) => {
    try {
      const clubFilter = (!bypassClub && !GLOBAL_TABLES.includes(table) && CURRENT_CLUB_ID)
        ? `&club_id=eq.${CURRENT_CLUB_ID}` : "";
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc${clubFilter}${filters}`, { headers: HEADERS });
      if (!r.ok) return [];
      return r.json();
    } catch { return []; }
  },
  insert: async (table, data) => {
    try {
      const payload = (!GLOBAL_TABLES.includes(table) && CURRENT_CLUB_ID)
        ? { ...data, club_id: CURRENT_CLUB_ID } : data;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...HEADERS, "Prefer":"return=representation" }, body: JSON.stringify(payload) });
      if (!r.ok) return null;
      const res = await r.json();
      return Array.isArray(res) ? res[0] : res;
    } catch { return null; }
  },
  update: async (table, id, data) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(data) });
      if (!r.ok) return null;
      const res = await r.json();
      return Array.isArray(res) ? res[0] : res;
    } catch { return null; }
  },
  delete: async (table, id) => {
    try { await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: HEADERS }); } catch {}
  },
};

const today = new Date();
// Ecuador is UTC-5 — always use local date, not UTC
const fmt = (d) => {
  const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  return local.toISOString().slice(0, 10);
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Calcula NUEVA fecha de vencimiento desde la fecha de vencimiento ACTUAL (no desde fecha de pago)
// Si no hay vencimiento previo, usa fechaBase (fecha inscripción/pago inicial)
const calcVencimiento = (fechaBase, membresiaId) => {
  if (!fechaBase) return fmt(addDays(today, 30));
  const base = new Date(fechaBase + "T12:00:00");
  const v = new Date(base);
  if (membresiaId === "trimestral") v.setMonth(v.getMonth() + 3);
  else if (membresiaId === "semestral") v.setMonth(v.getMonth() + 6);
  else if (membresiaId === "anual") v.setFullYear(v.getFullYear() + 1);
  else v.setMonth(v.getMonth() + 1);
  return fmt(v);
};

// Calcula nueva fecha de vencimiento desde el vencimiento ANTERIOR
// Regla: siempre extender desde fecha_vencimiento actual, no desde fecha de pago
const calcNuevoVencimiento = (fechaVencActual, membresiaId) => {
  // Si tiene vencimiento previo, extender desde ahí
  if (fechaVencActual) {
    return calcVencimiento(fechaVencActual, membresiaId);
  }
  // Si no hay vencimiento previo (primer pago), usar hoy
  return calcVencimiento(fmt(new Date()), membresiaId);
};

const calcEdad = (fechaNac) => {
  if (!fechaNac) return { years: 0, months: 0, days: 0, total: 0 };
  const nac = new Date(fechaNac);
  const hoy = new Date();
  let years = hoy.getFullYear() - nac.getFullYear();
  let months = hoy.getMonth() - nac.getMonth();
  let days = hoy.getDate() - nac.getDate();
  if (days < 0) { months--; days += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, days, total: years };
};

const getCategoria = (fechaNac) => {
  if (!fechaNac) return "Infantil";
  const currentYear = new Date().getFullYear();
  const birthYear = new Date(fechaNac).getFullYear();
  const ageThisYear = currentYear - birthYear;
  if (ageThisYear <= 11) return "Infantil";
  if (ageThisYear <= 14) return "Cadete";
  if (ageThisYear <= 17) return "Junior";
  if (ageThisYear <= 30) return "Senior";
  return "Máster";
};

const MEMBRESIAS = [
  { id: "basica",      nombre: "Básico",      sesiones: 8,   color: "#3b82f6" },
  { id: "estandar",    nombre: "Estándar",    sesiones: 12,  color: "#d4a017" },
  { id: "premium",     nombre: "Completo",    sesiones: 999, color: "#a855f7" },
  { id: "trimestral",  nombre: "Trimestral",  sesiones: 999, color: "#22c55e" },
  { id: "semestral",   nombre: "Semestral",   sesiones: 999, color: "#06b6d4" },
  { id: "anual",       nombre: "Anual",       sesiones: 999, color: "#f43f5e" },
];

const CINTURONES = ["Blanco","Blanco/Amarillo","Amarillo","Amarillo/Verde","Verde","Verde/Azul","Azul","Azul/Rojo","Rojo","Rojo/Negro","Negro"];
const SEDES = ["Quito","Cumbayá"];

const COSTOS_ASCENSO = {
  "Blanco":          { siguiente:"Blanco/Amarillo", costo:45  },
  "Blanco/Amarillo": { siguiente:"Amarillo",        costo:50  },
  "Amarillo":        { siguiente:"Amarillo/Verde",  costo:55  },
  "Amarillo/Verde":  { siguiente:"Verde",           costo:60  },
  "Verde":           { siguiente:"Verde/Azul",      costo:65  },
  "Verde/Azul":      { siguiente:"Azul",            costo:70  },
  "Azul":            { siguiente:"Azul/Rojo",       costo:75  },
  "Azul/Rojo":       { siguiente:"Rojo",            costo:80  },
  "Rojo":            { siguiente:"Rojo/Negro",      costo:90  },
  "Rojo/Negro":      { siguiente:"Negro",           costo:100 },
  "Negro":           { siguiente:null,              costo:0   },
};

const cinturonColor = {
  Blanco:"#ffffff","Blanco/Amarillo":"#fef08a",Amarillo:"#fbbf24",
  "Amarillo/Verde":"#a3e635",Verde:"#22c55e","Verde/Azul":"#34d399",
  Azul:"#3b82f6","Azul/Rojo":"#a78bfa",Rojo:"#ef4444",
  "Rojo/Negro":"#f97316",Negro:"#374151",
};

const pagoEstadoConfig = {
  "pagado":   { bg:"bg-emerald-500/20", text:"text-emerald-400", border:"border-emerald-500/30", label:"Al día" },
  "al día":   { bg:"bg-emerald-500/20", text:"text-emerald-400", border:"border-emerald-500/30", label:"Al día" },
  "parcial":  { bg:"bg-amber-500/20",   text:"text-amber-400",   border:"border-amber-500/30",   label:"Parcial" },
  "vencido":  { bg:"bg-red-500/20",     text:"text-red-400",     border:"border-red-500/30",     label:"Vencido" },
  "pendiente":{ bg:"bg-slate-500/20",   text:"text-slate-400",   border:"border-slate-500/30",   label:"Pendiente" },
  "pausado":  { bg:"bg-purple-500/20",  text:"text-purple-400",  border:"border-purple-500/30",  label:"Pausado" },
};

const PRODUCTOS = [
  { id:"agua_p",    nombre:"Agua pequeña",         precio:0.50,  cat:"bebidas"     },
  { id:"agua_g",    nombre:"Agua grande",           precio:0.75,  cat:"bebidas"     },
  { id:"pow_p",     nombre:"Powerade pequeño",      precio:0.75,  cat:"bebidas"     },
  { id:"pow_g",     nombre:"Powerade grande",       precio:1.15,  cat:"bebidas"     },
  { id:"canilleras",nombre:"Canilleras",            precio:30.00, cat:"implementos" },
  { id:"braceras",  nombre:"Braceras",              precio:30.00, cat:"implementos" },
  { id:"guantes",   nombre:"Guantes",               precio:30.00, cat:"implementos" },
  { id:"empeineras",nombre:"Empeineras",            precio:30.00, cat:"implementos" },
  { id:"bucal",     nombre:"Bucal",                 precio:5.00,  cat:"implementos" },
  { id:"ing",       nombre:"Protector inguinal",    precio:25.00, cat:"implementos" },
  { id:"peto",      nombre:"Peto",                  precio:45.00, cat:"implementos" },
  { id:"cab_sm",    nombre:"Cabezal sin mica",      precio:45.00, cat:"implementos" },
  { id:"cab_cm",    nombre:"Cabezal con mica",      precio:60.00, cat:"implementos" },
  { id:"dobok_tr",  nombre:"Dobok tradicional",     precio:55.00, cat:"uniformes"   },
  { id:"dobok_po",  nombre:"Dobok poomsae",         precio:65.00, cat:"uniformes"   },
];

const PERMISOS = {
  superadmin: ["superadmin"],
  admin:    ["dashboard","students","payments","ventas","attendance","examenes","finance","events","users","inventario","gastos","configuracion"],
  profesor: ["attendance","students","ventas","examenes"],
  alumno:   ["mi_asistencia","mis_pagos","mi_historial"],
};

const REFRESH_INTERVAL = 300000;

const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    dashboard:    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    students:     <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    payments:     <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    ventas:       <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
    attendance:   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    belt:         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    examenes:     <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    finance:      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    calendar:     <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users:        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    plus:         <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
    minus:        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />,
    edit:         <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trash:        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    search:       <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    x:            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    check:        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    logout:       <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    menu:         <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
    lock:         <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    eye:          <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>,
    key:          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
    mi_asistencia:<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    mis_pagos:    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    mi_historial: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    trophy:       <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {icons[name]||null}
    </svg>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)" }}>
    <div className={`relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full ${wide?"max-w-3xl":"max-w-lg"} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>{title}</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><Icon name="x" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all";
const Input = (props) => <input className={inputCls} {...props} />;
const Textarea = (props) => <textarea className={`${inputCls} resize-none`} rows={3} {...props} />;

const Select = ({ options, ...props }) => (
  <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50 transition-all" {...props}>
    {options.map((o) => typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const StatCard = ({ title, value, sub, icon, accent="amber" }) => {
  const accents = { amber:"from-amber-500/20 to-amber-600/5 border-amber-500/20", emerald:"from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", red:"from-red-500/20 to-red-600/5 border-red-500/20", blue:"from-blue-500/20 to-blue-600/5 border-blue-500/20", purple:"from-purple-500/20 to-purple-600/5 border-purple-500/20" };
  const iconColors = { amber:"text-amber-400", emerald:"text-emerald-400", red:"text-red-400", blue:"text-blue-400", purple:"text-purple-400" };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${accents[accent]||accents.amber}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{value}</p>
          {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/5 ${iconColors[accent]||iconColors.amber}`}><Icon name={icon} className="w-6 h-6" /></div>
      </div>
    </div>
  );
};

const BeltBadge = ({ cinturon }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:`${cinturonColor[cinturon]||"#fff"}22`, color:cinturon==="Blanco"?"#e2e8f0":(cinturonColor[cinturon]||"#fff"), border:`1px solid ${cinturonColor[cinturon]||"#fff"}44` }}>
    <span className="w-2 h-2 rounded-full" style={{ background:cinturonColor[cinturon]||"#fff" }} />{cinturon}
  </span>
);

const StatusBadge = ({ estado }) => {
  const cfg = pagoEstadoConfig[estado]||pagoEstadoConfig.pendiente;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
};

const MembresiaTag = ({ membresiaId }) => {
  const m = MEMBRESIAS.find((x) => x.id===membresiaId);
  if (!m) return null;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:`${m.color}22`, color:m.color, border:`1px solid ${m.color}44` }}>{m.sesiones===999?"♾️":`${m.sesiones}🎯`} {m.nombre}</span>;
};

const RoleBadge = ({ role }) => {
  const cfg = { admin:{color:"#d4a017",label:"Admin"}, profesor:{color:"#3b82f6",label:"Profesor"}, alumno:{color:"#22c55e",label:"Alumno/Padre"} };
  const c = cfg[role]||cfg.alumno;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${c.color}22`, color:c.color }}>{c.label}</span>;
};

const CategoriaBadge = ({ categoria }) => {
  const colors = { Infantil:"#22c55e", Cadete:"#3b82f6", Junior:"#d4a017", Senior:"#ef4444" };
  const c = colors[categoria]||"#94a3b8";
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${c}22`, color:c }}>{categoria}</span>;
};

const MiniBarChart = ({ data, color="#d4a017" }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full rounded-t-sm" style={{ height:`${(d.value/max)*56}px`, background:color, opacity:0.5+0.5*(i/data.length) }} />
          <span className="text-[9px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Selector de alumno con buscador ────────────────────────────────────────────
const AlumnoSelector = ({ students, value, onChange, placeholder="Buscar alumno...", disabled=false, extraOption=null }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = students.find(s=>s.id===value);
  const filtered = students.filter(s=>
    `${s.nombres} ${s.apellidos}`.toLowerCase().includes(q.toLowerCase()) ||
    s.cinturon?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 20);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (id) => { onChange(id); setOpen(false); setQ(""); };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" onClick={()=>{ if(!disabled) setOpen(o=>!o); }}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm text-left transition-all"
        style={{ background:"rgba(255,255,255,0.05)", borderColor: open?"rgba(30,58,123,0.6)":"rgba(255,255,255,0.1)", color: selected?"white":"#64748b" }}>
        <span className="truncate">
          {selected ? `${selected.nombres} ${selected.apellidos}` : placeholder}
        </span>
        <span className="text-slate-500 ml-2">{open?"▲":"▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border shadow-2xl overflow-hidden"
          style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.4)", maxHeight:"260px" }}>
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:"rgba(255,255,255,0.05)" }}>
              <Icon name="search" className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Escribir nombre..."
                className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none" />
              {q && <button onClick={()=>setQ("")} className="text-slate-500 hover:text-white text-xs">✕</button>}
            </div>
          </div>
          {/* Options */}
          <div className="overflow-y-auto" style={{ maxHeight:"200px" }}>
            {extraOption && (
              <button type="button" onClick={()=>select("")}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-400 hover:bg-white/5 border-b"
                style={{ borderColor:"rgba(30,58,123,0.2)" }}>
                {extraOption}
              </button>
            )}
            {filtered.map(s=>(
              <button type="button" key={s.id} onClick={()=>select(s.id)}
                className="w-full px-4 py-2.5 text-left text-sm transition-all hover:bg-blue-900/30"
                style={{ background: value===s.id?"rgba(30,58,123,0.3)":"transparent" }}>
                <p className={`font-semibold ${value===s.id?"text-white":"text-slate-200"}`}>
                  {s.nombres} {s.apellidos}
                </p>
                <p className="text-xs text-slate-500">{s.cinturon} · {s.sede}</p>
              </button>
            ))}
            {filtered.length===0 && (
              <p className="text-center text-slate-500 text-xs py-4">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── RegisterClub — pantalla de registro para nuevas academias ─────────────────
const RegisterClub = ({ onBack }) => {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ownerNombre, setOwnerNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [plan, setPlan] = useState("basico");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const save = async () => {
    if (!nombre||!email||!password||!ownerNombre) { setErr("Completa todos los campos obligatorios"); return; }
    setSaving(true); setErr("");
    // Verificar email único
    const existing = await db.get("users", `&email=eq.${encodeURIComponent(email)}`, true);
    if (existing?.length > 0) { setErr("Este correo ya está registrado"); setSaving(false); return; }
    const trialHasta = new Date();
    trialHasta.setDate(trialHasta.getDate() + 15);
    const trialStr = trialHasta.toISOString().slice(0,10);
    // Crear club
    const club = await db.insert("clubs", {
      nombre, ciudad, telefono, email,
      plan, estado:"trial",
      trial_hasta: trialStr,
    });
    if (!club?.id) { setErr("Error al crear la academia. Intenta nuevamente."); setSaving(false); return; }
    // Crear usuario admin del club
    await db.insert("users", {
      nombre: ownerNombre, email, password,
      role: "admin", club_id: club.id,
    });
    // Actualizar owner_id del club
    await db.update("clubs", club.id, { owner_id: club.id });
    setOk(`¡Academia registrada! Tienes 15 días de prueba gratuita hasta el ${trialStr}. Ya puedes iniciar sesión.`);
    setSaving(false);
  };

  if (ok) return (
    <div className="text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-black text-white">¡Registro exitoso!</h2>
      <p className="text-emerald-400 text-sm">{ok}</p>
      <button onClick={onBack} className="w-full py-3 rounded-xl font-bold text-[#020617]"
        style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
        Iniciar sesión
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white">Registrar Academia</h2>
        <p className="text-slate-400 text-xs mt-1">15 días gratis · Sin tarjeta de crédito</p>
      </div>
      {err && <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
      <div className="space-y-3">
        <Field label="Nombre de la academia *"><Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Academia Taekwondo XYZ" /></Field>
        <Field label="Tu nombre completo *"><Input value={ownerNombre} onChange={e=>setOwnerNombre(e.target.value)} placeholder="Nombre del administrador" /></Field>
        <Field label="Ciudad"><Input value={ciudad} onChange={e=>setCiudad(e.target.value)} placeholder="Quito, Guayaquil..." /></Field>
        <Field label="Teléfono WhatsApp"><Input value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="+593..." /></Field>
        <Field label="Correo (para login) *"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" /></Field>
        <Field label="Contraseña *"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
        <Field label="Plan">
          <div className="grid grid-cols-2 gap-2">
            {[
                {id:"basico", titulo:"Básico", precio:"$30/mes", desc:"Hasta 30 alumnos"},
                {id:"pro",    titulo:"Pro",    precio:"$50/mes", desc:"Alumnos ilimitados"},
              ].map(({id,titulo,precio,desc})=>(
              <button key={id} type="button" onClick={()=>setPlan(id)}
                className="p-3 rounded-xl border text-center transition-all"
                style={plan===id?{background:"rgba(30,58,123,0.3)",borderColor:"rgba(30,58,123,0.6)"}:{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.1)"}}>
                <p className="font-black text-white text-sm">{titulo}</p>
                <p className="text-yellow-400 font-bold text-xs">{precio}</p>
                <p className="text-slate-400 text-[10px]">{desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">Selecciona tu plan — activarás el pago al terminar el período de prueba.</p>
        </Field>
      </div>
      <button onClick={save} disabled={saving} className="w-full py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60"
        style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
        {saving?"Registrando...":"Crear cuenta gratis"}
      </button>
      <button onClick={onBack} className="w-full text-center text-sm text-slate-500 hover:text-slate-300">← Volver al login</button>
    </div>
  );
};

// ── SuperAdminPage — panel de control de todas las academias ──────────────────
const SuperAdminPage = ({ currentUser, reload }) => {
  const [clubs, setClubs] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState(null);
  const [showSuscForm, setShowSuscForm] = useState(false);

  useEffect(()=>{
    const load = async () => {
      const [c, s] = await Promise.all([db.get("clubs","",true), db.get("suscripciones","",true)]);
      setClubs(Array.isArray(c)?c:[]);
      setSuscripciones(Array.isArray(s)?s:[]);
      setLoading(false);
    };
    load();
  },[]);

  const reloadAll = async () => {
    const [c,s] = await Promise.all([db.get("clubs","",true), db.get("suscripciones","",true)]);
    setClubs(Array.isArray(c)?c:[]);
    setSuscripciones(Array.isArray(s)?s:[]);
  };

  const toggleEstado = async (club) => {
    const nuevoEstado = club.estado === "activo" ? "suspendido" : "activo";
    await db.update("clubs", club.id, { estado: nuevoEstado });
    await reloadAll();
  };

  const hoy = new Date().toISOString().slice(0,10);
  const activos   = clubs.filter(c=>c.estado==="activo").length;
  const trial     = clubs.filter(c=>c.estado==="trial").length;
  const suspendidos = clubs.filter(c=>c.estado==="suspendido").length;
  const mrr = clubs.filter(c=>c.estado==="activo").reduce((a,c)=>a+(c.plan==="pro"?50:30),0);

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>SUPER ADMIN</h1>
        <p className="text-slate-500 text-sm">Panel de control — HS Taekwondo System</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.2)" }}>
          <p className="text-xs text-emerald-400 font-semibold uppercase">MRR Estimado</p>
          <p className="text-3xl font-black text-white">${mrr}</p>
          <p className="text-xs text-slate-500 mt-1">{activos} academias activas</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.2)" }}>
          <p className="text-xs text-blue-400 font-semibold uppercase">Total Academias</p>
          <p className="text-3xl font-black text-white">{clubs.length}</p>
          <p className="text-xs text-slate-500 mt-1">{trial} en prueba · {suspendidos} suspendidas</p>
        </div>
      </div>

      {/* Lista de clubes */}
      <div className="space-y-3">
        {loading && <p className="text-slate-500 text-center py-8">Cargando...</p>}
        {clubs.sort((a,b)=>b.created_at?.localeCompare(a.created_at)).map(club=>{
          const suscClub = suscripciones.filter(s=>s.club_id===club.id).sort((a,b)=>b.created_at?.localeCompare(a.created_at));
          const ultimaSusc = suscClub[0];
          return (
            <div key={club.id} className="p-4 rounded-2xl border" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.25)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-white">{club.nombre}</p>
                  <p className="text-xs text-slate-500">{club.ciudad} · {club.email}</p>
                  <p className="text-xs text-slate-500">{club.telefono}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    club.estado==="activo"?"bg-emerald-500/20 text-emerald-400":
                    club.estado==="trial"?"bg-blue-500/20 text-blue-400":
                    "bg-red-500/20 text-red-400"}`}>
                    {club.estado==="trial"?`Trial hasta ${club.trial_hasta}`:club.estado}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                    {club.plan==="pro"?"Pro $50":"Básico $30"}
                  </span>
                </div>
              </div>

              {ultimaSusc && (
                <p className="text-xs text-slate-500 mb-2">Último pago: {ultimaSusc.fecha_pago} · Vence: {ultimaSusc.fecha_vencimiento}</p>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={()=>{ setSelectedClub(club); setShowSuscForm(true); }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  💳 Registrar pago
                </button>
                <button onClick={()=>toggleEstado(club)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${club.estado==="suspendido"?"bg-emerald-500/20 text-emerald-400":"bg-red-500/20 text-red-400"}`}>
                  {club.estado==="suspendido"?"▶ Activar":"⏸ Suspender"}
                </button>
                <select value={club.plan} onChange={async e=>{ await db.update("clubs",club.id,{plan:e.target.value}); reloadAll(); }}
                  className="px-2 py-1 rounded-lg bg-white/5 text-white text-xs border border-white/10">
                  <option value="basico" className="bg-slate-800">Básico $30</option>
                  <option value="pro" className="bg-slate-800">Pro $50</option>
                </select>
              </div>
            </div>
          );
        })}
        {!loading && clubs.length===0 && (
          <p className="text-center text-slate-500 py-8">Sin academias registradas aún</p>
        )}
      </div>

      {/* Modal registrar pago suscripción */}
      {showSuscForm && selectedClub && (
        <SuscripcionForm club={selectedClub} reload={reloadAll} onClose={()=>{ setShowSuscForm(false); setSelectedClub(null); }} />
      )}
    </div>
  );
};

const SuscripcionForm = ({ club, reload, onClose }) => {
  const [monto, setMonto] = useState(club.plan==="pro"?"50":"30");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0,10));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const vencimiento = new Date(fechaPago+"T12:00:00");
  vencimiento.setMonth(vencimiento.getMonth()+1);
  const fechaVenc = vencimiento.toISOString().slice(0,10);

  const save = async () => {
    setSaving(true);
    await db.insert("suscripciones", {
      club_id: club.id,
      plan: club.plan,
      monto: parseFloat(monto),
      fecha_pago: fechaPago,
      fecha_vencimiento: fechaVenc,
      estado: "activo",
      notas,
    });
    // Activar club
    await db.update("clubs", club.id, { estado:"activo" });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Pago — ${club.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.3)" }}>
          <p className="text-xs text-slate-400">Plan: <span className="text-white font-bold">{club.plan==="pro"?"Pro $50/mes":"Básico $30/mes"}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto ($)"><Input type="number" value={monto} onChange={e=>setMonto(e.target.value)} /></Field>
          <Field label="Fecha de pago"><Input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} /></Field>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-slate-400">Próximo vencimiento: <span className="text-emerald-400 font-bold">{fechaVenc}</span></p>
        </div>
        <Field label="Notas"><Input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Transferencia, referencia..." /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar pago"}</button>
      </div>
    </Modal>
  );
};

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotUser, setForgotUser] = useState(null);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const handleLogin = async () => {
    if (!email||!password) { setErr("Completa todos los campos"); return; }
    setLoading(true); setErr("");
    const users = await db.get("users",`&email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`, true);
    if (users&&users.length>0) {
      const u = users[0];
      if (u.role === "superadmin") { onLogin(u); return; }
      if (u.club_id) {
        const clubs = await db.get("clubs",`&id=eq.${u.club_id}`, true);
        const club = clubs?.[0];
        if (club) {
          const hoy = new Date().toISOString().slice(0,10);
          if (club.estado === "suspendido") { setErr("Tu academia está suspendida. Contacta a HS Taekwondo System."); setLoading(false); return; }
          if (club.estado === "trial" && club.trial_hasta < hoy) { setErr("Tu período de prueba venció. Contacta a HS Taekwondo System para activar."); setLoading(false); return; }
        }
      }
      onLogin(u);
    }
    else { setErr("Correo o contraseña incorrectos"); setLoading(false); }
  };

  const handleForgot = async () => {
    if (!forgotEmail) { setErr("Ingresa tu correo"); return; }
    setLoading(true); setErr("");
    const users = await db.get("users",`&email=eq.${encodeURIComponent(forgotEmail)}`, true);
    if (users&&users.length>0) { setForgotUser(users[0]); setMode("change_pass"); }
    else setErr("No existe una cuenta con ese correo");
    setLoading(false);
  };

  const handleChangePass = async () => {
    if (!newPass||!confirmPass) { setErr("Completa todos los campos"); return; }
    if (newPass.length<6) { setErr("Mínimo 6 caracteres"); return; }
    if (newPass!==confirmPass) { setErr("Las contraseñas no coinciden"); return; }
    setLoading(true); setErr("");
    await db.update("users", forgotUser.id, { password:newPass });
    setOk("✅ Contraseña actualizada. Inicia sesión.");
    setTimeout(()=>{ setMode("login"); setOk(""); setForgotUser(null); setForgotEmail(""); setNewPass(""); setConfirmPass(""); }, 2500);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:"linear-gradient(135deg,#080d1a 0%,#0d1426 40%,#0a1535 100%)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background:"radial-gradient(circle,#1e3a7b,transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background:"radial-gradient(circle,#6b7280,transparent)" }} />
      </div>
      <div className="relative w-full max-w-md p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-5 bg-white shadow-2xl shadow-blue-900/30 p-2">
            <img src={LOGO_SRC} alt="HST Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.1em" }}>HS TAEKWONDO SYSTEM</h1>
          <p className="font-medium tracking-widest text-xs mt-2" style={{ color:"#9ca3af" }}>SISTEMA DE GESTIÓN ACADÉMICA</p>
        </div>
        <div className="border rounded-3xl p-8 shadow-2xl" style={{ background:"rgba(13,20,38,0.95)", borderColor:"rgba(30,58,123,0.3)" }}>
          {mode==="login" && <>
            <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
            {err&&<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
            <div className="space-y-4">
              <Field label="Correo"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></Field>
              <Field label="Contraseña"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></Field>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{loading?"VERIFICANDO...":"INGRESAR AL SISTEMA"}</button>
            <div className="mt-4 pt-4 border-t" style={{ borderColor:"rgba(30,58,123,0.2)" }}>
              <button onClick={()=>{setMode("register");setErr("");}}
                className="w-full py-3 rounded-xl border text-sm font-semibold transition-all"
                style={{ borderColor:"rgba(30,58,123,0.4)", color:"#93c5fd", background:"rgba(30,58,123,0.1)" }}>
                🏫 Registrar mi academia — Prueba gratis 15 días
              </button>
            </div>
            <button onClick={()=>{setMode("forgot");setErr("");}} className="w-full mt-3 text-center text-sm text-slate-500 hover:text-yellow-500 transition-colors">¿Olvidaste tu contraseña?</button>
          </>}
          {mode==="register" && <RegisterClub onBack={()=>{setMode("login");setErr("");}} />}
          {mode==="forgot" && <>
            <h2 className="text-xl font-bold text-white mb-2">Recuperar Contraseña</h2>
            <p className="text-slate-400 text-sm mb-6">Ingresa tu correo registrado.</p>
            {err&&<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
            <Field label="Correo"><Input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="tu@correo.com" onKeyDown={e=>e.key==="Enter"&&handleForgot()} /></Field>
            <button onClick={handleForgot} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{loading?"BUSCANDO...":"CONTINUAR"}</button>
            <button onClick={()=>{setMode("login");setErr("");}} className="w-full mt-3 text-center text-sm text-slate-500 hover:text-amber-400 transition-colors">← Volver</button>
          </>}
          {mode==="change_pass" && <>
            <h2 className="text-xl font-bold text-white mb-2">Nueva Contraseña</h2>
            <p className="text-slate-400 text-sm mb-6">Cuenta: <span className="text-amber-400">{forgotUser?.email}</span></p>
            {err&&<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
            {ok&&<div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">{ok}</div>}
            <div className="space-y-4">
              <Field label="Nueva contraseña"><Input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
              <Field label="Confirmar"><Input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Repite la contraseña" onKeyDown={e=>e.key==="Enter"&&handleChangePass()} /></Field>
            </div>
            <button onClick={handleChangePass} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{loading?"GUARDANDO...":"CAMBIAR CONTRASEÑA"}</button>
            <button onClick={()=>{setMode("login");setErr("");}} className="w-full mt-3 text-center text-sm text-slate-500 hover:text-amber-400 transition-colors">← Volver</button>
          </>}
        </div>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ currentUser, onClose }) => {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setErr(""); setOk("");
    if (!oldPass||!newPass||!confirm) { setErr("Completa todos los campos"); return; }
    if (newPass.length<6) { setErr("Mínimo 6 caracteres"); return; }
    if (newPass!==confirm) { setErr("Las contraseñas no coinciden"); return; }
    setSaving(true);
    const users = await db.get("users",`&id=eq.${currentUser.id}`, true);
    if (!users||users[0]?.password!==oldPass) { setErr("Contraseña actual incorrecta"); setSaving(false); return; }
    await db.update("users", currentUser.id, { password:newPass });
    setOk("✅ Contraseña actualizada");
    setTimeout(onClose, 2000);
    setSaving(false);
  };

  return (
    <Modal title="Cambiar Contraseña" onClose={onClose}>
      <div className="space-y-4">
        {err&&<div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
        {ok&&<div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">{ok}</div>}
        <Field label="Contraseña actual"><Input type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} placeholder="••••••••" /></Field>
        <Field label="Nueva contraseña"><Input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
        <Field label="Confirmar nueva contraseña"><Input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Cambiar"}</button>
      </div>
    </Modal>
  );
};

const DashboardPage = ({ students, pagos, historialPagos, asistencia, ventas, eventos, examenes }) => {
  const activos = students.filter(s=>s.estado==="activo").length;
  const hoyDash = fmt(new Date());
  // Vencido = fecha_vencimiento <= hoy, sin importar si pagó
  const vencidos = pagos.filter(p =>
    p.fecha_vencimiento && p.fecha_vencimiento <= hoyDash
  ).length;
  // Sumar todos los abonos del mes desde historial_pagos
  const ingresosMes = (historialPagos||[]).filter(h=>h.fecha_pago?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0);
  const ventasMes = (ventas||[]).filter(v=>v.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0);
  const eventosMes = (eventos||[]).reduce((a,e)=>{ try { const parts=JSON.parse(e.participantes||"[]"); return a+parts.filter(p=>p.pagado).reduce((s,p)=>s+parseFloat(p.valor||0),0); } catch { return a; } },0);
  const examenesTotal = (examenes||[]).filter(ex=>ex.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,ex)=>a+parseFloat(ex.monto_pagado||ex.monto||0),0);
  const hoyPresentes = asistencia.filter(a=>a.fecha===fmt(today)&&a.presente).length;
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const chartData = meses.slice(0,today.getMonth()+1).map((label,i)=>({ label, value:pagos.filter(p=>parseInt(p.fecha_pago?.slice(5,7))===i+1).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0) }));
  const memCounts = MEMBRESIAS.map(m=>({ ...m, count:students.filter(s=>s.membresia===m.id&&s.estado==="activo").length }));
  // Estado basado SOLO en fecha_vencimiento
  const pagosConEstadoReal = pagos.map(p => {
    if (!p.fecha_vencimiento) return p;
    if (p.fecha_vencimiento <= hoyDash) return { ...p, estado: "vencido" };
    if (parseFloat(p.monto_pagado||0) >= parseFloat(p.monto||1)) return { ...p, estado: "pagado" };
    if (parseFloat(p.monto_pagado||0) > 0) return { ...p, estado: "parcial" };
    return { ...p, estado: "pendiente" };
  });

  const alertas = [
    ...pagosConEstadoReal.filter(p => p.estado === "vencido").map(p => ({
      tipo: "error",
      msg: `🔴 Pago VENCIDO: ${p.alumno_nombre} — vencido el ${p.fecha_vencimiento}`
    })),
    // Alumnos activos sin ningún pago registrado
    ...students.filter(s => s.estado === "activo" && !pagos.find(p => p.alumno_id === s.id)).map(s => ({
      tipo: "warn",
      msg: `⚪ Sin pago registrado: ${s.nombres} ${s.apellidos}`
    })),
    ...pagosConEstadoReal.filter(p => {
      if (p.estado === "pagado" || p.estado === "vencido") return false;
      if (!p.fecha_vencimiento) return false;
      const dias = Math.ceil((new Date(p.fecha_vencimiento) - today) / 86400000);
      return dias >= 0 && dias <= 5;
    }).map(p => {
      const dias = Math.ceil((new Date(p.fecha_vencimiento) - today) / 86400000);
      return { tipo: "warn", msg: `🟡 Vence en ${dias} día(s): ${p.alumno_nombre}` };
    }),
    ...students.filter(s => {
      const b = new Date(s.fecha_nacimiento);
      return b.getDate() === today.getDate() && b.getMonth() === today.getMonth();
    }).map(s => ({ tipo: "info", msg: `🎂 Cumpleaños: ${s.nombres} ${s.apellidos}` })),
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>DASHBOARD</h1>
        <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString("es-EC",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Alumnos" value={students.length} sub={`${activos} activos`} icon="students" accent="blue" />
        <StatCard title="Asistencia Hoy" value={hoyPresentes} icon="attendance" accent="emerald" />
        <StatCard title="Pagos Vencidos" value={vencidos} icon="payments" accent="red" />
        <StatCard title="Ingresos Mes" value={`$${(ingresosMes+ventasMes+eventosMes+examenesTotal).toFixed(0)}`} sub="Pagos+Ventas+Eventos+Exámenes" icon="finance" accent="amber" />
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>MEMBRESÍAS ACTIVAS</h3>
        <div className="grid grid-cols-3 gap-4">
          {memCounts.map(m=>(
            <div key={m.id} className="rounded-2xl p-4 text-center border" style={{ background:`${m.color}12`, borderColor:`${m.color}30` }}>
              <p className="text-xs font-bold text-slate-400">{m.nombre}</p>
              <p className="text-4xl font-black mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif", color:m.color }}>{m.count}</p>
              <p className="text-xs mt-1" style={{ color:m.color }}>{m.sesiones===999?"Ilimitadas":`${m.sesiones} ses.`}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>INGRESOS POR MENSUALIDADES</h3>
          <MiniBarChart data={chartData} color="#d4a017" />
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>CINTURONES</h3>
          <div className="space-y-2">
            {CINTURONES.map(c=>{ const count=students.filter(s=>s.cinturon===c).length; const pct=students.length?(count/students.length)*100:0; return (
              <div key={c} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate">{c}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2"><div className="h-2 rounded-full" style={{ width:`${pct}%`, background:cinturonColor[c]==="#ffffff"?"#e2e8f0":cinturonColor[c] }} /></div>
                <span className="text-xs font-bold text-slate-300 w-4">{count}</span>
              </div>
            ); })}
          </div>
        </div>
      </div>
      {alertas.length>0&&(
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-400 mb-3" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>⚡ ALERTAS</h3>
          <div className="space-y-2">{alertas.map((a,i)=><div key={i} className={`p-3 rounded-xl text-sm ${a.tipo==="error"?"bg-red-500/10 text-red-400":a.tipo==="warn"?"bg-amber-500/10 text-amber-400":"bg-blue-500/10 text-blue-400"}`}>{a.msg}</div>)}</div>
        </div>
      )}
    </div>
  );
};

const StudentFormModal = ({ student, reload, onClose }) => {
  const [nombres, setNombres] = useState(student?.nombres || "");
  const [apellidos, setApellidos] = useState(student?.apellidos || "");
  const [fechaNac, setFechaNac] = useState(student?.fecha_nacimiento || "");
  const [representante, setRepresentante] = useState(student?.representante || "");
  const [telefono, setTelefono] = useState(student?.telefono || "");
  const [correo, setCorreo] = useState(student?.correo || ""); // Usuario para login
  const [userPass, setUserPass] = useState(""); // dummy, no se usa
  const [direccion, setDireccion] = useState(student?.direccion || "");
  const [sede, setSede] = useState(student?.sede || "Quito");
  const [cinturon, setCinturon] = useState(student?.cinturon || "Blanco");
  const [membresia, setMembresia] = useState(student?.membresia || "estandar");
  const [estado, setEstado] = useState(student?.estado || "activo");
  const [observaciones, setObservaciones] = useState(student?.observaciones || "");
  const [fechaIns, setFechaIns] = useState(student?.fecha_inscripcion || "");
  // Contraseña se genera automáticamente
  const [saving, setSaving] = useState(false);
  const edadInfo = calcEdad(fechaNac);
  const categoria = getCategoria(fechaNac);

  const [registrarPago, setRegistrarPago] = useState(false);
  const [montoInscripcion, setMontoInscripcion] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(""); // Para mostrar credenciales
  const [showCredentials, setShowCredentials] = useState(false);
  const [montoPagadoIns, setMontoPagadoIns] = useState("");
  // fechaVencIns se calcula dinámicamente desde fechaIns + membresia
  const fechaVencIns = calcVencimiento(fechaIns, membresia);

  const save = async () => {
    if (!nombres || !apellidos) return;
    if (registrarPago && !fechaIns) { alert("Debes ingresar la fecha de inscripción para registrar el pago."); return; }
    
    // Si es nuevo alumno y tiene usuario, generar contraseña y mostrar credenciales
    if (!student && correo) {
      const tempPass = Math.random().toString(36).substring(2, 10);
      setGeneratedPassword(tempPass);
      setShowCredentials(true);
      return; // No guardar aún, esperar confirmación
    }
    
    setSaving(true);
    const data = { nombres, apellidos, edad: edadInfo.total, fecha_nacimiento: fechaNac, representante, telefono, correo, direccion, sede, cinturon, membresia, estado, categoria, observaciones, fecha_inscripcion: fechaIns };
    if (student) {
      // Si cambió el usuario, actualizar en tabla users
      if (student.correo && correo !== student.correo) {
        try {
          const users = await db.get("users", "", true);
          const userOld = users?.find(u => u.email === student.correo && u.role === "alumno" && u.club_id === CURRENT_CLUB_ID);
          if (userOld) {
            await db.update("users", userOld.id, { email: correo, nombre: `${nombres} ${apellidos}` });
          }
        } catch (err) {
          console.log("Error actualizando usuario:", err);
        }
      } else if (!student.correo && correo) {
        // Crear usuario si no existía antes
        try {
          const tempPassword = Math.random().toString(36).substring(2, 10);
          await db.insert("users", { 
            nombre: `${nombres} ${apellidos}`, 
            email: correo, 
            password: tempPassword, 
            role: "alumno",
            created_at: fmt(new Date())
          });
        } catch (err) {
          console.log("Error creando usuario:", err);
        }
      }
      await db.update("students", student.id, data);
    } else {
      const newStudent = await db.insert("students", data);
      // Crear usuario automáticamente si tiene usuario asignado
      if (correo) {
        const tempPassword = generatedPassword || Math.random().toString(36).substring(2, 10);
        try {
          await db.insert("users", { 
            nombre: `${nombres} ${apellidos}`, 
            email: correo, 
            password: tempPassword, 
            role: "alumno",
            created_at: fmt(new Date())
          });
        } catch (err) {
          console.log("Usuario ya existe o error:", err);
        }
      }
      // Registrar pago inicial si se indicó
      if (registrarPago && montoInscripcion && newStudent?.id) {
        const total = parseFloat(montoInscripcion) || 0;
        const pagado = parseFloat(montoPagadoIns) || 0;
        const memb = MEMBRESIAS.find(m => m.id === membresia);
        await db.insert("pagos", {
          alumno_id: newStudent.id,
          alumno_nombre: `${nombres} ${apellidos}`,
          monto: total,
          monto_pagado: pagado,
          fecha_pago: fechaIns,
          fecha_vencimiento: fechaVencIns,
          tipo: memb?.nombre || "Mensualidad",
          sede,
          notas: "Pago al inscripción",
        });
        // Guardar en historial también
        if (pagado > 0) {
          await db.insert("historial_pagos", {
            alumno_id: newStudent.id,
            alumno_nombre: `${nombres} ${apellidos}`,
            monto_pagado: pagado,
            fecha_pago: fechaIns,
            nueva_fecha_vencimiento: fechaVencIns,
            tipo: memb?.nombre || "Mensualidad",
            observaciones: "Pago inicial al inscribirse",
          });
        }
      }
    }
    await reload();
    setSaving(false);
    setShowCredentials(false);
    onClose();
  };

  const confirmAndSave = async () => {
    setSaving(true);
    setShowCredentials(false);
    const data = { nombres, apellidos, edad: edadInfo.total, fecha_nacimiento: fechaNac, representante, telefono, correo, direccion, sede, cinturon, membresia, estado, categoria, observaciones, fecha_inscripcion: fechaIns };
    const newStudent = await db.insert("students", data);
    // Crear usuario automáticamente si tiene usuario asignado
    if (correo) {
      const tempPassword = generatedPassword || Math.random().toString(36).substring(2, 10);
      try {
        await db.insert("users", { 
          nombre: `${nombres} ${apellidos}`, 
          email: correo, 
          password: tempPassword, 
          role: "alumno",
          created_at: fmt(new Date())
        });
      } catch (err) {
        console.log("Usuario ya existe o error:", err);
      }
    }
    // Registrar pago inicial si se indicó
    if (registrarPago && montoInscripcion && newStudent?.id) {
      const total = parseFloat(montoInscripcion) || 0;
      const pagado = parseFloat(montoPagadoIns) || 0;
      const memb = MEMBRESIAS.find(m => m.id === membresia);
      await db.insert("pagos", {
        alumno_id: newStudent.id,
        alumno_nombre: `${nombres} ${apellidos}`,
        monto: total,
        monto_pagado: pagado,
        fecha_pago: fechaIns,
        fecha_vencimiento: fechaVencIns,
        tipo: memb?.nombre || "Mensualidad",
        sede,
        notas: "Pago al inscripción",
      });
      // Guardar en historial también
      if (pagado > 0) {
        await db.insert("historial_pagos", {
          alumno_id: newStudent.id,
          alumno_nombre: `${nombres} ${apellidos}`,
          monto_pagado: pagado,
          fecha_pago: fechaIns,
          nueva_fecha_vencimiento: fechaVencIns,
          tipo: memb?.nombre || "Mensualidad",
          observaciones: "Pago inicial al inscribirse",
        });
      }
    }
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={student ? "Editar Alumno" : "Nuevo Alumno"} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombres"><Input value={nombres} onChange={e => setNombres(e.target.value)} placeholder="Nombres" /></Field>
        <Field label="Apellidos"><Input value={apellidos} onChange={e => setApellidos(e.target.value)} placeholder="Apellidos" /></Field>
        <Field label="Fecha de Nacimiento"><Input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} /></Field>
        <Field label="Edad y Categoría (auto)">
          <div className="flex items-center gap-2 h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl">
            {fechaNac ? <><span className="text-white text-sm font-bold">{edadInfo.total} años</span><CategoriaBadge categoria={categoria} /></> : <span className="text-slate-500 text-sm">Ingresa fecha de nacimiento</span>}
          </div>
        </Field>
        <Field label="Representante"><Input value={representante} onChange={e => setRepresentante(e.target.value)} placeholder="Representante" /></Field>
        <Field label="Teléfono"><Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="0991234567" /></Field>
        <Field label="Usuario (para login en app)" className="col-span-2"><Input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="ej: juan.mendoza" /></Field>
        {!student && (
          <div className="col-span-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400 font-semibold">✓ Contraseña generada automáticamente</p>
            <p className="text-xs text-slate-400 mt-1">Se creará un usuario con una contraseña temporal que el alumno/padre podrá cambiar.</p>
          </div>
        )}
        <Field label="Dirección" className="col-span-2"><Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección" /></Field>
        <Field label="Sede">
          <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={sede} onChange={e => setSede(e.target.value)}>
            {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </Field>
        <Field label="Cinturón">
          <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={cinturon} onChange={e => setCinturon(e.target.value)}>
            {CINTURONES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Membresía">
          <div className="grid grid-cols-3 gap-2 mt-1">
            {MEMBRESIAS.map(m => (
              <button key={m.id} type="button" onClick={() => setMembresia(m.id)}
                className="p-3 rounded-xl border text-center transition-all"
                style={{ background: membresia === m.id ? `${m.color}30` : "rgba(255,255,255,0.03)", borderColor: membresia === m.id ? m.color : "rgba(255,255,255,0.1)", color: membresia === m.id ? m.color : "#94a3b8" }}>
                <p className="text-xs font-bold">{m.nombre}</p>
                <p className="text-[10px] mt-0.5">{m.sesiones === 999 ? "Ilimitadas" : `${m.sesiones} ses.`}</p>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Fecha Inscripción *">
          <Input type="date" value={fechaIns} onChange={e => setFechaIns(e.target.value)} />
          {!fechaIns && <p className="text-xs text-amber-400 mt-1">⚠️ Requerida para calcular el vencimiento del pago</p>}
        </Field>
        <Field label="Observaciones" className="col-span-2"><Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} /></Field>
        {!student && (
          <div className="col-span-2 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=>setRegistrarPago(!registrarPago)}
                className={`w-10 h-6 rounded-full transition-all ${registrarPago?"bg-amber-500":"bg-white/10"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${registrarPago?"translate-x-4":"translate-x-0.5"}`} />
              </button>
              <span className="text-sm font-semibold text-white">Registrar primer pago ahora</span>
            </div>
            {registrarPago && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <Field label="Monto Total ($)"><input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50" type="number" value={montoInscripcion} onChange={e=>{
                  setMontoInscripcion(e.target.value);
                }} placeholder="0.00" /></Field>
                <Field label="Monto Pagado ($)"><input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50" type="number" value={montoPagadoIns} onChange={e=>setMontoPagadoIns(e.target.value)} placeholder="0.00" /></Field>
                <Field label="Vence automáticamente">
                  <div className="flex items-center gap-2 h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl">
                    {!fechaIns ? (
                      <span className="text-slate-500 text-sm">Ingresa primero la fecha de inscripción</span>
                    ) : (
                      <>
                        <span className={`text-sm font-bold ${fechaVencIns < fmt(today) ? "text-red-400" : "text-emerald-400"}`}>
                          {fechaVencIns}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${fechaVencIns < fmt(today) ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {fechaVencIns < fmt(today) ? "Vencido" : `en ${Math.ceil((new Date(fechaVencIns + "T12:00:00") - today) / 86400000)} días`}
                        </span>
                      </>
                    )}
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background: "linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving ? "Guardando..." : student ? "Guardar Cambios" : "Crear Alumno"}</button>
      </div>

      {/* Modal de Credenciales Temporales */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="border border-white/10 rounded-2xl p-6 max-w-md w-full" style={{ background:"#0d1426" }}>
            <p className="text-xs text-amber-400 font-bold mb-2">⚠️ CREDENCIALES TEMPORALES</p>
            <h3 className="text-lg font-black text-white mb-4">Nuevo Usuario Creado</h3>
            
            <div className="space-y-3 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div>
                <p className="text-xs text-slate-400">Usuario (para login)</p>
                <p className="font-mono text-sm font-bold text-white bg-white/5 p-2.5 rounded mt-1 break-all select-all">{correo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Contraseña temporal</p>
                <p className="font-mono text-lg font-black text-emerald-400 bg-white/5 p-2.5 rounded mt-1 select-all">{generatedPassword}</p>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-400 font-semibold">ℹ️ Importante</p>
              <p className="text-xs text-slate-400 mt-2">
                • Comparte estas credenciales con el alumno/padre<br/>
                • La contraseña puede ser cambiada desde la app<br/>
                • Guarda esta información en un lugar seguro
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCredentials(false)} 
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAndSave} 
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" 
                style={{ background: "linear-gradient(135deg,#d4a017,#b8860b)" }}
              >
                {saving ? "Guardando..." : "Confirmar y Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

const StudentsPage = ({ students, reload, canEdit, asistencia, examenes, eventos, pagos, historialPagos, ventas }) => {
  const [search, setSearch] = useState("");
  const [filterSede, setFilterSede] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return `${s.nombres} ${s.apellidos} ${s.telefono||""}`.toLowerCase().includes(q) && (filterSede==="Todas"||s.sede===filterSede) && (filterEstado==="Todos"||s.estado===filterEstado);
  });

  const onDelete = async (id) => {
    if (!confirm("¿Eliminar alumno?")) return;
    await db.delete("students", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>ALUMNOS</h1><p className="text-slate-400 text-sm">{filtered.length} de {students.length}</p></div>
        <button onClick={()=>{ setEditStudent(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Alumno</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Select options={["Todas",...SEDES]} value={filterSede} onChange={e=>setFilterSede(e.target.value)} />
        <Select options={["Todos","activo","inactivo"]} value={filterEstado} onChange={e=>setFilterEstado(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s=>(
          <div key={s.id} className="group bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/30 hover:bg-white/5 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                <div><p className="font-bold text-white text-sm">{s.nombres} {s.apellidos}</p><p className="text-xs text-slate-500">{s.edad} años · {s.sede}</p></div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.estado==="activo"?"bg-emerald-500/20 text-emerald-400":"bg-slate-500/20 text-slate-400"}`}>{s.estado}</span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap"><BeltBadge cinturon={s.cinturon} /><CategoriaBadge categoria={s.categoria||getCategoria(s.fecha_nacimiento)} /><MembresiaTag membresiaId={s.membresia} />
              {examenes && examenes.some(ex=>ex.alumno_id===s.id&&ex.tipo?.includes("GAL")) ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">✓ GAL</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400">Sin GAL</span>}
            </div>
            <div className="text-xs text-slate-500 space-y-1"><p>📱 {s.telefono}</p><p>👤 {s.representante}</p></div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>setViewStudent(s)} className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 flex items-center justify-center gap-1"><Icon name="eye" className="w-3 h-3" /> Ver</button>
              {canEdit&&<button onClick={()=>{ setEditStudent(s); setShowForm(true); }} className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 flex items-center justify-center gap-1"><Icon name="edit" className="w-3 h-3" /> Editar</button>}
              {canEdit&&<button onClick={()=>onDelete(s.id)} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 flex items-center justify-center gap-1"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>}
            </div>
          </div>
        ))}
      </div>
      {showForm && <StudentFormModal student={editStudent} reload={reload} onClose={()=>{ setShowForm(false); setEditStudent(null); }} />}
      {viewStudent && (() => {
        // Datos del alumno
        const vId = viewStudent.id;
        const vAsist = asistencia.filter(a=>a.alumno_id===vId).sort((a,b)=>b.fecha.localeCompare(a.fecha));
        const vPresentes = vAsist.filter(a=>a.presente).length;
        const vExamenes = examenes.filter(e=>e.alumno_id===vId).sort((a,b)=>b.fecha?.localeCompare(a.fecha));
        const vPago = pagos.find(p=>p.alumno_id===vId);
        const vHistPagos = (historialPagos||[]).filter(h=>h.alumno_id===vId).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago));
        const vVentas = ventas.filter(v=>v.alumno_id===vId).sort((a,b)=>b.fecha?.localeCompare(a.fecha));
        const vGal = vExamenes.some(e=>e.tipo?.includes("GAL"));
        const hoyStr = fmt(new Date());
        const vencido = vPago?.fecha_vencimiento && vPago.fecha_vencimiento <= hoyStr;
        const asistMes = vAsist.filter(a=>a.fecha?.slice(0,7)===hoyStr.slice(0,7)&&a.presente).length;

        return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background:"#080d1a" }}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.3)" }}>
            <button onClick={()=>setViewStudent(null)} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
              ←
            </button>
            <div className="flex-1">
              <p className="font-black text-white text-sm">{viewStudent.nombres} {viewStudent.apellidos}</p>
              <p className="text-xs text-slate-500">{viewStudent.cinturon} · {viewStudent.sede}</p>
            </div>
            <button onClick={()=>{ setViewStudent(null); setEditStudent(viewStudent); setShowForm(true); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/10">
              ✏️ Editar
            </button>
          </div>

          <div className="p-4 space-y-4 max-w-2xl mx-auto pb-10">
            {/* Avatar + stats rápidos */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background:"rgba(13,20,38,0.8)", borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617] flex-shrink-0"
                style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
                {viewStudent.nombres[0]}{viewStudent.apellidos[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-white">{viewStudent.nombres} {viewStudent.apellidos}</h2>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <BeltBadge cinturon={viewStudent.cinturon} />
                  <CategoriaBadge categoria={viewStudent.categoria||getCategoria(viewStudent.fecha_nacimiento)} />
                  <MembresiaTag membresiaId={viewStudent.membresia} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${viewStudent.estado==="activo"?"bg-emerald-500/20 text-emerald-400":"bg-slate-500/20 text-slate-400"}`}>
                    {viewStudent.estado}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats rápidos */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-2xl p-3 text-center border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.2)" }}>
                <p className="text-xl font-black text-emerald-400">{vPresentes}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Asistencias</p>
              </div>
              <div className="rounded-2xl p-3 text-center border" style={{ background:"rgba(212,160,23,0.1)", borderColor:"rgba(212,160,23,0.2)" }}>
                <p className="text-xl font-black text-yellow-400">{vExamenes.filter(e=>e.tipo?.includes("Ascenso")).length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ascensos</p>
              </div>
              <div className="rounded-2xl p-3 text-center border" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xl font-black text-blue-400">{asistMes}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Este mes</p>
              </div>
              <div className="rounded-2xl p-3 text-center border" style={{ background:vGal?"rgba(168,85,247,0.1)":"rgba(100,116,139,0.1)", borderColor:vGal?"rgba(168,85,247,0.2)":"rgba(100,116,139,0.2)" }}>
                <p className={`text-xl font-black ${vGal?"text-purple-400":"text-slate-500"}`}>{vGal?"✓":"✗"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">GAL</p>
              </div>
            </div>

            {/* Datos personales */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Datos Personales</p>
              </div>
              <div className="grid grid-cols-2 gap-px" style={{ background:"rgba(30,58,123,0.1)" }}>
                {[["Representante",viewStudent.representante],["Teléfono",viewStudent.telefono],["Usuario",viewStudent.correo],["Dirección",viewStudent.direccion],["Edad",`${viewStudent.edad} años`],["Nacimiento",viewStudent.fecha_nacimiento],["Inscripción",viewStudent.fecha_inscripcion],["Sede",viewStudent.sede]].map(([k,v])=>(
                  <div key={k} className="p-3" style={{ background:"#0d1426" }}>
                    <p className="text-[10px] text-slate-500 uppercase">{k}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{v||"—"}</p>
                  </div>
                ))}
              </div>
              {viewStudent.observaciones && (
                <div className="p-3 border-t" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.2)" }}>
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-slate-300">{viewStudent.observaciones}</p>
                </div>
              )}
            </div>

            {/* Pago actual */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Membresía Actual</p>
              </div>
              {vPago ? (
                <div className="p-4" style={{ background:"#0d1426" }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-white">{vPago.tipo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Vence: {vPago.fecha_vencimiento}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">${parseFloat(vPago.monto_pagado||0).toFixed(2)}<span className="text-xs text-slate-500">/${parseFloat(vPago.monto||0).toFixed(2)}</span></p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vencido?"bg-red-500/20 text-red-400":"bg-emerald-500/20 text-emerald-400"}`}>
                        {vencido?"Vencido":"Al día"}
                      </span>
                    </div>
                  </div>
                  {/* Historial de pagos */}
                  {vHistPagos.length > 0 && (
                    <div className="space-y-1 mt-3 pt-3 border-t" style={{ borderColor:"rgba(30,58,123,0.2)" }}>
                      <p className="text-[10px] text-slate-500 uppercase mb-2">Historial de pagos</p>
                      {vHistPagos.map(h=>(
                        <div key={h.id} className="flex justify-between text-xs p-2 rounded-lg" style={{ background:"rgba(255,255,255,0.03)" }}>
                          <span className="text-slate-400">{h.fecha_pago} · {h.tipo}</span>
                          <span className="text-emerald-400 font-bold">${parseFloat(h.monto_pagado||0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm" style={{ background:"#0d1426" }}>Sin pago registrado</div>
              )}
            </div>

            {/* Asistencia */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="px-4 py-3 border-b flex justify-between items-center" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Asistencia</p>
                <p className="text-xs text-slate-400">{vPresentes} totales</p>
              </div>
              <div className="p-3 space-y-1 max-h-48 overflow-y-auto" style={{ background:"#0d1426" }}>
                {vAsist.slice(0,20).map(a=>(
                  <div key={a.id} className={`flex justify-between p-2 rounded-lg text-xs ${a.presente?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>
                    <span>{a.fecha}</span><span>{a.presente?"✓ Presente":"✗ Falta"}</span>
                  </div>
                ))}
                {vAsist.length===0 && <p className="text-slate-500 text-sm text-center py-4">Sin registros</p>}
              </div>
            </div>

            {/* Exámenes */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Exámenes y GAL</p>
              </div>
              <div className="p-3 space-y-2" style={{ background:"#0d1426" }}>
                {vExamenes.map(ex=>(
                  <div key={ex.id} className="flex justify-between p-3 rounded-xl text-xs border" style={{ background:"rgba(212,160,23,0.05)", borderColor:"rgba(212,160,23,0.15)" }}>
                    <div>
                      <p className="font-bold text-amber-400">{ex.tipo}</p>
                      <p className="text-slate-500 mt-0.5">{ex.fecha}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">${parseFloat(ex.monto_pagado||ex.monto||0).toFixed(2)}</p>
                      {parseFloat(ex.saldo_pendiente||0)>0 && <p className="text-red-400">Debe: ${parseFloat(ex.saldo_pendiente).toFixed(2)}</p>}
                    </div>
                  </div>
                ))}
                {vExamenes.length===0 && <p className="text-slate-500 text-sm text-center py-4">Sin exámenes registrados</p>}
              </div>
            </div>

            {/* Compras/Ventas */}
            {vVentas.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
                <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Compras</p>
                </div>
                <div className="p-3 space-y-2" style={{ background:"#0d1426" }}>
                  {vVentas.map(v=>(
                    <div key={v.id} className="flex justify-between p-3 rounded-xl text-xs border" style={{ background:"rgba(168,85,247,0.05)", borderColor:"rgba(168,85,247,0.15)" }}>
                      <div>
                        <p className="font-bold text-purple-400">{v.detalle?.substring(0,35)}</p>
                        <p className="text-slate-500 mt-0.5">{v.fecha}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">${parseFloat(v.total||0).toFixed(2)}</p>
                        {parseFloat(v.saldo_pendiente||0)>0 && <p className="text-red-400">Debe: ${parseFloat(v.saldo_pendiente).toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
};

const CompletarModal = ({ pago, historialPagos, reload, onClose }) => {
  const [montoAbono, setMontoAbono] = useState("");
  const [fechaPago, setFechaPago] = useState(fmt(new Date()));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const montoPendiente = Math.max(0, parseFloat(pago.monto||0) - parseFloat(pago.monto_pagado||0));
  const montoIngreso = parseFloat(montoAbono) || 0;
  const nuevoMontoPagado = parseFloat(pago.monto_pagado||0) + montoIngreso;

  const save = async () => {
    if (montoIngreso <= 0) return;
    setSaving(true);
    // Actualizar monto_pagado en pago
    const montoCuota = parseFloat(pago.monto||0);
    const nuevoEstadoMembresia = nuevoMontoPagado >= montoCuota ? "Activa" : pago.estado_membresia;
    await db.update("pagos", pago.id, {
      monto_pagado: nuevoMontoPagado,
      estado_membresia: nuevoEstadoMembresia,
    });
    // Guardar en historial
    await db.insert("historial_pagos", {
      alumno_id: pago.alumno_id,
      alumno_nombre: pago.alumno_nombre,
      monto_pagado: montoIngreso,
      fecha_pago: fechaPago,
      nueva_fecha_vencimiento: pago.fecha_vencimiento,
      tipo: pago.tipo,
      observaciones: notas || "Abono a cuenta",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Completar pago — ${pago.alumno_nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-slate-400">Pagado</p>
            <p className="text-sm font-bold text-white">${parseFloat(pago.monto_pagado||0).toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Faltante</p>
            <p className="text-sm font-bold text-amber-400">${montoPendiente.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-bold text-white">${parseFloat(pago.monto||0).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto a abonar ($)">
            <Input 
              type="number" 
              value={montoAbono} 
              onChange={e=>setMontoAbono(e.target.value)} 
              placeholder={montoPendiente.toFixed(2)}
              step="0.01"
            />
            <p className="text-xs text-slate-400 mt-1">Faltante: ${montoPendiente.toFixed(2)}</p>
          </Field>

          <Field label="Fecha del pago">
            <Input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} />
          </Field>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-slate-400 mb-1">Nuevo total pagado</p>
          <p className="text-lg font-black text-emerald-400">${nuevoMontoPagado.toFixed(2)} / ${parseFloat(pago.monto||0).toFixed(2)}</p>
          {nuevoMontoPagado >= parseFloat(pago.monto||0) && (
            <p className="text-xs text-emerald-400 mt-1">✓ Pago completo - Se actualizará a pagado</p>
          )}
          {nuevoMontoPagado < parseFloat(pago.monto||0) && (
            <p className="text-xs text-amber-400 mt-1">⚠️ Aún falta: ${(parseFloat(pago.monto||0) - nuevoMontoPagado).toFixed(2)}</p>
          )}
        </div>

        <Field label="Notas (opcional)">
          <Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: Abono de deuda anterior..." />
        </Field>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||montoIngreso<=0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Completar pago"}</button>
      </div>
    </Modal>
  );
};

const PausarModal = ({ pago, reload, onClose }) => {
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await db.update("pagos", pago.id, {
      estado_membresia: "Pausada",
    });
    // Registrar en historial
    await db.insert("historial_pagos", {
      alumno_id: pago.alumno_id,
      alumno_nombre: pago.alumno_nombre,
      monto_pagado: 0,
      fecha_pago: fmt(new Date()),
      nueva_fecha_vencimiento: pago.fecha_vencimiento,
      tipo: "Pausa de membresía",
      observaciones: notas || "Membresía pausada temporalmente",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Pausar membresía — ${pago.alumno_nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
          <p className="text-xs text-slate-400 mb-2">ℹ️ Información</p>
          <p className="text-sm text-slate-300">
            La membresía será pausada. No se marcará como morosa o pendiente mientras esté pausada.
          </p>
          <p className="text-xs text-slate-500 mt-2">Membresía actual vence: {pago.fecha_vencimiento}</p>
        </div>

        <Field label="Motivo de la pausa (opcional)">
          <Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: El alumno está de viaje, retomará en..." />
        </Field>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Pausar membresía"}</button>
      </div>
    </Modal>
  );
};

const ReanudirModal = ({ pago, students, reload, onClose }) => {
  const [tipoPago, setTipoPago] = useState("estandar");
  const [montoTotal, setMontoTotal] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [fechaPago, setFechaPago] = useState(fmt(new Date()));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const fechaVenc = calcVencimiento(fechaPago, tipoPago);
  const total = parseFloat(montoTotal)||0;
  const pagado = parseFloat(montoPagado)||0;
  const memb = MEMBRESIAS.find(m=>m.id===tipoPago);

  const save = async () => {
    if (!montoTotal) return;
    setSaving(true);
    // Actualizar pago existente
    await db.update("pagos", pago.id, {
      monto: total,
      monto_pagado: pagado,
      fecha_pago: fechaPago,
      fecha_vencimiento: fechaVenc,
      tipo: memb?.nombre || tipoPago,
      estado_membresia: "Activa",
    });
    // Guardar renovación en historial
    await db.insert("historial_pagos", {
      alumno_id: pago.alumno_id,
      alumno_nombre: pago.alumno_nombre,
      monto_pagado: pagado,
      fecha_pago: fechaPago,
      nueva_fecha_vencimiento: fechaVenc,
      tipo: memb?.nombre || tipoPago,
      observaciones: notas || "Reanudación de membresía",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Reanudar — ${pago.alumno_nombre}`} onClose={onClose} wide>
      <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
        ▶️ Membresía reanudada. Define nueva membresía desde hoy.
      </div>
      <div className="space-y-5">
        <Field label="Nueva Membresía">
          <div className="grid grid-cols-3 gap-2">
            {MEMBRESIAS.map(m=>(
              <button key={m.id} type="button" onClick={()=>setTipoPago(m.id)}
                className="p-3 rounded-xl border text-center transition-all"
                style={{ background:tipoPago===m.id?`${m.color}25`:"rgba(255,255,255,0.03)", borderColor:tipoPago===m.id?m.color:"rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-bold" style={{ color:tipoPago===m.id?m.color:"#94a3b8" }}>{m.nombre}</p>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto Total ($)"><Input type="number" value={montoTotal} onChange={e=>setMontoTotal(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Monto Pagado ($)"><Input type="number" value={montoPagado} onChange={e=>setMontoPagado(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Fecha de inicio"><Input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} /></Field>
          <Field label="Vence"><div className="flex items-center h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl"><span className="text-emerald-400 text-sm font-bold">{fechaVenc}</span></div></Field>
        </div>
        <Field label="Notas (opcional)"><Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: Retomó clases..." /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||!montoTotal} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Reanudar membresía"}</button>
      </div>
    </Modal>
  );
};

const RenovarModal = ({ pago, students, reload, onClose }) => {
  const [tipoPago, setTipoPago] = useState("estandar");
  const [montoTotal, setMontoTotal] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [fechaPago, setFechaPago] = useState(fmt(today));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  // REGLA: vencimiento se extiende desde fecha_vencimiento anterior, NO desde fecha de pago
  const nuevaFechaVenc = calcNuevoVencimiento(pago.fecha_vencimiento, tipoPago);
  const total = parseFloat(montoTotal)||0;
  const pagado = parseFloat(montoPagado)||0;
  const memb = MEMBRESIAS.find(m=>m.id===tipoPago);

  const save = async () => {
    if (!montoTotal) return;
    setSaving(true);
    await db.update("pagos", pago.id, {
      monto: total,
      monto_pagado: pagado,
      fecha_vencimiento: nuevaFechaVenc,
      tipo: memb?.nombre || tipoPago,
    });
    await db.insert("historial_pagos", {
      alumno_id: pago.alumno_id,
      alumno_nombre: pago.alumno_nombre,
      monto_pagado: pagado,
      fecha_pago: fechaPago,
      nueva_fecha_vencimiento: nuevaFechaVenc,
      tipo: memb?.nombre || tipoPago,
      observaciones: notas || "Renovación de membresía",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Renovar — ${pago.alumno_nombre}`} onClose={onClose} wide>
      {/* Ciclo actual → nuevo ciclo */}
      <div className="mb-4 p-3 rounded-xl border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.3)" }}>
        <p className="text-xs text-slate-400 mb-2">📅 Ciclo de membresía</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-400 font-bold">{pago.fecha_vencimiento || "Sin fecha"}</span>
          <span className="text-slate-500">→</span>
          <span className="text-emerald-400 font-bold">{nuevaFechaVenc}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">El vencimiento se extiende desde el ciclo anterior, no desde la fecha de pago.</p>
      </div>
      <div className="space-y-5">
        <Field label="Membresía">
          <div className="grid grid-cols-3 gap-2">
            {MEMBRESIAS.map(m=>(
              <button key={m.id} type="button" onClick={()=>setTipoPago(m.id)}
                className="p-3 rounded-xl border text-center transition-all"
                style={{ background:tipoPago===m.id?`${m.color}25`:"rgba(255,255,255,0.03)", borderColor:tipoPago===m.id?m.color:"rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-bold" style={{ color:tipoPago===m.id?m.color:"#94a3b8" }}>{m.nombre}</p>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto Total ($)"><Input type="number" value={montoTotal} onChange={e=>setMontoTotal(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Monto Pagado ($)"><Input type="number" value={montoPagado} onChange={e=>setMontoPagado(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Fecha de Pago (referencia)">
            <Input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} />
          </Field>
          <Field label="Nuevo vencimiento">
            <div className="flex items-center h-[42px] px-4 rounded-xl border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.3)" }}>
              <span className="text-emerald-400 text-sm font-bold">{nuevaFechaVenc}</span>
            </div>
          </Field>
        </div>
        <Field label="Notas"><Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Renovación de membresía..." /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||!montoTotal} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar Renovación"}</button>
      </div>
    </Modal>
  );
};

const PaymentsPage = ({ students, pagos, historialPagos, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [renovarPago, setRenovarPago] = useState(null);
  const [completarPago, setCompletarPago] = useState(null);
  const [pausarPago, setPausarPago] = useState(null);
  const [reanudarPago, setReanudarPago] = useState(null);
  // Estado determinado ÚNICAMENTE por fecha_vencimiento vs hoy
  const hoyPagos = fmt(new Date());
  // Retorna TODOS los estados aplicables (array)
  const getEstadosReal = (p) => {
    const estados = [];

    if (p.estado_membresia === "Pausada") {
      estados.push("pausado");
      return estados;
    }

    const pagado = parseFloat(p.monto_pagado || 0);
    const total = parseFloat(p.monto || 0);
    const hoy = fmt(new Date()); // Siempre fresco
    const fv = p.fecha_vencimiento ? String(p.fecha_vencimiento).slice(0, 10) : null;
    const vencido = fv && fv <= hoy;

    if (vencido) {
      estados.push("vencido");
      if (pagado > 0 && pagado < total) estados.push("parcial");
      return estados;
    }

    // No vencido
    if (pagado >= total && total > 0) {
      estados.push("al día");
    } else if (pagado > 0) {
      estados.push("parcial");
    } else {
      estados.push("pendiente");
    }

    return estados;
  };
  
  // Para compatibilidad, getEstadoReal retorna el principal
  const getEstadoReal = (p) => getEstadosReal(p)[0];
  // Solo mostrar el pago más reciente por alumno (evitar duplicados)
  const pagosUnicosPorAlumno = pagos.reduce((acc, p) => {
    const existing = acc.find(x => x.alumno_id === p.alumno_id);
    if (!existing) {
      acc.push(p);
    } else {
      // Quedar con el de fecha_vencimiento más reciente
      const existingDate = existing.fecha_vencimiento || "0000-00-00";
      const currentDate = p.fecha_vencimiento || "0000-00-00";
      if (currentDate > existingDate) {
        const idx = acc.indexOf(existing);
        acc[idx] = p;
      }
    }
    return acc;
  }, []);

  const pagosReal = pagosUnicosPorAlumno.map(p => {
    const estados = getEstadosReal(p);
    return { ...p, estado: estados[0], estados };
  });
  const filtered = filter==="Todos" ? pagosReal : pagosReal.filter(p => p.estados && p.estados.includes(filter));
  const getDays = f => {
    const hoyMs = new Date(hoyPagos + "T00:00:00").getTime();
    const vencMs = new Date(f + "T00:00:00").getTime();
    return Math.ceil((vencMs - hoyMs) / 86400000);
  };
  // Sumar ingresos de historial_pagos del mes actual (todos los abonos)
  const totalMes = historialPagos.filter(h=>h.fecha_pago?.slice(0,7)===hoyPagos.slice(0,7)).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0);
  const totalDeuda = pagosReal.filter(p=>p.estados && (p.estados.includes("vencido")||p.estados.includes("parcial")||p.estados.includes("pendiente"))).reduce((a,p)=>a+Math.max(0,parseFloat(p.monto||0)-parseFloat(p.monto_pagado||0)),0);

  const PagoForm = ({ onClose }) => {
    const active = students.filter(s=>s.estado==="activo");
    const [alumnoId, setAlumnoId] = useState(active[0]?.id||"");
    const [tipoPago, setTipoPago] = useState("estandar");
    const [montoTotal, setMontoTotal] = useState("");
    const [montoPagado, setMontoPagado] = useState("");
    const [fechaPago, setFechaPago] = useState(fmt(today));
    const [fechaVenc, setFechaVenc] = useState(fmt(addDays(today,30)));
    const [notas, setNotas] = useState("");
    const [saving, setSaving] = useState(false);
    const alumno = active.find(s=>s.id===alumnoId);
    const total = parseFloat(montoTotal)||0;
    const pagado = parseFloat(montoPagado)||0;
    const deuda = Math.max(0,total-pagado);
    const memb = MEMBRESIAS.find(m=>m.id===tipoPago);

    const save = async () => {
      if (!alumnoId||!montoTotal) return;
      setSaving(true);
      // Verificar si ya existe pago para este alumno
      const pagoExistente = pagos.find(p => p.alumno_id === alumnoId);
      if (pagoExistente) {
        // REGLA: nueva fecha vencimiento = fecha_vencimiento_actual + duración plan
        // No usar fechaPago como base para el cálculo
        const nuevaFechaVenc = calcNuevoVencimiento(pagoExistente.fecha_vencimiento, tipoPago);
        await db.update("pagos", pagoExistente.id, {
          monto: total,
          monto_pagado: pagado,
          fecha_vencimiento: nuevaFechaVenc,
          tipo: memb?.nombre || tipoPago,
        });
        await db.insert("historial_pagos", {
          alumno_id: alumnoId,
          alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
          monto_pagado: pagado,
          fecha_pago: fechaPago,
          nueva_fecha_vencimiento: nuevaFechaVenc,
          tipo: memb?.nombre || tipoPago,
          observaciones: notas,
        });
      } else {
        // Nuevo pago (primer registro) — vencimiento desde fecha_inscripcion del alumno
        const baseParaVenc = alumno?.fecha_inscripcion || fechaPago;
        const vencimientoInicial = calcVencimiento(baseParaVenc, tipoPago);
        await db.insert("pagos", {
          alumno_id: alumnoId,
          alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
          monto: total,
          monto_pagado: pagado,
          fecha_pago: fechaPago,
          fecha_vencimiento: vencimientoInicial,
          tipo: memb?.nombre || tipoPago,
          sede: alumno?.sede || "Quito",
          notas,
        });
        if (pagado > 0) {
          await db.insert("historial_pagos", {
            alumno_id: alumnoId,
            alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
            monto_pagado: pagado,
            fecha_pago: fechaPago,
            nueva_fecha_vencimiento: vencimientoInicial,
            tipo: memb?.nombre || tipoPago,
            observaciones: notas || "Pago inicial",
          });
        }
      }
      await reload();
      setSaving(false);
      onClose();
    };

    return (
      <Modal title="Registrar Pago" onClose={onClose} wide>
        <div className="space-y-5">
          <Field label="Alumno">
            <AlumnoSelector students={active} value={alumnoId} onChange={setAlumnoId} placeholder="Buscar alumno..." />
          </Field>
          <Field label="Membresía">
            <div className="grid grid-cols-3 gap-3 mt-1">
              {MEMBRESIAS.map(m=>(
                <button key={m.id} type="button" onClick={()=>{
                  setTipoPago(m.id);
                  if (fechaPago) setFechaVenc(calcVencimiento(fechaPago, m.id));
                }}
                  className="p-4 rounded-2xl border text-center transition-all"
                  style={{ background:tipoPago===m.id?`${m.color}25`:"rgba(255,255,255,0.03)", borderColor:tipoPago===m.id?m.color:"rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-bold" style={{ color:tipoPago===m.id?m.color:"#94a3b8" }}>{m.nombre}</p>
                  <p className="text-[11px] mt-0.5" style={{ color:tipoPago===m.id?m.color:"#64748b" }}>{m.sesiones===999?"Ilimitadas":`${m.sesiones} ses.`}</p>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monto Total ($)"><Input type="number" value={montoTotal} onChange={e=>setMontoTotal(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Monto Pagado ($)"><Input type="number" value={montoPagado} onChange={e=>setMontoPagado(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Fecha de Pago">
              <Input type="date" value={fechaPago} onChange={e=>{
                setFechaPago(e.target.value);
                setFechaVenc(calcVencimiento(e.target.value, tipoPago));
              }} />
            </Field>
            <Field label="Vencimiento (automático)">
              {(() => {
                const pagoExist = pagos.find(p=>p.alumno_id===alumnoId);
                const alumnoSel = students.find(s=>s.id===alumnoId);
                if (pagoExist?.fecha_vencimiento) {
                  const nuevoVenc = calcNuevoVencimiento(pagoExist.fecha_vencimiento, tipoPago);
                  return (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Vence actualmente: <span className="text-white font-semibold">{pagoExist.fecha_vencimiento}</span> → Nuevo:</p>
                      <div className="flex items-center h-[42px] px-4 rounded-xl border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.3)" }}>
                        <span className="text-emerald-400 text-sm font-bold">{nuevoVenc}</span>
                      </div>
                    </div>
                  );
                } else if (alumnoSel?.fecha_inscripcion) {
                  const vencInicial = calcVencimiento(alumnoSel.fecha_inscripcion, tipoPago);
                  return (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Desde inscripción: <span className="text-white font-semibold">{alumnoSel.fecha_inscripcion}</span></p>
                      <div className="flex items-center h-[42px] px-4 rounded-xl border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.3)" }}>
                        <span className="text-emerald-400 text-sm font-bold">{vencInicial}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center h-[42px] px-4 rounded-xl border" style={{ background:"rgba(255,255,255,0.05)", borderColor:"rgba(255,255,255,0.1)" }}>
                    <span className="text-slate-500 text-sm">Selecciona un alumno</span>
                  </div>
                );
              })()}
            </Field>
          </div>
          {montoTotal&&<div className={`p-3 rounded-xl text-sm font-bold border ${deuda>0?"bg-red-500/10 border-red-500/30 text-red-400":"bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>Deuda: ${deuda.toFixed(2)} {deuda===0&&"✓ Pagado completo"}</div>}
          <Field label="Notas"><Textarea value={notas} onChange={e=>setNotas(e.target.value)} /></Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar Pago"}</button>
        </div>
      </Modal>
    );
  };

  const onDelete = async id => {
    if (!confirm("¿Eliminar pago?")) return;
    await db.delete("pagos", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>PAGOS</h1><p className="text-slate-400 text-sm">{pagos.length} registros</p></div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}><Icon name="plus" className="w-4 h-4" /> Registrar Pago</button>
      </div>
      {isAdmin&&(
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Ingresos Mes" value={`$${totalMes.toFixed(0)}`} icon="finance" accent="emerald" />
          <StatCard title="Deuda Total" value={`$${totalDeuda.toFixed(0)}`} icon="payments" accent="red" />
          <StatCard title="Vencidos" value={pagos.filter(p=> p.fecha_vencimiento && p.fecha_vencimiento<=fmt(new Date())).length} icon="payments" accent="amber" />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {["Todos","al día","parcial","vencido","pendiente","pausado"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter===f?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={filter===f?{background:"linear-gradient(135deg,#d4a017,#b8860b)"}:{}}>
            {f==="Todos"?"Todos":f==="al día"?"Al día":f==="pausado"?"Pausado":f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      {/* Alumnos activos sin pago registrado */}
      {filter === "Todos" || filter === "pendiente" ? (
        <div className="space-y-2">
          {students.filter(s => s.estado === "activo" && !pagos.find(p => p.alumno_id === s.id)).map(s => (
            <div key={`nopago-${s.id}`} className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                  <div><p className="font-bold text-white text-sm">{s.nombres} {s.apellidos}</p><p className="text-xs text-slate-500">Sin pago registrado · {s.sede}</p></div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-500/20 text-slate-400 border-slate-500/30">Pendiente</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        {filtered.map(p=>{
          const dias = getDays(p.fecha_vencimiento);
          return (
            <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{p.alumno_nombre?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                  <div><p className="font-bold text-white text-sm">{p.alumno_nombre}</p><p className="text-xs text-slate-500">{p.tipo} · {p.sede} · {p.fecha_pago}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/${parseFloat(p.monto).toFixed(2)}</span></p>
                  <div className="flex gap-1.5 justify-end mt-1 flex-wrap">
                    {p.estados && p.estados.map(est => <StatusBadge key={est} estado={est} />)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Vence: {p.fecha_vencimiento}</span>
                <span className={dias<0?"text-red-400 font-bold":dias<7?"text-amber-400 font-bold":"text-emerald-400"}>
                  {dias<0?`Vencido hace ${Math.abs(dias)} día(s)`:`${dias} día(s) restantes`}
                </span>
              </div>
              {p.estado!=="pagado"&&<div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${Math.min(100,(parseFloat(p.monto_pagado)/parseFloat(p.monto))*100)}%`, background:p.estado==="vencido"?"#ef4444":"#d4a017" }} /></div>}
              <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                {/* Estado Pausado */}
                {p.estado_membresia === "Pausada" && (
                  <button onClick={()=>setReanudarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-semibold hover:bg-purple-500/30">
                    ▶️ Reanudar
                  </button>
                )}
                {/* Al día */}
                {p.estado === "al día" && (
                  <button onClick={()=>setPausarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-500/20 text-slate-400 text-xs font-semibold hover:bg-slate-500/30">
                    ⏸ Pausar
                  </button>
                )}
                {/* Vencido → siempre tiene opción renovar */}
                {p.estados && p.estados.includes("vencido") && (
                  <>
                    <button onClick={()=>setRenovarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30">
                      🔄 Renovar membresía
                    </button>
                    {/* Si además es parcial, mostrar completar pago */}
                    {p.estados && p.estados.includes("parcial") && (
                      <button onClick={()=>setCompletarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30">
                        ✓ Completar pago
                      </button>
                    )}
                  </>
                )}
                {/* Parcial sin vencer → completar pago */}
                {p.estados && p.estados.includes("parcial") && !p.estados.includes("vencido") && (
                  <button onClick={()=>setCompletarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30">
                    ✓ Completar pago
                  </button>
                )}
                {isAdmin&&<button onClick={()=>onDelete(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>}
              </div>
              {/* Historial de pagos recientes */}
              {(() => {
                const historialAlumno = historialPagos.filter(h => h.alumno_id === p.alumno_id).sort((a,b) => b.fecha_pago?.localeCompare(a.fecha_pago)).slice(0,3);
                return historialAlumno.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-slate-400 font-semibold mb-2">Últimos pagos:</p>
                    <div className="space-y-1">
                      {historialAlumno.map(h => (
                        <div key={h.id} className="flex justify-between text-xs">
                          <span className="text-slate-400">{h.fecha_pago}</span>
                          <span className="text-emerald-400 font-bold">${parseFloat(h.monto_pagado||0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>
      {showForm&&<PagoForm onClose={()=>setShowForm(false)} />}
      {renovarPago && (
        <RenovarModal pago={renovarPago} students={students} reload={reload} onClose={()=>setRenovarPago(null)} />
      )}
      {completarPago && (
        <CompletarModal pago={completarPago} historialPagos={historialPagos} reload={reload} onClose={()=>setCompletarPago(null)} />
      )}
      {pausarPago && (
        <PausarModal pago={pausarPago} reload={reload} onClose={()=>setPausarPago(null)} />
      )}
      {reanudarPago && (
        <ReanudirModal pago={reanudarPago} students={students} reload={reload} onClose={()=>setReanudarPago(null)} />
      )}
    </div>
  );
};

const AbonoVentaModal = ({ venta, reload, onClose }) => {
  const [montoAbono, setMontoAbono] = useState("");
  const [fechaAbono, setFechaAbono] = useState(fmt(today));
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const saldoActual = parseFloat(venta.saldo_pendiente || 0);
  const abono = parseFloat(montoAbono) || 0;
  const nuevoSaldo = Math.max(0, saldoActual - abono);
  const nuevoMontoPagado = parseFloat(venta.monto_pagado || 0) + abono;
  const nuevoEstado = nuevoSaldo <= 0 ? "pagado" : "parcial";

  const save = async () => {
    if (abono <= 0) return;
    setSaving(true);
    await db.update("ventas", venta.id, {
      monto_pagado: nuevoMontoPagado,
      saldo_pendiente: nuevoSaldo,
      estado: nuevoEstado,
    });
    await db.insert("historial_ventas", {
      venta_id: venta.id,
      cliente: venta.cliente,
      alumno_id: venta.alumno_id || null,
      monto_abono: abono,
      fecha_abono: fechaAbono,
      notas: notas || "Abono",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Abono — ${venta.cliente}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-bold text-white">${parseFloat(venta.total||0).toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Pagado</p>
            <p className="text-sm font-bold text-emerald-400">${parseFloat(venta.monto_pagado||0).toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Saldo</p>
            <p className="text-sm font-bold text-red-400">${saldoActual.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto a abonar ($)">
            <Input type="number" value={montoAbono} onChange={e=>setMontoAbono(e.target.value)} placeholder={saldoActual.toFixed(2)} step="0.01" />
            <p className="text-xs text-slate-400 mt-1">Saldo: ${saldoActual.toFixed(2)}</p>
          </Field>
          <Field label="Fecha del abono">
            <Input type="date" value={fechaAbono} onChange={e=>setFechaAbono(e.target.value)} />
          </Field>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-slate-400 mb-1">Nuevo saldo pendiente</p>
          <p className="text-lg font-black text-emerald-400">${nuevoSaldo.toFixed(2)}</p>
          {nuevoSaldo <= 0 && <p className="text-xs text-emerald-400 mt-1">✓ Quedará totalmente pagado</p>}
          {nuevoSaldo > 0 && abono > 0 && <p className="text-xs text-amber-400 mt-1">Aún falta: ${nuevoSaldo.toFixed(2)}</p>}
        </div>

        <Field label="Notas (opcional)">
          <Input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: Abono en efectivo..." />
        </Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||abono<=0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar abono"}</button>
      </div>
    </Modal>
  );
};

const VentasPage = ({ ventas, historialVentas, students, inventario, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [abonoVenta, setAbonoVenta] = useState(null);
  const totalHoy = ventas.filter(v=>v.fecha===fmt(today)).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0);
  const totalMes = ventas.filter(v=>v.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0);

  const VentaForm = ({ onClose, students, inventario }) => {
    const [carrito, setCarrito] = useState([]);
    const [catFilter, setCatFilter] = useState("todos");
    const [saving, setSaving] = useState(false);
    const [cliente, setCliente] = useState("");
    const [alumnoId, setAlumnoId] = useState("");
    const [montoPagado, setMontoPagado] = useState("");
    const [fechaVenta, setFechaVenta] = useState(fmt(today));

    const addToCart = (prod) => {
      setCarrito(prev => {
        const ex = prev.find(i=>i.id===prod.id);
        if (ex) return prev.map(i=>i.id===prod.id?{...i,qty:i.qty+1}:i);
        return [...prev,{ ...prod, qty:1 }];
      });
    };

    const removeFromCart = (id) => setCarrito(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty-1)}:i).filter(i=>i.qty>0));
    const total = carrito.reduce((a,i)=>a+i.precio*i.qty,0);
    const pagado = parseFloat(montoPagado) || 0;
    const estadoVenta = pagado <= 0 ? "credito" : pagado >= total ? "pagado" : "parcial";
    const saldo = Math.max(0, total - pagado);

    const save = async () => {
      if (carrito.length===0) return;
      setSaving(true);
      const alumnoSel = students.find(s=>s.id===alumnoId);
      await db.insert("ventas", {
        items: JSON.stringify(carrito),
        total,
        monto_pagado: pagado,
        saldo_pendiente: saldo,
        estado: estadoVenta,
        cliente: alumnoSel ? `${alumnoSel.nombres} ${alumnoSel.apellidos}` : (cliente || "Sin nombre"),
        alumno_id: alumnoId || null,
        fecha: fechaVenta,
        detalle: carrito.map(i=>`${i.qty}x ${i.nombre}`).join(", ")
      });
      // Descontar del inventario automáticamente
      if (inventario && inventario.length > 0) {
        for (const item of carrito) {
          const invItem = inventario.find(inv => inv.nombre.toLowerCase() === item.nombre.toLowerCase());
          if (invItem && invItem.stock > 0) {
            await db.update("inventario", invItem.id, { stock: Math.max(0, invItem.stock - item.qty) });
          }
        }
      }
      await reload();
      setSaving(false);
      onClose();
    };

    // Combinar productos hardcodeados + inventario registrado
    const productosInventario = (inventario||[]).map(i=>({
      id: i.id,
      nombre: i.nombre,
      precio: parseFloat(i.precio_venta||0),
      cat: i.categoria || "otros",
      stock: i.stock,
      fromInventario: true,
    }));
    // Merge: inventario override productos hardcodeados si tienen el mismo nombre
    const nombresInv = productosInventario.map(p=>p.nombre.toLowerCase());
    const prodBase = PRODUCTOS.filter(p=>!nombresInv.includes(p.nombre.toLowerCase()));
    const todosProductos = [...prodBase, ...productosInventario];
    const productos = catFilter==="todos" ? todosProductos : todosProductos.filter(p=>p.cat===catFilter);

    return (
      <Modal title="Nueva Venta" onClose={onClose} wide>
        <div className="space-y-4">
          {/* Cliente y fecha */}
          <div className="space-y-3">
            <Field label="Alumno registrado (opcional)">
              <AlumnoSelector
                students={students.filter(s=>s.estado==="activo")}
                value={alumnoId}
                onChange={v=>{ setAlumnoId(v); setCliente(""); }}
                placeholder="— Cliente externo —"
                extraOption="— Cliente externo —"
              />
            </Field>
            {!alumnoId && (
              <Field label="Nombre cliente externo">
                <Input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nombre del cliente" />
              </Field>
            )}
            <Field label="Fecha"><Input type="date" value={fechaVenta} onChange={e=>setFechaVenta(e.target.value)} /></Field>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[{id:"todos",label:"Todos"},{id:"bebidas",label:"🥤 Bebidas"},{id:"implementos",label:"🥋 Implementos"},{id:"uniformes",label:"👕 Uniformes"}].map(c=>(
              <button key={c.id} onClick={()=>setCatFilter(c.id)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${catFilter===c.id?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={catFilter===c.id?{background:"linear-gradient(135deg,#d4a017,#b8860b)"}:{}}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {productos.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)}
                disabled={p.fromInventario && p.stock <= 0}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-amber-400/30 transition-all text-left disabled:opacity-40">
                <div>
                  <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  <p className="text-xs text-amber-400 font-bold">${p.precio.toFixed(2)}</p>
                  {p.fromInventario && <p className={`text-[10px] ${p.stock<=0?"text-red-400":p.stock<=3?"text-amber-400":"text-slate-500"}`}>{p.stock<=0?"Sin stock":`Stock: ${p.stock}`}</p>}
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center"><Icon name="plus" className="w-4 h-4" /></div>
              </button>
            ))}
          </div>
          {carrito.length>0&&(
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-3">Carrito</p>
              <div className="space-y-2">
                {carrito.map(item=>(
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-sm text-white">{item.nombre}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>removeFromCart(item.id)} className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center"><Icon name="minus" className="w-3 h-3" /></button>
                      <span className="text-white font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={()=>addToCart(item)} className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Icon name="plus" className="w-3 h-3" /></button>
                      <span className="text-amber-400 font-bold w-16 text-right">${(item.precio*item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 mt-3 pt-3">
                <div className="flex justify-between mb-3">
                  <span className="font-bold text-white">TOTAL</span>
                  <span className="text-2xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monto pagado ($)">
                    <Input type="number" value={montoPagado} onChange={e=>setMontoPagado(e.target.value)} placeholder={total.toFixed(2)} step="0.01" />
                  </Field>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Estado</p>
                    <div className={`h-[42px] flex items-center justify-center rounded-xl text-xs font-bold border ${
                      estadoVenta==="pagado" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      estadoVenta==="parcial" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}>
                      {estadoVenta==="pagado" ? "✓ Pagado" : estadoVenta==="parcial" ? `Parcial — debe $${saldo.toFixed(2)}` : "A crédito"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving||carrito.length===0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar Venta"}</button>
        </div>
      </Modal>
    );
  };

  const onDelete = async id => {
    if (!confirm("¿Eliminar venta?")) return;
    await db.delete("ventas", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>VENTAS</h1><p className="text-slate-400 text-sm">Bebidas e implementos</p></div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}><Icon name="plus" className="w-4 h-4" /> Nueva Venta</button>
      </div>
      {isAdmin&&(
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Ventas Hoy" value={`$${totalHoy.toFixed(2)}`} icon="ventas" accent="emerald" />
          <StatCard title="Ventas Mes" value={`$${totalMes.toFixed(2)}`} icon="ventas" accent="amber" />
        </div>
      )}
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["Todos","pagado","parcial","credito"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter===f?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`}
            style={filter===f?{background:"linear-gradient(135deg,#d4a017,#b8860b)"}:{}}>
            {f==="Todos"?"Todos":f==="pagado"?"Pagado":f==="parcial"?"Parcial":"Crédito"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {ventas.filter(v=> filter==="Todos" || (v.estado||"pagado")===filter).sort((a,b)=>b.fecha?.localeCompare(a.fecha)).map(v=>(
          <div key={v.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-white text-sm">{v.cliente || "Sin nombre"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{v.fecha} · {v.detalle}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-lg font-black text-amber-400">${parseFloat(v.total||0).toFixed(2)}</p>
                  {(v.estado==="parcial"||v.estado==="credito") && (
                    <p className="text-xs text-red-400">Debe: ${parseFloat(v.saldo_pendiente||v.total||0).toFixed(2)}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  v.estado==="pagado" ? "bg-emerald-500/20 text-emerald-400" :
                  v.estado==="parcial" ? "bg-amber-500/20 text-amber-400" :
                  v.estado==="credito" ? "bg-slate-500/20 text-slate-400" :
                  "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {v.estado==="pagado"?"Pagado":v.estado==="parcial"?"Parcial":v.estado==="credito"?"Crédito":"Pagado"}
                </span>
              </div>
            </div>
            {/* Historial de abonos */}
            {(() => {
              const abonos = (historialVentas||[]).filter(h=>h.venta_id===v.id).sort((a,b)=>b.fecha_abono?.localeCompare(a.fecha_abono));
              return abonos.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Abonos:</p>
                  <div className="space-y-1">
                    {abonos.map(ab=>(
                      <div key={ab.id} className="flex justify-between text-xs">
                        <span className="text-slate-400">{ab.fecha_abono}</span>
                        <span className="text-emerald-400 font-bold">+${parseFloat(ab.monto_abono||0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            {/* Botones */}
            <div className="flex justify-between items-center mt-2">
              {(v.estado==="parcial"||v.estado==="credito") && (
                <button onClick={()=>setAbonoVenta(v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30">
                  + Abonar
                </button>
              )}
              {v.estado==="pagado" && <div/>}
              {isAdmin&&<button onClick={()=>onDelete(v.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
        {ventas.length===0&&<div className="text-center py-12 text-slate-500">Sin ventas registradas aún</div>}
      </div>
      {showForm&&<VentaForm onClose={()=>setShowForm(false)} students={students} inventario={inventario} />}
      {abonoVenta&&<AbonoVentaModal venta={abonoVenta} reload={reload} onClose={()=>setAbonoVenta(null)} />}
    </div>
  );
};

const AttendancePage = ({ students, asistencia, reload }) => {
  const [fecha, setFecha] = useState(fmt(today));
  const [sede, setSede] = useState("Todas");
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState("marcar"); // "marcar" | "stats"

  const fs = students.filter(s=>s.estado==="activo"&&(sede==="Todas"||s.sede===sede));

  // Solo retorna true si está marcado presente, null si no hay registro (= falta automática)
  const getStatus = id => {
    const r = asistencia.find(a=>a.alumno_id===id&&a.fecha===fecha);
    return r ? r.presente : null;
  };
  const getRecord = id => asistencia.find(a=>a.alumno_id===id&&a.fecha===fecha);

  // Toggle: si ya está presente, desmarca (elimina registro). Si no, marca presente.
  const toggle = async (student) => {
    setSaving(true);
    const ex = getRecord(student.id);
    if (ex && ex.presente) {
      // Ya está presente → desmarcar (borrar registro)
      await db.delete("asistencia", ex.id);
    } else if (ex && !ex.presente) {
      // Tenía registro de ausente → actualizar a presente
      await db.update("asistencia", ex.id, { presente: true });
    } else {
      // No hay registro → insertar presente
      await db.insert("asistencia", {
        alumno_id: student.id,
        alumno_nombre: `${student.nombres} ${student.apellidos}`,
        fecha, presente: true, sede: student.sede
      });
    }
    await reload();
    setSaving(false);
  };

  // Marcar todos presentes
  const marcarTodos = async () => {
    setSaving(true);
    for (const s of fs) {
      const ex = getRecord(s.id);
      if (ex) await db.update("asistencia", ex.id, { presente: true });
      else await db.insert("asistencia", {
        alumno_id: s.id, alumno_nombre: `${s.nombres} ${s.apellidos}`,
        fecha, presente: true, sede: s.sede
      });
    }
    await reload();
    setSaving(false);
  };

  // Desmarcar todos (limpiar el día)
  const limpiarTodos = async () => {
    if (!confirm("¿Desmarcar todos los presentes de este día?")) return;
    setSaving(true);
    for (const s of fs) {
      const ex = getRecord(s.id);
      if (ex) await db.delete("asistencia", ex.id);
    }
    await reload();
    setSaving(false);
  };

  const presentes = fs.filter(s=>getStatus(s.id)===true).length;
  // Ausentes = los que NO están marcados (null = falta automática)
  const ausentes = fs.length - presentes;
  const pct = fs.length ? Math.round((presentes/fs.length)*100) : 0;

  const filtrados = fs.filter(s=>`${s.nombres} ${s.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()));

  // ── Stats calculations ─────────────────────────────────────────────────────
  const hoyStats = fmt(new Date());
  const mesActual = hoyStats.slice(0, 7);
  const allStudents = students.filter(s=>s.estado==="activo"&&(sede==="Todas"||s.sede===sede));

  const statsAlumnos = allStudents.map(s => {
    const sAsist = asistencia.filter(a=>a.alumno_id===s.id&&a.presente);
    const totalDias = [...new Set(asistencia.map(a=>a.fecha))].length || 1;
    const totalPresentes = sAsist.length;
    const estesMes = sAsist.filter(a=>a.fecha?.slice(0,7)===mesActual).length;
    const pct = totalDias > 0 ? Math.round((totalPresentes/totalDias)*100) : 0;
    
    // Racha actual (días consecutivos presentes)
    const fechasPresente = new Set(sAsist.map(a=>a.fecha));
    let racha = 0;
    let d = new Date();
    while (true) {
      const fd = fmt(d);
      if (fechasPresente.has(fd)) { racha++; d.setDate(d.getDate()-1); }
      else break;
      if (racha > 365) break;
    }
    
    // Última asistencia
    const ultima = sAsist.sort((a,b)=>b.fecha.localeCompare(a.fecha))[0]?.fecha;
    
    return { student:s, totalPresentes, estesMes, pct, racha, ultima };
  }).sort((a,b) => b.totalPresentes - a.totalPresentes);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>
        ASISTENCIA {saving&&<span className="text-sm text-amber-400 ml-2 font-normal">Guardando...</span>}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["marcar","✓ Marcar"],["stats","📊 Estadísticas"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={tab===id?{background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)",color:"white"}:{background:"rgba(255,255,255,0.05)",color:"#64748b"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtros sede */}
      {tab==="stats" && (
        <div className="flex gap-2">
          {["Todas",...SEDES].map(s=>(
            <button key={s} onClick={()=>setSede(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={sede===s?{background:"rgba(30,58,123,0.4)",color:"white",border:"1px solid rgba(30,58,123,0.5)"}:{background:"rgba(255,255,255,0.05)",color:"#64748b",border:"1px solid transparent"}}>
              {s}
            </button>
          ))}
        </div>
      )}

      {tab==="stats" && (
        <div className="space-y-4">
          {/* Resumen general */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.2)" }}>
              <p className="text-2xl font-black text-emerald-400">{statsAlumnos.reduce((a,s)=>a+s.estesMes,0)}</p>
              <p className="text-xs text-slate-400 mt-1">Asistencias este mes</p>
            </div>
            <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.2)" }}>
              <p className="text-2xl font-black text-blue-400">{statsAlumnos.length}</p>
              <p className="text-xs text-slate-400 mt-1">Alumnos activos</p>
            </div>
            <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(212,160,23,0.1)", borderColor:"rgba(212,160,23,0.2)" }}>
              <p className="text-2xl font-black text-yellow-400">
                {statsAlumnos.length > 0 ? Math.round(statsAlumnos.reduce((a,s)=>a+s.estesMes,0)/statsAlumnos.length) : 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Promedio por alumno</p>
            </div>
          </div>

          {/* Ranking por alumno */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
            <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
              <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Ranking de Asistencia</p>
            </div>
            <div className="divide-y divide-white/5">
              {statsAlumnos.map((st, i) => (
                <div key={st.student.id} className="p-4" style={{ background: i%2===0?"#0d1426":"#0a1020" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${i===0?"bg-yellow-500 text-black":i===1?"bg-slate-400 text-black":i===2?"bg-amber-700 text-white":"bg-white/10 text-slate-400"}`}>
                      {i+1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{st.student.nombres} {st.student.apellidos}</p>
                      <p className="text-xs text-slate-500">{st.student.cinturon} · {st.student.sede}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-white text-sm">{st.totalPresentes} <span className="text-slate-500 font-normal text-xs">totales</span></p>
                      <p className="text-xs text-emerald-400">{st.estesMes} este mes</p>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,st.pct)}%`, background:"linear-gradient(90deg,#1e3a7b,#3b82f6)" }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{st.pct}%</span>
                  </div>
                  {/* Racha y última asistencia */}
                  <div className="flex gap-3 mt-2">
                    {st.racha > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background:"rgba(16,185,129,0.15)", color:"#10b981" }}>
                        🔥 Racha: {st.racha} días
                      </span>
                    )}
                    {st.ultima && (
                      <span className="text-xs text-slate-500">Última: {st.ultima}</span>
                    )}
                    {!st.ultima && (
                      <span className="text-xs text-red-400">Sin asistencias</span>
                    )}
                  </div>
                </div>
              ))}
              {statsAlumnos.length===0 && (
                <div className="p-8 text-center text-slate-500 text-sm">Sin alumnos activos</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab==="marcar" && (
      <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ width:"auto" }} />
        <Select options={["Todas",...SEDES]} value={sede} onChange={e=>setSede(e.target.value)} />
        <button onClick={marcarTodos} disabled={saving} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50">
          ✓ Todos Presentes
        </button>
        <button onClick={limpiarTodos} disabled={saving} className="px-4 py-2.5 rounded-xl bg-slate-500/20 text-slate-400 text-sm font-semibold hover:bg-slate-500/30 disabled:opacity-50">
          ↺ Limpiar día
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{presentes}</p>
          <p className="text-xs text-slate-400 mt-1">Presentes</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{ausentes}</p>
          <p className="text-xs text-slate-400 mt-1">Faltas</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{pct}%</p>
          <p className="text-xs text-slate-400 mt-1">Asistencia</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
          placeholder="Buscar alumno..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map(s => {
          const presente = getStatus(s.id) === true;
          return (
            <div key={s.id} className={`rounded-2xl border transition-all ${presente ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/3 border-white/8"}`}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={()=>setExpanded(e=>e===s.id?null:s.id)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
                    {s.nombres[0]}{s.apellidos[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p>
                    <BeltBadge cinturon={s.cinturon} />
                  </div>
                </div>
                {/* Solo botón de check */}
                <button onClick={()=>toggle(s)} disabled={saving}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all text-lg font-black ${
                    presente
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-white/5 text-slate-600 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10"
                  }`}>
                  {presente ? "✓" : ""}
                </button>
              </div>

              {/* Últimas asistencias desplegable */}
              {expanded===s.id && (
                <div className="px-4 pb-4 space-y-1 border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Últimas asistencias (solo presentes)</p>
                  {asistencia.filter(a=>a.alumno_id===s.id&&a.presente).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,7).map(a=>(
                    <div key={a.id} className="flex justify-between p-2 rounded-lg text-xs bg-emerald-500/10 text-emerald-400">
                      <span>{a.fecha}</span><span>✓ Presente</span>
                    </div>
                  ))}
                  {asistencia.filter(a=>a.alumno_id===s.id&&a.presente).length===0 && (
                    <p className="text-xs text-slate-500 text-center py-2">Sin asistencias registradas</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      )}
    </div>
  );
};

const AbonoExamenModal = ({ examen, reload, onClose }) => {
  const [montoAbono, setMontoAbono] = useState("");
  const [fechaAbono, setFechaAbono] = useState(fmt(today));
  const [saving, setSaving] = useState(false);

  const saldoActual = parseFloat(examen.saldo_pendiente || Math.max(0, parseFloat(examen.monto||0) - parseFloat(examen.monto_pagado||0)));
  const abono = parseFloat(montoAbono) || 0;
  const nuevoSaldo = Math.max(0, saldoActual - abono);
  const nuevoMontoPagado = parseFloat(examen.monto_pagado||0) + abono;
  const nuevoEstado = nuevoSaldo <= 0 ? "pagado" : "parcial";

  const save = async () => {
    if (abono <= 0) return;
    setSaving(true);
    await db.update("examenes", examen.id, {
      monto_pagado: nuevoMontoPagado,
      saldo_pendiente: nuevoSaldo,
      estado_pago: nuevoEstado,
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Abono — ${examen.alumno_nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-white/5 rounded-xl text-sm text-slate-300">{examen.tipo} · {examen.fecha}</div>
        <div className="grid grid-cols-3 gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="text-center"><p className="text-xs text-slate-400">Total</p><p className="text-sm font-bold text-white">${parseFloat(examen.monto||0).toFixed(2)}</p></div>
          <div className="text-center"><p className="text-xs text-slate-400">Pagado</p><p className="text-sm font-bold text-emerald-400">${parseFloat(examen.monto_pagado||0).toFixed(2)}</p></div>
          <div className="text-center"><p className="text-xs text-slate-400">Saldo</p><p className="text-sm font-bold text-red-400">${saldoActual.toFixed(2)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto a abonar ($)">
            <Input type="number" value={montoAbono} onChange={e=>setMontoAbono(e.target.value)} placeholder={saldoActual.toFixed(2)} step="0.01" />
          </Field>
          <Field label="Fecha del abono">
            <Input type="date" value={fechaAbono} onChange={e=>setFechaAbono(e.target.value)} />
          </Field>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-slate-400 mb-1">Nuevo saldo</p>
          <p className="text-lg font-black text-emerald-400">${nuevoSaldo.toFixed(2)}</p>
          {nuevoSaldo <= 0 && <p className="text-xs text-emerald-400 mt-1">✓ Quedará totalmente pagado</p>}
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||abono<=0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Registrar abono"}</button>
      </div>
    </Modal>
  );
};

const ExamenesPage = ({ students, reload, examenes, reloadExamenes, configExamenes, configGal }) => {
  const [selectedId, setSelectedId] = useState("");
  const [newBelt, setNewBelt] = useState(CINTURONES[0]);
  const [saving, setSaving] = useState(false);
  const [ascPagado, setAscPagado] = useState("");
  const [ascFecha, setAscFecha] = useState(fmt(today));
  const [galAlumnoId, setGalAlumnoId] = useState("");
  const [galQty, setGalQty] = useState(1);
  const [galPagado, setGalPagado] = useState("");
  const [galFecha, setGalFecha] = useState(fmt(today));
  const [savingGal, setSavingGal] = useState(false);
  const [tab, setTab] = useState("ascenso");
  const [abonoExamen, setAbonoExamen] = useState(null);

  const selectedStudent = students.find(s => s.id === selectedId);
  const costoInfo = selectedStudent ? (() => {
    // Usar config de la academia si existe
    if (configExamenes && configExamenes.length > 0) {
      const cfg = configExamenes.find(cfg => cfg.cinturon_desde === selectedStudent.cinturon);
      if (cfg) return { siguiente: cfg.cinturon_hasta, costo: parseFloat(cfg.costo||0) };
    }
    // Sino usar hardcoded
    return COSTOS_ASCENSO[selectedStudent.cinturon] || null;
  })() : null;

  const handleSelectStudent = (id) => {
    setSelectedId(id);
    const st = students.find(s => s.id === id);
    if (st && COSTOS_ASCENSO[st.cinturon]?.siguiente) {
      setNewBelt(COSTOS_ASCENSO[st.cinturon].siguiente);
    }
  };

  const upgrade = async () => {
    if (!selectedId || !newBelt) return;
    setSaving(true);
    const costo = costoInfo?.costo || 0;
    const al = students.find(s => s.id === selectedId);
    const pagado = parseFloat(ascPagado) || 0;
    const saldo = Math.max(0, costo - pagado);
    const estadoPago = pagado >= costo && costo > 0 ? "pagado" : pagado > 0 ? "parcial" : "pendiente";
    await db.update("students", selectedId, { cinturon: newBelt });
    await db.insert("examenes", {
      alumno_id: selectedId,
      alumno_nombre: `${al?.nombres} ${al?.apellidos}`,
      tipo: `Ascenso ${al?.cinturon} → ${newBelt}`,
      monto: costo,
      monto_pagado: pagado,
      saldo_pendiente: saldo,
      estado_pago: estadoPago,
      fecha: ascFecha,
    });
    await reload();
    await reloadExamenes();
    setSaving(false);
    setSelectedId("");
    setAscPagado("");
    setAscFecha(fmt(today));
  };

  const registrarGal = async () => {
    if (!galAlumnoId) return;
    const yaGal = examenes.some(ex => ex.alumno_id === galAlumnoId && ex.tipo?.includes("GAL"));
    if (yaGal) {
      alert("Este alumno ya tiene un GAL registrado. Solo se puede emitir 1 GAL por alumno.");
      return;
    }
    setSavingGal(true);
    const al = students.find(s => s.id === galAlumnoId);
    const costoGal = configGal && configGal.length > 0 ? parseFloat(configGal[0].costo||13) : 13;
    const pagado = parseFloat(galPagado) || 0;
    const saldo = Math.max(0, costoGal - pagado);
    const estadoPago = pagado >= costoGal ? "pagado" : pagado > 0 ? "parcial" : "pendiente";
    await db.insert("examenes", {
      alumno_id: galAlumnoId,
      alumno_nombre: `${al?.nombres} ${al?.apellidos}`,
      tipo: "GAL",
      monto: costoGal,
      monto_pagado: pagado,
      saldo_pendiente: saldo,
      estado_pago: estadoPago,
      fecha: galFecha,
    });
    await reloadExamenes();
    setSavingGal(false);
    setGalAlumnoId("");
    setGalPagado("");
    setGalFecha(fmt(today));
  };

  const totalExamenes = examenes.reduce((a,e)=>a+parseFloat(e.monto_pagado||e.monto||0),0);
  const totalMes = examenes.filter(e=>e.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,e)=>a+parseFloat(e.monto_pagado||e.monto||0),0);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>EXÁMENES Y GALs</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Total Mes" value={`$${totalMes.toFixed(0)}`} icon="examenes" accent="amber" />
        <StatCard title="Total Año" value={`$${totalExamenes.toFixed(0)}`} icon="examenes" accent="emerald" />
      </div>

      {/* TABS */}
      <div className="flex gap-2">
        {[{id:"ascenso",label:"🥋 Ascenso de Cinturón"},{id:"gal",label:"📋 Emisión GAL"},{id:"historial",label:"📊 Historial"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t.id?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={tab===t.id?{background:"linear-gradient(135deg,#d4a017,#b8860b)"}:{}}>{t.label}</button>
        ))}
      </div>

      {/* ASCENSO */}
      {tab==="ascenso" && <>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {CINTURONES.map(c=>{ const count=students.filter(s=>s.cinturon===c).length; return (
            <div key={c} className="bg-white/3 border border-white/8 rounded-2xl p-3 text-center">
              <div className="w-7 h-7 rounded-full mx-auto mb-2 border-2 border-white/20" style={{ background:cinturonColor[c] }} />
              <p className="text-[10px] font-bold text-white leading-tight">{c}</p>
              <p className="text-2xl font-black mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif", color:cinturonColor[c]==="#ffffff"?"#e2e8f0":cinturonColor[c] }}>{count}</p>
            </div>
          ); })}
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>REGISTRAR ASCENSO</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Alumno">
                <AlumnoSelector
                  students={students.filter(s=>s.estado==="activo")}
                  value={selectedId}
                  onChange={handleSelectStudent}
                  placeholder="Buscar alumno..."
                />
              </Field>
              <Field label="Nuevo Cinturón">
                <Select options={CINTURONES} value={newBelt} onChange={e=>setNewBelt(e.target.value)} />
                {costoInfo && costoInfo.costo > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold">
                    💰 Costo del examen: ${costoInfo.costo}.00
                  </div>
                )}
              </Field>
            </div>
            {/* Pago del examen */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-white/3 border border-white/8 rounded-xl">
              <Field label="Monto pagado ($)">
                <Input type="number" value={ascPagado} onChange={e=>setAscPagado(e.target.value)}
                  placeholder={costoInfo?.costo?.toString() || "0.00"} step="0.01" />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={ascFecha} onChange={e=>setAscFecha(e.target.value)} />
              </Field>
              <Field label="Estado pago">
                <div className={`h-[42px] flex items-center justify-center rounded-xl text-xs font-bold border ${
                  !ascPagado ? "bg-slate-500/20 text-slate-400 border-slate-500/30" :
                  parseFloat(ascPagado) >= (costoInfo?.costo||0) ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}>
                  {!ascPagado ? "Pendiente" :
                   parseFloat(ascPagado) >= (costoInfo?.costo||0) ? "✓ Pagado" :
                   `Debe $${Math.max(0,(costoInfo?.costo||0)-parseFloat(ascPagado)).toFixed(2)}`}
                </div>
              </Field>
            </div>
            <button onClick={upgrade} disabled={saving||!selectedId} className="w-full py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
              {saving ? "Guardando..." : "Registrar Ascenso"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {students.filter(s=>s.estado==="activo").map(s=>(
            <div key={s.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                <div><p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p><div className="flex gap-1 mt-0.5"><CategoriaBadge categoria={s.categoria||getCategoria(s.fecha_nacimiento)} /><span className="text-xs text-slate-500">· {s.sede}</span></div></div>
              </div>
              <BeltBadge cinturon={s.cinturon} />
            </div>
          ))}
        </div>
      </>}

      {/* GAL */}
      {tab==="gal" && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>EMISIÓN DE GAL</h2>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
            💰 Valor por GAL: <span className="font-black">$13.00</span>
          </div>
          <div className="space-y-4">
            <Field label="Alumno">
              <AlumnoSelector
                students={students.filter(s=>s.estado==="activo" && !examenes.some(ex=>ex.alumno_id===s.id&&ex.tipo?.includes("GAL")))}
                value={galAlumnoId}
                onChange={setGalAlumnoId}
                placeholder="Buscar alumno sin GAL..."
              />
            </Field>
            {/* Pago del GAL */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-white/3 border border-white/8 rounded-xl">
              <Field label="Monto pagado ($)">
                <Input type="number" value={galPagado} onChange={e=>setGalPagado(e.target.value)} placeholder="13.00" step="0.01" />
                <p className="text-xs text-slate-400 mt-1">Total: $13.00</p>
              </Field>
              <Field label="Fecha">
                <Input type="date" value={galFecha} onChange={e=>setGalFecha(e.target.value)} />
              </Field>
              <Field label="Estado pago">
                <div className={`h-[42px] flex items-center justify-center rounded-xl text-xs font-bold border ${
                  !galPagado ? "bg-slate-500/20 text-slate-400 border-slate-500/30" :
                  parseFloat(galPagado) >= 13 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}>
                  {!galPagado ? "Pendiente" :
                   parseFloat(galPagado) >= 13 ? "✓ Pagado" :
                   `Debe $${Math.max(0, 13 - parseFloat(galPagado)).toFixed(2)}`}
                </div>
              </Field>
            </div>
            <button onClick={registrarGal} disabled={savingGal||!galAlumnoId} className="w-full py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
              {savingGal ? "Registrando..." : "Registrar GAL"}
            </button>
          </div>
          {/* Mostrar GALs del alumno seleccionado */}
          {galAlumnoId && (() => {
            const galsAlumno = examenes.filter(ex=>ex.alumno_id===galAlumnoId&&ex.tipo?.includes("GAL"));
            if (galsAlumno.length===0) return <div className="p-3 rounded-xl bg-white/5 text-slate-400 text-sm">Este alumno no tiene GALs registrados aún.</div>;
            return (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold uppercase mb-2">GALs de este alumno</p>
                <div className="space-y-1">
                  {galsAlumno.map(ex=>(
                    <div key={ex.id} className="flex justify-between p-2 rounded-lg bg-blue-500/10 text-xs">
                      <span className="text-blue-400 font-semibold">{ex.tipo}</span>
                      <span className="text-slate-400">{ex.fecha}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* HISTORIAL */}
      {tab==="historial" && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HISTORIAL</h3>
          <div className="space-y-2">
            {examenes.length===0 && <p className="text-slate-500 text-sm text-center py-4">Sin registros aún</p>}
            {examenes.sort((a,b)=>b.fecha?.localeCompare(a.fecha)).map(ex=>{
              const saldo = parseFloat(ex.saldo_pendiente || Math.max(0, parseFloat(ex.monto||0)-parseFloat(ex.monto_pagado||0)));
              const ep = ex.estado_pago || (parseFloat(ex.monto_pagado||0)>=parseFloat(ex.monto||1)?"pagado":"pendiente");
              return (
              <div key={ex.id} className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{ex.alumno_nombre}</p>
                    <p className="text-xs text-slate-500">{ex.tipo} · {ex.fecha}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-base font-black text-amber-400">${parseFloat(ex.monto_pagado||ex.monto||0).toFixed(2)}<span className="text-xs text-slate-500">/${parseFloat(ex.monto||0).toFixed(2)}</span></p>
                      {saldo>0 && <p className="text-xs text-red-400">Debe: ${saldo.toFixed(2)}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${ep==="pagado"?"bg-emerald-500/20 text-emerald-400":ep==="parcial"?"bg-amber-500/20 text-amber-400":"bg-slate-500/20 text-slate-400"}`}>
                      {ep==="pagado"?"✓":ep==="parcial"?"Parcial":"Pendiente"}
                    </span>
                    <button onClick={async()=>{
                      if(!confirm("¿Eliminar este registro?")) return;
                      if (ex.tipo?.includes("Ascenso") && ex.alumno_id) {
                        const match = ex.tipo.match(/Ascenso (.+) → (.+)/);
                        if (match) await db.update("students", ex.alumno_id, { cinturon: match[1] });
                      }
                      await db.delete("examenes", ex.id);
                      await reloadExamenes();
                      await reload();
                    }} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /></button>
                  </div>
                </div>
                {saldo>0 && (
                  <button onClick={()=>setAbonoExamen(ex)} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30">
                    + Abonar
                  </button>
                )}
              </div>
            );})}
          </div>
        </div>
      )}
      {abonoExamen && <AbonoExamenModal examen={abonoExamen} reload={reloadExamenes} onClose={()=>setAbonoExamen(null)} />}
    </div>
  );
};

const FinancePage = ({ pagos, historialPagos, ventas, eventos, examenes, gastos }) => {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  // Ingresos por fuente por mes
  const mensualByMonth = meses.map((label,i)=>
    (historialPagos||[]).filter(h=>parseInt(h.fecha_pago?.slice(5,7))===i+1).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0)
  );
  const ventasByMonth = meses.map((_,i)=>
    (ventas||[]).filter(v=>parseInt(v.fecha?.slice(5,7))===i+1).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0)
  );
  const eventosByMonth = meses.map((_,i)=>
    (eventos||[]).filter(e=>parseInt(e.fecha?.slice(5,7))===i+1).reduce((a,e)=>{ try { const parts=JSON.parse(e.participantes||"[]"); return a+parts.filter(p=>p.pagado).reduce((s,p)=>s+parseFloat(p.valor||0),0); } catch { return a; } },0)
  );
  const examenesByMonth = meses.map((_,i)=>
    (examenes||[]).filter(e=>parseInt(e.fecha?.slice(5,7))===i+1).reduce((a,e)=>a+parseFloat(e.monto_pagado||e.monto||0),0)
  );

  // Total combinado por mes (para el gráfico principal)
  const totalByMonth = meses.map((label,i)=>({
    label,
    value: mensualByMonth[i] + ventasByMonth[i] + eventosByMonth[i] + examenesByMonth[i]
  }));

  // Totales anuales por fuente
  const totalMensual  = mensualByMonth.reduce((a,v)=>a+v,0);
  const totalVentas   = ventasByMonth.reduce((a,v)=>a+v,0);
  const totalEventos  = eventosByMonth.reduce((a,v)=>a+v,0);
  const totalExamenes = examenesByMonth.reduce((a,v)=>a+v,0);
  const totalAnual    = totalMensual + totalVentas + totalEventos + totalExamenes;

  // Gastos del año
  const gastosFijos    = (gastos||[]).filter(g=>g.tipo==="fijo").reduce((a,g)=>a+parseFloat(g.monto||0),0);
  const gastosVariables= (gastos||[]).filter(g=>g.tipo==="variable").reduce((a,g)=>a+parseFloat(g.monto||0),0);
  const totalGastos    = gastosFijos + gastosVariables;
  const utilidad       = totalAnual - totalGastos;
  const mesFin = fmt(new Date()).slice(0,7);
  const gastosMes      = (gastos||[]).filter(g=>g.fecha?.slice(0,7)===mesFin).reduce((a,g)=>a+parseFloat(g.monto||0),0);
  const ingresosMes    = (historialPagos||[]).filter(h=>h.fecha_pago?.slice(0,7)===mesFin).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0)
    + (ventas||[]).filter(v=>v.fecha?.slice(0,7)===mesFin).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0)
    + (examenes||[]).filter(e=>e.fecha?.slice(0,7)===mesFin).reduce((a,e)=>a+parseFloat(e.monto_pagado||e.monto||0),0);
  const utilidadMes    = ingresosMes - gastosMes;

  // Por sede — suma todas las fuentes
  const ingresosPorSede = SEDES.map(sede => {
    const mensual  = pagos.filter(p=>p.sede===sede).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0);
    const ventasS  = ventas.filter(v=>v.sede===sede).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0);
    const examenS  = examenes.filter(e=>{
      const al = e.alumno_id;
      return true; // No hay sede en examenes, se incluye todo
    }).reduce((_a,_e)=>_a,0);
    return { sede, mensual, ventasS, total: mensual + ventasS };
  });

  // Sede desde pagos (tienen sede directamente)
  const bySedeTotal = SEDES.map(sede => {
    const m = (historialPagos||[]).filter(h=>{
      const pago = pagos.find(p=>p.alumno_id===h.alumno_id);
      return pago?.sede===sede;
    }).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0);
    const v = (ventas||[]).filter(v=>v.sede===sede).reduce((a,v)=>a+parseFloat(v.monto_pagado||v.total||0),0);
    const ev = (eventos||[]).filter(e=>e.sede===sede).reduce((a,e)=>{ try { const parts=JSON.parse(e.participantes||"[]"); return a+parts.filter(p=>p.pagado).reduce((s,p)=>s+parseFloat(p.valor||0),0); } catch { return a; } },0);
    const ex = (examenes||[]).reduce((a,e)=>a+parseFloat(e.monto_pagado||e.monto||0),0)/SEDES.length; // distribuir equitativamente
    return { sede, total: m + v + ev };
  });

  const generarPDF = () => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { alert("Cargando librería PDF, intenta en un momento..."); return; }
    
    const doc = new jsPDF();
    const mesActual = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    const hoy = fmt(new Date());
    
    // Header
    doc.setFillColor(13, 20, 38);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('HS TAEKWONDO SYSTEM', 15, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`REPORTE MENSUAL — ${mesActual}`, 15, 30);
    doc.text(`Generado: ${hoy}`, 150, 30);
    
    // Summary boxes
    doc.setTextColor(30, 58, 123);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE INGRESOS', 15, 55);
    
    const resumen = [
      ['Mensualidades', `$${totalMensual.toFixed(2)}`],
      ['Ventas', `$${totalVentas.toFixed(2)}`],
      ['Eventos', `$${totalEventos.toFixed(2)}`],
      ['Exámenes / GAL', `$${totalExamenes.toFixed(2)}`],
      ['TOTAL', `$${totalAnual.toFixed(2)}`],
    ];
    
    let y = 65;
    resumen.forEach(([label, value], i) => {
      const isTotal = i === resumen.length - 1;
      if (isTotal) {
        doc.setFillColor(30, 58, 123);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 250 : 255);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.setTextColor(30, 30, 30);
      }
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
      doc.setFontSize(11);
      doc.text(label, 20, y + 1);
      doc.text(value, 170, y + 1, { align: 'right' });
      y += 12;
    });
    
    // Por sede
    y += 8;
    doc.setTextColor(30, 58, 123);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('INGRESOS POR SEDE', 15, y);
    y += 10;
    
    bySedeTotal.forEach(({ sede, total }, i) => {
      doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 250 : 255);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(sede, 20, y + 1);
      doc.text(`$${total.toFixed(2)}`, 170, y + 1, { align: 'right' });
      y += 12;
    });
    
    // Historial de pagos del mes
    y += 8;
    doc.setTextColor(30, 58, 123);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE PAGOS DEL MES', 15, y);
    y += 10;
    
    // Header de tabla
    doc.setFillColor(30, 58, 123);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ALUMNO', 20, y + 1);
    doc.text('TIPO', 90, y + 1);
    doc.text('FECHA', 140, y + 1);
    doc.text('MONTO', 185, y + 1, { align: 'right' });
    y += 12;
    
    const pagosMes = (historialPagos||[])
      .filter(h => h.fecha_pago?.slice(0,7) === fmt(new Date()).slice(0,7))
      .sort((a,b) => b.fecha_pago?.localeCompare(a.fecha_pago));
    
    pagosMes.forEach((h, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 250 : 255);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text((h.alumno_nombre||'').substring(0, 25), 20, y + 1);
      doc.text((h.tipo||'').substring(0, 20), 90, y + 1);
      doc.text(h.fecha_pago||'', 140, y + 1);
      doc.text(`$${parseFloat(h.monto_pagado||0).toFixed(2)}`, 185, y + 1, { align: 'right' });
      y += 10;
    });
    
    if (pagosMes.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('Sin pagos registrados este mes', 20, y);
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`HS Taekwondo System — Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    doc.save(`Reporte_HST_${mesActual.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>FINANZAS</h1>
        <button onClick={generarPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)" }}>
          📄 Reporte PDF
        </button>
      </div>

      {/* Cuadros por fuente */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs text-amber-400 font-semibold uppercase">Mensualidades</p>
          <p className="text-2xl font-black text-white mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalMensual.toFixed(0)}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
          <p className="text-xs text-purple-400 font-semibold uppercase">Ventas</p>
          <p className="text-2xl font-black text-white mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalVentas.toFixed(0)}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-xs text-blue-400 font-semibold uppercase">Eventos</p>
          <p className="text-2xl font-black text-white mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalEventos.toFixed(0)}</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
          <p className="text-xs text-orange-400 font-semibold uppercase">Exámenes / GAL</p>
          <p className="text-2xl font-black text-white mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalExamenes.toFixed(0)}</p>
        </div>
      </div>

      {/* Total mes actual — Ingresos vs Gastos vs Utilidad */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.2)" }}>
          <p className="text-xs text-emerald-400 font-semibold uppercase">Ingresos Mes</p>
          <p className="text-2xl font-black text-white mt-1">${ingresosMes.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(239,68,68,0.1)", borderColor:"rgba(239,68,68,0.2)" }}>
          <p className="text-xs text-red-400 font-semibold uppercase">Gastos Mes</p>
          <p className="text-2xl font-black text-white mt-1">${gastosMes.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background:utilidadMes>=0?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)", borderColor:utilidadMes>=0?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)" }}>
          <p className={`text-xs font-semibold uppercase ${utilidadMes>=0?"text-emerald-400":"text-red-400"}`}>Utilidad Mes</p>
          <p className={`text-2xl font-black mt-1 ${utilidadMes>=0?"text-emerald-400":"text-red-400"}`}>{utilidadMes>=0?"+":""}{utilidadMes.toFixed(2)}</p>
        </div>
      </div>

      {/* Total año */}
      <div className="rounded-2xl p-5 border" style={{ background:"rgba(13,20,38,0.9)", borderColor:"rgba(30,58,123,0.3)" }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Ingresos Año</p>
            <p className="text-4xl font-black text-white mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalAnual.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase">Utilidad Año</p>
            <p className={`text-2xl font-black mt-1 ${utilidad>=0?"text-emerald-400":"text-red-400"}`}>{utilidad>=0?"+":""}{utilidad.toFixed(2)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3" style={{ borderColor:"rgba(30,58,123,0.2)" }}>
          <div>
            <p className="text-slate-500 mb-1">Ingresos</p>
            <p>Mensualidades: <span className="text-amber-400 font-bold">${totalMensual.toFixed(0)}</span></p>
            <p>Ventas: <span className="text-purple-400 font-bold">${totalVentas.toFixed(0)}</span></p>
            <p>Eventos: <span className="text-blue-400 font-bold">${totalEventos.toFixed(0)}</span></p>
            <p>Exámenes: <span className="text-orange-400 font-bold">${totalExamenes.toFixed(0)}</span></p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Gastos</p>
            <p>Fijos: <span className="text-red-400 font-bold">-${gastosFijos.toFixed(0)}</span></p>
            <p>Variables: <span className="text-red-300 font-bold">-${gastosVariables.toFixed(0)}</span></p>
          </div>
        </div>
      </div>

      {/* Gráfico total ingresos por mes */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>TOTAL INGRESOS POR MES</h3>
        <MiniBarChart data={totalByMonth} color="#10b981" />
      </div>

      {/* Por sede — total ingresos */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>INGRESOS POR SEDE</h3>
        {bySedeTotal.map(({sede,total})=>(
          <div key={sede} className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
            <span className="text-sm text-slate-300 font-semibold">📍 {sede}</span>
            <span className="text-xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Historial de pagos */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HISTORIAL DE PAGOS</h3>
        <div className="space-y-2">
          {(historialPagos||[]).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago)).slice(0,20).map(h=>(
            <div key={h.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">{h.alumno_nombre}</p>
                <p className="text-xs text-slate-500">{h.tipo} · {h.fecha_pago}</p>
              </div>
              <span className="text-base font-black text-emerald-400">${parseFloat(h.monto_pagado||0).toFixed(2)}</span>
            </div>
          ))}
          {(historialPagos||[]).length===0 && <p className="text-slate-500 text-sm text-center py-4">Sin historial aún</p>}
        </div>
      </div>
    </div>
  );
};

// ─── EVENTO DETAIL — fuera de EventsPage para evitar re-renders ───────────────
const EventoDetail = ({ evento, students, reload, onClose }) => {
  const [participantes, setParticipantes] = useState(() => {
    try { return JSON.parse(evento.participantes || "[]"); } catch { return []; }
  });
  const [alumnoId, setAlumnoId] = useState("");
  const [valor, setValor] = useState("");
  const [savingP, setSavingP] = useState(false);

  const addParticipante = async () => {
    if (!alumnoId) return;
    const al = students.find(s => s.id === alumnoId);
    if (!al || participantes.find(p => p.id === alumnoId)) return;
    setSavingP(true);
    const nuevos = [...participantes, { id: alumnoId, nombre: `${al.nombres} ${al.apellidos}`, valor: parseFloat(valor) || 0, pagado: false }];
    await db.update("eventos", evento.id, { participantes: JSON.stringify(nuevos) });
    setParticipantes(nuevos);
    setSavingP(false);
    setAlumnoId("");
    setValor("");
    reload();
  };

  const togglePagado = async (pid) => {
    const nuevos = participantes.map(p => p.id === pid ? { ...p, pagado: !p.pagado } : p);
    await db.update("eventos", evento.id, { participantes: JSON.stringify(nuevos) });
    setParticipantes(nuevos);
    reload();
  };

  const removeParticipante = async (pid) => {
    const nuevos = participantes.filter(p => p.id !== pid);
    await db.update("eventos", evento.id, { participantes: JSON.stringify(nuevos) });
    setParticipantes(nuevos);
    reload();
  };

  const totalEvento = participantes.reduce((a, p) => a + parseFloat(p.valor || 0), 0);
  const totalPagado = participantes.filter(p => p.pagado).reduce((a, p) => a + parseFloat(p.valor || 0), 0);

  return (
    <Modal title={evento.titulo} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center"><p className="text-xs text-slate-500">Participantes</p><p className="text-2xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{participantes.length}</p></div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalEvento.toFixed(0)}</p></div>
          <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20"><p className="text-xs text-slate-500">Pagado</p><p className="text-2xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${totalPagado.toFixed(0)}</p></div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-3">Añadir Alumno</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alumno">
              <AlumnoSelector
                students={students.filter(s=>s.estado==="activo" && !participantes.find(p=>p.id===s.id))}
                value={alumnoId}
                onChange={setAlumnoId}
                placeholder="Buscar alumno..."
              />
            </Field>
            <Field label="Valor ($)"><Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" /></Field>
          </div>
          <button onClick={addParticipante} disabled={savingP || !alumnoId} className="mt-3 px-4 py-2 rounded-xl text-[#020617] text-xs font-bold disabled:opacity-50" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{savingP ? "Añadiendo..." : "Añadir al evento"}</button>
        </div>
        <div className="space-y-2">
          {participantes.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.pagado ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/3 border-white/8"}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{p.nombre.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                <div><p className="text-sm font-semibold text-white">{p.nombre}</p><p className="text-xs text-amber-400 font-bold">${parseFloat(p.valor || 0).toFixed(2)}</p></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {evento.tipo==="torneo" && (
                  <select className="bg-[#1e293b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white" value={p.medalla||""} onChange={async e=>{ const nuevos=participantes.map(x=>x.id===p.id?{...x,medalla:e.target.value}:x); await db.update("eventos",evento.id,{participantes:JSON.stringify(nuevos)}); setParticipantes(nuevos); reload(); }}>
                    <option value="">Sin medalla</option>
                    <option value="🥇 Oro">🥇 Oro</option>
                    <option value="🥈 Plata">🥈 Plata</option>
                    <option value="🥉 Bronce">🥉 Bronce</option>
                  </select>
                )}
                {p.medalla && <span className="text-sm font-bold">{p.medalla}</span>}
                <button onClick={() => togglePagado(p.id)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${p.pagado ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400 hover:bg-amber-500/20 hover:text-amber-400"}`}>{p.pagado ? "✓ Pagado" : "Pendiente"}</button>
                <button onClick={() => removeParticipante(p.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
          {participantes.length === 0 && <p className="text-center text-slate-500 text-sm py-4">Sin participantes aún</p>}
        </div>
      </div>
    </Modal>
  );
};

const EventsPage = ({ eventos, students, reload }) => {
  const [showForm, setShowForm] = useState(false);
  const [viewEvento, setViewEvento] = useState(null);
  const [form, setForm] = useState({ titulo:"", fecha:fmt(addDays(today,7)), tipo:"examen", sede:"Ambas", descripcion:"" });
  const set = k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.titulo) return;
    setSaving(true);
    await db.insert("eventos",{ ...form, participantes:"[]" });
    await reload();
    setSaving(false);
    setShowForm(false);
    setForm({ titulo:"", fecha:fmt(addDays(today,7)), tipo:"examen", sede:"Ambas", descripcion:"" });
  };

  const tipoIcons = { examen:"🥋", torneo:"🏆", campamento:"⛺", seminario:"📚" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>EVENTOS</h1>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Evento</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eventos.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(e=>{ const days=Math.ceil((new Date(e.fecha)-today)/86400000); const parts=(() => { try { return JSON.parse(e.participantes||"[]"); } catch { return []; } })(); return (
          <div key={e.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/20">
            <div className="flex items-start justify-between" onClick={()=>setViewEvento(e)} style={{cursor:"pointer"}}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{e.tipo==="torneo"?"🏆":(tipoIcons[e.tipo]||"📅")}</span>
                <div>
                  <h3 className="font-bold text-white">{e.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{e.fecha} · {e.sede}</p>
                  {e.descripcion&&<p className="text-xs text-slate-400 mt-1">{e.descripcion}</p>}
                  <p className="text-xs text-amber-400 mt-1 font-semibold">👥 {parts.length} participante(s)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">{e.tipo}</span>
                <p className={`text-xs mt-1 font-semibold ${days<0?"text-red-400":days<7?"text-amber-400":"text-emerald-400"}`}>{days<0?"Pasado":days===0?"¡Hoy!":`En ${days} días`}</p>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button onClick={async(ev)=>{ ev.stopPropagation(); if(!confirm("¿Eliminar evento?")) return; await db.delete("eventos",e.id); await reload(); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>
            </div>
          </div>
        ); })}
      </div>
      {showForm&&(
        <Modal title="Nuevo Evento" onClose={()=>setShowForm(false)}>
          <div className="space-y-4">
            <Field label="Título"><Input value={form.titulo} onChange={set("titulo")} placeholder="Nombre del evento" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha"><Input type="date" value={form.fecha} onChange={set("fecha")} /></Field>
              <Field label="Tipo"><Select options={["examen","torneo","campamento","seminario"]} value={form.tipo} onChange={set("tipo")} /></Field>
              <Field label="Sede"><Select options={["Quito","Cumbayá","Ambas"]} value={form.sede} onChange={set("sede")} /></Field>
            </div>
            <Field label="Descripción"><Textarea value={form.descripcion} onChange={set("descripcion")} /></Field>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={()=>setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":"Crear Evento"}</button>
          </div>
        </Modal>
      )}
      {viewEvento && <EventoDetail evento={viewEvento} students={students} reload={reload} onClose={()=>setViewEvento(null)} />}
    </div>
  );
};

const UsersPage = ({ currentUser, setCurrentUser, allUsers, reloadUsers }) => {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const onDelete = async id => {
    if (id===currentUser.id) { alert("No puedes eliminar tu propio usuario"); return; }
    if (!confirm("¿Eliminar usuario?")) return;
    await db.delete("users", id);
    await reloadUsers();
  };

  const UserForm = ({ user, onClose }) => {
    const [nombre, setNombre] = useState(user?.nombre||"");
    const [email, setEmail] = useState(user?.email||"");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(user?.role||"profesor");
    const [err, setErr] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
      if (!nombre||!email) { setErr("Nombre y correo son obligatorios"); return; }
      if (!user&&!password) { setErr("La contraseña es obligatoria"); return; }
      setSaving(true);
      if (user) {
        const upd = { nombre, email, role };
        if (password) upd.password = password;
        await db.update("users", user.id, upd);
        if (currentUser.id===user.id) setCurrentUser({...currentUser,...upd});
      } else {
        await db.insert("users",{ nombre, email, password, role });
      }
      await reloadUsers();
      setSaving(false);
      onClose();
    };

    return (
      <Modal title={user?"Editar Usuario":"Nuevo Usuario"} onClose={onClose}>
        <div className="space-y-4">
          {err&&<div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
          <Field label="Nombre completo"><Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre completo" /></Field>
          <Field label="Correo"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@mail.com" /></Field>
          <Field label={user?"Nueva contraseña (vacío = no cambiar)":"Contraseña"}><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" /></Field>
          <Field label="Rol">
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[{id:"admin",label:"Admin",desc:"Todo el sistema",color:"#d4a017"},{id:"profesor",label:"Profesor",desc:"Asistencia + Pagos",color:"#3b82f6"},{id:"alumno",label:"Alumno/Padre",desc:"Solo sus datos",color:"#22c55e"}].map(r=>(
                <button key={r.id} type="button" onClick={()=>setRole(r.id)}
                  className="p-3 rounded-xl border text-center transition-all"
                  style={{ background:role===r.id?`${r.color}25`:"rgba(255,255,255,0.03)", borderColor:role===r.id?r.color:"rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-bold" style={{ color:role===r.id?r.color:"#94a3b8" }}>{r.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color:role===r.id?r.color:"#475569" }}>{r.desc}</p>
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":user?"Guardar":"Crear Usuario"}</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>USUARIOS</h1><p className="text-slate-400 text-sm">{allUsers.length} usuarios</p></div>
        <button onClick={()=>{ setEditUser(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Usuario</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{role:"admin",color:"#d4a017",label:"Admin",perms:["Todo el sistema"]},{role:"profesor",color:"#3b82f6",label:"Profesor",perms:["Asistencia","Alumnos","Registrar pagos","Ventas"]},{role:"alumno",color:"#22c55e",label:"Alumno/Padre",perms:["Ver su asistencia","Ver sus pagos"]}].map(r=>(
          <div key={r.role} className="rounded-2xl border p-4" style={{ background:`${r.color}10`, borderColor:`${r.color}30` }}>
            <p className="font-bold text-sm mb-2" style={{ color:r.color }}>{r.label}</p>
            <ul className="space-y-1">{r.perms.map(p=><li key={p} className="text-xs text-slate-400 flex items-center gap-1.5"><Icon name="check" className="w-3 h-3 text-emerald-400" />{p}</li>)}</ul>
            <p className="text-xs font-bold mt-3" style={{ color:r.color }}>{allUsers.filter(u=>u.role===r.role).length} usuario(s)</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {allUsers.map(u=>(
          <div key={u.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black" style={{ background:u.id===currentUser.id?"linear-gradient(135deg,#d4a017,#b8860b)":"rgba(255,255,255,0.08)", color:u.id===currentUser.id?"#020617":"#fff" }}>{u.nombre?.[0]||"U"}</div>
              <div>
                <div className="flex items-center gap-2"><p className="font-bold text-white text-sm">{u.nombre}</p>{u.id===currentUser.id&&<span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">Tú</span>}</div>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoleBadge role={u.role} />
              <button onClick={()=>{ setEditUser(u); setShowForm(true); }} className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"><Icon name="edit" className="w-4 h-4" /></button>
              {u.id!==currentUser.id&&<button onClick={()=>onDelete(u.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
      </div>
      {showForm&&<UserForm user={editUser} onClose={()=>{ setShowForm(false); setEditUser(null); }} />}
    </div>
  );
};

const MiAsistenciaPage = ({ currentUser, students, asistencia }) => {
  const alumno = students.find(s=>s.correo===currentUser.email);
  const [mesSeleccionado, setMesSeleccionado] = useState(fmt(today).slice(0,7));

  if (!alumno) return <div className="text-center py-20"><p className="text-6xl mb-4">🥋</p><h2 className="text-xl font-black text-white mb-2">Perfil no encontrado</h2><p className="text-slate-400 text-sm">Pide al administrador que vincule tu correo a tu ficha.</p></div>;

  const miAsistTodo = asistencia.filter(a=>a.alumno_id===alumno.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));

  // Obtener meses disponibles
  const mesesDisp = [...new Set(miAsistTodo.map(a=>a.fecha?.slice(0,7)))].sort((a,b)=>b.localeCompare(a));

  // Filtrar por mes seleccionado
  const miAsist = miAsistTodo.filter(a=>a.fecha?.slice(0,7)===mesSeleccionado);
  const presentes = miAsist.filter(a=>a.presente).length;
  const ausentes = miAsist.length - presentes;
  const pct = miAsist.length?Math.round((presentes/miAsist.length)*100):0;

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const formatMes = (ym) => { const [y,m] = ym.split("-"); return `${meses[parseInt(m)-1]} ${y}`; };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white/3 border border-amber-400/20 rounded-3xl p-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617] mx-auto mb-3" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{alumno.nombres[0]}{alumno.apellidos[0]}</div>
        <h2 className="text-2xl font-black text-white">{alumno.nombres} {alumno.apellidos}</h2>
        <div className="flex justify-center gap-2 mt-2 flex-wrap"><BeltBadge cinturon={alumno.cinturon} /><CategoriaBadge categoria={alumno.categoria||getCategoria(alumno.fecha_nacimiento)} /><MembresiaTag membresiaId={alumno.membresia} /></div>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-3">
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesSeleccionado); if(idx<mesesDisp.length-1) setMesSeleccionado(mesesDisp[idx+1]); }} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10">◀</button>
        <select className="flex-1 bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm text-center" value={mesSeleccionado} onChange={e=>setMesSeleccionado(e.target.value)}>
          {mesesDisp.map(m=><option key={m} value={m}>{formatMes(m)}</option>)}
        </select>
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesSeleccionado); if(idx>0) setMesSeleccionado(mesesDisp[idx-1]); }} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10">▶</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{presentes}</p><p className="text-xs text-slate-400 mt-1">Presentes</p></div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{ausentes}</p><p className="text-xs text-slate-400 mt-1">Ausentes</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{pct}%</p><p className="text-xs text-slate-400 mt-1">Asistencia</p></div>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>
          {mesSeleccionado ? formatMes(mesSeleccionado) : "HISTORIAL"}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {miAsist.length===0&&<p className="text-slate-500 text-sm">Sin registros en este mes</p>}
          {miAsist.map(a=>(
            <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl ${a.presente?"bg-emerald-500/10":"bg-red-500/10"}`}>
              <span className="text-sm text-white">{a.fecha}</span>
              <span className={`text-xs font-bold ${a.presente?"text-emerald-400":"text-red-400"}`}>{a.presente?"✓ Presente":"✗ Ausente"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MiHistorialPage = ({ currentUser, students, examenes, eventos }) => {
  const alumno = students.find(s=>s.correo===currentUser.email);
  if (!alumno) return <div className="text-center py-20"><p className="text-6xl mb-4">🥋</p><h2 className="text-xl font-black text-white mb-2">Perfil no encontrado</h2><p className="text-slate-400 text-sm">Pide al administrador que vincule tu correo.</p></div>;

  const misExamenes = (examenes||[]).filter(e=>e.alumno_id===alumno.id).sort((a,b)=>b.fecha?.localeCompare(a.fecha));
  const misEventos = (eventos||[]).filter(ev=>{ try { const p=JSON.parse(ev.participantes||"[]"); return p.find(p=>p.id===alumno.id); } catch { return false; } });

  const getMedalla = (evento) => {
    try { const p=JSON.parse(evento.participantes||"[]"); return p.find(x=>x.id===alumno.id)?.medalla||""; } catch { return ""; }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>MI HISTORIAL</h1>

      {/* Ascensos */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>🥋 ASCENSOS DE CINTURÓN</h3>
        {misExamenes.filter(e=>e.tipo?.includes("Ascenso")).length===0 && <p className="text-slate-500 text-sm">Sin ascensos registrados aún</p>}
        <div className="space-y-2">
          {misExamenes.filter(e=>e.tipo?.includes("Ascenso")).map(ex=>(
            <div key={ex.id} className="flex justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-sm font-semibold text-amber-400">{ex.tipo}</span>
              <span className="text-xs text-slate-400">{ex.fecha}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GALs */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>📋 GALs EMITIDOS</h3>
        {misExamenes.filter(e=>e.tipo?.includes("GAL")).length===0 && <p className="text-slate-500 text-sm">Sin GALs registrados</p>}
        <div className="space-y-2">
          {misExamenes.filter(e=>e.tipo?.includes("GAL")).map(ex=>(
            <div key={ex.id} className="flex justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <span className="text-sm font-semibold text-blue-400">{ex.tipo}</span>
              <span className="text-xs text-slate-400">{ex.fecha}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Eventos */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>🏆 PARTICIPACIÓN EN EVENTOS</h3>
        {misEventos.length===0 && <p className="text-slate-500 text-sm">Sin participaciones registradas</p>}
        <div className="space-y-2">
          {misEventos.map(ev=>{
            const medalla = getMedalla(ev);
            return (
              <div key={ev.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">{ev.titulo}</p>
                  <p className="text-xs text-slate-500">{ev.fecha} · {ev.tipo}</p>
                </div>
                <span className="text-lg">{medalla || "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MisPagosPage = ({ currentUser, students, pagos }) => {
  const alumno = students.find(s=>s.correo===currentUser.email);
  if (!alumno) return <div className="text-center py-20"><p className="text-slate-400">Perfil no encontrado.</p></div>;
  const hoyMisPagos = fmt(new Date());
  const misPagosRaw = pagos.filter(p=>p.alumno_id===alumno.id).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago));
  const misPagos = misPagosRaw.map(p => {
    if (!p.fecha_vencimiento) return p;
    if (p.fecha_vencimiento <= hoyMisPagos) return { ...p, estado: "vencido" };
    if (parseFloat(p.monto_pagado||0) >= parseFloat(p.monto||1)) return { ...p, estado: "pagado" };
    if (parseFloat(p.monto_pagado||0) > 0) return { ...p, estado: "parcial" };
    return { ...p, estado: "pendiente" };
  });
  const getDays = f => {
    const hoyMs = new Date(hoyMisPagos + "T00:00:00").getTime();
    const vencMs = new Date(f + "T00:00:00").getTime();
    return Math.ceil((vencMs - hoyMs) / 86400000);
  };
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>MIS PAGOS</h1>
      {misPagos.length===0&&<div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center"><p className="text-slate-400">Sin registros de pago</p></div>}
      <div className="space-y-3">
        {misPagos.map(p=>{ const dias=getDays(p.fecha_vencimiento); return (
          <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div><p className="font-bold text-white">{p.tipo}</p><p className="text-xs text-slate-500">{p.fecha_pago}</p></div>
              <div className="text-right"><p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/${parseFloat(p.monto).toFixed(2)}</span></p><StatusBadge estado={p.estado} /></div>
            </div>
            <p className={`text-xs font-semibold ${dias<0?"text-red-400":dias<7?"text-amber-400":"text-emerald-400"}`}>{dias<0?`Vencido hace ${Math.abs(dias)} días`:`Vence en ${dias} días`}</p>
          </div>
        ); })}
      </div>
    </div>
  );
};

const GlobalSearchModal = ({ students, pagos, examenes, ventas, setPage, onClose }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = q.trim().length < 2 ? [] : (() => {
    const ql = q.toLowerCase();
    const items = [];

    // Alumnos
    students.filter(s =>
      `${s.nombres} ${s.apellidos}`.toLowerCase().includes(ql) ||
      s.telefono?.includes(ql) ||
      s.correo?.toLowerCase().includes(ql)
    ).slice(0,5).forEach(s => items.push({
      tipo: "alumno",
      icon: "👤",
      titulo: `${s.nombres} ${s.apellidos}`,
      sub: `${s.cinturon} · ${s.sede} · ${s.estado}`,
      color: s.estado === "activo" ? "#10b981" : "#6b7280",
      action: () => { setPage("students"); onClose(); }
    }));

    // Pagos
    pagos.filter(p =>
      p.alumno_nombre?.toLowerCase().includes(ql)
    ).slice(0,3).forEach(p => items.push({
      tipo: "pago",
      icon: "💳",
      titulo: p.alumno_nombre,
      sub: `${p.tipo} · Vence: ${p.fecha_vencimiento}`,
      color: "#d4a017",
      action: () => { setPage("payments"); onClose(); }
    }));

    // Exámenes
    examenes.filter(e =>
      e.alumno_nombre?.toLowerCase().includes(ql)
    ).slice(0,3).forEach(e => items.push({
      tipo: "examen",
      icon: "🏆",
      titulo: e.alumno_nombre,
      sub: `${e.tipo} · ${e.fecha}`,
      color: "#f59e0b",
      action: () => { setPage("examenes"); onClose(); }
    }));

    // Ventas
    ventas.filter(v =>
      v.cliente?.toLowerCase().includes(ql)
    ).slice(0,3).forEach(v => items.push({
      tipo: "venta",
      icon: "🛍️",
      titulo: v.cliente || "Sin nombre",
      sub: `${v.detalle?.substring(0,40)} · $${parseFloat(v.total||0).toFixed(2)}`,
      color: "#a855f7",
      action: () => { setPage("ventas"); onClose(); }
    }));

    return items;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background:"rgba(8,13,26,0.97)" }}>
      {/* Search input */}
      <div className="p-4 border-b" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background:"rgba(13,20,38,0.8)", borderColor:"rgba(30,58,123,0.4)" }}>
            <Icon name="search" className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Buscar alumno, pago, examen, venta..."
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
              autoComplete="off"
            />
            {q && <button onClick={()=>setQ("")} className="text-slate-500 hover:text-white">✕</button>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 rounded-xl border border-white/10">
            Cancelar
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {q.length < 2 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-slate-400 text-sm">Escribe al menos 2 caracteres para buscar</p>
            <p className="text-slate-600 text-xs mt-2">Alumnos, pagos, exámenes, ventas</p>
          </div>
        )}

        {q.length >= 2 && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">😕</p>
            <p className="text-slate-400 text-sm">Sin resultados para "{q}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <button key={i} onClick={r.action}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:border-blue-500/40 active:scale-98"
                style={{ background:"rgba(13,20,38,0.8)", borderColor:"rgba(30,58,123,0.2)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background:"rgba(30,58,123,0.2)" }}>
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{r.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{r.sub}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0"
                  style={{ background:`${r.color}20`, color:r.color }}>
                  {r.tipo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InventarioPage = ({ inventario, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCat, setFilterCat] = useState("Todos");

  const cats = ["Todos", "bebidas", "implementos", "uniformes", "otros"];
  const filtered = inventario.filter(i => filterCat === "Todos" || i.categoria === filterCat)
    .sort((a,b) => a.nombre.localeCompare(b.nombre));

  const stockBajo = inventario.filter(i => i.stock <= i.stock_minimo && i.stock_minimo > 0);

  const deleteItem = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await db.delete("inventario", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>INVENTARIO</h1>
        {isAdmin && <button onClick={()=>{ setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#020617]"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          + Producto
        </button>}
      </div>

      {/* Alertas stock bajo */}
      {stockBajo.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-400 mb-2">⚠️ Stock bajo en {stockBajo.length} producto(s):</p>
          <div className="flex flex-wrap gap-2">
            {stockBajo.map(i => (
              <span key={i.id} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold">
                {i.nombre}: {i.stock} unid.
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.2)" }}>
          <p className="text-2xl font-black text-blue-400">{inventario.length}</p>
          <p className="text-xs text-slate-400 mt-1">Productos</p>
        </div>
        <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(16,185,129,0.1)", borderColor:"rgba(16,185,129,0.2)" }}>
          <p className="text-2xl font-black text-emerald-400">{inventario.reduce((a,i)=>a+i.stock,0)}</p>
          <p className="text-xs text-slate-400 mt-1">Unidades totales</p>
        </div>
        <div className="rounded-2xl p-4 text-center border" style={{ background:"rgba(212,160,23,0.1)", borderColor:"rgba(212,160,23,0.2)" }}>
          <p className="text-2xl font-black text-yellow-400">${inventario.reduce((a,i)=>a+(i.stock*i.precio_venta),0).toFixed(0)}</p>
          <p className="text-xs text-slate-400 mt-1">Valor stock</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {cats.map(cat => (
          <button key={cat} onClick={()=>setFilterCat(cat)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
            style={filterCat===cat?{background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)",color:"white"}:{background:"rgba(255,255,255,0.05)",color:"#64748b"}}>
            {cat}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(item => {
          const stockBajoItem = item.stock <= item.stock_minimo && item.stock_minimo > 0;
          return (
            <div key={item.id} className="p-4 rounded-2xl border" style={{ background:"#0d1426", borderColor:stockBajoItem?"rgba(239,68,68,0.3)":"rgba(30,58,123,0.25)" }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm">{item.nombre}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background:"rgba(30,58,123,0.3)", color:"#93c5fd" }}>{item.categoria}</span>
                    {stockBajoItem && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">⚠️ Stock bajo</span>}
                  </div>
                  {item.descripcion && <p className="text-xs text-slate-500 mt-0.5">{item.descripcion}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{item.stock} <span className="text-xs text-slate-500 font-normal">unid.</span></p>
                    <p className="text-xs text-yellow-400 font-semibold">${parseFloat(item.precio_venta||0).toFixed(2)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={()=>{ setEditItem(item); setShowForm(true); }}
                        className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center text-xs">✏️</button>
                      <button onClick={()=>deleteItem(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center">
                        <Icon name="trash" className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">Sin productos registrados</div>}
      </div>

      {showForm && <InventarioForm item={editItem} reload={reload} onClose={()=>{ setShowForm(false); setEditItem(null); }} />}
    </div>
  );
};

const InventarioForm = ({ item, reload, onClose }) => {
  const [nombre, setNombre] = useState(item?.nombre || "");
  const [categoria, setCategoria] = useState(item?.categoria || "implementos");
  const [precioVenta, setPrecioVenta] = useState(item?.precio_venta || "");
  const [stock, setStock] = useState(item?.stock || "");
  const [stockMinimo, setStockMinimo] = useState(item?.stock_minimo || 5);
  const [descripcion, setDescripcion] = useState(item?.descripcion || "");
  const [stockExtra, setStockExtra] = useState(""); // Para agregar stock sin reemplazar
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nombre) return;
    setSaving(true);
    const stockFinal = item ? (parseInt(item.stock||0) + parseInt(stockExtra||0)) : parseInt(stock||0);
    const data = { nombre, categoria, precio_venta: parseFloat(precioVenta)||0, stock: stockFinal, stock_minimo: parseInt(stockMinimo)||0, descripcion };
    if (item) await db.update("inventario", item.id, data);
    else await db.insert("inventario", data);
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={item ? `Editar — ${item.nombre}` : "Nuevo Producto"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" className="col-span-2"><Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Dobok tradicional" /></Field>
          <Field label="Categoría">
            <select value={categoria} onChange={e=>setCategoria(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              {["bebidas","implementos","uniformes","otros"].map(c=><option key={c} value={c} className="bg-slate-800">{c}</option>)}
            </select>
          </Field>
          <Field label="Precio venta ($)"><Input type="number" value={precioVenta} onChange={e=>setPrecioVenta(e.target.value)} placeholder="0.00" /></Field>
          {item ? (
            <>
              <div className="col-span-2 p-3 rounded-xl border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.3)" }}>
                <p className="text-xs text-slate-400 mb-1">Stock actual: <span className="font-bold text-white">{item.stock} unidades</span></p>
                <Field label="Agregar stock (+)"><Input type="number" value={stockExtra} onChange={e=>setStockExtra(e.target.value)} placeholder="0" /></Field>
                {stockExtra && <p className="text-xs text-emerald-400 mt-1">Nuevo total: {parseInt(item.stock||0) + parseInt(stockExtra||0)} unidades</p>}
              </div>
            </>
          ) : (
            <Field label="Stock inicial"><Input type="number" value={stock} onChange={e=>setStock(e.target.value)} placeholder="0" /></Field>
          )}
          <Field label="Stock mínimo (alerta)"><Input type="number" value={stockMinimo} onChange={e=>setStockMinimo(e.target.value)} placeholder="5" /></Field>
          <Field label="Descripción (opcional)" className="col-span-2"><Input value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Descripción del producto" /></Field>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||!nombre} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>{saving?"Guardando...":item?"Guardar cambios":"Agregar producto"}</button>
      </div>
    </Modal>
  );
};

const CATEGORIAS_GASTO = {
  arriendo:   { label:"Arriendo",    icon:"🏢", color:"#3b82f6", tipo:"fijo" },
  servicio:   { label:"Servicios",   icon:"💡", color:"#8b5cf6", tipo:"fijo" },
  sueldo:     { label:"Sueldos",     icon:"👤", color:"#10b981", tipo:"fijo" },
  variable:   { label:"Variable",    icon:"📦", color:"#f59e0b", tipo:"variable" },
};

const GastosPage = ({ gastos, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [editGasto, setEditGasto] = useState(null);
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterSede, setFilterSede] = useState("Todas");
  const [filterMes, setFilterMes] = useState(fmt(new Date()).slice(0,7));

  const mesActual = fmt(new Date()).slice(0,7);
  const gastosFiltrados = gastos.filter(g => {
    if (filterTipo !== "Todos" && g.tipo !== filterTipo) return false;
    if (filterSede !== "Todas" && g.sede !== filterSede) return false;
    if (filterMes && g.fecha?.slice(0,7) !== filterMes) return false;
    return true;
  }).sort((a,b) => b.fecha?.localeCompare(a.fecha));

  const totalFijos = gastos.filter(g=>g.tipo==="fijo"&&g.fecha?.slice(0,7)===filterMes).reduce((a,g)=>a+parseFloat(g.monto||0),0);
  const totalVariables = gastos.filter(g=>g.tipo==="variable"&&g.fecha?.slice(0,7)===filterMes).reduce((a,g)=>a+parseFloat(g.monto||0),0);
  const totalMes = totalFijos + totalVariables;

  // Por sede
  const porSede = SEDES.map(sede => ({
    sede,
    total: gastos.filter(g=>g.sede===sede&&g.fecha?.slice(0,7)===filterMes).reduce((a,g)=>a+parseFloat(g.monto||0),0)
  }));

  const deleteGasto = async (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await db.delete("gastos", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>GASTOS</h1>
        {isAdmin && <button onClick={()=>{ setEditGasto(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#020617]"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          + Registrar
        </button>}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <input type="month" value={filterMes} onChange={e=>setFilterMes(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" />
        {["Todos","fijo","variable"].map(t=>(
          <button key={t} onClick={()=>setFilterTipo(t)}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
            style={filterTipo===t?{background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)",color:"white"}:{background:"rgba(255,255,255,0.05)",color:"#64748b"}}>
            {t==="Todos"?"Todos":t==="fijo"?"Fijos":"Variables"}
          </button>
        ))}
        {["Todas",...SEDES].map(s=>(
          <button key={s} onClick={()=>setFilterSede(s)}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={filterSede===s?{background:"rgba(30,58,123,0.4)",color:"white",border:"1px solid rgba(30,58,123,0.5)"}:{background:"rgba(255,255,255,0.05)",color:"#64748b",border:"1px solid transparent"}}>
            {s}
          </button>
        ))}
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(59,130,246,0.1)", borderColor:"rgba(59,130,246,0.2)" }}>
          <p className="text-xs text-blue-400 font-semibold uppercase">Gastos Fijos</p>
          <p className="text-2xl font-black text-white mt-1">${totalFijos.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(245,158,11,0.1)", borderColor:"rgba(245,158,11,0.2)" }}>
          <p className="text-xs text-amber-400 font-semibold uppercase">Variables</p>
          <p className="text-2xl font-black text-white mt-1">${totalVariables.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background:"rgba(239,68,68,0.1)", borderColor:"rgba(239,68,68,0.2)" }}>
          <p className="text-xs text-red-400 font-semibold uppercase">Total Mes</p>
          <p className="text-2xl font-black text-white mt-1">${totalMes.toFixed(2)}</p>
        </div>
      </div>

      {/* Por sede */}
      <div className="grid grid-cols-2 gap-3">
        {porSede.map(({sede,total})=>(
          <div key={sede} className="rounded-2xl p-3 border" style={{ background:"rgba(13,20,38,0.8)", borderColor:"rgba(30,58,123,0.25)" }}>
            <p className="text-xs text-slate-400">📍 {sede}</p>
            <p className="text-lg font-black text-white mt-1">${total.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Lista de gastos */}
      <div className="space-y-2">
        {/* Fijos primero */}
        {["fijo","variable"].filter(t=>filterTipo==="Todos"||filterTipo===t).map(tipo=>{
          const items = gastosFiltrados.filter(g=>g.tipo===tipo);
          if (items.length===0) return null;
          return (
            <div key={tipo}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:tipo==="fijo"?"#3b82f6":"#f59e0b" }}>
                {tipo==="fijo"?"📌 Gastos Fijos":"📦 Gastos Variables"}
              </p>
              {items.map(g=>{
                const cat = CATEGORIAS_GASTO[g.categoria] || CATEGORIAS_GASTO.variable;
                return (
                  <div key={g.id} className="flex items-center justify-between p-4 rounded-2xl border mb-2" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.25)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background:`${cat.color}20` }}>
                        {cat.icon}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{g.nombre}</p>
                        <p className="text-xs text-slate-500">{cat.label} · {g.sede} · {g.fecha}</p>
                        {g.descripcion && <p className="text-xs text-slate-600 mt-0.5">{g.descripcion}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-lg font-black text-red-400">-${parseFloat(g.monto||0).toFixed(2)}</p>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={()=>{ setEditGasto(g); setShowForm(true); }}
                            className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">✏️</button>
                          <button onClick={()=>deleteGasto(g.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                            <Icon name="trash" className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {gastosFiltrados.length===0 && (
          <div className="text-center py-12 text-slate-500 text-sm">Sin gastos registrados para este período</div>
        )}
      </div>

      {showForm && <GastoForm gasto={editGasto} reload={reload} onClose={()=>{ setShowForm(false); setEditGasto(null); }} />}
    </div>
  );
};

const GastoForm = ({ gasto, reload, onClose }) => {
  const [tipo, setTipo] = useState(gasto?.tipo || "fijo");
  const [categoria, setCategoria] = useState(gasto?.categoria || "arriendo");
  const [nombre, setNombre] = useState(gasto?.nombre || "");
  const [monto, setMonto] = useState(gasto?.monto || "");
  const [fecha, setFecha] = useState(gasto?.fecha || fmt(new Date()));
  const [sede, setSede] = useState(gasto?.sede || SEDES[0]);
  const [descripcion, setDescripcion] = useState(gasto?.descripcion || "");
  const [recurrente, setRecurrente] = useState(gasto?.recurrente || false);
  const [saving, setSaving] = useState(false);

  const categoriasDisponibles = Object.entries(CATEGORIAS_GASTO).filter(([,v])=>
    tipo==="fijo" ? v.tipo==="fijo" : v.tipo==="variable"
  );

  useEffect(()=>{
    if (tipo==="fijo" && !["arriendo","servicio","sueldo"].includes(categoria)) setCategoria("arriendo");
    if (tipo==="variable") setCategoria("variable");
  },[tipo]);

  const save = async () => {
    if (!nombre || !monto) return;
    setSaving(true);
    const data = { tipo, categoria, nombre, monto:parseFloat(monto), fecha, sede, descripcion, recurrente };
    if (gasto) await db.update("gastos", gasto.id, data);
    else await db.insert("gastos", data);
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={gasto ? "Editar gasto" : "Registrar gasto"} onClose={onClose}>
      <div className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          {[["fijo","📌 Fijo"],["variable","📦 Variable"]].map(([id,label])=>(
            <button key={id} type="button" onClick={()=>setTipo(id)}
              className="py-3 rounded-xl border text-sm font-bold transition-all"
              style={tipo===id?{background:"rgba(30,58,123,0.3)",borderColor:"rgba(30,58,123,0.6)",color:"white"}:{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.1)",color:"#64748b"}}>
              {label}
            </button>
          ))}
        </div>

        {/* Categoría */}
        <Field label="Categoría">
          <div className="grid grid-cols-2 gap-2">
            {categoriasDisponibles.map(([id,cat])=>(
              <button key={id} type="button" onClick={()=>setCategoria(id)}
                className="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2"
                style={categoria===id?{background:`${cat.color}25`,borderColor:cat.color,color:cat.color}:{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.1)",color:"#64748b"}}>
                <span>{cat.icon}</span>{cat.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Descripción / Nombre" className="col-span-2">
            <Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Arriendo local Cumbayá, Compra bebidas..." />
          </Field>
          <Field label="Monto ($)">
            <Input type="number" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" step="0.01" />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
          </Field>
          <Field label="Sede">
            <select value={sede} onChange={e=>setSede(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              {SEDES.map(s=><option key={s} value={s} className="bg-slate-800">{s}</option>)}
            </select>
          </Field>
          <Field label="¿Recurrente?">
            <button type="button" onClick={()=>setRecurrente(r=>!r)}
              className="w-full h-[42px] rounded-xl border text-sm font-semibold transition-all"
              style={recurrente?{background:"rgba(16,185,129,0.2)",borderColor:"rgba(16,185,129,0.4)",color:"#10b981"}:{background:"rgba(255,255,255,0.05)",borderColor:"rgba(255,255,255,0.1)",color:"#64748b"}}>
              {recurrente?"✓ Sí, mensual":"No"}
            </button>
          </Field>
          <Field label="Notas (opcional)" className="col-span-2">
            <Input value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Notas adicionales..." />
          </Field>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||!nombre||!monto} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          {saving?"Guardando...":gasto?"Guardar cambios":"Registrar gasto"}
        </button>
      </div>
    </Modal>
  );
};

const ConfiguracionPage = ({ configExamenes, configGal, configMembresias, inventario, reload }) => {
  const [tab, setTab] = useState("examenes");
  const [saving, setSaving] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [editProd, setEditProd] = useState(null);

  // ── Exámenes config ──
  const [editExamen, setEditExamen] = useState(null);
  const [showExamenForm, setShowExamenForm] = useState(false);

  // ── GAL config ──
  const galCosto = configGal?.[0]?.costo || 13;
  const [newGalCosto, setNewGalCosto] = useState(galCosto);

  const saveGal = async () => {
    setSaving(true);
    if (configGal && configGal.length > 0) {
      await db.update("config_gal", configGal[0].id, { costo: parseFloat(newGalCosto) });
    } else {
      await db.insert("config_gal", { costo: parseFloat(newGalCosto) });
    }
    await reload();
    setSaving(false);
  };

  const deleteExamen = async (id) => {
    if (!confirm("¿Eliminar este precio?")) return;
    await db.delete("config_examenes", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>CONFIGURACIÓN</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["examenes","🏆 Exámenes"],["gal","📄 GAL"],["membresias","💳 Membresías"],["productos","🛍️ Productos"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={tab===id?{background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)",color:"white"}:{background:"rgba(255,255,255,0.05)",color:"#64748b"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Exámenes */}
      {tab==="examenes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">Configura el costo de cada ascenso de cinturón</p>
            <button onClick={()=>{ setEditExamen(null); setShowExamenForm(true); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#020617]"
              style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
              + Agregar
            </button>
          </div>

          {/* Tabla de precios */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
            <div className="px-4 py-3 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
              <div className="grid grid-cols-4 text-xs font-bold text-blue-300 uppercase">
                <span>Desde</span><span>Hasta</span><span>Costo</span><span></span>
              </div>
            </div>
            {configExamenes.length > 0 ? configExamenes.map(cfg=>(
              <div key={cfg.id} className="grid grid-cols-4 items-center px-4 py-3 border-b" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.15)" }}>
                <span className="text-sm text-white">{cfg.cinturon_desde}</span>
                <span className="text-sm text-white">{cfg.cinturon_hasta}</span>
                <span className="text-sm font-bold text-yellow-400">${parseFloat(cfg.costo||0).toFixed(2)}</span>
                <div className="flex gap-1 justify-end">
                  <button onClick={()=>{ setEditExamen(cfg); setShowExamenForm(true); }} className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">✏️</button>
                  <button onClick={()=>deleteExamen(cfg.id)} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center"><Icon name="trash" className="w-3 h-3" /></button>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center" style={{ background:"#0d1426" }}>
                <p className="text-slate-500 text-sm">Sin precios configurados</p>
                <p className="text-slate-600 text-xs mt-1">Se usarán los precios por defecto del sistema</p>
              </div>
            )}
          </div>

          {showExamenForm && (
            <ExamenPrecioForm item={editExamen} reload={reload} onClose={()=>{ setShowExamenForm(false); setEditExamen(null); }} />
          )}
        </div>
      )}

      {/* GAL */}
      {tab==="gal" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Define el costo de emisión del GAL para tu academia</p>
          <div className="p-5 rounded-2xl border" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.3)" }}>
            <Field label="Costo del GAL ($)">
              <Input type="number" value={newGalCosto} onChange={e=>setNewGalCosto(e.target.value)} placeholder="13.00" step="0.01" />
            </Field>
            <div className="mt-4 p-3 rounded-xl border" style={{ background:"rgba(30,58,123,0.1)", borderColor:"rgba(30,58,123,0.2)" }}>
              <p className="text-xs text-slate-400">Costo actual del sistema: <span className="text-white font-bold">${parseFloat(galCosto).toFixed(2)}</span></p>
            </div>
            <button onClick={saveGal} disabled={saving} className="w-full mt-4 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
              {saving?"Guardando...":"Guardar precio GAL"}
            </button>
          </div>
        </div>
      )}

      {/* Membresías */}
      {tab==="membresias" && (
        <MembresiasConfig configMembresias={configMembresias} reload={reload} />
      )}

      {/* Productos */}
      {tab==="productos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">Gestiona tus productos y precios de venta</p>
            <button onClick={()=>{ setEditProd(null); setShowProdForm(true); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#020617]"
              style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
              + Producto
            </button>
          </div>

          {/* Lista productos por categoría */}
          {["bebidas","implementos","uniformes","otros"].map(cat => {
            const prods = (inventario||[]).filter(p=>p.categoria===cat);
            if (prods.length === 0) return null;
            return (
              <div key={cat} className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
                <div className="px-4 py-2 border-b" style={{ background:"rgba(30,58,123,0.2)", borderColor:"rgba(30,58,123,0.3)" }}>
                  <p className="text-xs font-bold text-blue-300 uppercase">{cat}</p>
                </div>
                {prods.map(p=>(
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.1)" }}>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.nombre}</p>
                      <p className="text-xs text-slate-500">Stock: {p.stock} · Mín: {p.stock_minimo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-yellow-400">${parseFloat(p.precio_venta||0).toFixed(2)}</p>
                      <button onClick={()=>{ setEditProd(p); setShowProdForm(true); }}
                        className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">✏️</button>
                      <button onClick={async()=>{ if(!confirm("¿Eliminar?")) return; await db.delete("inventario",p.id); await reload(); }}
                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                        <Icon name="trash" className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {(!inventario || inventario.length === 0) && (
            <div className="p-8 text-center rounded-2xl border" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.2)" }}>
              <p className="text-slate-500 text-sm">Sin productos registrados</p>
              <p className="text-slate-600 text-xs mt-1">Agrega tus productos con sus precios</p>
            </div>
          )}

          {showProdForm && (
            <InventarioForm item={editProd} reload={reload} onClose={()=>{ setShowProdForm(false); setEditProd(null); }} />
          )}
        </div>
      )}
    </div>
  );
};

const ExamenPrecioForm = ({ item, reload, onClose }) => {
  const [cinturonDesde, setCinturonDesde] = useState(item?.cinturon_desde || CINTURONES[0]);
  const [cinturonHasta, setCinturonHasta] = useState(item?.cinturon_hasta || CINTURONES[1]);
  const [costo, setCosto] = useState(item?.costo || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!costo) return;
    setSaving(true);
    const data = { cinturon_desde: cinturonDesde, cinturon_hasta: cinturonHasta, costo: parseFloat(costo) };
    if (item) await db.update("config_examenes", item.id, data);
    else await db.insert("config_examenes", data);
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={item?"Editar precio":"Nuevo precio de examen"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cinturón desde">
            <select value={cinturonDesde} onChange={e=>setCinturonDesde(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              {CINTURONES.map(cin=><option key={cin} value={cin} className="bg-slate-800">{cin}</option>)}
            </select>
          </Field>
          <Field label="Cinturón hasta">
            <select value={cinturonHasta} onChange={e=>setCinturonHasta(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none">
              {CINTURONES.map(cin=><option key={cin} value={cin} className="bg-slate-800">{cin}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Costo ($)">
          <Input type="number" value={costo} onChange={e=>setCosto(e.target.value)} placeholder="0.00" step="0.01" />
        </Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
        <button onClick={save} disabled={saving||!costo} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          {saving?"Guardando...":item?"Guardar":"Agregar"}
        </button>
      </div>
    </Modal>
  );
};

const MembresiasConfig = ({ configMembresias, reload }) => {
  const [showForm, setShowForm] = useState(false);
  const [editMemb, setEditMemb] = useState(null);
  const [saving, setSaving] = useState(false);

  const deleteMemb = async (id) => {
    if (!confirm("¿Eliminar esta membresía?")) return;
    await db.delete("config_membresias", id);
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">Define tus planes de membresía y precios</p>
        <button onClick={()=>{ setEditMemb(null); setShowForm(true); }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-[#020617]"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          + Membresía
        </button>
      </div>
      <div className="space-y-2">
        {configMembresias.map(m=>(
          <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.25)" }}>
            <div>
              <p className="font-bold text-white">{m.nombre}</p>
              <p className="text-xs text-slate-500">{m.sesiones>=999?"Sesiones ilimitadas":`${m.sesiones} sesiones`}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-black text-yellow-400">${parseFloat(m.precio||0).toFixed(2)}</p>
              <button onClick={()=>{ setEditMemb(m); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">✏️</button>
              <button onClick={()=>deleteMemb(m.id)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center"><Icon name="trash" className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {configMembresias.length===0 && (
          <div className="p-6 text-center rounded-2xl border" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.2)" }}>
            <p className="text-slate-500 text-sm">Sin membresías configuradas</p>
            <p className="text-slate-600 text-xs mt-1">Se usarán los planes por defecto del sistema</p>
          </div>
        )}
      </div>
      {showForm && <MembresiaForm item={editMemb} reload={reload} onClose={()=>{ setShowForm(false); setEditMemb(null); }} />}
    </div>
  );
};

const MembresiaForm = ({ item, reload, onClose }) => {
  const [nombre, setNombre] = useState(item?.nombre || "");
  const [precio, setPrecio] = useState(item?.precio || "");
  const [sesiones, setSesiones] = useState(item?.sesiones || 999);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nombre||!precio) return;
    setSaving(true);
    const data = { nombre, precio: parseFloat(precio), sesiones: parseInt(sesiones)||999 };
    if (item) await db.update("config_membresias", item.id, data);
    else await db.insert("config_membresias", data);
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={item?"Editar membresía":"Nueva membresía"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre"><Input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Mensual, Trimestral..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio ($)"><Input type="number" value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Sesiones (999=ilimitadas)"><Input type="number" value={sesiones} onChange={e=>setSesiones(e.target.value)} /></Field>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
        <button onClick={save} disabled={saving||!nombre||!precio} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60"
          style={{ background:"linear-gradient(135deg,#d4a017,#b8860b)" }}>
          {saving?"Guardando...":item?"Guardar":"Agregar"}
        </button>
      </div>
    </Modal>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  
  // Load jsPDF on mount
  useEffect(() => {
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
    }
  }, []);
  const [page, setPage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [students, setStudents] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const refreshRef = useRef(null);

  const [historialPagos, setHistorialPagos] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [configExamenes, setConfigExamenes] = useState([]);
  const [configGal, setConfigGal] = useState([]);
  const [configMembresias, setConfigMembresias] = useState([]);

  const loadAll = useCallback(async () => {
    const [s,p,a,e,v,ex,h,hv,inv,g,cfgEx,cfgGal,cfgMemb] = await Promise.all([
      db.get("students"), db.get("pagos"), db.get("asistencia"), db.get("eventos"), db.get("ventas"), db.get("examenes"), db.get("historial_pagos"), db.get("historial_ventas"), db.get("inventario"), db.get("gastos"),
      db.get("config_examenes"), db.get("config_gal"), db.get("config_membresias"),
    ]);
    setStudents(Array.isArray(s)?s:[]);
    // Estado se calcula en tiempo real, no se guarda en BD
    setPagos(Array.isArray(p) ? p : []);
    setHistorialPagos(Array.isArray(h) ? h : []);
    setHistorialVentas(Array.isArray(hv) ? hv : []);
    setInventario(Array.isArray(inv) ? inv : []);
    setGastos(Array.isArray(g) ? g : []);
    setConfigExamenes(Array.isArray(cfgEx) ? cfgEx : []);
    setConfigGal(Array.isArray(cfgGal) ? cfgGal : []);
    setConfigMembresias(Array.isArray(cfgMemb) ? cfgMemb : []);
    setAsistencia(Array.isArray(a)?a:[]);
    setEventos(Array.isArray(e)?e:[]);
    setVentas(Array.isArray(v)?v:[]);
    setExamenes(Array.isArray(ex)?ex:[]);
  }, []);

  const reloadExamenes = useCallback(async () => {
    const ex = await db.get("examenes");
    setExamenes(Array.isArray(ex)?ex:[]);
  }, []);

  const reloadUsers = useCallback(async () => {
    // Filter by club_id — only show users from same academy
    const u = await db.get("users", `&club_id=eq.${CURRENT_CLUB_ID}`);
    setAllUsers(Array.isArray(u)?u:[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadAll(), reloadUsers()]).finally(()=>setLoading(false));
    refreshRef.current = setInterval(loadAll, REFRESH_INTERVAL);
    return () => clearInterval(refreshRef.current);
  }, [user]);

  const handleLogin = u => {
    CURRENT_CLUB_ID = u.club_id || null;
    setUser(u);
    if (u.role === "superadmin") {
      CURRENT_CLUB_ID = null;
      setPage("superadmin");
    } else {
      setPage((PERMISOS[u.role]||[])[0]);
    }
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const isAdmin = user.role==="admin";
  const perms = PERMISOS[user.role]||[];

  const allNavItems = [
    { id:"dashboard",     label:"Dashboard",    icon:"dashboard"    },
    { id:"students",      label:"Alumnos",      icon:"students"     },
    { id:"payments",      label:"Pagos",        icon:"payments"     },
    { id:"ventas",        label:"Ventas",       icon:"ventas"       },
    { id:"attendance",    label:"Asistencia",   icon:"attendance"   },
    { id:"examenes",      label:"Exámenes",     icon:"examenes"     },
    { id:"finance",       label:"Finanzas",     icon:"finance"      },
    { id:"events",        label:"Eventos",      icon:"calendar"     },
    { id:"inventario",    label:"Inventario",   icon:"ventas"       },
    { id:"gastos",        label:"Gastos",       icon:"finance"      },
    { id:"configuracion", label:"Configuración", icon:"users"        },
    { id:"users",         label:"Usuarios",     icon:"users"        },
    { id:"mi_asistencia", label:"Mi Asistencia",icon:"mi_asistencia"},
    { id:"mis_pagos",     label:"Mis Pagos",    icon:"mis_pagos"    },
    { id:"mi_historial",  label:"Mi Historial", icon:"mi_historial" },
  ];

  const navItems = allNavItems.filter(n=>perms.includes(n.id));
  const hoyAlerts = fmt(new Date());
  const alerts = pagos.filter(p => {
    if (parseFloat(p.monto_pagado||0) >= parseFloat(p.monto||1)) return false;
    if (!p.fecha_vencimiento) return false;
    // Vencido o próximo a vencer (5 días)
    const hoyMs = new Date(hoyAlerts + "T00:00:00").getTime();
    const vencMs = new Date(p.fecha_vencimiento + "T00:00:00").getTime();
    const dias = Math.ceil((vencMs - hoyMs) / 86400000);
    return dias <= 5;
  }).length;
  const roleColors = { admin:"#d4a017", profesor:"#3b82f6", alumno:"#22c55e" };

  const renderPage = () => {
    if (loading) return <Spinner />;
    switch(page) {
      case "superadmin":    return <SuperAdminPage currentUser={user} reload={loadAll} />;
      case "dashboard":     return <DashboardPage students={students} pagos={pagos} historialPagos={historialPagos} asistencia={asistencia} ventas={ventas} eventos={eventos} examenes={examenes} />;
      case "students":      return <StudentsPage students={students} reload={loadAll} canEdit={isAdmin} asistencia={asistencia} examenes={examenes} eventos={eventos} pagos={pagos} historialPagos={historialPagos} ventas={ventas} />;
      case "payments":      return <PaymentsPage students={students} pagos={pagos} historialPagos={historialPagos} reload={loadAll} isAdmin={isAdmin} />;
      case "ventas":        return <VentasPage ventas={ventas} historialVentas={historialVentas} students={students} inventario={inventario} reload={loadAll} isAdmin={isAdmin} />;
      case "attendance":    return <AttendancePage students={students} asistencia={asistencia} reload={loadAll} />;
      case "examenes":      return <ExamenesPage students={students} reload={loadAll} examenes={examenes} reloadExamenes={reloadExamenes} configExamenes={configExamenes} configGal={configGal} />;
      case "configuracion":  return <ConfiguracionPage configExamenes={configExamenes} configGal={configGal} configMembresias={configMembresias} inventario={inventario} reload={loadAll} />;
      case "finance":       return <FinancePage pagos={pagos} historialPagos={historialPagos} ventas={ventas} eventos={eventos} examenes={examenes} gastos={gastos} />;
      case "inventario":    return <InventarioPage inventario={inventario} reload={loadAll} isAdmin={isAdmin} />;
      case "gastos":        return <GastosPage gastos={gastos} reload={loadAll} isAdmin={isAdmin} />;
      case "events":        return <EventsPage eventos={eventos} students={students} reload={loadAll} />;
      case "users":         return <UsersPage currentUser={user} setCurrentUser={setUser} allUsers={allUsers} reloadUsers={reloadUsers} />;
      case "mi_asistencia": return <MiAsistenciaPage currentUser={user} students={students} asistencia={asistencia} />;
      case "mis_pagos":     return <MisPagosPage currentUser={user} students={students} pagos={pagos} />;
      case "mi_historial":  return <MiHistorialPage currentUser={user} students={students} examenes={examenes} eventos={eventos} />;
      default:              return <Spinner />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background:"#080d1a", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r transition-transform duration-300 ${sidebarOpen?"translate-x-0":"-translate-x-full lg:translate-x-0"}`} style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.3)" }}>
        <div className="p-5 border-b" style={{ borderColor:"rgba(30,58,123,0.3)" }}>
          <div className="flex items-center gap-3">
            <img src={LOGO_SRC} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 shadow-lg" />
            <div>
              <p className="font-black text-white text-xs tracking-widest" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em" }}>HS TAEKWONDO</p>
              <p className="text-[10px] font-semibold tracking-widest" style={{ color:"#9ca3af" }}>SYSTEM</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>{ setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${page===item.id?"text-white":"text-slate-400 hover:text-white hover:bg-white/5"}`}
              style={page===item.id?{background:"linear-gradient(135deg,#1e3a7b,#2a4fa0)",color:"white"}:{}}>
              <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />{item.label}
              {item.id==="payments"&&alerts>0&&<span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/8 space-y-2">
          <button onClick={()=>setShowChangePass(true)} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-xs font-semibold hover:bg-white/5 hover:text-white transition-colors">
            <Icon name="lock" className="w-4 h-4" /> Cambiar contraseña
          </button>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background:`${roleColors[user.role]||"#d4a017"}30`, color:roleColors[user.role]||"#d4a017" }}>{user.nombre?.[0]||"U"}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{user.nombre}</p><RoleBadge role={user.role} /></div>
            <button onClick={()=>{ clearInterval(refreshRef.current); setUser(null); }} className="text-slate-500 hover:text-red-400 transition-colors"><Icon name="logout" className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
      {sidebarOpen&&<div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={()=>setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b lg:hidden" style={{ background:"#0d1426", borderColor:"rgba(30,58,123,0.3)" }}>
          <button onClick={()=>setSidebarOpen(true)} className="text-slate-400 hover:text-white"><Icon name="menu" /></button>
          <div className="flex items-center gap-2">
            <img src={LOGO_SRC} alt="Logo" className="w-7 h-7 rounded-lg object-contain bg-white p-0.5" />
            <p className="font-black text-white text-xs tracking-widest" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HS TAEKWONDO SYSTEM</p>
          </div>
          <button onClick={()=>setShowSearch(s=>!s)} className="text-slate-400 hover:text-white p-1">
            <Icon name="search" className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{renderPage()}</main>
      </div>
      {showChangePass&&<ChangePasswordModal currentUser={user} onClose={()=>setShowChangePass(false)} />}
      {showSearch&&<GlobalSearchModal students={students} pagos={pagos} examenes={examenes} ventas={ventas} setPage={setPage} onClose={()=>setShowSearch(false)} />}
    </div>
  );
}
