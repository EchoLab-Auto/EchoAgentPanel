import { ref as V, computed as G, watch as ue, onBeforeUnmount as Te, defineComponent as ke, openBlock as A, createElementBlock as O, normalizeClass as ne, createElementVNode as N, unref as I, toDisplayString as U, createCommentVNode as oe, Fragment as ge, renderList as we, createBlock as fe, nextTick as me, createVNode as H, withCtx as z, normalizeStyle as Pe, toRef as ze, onMounted as ct, getCurrentInstance as dt, render as Se, Transition as je, withModifiers as ut, h as Oe, createTextVNode as j, isRef as be } from "vue";
import { useTheme as ft } from "../composables/useTheme.js";
import { N as Qe } from "../chunks/NeumorphismLayout-GEx80IRW.js";
import { N as te } from "../chunks/NeumorphismButton-DEVgFO0I.js";
import { N as xe } from "../chunks/NeumorphismCard-BE0-5aJC.js";
import { N as Ze } from "../chunks/NeumorphismThemeToggle-Fx7ILGsu.js";
import { N as Je } from "../chunks/NeumorphismTree-DKdQqI-G.js";
import { N as et } from "../chunks/NeumorphismDivider-BYSWiIDi.js";
import { N as Me } from "../chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as tt } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as ht } from "../chunks/NeumorphismInput-BlgrjPEH.js";
import { marked as Ie } from "marked";
import { escapeHtml as he, generateId as nt, slugify as Fe } from "../utils/index.js";
import { useLocale as De } from "../composables/useLocale.js";
import { useClipboard as mt } from "../composables/useClipboard.js";
import { N as pt } from "../chunks/NeumorphismCanvas-_XC7PscV.js";
import { _ as Ae } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as vt } from "../chunks/NeumorphismTabs-Duap_z9d.js";
import { N as gt } from "../chunks/NeumorphismTextarea-CSZ2VWdh.js";
import '../index2.css';function yt(t) {
  var e;
  const o = ((e = t.path) == null ? void 0 : e.toLowerCase()) || "";
  return o.includes("api") ? "🔌" : o.includes("guide") ? "📖" : o.includes("config") ? "⚙️" : o.includes("example") ? "💡" : o.includes("install") ? "📦" : o.includes("changelog") ? "📝" : o.includes("faq") ? "❓" : "📄";
}
function ot(t) {
  const o = t.children.length > 0 ? "📁" : yt(t);
  return {
    key: t.path,
    label: t.title,
    icon: o,
    children: t.children.map(ot)
  };
}
function wt(t) {
  const o = /* @__PURE__ */ new Map();
  function e(p) {
    o.set(p.path, p);
    for (const u of p.children)
      e(u);
  }
  e(t);
  const d = /* @__PURE__ */ new Map();
  function v(p) {
    d.set(p.id, p);
    for (const u of p.children)
      v(u);
  }
  return v(t), {
    root: t,
    nodeMap: o,
    findByPath(p) {
      return o.get(p);
    },
    findById(p) {
      return d.get(p);
    }
  };
}
function Ho(t) {
  const o = [];
  function e(d) {
    o.push(d);
    for (const v of d.children)
      e(v);
  }
  return e(t), o;
}
function zo(t, o) {
  const e = [];
  function d(v, p, u) {
    if (v.id === p)
      return e.push(...u), !0;
    for (const i of v.children)
      if (d(i, p, [...u, v]))
        return !0;
    return !1;
  }
  return d(o, t.id, []), e;
}
function st(t) {
  var w;
  const { root: o, initialPath: e } = t, d = typeof window < "u", v = t.syncUrlHash !== !1 && d, p = d ? window.location.hash.slice(1) : "", u = e || p || ((w = o.children[0]) == null ? void 0 : w.path) || "", i = V(u), l = V([]), { theme: T, setTheme: E } = ft(), _ = G({
    get: () => T.value,
    set: (y) => E(y)
  }), f = G(() => o.children.map(ot)), b = V(i.value ? [i.value] : []);
  ue(i, (y) => {
    b.value = y ? [y] : [];
  });
  const h = G(() => wt(o)), c = G(() => {
    if (i.value)
      return h.value.findByPath(i.value);
  }), x = G(() => c.value || o.children[0]);
  function g(y) {
    i.value = y;
  }
  function M(y, B) {
    i.value = B, y("docLink", B);
  }
  const D = V(""), k = G(() => {
    if (!D.value.trim()) return [];
    const y = D.value.toLowerCase();
    return s(o).filter((P) => P.id === "root" ? !1 : P.title.toLowerCase().includes(y) || P.body.toLowerCase().includes(y)).slice(0, 10);
  });
  function r(y) {
    i.value = y.path, D.value = "";
  }
  function s(y) {
    const B = [y];
    for (const P of y.children)
      B.push(...s(P));
    return B;
  }
  if (ue(
    () => e,
    (y) => {
      y && (i.value = y);
    }
  ), v) {
    ue(i, (B) => {
      B && history.replaceState(null, "", `#${B}`);
    });
    const y = () => {
      const B = window.location.hash.slice(1);
      B && B !== i.value && (i.value = B);
    };
    window.addEventListener("hashchange", y), Te(() => {
      window.removeEventListener("hashchange", y);
    });
  }
  return {
    selectedPath: i,
    selectedKeys: b,
    expandedKeys: l,
    treeData: f,
    selectedNode: c,
    displayNode: x,
    docTree: h,
    themeModel: _,
    searchQuery: D,
    searchResults: k,
    handleTreeSelect: g,
    handleDocLink: M,
    handleSearchSelect: r
  };
}
const xt = /^graph\s+(LR|RL|TB|BT)\s*$/i, $e = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Ee = /-->\s*(?:\|([^|]*)\|)?/y, qe = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, kt = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, Re = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function $t(t) {
  const o = [];
  Re.lastIndex = 0;
  let e;
  for (; (e = Re.exec(t)) !== null; )
    o.push(e[1]);
  return o;
}
function Oo(t, o, e, d, v, p) {
  Re.lastIndex = 0;
  const u = o.replace(/\r\n/g, `
`).trim();
  let i, l = -1;
  for (; (i = Re.exec(t)) !== null; ) {
    if (l++, p !== void 0 && l !== p) continue;
    const T = i[1];
    if (T.replace(/\r\n/g, `
`).trim() !== u) continue;
    const E = new RegExp(
      `^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), _ = T.split(`
`);
    let f = !1;
    for (let c = 0; c < _.length; c++) {
      const x = _[c].indexOf("%%"), g = x >= 0 ? _[c].slice(0, x) : _[c], M = x >= 0 ? _[c].slice(x) : "", D = g.trim();
      if (D.includes("-->") || !E.test(D)) continue;
      const k = D.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      _[c] = `${k} @ ${d}, ${v}${M ? `  ${M}` : ""}`, f = !0;
      break;
    }
    if (!f) {
      const c = `${e} @ ${d}, ${v}`;
      _.length > 0 && _[_.length - 1].trim() === "" ? _.splice(_.length - 1, 0, c) : _.push(c);
    }
    const b = _.join(`
`), h = i.index + i[0].indexOf(T);
    return t.slice(0, h) + b + t.slice(h + T.length);
  }
  return t;
}
function bt(t) {
  return t ? t.startsWith("[/") && t.endsWith("/]") ? { shape: "rounded", text: t.slice(2, -2) } : t.startsWith("{") ? { shape: "diamond", text: t.slice(1, -1) } : t.startsWith("(") ? { shape: "stadium", text: t.slice(1, -1) } : { shape: "rect", text: t.slice(1, -1) } : { shape: "rect", text: "" };
}
function _t(t) {
  const o = t.trim(), e = o.split("|");
  if (e.length > 1) {
    const d = e[e.length - 1].trim();
    if (kt.test(d))
      return {
        label: e.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: d.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: o };
}
function lt(t) {
  const o = [], e = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Set(), v = [];
  let p = "LR", u = !1;
  function i(f, b) {
    const { shape: h, text: c } = bt(b), { label: x, docPath: g } = b ? _t(c) : { label: f, docPath: void 0 }, M = e.get(f);
    M ? b && (M.label = x, M.shape = h, g !== void 0 && (M.docPath = g)) : e.set(f, { id: f, label: x, shape: h, docPath: g });
  }
  function l(f, b, h) {
    const c = e.get(f);
    c && (c.x = b, c.y = h);
  }
  function T(f, b, h) {
    const c = `${f}→${b}${h ?? ""}`;
    d.has(c) || (d.add(c), v.push({ from: f, to: b, label: h }));
  }
  const E = t.split(`
`);
  for (let f = 0; f < E.length; f++) {
    const b = f + 1, h = E[f].indexOf("%%"), c = (h >= 0 ? E[f].slice(0, h) : E[f]).trim();
    if (c) {
      if (!u) {
        const x = xt.exec(c);
        x ? p = x[1].toUpperCase() : (o.push({
          line: b,
          source: E[f].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), _(c, b, E[f].trim())), u = !0;
        continue;
      }
      _(c, b, E[f].trim());
    }
  }
  function _(f, b, h) {
    var M;
    let c = 0;
    $e.lastIndex = 0, Ee.lastIndex = 0, $e.lastIndex = c;
    let x = $e.exec(f);
    if (!x || x.index !== 0)
      return o.push({ line: b, source: h, message: "无法识别的语句" }), !1;
    let g = x[1];
    for (i(x[1], x[2]), c = $e.lastIndex; ; ) {
      for (; c < f.length && /\s/.test(f[c]); ) c++;
      if (c >= f.length) break;
      if (f[c] === "@") {
        qe.lastIndex = c;
        const s = qe.exec(f);
        return s && s.index === c ? (l(g, parseFloat(s[1]), parseFloat(s[2])), !0) : (o.push({
          line: b,
          source: h,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Ee.lastIndex = c;
      const D = Ee.exec(f);
      if (!D || D.index !== c)
        return o.push({
          line: b,
          source: h,
          message: `无法识别的内容: "${f.slice(c)}"`
        }), !1;
      const k = ((M = D[1]) == null ? void 0 : M.trim()) || void 0;
      for (c = Ee.lastIndex; c < f.length && /\s/.test(f[c]); ) c++;
      if ($e.lastIndex = c, x = $e.exec(f), !x || x.index !== c)
        return o.push({ line: b, source: h, message: "箭头后缺少目标节点" }), !1;
      const r = x[1];
      i(x[1], x[2]), T(g, r, k), g = r, c = $e.lastIndex;
    }
    return !0;
  }
  return {
    direction: p,
    nodes: [...e.values()],
    edges: v,
    errors: o
  };
}
const We = "__hier_root";
function Ct(t) {
  const o = [
    {
      id: We,
      label: t.title,
      shape: "stadium",
      docPath: t.path || void 0
    }
  ], e = [];
  for (const d of t.children)
    o.push({
      id: d.id,
      label: d.title,
      // 有子级 = 可继续钻取（圆角），叶子 = 矩形
      shape: d.children.length > 0 ? "rounded" : "rect",
      docPath: d.path
    }), e.push({ from: We, to: d.id });
  return {
    // 子项较多时纵向排布更可读
    direction: t.children.length <= 5 ? "LR" : "TB",
    nodes: o,
    edges: e,
    errors: []
  };
}
function Ge(t) {
  for (const o of $t(t.body)) {
    const e = lt(o);
    if (e.nodes.length > 0) return e;
  }
  return t.children.length > 0 ? Ct(t) : null;
}
const Mt = { class: "toc-item-row" }, Tt = ["aria-expanded", "aria-controls", "aria-label"], St = { "aria-hidden": "true" }, Et = ["data-toc-id", "aria-current"], Nt = { class: "toc-text" }, Lt = ["id"], Be = /* @__PURE__ */ ke({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(t, { emit: o }) {
    const e = t, d = o, { t: v } = De(), p = G(() => e.activeHeading === e.node.id), u = G(() => e.node.children.length > 0), i = G(() => e.collapsedGroups.has(e.node.id));
    function l(E) {
      E.stopPropagation(), d("toggle", e.node.id);
    }
    function T(E) {
      E.preventDefault(), d("select", e.node.id);
    }
    return (E, _) => (A(), O("li", {
      class: ne(["neumorphism-toc-item", { "has-children": u.value, active: p.value }]),
      role: "listitem"
    }, [
      N("div", Mt, [
        u.value ? (A(), O("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !i.value,
          "aria-controls": `toc-list-${t.node.id}`,
          "aria-label": i.value ? I(v)("markdownTocExpand") : I(v)("markdownTocCollapse"),
          onClick: l
        }, [
          N("span", St, U(i.value ? "▸" : "▾"), 1)
        ], 8, Tt)) : oe("", !0),
        N("a", {
          href: "#",
          "data-toc-id": t.node.id,
          role: "button",
          "aria-current": p.value ? "location" : void 0,
          onClick: T
        }, [
          N("span", Nt, U(t.node.text), 1)
        ], 8, Et)
      ]),
      u.value && !i.value ? (A(), O("ul", {
        key: 0,
        id: `toc-list-${t.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (A(!0), O(ge, null, we(t.node.children, (f) => (A(), fe(Be, {
          key: f.id,
          node: f,
          "active-heading": t.activeHeading,
          "collapsed-groups": t.collapsedGroups,
          onToggle: _[0] || (_[0] = (b) => E.$emit("toggle", b)),
          onSelect: _[1] || (_[1] = (b) => E.$emit("select", b))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Lt)) : oe("", !0)
    ], 2));
  }
});
function He() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Rt(t) {
  const { content: o } = t, e = t.headingSelector ?? "h1, h2, h3", d = V("");
  let v = !1, p = null;
  function u(g) {
    var k;
    const M = o.value;
    if (!M) return null;
    const D = (k = t.scrollContainer) == null ? void 0 : k.value;
    return D instanceof HTMLElement ? D : typeof D == "string" ? M.closest(D) : M.closest(".nm-layout__content");
  }
  function i(g) {
    const M = g ?? u();
    if (!M) return 64;
    const D = M.closest(".nm-layout"), k = D == null ? void 0 : D.querySelector(".nm-layout__header");
    return k ? k.getBoundingClientRect().height : 64;
  }
  function l(g) {
    var M;
    g !== d.value && (d.value = g, (M = t.onActiveChange) == null || M.call(t, g));
  }
  function T() {
    var r;
    const g = u();
    if (!g) return;
    const M = (r = o.value) == null ? void 0 : r.querySelectorAll(e);
    if (!M) return;
    const D = i(g) + 20;
    let k = "";
    for (const s of M) {
      const w = s.getBoundingClientRect(), y = g.getBoundingClientRect();
      if (w.top - y.top <= D)
        k = s.id;
      else
        break;
    }
    l(k);
  }
  function E() {
    v = !1, p && (clearTimeout(p), p = null), T();
  }
  function _(g) {
    var D, k;
    p && clearTimeout(p), v = !0, d.value = g, (D = t.onActiveChange) == null || D.call(t, g);
    const M = (k = o.value) == null ? void 0 : k.querySelector(`[id="${g}"]`);
    M && M.scrollIntoView({ behavior: He() }), p = setTimeout(E, 800);
  }
  let f = null, b = null, h = -1;
  function c() {
    f == null || f.disconnect(), f = null, b == null || b.disconnect(), b = null;
  }
  function x() {
    c();
    const g = u();
    if (!g || !o.value) return;
    const M = i(g);
    h = M;
    const D = Array.from(o.value.querySelectorAll(e));
    if (D.length === 0) return;
    const k = /* @__PURE__ */ new Map();
    f = new IntersectionObserver(
      (w) => {
        if (v) return;
        for (const P of w)
          P.isIntersecting ? k.set(P.target, P.boundingClientRect.top) : k.delete(P.target);
        let y = "", B = -1 / 0;
        for (const [P, K] of k)
          K > B && (B = K, y = P.id);
        y && l(y);
      },
      {
        root: g,
        rootMargin: `-${M + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const w of D)
      f.observe(w);
    const r = g.closest(".nm-layout"), s = r == null ? void 0 : r.querySelector(".nm-layout__header");
    s && typeof ResizeObserver < "u" && (b = new ResizeObserver(() => {
      const w = s.getBoundingClientRect().height;
      w !== h && (h = w, me(() => x()));
    }), b.observe(s));
  }
  return ue(t.watchSource ? [o, t.watchSource] : [o], ([g]) => {
    g ? me(() => {
      x(), T();
    }) : c();
  }), Te(() => {
    c(), p && clearTimeout(p);
  }), { activeHeading: d, scrollToHeading: _, syncActiveHeading: T };
}
const Dt = ["aria-label"], At = { class: "neumorphism-toc-header" }, Pt = {
  class: "neumorphism-toc-list",
  role: "list"
}, It = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Ve = /* @__PURE__ */ ke({
  __name: "DocTocNav",
  props: {
    items: {},
    activeId: { default: "" },
    title: { default: "" },
    framed: { type: Boolean, default: !0 },
    collapsedGroups: { default: void 0 }
  },
  emits: ["select", "update:collapsedGroups"],
  setup(t, { expose: o, emit: e }) {
    const d = t, v = e, { t: p } = De(), u = G(() => d.title || p("markdownTocLabel")), i = V(null), l = V(/* @__PURE__ */ new Set()), T = G(() => d.collapsedGroups ?? l.value);
    function E(h) {
      d.collapsedGroups !== void 0 ? v("update:collapsedGroups", h) : l.value = h;
    }
    ue(
      () => d.items,
      () => {
        d.collapsedGroups === void 0 && (l.value = /* @__PURE__ */ new Set());
      }
    );
    function _(h) {
      const c = new Set(T.value), x = c.has(h);
      x ? c.delete(h) : c.add(h), E(c), x && me(() => f(h));
    }
    function f(h) {
      if (!i.value || window.innerWidth <= 1100) return;
      const c = i.value, x = c.querySelector(`[data-toc-id="${CSS.escape(h)}"]`);
      if (!x) return;
      const g = c.getBoundingClientRect(), M = x.closest(".neumorphism-toc-item"), D = Array.from((M == null ? void 0 : M.children) ?? []).find(
        (r) => r.classList.contains("neumorphism-toc-list")
      );
      if (D && D.getBoundingClientRect().bottom <= g.bottom + 10)
        return;
      const k = x.getBoundingClientRect().top - g.top + c.scrollTop;
      c.scrollTo({
        top: Math.max(0, k),
        behavior: He()
      });
    }
    function b() {
      if (!i.value || window.innerWidth <= 1100) return;
      const h = i.value, c = h.querySelector(".neumorphism-toc-item.active");
      if (!c) return;
      const x = h.getBoundingClientRect(), g = c.getBoundingClientRect(), M = x.top + x.height * 0.25, D = x.top + x.height * 0.75;
      if (g.top >= M && g.bottom <= D)
        return;
      const r = g.top - x.top + h.scrollTop - g.height / 2 - x.height / 2;
      h.scrollTo({
        top: Math.max(0, r),
        behavior: He()
      });
    }
    return ue(
      () => d.activeId,
      (h) => {
        if (!h) return;
        function c(x) {
          for (const g of x) {
            if (g.id === h) return !0;
            if (c(g.children)) {
              if (T.value.has(g.id)) {
                const M = new Set(T.value);
                M.delete(g.id), E(M);
              }
              return !0;
            }
          }
          return !1;
        }
        c(d.items), me(() => b());
      }
    ), o({ scrollTocToActive: b }), (h, c) => t.framed ? (A(), O("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: i,
      class: "neumorphism-toc",
      "aria-label": u.value
    }, [
      H(xe, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: z(() => [
          N("div", At, [
            N("span", null, "📑 " + U(u.value), 1)
          ]),
          N("ul", Pt, [
            (A(!0), O(ge, null, we(t.items, (x) => (A(), fe(Be, {
              key: x.id,
              node: x,
              "active-heading": t.activeId,
              "collapsed-groups": T.value,
              onToggle: _,
              onSelect: c[0] || (c[0] = (g) => v("select", g))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, Dt)) : (A(), O("ul", It, [
      (A(!0), O(ge, null, we(t.items, (x) => (A(), fe(Be, {
        key: x.id,
        node: x,
        "active-heading": t.activeId,
        "collapsed-groups": T.value,
        onToggle: _,
        onSelect: c[1] || (c[1] = (g) => v("select", g))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), Bt = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, Ht = /(#\s+.*$)/gm, zt = /(--\s.*$)/gm, Ot = /$.^/gm, Ft = /* @__PURE__ */ new Set([
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
]), qt = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function Wt(t) {
  const o = (t ?? "").toLowerCase();
  return Ft.has(o) ? Ht : qt.has(o) ? zt : o === "html" || o === "xml" || o === "vue" ? Ot : Bt;
}
const Gt = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, Vt = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, Xt = /\b([a-zA-Z_]\w*)(?=\()/g, Kt = /\b(\d+\.?\d*)\b/g, Ut = /\b([A-Z][a-zA-Z0-9_]*)\b/g, Yt = /\u0001([a-z]+)\u0001/g;
function jt(t) {
  let o = t, e = "";
  do
    e = String.fromCharCode(97 + o % 26) + e, o = Math.floor(o / 26) - 1;
  while (o >= 0);
  return "" + e + "";
}
function Qt(t) {
  let o = 0;
  for (const e of t) o = o * 26 + (e.charCodeAt(0) - 96);
  return o - 1;
}
function Zt(t, o) {
  if (!o || o === "text" || o === "plain")
    return he(t);
  let e = he(t);
  const d = [], v = (p) => (u) => (d.push(`<span class="${p}">${u}</span>`), jt(d.length - 1));
  return e = e.replace(Gt, v("token-string")), e = e.replace(Wt(o), v("token-comment")), e = e.replace(Vt, '<span class="token-keyword">$1</span>'), e = e.replace(Xt, '<span class="token-function">$1</span>'), e = e.replace(Kt, '<span class="token-number">$1</span>'), e = e.replace(Ut, '<span class="token-type">$1</span>'), e = e.replace(Yt, (p, u) => d[Qt(u)]), e;
}
const Jt = { class: "code-block-wrapper doc-code-block" }, en = { class: "code-block-header" }, tn = { class: "code-lang" }, nn = { class: "code-lines" }, on = ["aria-label"], sn = { class: "code-block-body" }, ln = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, an = ["innerHTML"], rn = /* @__PURE__ */ ke({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(t) {
    const o = t, { t: e } = De(), { copied: d, copy: v } = mt({ resetDelay: 1500 }), p = G(() => o.lang || "text"), u = G(() => Zt(o.code, o.lang)), i = G(() => o.code.split(`
`).length), l = G(() => d.value ? e("markdownCodeCopied") : e("markdownCodeCopy"));
    return (T, E) => (A(), O("div", Jt, [
      N("div", en, [
        N("span", tn, U(p.value), 1),
        N("span", nn, U(i.value) + " lines", 1),
        N("button", {
          type: "button",
          class: ne(["code-copy-btn", { copied: I(d) }]),
          "aria-label": l.value,
          onClick: E[0] || (E[0] = (_) => I(v)(t.code))
        }, U(l.value), 11, on)
      ]),
      N("div", sn, [
        t.showLineNumbers ? (A(), O("div", ln, [
          (A(!0), O(ge, null, we(i.value, (_) => (A(), O("span", {
            key: _,
            class: "line-num"
          }, U(_), 1))), 128))
        ])) : oe("", !0),
        N("pre", null, [
          N("code", {
            class: ne(`language-${p.value}`),
            innerHTML: u.value
          }, null, 10, an)
        ])
      ])
    ]));
  }
}), Xe = 44, Ke = 96, Ne = 280, cn = 16, dn = 14, un = 8, fn = 90, Ue = 28, ye = 48, hn = 4, Le = 28, de = 20, mn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-�＀-￯]/;
function pn(t) {
  let o = 0;
  for (const e of t)
    o += mn.test(e) ? dn : un;
  return o;
}
function vn(t) {
  const o = pn(t.label) + cn * 2;
  if (t.shape === "diamond") {
    const e = Math.min(Math.max(o * 1.5 + 32, Ke * 1.4), Ne * 1.4);
    return { w: e, h: Math.max(64, e * 0.55) };
  }
  return o > Ne ? { w: Ne, h: Xe + 20 } : { w: Math.min(Math.max(o, Ke), Ne), h: Xe };
}
function Ye(t, o = hn) {
  const { nodes: e, edges: d, direction: v } = t, p = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (e.length === 0) return p;
  const u = {};
  for (const n of e) u[n.id] = vn(n);
  const i = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
  for (const n of e)
    i.set(n.id, []), l.set(n.id, 0);
  for (const n of d)
    !i.has(n.from) || !l.has(n.to) || (i.get(n.from).push(n.to), l.set(n.to, l.get(n.to) + 1));
  const T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Set(), _ = e.filter((n) => (l.get(n.id) ?? 0) === 0).map((n) => n.id), f = new Map(l);
  for (; _.length > 0; ) {
    const n = _.shift(), a = T.get(n) ?? 0;
    T.set(n, a);
    for (const m of i.get(n) ?? [])
      T.set(m, Math.max(T.get(m) ?? 0, a + 1)), f.set(m, f.get(m) - 1), f.get(m) === 0 && _.push(m);
  }
  for (const n of e) {
    if (T.has(n.id)) continue;
    let a = -1;
    for (const m of d)
      m.to === n.id && T.has(m.from) && (a = Math.max(a, T.get(m.from)));
    T.set(n.id, a + 1);
  }
  d.forEach((n, a) => {
    (T.get(n.to) ?? 0) <= (T.get(n.from) ?? 0) && E.add(a);
  });
  const b = Math.max(...T.values()), h = Array.from({ length: b + 1 }, () => []), c = new Map(e.map((n, a) => [n.id, a]));
  for (const n of e)
    h[T.get(n.id)].push(n.id);
  for (const n of h)
    n.sort((a, m) => c.get(a) - c.get(m));
  const x = /* @__PURE__ */ new Map();
  function g() {
    x.clear(), h.forEach((n) => n.forEach((a, m) => x.set(a, m)));
  }
  g();
  const M = /* @__PURE__ */ new Map();
  for (const n of d)
    M.has(n.to) || M.set(n.to, []), M.get(n.to).push(n.from);
  function D(n, a, m) {
    const L = (m.get(n) ?? []).filter((X) => a.has(X));
    return L.length === 0 ? x.get(n) : L.reduce((X, Z) => X + (x.get(Z) ?? 0), 0) / L.length;
  }
  for (let n = 0; n < o; n++) {
    for (let a = 1; a < h.length; a++) {
      const m = new Set(h[a - 1]);
      h[a].sort((L, Y) => {
        const X = D(L, m, M), Z = D(Y, m, M);
        return X !== Z ? X - Z : x.get(L) - x.get(Y);
      }), g();
    }
    for (let a = h.length - 2; a >= 0; a--) {
      const m = new Set(h[a + 1]);
      h[a].sort((L, Y) => {
        const X = D(L, m, i), Z = D(Y, m, i);
        return X !== Z ? X - Z : x.get(L) - x.get(Y);
      }), g();
    }
  }
  const k = v === "TB" || v === "BT", r = v === "RL" || v === "BT", s = h.map(
    (n) => n.reduce((a, m) => Math.max(a, k ? u[m].h : u[m].w), 0)
  ), w = h.map(
    (n) => n.reduce((a, m) => a + (k ? u[m].w : u[m].h), 0) + Math.max(n.length - 1, 0) * Ue
  ), y = Math.max(...w), B = [];
  {
    let n = ye;
    for (let a = 0; a < h.length; a++)
      B.push(n), n += s[a] + fn;
  }
  const P = /* @__PURE__ */ new Map();
  h.forEach((n, a) => {
    let m = ye + (y - w[a]) / 2;
    for (const L of n) {
      const Y = u[L].w, X = u[L].h, Z = k ? X : Y, ee = B[a] + (s[a] - Z) / 2;
      P.set(L, {
        id: L,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: k ? m : ee,
        y: k ? ee : m,
        w: Y,
        h: X
      }), m += (k ? Y : X) + Ue;
    }
  });
  let K = 0, J = 0;
  for (const n of P.values())
    K = Math.max(K, n.x + n.w), J = Math.max(J, n.y + n.h);
  if (K += ye, J += ye, r)
    for (const n of P.values())
      v === "RL" ? n.x = K - n.x - n.w : n.y = J - n.y - n.h;
  {
    let n = !1;
    for (const a of e) {
      const m = P.get(a.id);
      m && (typeof a.x == "number" && (m.x = a.x, n = !0), typeof a.y == "number" && (m.y = a.y, n = !0));
    }
    if (n) {
      K = 0, J = 0;
      for (const a of P.values())
        K = Math.max(K, a.x + a.w), J = Math.max(J, a.y + a.h);
      K += ye, J += ye;
    }
  }
  const _e = Math.max(0, ...[...P.values()].map((n) => n.x + n.w)), F = Math.max(0, ...[...P.values()].map((n) => n.y + n.h)), S = [], q = [], W = [], C = [];
  h.forEach((n, a) => {
    let m = 1 / 0, L = -1 / 0, Y = 1 / 0, X = -1 / 0;
    for (const Z of n) {
      const ee = P.get(Z);
      ee && (m = Math.min(m, ee.x), L = Math.max(L, ee.x + ee.w), Y = Math.min(Y, ee.y), X = Math.max(X, ee.y + ee.h));
    }
    S[a] = m, q[a] = L, W[a] = Y, C[a] = X;
  });
  const $ = /* @__PURE__ */ new Map();
  {
    let n = 0;
    d.forEach((a, m) => {
      const L = Math.abs((T.get(a.to) ?? 0) - (T.get(a.from) ?? 0));
      (E.has(m) || L >= 2) && $.set(m, n++);
    });
  }
  const R = [];
  if (d.forEach((n, a) => {
    const m = P.get(n.from), L = P.get(n.to);
    if (!m || !L) return;
    const Y = E.has(a), X = $.get(a);
    let Z, ee;
    if (X !== void 0) {
      const se = T.get(n.from) ?? 0, le = T.get(n.to) ?? 0;
      if (k) {
        const ae = m.x + m.w / 2, re = r ? m.y : m.y + m.h, pe = L.x + L.w / 2, ve = r ? L.y : L.y + L.h, ie = r ? W[se] - de : C[se] + de, ce = r ? W[le] - de : C[le] + de, Q = _e + Le + X * de;
        Z = `M ${ae},${re} L ${ae},${ie} L ${Q},${ie} L ${Q},${ce} L ${pe},${ce} L ${pe},${ve}`, ee = { x: Q, y: (ie + ce) / 2 };
      } else {
        const ae = r ? m.x : m.x + m.w, re = m.y + m.h / 2, pe = r ? L.x : L.x + L.w, ve = L.y + L.h / 2, ie = r ? S[se] - de : q[se] + de, ce = r ? S[le] - de : q[le] + de, Q = F + Le + X * de;
        Z = `M ${ae},${re} L ${ie},${re} L ${ie},${Q} L ${ce},${Q} L ${ce},${ve} L ${pe},${ve}`, ee = { x: (ie + ce) / 2, y: Q };
      }
    } else {
      let se, le, ae, re, pe, ve, ie, ce;
      if (k) {
        const Q = r ? -1 : 1;
        se = m.x + m.w / 2, le = m.y + (Q > 0 ? m.h : 0), ae = L.x + L.w / 2, re = L.y + (Q > 0 ? 0 : L.h);
        const Ce = Math.max(40, Math.abs(re - le) / 2);
        pe = se, ve = le + Ce * Q, ie = ae, ce = re - Ce * Q;
      } else {
        const Q = r ? -1 : 1;
        se = m.x + (Q > 0 ? m.w : 0), le = m.y + m.h / 2, ae = L.x + (Q > 0 ? 0 : L.w), re = L.y + L.h / 2;
        const Ce = Math.max(40, Math.abs(ae - se) / 2);
        pe = se + Ce * Q, ve = le, ie = ae - Ce * Q, ce = re;
      }
      Z = `M ${se},${le} C ${pe},${ve} ${ie},${ce} ${ae},${re}`, ee = {
        x: (se + 3 * pe + 3 * ie + ae) / 8,
        y: (le + 3 * ve + 3 * ce + re) / 8
      };
    }
    R.push({ from: n.from, to: n.to, label: n.label, path: Z, labelPos: ee, isBackEdge: Y });
  }), $.size > 0) {
    const n = $.size - 1;
    k ? K = Math.max(K, _e + Le + n * de + ye) : J = Math.max(J, F + Le + n * de + ye);
  }
  return { nodes: P, edges: R, width: K, height: J };
}
const gn = { class: "nm-flow-canvas" }, yn = ["width", "height"], wn = ["id"], xn = ["d", "marker-end"], kn = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], $n = { class: "nm-flow__node-inner" }, bn = { class: "nm-flow__node-text" }, _n = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, Cn = /* @__PURE__ */ ke({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(t, { emit: o }) {
    const e = t, d = o, v = V(), p = nt("nm-flow-arrow"), u = V(null), i = G(() => {
      const s = u.value;
      if (!s) return Ye(e.graph);
      const w = e.graph.nodes.map(
        (y) => y.id === s.id ? { ...y, x: s.x, y: s.y } : y
      );
      return Ye({ ...e.graph, nodes: w });
    }), l = G(() => {
      const s = new Map(e.graph.nodes.map((w) => [w.id, w]));
      return [...i.value.nodes.values()].map((w) => {
        var y, B, P;
        return {
          ...w,
          shape: ((y = s.get(w.id)) == null ? void 0 : y.shape) ?? "rect",
          docPath: (B = s.get(w.id)) == null ? void 0 : B.docPath,
          label: ((P = s.get(w.id)) == null ? void 0 : P.label) ?? w.id
        };
      });
    }), T = G(() => i.value.edges.filter((s) => s.label));
    ue(
      i,
      () => {
        u.value || me(() => {
          requestAnimationFrame(() => {
            var s;
            return (s = v.value) == null ? void 0 : s.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let E = !1;
    function _(s) {
      if (E) {
        E = !1;
        return;
      }
      s && d("navigate", s);
    }
    const f = V(null), b = V(null);
    function h() {
      window.addEventListener("pointermove", g), window.addEventListener("pointerup", D), window.addEventListener("pointercancel", k);
    }
    function c() {
      window.removeEventListener("pointermove", g), window.removeEventListener("pointerup", D), window.removeEventListener("pointercancel", k);
    }
    function x(s, w) {
      var P;
      if (!e.editable || s.button !== 0) return;
      const y = (P = f.value) == null ? void 0 : P.getBoundingClientRect(), B = y && i.value.width > 0 ? y.width / i.value.width : 1;
      b.value = {
        id: w.id,
        startClientX: s.clientX,
        startClientY: s.clientY,
        lastClientX: s.clientX,
        lastClientY: s.clientY,
        scale: B || 1,
        baseX: w.x,
        baseY: w.y,
        moved: !1,
        raf: 0
      }, h();
    }
    function g(s) {
      const w = b.value;
      w && (w.lastClientX = s.clientX, w.lastClientY = s.clientY, w.raf || (w.raf = requestAnimationFrame(M)));
    }
    function M() {
      const s = b.value;
      if (!s) return;
      s.raf = 0;
      const w = (s.lastClientX - s.startClientX) / s.scale, y = (s.lastClientY - s.startClientY) / s.scale;
      !s.moved && Math.hypot(w, y) < 3 || (s.moved = !0, u.value = {
        id: s.id,
        x: Math.round(s.baseX + w),
        y: Math.round(s.baseY + y)
      });
    }
    function D() {
      c();
      const s = b.value;
      b.value = null, s != null && s.raf && cancelAnimationFrame(s.raf);
      const w = u.value;
      u.value = null, !(!(s != null && s.moved) || !w) && (E = !0, setTimeout(() => {
        E = !1;
      }, 0), d("nodeMove", { id: s.id, x: w.x, y: w.y }));
    }
    function k() {
      c();
      const s = b.value;
      b.value = null, s != null && s.raf && cancelAnimationFrame(s.raf), u.value = null;
    }
    Te(() => {
      var s;
      c(), (s = b.value) != null && s.raf && cancelAnimationFrame(b.value.raf);
    });
    function r(s, w) {
      w && (s.key === "Enter" || s.key === " ") && (s.preventDefault(), d("navigate", w));
    }
    return (s, w) => (A(), O("div", gn, [
      H(pt, {
        ref_key: "canvasRef",
        ref: v,
        width: "100%",
        height: t.height,
        "show-grid": t.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: z(() => [
          N("div", {
            ref_key: "flowEl",
            ref: f,
            class: ne(["nm-flow", { "nm-flow--editable": t.editable }]),
            style: Pe({ width: `${i.value.width}px`, height: `${i.value.height}px` })
          }, [
            (A(), O("svg", {
              class: "nm-flow__edges",
              width: i.value.width,
              height: i.value.height,
              "aria-hidden": "true"
            }, [
              N("defs", null, [
                N("marker", {
                  id: I(p),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...w[0] || (w[0] = [
                  N("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, wn)
              ]),
              (A(!0), O(ge, null, we(i.value.edges, (y, B) => (A(), O("path", {
                key: B,
                d: y.path,
                class: ne(["nm-flow__edge", { "nm-flow__edge--back": y.isBackEdge }]),
                "marker-end": `url(#${I(p)})`
              }, null, 10, xn))), 128))
            ], 8, yn)),
            (A(!0), O(ge, null, we(T.value, (y, B) => (A(), O("div", {
              key: `label-${B}`,
              class: "nm-flow__edge-label",
              style: Pe({ left: `${y.labelPos.x}px`, top: `${y.labelPos.y}px` })
            }, U(y.label), 5))), 128)),
            (A(!0), O(ge, null, we(l.value, (y) => (A(), O("div", {
              key: y.id,
              class: ne(["nm-flow__node", [`nm-flow__node--${y.shape}`, { "nm-flow__node--link": y.docPath }]]),
              style: Pe({
                left: `${y.x}px`,
                top: `${y.y}px`,
                width: `${y.w}px`,
                height: `${y.h}px`
              }),
              role: y.docPath ? "link" : void 0,
              tabindex: y.docPath ? 0 : void 0,
              "aria-label": y.docPath ? `${y.label}（跳转到文档）` : y.label,
              "data-nm-no-pan": "",
              onPointerdown: (B) => x(B, y),
              onClick: (B) => _(y.docPath),
              onKeydown: (B) => r(B, y.docPath)
            }, [
              N("div", $n, [
                N("span", bn, U(y.label), 1),
                y.docPath ? (A(), O("span", _n, "↗")) : oe("", !0)
              ])
            ], 46, kn))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), at = /* @__PURE__ */ Ae(Cn, [["__scopeId", "data-v-60e9c44f"]]);
function rt(t) {
  return t.map((o) => {
    const e = o;
    return e.text ? String(e.text) : e.tokens ? rt(e.tokens) : "";
  }).join("");
}
function Mn(t) {
  const o = nt("toc");
  function e(u) {
    return `${o}-${Fe(u)}`;
  }
  function d(u) {
    const i = [], l = /* @__PURE__ */ new Set(), T = Ie.lexer(u);
    for (const E of T)
      if (E.type === "heading") {
        const _ = rt(E.tokens);
        let f = Fe(_);
        f || (f = "heading");
        let b = `${o}-${f}`, h = 1;
        for (; l.has(b); )
          b = `${o}-${f}-${h}`, h++;
        l.add(b), i.push({
          level: E.depth,
          text: _,
          id: b
        });
      }
    return i;
  }
  const v = G(() => d(t.value)), p = G(() => {
    const u = v.value, i = [], l = [];
    for (const T of u) {
      const E = { level: T.level, text: T.text, id: T.id, children: [] };
      for (; l.length > 0 && l[l.length - 1].level >= E.level; )
        l.pop();
      l.length === 0 ? i.push(E) : l[l.length - 1].children.push(E), l.push(E);
    }
    return i;
  });
  return { toc: v, tocTree: p, makeUniqueId: e };
}
const Tn = { class: "neumorphism-markdown-body" }, Sn = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, En = { class: "neumorphism-markdown-error-msg" }, Nn = ["innerHTML"], Ln = ["aria-label"], Rn = { class: "neumorphism-toc-mobile-header" }, Dn = { class: "neumorphism-toc-mobile-title" }, An = ["aria-label"], it = /* @__PURE__ */ ke({
  __name: "MarkdownRenderer",
  props: {
    content: {},
    className: { default: "" },
    showToc: { type: Boolean, default: !0 },
    scrollContainer: {},
    flowEditable: { type: Boolean, default: !1 }
  },
  emits: ["docLink", "flowNodeMove"],
  setup(t, { emit: o }) {
    const e = t, d = o, v = V(null), p = V(!1), { t: u } = De(), { toc: i, tocTree: l, makeUniqueId: T } = Mn(ze(e, "content"));
    function E(C) {
      r(C), p.value = !1;
    }
    const _ = new Ie.Renderer();
    _.code = ({ text: C, lang: $ }) => $ === "mermaid" ? `<div class="mermaid-diagram" data-mermaid="${he(C)}"><pre><code>${he(C)}</code></pre></div>` : $ === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${he(C)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${he($ || "text")}"><pre><code>${he(C)}</code></pre></div>`, _.codespan = ({ text: C }) => `<code class="inline-code">${he(C)}</code>`, _.image = ({ href: C, title: $, text: R }) => `<img src="${C}" alt="${he(R)}" title="${he($ || "")}" loading="lazy" />`, _.listitem = function({ tokens: C, task: $, checked: R }) {
      if ($) {
        const n = this.parser.parse(C.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${R ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${n}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(C)}</li>`;
    };
    const f = V(null), b = V("");
    let h = null, c = !1, x = !1;
    function g() {
      c || (c = !0, import("dompurify").then((C) => {
        const $ = C == null ? void 0 : C.default;
        $ && typeof $.sanitize == "function" && (h = (R) => $.sanitize(R, {
          // Preserve the data-* hooks emitted by this renderer.
          ADD_ATTR: ["data-mermaid", "data-code", "data-heading-id", "data-lang", "target"]
        }), M());
      }).catch(() => {
        x || (x = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function M() {
      f.value = null;
      try {
        const C = i.value.map((a) => a.id);
        let $ = 0;
        const R = Object.create(_);
        R.heading = ({ tokens: a, depth: m }) => {
          const L = D(a), Y = C[$++] ?? T(L);
          return `<h${m} id="${Y}"><a href="#" data-heading-id="${Y}" class="heading-anchor" aria-hidden="true">#</a>${L}</h${m}>`;
        };
        const n = Ie.parse(e.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: R
        });
        b.value = h ? h(n) : n;
      } catch (C) {
        f.value = C.message || "Unknown error rendering markdown", b.value = "";
      }
    }
    function D(C) {
      return C.map(($) => {
        const R = $;
        return R.text ? String(R.text) : R.tokens ? D(R.tokens) : "";
      }).join("");
    }
    g(), ue(() => e.content, M, { immediate: !0 });
    const { activeHeading: k, scrollToHeading: r } = Rt({
      content: v,
      scrollContainer: ze(e, "scrollContainer"),
      watchSource: () => b.value
    }), s = V(/* @__PURE__ */ new Set());
    ue(
      () => e.content,
      () => {
        s.value = /* @__PURE__ */ new Set();
      }
    );
    async function w() {
      if (!v.value) return;
      const C = v.value.querySelectorAll(".mermaid-diagram");
      if (C.length !== 0)
        try {
          const $ = await import("mermaid").catch(() => null);
          if (!($ != null && $.default)) return;
          let R = 0;
          for (const n of Array.from(C)) {
            const a = n.getAttribute("data-mermaid") ?? n.textContent ?? "";
            if (a.trim())
              try {
                const { svg: m } = await $.default.render(`nm-mermaid-${Date.now()}-${R++}`, a);
                n.innerHTML = m, n.setAttribute("data-processed", "true");
              } catch {
              }
          }
        } catch {
        }
    }
    ue(b, () => {
      J(), me(y);
    }), ct(y);
    function y() {
      w(), S(), q(), _e();
    }
    let B = [], P = null;
    const K = dt();
    function J() {
      const C = /* @__PURE__ */ new Map();
      for (const $ of B) {
        const R = C.get($.key) ?? [];
        R.push({ rootEl: $.rootEl, ownerContainer: $.ownerContainer }), C.set($.key, R);
      }
      B = [], P = C;
    }
    function _e() {
      if (P) {
        for (const C of P.values())
          for (const $ of C)
            Se(null, $.ownerContainer);
        P = null;
      }
    }
    function F(C, $, R) {
      const n = P == null ? void 0 : P.get($), a = n == null ? void 0 : n.shift();
      if (n && n.length === 0 && (P == null || P.delete($)), C.innerHTML = "", a) {
        C.appendChild(a.rootEl), B.push({
          key: $,
          rootEl: a.rootEl,
          ownerContainer: a.ownerContainer
        });
        return;
      }
      const m = R();
      m.appContext = (K == null ? void 0 : K.appContext) ?? null, Se(m, C);
      const L = C.firstElementChild;
      L && B.push({ key: $, rootEl: L, ownerContainer: C });
    }
    function S() {
      if (!v.value) return;
      v.value.querySelectorAll(".prodoc-flow-diagram").forEach(($, R) => {
        var m;
        const n = ((m = $.querySelector("pre code")) == null ? void 0 : m.textContent) ?? $.textContent ?? "", a = lt(n);
        a.nodes.length !== 0 && F(
          $,
          `flow:${n}`,
          () => Oe(at, {
            graph: a,
            height: "420px",
            editable: e.flowEditable,
            onNavigate: (L) => d("docLink", L),
            onNodeMove: (L) => d("flowNodeMove", { ...L, source: n, blockIndex: R })
          })
        );
      });
    }
    function q() {
      var $;
      if (!v.value) return;
      const C = v.value.querySelectorAll(".doc-code-block-mount");
      for (const R of C) {
        const n = (($ = R.querySelector("pre code")) == null ? void 0 : $.textContent) ?? R.textContent ?? "", a = R.dataset.lang || "text";
        F(R, `code:${a}:${n}`, () => Oe(rn, { code: n, lang: a }));
      }
    }
    function W(C) {
      const $ = C.target, R = $.closest(".heading-anchor");
      if (R) {
        const a = R.dataset.headingId;
        a && (C.preventDefault(), r(a));
        return;
      }
      const n = $.closest("a");
      if (n) {
        const a = n.getAttribute("href");
        a && !a.startsWith("//") && (a.startsWith("/") || a.startsWith(".") || a.endsWith(".md")) && (C.preventDefault(), d("docLink", a));
      }
    }
    return Te(() => {
      for (const C of B)
        Se(null, C.ownerContainer);
      if (B = [], P) {
        for (const C of P.values())
          for (const $ of C)
            Se(null, $.ownerContainer);
        P = null;
      }
    }), (C, $) => (A(), O("div", {
      class: ne(`neumorphism-markdown ${e.className}`)
    }, [
      N("div", Tn, [
        f.value ? (A(), O("div", Sn, [
          $[5] || ($[5] = N("p", { class: "neumorphism-markdown-error-title" }, "⚠️ 渲染错误", -1)),
          N("pre", En, U(f.value), 1)
        ])) : (A(), O("div", {
          key: 1,
          ref_key: "contentRef",
          ref: v,
          class: "neumorphism-markdown-content",
          onClick: W,
          innerHTML: b.value
        }, null, 8, Nn))
      ]),
      t.showToc && I(i).length > 0 ? (A(), fe(Ve, {
        key: 0,
        "collapsed-groups": s.value,
        "onUpdate:collapsedGroups": $[0] || ($[0] = (R) => s.value = R),
        items: I(l),
        "active-id": I(k),
        onSelect: I(r)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : oe("", !0),
      t.showToc && I(i).length > 0 ? (A(), O("button", {
        key: 1,
        class: ne(["neumorphism-toc-mobile-btn", { active: p.value }]),
        "aria-label": I(u)("markdownTocToggle"),
        onClick: $[1] || ($[1] = (R) => p.value = !p.value)
      }, " 📑 ", 10, Ln)) : oe("", !0),
      H(je, { name: "neumorphism-toc-drawer" }, {
        default: z(() => [
          t.showToc && I(i).length > 0 && p.value ? (A(), O("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: $[4] || ($[4] = ut((R) => p.value = !1, ["self"]))
          }, [
            H(xe, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: z(() => [
                N("div", Rn, [
                  N("span", Dn, "📑 " + U(I(u)("markdownTocLabel")), 1),
                  N("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": I(u)("markdownTocClose"),
                    onClick: $[2] || ($[2] = (R) => p.value = !1)
                  }, " ✕ ", 8, An)
                ]),
                H(Ve, {
                  "collapsed-groups": s.value,
                  "onUpdate:collapsedGroups": $[3] || ($[3] = (R) => s.value = R),
                  items: I(l),
                  "active-id": I(k),
                  framed: !1,
                  onSelect: E
                }, null, 8, ["collapsed-groups", "items", "active-id"])
              ]),
              _: 1
            })
          ])) : oe("", !0)
        ]),
        _: 1
      })
    ], 2));
  }
}), Pn = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, In = { class: "neumorphism-header-search" }, Bn = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, Hn = { class: "neumorphism-search-list" }, zn = ["onClick"], On = { class: "neumorphism-search-title" }, Fn = { class: "neumorphism-search-path" }, qn = {
  key: 0,
  class: "neumorphism-sider-content"
}, Wn = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, Gn = { class: "neumorphism-doc-header" }, Vn = { class: "neumorphism-doc-title" }, Xn = { class: "neumorphism-doc-meta" }, Kn = { class: "neumorphism-doc-body" }, Un = {
  key: 1,
  class: "neumorphism-empty-state"
}, Yn = /* @__PURE__ */ ke({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(t, { emit: o }) {
    const e = t, d = o, {
      selectedPath: v,
      selectedKeys: p,
      expandedKeys: u,
      treeData: i,
      displayNode: l,
      themeModel: T,
      searchQuery: E,
      searchResults: _,
      docTree: f,
      handleTreeSelect: b,
      handleDocLink: h,
      handleSearchSelect: c
    } = st({ root: e.root, initialPath: e.initialPath });
    function x(k) {
      h(d, k);
    }
    const g = V("doc"), M = G(
      () => l.value ? Ge(l.value) : null
    );
    ue(l, () => {
      g.value = "doc";
    });
    function D(k) {
      const r = f.value.findByPath(k) ?? f.value.findByPath(`/${k}`) ?? f.value.findByPath(k.replace(/^\//, ""));
      r && (h(d, r.path), Ge(r) || (g.value = "doc"));
    }
    return (k, r) => (A(), O("div", {
      class: ne(`neumorphism-doc-viewer ${e.className}`)
    }, [
      H(Qe, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [...r[7] || (r[7] = [
          N("span", { class: "neumorphism-header-brand" }, "📚 Doc Viewer", -1)
        ])]),
        "header-right": z(() => [
          N("div", Pn, [
            H(te, {
              size: "small",
              variant: g.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": g.value === "doc",
              onClick: r[0] || (r[0] = (s) => g.value = "doc")
            }, {
              default: z(() => [...r[8] || (r[8] = [
                j(" 📄 文档 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            H(te, {
              size: "small",
              variant: g.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": g.value === "canvas",
              disabled: !M.value,
              title: M.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: r[1] || (r[1] = (s) => g.value = "canvas")
            }, {
              default: z(() => [...r[9] || (r[9] = [
                j(" 🗺 画布 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          N("div", In, [
            H(ht, {
              modelValue: I(E),
              "onUpdate:modelValue": r[2] || (r[2] = (s) => be(E) ? E.value = s : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            I(_).length > 0 ? (A(), O("div", Bn, [
              N("ul", Hn, [
                (A(!0), O(ge, null, we(I(_), (s) => (A(), O("li", {
                  key: s.id,
                  class: "neumorphism-search-item",
                  onClick: (w) => I(c)(s)
                }, [
                  N("span", On, U(s.title), 1),
                  N("span", Fn, U(s.path), 1)
                ], 8, zn))), 128))
              ])
            ])) : oe("", !0)
          ]),
          H(Ze, {
            modelValue: I(T),
            "onUpdate:modelValue": r[3] || (r[3] = (s) => be(T) ? T.value = s : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: z(({ collapsed: s }) => [
          s ? (A(), O("div", Wn, "📚")) : (A(), O("div", qn, [
            H(Je, {
              "selected-keys": I(p),
              "onUpdate:selectedKeys": r[4] || (r[4] = (w) => be(p) ? p.value = w : null),
              "expanded-keys": I(u),
              "onUpdate:expandedKeys": r[5] || (r[5] = (w) => be(u) ? u.value = w : null),
              data: I(i),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(b)
            }, null, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          H(tt, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: z(() => [
              H(xe, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: z(() => [
                  I(l) ? (A(), O(ge, { key: 0 }, [
                    N("div", Gn, [
                      N("h1", Vn, U(I(l).title), 1),
                      N("div", Xn, [
                        I(l).path ? (A(), fe(Me, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: z(() => [
                            j(U(I(l).path), 1)
                          ]),
                          _: 1
                        })) : oe("", !0),
                        I(l).children.length > 0 ? (A(), fe(Me, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: z(() => [
                            j(" 📁 " + U(I(l).children.length) + " 个子项 ", 1)
                          ]),
                          _: 1
                        })) : oe("", !0)
                      ])
                    ]),
                    H(et),
                    N("div", Kn, [
                      H(je, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: z(() => [
                          g.value === "doc" ? (A(), fe(it, {
                            key: I(l).path,
                            content: I(l).body,
                            onDocLink: x
                          }, null, 8, ["content"])) : M.value ? (A(), fe(at, {
                            key: `${I(l).path}:canvas`,
                            graph: M.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: D
                          }, null, 8, ["graph"])) : oe("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (A(), O("div", Un, [
                    H(xe, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: z(() => [...r[10] || (r[10] = [
                        N("span", { class: "neumorphism-empty-emoji" }, "📂", -1)
                      ])]),
                      _: 1
                    }),
                    r[12] || (r[12] = N("p", null, "请从左侧选择一篇文档", -1)),
                    H(te, {
                      variant: "raised",
                      size: "small",
                      onClick: r[6] || (r[6] = (s) => {
                        var w;
                        return v.value = ((w = I(i)[0]) == null ? void 0 : w.key) ?? "";
                      })
                    }, {
                      default: z(() => [...r[11] || (r[11] = [
                        j(" 打开第一篇 ", -1)
                      ])]),
                      _: 1
                    })
                  ]))
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })
    ], 2));
  }
}), Fo = /* @__PURE__ */ Ae(Yn, [["__scopeId", "data-v-1bc6bb9e"]]), jn = { class: "neumorphism-editor-toolbar" }, Qn = { class: "neumorphism-editor-toolbar-left" }, Zn = { class: "neumorphism-editor-toolbar-right" }, Jn = { class: "editor-stat" }, eo = /* @__PURE__ */ ke({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(t, { emit: o }) {
    const e = t, d = o, v = V("split");
    function p(F) {
      d("docLink", F);
    }
    const u = [
      { key: "edit", label: "✏️ 编辑" },
      { key: "split", label: "⬌ 分栏" },
      { key: "preview", label: "👁 预览" }
    ], i = G(() => e.value.length), l = G(() => e.value.split(`
`).length), T = V(null), E = V(null);
    let _ = !1;
    function f() {
      var F;
      return (F = T.value) == null ? void 0 : F.querySelector("textarea");
    }
    function b(F, S, q) {
      const W = f();
      if (!W) return;
      const C = W.selectionStart, $ = W.selectionEnd, R = W.value.slice(C, $) || q, n = W.value.slice(0, C) + F + R + S + W.value.slice($);
      d("change", n), me(() => {
        W.focus();
        const a = C + F.length;
        W.setSelectionRange(a, a + R.length);
      });
    }
    function h(F, S) {
      const q = f();
      if (!q) return;
      const W = q.selectionStart, C = q.value.slice(0, W), $ = q.value.slice(W), a = `${C.length > 0 && !C.endsWith(`
`) ? `
` : ""}${F} ${S}
`, m = C + a + $;
      d("change", m), me(() => {
        q.focus();
        const L = W + a.length - S.length - 2;
        q.setSelectionRange(L, L + S.length);
      });
    }
    function c() {
      b("**", "**", "粗体文字");
    }
    function x() {
      b("_", "_", "斜体文字");
    }
    function g() {
      h("##", "标题");
    }
    function M() {
      b("[", "](url)", "链接文字");
    }
    function D() {
      h("![alt text]", "(url)");
    }
    function k() {
      b("`", "`", "代码");
    }
    function r() {
      h("```\n", "code\n```");
    }
    function s() {
      h("-", "列表项");
    }
    function w() {
      const F = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, S = f();
      if (!S) return;
      const q = S.selectionStart, W = S.value.slice(0, q) + F + S.value.slice(S.selectionEnd);
      d("change", W), me(() => {
        S.focus(), S.setSelectionRange(q + 3, q + 3);
      });
    }
    function y(F) {
      var C, $;
      const S = ($ = (C = F.dataTransfer) == null ? void 0 : C.files) == null ? void 0 : $[0];
      if (!(S != null && S.type.startsWith("image/"))) return;
      F.preventDefault(), F.stopPropagation();
      const q = new FileReader(), W = S.name;
      q.onload = () => {
        const R = f();
        if (!R) return;
        const n = R.selectionStart, a = `![${W}](${q.result})`, m = R.value.slice(0, n) + a + R.value.slice(n);
        d("change", m), me(() => {
          R.focus(), R.setSelectionRange(n + a.length, n + a.length);
        });
      }, q.readAsDataURL(S);
    }
    function B(F) {
      var S;
      (S = F.dataTransfer) != null && S.types.includes("Files") && F.preventDefault();
    }
    let P = null;
    function K() {
      e.autoSave && (P && clearTimeout(P), P = setTimeout(() => {
        d("change", e.value);
      }, e.autoSaveInterval));
    }
    ue(
      () => e.value,
      () => {
        K();
      }
    ), Te(() => {
      P && clearTimeout(P);
    });
    function J() {
      var W;
      if (_ || v.value !== "split") return;
      const F = (W = T.value) == null ? void 0 : W.querySelector("textarea"), S = E.value;
      if (!F || !S) return;
      const q = F.scrollTop / (F.scrollHeight - F.clientHeight || 1);
      _ = !0, S.scrollTop = q * (S.scrollHeight - S.clientHeight), requestAnimationFrame(() => {
        _ = !1;
      });
    }
    function _e() {
      var W;
      if (_ || v.value !== "split") return;
      const F = (W = T.value) == null ? void 0 : W.querySelector("textarea"), S = E.value;
      if (!F || !S) return;
      const q = S.scrollTop / (S.scrollHeight - S.clientHeight || 1);
      _ = !0, F.scrollTop = q * (F.scrollHeight - F.clientHeight), requestAnimationFrame(() => {
        _ = !1;
      });
    }
    return (F, S) => (A(), O("div", {
      class: ne(`neumorphism-markdown-editor ${e.className}`)
    }, [
      N("div", jn, [
        N("div", Qn, [
          H(te, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            onClick: c
          }, {
            default: z(() => [...S[2] || (S[2] = [
              N("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            onClick: x
          }, {
            default: z(() => [...S[3] || (S[3] = [
              N("em", null, "I", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "标题",
            onClick: g
          }, {
            default: z(() => [...S[4] || (S[4] = [
              j(" H ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "链接",
            onClick: M
          }, {
            default: z(() => [...S[5] || (S[5] = [
              j(" 🔗 ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "图片",
            onClick: D
          }, {
            default: z(() => [...S[6] || (S[6] = [
              j(" 🖼 ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "行内代码",
            onClick: k
          }, {
            default: z(() => [...S[7] || (S[7] = [
              j(" </> ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "代码块",
            onClick: r
          }, {
            default: z(() => [...S[8] || (S[8] = [
              j(" 📋 ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "无序列表",
            onClick: s
          }, {
            default: z(() => [...S[9] || (S[9] = [
              j(" •≡ ", -1)
            ])]),
            _: 1
          }),
          H(te, {
            size: "small",
            title: "表格",
            onClick: w
          }, {
            default: z(() => [...S[10] || (S[10] = [
              j(" ⏏ ", -1)
            ])]),
            _: 1
          })
        ]),
        N("div", Zn, [
          H(vt, {
            modelValue: v.value,
            "onUpdate:modelValue": S[0] || (S[0] = (q) => v.value = q),
            tabs: u,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, null, 8, ["modelValue"]),
          N("span", Jn, U(l.value) + " 行 · " + U(i.value) + " 字", 1)
        ])
      ]),
      N("div", {
        class: ne(["neumorphism-editor-panels", `neumorphism-mode-${v.value}`])
      }, [
        N("div", {
          ref_key: "editPanelRef",
          ref: T,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: v.value === "preview" }]),
          onScroll: J,
          onDrop: y,
          onDragover: B
        }, [
          H(xe, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: z(() => [
              H(gt, {
                class: "neumorphism-editor-textarea",
                "model-value": e.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": S[1] || (S[1] = (q) => d("change", q))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        N("div", {
          ref_key: "previewPanelRef",
          ref: E,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: v.value === "edit" }]),
          onScroll: _e
        }, [
          H(xe, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: z(() => [
              H(it, {
                content: e.value,
                "show-toc": !1,
                onDocLink: p
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), to = /* @__PURE__ */ Ae(eo, [["__scopeId", "data-v-a3afee3e"]]), no = { class: "neumorphism-editor-actions" }, oo = {
  key: 0,
  class: "neumorphism-editor-sider"
}, so = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, lo = {
  key: 0,
  class: "neumorphism-editor-layout"
}, ao = { class: "neumorphism-editor-header" }, ro = { class: "neumorphism-editor-title" }, io = { class: "neumorphism-editor-meta" }, co = { class: "neumorphism-editor-body" }, uo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, fo = 50, ho = /* @__PURE__ */ ke({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(t, { emit: o }) {
    const e = t, d = o, {
      selectedPath: v,
      selectedKeys: p,
      expandedKeys: u,
      treeData: i,
      displayNode: l,
      themeModel: T,
      handleTreeSelect: E
    } = st({ root: e.root, initialPath: e.initialPath }), _ = V({}), f = V([]);
    function b(k, r) {
      const s = f.value.filter((w) => w !== k);
      for (s.push(k); s.length > fo; ) {
        const w = s.shift();
        w !== k && delete _.value[w];
      }
      f.value = s, _.value[k] = r;
    }
    function h(k) {
      return _.value[k.path] ?? k.content;
    }
    function c(k) {
      l.value && b(l.value.path, k);
    }
    function x() {
      l.value && d("save", l.value.path, h(l.value));
    }
    function g(k) {
      v.value = k, d("docLink", k);
    }
    const M = G(() => {
      if (!l.value) return !1;
      const k = _.value[l.value.path];
      return k !== void 0 && k !== l.value.content;
    });
    function D(k) {
      (k.ctrlKey || k.metaKey) && k.key === "s" && (k.preventDefault(), x());
    }
    return (k, r) => (A(), O("div", {
      class: ne(`neumorphism-doc-editor ${e.className}`),
      onKeydown: D
    }, [
      H(Qe, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [...r[4] || (r[4] = [
          N("span", { class: "neumorphism-editor-brand" }, "📝 Doc Editor", -1)
        ])]),
        "header-center": z(() => [
          H(Ze, {
            modelValue: I(T),
            "onUpdate:modelValue": r[0] || (r[0] = (s) => be(T) ? T.value = s : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": z(() => [
          N("div", no, [
            M.value ? (A(), fe(Me, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: z(() => [...r[5] || (r[5] = [
                j(" 未保存 ", -1)
              ])]),
              _: 1
            })) : oe("", !0),
            H(te, {
              variant: "raised",
              size: "small",
              disabled: !M.value,
              onClick: x
            }, {
              default: z(() => [...r[6] || (r[6] = [
                j(" 💾 保存 ", -1)
              ])]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: z(({ collapsed: s }) => [
          s ? (A(), O("div", so, "📝")) : (A(), O("div", oo, [
            H(Je, {
              "selected-keys": I(p),
              "onUpdate:selectedKeys": r[1] || (r[1] = (w) => be(p) ? p.value = w : null),
              "expanded-keys": I(u),
              "onUpdate:expandedKeys": r[2] || (r[2] = (w) => be(u) ? u.value = w : null),
              data: I(i),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(E)
            }, null, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          H(tt, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: z(() => [
              H(xe, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: z(() => [
                  I(l) ? (A(), O("div", lo, [
                    N("header", ao, [
                      N("div", null, [
                        N("h1", ro, U(I(l).title), 1),
                        N("div", io, [
                          I(l).path ? (A(), fe(Me, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: z(() => [
                              j(U(I(l).path), 1)
                            ]),
                            _: 1
                          })) : oe("", !0),
                          M.value ? (A(), fe(Me, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: z(() => [...r[7] || (r[7] = [
                              j(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : oe("", !0)
                        ])
                      ]),
                      H(te, {
                        variant: "raised",
                        size: "small",
                        disabled: !M.value,
                        onClick: x
                      }, {
                        default: z(() => [...r[8] || (r[8] = [
                          j(" 💾 保存 ", -1)
                        ])]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    H(et),
                    N("div", co, [
                      H(to, {
                        value: h(I(l)),
                        onChange: c,
                        onDocLink: g
                      }, null, 8, ["value"])
                    ])
                  ])) : (A(), O("div", uo, [
                    H(xe, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: z(() => [...r[9] || (r[9] = [
                        N("span", { class: "neumorphism-editor-empty-emoji" }, "📂", -1)
                      ])]),
                      _: 1
                    }),
                    r[11] || (r[11] = N("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    H(te, {
                      variant: "raised",
                      size: "small",
                      onClick: r[3] || (r[3] = (s) => {
                        var w;
                        return v.value = ((w = I(i)[0]) == null ? void 0 : w.key) ?? "";
                      })
                    }, {
                      default: z(() => [...r[10] || (r[10] = [
                        j(" 打开第一篇 ", -1)
                      ])]),
                      _: 1
                    })
                  ]))
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })
    ], 34));
  }
}), qo = /* @__PURE__ */ Ae(ho, [["__scopeId", "data-v-d36faefa"]]), mo = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function po(t) {
  const o = t.match(mo);
  if (!o)
    return { meta: {}, body: t };
  const e = o[1], d = t.slice(o[0].length), v = {};
  for (const p of e.split(`
`)) {
    const u = p.indexOf(":");
    if (u === -1) continue;
    const i = p.slice(0, u).trim();
    let l = p.slice(u + 1).trim();
    /^-?\d+$/.test(l) ? l = parseInt(l, 10) : /^-?\d+\.\d+$/.test(l) ? l = parseFloat(l) : l === "true" ? l = !0 : l === "false" ? l = !1 : (l.startsWith('"') && l.endsWith('"') || l.startsWith("'") && l.endsWith("'")) && (l = l.slice(1, -1)), v[i] = l;
  }
  return { meta: v, body: d };
}
function vo(t) {
  return t.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function go(t, o) {
  if (o.title && typeof o.title == "string")
    return o.title;
  const e = t.match(/^#\s+(.+)$/m);
  return e ? e[1].trim() : "Untitled";
}
function yo(t, o) {
  const { meta: e, body: d } = po(o), v = go(d, e), p = typeof e.order == "number" ? e.order : 9999;
  return {
    id: vo(t),
    title: v,
    path: t,
    content: o,
    body: d,
    meta: e,
    children: [],
    order: p
  };
}
function Wo(t) {
  const o = /* @__PURE__ */ new Map();
  for (const [u, i] of Object.entries(t)) {
    if (!u.endsWith(".md")) continue;
    const l = yo(u, i);
    o.set(u, l);
  }
  const e = [], d = Array.from(o.keys()).sort();
  for (const u of d) {
    const i = u.split("/");
    if (i.length === 1) {
      e.push(u);
      continue;
    }
    let l = null;
    const E = `${i.slice(0, -1).join("/")}/index.md`;
    if (o.has(E) && E !== u)
      l = E;
    else {
      const _ = i.slice(0, -1).join("/") + ".md";
      o.has(_) && (l = _);
    }
    if (l && o.has(l)) {
      const _ = o.get(l), f = o.get(u);
      _.children.push(f);
    } else
      e.push(u);
  }
  for (const u of o.values())
    u.children.sort((i, l) => i.order - l.order || i.title.localeCompare(l.title));
  const v = e.map((u) => o.get(u)).sort((u, i) => u.order - i.order || u.title.localeCompare(i.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: v,
    order: 0
  };
}
const Go = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem"]
};
export {
  rn as DocCodeBlock,
  qo as DocEditor,
  at as DocFlowCanvas,
  Ve as DocTocNav,
  Fo as DocViewer,
  to as MarkdownEditor,
  it as MarkdownRenderer,
  Be as TocNodeItem,
  Wo as buildDocTree,
  Ct as buildHierarchyGraph,
  Go as componentCategories,
  wt as createDocTree,
  yo as createNode,
  $t as extractFlowBlocks,
  go as extractTitle,
  Ho as flattenDocTree,
  zo as getAncestors,
  yt as getNodeIcon,
  He as getScrollBehavior,
  Zt as highlightCode,
  Ye as layoutProDocFlow,
  ot as nodeToTreeData,
  po as parseFrontmatter,
  lt as parseProDocFlow,
  vo as pathToId,
  Ge as resolveCanvasGraph,
  st as useDocLayout,
  Mn as useMarkdownToc,
  Rt as useScrollSpy,
  Oo as writeFlowNodePosition
};
