import { describe, it, expect } from "vitest";
import {
  fmt,
  addDays,
  calcEdad,
  getCategoria,
  calcVencimiento,
  calcNuevoVencimiento,
} from "../dates.js";

// ── fmt ───────────────────────────────────────────────────────────────────────

describe("fmt", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = fmt(new Date("2025-03-15T12:00:00"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats a specific date correctly", () => {
    // Use UTC noon to avoid any TZ shift changing the calendar day
    const d = new Date("2025-06-01T12:00:00Z");
    const result = fmt(d);
    // The exact value depends on local TZ; just verify the year is right
    expect(result.startsWith("2025-")).toBe(true);
  });
});

// ── addDays ───────────────────────────────────────────────────────────────────

describe("addDays", () => {
  it("adds positive days", () => {
    const d = new Date("2025-01-01");
    expect(addDays(d, 30).getDate()).toBe(31);
  });

  it("rolls over into the next month", () => {
    const d = new Date("2025-01-15");
    const result = addDays(d, 20);
    expect(result.getMonth()).toBe(1); // February (0-indexed)
    expect(result.getDate()).toBe(4);
  });

  it("does not mutate the input date", () => {
    const d = new Date("2025-01-01");
    addDays(d, 10);
    expect(d.getDate()).toBe(1);
  });

  it("handles negative days (subtraction)", () => {
    const d = new Date("2025-02-01");
    const result = addDays(d, -1);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(31);
  });
});

// ── calcEdad ──────────────────────────────────────────────────────────────────

describe("calcEdad", () => {
  it("returns zeros when fechaNac is null", () => {
    expect(calcEdad(null)).toEqual({ years: 0, months: 0, days: 0, total: 0 });
  });

  it("returns zeros when fechaNac is undefined", () => {
    expect(calcEdad(undefined)).toEqual({ years: 0, months: 0, days: 0, total: 0 });
  });

  it("computes exact years on the birthday", () => {
    const now = new Date("2025-06-15");
    const result = calcEdad("1990-06-15", now);
    expect(result.years).toBe(35);
    expect(result.months).toBe(0);
  });

  it("computes correct age one day before birthday", () => {
    const now = new Date("2025-06-14");
    const result = calcEdad("1990-06-15", now);
    expect(result.years).toBe(34);
  });

  it("handles birthday later in the year (not yet had birthday this year)", () => {
    const now = new Date("2025-06-15");
    const result = calcEdad("1990-12-25", now);
    expect(result.years).toBe(34);
  });

  it("total equals years", () => {
    const now = new Date("2025-06-15");
    const result = calcEdad("2000-01-01", now);
    expect(result.total).toBe(result.years);
  });
});

// ── getCategoria ──────────────────────────────────────────────────────────────

describe("getCategoria", () => {
  it("returns Infantil when fechaNac is null", () => {
    expect(getCategoria(null)).toBe("Infantil");
  });

  it("returns Infantil for age ≤ 11", () => {
    expect(getCategoria("2014-01-01", 2025)).toBe("Infantil"); // age = 11
    expect(getCategoria("2020-01-01", 2025)).toBe("Infantil"); // age = 5
  });

  it("returns Cadete for age 12–14", () => {
    expect(getCategoria("2013-01-01", 2025)).toBe("Cadete"); // age = 12
    expect(getCategoria("2011-01-01", 2025)).toBe("Cadete"); // age = 14
  });

  it("returns Junior for age 15–17", () => {
    expect(getCategoria("2010-01-01", 2025)).toBe("Junior"); // age = 15
    expect(getCategoria("2008-01-01", 2025)).toBe("Junior"); // age = 17
  });

  it("returns Senior for age 18–30", () => {
    expect(getCategoria("2007-01-01", 2025)).toBe("Senior"); // age = 18
    expect(getCategoria("1995-01-01", 2025)).toBe("Senior"); // age = 30
  });

  it("returns Máster for age > 30", () => {
    expect(getCategoria("1994-01-01", 2025)).toBe("Máster"); // age = 31
    expect(getCategoria("1970-01-01", 2025)).toBe("Máster"); // age = 55
  });
});

// ── calcVencimiento ───────────────────────────────────────────────────────────

describe("calcVencimiento", () => {
  const NOW = new Date("2025-06-15T12:00:00");

  it("returns 30 days from now when fechaBase is null", () => {
    const result = calcVencimiento(null, "basica", [], NOW);
    const expected = fmt(addDays(NOW, 30));
    expect(result).toBe(expected);
  });

  it("adds 1 month for an unknown/default membership type", () => {
    const result = calcVencimiento("2025-06-01", "basica", [], NOW);
    expect(result).toBe("2025-07-01");
  });

  it("adds 3 months for trimestral", () => {
    expect(calcVencimiento("2025-01-01", "trimestral", [], NOW)).toBe("2025-04-01");
  });

  it("adds 6 months for semestral", () => {
    expect(calcVencimiento("2025-01-01", "semestral", [], NOW)).toBe("2025-07-01");
  });

  it("adds 1 year for anual", () => {
    expect(calcVencimiento("2025-01-01", "anual", [], NOW)).toBe("2026-01-01");
  });

  it("uses duracion_meses from config when membership id matches", () => {
    const config = [{ id: "gold", duracion_meses: "3" }];
    expect(calcVencimiento("2025-01-01", "gold", config, NOW)).toBe("2025-04-01");
  });

  it("uses duracion_meses=1 when config value is invalid/zero", () => {
    const config = [{ id: "trial", duracion_meses: "0" }];
    const result = calcVencimiento("2025-01-01", "trial", config, NOW);
    expect(result).toBe("2025-02-01");
  });

  it("ignores config entries that don't match the membership id", () => {
    const config = [{ id: "other", duracion_meses: "12" }];
    const result = calcVencimiento("2025-01-01", "basica", config, NOW);
    expect(result).toBe("2025-02-01"); // falls back to +1 month
  });
});

// ── calcNuevoVencimiento ──────────────────────────────────────────────────────

describe("calcNuevoVencimiento", () => {
  const NOW = new Date("2025-06-15T12:00:00");

  it("extends from fechaVencActual when provided", () => {
    const result = calcNuevoVencimiento("2025-07-01", "basica", [], NOW);
    expect(result).toBe("2025-08-01");
  });

  it("extends from today when fechaVencActual is null", () => {
    const result = calcNuevoVencimiento(null, "basica", [], NOW);
    // fmt(NOW) = "2025-06-15" → +1 month = "2025-07-15"
    expect(result).toBe("2025-07-15");
  });

  it("extends from today when fechaVencActual is undefined", () => {
    const result = calcNuevoVencimiento(undefined, "basica", [], NOW);
    expect(result).toBe("2025-07-15");
  });

  it("correctly chains trimestral renewals", () => {
    // Renewing from an already-expired date, should extend from that date
    const result = calcNuevoVencimiento("2025-03-01", "trimestral", [], NOW);
    expect(result).toBe("2025-06-01");
  });
});
