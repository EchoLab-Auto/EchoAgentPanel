import { ref as X, computed as V, watch as fe, onBeforeUnmount as Ee, defineComponent as ye, openBlock as R, createElementBlock as P, normalizeClass as ne, createElementVNode as N, unref as D, createVNode as _, createCommentVNode as oe, toDisplayString as j, Fragment as ve, renderList as xe, createBlock as ue, nextTick as he, withCtx as I, createTextVNode as Q, normalizeStyle as We, toRef as Ye, onMounted as bt, getCurrentInstance as _t, render as Ne, Transition as rt, withModifiers as kt, h as Fe, isRef as _e } from "vue";
import { useTheme as Ct } from "../composables/useTheme.js";
import { N as at } from "../chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as te } from "../chunks/NeumorphismButton-CJnORKTl.js";
import { N as $e } from "../chunks/NeumorphismCard-D5NmwYTE.js";
import { N as ct } from "../chunks/NeumorphismThemeToggle-D2_PXFjy.js";
import { N as dt } from "../chunks/NeumorphismTree-fQBHMCMo.js";
import { N as ut } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as Se } from "../chunks/NeumorphismTag-C6c5RGls.js";
import { N as ft } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as Mt } from "../chunks/NeumorphismInput-Bk0rWMyD.js";
import { marked as mt, Marked as Tt } from "marked";
import { escapeHtml as me, generateId as ht, slugify as je } from "../utils/index.js";
import { useLocale as Oe } from "../composables/useLocale.js";
import { N as K } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as St } from "../composables/useClipboard.js";
import { N as Et } from "../chunks/NeumorphismCanvas-a4F1ouPw.js";
import { _ as qe } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as Nt } from "../chunks/NeumorphismTabs-BKZNO3V6.js";
import { N as Lt } from "../chunks/NeumorphismTextarea-DNgiNkhm.js";
import '../index2.css';function Rt(e) {
  var n;
  const t = ((n = e.path) == null ? void 0 : n.toLowerCase()) || "";
  return t.includes("api") ? "api" : t.includes("guide") ? "guide" : t.includes("config") ? "config" : t.includes("example") ? "example" : t.includes("install") ? "install" : t.includes("changelog") ? "changelog" : t.includes("faq") ? "faq" : "file";
}
function pt(e) {
  const t = e.children.length > 0 ? "folder" : Rt(e);
  return {
    key: e.path,
    label: e.title,
    icon: t,
    children: e.children.map(pt)
  };
}
function At(e) {
  const t = /* @__PURE__ */ new Map();
  function n(h) {
    t.set(h.path, h);
    for (const c of h.children)
      n(c);
  }
  n(e);
  const s = /* @__PURE__ */ new Map();
  function l(h) {
    s.set(h.id, h);
    for (const c of h.children)
      l(c);
  }
  return l(e), {
    root: e,
    nodeMap: t,
    findByPath(h) {
      return t.get(h);
    },
    findById(h) {
      return s.get(h);
    }
  };
}
function Ss(e) {
  const t = [];
  function n(s) {
    t.push(s);
    for (const l of s.children)
      n(l);
  }
  return n(e), t;
}
function Es(e, t) {
  const n = [];
  function s(l, h, c) {
    if (l.id === h)
      return n.push(...c), !0;
    for (const r of l.children)
      if (s(r, h, [...c, l]))
        return !0;
    return !1;
  }
  return s(t, e.id, []), n;
}
function gt(e) {
  var g;
  const { root: t, initialPath: n } = e, s = typeof window < "u", l = e.syncUrlHash !== !1 && s, h = s ? window.location.hash.slice(1) : "", c = n || h || ((g = t.children[0]) == null ? void 0 : g.path) || "", r = X(c), d = X([]), { theme: T, setTheme: E } = Ct(), M = V({
    get: () => T.value,
    set: (w) => E(w)
  }), v = V(() => t.children.map(pt)), k = X(r.value ? [r.value] : []);
  fe(r, (w) => {
    k.value = w ? [w] : [];
  });
  const p = V(() => At(t)), f = V(() => {
    if (r.value)
      return p.value.findByPath(r.value);
  }), $ = V(() => f.value || t.children[0]);
  function y(w) {
    r.value = w;
  }
  function S(w, H) {
    r.value = H, w("docLink", H);
  }
  const A = X(""), b = V(() => {
    if (!A.value.trim()) return [];
    const w = A.value.toLowerCase();
    return a(t).filter((B) => B.id === "root" ? !1 : B.title.toLowerCase().includes(w) || B.body.toLowerCase().includes(w)).slice(0, 10);
  });
  function m(w) {
    r.value = w.path, A.value = "";
  }
  function a(w) {
    const H = [w];
    for (const B of w.children)
      H.push(...a(B));
    return H;
  }
  if (fe(
    () => n,
    (w) => {
      w && (r.value = w);
    }
  ), l) {
    fe(r, (H) => {
      H && history.replaceState(null, "", `#${H}`);
    });
    const w = () => {
      const H = window.location.hash.slice(1);
      H && H !== r.value && (r.value = H);
    };
    window.addEventListener("hashchange", w), Ee(() => {
      window.removeEventListener("hashchange", w);
    });
  }
  return {
    selectedPath: r,
    selectedKeys: k,
    expandedKeys: d,
    treeData: v,
    selectedNode: f,
    displayNode: $,
    docTree: p,
    themeModel: M,
    searchQuery: A,
    searchResults: b,
    handleTreeSelect: y,
    handleDocLink: S,
    handleSearchSelect: m
  };
}
const Dt = /^graph\s+(LR|RL|TB|BT)\s*$/i, be = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Le = /-->\s*(?:\|([^|]*)\|)?/y, Qe = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, It = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, Be = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function zt(e) {
  const t = [];
  Be.lastIndex = 0;
  let n;
  for (; (n = Be.exec(e)) !== null; )
    t.push(n[1]);
  return t;
}
function Ns(e, t, n, s, l, h) {
  Be.lastIndex = 0;
  const c = t.replace(/\r\n/g, `
`).trim();
  let r, d = -1;
  for (; (r = Be.exec(e)) !== null; ) {
    if (d++, h !== void 0 && d !== h) continue;
    const T = r[1];
    if (T.replace(/\r\n/g, `
`).trim() !== c) continue;
    const E = new RegExp(
      `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), M = T.split(`
`);
    let v = !1;
    for (let f = 0; f < M.length; f++) {
      const $ = M[f].indexOf("%%"), y = $ >= 0 ? M[f].slice(0, $) : M[f], S = $ >= 0 ? M[f].slice($) : "", A = y.trim();
      if (A.includes("-->") || !E.test(A)) continue;
      const b = A.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      M[f] = `${b} @ ${s}, ${l}${S ? `  ${S}` : ""}`, v = !0;
      break;
    }
    if (!v) {
      const f = `${n} @ ${s}, ${l}`;
      M.length > 0 && M[M.length - 1].trim() === "" ? M.splice(M.length - 1, 0, f) : M.push(f);
    }
    const k = M.join(`
`), p = r.index + r[0].indexOf(T);
    return e.slice(0, p) + k + e.slice(p + T.length);
  }
  return e;
}
function Pt(e) {
  return e ? e.startsWith("[/") && e.endsWith("/]") ? { shape: "rounded", text: e.slice(2, -2) } : e.startsWith("{") ? { shape: "diamond", text: e.slice(1, -1) } : e.startsWith("(") ? { shape: "stadium", text: e.slice(1, -1) } : { shape: "rect", text: e.slice(1, -1) } : { shape: "rect", text: "" };
}
function Bt(e) {
  const t = e.trim(), n = t.split("|");
  if (n.length > 1) {
    const s = n[n.length - 1].trim();
    if (It.test(s))
      return {
        label: n.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: s.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: t };
}
function Xe(e) {
  const t = [], n = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), l = [];
  let h = "LR", c = !1;
  function r(v, k) {
    const { shape: p, text: f } = Pt(k), { label: $, docPath: y } = k ? Bt(f) : { label: v, docPath: void 0 }, S = n.get(v);
    S ? k && (S.label = $, S.shape = p, y !== void 0 && (S.docPath = y)) : n.set(v, { id: v, label: $, shape: p, docPath: y });
  }
  function d(v, k, p) {
    const f = n.get(v);
    f && (f.x = k, f.y = p);
  }
  function T(v, k, p) {
    const f = `${v}→${k}${p ?? ""}`;
    s.has(f) || (s.add(f), l.push({ from: v, to: k, label: p }));
  }
  const E = e.split(`
`);
  for (let v = 0; v < E.length; v++) {
    const k = v + 1, p = E[v].indexOf("%%"), f = (p >= 0 ? E[v].slice(0, p) : E[v]).trim();
    if (f) {
      if (!c) {
        const $ = Dt.exec(f);
        $ ? h = $[1].toUpperCase() : (t.push({
          line: k,
          source: E[v].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), M(f, k, E[v].trim())), c = !0;
        continue;
      }
      M(f, k, E[v].trim());
    }
  }
  function M(v, k, p) {
    var S;
    let f = 0;
    be.lastIndex = 0, Le.lastIndex = 0, be.lastIndex = f;
    let $ = be.exec(v);
    if (!$ || $.index !== 0)
      return t.push({ line: k, source: p, message: "无法识别的语句" }), !1;
    let y = $[1];
    for (r($[1], $[2]), f = be.lastIndex; ; ) {
      for (; f < v.length && /\s/.test(v[f]); ) f++;
      if (f >= v.length) break;
      if (v[f] === "@") {
        Qe.lastIndex = f;
        const a = Qe.exec(v);
        return a && a.index === f ? (d(y, parseFloat(a[1]), parseFloat(a[2])), !0) : (t.push({
          line: k,
          source: p,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Le.lastIndex = f;
      const A = Le.exec(v);
      if (!A || A.index !== f)
        return t.push({
          line: k,
          source: p,
          message: `无法识别的内容: "${v.slice(f)}"`
        }), !1;
      const b = ((S = A[1]) == null ? void 0 : S.trim()) || void 0;
      for (f = Le.lastIndex; f < v.length && /\s/.test(v[f]); ) f++;
      if (be.lastIndex = f, $ = be.exec(v), !$ || $.index !== f)
        return t.push({ line: k, source: p, message: "箭头后缺少目标节点" }), !1;
      const m = $[1];
      r($[1], $[2]), T(y, m, b), y = m, f = be.lastIndex;
    }
    return !0;
  }
  return {
    direction: h,
    nodes: [...n.values()],
    edges: l,
    errors: t
  };
}
const Ze = "__hier_root";
function Ht(e) {
  const t = [
    {
      id: Ze,
      label: e.title,
      shape: "stadium",
      docPath: e.path || void 0
    }
  ], n = [];
  for (const s of e.children)
    t.push({
      id: s.id,
      label: s.title,
      // 有子级 = 可继续钻取（圆角），叶子 = 矩形
      shape: s.children.length > 0 ? "rounded" : "rect",
      docPath: s.path
    }), n.push({ from: Ze, to: s.id });
  return {
    // 子项较多时纵向排布更可读
    direction: e.children.length <= 5 ? "LR" : "TB",
    nodes: t,
    edges: n,
    errors: []
  };
}
function Je(e) {
  for (const t of zt(e.body)) {
    const n = Xe(t);
    if (n.nodes.length > 0) return n;
  }
  return e.children.length > 0 ? Ht(e) : null;
}
const Ot = { class: "toc-item-row" }, qt = ["aria-expanded", "aria-controls", "aria-label"], Wt = ["data-toc-id", "aria-current"], Ft = { class: "toc-text" }, Gt = ["id"], Ve = /* @__PURE__ */ ye({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(e, { emit: t }) {
    const n = e, s = t, { t: l } = Oe(), h = V(() => n.activeHeading === n.node.id), c = V(() => n.node.children.length > 0), r = V(() => n.collapsedGroups.has(n.node.id));
    function d(E) {
      E.stopPropagation(), s("toggle", n.node.id);
    }
    function T(E) {
      E.preventDefault(), s("select", n.node.id);
    }
    return (E, M) => (R(), P("li", {
      class: ne(["neumorphism-toc-item", { "has-children": c.value, active: h.value }]),
      role: "listitem"
    }, [
      N("div", Ot, [
        c.value ? (R(), P("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !r.value,
          "aria-controls": `toc-list-${e.node.id}`,
          "aria-label": r.value ? D(l)("markdownTocExpand") : D(l)("markdownTocCollapse"),
          onClick: d
        }, [
          _(K, {
            name: r.value ? "chevron-right" : "chevron-down",
            size: "xs"
          }, null, 8, ["name"])
        ], 8, qt)) : oe("", !0),
        N("a", {
          href: "#",
          "data-toc-id": e.node.id,
          role: "button",
          "aria-current": h.value ? "location" : void 0,
          onClick: T
        }, [
          N("span", Ft, j(e.node.text), 1)
        ], 8, Wt)
      ]),
      c.value && !r.value ? (R(), P("ul", {
        key: 0,
        id: `toc-list-${e.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (R(!0), P(ve, null, xe(e.node.children, (v) => (R(), ue(Ve, {
          key: v.id,
          node: v,
          "active-heading": e.activeHeading,
          "collapsed-groups": e.collapsedGroups,
          onToggle: M[0] || (M[0] = (k) => E.$emit("toggle", k)),
          onSelect: M[1] || (M[1] = (k) => E.$emit("select", k))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Gt)) : oe("", !0)
    ], 2));
  }
});
function Ke() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Vt(e) {
  const { content: t } = e, n = e.headingSelector ?? "h1, h2, h3", s = X("");
  let l = !1, h = null;
  function c(y) {
    var b;
    const S = t.value;
    if (!S) return null;
    const A = (b = e.scrollContainer) == null ? void 0 : b.value;
    return A instanceof HTMLElement ? A : typeof A == "string" ? S.closest(A) : S.closest(".nm-layout__content");
  }
  function r(y) {
    const S = y ?? c();
    if (!S) return 64;
    const A = S.closest(".nm-layout"), b = A == null ? void 0 : A.querySelector(".nm-layout__header");
    return b ? b.getBoundingClientRect().height : 64;
  }
  function d(y) {
    var S;
    y !== s.value && (s.value = y, (S = e.onActiveChange) == null || S.call(e, y));
  }
  function T() {
    var m;
    const y = c();
    if (!y) return;
    const S = (m = t.value) == null ? void 0 : m.querySelectorAll(n);
    if (!S) return;
    const A = r(y) + 20;
    let b = "";
    for (const a of S) {
      const g = a.getBoundingClientRect(), w = y.getBoundingClientRect();
      if (g.top - w.top <= A)
        b = a.id;
      else
        break;
    }
    d(b);
  }
  function E() {
    l = !1, h && (clearTimeout(h), h = null), T();
  }
  function M(y) {
    var A, b;
    h && clearTimeout(h), l = !0, s.value = y, (A = e.onActiveChange) == null || A.call(e, y);
    const S = (b = t.value) == null ? void 0 : b.querySelector(`[id="${y}"]`);
    S && S.scrollIntoView({ behavior: Ke() }), h = setTimeout(E, 800);
  }
  let v = null, k = null, p = -1;
  function f() {
    v == null || v.disconnect(), v = null, k == null || k.disconnect(), k = null;
  }
  function $() {
    f();
    const y = c();
    if (!y || !t.value) return;
    const S = r(y);
    p = S;
    const A = Array.from(t.value.querySelectorAll(n));
    if (A.length === 0) return;
    const b = /* @__PURE__ */ new Map();
    v = new IntersectionObserver(
      (g) => {
        if (l) return;
        for (const B of g)
          B.isIntersecting ? b.set(B.target, B.boundingClientRect.top) : b.delete(B.target);
        let w = "", H = -1 / 0;
        for (const [B, q] of b)
          q > H && (H = q, w = B.id);
        w && d(w);
      },
      {
        root: y,
        rootMargin: `-${S + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const g of A)
      v.observe(g);
    const m = y.closest(".nm-layout"), a = m == null ? void 0 : m.querySelector(".nm-layout__header");
    a && typeof ResizeObserver < "u" && (k = new ResizeObserver(() => {
      const g = a.getBoundingClientRect().height;
      g !== p && (p = g, he(() => $()));
    }), k.observe(a));
  }
  return fe(e.watchSource ? [t, e.watchSource] : [t], ([y]) => {
    y ? he(() => {
      $(), T();
    }) : f();
  }), Ee(() => {
    f(), h && clearTimeout(h);
  }), { activeHeading: s, scrollToHeading: M, syncActiveHeading: T };
}
const Kt = ["aria-label"], Ut = { class: "neumorphism-toc-header" }, Xt = { class: "neumorphism-toc-title" }, Yt = {
  class: "neumorphism-toc-list",
  role: "list"
}, jt = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, et = /* @__PURE__ */ ye({
  __name: "DocTocNav",
  props: {
    items: {},
    activeId: { default: "" },
    title: { default: "" },
    framed: { type: Boolean, default: !0 },
    collapsedGroups: { default: void 0 }
  },
  emits: ["select", "update:collapsedGroups"],
  setup(e, { expose: t, emit: n }) {
    const s = e, l = n, { t: h } = Oe(), c = V(() => s.title || h("markdownTocLabel")), r = X(null), d = X(/* @__PURE__ */ new Set()), T = V(() => s.collapsedGroups ?? d.value);
    function E(p) {
      s.collapsedGroups !== void 0 ? l("update:collapsedGroups", p) : d.value = p;
    }
    fe(
      () => s.items,
      () => {
        s.collapsedGroups === void 0 && (d.value = /* @__PURE__ */ new Set());
      }
    );
    function M(p) {
      const f = new Set(T.value), $ = f.has(p);
      $ ? f.delete(p) : f.add(p), E(f), $ && he(() => v(p));
    }
    function v(p) {
      if (!r.value || window.innerWidth <= 1200) return;
      const f = r.value, $ = f.querySelector(`[data-toc-id="${CSS.escape(p)}"]`);
      if (!$) return;
      const y = f.getBoundingClientRect(), S = $.closest(".neumorphism-toc-item"), A = Array.from((S == null ? void 0 : S.children) ?? []).find(
        (m) => m.classList.contains("neumorphism-toc-list")
      );
      if (A && A.getBoundingClientRect().bottom <= y.bottom + 10)
        return;
      const b = $.getBoundingClientRect().top - y.top + f.scrollTop;
      f.scrollTo({
        top: Math.max(0, b),
        behavior: Ke()
      });
    }
    function k() {
      if (!r.value || window.innerWidth <= 1200) return;
      const p = r.value, f = p.querySelector(".neumorphism-toc-item.active");
      if (!f) return;
      const $ = p.getBoundingClientRect(), y = f.getBoundingClientRect(), S = $.top + $.height * 0.25, A = $.top + $.height * 0.75;
      if (y.top >= S && y.bottom <= A)
        return;
      const m = y.top - $.top + p.scrollTop - y.height / 2 - $.height / 2;
      p.scrollTo({
        top: Math.max(0, m),
        behavior: Ke()
      });
    }
    return fe(
      () => s.activeId,
      (p) => {
        if (!p) return;
        function f($) {
          for (const y of $) {
            if (y.id === p) return !0;
            if (f(y.children)) {
              if (T.value.has(y.id)) {
                const S = new Set(T.value);
                S.delete(y.id), E(S);
              }
              return !0;
            }
          }
          return !1;
        }
        f(s.items), he(() => k());
      }
    ), t({ scrollTocToActive: k }), (p, f) => e.framed ? (R(), P("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: r,
      class: "neumorphism-toc",
      "aria-label": c.value
    }, [
      _($e, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: I(() => [
          N("div", Ut, [
            N("span", Xt, [
              _(K, {
                name: "list",
                size: "sm"
              }),
              Q(" " + j(c.value), 1)
            ])
          ]),
          N("ul", Yt, [
            (R(!0), P(ve, null, xe(e.items, ($) => (R(), ue(Ve, {
              key: $.id,
              node: $,
              "active-heading": e.activeId,
              "collapsed-groups": T.value,
              onToggle: M,
              onSelect: f[0] || (f[0] = (y) => l("select", y))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, Kt)) : (R(), P("ul", jt, [
      (R(!0), P(ve, null, xe(e.items, ($) => (R(), ue(Ve, {
        key: $.id,
        node: $,
        "active-heading": e.activeId,
        "collapsed-groups": T.value,
        onToggle: M,
        onSelect: f[1] || (f[1] = (y) => l("select", y))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), Qt = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, Zt = /(#\s+.*$)/gm, Jt = /(--\s.*$)/gm, en = /$.^/gm, tn = /* @__PURE__ */ new Set([
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
]), nn = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function on(e) {
  const t = (e ?? "").toLowerCase();
  return tn.has(t) ? Zt : nn.has(t) ? Jt : t === "html" || t === "xml" || t === "vue" ? en : Qt;
}
const sn = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, ln = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, rn = /\b([a-zA-Z_]\w*)(?=\()/g, an = /\b(\d+\.?\d*)\b/g, cn = /\b([A-Z][a-zA-Z0-9_]*)\b/g, dn = /\u0001([a-z]+)\u0001/g;
function un(e) {
  let t = e, n = "";
  do
    n = String.fromCharCode(97 + t % 26) + n, t = Math.floor(t / 26) - 1;
  while (t >= 0);
  return "" + n + "";
}
function fn(e) {
  let t = 0;
  for (const n of e) t = t * 26 + (n.charCodeAt(0) - 96);
  return t - 1;
}
function mn(e, t) {
  if (!t || t === "text" || t === "plain")
    return me(e);
  let n = me(e);
  const s = [], l = (h) => (c) => (s.push(`<span class="${h}">${c}</span>`), un(s.length - 1));
  return n = n.replace(sn, l("token-string")), n = n.replace(on(t), l("token-comment")), n = n.replace(ln, '<span class="token-keyword">$1</span>'), n = n.replace(rn, '<span class="token-function">$1</span>'), n = n.replace(an, '<span class="token-number">$1</span>'), n = n.replace(cn, '<span class="token-type">$1</span>'), n = n.replace(dn, (h, c) => s[fn(c)]), n;
}
const hn = { class: "code-block-wrapper doc-code-block" }, pn = { class: "code-block-header" }, gn = { class: "code-lang" }, vn = { class: "code-lines" }, yn = ["aria-label"], wn = { class: "code-block-body" }, xn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, $n = ["innerHTML"], bn = /* @__PURE__ */ ye({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(e) {
    const t = e, { t: n } = Oe(), { copied: s, copy: l } = St({ resetDelay: 1500 }), h = V(() => t.lang || "text"), c = V(() => mn(t.code, t.lang)), r = V(() => t.code.split(`
`).length), d = V(() => s.value ? n("markdownCodeCopied") : n("markdownCodeCopy"));
    return (T, E) => (R(), P("div", hn, [
      N("div", pn, [
        N("span", gn, j(h.value), 1),
        N("span", vn, j(r.value) + " lines", 1),
        N("button", {
          type: "button",
          class: ne(["code-copy-btn", { copied: D(s) }]),
          "aria-label": d.value,
          onClick: E[0] || (E[0] = (M) => D(l)(e.code))
        }, j(d.value), 11, yn)
      ]),
      N("div", wn, [
        e.showLineNumbers ? (R(), P("div", xn, [
          (R(!0), P(ve, null, xe(r.value, (M) => (R(), P("span", {
            key: M,
            class: "line-num"
          }, j(M), 1))), 128))
        ])) : oe("", !0),
        N("pre", null, [
          N("code", {
            class: ne(`language-${h.value}`),
            innerHTML: c.value
          }, null, 10, $n)
        ])
      ])
    ]));
  }
}), tt = 44, nt = 96, Re = 280, _n = 16, kn = 14, Cn = 8, Mn = 90, ot = 28, we = 48, Tn = 4, Ae = 28, de = 20, Sn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function En(e) {
  let t = 0;
  for (const n of e)
    t += Sn.test(n) ? kn : Cn;
  return t;
}
function Nn(e) {
  const t = En(e.label) + _n * 2;
  if (e.shape === "diamond") {
    const n = Math.min(Math.max(t * 1.5 + 32, nt * 1.4), Re * 1.4);
    return { w: n, h: Math.max(64, n * 0.55) };
  }
  return t > Re ? { w: Re, h: tt + 20 } : { w: Math.min(Math.max(t, nt), Re), h: tt };
}
function st(e, t = Tn) {
  const { nodes: n, edges: s, direction: l } = e, h = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (n.length === 0) return h;
  const c = {};
  for (const o of n) c[o.id] = Nn(o);
  const r = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
  for (const o of n)
    r.set(o.id, []), d.set(o.id, 0);
  for (const o of s)
    !r.has(o.from) || !d.has(o.to) || (r.get(o.from).push(o.to), d.set(o.to, d.get(o.to) + 1));
  const T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Set(), M = n.filter((o) => (d.get(o.id) ?? 0) === 0).map((o) => o.id), v = new Map(d);
  for (; M.length > 0; ) {
    const o = M.shift(), i = T.get(o) ?? 0;
    T.set(o, i);
    for (const u of r.get(o) ?? [])
      T.set(u, Math.max(T.get(u) ?? 0, i + 1)), v.set(u, v.get(u) - 1), v.get(u) === 0 && M.push(u);
  }
  for (const o of n) {
    if (T.has(o.id)) continue;
    let i = -1;
    for (const u of s)
      u.to === o.id && T.has(u.from) && (i = Math.max(i, T.get(u.from)));
    T.set(o.id, i + 1);
  }
  s.forEach((o, i) => {
    (T.get(o.to) ?? 0) <= (T.get(o.from) ?? 0) && E.add(i);
  });
  const k = Math.max(...T.values()), p = Array.from({ length: k + 1 }, () => []), f = new Map(n.map((o, i) => [o.id, i]));
  for (const o of n)
    p[T.get(o.id)].push(o.id);
  for (const o of p)
    o.sort((i, u) => f.get(i) - f.get(u));
  const $ = /* @__PURE__ */ new Map();
  function y() {
    $.clear(), p.forEach((o) => o.forEach((i, u) => $.set(i, u)));
  }
  y();
  const S = /* @__PURE__ */ new Map();
  for (const o of s)
    S.has(o.to) || S.set(o.to, []), S.get(o.to).push(o.from);
  function A(o, i, u) {
    const x = (u.get(o) ?? []).filter((F) => i.has(F));
    return x.length === 0 ? $.get(o) : x.reduce((F, Y) => F + ($.get(Y) ?? 0), 0) / x.length;
  }
  for (let o = 0; o < t; o++) {
    for (let i = 1; i < p.length; i++) {
      const u = new Set(p[i - 1]);
      p[i].sort((x, G) => {
        const F = A(x, u, S), Y = A(G, u, S);
        return F !== Y ? F - Y : $.get(x) - $.get(G);
      }), y();
    }
    for (let i = p.length - 2; i >= 0; i--) {
      const u = new Set(p[i + 1]);
      p[i].sort((x, G) => {
        const F = A(x, u, r), Y = A(G, u, r);
        return F !== Y ? F - Y : $.get(x) - $.get(G);
      }), y();
    }
  }
  const b = l === "TB" || l === "BT", m = l === "RL" || l === "BT", a = p.map(
    (o) => o.reduce((i, u) => Math.max(i, b ? c[u].h : c[u].w), 0)
  ), g = p.map(
    (o) => o.reduce((i, u) => i + (b ? c[u].w : c[u].h), 0) + Math.max(o.length - 1, 0) * ot
  ), w = Math.max(...g), H = [];
  {
    let o = we;
    for (let i = 0; i < p.length; i++)
      H.push(o), o += a[i] + Mn;
  }
  const B = /* @__PURE__ */ new Map();
  p.forEach((o, i) => {
    let u = we + (w - g[i]) / 2;
    for (const x of o) {
      const G = c[x].w, F = c[x].h, Y = b ? F : G, ee = H[i] + (a[i] - Y) / 2;
      B.set(x, {
        id: x,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: b ? u : ee,
        y: b ? ee : u,
        w: G,
        h: F
      }), u += (b ? G : F) + ot;
    }
  });
  let q = 0, Z = 0;
  for (const o of B.values())
    q = Math.max(q, o.x + o.w), Z = Math.max(Z, o.y + o.h);
  if (q += we, Z += we, m)
    for (const o of B.values())
      l === "RL" ? o.x = q - o.x - o.w : o.y = Z - o.y - o.h;
  {
    let o = !1;
    for (const i of n) {
      const u = B.get(i.id);
      u && (typeof i.x == "number" && (u.x = i.x, o = !0), typeof i.y == "number" && (u.y = i.y, o = !0));
    }
    if (o) {
      q = 0, Z = 0;
      for (const i of B.values())
        q = Math.max(q, i.x + i.w), Z = Math.max(Z, i.y + i.h);
      q += we, Z += we;
    }
  }
  const ke = Math.max(0, ...[...B.values()].map((o) => o.x + o.w)), Ce = Math.max(0, ...[...B.values()].map((o) => o.y + o.h)), z = [], L = [], O = [], W = [];
  p.forEach((o, i) => {
    let u = 1 / 0, x = -1 / 0, G = 1 / 0, F = -1 / 0;
    for (const Y of o) {
      const ee = B.get(Y);
      ee && (u = Math.min(u, ee.x), x = Math.max(x, ee.x + ee.w), G = Math.min(G, ee.y), F = Math.max(F, ee.y + ee.h));
    }
    z[i] = u, L[i] = x, O[i] = G, W[i] = F;
  });
  const U = /* @__PURE__ */ new Map();
  {
    let o = 0;
    s.forEach((i, u) => {
      const x = Math.abs((T.get(i.to) ?? 0) - (T.get(i.from) ?? 0));
      (E.has(u) || x >= 2) && U.set(u, o++);
    });
  }
  const C = [];
  if (s.forEach((o, i) => {
    const u = B.get(o.from), x = B.get(o.to);
    if (!u || !x) return;
    const G = E.has(i), F = U.get(i);
    let Y, ee;
    if (F !== void 0) {
      const se = T.get(o.from) ?? 0, le = T.get(o.to) ?? 0;
      if (b) {
        const ie = u.x + u.w / 2, re = m ? u.y : u.y + u.h, pe = x.x + x.w / 2, ge = m ? x.y : x.y + x.h, ae = m ? O[se] - de : W[se] + de, ce = m ? O[le] - de : W[le] + de, J = ke + Ae + F * de;
        Y = `M ${ie},${re} L ${ie},${ae} L ${J},${ae} L ${J},${ce} L ${pe},${ce} L ${pe},${ge}`, ee = { x: J, y: (ae + ce) / 2 };
      } else {
        const ie = m ? u.x : u.x + u.w, re = u.y + u.h / 2, pe = m ? x.x : x.x + x.w, ge = x.y + x.h / 2, ae = m ? z[se] - de : L[se] + de, ce = m ? z[le] - de : L[le] + de, J = Ce + Ae + F * de;
        Y = `M ${ie},${re} L ${ae},${re} L ${ae},${J} L ${ce},${J} L ${ce},${ge} L ${pe},${ge}`, ee = { x: (ae + ce) / 2, y: J };
      }
    } else {
      let se, le, ie, re, pe, ge, ae, ce;
      if (b) {
        const J = m ? -1 : 1;
        se = u.x + u.w / 2, le = u.y + (J > 0 ? u.h : 0), ie = x.x + x.w / 2, re = x.y + (J > 0 ? 0 : x.h);
        const Me = Math.max(40, Math.abs(re - le) / 2);
        pe = se, ge = le + Me * J, ae = ie, ce = re - Me * J;
      } else {
        const J = m ? -1 : 1;
        se = u.x + (J > 0 ? u.w : 0), le = u.y + u.h / 2, ie = x.x + (J > 0 ? 0 : x.w), re = x.y + x.h / 2;
        const Me = Math.max(40, Math.abs(ie - se) / 2);
        pe = se + Me * J, ge = le, ae = ie - Me * J, ce = re;
      }
      Y = `M ${se},${le} C ${pe},${ge} ${ae},${ce} ${ie},${re}`, ee = {
        x: (se + 3 * pe + 3 * ae + ie) / 8,
        y: (le + 3 * ge + 3 * ce + re) / 8
      };
    }
    C.push({ from: o.from, to: o.to, label: o.label, path: Y, labelPos: ee, isBackEdge: G });
  }), U.size > 0) {
    const o = U.size - 1;
    b ? q = Math.max(q, ke + Ae + o * de + we) : Z = Math.max(Z, Ce + Ae + o * de + we);
  }
  return { nodes: B, edges: C, width: q, height: Z };
}
const Ln = { class: "nm-flow-canvas" }, Rn = ["width", "height"], An = ["id"], Dn = ["d", "marker-end"], In = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], zn = { class: "nm-flow__node-inner" }, Pn = { class: "nm-flow__node-text" }, Bn = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, Hn = /* @__PURE__ */ ye({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(e, { emit: t }) {
    const n = e, s = t, l = X(), h = ht("nm-flow-arrow"), c = X(null), r = V(() => {
      const a = c.value;
      if (!a) return st(n.graph);
      const g = n.graph.nodes.map(
        (w) => w.id === a.id ? { ...w, x: a.x, y: a.y } : w
      );
      return st({ ...n.graph, nodes: g });
    }), d = V(() => {
      const a = new Map(n.graph.nodes.map((g) => [g.id, g]));
      return [...r.value.nodes.values()].map((g) => {
        var w, H, B;
        return {
          ...g,
          shape: ((w = a.get(g.id)) == null ? void 0 : w.shape) ?? "rect",
          docPath: (H = a.get(g.id)) == null ? void 0 : H.docPath,
          label: ((B = a.get(g.id)) == null ? void 0 : B.label) ?? g.id
        };
      });
    }), T = V(() => r.value.edges.filter((a) => a.label));
    fe(
      r,
      () => {
        c.value || he(() => {
          requestAnimationFrame(() => {
            var a;
            return (a = l.value) == null ? void 0 : a.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let E = !1;
    function M(a) {
      if (E) {
        E = !1;
        return;
      }
      a && s("navigate", a);
    }
    const v = X(null), k = X(null);
    function p() {
      window.addEventListener("pointermove", y), window.addEventListener("pointerup", A), window.addEventListener("pointercancel", b);
    }
    function f() {
      window.removeEventListener("pointermove", y), window.removeEventListener("pointerup", A), window.removeEventListener("pointercancel", b);
    }
    function $(a, g) {
      var B;
      if (!n.editable || a.button !== 0) return;
      const w = (B = v.value) == null ? void 0 : B.getBoundingClientRect(), H = w && r.value.width > 0 ? w.width / r.value.width : 1;
      k.value = {
        id: g.id,
        startClientX: a.clientX,
        startClientY: a.clientY,
        lastClientX: a.clientX,
        lastClientY: a.clientY,
        scale: H || 1,
        baseX: g.x,
        baseY: g.y,
        moved: !1,
        raf: 0
      }, p();
    }
    function y(a) {
      const g = k.value;
      g && (g.lastClientX = a.clientX, g.lastClientY = a.clientY, g.raf || (g.raf = requestAnimationFrame(S)));
    }
    function S() {
      const a = k.value;
      if (!a) return;
      a.raf = 0;
      const g = (a.lastClientX - a.startClientX) / a.scale, w = (a.lastClientY - a.startClientY) / a.scale;
      !a.moved && Math.hypot(g, w) < 3 || (a.moved = !0, c.value = {
        id: a.id,
        x: Math.round(a.baseX + g),
        y: Math.round(a.baseY + w)
      });
    }
    function A() {
      f();
      const a = k.value;
      k.value = null, a != null && a.raf && cancelAnimationFrame(a.raf);
      const g = c.value;
      c.value = null, !(!(a != null && a.moved) || !g) && (E = !0, setTimeout(() => {
        E = !1;
      }, 0), s("nodeMove", { id: a.id, x: g.x, y: g.y }));
    }
    function b() {
      f();
      const a = k.value;
      k.value = null, a != null && a.raf && cancelAnimationFrame(a.raf), c.value = null;
    }
    Ee(() => {
      var a;
      f(), (a = k.value) != null && a.raf && cancelAnimationFrame(k.value.raf);
    });
    function m(a, g) {
      g && (a.key === "Enter" || a.key === " ") && (a.preventDefault(), s("navigate", g));
    }
    return (a, g) => (R(), P("div", Ln, [
      _(Et, {
        ref_key: "canvasRef",
        ref: l,
        width: "100%",
        height: e.height,
        "show-grid": e.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: I(() => [
          N("div", {
            ref_key: "flowEl",
            ref: v,
            class: ne(["nm-flow", { "nm-flow--editable": e.editable }]),
            style: We({ width: `${r.value.width}px`, height: `${r.value.height}px` })
          }, [
            (R(), P("svg", {
              class: "nm-flow__edges",
              width: r.value.width,
              height: r.value.height,
              "aria-hidden": "true"
            }, [
              N("defs", null, [
                N("marker", {
                  id: D(h),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...g[0] || (g[0] = [
                  N("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, An)
              ]),
              (R(!0), P(ve, null, xe(r.value.edges, (w, H) => (R(), P("path", {
                key: H,
                d: w.path,
                class: ne(["nm-flow__edge", { "nm-flow__edge--back": w.isBackEdge }]),
                "marker-end": `url(#${D(h)})`
              }, null, 10, Dn))), 128))
            ], 8, Rn)),
            (R(!0), P(ve, null, xe(T.value, (w, H) => (R(), P("div", {
              key: `label-${H}`,
              class: "nm-flow__edge-label",
              style: We({ left: `${w.labelPos.x}px`, top: `${w.labelPos.y}px` })
            }, j(w.label), 5))), 128)),
            (R(!0), P(ve, null, xe(d.value, (w) => (R(), P("div", {
              key: w.id,
              class: ne(["nm-flow__node", [`nm-flow__node--${w.shape}`, { "nm-flow__node--link": w.docPath }]]),
              style: We({
                left: `${w.x}px`,
                top: `${w.y}px`,
                width: `${w.w}px`,
                height: `${w.h}px`
              }),
              role: w.docPath ? "link" : void 0,
              tabindex: w.docPath ? 0 : void 0,
              "aria-label": w.docPath ? `${w.label}（跳转到文档）` : w.label,
              "data-nm-no-pan": "",
              onPointerdown: (H) => $(H, w),
              onClick: (H) => M(w.docPath),
              onKeydown: (H) => m(H, w.docPath)
            }, [
              N("div", zn, [
                N("span", Pn, j(w.label), 1),
                w.docPath ? (R(), P("span", Bn, [
                  _(K, {
                    name: "external",
                    size: "xs"
                  })
                ])) : oe("", !0)
              ])
            ], 46, In))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), Ue = /* @__PURE__ */ qe(Hn, [["__scopeId", "data-v-5be4baf8"]]);
function vt(e) {
  return e.map((t) => {
    const n = t;
    return n.text ? String(n.text) : n.tokens ? vt(n.tokens) : "";
  }).join("");
}
function On(e) {
  const t = ht("toc");
  function n(c) {
    return `${t}-${je(c)}`;
  }
  function s(c) {
    const r = [], d = /* @__PURE__ */ new Set(), T = mt.lexer(c);
    for (const E of T)
      if (E.type === "heading") {
        const M = vt(E.tokens);
        let v = je(M);
        v || (v = "heading");
        let k = `${t}-${v}`, p = 1;
        for (; d.has(k); )
          k = `${t}-${v}-${p}`, p++;
        d.add(k), r.push({
          level: E.depth,
          text: M,
          id: k
        });
      }
    return r;
  }
  const l = V(() => s(e.value)), h = V(() => {
    const c = l.value, r = [], d = [];
    for (const T of c) {
      const E = { level: T.level, text: T.text, id: T.id, children: [] };
      for (; d.length > 0 && d[d.length - 1].level >= E.level; )
        d.pop();
      d.length === 0 ? r.push(E) : d[d.length - 1].children.push(E), d.push(E);
    }
    return r;
  });
  return { toc: l, tocTree: h, makeUniqueId: n };
}
const Pe = "md-math-mount", yt = "md-math-src", Te = "data-math-state";
function qn(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), l = /^[ \t]*(?:\r?\n|$)/.exec(s);
  if (!l) return null;
  const h = e.slice(0, t + 2 + l[0].length);
  return { tex: n, raw: h };
}
function Wn(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), l = /^[ \t]*(?:\r?\n|$)/.exec(s);
  return l ? { tex: n, raw: e.slice(0, t + 2 + l[0].length) } : null;
}
function Fn(e) {
  if (e[0] !== "$" || e[1] === "$") return null;
  const t = e[1];
  if (t === void 0 || /\s/.test(t)) return null;
  for (let n = 1; n < e.length; n += 1) {
    const s = e[n];
    if (s === "\\") {
      n += 1;
      continue;
    }
    if (s === `
`) return null;
    if (s !== "$") continue;
    if (/\s/.test(e[n - 1] ?? "") || /[0-9]/.test(e[n + 1] ?? "")) return null;
    const l = e.slice(1, n);
    return !l.trim() || /[`，。、；：！？…]/.test(l) ? null : { tex: l, raw: e.slice(0, n + 1) };
  }
  return null;
}
function Gn(e) {
  if (!e.startsWith("\\(")) return null;
  const t = e.indexOf("\\)", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function Vn(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function Kn(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function Un(e) {
  const t = e.trim(), n = [
    ["$$", "$$"],
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$", "$"]
  ];
  for (const [s, l] of n)
    if (t.startsWith(s) && t.endsWith(l) && t.length >= s.length + l.length)
      return t.slice(s.length, t.length - l.length);
  return t;
}
function lt(e) {
  const t = e.display ? "div" : "span", n = e.display ? `${Pe} ${Pe}--block` : Pe, s = e.display ? "block" : "inline";
  return `<${t} class="${n}" data-math-display="${s}" data-tex="${me(e.tex)}"><span class="${yt}">${me(e.text)}</span></${t}>`;
}
const Xn = [
  {
    name: "blockMath",
    level: "block",
    tokenizer(e) {
      const t = qn(e) ?? Wn(e);
      if (t)
        return {
          type: "blockMath",
          raw: t.raw,
          text: t.raw.trim(),
          tex: t.tex,
          display: !0
        };
    },
    renderer(e) {
      return lt(e);
    }
  },
  {
    name: "inlineMath",
    level: "inline",
    /**
     * 告诉 marked 下一个可能是公式的位置。
     *
     * 没有它，内置 `text` 规则会把整行一次吞掉（`$` 不是 marked 的特殊字符），
     * 于是 `能量 $E=mc^2$ 守恒` 里的公式永远不会被看到 —— 这是本扩展**必须**
     * 实现 start 的原因（实测：省略后仅行首公式能命中）。
     */
    start(e) {
      const n = [e.indexOf("$"), e.indexOf("\\("), e.indexOf("\\[")].filter((s) => s >= 0);
      return n.length > 0 ? Math.min(...n) : void 0;
    },
    tokenizer(e) {
      const t = Vn(e) ?? Fn(e) ?? Gn(e) ?? Kn(e);
      if (!t) return;
      const n = t.raw.startsWith("$$") || t.raw.startsWith("\\[");
      return {
        type: "inlineMath",
        raw: t.raw,
        text: t.raw,
        tex: t.tex,
        display: n
      };
    },
    renderer(e) {
      return lt(e);
    }
  }
];
let Ge = null;
function Yn() {
  return Ge || (Ge = import("katex").then((e) => {
    const t = e.default ?? e;
    return typeof (t == null ? void 0 : t.renderToString) == "function" ? t : null;
  }).catch(() => null)), Ge;
}
const De = /* @__PURE__ */ new Map(), jn = 400;
function Qn(e, t, n) {
  const s = `${n ? "b" : "i"}\0${t}`, l = De.get(s);
  if (l !== void 0) return l;
  const h = e.renderToString(t, {
    displayMode: n,
    throwOnError: !1,
    // 非法 TeX → 红色原文，不让整篇文档崩
    strict: "ignore",
    // Unicode / 非标准写法的警告不当作错误
    trust: !1,
    // 禁止 \htmlClass 等可执行/可注入命令
    output: "htmlAndMathml",
    // 同时输出 MathML：屏幕阅读器与无字体环境可用
    errorColor: "var(--nm-color-error, #d9534f)"
  });
  return De.size >= jn && De.clear(), De.set(s, h), h;
}
async function Zn(e) {
  var h;
  if (!e) return;
  const t = () => Array.from(e.querySelectorAll(`.${Pe}:not([${Te}])`));
  if (t().length === 0) return;
  const n = await Yn(), s = e instanceof Node && e.isConnected, l = t().filter((c) => !s || c.isConnected);
  if (!n) {
    for (const c of l) c.setAttribute(Te, "raw");
    return;
  }
  for (const c of l) {
    const r = c.dataset.mathDisplay === "block", d = ((h = c.querySelector(`.${yt}`)) == null ? void 0 : h.textContent) ?? c.textContent ?? "", T = c.dataset.tex ?? Un(d);
    if (!T.trim()) {
      c.setAttribute(Te, "raw");
      continue;
    }
    try {
      c.innerHTML = Qn(n, T, r), c.setAttribute(Te, "done");
    } catch {
      c.setAttribute(Te, "raw");
    }
  }
}
const wt = "mermaid-diagram", He = "data-mermaid-state";
function Jn(e) {
  return `<div class="${wt}" ${He}="loading"><pre><code>${me(e)}</code></pre></div>`;
}
let Ie = null, it = !1, eo = 0;
async function to() {
  Ie || (Ie = import("mermaid").catch(() => null));
  const e = await Ie;
  return e ? (it || (e.default.initialize({
    startOnLoad: !1,
    securityLevel: "strict",
    suppressErrorRendering: !0
  }), it = !0), e) : (Ie = null, null);
}
function ze(e, t) {
  e.setAttribute(He, t);
}
async function no(e) {
  var s;
  if (!e) return;
  const t = Array.from(e.querySelectorAll(`.${wt}`)).filter(
    (l) => l.getAttribute(He) !== "done"
  );
  if (t.length === 0) return;
  const n = await to();
  if (!n) {
    for (const l of t)
      l.isConnected && ze(l, "error");
    return;
  }
  for (const l of t) {
    if (!l.isConnected || l.getAttribute(He) === "done") continue;
    const h = ((s = l.querySelector("pre code")) == null ? void 0 : s.textContent) ?? "";
    if (!h.trim()) {
      ze(l, "error");
      continue;
    }
    try {
      const c = `nm-mermaid-${++eo}`, { svg: r } = await n.default.render(c, h);
      if (!l.isConnected) continue;
      l.innerHTML = r, ze(l, "done"), l.setAttribute("data-processed", "true");
    } catch {
      l.isConnected && ze(l, "error");
    }
  }
}
const oo = /^(?:flowchart|graph)\s+(LR|RL|TB|BT)\s*$/i, so = /^(?:subgraph\b.*|end|direction\b.*)$/i, lo = /^(?:classDef\b.*|class\b.*|style\b.*|linkStyle\b.*)$/i;
function io(e) {
  return e.replace(/<br\s*\/?\s*>/gi, " · ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/^\s*(["'])([\s\S]*)\1\s*$/, "$2").replace(/\s+/g, " ").trim();
}
function ro(e) {
  return e.replace(
    /-\.\s*(?:"([^"]*)"|([^\.]*?))?\s*\.->/g,
    (n, s, l) => `-->|${(s ?? l ?? "").trim()}|`
  ).replace(
    /(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))/g,
    (n) => n[0] + io(n.slice(1, -1)) + n[n.length - 1]
  );
}
function ao(e) {
  var h;
  const t = e.split(`
`), n = ((h = t.find((c) => c.trim() && !c.trim().startsWith("%%"))) == null ? void 0 : h.trim()) ?? "";
  if (!oo.test(n)) return null;
  const s = [];
  for (const c of t) {
    const r = c.trim();
    if (!r || r.startsWith("%%")) {
      s.push("");
      continue;
    }
    if (so.test(r)) {
      if (/^direction\b/i.test(r)) return null;
      s.push("");
      continue;
    }
    if (lo.test(r)) {
      s.push("");
      continue;
    }
    if (/^(?:flowchart|graph)\s+/i.test(r)) {
      s.push(r.replace(/^flowchart/i, "graph"));
      continue;
    }
    s.push(ro(r));
  }
  const l = Xe(s.join(`
`));
  return l.nodes.length > 0 && l.errors.length === 0 ? l : null;
}
const co = { class: "neumorphism-markdown-body" }, uo = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, fo = { class: "neumorphism-markdown-error-title" }, mo = { class: "neumorphism-markdown-error-msg" }, ho = ["innerHTML"], po = ["aria-label"], go = { class: "neumorphism-toc-mobile-header" }, vo = { class: "neumorphism-toc-mobile-title" }, yo = ["aria-label"], xt = /* @__PURE__ */ ye({
  __name: "MarkdownRenderer",
  props: {
    content: {},
    className: { default: "" },
    showToc: { type: Boolean, default: !0 },
    scrollContainer: {},
    flowEditable: { type: Boolean, default: !1 }
  },
  emits: ["docLink", "flowNodeMove"],
  setup(e, { emit: t }) {
    const n = e, s = t, l = X(null), h = X(!1), { t: c } = Oe(), { toc: r, tocTree: d, makeUniqueId: T } = On(Ye(n, "content"));
    function E(C) {
      a(C), h.value = !1;
    }
    const M = new mt.Renderer();
    M.code = ({ text: C, lang: o }) => o === "mermaid" ? Jn(C) : o === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${me(C)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${me(o || "text")}"><pre><code>${me(C)}</code></pre></div>`, M.codespan = ({ text: C }) => `<code class="inline-code">${me(C)}</code>`, M.image = ({ href: C, title: o, text: i }) => `<img src="${C}" alt="${me(i)}" title="${me(o || "")}" loading="lazy" />`, M.listitem = function({ tokens: C, task: o, checked: i }) {
      if (o) {
        const u = this.parser.parse(C.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${i ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${u}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(C)}</li>`;
    };
    const v = new Tt({ gfm: !0, breaks: !1 });
    v.use({ extensions: Xn });
    const k = X(null), p = X("");
    let f = null, $ = !1, y = !1;
    function S() {
      $ || ($ = !0, import("dompurify").then((C) => {
        const o = C == null ? void 0 : C.default;
        o && typeof o.sanitize == "function" && (f = (i) => o.sanitize(i, {
          ADD_ATTR: ["data-code", "data-heading-id", "data-lang", "target"]
        }), A());
      }).catch(() => {
        y || (y = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function A() {
      k.value = null;
      try {
        const C = r.value.map((x) => x.id);
        let o = 0;
        const i = Object.create(M);
        i.heading = ({ tokens: x, depth: G }) => {
          const F = b(x), Y = C[o++] ?? T(F);
          return `<h${G} id="${Y}"><a href="#" data-heading-id="${Y}" class="heading-anchor" aria-hidden="true">#</a>${F}</h${G}>`;
        };
        const u = v.parse(n.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: i
        });
        p.value = f ? f(u) : u;
      } catch (C) {
        k.value = C.message || "Unknown error rendering markdown", p.value = "";
      }
    }
    function b(C) {
      return C.map((o) => {
        const i = o;
        return i.text ? String(i.text) : i.tokens ? b(i.tokens) : "";
      }).join("");
    }
    S(), fe(() => n.content, A, { immediate: !0 });
    const { activeHeading: m, scrollToHeading: a } = Vt({
      content: l,
      scrollContainer: Ye(n, "scrollContainer"),
      watchSource: () => p.value
    }), g = X(/* @__PURE__ */ new Set());
    fe(
      () => n.content,
      () => {
        g.value = /* @__PURE__ */ new Set();
      }
    );
    function w() {
      L(), no(l.value);
    }
    fe(p, () => {
      ke(), he(H);
    }), bt(H);
    function H() {
      w(), O(), W(), Zn(l.value), Ce();
    }
    let B = [], q = null;
    const Z = _t();
    function ke() {
      const C = /* @__PURE__ */ new Map();
      for (const o of B) {
        const i = C.get(o.key) ?? [];
        i.push({ rootEl: o.rootEl, ownerContainer: o.ownerContainer }), C.set(o.key, i);
      }
      B = [], q = C;
    }
    function Ce() {
      if (q) {
        for (const C of q.values())
          for (const o of C)
            Ne(null, o.ownerContainer);
        q = null;
      }
    }
    function z(C, o, i) {
      const u = q == null ? void 0 : q.get(o), x = u == null ? void 0 : u.shift();
      if (u && u.length === 0 && (q == null || q.delete(o)), C.innerHTML = "", x) {
        C.appendChild(x.rootEl), B.push({
          key: o,
          rootEl: x.rootEl,
          ownerContainer: x.ownerContainer
        });
        return;
      }
      const G = i();
      G.appContext = (Z == null ? void 0 : Z.appContext) ?? null, Ne(G, C);
      const F = C.firstElementChild;
      F && B.push({ key: o, rootEl: F, ownerContainer: C });
    }
    function L() {
      var o;
      if (!l.value) return;
      const C = l.value.querySelectorAll(".mermaid-diagram");
      for (const i of C) {
        if (i.getAttribute("data-mermaid-state") === "done") continue;
        const u = ((o = i.querySelector("pre code")) == null ? void 0 : o.textContent) ?? "", x = ao(u);
        x && (z(
          i,
          `mermaid-flow:${u}`,
          () => Fe(Ue, { graph: x, height: "480px", editable: !1 })
        ), i.setAttribute("data-mermaid-state", "done"), i.setAttribute("data-mermaid-renderer", "ui-frame"));
      }
    }
    function O() {
      if (!l.value) return;
      l.value.querySelectorAll(".prodoc-flow-diagram").forEach((o, i) => {
        var G;
        const u = ((G = o.querySelector("pre code")) == null ? void 0 : G.textContent) ?? o.textContent ?? "", x = Xe(u);
        x.nodes.length !== 0 && z(
          o,
          `flow:${u}`,
          () => Fe(Ue, {
            graph: x,
            height: "420px",
            editable: n.flowEditable,
            onNavigate: (F) => s("docLink", F),
            onNodeMove: (F) => s("flowNodeMove", { ...F, source: u, blockIndex: i })
          })
        );
      });
    }
    function W() {
      var o;
      if (!l.value) return;
      const C = l.value.querySelectorAll(".doc-code-block-mount");
      for (const i of C) {
        const u = ((o = i.querySelector("pre code")) == null ? void 0 : o.textContent) ?? i.textContent ?? "", x = i.dataset.lang || "text";
        z(i, `code:${x}:${u}`, () => Fe(bn, { code: u, lang: x }));
      }
    }
    function U(C) {
      const o = C.target, i = o.closest(".heading-anchor");
      if (i) {
        const x = i.dataset.headingId;
        x && (C.preventDefault(), a(x));
        return;
      }
      const u = o.closest("a");
      if (u) {
        const x = u.getAttribute("href");
        x && !x.startsWith("//") && (x.startsWith("/") || x.startsWith(".") || x.endsWith(".md")) && (C.preventDefault(), s("docLink", x));
      }
    }
    return Ee(() => {
      for (const C of B)
        Ne(null, C.ownerContainer);
      if (B = [], q) {
        for (const C of q.values())
          for (const o of C)
            Ne(null, o.ownerContainer);
        q = null;
      }
    }), (C, o) => (R(), P("div", {
      class: ne(`neumorphism-markdown ${n.className}`)
    }, [
      N("div", co, [
        k.value ? (R(), P("div", uo, [
          N("p", fo, [
            _(K, {
              name: "warning",
              size: "md"
            }),
            o[5] || (o[5] = Q(" 渲染错误 ", -1))
          ]),
          N("pre", mo, j(k.value), 1)
        ])) : (R(), P("div", {
          key: 1,
          ref_key: "contentRef",
          ref: l,
          class: "neumorphism-markdown-content",
          onClick: U,
          innerHTML: p.value
        }, null, 8, ho))
      ]),
      e.showToc && D(r).length > 0 ? (R(), ue(et, {
        key: 0,
        "collapsed-groups": g.value,
        "onUpdate:collapsedGroups": o[0] || (o[0] = (i) => g.value = i),
        items: D(d),
        "active-id": D(m),
        onSelect: D(a)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : oe("", !0),
      e.showToc && D(r).length > 0 ? (R(), P("button", {
        key: 1,
        class: ne(["neumorphism-toc-mobile-btn", { active: h.value }]),
        "aria-label": D(c)("markdownTocToggle"),
        onClick: o[1] || (o[1] = (i) => h.value = !h.value)
      }, [
        _(K, {
          name: "list",
          size: "2xl"
        })
      ], 10, po)) : oe("", !0),
      _(rt, { name: "neumorphism-toc-drawer" }, {
        default: I(() => [
          e.showToc && D(r).length > 0 && h.value ? (R(), P("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: o[4] || (o[4] = kt((i) => h.value = !1, ["self"]))
          }, [
            _($e, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: I(() => [
                N("div", go, [
                  N("span", vo, [
                    _(K, {
                      name: "list",
                      size: "sm"
                    }),
                    Q(" " + j(D(c)("markdownTocLabel")), 1)
                  ]),
                  N("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": D(c)("markdownTocClose"),
                    onClick: o[2] || (o[2] = (i) => h.value = !1)
                  }, [
                    _(K, {
                      name: "close",
                      size: "sm"
                    })
                  ], 8, yo)
                ]),
                _(et, {
                  "collapsed-groups": g.value,
                  "onUpdate:collapsedGroups": o[3] || (o[3] = (i) => g.value = i),
                  items: D(d),
                  "active-id": D(m),
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
}), $t = /* @__PURE__ */ ye({
  __name: "DocTreeIcon",
  props: {
    name: { default: "file" },
    size: { default: 14 }
  },
  setup(e) {
    const t = e, n = {
      folder: "folder",
      file: "file",
      api: "plug",
      guide: "guide",
      config: "config",
      example: "example",
      install: "install",
      changelog: "changelog",
      faq: "faq"
    }, s = V(() => n[t.name] ?? "file");
    return (l, h) => (R(), ue(K, {
      name: s.value,
      size: t.size
    }, null, 8, ["name", "size"]));
  }
}), wo = { class: "neumorphism-header-brand" }, xo = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, $o = { class: "neumorphism-header-search" }, bo = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, _o = { class: "neumorphism-search-list" }, ko = ["onClick"], Co = { class: "neumorphism-search-title" }, Mo = { class: "neumorphism-search-path" }, To = {
  key: 0,
  class: "neumorphism-sider-content"
}, So = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, Eo = { class: "neumorphism-doc-header" }, No = { class: "neumorphism-doc-title" }, Lo = { class: "neumorphism-doc-meta" }, Ro = { class: "neumorphism-doc-body" }, Ao = {
  key: 1,
  class: "neumorphism-empty-state"
}, Do = { class: "neumorphism-doc-empty-icon" }, Io = /* @__PURE__ */ ye({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: l,
      selectedKeys: h,
      expandedKeys: c,
      treeData: r,
      displayNode: d,
      themeModel: T,
      searchQuery: E,
      searchResults: M,
      docTree: v,
      handleTreeSelect: k,
      handleDocLink: p,
      handleSearchSelect: f
    } = gt({ root: n.root, initialPath: n.initialPath });
    function $(b) {
      p(s, b);
    }
    const y = X("doc"), S = V(
      () => d.value ? Je(d.value) : null
    );
    fe(d, () => {
      y.value = "doc";
    });
    function A(b) {
      const m = v.value.findByPath(b) ?? v.value.findByPath(`/${b}`) ?? v.value.findByPath(b.replace(/^\//, ""));
      m && (p(s, m.path), Je(m) || (y.value = "doc"));
    }
    return (b, m) => (R(), P("div", {
      class: ne(`neumorphism-doc-viewer ${n.className}`)
    }, [
      _(at, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": I(() => [
          N("span", wo, [
            _(K, {
              name: "book",
              size: "md"
            }),
            m[7] || (m[7] = Q(" Doc Viewer", -1))
          ])
        ]),
        "header-right": I(() => [
          N("div", xo, [
            _(te, {
              size: "small",
              variant: y.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": y.value === "doc",
              onClick: m[0] || (m[0] = (a) => y.value = "doc")
            }, {
              default: I(() => [
                _(K, {
                  name: "file-text",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[8] || (m[8] = Q(" 文档 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            _(te, {
              size: "small",
              variant: y.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": y.value === "canvas",
              disabled: !S.value,
              title: S.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: m[1] || (m[1] = (a) => y.value = "canvas")
            }, {
              default: I(() => [
                _(K, {
                  name: "map",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[9] || (m[9] = Q(" 画布 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          N("div", $o, [
            _(Mt, {
              modelValue: D(E),
              "onUpdate:modelValue": m[2] || (m[2] = (a) => _e(E) ? E.value = a : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            D(M).length > 0 ? (R(), P("div", bo, [
              N("ul", _o, [
                (R(!0), P(ve, null, xe(D(M), (a) => (R(), P("li", {
                  key: a.id,
                  class: "neumorphism-search-item",
                  onClick: (g) => D(f)(a)
                }, [
                  N("span", Co, j(a.title), 1),
                  N("span", Mo, j(a.path), 1)
                ], 8, ko))), 128))
              ])
            ])) : oe("", !0)
          ]),
          _(ct, {
            modelValue: D(T),
            "onUpdate:modelValue": m[3] || (m[3] = (a) => _e(T) ? T.value = a : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: I(({ collapsed: a }) => [
          a ? (R(), P("div", So, [
            _(K, {
              name: "book",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (R(), P("div", To, [
            _(dt, {
              "selected-keys": D(h),
              "onUpdate:selectedKeys": m[4] || (m[4] = (g) => _e(h) ? h.value = g : null),
              "expanded-keys": D(c),
              "onUpdate:expandedKeys": m[5] || (m[5] = (g) => _e(c) ? c.value = g : null),
              data: D(r),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: D(k)
            }, {
              icon: I(({ node: g }) => [
                _($t, {
                  name: String(g.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: I(() => [
          _(ft, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: I(() => [
              _($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: I(() => [
                  D(d) ? (R(), P(ve, { key: 0 }, [
                    N("div", Eo, [
                      N("h1", No, j(D(d).title), 1),
                      N("div", Lo, [
                        D(d).path ? (R(), ue(Se, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: I(() => [
                            Q(j(D(d).path), 1)
                          ]),
                          _: 1
                        })) : oe("", !0),
                        D(d).children.length > 0 ? (R(), ue(Se, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: I(() => [
                            _(K, {
                              name: "folder",
                              size: "sm",
                              class: "neumorphism-doc-icon-inline"
                            }),
                            m[10] || (m[10] = Q(" { displayNode.children.length } 个子项 ", -1))
                          ]),
                          _: 1
                        })) : oe("", !0)
                      ])
                    ]),
                    _(ut),
                    N("div", Ro, [
                      _(rt, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: I(() => [
                          y.value === "doc" ? (R(), ue(xt, {
                            key: D(d).path,
                            content: D(d).body,
                            onDocLink: $
                          }, null, 8, ["content"])) : S.value ? (R(), ue(Ue, {
                            key: `${D(d).path}:canvas`,
                            graph: S.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: A
                          }, null, 8, ["graph"])) : oe("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (R(), P("div", Ao, [
                    _($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: I(() => [
                        N("span", Do, [
                          _(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    m[12] || (m[12] = N("p", null, "请从左侧选择一篇文档", -1)),
                    _(te, {
                      variant: "raised",
                      size: "small",
                      onClick: m[6] || (m[6] = (a) => {
                        var g;
                        return l.value = ((g = D(r)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: I(() => [...m[11] || (m[11] = [
                        Q(" 打开第一篇 ", -1)
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
}), Ls = /* @__PURE__ */ qe(Io, [["__scopeId", "data-v-9ec4eb2c"]]), zo = { class: "neumorphism-editor-toolbar" }, Po = { class: "neumorphism-editor-toolbar-left" }, Bo = { class: "neumorphism-editor-toolbar-right" }, Ho = ["aria-selected", "tabindex", "onClick", "onKeydown"], Oo = { class: "nm-tabs__tab-label" }, qo = { class: "editor-stat" }, Wo = /* @__PURE__ */ ye({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, l = X("split");
    function h(z) {
      s("docLink", z);
    }
    function c(z, L) {
      if (z.key !== "ArrowLeft" && z.key !== "ArrowRight") return;
      z.preventDefault();
      const O = r.findIndex((C) => C.key === L), W = z.key === "ArrowRight" ? 1 : -1, U = r[(O + W + r.length) % r.length];
      l.value = U.key, he(() => {
        var C, o;
        (o = (C = z.target.closest(".nm-tabs__nav")) == null ? void 0 : C.querySelectorAll(".nm-tabs__tab")[r.indexOf(U)]) == null || o.focus();
      });
    }
    const r = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], d = V(() => n.value.length), T = V(() => n.value.split(`
`).length), E = X(null), M = X(null);
    let v = !1;
    function k() {
      var z;
      return (z = E.value) == null ? void 0 : z.querySelector("textarea");
    }
    function p(z, L, O) {
      const W = k();
      if (!W) return;
      const U = W.selectionStart, C = W.selectionEnd, o = W.value.slice(U, C) || O, i = W.value.slice(0, U) + z + o + L + W.value.slice(C);
      s("change", i), he(() => {
        W.focus();
        const u = U + z.length;
        W.setSelectionRange(u, u + o.length);
      });
    }
    function f(z, L) {
      const O = k();
      if (!O) return;
      const W = O.selectionStart, U = O.value.slice(0, W), C = O.value.slice(W), u = `${U.length > 0 && !U.endsWith(`
`) ? `
` : ""}${z} ${L}
`, x = U + u + C;
      s("change", x), he(() => {
        O.focus();
        const G = W + u.length - L.length - 2;
        O.setSelectionRange(G, G + L.length);
      });
    }
    function $() {
      p("**", "**", "粗体文字");
    }
    function y() {
      p("_", "_", "斜体文字");
    }
    function S() {
      f("##", "标题");
    }
    function A() {
      p("[", "](url)", "链接文字");
    }
    function b() {
      f("![alt text]", "(url)");
    }
    function m() {
      p("`", "`", "代码");
    }
    function a() {
      f("```\n", "code\n```");
    }
    function g() {
      f("-", "列表项");
    }
    function w() {
      const z = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, L = k();
      if (!L) return;
      const O = L.selectionStart, W = L.value.slice(0, O) + z + L.value.slice(L.selectionEnd);
      s("change", W), he(() => {
        L.focus(), L.setSelectionRange(O + 3, O + 3);
      });
    }
    function H(z) {
      var U, C;
      const L = (C = (U = z.dataTransfer) == null ? void 0 : U.files) == null ? void 0 : C[0];
      if (!(L != null && L.type.startsWith("image/"))) return;
      z.preventDefault(), z.stopPropagation();
      const O = new FileReader(), W = L.name;
      O.onload = () => {
        const o = k();
        if (!o) return;
        const i = o.selectionStart, u = `![${W}](${O.result})`, x = o.value.slice(0, i) + u + o.value.slice(i);
        s("change", x), he(() => {
          o.focus(), o.setSelectionRange(i + u.length, i + u.length);
        });
      }, O.readAsDataURL(L);
    }
    function B(z) {
      var L;
      (L = z.dataTransfer) != null && L.types.includes("Files") && z.preventDefault();
    }
    let q = null;
    function Z() {
      n.autoSave && (q && clearTimeout(q), q = setTimeout(() => {
        s("change", n.value);
      }, n.autoSaveInterval));
    }
    fe(
      () => n.value,
      () => {
        Z();
      }
    ), Ee(() => {
      q && clearTimeout(q);
    });
    function ke() {
      var W;
      if (v || l.value !== "split") return;
      const z = (W = E.value) == null ? void 0 : W.querySelector("textarea"), L = M.value;
      if (!z || !L) return;
      const O = z.scrollTop / (z.scrollHeight - z.clientHeight || 1);
      v = !0, L.scrollTop = O * (L.scrollHeight - L.clientHeight), requestAnimationFrame(() => {
        v = !1;
      });
    }
    function Ce() {
      var W;
      if (v || l.value !== "split") return;
      const z = (W = E.value) == null ? void 0 : W.querySelector("textarea"), L = M.value;
      if (!z || !L) return;
      const O = L.scrollTop / (L.scrollHeight - L.clientHeight || 1);
      v = !0, z.scrollTop = O * (z.scrollHeight - z.clientHeight), requestAnimationFrame(() => {
        v = !1;
      });
    }
    return (z, L) => (R(), P("div", {
      class: ne(`neumorphism-markdown-editor ${n.className}`)
    }, [
      N("div", zo, [
        N("div", Po, [
          _(te, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: $
          }, {
            default: I(() => [...L[2] || (L[2] = [
              N("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            "aria-label": "斜体",
            onClick: y
          }, {
            default: I(() => [...L[3] || (L[3] = [
              N("em", null, "I", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "标题",
            "aria-label": "标题",
            onClick: S
          }, {
            default: I(() => [...L[4] || (L[4] = [
              Q(" H ", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: A
          }, {
            default: I(() => [
              _(K, {
                name: "link",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "图片",
            "aria-label": "图片",
            onClick: b
          }, {
            default: I(() => [
              _(K, {
                name: "image",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "行内代码",
            "aria-label": "行内代码",
            onClick: m
          }, {
            default: I(() => [...L[5] || (L[5] = [
              Q(" </> ", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: a
          }, {
            default: I(() => [
              _(K, {
                name: "clipboard",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "无序列表",
            "aria-label": "无序列表",
            onClick: g
          }, {
            default: I(() => [
              _(K, {
                name: "list",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "表格",
            "aria-label": "表格",
            onClick: w
          }, {
            default: I(() => [
              _(K, {
                name: "table",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          })
        ]),
        N("div", Bo, [
          _(Nt, {
            modelValue: l.value,
            "onUpdate:modelValue": L[0] || (L[0] = (O) => l.value = O),
            tabs: r,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: I(({ tab: O, active: W, activate: U }) => [
              N("button", {
                type: "button",
                class: ne(["nm-tabs__tab", { "nm-tabs__tab--active": W }]),
                role: "tab",
                "aria-selected": W,
                tabindex: W ? 0 : -1,
                onClick: (C) => U(O.key),
                onKeydown: (C) => c(C, O.key)
              }, [
                _(K, {
                  name: O.key === "edit" ? "pencil" : O.key === "split" ? "split" : "eye",
                  size: "sm",
                  class: "neumorphism-editor-icon"
                }, null, 8, ["name"]),
                N("span", Oo, j(O.label), 1)
              ], 42, Ho)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          N("span", qo, j(T.value) + " 行 · " + j(d.value) + " 字", 1)
        ])
      ]),
      N("div", {
        class: ne(["neumorphism-editor-panels", `neumorphism-mode-${l.value}`])
      }, [
        N("div", {
          ref_key: "editPanelRef",
          ref: E,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: l.value === "preview" }]),
          onScroll: ke,
          onDrop: H,
          onDragover: B
        }, [
          _($e, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: I(() => [
              _(Lt, {
                class: "neumorphism-editor-textarea",
                "model-value": n.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": L[1] || (L[1] = (O) => s("change", O))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        N("div", {
          ref_key: "previewPanelRef",
          ref: M,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: l.value === "edit" }]),
          onScroll: Ce
        }, [
          _($e, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: I(() => [
              _(xt, {
                content: n.value,
                "show-toc": !1,
                onDocLink: h
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), Fo = /* @__PURE__ */ qe(Wo, [["__scopeId", "data-v-1d3fd848"]]), Go = { class: "neumorphism-editor-brand" }, Vo = { class: "neumorphism-editor-actions" }, Ko = {
  key: 0,
  class: "neumorphism-editor-sider"
}, Uo = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, Xo = {
  key: 0,
  class: "neumorphism-editor-layout"
}, Yo = { class: "neumorphism-editor-header" }, jo = { class: "neumorphism-editor-title" }, Qo = { class: "neumorphism-editor-meta" }, Zo = { class: "neumorphism-editor-body" }, Jo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, es = { class: "neumorphism-doc-empty-icon" }, ts = 50, ns = /* @__PURE__ */ ye({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: l,
      selectedKeys: h,
      expandedKeys: c,
      treeData: r,
      displayNode: d,
      themeModel: T,
      handleTreeSelect: E
    } = gt({ root: n.root, initialPath: n.initialPath }), M = X({}), v = X([]);
    function k(b, m) {
      const a = v.value.filter((g) => g !== b);
      for (a.push(b); a.length > ts; ) {
        const g = a.shift();
        g !== b && delete M.value[g];
      }
      v.value = a, M.value[b] = m;
    }
    function p(b) {
      return M.value[b.path] ?? b.content;
    }
    function f(b) {
      d.value && k(d.value.path, b);
    }
    function $() {
      d.value && s("save", d.value.path, p(d.value));
    }
    function y(b) {
      l.value = b, s("docLink", b);
    }
    const S = V(() => {
      if (!d.value) return !1;
      const b = M.value[d.value.path];
      return b !== void 0 && b !== d.value.content;
    });
    function A(b) {
      (b.ctrlKey || b.metaKey) && b.key === "s" && (b.preventDefault(), $());
    }
    return (b, m) => (R(), P("div", {
      class: ne(`neumorphism-doc-editor ${n.className}`),
      onKeydown: A
    }, [
      _(at, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": I(() => [
          N("span", Go, [
            _(K, {
              name: "pencil",
              size: "md"
            }),
            m[4] || (m[4] = Q(" Doc Editor", -1))
          ])
        ]),
        "header-center": I(() => [
          _(ct, {
            modelValue: D(T),
            "onUpdate:modelValue": m[0] || (m[0] = (a) => _e(T) ? T.value = a : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": I(() => [
          N("div", Vo, [
            S.value ? (R(), ue(Se, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: I(() => [...m[5] || (m[5] = [
                Q(" 未保存 ", -1)
              ])]),
              _: 1
            })) : oe("", !0),
            _(te, {
              variant: "raised",
              size: "small",
              disabled: !S.value,
              onClick: $
            }, {
              default: I(() => [
                _(K, {
                  name: "save",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[6] || (m[6] = Q(" 保存 ", -1))
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: I(({ collapsed: a }) => [
          a ? (R(), P("div", Uo, [
            _(K, {
              name: "pencil",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (R(), P("div", Ko, [
            _(dt, {
              "selected-keys": D(h),
              "onUpdate:selectedKeys": m[1] || (m[1] = (g) => _e(h) ? h.value = g : null),
              "expanded-keys": D(c),
              "onUpdate:expandedKeys": m[2] || (m[2] = (g) => _e(c) ? c.value = g : null),
              data: D(r),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: D(E)
            }, {
              icon: I(({ node: g }) => [
                _($t, {
                  name: String(g.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: I(() => [
          _(ft, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: I(() => [
              _($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: I(() => [
                  D(d) ? (R(), P("div", Xo, [
                    N("header", Yo, [
                      N("div", null, [
                        N("h1", jo, j(D(d).title), 1),
                        N("div", Qo, [
                          D(d).path ? (R(), ue(Se, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: I(() => [
                              Q(j(D(d).path), 1)
                            ]),
                            _: 1
                          })) : oe("", !0),
                          S.value ? (R(), ue(Se, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: I(() => [...m[7] || (m[7] = [
                              Q(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : oe("", !0)
                        ])
                      ]),
                      _(te, {
                        variant: "raised",
                        size: "small",
                        disabled: !S.value,
                        onClick: $
                      }, {
                        default: I(() => [
                          _(K, {
                            name: "save",
                            size: "xl",
                            class: "neumorphism-doc-icon"
                          }),
                          m[8] || (m[8] = Q(" 保存 ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    _(ut),
                    N("div", Zo, [
                      _(Fo, {
                        value: p(D(d)),
                        onChange: f,
                        onDocLink: y
                      }, null, 8, ["value"])
                    ])
                  ])) : (R(), P("div", Jo, [
                    _($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: I(() => [
                        N("span", es, [
                          _(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    m[10] || (m[10] = N("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    _(te, {
                      variant: "raised",
                      size: "small",
                      onClick: m[3] || (m[3] = (a) => {
                        var g;
                        return l.value = ((g = D(r)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: I(() => [...m[9] || (m[9] = [
                        Q(" 打开第一篇 ", -1)
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
}), Rs = /* @__PURE__ */ qe(ns, [["__scopeId", "data-v-db1006bf"]]), os = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function ss(e) {
  const t = e.match(os);
  if (!t)
    return { meta: {}, body: e };
  const n = t[1], s = e.slice(t[0].length), l = {};
  for (const h of n.split(`
`)) {
    const c = h.indexOf(":");
    if (c === -1) continue;
    const r = h.slice(0, c).trim();
    let d = h.slice(c + 1).trim();
    /^-?\d+$/.test(d) ? d = parseInt(d, 10) : /^-?\d+\.\d+$/.test(d) ? d = parseFloat(d) : d === "true" ? d = !0 : d === "false" ? d = !1 : (d.startsWith('"') && d.endsWith('"') || d.startsWith("'") && d.endsWith("'")) && (d = d.slice(1, -1)), l[r] = d;
  }
  return { meta: l, body: s };
}
function ls(e) {
  return e.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function is(e, t) {
  if (t.title && typeof t.title == "string")
    return t.title;
  const n = e.match(/^#\s+(.+)$/m);
  return n ? n[1].trim() : "Untitled";
}
function rs(e, t) {
  const { meta: n, body: s } = ss(t), l = is(s, n), h = typeof n.order == "number" ? n.order : 9999;
  return {
    id: ls(e),
    title: l,
    path: e,
    content: t,
    body: s,
    meta: n,
    children: [],
    order: h
  };
}
function As(e) {
  const t = /* @__PURE__ */ new Map();
  for (const [c, r] of Object.entries(e)) {
    if (!c.endsWith(".md")) continue;
    const d = rs(c, r);
    t.set(c, d);
  }
  const n = [], s = Array.from(t.keys()).sort();
  for (const c of s) {
    const r = c.split("/");
    if (r.length === 1) {
      n.push(c);
      continue;
    }
    let d = null;
    const E = `${r.slice(0, -1).join("/")}/index.md`;
    if (t.has(E) && E !== c)
      d = E;
    else {
      const M = r.slice(0, -1).join("/") + ".md";
      t.has(M) && (d = M);
    }
    if (d && t.has(d)) {
      const M = t.get(d), v = t.get(c);
      M.children.push(v);
    } else
      n.push(c);
  }
  for (const c of t.values())
    c.children.sort((r, d) => r.order - d.order || r.title.localeCompare(d.title));
  const l = n.map((c) => t.get(c)).sort((c, r) => c.order - r.order || c.title.localeCompare(r.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: l,
    order: 0
  };
}
const Ds = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  bn as DocCodeBlock,
  Rs as DocEditor,
  Ue as DocFlowCanvas,
  et as DocTocNav,
  $t as DocTreeIcon,
  Ls as DocViewer,
  Pe as MATH_MOUNT_CLASS,
  yt as MATH_SOURCE_CLASS,
  Te as MATH_STATE_ATTR,
  Fo as MarkdownEditor,
  xt as MarkdownRenderer,
  Ve as TocNodeItem,
  As as buildDocTree,
  Ht as buildHierarchyGraph,
  Ds as componentCategories,
  At as createDocTree,
  rs as createNode,
  zt as extractFlowBlocks,
  is as extractTitle,
  Ss as flattenDocTree,
  Es as getAncestors,
  Rt as getNodeIcon,
  Ke as getScrollBehavior,
  mn as highlightCode,
  st as layoutProDocFlow,
  Wn as matchBlockBracket,
  qn as matchBlockDollar,
  Kn as matchInlineBracket,
  Fn as matchInlineDollar,
  Vn as matchInlineDoubleDollar,
  Gn as matchInlineParen,
  Xn as mathExtensions,
  pt as nodeToTreeData,
  ss as parseFrontmatter,
  Xe as parseProDocFlow,
  ls as pathToId,
  Zn as renderMath,
  Je as resolveCanvasGraph,
  Un as stripMathDelimiters,
  gt as useDocLayout,
  On as useMarkdownToc,
  Vt as useScrollSpy,
  Ns as writeFlowNodePosition
};
