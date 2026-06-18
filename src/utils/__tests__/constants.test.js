import { describe, it, expect } from "vitest";
import {
  CINTURONES,
  COSTOS_ASCENSO,
  MEMBRESIAS,
  PERMISOS,
  CINTURON_COLOR,
  PAGO_ESTADO_CONFIG,
  PRODUCTOS,
} from "../constants.js";

// ── CINTURONES ─────────────────────────────────────────────────────────────────

describe("CINTURONES", () => {
  it("contains 11 belt ranks", () => {
    expect(CINTURONES).toHaveLength(11);
  });

  it("starts with Blanco and ends with Negro", () => {
    expect(CINTURONES[0]).toBe("Blanco");
    expect(CINTURONES[CINTURONES.length - 1]).toBe("Negro");
  });

  it("has no duplicates", () => {
    expect(new Set(CINTURONES).size).toBe(CINTURONES.length);
  });
});

// ── COSTOS_ASCENSO ─────────────────────────────────────────────────────────────

describe("COSTOS_ASCENSO", () => {
  it("has an entry for every belt except the last progression from Negro", () => {
    expect(Object.keys(COSTOS_ASCENSO)).toHaveLength(CINTURONES.length);
  });

  it("Negro has no siguiente belt and costo 0", () => {
    expect(COSTOS_ASCENSO["Negro"].siguiente).toBeNull();
    expect(COSTOS_ASCENSO["Negro"].costo).toBe(0);
  });

  it("each non-Negro belt has a valid siguiente that exists in CINTURONES", () => {
    for (const [belt, { siguiente }] of Object.entries(COSTOS_ASCENSO)) {
      if (belt === "Negro") continue;
      expect(CINTURONES).toContain(siguiente);
    }
  });

  it("costo increases as rank goes higher", () => {
    const costs = CINTURONES.slice(0, -1).map((b) => COSTOS_ASCENSO[b].costo);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
    }
  });

  it("forms a complete chain from Blanco to Negro", () => {
    let current = "Blanco";
    const visited = [];
    while (current !== null) {
      visited.push(current);
      current = COSTOS_ASCENSO[current].siguiente;
    }
    expect(visited[visited.length - 1]).toBe("Negro");
    expect(visited).toHaveLength(CINTURONES.length);
  });
});

// ── MEMBRESIAS ────────────────────────────────────────────────────────────────

describe("MEMBRESIAS", () => {
  it("contains 6 default membership types", () => {
    expect(MEMBRESIAS).toHaveLength(6);
  });

  it("every membership has id, nombre, sesiones, and color", () => {
    for (const m of MEMBRESIAS) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("nombre");
      expect(m).toHaveProperty("sesiones");
      expect(m).toHaveProperty("color");
    }
  });

  it("ids are unique", () => {
    const ids = MEMBRESIAS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sesiones is a positive number for all entries", () => {
    for (const m of MEMBRESIAS) {
      expect(m.sesiones).toBeGreaterThan(0);
    }
  });
});

// ── PERMISOS ──────────────────────────────────────────────────────────────────

describe("PERMISOS", () => {
  it("defines exactly 4 roles", () => {
    expect(Object.keys(PERMISOS)).toHaveLength(4);
  });

  it("every role has a non-empty permissions array", () => {
    for (const [role, perms] of Object.entries(PERMISOS)) {
      expect(Array.isArray(perms), `${role} should have array`).toBe(true);
      expect(perms.length, `${role} should have at least 1 permission`).toBeGreaterThan(0);
    }
  });

  it("admin can access dashboard", () => {
    expect(PERMISOS.admin).toContain("dashboard");
  });

  it("alumno cannot access admin pages", () => {
    const adminOnly = ["dashboard", "payments", "finance", "users"];
    for (const page of adminOnly) {
      expect(PERMISOS.alumno).not.toContain(page);
    }
  });

  it("profesor cannot access finance or users", () => {
    expect(PERMISOS.profesor).not.toContain("finance");
    expect(PERMISOS.profesor).not.toContain("users");
  });
});

// ── CINTURON_COLOR ────────────────────────────────────────────────────────────

describe("CINTURON_COLOR", () => {
  it("has a color entry for every belt rank", () => {
    for (const belt of CINTURONES) {
      expect(CINTURON_COLOR).toHaveProperty(belt);
    }
  });

  it("all color values are valid CSS hex colors", () => {
    for (const color of Object.values(CINTURON_COLOR)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("Negro has a dark color", () => {
    // Negro should be very dark (low RGB values)
    const hex = CINTURON_COLOR["Negro"].slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r + g + b) / 3;
    expect(brightness).toBeLessThan(100);
  });
});

// ── PAGO_ESTADO_CONFIG ────────────────────────────────────────────────────────

describe("PAGO_ESTADO_CONFIG", () => {
  const requiredStates = ["pagado", "al día", "parcial", "vencido", "pendiente", "pausado"];

  it("covers all required payment states", () => {
    for (const state of requiredStates) {
      expect(PAGO_ESTADO_CONFIG).toHaveProperty(state);
    }
  });

  it("each state has bg, text, border, and label", () => {
    for (const [state, cfg] of Object.entries(PAGO_ESTADO_CONFIG)) {
      expect(cfg, `${state} missing bg`).toHaveProperty("bg");
      expect(cfg, `${state} missing text`).toHaveProperty("text");
      expect(cfg, `${state} missing border`).toHaveProperty("border");
      expect(cfg, `${state} missing label`).toHaveProperty("label");
    }
  });
});

// ── PRODUCTOS ─────────────────────────────────────────────────────────────────

describe("PRODUCTOS", () => {
  it("contains 15 products", () => {
    expect(PRODUCTOS).toHaveLength(15);
  });

  it("every product has id, nombre, precio, and cat", () => {
    for (const p of PRODUCTOS) {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("nombre");
      expect(p).toHaveProperty("precio");
      expect(p).toHaveProperty("cat");
    }
  });

  it("product ids are unique", () => {
    const ids = PRODUCTOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all prices are positive numbers", () => {
    for (const p of PRODUCTOS) {
      expect(p.precio).toBeGreaterThan(0);
    }
  });

  it("categories are one of the expected values", () => {
    const validCats = new Set(["bebidas", "implementos", "uniformes"]);
    for (const p of PRODUCTOS) {
      expect(validCats.has(p.cat)).toBe(true);
    }
  });
});
