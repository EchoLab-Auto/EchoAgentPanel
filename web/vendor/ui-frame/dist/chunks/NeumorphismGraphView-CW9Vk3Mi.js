import '../NeumorphismGraphView.css';var ft = Object.defineProperty;
var pt = (c, n, l) => n in c ? ft(c, n, { enumerable: !0, configurable: !0, writable: !0, value: l }) : c[n] = l;
var W = (c, n, l) => pt(c, typeof n != "symbol" ? n + "" : n, l);
import { defineComponent as mt, computed as b, ref as O, onMounted as gt, onBeforeUnmount as vt, watch as he, openBlock as ee, createElementBlock as te, normalizeStyle as Ze, createElementVNode as F, withModifiers as fe, unref as pe, createVNode as me, toDisplayString as Ke, createCommentVNode as je, Fragment as yt, renderList as xt, createTextVNode as bt } from "vue";
import { useLocale as wt } from "../composables/useLocale.js";
import { u as _t } from "./createComponent-jnXBYqCm.js";
import { N as ge } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as kt } from "./_plugin-vue_export-helper-CHgC5LLL.js";
const Mt = Math.PI * (3 - Math.sqrt(5));
function St(c, n) {
  const l = Math.sqrt(c + 0.5) * n, o = c * Mt;
  return { x: Math.cos(o) * l, y: Math.sin(o) * l };
}
function It(c, n = 0) {
  if (c.length === 0)
    return { minX: -n, minY: -n, maxX: n, maxY: n };
  let l = 1 / 0, o = 1 / 0, u = -1 / 0, g = -1 / 0;
  for (const a of c)
    a.x < l && (l = a.x), a.y < o && (o = a.y), a.x > u && (u = a.x), a.y > g && (g = a.y);
  return {
    minX: l - n,
    minY: o - n,
    maxX: u + n,
    maxY: g + n
  };
}
function Ce(c, n, l) {
  return !Number.isFinite(c) || c <= 0 ? n : Math.min(l, Math.max(n, c));
}
function At(c, n, l = 40, o = 0.1, u = 4) {
  const g = Math.max(1, c.maxX - c.minX), a = Math.max(1, c.maxY - c.minY), m = Math.max(1, n.width - l * 2), h = Math.max(1, n.height - l * 2), p = Ce(
    Math.min(m / g, h / a),
    o,
    u
  ), f = (c.minX + c.maxX) / 2, v = (c.minY + c.maxY) / 2;
  return {
    scale: p,
    tx: n.width / 2 - f * p,
    ty: n.height / 2 - v * p
  };
}
function Pe(c, n) {
  return { x: c.x * n.scale + n.tx, y: c.y * n.scale + n.ty };
}
function Re(c, n) {
  return { x: (c.x - n.tx) / n.scale, y: (c.y - n.ty) / n.scale };
}
function Lt(c, n, l, o = 0.1, u = 4) {
  const g = Ce(c.scale * n, o, u), a = g / c.scale;
  return {
    scale: g,
    tx: l.x - (l.x - c.tx) * a,
    ty: l.y - (l.y - c.ty) * a
  };
}
function Jt(c, n) {
  return Math.hypot(c.x - n.x, c.y - n.y);
}
const Dt = {
  linkDistance: 78,
  repulsion: 900,
  spring: 8e-3,
  gravity: 4e-4,
  velocityDecay: 0.4,
  maxSpeed: 10,
  maxRepulsionForce: 6,
  // alphaDecay = 0.0228 时 alpha 从 1 衰减到 0.001 约需 300 帧（60fps ≈ 5s）
  alphaDecay: 0.0228,
  alphaMin: 1e-3,
  alphaTarget: 0
}, Pt = 0.12, Rt = 8, $e = 1;
class Et {
  constructor(n = {}) {
    W(this, "nodes", []);
    W(this, "links", []);
    W(this, "settings");
    /** 动能已降到阈值以下——调用方可停止渲染循环 */
    W(this, "settled", !1);
    W(this, "_alpha", 1);
    W(this, "indexById", /* @__PURE__ */ new Map());
    this.settings = { ...Dt, ...n };
  }
  /**
   * 退火系数：1 = 满能量，衰减到 alphaMin 以下即静止。
   * 对外只读——外部只能通过 `wake()` / `reheat()` / `setData()` 影响它，
   * 免得调用方手动改温度破坏"确定性收敛"的前提。
   */
  get alpha() {
    return this._alpha;
  }
  /** 更新力学参数；参数变化会唤醒模拟 */
  setSettings(n) {
    this.settings = { ...this.settings, ...n }, this.wake();
  }
  /**
   * 用新数据重建模拟世界。
   *
   * 按 `id` 复用旧坐标：数据增删（例如过滤分组）时既有节点留在原位，
   * 只有新节点按黄金角螺旋补位，避免整图重排造成的视觉跳变。
   */
  setData(n, l, o) {
    const u = new Map(this.nodes.map((h) => [h.id, h])), g = o.preservePositions !== !1, a = Math.max(12, this.settings.linkDistance * 0.62);
    this.nodes = n.map((h, p) => {
      const f = g ? u.get(h.id) : void 0, v = St(p, a), M = (f == null ? void 0 : f.x) ?? h.x ?? v.x, L = (f == null ? void 0 : f.y) ?? h.y ?? v.y;
      return {
        id: h.id,
        x: M,
        y: L,
        vx: 0,
        vy: 0,
        fixed: h.fixed === !0,
        radius: o.nodeRadius,
        degree: 0
      };
    }), this.indexById = new Map(this.nodes.map((h, p) => [h.id, p]));
    const m = [];
    for (const h of l) {
      const p = this.indexById.get(h.source), f = this.indexById.get(h.target);
      p === void 0 || f === void 0 || p === f || (m.push({ source: p, target: f, weight: h.weight ?? 1 }), this.nodes[p].degree += 1, this.nodes[f].degree += 1);
    }
    this.links = m, this.nodes.forEach((h, p) => {
      var v;
      const f = (v = n[p]) == null ? void 0 : v.size;
      h.radius = f ?? o.nodeRadius * (1 + Math.min(h.degree, Rt) * Pt);
    }), this._alpha = 1, this.settled = !1;
  }
  /** 相邻节点 id 集合（含自身，便于"高亮自身 + 邻居"直接查表） */
  neighborsOf(n) {
    const l = /* @__PURE__ */ new Set([n]), o = this.indexById.get(n);
    if (o === void 0) return l;
    for (const u of this.links)
      u.source === o ? l.add(this.nodes[u.target].id) : u.target === o && l.add(this.nodes[u.source].id);
    return l;
  }
  getNode(n) {
    const l = this.indexById.get(n);
    return l === void 0 ? void 0 : this.nodes[l];
  }
  /**
   * 钉住某个节点（拖拽期间临时固定）。
   *
   * 只改坐标与固定标记、不做速度扰动——拖拽每帧都会调用它，
   * 若顺手 reheat 会让其余节点跟着抖动。
   */
  pin(n, l, o) {
    const u = this.getNode(n);
    u && (u.x = l, u.y = o, u.vx = 0, u.vy = 0, u.fixed = !0, this.wake());
  }
  /** 解除钉住并交还给模拟 */
  release(n) {
    const l = this.getNode(n);
    l && (l.fixed = !1, l.vx = 0, l.vy = 0, this.wake());
  }
  /**
   * 重新唤醒已静止的模拟（不改变既有速度）。
   *
   * `alpha` 抬到给定值而不重置为 1——交互（拖拽、改参数）只需局部舒展，
   * 满能量会让整图重新洗牌。
   */
  wake(n = 0.35) {
    this._alpha = Math.max(this._alpha, n), this.settled = !1;
  }
  /** 给所有可动节点一点确定性的扰动，让已静止的图重新舒展 */
  reheat(n = 0.6) {
    this._alpha = Math.min(1, Math.max(this._alpha, n)), this.settled = !1, this.nodes.forEach((l, o) => {
      if (l.fixed) return;
      const u = (((o + 1) * 9301 + 49297) % 233280 / 233280 - 0.5) * n, g = o * 2.399963;
      l.vx += Math.cos(g) * u, l.vy += Math.sin(g) * u;
    });
  }
  /** 预先跑若干帧，挂载时直接呈现基本成形的布局 */
  warmup(n) {
    for (let l = 0; l < n && !this.settled; l++) this.tick();
  }
  /** 推进一帧；返回是否仍在运动（已静止时直接返回，不再积分产生漂移） */
  tick() {
    if (this.settled) return !1;
    const { nodes: n, links: l, settings: o } = this, u = this._alpha, g = n.length;
    if (g === 0)
      return this.settled = !0, !1;
    for (let a = 0; a < g; a++) {
      const m = n[a];
      for (let h = a + 1; h < g; h++) {
        const p = n[h];
        let f = m.x - p.x, v = m.y - p.y, M = f * f + v * v;
        M < $e && (f = a % 7 - 3 + 0.25, v = h % 5 - 2 + 0.25, M = f * f + v * v, M < $e && (f = 0.5, v = 0.5, M = 0.5));
        const L = Math.sqrt(M), C = Math.min(o.repulsion / M, o.maxRepulsionForce) * u, T = f / L * C, ne = v / L * C;
        m.vx += T, m.vy += ne, p.vx -= T, p.vy -= ne;
      }
    }
    for (const a of l) {
      const m = n[a.source], h = n[a.target], p = h.x - m.x, f = h.y - m.y, v = Math.hypot(p, f) || 0.01, M = (v - o.linkDistance) * o.spring * a.weight * u, L = p / v * M, C = f / v * M;
      m.vx += L, m.vy += C, h.vx -= L, h.vy -= C;
    }
    for (const a of n) {
      if (a.fixed) {
        a.vx = 0, a.vy = 0;
        continue;
      }
      a.vx -= a.x * o.gravity * u, a.vy -= a.y * o.gravity * u;
      const m = 1 - o.velocityDecay;
      a.vx *= m, a.vy *= m;
      const h = Math.hypot(a.vx, a.vy);
      if (h > o.maxSpeed) {
        const p = o.maxSpeed / h;
        a.vx *= p, a.vy *= p;
      }
      a.x += a.vx, a.y += a.vy;
    }
    return this._alpha += (o.alphaTarget - this._alpha) * o.alphaDecay, this._alpha < o.alphaMin && (this._alpha = 0, this.settled = !0), !this.settled;
  }
}
const Nt = ["aria-label"], Ct = {
  key: 0,
  class: "nm-graph__controls"
}, Bt = ["aria-label"], zt = { class: "nm-graph__zoom" }, Ot = ["aria-label"], Ft = ["aria-label"], Tt = ["aria-label"], Vt = {
  key: 1,
  class: "nm-graph__legend"
}, Ee = 0.15, Ne = 4, Gt = 48, Xt = 0.85, Yt = 6, Je = 3, Wt = "500 12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", Ht = /* @__PURE__ */ mt({
  __name: "NeumorphismGraphView",
  props: {
    nodes: { default: () => [] },
    links: { default: () => [] },
    height: { default: "520px" },
    nodeRadius: { default: void 0 },
    linkDistance: { default: void 0 },
    repulsion: { default: void 0 },
    forceSettings: { default: void 0 },
    showLabels: { default: void 0 },
    showControls: { type: Boolean, default: void 0 },
    showLegend: { type: Boolean, default: !1 },
    highlightNeighbors: { type: Boolean, default: void 0 },
    draggable: { type: Boolean, default: void 0 },
    pannable: { type: Boolean, default: !0 },
    zoomable: { type: Boolean, default: !0 },
    autoFit: { type: Boolean, default: !0 },
    preservePositions: { type: Boolean, default: !0 },
    ariaLabel: { default: "" }
  },
  emits: ["node-click", "node-hover", "node-dblclick", "background-click", "zoom-change", "layout-start", "layout-settled"],
  setup(c, { expose: n, emit: l }) {
    const o = c, u = l, { t: g } = wt(), { config: a, resolveProp: m } = _t(), h = b(
      () => {
        var e;
        return m(o.nodeRadius, (e = a.value.graph) == null ? void 0 : e.nodeRadius, 7);
      }
    ), p = b(
      () => {
        var e;
        return m(o.linkDistance, (e = a.value.graph) == null ? void 0 : e.linkDistance, 78);
      }
    ), f = b(
      () => {
        var e;
        return m(o.repulsion, (e = a.value.graph) == null ? void 0 : e.repulsion, 900);
      }
    ), v = b(
      () => {
        var e;
        return m(o.showLabels, (e = a.value.graph) == null ? void 0 : e.showLabels, "auto");
      }
    ), M = b(
      () => {
        var e;
        return m(o.showControls, (e = a.value.graph) == null ? void 0 : e.showControls, !0);
      }
    ), L = b(
      () => {
        var e;
        return m(o.highlightNeighbors, (e = a.value.graph) == null ? void 0 : e.highlightNeighbors, !0);
      }
    ), C = b(
      () => {
        var e;
        return m(o.draggable, (e = a.value.graph) == null ? void 0 : e.draggable, !0);
      }
    ), T = b(() => ({
      ...o.forceSettings ?? {},
      linkDistance: p.value,
      repulsion: f.value
    })), ne = b(() => o.ariaLabel || g("graphLabel")), ve = [
      "#5a8def",
      "#3fb27f",
      "#e8a13a",
      "#e0655b",
      "#8d7bf0",
      "#2fb8c6",
      "#d0578f",
      "#7f8c9b"
    ], Qe = [
      "--nm-color-primary-500",
      "--nm-color-success-500",
      "--nm-color-warning-500",
      "--nm-color-error-500",
      "--nm-color-info-500",
      "--nm-color-primary-300",
      "--nm-color-success-300",
      "--nm-color-info-300"
    ], oe = O(), D = O(), $ = O({ width: 0, height: 0 }), Be = O(1), x = O({ scale: 1, tx: 0, ty: 0 }), ae = O(null), P = O(null), se = O("");
    let i = null;
    const et = b(
      () => typeof o.height == "number" ? `${o.height}px` : o.height
    ), ye = b(() => new Map(o.nodes.map((e) => [e.id, e]))), ze = b(() => {
      const e = /* @__PURE__ */ new Set();
      for (const t of o.nodes) e.add(t.group ?? "");
      return [...e].sort((t, s) => t.localeCompare(s));
    }), tt = b(() => {
      if (se.value, typeof document > "u") return ve;
      const e = getComputedStyle(document.documentElement), t = Qe.map((s) => e.getPropertyValue(s).trim()).filter(Boolean);
      return t.length > 0 ? t : ve;
    }), Oe = b(() => {
      const e = tt.value, t = /* @__PURE__ */ new Map();
      return ze.value.forEach((s, r) => {
        t.set(s, e[r % e.length] ?? ve[0]);
      }), t;
    }), ie = b(() => {
      se.value;
      const e = { text: "#8a8f98", textStrong: "#1f2430", accent: "#5a8def", bg: "#eceff3" };
      if (typeof document > "u") return e;
      const t = getComputedStyle(document.documentElement);
      return {
        text: t.getPropertyValue("--nm-text-secondary").trim() || e.text,
        textStrong: t.getPropertyValue("--nm-text-primary").trim() || e.textStrong,
        accent: t.getPropertyValue("--nm-primary-color").trim() || e.accent,
        bg: t.getPropertyValue("--nm-bg-color").trim() || e.bg
      };
    }), Fe = b(() => {
      const e = /* @__PURE__ */ new Map();
      for (const t of o.nodes)
        e.set(
          t.id,
          t.color ?? Oe.value.get(t.group ?? "") ?? ie.value.accent
        );
      return e;
    }), nt = b(() => {
      const e = /* @__PURE__ */ new Map();
      for (const t of o.nodes) e.set(t.id, t.label ?? t.id);
      return e;
    }), Te = b(
      () => ze.value.filter((e) => e !== "").map((e) => ({ name: e, color: Oe.value.get(e) ?? ie.value.accent }))
    ), ot = b(() => Math.round(x.value.scale * 100));
    function at(e) {
      return Fe.value.get(e.id) ?? ie.value.accent;
    }
    function xe() {
      i && (i.setSettings(T.value), i.setData(o.nodes, o.links, {
        nodeRadius: h.value,
        preservePositions: o.preservePositions
      }));
    }
    function be(e) {
      if (!i) return;
      const t = typeof window < "u" && typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      i.warmup(t ? Math.max(e, 400) : e);
    }
    function st(e) {
      x.value = e, u("zoom-change", e.scale), k();
    }
    function H() {
      const { width: e, height: t } = $.value;
      if (!i || e <= 0 || t <= 0 || i.nodes.length === 0) return;
      const s = i.nodes.map((y) => ({
        x: y.x,
        y: y.y
      })), r = i.nodes.reduce((y, R) => Math.max(y, R.radius), 0), d = It(s, r);
      x.value = At(d, { width: e, height: t }, Gt, Ee, Ne), u("zoom-change", x.value.scale), k();
    }
    function we(e, t) {
      const { width: s, height: r } = $.value, d = t ?? { x: s / 2, y: r / 2 };
      st(Lt(x.value, e, d, Ee, Ne));
    }
    function _e() {
      we(1.25);
    }
    function ke() {
      we(1 / 1.25);
    }
    function Ve(e) {
      const t = i == null ? void 0 : i.getNode(e);
      if (!t || !i) return;
      const { width: s, height: r } = $.value, d = Math.max(x.value.scale, 1);
      x.value = { scale: d, tx: s / 2 - t.x * d, ty: r / 2 - t.y * d }, u("zoom-change", x.value.scale), k();
    }
    function Ge() {
      i && (i.setData(o.nodes, o.links, {
        nodeRadius: h.value,
        preservePositions: !1
      }), be(200), o.autoFit && H(), G());
    }
    let V = 0, le = !1;
    function k() {
      G();
    }
    function G() {
      V || typeof requestAnimationFrame > "u" || (V = requestAnimationFrame(Xe));
    }
    function Xe() {
      V = 0;
      const e = i ? i.tick() : !1;
      if (it(), e) {
        V = requestAnimationFrame(Xe), le && (le = !1, u("layout-start"));
        return;
      }
      le || (le = !0, u("layout-settled"));
    }
    function it() {
      const e = D.value;
      if (!e) return;
      const t = e.getContext("2d");
      if (!t) return;
      const { width: s, height: r } = $.value;
      if (s <= 0 || r <= 0 || !i) return;
      const d = Be.value, y = Math.max(1, Math.round(s * d)), R = Math.max(1, Math.round(r * d));
      (e.width !== y || e.height !== R) && (e.width = y, e.height = R), t.setTransform(d, 0, 0, d, 0, 0), t.clearRect(0, 0, s, r);
      const I = ie.value, z = x.value, Z = ae.value ?? P.value, E = Z && L.value ? i.neighborsOf(Z) : null, Ue = v.value, ht = Ue === "always" || Ue === "auto" && z.scale >= Xt, Le = (_, w = 40) => _.x >= -w && _.x <= s + w && _.y >= -w && _.y <= r + w;
      t.lineCap = "round";
      for (const _ of i.links) {
        const w = i.nodes[_.source], N = i.nodes[_.target], K = Pe(w, z), j = Pe(N, z);
        if (!Le(K) && !Le(j)) continue;
        const ce = Z !== null && (w.id === Z || N.id === Z), ue = E !== null && E.has(w.id) && E.has(N.id);
        let de = I.text, Y = 0.16, De = 1;
        ce ? (de = I.accent, Y = 0.7, De = 1.8) : ue ? (de = I.accent, Y = 0.32, De = 1.3) : E && (Y = 0.05), t.globalAlpha = Y, t.strokeStyle = de, t.lineWidth = De, t.beginPath(), t.moveTo(K.x, K.y), t.lineTo(j.x, j.y), t.stroke();
      }
      for (const _ of i.nodes) {
        const w = Pe(_, z), N = Math.max(1.5, _.radius * z.scale);
        if (!Le(w, N + 60)) continue;
        const K = _.id === Z, j = E ? E.has(_.id) : !0, ce = E ? j ? 1 : 0.14 : 1, ue = at(_);
        if (t.globalAlpha = ce, j && (t.shadowColor = ue, t.shadowBlur = K ? 18 : 9), t.fillStyle = ue, t.beginPath(), t.arc(w.x, w.y, N, 0, Math.PI * 2), t.fill(), t.shadowBlur = 0, _.id === P.value && (t.globalAlpha = 1, t.strokeStyle = I.textStrong, t.lineWidth = 1.6, t.beginPath(), t.arc(w.x, w.y, N + 3, 0, Math.PI * 2), t.stroke()), !(ht || E !== null && E.has(_.id))) continue;
        const Y = nt.value.get(_.id) ?? _.id;
        t.font = Wt, t.textAlign = "left", t.textBaseline = "middle", t.globalAlpha = Math.max(ce, 0.55), t.strokeStyle = I.bg, t.lineWidth = 3, t.strokeText(Y, w.x + N + 5, w.y), t.fillStyle = K ? I.textStrong : I.text, t.fillText(Y, w.x + N + 5, w.y);
      }
      t.globalAlpha = 1;
    }
    let q = null, U = null;
    function Ye() {
      const e = oe.value;
      if (!e) return;
      const t = e.getBoundingClientRect(), s = t.width || e.clientWidth, r = t.height || e.clientHeight;
      s > 0 && r > 0 && ($.value = { width: s, height: r }), Be.value = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    }
    const S = /* @__PURE__ */ new Map();
    let B = null, Me = { x: 0, y: 0 }, J = !1, X = !1, Se = { x: 0, y: 0 }, Ie = { x: 0, y: 0 }, A = null, Ae = !1;
    function Q(e) {
      const t = D.value;
      if (!t) return { x: 0, y: 0 };
      const s = t.getBoundingClientRect();
      return { x: e.clientX - s.left, y: e.clientY - s.top };
    }
    function re(e) {
      if (!i) return null;
      const t = Re(e, x.value), s = Yt / x.value.scale;
      for (let r = i.nodes.length - 1; r >= 0; r--) {
        const d = i.nodes[r];
        if (Math.hypot(d.x - t.x, d.y - t.y) <= d.radius + s) return d;
      }
      return null;
    }
    function We(e) {
      const t = (e == null ? void 0 : e.id) ?? null;
      ae.value !== t && (ae.value = t, u("node-hover", t ? ye.value.get(t) ?? null : null), D.value && (D.value.style.cursor = t ? C.value ? "grab" : "pointer" : X ? "grabbing" : "default"), k());
    }
    function lt(e) {
      const t = D.value;
      if (!t) return;
      const s = Q(e);
      S.set(e.pointerId, s);
      try {
        t.setPointerCapture(e.pointerId);
      } catch {
      }
      if (S.size >= 2) {
        B = null, X = !1, Ae = !0;
        const [d, y] = [...S.values()];
        A = {
          distance: Math.max(1, Math.hypot(d.x - y.x, d.y - y.y)),
          center: { x: (d.x + y.x) / 2, y: (d.y + y.y) / 2 },
          view: { ...x.value }
        };
        return;
      }
      const r = re(s);
      if (r && C.value) {
        const d = Re(s, x.value);
        B = r.id, Me = { x: d.x - r.x, y: d.y - r.y }, J = !1, i == null || i.pin(r.id, r.x, r.y), t && (t.style.cursor = "grabbing");
        return;
      }
      !r && o.pannable && (X = !0, Ie = s, Se = { x: x.value.tx, y: x.value.ty }, t && (t.style.cursor = "grabbing"));
    }
    function rt(e) {
      const t = Q(e);
      if (S.has(e.pointerId) && S.set(e.pointerId, t), S.size >= 2 && A) {
        const [s, r] = [...S.values()], d = Math.max(1, Math.hypot(s.x - r.x, s.y - r.y)), y = { x: (s.x + r.x) / 2, y: (s.y + r.y) / 2 }, R = d / A.distance, I = Ce(A.view.scale * R, Ee, Ne), z = I / A.view.scale;
        x.value = {
          scale: I,
          tx: y.x - (A.center.x - A.view.tx) * z,
          ty: y.y - (A.center.y - A.view.ty) * z
        }, u("zoom-change", I), k();
        return;
      }
      if (B && i) {
        const s = Re(t, x.value);
        J = !0, i.pin(B, s.x - Me.x, s.y - Me.y), k();
        return;
      }
      if (X) {
        const s = t.x - Ie.x, r = t.y - Ie.y;
        (Math.abs(s) > Je || Math.abs(r) > Je) && (J = !0), x.value = { scale: x.value.scale, tx: Se.x + s, ty: Se.y + r }, k();
        return;
      }
      We(re(t));
    }
    function He(e) {
      const t = D.value, s = Q(e);
      S.delete(e.pointerId), S.size < 2 && (A = null);
      try {
        t == null || t.releasePointerCapture(e.pointerId);
      } catch {
      }
      const r = re(s), d = J || Ae, y = X;
      if (B && (i == null || i.release(B), B = null), X = !1, J = !1, S.size === 0 && (Ae = !1), t && (t.style.cursor = ae.value ? "grab" : "default"), !d && r) {
        P.value = r.id, u("node-click", ye.value.get(r.id) ?? { id: r.id }), k();
        return;
      }
      if (!d && y) {
        P.value = null, u("background-click"), k();
        return;
      }
      k();
    }
    function ct() {
      !B && !X && We(null);
    }
    function ut(e) {
      const t = re(Q(e));
      t && (Ve(t.id), u("node-dblclick", ye.value.get(t.id) ?? { id: t.id }));
    }
    function qe(e) {
      if (!o.zoomable) return;
      e.preventDefault();
      const t = Q(e), s = e.deltaY * (e.deltaMode === 1 ? 16 : 1), r = Math.exp(-s * 15e-4);
      we(r, t);
    }
    function dt(e) {
      const t = o.nodes, s = P.value ? t.findIndex((d) => d.id === P.value) : -1, r = (d) => {
        if (t.length === 0) return;
        const y = (s + d + t.length) % t.length, R = t[s === -1 ? 0 : y];
        P.value = R.id, u("node-hover", R), k();
      };
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          r(1), e.preventDefault();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          r(-1), e.preventDefault();
          break;
        case "Enter":
        case " ": {
          const d = t.find((y) => y.id === P.value);
          d && u("node-click", d), e.preventDefault();
          break;
        }
        case "+":
        case "=":
          _e(), e.preventDefault();
          break;
        case "-":
        case "_":
          ke(), e.preventDefault();
          break;
        case "0":
          H(), e.preventDefault();
          break;
        case "Escape":
          P.value = null, k();
          break;
      }
    }
    return gt(() => {
      var e;
      typeof window > "u" || (i = new Et(T.value), se.value = document.documentElement.getAttribute("data-theme") ?? "", U = new MutationObserver(() => {
        se.value = document.documentElement.getAttribute("data-theme") ?? "", k();
      }), U.observe(document.documentElement, {
        attributes: !0,
        attributeFilter: ["data-theme"]
      }), Ye(), xe(), be(320), o.autoFit && H(), typeof ResizeObserver < "u" && oe.value && (q = new ResizeObserver(() => {
        Ye(), k();
      }), q.observe(oe.value)), (e = D.value) == null || e.addEventListener("wheel", qe, { passive: !1 }), G());
    }), vt(() => {
      var e;
      V && cancelAnimationFrame(V), V = 0, q == null || q.disconnect(), q = null, U == null || U.disconnect(), U = null, (e = D.value) == null || e.removeEventListener("wheel", qe), S.clear(), i = null;
    }), he(
      () => [o.nodes, o.links],
      () => {
        i && (xe(), be(240), o.autoFit ? H() : k(), G());
      },
      { deep: !0 }
    ), he(
      T,
      () => {
        i && (i.setSettings(T.value), G());
      },
      { deep: !0 }
    ), he(h, () => {
      i && (xe(), i.wake(0.4), G());
    }), he(Fe, () => k()), n({
      /** 适应视图：把全部节点装进容器 */
      fit: H,
      zoomIn: _e,
      zoomOut: ke,
      /** 重新播种 + 重新布局 */
      resetLayout: Ge,
      /** 让已静止的布局重新舒展 */
      reheat: (e) => {
        i == null || i.reheat(e ?? 0.6), G();
      },
      /** 把某个节点移到视图中心 */
      focusNode: Ve,
      getZoom: () => x.value.scale,
      /** 当前退火系数（1 = 满能量，0 = 已静止）——用于展示动力学进度 */
      getAlpha: () => (i == null ? void 0 : i.alpha) ?? 0,
      /** 当前生效的力学参数（内置默认 + forceSettings + 专用 prop 合并后的结果） */
      getForceSettings: () => (i == null ? void 0 : i.settings) ?? null
    }), (e, t) => (ee(), te("div", {
      ref_key: "rootRef",
      ref: oe,
      class: "nm-graph",
      style: Ze({ height: et.value })
    }, [
      F("canvas", {
        ref_key: "canvasRef",
        ref: D,
        class: "nm-graph__canvas",
        tabindex: "0",
        role: "application",
        "aria-label": ne.value,
        onPointerdown: lt,
        onPointermove: rt,
        onPointerup: He,
        onPointercancel: He,
        onPointerleave: ct,
        onDblclick: ut,
        onKeydown: dt
      }, null, 40, Nt),
      M.value ? (ee(), te("div", Ct, [
        F("button", {
          type: "button",
          class: "nm-graph__btn",
          "aria-label": pe(g)("graphZoomOut"),
          onClick: fe(ke, ["stop"])
        }, [
          me(ge, {
            name: "zoom-out",
            size: "md"
          })
        ], 8, Bt),
        F("span", zt, Ke(ot.value) + "%", 1),
        F("button", {
          type: "button",
          class: "nm-graph__btn",
          "aria-label": pe(g)("graphZoomIn"),
          onClick: fe(_e, ["stop"])
        }, [
          me(ge, {
            name: "zoom-in",
            size: "md"
          })
        ], 8, Ot),
        t[0] || (t[0] = F("span", {
          class: "nm-graph__divider",
          "aria-hidden": "true"
        }, null, -1)),
        F("button", {
          type: "button",
          class: "nm-graph__btn",
          "aria-label": pe(g)("graphZoomFit"),
          onClick: fe(H, ["stop"])
        }, [
          me(ge, {
            name: "maximize",
            size: "md"
          })
        ], 8, Ft),
        F("button", {
          type: "button",
          class: "nm-graph__btn",
          "aria-label": pe(g)("graphRelayout"),
          onClick: fe(Ge, ["stop"])
        }, [
          me(ge, {
            name: "refresh",
            size: "md"
          })
        ], 8, Tt)
      ])) : je("", !0),
      c.showLegend && Te.value.length ? (ee(), te("div", Vt, [
        (ee(!0), te(yt, null, xt(Te.value, (s) => (ee(), te("span", {
          key: s.name,
          class: "nm-graph__legend-item"
        }, [
          F("i", {
            class: "nm-graph__legend-dot",
            style: Ze({ backgroundColor: s.color }),
            "aria-hidden": "true"
          }, null, 4),
          bt(" " + Ke(s.name), 1)
        ]))), 128))
      ])) : je("", !0)
    ], 4));
  }
}), Qt = /* @__PURE__ */ kt(Ht, [["__scopeId", "data-v-c2b5ead2"]]);
export {
  Dt as D,
  Et as F,
  Mt as G,
  Qt as N,
  St as a,
  It as b,
  Ce as c,
  Jt as d,
  At as f,
  Re as s,
  Pe as w,
  Lt as z
};
