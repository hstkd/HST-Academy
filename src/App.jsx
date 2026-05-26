import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://khmqgetdhjidpboniuoj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobXFnZXRkaGppZHBib25pdW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTk0OTYsImV4cCI6MjA5NDk3NTQ5Nn0.jIZzqrQAnObmFHixbvRxBcYijw3qxCT0bxWaC99EL68";

const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

const db = {
  get: async (table, filters = "") => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc${filters}`, { headers: HEADERS });
      if (!r.ok) return [];
      return r.json();
    } catch { return []; }
  },
  insert: async (table, data) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: HEADERS, body: JSON.stringify(data) });
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
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Calcula fecha de vencimiento según membresía y fecha base
const calcVencimiento = (fechaBase, membresiaId) => {
  if (!fechaBase) return fmt(addDays(today, 30));
  const base = new Date(fechaBase + "T12:00:00");
  const v = new Date(base);
  if (membresiaId === "trimestral") v.setMonth(v.getMonth() + 3);
  else if (membresiaId === "semestral") v.setMonth(v.getMonth() + 6);
  else if (membresiaId === "anual") v.setFullYear(v.getFullYear() + 1);
  else v.setMonth(v.getMonth() + 1); // mensual: básica, estándar, completo
  return fmt(v);
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
  { id: "estandar",    nombre: "Estándar",    sesiones: 12,  color: "#f59e0b" },
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
  pagado:   { bg:"bg-emerald-500/20", text:"text-emerald-400", border:"border-emerald-500/30", label:"Al día" },
  parcial:  { bg:"bg-amber-500/20",   text:"text-amber-400",   border:"border-amber-500/30",   label:"Parcial" },
  vencido:  { bg:"bg-red-500/20",     text:"text-red-400",     border:"border-red-500/30",     label:"Vencido" },
  pendiente:{ bg:"bg-slate-500/20",   text:"text-slate-400",   border:"border-slate-500/30",   label:"Pendiente" },
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
  admin:    ["dashboard","students","payments","ventas","attendance","examenes","finance","events","users"],
  profesor: ["attendance","students","payments","ventas","examenes"],
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
  const cfg = { admin:{color:"#f59e0b",label:"Admin"}, profesor:{color:"#3b82f6",label:"Profesor"}, alumno:{color:"#22c55e",label:"Alumno/Padre"} };
  const c = cfg[role]||cfg.alumno;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${c.color}22`, color:c.color }}>{c.label}</span>;
};

const CategoriaBadge = ({ categoria }) => {
  const colors = { Infantil:"#22c55e", Cadete:"#3b82f6", Junior:"#f59e0b", Senior:"#ef4444" };
  const c = colors[categoria]||"#94a3b8";
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${c}22`, color:c }}>{categoria}</span>;
};

const MiniBarChart = ({ data, color="#f59e0b" }) => {
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
    const users = await db.get("users",`&email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`);
    if (users&&users.length>0) onLogin(users[0]);
    else { setErr("Correo o contraseña incorrectos"); setLoading(false); }
  };

  const handleForgot = async () => {
    if (!forgotEmail) { setErr("Ingresa tu correo"); return; }
    setLoading(true); setErr("");
    const users = await db.get("users",`&email=eq.${encodeURIComponent(forgotEmail)}`);
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
    <div className="min-h-screen flex items-center justify-center" style={{ background:"linear-gradient(135deg,#020617 0%,#0f172a 50%,#1e1b4b 100%)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background:"radial-gradient(circle,#f59e0b,transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background:"radial-gradient(circle,#3b82f6,transparent)" }} />
      </div>
      <div className="relative w-full max-w-md p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><span className="text-3xl">🥋</span></div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>HENRY SIGCHOS</h1>
          <p className="text-amber-400 font-semibold tracking-widest text-sm mt-1">TAEKWONDO ACADEMY</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {mode==="login" && <>
            <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
            {err&&<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
            <div className="space-y-4">
              <Field label="Correo"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></Field>
              <Field label="Contraseña"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></Field>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{loading?"VERIFICANDO...":"INGRESAR AL SISTEMA"}</button>
            <button onClick={()=>{setMode("forgot");setErr("");}} className="w-full mt-3 text-center text-sm text-slate-500 hover:text-amber-400 transition-colors">¿Olvidaste tu contraseña?</button>
          </>}
          {mode==="forgot" && <>
            <h2 className="text-xl font-bold text-white mb-2">Recuperar Contraseña</h2>
            <p className="text-slate-400 text-sm mb-6">Ingresa tu correo registrado.</p>
            {err&&<div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
            <Field label="Correo"><Input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="tu@correo.com" onKeyDown={e=>e.key==="Enter"&&handleForgot()} /></Field>
            <button onClick={handleForgot} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{loading?"BUSCANDO...":"CONTINUAR"}</button>
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
            <button onClick={handleChangePass} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{loading?"GUARDANDO...":"CAMBIAR CONTRASEÑA"}</button>
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
    const users = await db.get("users",`&id=eq.${currentUser.id}`);
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
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Cambiar"}</button>
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
  const ventasMes = (ventas||[]).filter(v=>v.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const eventosMes = (eventos||[]).reduce((a,e)=>{ try { const parts=JSON.parse(e.participantes||"[]"); return a+parts.filter(p=>p.pagado).reduce((s,p)=>s+parseFloat(p.valor||0),0); } catch { return a; } },0);
  const examenesTotal = (examenes||[]).filter(ex=>ex.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,ex)=>a+parseFloat(ex.monto||0),0);
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
          <MiniBarChart data={chartData} color="#f59e0b" />
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
  const [montoPagadoIns, setMontoPagadoIns] = useState("");
  // fechaVencIns se calcula dinámicamente desde fechaIns + membresia
  const fechaVencIns = calcVencimiento(fechaIns, membresia);

  const save = async () => {
    if (!nombres || !apellidos) return;
    if (registrarPago && !fechaIns) { alert("Debes ingresar la fecha de inscripción para registrar el pago."); return; }
    setSaving(true);
    const data = { nombres, apellidos, edad: edadInfo.total, fecha_nacimiento: fechaNac, representante, telefono, correo, direccion, sede, cinturon, membresia, estado, categoria, observaciones, fecha_inscripcion: fechaIns };
    if (student) {
      // Si cambió el usuario, actualizar en tabla users
      if (student.correo && correo !== student.correo) {
        try {
          const users = await db.get("users");
          const userOld = users?.find(u => u.email === student.correo && u.role === "alumno");
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
        const tempPassword = Math.random().toString(36).substring(2, 10);
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
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving ? "Guardando..." : student ? "Guardar Cambios" : "Crear Alumno"}</button>
      </div>
    </Modal>
  );
};

const StudentsPage = ({ students, reload, canEdit, asistencia, examenes, eventos }) => {
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
        <button onClick={()=>{ setEditStudent(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Alumno</button>
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
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
      {viewStudent && (
        <Modal title="Perfil del Alumno" onClose={()=>setViewStudent(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{viewStudent.nombres[0]}{viewStudent.apellidos[0]}</div>
              <div><h2 className="text-2xl font-black text-white">{viewStudent.nombres} {viewStudent.apellidos}</h2><div className="flex gap-2 mt-1 flex-wrap"><BeltBadge cinturon={viewStudent.cinturon} /><CategoriaBadge categoria={viewStudent.categoria||getCategoria(viewStudent.fecha_nacimiento)} /><MembresiaTag membresiaId={viewStudent.membresia} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Sede",viewStudent.sede],["Estado",viewStudent.estado],["Edad",`${viewStudent.edad} años`],["Nacimiento",viewStudent.fecha_nacimiento],["Representante",viewStudent.representante],["Teléfono",viewStudent.telefono],["Usuario",viewStudent.correo],["Dirección",viewStudent.direccion],["Inscripción",viewStudent.fecha_inscripcion],["GAL", examenes&&examenes.some(ex=>ex.alumno_id===viewStudent.id&&ex.tipo?.includes("GAL"))?"✓ Sí":"✗ No"]].map(([k,v])=>(
                <div key={k} className="bg-white/5 rounded-xl p-3"><p className="text-xs text-slate-500 mb-0.5">{k}</p><p className="text-sm font-semibold text-white">{v||"—"}</p></div>
              ))}
            </div>
            {viewStudent.observaciones&&<div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Observaciones</p><p className="text-sm text-slate-300">{viewStudent.observaciones}</p></div>}
            {/* Historial de asistencia */}
            {asistencia && (() => {
              const miAsist = asistencia.filter(a=>a.alumno_id===viewStudent.id).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,10);
              const presentes = miAsist.filter(a=>a.presente).length;
              return miAsist.length>0 ? (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Últimas asistencias ({presentes}/{miAsist.length} presentes)</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {miAsist.map(a=>(
                      <div key={a.id} className={`flex justify-between p-2 rounded-lg text-xs ${a.presente?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>
                        <span>{a.fecha}</span><span>{a.presente?"✓ Presente":"✗ Ausente"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            {/* Historial de ascensos */}
            {examenes && (() => {
              const misEx = examenes.filter(e=>e.alumno_id===viewStudent.id).sort((a,b)=>b.fecha?.localeCompare(a.fecha));
              return misEx.length>0 ? (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase">Historial de exámenes</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {misEx.map(ex=>(
                      <div key={ex.id} className="flex justify-between p-2 rounded-lg bg-amber-500/10 text-xs">
                        <span className="text-amber-400">{ex.tipo}</span>
                        <span className="text-slate-400">{ex.fecha} · ${parseFloat(ex.monto||0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </Modal>
      )}
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
    await db.update("pagos", pago.id, {
      monto_pagado: nuevoMontoPagado,
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
              placeholder="0.00"
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
          {nuevoMontoPagado >= parseFloat(pago.monto||0) && <p className="text-xs text-emerald-400 mt-1">✓ Pago completo</p>}
        </div>

        <Field label="Notas (opcional)">
          <Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: Abono de deuda anterior..." />
        </Field>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||montoIngreso<=0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Completar pago"}</button>
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
      fecha_vencimiento: fechaVenc,
      tipo: memb?.nombre || tipoPago,
    });
    // Guardar renovación en historial
    await db.insert("historial_pagos", {
      alumno_id: pago.alumno_id,
      alumno_nombre: pago.alumno_nombre,
      monto_pagado: pagado,
      fecha_pago: fechaPago,
      nueva_fecha_vencimiento: fechaVenc,
      tipo: memb?.nombre || tipoPago,
      observaciones: notas || "Renovación de membresía",
    });
    await reload();
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={`Renovar — ${pago.alumno_nombre}`} onClose={onClose} wide>
      <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        ⚠️ Pago vencido el {pago.fecha_vencimiento}. Registra la renovación para poner al día.
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
          <Field label="Fecha de Pago">
            <Input type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} />
          </Field>
          <Field label="Nueva fecha de vencimiento">
            <div className="flex items-center h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-emerald-400 text-sm font-bold">{fechaVenc}</span>
            </div>
          </Field>
        </div>
        <Field label="Notas"><Textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Renovación de membresía..." /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
        <button onClick={save} disabled={saving||!montoTotal} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Renovación"}</button>
      </div>
    </Modal>
  );
};

const PaymentsPage = ({ students, pagos, historialPagos, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [renovarPago, setRenovarPago] = useState(null);
  const [completarPago, setCompletarPago] = useState(null);
  // Estado determinado ÚNICAMENTE por fecha_vencimiento vs hoy
  const hoyPagos = fmt(new Date());
  const getEstadoReal = (p) => {
    // Sin fecha de vencimiento → pendiente
    if (!p.fecha_vencimiento) return "pendiente";
    // fecha_vencimiento <= hoy → VENCIDO siempre
    if (p.fecha_vencimiento <= hoyPagos) return "vencido";
    // No vencido:
    const pagado = parseFloat(p.monto_pagado||0);
    const total = parseFloat(p.monto||0);
    if (pagado === 0) return "pendiente";
    if (total > 0 && pagado >= total) return "pagado";
    return "parcial";
  };
  const pagosReal = pagos.map(p => ({ ...p, estado: getEstadoReal(p) }));
  const filtered = filter==="Todos" ? pagosReal : pagosReal.filter(p => p.estado===filter);
  const getDays = f => {
    const hoyMs = new Date(hoyPagos + "T00:00:00").getTime();
    const vencMs = new Date(f + "T00:00:00").getTime();
    return Math.ceil((vencMs - hoyMs) / 86400000);
  };
  // Sumar ingresos de historial_pagos del mes actual (todos los abonos)
  const totalMes = historialPagos.filter(h=>h.fecha_pago?.slice(0,7)===hoyPagos.slice(0,7)).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0);
  const totalDeuda = pagosReal.filter(p=>p.estado==="vencido"||p.estado==="parcial"||p.estado==="pendiente").reduce((a,p)=>a+Math.max(0,parseFloat(p.monto||0)-parseFloat(p.monto_pagado||0)),0);

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
        // Actualizar pago existente
        await db.update("pagos", pagoExistente.id, {
          monto: total,
          monto_pagado: pagado,
          fecha_vencimiento: fechaVenc,
          tipo: memb?.nombre || tipoPago,
        });
        // Guardar en historial
        await db.insert("historial_pagos", {
          alumno_id: alumnoId,
          alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
          monto_pagado: pagado,
          fecha_pago: fechaPago,
          nueva_fecha_vencimiento: fechaVenc,
          tipo: memb?.nombre || tipoPago,
          observaciones: notas,
        });
      } else {
        // Nuevo pago (primer registro)
        await db.insert("pagos", {
          alumno_id: alumnoId,
          alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
          monto: total,
          monto_pagado: pagado,
          fecha_pago: fechaPago,
          fecha_vencimiento: fechaVenc,
          tipo: memb?.nombre || tipoPago,
          sede: alumno?.sede || "Quito",
          notas,
        });
        // También en historial si pagó
        if (pagado > 0) {
          await db.insert("historial_pagos", {
            alumno_id: alumnoId,
            alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`,
            monto_pagado: pagado,
            fecha_pago: fechaPago,
            nueva_fecha_vencimiento: fechaVenc,
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
            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={alumnoId} onChange={e=>setAlumnoId(e.target.value)}>
              {active.map(s=><option key={s.id} value={s.id}>{s.nombres} {s.apellidos}</option>)}
            </select>
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
            <Field label="Vence automáticamente">
              <div className="flex items-center gap-2 h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl">
                <span className={`text-sm font-bold ${fechaVenc && fechaVenc < fmt(today) ? "text-red-400" : "text-emerald-400"}`}>
                  {fechaVenc || "Selecciona fecha de pago"}
                </span>
                {fechaVenc && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${fechaVenc < fmt(today) ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {fechaVenc < fmt(today) ? "Vencido" : `en ${Math.ceil((new Date(fechaVenc + "T12:00:00") - today) / 86400000)} días`}
                  </span>
                )}
              </div>
            </Field>
          </div>
          {montoTotal&&<div className={`p-3 rounded-xl text-sm font-bold border ${deuda>0?"bg-red-500/10 border-red-500/30 text-red-400":"bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>Deuda: ${deuda.toFixed(2)} {deuda===0&&"✓ Pagado completo"}</div>}
          <Field label="Notas"><Textarea value={notas} onChange={e=>setNotas(e.target.value)} /></Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Pago"}</button>
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
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Registrar Pago</button>
      </div>
      {isAdmin&&(
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Ingresos Mes" value={`$${totalMes.toFixed(0)}`} icon="finance" accent="emerald" />
          <StatCard title="Deuda Total" value={`$${totalDeuda.toFixed(0)}`} icon="payments" accent="red" />
          <StatCard title="Vencidos" value={pagos.filter(p=> p.fecha_vencimiento && p.fecha_vencimiento<=fmt(new Date())).length} icon="payments" accent="amber" />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {["Todos","pagado","parcial","vencido","pendiente"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter===f?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={filter===f?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>
            {f==="Todos"?"Todos":pagoEstadoConfig[f]?.label}
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{p.alumno_nombre?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                  <div><p className="font-bold text-white text-sm">{p.alumno_nombre}</p><p className="text-xs text-slate-500">{p.tipo} · {p.sede} · {p.fecha_pago}</p></div>
                </div>
                <div className="text-right"><p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/${parseFloat(p.monto).toFixed(2)}</span></p><StatusBadge estado={p.estado} /></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Vence: {p.fecha_vencimiento}</span>
                <span className={dias<0?"text-red-400 font-bold":dias<7?"text-amber-400 font-bold":"text-emerald-400"}>
                  {dias<0?`Vencido hace ${Math.abs(dias)} día(s)`:`${dias} día(s) restantes`}
                </span>
              </div>
              {p.estado!=="pagado"&&<div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${Math.min(100,(parseFloat(p.monto_pagado)/parseFloat(p.monto))*100)}%`, background:p.estado==="vencido"?"#ef4444":"#f59e0b" }} /></div>}
              <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                {p.estado === "vencido" && (
                  <button onClick={()=>setRenovarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30">
                    🔄 Renovar
                  </button>
                )}
                {p.estado === "parcial" && (
                  <button onClick={()=>setCompletarPago(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30">
                    ✓ Completar pago
                  </button>
                )}
                {(p.estado !== "vencido" && p.estado !== "parcial") && <div />}
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
    </div>
  );
};

const VentasPage = ({ ventas, reload, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const totalHoy = ventas.filter(v=>v.fecha===fmt(today)).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const totalMes = ventas.filter(v=>v.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,v)=>a+parseFloat(v.total||0),0);

  const VentaForm = ({ onClose }) => {
    const [carrito, setCarrito] = useState([]);
    const [catFilter, setCatFilter] = useState("todos");
    const [saving, setSaving] = useState(false);

    const addToCart = (prod) => {
      setCarrito(prev => {
        const ex = prev.find(i=>i.id===prod.id);
        if (ex) return prev.map(i=>i.id===prod.id?{...i,qty:i.qty+1}:i);
        return [...prev,{ ...prod, qty:1 }];
      });
    };

    const removeFromCart = (id) => setCarrito(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty-1)}:i).filter(i=>i.qty>0));
    const total = carrito.reduce((a,i)=>a+i.precio*i.qty,0);

    const save = async () => {
      if (carrito.length===0) return;
      setSaving(true);
      await db.insert("ventas",{ items:JSON.stringify(carrito), total, fecha:fmt(today), detalle:carrito.map(i=>`${i.qty}x ${i.nombre}`).join(", ") });
      await reload();
      setSaving(false);
      onClose();
    };

    const productos = catFilter==="todos"?PRODUCTOS:PRODUCTOS.filter(p=>p.cat===catFilter);

    return (
      <Modal title="Nueva Venta" onClose={onClose} wide>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[{id:"todos",label:"Todos"},{id:"bebidas",label:"🥤 Bebidas"},{id:"implementos",label:"🥋 Implementos"},{id:"uniformes",label:"👕 Uniformes"}].map(c=>(
              <button key={c.id} onClick={()=>setCatFilter(c.id)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${catFilter===c.id?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={catFilter===c.id?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {productos.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-amber-400/30 transition-all text-left">
                <div><p className="text-sm font-semibold text-white">{p.nombre}</p><p className="text-xs text-amber-400 font-bold">${p.precio.toFixed(2)}</p></div>
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
              <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
                <span className="font-bold text-white">TOTAL</span>
                <span className="text-2xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving||carrito.length===0} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Venta"}</button>
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
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nueva Venta</button>
      </div>
      {isAdmin&&(
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Ventas Hoy" value={`$${totalHoy.toFixed(2)}`} icon="ventas" accent="emerald" />
          <StatCard title="Ventas Mes" value={`$${totalMes.toFixed(2)}`} icon="ventas" accent="amber" />
        </div>
      )}
      <div className="space-y-3">
        {ventas.map(v=>(
          <div key={v.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15">
            <div className="flex items-center justify-between">
              <div><p className="font-bold text-white text-sm">{v.detalle}</p><p className="text-xs text-slate-500 mt-0.5">{v.fecha}</p></div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${parseFloat(v.total).toFixed(2)}</span>
                {isAdmin&&<button onClick={()=>onDelete(v.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
        ))}
        {ventas.length===0&&<div className="text-center py-12 text-slate-500">Sin ventas registradas aún</div>}
      </div>
      {showForm&&<VentaForm onClose={()=>setShowForm(false)} />}
    </div>
  );
};

const AttendancePage = ({ students, asistencia, reload }) => {
  const [fecha, setFecha] = useState(fmt(today));
  const [sede, setSede] = useState("Todas");
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expanded, setExpanded] = useState(null);
  const fs = students.filter(s=>s.estado==="activo"&&(sede==="Todas"||s.sede===sede));
  const getStatus = id=>{ const r=asistencia.find(a=>a.alumno_id===id&&a.fecha===fecha); return r?r.presente:null; };
  const getRecord = id=>asistencia.find(a=>a.alumno_id===id&&a.fecha===fecha);

  const toggle = async (student, presente) => {
    setSaving(true);
    const ex = getRecord(student.id);
    if (ex) await db.update("asistencia",ex.id,{ presente });
    else await db.insert("asistencia",{ alumno_id:student.id, alumno_nombre:`${student.nombres} ${student.apellidos}`, fecha, presente, sede:student.sede });
    await reload();
    setSaving(false);
  };

  const marcarTodos = async presente => {
    setSaving(true);
    for (const s of fs) {
      const ex = getRecord(s.id);
      if (ex) await db.update("asistencia",ex.id,{ presente });
      else await db.insert("asistencia",{ alumno_id:s.id, alumno_nombre:`${s.nombres} ${s.apellidos}`, fecha, presente, sede:s.sede });
    }
    await reload();
    setSaving(false);
  };

  const presentes = fs.filter(s=>getStatus(s.id)===true).length;
  const ausentes = fs.filter(s=>getStatus(s.id)===false).length;
  const pct = fs.length?Math.round((presentes/fs.length)*100):0;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>ASISTENCIA {saving&&<span className="text-sm text-amber-400 ml-2 font-normal">Guardando...</span>}</h1>
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ width:"auto" }} />
        <Select options={["Todas",...SEDES]} value={sede} onChange={e=>setSede(e.target.value)} />
        <button onClick={()=>marcarTodos(true)} disabled={saving} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50">✓ Todos Presentes</button>
        <button onClick={()=>marcarTodos(false)} disabled={saving} className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 disabled:opacity-50">✗ Todos Ausentes</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{presentes}</p><p className="text-xs text-slate-400 mt-1">Presentes</p></div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{ausentes}</p><p className="text-xs text-slate-400 mt-1">Ausentes</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{pct}%</p><p className="text-xs text-slate-400 mt-1">Asistencia</p></div>
      </div>
      {/* Búsqueda rápida */}
      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50" placeholder="Buscar alumno..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
      </div>
      <div className="space-y-2">
        {fs.filter(s=>`${s.nombres} ${s.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())).map(s=>{ const st=getStatus(s.id); return (
          <div key={s.id} className={`rounded-2xl border transition-all ${st===true?"bg-emerald-500/10 border-emerald-500/20":st===false?"bg-red-500/10 border-red-500/20":"bg-white/3 border-white/8"}`}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={()=>setExpanded(e=>e===s.id?null:s.id)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                <div><p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p><BeltBadge cinturon={s.cinturon} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>toggle(s,true)} disabled={saving} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${st===true?"bg-emerald-500 text-white":"bg-white/5 text-slate-500 hover:bg-emerald-500/30 hover:text-emerald-400"}`}><Icon name="check" className="w-5 h-5" /></button>
                <button onClick={()=>toggle(s,false)} disabled={saving} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${st===false?"bg-red-500 text-white":"bg-white/5 text-slate-500 hover:bg-red-500/30 hover:text-red-400"}`}><Icon name="x" className="w-5 h-5" /></button>
              </div>
            </div>
            {expanded===s.id && (
              <div className="px-4 pb-4 space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Últimas asistencias</p>
                {asistencia.filter(a=>a.alumno_id===s.id).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,7).map(a=>(
                  <div key={a.id} className={`flex justify-between p-2 rounded-lg text-xs ${a.presente?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`}>
                    <span>{a.fecha}</span><span>{a.presente?"✓ Presente":"✗ Ausente"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ); })}
      </div>
    </div>
  );
};

const ExamenesPage = ({ students, reload, examenes, reloadExamenes }) => {
  const [selectedId, setSelectedId] = useState("");
  const [newBelt, setNewBelt] = useState(CINTURONES[0]);
  const [saving, setSaving] = useState(false);
  const [galAlumnoId, setGalAlumnoId] = useState("");
  const [galQty, setGalQty] = useState(1);
  const [savingGal, setSavingGal] = useState(false);
  const [tab, setTab] = useState("ascenso");

  const selectedStudent = students.find(s => s.id === selectedId);
  const costoInfo = selectedStudent ? COSTOS_ASCENSO[selectedStudent.cinturon] : null;

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
    await db.update("students", selectedId, { cinturon: newBelt });
    // Registrar ingreso del examen
    await db.insert("examenes", {
      alumno_id: selectedId,
      alumno_nombre: `${al?.nombres} ${al?.apellidos}`,
      tipo: `Ascenso ${al?.cinturon} → ${newBelt}`,
      monto: costo,
      fecha: fmt(today),
    });
    await reload();
    await reloadExamenes();
    setSaving(false);
    setSelectedId("");
  };

  const registrarGal = async () => {
    if (!galAlumnoId) return;
    // Verificar si ya tiene GAL
    const yaGal = examenes.some(ex => ex.alumno_id === galAlumnoId && ex.tipo?.includes("GAL"));
    if (yaGal) {
      alert("Este alumno ya tiene un GAL registrado. Solo se puede emitir 1 GAL por alumno.");
      return;
    }
    setSavingGal(true);
    const al = students.find(s => s.id === galAlumnoId);
    await db.insert("examenes", {
      alumno_id: galAlumnoId,
      alumno_nombre: `${al?.nombres} ${al?.apellidos}`,
      tipo: "GAL",
      monto: 13,
      fecha: fmt(today),
    });
    await reloadExamenes();
    setSavingGal(false);
    setGalAlumnoId("");
    setGalQty(1);
  };

  const totalExamenes = examenes.reduce((a,e)=>a+parseFloat(e.monto||0),0);
  const totalMes = examenes.filter(e=>e.fecha?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,e)=>a+parseFloat(e.monto||0),0);

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
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t.id?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={tab===t.id?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>{t.label}</button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Alumno">
              <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={selectedId} onChange={e=>handleSelectStudent(e.target.value)}>
                <option value="">Seleccionar...</option>
                {students.filter(s=>s.estado==="activo").map(s=><option key={s.id} value={s.id}>{s.nombres} {s.apellidos} — {s.cinturon}</option>)}
              </select>
            </Field>
            <Field label="Nuevo Cinturón">
              <Select options={CINTURONES} value={newBelt} onChange={e=>setNewBelt(e.target.value)} />
              {costoInfo && costoInfo.costo > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-semibold">
                  💰 Costo del examen: ${costoInfo.costo}.00
                </div>
              )}
            </Field>
            <Field label="Acción">
              <button onClick={upgrade} disabled={saving||!selectedId} className="w-full py-2.5 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Ascenso"}</button>
            </Field>
          </div>
        </div>
        <div className="space-y-2">
          {students.filter(s=>s.estado==="activo").map(s=>(
            <div key={s.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Alumno">
              <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={galAlumnoId} onChange={e=>setGalAlumnoId(e.target.value)}>
                <option value="">Seleccionar alumno...</option>
                {students.filter(s=>s.estado==="activo").map(s=>{
                  const tieneGal = examenes.some(ex=>ex.alumno_id===s.id&&ex.tipo?.includes("GAL"));
                  return <option key={s.id} value={s.id} disabled={tieneGal}>{s.nombres} {s.apellidos}{tieneGal?" — ✓ Ya tiene GAL":""}</option>;
                })}
              </select>
            </Field>
            <Field label="Valor">
              <div className="flex items-center h-[42px] px-4 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-amber-400 font-bold">$13.00 — 1 GAL por alumno</span>
              </div>
            </Field>
            <Field label="Acción">
              <button onClick={registrarGal} disabled={savingGal||!galAlumnoId} className="w-full py-2.5 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{savingGal?"Registrando...":"Registrar GAL"}</button>
            </Field>
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
            {examenes.map(ex=>(
              <div key={ex.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">{ex.alumno_nombre}</p>
                  <p className="text-xs text-slate-500">{ex.tipo} · {ex.fecha}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>${parseFloat(ex.monto||0).toFixed(2)}</span>
                  <button onClick={async()=>{
                    if(!confirm("¿Eliminar este registro? Si es un ascenso, se revertirá el cinturón.")) return;
                    // Si es ascenso, revertir cinturón
                    if (ex.tipo?.includes("Ascenso") && ex.alumno_id) {
                      const match = ex.tipo.match(/Ascenso (.+) → (.+)/);
                      if (match) {
                        await db.update("students", ex.alumno_id, { cinturon: match[1] });
                      }
                    }
                    await db.delete("examenes", ex.id);
                    await reloadExamenes();
                    await reload();
                  }} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const FinancePage = ({ pagos, historialPagos, ventas, eventos, examenes }) => {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  // Por mes desde historial_pagos
  const byMonth = meses.map((label,i)=>({ label, value:(historialPagos||[]).filter(h=>parseInt(h.fecha_pago?.slice(5,7))===i+1).reduce((a,h)=>a+parseFloat(h.monto_pagado||0),0) }));
  const ventasByMonth = meses.map((label,i)=>({ label, value:(ventas||[]).filter(v=>parseInt(v.fecha?.slice(5,7))===i+1).reduce((a,v)=>a+parseFloat(v.total||0),0) }));
  const totalAnual = byMonth.reduce((a,m)=>a+m.value,0);
  const totalVentas = ventasByMonth.reduce((a,m)=>a+m.value,0);
  // Ingresos de eventos (participantes pagados)
  const totalEventos = (eventos||[]).reduce((a,e)=>{ try { const parts=JSON.parse(e.participantes||"[]"); return a+parts.filter(p=>p.pagado).reduce((s,p)=>s+parseFloat(p.valor||0),0); } catch { return a; } },0);
  // Ingresos de exámenes y GALs
  const totalExamenes = (examenes||[]).reduce((a,ex)=>a+parseFloat(ex.monto||0),0);
  const bySede = SEDES.map(sede=>({ sede, total:pagos.filter(p=>p.sede===sede).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0) }));
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>FINANZAS</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Mensualidades" value={`$${totalAnual.toFixed(0)}`} icon="finance" accent="amber" />
        <StatCard title="Ventas" value={`$${totalVentas.toFixed(0)}`} icon="ventas" accent="purple" />
        <StatCard title="Eventos" value={`$${totalEventos.toFixed(0)}`} icon="calendar" accent="blue" />
        <StatCard title="Total Año" value={`$${(totalAnual+totalVentas+totalEventos+totalExamenes).toFixed(0)}`} icon="finance" accent="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>MENSUALIDADES POR MES</h3>
          <MiniBarChart data={byMonth} color="#f59e0b" />
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>VENTAS POR MES</h3>
          <MiniBarChart data={ventasByMonth} color="#a855f7" />
        </div>
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>POR SEDE</h3>
        {bySede.map(({sede,total})=>(
          <div key={sede} className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
            <span className="text-sm text-slate-300">📍 {sede}</span>
            <span className="font-bold text-amber-400">${total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HISTORIAL DE PAGOS</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10">{["Alumno","Membresía","Monto","Pagado","Fecha","Estado"].map(h=><th key={h} className="text-left py-3 px-2 text-xs text-slate-500 font-semibold uppercase">{h}</th>)}</tr></thead>
            <tbody>{pagos.map(p=>(
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                <td className="py-3 px-2 text-white font-medium">{p.alumno_nombre}</td>
                <td className="py-3 px-2 text-slate-400 text-xs">{p.tipo}</td>
                <td className="py-3 px-2 text-slate-300">${parseFloat(p.monto).toFixed(2)}</td>
                <td className="py-3 px-2 text-emerald-400 font-semibold">${parseFloat(p.monto_pagado).toFixed(2)}</td>
                <td className="py-3 px-2 text-slate-400">{p.fecha_pago}</td>
                <td className="py-3 px-2"><StatusBadge estado={p.estado} /></td>
              </tr>
            ))}</tbody>
          </table>
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
              <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={alumnoId} onChange={e => setAlumnoId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {students.filter(s => s.estado === "activo" && !participantes.find(p => p.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.nombres} {s.apellidos}</option>)}
              </select>
            </Field>
            <Field label="Valor ($)"><Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" /></Field>
          </div>
          <button onClick={addParticipante} disabled={savingP || !alumnoId} className="mt-3 px-4 py-2 rounded-xl text-[#020617] text-xs font-bold disabled:opacity-50" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{savingP ? "Añadiendo..." : "Añadir al evento"}</button>
        </div>
        <div className="space-y-2">
          {participantes.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.pagado ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/3 border-white/8"}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{p.nombre.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
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
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Evento</button>
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
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Crear Evento"}</button>
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
              {[{id:"admin",label:"Admin",desc:"Todo el sistema",color:"#f59e0b"},{id:"profesor",label:"Profesor",desc:"Asistencia + Pagos",color:"#3b82f6"},{id:"alumno",label:"Alumno/Padre",desc:"Solo sus datos",color:"#22c55e"}].map(r=>(
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
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":user?"Guardar":"Crear Usuario"}</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>USUARIOS</h1><p className="text-slate-400 text-sm">{allUsers.length} usuarios</p></div>
        <button onClick={()=>{ setEditUser(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Usuario</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{role:"admin",color:"#f59e0b",label:"Admin",perms:["Todo el sistema"]},{role:"profesor",color:"#3b82f6",label:"Profesor",perms:["Asistencia","Alumnos","Registrar pagos","Ventas"]},{role:"alumno",color:"#22c55e",label:"Alumno/Padre",perms:["Ver su asistencia","Ver sus pagos"]}].map(r=>(
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black" style={{ background:u.id===currentUser.id?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(255,255,255,0.08)", color:u.id===currentUser.id?"#020617":"#fff" }}>{u.nombre?.[0]||"U"}</div>
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
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617] mx-auto mb-3" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{alumno.nombres[0]}{alumno.apellidos[0]}</div>
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

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const loadAll = useCallback(async () => {
    const [s,p,a,e,v,ex,h] = await Promise.all([
      db.get("students"), db.get("pagos"), db.get("asistencia"), db.get("eventos"), db.get("ventas"), db.get("examenes"), db.get("historial_pagos"),
    ]);
    setStudents(Array.isArray(s)?s:[]);
    // Estado se calcula en tiempo real, no se guarda en BD
    setPagos(Array.isArray(p) ? p : []);
    setHistorialPagos(Array.isArray(h) ? h : []);
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
    const u = await db.get("users");
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
    setUser(u);
    setPage((PERMISOS[u.role]||[])[0]);
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
  const roleColors = { admin:"#f59e0b", profesor:"#3b82f6", alumno:"#22c55e" };

  const renderPage = () => {
    if (loading) return <Spinner />;
    switch(page) {
      case "dashboard":     return <DashboardPage students={students} pagos={pagos} historialPagos={historialPagos} asistencia={asistencia} ventas={ventas} eventos={eventos} examenes={examenes} />;
      case "students":      return <StudentsPage students={students} reload={loadAll} canEdit={isAdmin} asistencia={asistencia} examenes={examenes} eventos={eventos} />;
      case "payments":      return <PaymentsPage students={students} pagos={pagos} historialPagos={historialPagos} reload={loadAll} isAdmin={isAdmin} />;
      case "ventas":        return <VentasPage ventas={ventas} reload={loadAll} isAdmin={isAdmin} />;
      case "attendance":    return <AttendancePage students={students} asistencia={asistencia} reload={loadAll} />;
      case "examenes":      return <ExamenesPage students={students} reload={loadAll} examenes={examenes} reloadExamenes={reloadExamenes} />;
      case "finance":       return <FinancePage pagos={pagos} historialPagos={historialPagos} ventas={ventas} eventos={eventos} examenes={examenes} />;
      case "events":        return <EventsPage eventos={eventos} students={students} reload={loadAll} />;
      case "users":         return <UsersPage currentUser={user} setCurrentUser={setUser} allUsers={allUsers} reloadUsers={reloadUsers} />;
      case "mi_asistencia": return <MiAsistenciaPage currentUser={user} students={students} asistencia={asistencia} />;
      case "mis_pagos":     return <MisPagosPage currentUser={user} students={students} pagos={pagos} />;
      case "mi_historial":  return <MiHistorialPage currentUser={user} students={students} examenes={examenes} eventos={eventos} />;
      default:              return <Spinner />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background:"#020617", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-white/8 transition-transform duration-300 ${sidebarOpen?"translate-x-0":"-translate-x-full lg:translate-x-0"}`} style={{ background:"#080f1f" }}>
        <div className="p-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>🥋</div>
            <div><p className="font-black text-white text-sm" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>HENRY SIGCHOS</p><p className="text-amber-400 text-[10px] font-semibold tracking-widest">TAEKWONDO</p></div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>{ setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${page===item.id?"text-[#020617]":"text-slate-400 hover:text-white hover:bg-white/5"}`}
              style={page===item.id?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background:`${roleColors[user.role]||"#f59e0b"}30`, color:roleColors[user.role]||"#f59e0b" }}>{user.nombre?.[0]||"U"}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{user.nombre}</p><RoleBadge role={user.role} /></div>
            <button onClick={()=>{ clearInterval(refreshRef.current); setUser(null); }} className="text-slate-500 hover:text-red-400 transition-colors"><Icon name="logout" className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
      {sidebarOpen&&<div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={()=>setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 lg:hidden" style={{ background:"#080f1f" }}>
          <button onClick={()=>setSidebarOpen(true)} className="text-slate-400 hover:text-white"><Icon name="menu" /></button>
          <p className="font-black text-white text-sm" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>HST ACADEMY</p>
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{renderPage()}</main>
      </div>
      {showChangePass&&<ChangePasswordModal currentUser={user} onClose={()=>setShowChangePass(false)} />}
    </div>
  );
}
