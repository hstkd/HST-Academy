import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc${filters}`, { headers: HEADERS });
    return r.json();
  },
  insert: async (table, data) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: HEADERS, body: JSON.stringify(data) });
    return r.json();
  },
  update: async (table, id, data) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(data) });
    return r.json();
  },
  delete: async (table, id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: HEADERS });
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const MEMBRESIAS = [
  { id: "basica", nombre: "Básico", sesiones: 8, precio: 0, color: "#3b82f6" },
  { id: "estandar", nombre: "Estándar", sesiones: 12, precio: 0, color: "#f59e0b" },
  { id: "premium", nombre: "Completo", sesiones: 999, precio: 0, color: "#a855f7" },
];

const CINTURONES = ["Blanco","Blanco/Amarillo","Amarillo","Amarillo/Verde","Verde","Verde/Azul","Azul","Azul/Rojo","Rojo","Rojo/Negro","Negro"];
const CATEGORIAS = ["Infantil", "Juvenil", "Adulto", "Máster"];
const SEDES = ["Quito", "Cumbayá"];

const cinturonColor = {
  Blanco: "#ffffff", "Blanco/Amarillo": "#fef08a", Amarillo: "#fbbf24",
  "Amarillo/Verde": "#a3e635", Verde: "#22c55e", "Verde/Azul": "#34d399",
  Azul: "#3b82f6", "Azul/Rojo": "#a78bfa", Rojo: "#ef4444",
  "Rojo/Negro": "#f97316", Negro: "#374151",
};

const pagoEstadoConfig = {
  pagado:    { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", label: "Al día" },
  parcial:   { bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30",   label: "Parcial" },
  vencido:   { bg: "bg-red-500/20",     text: "text-red-400",     border: "border-red-500/30",     label: "Vencido" },
  pendiente: { bg: "bg-slate-500/20",   text: "text-slate-400",   border: "border-slate-500/30",   label: "Pendiente" },
};

const PERMISOS = {
  admin:    ["dashboard","students","payments","attendance","belts","finance","events","users"],
  profesor: ["attendance","students"],
  alumno:   ["mi_asistencia","mis_pagos"],
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    dashboard:    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    students:     <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    payments:     <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    attendance:   <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    belt:         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    finance:      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    calendar:     <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users:        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    plus:         <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
    edit:         <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    trash:        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    search:       <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    x:            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    check:        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    logout:       <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    menu:         <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
    arrow_up:     <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />,
    arrow_down:   <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />,
    eye:          <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>,
    key:          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
    mi_asistencia:<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    mis_pagos:    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    spinner:      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />,
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {icons[name] || null}
    </svg>
  );
};

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
    <div className={`relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>{title}</h2>
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

const Input = (props) => (
  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all" {...props} />
);

const Select = ({ options, ...props }) => (
  <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/50 transition-all" {...props}>
    {options.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Textarea = (props) => (
  <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all resize-none" rows={3} {...props} />
);

const Btn = ({ children, onClick, color = "amber", className = "", disabled = false }) => (
  <button onClick={onClick} disabled={disabled}
    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${className}`}
    style={{ background: color === "amber" ? "linear-gradient(135deg,#f59e0b,#d97706)" : color === "red" ? "#ef444420" : "#ffffff10", color: color === "amber" ? "#020617" : color === "red" ? "#f87171" : "#cbd5e1" }}>
    {children}
  </button>
);

const StatCard = ({ title, value, sub, icon, accent = "amber" }) => {
  const accents = { amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20", emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", red: "from-red-500/20 to-red-600/5 border-red-500/20", blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20" };
  const iconColors = { amber: "text-amber-400", emerald: "text-emerald-400", red: "text-red-400", blue: "text-blue-400" };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${accents[accent]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className="text-4xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{value}</p>
          {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-white/5 ${iconColors[accent]}`}><Icon name={icon} className="w-6 h-6" /></div>
      </div>
    </div>
  );
};

const BeltBadge = ({ cinturon }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${cinturonColor[cinturon]||"#fff"}22`, color: cinturon==="Blanco"?"#e2e8f0":(cinturonColor[cinturon]||"#fff"), border:`1px solid ${cinturonColor[cinturon]||"#fff"}44` }}>
    <span className="w-2 h-2 rounded-full" style={{ background: cinturonColor[cinturon]||"#fff" }} />{cinturon}
  </span>
);

const StatusBadge = ({ estado }) => {
  const cfg = pagoEstadoConfig[estado] || pagoEstadoConfig.pendiente;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>;
};

const MembresiaTag = ({ membresiaId }) => {
  const m = MEMBRESIAS.find((x) => x.id === membresiaId);
  if (!m) return null;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:`${m.color}22`, color:m.color, border:`1px solid ${m.color}44` }}>{m.sesiones===999?"♾️":`${m.sesiones}🎯`} {m.nombre}</span>;
};

const RoleBadge = ({ role }) => {
  const cfg = { admin:{color:"#f59e0b",label:"Admin"}, profesor:{color:"#3b82f6",label:"Profesor"}, alumno:{color:"#22c55e",label:"Alumno"} };
  const c = cfg[role]||cfg.alumno;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${c.color}22`, color:c.color }}>{c.label}</span>;
};

const MiniBarChart = ({ data, color = "#f59e0b" }) => {
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

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setErr("Completa todos los campos"); return; }
    setLoading(true); setErr("");
    try {
      const users = await db.get("users", `&email=eq.${email}&password=eq.${password}`);
      if (users && users.length > 0) { onLogin(users[0]); }
      else { setErr("Correo o contraseña incorrectos"); }
    } catch { setErr("Error de conexión. Intenta de nuevo."); }
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>
            <span className="text-3xl">🥋</span>
          </div>
          <h1 className="text-5xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>HENRY SIGCHOS</h1>
          <p className="text-amber-400 font-semibold tracking-widest text-sm mt-1">TAEKWONDO ACADEMY</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
          {err && <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
          <div className="space-y-4">
            <Field label="Correo"><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="correo@academia.com" onKeyDown={(e)=>e.key==="Enter"&&handleLogin()} /></Field>
            <Field label="Contraseña"><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e)=>e.key==="Enter"&&handleLogin()} /></Field>
          </div>
          <button onClick={handleLogin} disabled={loading} className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-[#020617] transition-all active:scale-95 disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>
            {loading ? "VERIFICANDO..." : "INGRESAR AL SISTEMA"}
          </button>
          <p className="text-center text-xs text-slate-500 mt-4">admin@hst.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const DashboardPage = ({ students, pagos, asistencia }) => {
  const activos = students.filter((s) => s.estado === "activo").length;
  const vencidos = pagos.filter((p) => p.estado === "vencido").length;
  const ingresosMes = pagos.filter((p) => p.fecha_pago?.slice(0,7) === fmt(today).slice(0,7)).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0);
  const hoyPresentes = asistencia.filter((a) => a.fecha === fmt(today) && a.presente).length;
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const chartData = meses.slice(0, today.getMonth()+1).map((label,i)=>({ label, value: pagos.filter((p)=>parseInt(p.fecha_pago?.slice(5,7))===i+1).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0) }));
  const memCounts = MEMBRESIAS.map((m)=>({ ...m, count: students.filter((s)=>s.membresia===m.id&&s.estado==="activo").length }));
  const alertas = [
    ...pagos.filter((p)=>p.estado==="vencido").map((p)=>({ tipo:"error", msg:`⚠️ Pago vencido: ${p.alumno_nombre}` })),
    ...students.filter((s)=>{ const b=new Date(s.fecha_nacimiento); return b.getDate()===today.getDate()&&b.getMonth()===today.getMonth(); }).map((s)=>({ tipo:"info", msg:`🎂 Cumpleaños: ${s.nombres} ${s.apellidos}` })),
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>DASHBOARD</h1>
        <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString("es-EC",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Alumnos" value={students.length} sub={`${activos} activos`} icon="students" accent="blue" />
        <StatCard title="Asistencia Hoy" value={hoyPresentes} sub="presentes" icon="attendance" accent="emerald" />
        <StatCard title="Pagos Vencidos" value={vencidos} sub="requieren atención" icon="payments" accent="red" />
        <StatCard title="Ingresos Mes" value={`$${ingresosMes.toFixed(0)}`} icon="finance" accent="amber" />
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>MEMBRESÍAS ACTIVAS</h3>
        <div className="grid grid-cols-3 gap-4">
          {memCounts.map((m)=>(
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
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>INGRESOS {today.getFullYear()}</h3>
          <MiniBarChart data={chartData} color="#f59e0b" />
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>CINTURONES</h3>
          <div className="space-y-2">
            {CINTURONES.map((c)=>{ const count=students.filter((s)=>s.cinturon===c).length; const pct=students.length?(count/students.length)*100:0; return (
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
          <div className="space-y-2">{alertas.map((a,i)=><div key={i} className={`p-3 rounded-xl text-sm ${a.tipo==="error"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{a.msg}</div>)}</div>
        </div>
      )}
    </div>
  );
};

// ─── STUDENTS PAGE ────────────────────────────────────────────────────────────
const StudentsPage = ({ students, reload, canEdit }) => {
  const [search, setSearch] = useState("");
  const [filterSede, setFilterSede] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return `${s.nombres} ${s.apellidos} ${s.telefono||""}`.toLowerCase().includes(q) && (filterSede==="Todas"||s.sede===filterSede) && (filterEstado==="Todos"||s.estado===filterEstado);
  });

  const StudentForm = ({ student, onClose }) => {
    const empty = { nombres:"", apellidos:"", edad:"", fecha_nacimiento:"", representante:"", telefono:"", correo:"", direccion:"", sede:"Quito", cinturon:"Blanco", categoria:"Infantil", membresia:"estandar", estado:"activo", observaciones:"", fecha_inscripcion:fmt(today) };
    const [form, setForm] = useState(student||empty);
    const set = (k)=>(e)=>setForm((f)=>({...f,[k]:e.target.value}));
    const save = async () => {
      if (!form.nombres||!form.apellidos) return;
      setSaving(true);
      if (student) await db.update("students", student.id, form);
      else await db.insert("students", form);
      await reload();
      setSaving(false);
      onClose();
    };
    return (
      <Modal title={student?"Editar Alumno":"Nuevo Alumno"} onClose={onClose} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombres"><Input value={form.nombres} onChange={set("nombres")} /></Field>
          <Field label="Apellidos"><Input value={form.apellidos} onChange={set("apellidos")} /></Field>
          <Field label="Fecha Nacimiento"><Input type="date" value={form.fecha_nacimiento||""} onChange={set("fecha_nacimiento")} /></Field>
          <Field label="Edad"><Input type="number" value={form.edad||""} onChange={set("edad")} /></Field>
          <Field label="Representante"><Input value={form.representante||""} onChange={set("representante")} /></Field>
          <Field label="Teléfono"><Input value={form.telefono||""} onChange={set("telefono")} /></Field>
          <Field label="Correo" className="col-span-2"><Input value={form.correo||""} onChange={set("correo")} /></Field>
          <Field label="Dirección" className="col-span-2"><Input value={form.direccion||""} onChange={set("direccion")} /></Field>
          <Field label="Sede"><Select options={SEDES} value={form.sede} onChange={set("sede")} /></Field>
          <Field label="Estado"><Select options={["activo","inactivo"]} value={form.estado} onChange={set("estado")} /></Field>
          <Field label="Cinturón"><Select options={CINTURONES} value={form.cinturon} onChange={set("cinturon")} /></Field>
          <Field label="Categoría"><Select options={CATEGORIAS} value={form.categoria} onChange={set("categoria")} /></Field>
          <Field label="Membresía" className="col-span-2">
            <div className="grid grid-cols-3 gap-2 mt-1">
              {MEMBRESIAS.map((m)=>(
                <button key={m.id} type="button" onClick={()=>setForm((f)=>({...f,membresia:m.id}))}
                  className="p-3 rounded-xl border text-center transition-all"
                  style={{ background:form.membresia===m.id?`${m.color}30`:"rgba(255,255,255,0.03)", borderColor:form.membresia===m.id?m.color:"rgba(255,255,255,0.1)", color:form.membresia===m.id?m.color:"#94a3b8" }}>
                  <p className="text-xs font-bold">{m.nombre}</p>
                  <p className="text-[10px] mt-0.5">{m.sesiones===999?"Ilimitadas":`${m.sesiones} ses.`}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Fecha Inscripción"><Input type="date" value={form.fecha_inscripcion||""} onChange={set("fecha_inscripcion")} /></Field>
          <Field label="Observaciones" className="col-span-2"><Textarea value={form.observaciones||""} onChange={set("observaciones")} /></Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":student?"Guardar Cambios":"Crear Alumno"}</button>
        </div>
      </Modal>
    );
  };

  const onDelete = async (id) => {
    if (!confirm("¿Eliminar alumno?")) return;
    await db.delete("students", id);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>ALUMNOS</h1><p className="text-slate-400 text-sm">{filtered.length} de {students.length}</p></div>
        <button onClick={()=>{setEditStudent(null);setShowForm(true);}} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Alumno</button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50" placeholder="Buscar..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <Select options={["Todas",...SEDES]} value={filterSede} onChange={(e)=>setFilterSede(e.target.value)} />
        <Select options={["Todos","activo","inactivo"]} value={filterEstado} onChange={(e)=>setFilterEstado(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s)=>(
          <div key={s.id} className="group bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/30 hover:bg-white/5 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
                <div><p className="font-bold text-white text-sm">{s.nombres} {s.apellidos}</p><p className="text-xs text-slate-500">{s.edad} años · {s.sede}</p></div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.estado==="activo"?"bg-emerald-500/20 text-emerald-400":"bg-slate-500/20 text-slate-400"}`}>{s.estado}</span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap"><BeltBadge cinturon={s.cinturon} /><MembresiaTag membresiaId={s.membresia} /></div>
            <div className="text-xs text-slate-500 space-y-1"><p>📱 {s.telefono}</p><p>👤 {s.representante}</p></div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={()=>setViewStudent(s)} className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 flex items-center justify-center gap-1"><Icon name="eye" className="w-3 h-3" /> Ver</button>
              {canEdit&&<button onClick={()=>{setEditStudent(s);setShowForm(true);}} className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 flex items-center justify-center gap-1"><Icon name="edit" className="w-3 h-3" /> Editar</button>}
              {canEdit&&<button onClick={()=>onDelete(s.id)} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 flex items-center justify-center gap-1"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>}
            </div>
          </div>
        ))}
      </div>
      {showForm&&<StudentForm student={editStudent} onClose={()=>{setShowForm(false);setEditStudent(null);}} />}
      {viewStudent&&(
        <Modal title="Perfil del Alumno" onClose={()=>setViewStudent(null)} wide>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{viewStudent.nombres[0]}{viewStudent.apellidos[0]}</div>
              <div><h2 className="text-2xl font-black text-white">{viewStudent.nombres} {viewStudent.apellidos}</h2><div className="flex gap-2 mt-1 flex-wrap"><BeltBadge cinturon={viewStudent.cinturon} /><MembresiaTag membresiaId={viewStudent.membresia} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Sede",viewStudent.sede],["Estado",viewStudent.estado],["Edad",`${viewStudent.edad} años`],["Nacimiento",viewStudent.fecha_nacimiento],["Representante",viewStudent.representante],["Teléfono",viewStudent.telefono],["Correo",viewStudent.correo],["Dirección",viewStudent.direccion],["Inscripción",viewStudent.fecha_inscripcion]].map(([k,v])=>(
                <div key={k} className="bg-white/5 rounded-xl p-3"><p className="text-xs text-slate-500 mb-0.5">{k}</p><p className="text-sm font-semibold text-white">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── PAYMENTS PAGE ────────────────────────────────────────────────────────────
const PaymentsPage = ({ students, pagos, reload }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [saving, setSaving] = useState(false);
  const filtered = filter==="Todos"?pagos:pagos.filter((p)=>p.estado===filter);
  const getDays = (f)=>Math.ceil((new Date(f)-today)/86400000);
  const totalMes = pagos.filter((p)=>p.fecha_pago?.slice(0,7)===fmt(today).slice(0,7)).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0);
  const totalDeuda = pagos.reduce((a,p)=>a+Math.max(0,parseFloat(p.monto)-parseFloat(p.monto_pagado)),0);

  const PagoForm = ({ onClose }) => {
    const active = students.filter((s)=>s.estado==="activo");
    const [alumnoId, setAlumnoId] = useState(active[0]?.id||"");
    const [tipoPago, setTipoPago] = useState("estandar");
    const [montoTotal, setMontoTotal] = useState("");
    const [montoPagado, setMontoPagado] = useState("");
    const [fechaPago, setFechaPago] = useState(fmt(today));
    const [fechaVenc, setFechaVenc] = useState(fmt(addDays(today,30)));
    const [notas, setNotas] = useState("");
    const alumno = active.find((s)=>s.id===alumnoId);
    const total = parseFloat(montoTotal)||0;
    const pagado = parseFloat(montoPagado)||0;
    const deuda = Math.max(0,total-pagado);
    const memb = MEMBRESIAS.find((m)=>m.id===tipoPago);

    const save = async () => {
      if (!alumnoId||!montoTotal) return;
      setSaving(true);
      const estado = pagado>=total?"pagado":pagado>0?"parcial":"pendiente";
      await db.insert("pagos",{ alumno_id:alumnoId, alumno_nombre:`${alumno?.nombres} ${alumno?.apellidos}`, monto:total, monto_pagado:pagado, fecha_pago:fechaPago, fecha_vencimiento:fechaVenc, tipo:memb?.nombre||tipoPago, estado, sede:alumno?.sede||"Quito", notas });
      await reload();
      setSaving(false);
      onClose();
    };

    return (
      <Modal title="Registrar Pago" onClose={onClose} wide>
        <div className="space-y-5">
          <Field label="Alumno">
            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={alumnoId} onChange={(e)=>setAlumnoId(e.target.value)}>
              {active.map((s)=><option key={s.id} value={s.id}>{s.nombres} {s.apellidos}</option>)}
            </select>
          </Field>
          <Field label="Membresía">
            <div className="grid grid-cols-3 gap-3 mt-1">
              {MEMBRESIAS.map((m)=>(
                <button key={m.id} type="button" onClick={()=>setTipoPago(m.id)}
                  className="p-4 rounded-2xl border text-center transition-all"
                  style={{ background:tipoPago===m.id?`${m.color}25`:"rgba(255,255,255,0.03)", borderColor:tipoPago===m.id?m.color:"rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-bold" style={{ color:tipoPago===m.id?m.color:"#94a3b8" }}>{m.nombre}</p>
                  <p className="text-[11px] mt-0.5" style={{ color:tipoPago===m.id?m.color:"#64748b" }}>{m.sesiones===999?"Ilimitadas":`${m.sesiones} sesiones`}</p>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monto Total ($)"><Input type="number" value={montoTotal} onChange={(e)=>setMontoTotal(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Monto Pagado ($)"><Input type="number" value={montoPagado} onChange={(e)=>setMontoPagado(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Fecha Pago"><Input type="date" value={fechaPago} onChange={(e)=>setFechaPago(e.target.value)} /></Field>
            <Field label="Fecha Vencimiento"><Input type="date" value={fechaVenc} onChange={(e)=>setFechaVenc(e.target.value)} /></Field>
          </div>
          {montoTotal&&<div className={`p-3 rounded-xl text-sm font-bold border ${deuda>0?"bg-red-500/10 border-red-500/30 text-red-400":"bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>Deuda: ${deuda.toFixed(2)} {deuda===0&&"✓ Pagado completo"}</div>}
          <Field label="Notas"><Textarea value={notas} onChange={(e)=>setNotas(e.target.value)} /></Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Pago"}</button>
        </div>
      </Modal>
    );
  };

  const onDelete = async (id) => {
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
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Ingresos Mes" value={`$${totalMes.toFixed(0)}`} icon="finance" accent="emerald" />
        <StatCard title="Deuda Total" value={`$${totalDeuda.toFixed(0)}`} icon="payments" accent="red" />
        <StatCard title="Vencidos" value={pagos.filter((p)=>p.estado==="vencido").length} icon="payments" accent="amber" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {["Todos","pagado","parcial","vencido","pendiente"].map((f)=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter===f?"text-[#020617]":"bg-white/5 text-slate-400 hover:bg-white/10"}`} style={filter===f?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>
            {f==="Todos"?"Todos":pagoEstadoConfig[f]?.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((p)=>{
          const dias=getDays(p.fecha_vencimiento);
          return (
            <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#020617] font-black text-sm" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{p.alumno_nombre?.split(" ").map((n)=>n[0]).join("").slice(0,2)}</div>
                  <div><p className="font-bold text-white text-sm">{p.alumno_nombre}</p><p className="text-xs text-slate-500">{p.tipo} · {p.sede} · {p.fecha_pago}</p></div>
                </div>
                <div className="text-right"><p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/${parseFloat(p.monto).toFixed(2)}</span></p><StatusBadge estado={p.estado} /></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Vence: {p.fecha_vencimiento}</span>
                <span className={dias<0?"text-red-400 font-bold":dias<7?"text-amber-400 font-bold":"text-emerald-400"}>{dias<0?`Vencido hace ${Math.abs(dias)} días`:`${dias} días restantes`}</span>
              </div>
              {p.estado!=="pagado"&&<div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${Math.min(100,(parseFloat(p.monto_pagado)/parseFloat(p.monto))*100)}%`, background:p.estado==="vencido"?"#ef4444":"#f59e0b" }} /></div>}
              <div className="flex justify-end mt-3">
                <button onClick={()=>onDelete(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30"><Icon name="trash" className="w-3 h-3" /> Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
      {showForm&&<PagoForm onClose={()=>setShowForm(false)} />}
    </div>
  );
};

// ─── ATTENDANCE PAGE ──────────────────────────────────────────────────────────
const AttendancePage = ({ students, asistencia, reload }) => {
  const [fecha, setFecha] = useState(fmt(today));
  const [sede, setSede] = useState("Todas");
  const [saving, setSaving] = useState(false);
  const fs = students.filter((s)=>s.estado==="activo"&&(sede==="Todas"||s.sede===sede));
  const getStatus = (id)=>{ const r=asistencia.find((a)=>a.alumno_id===id&&a.fecha===fecha); return r?r.presente:null; };
  const getRecord = (id)=>asistencia.find((a)=>a.alumno_id===id&&a.fecha===fecha);

  const toggle = async (student, presente) => {
    setSaving(true);
    const existing = getRecord(student.id);
    if (existing) await db.update("asistencia", existing.id, { presente });
    else await db.insert("asistencia",{ alumno_id:student.id, alumno_nombre:`${student.nombres} ${student.apellidos}`, fecha, presente, sede:student.sede });
    await reload();
    setSaving(false);
  };

  const marcarTodos = async (presente) => {
    setSaving(true);
    for (const s of fs) {
      const existing = getRecord(s.id);
      if (existing) await db.update("asistencia", existing.id, { presente });
      else await db.insert("asistencia",{ alumno_id:s.id, alumno_nombre:`${s.nombres} ${s.apellidos}`, fecha, presente, sede:s.sede });
    }
    await reload();
    setSaving(false);
  };

  const presentes = fs.filter((s)=>getStatus(s.id)===true).length;
  const ausentes = fs.filter((s)=>getStatus(s.id)===false).length;
  const pct = fs.length?Math.round((presentes/fs.length)*100):0;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>ASISTENCIA {saving&&<span className="text-sm text-amber-400 ml-2">Guardando...</span>}</h1>
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} style={{ width:"auto" }} />
        <Select options={["Todas",...SEDES]} value={sede} onChange={(e)=>setSede(e.target.value)} />
        <button onClick={()=>marcarTodos(true)} disabled={saving} className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 disabled:opacity-50">✓ Todos Presentes</button>
        <button onClick={()=>marcarTodos(false)} disabled={saving} className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 disabled:opacity-50">✗ Todos Ausentes</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{presentes}</p><p className="text-xs text-slate-400 mt-1">Presentes</p></div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{ausentes}</p><p className="text-xs text-slate-400 mt-1">Ausentes</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{pct}%</p><p className="text-xs text-slate-400 mt-1">Asistencia</p></div>
      </div>
      <div className="space-y-2">
        {fs.map((s)=>{ const st=getStatus(s.id); return (
          <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${st===true?"bg-emerald-500/10 border-emerald-500/20":st===false?"bg-red-500/10 border-red-500/20":"bg-white/3 border-white/8"}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
              <div><p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p><BeltBadge cinturon={s.cinturon} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>toggle(s,true)} disabled={saving} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${st===true?"bg-emerald-500 text-white":"bg-white/5 text-slate-500 hover:bg-emerald-500/30 hover:text-emerald-400"}`}><Icon name="check" className="w-5 h-5" /></button>
              <button onClick={()=>toggle(s,false)} disabled={saving} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${st===false?"bg-red-500 text-white":"bg-white/5 text-slate-500 hover:bg-red-500/30 hover:text-red-400"}`}><Icon name="x" className="w-5 h-5" /></button>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
};

// ─── BELTS PAGE ───────────────────────────────────────────────────────────────
const BeltsPage = ({ students, reload }) => {
  const [selected, setSelected] = useState(null);
  const [newBelt, setNewBelt] = useState(CINTURONES[0]);
  const [saving, setSaving] = useState(false);
  const upgrade = async () => {
    if (!selected||!newBelt) return;
    setSaving(true);
    await db.update("students", selected.id, { cinturon: newBelt });
    await reload();
    setSaving(false);
    setSelected(null);
  };
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>CINTURONES</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {CINTURONES.map((c)=>{ const count=students.filter((s)=>s.cinturon===c).length; return (
          <div key={c} className="bg-white/3 border border-white/8 rounded-2xl p-3 text-center">
            <div className="w-7 h-7 rounded-full mx-auto mb-2 border-2 border-white/20" style={{ background:cinturonColor[c] }} />
            <p className="text-[10px] font-bold text-white leading-tight">{c}</p>
            <p className="text-2xl font-black mt-1" style={{ fontFamily:"'Bebas Neue',sans-serif", color:cinturonColor[c]==="#ffffff"?"#e2e8f0":cinturonColor[c] }}>{count}</p>
          </div>
        ); })}
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>ASCENSO DE CINTURÓN</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Alumno">
            <select className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" value={selected?.id||""} onChange={(e)=>setSelected(students.find((s)=>s.id===e.target.value)||null)}>
              <option value="">Seleccionar...</option>
              {students.filter((s)=>s.estado==="activo").map((s)=><option key={s.id} value={s.id}>{s.nombres} {s.apellidos} — {s.cinturon}</option>)}
            </select>
          </Field>
          <Field label="Nuevo Cinturón"><Select options={CINTURONES} value={newBelt} onChange={(e)=>setNewBelt(e.target.value)} /></Field>
          <Field label="Acción"><button onClick={upgrade} disabled={saving} className="w-full py-2.5 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Registrar Ascenso"}</button></Field>
        </div>
      </div>
      <div className="space-y-2">
        {students.filter((s)=>s.estado==="activo").map((s)=>(
          <div key={s.id} className="flex items-center justify-between p-4 bg-white/3 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-[#020617]" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{s.nombres[0]}{s.apellidos[0]}</div>
              <div><p className="font-semibold text-white text-sm">{s.nombres} {s.apellidos}</p><p className="text-xs text-slate-500">{s.categoria} · {s.sede}</p></div>
            </div>
            <BeltBadge cinturon={s.cinturon} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── FINANCE PAGE ─────────────────────────────────────────────────────────────
const FinancePage = ({ pagos }) => {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const byMonth = meses.map((label,i)=>({ label, value:pagos.filter((p)=>parseInt(p.fecha_pago?.slice(5,7))===i+1).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0) }));
  const totalAnual = byMonth.reduce((a,m)=>a+m.value,0);
  const bySede = SEDES.map((sede)=>({ sede, total:pagos.filter((p)=>p.sede===sede).reduce((a,p)=>a+parseFloat(p.monto_pagado||0),0) }));
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>FINANZAS</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Anual" value={`$${totalAnual.toFixed(0)}`} icon="finance" accent="amber" />
        <StatCard title="Mes Actual" value={`$${byMonth[today.getMonth()].value.toFixed(0)}`} icon="finance" accent="emerald" />
        <StatCard title="Promedio Mensual" value={`$${(totalAnual/12).toFixed(0)}`} icon="finance" accent="blue" />
        <StatCard title="Registros" value={pagos.length} icon="payments" accent="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>INGRESOS POR MES</h3>
          <MiniBarChart data={byMonth} color="#f59e0b" />
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
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HISTORIAL</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10">{["Alumno","Membresía","Monto","Pagado","Fecha","Estado"].map((h)=><th key={h} className="text-left py-3 px-2 text-xs text-slate-500 font-semibold uppercase">{h}</th>)}</tr></thead>
            <tbody>{pagos.map((p)=>(
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

// ─── EVENTS PAGE ──────────────────────────────────────────────────────────────
const EventsPage = ({ eventos, reload }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo:"", fecha:fmt(addDays(today,7)), tipo:"examen", sede:"Ambas", descripcion:"" });
  const set = (k)=>(e)=>setForm((f)=>({...f,[k]:e.target.value}));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.titulo) return;
    setSaving(true);
    await db.insert("eventos", form);
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
        {eventos.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map((e)=>{ const days=Math.ceil((new Date(e.fecha)-today)/86400000); return (
          <div key={e.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-amber-400/20">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tipoIcons[e.tipo]||"📅"}</span>
                <div><h3 className="font-bold text-white">{e.titulo}</h3><p className="text-xs text-slate-500 mt-0.5">{e.fecha} · {e.sede}</p>{e.descripcion&&<p className="text-xs text-slate-400 mt-2">{e.descripcion}</p>}</div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">{e.tipo}</span>
                <p className={`text-xs mt-1 font-semibold ${days<0?"text-red-400":days<7?"text-amber-400":"text-emerald-400"}`}>{days<0?"Pasado":days===0?"¡Hoy!":`En ${days} días`}</p>
              </div>
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
            <button onClick={()=>setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Crear Evento"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
const UsersPage = ({ currentUser, setCurrentUser, allUsers, reloadUsers }) => {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [saving, setSaving] = useState(false);

  const onDelete = async (id) => {
    if (id===currentUser.id) { alert("No puedes eliminar tu propio usuario"); return; }
    if (!confirm("¿Eliminar usuario?")) return;
    await db.delete("users", id);
    await reloadUsers();
  };

  const UserForm = ({ user, onClose }) => {
    const [form, setForm] = useState(user?{...user,password:""}:{ nombre:"", email:"", password:"", role:"profesor" });
    const set = (k)=>(e)=>setForm((f)=>({...f,[k]:e.target.value}));
    const [err, setErr] = useState("");
    const save = async () => {
      if (!form.nombre||!form.email) { setErr("Nombre y correo son obligatorios"); return; }
      if (!user&&!form.password) { setErr("La contraseña es obligatoria"); return; }
      setSaving(true);
      if (user) {
        const upd = { nombre:form.nombre, email:form.email, role:form.role };
        if (form.password) upd.password = form.password;
        await db.update("users", user.id, upd);
        if (currentUser.id===user.id) setCurrentUser({...currentUser,...upd});
      } else {
        await db.insert("users",{ nombre:form.nombre, email:form.email, password:form.password, role:form.role });
      }
      await reloadUsers();
      setSaving(false);
      onClose();
    };
    return (
      <Modal title={user?"Editar Usuario":"Nuevo Usuario"} onClose={onClose}>
        <div className="space-y-4">
          {err&&<div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
          <Field label="Nombre completo"><Input value={form.nombre} onChange={set("nombre")} /></Field>
          <Field label="Correo"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label={user?"Nueva contraseña (vacío = no cambiar)":"Contraseña"}><Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" /></Field>
          <Field label="Rol">
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[{id:"admin",label:"Admin",desc:"Acceso total",color:"#f59e0b"},{id:"profesor",label:"Profesor",desc:"Asistencia + Alumnos",color:"#3b82f6"},{id:"alumno",label:"Alumno",desc:"Solo sus datos",color:"#22c55e"}].map((r)=>(
                <button key={r.id} type="button" onClick={()=>setForm((f)=>({...f,role:r.id}))}
                  className="p-3 rounded-xl border text-center transition-all"
                  style={{ background:form.role===r.id?`${r.color}25`:"rgba(255,255,255,0.03)", borderColor:form.role===r.id?r.color:"rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-bold" style={{ color:form.role===r.id?r.color:"#94a3b8" }}>{r.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color:form.role===r.id?r.color:"#475569" }}>{r.desc}</p>
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":user?"Guardar":"Crear Usuario"}</button>
        </div>
      </Modal>
    );
  };

  const ProfileModal = ({ onClose }) => {
    const [form, setForm] = useState({ nombre:currentUser.nombre, email:currentUser.email, oldPass:"", newPass:"", confirm:"" });
    const set = (k)=>(e)=>setForm((f)=>({...f,[k]:e.target.value}));
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const save = async () => {
      setErr(""); setOk("");
      if (form.newPass) {
        const me = allUsers.find((u)=>u.id===currentUser.id);
        if (me?.password!==form.oldPass) { setErr("Contraseña actual incorrecta"); return; }
        if (form.newPass.length<6) { setErr("Mínimo 6 caracteres"); return; }
        if (form.newPass!==form.confirm) { setErr("Las contraseñas no coinciden"); return; }
      }
      setSaving(true);
      const upd = { nombre:form.nombre, email:form.email };
      if (form.newPass) upd.password = form.newPass;
      await db.update("users", currentUser.id, upd);
      setCurrentUser({...currentUser,...upd});
      await reloadUsers();
      setSaving(false);
      setOk("✅ Cambios guardados");
    };
    return (
      <Modal title="Mi Perfil" onClose={onClose}>
        <div className="space-y-4">
          {err&&<div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{err}</div>}
          {ok&&<div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm">{ok}</div>}
          <Field label="Nombre"><Input value={form.nombre} onChange={set("nombre")} /></Field>
          <Field label="Correo"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Cambiar contraseña (opcional)</p>
            <div className="space-y-3">
              <Field label="Contraseña actual"><Input type="password" value={form.oldPass} onChange={set("oldPass")} placeholder="••••••••" /></Field>
              <Field label="Nueva contraseña"><Input type="password" value={form.newPass} onChange={set("newPass")} placeholder="••••••••" /></Field>
              <Field label="Confirmar"><Input type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" /></Field>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-[#020617] text-sm font-bold disabled:opacity-60" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{saving?"Guardando...":"Guardar Cambios"}</button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>USUARIOS</h1><p className="text-slate-400 text-sm">{allUsers.length} usuarios</p></div>
        <div className="flex gap-3">
          <button onClick={()=>setShowProfile(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5"><Icon name="key" className="w-4 h-4" /> Mi Perfil</button>
          <button onClick={()=>{setEditUser(null);setShowForm(true);}} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#020617] text-sm font-bold" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}><Icon name="plus" className="w-4 h-4" /> Nuevo Usuario</button>
        </div>
      </div>
      <div className="space-y-3">
        {allUsers.map((u)=>(
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
              <button onClick={()=>{setEditUser(u);setShowForm(true);}} className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"><Icon name="edit" className="w-4 h-4" /></button>
              {u.id!==currentUser.id&&<button onClick={()=>onDelete(u.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Icon name="trash" className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
      </div>
      {showForm&&<UserForm user={editUser} onClose={()=>{setShowForm(false);setEditUser(null);}} />}
      {showProfile&&<ProfileModal onClose={()=>setShowProfile(false)} />}
    </div>
  );
};

// ─── VISTA ALUMNO ─────────────────────────────────────────────────────────────
const MiAsistenciaPage = ({ currentUser, students, asistencia }) => {
  const alumno = students.find((s)=>s.correo===currentUser.email);
  if (!alumno) return <div className="text-center py-20"><p className="text-6xl mb-4">🥋</p><h2 className="text-xl font-black text-white mb-2">Perfil no encontrado</h2><p className="text-slate-400 text-sm">Pide al administrador que vincule tu correo a tu ficha de alumno.</p></div>;
  const miAsist = asistencia.filter((a)=>a.alumno_id===alumno.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const presentes = miAsist.filter((a)=>a.presente).length;
  const pct = miAsist.length?Math.round((presentes/miAsist.length)*100):0;
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white/3 border border-amber-400/20 rounded-3xl p-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-[#020617] mx-auto mb-3" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>{alumno.nombres[0]}{alumno.apellidos[0]}</div>
        <h2 className="text-2xl font-black text-white">{alumno.nombres} {alumno.apellidos}</h2>
        <div className="flex justify-center gap-2 mt-2 flex-wrap"><BeltBadge cinturon={alumno.cinturon} /><MembresiaTag membresiaId={alumno.membresia} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-emerald-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{presentes}</p><p className="text-xs text-slate-400 mt-1">Presentes</p></div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{miAsist.length-presentes}</p><p className="text-xs text-slate-400 mt-1">Ausentes</p></div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-400" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>{pct}%</p><p className="text-xs text-slate-400 mt-1">Asistencia</p></div>
      </div>
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily:"'Bebas Neue',sans-serif" }}>HISTORIAL</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {miAsist.length===0&&<p className="text-slate-500 text-sm">Sin registros aún</p>}
          {miAsist.map((a)=>(
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

const MisPagosPage = ({ currentUser, students, pagos }) => {
  const alumno = students.find((s)=>s.correo===currentUser.email);
  if (!alumno) return <div className="text-center py-20"><p className="text-slate-400">Perfil no encontrado. Contacta al administrador.</p></div>;
  const misPagos = pagos.filter((p)=>p.alumno_id===alumno.id).sort((a,b)=>b.fecha_pago?.localeCompare(a.fecha_pago));
  const getDays = (f)=>Math.ceil((new Date(f)-today)/86400000);
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-4xl font-black text-white" style={{ fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em" }}>MIS PAGOS</h1>
      {misPagos.length===0&&<div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center"><p className="text-slate-400">Sin registros de pago</p></div>}
      <div className="space-y-3">
        {misPagos.map((p)=>{ const dias=getDays(p.fecha_vencimiento); return (
          <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div><p className="font-bold text-white">{p.tipo}</p><p className="text-xs text-slate-500">{p.fecha_pago} · {p.sede}</p></div>
              <div className="text-right"><p className="text-lg font-black text-white">${parseFloat(p.monto_pagado).toFixed(2)}<span className="text-sm text-slate-500">/${parseFloat(p.monto).toFixed(2)}</span></p><StatusBadge estado={p.estado} /></div>
            </div>
            <p className={`text-xs font-semibold ${dias<0?"text-red-400":dias<7?"text-amber-400":"text-emerald-400"}`}>{dias<0?`Vencido hace ${Math.abs(dias)} días`:`Vence en ${dias} días`}</p>
          </div>
        ); })}
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, p, a, e] = await Promise.all([
      db.get("students"),
      db.get("pagos"),
      db.get("asistencia"),
      db.get("eventos"),
    ]);
    setStudents(Array.isArray(s)?s:[]);
    setPagos(Array.isArray(p)?p:[]);
    setAsistencia(Array.isArray(a)?a:[]);
    setEventos(Array.isArray(e)?e:[]);
    setLoading(false);
  }, []);

  const reloadUsers = useCallback(async () => {
    const u = await db.get("users");
    setAllUsers(Array.isArray(u)?u:[]);
  }, []);

  useEffect(() => { if (user) { loadAll(); reloadUsers(); } }, [user]);

  const handleLogin = (u) => {
    setUser(u);
    const perms = PERMISOS[u.role]||[];
    setPage(perms[0]);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const perms = PERMISOS[user.role]||[];
  const allNavItems = [
    { id:"dashboard",     label:"Dashboard",    icon:"dashboard" },
    { id:"students",      label:"Alumnos",      icon:"students" },
    { id:"payments",      label:"Pagos",        icon:"payments" },
    { id:"attendance",    label:"Asistencia",   icon:"attendance" },
    { id:"belts",         label:"Cinturones",   icon:"belt" },
    { id:"finance",       label:"Finanzas",     icon:"finance" },
    { id:"events",        label:"Eventos",      icon:"calendar" },
    { id:"users",         label:"Usuarios",     icon:"users" },
    { id:"mi_asistencia", label:"Mi Asistencia",icon:"mi_asistencia" },
    { id:"mis_pagos",     label:"Mis Pagos",    icon:"mis_pagos" },
  ];
  const navItems = allNavItems.filter((n)=>perms.includes(n.id));
  const alerts = pagos.filter((p)=>p.estado==="vencido").length;
  const roleColors = { admin:"#f59e0b", profesor:"#3b82f6", alumno:"#22c55e" };

  const renderPage = () => {
    if (loading) return <Spinner />;
    switch(page) {
      case "dashboard":     return <DashboardPage students={students} pagos={pagos} asistencia={asistencia} />;
      case "students":      return <StudentsPage students={students} reload={loadAll} canEdit={user.role==="admin"} />;
      case "payments":      return <PaymentsPage students={students} pagos={pagos} reload={loadAll} />;
      case "attendance":    return <AttendancePage students={students} asistencia={asistencia} reload={loadAll} />;
      case "belts":         return <BeltsPage students={students} reload={loadAll} />;
      case "finance":       return <FinancePage pagos={pagos} />;
      case "events":        return <EventsPage eventos={eventos} reload={loadAll} />;
      case "users":         return <UsersPage currentUser={user} setCurrentUser={setUser} allUsers={allUsers} reloadUsers={reloadUsers} />;
      case "mi_asistencia": return <MiAsistenciaPage currentUser={user} students={students} asistencia={asistencia} />;
      case "mis_pagos":     return <MisPagosPage currentUser={user} students={students} pagos={pagos} />;
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
          {navItems.map((item)=>(
            <button key={item.id} onClick={()=>{ setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${page===item.id?"text-[#020617]":"text-slate-400 hover:text-white hover:bg-white/5"}`}
              style={page===item.id?{background:"linear-gradient(135deg,#f59e0b,#d97706)"}:{}}>
              <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />{item.label}
              {item.id==="payments"&&alerts>0&&<span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background:`${roleColors[user.role]||"#f59e0b"}30`, color:roleColors[user.role]||"#f59e0b" }}>{user.nombre?.[0]||"U"}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{user.nombre}</p><RoleBadge role={user.role} /></div>
            <button onClick={()=>setUser(null)} className="text-slate-500 hover:text-red-400 transition-colors"><Icon name="logout" className="w-4 h-4" /></button>
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
    </div>
  );
}
