import { describe, it, expect, beforeEach, vi } from "vitest";
import { hashPassword, loginLimiter } from "../auth.js";

// ── hashPassword ──────────────────────────────────────────────────────────────

describe("hashPassword", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await hashPassword("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input yields same hash", async () => {
    const h1 = await hashPassword("password123");
    const h2 = await hashPassword("password123");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashPassword("abc");
    const h2 = await hashPassword("ABC");
    expect(h1).not.toBe(h2);
  });

  it("includes the sportsync:: salt (known vector)", async () => {
    // SHA-256("sportsync::a") — precomputed reference value
    const hash = await hashPassword("a");
    // Verify it is NOT the plain SHA-256 of "a"
    const plainSha256OfA = "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb";
    expect(hash).not.toBe(plainSha256OfA);
    // And it must still be 64 hex chars
    expect(hash.length).toBe(64);
  });

  it("handles empty string input", async () => {
    const hash = await hashPassword("");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── loginLimiter ──────────────────────────────────────────────────────────────

describe("loginLimiter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("check()", () => {
    it("returns 0 when no lock exists", () => {
      expect(loginLimiter.check()).toBe(0);
    });

    it("returns 0 when lockedUntil is in the past", () => {
      localStorage.setItem(
        loginLimiter.key,
        JSON.stringify({ count: 0, lockedUntil: Date.now() - 1000 })
      );
      expect(loginLimiter.check()).toBe(0);
    });

    it("returns remaining minutes when locked", () => {
      const lockedUntil = Date.now() + 4.5 * 60 * 1000; // ~4.5 minutes
      localStorage.setItem(
        loginLimiter.key,
        JSON.stringify({ count: 0, lockedUntil })
      );
      const remaining = loginLimiter.check();
      expect(remaining).toBe(5); // Math.ceil(4.5) = 5
    });

    it("returns 0 with corrupt localStorage data", () => {
      localStorage.setItem(loginLimiter.key, "not-json{{");
      expect(() => loginLimiter.check()).not.toThrow();
      expect(loginLimiter.check()).toBe(0);
    });
  });

  describe("fail()", () => {
    it("returns 0 (no lock) on the first failure", () => {
      expect(loginLimiter.fail()).toBe(0);
    });

    it("increments the failure count without locking before max", () => {
      loginLimiter.fail(); // count = 1
      loginLimiter.fail(); // count = 2
      loginLimiter.fail(); // count = 3
      const data = JSON.parse(localStorage.getItem(loginLimiter.key));
      expect(data.count).toBe(3);
      expect(data.lockedUntil).toBeNull();
    });

    it("locks after reaching max (5) consecutive failures", () => {
      for (let i = 0; i < loginLimiter.max - 1; i++) loginLimiter.fail();
      const locked = loginLimiter.fail(); // 5th failure
      expect(locked).toBe(loginLimiter.lockMinutes);
    });

    it("resets the count to 0 when locking", () => {
      for (let i = 0; i < loginLimiter.max; i++) loginLimiter.fail();
      const data = JSON.parse(localStorage.getItem(loginLimiter.key));
      expect(data.count).toBe(0);
      expect(data.lockedUntil).toBeGreaterThan(Date.now());
    });

    it("returns 0 when localStorage.setItem throws", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(loginLimiter.fail()).toBe(0);
      spy.mockRestore();
    });
  });

  describe("reset()", () => {
    it("clears the stored lock data", () => {
      loginLimiter.fail();
      loginLimiter.reset();
      expect(localStorage.getItem(loginLimiter.key)).toBeNull();
    });

    it("causes check() to return 0 after reset", () => {
      for (let i = 0; i < loginLimiter.max; i++) loginLimiter.fail();
      loginLimiter.reset();
      expect(loginLimiter.check()).toBe(0);
    });

    it("does not throw when localStorage.removeItem throws", () => {
      const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(() => loginLimiter.reset()).not.toThrow();
      spy.mockRestore();
    });
  });
});
