import { ref as X, computed as V, watch as fe, onBeforeUnmount as Ee, defineComponent as ye, openBlock as A, createElementBlock as B, normalizeClass as ne, createElementVNode as N, unref as I, createVNode as _, createCommentVNode as oe, toDisplayString as Y, Fragment as ge, renderList as xe, createBlock as ue, nextTick as he, withCtx as z, createTextVNode as j, normalizeStyle as We, toRef as Ke, onMounted as kt, getCurrentInstance as _t, render as Ne, Transition as lt, withModifiers as bt, h as Ue, isRef as _e } from "vue";
import { useTheme as Ct } from "../composables/useTheme.js";
import { N as it } from "../chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as te } from "../chunks/NeumorphismButton-CJnORKTl.js";
import { N as $e } from "../chunks/NeumorphismCard-D5NmwYTE.js";
import { N as at } from "../chunks/NeumorphismThemeToggle-D2_PXFjy.js";
import { N as rt } from "../chunks/NeumorphismTree-fQBHMCMo.js";
import { N as ct } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as Se } from "../chunks/NeumorphismTag-C6c5RGls.js";
import { N as dt } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as Mt } from "../chunks/NeumorphismInput-Bk0rWMyD.js";
import { marked as ut, Marked as Tt } from "marked";
import { escapeHtml as me, generateId as ft, slugify as Xe } from "../utils/index.js";
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
function mt(e) {
  const t = e.children.length > 0 ? "folder" : Rt(e);
  return {
    key: e.path,
    label: e.title,
    icon: t,
    children: e.children.map(mt)
  };
}
function At(e) {
  const t = /* @__PURE__ */ new Map();
  function n(h) {
    t.set(h.path, h);
    for (const r of h.children)
      n(r);
  }
  n(e);
  const s = /* @__PURE__ */ new Map();
  function l(h) {
    s.set(h.id, h);
    for (const r of h.children)
      l(r);
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
function ks(e) {
  const t = [];
  function n(s) {
    t.push(s);
    for (const l of s.children)
      n(l);
  }
  return n(e), t;
}
function _s(e, t) {
  const n = [];
  function s(l, h, r) {
    if (l.id === h)
      return n.push(...r), !0;
    for (const c of l.children)
      if (s(c, h, [...r, l]))
        return !0;
    return !1;
  }
  return s(t, e.id, []), n;
}
function ht(e) {
  var v;
  const { root: t, initialPath: n } = e, s = typeof window < "u", l = e.syncUrlHash !== !1 && s, h = s ? window.location.hash.slice(1) : "", r = n || h || ((v = t.children[0]) == null ? void 0 : v.path) || "", c = X(r), a = X([]), { theme: T, setTheme: E } = Ct(), M = V({
    get: () => T.value,
    set: (w) => E(w)
  }), g = V(() => t.children.map(mt)), b = X(c.value ? [c.value] : []);
  fe(c, (w) => {
    b.value = w ? [w] : [];
  });
  const p = V(() => At(t)), u = V(() => {
    if (c.value)
      return p.value.findByPath(c.value);
  }), x = V(() => u.value || t.children[0]);
  function y(w) {
    c.value = w;
  }
  function S(w, O) {
    c.value = O, w("docLink", O);
  }
  const D = X(""), $ = V(() => {
    if (!D.value.trim()) return [];
    const w = D.value.toLowerCase();
    return i(t).filter((H) => H.id === "root" ? !1 : H.title.toLowerCase().includes(w) || H.body.toLowerCase().includes(w)).slice(0, 10);
  });
  function f(w) {
    c.value = w.path, D.value = "";
  }
  function i(w) {
    const O = [w];
    for (const H of w.children)
      O.push(...i(H));
    return O;
  }
  if (fe(
    () => n,
    (w) => {
      w && (c.value = w);
    }
  ), l) {
    fe(c, (O) => {
      O && history.replaceState(null, "", `#${O}`);
    });
    const w = () => {
      const O = window.location.hash.slice(1);
      O && O !== c.value && (c.value = O);
    };
    window.addEventListener("hashchange", w), Ee(() => {
      window.removeEventListener("hashchange", w);
    });
  }
  return {
    selectedPath: c,
    selectedKeys: b,
    expandedKeys: a,
    treeData: g,
    selectedNode: u,
    displayNode: x,
    docTree: p,
    themeModel: M,
    searchQuery: D,
    searchResults: $,
    handleTreeSelect: y,
    handleDocLink: S,
    handleSearchSelect: f
  };
}
const Dt = /^graph\s+(LR|RL|TB|BT)\s*$/i, ke = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Le = /-->\s*(?:\|([^|]*)\|)?/y, Ye = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, It = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, Be = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function zt(e) {
  const t = [];
  Be.lastIndex = 0;
  let n;
  for (; (n = Be.exec(e)) !== null; )
    t.push(n[1]);
  return t;
}
function bs(e, t, n, s, l, h) {
  Be.lastIndex = 0;
  const r = t.replace(/\r\n/g, `
`).trim();
  let c, a = -1;
  for (; (c = Be.exec(e)) !== null; ) {
    if (a++, h !== void 0 && a !== h) continue;
    const T = c[1];
    if (T.replace(/\r\n/g, `
`).trim() !== r) continue;
    const E = new RegExp(
      `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), M = T.split(`
`);
    let g = !1;
    for (let u = 0; u < M.length; u++) {
      const x = M[u].indexOf("%%"), y = x >= 0 ? M[u].slice(0, x) : M[u], S = x >= 0 ? M[u].slice(x) : "", D = y.trim();
      if (D.includes("-->") || !E.test(D)) continue;
      const $ = D.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      M[u] = `${$} @ ${s}, ${l}${S ? `  ${S}` : ""}`, g = !0;
      break;
    }
    if (!g) {
      const u = `${n} @ ${s}, ${l}`;
      M.length > 0 && M[M.length - 1].trim() === "" ? M.splice(M.length - 1, 0, u) : M.push(u);
    }
    const b = M.join(`
`), p = c.index + c[0].indexOf(T);
    return e.slice(0, p) + b + e.slice(p + T.length);
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
function pt(e) {
  const t = [], n = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), l = [];
  let h = "LR", r = !1;
  function c(g, b) {
    const { shape: p, text: u } = Pt(b), { label: x, docPath: y } = b ? Bt(u) : { label: g, docPath: void 0 }, S = n.get(g);
    S ? b && (S.label = x, S.shape = p, y !== void 0 && (S.docPath = y)) : n.set(g, { id: g, label: x, shape: p, docPath: y });
  }
  function a(g, b, p) {
    const u = n.get(g);
    u && (u.x = b, u.y = p);
  }
  function T(g, b, p) {
    const u = `${g}→${b}${p ?? ""}`;
    s.has(u) || (s.add(u), l.push({ from: g, to: b, label: p }));
  }
  const E = e.split(`
`);
  for (let g = 0; g < E.length; g++) {
    const b = g + 1, p = E[g].indexOf("%%"), u = (p >= 0 ? E[g].slice(0, p) : E[g]).trim();
    if (u) {
      if (!r) {
        const x = Dt.exec(u);
        x ? h = x[1].toUpperCase() : (t.push({
          line: b,
          source: E[g].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), M(u, b, E[g].trim())), r = !0;
        continue;
      }
      M(u, b, E[g].trim());
    }
  }
  function M(g, b, p) {
    var S;
    let u = 0;
    ke.lastIndex = 0, Le.lastIndex = 0, ke.lastIndex = u;
    let x = ke.exec(g);
    if (!x || x.index !== 0)
      return t.push({ line: b, source: p, message: "无法识别的语句" }), !1;
    let y = x[1];
    for (c(x[1], x[2]), u = ke.lastIndex; ; ) {
      for (; u < g.length && /\s/.test(g[u]); ) u++;
      if (u >= g.length) break;
      if (g[u] === "@") {
        Ye.lastIndex = u;
        const i = Ye.exec(g);
        return i && i.index === u ? (a(y, parseFloat(i[1]), parseFloat(i[2])), !0) : (t.push({
          line: b,
          source: p,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Le.lastIndex = u;
      const D = Le.exec(g);
      if (!D || D.index !== u)
        return t.push({
          line: b,
          source: p,
          message: `无法识别的内容: "${g.slice(u)}"`
        }), !1;
      const $ = ((S = D[1]) == null ? void 0 : S.trim()) || void 0;
      for (u = Le.lastIndex; u < g.length && /\s/.test(g[u]); ) u++;
      if (ke.lastIndex = u, x = ke.exec(g), !x || x.index !== u)
        return t.push({ line: b, source: p, message: "箭头后缺少目标节点" }), !1;
      const f = x[1];
      c(x[1], x[2]), T(y, f, $), y = f, u = ke.lastIndex;
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
const je = "__hier_root";
function Ht(e) {
  const t = [
    {
      id: je,
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
    }), n.push({ from: je, to: s.id });
  return {
    // 子项较多时纵向排布更可读
    direction: e.children.length <= 5 ? "LR" : "TB",
    nodes: t,
    edges: n,
    errors: []
  };
}
function Qe(e) {
  for (const t of zt(e.body)) {
    const n = pt(t);
    if (n.nodes.length > 0) return n;
  }
  return e.children.length > 0 ? Ht(e) : null;
}
const Ot = { class: "toc-item-row" }, qt = ["aria-expanded", "aria-controls", "aria-label"], Wt = ["data-toc-id", "aria-current"], Ft = { class: "toc-text" }, Gt = ["id"], Ge = /* @__PURE__ */ ye({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(e, { emit: t }) {
    const n = e, s = t, { t: l } = Oe(), h = V(() => n.activeHeading === n.node.id), r = V(() => n.node.children.length > 0), c = V(() => n.collapsedGroups.has(n.node.id));
    function a(E) {
      E.stopPropagation(), s("toggle", n.node.id);
    }
    function T(E) {
      E.preventDefault(), s("select", n.node.id);
    }
    return (E, M) => (A(), B("li", {
      class: ne(["neumorphism-toc-item", { "has-children": r.value, active: h.value }]),
      role: "listitem"
    }, [
      N("div", Ot, [
        r.value ? (A(), B("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !c.value,
          "aria-controls": `toc-list-${e.node.id}`,
          "aria-label": c.value ? I(l)("markdownTocExpand") : I(l)("markdownTocCollapse"),
          onClick: a
        }, [
          _(K, {
            name: c.value ? "chevron-right" : "chevron-down",
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
          N("span", Ft, Y(e.node.text), 1)
        ], 8, Wt)
      ]),
      r.value && !c.value ? (A(), B("ul", {
        key: 0,
        id: `toc-list-${e.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (A(!0), B(ge, null, xe(e.node.children, (g) => (A(), ue(Ge, {
          key: g.id,
          node: g,
          "active-heading": e.activeHeading,
          "collapsed-groups": e.collapsedGroups,
          onToggle: M[0] || (M[0] = (b) => E.$emit("toggle", b)),
          onSelect: M[1] || (M[1] = (b) => E.$emit("select", b))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Gt)) : oe("", !0)
    ], 2));
  }
});
function Ve() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Vt(e) {
  const { content: t } = e, n = e.headingSelector ?? "h1, h2, h3", s = X("");
  let l = !1, h = null;
  function r(y) {
    var $;
    const S = t.value;
    if (!S) return null;
    const D = ($ = e.scrollContainer) == null ? void 0 : $.value;
    return D instanceof HTMLElement ? D : typeof D == "string" ? S.closest(D) : S.closest(".nm-layout__content");
  }
  function c(y) {
    const S = y ?? r();
    if (!S) return 64;
    const D = S.closest(".nm-layout"), $ = D == null ? void 0 : D.querySelector(".nm-layout__header");
    return $ ? $.getBoundingClientRect().height : 64;
  }
  function a(y) {
    var S;
    y !== s.value && (s.value = y, (S = e.onActiveChange) == null || S.call(e, y));
  }
  function T() {
    var f;
    const y = r();
    if (!y) return;
    const S = (f = t.value) == null ? void 0 : f.querySelectorAll(n);
    if (!S) return;
    const D = c(y) + 20;
    let $ = "";
    for (const i of S) {
      const v = i.getBoundingClientRect(), w = y.getBoundingClientRect();
      if (v.top - w.top <= D)
        $ = i.id;
      else
        break;
    }
    a($);
  }
  function E() {
    l = !1, h && (clearTimeout(h), h = null), T();
  }
  function M(y) {
    var D, $;
    h && clearTimeout(h), l = !0, s.value = y, (D = e.onActiveChange) == null || D.call(e, y);
    const S = ($ = t.value) == null ? void 0 : $.querySelector(`[id="${y}"]`);
    S && S.scrollIntoView({ behavior: Ve() }), h = setTimeout(E, 800);
  }
  let g = null, b = null, p = -1;
  function u() {
    g == null || g.disconnect(), g = null, b == null || b.disconnect(), b = null;
  }
  function x() {
    u();
    const y = r();
    if (!y || !t.value) return;
    const S = c(y);
    p = S;
    const D = Array.from(t.value.querySelectorAll(n));
    if (D.length === 0) return;
    const $ = /* @__PURE__ */ new Map();
    g = new IntersectionObserver(
      (v) => {
        if (l) return;
        for (const H of v)
          H.isIntersecting ? $.set(H.target, H.boundingClientRect.top) : $.delete(H.target);
        let w = "", O = -1 / 0;
        for (const [H, W] of $)
          W > O && (O = W, w = H.id);
        w && a(w);
      },
      {
        root: y,
        rootMargin: `-${S + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const v of D)
      g.observe(v);
    const f = y.closest(".nm-layout"), i = f == null ? void 0 : f.querySelector(".nm-layout__header");
    i && typeof ResizeObserver < "u" && (b = new ResizeObserver(() => {
      const v = i.getBoundingClientRect().height;
      v !== p && (p = v, he(() => x()));
    }), b.observe(i));
  }
  return fe(e.watchSource ? [t, e.watchSource] : [t], ([y]) => {
    y ? he(() => {
      x(), T();
    }) : u();
  }), Ee(() => {
    u(), h && clearTimeout(h);
  }), { activeHeading: s, scrollToHeading: M, syncActiveHeading: T };
}
const Kt = ["aria-label"], Ut = { class: "neumorphism-toc-header" }, Xt = { class: "neumorphism-toc-title" }, Yt = {
  class: "neumorphism-toc-list",
  role: "list"
}, jt = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Ze = /* @__PURE__ */ ye({
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
    const s = e, l = n, { t: h } = Oe(), r = V(() => s.title || h("markdownTocLabel")), c = X(null), a = X(/* @__PURE__ */ new Set()), T = V(() => s.collapsedGroups ?? a.value);
    function E(p) {
      s.collapsedGroups !== void 0 ? l("update:collapsedGroups", p) : a.value = p;
    }
    fe(
      () => s.items,
      () => {
        s.collapsedGroups === void 0 && (a.value = /* @__PURE__ */ new Set());
      }
    );
    function M(p) {
      const u = new Set(T.value), x = u.has(p);
      x ? u.delete(p) : u.add(p), E(u), x && he(() => g(p));
    }
    function g(p) {
      if (!c.value || window.innerWidth <= 1200) return;
      const u = c.value, x = u.querySelector(`[data-toc-id="${CSS.escape(p)}"]`);
      if (!x) return;
      const y = u.getBoundingClientRect(), S = x.closest(".neumorphism-toc-item"), D = Array.from((S == null ? void 0 : S.children) ?? []).find(
        (f) => f.classList.contains("neumorphism-toc-list")
      );
      if (D && D.getBoundingClientRect().bottom <= y.bottom + 10)
        return;
      const $ = x.getBoundingClientRect().top - y.top + u.scrollTop;
      u.scrollTo({
        top: Math.max(0, $),
        behavior: Ve()
      });
    }
    function b() {
      if (!c.value || window.innerWidth <= 1200) return;
      const p = c.value, u = p.querySelector(".neumorphism-toc-item.active");
      if (!u) return;
      const x = p.getBoundingClientRect(), y = u.getBoundingClientRect(), S = x.top + x.height * 0.25, D = x.top + x.height * 0.75;
      if (y.top >= S && y.bottom <= D)
        return;
      const f = y.top - x.top + p.scrollTop - y.height / 2 - x.height / 2;
      p.scrollTo({
        top: Math.max(0, f),
        behavior: Ve()
      });
    }
    return fe(
      () => s.activeId,
      (p) => {
        if (!p) return;
        function u(x) {
          for (const y of x) {
            if (y.id === p) return !0;
            if (u(y.children)) {
              if (T.value.has(y.id)) {
                const S = new Set(T.value);
                S.delete(y.id), E(S);
              }
              return !0;
            }
          }
          return !1;
        }
        u(s.items), he(() => b());
      }
    ), t({ scrollTocToActive: b }), (p, u) => e.framed ? (A(), B("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: c,
      class: "neumorphism-toc",
      "aria-label": r.value
    }, [
      _($e, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: z(() => [
          N("div", Ut, [
            N("span", Xt, [
              _(K, {
                name: "list",
                size: "sm"
              }),
              j(" " + Y(r.value), 1)
            ])
          ]),
          N("ul", Yt, [
            (A(!0), B(ge, null, xe(e.items, (x) => (A(), ue(Ge, {
              key: x.id,
              node: x,
              "active-heading": e.activeId,
              "collapsed-groups": T.value,
              onToggle: M,
              onSelect: u[0] || (u[0] = (y) => l("select", y))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, Kt)) : (A(), B("ul", jt, [
      (A(!0), B(ge, null, xe(e.items, (x) => (A(), ue(Ge, {
        key: x.id,
        node: x,
        "active-heading": e.activeId,
        "collapsed-groups": T.value,
        onToggle: M,
        onSelect: u[1] || (u[1] = (y) => l("select", y))
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
const sn = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, ln = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, an = /\b([a-zA-Z_]\w*)(?=\()/g, rn = /\b(\d+\.?\d*)\b/g, cn = /\b([A-Z][a-zA-Z0-9_]*)\b/g, dn = /\u0001([a-z]+)\u0001/g;
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
  const s = [], l = (h) => (r) => (s.push(`<span class="${h}">${r}</span>`), un(s.length - 1));
  return n = n.replace(sn, l("token-string")), n = n.replace(on(t), l("token-comment")), n = n.replace(ln, '<span class="token-keyword">$1</span>'), n = n.replace(an, '<span class="token-function">$1</span>'), n = n.replace(rn, '<span class="token-number">$1</span>'), n = n.replace(cn, '<span class="token-type">$1</span>'), n = n.replace(dn, (h, r) => s[fn(r)]), n;
}
const hn = { class: "code-block-wrapper doc-code-block" }, pn = { class: "code-block-header" }, vn = { class: "code-lang" }, gn = { class: "code-lines" }, yn = ["aria-label"], wn = { class: "code-block-body" }, xn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, $n = ["innerHTML"], kn = /* @__PURE__ */ ye({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(e) {
    const t = e, { t: n } = Oe(), { copied: s, copy: l } = St({ resetDelay: 1500 }), h = V(() => t.lang || "text"), r = V(() => mn(t.code, t.lang)), c = V(() => t.code.split(`
`).length), a = V(() => s.value ? n("markdownCodeCopied") : n("markdownCodeCopy"));
    return (T, E) => (A(), B("div", hn, [
      N("div", pn, [
        N("span", vn, Y(h.value), 1),
        N("span", gn, Y(c.value) + " lines", 1),
        N("button", {
          type: "button",
          class: ne(["code-copy-btn", { copied: I(s) }]),
          "aria-label": a.value,
          onClick: E[0] || (E[0] = (M) => I(l)(e.code))
        }, Y(a.value), 11, yn)
      ]),
      N("div", wn, [
        e.showLineNumbers ? (A(), B("div", xn, [
          (A(!0), B(ge, null, xe(c.value, (M) => (A(), B("span", {
            key: M,
            class: "line-num"
          }, Y(M), 1))), 128))
        ])) : oe("", !0),
        N("pre", null, [
          N("code", {
            class: ne(`language-${h.value}`),
            innerHTML: r.value
          }, null, 10, $n)
        ])
      ])
    ]));
  }
}), Je = 44, et = 96, Re = 280, _n = 16, bn = 14, Cn = 8, Mn = 90, tt = 28, we = 48, Tn = 4, Ae = 28, de = 20, Sn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function En(e) {
  let t = 0;
  for (const n of e)
    t += Sn.test(n) ? bn : Cn;
  return t;
}
function Nn(e) {
  const t = En(e.label) + _n * 2;
  if (e.shape === "diamond") {
    const n = Math.min(Math.max(t * 1.5 + 32, et * 1.4), Re * 1.4);
    return { w: n, h: Math.max(64, n * 0.55) };
  }
  return t > Re ? { w: Re, h: Je + 20 } : { w: Math.min(Math.max(t, et), Re), h: Je };
}
function nt(e, t = Tn) {
  const { nodes: n, edges: s, direction: l } = e, h = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (n.length === 0) return h;
  const r = {};
  for (const o of n) r[o.id] = Nn(o);
  const c = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
  for (const o of n)
    c.set(o.id, []), a.set(o.id, 0);
  for (const o of s)
    !c.has(o.from) || !a.has(o.to) || (c.get(o.from).push(o.to), a.set(o.to, a.get(o.to) + 1));
  const T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Set(), M = n.filter((o) => (a.get(o.id) ?? 0) === 0).map((o) => o.id), g = new Map(a);
  for (; M.length > 0; ) {
    const o = M.shift(), m = T.get(o) ?? 0;
    T.set(o, m);
    for (const d of c.get(o) ?? [])
      T.set(d, Math.max(T.get(d) ?? 0, m + 1)), g.set(d, g.get(d) - 1), g.get(d) === 0 && M.push(d);
  }
  for (const o of n) {
    if (T.has(o.id)) continue;
    let m = -1;
    for (const d of s)
      d.to === o.id && T.has(d.from) && (m = Math.max(m, T.get(d.from)));
    T.set(o.id, m + 1);
  }
  s.forEach((o, m) => {
    (T.get(o.to) ?? 0) <= (T.get(o.from) ?? 0) && E.add(m);
  });
  const b = Math.max(...T.values()), p = Array.from({ length: b + 1 }, () => []), u = new Map(n.map((o, m) => [o.id, m]));
  for (const o of n)
    p[T.get(o.id)].push(o.id);
  for (const o of p)
    o.sort((m, d) => u.get(m) - u.get(d));
  const x = /* @__PURE__ */ new Map();
  function y() {
    x.clear(), p.forEach((o) => o.forEach((m, d) => x.set(m, d)));
  }
  y();
  const S = /* @__PURE__ */ new Map();
  for (const o of s)
    S.has(o.to) || S.set(o.to, []), S.get(o.to).push(o.from);
  function D(o, m, d) {
    const R = (d.get(o) ?? []).filter((U) => m.has(U));
    return R.length === 0 ? x.get(o) : R.reduce((U, J) => U + (x.get(J) ?? 0), 0) / R.length;
  }
  for (let o = 0; o < t; o++) {
    for (let m = 1; m < p.length; m++) {
      const d = new Set(p[m - 1]);
      p[m].sort((R, G) => {
        const U = D(R, d, S), J = D(G, d, S);
        return U !== J ? U - J : x.get(R) - x.get(G);
      }), y();
    }
    for (let m = p.length - 2; m >= 0; m--) {
      const d = new Set(p[m + 1]);
      p[m].sort((R, G) => {
        const U = D(R, d, c), J = D(G, d, c);
        return U !== J ? U - J : x.get(R) - x.get(G);
      }), y();
    }
  }
  const $ = l === "TB" || l === "BT", f = l === "RL" || l === "BT", i = p.map(
    (o) => o.reduce((m, d) => Math.max(m, $ ? r[d].h : r[d].w), 0)
  ), v = p.map(
    (o) => o.reduce((m, d) => m + ($ ? r[d].w : r[d].h), 0) + Math.max(o.length - 1, 0) * tt
  ), w = Math.max(...v), O = [];
  {
    let o = we;
    for (let m = 0; m < p.length; m++)
      O.push(o), o += i[m] + Mn;
  }
  const H = /* @__PURE__ */ new Map();
  p.forEach((o, m) => {
    let d = we + (w - v[m]) / 2;
    for (const R of o) {
      const G = r[R].w, U = r[R].h, J = $ ? U : G, ee = O[m] + (i[m] - J) / 2;
      H.set(R, {
        id: R,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: $ ? d : ee,
        y: $ ? ee : d,
        w: G,
        h: U
      }), d += ($ ? G : U) + tt;
    }
  });
  let W = 0, Q = 0;
  for (const o of H.values())
    W = Math.max(W, o.x + o.w), Q = Math.max(Q, o.y + o.h);
  if (W += we, Q += we, f)
    for (const o of H.values())
      l === "RL" ? o.x = W - o.x - o.w : o.y = Q - o.y - o.h;
  {
    let o = !1;
    for (const m of n) {
      const d = H.get(m.id);
      d && (typeof m.x == "number" && (d.x = m.x, o = !0), typeof m.y == "number" && (d.y = m.y, o = !0));
    }
    if (o) {
      W = 0, Q = 0;
      for (const m of H.values())
        W = Math.max(W, m.x + m.w), Q = Math.max(Q, m.y + m.h);
      W += we, Q += we;
    }
  }
  const be = Math.max(0, ...[...H.values()].map((o) => o.x + o.w)), Ce = Math.max(0, ...[...H.values()].map((o) => o.y + o.h)), P = [], L = [], q = [], F = [];
  p.forEach((o, m) => {
    let d = 1 / 0, R = -1 / 0, G = 1 / 0, U = -1 / 0;
    for (const J of o) {
      const ee = H.get(J);
      ee && (d = Math.min(d, ee.x), R = Math.max(R, ee.x + ee.w), G = Math.min(G, ee.y), U = Math.max(U, ee.y + ee.h));
    }
    P[m] = d, L[m] = R, q[m] = G, F[m] = U;
  });
  const C = /* @__PURE__ */ new Map();
  {
    let o = 0;
    s.forEach((m, d) => {
      const R = Math.abs((T.get(m.to) ?? 0) - (T.get(m.from) ?? 0));
      (E.has(d) || R >= 2) && C.set(d, o++);
    });
  }
  const k = [];
  if (s.forEach((o, m) => {
    const d = H.get(o.from), R = H.get(o.to);
    if (!d || !R) return;
    const G = E.has(m), U = C.get(m);
    let J, ee;
    if (U !== void 0) {
      const se = T.get(o.from) ?? 0, le = T.get(o.to) ?? 0;
      if ($) {
        const ie = d.x + d.w / 2, ae = f ? d.y : d.y + d.h, pe = R.x + R.w / 2, ve = f ? R.y : R.y + R.h, re = f ? q[se] - de : F[se] + de, ce = f ? q[le] - de : F[le] + de, Z = be + Ae + U * de;
        J = `M ${ie},${ae} L ${ie},${re} L ${Z},${re} L ${Z},${ce} L ${pe},${ce} L ${pe},${ve}`, ee = { x: Z, y: (re + ce) / 2 };
      } else {
        const ie = f ? d.x : d.x + d.w, ae = d.y + d.h / 2, pe = f ? R.x : R.x + R.w, ve = R.y + R.h / 2, re = f ? P[se] - de : L[se] + de, ce = f ? P[le] - de : L[le] + de, Z = Ce + Ae + U * de;
        J = `M ${ie},${ae} L ${re},${ae} L ${re},${Z} L ${ce},${Z} L ${ce},${ve} L ${pe},${ve}`, ee = { x: (re + ce) / 2, y: Z };
      }
    } else {
      let se, le, ie, ae, pe, ve, re, ce;
      if ($) {
        const Z = f ? -1 : 1;
        se = d.x + d.w / 2, le = d.y + (Z > 0 ? d.h : 0), ie = R.x + R.w / 2, ae = R.y + (Z > 0 ? 0 : R.h);
        const Me = Math.max(40, Math.abs(ae - le) / 2);
        pe = se, ve = le + Me * Z, re = ie, ce = ae - Me * Z;
      } else {
        const Z = f ? -1 : 1;
        se = d.x + (Z > 0 ? d.w : 0), le = d.y + d.h / 2, ie = R.x + (Z > 0 ? 0 : R.w), ae = R.y + R.h / 2;
        const Me = Math.max(40, Math.abs(ie - se) / 2);
        pe = se + Me * Z, ve = le, re = ie - Me * Z, ce = ae;
      }
      J = `M ${se},${le} C ${pe},${ve} ${re},${ce} ${ie},${ae}`, ee = {
        x: (se + 3 * pe + 3 * re + ie) / 8,
        y: (le + 3 * ve + 3 * ce + ae) / 8
      };
    }
    k.push({ from: o.from, to: o.to, label: o.label, path: J, labelPos: ee, isBackEdge: G });
  }), C.size > 0) {
    const o = C.size - 1;
    $ ? W = Math.max(W, be + Ae + o * de + we) : Q = Math.max(Q, Ce + Ae + o * de + we);
  }
  return { nodes: H, edges: k, width: W, height: Q };
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
    const n = e, s = t, l = X(), h = ft("nm-flow-arrow"), r = X(null), c = V(() => {
      const i = r.value;
      if (!i) return nt(n.graph);
      const v = n.graph.nodes.map(
        (w) => w.id === i.id ? { ...w, x: i.x, y: i.y } : w
      );
      return nt({ ...n.graph, nodes: v });
    }), a = V(() => {
      const i = new Map(n.graph.nodes.map((v) => [v.id, v]));
      return [...c.value.nodes.values()].map((v) => {
        var w, O, H;
        return {
          ...v,
          shape: ((w = i.get(v.id)) == null ? void 0 : w.shape) ?? "rect",
          docPath: (O = i.get(v.id)) == null ? void 0 : O.docPath,
          label: ((H = i.get(v.id)) == null ? void 0 : H.label) ?? v.id
        };
      });
    }), T = V(() => c.value.edges.filter((i) => i.label));
    fe(
      c,
      () => {
        r.value || he(() => {
          requestAnimationFrame(() => {
            var i;
            return (i = l.value) == null ? void 0 : i.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let E = !1;
    function M(i) {
      if (E) {
        E = !1;
        return;
      }
      i && s("navigate", i);
    }
    const g = X(null), b = X(null);
    function p() {
      window.addEventListener("pointermove", y), window.addEventListener("pointerup", D), window.addEventListener("pointercancel", $);
    }
    function u() {
      window.removeEventListener("pointermove", y), window.removeEventListener("pointerup", D), window.removeEventListener("pointercancel", $);
    }
    function x(i, v) {
      var H;
      if (!n.editable || i.button !== 0) return;
      const w = (H = g.value) == null ? void 0 : H.getBoundingClientRect(), O = w && c.value.width > 0 ? w.width / c.value.width : 1;
      b.value = {
        id: v.id,
        startClientX: i.clientX,
        startClientY: i.clientY,
        lastClientX: i.clientX,
        lastClientY: i.clientY,
        scale: O || 1,
        baseX: v.x,
        baseY: v.y,
        moved: !1,
        raf: 0
      }, p();
    }
    function y(i) {
      const v = b.value;
      v && (v.lastClientX = i.clientX, v.lastClientY = i.clientY, v.raf || (v.raf = requestAnimationFrame(S)));
    }
    function S() {
      const i = b.value;
      if (!i) return;
      i.raf = 0;
      const v = (i.lastClientX - i.startClientX) / i.scale, w = (i.lastClientY - i.startClientY) / i.scale;
      !i.moved && Math.hypot(v, w) < 3 || (i.moved = !0, r.value = {
        id: i.id,
        x: Math.round(i.baseX + v),
        y: Math.round(i.baseY + w)
      });
    }
    function D() {
      u();
      const i = b.value;
      b.value = null, i != null && i.raf && cancelAnimationFrame(i.raf);
      const v = r.value;
      r.value = null, !(!(i != null && i.moved) || !v) && (E = !0, setTimeout(() => {
        E = !1;
      }, 0), s("nodeMove", { id: i.id, x: v.x, y: v.y }));
    }
    function $() {
      u();
      const i = b.value;
      b.value = null, i != null && i.raf && cancelAnimationFrame(i.raf), r.value = null;
    }
    Ee(() => {
      var i;
      u(), (i = b.value) != null && i.raf && cancelAnimationFrame(b.value.raf);
    });
    function f(i, v) {
      v && (i.key === "Enter" || i.key === " ") && (i.preventDefault(), s("navigate", v));
    }
    return (i, v) => (A(), B("div", Ln, [
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
        default: z(() => [
          N("div", {
            ref_key: "flowEl",
            ref: g,
            class: ne(["nm-flow", { "nm-flow--editable": e.editable }]),
            style: We({ width: `${c.value.width}px`, height: `${c.value.height}px` })
          }, [
            (A(), B("svg", {
              class: "nm-flow__edges",
              width: c.value.width,
              height: c.value.height,
              "aria-hidden": "true"
            }, [
              N("defs", null, [
                N("marker", {
                  id: I(h),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...v[0] || (v[0] = [
                  N("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, An)
              ]),
              (A(!0), B(ge, null, xe(c.value.edges, (w, O) => (A(), B("path", {
                key: O,
                d: w.path,
                class: ne(["nm-flow__edge", { "nm-flow__edge--back": w.isBackEdge }]),
                "marker-end": `url(#${I(h)})`
              }, null, 10, Dn))), 128))
            ], 8, Rn)),
            (A(!0), B(ge, null, xe(T.value, (w, O) => (A(), B("div", {
              key: `label-${O}`,
              class: "nm-flow__edge-label",
              style: We({ left: `${w.labelPos.x}px`, top: `${w.labelPos.y}px` })
            }, Y(w.label), 5))), 128)),
            (A(!0), B(ge, null, xe(a.value, (w) => (A(), B("div", {
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
              onPointerdown: (O) => x(O, w),
              onClick: (O) => M(w.docPath),
              onKeydown: (O) => f(O, w.docPath)
            }, [
              N("div", zn, [
                N("span", Pn, Y(w.label), 1),
                w.docPath ? (A(), B("span", Bn, [
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
}), vt = /* @__PURE__ */ qe(Hn, [["__scopeId", "data-v-5be4baf8"]]);
function gt(e) {
  return e.map((t) => {
    const n = t;
    return n.text ? String(n.text) : n.tokens ? gt(n.tokens) : "";
  }).join("");
}
function On(e) {
  const t = ft("toc");
  function n(r) {
    return `${t}-${Xe(r)}`;
  }
  function s(r) {
    const c = [], a = /* @__PURE__ */ new Set(), T = ut.lexer(r);
    for (const E of T)
      if (E.type === "heading") {
        const M = gt(E.tokens);
        let g = Xe(M);
        g || (g = "heading");
        let b = `${t}-${g}`, p = 1;
        for (; a.has(b); )
          b = `${t}-${g}-${p}`, p++;
        a.add(b), c.push({
          level: E.depth,
          text: M,
          id: b
        });
      }
    return c;
  }
  const l = V(() => s(e.value)), h = V(() => {
    const r = l.value, c = [], a = [];
    for (const T of r) {
      const E = { level: T.level, text: T.text, id: T.id, children: [] };
      for (; a.length > 0 && a[a.length - 1].level >= E.level; )
        a.pop();
      a.length === 0 ? c.push(E) : a[a.length - 1].children.push(E), a.push(E);
    }
    return c;
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
function ot(e) {
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
      return ot(e);
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
      return ot(e);
    }
  }
];
let Fe = null;
function Yn() {
  return Fe || (Fe = import("katex").then((e) => {
    const t = e.default ?? e;
    return typeof (t == null ? void 0 : t.renderToString) == "function" ? t : null;
  }).catch(() => null)), Fe;
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
  const n = await Yn(), s = e instanceof Node && e.isConnected, l = t().filter((r) => !s || r.isConnected);
  if (!n) {
    for (const r of l) r.setAttribute(Te, "raw");
    return;
  }
  for (const r of l) {
    const c = r.dataset.mathDisplay === "block", a = ((h = r.querySelector(`.${yt}`)) == null ? void 0 : h.textContent) ?? r.textContent ?? "", T = r.dataset.tex ?? Un(a);
    if (!T.trim()) {
      r.setAttribute(Te, "raw");
      continue;
    }
    try {
      r.innerHTML = Qn(n, T, c), r.setAttribute(Te, "done");
    } catch {
      r.setAttribute(Te, "raw");
    }
  }
}
const wt = "mermaid-diagram", He = "data-mermaid-state";
function Jn(e) {
  return `<div class="${wt}" ${He}="loading"><pre><code>${me(e)}</code></pre></div>`;
}
let Ie = null, st = !1, eo = 0;
async function to() {
  Ie || (Ie = import("mermaid").catch(() => null));
  const e = await Ie;
  return e ? (st || (e.default.initialize({
    startOnLoad: !1,
    securityLevel: "strict",
    suppressErrorRendering: !0
  }), st = !0), e) : (Ie = null, null);
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
      const r = `nm-mermaid-${++eo}`, { svg: c } = await n.default.render(r, h);
      if (!l.isConnected) continue;
      l.innerHTML = c, ze(l, "done"), l.setAttribute("data-processed", "true");
    } catch {
      l.isConnected && ze(l, "error");
    }
  }
}
const oo = { class: "neumorphism-markdown-body" }, so = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, lo = { class: "neumorphism-markdown-error-title" }, io = { class: "neumorphism-markdown-error-msg" }, ao = ["innerHTML"], ro = ["aria-label"], co = { class: "neumorphism-toc-mobile-header" }, uo = { class: "neumorphism-toc-mobile-title" }, fo = ["aria-label"], xt = /* @__PURE__ */ ye({
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
    const n = e, s = t, l = X(null), h = X(!1), { t: r } = Oe(), { toc: c, tocTree: a, makeUniqueId: T } = On(Ke(n, "content"));
    function E(C) {
      i(C), h.value = !1;
    }
    const M = new ut.Renderer();
    M.code = ({ text: C, lang: k }) => k === "mermaid" ? Jn(C) : k === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${me(C)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${me(k || "text")}"><pre><code>${me(C)}</code></pre></div>`, M.codespan = ({ text: C }) => `<code class="inline-code">${me(C)}</code>`, M.image = ({ href: C, title: k, text: o }) => `<img src="${C}" alt="${me(o)}" title="${me(k || "")}" loading="lazy" />`, M.listitem = function({ tokens: C, task: k, checked: o }) {
      if (k) {
        const m = this.parser.parse(C.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${o ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${m}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(C)}</li>`;
    };
    const g = new Tt({ gfm: !0, breaks: !1 });
    g.use({ extensions: Xn });
    const b = X(null), p = X("");
    let u = null, x = !1, y = !1;
    function S() {
      x || (x = !0, import("dompurify").then((C) => {
        const k = C == null ? void 0 : C.default;
        k && typeof k.sanitize == "function" && (u = (o) => k.sanitize(o, {
          ADD_ATTR: ["data-code", "data-heading-id", "data-lang", "target"]
        }), D());
      }).catch(() => {
        y || (y = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function D() {
      b.value = null;
      try {
        const C = c.value.map((d) => d.id);
        let k = 0;
        const o = Object.create(M);
        o.heading = ({ tokens: d, depth: R }) => {
          const G = $(d), U = C[k++] ?? T(G);
          return `<h${R} id="${U}"><a href="#" data-heading-id="${U}" class="heading-anchor" aria-hidden="true">#</a>${G}</h${R}>`;
        };
        const m = g.parse(n.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: o
        });
        p.value = u ? u(m) : m;
      } catch (C) {
        b.value = C.message || "Unknown error rendering markdown", p.value = "";
      }
    }
    function $(C) {
      return C.map((k) => {
        const o = k;
        return o.text ? String(o.text) : o.tokens ? $(o.tokens) : "";
      }).join("");
    }
    S(), fe(() => n.content, D, { immediate: !0 });
    const { activeHeading: f, scrollToHeading: i } = Vt({
      content: l,
      scrollContainer: Ke(n, "scrollContainer"),
      watchSource: () => p.value
    }), v = X(/* @__PURE__ */ new Set());
    fe(
      () => n.content,
      () => {
        v.value = /* @__PURE__ */ new Set();
      }
    );
    function w() {
      no(l.value);
    }
    fe(p, () => {
      be(), he(O);
    }), kt(O);
    function O() {
      w(), L(), q(), Zn(l.value), Ce();
    }
    let H = [], W = null;
    const Q = _t();
    function be() {
      const C = /* @__PURE__ */ new Map();
      for (const k of H) {
        const o = C.get(k.key) ?? [];
        o.push({ rootEl: k.rootEl, ownerContainer: k.ownerContainer }), C.set(k.key, o);
      }
      H = [], W = C;
    }
    function Ce() {
      if (W) {
        for (const C of W.values())
          for (const k of C)
            Ne(null, k.ownerContainer);
        W = null;
      }
    }
    function P(C, k, o) {
      const m = W == null ? void 0 : W.get(k), d = m == null ? void 0 : m.shift();
      if (m && m.length === 0 && (W == null || W.delete(k)), C.innerHTML = "", d) {
        C.appendChild(d.rootEl), H.push({
          key: k,
          rootEl: d.rootEl,
          ownerContainer: d.ownerContainer
        });
        return;
      }
      const R = o();
      R.appContext = (Q == null ? void 0 : Q.appContext) ?? null, Ne(R, C);
      const G = C.firstElementChild;
      G && H.push({ key: k, rootEl: G, ownerContainer: C });
    }
    function L() {
      if (!l.value) return;
      l.value.querySelectorAll(".prodoc-flow-diagram").forEach((k, o) => {
        var R;
        const m = ((R = k.querySelector("pre code")) == null ? void 0 : R.textContent) ?? k.textContent ?? "", d = pt(m);
        d.nodes.length !== 0 && P(
          k,
          `flow:${m}`,
          () => Ue(vt, {
            graph: d,
            height: "420px",
            editable: n.flowEditable,
            onNavigate: (G) => s("docLink", G),
            onNodeMove: (G) => s("flowNodeMove", { ...G, source: m, blockIndex: o })
          })
        );
      });
    }
    function q() {
      var k;
      if (!l.value) return;
      const C = l.value.querySelectorAll(".doc-code-block-mount");
      for (const o of C) {
        const m = ((k = o.querySelector("pre code")) == null ? void 0 : k.textContent) ?? o.textContent ?? "", d = o.dataset.lang || "text";
        P(o, `code:${d}:${m}`, () => Ue(kn, { code: m, lang: d }));
      }
    }
    function F(C) {
      const k = C.target, o = k.closest(".heading-anchor");
      if (o) {
        const d = o.dataset.headingId;
        d && (C.preventDefault(), i(d));
        return;
      }
      const m = k.closest("a");
      if (m) {
        const d = m.getAttribute("href");
        d && !d.startsWith("//") && (d.startsWith("/") || d.startsWith(".") || d.endsWith(".md")) && (C.preventDefault(), s("docLink", d));
      }
    }
    return Ee(() => {
      for (const C of H)
        Ne(null, C.ownerContainer);
      if (H = [], W) {
        for (const C of W.values())
          for (const k of C)
            Ne(null, k.ownerContainer);
        W = null;
      }
    }), (C, k) => (A(), B("div", {
      class: ne(`neumorphism-markdown ${n.className}`)
    }, [
      N("div", oo, [
        b.value ? (A(), B("div", so, [
          N("p", lo, [
            _(K, {
              name: "warning",
              size: "md"
            }),
            k[5] || (k[5] = j(" 渲染错误 ", -1))
          ]),
          N("pre", io, Y(b.value), 1)
        ])) : (A(), B("div", {
          key: 1,
          ref_key: "contentRef",
          ref: l,
          class: "neumorphism-markdown-content",
          onClick: F,
          innerHTML: p.value
        }, null, 8, ao))
      ]),
      e.showToc && I(c).length > 0 ? (A(), ue(Ze, {
        key: 0,
        "collapsed-groups": v.value,
        "onUpdate:collapsedGroups": k[0] || (k[0] = (o) => v.value = o),
        items: I(a),
        "active-id": I(f),
        onSelect: I(i)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : oe("", !0),
      e.showToc && I(c).length > 0 ? (A(), B("button", {
        key: 1,
        class: ne(["neumorphism-toc-mobile-btn", { active: h.value }]),
        "aria-label": I(r)("markdownTocToggle"),
        onClick: k[1] || (k[1] = (o) => h.value = !h.value)
      }, [
        _(K, {
          name: "list",
          size: "2xl"
        })
      ], 10, ro)) : oe("", !0),
      _(lt, { name: "neumorphism-toc-drawer" }, {
        default: z(() => [
          e.showToc && I(c).length > 0 && h.value ? (A(), B("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: k[4] || (k[4] = bt((o) => h.value = !1, ["self"]))
          }, [
            _($e, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: z(() => [
                N("div", co, [
                  N("span", uo, [
                    _(K, {
                      name: "list",
                      size: "sm"
                    }),
                    j(" " + Y(I(r)("markdownTocLabel")), 1)
                  ]),
                  N("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": I(r)("markdownTocClose"),
                    onClick: k[2] || (k[2] = (o) => h.value = !1)
                  }, [
                    _(K, {
                      name: "close",
                      size: "sm"
                    })
                  ], 8, fo)
                ]),
                _(Ze, {
                  "collapsed-groups": v.value,
                  "onUpdate:collapsedGroups": k[3] || (k[3] = (o) => v.value = o),
                  items: I(a),
                  "active-id": I(f),
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
    return (l, h) => (A(), ue(K, {
      name: s.value,
      size: t.size
    }, null, 8, ["name", "size"]));
  }
}), mo = { class: "neumorphism-header-brand" }, ho = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, po = { class: "neumorphism-header-search" }, vo = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, go = { class: "neumorphism-search-list" }, yo = ["onClick"], wo = { class: "neumorphism-search-title" }, xo = { class: "neumorphism-search-path" }, $o = {
  key: 0,
  class: "neumorphism-sider-content"
}, ko = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, _o = { class: "neumorphism-doc-header" }, bo = { class: "neumorphism-doc-title" }, Co = { class: "neumorphism-doc-meta" }, Mo = { class: "neumorphism-doc-body" }, To = {
  key: 1,
  class: "neumorphism-empty-state"
}, So = { class: "neumorphism-doc-empty-icon" }, Eo = /* @__PURE__ */ ye({
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
      expandedKeys: r,
      treeData: c,
      displayNode: a,
      themeModel: T,
      searchQuery: E,
      searchResults: M,
      docTree: g,
      handleTreeSelect: b,
      handleDocLink: p,
      handleSearchSelect: u
    } = ht({ root: n.root, initialPath: n.initialPath });
    function x($) {
      p(s, $);
    }
    const y = X("doc"), S = V(
      () => a.value ? Qe(a.value) : null
    );
    fe(a, () => {
      y.value = "doc";
    });
    function D($) {
      const f = g.value.findByPath($) ?? g.value.findByPath(`/${$}`) ?? g.value.findByPath($.replace(/^\//, ""));
      f && (p(s, f.path), Qe(f) || (y.value = "doc"));
    }
    return ($, f) => (A(), B("div", {
      class: ne(`neumorphism-doc-viewer ${n.className}`)
    }, [
      _(it, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [
          N("span", mo, [
            _(K, {
              name: "book",
              size: "md"
            }),
            f[7] || (f[7] = j(" Doc Viewer", -1))
          ])
        ]),
        "header-right": z(() => [
          N("div", ho, [
            _(te, {
              size: "small",
              variant: y.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": y.value === "doc",
              onClick: f[0] || (f[0] = (i) => y.value = "doc")
            }, {
              default: z(() => [
                _(K, {
                  name: "file-text",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                f[8] || (f[8] = j(" 文档 ", -1))
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
              onClick: f[1] || (f[1] = (i) => y.value = "canvas")
            }, {
              default: z(() => [
                _(K, {
                  name: "map",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                f[9] || (f[9] = j(" 画布 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          N("div", po, [
            _(Mt, {
              modelValue: I(E),
              "onUpdate:modelValue": f[2] || (f[2] = (i) => _e(E) ? E.value = i : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            I(M).length > 0 ? (A(), B("div", vo, [
              N("ul", go, [
                (A(!0), B(ge, null, xe(I(M), (i) => (A(), B("li", {
                  key: i.id,
                  class: "neumorphism-search-item",
                  onClick: (v) => I(u)(i)
                }, [
                  N("span", wo, Y(i.title), 1),
                  N("span", xo, Y(i.path), 1)
                ], 8, yo))), 128))
              ])
            ])) : oe("", !0)
          ]),
          _(at, {
            modelValue: I(T),
            "onUpdate:modelValue": f[3] || (f[3] = (i) => _e(T) ? T.value = i : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: z(({ collapsed: i }) => [
          i ? (A(), B("div", ko, [
            _(K, {
              name: "book",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (A(), B("div", $o, [
            _(rt, {
              "selected-keys": I(h),
              "onUpdate:selectedKeys": f[4] || (f[4] = (v) => _e(h) ? h.value = v : null),
              "expanded-keys": I(r),
              "onUpdate:expandedKeys": f[5] || (f[5] = (v) => _e(r) ? r.value = v : null),
              data: I(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(b)
            }, {
              icon: z(({ node: v }) => [
                _($t, {
                  name: String(v.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          _(dt, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: z(() => [
              _($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: z(() => [
                  I(a) ? (A(), B(ge, { key: 0 }, [
                    N("div", _o, [
                      N("h1", bo, Y(I(a).title), 1),
                      N("div", Co, [
                        I(a).path ? (A(), ue(Se, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: z(() => [
                            j(Y(I(a).path), 1)
                          ]),
                          _: 1
                        })) : oe("", !0),
                        I(a).children.length > 0 ? (A(), ue(Se, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: z(() => [
                            _(K, {
                              name: "folder",
                              size: "sm",
                              class: "neumorphism-doc-icon-inline"
                            }),
                            f[10] || (f[10] = j(" { displayNode.children.length } 个子项 ", -1))
                          ]),
                          _: 1
                        })) : oe("", !0)
                      ])
                    ]),
                    _(ct),
                    N("div", Mo, [
                      _(lt, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: z(() => [
                          y.value === "doc" ? (A(), ue(xt, {
                            key: I(a).path,
                            content: I(a).body,
                            onDocLink: x
                          }, null, 8, ["content"])) : S.value ? (A(), ue(vt, {
                            key: `${I(a).path}:canvas`,
                            graph: S.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: D
                          }, null, 8, ["graph"])) : oe("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (A(), B("div", To, [
                    _($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: z(() => [
                        N("span", So, [
                          _(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    f[12] || (f[12] = N("p", null, "请从左侧选择一篇文档", -1)),
                    _(te, {
                      variant: "raised",
                      size: "small",
                      onClick: f[6] || (f[6] = (i) => {
                        var v;
                        return l.value = ((v = I(c)[0]) == null ? void 0 : v.key) ?? "";
                      })
                    }, {
                      default: z(() => [...f[11] || (f[11] = [
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
}), Cs = /* @__PURE__ */ qe(Eo, [["__scopeId", "data-v-9ec4eb2c"]]), No = { class: "neumorphism-editor-toolbar" }, Lo = { class: "neumorphism-editor-toolbar-left" }, Ro = { class: "neumorphism-editor-toolbar-right" }, Ao = ["aria-selected", "tabindex", "onClick", "onKeydown"], Do = { class: "nm-tabs__tab-label" }, Io = { class: "editor-stat" }, zo = /* @__PURE__ */ ye({
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
    function h(P) {
      s("docLink", P);
    }
    function r(P, L) {
      if (P.key !== "ArrowLeft" && P.key !== "ArrowRight") return;
      P.preventDefault();
      const q = c.findIndex((k) => k.key === L), F = P.key === "ArrowRight" ? 1 : -1, C = c[(q + F + c.length) % c.length];
      l.value = C.key, he(() => {
        var k, o;
        (o = (k = P.target.closest(".nm-tabs__nav")) == null ? void 0 : k.querySelectorAll(".nm-tabs__tab")[c.indexOf(C)]) == null || o.focus();
      });
    }
    const c = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], a = V(() => n.value.length), T = V(() => n.value.split(`
`).length), E = X(null), M = X(null);
    let g = !1;
    function b() {
      var P;
      return (P = E.value) == null ? void 0 : P.querySelector("textarea");
    }
    function p(P, L, q) {
      const F = b();
      if (!F) return;
      const C = F.selectionStart, k = F.selectionEnd, o = F.value.slice(C, k) || q, m = F.value.slice(0, C) + P + o + L + F.value.slice(k);
      s("change", m), he(() => {
        F.focus();
        const d = C + P.length;
        F.setSelectionRange(d, d + o.length);
      });
    }
    function u(P, L) {
      const q = b();
      if (!q) return;
      const F = q.selectionStart, C = q.value.slice(0, F), k = q.value.slice(F), d = `${C.length > 0 && !C.endsWith(`
`) ? `
` : ""}${P} ${L}
`, R = C + d + k;
      s("change", R), he(() => {
        q.focus();
        const G = F + d.length - L.length - 2;
        q.setSelectionRange(G, G + L.length);
      });
    }
    function x() {
      p("**", "**", "粗体文字");
    }
    function y() {
      p("_", "_", "斜体文字");
    }
    function S() {
      u("##", "标题");
    }
    function D() {
      p("[", "](url)", "链接文字");
    }
    function $() {
      u("![alt text]", "(url)");
    }
    function f() {
      p("`", "`", "代码");
    }
    function i() {
      u("```\n", "code\n```");
    }
    function v() {
      u("-", "列表项");
    }
    function w() {
      const P = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, L = b();
      if (!L) return;
      const q = L.selectionStart, F = L.value.slice(0, q) + P + L.value.slice(L.selectionEnd);
      s("change", F), he(() => {
        L.focus(), L.setSelectionRange(q + 3, q + 3);
      });
    }
    function O(P) {
      var C, k;
      const L = (k = (C = P.dataTransfer) == null ? void 0 : C.files) == null ? void 0 : k[0];
      if (!(L != null && L.type.startsWith("image/"))) return;
      P.preventDefault(), P.stopPropagation();
      const q = new FileReader(), F = L.name;
      q.onload = () => {
        const o = b();
        if (!o) return;
        const m = o.selectionStart, d = `![${F}](${q.result})`, R = o.value.slice(0, m) + d + o.value.slice(m);
        s("change", R), he(() => {
          o.focus(), o.setSelectionRange(m + d.length, m + d.length);
        });
      }, q.readAsDataURL(L);
    }
    function H(P) {
      var L;
      (L = P.dataTransfer) != null && L.types.includes("Files") && P.preventDefault();
    }
    let W = null;
    function Q() {
      n.autoSave && (W && clearTimeout(W), W = setTimeout(() => {
        s("change", n.value);
      }, n.autoSaveInterval));
    }
    fe(
      () => n.value,
      () => {
        Q();
      }
    ), Ee(() => {
      W && clearTimeout(W);
    });
    function be() {
      var F;
      if (g || l.value !== "split") return;
      const P = (F = E.value) == null ? void 0 : F.querySelector("textarea"), L = M.value;
      if (!P || !L) return;
      const q = P.scrollTop / (P.scrollHeight - P.clientHeight || 1);
      g = !0, L.scrollTop = q * (L.scrollHeight - L.clientHeight), requestAnimationFrame(() => {
        g = !1;
      });
    }
    function Ce() {
      var F;
      if (g || l.value !== "split") return;
      const P = (F = E.value) == null ? void 0 : F.querySelector("textarea"), L = M.value;
      if (!P || !L) return;
      const q = L.scrollTop / (L.scrollHeight - L.clientHeight || 1);
      g = !0, P.scrollTop = q * (P.scrollHeight - P.clientHeight), requestAnimationFrame(() => {
        g = !1;
      });
    }
    return (P, L) => (A(), B("div", {
      class: ne(`neumorphism-markdown-editor ${n.className}`)
    }, [
      N("div", No, [
        N("div", Lo, [
          _(te, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: x
          }, {
            default: z(() => [...L[2] || (L[2] = [
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
            default: z(() => [...L[3] || (L[3] = [
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
            default: z(() => [...L[4] || (L[4] = [
              j(" H ", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: D
          }, {
            default: z(() => [
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
            onClick: $
          }, {
            default: z(() => [
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
            onClick: f
          }, {
            default: z(() => [...L[5] || (L[5] = [
              j(" </> ", -1)
            ])]),
            _: 1
          }),
          _(te, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: i
          }, {
            default: z(() => [
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
            onClick: v
          }, {
            default: z(() => [
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
            default: z(() => [
              _(K, {
                name: "table",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          })
        ]),
        N("div", Ro, [
          _(Nt, {
            modelValue: l.value,
            "onUpdate:modelValue": L[0] || (L[0] = (q) => l.value = q),
            tabs: c,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: z(({ tab: q, active: F, activate: C }) => [
              N("button", {
                type: "button",
                class: ne(["nm-tabs__tab", { "nm-tabs__tab--active": F }]),
                role: "tab",
                "aria-selected": F,
                tabindex: F ? 0 : -1,
                onClick: (k) => C(q.key),
                onKeydown: (k) => r(k, q.key)
              }, [
                _(K, {
                  name: q.key === "edit" ? "pencil" : q.key === "split" ? "split" : "eye",
                  size: "sm",
                  class: "neumorphism-editor-icon"
                }, null, 8, ["name"]),
                N("span", Do, Y(q.label), 1)
              ], 42, Ao)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          N("span", Io, Y(T.value) + " 行 · " + Y(a.value) + " 字", 1)
        ])
      ]),
      N("div", {
        class: ne(["neumorphism-editor-panels", `neumorphism-mode-${l.value}`])
      }, [
        N("div", {
          ref_key: "editPanelRef",
          ref: E,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: l.value === "preview" }]),
          onScroll: be,
          onDrop: O,
          onDragover: H
        }, [
          _($e, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: z(() => [
              _(Lt, {
                class: "neumorphism-editor-textarea",
                "model-value": n.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": L[1] || (L[1] = (q) => s("change", q))
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
            default: z(() => [
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
}), Po = /* @__PURE__ */ qe(zo, [["__scopeId", "data-v-1d3fd848"]]), Bo = { class: "neumorphism-editor-brand" }, Ho = { class: "neumorphism-editor-actions" }, Oo = {
  key: 0,
  class: "neumorphism-editor-sider"
}, qo = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, Wo = {
  key: 0,
  class: "neumorphism-editor-layout"
}, Fo = { class: "neumorphism-editor-header" }, Go = { class: "neumorphism-editor-title" }, Vo = { class: "neumorphism-editor-meta" }, Ko = { class: "neumorphism-editor-body" }, Uo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, Xo = { class: "neumorphism-doc-empty-icon" }, Yo = 50, jo = /* @__PURE__ */ ye({
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
      expandedKeys: r,
      treeData: c,
      displayNode: a,
      themeModel: T,
      handleTreeSelect: E
    } = ht({ root: n.root, initialPath: n.initialPath }), M = X({}), g = X([]);
    function b($, f) {
      const i = g.value.filter((v) => v !== $);
      for (i.push($); i.length > Yo; ) {
        const v = i.shift();
        v !== $ && delete M.value[v];
      }
      g.value = i, M.value[$] = f;
    }
    function p($) {
      return M.value[$.path] ?? $.content;
    }
    function u($) {
      a.value && b(a.value.path, $);
    }
    function x() {
      a.value && s("save", a.value.path, p(a.value));
    }
    function y($) {
      l.value = $, s("docLink", $);
    }
    const S = V(() => {
      if (!a.value) return !1;
      const $ = M.value[a.value.path];
      return $ !== void 0 && $ !== a.value.content;
    });
    function D($) {
      ($.ctrlKey || $.metaKey) && $.key === "s" && ($.preventDefault(), x());
    }
    return ($, f) => (A(), B("div", {
      class: ne(`neumorphism-doc-editor ${n.className}`),
      onKeydown: D
    }, [
      _(it, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [
          N("span", Bo, [
            _(K, {
              name: "pencil",
              size: "md"
            }),
            f[4] || (f[4] = j(" Doc Editor", -1))
          ])
        ]),
        "header-center": z(() => [
          _(at, {
            modelValue: I(T),
            "onUpdate:modelValue": f[0] || (f[0] = (i) => _e(T) ? T.value = i : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": z(() => [
          N("div", Ho, [
            S.value ? (A(), ue(Se, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: z(() => [...f[5] || (f[5] = [
                j(" 未保存 ", -1)
              ])]),
              _: 1
            })) : oe("", !0),
            _(te, {
              variant: "raised",
              size: "small",
              disabled: !S.value,
              onClick: x
            }, {
              default: z(() => [
                _(K, {
                  name: "save",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                f[6] || (f[6] = j(" 保存 ", -1))
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: z(({ collapsed: i }) => [
          i ? (A(), B("div", qo, [
            _(K, {
              name: "pencil",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (A(), B("div", Oo, [
            _(rt, {
              "selected-keys": I(h),
              "onUpdate:selectedKeys": f[1] || (f[1] = (v) => _e(h) ? h.value = v : null),
              "expanded-keys": I(r),
              "onUpdate:expandedKeys": f[2] || (f[2] = (v) => _e(r) ? r.value = v : null),
              data: I(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(E)
            }, {
              icon: z(({ node: v }) => [
                _($t, {
                  name: String(v.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          _(dt, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: z(() => [
              _($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: z(() => [
                  I(a) ? (A(), B("div", Wo, [
                    N("header", Fo, [
                      N("div", null, [
                        N("h1", Go, Y(I(a).title), 1),
                        N("div", Vo, [
                          I(a).path ? (A(), ue(Se, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: z(() => [
                              j(Y(I(a).path), 1)
                            ]),
                            _: 1
                          })) : oe("", !0),
                          S.value ? (A(), ue(Se, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: z(() => [...f[7] || (f[7] = [
                              j(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : oe("", !0)
                        ])
                      ]),
                      _(te, {
                        variant: "raised",
                        size: "small",
                        disabled: !S.value,
                        onClick: x
                      }, {
                        default: z(() => [
                          _(K, {
                            name: "save",
                            size: "xl",
                            class: "neumorphism-doc-icon"
                          }),
                          f[8] || (f[8] = j(" 保存 ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    _(ct),
                    N("div", Ko, [
                      _(Po, {
                        value: p(I(a)),
                        onChange: u,
                        onDocLink: y
                      }, null, 8, ["value"])
                    ])
                  ])) : (A(), B("div", Uo, [
                    _($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: z(() => [
                        N("span", Xo, [
                          _(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    f[10] || (f[10] = N("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    _(te, {
                      variant: "raised",
                      size: "small",
                      onClick: f[3] || (f[3] = (i) => {
                        var v;
                        return l.value = ((v = I(c)[0]) == null ? void 0 : v.key) ?? "";
                      })
                    }, {
                      default: z(() => [...f[9] || (f[9] = [
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
}), Ms = /* @__PURE__ */ qe(jo, [["__scopeId", "data-v-db1006bf"]]), Qo = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function Zo(e) {
  const t = e.match(Qo);
  if (!t)
    return { meta: {}, body: e };
  const n = t[1], s = e.slice(t[0].length), l = {};
  for (const h of n.split(`
`)) {
    const r = h.indexOf(":");
    if (r === -1) continue;
    const c = h.slice(0, r).trim();
    let a = h.slice(r + 1).trim();
    /^-?\d+$/.test(a) ? a = parseInt(a, 10) : /^-?\d+\.\d+$/.test(a) ? a = parseFloat(a) : a === "true" ? a = !0 : a === "false" ? a = !1 : (a.startsWith('"') && a.endsWith('"') || a.startsWith("'") && a.endsWith("'")) && (a = a.slice(1, -1)), l[c] = a;
  }
  return { meta: l, body: s };
}
function Jo(e) {
  return e.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function es(e, t) {
  if (t.title && typeof t.title == "string")
    return t.title;
  const n = e.match(/^#\s+(.+)$/m);
  return n ? n[1].trim() : "Untitled";
}
function ts(e, t) {
  const { meta: n, body: s } = Zo(t), l = es(s, n), h = typeof n.order == "number" ? n.order : 9999;
  return {
    id: Jo(e),
    title: l,
    path: e,
    content: t,
    body: s,
    meta: n,
    children: [],
    order: h
  };
}
function Ts(e) {
  const t = /* @__PURE__ */ new Map();
  for (const [r, c] of Object.entries(e)) {
    if (!r.endsWith(".md")) continue;
    const a = ts(r, c);
    t.set(r, a);
  }
  const n = [], s = Array.from(t.keys()).sort();
  for (const r of s) {
    const c = r.split("/");
    if (c.length === 1) {
      n.push(r);
      continue;
    }
    let a = null;
    const E = `${c.slice(0, -1).join("/")}/index.md`;
    if (t.has(E) && E !== r)
      a = E;
    else {
      const M = c.slice(0, -1).join("/") + ".md";
      t.has(M) && (a = M);
    }
    if (a && t.has(a)) {
      const M = t.get(a), g = t.get(r);
      M.children.push(g);
    } else
      n.push(r);
  }
  for (const r of t.values())
    r.children.sort((c, a) => c.order - a.order || c.title.localeCompare(a.title));
  const l = n.map((r) => t.get(r)).sort((r, c) => r.order - c.order || r.title.localeCompare(c.title));
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
const Ss = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  kn as DocCodeBlock,
  Ms as DocEditor,
  vt as DocFlowCanvas,
  Ze as DocTocNav,
  $t as DocTreeIcon,
  Cs as DocViewer,
  Pe as MATH_MOUNT_CLASS,
  yt as MATH_SOURCE_CLASS,
  Te as MATH_STATE_ATTR,
  Po as MarkdownEditor,
  xt as MarkdownRenderer,
  Ge as TocNodeItem,
  Ts as buildDocTree,
  Ht as buildHierarchyGraph,
  Ss as componentCategories,
  At as createDocTree,
  ts as createNode,
  zt as extractFlowBlocks,
  es as extractTitle,
  ks as flattenDocTree,
  _s as getAncestors,
  Rt as getNodeIcon,
  Ve as getScrollBehavior,
  mn as highlightCode,
  nt as layoutProDocFlow,
  Wn as matchBlockBracket,
  qn as matchBlockDollar,
  Kn as matchInlineBracket,
  Fn as matchInlineDollar,
  Vn as matchInlineDoubleDollar,
  Gn as matchInlineParen,
  Xn as mathExtensions,
  mt as nodeToTreeData,
  Zo as parseFrontmatter,
  pt as parseProDocFlow,
  Jo as pathToId,
  Zn as renderMath,
  Qe as resolveCanvasGraph,
  Un as stripMathDelimiters,
  ht as useDocLayout,
  On as useMarkdownToc,
  Vt as useScrollSpy,
  bs as writeFlowNodePosition
};
