// Authentication utilities — password hashing and login-attempt limiting.

export const hashPassword = async (plain) => {
  const data = new TextEncoder().encode("sportsync::" + plain);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const loginLimiter = {
  key: "ss-login-attempts",
  max: 5,
  lockMinutes: 5,

  check() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key) || "{}");
      if (d.lockedUntil && Date.now() < d.lockedUntil) {
        return Math.ceil((d.lockedUntil - Date.now()) / 60000);
      }
    } catch {}
    return 0;
  },

  fail() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key) || "{}");
      const count = (d.count || 0) + 1;
      const lockedUntil = count >= this.max ? Date.now() + this.lockMinutes * 60000 : null;
      localStorage.setItem(
        this.key,
        JSON.stringify({ count: lockedUntil ? 0 : count, lockedUntil })
      );
      return lockedUntil ? this.lockMinutes : 0;
    } catch {
      return 0;
    }
  },

  reset() {
    try {
      localStorage.removeItem(this.key);
    } catch {}
  },
};
