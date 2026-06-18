// Pure date/membership utilities — no global state, fully testable.

export const fmt = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const calcEdad = (fechaNac, now = new Date()) => {
  if (!fechaNac) return { years: 0, months: 0, days: 0, total: 0 };
  const nac = new Date(fechaNac);
  let years = now.getFullYear() - nac.getFullYear();
  let months = now.getMonth() - nac.getMonth();
  let days = now.getDate() - nac.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months, days, total: years };
};

export const getCategoria = (fechaNac, currentYear = new Date().getFullYear()) => {
  if (!fechaNac) return "Infantil";
  const ageThisYear = currentYear - new Date(fechaNac).getFullYear();
  if (ageThisYear <= 11) return "Infantil";
  if (ageThisYear <= 14) return "Cadete";
  if (ageThisYear <= 17) return "Junior";
  if (ageThisYear <= 30) return "Senior";
  return "Máster";
};

// config: array of { id, duracion_meses } — usually CONFIG_MEMBRESIAS from the app
// now: injectable for testing, defaults to current date
export const calcVencimiento = (fechaBase, membresiaId, config = [], now = new Date()) => {
  if (!fechaBase) return fmt(addDays(now, 30));
  const base = new Date(fechaBase + "T12:00:00");
  const v = new Date(base);
  const cfg = config.find((m) => m.id === membresiaId);
  if (cfg) {
    v.setMonth(v.getMonth() + (parseInt(cfg.duracion_meses) || 1));
    return fmt(v);
  }
  if (membresiaId === "trimestral") v.setMonth(v.getMonth() + 3);
  else if (membresiaId === "semestral") v.setMonth(v.getMonth() + 6);
  else if (membresiaId === "anual") v.setFullYear(v.getFullYear() + 1);
  else v.setMonth(v.getMonth() + 1);
  return fmt(v);
};

export const calcNuevoVencimiento = (fechaVencActual, membresiaId, config = [], now = new Date()) => {
  const base = fechaVencActual ?? fmt(now);
  return calcVencimiento(base, membresiaId, config, now);
};
