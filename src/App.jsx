import { useState, useEffect, useCallback, useMemo } from "react";

// ─── SUPABASE CLIENT (replace with your credentials) ─────────────────────────
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_ANON_KEY";

// Minimal Supabase REST client (no SDK needed in artifact)
const supabase = {
  from: (table) => ({
    select: async (cols = "*") => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      return r.json().then((data) => ({ data, error: null })).catch((e) => ({ data: null, error: e }));
    },
    insert: async (rows) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(rows),
      });
      return r.json().then((data) => ({ data, error: null })).catch((e) => ({ data: null, error: e }));
    },
    update: async (row, matchCol, matchVal) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${matchVal}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      return r.json().then((data) => ({ data, error: null })).catch((e) => ({ data: null, error: e }));
    },
    delete: async (matchCol, matchVal) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${matchVal}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      return { error: r.ok ? null : new Error("Delete failed") };
    },
  }),
};

// ─── SEED DATA (persists in localStorage) ────────────────────────────────────
const SEED_STUDENTS = [
  { id: "1", nombres: "Carlos", apellidos: "Mendoza", edad: 12, fecha_nacimiento: "2012-03-15", representante: "Ana Mendoza", telefono: "0991234567", correo: "carlos@mail.com", direccion: "Quito Norte", sede: "Quito", cinturon: "Amarillo", categoria: "Infantil", estado: "activo", fecha_inscripcion: "2023-01-10", observaciones: "Buen avance técnico" },
  { id: "2", nombres: "Sofía", apellidos: "Torres", edad: 15, fecha_nacimiento: "2009-07-22", representante: "Luis Torres", telefono: "0987654321", correo: "sofia@mail.com", direccion: "Cumbayá", sede: "Cumbayá", cinturon: "Verde", categoria: "Juvenil", estado: "activo", fecha_inscripcion: "2022-06-05", observaciones: "" },
  { id: "3", nombres: "Mateo", apellidos: "García", edad: 9, fecha_nacimiento: "2015-11-01", representante: "Rosa García", telefono: "0976543210", correo: "mateo@mail.com", direccion: "Quito Sur", sede: "Quito", cinturon: "Blanco", categoria: "Infantil", estado: "activo", fecha_inscripcion: "2024-01-20", observaciones: "Nuevo alumno" },
  { id: "4", nombres: "Valentina", apellidos: "López", edad: 18, fecha_nacimiento: "2006-05-30", representante: "Jorge López", telefono: "0965432109", correo: "vale@mail.com", direccion: "Cumbayá", sede: "Cumbayá", cinturon: "Azul", categoria: "Adulto", estado: "activo", fecha_inscripcion: "2021-03-15", observaciones: "Aspirante a negro" },
  { id: "5", nombres: "Diego", apellidos: "Ramírez", edad: 14, fecha_nacimiento: "2010-09-12", representante: "Carmen Ramírez", telefono: "0954321098", correo: "diego@mail.com", direccion: "Quito Centro", sede: "Quito", cinturon: "Rojo", categoria: "Juvenil", estado: "inactivo", fecha_inscripcion: "2022-08-01", observaciones: "En pausa temporal" },
];

const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const SEED_PAGOS = [
  { id: "p1", alumno_id: "1", alumno_nombre: "Carlos Mendoza", monto: 45, monto_pagado: 45, fecha_pago: fmt(today), fecha_vencimiento: fmt(addDays(today, 25)), tipo: "Mensualidad", estado: "pagado", sede: "Quito", notas: "" },
  { id: "p2", alumno_id: "2", alumno_nombre: "Sofía Torres", monto: 45, monto_pagado: 20, fecha_pago: fmt(addDays(today, -5)), fecha_vencimiento: fmt(addDays(today, 5)), tipo: "Mensualidad", estado: "parcial", sede: "Cumbayá", notas: "Pago parcial" },
  { id: "p3", alumno_id: "3", alumno_nombre: "Mateo García", monto: 45, monto_pagado: 0, fecha_pago: fmt(addDays(today, -10)), fecha_vencimiento: fmt(addDays(today, -2)), tipo: "Mensualidad", estado: "vencido", sede: "Quito", notas: "" },
  { id: "p4", alumno_id: "4", alumno_nombre: "Valentina López", monto: 45, monto_pagado: 45, fecha_pago: fmt(today), fecha_vencimiento: fmt(addDays(today, 30)), tipo: "Mensualidad", estado: "pagado", sede: "Cumbayá", notas: "" },
];

const SEED_ASISTENCIA = [
  { id: "a1", alumno_id: "1", alumno_nombre: "Carlos Mendoza", fecha: fmt(today), presente: true, sede: "Quito" },
  { id: "a2", alumno_id: "2", alumno_nombre: "Sofía Torres", fecha: fmt(today), presente: true, sede: "Cumbayá" },
  { id: "a3", alumno_id: "3", alumno_nombre: "Mateo García", fecha: fmt(today), presente: false, sede: "Quito" },
];

const SEED_EVENTOS = [
  { id: "e1", titulo: "Examen de Cinturón", fecha: fmt(addDays(today, 10)), tipo: "examen", sede: "Quito", descripcion: "Examen para cinturones amarillo-verde" },
  { id: "e2", titulo: "Torneo Regional", fecha: fmt(addDays(today, 20)), tipo: "torneo", sede: "Ambas", descripcion: "Torneo clasificatorio" },
  { id: "e3", titulo: "Campamento de Verano", fecha: fmt(addDays(today, 45)), tipo: "campamento", sede: "Ambas", descripcion: "Campamento intensivo 3 días" },
];

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const ls = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const initStore = () => {
  if (!ls.get("hst_init")) {
    ls.set("hst_students", SEED_STUDENTS);
    ls.set("hst_pagos", SEED_PAGOS);
    ls.set("hst_asistencia", SEED_ASISTENCIA);
    ls.set("hst_eventos", SEED_EVENTOS);
    ls.set("hst_init", true);
  }
};

// ─── COLORS & CONSTANTS ───────────────────────────────────────────────────────
const CINTURONES = ["Blanco", "Amarillo", "Naranja", "Verde", "Azul", "Rojo", "Negro"];
const CATEGORIAS = ["Infantil", "Juvenil", "Adulto", "Máster"];
const SEDES = ["Quito", "Cumbayá"];
const ROLES = ["admin", "profesor", "recepcion"];

const cinturonColor = {
  Blanco: "#ffffff", Amarillo: "#fbbf24", Naranja: "#f97316",
  Verde: "#22c55e", Azul: "#3b82f6", Rojo: "#ef4444", Negro: "#1f2937",
};

const pagoEstadoConfig = {
  pagado: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "Al día" },
  parcial: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", label: "Parcial" },
  vencido: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", label: "Vencido" },
  pendiente: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30", label: "Pendiente" },
};

// ─── ICONS (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    students: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    payments: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    attendance: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    belt: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    finance: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    reception: <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    notification: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
    arrow_up: <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />,
    arrow_down: <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />,
    eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>,
    download: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
    location: <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
};

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
    <div className={`relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>{title}</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><Icon name="x" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ─── FORM FIELD ───────────────────────────────────────────────────────────────
const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-white/8 transition-all" {...props} />
);

const Select = ({ options, ...props }) => (
  <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50 transition-all" {...props}>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const Textarea = ({ ...props }) => (
  <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all resize-none" rows={3} {...props} />
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, icon, accent = "amber", trend }) => {
  const accents = { amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20", emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", red: "from-red-500/20 to-red-600/5 border-red-500/20", blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20" };
  const iconAccents = { amber: "text-amber-400", emerald: "text-emerald-400", red: "text-red-400", blue: "text-blue-400" };
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${accents[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{value}</p>
          {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              <Icon name={trend >= 0 ? "arrow_up" : "arrow_down"} className="w-3 h-3" />
              {Math.abs(trend)}% vs mes anterior
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/5 ${iconAccents[accent]}`}><Icon name={icon} className="w-6 h-6" /></div>
      </div>
    </div>
  );
};

// ─── BELT BADGE ───────────────────────────────────────────────────────────────
const BeltBadge = ({ cinturon }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${cinturonColor[cinturon]}22`, color: cinturon === "Blanco" ? "#e2e8f0" : cinturonColor[cinturon], border: `1px solid ${cinturonColor[cinturon]}44` }}>
    <span className="w-2 h-2 rounded-full" style={{ background: cinturonColor[cinturon] }} />
    {cinturon}
  </span>
);

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ estado }) => {
  const cfg = pagoEstadoConfig[estado] || pagoEstadoConfig.pendiente;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
};

// ─── MINI BAR CHART ───────────────────────────────────────────────────────────
const MiniBarChart = ({ data, color = "#f59e0b" }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full rounded-t-sm transition-all duration-700" style={{ height: `${(d.value / max) * 56}px`, background: color, opacity: 0.7 + 0.3 * (i / data.length) }} />
          <span className="text-[9px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@hst.com");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("admin");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const USERS = { "admin@hst.com": { pass: "admin123", role: "admin", name: "Henry Sigchos" }, "prof@hst.com": { pass: "prof123", role: "profesor", name: "Profesor Demo" }, "rec@hst.com": { pass: "rec123", role: "recepcion", name: "Recepción" } };

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const u = USERS[email];
      if (u && u.pass === password) { onLogin({ email, role: u.role, name: u.name }); }
      else { setErr("Credenciales incorrectas"); setLoading(false); }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
      </div>
      <div className="relative w-full max-w-md p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <span className="text-3xl">🥋</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>HENRY SIGCHOS</h1>
          <p className="text-amber-400 font-semibold tracking-widest text-sm mt-1">TAEKWONDO ACADEMY</p>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
          {err && <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
          <div className="space-y-4">
            <Field label="Correo"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@academia.com" /></Field>
            <Field label="Contraseña"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
            <Field label="Rol">
              <Select options={ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>
          </div>
          <button onClick={handleLogin} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm tracking-wider text-[#020617] transition-all duration-200 active:scale-95" style={{ background: loading ? "#6b7280" : "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            {loading ? "VERIFICANDO..." : "INGRESAR AL SISTEMA"}
          </button>
          <p className="text-center text-xs text-slate-500 mt-4">Demo: admin@hst.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

// ─── STUDENT FORM ─────────────────────────────────────────────────────────────
const StudentForm = ({ student, onSave, onClose }) => {
  const empty = { nombres: "", apellidos: "", edad: "", fecha_nacimiento: "", representante: "", telefono: "", correo: "", direccion: "", sede: "Quito", cinturon: "Blanco", categoria: "Infantil", estado: "activo", observaciones: "", fecha_inscripcion: fmt(today) };
  const [form, setForm] = useState(student || empty);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.nombres || !form.apellidos) return;
    const data = student ? { ...form } : { ...form, id: Date.now().toString() };
    const students = ls.get("hst_students", []);
    if (student) { ls.set("hst_students", students.map((s) => s.id === student.id ? data : s)); }
    else { ls.set("hst_students", [...students, data]); }
    onSave(data);
  };

  return (
    <Modal title={student ? "Editar Alumno" : "Nuevo Alumno"} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombres"><Input value={form.nombres} onChange={set("nombres")} placeholder="Nombres" /></Field>
        <Field label="Apellidos"><Input value={form.apellidos} onChange={set("apellidos")} placeholder="Apellidos" /></Field>
        <Field label="Fecha Nacimiento"><Input type="date" value={form.fecha_nacimiento} onChange={set("fecha_nacimiento")} /></Field>
        <Field label="Edad"><Input type="number" value={form.edad} onChange={set("edad")} placeholder="Edad" /></Field>
        <Field label="Representante"><Input value={form.representante} onChange={set("representante")} placeholder="Nombre del representante" /></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={set("telefono")} placeholder="0991234567" /></Field>
        <Field label="Correo" className="col-span-2"><Input value={form.correo} onChange={set("correo")} placeholder="correo@mail.com" /></Field>
        <Field label="Dirección" className="col-span-2"><Input value={form.direccion} onChange={set("direccion")} placeholder="Dirección" /></Field>
        <Field label="Sede"><Select options={SEDES} value={form.sede} onChange={set("sede")} /></Field>
        <Field label="Estado"><Select options={["activo", "inactivo"]} value={form.estado} onChange={set("estado")} /></Field>
        <Field label="Cinturón"><Select options={CINTURONES} value={form.cinturon} onChange={set("cinturon")} /></Field>
        <Field label="Categoría"><Select options={CATEGORIAS} value={form.categoria} onChange={set("categoria")} /></Field>
        <Field label="Fecha Inscripción"><Input type="date" value={form.fecha_inscripcion} onChange={set("fecha_inscripcion")} /></Field>
        <Field label="Observaciones" className="col-span-2"><Textarea value={form.observaciones} onChange={set("observaciones")} placeholder="Notas adicionales..." /></Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors">Cancelar</button>
        <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          {student ? "Guardar Cambios" : "Crear Alumno"}
        </button>
      </div>
    </Modal>
  );
};

// ─── PAYMENT FORM ─────────────────────────────────────────────────────────────
const PagoForm = ({ students, onSave, onClose }) => {
  const [form, setForm] = useState({ alumno_id: students[0]?.id || "", monto: 45, monto_pagado: 45, tipo: "Mensualidad", fecha_pago: fmt(today), fecha_vencimiento: fmt(addDays(today, 30)), notas: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const alumno = students.find((s) => s.id === form.alumno_id);

  const handleSubmit = () => {
    const pagado = parseFloat(form.monto_pagado);
    const total = parseFloat(form.monto);
    const estado = pagado >= total ? "pagado" : pagado > 0 ? "parcial" : "pendiente";
    const data = { ...form, id: Date.now().toString(), alumno_nombre: `${alumno?.nombres} ${alumno?.apellidos}`, estado, sede: alumno?.sede || "Quito", monto: total, monto_pagado: pagado };
    const pagos = ls.get("hst_pagos", []);
    ls.set("hst_pagos", [...pagos, data]);
    onSave(data);
  };

  return (
    <Modal title="Registrar Pago" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Alumno">
          <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={form.alumno_id} onChange={set("alumno_id")}>
            {students.filter(s => s.estado === "activo").map((s) => <option key={s.id} value={s.id}>{s.nombres} {s.apellidos}</option>)}
          </select>
        </Field>
        <Field label="Tipo de Pago"><Select options={["Mensualidad", "Inscripción", "Examen", "Uniforme", "Otro"]} value={form.tipo} onChange={set("tipo")} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto Total ($)"><Input type="number" value={form.monto} onChange={set("monto")} /></Field>
          <Field label="Monto Pagado ($)"><Input type="number" value={form.monto_pagado} onChange={set("monto_pagado")} /></Field>
          <Field label="Fecha Pago"><Input type="date" value={form.fecha_pago} onChange={set("fecha_pago")} /></Field>
          <Field label="Fecha Vencimiento"><Input type="date" value={form.fecha_vencimiento} onChange={set("fecha_vencimiento")} /></Field>
        </div>
        <Field label="Notas"><Textarea value={form.notas} onChange={set("notas")} placeholder="Observaciones del pago..." /></Field>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
          <span className="text-slate-400">Deuda restante: </span>
          <span className={`font-bold ${parseFloat(form.monto_pagado) >= parseFloat(form.monto) ? "text-emerald-400" : "text-amber-400"}`}>
            ${Math.max(0, parseFloat(form.monto || 0) - parseFloat(form.monto_pagado || 0)).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5">Cancelar</button>
        <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>Registrar Pago</button>
      </div>
    </Modal>
  );
};

// ─── PAGES ────────────────────────────────────────────────────────────────────

// DASHBOARD
const DashboardPage = ({ students, pagos, asistencia }) => {
  const activos = students.filter((s) => s.estado === "activo").length;
  const vencidos = pagos.filter((p) => p.estado === "vencido").length;
  const ingresosMes = pagos.filter((p) => p.fecha_pago?.slice(0, 7) === fmt(today).slice(0, 7)).reduce((a, p) => a + parseFloat(p.monto_pagado || 0), 0);
  const hoyPresentes = asistencia.filter((a) => a.fecha === fmt(today) && a.presente).length;
  const nuevos = students.filter((s) => s.fecha_inscripcion?.slice(0, 7) === fmt(today).slice(0, 7)).length;

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const chartData = meses.slice(0, today.getMonth() + 1).map((label, i) => ({
    label, value: pagos.filter((p) => parseInt(p.fecha_pago?.slice(5, 7)) === i + 1).reduce((a, p) => a + parseFloat(p.monto_pagado || 0), 0),
  }));

  const alertas = [
    ...pagos.filter((p) => p.estado === "vencido").map((p) => ({ tipo: "error", msg: `⚠️ Pago vencido: ${p.alumno_nombre}` })),
    ...students.filter((s) => { const b = new Date(s.fecha_nacimiento); return b.getDate() === today.getDate() && b.getMonth() === today.getMonth(); }).map((s) => ({ tipo: "info", msg: `🎂 Cumpleaños: ${s.nombres} ${s.apellidos}` })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>DASHBOARD</h1>
        <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString("es-EC", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Total Alumnos" value={students.length} sub={`${activos} activos`} icon="students" accent="blue" />
        <StatCard title="Asistencia Hoy" value={hoyPresentes} sub="presentes" icon="attendance" accent="emerald" />
        <StatCard title="Pagos Vencidos" value={vencidos} sub="requieren atención" icon="payments" accent="red" />
        <StatCard title="Ingresos Mes" value={`$${ingresosMes.toFixed(0)}`} sub="este mes" icon="finance" accent="amber" trend={12} />
        <StatCard title="Nuevos Alumnos" value={nuevos} sub="este mes" icon="students" accent="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>INGRESOS {today.getFullYear()}</h3>
          <MiniBarChart data={chartData} color="#f59e0b" />
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>DISTRIBUCIÓN CINTURONES</h3>
          <div className="space-y-2">
            {CINTURONES.map((c) => {
              const count = students.filter((s) => s.cinturon === c).length;
              const pct = students.length ? (count / students.length) * 100 : 0;
              return (
                <div key={c} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16">{c}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cinturonColor[c] === "#ffffff" ? "#e2e8f0" : cinturonColor[c] }} />
                  </div>
                  <span className="text-xs font-bold text-slate-300 w-6">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {alertas.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-400 mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>⚡ ALERTAS IMPORTANTES</h3>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${a.tipo === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>{a.msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// STUDENTS PAGE
const StudentsPage = ({ students, setStudents }) => {
  const [search, setSearch] = useState("");
  const [filterSede, setFilterSede] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const match = `${s.nombres} ${s.apellidos} ${s.correo} ${s.telefono}`.toLowerCase().includes(q);
    const sede = filterSede === "Todas" || s.sede === filterSede;
    const estado = filterEstado === "Todos" || s.estado === filterEstado;
    return match && sede && estado;
  });

  const onSave = (data) => {
    const updated = ls.get("hst_students", []);
    setStudents(updated);
    setShowForm(false);
    setEditStudent(null);
  };

  const onDelete = (id) => {
    if (!confirm("¿Eliminar alumno?")) return;
    const updated = students.filter((s) => s.id !== id);
    ls.set("hst_students", updated);
    setStudents(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>ALUMNOS</h1>
          <p className="text-slate-400 text-sm">{filtered.length} de {students.length} alumnos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <Icon name="plus" className="w-4 h-4" /> Nuevo Alumno
        </button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50" placeholder="Buscar alumno..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select options={["Todas", ...SEDES]} value={filterSede} onChange={(e) => setFilterSede(e.target.value)} />
        <Select options={["Todos", "activo", "inactivo"]} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="group bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/30 hover:bg-white/5 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-[#020617]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  {s.nombres[0]}{s.apellidos[0]}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{s.nombres} {s.apellidos}</p>
                  <p className="text-xs text-slate-500">{s.edad} años · {s.sede}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.estado === "activo" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{s.estado}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <BeltBadge cinturon={s.cinturon} />
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">{s.categoria}</span>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p>📱 {s.telefono}</p>
              <p>👤 {s.representante}</p>
            </div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setViewStudent(s)} className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1"><Icon name="eye" className="w-3 h-3" /> Ver</button>
              <button onClick={() => { setEditStudent(s); setShowForm(true); }} className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-1"><Icon name="edit" className="w-3 h-3" /> Editar</button>
              <button onClick={() => onDelete(s.id)} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      {(showForm || editStudent) && <StudentForm student={editStudent} onSave={onSave} onClose={() => { setShowForm(false); setEditStudent(null); }} />}
      {viewStudent && (
        <Modal title="Perfil del Alumno" onClose={() => setViewStudent(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{viewStudent.nombres[0]}{viewStudent.apellidos[0]}</div>
              <div>
                <h2 className="text-2xl font-black text-white">{viewStudent.nombres} {viewStudent.apellidos}</h2>
                <div className="flex items-center gap-2 mt-1"><BeltBadge cinturon={viewStudent.cinturon} /><span className="text-sm text-slate-400">{viewStudent.categoria}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Sede", viewStudent.sede], ["Estado", viewStudent.estado], ["Edad", `${viewStudent.edad} años`], ["Nacimiento", viewStudent.fecha_nacimiento], ["Representante", viewStudent.representante], ["Teléfono", viewStudent.telefono], ["Correo", viewStudent.correo], ["Dirección", viewStudent.direccion], ["Inscripción", viewStudent.fecha_inscripcion]].map(([k, v]) => (
                <div key={k} className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="text-sm font-semibold text-white">{v || "—"}</p>
                </div>
              ))}
            </div>
            {viewStudent.observaciones && <div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-slate-500 mb-1">Observaciones</p><p className="text-sm text-slate-300">{viewStudent.observaciones}</p></div>}
          </div>
        </Modal>
      )}
    </div>
  );
};

// PAYMENTS PAGE
const PaymentsPage = ({ students, pagos, setPagos }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Todos");

  const filtered = filter === "Todos" ? pagos : pagos.filter((p) => p.estado === filter);

  const onSave = () => { setPagos(ls.get("hst_pagos", [])); setShowForm(false); };

  const getDaysLeft = (fecha) => {
    const diff = new Date(fecha) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const totalPendiente = pagos.filter((p) => p.estado !== "pagado").reduce((a, p) => a + (parseFloat(p.monto) - parseFloat(p.monto_pagado)), 0);
  const totalMes = pagos.filter((p) => p.fecha_pago?.slice(0, 7) === fmt(today).slice(0, 7)).reduce((a, p) => a + parseFloat(p.monto_pagado || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>PAGOS</h1>
          <p className="text-slate-400 text-sm">{pagos.length} registros</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <Icon name="plus" className="w-4 h-4" /> Registrar Pago
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Ingresos Mes" value={`$${totalMes.toFixed(0)}`} icon="finance" accent="emerald" />
        <StatCard title="Deuda Total" value={`$${totalPendiente.toFixed(0)}`} icon="payments" accent="red" />
        <StatCard title="Pagos Vencidos" value={pagos.filter((p) => p.estado === "vencido").length} icon="payments" accent="amber" />
      </div>
      <div className="flex gap-2">
        {["Todos", "pagado", "parcial", "vencido", "pendiente"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === f ? "text-[#020617]" : "bg-white/5 text-slate-400 hover:bg-white/10"}`} style={filter === f ? { background: "linear-gradient(135deg, #f59e0b, #d97706)" } : {}}>
            {f === "Todos" ? "Todos" : pagoEstadoConfig[f]?.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((p) => {
          const dias = getDaysLeft(p.fecha_vencimiento);
          return (
            <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{p.alumno_nombre?.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                  <div>
                    <p className="font-bold text-white text-sm">{p.alumno_nombre}</p>
                    <p className="text-xs text-slate-500">{p.tipo} · {p.sede} · {p.fecha_pago}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/{parseFloat(p.monto).toFixed(2)}</span></p>
                  <StatusBadge estado={p.estado} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Vence: {p.fecha_vencimiento}</span>
                <span className={dias < 0 ? "text-red-400 font-bold" : dias < 7 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                  {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `${dias} días restantes`}
                </span>
              </div>
              {p.estado !== "pagado" && (
                <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (parseFloat(p.monto_pagado) / parseFloat(p.monto)) * 100)}%`, background: p.estado === "vencido" ? "#ef4444" : "#f59e0b" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showForm && <PagoForm students={students} onSave={onSave} onClose={() => setShowForm(false)} />}
    </div>
  );
};

// ATTENDANCE PAGE
const AttendancePage = ({ students, asistencia, setAsistencia }) => {
  const [fecha, setFecha] = useState(fmt(today));
  const [sede, setSede] = useState("Todas");

  const filteredStudents = students.filter((s) => s.estado === "activo" && (sede === "Todas" || s.sede === sede));

  const getStatus = (studentId) => {
    const reg = asistencia.find((a) => a.alumno_id === studentId && a.fecha === fecha);
    return reg ? reg.presente : null;
  };

  const toggle = (student, presente) => {
    const existing = asistencia.find((a) => a.alumno_id === student.id && a.fecha === fecha);
    let updated;
    if (existing) {
      updated = asistencia.map((a) => a.alumno_id === student.id && a.fecha === fecha ? { ...a, presente } : a);
    } else {
      updated = [...asistencia, { id: Date.now().toString(), alumno_id: student.id, alumno_nombre: `${student.nombres} ${student.apellidos}`, fecha, presente, sede: student.sede }];
    }
    ls.set("hst_asistencia", updated);
    setAsistencia(updated);
  };

  const marcarTodos = (presente) => {
    let updated = [...asistencia];
    filteredStudents.forEach((s) => {
      const idx = updated.findIndex((a) => a.alumno_id === s.id && a.fecha === fecha);
      if (idx >= 0) { updated[idx] = { ...updated[idx], presente }; }
      else { updated.push({ id: Date.now().toString() + s.id, alumno_id: s.id, alumno_nombre: `${s.nombres} ${s.apellidos}`, fecha, presente, sede: s.sede }); }
    });
    ls.set("hst_asistencia", updated);
    setAsistencia(updated);
  };

  const presentesHoy = filteredStudents.filter((s) => getStatus(s.id) === true).length;
  const ausentesHoy = filteredStudents.filter((s) => getStatus(s.id) === false).length;
  const pct = filteredStudents.length ? Math.round((presentesHoy / filteredStudents.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>ASISTENCIA</h1>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-auto" />
        <Select options={["Todas", ...SEDES]} value={sede} onChange={(e) => setSede(e.target.value)} />
        <button onClick={() => marcarTodos(true)} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-colors">✓ Todos Presentes</button>
        <button onClick={() => marcarTodos(false)} className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors">✗ Todos Ausentes</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-400" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{presentesHoy}</p>
          <p className="text-xs text-slate-400 mt-1">Presentes</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-400" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{ausentesHoy}</p>
          <p className="text-xs text-slate-400 mt-1">Ausentes</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-amber-400" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{pct}%</p>
          <p className="text-xs text-slate-400 mt-1">Asistencia</p>
        </div>
      </div>
      <div className="space-y-2">
        {filteredStudents.map((s) => {
          const status = getStatus(s.id);
          return (
            <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${status === true ? "bg-emerald-500/10 border-emerald-500/20" : status === false ? "bg-red-500/10 border-red-500/20" : "bg-white/3 border-white/8"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p>
                  <div className="flex items-center gap-2 mt-0.5"><BeltBadge cinturon={s.cinturon} /><span className="text-xs text-slate-500">{s.sede}</span></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(s, true)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${status === true ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-500 hover:bg-emerald-500/30 hover:text-emerald-400"}`}><Icon name="check" className="w-5 h-5" /></button>
                <button onClick={() => toggle(s, false)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${status === false ? "bg-red-500 text-white" : "bg-white/5 text-slate-500 hover:bg-red-500/30 hover:text-red-400"}`}><Icon name="x" className="w-5 h-5" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// BELTS PAGE
const BeltsPage = ({ students, setStudents }) => {
  const [selected, setSelected] = useState(null);
  const [newBelt, setNewBelt] = useState("");

  const upgrade = () => {
    if (!selected || !newBelt) return;
    const updated = students.map((s) => s.id === selected.id ? { ...s, cinturon: newBelt } : s);
    ls.set("hst_students", updated);
    setStudents(updated);
    setSelected(null);
    setNewBelt("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>CINTURONES</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {CINTURONES.map((c) => {
          const count = students.filter((s) => s.cinturon === c).length;
          return (
            <div key={c} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-2 border-2 border-white/20" style={{ background: cinturonColor[c] }} />
              <p className="text-xs font-bold text-white">{c}</p>
              <p className="text-2xl font-black mt-1" style={{ fontFamily: "'Bebas Neue', sans-serif", color: cinturonColor[c] === "#ffffff" ? "#e2e8f0" : cinturonColor[c] }}>{count}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>ASCENSO DE CINTURÓN</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Seleccionar Alumno">
            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={selected?.id || ""} onChange={(e) => setSelected(students.find((s) => s.id === e.target.value) || null)}>
              <option value="">Seleccionar alumno...</option>
              {students.filter(s => s.estado === "activo").map((s) => <option key={s.id} value={s.id}>{s.nombres} {s.apellidos} — {s.cinturon}</option>)}
            </select>
          </Field>
          <Field label="Nuevo Cinturón"><Select options={CINTURONES} value={newBelt || CINTURONES[0]} onChange={(e) => setNewBelt(e.target.value)} /></Field>
          <Field label="Acción">
            <button onClick={upgrade} className="w-full py-2.5 rounded-xl text-[#020617] text-sm font-bold mt-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>Registrar Ascenso</button>
          </Field>
        </div>
      </div>
      <div className="space-y-2">
        {students.filter(s => s.estado === "activo").map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
              <div>
                <p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p>
                <p className="text-xs text-slate-500">{s.categoria} · {s.sede}</p>
              </div>
            </div>
            <BeltBadge cinturon={s.cinturon} />
          </div>
        ))}
      </div>
    </div>
  );
};

// RECEPTION PAGE
const ReceptionPage = ({ students, setPagos, setAsistencia, asistencia, pagos }) => {
  const [search, setSearch] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");

  const doSearch = () => {
    const q = search.toLowerCase();
    const s = students.find((s) => `${s.nombres} ${s.apellidos}`.toLowerCase().includes(q) || s.telefono?.includes(q));
    setFound(s || null);
    if (!s) setMsg("No encontrado");
  };

  const marcarAsistencia = (student) => {
    const existing = asistencia.find((a) => a.alumno_id === student.id && a.fecha === fmt(today));
    if (existing) { setMsg("Ya registrado hoy"); return; }
    const updated = [...asistencia, { id: Date.now().toString(), alumno_id: student.id, alumno_nombre: `${student.nombres} ${student.apellidos}`, fecha: fmt(today), presente: true, sede: student.sede }];
    ls.set("hst_asistencia", updated);
    setAsistencia(updated);
    setMsg(`✅ Asistencia registrada: ${student.nombres}`);
    setTimeout(() => setMsg(""), 3000);
  };

  const pagoAlDia = found ? pagos.find((p) => p.alumno_id === found.id && p.estado === "pagado") : null;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-5xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>RECEPCIÓN</h1>
        <p className="text-amber-400 text-sm font-semibold tracking-widest mt-1">MODO RÁPIDO</p>
      </div>
      <div className="bg-white/3 border border-white/8 rounded-3xl p-6">
        <p className="text-sm font-semibold text-slate-400 mb-3">BUSCAR ALUMNO</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50" placeholder="Nombre o teléfono..." value={search} onChange={(e) => { setSearch(e.target.value); if (e.target.value === "") setFound(null); }}
              onKeyDown={(e) => e.key === "Enter" && doSearch()} />
          </div>
          <button onClick={doSearch} className="px-5 py-3 rounded-xl text-[#020617] font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>Buscar</button>
        </div>
      </div>
      {msg && <div className={`p-4 rounded-2xl text-center font-bold text-sm ${msg.startsWith("✅") ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>{msg}</div>}
      {found && (
        <div className="bg-white/3 border border-amber-400/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-[#020617]" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>{found.nombres[0]}{found.apellidos[0]}</div>
            <div>
              <h2 className="text-xl font-black text-white">{found.nombres} {found.apellidos}</h2>
              <div className="flex items-center gap-2 mt-1"><BeltBadge cinturon={found.cinturon} /><span className="text-sm text-slate-400">{found.sede}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <span className="text-sm text-slate-400">Estado de pago:</span>
            <StatusBadge estado={pagoAlDia ? "pagado" : "pendiente"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => marcarAsistencia(found)} className="py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
              <Icon name="check" className="w-5 h-5" /> Marcar Asistencia
            </button>
            <button onClick={() => { setSearch(""); setFound(null); }} className="py-4 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
              <Icon name="x" className="w-5 h-5" /> Limpiar
            </button>
          </div>
        </div>
      )}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Asistencia Hoy — {fmt(today)}</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {asistencia.filter((a) => a.fecha === fmt(today) && a.presente).map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm text-emerald-400">
              <Icon name="check" className="w-4 h-4" />{a.alumno_nombre}
            </div>
          ))}
          {asistencia.filter((a) => a.fecha === fmt(today) && a.presente).length === 0 && <p className="text-slate-500 text-sm">Sin registros aún</p>}
        </div>
      </div>
    </div>
  );
};

// FINANCE PAGE
const FinancePage = ({ pagos }) => {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const byMonth = meses.map((label, i) => ({ label, value: pagos.filter((p) => parseInt(p.fecha_pago?.slice(5, 7)) === i + 1).reduce((a, p) => a + parseFloat(p.monto_pagado || 0), 0) }));
  const bySede = SEDES.map((sede) => ({ sede, total: pagos.filter((p) => p.sede === sede).reduce((a, p) => a + parseFloat(p.monto_pagado || 0), 0) }));
  const totalAnual = byMonth.reduce((a, m) => a + m.value, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>FINANZAS</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Anual" value={`$${totalAnual.toFixed(0)}`} icon="finance" accent="amber" />
        <StatCard title="Mes Actual" value={`$${byMonth[today.getMonth()].value.toFixed(0)}`} icon="finance" accent="emerald" />
        <StatCard title="Promedio Mensual" value={`$${(totalAnual / 12).toFixed(0)}`} icon="finance" accent="blue" />
        <StatCard title="Registros" value={pagos.length} icon="payments" accent="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>INGRESOS POR MES</h3>
          <MiniBarChart data={byMonth} color="#f59e0b" />
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>POR SEDE</h3>
          {bySede.map(({ sede, total }) => (
            <div key={sede} className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
              <span className="text-sm text-slate-300">{sede}</span>
              <span className="font-bold text-amber-400">${total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>HISTORIAL DE PAGOS</h3>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors">
            <Icon name="download" className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Alumno", "Tipo", "Monto", "Pagado", "Fecha", "Estado"].map((h) => <th key={h} className="text-left py-3 px-2 text-xs text-slate-500 font-semibold uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pagos.slice().reverse().map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-3 px-2 text-white font-medium">{p.alumno_nombre}</td>
                  <td className="py-3 px-2 text-slate-400">{p.tipo}</td>
                  <td className="py-3 px-2 text-slate-300">${parseFloat(p.monto).toFixed(2)}</td>
                  <td className="py-3 px-2 text-emerald-400 font-semibold">${parseFloat(p.monto_pagado).toFixed(2)}</td>
                  <td className="py-3 px-2 text-slate-400">{p.fecha_pago}</td>
                  <td className="py-3 px-2"><StatusBadge estado={p.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// EVENTS PAGE
const EventsPage = ({ eventos, setEventos }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", fecha: fmt(addDays(today, 7)), tipo: "examen", sede: "Ambas", descripcion: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    const data = { ...form, id: Date.now().toString() };
    const updated = [...eventos, data];
    ls.set("hst_eventos", updated);
    setEventos(updated);
    setShowForm(false);
    setForm({ titulo: "", fecha: fmt(addDays(today, 7)), tipo: "examen", sede: "Ambas", descripcion: "" });
  };

  const tipoColors = { examen: "amber", torneo: "blue", campamento: "emerald", seminario: "purple" };
  const tipoIcons = { examen: "🥋", torneo: "🏆", campamento: "⛺", seminario: "📚" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>EVENTOS</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <Icon name="plus" className="w-4 h-4" /> Nuevo Evento
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((e) => {
          const days = Math.ceil((new Date(e.fecha) - today) / (1000 * 60 * 60 * 24));
          return (
            <div key={e.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tipoIcons[e.tipo] || "📅"}</span>
                  <div>
                    <h3 className="font-bold text-white">{e.titulo}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{e.fecha} · {e.sede}</p>
                    {e.descripcion && <p className="text-xs text-slate-400 mt-2">{e.descripcion}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400`}>{e.tipo}</span>
                  <p className={`text-xs mt-1 font-semibold ${days < 0 ? "text-red-400" : days < 7 ? "text-amber-400" : "text-emerald-400"}`}>
                    {days < 0 ? "Pasado" : days === 0 ? "¡Hoy!" : `En ${days} días`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showForm && (
        <Modal title="Nuevo Evento" onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <Field label="Título"><Input value={form.titulo} onChange={set("titulo")} placeholder="Nombre del evento" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha"><Input type="date" value={form.fecha} onChange={set("fecha")} /></Field>
              <Field label="Tipo"><Select options={["examen", "torneo", "campamento", "seminario"]} value={form.tipo} onChange={set("tipo")} /></Field>
              <Field label="Sede"><Select options={["Quito", "Cumbayá", "Ambas"]} value={form.sede} onChange={set("sede")} /></Field>
            </div>
            <Field label="Descripción"><Textarea value={form.descripcion} onChange={set("descripcion")} placeholder="Detalles del evento..." /></Field>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
            <button onClick={save} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>Crear Evento</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    initStore();
    setStudents(ls.get("hst_students", []));
    setPagos(ls.get("hst_pagos", []));
    setAsistencia(ls.get("hst_asistencia", []));
    setEventos(ls.get("hst_eventos", []));
  }, []);

  if (!user) return <LoginScreen onLogin={setUser} />;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "students", label: "Alumnos", icon: "students" },
    { id: "payments", label: "Pagos", icon: "payments" },
    { id: "attendance", label: "Asistencia", icon: "attendance" },
    { id: "belts", label: "Cinturones", icon: "belt" },
    { id: "finance", label: "Finanzas", icon: "finance" },
    { id: "events", label: "Eventos", icon: "calendar" },
    { id: "reception", label: "Recepción", icon: "reception" },
  ];

  const pages = {
    dashboard: <DashboardPage students={students} pagos={pagos} asistencia={asistencia} />,
    students: <StudentsPage students={students} setStudents={setStudents} />,
    payments: <PaymentsPage students={students} pagos={pagos} setPagos={setPagos} />,
    attendance: <AttendancePage students={students} asistencia={asistencia} setAsistencia={setAsistencia} />,
    belts: <BeltsPage students={students} setStudents={setStudents} />,
    finance: <FinancePage pagos={pagos} />,
    events: <EventsPage eventos={eventos} setEventos={setEventos} />,
    reception: <ReceptionPage students={students} pagos={pagos} setPagos={setPagos} asistencia={asistencia} setAsistencia={setAsistencia} />,
  };

  const alerts = pagos.filter((p) => p.estado === "vencido").length;

  return (
    <div className="min-h-screen flex" style={{ background: "#020617", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-white/8 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} style={{ background: "#080f1f" }}>
        <div className="p-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>🥋</div>
            <div>
              <p className="font-black text-white text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>HENRY SIGCHOS</p>
              <p className="text-amber-400 text-[10px] font-semibold tracking-widest">TAEKWONDO</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${page === item.id ? "text-[#020617]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              style={page === item.id ? { background: "linear-gradient(135deg, #f59e0b, #d97706)" } : {}}>
              <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
              {item.label}
              {item.id === "payments" && alerts > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">{user.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
            <button onClick={() => setUser(null)} className="text-slate-500 hover:text-red-400 transition-colors"><Icon name="logout" className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* OVERLAY */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 lg:hidden" style={{ background: "#080f1f" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white"><Icon name="menu" /></button>
          <p className="font-black text-white text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>HST ACADEMY</p>
          <div className="w-8" />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {pages[page]}
        </main>
      </div>
    </div>
  );
}
