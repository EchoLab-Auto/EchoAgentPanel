import { ref as X, computed as W, watch as me, onBeforeUnmount as Se, defineComponent as ye, openBlock as z, createElementBlock as q, normalizeClass as ne, createElementVNode as L, unref as P, createVNode as C, createCommentVNode as oe, toDisplayString as Y, Fragment as ge, renderList as xe, createBlock as ue, nextTick as fe, withCtx as B, createTextVNode as j, normalizeStyle as Ie, toRef as Oe, onMounted as ut, getCurrentInstance as mt, render as Ne, Transition as Qe, withModifiers as ft, h as qe, isRef as $e } from "vue";
import { useTheme as ht } from "../composables/useTheme.js";
import { N as Ze } from "../chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as te } from "../chunks/NeumorphismButton-C7gkn79g.js";
import { N as ke } from "../chunks/NeumorphismCard-BgpR689L.js";
import { N as Je } from "../chunks/NeumorphismThemeToggle-DBfRRh5v.js";
import { N as et } from "../chunks/NeumorphismTree-fQBHMCMo.js";
import { N as tt } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as Me } from "../chunks/NeumorphismTag-C9hlXpsv.js";
import { N as nt } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as pt } from "../chunks/NeumorphismInput-CWarV170.js";
import { marked as Pe } from "marked";
import { escapeHtml as he, generateId as ot, slugify as Fe } from "../utils/index.js";
import { useLocale as ze } from "../composables/useLocale.js";
import { N as G } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as vt } from "../composables/useClipboard.js";
import { N as gt } from "../chunks/NeumorphismCanvas-a4F1ouPw.js";
import { _ as Ae } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as yt } from "../chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as wt } from "../chunks/NeumorphismTextarea-BPesp-1r.js";
import '../index2.css';function xt(n) {
  var e;
  const o = ((e = n.path) == null ? void 0 : e.toLowerCase()) || "";
  return o.includes("api") ? "api" : o.includes("guide") ? "guide" : o.includes("config") ? "config" : o.includes("example") ? "example" : o.includes("install") ? "install" : o.includes("changelog") ? "changelog" : o.includes("faq") ? "faq" : "file";
}
function st(n) {
  const o = n.children.length > 0 ? "folder" : xt(n);
  return {
    key: n.path,
    label: n.title,
    icon: o,
    children: n.children.map(st)
  };
}
function kt(n) {
  const o = /* @__PURE__ */ new Map();
  function e(w) {
    o.set(w.path, w);
    for (const u of w.children)
      e(u);
  }
  e(n);
  const d = /* @__PURE__ */ new Map();
  function y(w) {
    d.set(w.id, w);
    for (const u of w.children)
      y(u);
  }
  return y(n), {
    root: n,
    nodeMap: o,
    findByPath(w) {
      return o.get(w);
    },
    findById(w) {
      return d.get(w);
    }
  };
}
function Uo(n) {
  const o = [];
  function e(d) {
    o.push(d);
    for (const y of d.children)
      e(y);
  }
  return e(n), o;
}
function Yo(n, o) {
  const e = [];
  function d(y, w, u) {
    if (y.id === w)
      return e.push(...u), !0;
    for (const l of y.children)
      if (d(l, w, [...u, y]))
        return !0;
    return !1;
  }
  return d(o, n.id, []), e;
}
function at(n) {
  var g;
  const { root: o, initialPath: e } = n, d = typeof window < "u", y = n.syncUrlHash !== !1 && d, w = d ? window.location.hash.slice(1) : "", u = e || w || ((g = o.children[0]) == null ? void 0 : g.path) || "", l = X(u), a = X([]), { theme: N, setTheme: S } = ht(), T = W({
    get: () => N.value,
    set: (k) => S(k)
  }), h = W(() => o.children.map(st)), $ = X(l.value ? [l.value] : []);
  me(l, (k) => {
    $.value = k ? [k] : [];
  });
  const p = W(() => kt(o)), c = W(() => {
    if (l.value)
      return p.value.findByPath(l.value);
  }), _ = W(() => c.value || o.children[0]);
  function x(k) {
    l.value = k;
  }
  function M(k, H) {
    l.value = H, k("docLink", H);
  }
  const A = X(""), b = W(() => {
    if (!A.value.trim()) return [];
    const k = A.value.toLowerCase();
    return s(o).filter((I) => I.id === "root" ? !1 : I.title.toLowerCase().includes(k) || I.body.toLowerCase().includes(k)).slice(0, 10);
  });
  function r(k) {
    l.value = k.path, A.value = "";
  }
  function s(k) {
    const H = [k];
    for (const I of k.children)
      H.push(...s(I));
    return H;
  }
  if (me(
    () => e,
    (k) => {
      k && (l.value = k);
    }
  ), y) {
    me(l, (H) => {
      H && history.replaceState(null, "", `#${H}`);
    });
    const k = () => {
      const H = window.location.hash.slice(1);
      H && H !== l.value && (l.value = H);
    };
    window.addEventListener("hashchange", k), Se(() => {
      window.removeEventListener("hashchange", k);
    });
  }
  return {
    selectedPath: l,
    selectedKeys: $,
    expandedKeys: a,
    treeData: h,
    selectedNode: c,
    displayNode: _,
    docTree: p,
    themeModel: T,
    searchQuery: A,
    searchResults: b,
    handleTreeSelect: x,
    handleDocLink: M,
    handleSearchSelect: r
  };
}
const _t = /^graph\s+(LR|RL|TB|BT)\s*$/i, be = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Ee = /-->\s*(?:\|([^|]*)\|)?/y, We = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, bt = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, De = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function $t(n) {
  const o = [];
  De.lastIndex = 0;
  let e;
  for (; (e = De.exec(n)) !== null; )
    o.push(e[1]);
  return o;
}
function jo(n, o, e, d, y, w) {
  De.lastIndex = 0;
  const u = o.replace(/\r\n/g, `
`).trim();
  let l, a = -1;
  for (; (l = De.exec(n)) !== null; ) {
    if (a++, w !== void 0 && a !== w) continue;
    const N = l[1];
    if (N.replace(/\r\n/g, `
`).trim() !== u) continue;
    const S = new RegExp(
      `^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), T = N.split(`
`);
    let h = !1;
    for (let c = 0; c < T.length; c++) {
      const _ = T[c].indexOf("%%"), x = _ >= 0 ? T[c].slice(0, _) : T[c], M = _ >= 0 ? T[c].slice(_) : "", A = x.trim();
      if (A.includes("-->") || !S.test(A)) continue;
      const b = A.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      T[c] = `${b} @ ${d}, ${y}${M ? `  ${M}` : ""}`, h = !0;
      break;
    }
    if (!h) {
      const c = `${e} @ ${d}, ${y}`;
      T.length > 0 && T[T.length - 1].trim() === "" ? T.splice(T.length - 1, 0, c) : T.push(c);
    }
    const $ = T.join(`
`), p = l.index + l[0].indexOf(N);
    return n.slice(0, p) + $ + n.slice(p + N.length);
  }
  return n;
}
function Ct(n) {
  return n ? n.startsWith("[/") && n.endsWith("/]") ? { shape: "rounded", text: n.slice(2, -2) } : n.startsWith("{") ? { shape: "diamond", text: n.slice(1, -1) } : n.startsWith("(") ? { shape: "stadium", text: n.slice(1, -1) } : { shape: "rect", text: n.slice(1, -1) } : { shape: "rect", text: "" };
}
function Tt(n) {
  const o = n.trim(), e = o.split("|");
  if (e.length > 1) {
    const d = e[e.length - 1].trim();
    if (bt.test(d))
      return {
        label: e.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: d.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: o };
}
function lt(n) {
  const o = [], e = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Set(), y = [];
  let w = "LR", u = !1;
  function l(h, $) {
    const { shape: p, text: c } = Ct($), { label: _, docPath: x } = $ ? Tt(c) : { label: h, docPath: void 0 }, M = e.get(h);
    M ? $ && (M.label = _, M.shape = p, x !== void 0 && (M.docPath = x)) : e.set(h, { id: h, label: _, shape: p, docPath: x });
  }
  function a(h, $, p) {
    const c = e.get(h);
    c && (c.x = $, c.y = p);
  }
  function N(h, $, p) {
    const c = `${h}→${$}${p ?? ""}`;
    d.has(c) || (d.add(c), y.push({ from: h, to: $, label: p }));
  }
  const S = n.split(`
`);
  for (let h = 0; h < S.length; h++) {
    const $ = h + 1, p = S[h].indexOf("%%"), c = (p >= 0 ? S[h].slice(0, p) : S[h]).trim();
    if (c) {
      if (!u) {
        const _ = _t.exec(c);
        _ ? w = _[1].toUpperCase() : (o.push({
          line: $,
          source: S[h].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), T(c, $, S[h].trim())), u = !0;
        continue;
      }
      T(c, $, S[h].trim());
    }
  }
  function T(h, $, p) {
    var M;
    let c = 0;
    be.lastIndex = 0, Ee.lastIndex = 0, be.lastIndex = c;
    let _ = be.exec(h);
    if (!_ || _.index !== 0)
      return o.push({ line: $, source: p, message: "无法识别的语句" }), !1;
    let x = _[1];
    for (l(_[1], _[2]), c = be.lastIndex; ; ) {
      for (; c < h.length && /\s/.test(h[c]); ) c++;
      if (c >= h.length) break;
      if (h[c] === "@") {
        We.lastIndex = c;
        const s = We.exec(h);
        return s && s.index === c ? (a(x, parseFloat(s[1]), parseFloat(s[2])), !0) : (o.push({
          line: $,
          source: p,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Ee.lastIndex = c;
      const A = Ee.exec(h);
      if (!A || A.index !== c)
        return o.push({
          line: $,
          source: p,
          message: `无法识别的内容: "${h.slice(c)}"`
        }), !1;
      const b = ((M = A[1]) == null ? void 0 : M.trim()) || void 0;
      for (c = Ee.lastIndex; c < h.length && /\s/.test(h[c]); ) c++;
      if (be.lastIndex = c, _ = be.exec(h), !_ || _.index !== c)
        return o.push({ line: $, source: p, message: "箭头后缺少目标节点" }), !1;
      const r = _[1];
      l(_[1], _[2]), N(x, r, b), x = r, c = be.lastIndex;
    }
    return !0;
  }
  return {
    direction: w,
    nodes: [...e.values()],
    edges: y,
    errors: o
  };
}
const Ge = "__hier_root";
function Mt(n) {
  const o = [
    {
      id: Ge,
      label: n.title,
      shape: "stadium",
      docPath: n.path || void 0
    }
  ], e = [];
  for (const d of n.children)
    o.push({
      id: d.id,
      label: d.title,
      // 有子级 = 可继续钻取（圆角），叶子 = 矩形
      shape: d.children.length > 0 ? "rounded" : "rect",
      docPath: d.path
    }), e.push({ from: Ge, to: d.id });
  return {
    // 子项较多时纵向排布更可读
    direction: n.children.length <= 5 ? "LR" : "TB",
    nodes: o,
    edges: e,
    errors: []
  };
}
function Ve(n) {
  for (const o of $t(n.body)) {
    const e = lt(o);
    if (e.nodes.length > 0) return e;
  }
  return n.children.length > 0 ? Mt(n) : null;
}
const St = { class: "toc-item-row" }, Nt = ["aria-expanded", "aria-controls", "aria-label"], Et = ["data-toc-id", "aria-current"], Lt = { class: "toc-text" }, Rt = ["id"], Be = /* @__PURE__ */ ye({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(n, { emit: o }) {
    const e = n, d = o, { t: y } = ze(), w = W(() => e.activeHeading === e.node.id), u = W(() => e.node.children.length > 0), l = W(() => e.collapsedGroups.has(e.node.id));
    function a(S) {
      S.stopPropagation(), d("toggle", e.node.id);
    }
    function N(S) {
      S.preventDefault(), d("select", e.node.id);
    }
    return (S, T) => (z(), q("li", {
      class: ne(["neumorphism-toc-item", { "has-children": u.value, active: w.value }]),
      role: "listitem"
    }, [
      L("div", St, [
        u.value ? (z(), q("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !l.value,
          "aria-controls": `toc-list-${n.node.id}`,
          "aria-label": l.value ? P(y)("markdownTocExpand") : P(y)("markdownTocCollapse"),
          onClick: a
        }, [
          C(G, {
            name: l.value ? "chevron-right" : "chevron-down",
            size: "xs"
          }, null, 8, ["name"])
        ], 8, Nt)) : oe("", !0),
        L("a", {
          href: "#",
          "data-toc-id": n.node.id,
          role: "button",
          "aria-current": w.value ? "location" : void 0,
          onClick: N
        }, [
          L("span", Lt, Y(n.node.text), 1)
        ], 8, Et)
      ]),
      u.value && !l.value ? (z(), q("ul", {
        key: 0,
        id: `toc-list-${n.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (z(!0), q(ge, null, xe(n.node.children, (h) => (z(), ue(Be, {
          key: h.id,
          node: h,
          "active-heading": n.activeHeading,
          "collapsed-groups": n.collapsedGroups,
          onToggle: T[0] || (T[0] = ($) => S.$emit("toggle", $)),
          onSelect: T[1] || (T[1] = ($) => S.$emit("select", $))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Rt)) : oe("", !0)
    ], 2));
  }
});
function He() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Dt(n) {
  const { content: o } = n, e = n.headingSelector ?? "h1, h2, h3", d = X("");
  let y = !1, w = null;
  function u(x) {
    var b;
    const M = o.value;
    if (!M) return null;
    const A = (b = n.scrollContainer) == null ? void 0 : b.value;
    return A instanceof HTMLElement ? A : typeof A == "string" ? M.closest(A) : M.closest(".nm-layout__content");
  }
  function l(x) {
    const M = x ?? u();
    if (!M) return 64;
    const A = M.closest(".nm-layout"), b = A == null ? void 0 : A.querySelector(".nm-layout__header");
    return b ? b.getBoundingClientRect().height : 64;
  }
  function a(x) {
    var M;
    x !== d.value && (d.value = x, (M = n.onActiveChange) == null || M.call(n, x));
  }
  function N() {
    var r;
    const x = u();
    if (!x) return;
    const M = (r = o.value) == null ? void 0 : r.querySelectorAll(e);
    if (!M) return;
    const A = l(x) + 20;
    let b = "";
    for (const s of M) {
      const g = s.getBoundingClientRect(), k = x.getBoundingClientRect();
      if (g.top - k.top <= A)
        b = s.id;
      else
        break;
    }
    a(b);
  }
  function S() {
    y = !1, w && (clearTimeout(w), w = null), N();
  }
  function T(x) {
    var A, b;
    w && clearTimeout(w), y = !0, d.value = x, (A = n.onActiveChange) == null || A.call(n, x);
    const M = (b = o.value) == null ? void 0 : b.querySelector(`[id="${x}"]`);
    M && M.scrollIntoView({ behavior: He() }), w = setTimeout(S, 800);
  }
  let h = null, $ = null, p = -1;
  function c() {
    h == null || h.disconnect(), h = null, $ == null || $.disconnect(), $ = null;
  }
  function _() {
    c();
    const x = u();
    if (!x || !o.value) return;
    const M = l(x);
    p = M;
    const A = Array.from(o.value.querySelectorAll(e));
    if (A.length === 0) return;
    const b = /* @__PURE__ */ new Map();
    h = new IntersectionObserver(
      (g) => {
        if (y) return;
        for (const I of g)
          I.isIntersecting ? b.set(I.target, I.boundingClientRect.top) : b.delete(I.target);
        let k = "", H = -1 / 0;
        for (const [I, V] of b)
          V > H && (H = V, k = I.id);
        k && a(k);
      },
      {
        root: x,
        rootMargin: `-${M + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const g of A)
      h.observe(g);
    const r = x.closest(".nm-layout"), s = r == null ? void 0 : r.querySelector(".nm-layout__header");
    s && typeof ResizeObserver < "u" && ($ = new ResizeObserver(() => {
      const g = s.getBoundingClientRect().height;
      g !== p && (p = g, fe(() => _()));
    }), $.observe(s));
  }
  return me(n.watchSource ? [o, n.watchSource] : [o], ([x]) => {
    x ? fe(() => {
      _(), N();
    }) : c();
  }), Se(() => {
    c(), w && clearTimeout(w);
  }), { activeHeading: d, scrollToHeading: T, syncActiveHeading: N };
}
const zt = ["aria-label"], At = { class: "neumorphism-toc-header" }, It = { class: "neumorphism-toc-title" }, Pt = {
  class: "neumorphism-toc-list",
  role: "list"
}, Bt = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Ke = /* @__PURE__ */ ye({
  __name: "DocTocNav",
  props: {
    items: {},
    activeId: { default: "" },
    title: { default: "" },
    framed: { type: Boolean, default: !0 },
    collapsedGroups: { default: void 0 }
  },
  emits: ["select", "update:collapsedGroups"],
  setup(n, { expose: o, emit: e }) {
    const d = n, y = e, { t: w } = ze(), u = W(() => d.title || w("markdownTocLabel")), l = X(null), a = X(/* @__PURE__ */ new Set()), N = W(() => d.collapsedGroups ?? a.value);
    function S(p) {
      d.collapsedGroups !== void 0 ? y("update:collapsedGroups", p) : a.value = p;
    }
    me(
      () => d.items,
      () => {
        d.collapsedGroups === void 0 && (a.value = /* @__PURE__ */ new Set());
      }
    );
    function T(p) {
      const c = new Set(N.value), _ = c.has(p);
      _ ? c.delete(p) : c.add(p), S(c), _ && fe(() => h(p));
    }
    function h(p) {
      if (!l.value || window.innerWidth <= 1200) return;
      const c = l.value, _ = c.querySelector(`[data-toc-id="${CSS.escape(p)}"]`);
      if (!_) return;
      const x = c.getBoundingClientRect(), M = _.closest(".neumorphism-toc-item"), A = Array.from((M == null ? void 0 : M.children) ?? []).find(
        (r) => r.classList.contains("neumorphism-toc-list")
      );
      if (A && A.getBoundingClientRect().bottom <= x.bottom + 10)
        return;
      const b = _.getBoundingClientRect().top - x.top + c.scrollTop;
      c.scrollTo({
        top: Math.max(0, b),
        behavior: He()
      });
    }
    function $() {
      if (!l.value || window.innerWidth <= 1200) return;
      const p = l.value, c = p.querySelector(".neumorphism-toc-item.active");
      if (!c) return;
      const _ = p.getBoundingClientRect(), x = c.getBoundingClientRect(), M = _.top + _.height * 0.25, A = _.top + _.height * 0.75;
      if (x.top >= M && x.bottom <= A)
        return;
      const r = x.top - _.top + p.scrollTop - x.height / 2 - _.height / 2;
      p.scrollTo({
        top: Math.max(0, r),
        behavior: He()
      });
    }
    return me(
      () => d.activeId,
      (p) => {
        if (!p) return;
        function c(_) {
          for (const x of _) {
            if (x.id === p) return !0;
            if (c(x.children)) {
              if (N.value.has(x.id)) {
                const M = new Set(N.value);
                M.delete(x.id), S(M);
              }
              return !0;
            }
          }
          return !1;
        }
        c(d.items), fe(() => $());
      }
    ), o({ scrollTocToActive: $ }), (p, c) => n.framed ? (z(), q("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: l,
      class: "neumorphism-toc",
      "aria-label": u.value
    }, [
      C(ke, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: B(() => [
          L("div", At, [
            L("span", It, [
              C(G, {
                name: "list",
                size: "sm"
              }),
              j(" " + Y(u.value), 1)
            ])
          ]),
          L("ul", Pt, [
            (z(!0), q(ge, null, xe(n.items, (_) => (z(), ue(Be, {
              key: _.id,
              node: _,
              "active-heading": n.activeId,
              "collapsed-groups": N.value,
              onToggle: T,
              onSelect: c[0] || (c[0] = (x) => y("select", x))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, zt)) : (z(), q("ul", Bt, [
      (z(!0), q(ge, null, xe(n.items, (_) => (z(), ue(Be, {
        key: _.id,
        node: _,
        "active-heading": n.activeId,
        "collapsed-groups": N.value,
        onToggle: T,
        onSelect: c[1] || (c[1] = (x) => y("select", x))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), Ht = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, Ot = /(#\s+.*$)/gm, qt = /(--\s.*$)/gm, Ft = /$.^/gm, Wt = /* @__PURE__ */ new Set([
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
]), Gt = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function Vt(n) {
  const o = (n ?? "").toLowerCase();
  return Wt.has(o) ? Ot : Gt.has(o) ? qt : o === "html" || o === "xml" || o === "vue" ? Ft : Ht;
}
const Kt = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, Xt = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, Ut = /\b([a-zA-Z_]\w*)(?=\()/g, Yt = /\b(\d+\.?\d*)\b/g, jt = /\b([A-Z][a-zA-Z0-9_]*)\b/g, Qt = /\u0001([a-z]+)\u0001/g;
function Zt(n) {
  let o = n, e = "";
  do
    e = String.fromCharCode(97 + o % 26) + e, o = Math.floor(o / 26) - 1;
  while (o >= 0);
  return "" + e + "";
}
function Jt(n) {
  let o = 0;
  for (const e of n) o = o * 26 + (e.charCodeAt(0) - 96);
  return o - 1;
}
function en(n, o) {
  if (!o || o === "text" || o === "plain")
    return he(n);
  let e = he(n);
  const d = [], y = (w) => (u) => (d.push(`<span class="${w}">${u}</span>`), Zt(d.length - 1));
  return e = e.replace(Kt, y("token-string")), e = e.replace(Vt(o), y("token-comment")), e = e.replace(Xt, '<span class="token-keyword">$1</span>'), e = e.replace(Ut, '<span class="token-function">$1</span>'), e = e.replace(Yt, '<span class="token-number">$1</span>'), e = e.replace(jt, '<span class="token-type">$1</span>'), e = e.replace(Qt, (w, u) => d[Jt(u)]), e;
}
const tn = { class: "code-block-wrapper doc-code-block" }, nn = { class: "code-block-header" }, on = { class: "code-lang" }, sn = { class: "code-lines" }, an = ["aria-label"], ln = { class: "code-block-body" }, rn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, cn = ["innerHTML"], dn = /* @__PURE__ */ ye({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(n) {
    const o = n, { t: e } = ze(), { copied: d, copy: y } = vt({ resetDelay: 1500 }), w = W(() => o.lang || "text"), u = W(() => en(o.code, o.lang)), l = W(() => o.code.split(`
`).length), a = W(() => d.value ? e("markdownCodeCopied") : e("markdownCodeCopy"));
    return (N, S) => (z(), q("div", tn, [
      L("div", nn, [
        L("span", on, Y(w.value), 1),
        L("span", sn, Y(l.value) + " lines", 1),
        L("button", {
          type: "button",
          class: ne(["code-copy-btn", { copied: P(d) }]),
          "aria-label": a.value,
          onClick: S[0] || (S[0] = (T) => P(y)(n.code))
        }, Y(a.value), 11, an)
      ]),
      L("div", ln, [
        n.showLineNumbers ? (z(), q("div", rn, [
          (z(!0), q(ge, null, xe(l.value, (T) => (z(), q("span", {
            key: T,
            class: "line-num"
          }, Y(T), 1))), 128))
        ])) : oe("", !0),
        L("pre", null, [
          L("code", {
            class: ne(`language-${w.value}`),
            innerHTML: u.value
          }, null, 10, cn)
        ])
      ])
    ]));
  }
}), Xe = 44, Ue = 96, Le = 280, un = 16, mn = 14, fn = 8, hn = 90, Ye = 28, we = 48, pn = 4, Re = 28, de = 20, vn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function gn(n) {
  let o = 0;
  for (const e of n)
    o += vn.test(e) ? mn : fn;
  return o;
}
function yn(n) {
  const o = gn(n.label) + un * 2;
  if (n.shape === "diamond") {
    const e = Math.min(Math.max(o * 1.5 + 32, Ue * 1.4), Le * 1.4);
    return { w: e, h: Math.max(64, e * 0.55) };
  }
  return o > Le ? { w: Le, h: Xe + 20 } : { w: Math.min(Math.max(o, Ue), Le), h: Xe };
}
function je(n, o = pn) {
  const { nodes: e, edges: d, direction: y } = n, w = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (e.length === 0) return w;
  const u = {};
  for (const t of e) u[t.id] = yn(t);
  const l = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
  for (const t of e)
    l.set(t.id, []), a.set(t.id, 0);
  for (const t of d)
    !l.has(t.from) || !a.has(t.to) || (l.get(t.from).push(t.to), a.set(t.to, a.get(t.to) + 1));
  const N = /* @__PURE__ */ new Map(), S = /* @__PURE__ */ new Set(), T = e.filter((t) => (a.get(t.id) ?? 0) === 0).map((t) => t.id), h = new Map(a);
  for (; T.length > 0; ) {
    const t = T.shift(), i = N.get(t) ?? 0;
    N.set(t, i);
    for (const m of l.get(t) ?? [])
      N.set(m, Math.max(N.get(m) ?? 0, i + 1)), h.set(m, h.get(m) - 1), h.get(m) === 0 && T.push(m);
  }
  for (const t of e) {
    if (N.has(t.id)) continue;
    let i = -1;
    for (const m of d)
      m.to === t.id && N.has(m.from) && (i = Math.max(i, N.get(m.from)));
    N.set(t.id, i + 1);
  }
  d.forEach((t, i) => {
    (N.get(t.to) ?? 0) <= (N.get(t.from) ?? 0) && S.add(i);
  });
  const $ = Math.max(...N.values()), p = Array.from({ length: $ + 1 }, () => []), c = new Map(e.map((t, i) => [t.id, i]));
  for (const t of e)
    p[N.get(t.id)].push(t.id);
  for (const t of p)
    t.sort((i, m) => c.get(i) - c.get(m));
  const _ = /* @__PURE__ */ new Map();
  function x() {
    _.clear(), p.forEach((t) => t.forEach((i, m) => _.set(i, m)));
  }
  x();
  const M = /* @__PURE__ */ new Map();
  for (const t of d)
    M.has(t.to) || M.set(t.to, []), M.get(t.to).push(t.from);
  function A(t, i, m) {
    const R = (m.get(t) ?? []).filter((U) => i.has(U));
    return R.length === 0 ? _.get(t) : R.reduce((U, Z) => U + (_.get(Z) ?? 0), 0) / R.length;
  }
  for (let t = 0; t < o; t++) {
    for (let i = 1; i < p.length; i++) {
      const m = new Set(p[i - 1]);
      p[i].sort((R, K) => {
        const U = A(R, m, M), Z = A(K, m, M);
        return U !== Z ? U - Z : _.get(R) - _.get(K);
      }), x();
    }
    for (let i = p.length - 2; i >= 0; i--) {
      const m = new Set(p[i + 1]);
      p[i].sort((R, K) => {
        const U = A(R, m, l), Z = A(K, m, l);
        return U !== Z ? U - Z : _.get(R) - _.get(K);
      }), x();
    }
  }
  const b = y === "TB" || y === "BT", r = y === "RL" || y === "BT", s = p.map(
    (t) => t.reduce((i, m) => Math.max(i, b ? u[m].h : u[m].w), 0)
  ), g = p.map(
    (t) => t.reduce((i, m) => i + (b ? u[m].w : u[m].h), 0) + Math.max(t.length - 1, 0) * Ye
  ), k = Math.max(...g), H = [];
  {
    let t = we;
    for (let i = 0; i < p.length; i++)
      H.push(t), t += s[i] + hn;
  }
  const I = /* @__PURE__ */ new Map();
  p.forEach((t, i) => {
    let m = we + (k - g[i]) / 2;
    for (const R of t) {
      const K = u[R].w, U = u[R].h, Z = b ? U : K, ee = H[i] + (s[i] - Z) / 2;
      I.set(R, {
        id: R,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: b ? m : ee,
        y: b ? ee : m,
        w: K,
        h: U
      }), m += (b ? K : U) + Ye;
    }
  });
  let V = 0, J = 0;
  for (const t of I.values())
    V = Math.max(V, t.x + t.w), J = Math.max(J, t.y + t.h);
  if (V += we, J += we, r)
    for (const t of I.values())
      y === "RL" ? t.x = V - t.x - t.w : t.y = J - t.y - t.h;
  {
    let t = !1;
    for (const i of e) {
      const m = I.get(i.id);
      m && (typeof i.x == "number" && (m.x = i.x, t = !0), typeof i.y == "number" && (m.y = i.y, t = !0));
    }
    if (t) {
      V = 0, J = 0;
      for (const i of I.values())
        V = Math.max(V, i.x + i.w), J = Math.max(J, i.y + i.h);
      V += we, J += we;
    }
  }
  const Ce = Math.max(0, ...[...I.values()].map((t) => t.x + t.w)), _e = Math.max(0, ...[...I.values()].map((t) => t.y + t.h)), O = [], D = [], F = [], f = [];
  p.forEach((t, i) => {
    let m = 1 / 0, R = -1 / 0, K = 1 / 0, U = -1 / 0;
    for (const Z of t) {
      const ee = I.get(Z);
      ee && (m = Math.min(m, ee.x), R = Math.max(R, ee.x + ee.w), K = Math.min(K, ee.y), U = Math.max(U, ee.y + ee.h));
    }
    O[i] = m, D[i] = R, F[i] = K, f[i] = U;
  });
  const v = /* @__PURE__ */ new Map();
  {
    let t = 0;
    d.forEach((i, m) => {
      const R = Math.abs((N.get(i.to) ?? 0) - (N.get(i.from) ?? 0));
      (S.has(m) || R >= 2) && v.set(m, t++);
    });
  }
  const E = [];
  if (d.forEach((t, i) => {
    const m = I.get(t.from), R = I.get(t.to);
    if (!m || !R) return;
    const K = S.has(i), U = v.get(i);
    let Z, ee;
    if (U !== void 0) {
      const se = N.get(t.from) ?? 0, ae = N.get(t.to) ?? 0;
      if (b) {
        const le = m.x + m.w / 2, ie = r ? m.y : m.y + m.h, pe = R.x + R.w / 2, ve = r ? R.y : R.y + R.h, re = r ? F[se] - de : f[se] + de, ce = r ? F[ae] - de : f[ae] + de, Q = Ce + Re + U * de;
        Z = `M ${le},${ie} L ${le},${re} L ${Q},${re} L ${Q},${ce} L ${pe},${ce} L ${pe},${ve}`, ee = { x: Q, y: (re + ce) / 2 };
      } else {
        const le = r ? m.x : m.x + m.w, ie = m.y + m.h / 2, pe = r ? R.x : R.x + R.w, ve = R.y + R.h / 2, re = r ? O[se] - de : D[se] + de, ce = r ? O[ae] - de : D[ae] + de, Q = _e + Re + U * de;
        Z = `M ${le},${ie} L ${re},${ie} L ${re},${Q} L ${ce},${Q} L ${ce},${ve} L ${pe},${ve}`, ee = { x: (re + ce) / 2, y: Q };
      }
    } else {
      let se, ae, le, ie, pe, ve, re, ce;
      if (b) {
        const Q = r ? -1 : 1;
        se = m.x + m.w / 2, ae = m.y + (Q > 0 ? m.h : 0), le = R.x + R.w / 2, ie = R.y + (Q > 0 ? 0 : R.h);
        const Te = Math.max(40, Math.abs(ie - ae) / 2);
        pe = se, ve = ae + Te * Q, re = le, ce = ie - Te * Q;
      } else {
        const Q = r ? -1 : 1;
        se = m.x + (Q > 0 ? m.w : 0), ae = m.y + m.h / 2, le = R.x + (Q > 0 ? 0 : R.w), ie = R.y + R.h / 2;
        const Te = Math.max(40, Math.abs(le - se) / 2);
        pe = se + Te * Q, ve = ae, re = le - Te * Q, ce = ie;
      }
      Z = `M ${se},${ae} C ${pe},${ve} ${re},${ce} ${le},${ie}`, ee = {
        x: (se + 3 * pe + 3 * re + le) / 8,
        y: (ae + 3 * ve + 3 * ce + ie) / 8
      };
    }
    E.push({ from: t.from, to: t.to, label: t.label, path: Z, labelPos: ee, isBackEdge: K });
  }), v.size > 0) {
    const t = v.size - 1;
    b ? V = Math.max(V, Ce + Re + t * de + we) : J = Math.max(J, _e + Re + t * de + we);
  }
  return { nodes: I, edges: E, width: V, height: J };
}
const wn = { class: "nm-flow-canvas" }, xn = ["width", "height"], kn = ["id"], _n = ["d", "marker-end"], bn = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], $n = { class: "nm-flow__node-inner" }, Cn = { class: "nm-flow__node-text" }, Tn = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, Mn = /* @__PURE__ */ ye({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(n, { emit: o }) {
    const e = n, d = o, y = X(), w = ot("nm-flow-arrow"), u = X(null), l = W(() => {
      const s = u.value;
      if (!s) return je(e.graph);
      const g = e.graph.nodes.map(
        (k) => k.id === s.id ? { ...k, x: s.x, y: s.y } : k
      );
      return je({ ...e.graph, nodes: g });
    }), a = W(() => {
      const s = new Map(e.graph.nodes.map((g) => [g.id, g]));
      return [...l.value.nodes.values()].map((g) => {
        var k, H, I;
        return {
          ...g,
          shape: ((k = s.get(g.id)) == null ? void 0 : k.shape) ?? "rect",
          docPath: (H = s.get(g.id)) == null ? void 0 : H.docPath,
          label: ((I = s.get(g.id)) == null ? void 0 : I.label) ?? g.id
        };
      });
    }), N = W(() => l.value.edges.filter((s) => s.label));
    me(
      l,
      () => {
        u.value || fe(() => {
          requestAnimationFrame(() => {
            var s;
            return (s = y.value) == null ? void 0 : s.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let S = !1;
    function T(s) {
      if (S) {
        S = !1;
        return;
      }
      s && d("navigate", s);
    }
    const h = X(null), $ = X(null);
    function p() {
      window.addEventListener("pointermove", x), window.addEventListener("pointerup", A), window.addEventListener("pointercancel", b);
    }
    function c() {
      window.removeEventListener("pointermove", x), window.removeEventListener("pointerup", A), window.removeEventListener("pointercancel", b);
    }
    function _(s, g) {
      var I;
      if (!e.editable || s.button !== 0) return;
      const k = (I = h.value) == null ? void 0 : I.getBoundingClientRect(), H = k && l.value.width > 0 ? k.width / l.value.width : 1;
      $.value = {
        id: g.id,
        startClientX: s.clientX,
        startClientY: s.clientY,
        lastClientX: s.clientX,
        lastClientY: s.clientY,
        scale: H || 1,
        baseX: g.x,
        baseY: g.y,
        moved: !1,
        raf: 0
      }, p();
    }
    function x(s) {
      const g = $.value;
      g && (g.lastClientX = s.clientX, g.lastClientY = s.clientY, g.raf || (g.raf = requestAnimationFrame(M)));
    }
    function M() {
      const s = $.value;
      if (!s) return;
      s.raf = 0;
      const g = (s.lastClientX - s.startClientX) / s.scale, k = (s.lastClientY - s.startClientY) / s.scale;
      !s.moved && Math.hypot(g, k) < 3 || (s.moved = !0, u.value = {
        id: s.id,
        x: Math.round(s.baseX + g),
        y: Math.round(s.baseY + k)
      });
    }
    function A() {
      c();
      const s = $.value;
      $.value = null, s != null && s.raf && cancelAnimationFrame(s.raf);
      const g = u.value;
      u.value = null, !(!(s != null && s.moved) || !g) && (S = !0, setTimeout(() => {
        S = !1;
      }, 0), d("nodeMove", { id: s.id, x: g.x, y: g.y }));
    }
    function b() {
      c();
      const s = $.value;
      $.value = null, s != null && s.raf && cancelAnimationFrame(s.raf), u.value = null;
    }
    Se(() => {
      var s;
      c(), (s = $.value) != null && s.raf && cancelAnimationFrame($.value.raf);
    });
    function r(s, g) {
      g && (s.key === "Enter" || s.key === " ") && (s.preventDefault(), d("navigate", g));
    }
    return (s, g) => (z(), q("div", wn, [
      C(gt, {
        ref_key: "canvasRef",
        ref: y,
        width: "100%",
        height: n.height,
        "show-grid": n.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: B(() => [
          L("div", {
            ref_key: "flowEl",
            ref: h,
            class: ne(["nm-flow", { "nm-flow--editable": n.editable }]),
            style: Ie({ width: `${l.value.width}px`, height: `${l.value.height}px` })
          }, [
            (z(), q("svg", {
              class: "nm-flow__edges",
              width: l.value.width,
              height: l.value.height,
              "aria-hidden": "true"
            }, [
              L("defs", null, [
                L("marker", {
                  id: P(w),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...g[0] || (g[0] = [
                  L("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, kn)
              ]),
              (z(!0), q(ge, null, xe(l.value.edges, (k, H) => (z(), q("path", {
                key: H,
                d: k.path,
                class: ne(["nm-flow__edge", { "nm-flow__edge--back": k.isBackEdge }]),
                "marker-end": `url(#${P(w)})`
              }, null, 10, _n))), 128))
            ], 8, xn)),
            (z(!0), q(ge, null, xe(N.value, (k, H) => (z(), q("div", {
              key: `label-${H}`,
              class: "nm-flow__edge-label",
              style: Ie({ left: `${k.labelPos.x}px`, top: `${k.labelPos.y}px` })
            }, Y(k.label), 5))), 128)),
            (z(!0), q(ge, null, xe(a.value, (k) => (z(), q("div", {
              key: k.id,
              class: ne(["nm-flow__node", [`nm-flow__node--${k.shape}`, { "nm-flow__node--link": k.docPath }]]),
              style: Ie({
                left: `${k.x}px`,
                top: `${k.y}px`,
                width: `${k.w}px`,
                height: `${k.h}px`
              }),
              role: k.docPath ? "link" : void 0,
              tabindex: k.docPath ? 0 : void 0,
              "aria-label": k.docPath ? `${k.label}（跳转到文档）` : k.label,
              "data-nm-no-pan": "",
              onPointerdown: (H) => _(H, k),
              onClick: (H) => T(k.docPath),
              onKeydown: (H) => r(H, k.docPath)
            }, [
              L("div", $n, [
                L("span", Cn, Y(k.label), 1),
                k.docPath ? (z(), q("span", Tn, [
                  C(G, {
                    name: "external",
                    size: "xs"
                  })
                ])) : oe("", !0)
              ])
            ], 46, bn))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), it = /* @__PURE__ */ Ae(Mn, [["__scopeId", "data-v-5be4baf8"]]);
function rt(n) {
  return n.map((o) => {
    const e = o;
    return e.text ? String(e.text) : e.tokens ? rt(e.tokens) : "";
  }).join("");
}
function Sn(n) {
  const o = ot("toc");
  function e(u) {
    return `${o}-${Fe(u)}`;
  }
  function d(u) {
    const l = [], a = /* @__PURE__ */ new Set(), N = Pe.lexer(u);
    for (const S of N)
      if (S.type === "heading") {
        const T = rt(S.tokens);
        let h = Fe(T);
        h || (h = "heading");
        let $ = `${o}-${h}`, p = 1;
        for (; a.has($); )
          $ = `${o}-${h}-${p}`, p++;
        a.add($), l.push({
          level: S.depth,
          text: T,
          id: $
        });
      }
    return l;
  }
  const y = W(() => d(n.value)), w = W(() => {
    const u = y.value, l = [], a = [];
    for (const N of u) {
      const S = { level: N.level, text: N.text, id: N.id, children: [] };
      for (; a.length > 0 && a[a.length - 1].level >= S.level; )
        a.pop();
      a.length === 0 ? l.push(S) : a[a.length - 1].children.push(S), a.push(S);
    }
    return l;
  });
  return { toc: y, tocTree: w, makeUniqueId: e };
}
const Nn = { class: "neumorphism-markdown-body" }, En = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, Ln = { class: "neumorphism-markdown-error-title" }, Rn = { class: "neumorphism-markdown-error-msg" }, Dn = ["innerHTML"], zn = ["aria-label"], An = { class: "neumorphism-toc-mobile-header" }, In = { class: "neumorphism-toc-mobile-title" }, Pn = ["aria-label"], ct = /* @__PURE__ */ ye({
  __name: "MarkdownRenderer",
  props: {
    content: {},
    className: { default: "" },
    showToc: { type: Boolean, default: !0 },
    scrollContainer: {},
    flowEditable: { type: Boolean, default: !1 }
  },
  emits: ["docLink", "flowNodeMove"],
  setup(n, { emit: o }) {
    const e = n, d = o, y = X(null), w = X(!1), { t: u } = ze(), { toc: l, tocTree: a, makeUniqueId: N } = Sn(Oe(e, "content"));
    function S(f) {
      r(f), w.value = !1;
    }
    const T = new Pe.Renderer();
    T.code = ({ text: f, lang: v }) => v === "mermaid" ? `<div class="mermaid-diagram" data-mermaid="${he(f)}"><pre><code>${he(f)}</code></pre></div>` : v === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${he(f)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${he(v || "text")}"><pre><code>${he(f)}</code></pre></div>`, T.codespan = ({ text: f }) => `<code class="inline-code">${he(f)}</code>`, T.image = ({ href: f, title: v, text: E }) => `<img src="${f}" alt="${he(E)}" title="${he(v || "")}" loading="lazy" />`, T.listitem = function({ tokens: f, task: v, checked: E }) {
      if (v) {
        const t = this.parser.parse(f.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${E ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${t}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(f)}</li>`;
    };
    const h = X(null), $ = X("");
    let p = null, c = !1, _ = !1;
    function x() {
      c || (c = !0, import("dompurify").then((f) => {
        const v = f == null ? void 0 : f.default;
        v && typeof v.sanitize == "function" && (p = (E) => v.sanitize(E, {
          // Preserve the data-* hooks emitted by this renderer.
          ADD_ATTR: ["data-mermaid", "data-code", "data-heading-id", "data-lang", "target"]
        }), M());
      }).catch(() => {
        _ || (_ = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function M() {
      h.value = null;
      try {
        const f = l.value.map((i) => i.id);
        let v = 0;
        const E = Object.create(T);
        E.heading = ({ tokens: i, depth: m }) => {
          const R = A(i), K = f[v++] ?? N(R);
          return `<h${m} id="${K}"><a href="#" data-heading-id="${K}" class="heading-anchor" aria-hidden="true">#</a>${R}</h${m}>`;
        };
        const t = Pe.parse(e.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: E
        });
        $.value = p ? p(t) : t;
      } catch (f) {
        h.value = f.message || "Unknown error rendering markdown", $.value = "";
      }
    }
    function A(f) {
      return f.map((v) => {
        const E = v;
        return E.text ? String(E.text) : E.tokens ? A(E.tokens) : "";
      }).join("");
    }
    x(), me(() => e.content, M, { immediate: !0 });
    const { activeHeading: b, scrollToHeading: r } = Dt({
      content: y,
      scrollContainer: Oe(e, "scrollContainer"),
      watchSource: () => $.value
    }), s = X(/* @__PURE__ */ new Set());
    me(
      () => e.content,
      () => {
        s.value = /* @__PURE__ */ new Set();
      }
    );
    async function g() {
      if (!y.value) return;
      const f = y.value.querySelectorAll(".mermaid-diagram");
      if (f.length !== 0)
        try {
          const v = await import("mermaid").catch(() => null);
          if (!(v != null && v.default)) return;
          let E = 0;
          for (const t of Array.from(f)) {
            const i = t.getAttribute("data-mermaid") ?? t.textContent ?? "";
            if (i.trim())
              try {
                const { svg: m } = await v.default.render(`nm-mermaid-${Date.now()}-${E++}`, i);
                t.innerHTML = m, t.setAttribute("data-processed", "true");
              } catch {
              }
          }
        } catch {
        }
    }
    me($, () => {
      J(), fe(k);
    }), ut(k);
    function k() {
      g(), O(), D(), Ce();
    }
    let H = [], I = null;
    const V = mt();
    function J() {
      const f = /* @__PURE__ */ new Map();
      for (const v of H) {
        const E = f.get(v.key) ?? [];
        E.push({ rootEl: v.rootEl, ownerContainer: v.ownerContainer }), f.set(v.key, E);
      }
      H = [], I = f;
    }
    function Ce() {
      if (I) {
        for (const f of I.values())
          for (const v of f)
            Ne(null, v.ownerContainer);
        I = null;
      }
    }
    function _e(f, v, E) {
      const t = I == null ? void 0 : I.get(v), i = t == null ? void 0 : t.shift();
      if (t && t.length === 0 && (I == null || I.delete(v)), f.innerHTML = "", i) {
        f.appendChild(i.rootEl), H.push({
          key: v,
          rootEl: i.rootEl,
          ownerContainer: i.ownerContainer
        });
        return;
      }
      const m = E();
      m.appContext = (V == null ? void 0 : V.appContext) ?? null, Ne(m, f);
      const R = f.firstElementChild;
      R && H.push({ key: v, rootEl: R, ownerContainer: f });
    }
    function O() {
      if (!y.value) return;
      y.value.querySelectorAll(".prodoc-flow-diagram").forEach((v, E) => {
        var m;
        const t = ((m = v.querySelector("pre code")) == null ? void 0 : m.textContent) ?? v.textContent ?? "", i = lt(t);
        i.nodes.length !== 0 && _e(
          v,
          `flow:${t}`,
          () => qe(it, {
            graph: i,
            height: "420px",
            editable: e.flowEditable,
            onNavigate: (R) => d("docLink", R),
            onNodeMove: (R) => d("flowNodeMove", { ...R, source: t, blockIndex: E })
          })
        );
      });
    }
    function D() {
      var v;
      if (!y.value) return;
      const f = y.value.querySelectorAll(".doc-code-block-mount");
      for (const E of f) {
        const t = ((v = E.querySelector("pre code")) == null ? void 0 : v.textContent) ?? E.textContent ?? "", i = E.dataset.lang || "text";
        _e(E, `code:${i}:${t}`, () => qe(dn, { code: t, lang: i }));
      }
    }
    function F(f) {
      const v = f.target, E = v.closest(".heading-anchor");
      if (E) {
        const i = E.dataset.headingId;
        i && (f.preventDefault(), r(i));
        return;
      }
      const t = v.closest("a");
      if (t) {
        const i = t.getAttribute("href");
        i && !i.startsWith("//") && (i.startsWith("/") || i.startsWith(".") || i.endsWith(".md")) && (f.preventDefault(), d("docLink", i));
      }
    }
    return Se(() => {
      for (const f of H)
        Ne(null, f.ownerContainer);
      if (H = [], I) {
        for (const f of I.values())
          for (const v of f)
            Ne(null, v.ownerContainer);
        I = null;
      }
    }), (f, v) => (z(), q("div", {
      class: ne(`neumorphism-markdown ${e.className}`)
    }, [
      L("div", Nn, [
        h.value ? (z(), q("div", En, [
          L("p", Ln, [
            C(G, {
              name: "warning",
              size: "md"
            }),
            v[5] || (v[5] = j(" 渲染错误 ", -1))
          ]),
          L("pre", Rn, Y(h.value), 1)
        ])) : (z(), q("div", {
          key: 1,
          ref_key: "contentRef",
          ref: y,
          class: "neumorphism-markdown-content",
          onClick: F,
          innerHTML: $.value
        }, null, 8, Dn))
      ]),
      n.showToc && P(l).length > 0 ? (z(), ue(Ke, {
        key: 0,
        "collapsed-groups": s.value,
        "onUpdate:collapsedGroups": v[0] || (v[0] = (E) => s.value = E),
        items: P(a),
        "active-id": P(b),
        onSelect: P(r)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : oe("", !0),
      n.showToc && P(l).length > 0 ? (z(), q("button", {
        key: 1,
        class: ne(["neumorphism-toc-mobile-btn", { active: w.value }]),
        "aria-label": P(u)("markdownTocToggle"),
        onClick: v[1] || (v[1] = (E) => w.value = !w.value)
      }, [
        C(G, {
          name: "list",
          size: "2xl"
        })
      ], 10, zn)) : oe("", !0),
      C(Qe, { name: "neumorphism-toc-drawer" }, {
        default: B(() => [
          n.showToc && P(l).length > 0 && w.value ? (z(), q("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: v[4] || (v[4] = ft((E) => w.value = !1, ["self"]))
          }, [
            C(ke, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: B(() => [
                L("div", An, [
                  L("span", In, [
                    C(G, {
                      name: "list",
                      size: "sm"
                    }),
                    j(" " + Y(P(u)("markdownTocLabel")), 1)
                  ]),
                  L("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": P(u)("markdownTocClose"),
                    onClick: v[2] || (v[2] = (E) => w.value = !1)
                  }, [
                    C(G, {
                      name: "close",
                      size: "sm"
                    })
                  ], 8, Pn)
                ]),
                C(Ke, {
                  "collapsed-groups": s.value,
                  "onUpdate:collapsedGroups": v[3] || (v[3] = (E) => s.value = E),
                  items: P(a),
                  "active-id": P(b),
                  framed: !1,
                  onSelect: S
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
}), dt = /* @__PURE__ */ ye({
  __name: "DocTreeIcon",
  props: {
    name: { default: "file" },
    size: { default: 14 }
  },
  setup(n) {
    const o = n, e = {
      folder: "folder",
      file: "file",
      api: "plug",
      guide: "guide",
      config: "config",
      example: "example",
      install: "install",
      changelog: "changelog",
      faq: "faq"
    }, d = W(() => e[o.name] ?? "file");
    return (y, w) => (z(), ue(G, {
      name: d.value,
      size: o.size
    }, null, 8, ["name", "size"]));
  }
}), Bn = { class: "neumorphism-header-brand" }, Hn = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, On = { class: "neumorphism-header-search" }, qn = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, Fn = { class: "neumorphism-search-list" }, Wn = ["onClick"], Gn = { class: "neumorphism-search-title" }, Vn = { class: "neumorphism-search-path" }, Kn = {
  key: 0,
  class: "neumorphism-sider-content"
}, Xn = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, Un = { class: "neumorphism-doc-header" }, Yn = { class: "neumorphism-doc-title" }, jn = { class: "neumorphism-doc-meta" }, Qn = { class: "neumorphism-doc-body" }, Zn = {
  key: 1,
  class: "neumorphism-empty-state"
}, Jn = { class: "neumorphism-doc-empty-icon" }, eo = /* @__PURE__ */ ye({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(n, { emit: o }) {
    const e = n, d = o, {
      selectedPath: y,
      selectedKeys: w,
      expandedKeys: u,
      treeData: l,
      displayNode: a,
      themeModel: N,
      searchQuery: S,
      searchResults: T,
      docTree: h,
      handleTreeSelect: $,
      handleDocLink: p,
      handleSearchSelect: c
    } = at({ root: e.root, initialPath: e.initialPath });
    function _(b) {
      p(d, b);
    }
    const x = X("doc"), M = W(
      () => a.value ? Ve(a.value) : null
    );
    me(a, () => {
      x.value = "doc";
    });
    function A(b) {
      const r = h.value.findByPath(b) ?? h.value.findByPath(`/${b}`) ?? h.value.findByPath(b.replace(/^\//, ""));
      r && (p(d, r.path), Ve(r) || (x.value = "doc"));
    }
    return (b, r) => (z(), q("div", {
      class: ne(`neumorphism-doc-viewer ${e.className}`)
    }, [
      C(Ze, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": B(() => [
          L("span", Bn, [
            C(G, {
              name: "book",
              size: "md"
            }),
            r[7] || (r[7] = j(" Doc Viewer", -1))
          ])
        ]),
        "header-right": B(() => [
          L("div", Hn, [
            C(te, {
              size: "small",
              variant: x.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": x.value === "doc",
              onClick: r[0] || (r[0] = (s) => x.value = "doc")
            }, {
              default: B(() => [
                C(G, {
                  name: "file-text",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                r[8] || (r[8] = j(" 文档 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            C(te, {
              size: "small",
              variant: x.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": x.value === "canvas",
              disabled: !M.value,
              title: M.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: r[1] || (r[1] = (s) => x.value = "canvas")
            }, {
              default: B(() => [
                C(G, {
                  name: "map",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                r[9] || (r[9] = j(" 画布 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          L("div", On, [
            C(pt, {
              modelValue: P(S),
              "onUpdate:modelValue": r[2] || (r[2] = (s) => $e(S) ? S.value = s : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            P(T).length > 0 ? (z(), q("div", qn, [
              L("ul", Fn, [
                (z(!0), q(ge, null, xe(P(T), (s) => (z(), q("li", {
                  key: s.id,
                  class: "neumorphism-search-item",
                  onClick: (g) => P(c)(s)
                }, [
                  L("span", Gn, Y(s.title), 1),
                  L("span", Vn, Y(s.path), 1)
                ], 8, Wn))), 128))
              ])
            ])) : oe("", !0)
          ]),
          C(Je, {
            modelValue: P(N),
            "onUpdate:modelValue": r[3] || (r[3] = (s) => $e(N) ? N.value = s : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: B(({ collapsed: s }) => [
          s ? (z(), q("div", Xn, [
            C(G, {
              name: "book",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (z(), q("div", Kn, [
            C(et, {
              "selected-keys": P(w),
              "onUpdate:selectedKeys": r[4] || (r[4] = (g) => $e(w) ? w.value = g : null),
              "expanded-keys": P(u),
              "onUpdate:expandedKeys": r[5] || (r[5] = (g) => $e(u) ? u.value = g : null),
              data: P(l),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: P($)
            }, {
              icon: B(({ node: g }) => [
                C(dt, {
                  name: String(g.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: B(() => [
          C(nt, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: B(() => [
              C(ke, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: B(() => [
                  P(a) ? (z(), q(ge, { key: 0 }, [
                    L("div", Un, [
                      L("h1", Yn, Y(P(a).title), 1),
                      L("div", jn, [
                        P(a).path ? (z(), ue(Me, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: B(() => [
                            j(Y(P(a).path), 1)
                          ]),
                          _: 1
                        })) : oe("", !0),
                        P(a).children.length > 0 ? (z(), ue(Me, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: B(() => [
                            C(G, {
                              name: "folder",
                              size: "sm",
                              class: "neumorphism-doc-icon-inline"
                            }),
                            r[10] || (r[10] = j(" { displayNode.children.length } 个子项 ", -1))
                          ]),
                          _: 1
                        })) : oe("", !0)
                      ])
                    ]),
                    C(tt),
                    L("div", Qn, [
                      C(Qe, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: B(() => [
                          x.value === "doc" ? (z(), ue(ct, {
                            key: P(a).path,
                            content: P(a).body,
                            onDocLink: _
                          }, null, 8, ["content"])) : M.value ? (z(), ue(it, {
                            key: `${P(a).path}:canvas`,
                            graph: M.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: A
                          }, null, 8, ["graph"])) : oe("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (z(), q("div", Zn, [
                    C(ke, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: B(() => [
                        L("span", Jn, [
                          C(G, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    r[12] || (r[12] = L("p", null, "请从左侧选择一篇文档", -1)),
                    C(te, {
                      variant: "raised",
                      size: "small",
                      onClick: r[6] || (r[6] = (s) => {
                        var g;
                        return y.value = ((g = P(l)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: B(() => [...r[11] || (r[11] = [
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
}), Qo = /* @__PURE__ */ Ae(eo, [["__scopeId", "data-v-9ec4eb2c"]]), to = { class: "neumorphism-editor-toolbar" }, no = { class: "neumorphism-editor-toolbar-left" }, oo = { class: "neumorphism-editor-toolbar-right" }, so = ["aria-selected", "tabindex", "onClick", "onKeydown"], ao = { class: "nm-tabs__tab-label" }, lo = { class: "editor-stat" }, io = /* @__PURE__ */ ye({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(n, { emit: o }) {
    const e = n, d = o, y = X("split");
    function w(O) {
      d("docLink", O);
    }
    function u(O, D) {
      if (O.key !== "ArrowLeft" && O.key !== "ArrowRight") return;
      O.preventDefault();
      const F = l.findIndex((E) => E.key === D), f = O.key === "ArrowRight" ? 1 : -1, v = l[(F + f + l.length) % l.length];
      y.value = v.key, fe(() => {
        var E, t;
        (t = (E = O.target.closest(".nm-tabs__nav")) == null ? void 0 : E.querySelectorAll(".nm-tabs__tab")[l.indexOf(v)]) == null || t.focus();
      });
    }
    const l = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], a = W(() => e.value.length), N = W(() => e.value.split(`
`).length), S = X(null), T = X(null);
    let h = !1;
    function $() {
      var O;
      return (O = S.value) == null ? void 0 : O.querySelector("textarea");
    }
    function p(O, D, F) {
      const f = $();
      if (!f) return;
      const v = f.selectionStart, E = f.selectionEnd, t = f.value.slice(v, E) || F, i = f.value.slice(0, v) + O + t + D + f.value.slice(E);
      d("change", i), fe(() => {
        f.focus();
        const m = v + O.length;
        f.setSelectionRange(m, m + t.length);
      });
    }
    function c(O, D) {
      const F = $();
      if (!F) return;
      const f = F.selectionStart, v = F.value.slice(0, f), E = F.value.slice(f), m = `${v.length > 0 && !v.endsWith(`
`) ? `
` : ""}${O} ${D}
`, R = v + m + E;
      d("change", R), fe(() => {
        F.focus();
        const K = f + m.length - D.length - 2;
        F.setSelectionRange(K, K + D.length);
      });
    }
    function _() {
      p("**", "**", "粗体文字");
    }
    function x() {
      p("_", "_", "斜体文字");
    }
    function M() {
      c("##", "标题");
    }
    function A() {
      p("[", "](url)", "链接文字");
    }
    function b() {
      c("![alt text]", "(url)");
    }
    function r() {
      p("`", "`", "代码");
    }
    function s() {
      c("```\n", "code\n```");
    }
    function g() {
      c("-", "列表项");
    }
    function k() {
      const O = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, D = $();
      if (!D) return;
      const F = D.selectionStart, f = D.value.slice(0, F) + O + D.value.slice(D.selectionEnd);
      d("change", f), fe(() => {
        D.focus(), D.setSelectionRange(F + 3, F + 3);
      });
    }
    function H(O) {
      var v, E;
      const D = (E = (v = O.dataTransfer) == null ? void 0 : v.files) == null ? void 0 : E[0];
      if (!(D != null && D.type.startsWith("image/"))) return;
      O.preventDefault(), O.stopPropagation();
      const F = new FileReader(), f = D.name;
      F.onload = () => {
        const t = $();
        if (!t) return;
        const i = t.selectionStart, m = `![${f}](${F.result})`, R = t.value.slice(0, i) + m + t.value.slice(i);
        d("change", R), fe(() => {
          t.focus(), t.setSelectionRange(i + m.length, i + m.length);
        });
      }, F.readAsDataURL(D);
    }
    function I(O) {
      var D;
      (D = O.dataTransfer) != null && D.types.includes("Files") && O.preventDefault();
    }
    let V = null;
    function J() {
      e.autoSave && (V && clearTimeout(V), V = setTimeout(() => {
        d("change", e.value);
      }, e.autoSaveInterval));
    }
    me(
      () => e.value,
      () => {
        J();
      }
    ), Se(() => {
      V && clearTimeout(V);
    });
    function Ce() {
      var f;
      if (h || y.value !== "split") return;
      const O = (f = S.value) == null ? void 0 : f.querySelector("textarea"), D = T.value;
      if (!O || !D) return;
      const F = O.scrollTop / (O.scrollHeight - O.clientHeight || 1);
      h = !0, D.scrollTop = F * (D.scrollHeight - D.clientHeight), requestAnimationFrame(() => {
        h = !1;
      });
    }
    function _e() {
      var f;
      if (h || y.value !== "split") return;
      const O = (f = S.value) == null ? void 0 : f.querySelector("textarea"), D = T.value;
      if (!O || !D) return;
      const F = D.scrollTop / (D.scrollHeight - D.clientHeight || 1);
      h = !0, O.scrollTop = F * (O.scrollHeight - O.clientHeight), requestAnimationFrame(() => {
        h = !1;
      });
    }
    return (O, D) => (z(), q("div", {
      class: ne(`neumorphism-markdown-editor ${e.className}`)
    }, [
      L("div", to, [
        L("div", no, [
          C(te, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: _
          }, {
            default: B(() => [...D[2] || (D[2] = [
              L("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            "aria-label": "斜体",
            onClick: x
          }, {
            default: B(() => [...D[3] || (D[3] = [
              L("em", null, "I", -1)
            ])]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "标题",
            "aria-label": "标题",
            onClick: M
          }, {
            default: B(() => [...D[4] || (D[4] = [
              j(" H ", -1)
            ])]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: A
          }, {
            default: B(() => [
              C(G, {
                name: "link",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "图片",
            "aria-label": "图片",
            onClick: b
          }, {
            default: B(() => [
              C(G, {
                name: "image",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "行内代码",
            "aria-label": "行内代码",
            onClick: r
          }, {
            default: B(() => [...D[5] || (D[5] = [
              j(" </> ", -1)
            ])]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: s
          }, {
            default: B(() => [
              C(G, {
                name: "clipboard",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "无序列表",
            "aria-label": "无序列表",
            onClick: g
          }, {
            default: B(() => [
              C(G, {
                name: "list",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          C(te, {
            size: "small",
            title: "表格",
            "aria-label": "表格",
            onClick: k
          }, {
            default: B(() => [
              C(G, {
                name: "table",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          })
        ]),
        L("div", oo, [
          C(yt, {
            modelValue: y.value,
            "onUpdate:modelValue": D[0] || (D[0] = (F) => y.value = F),
            tabs: l,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: B(({ tab: F, active: f, activate: v }) => [
              L("button", {
                type: "button",
                class: ne(["nm-tabs__tab", { "nm-tabs__tab--active": f }]),
                role: "tab",
                "aria-selected": f,
                tabindex: f ? 0 : -1,
                onClick: (E) => v(F.key),
                onKeydown: (E) => u(E, F.key)
              }, [
                C(G, {
                  name: F.key === "edit" ? "pencil" : F.key === "split" ? "split" : "eye",
                  size: "sm",
                  class: "neumorphism-editor-icon"
                }, null, 8, ["name"]),
                L("span", ao, Y(F.label), 1)
              ], 42, so)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          L("span", lo, Y(N.value) + " 行 · " + Y(a.value) + " 字", 1)
        ])
      ]),
      L("div", {
        class: ne(["neumorphism-editor-panels", `neumorphism-mode-${y.value}`])
      }, [
        L("div", {
          ref_key: "editPanelRef",
          ref: S,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: y.value === "preview" }]),
          onScroll: Ce,
          onDrop: H,
          onDragover: I
        }, [
          C(ke, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: B(() => [
              C(wt, {
                class: "neumorphism-editor-textarea",
                "model-value": e.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": D[1] || (D[1] = (F) => d("change", F))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        L("div", {
          ref_key: "previewPanelRef",
          ref: T,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: y.value === "edit" }]),
          onScroll: _e
        }, [
          C(ke, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: B(() => [
              C(ct, {
                content: e.value,
                "show-toc": !1,
                onDocLink: w
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), ro = /* @__PURE__ */ Ae(io, [["__scopeId", "data-v-1d3fd848"]]), co = { class: "neumorphism-editor-brand" }, uo = { class: "neumorphism-editor-actions" }, mo = {
  key: 0,
  class: "neumorphism-editor-sider"
}, fo = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, ho = {
  key: 0,
  class: "neumorphism-editor-layout"
}, po = { class: "neumorphism-editor-header" }, vo = { class: "neumorphism-editor-title" }, go = { class: "neumorphism-editor-meta" }, yo = { class: "neumorphism-editor-body" }, wo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, xo = { class: "neumorphism-doc-empty-icon" }, ko = 50, _o = /* @__PURE__ */ ye({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(n, { emit: o }) {
    const e = n, d = o, {
      selectedPath: y,
      selectedKeys: w,
      expandedKeys: u,
      treeData: l,
      displayNode: a,
      themeModel: N,
      handleTreeSelect: S
    } = at({ root: e.root, initialPath: e.initialPath }), T = X({}), h = X([]);
    function $(b, r) {
      const s = h.value.filter((g) => g !== b);
      for (s.push(b); s.length > ko; ) {
        const g = s.shift();
        g !== b && delete T.value[g];
      }
      h.value = s, T.value[b] = r;
    }
    function p(b) {
      return T.value[b.path] ?? b.content;
    }
    function c(b) {
      a.value && $(a.value.path, b);
    }
    function _() {
      a.value && d("save", a.value.path, p(a.value));
    }
    function x(b) {
      y.value = b, d("docLink", b);
    }
    const M = W(() => {
      if (!a.value) return !1;
      const b = T.value[a.value.path];
      return b !== void 0 && b !== a.value.content;
    });
    function A(b) {
      (b.ctrlKey || b.metaKey) && b.key === "s" && (b.preventDefault(), _());
    }
    return (b, r) => (z(), q("div", {
      class: ne(`neumorphism-doc-editor ${e.className}`),
      onKeydown: A
    }, [
      C(Ze, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": B(() => [
          L("span", co, [
            C(G, {
              name: "pencil",
              size: "md"
            }),
            r[4] || (r[4] = j(" Doc Editor", -1))
          ])
        ]),
        "header-center": B(() => [
          C(Je, {
            modelValue: P(N),
            "onUpdate:modelValue": r[0] || (r[0] = (s) => $e(N) ? N.value = s : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": B(() => [
          L("div", uo, [
            M.value ? (z(), ue(Me, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: B(() => [...r[5] || (r[5] = [
                j(" 未保存 ", -1)
              ])]),
              _: 1
            })) : oe("", !0),
            C(te, {
              variant: "raised",
              size: "small",
              disabled: !M.value,
              onClick: _
            }, {
              default: B(() => [
                C(G, {
                  name: "save",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                r[6] || (r[6] = j(" 保存 ", -1))
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: B(({ collapsed: s }) => [
          s ? (z(), q("div", fo, [
            C(G, {
              name: "pencil",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (z(), q("div", mo, [
            C(et, {
              "selected-keys": P(w),
              "onUpdate:selectedKeys": r[1] || (r[1] = (g) => $e(w) ? w.value = g : null),
              "expanded-keys": P(u),
              "onUpdate:expandedKeys": r[2] || (r[2] = (g) => $e(u) ? u.value = g : null),
              data: P(l),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: P(S)
            }, {
              icon: B(({ node: g }) => [
                C(dt, {
                  name: String(g.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: B(() => [
          C(nt, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: B(() => [
              C(ke, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: B(() => [
                  P(a) ? (z(), q("div", ho, [
                    L("header", po, [
                      L("div", null, [
                        L("h1", vo, Y(P(a).title), 1),
                        L("div", go, [
                          P(a).path ? (z(), ue(Me, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: B(() => [
                              j(Y(P(a).path), 1)
                            ]),
                            _: 1
                          })) : oe("", !0),
                          M.value ? (z(), ue(Me, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: B(() => [...r[7] || (r[7] = [
                              j(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : oe("", !0)
                        ])
                      ]),
                      C(te, {
                        variant: "raised",
                        size: "small",
                        disabled: !M.value,
                        onClick: _
                      }, {
                        default: B(() => [
                          C(G, {
                            name: "save",
                            size: "xl",
                            class: "neumorphism-doc-icon"
                          }),
                          r[8] || (r[8] = j(" 保存 ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    C(tt),
                    L("div", yo, [
                      C(ro, {
                        value: p(P(a)),
                        onChange: c,
                        onDocLink: x
                      }, null, 8, ["value"])
                    ])
                  ])) : (z(), q("div", wo, [
                    C(ke, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: B(() => [
                        L("span", xo, [
                          C(G, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    r[10] || (r[10] = L("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    C(te, {
                      variant: "raised",
                      size: "small",
                      onClick: r[3] || (r[3] = (s) => {
                        var g;
                        return y.value = ((g = P(l)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: B(() => [...r[9] || (r[9] = [
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
}), Zo = /* @__PURE__ */ Ae(_o, [["__scopeId", "data-v-db1006bf"]]), bo = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function $o(n) {
  const o = n.match(bo);
  if (!o)
    return { meta: {}, body: n };
  const e = o[1], d = n.slice(o[0].length), y = {};
  for (const w of e.split(`
`)) {
    const u = w.indexOf(":");
    if (u === -1) continue;
    const l = w.slice(0, u).trim();
    let a = w.slice(u + 1).trim();
    /^-?\d+$/.test(a) ? a = parseInt(a, 10) : /^-?\d+\.\d+$/.test(a) ? a = parseFloat(a) : a === "true" ? a = !0 : a === "false" ? a = !1 : (a.startsWith('"') && a.endsWith('"') || a.startsWith("'") && a.endsWith("'")) && (a = a.slice(1, -1)), y[l] = a;
  }
  return { meta: y, body: d };
}
function Co(n) {
  return n.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function To(n, o) {
  if (o.title && typeof o.title == "string")
    return o.title;
  const e = n.match(/^#\s+(.+)$/m);
  return e ? e[1].trim() : "Untitled";
}
function Mo(n, o) {
  const { meta: e, body: d } = $o(o), y = To(d, e), w = typeof e.order == "number" ? e.order : 9999;
  return {
    id: Co(n),
    title: y,
    path: n,
    content: o,
    body: d,
    meta: e,
    children: [],
    order: w
  };
}
function Jo(n) {
  const o = /* @__PURE__ */ new Map();
  for (const [u, l] of Object.entries(n)) {
    if (!u.endsWith(".md")) continue;
    const a = Mo(u, l);
    o.set(u, a);
  }
  const e = [], d = Array.from(o.keys()).sort();
  for (const u of d) {
    const l = u.split("/");
    if (l.length === 1) {
      e.push(u);
      continue;
    }
    let a = null;
    const S = `${l.slice(0, -1).join("/")}/index.md`;
    if (o.has(S) && S !== u)
      a = S;
    else {
      const T = l.slice(0, -1).join("/") + ".md";
      o.has(T) && (a = T);
    }
    if (a && o.has(a)) {
      const T = o.get(a), h = o.get(u);
      T.children.push(h);
    } else
      e.push(u);
  }
  for (const u of o.values())
    u.children.sort((l, a) => l.order - a.order || l.title.localeCompare(a.title));
  const y = e.map((u) => o.get(u)).sort((u, l) => u.order - l.order || u.title.localeCompare(l.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: y,
    order: 0
  };
}
const es = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  dn as DocCodeBlock,
  Zo as DocEditor,
  it as DocFlowCanvas,
  Ke as DocTocNav,
  dt as DocTreeIcon,
  Qo as DocViewer,
  ro as MarkdownEditor,
  ct as MarkdownRenderer,
  Be as TocNodeItem,
  Jo as buildDocTree,
  Mt as buildHierarchyGraph,
  es as componentCategories,
  kt as createDocTree,
  Mo as createNode,
  $t as extractFlowBlocks,
  To as extractTitle,
  Uo as flattenDocTree,
  Yo as getAncestors,
  xt as getNodeIcon,
  He as getScrollBehavior,
  en as highlightCode,
  je as layoutProDocFlow,
  st as nodeToTreeData,
  $o as parseFrontmatter,
  lt as parseProDocFlow,
  Co as pathToId,
  Ve as resolveCanvasGraph,
  at as useDocLayout,
  Sn as useMarkdownToc,
  Dt as useScrollSpy,
  jo as writeFlowNodePosition
};
