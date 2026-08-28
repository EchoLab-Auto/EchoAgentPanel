import { defineComponent as we, computed as X, openBlock as A, createElementBlock as B, normalizeClass as ae, createElementVNode as P, unref as q, toDisplayString as ee, createCommentVNode as le, Fragment as ie, renderList as ce, createBlock as _e, ref as Q, watch as de, nextTick as ue, onBeforeUnmount as Ne, createVNode as ve, withCtx as Ce, normalizeStyle as Te, toRef as Ae, onMounted as Ye, getCurrentInstance as ze, render as ye, Transition as Ue, withModifiers as Ke, h as Ie } from "vue";
import { marked as Se } from "marked";
import { N as Fe } from "./NeumorphismCard-Bc1QAxUh.js";
import { escapeHtml as te, generateId as We, slugify as Be } from "../utils/index.js";
import { useLocale as Ee } from "../composables/useLocale.js";
import { useClipboard as Ve } from "../composables/useClipboard.js";
import { N as je } from "./NeumorphismCanvas-Dkp5eA0u.js";
import { _ as Ze } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../MarkdownRenderer.css';const Je = { class: "toc-item-row" }, Qe = ["aria-expanded", "aria-controls", "aria-label"], et = { "aria-hidden": "true" }, tt = ["data-toc-id", "aria-current"], nt = { class: "toc-text" }, ot = ["id"], Le = /* @__PURE__ */ we({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(o, { emit: l }) {
    const t = o, w = l, { t: C } = Ee(), M = X(() => t.activeHeading === t.node.id), $ = X(() => t.node.children.length > 0), p = X(() => t.collapsedGroups.has(t.node.id));
    function E(_) {
      _.stopPropagation(), w("toggle", t.node.id);
    }
    function b(_) {
      _.preventDefault(), w("select", t.node.id);
    }
    return (_, k) => (A(), B("li", {
      class: ae(["neumorphism-toc-item", { "has-children": $.value, active: M.value }]),
      role: "listitem"
    }, [
      P("div", Je, [
        $.value ? (A(), B("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !p.value,
          "aria-controls": `toc-list-${o.node.id}`,
          "aria-label": p.value ? q(C)("markdownTocExpand") : q(C)("markdownTocCollapse"),
          onClick: E
        }, [
          P("span", et, ee(p.value ? "▸" : "▾"), 1)
        ], 8, Qe)) : le("", !0),
        P("a", {
          href: "#",
          "data-toc-id": o.node.id,
          role: "button",
          "aria-current": M.value ? "location" : void 0,
          onClick: b
        }, [
          P("span", nt, ee(o.node.text), 1)
        ], 8, tt)
      ]),
      $.value && !p.value ? (A(), B("ul", {
        key: 0,
        id: `toc-list-${o.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (A(!0), B(ie, null, ce(o.node.children, (c) => (A(), _e(Le, {
          key: c.id,
          node: c,
          "active-heading": o.activeHeading,
          "collapsed-groups": o.collapsedGroups,
          onToggle: k[0] || (k[0] = (h) => _.$emit("toggle", h)),
          onSelect: k[1] || (k[1] = (h) => _.$emit("select", h))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, ot)) : le("", !0)
    ], 2));
  }
});
function Re() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function st(o) {
  const { content: l } = o, t = o.headingSelector ?? "h1, h2, h3", w = Q("");
  let C = !1, M = null;
  function $(f) {
    var L;
    const v = l.value;
    if (!v) return null;
    const T = (L = o.scrollContainer) == null ? void 0 : L.value;
    return T instanceof HTMLElement ? T : typeof T == "string" ? v.closest(T) : v.closest(".nm-layout__content");
  }
  function p(f) {
    const v = f ?? $();
    if (!v) return 64;
    const T = v.closest(".nm-layout"), L = T == null ? void 0 : T.querySelector(".nm-layout__header");
    return L ? L.getBoundingClientRect().height : 64;
  }
  function E(f) {
    var v;
    f !== w.value && (w.value = f, (v = o.onActiveChange) == null || v.call(o, f));
  }
  function b() {
    var N;
    const f = $();
    if (!f) return;
    const v = (N = l.value) == null ? void 0 : N.querySelectorAll(t);
    if (!v) return;
    const T = p(f) + 20;
    let L = "";
    for (const s of v) {
      const y = s.getBoundingClientRect(), x = f.getBoundingClientRect();
      if (y.top - x.top <= T)
        L = s.id;
      else
        break;
    }
    E(L);
  }
  function _() {
    C = !1, M && (clearTimeout(M), M = null), b();
  }
  function k(f) {
    var T, L;
    M && clearTimeout(M), C = !0, w.value = f, (T = o.onActiveChange) == null || T.call(o, f);
    const v = (L = l.value) == null ? void 0 : L.querySelector(`[id="${f}"]`);
    v && v.scrollIntoView({ behavior: Re() }), M = setTimeout(_, 800);
  }
  let c = null, h = null, i = -1;
  function a() {
    c == null || c.disconnect(), c = null, h == null || h.disconnect(), h = null;
  }
  function u() {
    a();
    const f = $();
    if (!f || !l.value) return;
    const v = p(f);
    i = v;
    const T = Array.from(l.value.querySelectorAll(t));
    if (T.length === 0) return;
    const L = /* @__PURE__ */ new Map();
    c = new IntersectionObserver(
      (y) => {
        if (C) return;
        for (const R of y)
          R.isIntersecting ? L.set(R.target, R.boundingClientRect.top) : L.delete(R.target);
        let x = "", I = -1 / 0;
        for (const [R, O] of L)
          O > I && (I = O, x = R.id);
        x && E(x);
      },
      {
        root: f,
        rootMargin: `-${v + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const y of T)
      c.observe(y);
    const N = f.closest(".nm-layout"), s = N == null ? void 0 : N.querySelector(".nm-layout__header");
    s && typeof ResizeObserver < "u" && (h = new ResizeObserver(() => {
      const y = s.getBoundingClientRect().height;
      y !== i && (i = y, ue(() => u()));
    }), h.observe(s));
  }
  return de(o.watchSource ? [l, o.watchSource] : [l], ([f]) => {
    f ? ue(() => {
      u(), b();
    }) : a();
  }), Ne(() => {
    a(), M && clearTimeout(M);
  }), { activeHeading: w, scrollToHeading: k, syncActiveHeading: b };
}
const at = ["aria-label"], rt = { class: "neumorphism-toc-header" }, lt = {
  class: "neumorphism-toc-list",
  role: "list"
}, it = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Pe = /* @__PURE__ */ we({
  __name: "DocTocNav",
  props: {
    items: {},
    activeId: { default: "" },
    title: { default: "" },
    framed: { type: Boolean, default: !0 },
    collapsedGroups: { default: void 0 }
  },
  emits: ["select", "update:collapsedGroups"],
  setup(o, { expose: l, emit: t }) {
    const w = o, C = t, { t: M } = Ee(), $ = X(() => w.title || M("markdownTocLabel")), p = Q(null), E = Q(/* @__PURE__ */ new Set()), b = X(() => w.collapsedGroups ?? E.value);
    function _(i) {
      w.collapsedGroups !== void 0 ? C("update:collapsedGroups", i) : E.value = i;
    }
    de(
      () => w.items,
      () => {
        w.collapsedGroups === void 0 && (E.value = /* @__PURE__ */ new Set());
      }
    );
    function k(i) {
      const a = new Set(b.value), u = a.has(i);
      u ? a.delete(i) : a.add(i), _(a), u && ue(() => c(i));
    }
    function c(i) {
      if (!p.value || window.innerWidth <= 1100) return;
      const a = p.value, u = a.querySelector(`[data-toc-id="${CSS.escape(i)}"]`);
      if (!u) return;
      const f = a.getBoundingClientRect(), v = u.closest(".neumorphism-toc-item"), T = Array.from((v == null ? void 0 : v.children) ?? []).find(
        (N) => N.classList.contains("neumorphism-toc-list")
      );
      if (T && T.getBoundingClientRect().bottom <= f.bottom + 10)
        return;
      const L = u.getBoundingClientRect().top - f.top + a.scrollTop;
      a.scrollTo({
        top: Math.max(0, L),
        behavior: Re()
      });
    }
    function h() {
      if (!p.value || window.innerWidth <= 1100) return;
      const i = p.value, a = i.querySelector(".neumorphism-toc-item.active");
      if (!a) return;
      const u = i.getBoundingClientRect(), f = a.getBoundingClientRect(), v = u.top + u.height * 0.25, T = u.top + u.height * 0.75;
      if (f.top >= v && f.bottom <= T)
        return;
      const N = f.top - u.top + i.scrollTop - f.height / 2 - u.height / 2;
      i.scrollTo({
        top: Math.max(0, N),
        behavior: Re()
      });
    }
    return de(
      () => w.activeId,
      (i) => {
        if (!i) return;
        function a(u) {
          for (const f of u) {
            if (f.id === i) return !0;
            if (a(f.children)) {
              if (b.value.has(f.id)) {
                const v = new Set(b.value);
                v.delete(f.id), _(v);
              }
              return !0;
            }
          }
          return !1;
        }
        a(w.items), ue(() => h());
      }
    ), l({ scrollTocToActive: h }), (i, a) => o.framed ? (A(), B("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: p,
      class: "neumorphism-toc",
      "aria-label": $.value
    }, [
      ve(Fe, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: Ce(() => [
          P("div", rt, [
            P("span", null, "📑 " + ee($.value), 1)
          ]),
          P("ul", lt, [
            (A(!0), B(ie, null, ce(o.items, (u) => (A(), _e(Le, {
              key: u.id,
              node: u,
              "active-heading": o.activeId,
              "collapsed-groups": b.value,
              onToggle: k,
              onSelect: a[0] || (a[0] = (f) => C("select", f))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, at)) : (A(), B("ul", it, [
      (A(!0), B(ie, null, ce(o.items, (u) => (A(), _e(Le, {
        key: u.id,
        node: u,
        "active-heading": o.activeId,
        "collapsed-groups": b.value,
        onToggle: k,
        onSelect: a[1] || (a[1] = (f) => C("select", f))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), ct = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, dt = /(#\s+.*$)/gm, ut = /(--\s.*$)/gm, ft = /$.^/gm, ht = /* @__PURE__ */ new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "python",
  "py",
  "yaml",
  "yml",
  "toml",
  "ruby",
  "rb",
  "ini",
  "makefile",
  "dockerfile"
]), mt = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function pt(o) {
  const l = (o ?? "").toLowerCase();
  return ht.has(l) ? dt : mt.has(l) ? ut : l === "html" || l === "xml" || l === "vue" ? ft : ct;
}
const gt = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, vt = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, wt = /\b([a-zA-Z_]\w*)(?=\()/g, xt = /\b(\d+\.?\d*)\b/g, yt = /\b([A-Z][a-zA-Z0-9_]*)\b/g, $t = /\u0001([a-z]+)\u0001/g;
function bt(o) {
  let l = o, t = "";
  do
    t = String.fromCharCode(97 + l % 26) + t, l = Math.floor(l / 26) - 1;
  while (l >= 0);
  return "" + t + "";
}
function kt(o) {
  let l = 0;
  for (const t of o) l = l * 26 + (t.charCodeAt(0) - 96);
  return l - 1;
}
function _t(o, l) {
  if (!l || l === "text" || l === "plain")
    return te(o);
  let t = te(o);
  const w = [], C = (M) => ($) => (w.push(`<span class="${M}">${$}</span>`), bt(w.length - 1));
  return t = t.replace(gt, C("token-string")), t = t.replace(pt(l), C("token-comment")), t = t.replace(vt, '<span class="token-keyword">$1</span>'), t = t.replace(wt, '<span class="token-function">$1</span>'), t = t.replace(xt, '<span class="token-number">$1</span>'), t = t.replace(yt, '<span class="token-type">$1</span>'), t = t.replace($t, (M, $) => w[kt($)]), t;
}
const Ct = { class: "code-block-wrapper doc-code-block" }, Mt = { class: "code-block-header" }, Et = { class: "code-lang" }, Tt = { class: "code-lines" }, St = ["aria-label"], Lt = { class: "code-block-body" }, Rt = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, Nt = ["innerHTML"], At = /* @__PURE__ */ we({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(o) {
    const l = o, { t } = Ee(), { copied: w, copy: C } = Ve({ resetDelay: 1500 }), M = X(() => l.lang || "text"), $ = X(() => _t(l.code, l.lang)), p = X(() => l.code.split(`
`).length), E = X(() => w.value ? t("markdownCodeCopied") : t("markdownCodeCopy"));
    return (b, _) => (A(), B("div", Ct, [
      P("div", Mt, [
        P("span", Et, ee(M.value), 1),
        P("span", Tt, ee(p.value) + " lines", 1),
        P("button", {
          type: "button",
          class: ae(["code-copy-btn", { copied: q(w) }]),
          "aria-label": E.value,
          onClick: _[0] || (_[0] = (k) => q(C)(o.code))
        }, ee(E.value), 11, St)
      ]),
      P("div", Lt, [
        o.showLineNumbers ? (A(), B("div", Rt, [
          (A(!0), B(ie, null, ce(p.value, (k) => (A(), B("span", {
            key: k,
            class: "line-num"
          }, ee(k), 1))), 128))
        ])) : le("", !0),
        P("pre", null, [
          P("code", {
            class: ae(`language-${M.value}`),
            innerHTML: $.value
          }, null, 10, Nt)
        ])
      ])
    ]));
  }
}), De = 44, He = 96, $e = 280, It = 16, Bt = 14, Pt = 8, Dt = 90, Oe = 28, se = 48, Ht = 4, be = 28, J = 20, Ot = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-�＀-￯]/;
function Gt(o) {
  let l = 0;
  for (const t of o)
    l += Ot.test(t) ? Bt : Pt;
  return l;
}
function qt(o) {
  const l = Gt(o.label) + It * 2;
  if (o.shape === "diamond") {
    const t = Math.min(Math.max(l * 1.5 + 32, He * 1.4), $e * 1.4);
    return { w: t, h: Math.max(64, t * 0.55) };
  }
  return l > $e ? { w: $e, h: De + 20 } : { w: Math.min(Math.max(l, He), $e), h: De };
}
function Ge(o, l = Ht) {
  const { nodes: t, edges: w, direction: C } = o, M = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (t.length === 0) return M;
  const $ = {};
  for (const e of t) $[e.id] = qt(e);
  const p = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Map();
  for (const e of t)
    p.set(e.id, []), E.set(e.id, 0);
  for (const e of w)
    !p.has(e.from) || !E.has(e.to) || (p.get(e.from).push(e.to), E.set(e.to, E.get(e.to) + 1));
  const b = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Set(), k = t.filter((e) => (E.get(e.id) ?? 0) === 0).map((e) => e.id), c = new Map(E);
  for (; k.length > 0; ) {
    const e = k.shift(), n = b.get(e) ?? 0;
    b.set(e, n);
    for (const r of p.get(e) ?? [])
      b.set(r, Math.max(b.get(r) ?? 0, n + 1)), c.set(r, c.get(r) - 1), c.get(r) === 0 && k.push(r);
  }
  for (const e of t) {
    if (b.has(e.id)) continue;
    let n = -1;
    for (const r of w)
      r.to === e.id && b.has(r.from) && (n = Math.max(n, b.get(r.from)));
    b.set(e.id, n + 1);
  }
  w.forEach((e, n) => {
    (b.get(e.to) ?? 0) <= (b.get(e.from) ?? 0) && _.add(n);
  });
  const h = Math.max(...b.values()), i = Array.from({ length: h + 1 }, () => []), a = new Map(t.map((e, n) => [e.id, n]));
  for (const e of t)
    i[b.get(e.id)].push(e.id);
  for (const e of i)
    e.sort((n, r) => a.get(n) - a.get(r));
  const u = /* @__PURE__ */ new Map();
  function f() {
    u.clear(), i.forEach((e) => e.forEach((n, r) => u.set(n, r)));
  }
  f();
  const v = /* @__PURE__ */ new Map();
  for (const e of w)
    v.has(e.to) || v.set(e.to, []), v.get(e.to).push(e.from);
  function T(e, n, r) {
    const g = (r.get(e) ?? []).filter((D) => n.has(D));
    return g.length === 0 ? u.get(e) : g.reduce((D, F) => D + (u.get(F) ?? 0), 0) / g.length;
  }
  for (let e = 0; e < l; e++) {
    for (let n = 1; n < i.length; n++) {
      const r = new Set(i[n - 1]);
      i[n].sort((g, H) => {
        const D = T(g, r, v), F = T(H, r, v);
        return D !== F ? D - F : u.get(g) - u.get(H);
      }), f();
    }
    for (let n = i.length - 2; n >= 0; n--) {
      const r = new Set(i[n + 1]);
      i[n].sort((g, H) => {
        const D = T(g, r, p), F = T(H, r, p);
        return D !== F ? D - F : u.get(g) - u.get(H);
      }), f();
    }
  }
  const L = C === "TB" || C === "BT", N = C === "RL" || C === "BT", s = i.map(
    (e) => e.reduce((n, r) => Math.max(n, L ? $[r].h : $[r].w), 0)
  ), y = i.map(
    (e) => e.reduce((n, r) => n + (L ? $[r].w : $[r].h), 0) + Math.max(e.length - 1, 0) * Oe
  ), x = Math.max(...y), I = [];
  {
    let e = se;
    for (let n = 0; n < i.length; n++)
      I.push(e), e += s[n] + Dt;
  }
  const R = /* @__PURE__ */ new Map();
  i.forEach((e, n) => {
    let r = se + (x - y[n]) / 2;
    for (const g of e) {
      const H = $[g].w, D = $[g].h, F = L ? D : H, W = I[n] + (s[n] - F) / 2;
      R.set(g, {
        id: g,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: L ? r : W,
        y: L ? W : r,
        w: H,
        h: D
      }), r += (L ? H : D) + Oe;
    }
  });
  let O = 0, Y = 0;
  for (const e of R.values())
    O = Math.max(O, e.x + e.w), Y = Math.max(Y, e.y + e.h);
  if (O += se, Y += se, N)
    for (const e of R.values())
      C === "RL" ? e.x = O - e.x - e.w : e.y = Y - e.y - e.h;
  {
    let e = !1;
    for (const n of t) {
      const r = R.get(n.id);
      r && (typeof n.x == "number" && (r.x = n.x, e = !0), typeof n.y == "number" && (r.y = n.y, e = !0));
    }
    if (e) {
      O = 0, Y = 0;
      for (const n of R.values())
        O = Math.max(O, n.x + n.w), Y = Math.max(Y, n.y + n.h);
      O += se, Y += se;
    }
  }
  const xe = Math.max(0, ...[...R.values()].map((e) => e.x + e.w)), fe = Math.max(0, ...[...R.values()].map((e) => e.y + e.h)), he = [], me = [], pe = [], m = [];
  i.forEach((e, n) => {
    let r = 1 / 0, g = -1 / 0, H = 1 / 0, D = -1 / 0;
    for (const F of e) {
      const W = R.get(F);
      W && (r = Math.min(r, W.x), g = Math.max(g, W.x + W.w), H = Math.min(H, W.y), D = Math.max(D, W.y + W.h));
    }
    he[n] = r, me[n] = g, pe[n] = H, m[n] = D;
  });
  const d = /* @__PURE__ */ new Map();
  {
    let e = 0;
    w.forEach((n, r) => {
      const g = Math.abs((b.get(n.to) ?? 0) - (b.get(n.from) ?? 0));
      (_.has(r) || g >= 2) && d.set(r, e++);
    });
  }
  const S = [];
  if (w.forEach((e, n) => {
    const r = R.get(e.from), g = R.get(e.to);
    if (!r || !g) return;
    const H = _.has(n), D = d.get(n);
    let F, W;
    if (D !== void 0) {
      const z = b.get(e.from) ?? 0, U = b.get(e.to) ?? 0;
      if (L) {
        const K = r.x + r.w / 2, V = N ? r.y : r.y + r.h, ne = g.x + g.w / 2, oe = N ? g.y : g.y + g.h, j = N ? pe[z] - J : m[z] + J, Z = N ? pe[U] - J : m[U] + J, G = xe + be + D * J;
        F = `M ${K},${V} L ${K},${j} L ${G},${j} L ${G},${Z} L ${ne},${Z} L ${ne},${oe}`, W = { x: G, y: (j + Z) / 2 };
      } else {
        const K = N ? r.x : r.x + r.w, V = r.y + r.h / 2, ne = N ? g.x : g.x + g.w, oe = g.y + g.h / 2, j = N ? he[z] - J : me[z] + J, Z = N ? he[U] - J : me[U] + J, G = fe + be + D * J;
        F = `M ${K},${V} L ${j},${V} L ${j},${G} L ${Z},${G} L ${Z},${oe} L ${ne},${oe}`, W = { x: (j + Z) / 2, y: G };
      }
    } else {
      let z, U, K, V, ne, oe, j, Z;
      if (L) {
        const G = N ? -1 : 1;
        z = r.x + r.w / 2, U = r.y + (G > 0 ? r.h : 0), K = g.x + g.w / 2, V = g.y + (G > 0 ? 0 : g.h);
        const ge = Math.max(40, Math.abs(V - U) / 2);
        ne = z, oe = U + ge * G, j = K, Z = V - ge * G;
      } else {
        const G = N ? -1 : 1;
        z = r.x + (G > 0 ? r.w : 0), U = r.y + r.h / 2, K = g.x + (G > 0 ? 0 : g.w), V = g.y + g.h / 2;
        const ge = Math.max(40, Math.abs(K - z) / 2);
        ne = z + ge * G, oe = U, j = K - ge * G, Z = V;
      }
      F = `M ${z},${U} C ${ne},${oe} ${j},${Z} ${K},${V}`, W = {
        x: (z + 3 * ne + 3 * j + K) / 8,
        y: (U + 3 * oe + 3 * Z + V) / 8
      };
    }
    S.push({ from: e.from, to: e.to, label: e.label, path: F, labelPos: W, isBackEdge: H });
  }), d.size > 0) {
    const e = d.size - 1;
    L ? O = Math.max(O, xe + be + e * J + se) : Y = Math.max(Y, fe + be + e * J + se);
  }
  return { nodes: R, edges: S, width: O, height: Y };
}
const Ft = { class: "nm-flow-canvas" }, Wt = ["width", "height"], Xt = ["id"], Yt = ["d", "marker-end"], zt = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], Ut = { class: "nm-flow__node-inner" }, Kt = { class: "nm-flow__node-text" }, Vt = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, jt = /* @__PURE__ */ we({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(o, { emit: l }) {
    const t = o, w = l, C = Q(), M = We("nm-flow-arrow"), $ = Q(null), p = X(() => {
      const s = $.value;
      if (!s) return Ge(t.graph);
      const y = t.graph.nodes.map(
        (x) => x.id === s.id ? { ...x, x: s.x, y: s.y } : x
      );
      return Ge({ ...t.graph, nodes: y });
    }), E = X(() => {
      const s = new Map(t.graph.nodes.map((y) => [y.id, y]));
      return [...p.value.nodes.values()].map((y) => {
        var x, I, R;
        return {
          ...y,
          shape: ((x = s.get(y.id)) == null ? void 0 : x.shape) ?? "rect",
          docPath: (I = s.get(y.id)) == null ? void 0 : I.docPath,
          label: ((R = s.get(y.id)) == null ? void 0 : R.label) ?? y.id
        };
      });
    }), b = X(() => p.value.edges.filter((s) => s.label));
    de(
      p,
      () => {
        $.value || ue(() => {
          requestAnimationFrame(() => {
            var s;
            return (s = C.value) == null ? void 0 : s.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let _ = !1;
    function k(s) {
      if (_) {
        _ = !1;
        return;
      }
      s && w("navigate", s);
    }
    const c = Q(null), h = Q(null);
    function i() {
      window.addEventListener("pointermove", f), window.addEventListener("pointerup", T), window.addEventListener("pointercancel", L);
    }
    function a() {
      window.removeEventListener("pointermove", f), window.removeEventListener("pointerup", T), window.removeEventListener("pointercancel", L);
    }
    function u(s, y) {
      var R;
      if (!t.editable || s.button !== 0) return;
      const x = (R = c.value) == null ? void 0 : R.getBoundingClientRect(), I = x && p.value.width > 0 ? x.width / p.value.width : 1;
      h.value = {
        id: y.id,
        startClientX: s.clientX,
        startClientY: s.clientY,
        lastClientX: s.clientX,
        lastClientY: s.clientY,
        scale: I || 1,
        baseX: y.x,
        baseY: y.y,
        moved: !1,
        raf: 0
      }, i();
    }
    function f(s) {
      const y = h.value;
      y && (y.lastClientX = s.clientX, y.lastClientY = s.clientY, y.raf || (y.raf = requestAnimationFrame(v)));
    }
    function v() {
      const s = h.value;
      if (!s) return;
      s.raf = 0;
      const y = (s.lastClientX - s.startClientX) / s.scale, x = (s.lastClientY - s.startClientY) / s.scale;
      !s.moved && Math.hypot(y, x) < 3 || (s.moved = !0, $.value = {
        id: s.id,
        x: Math.round(s.baseX + y),
        y: Math.round(s.baseY + x)
      });
    }
    function T() {
      a();
      const s = h.value;
      h.value = null, s != null && s.raf && cancelAnimationFrame(s.raf);
      const y = $.value;
      $.value = null, !(!(s != null && s.moved) || !y) && (_ = !0, setTimeout(() => {
        _ = !1;
      }, 0), w("nodeMove", { id: s.id, x: y.x, y: y.y }));
    }
    function L() {
      a();
      const s = h.value;
      h.value = null, s != null && s.raf && cancelAnimationFrame(s.raf), $.value = null;
    }
    Ne(() => {
      var s;
      a(), (s = h.value) != null && s.raf && cancelAnimationFrame(h.value.raf);
    });
    function N(s, y) {
      y && (s.key === "Enter" || s.key === " ") && (s.preventDefault(), w("navigate", y));
    }
    return (s, y) => (A(), B("div", Ft, [
      ve(je, {
        ref_key: "canvasRef",
        ref: C,
        width: "100%",
        height: o.height,
        "show-grid": o.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: Ce(() => [
          P("div", {
            ref_key: "flowEl",
            ref: c,
            class: ae(["nm-flow", { "nm-flow--editable": o.editable }]),
            style: Te({ width: `${p.value.width}px`, height: `${p.value.height}px` })
          }, [
            (A(), B("svg", {
              class: "nm-flow__edges",
              width: p.value.width,
              height: p.value.height,
              "aria-hidden": "true"
            }, [
              P("defs", null, [
                P("marker", {
                  id: q(M),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...y[0] || (y[0] = [
                  P("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, Xt)
              ]),
              (A(!0), B(ie, null, ce(p.value.edges, (x, I) => (A(), B("path", {
                key: I,
                d: x.path,
                class: ae(["nm-flow__edge", { "nm-flow__edge--back": x.isBackEdge }]),
                "marker-end": `url(#${q(M)})`
              }, null, 10, Yt))), 128))
            ], 8, Wt)),
            (A(!0), B(ie, null, ce(b.value, (x, I) => (A(), B("div", {
              key: `label-${I}`,
              class: "nm-flow__edge-label",
              style: Te({ left: `${x.labelPos.x}px`, top: `${x.labelPos.y}px` })
            }, ee(x.label), 5))), 128)),
            (A(!0), B(ie, null, ce(E.value, (x) => (A(), B("div", {
              key: x.id,
              class: ae(["nm-flow__node", [`nm-flow__node--${x.shape}`, { "nm-flow__node--link": x.docPath }]]),
              style: Te({
                left: `${x.x}px`,
                top: `${x.y}px`,
                width: `${x.w}px`,
                height: `${x.h}px`
              }),
              role: x.docPath ? "link" : void 0,
              tabindex: x.docPath ? 0 : void 0,
              "aria-label": x.docPath ? `${x.label}（跳转到文档）` : x.label,
              "data-nm-no-pan": "",
              onPointerdown: (I) => u(I, x),
              onClick: (I) => k(x.docPath),
              onKeydown: (I) => N(I, x.docPath)
            }, [
              P("div", Ut, [
                P("span", Kt, ee(x.label), 1),
                x.docPath ? (A(), B("span", Vt, "↗")) : le("", !0)
              ])
            ], 46, zt))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), Zt = /* @__PURE__ */ Ze(jt, [["__scopeId", "data-v-7c7a074c"]]), Jt = /^graph\s+(LR|RL|TB|BT)\s*$/i, re = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, ke = /-->\s*(?:\|([^|]*)\|)?/y, qe = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, Qt = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, Me = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function $n(o) {
  const l = [];
  Me.lastIndex = 0;
  let t;
  for (; (t = Me.exec(o)) !== null; )
    l.push(t[1]);
  return l;
}
function bn(o, l, t, w, C, M) {
  Me.lastIndex = 0;
  const $ = l.replace(/\r\n/g, `
`).trim();
  let p, E = -1;
  for (; (p = Me.exec(o)) !== null; ) {
    if (E++, M !== void 0 && E !== M) continue;
    const b = p[1];
    if (b.replace(/\r\n/g, `
`).trim() !== $) continue;
    const _ = new RegExp(
      `^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), k = b.split(`
`);
    let c = !1;
    for (let a = 0; a < k.length; a++) {
      const u = k[a].indexOf("%%"), f = u >= 0 ? k[a].slice(0, u) : k[a], v = u >= 0 ? k[a].slice(u) : "", T = f.trim();
      if (T.includes("-->") || !_.test(T)) continue;
      const L = T.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      k[a] = `${L} @ ${w}, ${C}${v ? `  ${v}` : ""}`, c = !0;
      break;
    }
    if (!c) {
      const a = `${t} @ ${w}, ${C}`;
      k.length > 0 && k[k.length - 1].trim() === "" ? k.splice(k.length - 1, 0, a) : k.push(a);
    }
    const h = k.join(`
`), i = p.index + p[0].indexOf(b);
    return o.slice(0, i) + h + o.slice(i + b.length);
  }
  return o;
}
function en(o) {
  return o ? o.startsWith("[/") && o.endsWith("/]") ? { shape: "rounded", text: o.slice(2, -2) } : o.startsWith("{") ? { shape: "diamond", text: o.slice(1, -1) } : o.startsWith("(") ? { shape: "stadium", text: o.slice(1, -1) } : { shape: "rect", text: o.slice(1, -1) } : { shape: "rect", text: "" };
}
function tn(o) {
  const l = o.trim(), t = l.split("|");
  if (t.length > 1) {
    const w = t[t.length - 1].trim();
    if (Qt.test(w))
      return {
        label: t.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: w.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: l };
}
function nn(o) {
  const l = [], t = /* @__PURE__ */ new Map(), w = /* @__PURE__ */ new Set(), C = [];
  let M = "LR", $ = !1;
  function p(c, h) {
    const { shape: i, text: a } = en(h), { label: u, docPath: f } = h ? tn(a) : { label: c, docPath: void 0 }, v = t.get(c);
    v ? h && (v.label = u, v.shape = i, f !== void 0 && (v.docPath = f)) : t.set(c, { id: c, label: u, shape: i, docPath: f });
  }
  function E(c, h, i) {
    const a = t.get(c);
    a && (a.x = h, a.y = i);
  }
  function b(c, h, i) {
    const a = `${c}→${h}${i ?? ""}`;
    w.has(a) || (w.add(a), C.push({ from: c, to: h, label: i }));
  }
  const _ = o.split(`
`);
  for (let c = 0; c < _.length; c++) {
    const h = c + 1, i = _[c].indexOf("%%"), a = (i >= 0 ? _[c].slice(0, i) : _[c]).trim();
    if (a) {
      if (!$) {
        const u = Jt.exec(a);
        u ? M = u[1].toUpperCase() : (l.push({
          line: h,
          source: _[c].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), k(a, h, _[c].trim())), $ = !0;
        continue;
      }
      k(a, h, _[c].trim());
    }
  }
  function k(c, h, i) {
    var v;
    let a = 0;
    re.lastIndex = 0, ke.lastIndex = 0, re.lastIndex = a;
    let u = re.exec(c);
    if (!u || u.index !== 0)
      return l.push({ line: h, source: i, message: "无法识别的语句" }), !1;
    let f = u[1];
    for (p(u[1], u[2]), a = re.lastIndex; ; ) {
      for (; a < c.length && /\s/.test(c[a]); ) a++;
      if (a >= c.length) break;
      if (c[a] === "@") {
        qe.lastIndex = a;
        const s = qe.exec(c);
        return s && s.index === a ? (E(f, parseFloat(s[1]), parseFloat(s[2])), !0) : (l.push({
          line: h,
          source: i,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      ke.lastIndex = a;
      const T = ke.exec(c);
      if (!T || T.index !== a)
        return l.push({
          line: h,
          source: i,
          message: `无法识别的内容: "${c.slice(a)}"`
        }), !1;
      const L = ((v = T[1]) == null ? void 0 : v.trim()) || void 0;
      for (a = ke.lastIndex; a < c.length && /\s/.test(c[a]); ) a++;
      if (re.lastIndex = a, u = re.exec(c), !u || u.index !== a)
        return l.push({ line: h, source: i, message: "箭头后缺少目标节点" }), !1;
      const N = u[1];
      p(u[1], u[2]), b(f, N, L), f = N, a = re.lastIndex;
    }
    return !0;
  }
  return {
    direction: M,
    nodes: [...t.values()],
    edges: C,
    errors: l
  };
}
function Xe(o) {
  return o.map((l) => {
    const t = l;
    return t.text ? String(t.text) : t.tokens ? Xe(t.tokens) : "";
  }).join("");
}
function on(o) {
  const l = We("toc");
  function t($) {
    return `${l}-${Be($)}`;
  }
  function w($) {
    const p = [], E = /* @__PURE__ */ new Set(), b = Se.lexer($);
    for (const _ of b)
      if (_.type === "heading") {
        const k = Xe(_.tokens);
        let c = Be(k);
        c || (c = "heading");
        let h = `${l}-${c}`, i = 1;
        for (; E.has(h); )
          h = `${l}-${c}-${i}`, i++;
        E.add(h), p.push({
          level: _.depth,
          text: k,
          id: h
        });
      }
    return p;
  }
  const C = X(() => w(o.value)), M = X(() => {
    const $ = C.value, p = [], E = [];
    for (const b of $) {
      const _ = { level: b.level, text: b.text, id: b.id, children: [] };
      for (; E.length > 0 && E[E.length - 1].level >= _.level; )
        E.pop();
      E.length === 0 ? p.push(_) : E[E.length - 1].children.push(_), E.push(_);
    }
    return p;
  });
  return { toc: C, tocTree: M, makeUniqueId: t };
}
const sn = { class: "neumorphism-markdown-body" }, an = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, rn = { class: "neumorphism-markdown-error-msg" }, ln = ["innerHTML"], cn = ["aria-label"], dn = { class: "neumorphism-toc-mobile-header" }, un = { class: "neumorphism-toc-mobile-title" }, fn = ["aria-label"], kn = /* @__PURE__ */ we({
  __name: "MarkdownRenderer",
  props: {
    content: {},
    className: { default: "" },
    showToc: { type: Boolean, default: !0 },
    scrollContainer: {},
    flowEditable: { type: Boolean, default: !1 }
  },
  emits: ["docLink", "flowNodeMove"],
  setup(o, { emit: l }) {
    const t = o, w = l, C = Q(null), M = Q(!1), { t: $ } = Ee(), { toc: p, tocTree: E, makeUniqueId: b } = on(Ae(t, "content"));
    function _(m) {
      N(m), M.value = !1;
    }
    const k = new Se.Renderer();
    k.code = ({ text: m, lang: d }) => d === "mermaid" ? `<div class="mermaid-diagram" data-mermaid="${te(m)}"><pre><code>${te(m)}</code></pre></div>` : d === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${te(m)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${te(d || "text")}"><pre><code>${te(m)}</code></pre></div>`, k.codespan = ({ text: m }) => `<code class="inline-code">${te(m)}</code>`, k.image = ({ href: m, title: d, text: S }) => `<img src="${m}" alt="${te(S)}" title="${te(d || "")}" loading="lazy" />`, k.listitem = function({ tokens: m, task: d, checked: S }) {
      if (d) {
        const e = this.parser.parse(m.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${S ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${e}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(m)}</li>`;
    };
    const c = Q(null), h = Q("");
    let i = null, a = !1, u = !1;
    function f() {
      a || (a = !0, import("dompurify").then((m) => {
        const d = m == null ? void 0 : m.default;
        d && typeof d.sanitize == "function" && (i = (S) => d.sanitize(S, {
          // Preserve the data-* hooks emitted by this renderer.
          ADD_ATTR: ["data-mermaid", "data-code", "data-heading-id", "data-lang", "target"]
        }), v());
      }).catch(() => {
        u || (u = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function v() {
      c.value = null;
      try {
        const m = p.value.map((n) => n.id);
        let d = 0;
        const S = Object.create(k);
        S.heading = ({ tokens: n, depth: r }) => {
          const g = T(n), H = m[d++] ?? b(g);
          return `<h${r} id="${H}"><a href="#" data-heading-id="${H}" class="heading-anchor" aria-hidden="true">#</a>${g}</h${r}>`;
        };
        const e = Se.parse(t.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: S
        });
        h.value = i ? i(e) : e;
      } catch (m) {
        c.value = m.message || "Unknown error rendering markdown", h.value = "";
      }
    }
    function T(m) {
      return m.map((d) => {
        const S = d;
        return S.text ? String(S.text) : S.tokens ? T(S.tokens) : "";
      }).join("");
    }
    f(), de(() => t.content, v, { immediate: !0 });
    const { activeHeading: L, scrollToHeading: N } = st({
      content: C,
      scrollContainer: Ae(t, "scrollContainer"),
      watchSource: () => h.value
    }), s = Q(/* @__PURE__ */ new Set());
    de(
      () => t.content,
      () => {
        s.value = /* @__PURE__ */ new Set();
      }
    );
    async function y() {
      if (!C.value) return;
      const m = C.value.querySelectorAll(".mermaid-diagram");
      if (m.length !== 0)
        try {
          const d = await import("mermaid").catch(() => null);
          if (!(d != null && d.default)) return;
          await d.default.run({
            nodes: Array.from(m)
          });
        } catch {
        }
    }
    de(h, () => {
      Y(), ue(x);
    }), Ye(x);
    function x() {
      y(), he(), me(), xe();
    }
    let I = [], R = null;
    const O = ze();
    function Y() {
      const m = /* @__PURE__ */ new Map();
      for (const d of I) {
        const S = m.get(d.key) ?? [];
        S.push({ rootEl: d.rootEl, ownerContainer: d.ownerContainer }), m.set(d.key, S);
      }
      I = [], R = m;
    }
    function xe() {
      if (R) {
        for (const m of R.values())
          for (const d of m)
            ye(null, d.ownerContainer);
        R = null;
      }
    }
    function fe(m, d, S) {
      const e = R == null ? void 0 : R.get(d), n = e == null ? void 0 : e.shift();
      if (e && e.length === 0 && (R == null || R.delete(d)), m.innerHTML = "", n) {
        m.appendChild(n.rootEl), I.push({
          key: d,
          rootEl: n.rootEl,
          ownerContainer: n.ownerContainer
        });
        return;
      }
      const r = S();
      r.appContext = (O == null ? void 0 : O.appContext) ?? null, ye(r, m);
      const g = m.firstElementChild;
      g && I.push({ key: d, rootEl: g, ownerContainer: m });
    }
    function he() {
      if (!C.value) return;
      C.value.querySelectorAll(".prodoc-flow-diagram").forEach((d, S) => {
        var r;
        const e = ((r = d.querySelector("pre code")) == null ? void 0 : r.textContent) ?? d.textContent ?? "", n = nn(e);
        n.nodes.length !== 0 && fe(
          d,
          `flow:${e}`,
          () => Ie(Zt, {
            graph: n,
            height: "420px",
            editable: t.flowEditable,
            onNavigate: (g) => w("docLink", g),
            onNodeMove: (g) => w("flowNodeMove", { ...g, source: e, blockIndex: S })
          })
        );
      });
    }
    function me() {
      var d;
      if (!C.value) return;
      const m = C.value.querySelectorAll(".doc-code-block-mount");
      for (const S of m) {
        const e = ((d = S.querySelector("pre code")) == null ? void 0 : d.textContent) ?? S.textContent ?? "", n = S.dataset.lang || "text";
        fe(S, `code:${n}:${e}`, () => Ie(At, { code: e, lang: n }));
      }
    }
    function pe(m) {
      const d = m.target, S = d.closest(".heading-anchor");
      if (S) {
        const n = S.dataset.headingId;
        n && (m.preventDefault(), N(n));
        return;
      }
      const e = d.closest("a");
      if (e) {
        const n = e.getAttribute("href");
        n && !n.startsWith("//") && (n.startsWith("/") || n.startsWith(".") || n.endsWith(".md")) && (m.preventDefault(), w("docLink", n));
      }
    }
    return Ne(() => {
      for (const m of I)
        ye(null, m.ownerContainer);
      if (I = [], R) {
        for (const m of R.values())
          for (const d of m)
            ye(null, d.ownerContainer);
        R = null;
      }
    }), (m, d) => (A(), B("div", {
      class: ae(`neumorphism-markdown ${t.className}`)
    }, [
      P("div", sn, [
        c.value ? (A(), B("div", an, [
          d[5] || (d[5] = P("p", { class: "neumorphism-markdown-error-title" }, "⚠️ 渲染错误", -1)),
          P("pre", rn, ee(c.value), 1)
        ])) : (A(), B("div", {
          key: 1,
          ref_key: "contentRef",
          ref: C,
          class: "neumorphism-markdown-content",
          onClick: pe,
          innerHTML: h.value
        }, null, 8, ln))
      ]),
      o.showToc && q(p).length > 0 ? (A(), _e(Pe, {
        key: 0,
        "collapsed-groups": s.value,
        "onUpdate:collapsedGroups": d[0] || (d[0] = (S) => s.value = S),
        items: q(E),
        "active-id": q(L),
        onSelect: q(N)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : le("", !0),
      o.showToc && q(p).length > 0 ? (A(), B("button", {
        key: 1,
        class: ae(["neumorphism-toc-mobile-btn", { active: M.value }]),
        "aria-label": q($)("markdownTocToggle"),
        onClick: d[1] || (d[1] = (S) => M.value = !M.value)
      }, " 📑 ", 10, cn)) : le("", !0),
      ve(Ue, { name: "neumorphism-toc-drawer" }, {
        default: Ce(() => [
          o.showToc && q(p).length > 0 && M.value ? (A(), B("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: d[4] || (d[4] = Ke((S) => M.value = !1, ["self"]))
          }, [
            ve(Fe, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: Ce(() => [
                P("div", dn, [
                  P("span", un, "📑 " + ee(q($)("markdownTocLabel")), 1),
                  P("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": q($)("markdownTocClose"),
                    onClick: d[2] || (d[2] = (S) => M.value = !1)
                  }, " ✕ ", 8, fn)
                ]),
                ve(Pe, {
                  "collapsed-groups": s.value,
                  "onUpdate:collapsedGroups": d[3] || (d[3] = (S) => s.value = S),
                  items: q(E),
                  "active-id": q(L),
                  framed: !1,
                  onSelect: _
                }, null, 8, ["collapsed-groups", "items", "active-id"])
              ]),
              _: 1
            })
          ])) : le("", !0)
        ]),
        _: 1
      })
    ], 2));
  }
});
export {
  Zt as D,
  kn as _,
  At as a,
  Pe as b,
  Le as c,
  st as d,
  $n as e,
  Re as g,
  _t as h,
  Ge as l,
  nn as p,
  on as u,
  bn as w
};
