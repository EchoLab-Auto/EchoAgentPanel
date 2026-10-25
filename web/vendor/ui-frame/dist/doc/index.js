import { ref as X, computed as V, watch as me, onBeforeUnmount as Ee, defineComponent as ye, openBlock as D, createElementBlock as B, normalizeClass as ne, createElementVNode as N, unref as I, createVNode as b, createCommentVNode as oe, toDisplayString as Y, Fragment as ge, renderList as xe, createBlock as fe, nextTick as he, withCtx as z, createTextVNode as j, normalizeStyle as He, toRef as Fe, onMounted as gt, getCurrentInstance as yt, render as Ne, Transition as tt, withModifiers as wt, h as Ge, isRef as _e } from "vue";
import { useTheme as xt } from "../composables/useTheme.js";
import { N as nt } from "../chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as te } from "../chunks/NeumorphismButton-C7gkn79g.js";
import { N as $e } from "../chunks/NeumorphismCard-BMQk8hBJ.js";
import { N as ot } from "../chunks/NeumorphismThemeToggle-DBfRRh5v.js";
import { N as st } from "../chunks/NeumorphismTree-fQBHMCMo.js";
import { N as lt } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as Se } from "../chunks/NeumorphismTag-C9hlXpsv.js";
import { N as at } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as $t } from "../chunks/NeumorphismInput-CWarV170.js";
import { marked as it, Marked as kt } from "marked";
import { escapeHtml as ue, generateId as rt, slugify as Ve } from "../utils/index.js";
import { useLocale as Pe } from "../composables/useLocale.js";
import { N as K } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as _t } from "../composables/useClipboard.js";
import { N as bt } from "../chunks/NeumorphismCanvas-a4F1ouPw.js";
import { _ as Be } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as Ct } from "../chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as Mt } from "../chunks/NeumorphismTextarea-BPesp-1r.js";
import '../index2.css';function Tt(e) {
  var n;
  const t = ((n = e.path) == null ? void 0 : n.toLowerCase()) || "";
  return t.includes("api") ? "api" : t.includes("guide") ? "guide" : t.includes("config") ? "config" : t.includes("example") ? "example" : t.includes("install") ? "install" : t.includes("changelog") ? "changelog" : t.includes("faq") ? "faq" : "file";
}
function ct(e) {
  const t = e.children.length > 0 ? "folder" : Tt(e);
  return {
    key: e.path,
    label: e.title,
    icon: t,
    children: e.children.map(ct)
  };
}
function St(e) {
  const t = /* @__PURE__ */ new Map();
  function n(h) {
    t.set(h.path, h);
    for (const r of h.children)
      n(r);
  }
  n(e);
  const s = /* @__PURE__ */ new Map();
  function d(h) {
    s.set(h.id, h);
    for (const r of h.children)
      d(r);
  }
  return d(e), {
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
function ms(e) {
  const t = [];
  function n(s) {
    t.push(s);
    for (const d of s.children)
      n(d);
  }
  return n(e), t;
}
function hs(e, t) {
  const n = [];
  function s(d, h, r) {
    if (d.id === h)
      return n.push(...r), !0;
    for (const c of d.children)
      if (s(c, h, [...r, d]))
        return !0;
    return !1;
  }
  return s(t, e.id, []), n;
}
function dt(e) {
  var v;
  const { root: t, initialPath: n } = e, s = typeof window < "u", d = e.syncUrlHash !== !1 && s, h = s ? window.location.hash.slice(1) : "", r = n || h || ((v = t.children[0]) == null ? void 0 : v.path) || "", c = X(r), a = X([]), { theme: T, setTheme: E } = xt(), M = V({
    get: () => T.value,
    set: (x) => E(x)
  }), g = V(() => t.children.map(ct)), C = X(c.value ? [c.value] : []);
  me(c, (x) => {
    C.value = x ? [x] : [];
  });
  const p = V(() => St(t)), f = V(() => {
    if (c.value)
      return p.value.findByPath(c.value);
  }), $ = V(() => f.value || t.children[0]);
  function w(x) {
    c.value = x;
  }
  function S(x, O) {
    c.value = O, x("docLink", O);
  }
  const A = X(""), k = V(() => {
    if (!A.value.trim()) return [];
    const x = A.value.toLowerCase();
    return l(t).filter((H) => H.id === "root" ? !1 : H.title.toLowerCase().includes(x) || H.body.toLowerCase().includes(x)).slice(0, 10);
  });
  function m(x) {
    c.value = x.path, A.value = "";
  }
  function l(x) {
    const O = [x];
    for (const H of x.children)
      O.push(...l(H));
    return O;
  }
  if (me(
    () => n,
    (x) => {
      x && (c.value = x);
    }
  ), d) {
    me(c, (O) => {
      O && history.replaceState(null, "", `#${O}`);
    });
    const x = () => {
      const O = window.location.hash.slice(1);
      O && O !== c.value && (c.value = O);
    };
    window.addEventListener("hashchange", x), Ee(() => {
      window.removeEventListener("hashchange", x);
    });
  }
  return {
    selectedPath: c,
    selectedKeys: C,
    expandedKeys: a,
    treeData: g,
    selectedNode: f,
    displayNode: $,
    docTree: p,
    themeModel: M,
    searchQuery: A,
    searchResults: k,
    handleTreeSelect: w,
    handleDocLink: S,
    handleSearchSelect: m
  };
}
const Et = /^graph\s+(LR|RL|TB|BT)\s*$/i, ke = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Le = /-->\s*(?:\|([^|]*)\|)?/y, Ke = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, Nt = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, ze = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function Lt(e) {
  const t = [];
  ze.lastIndex = 0;
  let n;
  for (; (n = ze.exec(e)) !== null; )
    t.push(n[1]);
  return t;
}
function ps(e, t, n, s, d, h) {
  ze.lastIndex = 0;
  const r = t.replace(/\r\n/g, `
`).trim();
  let c, a = -1;
  for (; (c = ze.exec(e)) !== null; ) {
    if (a++, h !== void 0 && a !== h) continue;
    const T = c[1];
    if (T.replace(/\r\n/g, `
`).trim() !== r) continue;
    const E = new RegExp(
      `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), M = T.split(`
`);
    let g = !1;
    for (let f = 0; f < M.length; f++) {
      const $ = M[f].indexOf("%%"), w = $ >= 0 ? M[f].slice(0, $) : M[f], S = $ >= 0 ? M[f].slice($) : "", A = w.trim();
      if (A.includes("-->") || !E.test(A)) continue;
      const k = A.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      M[f] = `${k} @ ${s}, ${d}${S ? `  ${S}` : ""}`, g = !0;
      break;
    }
    if (!g) {
      const f = `${n} @ ${s}, ${d}`;
      M.length > 0 && M[M.length - 1].trim() === "" ? M.splice(M.length - 1, 0, f) : M.push(f);
    }
    const C = M.join(`
`), p = c.index + c[0].indexOf(T);
    return e.slice(0, p) + C + e.slice(p + T.length);
  }
  return e;
}
function Rt(e) {
  return e ? e.startsWith("[/") && e.endsWith("/]") ? { shape: "rounded", text: e.slice(2, -2) } : e.startsWith("{") ? { shape: "diamond", text: e.slice(1, -1) } : e.startsWith("(") ? { shape: "stadium", text: e.slice(1, -1) } : { shape: "rect", text: e.slice(1, -1) } : { shape: "rect", text: "" };
}
function Dt(e) {
  const t = e.trim(), n = t.split("|");
  if (n.length > 1) {
    const s = n[n.length - 1].trim();
    if (Nt.test(s))
      return {
        label: n.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: s.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: t };
}
function ut(e) {
  const t = [], n = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), d = [];
  let h = "LR", r = !1;
  function c(g, C) {
    const { shape: p, text: f } = Rt(C), { label: $, docPath: w } = C ? Dt(f) : { label: g, docPath: void 0 }, S = n.get(g);
    S ? C && (S.label = $, S.shape = p, w !== void 0 && (S.docPath = w)) : n.set(g, { id: g, label: $, shape: p, docPath: w });
  }
  function a(g, C, p) {
    const f = n.get(g);
    f && (f.x = C, f.y = p);
  }
  function T(g, C, p) {
    const f = `${g}→${C}${p ?? ""}`;
    s.has(f) || (s.add(f), d.push({ from: g, to: C, label: p }));
  }
  const E = e.split(`
`);
  for (let g = 0; g < E.length; g++) {
    const C = g + 1, p = E[g].indexOf("%%"), f = (p >= 0 ? E[g].slice(0, p) : E[g]).trim();
    if (f) {
      if (!r) {
        const $ = Et.exec(f);
        $ ? h = $[1].toUpperCase() : (t.push({
          line: C,
          source: E[g].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), M(f, C, E[g].trim())), r = !0;
        continue;
      }
      M(f, C, E[g].trim());
    }
  }
  function M(g, C, p) {
    var S;
    let f = 0;
    ke.lastIndex = 0, Le.lastIndex = 0, ke.lastIndex = f;
    let $ = ke.exec(g);
    if (!$ || $.index !== 0)
      return t.push({ line: C, source: p, message: "无法识别的语句" }), !1;
    let w = $[1];
    for (c($[1], $[2]), f = ke.lastIndex; ; ) {
      for (; f < g.length && /\s/.test(g[f]); ) f++;
      if (f >= g.length) break;
      if (g[f] === "@") {
        Ke.lastIndex = f;
        const l = Ke.exec(g);
        return l && l.index === f ? (a(w, parseFloat(l[1]), parseFloat(l[2])), !0) : (t.push({
          line: C,
          source: p,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Le.lastIndex = f;
      const A = Le.exec(g);
      if (!A || A.index !== f)
        return t.push({
          line: C,
          source: p,
          message: `无法识别的内容: "${g.slice(f)}"`
        }), !1;
      const k = ((S = A[1]) == null ? void 0 : S.trim()) || void 0;
      for (f = Le.lastIndex; f < g.length && /\s/.test(g[f]); ) f++;
      if (ke.lastIndex = f, $ = ke.exec(g), !$ || $.index !== f)
        return t.push({ line: C, source: p, message: "箭头后缺少目标节点" }), !1;
      const m = $[1];
      c($[1], $[2]), T(w, m, k), w = m, f = ke.lastIndex;
    }
    return !0;
  }
  return {
    direction: h,
    nodes: [...n.values()],
    edges: d,
    errors: t
  };
}
const Ue = "__hier_root";
function At(e) {
  const t = [
    {
      id: Ue,
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
    }), n.push({ from: Ue, to: s.id });
  return {
    // 子项较多时纵向排布更可读
    direction: e.children.length <= 5 ? "LR" : "TB",
    nodes: t,
    edges: n,
    errors: []
  };
}
function Xe(e) {
  for (const t of Lt(e.body)) {
    const n = ut(t);
    if (n.nodes.length > 0) return n;
  }
  return e.children.length > 0 ? At(e) : null;
}
const It = { class: "toc-item-row" }, zt = ["aria-expanded", "aria-controls", "aria-label"], Pt = ["data-toc-id", "aria-current"], Bt = { class: "toc-text" }, Ht = ["id"], We = /* @__PURE__ */ ye({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(e, { emit: t }) {
    const n = e, s = t, { t: d } = Pe(), h = V(() => n.activeHeading === n.node.id), r = V(() => n.node.children.length > 0), c = V(() => n.collapsedGroups.has(n.node.id));
    function a(E) {
      E.stopPropagation(), s("toggle", n.node.id);
    }
    function T(E) {
      E.preventDefault(), s("select", n.node.id);
    }
    return (E, M) => (D(), B("li", {
      class: ne(["neumorphism-toc-item", { "has-children": r.value, active: h.value }]),
      role: "listitem"
    }, [
      N("div", It, [
        r.value ? (D(), B("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !c.value,
          "aria-controls": `toc-list-${e.node.id}`,
          "aria-label": c.value ? I(d)("markdownTocExpand") : I(d)("markdownTocCollapse"),
          onClick: a
        }, [
          b(K, {
            name: c.value ? "chevron-right" : "chevron-down",
            size: "xs"
          }, null, 8, ["name"])
        ], 8, zt)) : oe("", !0),
        N("a", {
          href: "#",
          "data-toc-id": e.node.id,
          role: "button",
          "aria-current": h.value ? "location" : void 0,
          onClick: T
        }, [
          N("span", Bt, Y(e.node.text), 1)
        ], 8, Pt)
      ]),
      r.value && !c.value ? (D(), B("ul", {
        key: 0,
        id: `toc-list-${e.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (D(!0), B(ge, null, xe(e.node.children, (g) => (D(), fe(We, {
          key: g.id,
          node: g,
          "active-heading": e.activeHeading,
          "collapsed-groups": e.collapsedGroups,
          onToggle: M[0] || (M[0] = (C) => E.$emit("toggle", C)),
          onSelect: M[1] || (M[1] = (C) => E.$emit("select", C))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Ht)) : oe("", !0)
    ], 2));
  }
});
function qe() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Ot(e) {
  const { content: t } = e, n = e.headingSelector ?? "h1, h2, h3", s = X("");
  let d = !1, h = null;
  function r(w) {
    var k;
    const S = t.value;
    if (!S) return null;
    const A = (k = e.scrollContainer) == null ? void 0 : k.value;
    return A instanceof HTMLElement ? A : typeof A == "string" ? S.closest(A) : S.closest(".nm-layout__content");
  }
  function c(w) {
    const S = w ?? r();
    if (!S) return 64;
    const A = S.closest(".nm-layout"), k = A == null ? void 0 : A.querySelector(".nm-layout__header");
    return k ? k.getBoundingClientRect().height : 64;
  }
  function a(w) {
    var S;
    w !== s.value && (s.value = w, (S = e.onActiveChange) == null || S.call(e, w));
  }
  function T() {
    var m;
    const w = r();
    if (!w) return;
    const S = (m = t.value) == null ? void 0 : m.querySelectorAll(n);
    if (!S) return;
    const A = c(w) + 20;
    let k = "";
    for (const l of S) {
      const v = l.getBoundingClientRect(), x = w.getBoundingClientRect();
      if (v.top - x.top <= A)
        k = l.id;
      else
        break;
    }
    a(k);
  }
  function E() {
    d = !1, h && (clearTimeout(h), h = null), T();
  }
  function M(w) {
    var A, k;
    h && clearTimeout(h), d = !0, s.value = w, (A = e.onActiveChange) == null || A.call(e, w);
    const S = (k = t.value) == null ? void 0 : k.querySelector(`[id="${w}"]`);
    S && S.scrollIntoView({ behavior: qe() }), h = setTimeout(E, 800);
  }
  let g = null, C = null, p = -1;
  function f() {
    g == null || g.disconnect(), g = null, C == null || C.disconnect(), C = null;
  }
  function $() {
    f();
    const w = r();
    if (!w || !t.value) return;
    const S = c(w);
    p = S;
    const A = Array.from(t.value.querySelectorAll(n));
    if (A.length === 0) return;
    const k = /* @__PURE__ */ new Map();
    g = new IntersectionObserver(
      (v) => {
        if (d) return;
        for (const H of v)
          H.isIntersecting ? k.set(H.target, H.boundingClientRect.top) : k.delete(H.target);
        let x = "", O = -1 / 0;
        for (const [H, q] of k)
          q > O && (O = q, x = H.id);
        x && a(x);
      },
      {
        root: w,
        rootMargin: `-${S + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const v of A)
      g.observe(v);
    const m = w.closest(".nm-layout"), l = m == null ? void 0 : m.querySelector(".nm-layout__header");
    l && typeof ResizeObserver < "u" && (C = new ResizeObserver(() => {
      const v = l.getBoundingClientRect().height;
      v !== p && (p = v, he(() => $()));
    }), C.observe(l));
  }
  return me(e.watchSource ? [t, e.watchSource] : [t], ([w]) => {
    w ? he(() => {
      $(), T();
    }) : f();
  }), Ee(() => {
    f(), h && clearTimeout(h);
  }), { activeHeading: s, scrollToHeading: M, syncActiveHeading: T };
}
const Wt = ["aria-label"], qt = { class: "neumorphism-toc-header" }, Ft = { class: "neumorphism-toc-title" }, Gt = {
  class: "neumorphism-toc-list",
  role: "list"
}, Vt = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Ye = /* @__PURE__ */ ye({
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
    const s = e, d = n, { t: h } = Pe(), r = V(() => s.title || h("markdownTocLabel")), c = X(null), a = X(/* @__PURE__ */ new Set()), T = V(() => s.collapsedGroups ?? a.value);
    function E(p) {
      s.collapsedGroups !== void 0 ? d("update:collapsedGroups", p) : a.value = p;
    }
    me(
      () => s.items,
      () => {
        s.collapsedGroups === void 0 && (a.value = /* @__PURE__ */ new Set());
      }
    );
    function M(p) {
      const f = new Set(T.value), $ = f.has(p);
      $ ? f.delete(p) : f.add(p), E(f), $ && he(() => g(p));
    }
    function g(p) {
      if (!c.value || window.innerWidth <= 1200) return;
      const f = c.value, $ = f.querySelector(`[data-toc-id="${CSS.escape(p)}"]`);
      if (!$) return;
      const w = f.getBoundingClientRect(), S = $.closest(".neumorphism-toc-item"), A = Array.from((S == null ? void 0 : S.children) ?? []).find(
        (m) => m.classList.contains("neumorphism-toc-list")
      );
      if (A && A.getBoundingClientRect().bottom <= w.bottom + 10)
        return;
      const k = $.getBoundingClientRect().top - w.top + f.scrollTop;
      f.scrollTo({
        top: Math.max(0, k),
        behavior: qe()
      });
    }
    function C() {
      if (!c.value || window.innerWidth <= 1200) return;
      const p = c.value, f = p.querySelector(".neumorphism-toc-item.active");
      if (!f) return;
      const $ = p.getBoundingClientRect(), w = f.getBoundingClientRect(), S = $.top + $.height * 0.25, A = $.top + $.height * 0.75;
      if (w.top >= S && w.bottom <= A)
        return;
      const m = w.top - $.top + p.scrollTop - w.height / 2 - $.height / 2;
      p.scrollTo({
        top: Math.max(0, m),
        behavior: qe()
      });
    }
    return me(
      () => s.activeId,
      (p) => {
        if (!p) return;
        function f($) {
          for (const w of $) {
            if (w.id === p) return !0;
            if (f(w.children)) {
              if (T.value.has(w.id)) {
                const S = new Set(T.value);
                S.delete(w.id), E(S);
              }
              return !0;
            }
          }
          return !1;
        }
        f(s.items), he(() => C());
      }
    ), t({ scrollTocToActive: C }), (p, f) => e.framed ? (D(), B("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: c,
      class: "neumorphism-toc",
      "aria-label": r.value
    }, [
      b($e, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: z(() => [
          N("div", qt, [
            N("span", Ft, [
              b(K, {
                name: "list",
                size: "sm"
              }),
              j(" " + Y(r.value), 1)
            ])
          ]),
          N("ul", Gt, [
            (D(!0), B(ge, null, xe(e.items, ($) => (D(), fe(We, {
              key: $.id,
              node: $,
              "active-heading": e.activeId,
              "collapsed-groups": T.value,
              onToggle: M,
              onSelect: f[0] || (f[0] = (w) => d("select", w))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, Wt)) : (D(), B("ul", Vt, [
      (D(!0), B(ge, null, xe(e.items, ($) => (D(), fe(We, {
        key: $.id,
        node: $,
        "active-heading": e.activeId,
        "collapsed-groups": T.value,
        onToggle: M,
        onSelect: f[1] || (f[1] = (w) => d("select", w))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), Kt = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, Ut = /(#\s+.*$)/gm, Xt = /(--\s.*$)/gm, Yt = /$.^/gm, jt = /* @__PURE__ */ new Set([
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
]), Qt = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function Zt(e) {
  const t = (e ?? "").toLowerCase();
  return jt.has(t) ? Ut : Qt.has(t) ? Xt : t === "html" || t === "xml" || t === "vue" ? Yt : Kt;
}
const Jt = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, en = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, tn = /\b([a-zA-Z_]\w*)(?=\()/g, nn = /\b(\d+\.?\d*)\b/g, on = /\b([A-Z][a-zA-Z0-9_]*)\b/g, sn = /\u0001([a-z]+)\u0001/g;
function ln(e) {
  let t = e, n = "";
  do
    n = String.fromCharCode(97 + t % 26) + n, t = Math.floor(t / 26) - 1;
  while (t >= 0);
  return "" + n + "";
}
function an(e) {
  let t = 0;
  for (const n of e) t = t * 26 + (n.charCodeAt(0) - 96);
  return t - 1;
}
function rn(e, t) {
  if (!t || t === "text" || t === "plain")
    return ue(e);
  let n = ue(e);
  const s = [], d = (h) => (r) => (s.push(`<span class="${h}">${r}</span>`), ln(s.length - 1));
  return n = n.replace(Jt, d("token-string")), n = n.replace(Zt(t), d("token-comment")), n = n.replace(en, '<span class="token-keyword">$1</span>'), n = n.replace(tn, '<span class="token-function">$1</span>'), n = n.replace(nn, '<span class="token-number">$1</span>'), n = n.replace(on, '<span class="token-type">$1</span>'), n = n.replace(sn, (h, r) => s[an(r)]), n;
}
const cn = { class: "code-block-wrapper doc-code-block" }, dn = { class: "code-block-header" }, un = { class: "code-lang" }, fn = { class: "code-lines" }, mn = ["aria-label"], hn = { class: "code-block-body" }, pn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, vn = ["innerHTML"], gn = /* @__PURE__ */ ye({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(e) {
    const t = e, { t: n } = Pe(), { copied: s, copy: d } = _t({ resetDelay: 1500 }), h = V(() => t.lang || "text"), r = V(() => rn(t.code, t.lang)), c = V(() => t.code.split(`
`).length), a = V(() => s.value ? n("markdownCodeCopied") : n("markdownCodeCopy"));
    return (T, E) => (D(), B("div", cn, [
      N("div", dn, [
        N("span", un, Y(h.value), 1),
        N("span", fn, Y(c.value) + " lines", 1),
        N("button", {
          type: "button",
          class: ne(["code-copy-btn", { copied: I(s) }]),
          "aria-label": a.value,
          onClick: E[0] || (E[0] = (M) => I(d)(e.code))
        }, Y(a.value), 11, mn)
      ]),
      N("div", hn, [
        e.showLineNumbers ? (D(), B("div", pn, [
          (D(!0), B(ge, null, xe(c.value, (M) => (D(), B("span", {
            key: M,
            class: "line-num"
          }, Y(M), 1))), 128))
        ])) : oe("", !0),
        N("pre", null, [
          N("code", {
            class: ne(`language-${h.value}`),
            innerHTML: r.value
          }, null, 10, vn)
        ])
      ])
    ]));
  }
}), je = 44, Qe = 96, Re = 280, yn = 16, wn = 14, xn = 8, $n = 90, Ze = 28, we = 48, kn = 4, De = 28, de = 20, _n = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function bn(e) {
  let t = 0;
  for (const n of e)
    t += _n.test(n) ? wn : xn;
  return t;
}
function Cn(e) {
  const t = bn(e.label) + yn * 2;
  if (e.shape === "diamond") {
    const n = Math.min(Math.max(t * 1.5 + 32, Qe * 1.4), Re * 1.4);
    return { w: n, h: Math.max(64, n * 0.55) };
  }
  return t > Re ? { w: Re, h: je + 20 } : { w: Math.min(Math.max(t, Qe), Re), h: je };
}
function Je(e, t = kn) {
  const { nodes: n, edges: s, direction: d } = e, h = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (n.length === 0) return h;
  const r = {};
  for (const o of n) r[o.id] = Cn(o);
  const c = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
  for (const o of n)
    c.set(o.id, []), a.set(o.id, 0);
  for (const o of s)
    !c.has(o.from) || !a.has(o.to) || (c.get(o.from).push(o.to), a.set(o.to, a.get(o.to) + 1));
  const T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Set(), M = n.filter((o) => (a.get(o.id) ?? 0) === 0).map((o) => o.id), g = new Map(a);
  for (; M.length > 0; ) {
    const o = M.shift(), u = T.get(o) ?? 0;
    T.set(o, u);
    for (const i of c.get(o) ?? [])
      T.set(i, Math.max(T.get(i) ?? 0, u + 1)), g.set(i, g.get(i) - 1), g.get(i) === 0 && M.push(i);
  }
  for (const o of n) {
    if (T.has(o.id)) continue;
    let u = -1;
    for (const i of s)
      i.to === o.id && T.has(i.from) && (u = Math.max(u, T.get(i.from)));
    T.set(o.id, u + 1);
  }
  s.forEach((o, u) => {
    (T.get(o.to) ?? 0) <= (T.get(o.from) ?? 0) && E.add(u);
  });
  const C = Math.max(...T.values()), p = Array.from({ length: C + 1 }, () => []), f = new Map(n.map((o, u) => [o.id, u]));
  for (const o of n)
    p[T.get(o.id)].push(o.id);
  for (const o of p)
    o.sort((u, i) => f.get(u) - f.get(i));
  const $ = /* @__PURE__ */ new Map();
  function w() {
    $.clear(), p.forEach((o) => o.forEach((u, i) => $.set(u, i)));
  }
  w();
  const S = /* @__PURE__ */ new Map();
  for (const o of s)
    S.has(o.to) || S.set(o.to, []), S.get(o.to).push(o.from);
  function A(o, u, i) {
    const L = (i.get(o) ?? []).filter((U) => u.has(U));
    return L.length === 0 ? $.get(o) : L.reduce((U, J) => U + ($.get(J) ?? 0), 0) / L.length;
  }
  for (let o = 0; o < t; o++) {
    for (let u = 1; u < p.length; u++) {
      const i = new Set(p[u - 1]);
      p[u].sort((L, G) => {
        const U = A(L, i, S), J = A(G, i, S);
        return U !== J ? U - J : $.get(L) - $.get(G);
      }), w();
    }
    for (let u = p.length - 2; u >= 0; u--) {
      const i = new Set(p[u + 1]);
      p[u].sort((L, G) => {
        const U = A(L, i, c), J = A(G, i, c);
        return U !== J ? U - J : $.get(L) - $.get(G);
      }), w();
    }
  }
  const k = d === "TB" || d === "BT", m = d === "RL" || d === "BT", l = p.map(
    (o) => o.reduce((u, i) => Math.max(u, k ? r[i].h : r[i].w), 0)
  ), v = p.map(
    (o) => o.reduce((u, i) => u + (k ? r[i].w : r[i].h), 0) + Math.max(o.length - 1, 0) * Ze
  ), x = Math.max(...v), O = [];
  {
    let o = we;
    for (let u = 0; u < p.length; u++)
      O.push(o), o += l[u] + $n;
  }
  const H = /* @__PURE__ */ new Map();
  p.forEach((o, u) => {
    let i = we + (x - v[u]) / 2;
    for (const L of o) {
      const G = r[L].w, U = r[L].h, J = k ? U : G, ee = O[u] + (l[u] - J) / 2;
      H.set(L, {
        id: L,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: k ? i : ee,
        y: k ? ee : i,
        w: G,
        h: U
      }), i += (k ? G : U) + Ze;
    }
  });
  let q = 0, Q = 0;
  for (const o of H.values())
    q = Math.max(q, o.x + o.w), Q = Math.max(Q, o.y + o.h);
  if (q += we, Q += we, m)
    for (const o of H.values())
      d === "RL" ? o.x = q - o.x - o.w : o.y = Q - o.y - o.h;
  {
    let o = !1;
    for (const u of n) {
      const i = H.get(u.id);
      i && (typeof u.x == "number" && (i.x = u.x, o = !0), typeof u.y == "number" && (i.y = u.y, o = !0));
    }
    if (o) {
      q = 0, Q = 0;
      for (const u of H.values())
        q = Math.max(q, u.x + u.w), Q = Math.max(Q, u.y + u.h);
      q += we, Q += we;
    }
  }
  const be = Math.max(0, ...[...H.values()].map((o) => o.x + o.w)), Ce = Math.max(0, ...[...H.values()].map((o) => o.y + o.h)), P = [], R = [], W = [], F = [];
  p.forEach((o, u) => {
    let i = 1 / 0, L = -1 / 0, G = 1 / 0, U = -1 / 0;
    for (const J of o) {
      const ee = H.get(J);
      ee && (i = Math.min(i, ee.x), L = Math.max(L, ee.x + ee.w), G = Math.min(G, ee.y), U = Math.max(U, ee.y + ee.h));
    }
    P[u] = i, R[u] = L, W[u] = G, F[u] = U;
  });
  const _ = /* @__PURE__ */ new Map();
  {
    let o = 0;
    s.forEach((u, i) => {
      const L = Math.abs((T.get(u.to) ?? 0) - (T.get(u.from) ?? 0));
      (E.has(i) || L >= 2) && _.set(i, o++);
    });
  }
  const y = [];
  if (s.forEach((o, u) => {
    const i = H.get(o.from), L = H.get(o.to);
    if (!i || !L) return;
    const G = E.has(u), U = _.get(u);
    let J, ee;
    if (U !== void 0) {
      const se = T.get(o.from) ?? 0, le = T.get(o.to) ?? 0;
      if (k) {
        const ae = i.x + i.w / 2, ie = m ? i.y : i.y + i.h, pe = L.x + L.w / 2, ve = m ? L.y : L.y + L.h, re = m ? W[se] - de : F[se] + de, ce = m ? W[le] - de : F[le] + de, Z = be + De + U * de;
        J = `M ${ae},${ie} L ${ae},${re} L ${Z},${re} L ${Z},${ce} L ${pe},${ce} L ${pe},${ve}`, ee = { x: Z, y: (re + ce) / 2 };
      } else {
        const ae = m ? i.x : i.x + i.w, ie = i.y + i.h / 2, pe = m ? L.x : L.x + L.w, ve = L.y + L.h / 2, re = m ? P[se] - de : R[se] + de, ce = m ? P[le] - de : R[le] + de, Z = Ce + De + U * de;
        J = `M ${ae},${ie} L ${re},${ie} L ${re},${Z} L ${ce},${Z} L ${ce},${ve} L ${pe},${ve}`, ee = { x: (re + ce) / 2, y: Z };
      }
    } else {
      let se, le, ae, ie, pe, ve, re, ce;
      if (k) {
        const Z = m ? -1 : 1;
        se = i.x + i.w / 2, le = i.y + (Z > 0 ? i.h : 0), ae = L.x + L.w / 2, ie = L.y + (Z > 0 ? 0 : L.h);
        const Me = Math.max(40, Math.abs(ie - le) / 2);
        pe = se, ve = le + Me * Z, re = ae, ce = ie - Me * Z;
      } else {
        const Z = m ? -1 : 1;
        se = i.x + (Z > 0 ? i.w : 0), le = i.y + i.h / 2, ae = L.x + (Z > 0 ? 0 : L.w), ie = L.y + L.h / 2;
        const Me = Math.max(40, Math.abs(ae - se) / 2);
        pe = se + Me * Z, ve = le, re = ae - Me * Z, ce = ie;
      }
      J = `M ${se},${le} C ${pe},${ve} ${re},${ce} ${ae},${ie}`, ee = {
        x: (se + 3 * pe + 3 * re + ae) / 8,
        y: (le + 3 * ve + 3 * ce + ie) / 8
      };
    }
    y.push({ from: o.from, to: o.to, label: o.label, path: J, labelPos: ee, isBackEdge: G });
  }), _.size > 0) {
    const o = _.size - 1;
    k ? q = Math.max(q, be + De + o * de + we) : Q = Math.max(Q, Ce + De + o * de + we);
  }
  return { nodes: H, edges: y, width: q, height: Q };
}
const Mn = { class: "nm-flow-canvas" }, Tn = ["width", "height"], Sn = ["id"], En = ["d", "marker-end"], Nn = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], Ln = { class: "nm-flow__node-inner" }, Rn = { class: "nm-flow__node-text" }, Dn = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, An = /* @__PURE__ */ ye({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(e, { emit: t }) {
    const n = e, s = t, d = X(), h = rt("nm-flow-arrow"), r = X(null), c = V(() => {
      const l = r.value;
      if (!l) return Je(n.graph);
      const v = n.graph.nodes.map(
        (x) => x.id === l.id ? { ...x, x: l.x, y: l.y } : x
      );
      return Je({ ...n.graph, nodes: v });
    }), a = V(() => {
      const l = new Map(n.graph.nodes.map((v) => [v.id, v]));
      return [...c.value.nodes.values()].map((v) => {
        var x, O, H;
        return {
          ...v,
          shape: ((x = l.get(v.id)) == null ? void 0 : x.shape) ?? "rect",
          docPath: (O = l.get(v.id)) == null ? void 0 : O.docPath,
          label: ((H = l.get(v.id)) == null ? void 0 : H.label) ?? v.id
        };
      });
    }), T = V(() => c.value.edges.filter((l) => l.label));
    me(
      c,
      () => {
        r.value || he(() => {
          requestAnimationFrame(() => {
            var l;
            return (l = d.value) == null ? void 0 : l.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let E = !1;
    function M(l) {
      if (E) {
        E = !1;
        return;
      }
      l && s("navigate", l);
    }
    const g = X(null), C = X(null);
    function p() {
      window.addEventListener("pointermove", w), window.addEventListener("pointerup", A), window.addEventListener("pointercancel", k);
    }
    function f() {
      window.removeEventListener("pointermove", w), window.removeEventListener("pointerup", A), window.removeEventListener("pointercancel", k);
    }
    function $(l, v) {
      var H;
      if (!n.editable || l.button !== 0) return;
      const x = (H = g.value) == null ? void 0 : H.getBoundingClientRect(), O = x && c.value.width > 0 ? x.width / c.value.width : 1;
      C.value = {
        id: v.id,
        startClientX: l.clientX,
        startClientY: l.clientY,
        lastClientX: l.clientX,
        lastClientY: l.clientY,
        scale: O || 1,
        baseX: v.x,
        baseY: v.y,
        moved: !1,
        raf: 0
      }, p();
    }
    function w(l) {
      const v = C.value;
      v && (v.lastClientX = l.clientX, v.lastClientY = l.clientY, v.raf || (v.raf = requestAnimationFrame(S)));
    }
    function S() {
      const l = C.value;
      if (!l) return;
      l.raf = 0;
      const v = (l.lastClientX - l.startClientX) / l.scale, x = (l.lastClientY - l.startClientY) / l.scale;
      !l.moved && Math.hypot(v, x) < 3 || (l.moved = !0, r.value = {
        id: l.id,
        x: Math.round(l.baseX + v),
        y: Math.round(l.baseY + x)
      });
    }
    function A() {
      f();
      const l = C.value;
      C.value = null, l != null && l.raf && cancelAnimationFrame(l.raf);
      const v = r.value;
      r.value = null, !(!(l != null && l.moved) || !v) && (E = !0, setTimeout(() => {
        E = !1;
      }, 0), s("nodeMove", { id: l.id, x: v.x, y: v.y }));
    }
    function k() {
      f();
      const l = C.value;
      C.value = null, l != null && l.raf && cancelAnimationFrame(l.raf), r.value = null;
    }
    Ee(() => {
      var l;
      f(), (l = C.value) != null && l.raf && cancelAnimationFrame(C.value.raf);
    });
    function m(l, v) {
      v && (l.key === "Enter" || l.key === " ") && (l.preventDefault(), s("navigate", v));
    }
    return (l, v) => (D(), B("div", Mn, [
      b(bt, {
        ref_key: "canvasRef",
        ref: d,
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
            style: He({ width: `${c.value.width}px`, height: `${c.value.height}px` })
          }, [
            (D(), B("svg", {
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
                ])], 8, Sn)
              ]),
              (D(!0), B(ge, null, xe(c.value.edges, (x, O) => (D(), B("path", {
                key: O,
                d: x.path,
                class: ne(["nm-flow__edge", { "nm-flow__edge--back": x.isBackEdge }]),
                "marker-end": `url(#${I(h)})`
              }, null, 10, En))), 128))
            ], 8, Tn)),
            (D(!0), B(ge, null, xe(T.value, (x, O) => (D(), B("div", {
              key: `label-${O}`,
              class: "nm-flow__edge-label",
              style: He({ left: `${x.labelPos.x}px`, top: `${x.labelPos.y}px` })
            }, Y(x.label), 5))), 128)),
            (D(!0), B(ge, null, xe(a.value, (x) => (D(), B("div", {
              key: x.id,
              class: ne(["nm-flow__node", [`nm-flow__node--${x.shape}`, { "nm-flow__node--link": x.docPath }]]),
              style: He({
                left: `${x.x}px`,
                top: `${x.y}px`,
                width: `${x.w}px`,
                height: `${x.h}px`
              }),
              role: x.docPath ? "link" : void 0,
              tabindex: x.docPath ? 0 : void 0,
              "aria-label": x.docPath ? `${x.label}（跳转到文档）` : x.label,
              "data-nm-no-pan": "",
              onPointerdown: (O) => $(O, x),
              onClick: (O) => M(x.docPath),
              onKeydown: (O) => m(O, x.docPath)
            }, [
              N("div", Ln, [
                N("span", Rn, Y(x.label), 1),
                x.docPath ? (D(), B("span", Dn, [
                  b(K, {
                    name: "external",
                    size: "xs"
                  })
                ])) : oe("", !0)
              ])
            ], 46, Nn))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), ft = /* @__PURE__ */ Be(An, [["__scopeId", "data-v-5be4baf8"]]);
function mt(e) {
  return e.map((t) => {
    const n = t;
    return n.text ? String(n.text) : n.tokens ? mt(n.tokens) : "";
  }).join("");
}
function In(e) {
  const t = rt("toc");
  function n(r) {
    return `${t}-${Ve(r)}`;
  }
  function s(r) {
    const c = [], a = /* @__PURE__ */ new Set(), T = it.lexer(r);
    for (const E of T)
      if (E.type === "heading") {
        const M = mt(E.tokens);
        let g = Ve(M);
        g || (g = "heading");
        let C = `${t}-${g}`, p = 1;
        for (; a.has(C); )
          C = `${t}-${g}-${p}`, p++;
        a.add(C), c.push({
          level: E.depth,
          text: M,
          id: C
        });
      }
    return c;
  }
  const d = V(() => s(e.value)), h = V(() => {
    const r = d.value, c = [], a = [];
    for (const T of r) {
      const E = { level: T.level, text: T.text, id: T.id, children: [] };
      for (; a.length > 0 && a[a.length - 1].level >= E.level; )
        a.pop();
      a.length === 0 ? c.push(E) : a[a.length - 1].children.push(E), a.push(E);
    }
    return c;
  });
  return { toc: d, tocTree: h, makeUniqueId: n };
}
const Ie = "md-math-mount", ht = "md-math-src", Te = "data-math-state";
function zn(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), d = /^[ \t]*(?:\r?\n|$)/.exec(s);
  if (!d) return null;
  const h = e.slice(0, t + 2 + d[0].length);
  return { tex: n, raw: h };
}
function Pn(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), d = /^[ \t]*(?:\r?\n|$)/.exec(s);
  return d ? { tex: n, raw: e.slice(0, t + 2 + d[0].length) } : null;
}
function Bn(e) {
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
    const d = e.slice(1, n);
    return !d.trim() || /[`，。、；：！？…]/.test(d) ? null : { tex: d, raw: e.slice(0, n + 1) };
  }
  return null;
}
function Hn(e) {
  if (!e.startsWith("\\(")) return null;
  const t = e.indexOf("\\)", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function On(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function Wn(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function qn(e) {
  const t = e.trim(), n = [
    ["$$", "$$"],
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$", "$"]
  ];
  for (const [s, d] of n)
    if (t.startsWith(s) && t.endsWith(d) && t.length >= s.length + d.length)
      return t.slice(s.length, t.length - d.length);
  return t;
}
function et(e) {
  const t = e.display ? "div" : "span", n = e.display ? `${Ie} ${Ie}--block` : Ie, s = e.display ? "block" : "inline";
  return `<${t} class="${n}" data-math-display="${s}" data-tex="${ue(e.tex)}"><span class="${ht}">${ue(e.text)}</span></${t}>`;
}
const Fn = [
  {
    name: "blockMath",
    level: "block",
    tokenizer(e) {
      const t = zn(e) ?? Pn(e);
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
      return et(e);
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
      const t = On(e) ?? Bn(e) ?? Hn(e) ?? Wn(e);
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
      return et(e);
    }
  }
];
let Oe = null;
function Gn() {
  return Oe || (Oe = import("katex").then((e) => {
    const t = e.default ?? e;
    return typeof (t == null ? void 0 : t.renderToString) == "function" ? t : null;
  }).catch(() => null)), Oe;
}
const Ae = /* @__PURE__ */ new Map(), Vn = 400;
function Kn(e, t, n) {
  const s = `${n ? "b" : "i"}\0${t}`, d = Ae.get(s);
  if (d !== void 0) return d;
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
  return Ae.size >= Vn && Ae.clear(), Ae.set(s, h), h;
}
async function Un(e) {
  var h;
  if (!e) return;
  const t = () => Array.from(e.querySelectorAll(`.${Ie}:not([${Te}])`));
  if (t().length === 0) return;
  const n = await Gn(), s = e instanceof Node && e.isConnected, d = t().filter((r) => !s || r.isConnected);
  if (!n) {
    for (const r of d) r.setAttribute(Te, "raw");
    return;
  }
  for (const r of d) {
    const c = r.dataset.mathDisplay === "block", a = ((h = r.querySelector(`.${ht}`)) == null ? void 0 : h.textContent) ?? r.textContent ?? "", T = r.dataset.tex ?? qn(a);
    if (!T.trim()) {
      r.setAttribute(Te, "raw");
      continue;
    }
    try {
      r.innerHTML = Kn(n, T, c), r.setAttribute(Te, "done");
    } catch {
      r.setAttribute(Te, "raw");
    }
  }
}
const Xn = { class: "neumorphism-markdown-body" }, Yn = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, jn = { class: "neumorphism-markdown-error-title" }, Qn = { class: "neumorphism-markdown-error-msg" }, Zn = ["innerHTML"], Jn = ["aria-label"], eo = { class: "neumorphism-toc-mobile-header" }, to = { class: "neumorphism-toc-mobile-title" }, no = ["aria-label"], pt = /* @__PURE__ */ ye({
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
    const n = e, s = t, d = X(null), h = X(!1), { t: r } = Pe(), { toc: c, tocTree: a, makeUniqueId: T } = In(Fe(n, "content"));
    function E(_) {
      l(_), h.value = !1;
    }
    const M = new it.Renderer();
    M.code = ({ text: _, lang: y }) => y === "mermaid" ? `<div class="mermaid-diagram" data-mermaid="${ue(_)}"><pre><code>${ue(_)}</code></pre></div>` : y === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${ue(_)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${ue(y || "text")}"><pre><code>${ue(_)}</code></pre></div>`, M.codespan = ({ text: _ }) => `<code class="inline-code">${ue(_)}</code>`, M.image = ({ href: _, title: y, text: o }) => `<img src="${_}" alt="${ue(o)}" title="${ue(y || "")}" loading="lazy" />`, M.listitem = function({ tokens: _, task: y, checked: o }) {
      if (y) {
        const u = this.parser.parse(_.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${o ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${u}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(_)}</li>`;
    };
    const g = new kt({ gfm: !0, breaks: !1 });
    g.use({ extensions: Fn });
    const C = X(null), p = X("");
    let f = null, $ = !1, w = !1;
    function S() {
      $ || ($ = !0, import("dompurify").then((_) => {
        const y = _ == null ? void 0 : _.default;
        y && typeof y.sanitize == "function" && (f = (o) => y.sanitize(o, {
          // Preserve the data-* hooks emitted by this renderer.
          ADD_ATTR: ["data-mermaid", "data-code", "data-heading-id", "data-lang", "target"]
        }), A());
      }).catch(() => {
        w || (w = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function A() {
      C.value = null;
      try {
        const _ = c.value.map((i) => i.id);
        let y = 0;
        const o = Object.create(M);
        o.heading = ({ tokens: i, depth: L }) => {
          const G = k(i), U = _[y++] ?? T(G);
          return `<h${L} id="${U}"><a href="#" data-heading-id="${U}" class="heading-anchor" aria-hidden="true">#</a>${G}</h${L}>`;
        };
        const u = g.parse(n.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: o
        });
        p.value = f ? f(u) : u;
      } catch (_) {
        C.value = _.message || "Unknown error rendering markdown", p.value = "";
      }
    }
    function k(_) {
      return _.map((y) => {
        const o = y;
        return o.text ? String(o.text) : o.tokens ? k(o.tokens) : "";
      }).join("");
    }
    S(), me(() => n.content, A, { immediate: !0 });
    const { activeHeading: m, scrollToHeading: l } = Ot({
      content: d,
      scrollContainer: Fe(n, "scrollContainer"),
      watchSource: () => p.value
    }), v = X(/* @__PURE__ */ new Set());
    me(
      () => n.content,
      () => {
        v.value = /* @__PURE__ */ new Set();
      }
    );
    async function x() {
      if (!d.value) return;
      const _ = d.value.querySelectorAll(".mermaid-diagram");
      if (_.length !== 0)
        try {
          const y = await import("mermaid").catch(() => null);
          if (!(y != null && y.default)) return;
          let o = 0;
          for (const u of Array.from(_)) {
            const i = u.getAttribute("data-mermaid") ?? u.textContent ?? "";
            if (i.trim())
              try {
                const { svg: L } = await y.default.render(`nm-mermaid-${Date.now()}-${o++}`, i);
                u.innerHTML = L, u.setAttribute("data-processed", "true");
              } catch {
              }
          }
        } catch {
        }
    }
    me(p, () => {
      be(), he(O);
    }), gt(O);
    function O() {
      x(), R(), W(), Un(d.value), Ce();
    }
    let H = [], q = null;
    const Q = yt();
    function be() {
      const _ = /* @__PURE__ */ new Map();
      for (const y of H) {
        const o = _.get(y.key) ?? [];
        o.push({ rootEl: y.rootEl, ownerContainer: y.ownerContainer }), _.set(y.key, o);
      }
      H = [], q = _;
    }
    function Ce() {
      if (q) {
        for (const _ of q.values())
          for (const y of _)
            Ne(null, y.ownerContainer);
        q = null;
      }
    }
    function P(_, y, o) {
      const u = q == null ? void 0 : q.get(y), i = u == null ? void 0 : u.shift();
      if (u && u.length === 0 && (q == null || q.delete(y)), _.innerHTML = "", i) {
        _.appendChild(i.rootEl), H.push({
          key: y,
          rootEl: i.rootEl,
          ownerContainer: i.ownerContainer
        });
        return;
      }
      const L = o();
      L.appContext = (Q == null ? void 0 : Q.appContext) ?? null, Ne(L, _);
      const G = _.firstElementChild;
      G && H.push({ key: y, rootEl: G, ownerContainer: _ });
    }
    function R() {
      if (!d.value) return;
      d.value.querySelectorAll(".prodoc-flow-diagram").forEach((y, o) => {
        var L;
        const u = ((L = y.querySelector("pre code")) == null ? void 0 : L.textContent) ?? y.textContent ?? "", i = ut(u);
        i.nodes.length !== 0 && P(
          y,
          `flow:${u}`,
          () => Ge(ft, {
            graph: i,
            height: "420px",
            editable: n.flowEditable,
            onNavigate: (G) => s("docLink", G),
            onNodeMove: (G) => s("flowNodeMove", { ...G, source: u, blockIndex: o })
          })
        );
      });
    }
    function W() {
      var y;
      if (!d.value) return;
      const _ = d.value.querySelectorAll(".doc-code-block-mount");
      for (const o of _) {
        const u = ((y = o.querySelector("pre code")) == null ? void 0 : y.textContent) ?? o.textContent ?? "", i = o.dataset.lang || "text";
        P(o, `code:${i}:${u}`, () => Ge(gn, { code: u, lang: i }));
      }
    }
    function F(_) {
      const y = _.target, o = y.closest(".heading-anchor");
      if (o) {
        const i = o.dataset.headingId;
        i && (_.preventDefault(), l(i));
        return;
      }
      const u = y.closest("a");
      if (u) {
        const i = u.getAttribute("href");
        i && !i.startsWith("//") && (i.startsWith("/") || i.startsWith(".") || i.endsWith(".md")) && (_.preventDefault(), s("docLink", i));
      }
    }
    return Ee(() => {
      for (const _ of H)
        Ne(null, _.ownerContainer);
      if (H = [], q) {
        for (const _ of q.values())
          for (const y of _)
            Ne(null, y.ownerContainer);
        q = null;
      }
    }), (_, y) => (D(), B("div", {
      class: ne(`neumorphism-markdown ${n.className}`)
    }, [
      N("div", Xn, [
        C.value ? (D(), B("div", Yn, [
          N("p", jn, [
            b(K, {
              name: "warning",
              size: "md"
            }),
            y[5] || (y[5] = j(" 渲染错误 ", -1))
          ]),
          N("pre", Qn, Y(C.value), 1)
        ])) : (D(), B("div", {
          key: 1,
          ref_key: "contentRef",
          ref: d,
          class: "neumorphism-markdown-content",
          onClick: F,
          innerHTML: p.value
        }, null, 8, Zn))
      ]),
      e.showToc && I(c).length > 0 ? (D(), fe(Ye, {
        key: 0,
        "collapsed-groups": v.value,
        "onUpdate:collapsedGroups": y[0] || (y[0] = (o) => v.value = o),
        items: I(a),
        "active-id": I(m),
        onSelect: I(l)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : oe("", !0),
      e.showToc && I(c).length > 0 ? (D(), B("button", {
        key: 1,
        class: ne(["neumorphism-toc-mobile-btn", { active: h.value }]),
        "aria-label": I(r)("markdownTocToggle"),
        onClick: y[1] || (y[1] = (o) => h.value = !h.value)
      }, [
        b(K, {
          name: "list",
          size: "2xl"
        })
      ], 10, Jn)) : oe("", !0),
      b(tt, { name: "neumorphism-toc-drawer" }, {
        default: z(() => [
          e.showToc && I(c).length > 0 && h.value ? (D(), B("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: y[4] || (y[4] = wt((o) => h.value = !1, ["self"]))
          }, [
            b($e, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: z(() => [
                N("div", eo, [
                  N("span", to, [
                    b(K, {
                      name: "list",
                      size: "sm"
                    }),
                    j(" " + Y(I(r)("markdownTocLabel")), 1)
                  ]),
                  N("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": I(r)("markdownTocClose"),
                    onClick: y[2] || (y[2] = (o) => h.value = !1)
                  }, [
                    b(K, {
                      name: "close",
                      size: "sm"
                    })
                  ], 8, no)
                ]),
                b(Ye, {
                  "collapsed-groups": v.value,
                  "onUpdate:collapsedGroups": y[3] || (y[3] = (o) => v.value = o),
                  items: I(a),
                  "active-id": I(m),
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
}), vt = /* @__PURE__ */ ye({
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
    return (d, h) => (D(), fe(K, {
      name: s.value,
      size: t.size
    }, null, 8, ["name", "size"]));
  }
}), oo = { class: "neumorphism-header-brand" }, so = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, lo = { class: "neumorphism-header-search" }, ao = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, io = { class: "neumorphism-search-list" }, ro = ["onClick"], co = { class: "neumorphism-search-title" }, uo = { class: "neumorphism-search-path" }, fo = {
  key: 0,
  class: "neumorphism-sider-content"
}, mo = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, ho = { class: "neumorphism-doc-header" }, po = { class: "neumorphism-doc-title" }, vo = { class: "neumorphism-doc-meta" }, go = { class: "neumorphism-doc-body" }, yo = {
  key: 1,
  class: "neumorphism-empty-state"
}, wo = { class: "neumorphism-doc-empty-icon" }, xo = /* @__PURE__ */ ye({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: d,
      selectedKeys: h,
      expandedKeys: r,
      treeData: c,
      displayNode: a,
      themeModel: T,
      searchQuery: E,
      searchResults: M,
      docTree: g,
      handleTreeSelect: C,
      handleDocLink: p,
      handleSearchSelect: f
    } = dt({ root: n.root, initialPath: n.initialPath });
    function $(k) {
      p(s, k);
    }
    const w = X("doc"), S = V(
      () => a.value ? Xe(a.value) : null
    );
    me(a, () => {
      w.value = "doc";
    });
    function A(k) {
      const m = g.value.findByPath(k) ?? g.value.findByPath(`/${k}`) ?? g.value.findByPath(k.replace(/^\//, ""));
      m && (p(s, m.path), Xe(m) || (w.value = "doc"));
    }
    return (k, m) => (D(), B("div", {
      class: ne(`neumorphism-doc-viewer ${n.className}`)
    }, [
      b(nt, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [
          N("span", oo, [
            b(K, {
              name: "book",
              size: "md"
            }),
            m[7] || (m[7] = j(" Doc Viewer", -1))
          ])
        ]),
        "header-right": z(() => [
          N("div", so, [
            b(te, {
              size: "small",
              variant: w.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": w.value === "doc",
              onClick: m[0] || (m[0] = (l) => w.value = "doc")
            }, {
              default: z(() => [
                b(K, {
                  name: "file-text",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[8] || (m[8] = j(" 文档 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            b(te, {
              size: "small",
              variant: w.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": w.value === "canvas",
              disabled: !S.value,
              title: S.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: m[1] || (m[1] = (l) => w.value = "canvas")
            }, {
              default: z(() => [
                b(K, {
                  name: "map",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[9] || (m[9] = j(" 画布 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          N("div", lo, [
            b($t, {
              modelValue: I(E),
              "onUpdate:modelValue": m[2] || (m[2] = (l) => _e(E) ? E.value = l : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            I(M).length > 0 ? (D(), B("div", ao, [
              N("ul", io, [
                (D(!0), B(ge, null, xe(I(M), (l) => (D(), B("li", {
                  key: l.id,
                  class: "neumorphism-search-item",
                  onClick: (v) => I(f)(l)
                }, [
                  N("span", co, Y(l.title), 1),
                  N("span", uo, Y(l.path), 1)
                ], 8, ro))), 128))
              ])
            ])) : oe("", !0)
          ]),
          b(ot, {
            modelValue: I(T),
            "onUpdate:modelValue": m[3] || (m[3] = (l) => _e(T) ? T.value = l : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: z(({ collapsed: l }) => [
          l ? (D(), B("div", mo, [
            b(K, {
              name: "book",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (D(), B("div", fo, [
            b(st, {
              "selected-keys": I(h),
              "onUpdate:selectedKeys": m[4] || (m[4] = (v) => _e(h) ? h.value = v : null),
              "expanded-keys": I(r),
              "onUpdate:expandedKeys": m[5] || (m[5] = (v) => _e(r) ? r.value = v : null),
              data: I(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(C)
            }, {
              icon: z(({ node: v }) => [
                b(vt, {
                  name: String(v.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          b(at, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: z(() => [
              b($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: z(() => [
                  I(a) ? (D(), B(ge, { key: 0 }, [
                    N("div", ho, [
                      N("h1", po, Y(I(a).title), 1),
                      N("div", vo, [
                        I(a).path ? (D(), fe(Se, {
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
                        I(a).children.length > 0 ? (D(), fe(Se, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: z(() => [
                            b(K, {
                              name: "folder",
                              size: "sm",
                              class: "neumorphism-doc-icon-inline"
                            }),
                            m[10] || (m[10] = j(" { displayNode.children.length } 个子项 ", -1))
                          ]),
                          _: 1
                        })) : oe("", !0)
                      ])
                    ]),
                    b(lt),
                    N("div", go, [
                      b(tt, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: z(() => [
                          w.value === "doc" ? (D(), fe(pt, {
                            key: I(a).path,
                            content: I(a).body,
                            onDocLink: $
                          }, null, 8, ["content"])) : S.value ? (D(), fe(ft, {
                            key: `${I(a).path}:canvas`,
                            graph: S.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: A
                          }, null, 8, ["graph"])) : oe("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (D(), B("div", yo, [
                    b($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: z(() => [
                        N("span", wo, [
                          b(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    m[12] || (m[12] = N("p", null, "请从左侧选择一篇文档", -1)),
                    b(te, {
                      variant: "raised",
                      size: "small",
                      onClick: m[6] || (m[6] = (l) => {
                        var v;
                        return d.value = ((v = I(c)[0]) == null ? void 0 : v.key) ?? "";
                      })
                    }, {
                      default: z(() => [...m[11] || (m[11] = [
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
}), vs = /* @__PURE__ */ Be(xo, [["__scopeId", "data-v-9ec4eb2c"]]), $o = { class: "neumorphism-editor-toolbar" }, ko = { class: "neumorphism-editor-toolbar-left" }, _o = { class: "neumorphism-editor-toolbar-right" }, bo = ["aria-selected", "tabindex", "onClick", "onKeydown"], Co = { class: "nm-tabs__tab-label" }, Mo = { class: "editor-stat" }, To = /* @__PURE__ */ ye({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, d = X("split");
    function h(P) {
      s("docLink", P);
    }
    function r(P, R) {
      if (P.key !== "ArrowLeft" && P.key !== "ArrowRight") return;
      P.preventDefault();
      const W = c.findIndex((y) => y.key === R), F = P.key === "ArrowRight" ? 1 : -1, _ = c[(W + F + c.length) % c.length];
      d.value = _.key, he(() => {
        var y, o;
        (o = (y = P.target.closest(".nm-tabs__nav")) == null ? void 0 : y.querySelectorAll(".nm-tabs__tab")[c.indexOf(_)]) == null || o.focus();
      });
    }
    const c = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], a = V(() => n.value.length), T = V(() => n.value.split(`
`).length), E = X(null), M = X(null);
    let g = !1;
    function C() {
      var P;
      return (P = E.value) == null ? void 0 : P.querySelector("textarea");
    }
    function p(P, R, W) {
      const F = C();
      if (!F) return;
      const _ = F.selectionStart, y = F.selectionEnd, o = F.value.slice(_, y) || W, u = F.value.slice(0, _) + P + o + R + F.value.slice(y);
      s("change", u), he(() => {
        F.focus();
        const i = _ + P.length;
        F.setSelectionRange(i, i + o.length);
      });
    }
    function f(P, R) {
      const W = C();
      if (!W) return;
      const F = W.selectionStart, _ = W.value.slice(0, F), y = W.value.slice(F), i = `${_.length > 0 && !_.endsWith(`
`) ? `
` : ""}${P} ${R}
`, L = _ + i + y;
      s("change", L), he(() => {
        W.focus();
        const G = F + i.length - R.length - 2;
        W.setSelectionRange(G, G + R.length);
      });
    }
    function $() {
      p("**", "**", "粗体文字");
    }
    function w() {
      p("_", "_", "斜体文字");
    }
    function S() {
      f("##", "标题");
    }
    function A() {
      p("[", "](url)", "链接文字");
    }
    function k() {
      f("![alt text]", "(url)");
    }
    function m() {
      p("`", "`", "代码");
    }
    function l() {
      f("```\n", "code\n```");
    }
    function v() {
      f("-", "列表项");
    }
    function x() {
      const P = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, R = C();
      if (!R) return;
      const W = R.selectionStart, F = R.value.slice(0, W) + P + R.value.slice(R.selectionEnd);
      s("change", F), he(() => {
        R.focus(), R.setSelectionRange(W + 3, W + 3);
      });
    }
    function O(P) {
      var _, y;
      const R = (y = (_ = P.dataTransfer) == null ? void 0 : _.files) == null ? void 0 : y[0];
      if (!(R != null && R.type.startsWith("image/"))) return;
      P.preventDefault(), P.stopPropagation();
      const W = new FileReader(), F = R.name;
      W.onload = () => {
        const o = C();
        if (!o) return;
        const u = o.selectionStart, i = `![${F}](${W.result})`, L = o.value.slice(0, u) + i + o.value.slice(u);
        s("change", L), he(() => {
          o.focus(), o.setSelectionRange(u + i.length, u + i.length);
        });
      }, W.readAsDataURL(R);
    }
    function H(P) {
      var R;
      (R = P.dataTransfer) != null && R.types.includes("Files") && P.preventDefault();
    }
    let q = null;
    function Q() {
      n.autoSave && (q && clearTimeout(q), q = setTimeout(() => {
        s("change", n.value);
      }, n.autoSaveInterval));
    }
    me(
      () => n.value,
      () => {
        Q();
      }
    ), Ee(() => {
      q && clearTimeout(q);
    });
    function be() {
      var F;
      if (g || d.value !== "split") return;
      const P = (F = E.value) == null ? void 0 : F.querySelector("textarea"), R = M.value;
      if (!P || !R) return;
      const W = P.scrollTop / (P.scrollHeight - P.clientHeight || 1);
      g = !0, R.scrollTop = W * (R.scrollHeight - R.clientHeight), requestAnimationFrame(() => {
        g = !1;
      });
    }
    function Ce() {
      var F;
      if (g || d.value !== "split") return;
      const P = (F = E.value) == null ? void 0 : F.querySelector("textarea"), R = M.value;
      if (!P || !R) return;
      const W = R.scrollTop / (R.scrollHeight - R.clientHeight || 1);
      g = !0, P.scrollTop = W * (P.scrollHeight - P.clientHeight), requestAnimationFrame(() => {
        g = !1;
      });
    }
    return (P, R) => (D(), B("div", {
      class: ne(`neumorphism-markdown-editor ${n.className}`)
    }, [
      N("div", $o, [
        N("div", ko, [
          b(te, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: $
          }, {
            default: z(() => [...R[2] || (R[2] = [
              N("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            "aria-label": "斜体",
            onClick: w
          }, {
            default: z(() => [...R[3] || (R[3] = [
              N("em", null, "I", -1)
            ])]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "标题",
            "aria-label": "标题",
            onClick: S
          }, {
            default: z(() => [...R[4] || (R[4] = [
              j(" H ", -1)
            ])]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: A
          }, {
            default: z(() => [
              b(K, {
                name: "link",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "图片",
            "aria-label": "图片",
            onClick: k
          }, {
            default: z(() => [
              b(K, {
                name: "image",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "行内代码",
            "aria-label": "行内代码",
            onClick: m
          }, {
            default: z(() => [...R[5] || (R[5] = [
              j(" </> ", -1)
            ])]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: l
          }, {
            default: z(() => [
              b(K, {
                name: "clipboard",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "无序列表",
            "aria-label": "无序列表",
            onClick: v
          }, {
            default: z(() => [
              b(K, {
                name: "list",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          b(te, {
            size: "small",
            title: "表格",
            "aria-label": "表格",
            onClick: x
          }, {
            default: z(() => [
              b(K, {
                name: "table",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          })
        ]),
        N("div", _o, [
          b(Ct, {
            modelValue: d.value,
            "onUpdate:modelValue": R[0] || (R[0] = (W) => d.value = W),
            tabs: c,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: z(({ tab: W, active: F, activate: _ }) => [
              N("button", {
                type: "button",
                class: ne(["nm-tabs__tab", { "nm-tabs__tab--active": F }]),
                role: "tab",
                "aria-selected": F,
                tabindex: F ? 0 : -1,
                onClick: (y) => _(W.key),
                onKeydown: (y) => r(y, W.key)
              }, [
                b(K, {
                  name: W.key === "edit" ? "pencil" : W.key === "split" ? "split" : "eye",
                  size: "sm",
                  class: "neumorphism-editor-icon"
                }, null, 8, ["name"]),
                N("span", Co, Y(W.label), 1)
              ], 42, bo)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          N("span", Mo, Y(T.value) + " 行 · " + Y(a.value) + " 字", 1)
        ])
      ]),
      N("div", {
        class: ne(["neumorphism-editor-panels", `neumorphism-mode-${d.value}`])
      }, [
        N("div", {
          ref_key: "editPanelRef",
          ref: E,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: d.value === "preview" }]),
          onScroll: be,
          onDrop: O,
          onDragover: H
        }, [
          b($e, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: z(() => [
              b(Mt, {
                class: "neumorphism-editor-textarea",
                "model-value": n.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": R[1] || (R[1] = (W) => s("change", W))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        N("div", {
          ref_key: "previewPanelRef",
          ref: M,
          class: ne(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: d.value === "edit" }]),
          onScroll: Ce
        }, [
          b($e, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: z(() => [
              b(pt, {
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
}), So = /* @__PURE__ */ Be(To, [["__scopeId", "data-v-1d3fd848"]]), Eo = { class: "neumorphism-editor-brand" }, No = { class: "neumorphism-editor-actions" }, Lo = {
  key: 0,
  class: "neumorphism-editor-sider"
}, Ro = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, Do = {
  key: 0,
  class: "neumorphism-editor-layout"
}, Ao = { class: "neumorphism-editor-header" }, Io = { class: "neumorphism-editor-title" }, zo = { class: "neumorphism-editor-meta" }, Po = { class: "neumorphism-editor-body" }, Bo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, Ho = { class: "neumorphism-doc-empty-icon" }, Oo = 50, Wo = /* @__PURE__ */ ye({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: d,
      selectedKeys: h,
      expandedKeys: r,
      treeData: c,
      displayNode: a,
      themeModel: T,
      handleTreeSelect: E
    } = dt({ root: n.root, initialPath: n.initialPath }), M = X({}), g = X([]);
    function C(k, m) {
      const l = g.value.filter((v) => v !== k);
      for (l.push(k); l.length > Oo; ) {
        const v = l.shift();
        v !== k && delete M.value[v];
      }
      g.value = l, M.value[k] = m;
    }
    function p(k) {
      return M.value[k.path] ?? k.content;
    }
    function f(k) {
      a.value && C(a.value.path, k);
    }
    function $() {
      a.value && s("save", a.value.path, p(a.value));
    }
    function w(k) {
      d.value = k, s("docLink", k);
    }
    const S = V(() => {
      if (!a.value) return !1;
      const k = M.value[a.value.path];
      return k !== void 0 && k !== a.value.content;
    });
    function A(k) {
      (k.ctrlKey || k.metaKey) && k.key === "s" && (k.preventDefault(), $());
    }
    return (k, m) => (D(), B("div", {
      class: ne(`neumorphism-doc-editor ${n.className}`),
      onKeydown: A
    }, [
      b(nt, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": z(() => [
          N("span", Eo, [
            b(K, {
              name: "pencil",
              size: "md"
            }),
            m[4] || (m[4] = j(" Doc Editor", -1))
          ])
        ]),
        "header-center": z(() => [
          b(ot, {
            modelValue: I(T),
            "onUpdate:modelValue": m[0] || (m[0] = (l) => _e(T) ? T.value = l : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": z(() => [
          N("div", No, [
            S.value ? (D(), fe(Se, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: z(() => [...m[5] || (m[5] = [
                j(" 未保存 ", -1)
              ])]),
              _: 1
            })) : oe("", !0),
            b(te, {
              variant: "raised",
              size: "small",
              disabled: !S.value,
              onClick: $
            }, {
              default: z(() => [
                b(K, {
                  name: "save",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                m[6] || (m[6] = j(" 保存 ", -1))
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: z(({ collapsed: l }) => [
          l ? (D(), B("div", Ro, [
            b(K, {
              name: "pencil",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (D(), B("div", Lo, [
            b(st, {
              "selected-keys": I(h),
              "onUpdate:selectedKeys": m[1] || (m[1] = (v) => _e(h) ? h.value = v : null),
              "expanded-keys": I(r),
              "onUpdate:expandedKeys": m[2] || (m[2] = (v) => _e(r) ? r.value = v : null),
              data: I(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(E)
            }, {
              icon: z(({ node: v }) => [
                b(vt, {
                  name: String(v.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: z(() => [
          b(at, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: z(() => [
              b($e, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: z(() => [
                  I(a) ? (D(), B("div", Do, [
                    N("header", Ao, [
                      N("div", null, [
                        N("h1", Io, Y(I(a).title), 1),
                        N("div", zo, [
                          I(a).path ? (D(), fe(Se, {
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
                          S.value ? (D(), fe(Se, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: z(() => [...m[7] || (m[7] = [
                              j(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : oe("", !0)
                        ])
                      ]),
                      b(te, {
                        variant: "raised",
                        size: "small",
                        disabled: !S.value,
                        onClick: $
                      }, {
                        default: z(() => [
                          b(K, {
                            name: "save",
                            size: "xl",
                            class: "neumorphism-doc-icon"
                          }),
                          m[8] || (m[8] = j(" 保存 ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    b(lt),
                    N("div", Po, [
                      b(So, {
                        value: p(I(a)),
                        onChange: f,
                        onDocLink: w
                      }, null, 8, ["value"])
                    ])
                  ])) : (D(), B("div", Bo, [
                    b($e, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: z(() => [
                        N("span", Ho, [
                          b(K, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    m[10] || (m[10] = N("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    b(te, {
                      variant: "raised",
                      size: "small",
                      onClick: m[3] || (m[3] = (l) => {
                        var v;
                        return d.value = ((v = I(c)[0]) == null ? void 0 : v.key) ?? "";
                      })
                    }, {
                      default: z(() => [...m[9] || (m[9] = [
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
}), gs = /* @__PURE__ */ Be(Wo, [["__scopeId", "data-v-db1006bf"]]), qo = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function Fo(e) {
  const t = e.match(qo);
  if (!t)
    return { meta: {}, body: e };
  const n = t[1], s = e.slice(t[0].length), d = {};
  for (const h of n.split(`
`)) {
    const r = h.indexOf(":");
    if (r === -1) continue;
    const c = h.slice(0, r).trim();
    let a = h.slice(r + 1).trim();
    /^-?\d+$/.test(a) ? a = parseInt(a, 10) : /^-?\d+\.\d+$/.test(a) ? a = parseFloat(a) : a === "true" ? a = !0 : a === "false" ? a = !1 : (a.startsWith('"') && a.endsWith('"') || a.startsWith("'") && a.endsWith("'")) && (a = a.slice(1, -1)), d[c] = a;
  }
  return { meta: d, body: s };
}
function Go(e) {
  return e.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function Vo(e, t) {
  if (t.title && typeof t.title == "string")
    return t.title;
  const n = e.match(/^#\s+(.+)$/m);
  return n ? n[1].trim() : "Untitled";
}
function Ko(e, t) {
  const { meta: n, body: s } = Fo(t), d = Vo(s, n), h = typeof n.order == "number" ? n.order : 9999;
  return {
    id: Go(e),
    title: d,
    path: e,
    content: t,
    body: s,
    meta: n,
    children: [],
    order: h
  };
}
function ys(e) {
  const t = /* @__PURE__ */ new Map();
  for (const [r, c] of Object.entries(e)) {
    if (!r.endsWith(".md")) continue;
    const a = Ko(r, c);
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
  const d = n.map((r) => t.get(r)).sort((r, c) => r.order - c.order || r.title.localeCompare(c.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: d,
    order: 0
  };
}
const ws = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  gn as DocCodeBlock,
  gs as DocEditor,
  ft as DocFlowCanvas,
  Ye as DocTocNav,
  vt as DocTreeIcon,
  vs as DocViewer,
  Ie as MATH_MOUNT_CLASS,
  ht as MATH_SOURCE_CLASS,
  Te as MATH_STATE_ATTR,
  So as MarkdownEditor,
  pt as MarkdownRenderer,
  We as TocNodeItem,
  ys as buildDocTree,
  At as buildHierarchyGraph,
  ws as componentCategories,
  St as createDocTree,
  Ko as createNode,
  Lt as extractFlowBlocks,
  Vo as extractTitle,
  ms as flattenDocTree,
  hs as getAncestors,
  Tt as getNodeIcon,
  qe as getScrollBehavior,
  rn as highlightCode,
  Je as layoutProDocFlow,
  Pn as matchBlockBracket,
  zn as matchBlockDollar,
  Wn as matchInlineBracket,
  Bn as matchInlineDollar,
  On as matchInlineDoubleDollar,
  Hn as matchInlineParen,
  Fn as mathExtensions,
  ct as nodeToTreeData,
  Fo as parseFrontmatter,
  ut as parseProDocFlow,
  Go as pathToId,
  Un as renderMath,
  Xe as resolveCanvasGraph,
  qn as stripMathDelimiters,
  dt as useDocLayout,
  In as useMarkdownToc,
  Ot as useScrollSpy,
  ps as writeFlowNodePosition
};
