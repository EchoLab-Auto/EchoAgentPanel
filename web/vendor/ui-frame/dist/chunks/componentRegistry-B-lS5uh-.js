var p = Object.defineProperty;
var a = (n, t, e) => t in n ? p(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var o = (n, t, e) => a(n, typeof t != "symbol" ? t + "" : t, e);
class m {
  constructor(t) {
    o(this, "_map", /* @__PURE__ */ new Map());
    o(this, "_presets", /* @__PURE__ */ new Map());
    if (t)
      for (const [e, r] of t)
        this._map.set(e, r);
  }
  /** Register or replace a component. Returns `this` for chaining. */
  register(t, e) {
    return this._map.set(t, e), this;
  }
  /** Retrieve a registered component by name. */
  get(t) {
    return this._map.get(t);
  }
  /** Check if a component name is registered. */
  has(t) {
    return this._map.has(t);
  }
  /** Delete a registered component. Returns true if it existed. */
  remove(t) {
    return this._map.delete(t);
  }
  /** Number of registered components. */
  get size() {
    return this._map.size;
  }
  /** Iterate all [name, component] entries. */
  entries() {
    return this._map.entries();
  }
  /** Iterate all component names. */
  names() {
    return this._map.keys();
  }
  // ---- Preset system ----
  /**
   * Register a named preset. Does NOT apply it — call `applyPreset(name)`
   * to activate, or pass the name to `install(app, prefix, presets)`.
   */
  registerPreset(t, e) {
    return this._presets.set(t, e), this;
  }
  /** Check if a preset is registered. */
  hasPreset(t) {
    return this._presets.has(t);
  }
  /**
   * Apply a registered preset: merge its component overrides and config
   * into the current registry state. Later presets override earlier ones.
   * Returns `this` for chaining.
   */
  applyPreset(t) {
    const e = this._presets.get(t);
    if (!e) return this;
    if (e.components)
      for (const [r, s] of Object.entries(e.components))
        this._map.set(r, s);
    return this;
  }
  /**
   * Collect config defaults from one or more named presets.
   * Returns a shallow-merged config object (later presets win).
   */
  getPresetConfig(...t) {
    const e = {};
    for (const r of t) {
      const s = this._presets.get(r);
      s != null && s.config && Object.assign(e, s.config);
    }
    return e;
  }
  /** Register all components onto a Vue App instance. */
  install(t, e = "", r) {
    if (r)
      for (const s of r) this.applyPreset(s);
    for (const [s, i] of this._map)
      t.component(`${e}${s}`, i);
    return this;
  }
}
export {
  m as C
};
