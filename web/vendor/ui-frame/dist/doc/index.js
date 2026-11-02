import { ref as ee, computed as j, watch as ve, onBeforeUnmount as Ee, defineComponent as _e, openBlock as b, createElementBlock as R, normalizeClass as te, createElementVNode as A, unref as z, createVNode as B, createCommentVNode as ne, toDisplayString as K, Fragment as V, renderList as Z, createBlock as ge, nextTick as ye, withCtx as q, createTextVNode as oe, normalizeStyle as re, onMounted as wt, toRef as st, getCurrentInstance as Yt, render as Be, Transition as bt, withModifiers as Ut, h as De, isRef as Se } from "vue";
import { useTheme as Ft } from "../composables/useTheme.js";
import { N as Mt } from "../chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as le } from "../chunks/NeumorphismButton-CJnORKTl.js";
import { N as Me } from "../chunks/NeumorphismCard-D5NmwYTE.js";
import { N as Ct } from "../chunks/NeumorphismThemeToggle-D2_PXFjy.js";
import { N as Tt } from "../chunks/NeumorphismTree-fQBHMCMo.js";
import { N as St } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as Ie } from "../chunks/NeumorphismTag-C6c5RGls.js";
import { N as Et } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as Xt } from "../chunks/NeumorphismInput-Bk0rWMyD.js";
import { marked as Rt, Marked as Gt } from "marked";
import { escapeHtml as xe, generateId as et, slugify as ot } from "../utils/index.js";
import { useLocale as Ye } from "../composables/useLocale.js";
import { N as J } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as Kt } from "../composables/useClipboard.js";
import { N as Vt } from "../chunks/NeumorphismCanvas-a4F1ouPw.js";
import { _ as Re } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as jt } from "../chunks/NeumorphismTabs-BKZNO3V6.js";
import { N as Qt } from "../chunks/NeumorphismTextarea-DNgiNkhm.js";
import '../index2.css';function Zt(e) {
  var n;
  const t = ((n = e.path) == null ? void 0 : n.toLowerCase()) || "";
  return t.includes("api") ? "api" : t.includes("guide") ? "guide" : t.includes("config") ? "config" : t.includes("example") ? "example" : t.includes("install") ? "install" : t.includes("changelog") ? "changelog" : t.includes("faq") ? "faq" : "file";
}
function Lt(e) {
  const t = e.children.length > 0 ? "folder" : Zt(e);
  return {
    key: e.path,
    label: e.title,
    icon: t,
    children: e.children.map(Lt)
  };
}
function Jt(e) {
  const t = /* @__PURE__ */ new Map();
  function n(u) {
    t.set(u.path, u);
    for (const r of u.children)
      n(r);
  }
  n(e);
  const s = /* @__PURE__ */ new Map();
  function i(u) {
    s.set(u.id, u);
    for (const r of u.children)
      i(r);
  }
  return i(e), {
    root: e,
    nodeMap: t,
    findByPath(u) {
      return t.get(u);
    },
    findById(u) {
      return s.get(u);
    }
  };
}
function li(e) {
  const t = [];
  function n(s) {
    t.push(s);
    for (const i of s.children)
      n(i);
  }
  return n(e), t;
}
function ri(e, t) {
  const n = [];
  function s(i, u, r) {
    if (i.id === u)
      return n.push(...r), !0;
    for (const c of i.children)
      if (s(c, u, [...r, i]))
        return !0;
    return !1;
  }
  return s(t, e.id, []), n;
}
function Dt(e) {
  var p;
  const { root: t, initialPath: n } = e, s = typeof window < "u", i = e.syncUrlHash !== !1 && s, u = s ? window.location.hash.slice(1) : "", r = n || u || ((p = t.children[0]) == null ? void 0 : p.path) || "", c = ee(r), d = ee([]), { theme: x, setTheme: m } = Ft(), o = j({
    get: () => x.value,
    set: (M) => m(M)
  }), f = j(() => t.children.map(Lt)), y = ee(c.value ? [c.value] : []);
  ve(c, (M) => {
    y.value = M ? [M] : [];
  });
  const _ = j(() => Jt(t)), g = j(() => {
    if (c.value)
      return _.value.findByPath(c.value);
  }), w = j(() => g.value || t.children[0]);
  function C(M) {
    c.value = M;
  }
  function N(M, O) {
    c.value = O, M("docLink", O);
  }
  const k = ee(""), S = j(() => {
    if (!k.value.trim()) return [];
    const M = k.value.toLowerCase();
    return l(t).filter((L) => L.id === "root" ? !1 : L.title.toLowerCase().includes(M) || L.body.toLowerCase().includes(M)).slice(0, 10);
  });
  function v(M) {
    c.value = M.path, k.value = "";
  }
  function l(M) {
    const O = [M];
    for (const L of M.children)
      O.push(...l(L));
    return O;
  }
  if (ve(
    () => n,
    (M) => {
      M && (c.value = M);
    }
  ), i) {
    ve(c, (O) => {
      O && history.replaceState(null, "", `#${O}`);
    });
    const M = () => {
      const O = window.location.hash.slice(1);
      O && O !== c.value && (c.value = O);
    };
    window.addEventListener("hashchange", M), Ee(() => {
      window.removeEventListener("hashchange", M);
    });
  }
  return {
    selectedPath: c,
    selectedKeys: y,
    expandedKeys: d,
    treeData: f,
    selectedNode: g,
    displayNode: w,
    docTree: _,
    themeModel: o,
    searchQuery: k,
    searchResults: S,
    handleTreeSelect: C,
    handleDocLink: N,
    handleSearchSelect: v
  };
}
const en = /^graph\s+(LR|RL|TB|BT)\s*$/i, Ce = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Oe = /(-->|==>)\s*(?:\|([^|]*)\|)?/y, at = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, tn = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, qe = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function nn(e) {
  const t = [];
  qe.lastIndex = 0;
  let n;
  for (; (n = qe.exec(e)) !== null; )
    t.push(n[1]);
  return t;
}
function ci(e, t, n, s, i, u) {
  qe.lastIndex = 0;
  const r = t.replace(/\r\n/g, `
`).trim();
  let c, d = -1;
  for (; (c = qe.exec(e)) !== null; ) {
    if (d++, u !== void 0 && d !== u) continue;
    const x = c[1];
    if (x.replace(/\r\n/g, `
`).trim() !== r) continue;
    const m = new RegExp(
      `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), o = x.split(`
`);
    let f = !1;
    for (let g = 0; g < o.length; g++) {
      const w = o[g].indexOf("%%"), C = w >= 0 ? o[g].slice(0, w) : o[g], N = w >= 0 ? o[g].slice(w) : "", k = C.trim();
      if (k.includes("-->") || !m.test(k)) continue;
      const S = k.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      o[g] = `${S} @ ${s}, ${i}${N ? `  ${N}` : ""}`, f = !0;
      break;
    }
    if (!f) {
      const g = `${n} @ ${s}, ${i}`;
      o.length > 0 && o[o.length - 1].trim() === "" ? o.splice(o.length - 1, 0, g) : o.push(g);
    }
    const y = o.join(`
`), _ = c.index + c[0].indexOf(x);
    return e.slice(0, _) + y + e.slice(_ + x.length);
  }
  return e;
}
function sn(e) {
  return e ? e.startsWith("[/") && e.endsWith("/]") ? { shape: "rounded", text: e.slice(2, -2) } : e.startsWith("{") ? { shape: "diamond", text: e.slice(1, -1) } : e.startsWith("(") ? { shape: "stadium", text: e.slice(1, -1) } : { shape: "rect", text: e.slice(1, -1) } : { shape: "rect", text: "" };
}
function on(e) {
  const t = e.trim(), n = t.split("|");
  if (n.length > 1) {
    const s = n[n.length - 1].trim();
    if (tn.test(s))
      return {
        label: n.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: s.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: t };
}
function tt(e) {
  const t = [], n = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), i = [];
  let u = "LR", r = !1;
  function c(f, y) {
    const { shape: _, text: g } = sn(y), { label: w, docPath: C } = y ? on(g) : { label: f, docPath: void 0 }, N = n.get(f);
    N ? y && (N.label = w, N.shape = _, C !== void 0 && (N.docPath = C)) : n.set(f, { id: f, label: w, shape: _, docPath: C });
  }
  function d(f, y, _) {
    const g = n.get(f);
    g && (g.x = y, g.y = _);
  }
  function x(f, y, _, g) {
    const w = `${f}→${y}${_ ?? ""}${g ? "!" : ""}`;
    if (s.has(w)) return;
    s.add(w);
    const C = { from: f, to: y, label: _ };
    g && (C.thick = !0), i.push(C);
  }
  const m = e.split(`
`);
  for (let f = 0; f < m.length; f++) {
    const y = f + 1, _ = m[f].indexOf("%%"), g = (_ >= 0 ? m[f].slice(0, _) : m[f]).trim();
    if (g) {
      if (!r) {
        const w = en.exec(g);
        w ? u = w[1].toUpperCase() : (t.push({
          line: y,
          source: m[f].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), o(g, y, m[f].trim())), r = !0;
        continue;
      }
      o(g, y, m[f].trim());
    }
  }
  function o(f, y, _) {
    var N;
    let g = 0;
    Ce.lastIndex = 0, Oe.lastIndex = 0, Ce.lastIndex = g;
    let w = Ce.exec(f);
    if (!w || w.index !== 0)
      return t.push({ line: y, source: _, message: "无法识别的语句" }), !1;
    let C = w[1];
    for (c(w[1], w[2]), g = Ce.lastIndex; ; ) {
      for (; g < f.length && /\s/.test(f[g]); ) g++;
      if (g >= f.length) break;
      if (f[g] === "@") {
        at.lastIndex = g;
        const p = at.exec(f);
        return p && p.index === g ? (d(C, parseFloat(p[1]), parseFloat(p[2])), !0) : (t.push({
          line: y,
          source: _,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Oe.lastIndex = g;
      const k = Oe.exec(f);
      if (!k || k.index !== g)
        return t.push({
          line: y,
          source: _,
          message: `无法识别的内容: "${f.slice(g)}"`
        }), !1;
      const S = ((N = k[2]) == null ? void 0 : N.trim()) || void 0, v = k[1] === "==>";
      for (g = Oe.lastIndex; g < f.length && /\s/.test(f[g]); ) g++;
      if (Ce.lastIndex = g, w = Ce.exec(f), !w || w.index !== g)
        return t.push({ line: y, source: _, message: "箭头后缺少目标节点" }), !1;
      const l = w[1];
      c(w[1], w[2]), x(C, l, S, v), C = l, g = Ce.lastIndex;
    }
    return !0;
  }
  return {
    direction: u,
    nodes: [...n.values()],
    edges: i,
    errors: t
  };
}
const it = "__hier_root";
function an(e) {
  const t = [
    {
      id: it,
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
    }), n.push({ from: it, to: s.id });
  return {
    // 子项较多时纵向排布更可读
    direction: e.children.length <= 5 ? "LR" : "TB",
    nodes: t,
    edges: n,
    errors: []
  };
}
function lt(e) {
  for (const t of nn(e.body)) {
    const n = tt(t);
    if (n.nodes.length > 0) return n;
  }
  return e.children.length > 0 ? an(e) : null;
}
const ln = { class: "toc-item-row" }, rn = ["aria-expanded", "aria-controls", "aria-label"], cn = ["data-toc-id", "aria-current"], un = { class: "toc-text" }, dn = ["id"], Qe = /* @__PURE__ */ _e({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(e, { emit: t }) {
    const n = e, s = t, { t: i } = Ye(), u = j(() => n.activeHeading === n.node.id), r = j(() => n.node.children.length > 0), c = j(() => n.collapsedGroups.has(n.node.id));
    function d(m) {
      m.stopPropagation(), s("toggle", n.node.id);
    }
    function x(m) {
      m.preventDefault(), s("select", n.node.id);
    }
    return (m, o) => (b(), R("li", {
      class: te(["neumorphism-toc-item", { "has-children": r.value, active: u.value }]),
      role: "listitem"
    }, [
      A("div", ln, [
        r.value ? (b(), R("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !c.value,
          "aria-controls": `toc-list-${e.node.id}`,
          "aria-label": c.value ? z(i)("markdownTocExpand") : z(i)("markdownTocCollapse"),
          onClick: d
        }, [
          B(J, {
            name: c.value ? "chevron-right" : "chevron-down",
            size: "xs"
          }, null, 8, ["name"])
        ], 8, rn)) : ne("", !0),
        A("a", {
          href: "#",
          "data-toc-id": e.node.id,
          role: "button",
          "aria-current": u.value ? "location" : void 0,
          onClick: x
        }, [
          A("span", un, K(e.node.text), 1)
        ], 8, cn)
      ]),
      r.value && !c.value ? (b(), R("ul", {
        key: 0,
        id: `toc-list-${e.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (b(!0), R(V, null, Z(e.node.children, (f) => (b(), ge(Qe, {
          key: f.id,
          node: f,
          "active-heading": e.activeHeading,
          "collapsed-groups": e.collapsedGroups,
          onToggle: o[0] || (o[0] = (y) => m.$emit("toggle", y)),
          onSelect: o[1] || (o[1] = (y) => m.$emit("select", y))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, dn)) : ne("", !0)
    ], 2));
  }
});
function Ze() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function hn(e) {
  const { content: t } = e, n = e.headingSelector ?? "h1, h2, h3", s = ee("");
  let i = !1, u = null;
  function r(C) {
    var S;
    const N = t.value;
    if (!N) return null;
    const k = (S = e.scrollContainer) == null ? void 0 : S.value;
    return k instanceof HTMLElement ? k : typeof k == "string" ? N.closest(k) : N.closest(".nm-layout__content");
  }
  function c(C) {
    const N = C ?? r();
    if (!N) return 64;
    const k = N.closest(".nm-layout"), S = k == null ? void 0 : k.querySelector(".nm-layout__header");
    return S ? S.getBoundingClientRect().height : 64;
  }
  function d(C) {
    var N;
    C !== s.value && (s.value = C, (N = e.onActiveChange) == null || N.call(e, C));
  }
  function x() {
    var v;
    const C = r();
    if (!C) return;
    const N = (v = t.value) == null ? void 0 : v.querySelectorAll(n);
    if (!N) return;
    const k = c(C) + 20;
    let S = "";
    for (const l of N) {
      const p = l.getBoundingClientRect(), M = C.getBoundingClientRect();
      if (p.top - M.top <= k)
        S = l.id;
      else
        break;
    }
    d(S);
  }
  function m() {
    i = !1, u && (clearTimeout(u), u = null), x();
  }
  function o(C) {
    var k, S;
    u && clearTimeout(u), i = !0, s.value = C, (k = e.onActiveChange) == null || k.call(e, C);
    const N = (S = t.value) == null ? void 0 : S.querySelector(`[id="${C}"]`);
    N && N.scrollIntoView({ behavior: Ze() }), u = setTimeout(m, 800);
  }
  let f = null, y = null, _ = -1;
  function g() {
    f == null || f.disconnect(), f = null, y == null || y.disconnect(), y = null;
  }
  function w() {
    g();
    const C = r();
    if (!C || !t.value) return;
    const N = c(C);
    _ = N;
    const k = Array.from(t.value.querySelectorAll(n));
    if (k.length === 0) return;
    const S = /* @__PURE__ */ new Map();
    f = new IntersectionObserver(
      (p) => {
        if (i) return;
        for (const L of p)
          L.isIntersecting ? S.set(L.target, L.boundingClientRect.top) : S.delete(L.target);
        let M = "", O = -1 / 0;
        for (const [L, P] of S)
          P > O && (O = P, M = L.id);
        M && d(M);
      },
      {
        root: C,
        rootMargin: `-${N + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const p of k)
      f.observe(p);
    const v = C.closest(".nm-layout"), l = v == null ? void 0 : v.querySelector(".nm-layout__header");
    l && typeof ResizeObserver < "u" && (y = new ResizeObserver(() => {
      const p = l.getBoundingClientRect().height;
      p !== _ && (_ = p, ye(() => w()));
    }), y.observe(l));
  }
  return ve(e.watchSource ? [t, e.watchSource] : [t], ([C]) => {
    C ? ye(() => {
      w(), x();
    }) : g();
  }), Ee(() => {
    g(), u && clearTimeout(u);
  }), { activeHeading: s, scrollToHeading: o, syncActiveHeading: x };
}
const fn = ["aria-label"], mn = { class: "neumorphism-toc-header" }, pn = { class: "neumorphism-toc-title" }, gn = {
  class: "neumorphism-toc-list",
  role: "list"
}, vn = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, rt = /* @__PURE__ */ _e({
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
    const s = e, i = n, { t: u } = Ye(), r = j(() => s.title || u("markdownTocLabel")), c = ee(null), d = ee(/* @__PURE__ */ new Set()), x = j(() => s.collapsedGroups ?? d.value);
    function m(_) {
      s.collapsedGroups !== void 0 ? i("update:collapsedGroups", _) : d.value = _;
    }
    ve(
      () => s.items,
      () => {
        s.collapsedGroups === void 0 && (d.value = /* @__PURE__ */ new Set());
      }
    );
    function o(_) {
      const g = new Set(x.value), w = g.has(_);
      w ? g.delete(_) : g.add(_), m(g), w && ye(() => f(_));
    }
    function f(_) {
      if (!c.value || window.innerWidth <= 1200) return;
      const g = c.value, w = g.querySelector(`[data-toc-id="${CSS.escape(_)}"]`);
      if (!w) return;
      const C = g.getBoundingClientRect(), N = w.closest(".neumorphism-toc-item"), k = Array.from((N == null ? void 0 : N.children) ?? []).find(
        (v) => v.classList.contains("neumorphism-toc-list")
      );
      if (k && k.getBoundingClientRect().bottom <= C.bottom + 10)
        return;
      const S = w.getBoundingClientRect().top - C.top + g.scrollTop;
      g.scrollTo({
        top: Math.max(0, S),
        behavior: Ze()
      });
    }
    function y() {
      if (!c.value || window.innerWidth <= 1200) return;
      const _ = c.value, g = _.querySelector(".neumorphism-toc-item.active");
      if (!g) return;
      const w = _.getBoundingClientRect(), C = g.getBoundingClientRect(), N = w.top + w.height * 0.25, k = w.top + w.height * 0.75;
      if (C.top >= N && C.bottom <= k)
        return;
      const v = C.top - w.top + _.scrollTop - C.height / 2 - w.height / 2;
      _.scrollTo({
        top: Math.max(0, v),
        behavior: Ze()
      });
    }
    return ve(
      () => s.activeId,
      (_) => {
        if (!_) return;
        function g(w) {
          for (const C of w) {
            if (C.id === _) return !0;
            if (g(C.children)) {
              if (x.value.has(C.id)) {
                const N = new Set(x.value);
                N.delete(C.id), m(N);
              }
              return !0;
            }
          }
          return !1;
        }
        g(s.items), ye(() => y());
      }
    ), t({ scrollTocToActive: y }), (_, g) => e.framed ? (b(), R("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: c,
      class: "neumorphism-toc",
      "aria-label": r.value
    }, [
      B(Me, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: q(() => [
          A("div", mn, [
            A("span", pn, [
              B(J, {
                name: "list",
                size: "sm"
              }),
              oe(" " + K(r.value), 1)
            ])
          ]),
          A("ul", gn, [
            (b(!0), R(V, null, Z(e.items, (w) => (b(), ge(Qe, {
              key: w.id,
              node: w,
              "active-heading": e.activeId,
              "collapsed-groups": x.value,
              onToggle: o,
              onSelect: g[0] || (g[0] = (C) => i("select", C))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, fn)) : (b(), R("ul", vn, [
      (b(!0), R(V, null, Z(e.items, (w) => (b(), ge(Qe, {
        key: w.id,
        node: w,
        "active-heading": e.activeId,
        "collapsed-groups": x.value,
        onToggle: o,
        onSelect: g[1] || (g[1] = (C) => i("select", C))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), xn = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, yn = /(#\s+.*$)/gm, _n = /(--\s.*$)/gm, kn = /$.^/gm, $n = /* @__PURE__ */ new Set([
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
]), wn = /* @__PURE__ */ new Set(["sql", "mysql", "pgsql", "plsql", "lua"]);
function bn(e) {
  const t = (e ?? "").toLowerCase();
  return $n.has(t) ? yn : wn.has(t) ? _n : t === "html" || t === "xml" || t === "vue" ? kn : xn;
}
const Mn = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, Cn = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, Tn = /\b([a-zA-Z_]\w*)(?=\()/g, Sn = /\b(\d+\.?\d*)\b/g, En = /\b([A-Z][a-zA-Z0-9_]*)\b/g, Rn = /\u0001([a-z]+)\u0001/g;
function Ln(e) {
  let t = e, n = "";
  do
    n = String.fromCharCode(97 + t % 26) + n, t = Math.floor(t / 26) - 1;
  while (t >= 0);
  return "" + n + "";
}
function Dn(e) {
  let t = 0;
  for (const n of e) t = t * 26 + (n.charCodeAt(0) - 96);
  return t - 1;
}
function Nn(e, t) {
  if (!t || t === "text" || t === "plain")
    return xe(e);
  let n = xe(e);
  const s = [], i = (u) => (r) => (s.push(`<span class="${u}">${r}</span>`), Ln(s.length - 1));
  return n = n.replace(Mn, i("token-string")), n = n.replace(bn(t), i("token-comment")), n = n.replace(Cn, '<span class="token-keyword">$1</span>'), n = n.replace(Tn, '<span class="token-function">$1</span>'), n = n.replace(Sn, '<span class="token-number">$1</span>'), n = n.replace(En, '<span class="token-type">$1</span>'), n = n.replace(Rn, (u, r) => s[Dn(r)]), n;
}
const An = { class: "code-block-wrapper doc-code-block" }, In = { class: "code-block-header" }, Bn = { class: "code-lang" }, On = { class: "code-lines" }, Wn = ["aria-label"], Hn = { class: "code-block-body" }, Pn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, zn = ["innerHTML"], qn = /* @__PURE__ */ _e({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(e) {
    const t = e, { t: n } = Ye(), { copied: s, copy: i } = Kt({ resetDelay: 1500 }), u = j(() => t.lang || "text"), r = j(() => Nn(t.code, t.lang)), c = j(() => t.code.split(`
`).length), d = j(() => s.value ? n("markdownCodeCopied") : n("markdownCodeCopy"));
    return (x, m) => (b(), R("div", An, [
      A("div", In, [
        A("span", Bn, K(u.value), 1),
        A("span", On, K(c.value) + " lines", 1),
        A("button", {
          type: "button",
          class: te(["code-copy-btn", { copied: z(s) }]),
          "aria-label": d.value,
          onClick: m[0] || (m[0] = (o) => z(i)(e.code))
        }, K(d.value), 11, Wn)
      ]),
      A("div", Hn, [
        e.showLineNumbers ? (b(), R("div", Pn, [
          (b(!0), R(V, null, Z(c.value, (o) => (b(), R("span", {
            key: o,
            class: "line-num"
          }, K(o), 1))), 128))
        ])) : ne("", !0),
        A("pre", null, [
          A("code", {
            class: te(`language-${u.value}`),
            innerHTML: r.value
          }, null, 10, zn)
        ])
      ])
    ]));
  }
}), ct = 44, ut = 96, We = 280, Yn = 16, Un = 14, Fn = 8, Xn = 90, dt = 28, be = 48, Gn = 4, He = 28, pe = 20, Kn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function Vn(e) {
  let t = 0;
  for (const n of e)
    t += Kn.test(n) ? Un : Fn;
  return t;
}
function jn(e) {
  const t = Vn(e.label) + Yn * 2;
  if (e.shape === "diamond") {
    const n = Math.min(Math.max(t * 1.5 + 32, ut * 1.4), We * 1.4);
    return { w: n, h: Math.max(64, n * 0.55) };
  }
  return t > We ? { w: We, h: ct + 20 } : { w: Math.min(Math.max(t, ut), We), h: ct };
}
function ht(e, t = Gn) {
  const { nodes: n, edges: s, direction: i } = e, u = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (n.length === 0) return u;
  const r = {};
  for (const a of n) r[a.id] = jn(a);
  const c = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
  for (const a of n)
    c.set(a.id, []), d.set(a.id, 0);
  for (const a of s)
    !c.has(a.from) || !d.has(a.to) || (c.get(a.from).push(a.to), d.set(a.to, d.get(a.to) + 1));
  const x = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Set(), o = n.filter((a) => (d.get(a.id) ?? 0) === 0).map((a) => a.id), f = new Map(d);
  for (; o.length > 0; ) {
    const a = o.shift(), h = x.get(a) ?? 0;
    x.set(a, h);
    for (const $ of c.get(a) ?? [])
      x.set($, Math.max(x.get($) ?? 0, h + 1)), f.set($, f.get($) - 1), f.get($) === 0 && o.push($);
  }
  for (const a of n) {
    if (x.has(a.id)) continue;
    let h = -1;
    for (const $ of s)
      $.to === a.id && x.has($.from) && (h = Math.max(h, x.get($.from)));
    x.set(a.id, h + 1);
  }
  s.forEach((a, h) => {
    (x.get(a.to) ?? 0) <= (x.get(a.from) ?? 0) && m.add(h);
  });
  const y = Math.max(...x.values()), _ = Array.from({ length: y + 1 }, () => []), g = new Map(n.map((a, h) => [a.id, h]));
  for (const a of n)
    _[x.get(a.id)].push(a.id);
  for (const a of _)
    a.sort((h, $) => g.get(h) - g.get($));
  const w = /* @__PURE__ */ new Map();
  function C() {
    w.clear(), _.forEach((a) => a.forEach((h, $) => w.set(h, $)));
  }
  C();
  const N = /* @__PURE__ */ new Map();
  for (const a of s)
    N.has(a.to) || N.set(a.to, []), N.get(a.to).push(a.from);
  function k(a, h, $) {
    const I = ($.get(a) ?? []).filter((G) => h.has(G));
    return I.length === 0 ? w.get(a) : I.reduce((G, se) => G + (w.get(se) ?? 0), 0) / I.length;
  }
  for (let a = 0; a < t; a++) {
    for (let h = 1; h < _.length; h++) {
      const $ = new Set(_[h - 1]);
      _[h].sort((I, F) => {
        const G = k(I, $, N), se = k(F, $, N);
        return G !== se ? G - se : w.get(I) - w.get(F);
      }), C();
    }
    for (let h = _.length - 2; h >= 0; h--) {
      const $ = new Set(_[h + 1]);
      _[h].sort((I, F) => {
        const G = k(I, $, c), se = k(F, $, c);
        return G !== se ? G - se : w.get(I) - w.get(F);
      }), C();
    }
  }
  const S = i === "TB" || i === "BT", v = i === "RL" || i === "BT", l = _.map(
    (a) => a.reduce((h, $) => Math.max(h, S ? r[$].h : r[$].w), 0)
  ), p = _.map(
    (a) => a.reduce((h, $) => h + (S ? r[$].w : r[$].h), 0) + Math.max(a.length - 1, 0) * dt
  ), M = Math.max(...p), O = [];
  {
    let a = be;
    for (let h = 0; h < _.length; h++)
      O.push(a), a += l[h] + Xn;
  }
  const L = /* @__PURE__ */ new Map();
  _.forEach((a, h) => {
    let $ = be + (M - p[h]) / 2;
    for (const I of a) {
      const F = r[I].w, G = r[I].h, se = S ? G : F, ie = O[h] + (l[h] - se) / 2;
      L.set(I, {
        id: I,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: S ? $ : ie,
        y: S ? ie : $,
        w: F,
        h: G
      }), $ += (S ? F : G) + dt;
    }
  });
  let P = 0, W = 0;
  for (const a of L.values())
    P = Math.max(P, a.x + a.w), W = Math.max(W, a.y + a.h);
  if (P += be, W += be, v)
    for (const a of L.values())
      i === "RL" ? a.x = P - a.x - a.w : a.y = W - a.y - a.h;
  {
    let a = !1;
    for (const h of n) {
      const $ = L.get(h.id);
      $ && (typeof h.x == "number" && ($.x = h.x, a = !0), typeof h.y == "number" && ($.y = h.y, a = !0));
    }
    if (a) {
      P = 0, W = 0;
      for (const h of L.values())
        P = Math.max(P, h.x + h.w), W = Math.max(W, h.y + h.h);
      P += be, W += be;
    }
  }
  const Y = Math.max(0, ...[...L.values()].map((a) => a.x + a.w)), Q = Math.max(0, ...[...L.values()].map((a) => a.y + a.h)), T = [], E = [], H = [], U = [];
  _.forEach((a, h) => {
    let $ = 1 / 0, I = -1 / 0, F = 1 / 0, G = -1 / 0;
    for (const se of a) {
      const ie = L.get(se);
      ie && ($ = Math.min($, ie.x), I = Math.max(I, ie.x + ie.w), F = Math.min(F, ie.y), G = Math.max(G, ie.y + ie.h));
    }
    T[h] = $, E[h] = I, H[h] = F, U[h] = G;
  });
  const X = /* @__PURE__ */ new Map();
  {
    let a = 0;
    s.forEach((h, $) => {
      const I = Math.abs((x.get(h.to) ?? 0) - (x.get(h.from) ?? 0));
      (m.has($) || I >= 2) && X.set($, a++);
    });
  }
  const D = [];
  if (s.forEach((a, h) => {
    const $ = L.get(a.from), I = L.get(a.to);
    if (!$ || !I) return;
    const F = m.has(h), G = X.get(h);
    let se, ie;
    if (G !== void 0) {
      const ce = x.get(a.from) ?? 0, ue = x.get(a.to) ?? 0;
      if (S) {
        const de = $.x + $.w / 2, he = v ? $.y : $.y + $.h, ke = I.x + I.w / 2, $e = v ? I.y : I.y + I.h, fe = v ? H[ce] - pe : U[ce] + pe, me = v ? H[ue] - pe : U[ue] + pe, ae = Y + He + G * pe;
        se = `M ${de},${he} L ${de},${fe} L ${ae},${fe} L ${ae},${me} L ${ke},${me} L ${ke},${$e}`, ie = { x: ae, y: (fe + me) / 2 };
      } else {
        const de = v ? $.x : $.x + $.w, he = $.y + $.h / 2, ke = v ? I.x : I.x + I.w, $e = I.y + I.h / 2, fe = v ? T[ce] - pe : E[ce] + pe, me = v ? T[ue] - pe : E[ue] + pe, ae = Q + He + G * pe;
        se = `M ${de},${he} L ${fe},${he} L ${fe},${ae} L ${me},${ae} L ${me},${$e} L ${ke},${$e}`, ie = { x: (fe + me) / 2, y: ae };
      }
    } else {
      let ce, ue, de, he, ke, $e, fe, me;
      if (S) {
        const ae = v ? -1 : 1;
        ce = $.x + $.w / 2, ue = $.y + (ae > 0 ? $.h : 0), de = I.x + I.w / 2, he = I.y + (ae > 0 ? 0 : I.h);
        const Le = Math.max(40, Math.abs(he - ue) / 2);
        ke = ce, $e = ue + Le * ae, fe = de, me = he - Le * ae;
      } else {
        const ae = v ? -1 : 1;
        ce = $.x + (ae > 0 ? $.w : 0), ue = $.y + $.h / 2, de = I.x + (ae > 0 ? 0 : I.w), he = I.y + I.h / 2;
        const Le = Math.max(40, Math.abs(de - ce) / 2);
        ke = ce + Le * ae, $e = ue, fe = de - Le * ae, me = he;
      }
      se = `M ${ce},${ue} C ${ke},${$e} ${fe},${me} ${de},${he}`, ie = {
        x: (ce + 3 * ke + 3 * fe + de) / 8,
        y: (ue + 3 * $e + 3 * me + he) / 8
      };
    }
    D.push({
      from: a.from,
      to: a.to,
      label: a.label,
      ...a.thick ? { thick: !0 } : {},
      path: se,
      labelPos: ie,
      isBackEdge: F
    });
  }), X.size > 0) {
    const a = X.size - 1;
    S ? P = Math.max(P, Y + He + a * pe + be) : W = Math.max(W, Q + He + a * pe + be);
  }
  return { nodes: L, edges: D, width: P, height: W };
}
const Qn = { class: "nm-flow-canvas" }, Zn = ["width", "height"], Jn = ["id"], es = ["d", "marker-end"], ts = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], ns = { class: "nm-flow__node-inner" }, ss = { class: "nm-flow__node-text" }, os = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, as = /* @__PURE__ */ _e({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(e, { emit: t }) {
    const n = e, s = t, i = ee(), u = et("nm-flow-arrow"), r = ee(null), c = j(() => {
      const l = r.value;
      if (!l) return ht(n.graph);
      const p = n.graph.nodes.map(
        (M) => M.id === l.id ? { ...M, x: l.x, y: l.y } : M
      );
      return ht({ ...n.graph, nodes: p });
    }), d = j(() => {
      const l = new Map(n.graph.nodes.map((p) => [p.id, p]));
      return [...c.value.nodes.values()].map((p) => {
        var M, O, L;
        return {
          ...p,
          shape: ((M = l.get(p.id)) == null ? void 0 : M.shape) ?? "rect",
          docPath: (O = l.get(p.id)) == null ? void 0 : O.docPath,
          label: ((L = l.get(p.id)) == null ? void 0 : L.label) ?? p.id
        };
      });
    }), x = j(() => c.value.edges.filter((l) => l.label));
    ve(
      c,
      () => {
        r.value || ye(() => {
          requestAnimationFrame(() => {
            var l;
            return (l = i.value) == null ? void 0 : l.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let m = !1;
    function o(l) {
      if (m) {
        m = !1;
        return;
      }
      l && s("navigate", l);
    }
    const f = ee(null), y = ee(null);
    function _() {
      window.addEventListener("pointermove", C), window.addEventListener("pointerup", k), window.addEventListener("pointercancel", S);
    }
    function g() {
      window.removeEventListener("pointermove", C), window.removeEventListener("pointerup", k), window.removeEventListener("pointercancel", S);
    }
    function w(l, p) {
      var L;
      if (!n.editable || l.button !== 0) return;
      const M = (L = f.value) == null ? void 0 : L.getBoundingClientRect(), O = M && c.value.width > 0 ? M.width / c.value.width : 1;
      y.value = {
        id: p.id,
        startClientX: l.clientX,
        startClientY: l.clientY,
        lastClientX: l.clientX,
        lastClientY: l.clientY,
        scale: O || 1,
        baseX: p.x,
        baseY: p.y,
        moved: !1,
        raf: 0
      }, _();
    }
    function C(l) {
      const p = y.value;
      p && (p.lastClientX = l.clientX, p.lastClientY = l.clientY, p.raf || (p.raf = requestAnimationFrame(N)));
    }
    function N() {
      const l = y.value;
      if (!l) return;
      l.raf = 0;
      const p = (l.lastClientX - l.startClientX) / l.scale, M = (l.lastClientY - l.startClientY) / l.scale;
      !l.moved && Math.hypot(p, M) < 3 || (l.moved = !0, r.value = {
        id: l.id,
        x: Math.round(l.baseX + p),
        y: Math.round(l.baseY + M)
      });
    }
    function k() {
      g();
      const l = y.value;
      y.value = null, l != null && l.raf && cancelAnimationFrame(l.raf);
      const p = r.value;
      r.value = null, !(!(l != null && l.moved) || !p) && (m = !0, setTimeout(() => {
        m = !1;
      }, 0), s("nodeMove", { id: l.id, x: p.x, y: p.y }));
    }
    function S() {
      g();
      const l = y.value;
      y.value = null, l != null && l.raf && cancelAnimationFrame(l.raf), r.value = null;
    }
    Ee(() => {
      var l;
      g(), (l = y.value) != null && l.raf && cancelAnimationFrame(y.value.raf);
    });
    function v(l, p) {
      p && (l.key === "Enter" || l.key === " ") && (l.preventDefault(), s("navigate", p));
    }
    return (l, p) => (b(), R("div", Qn, [
      B(Vt, {
        ref_key: "canvasRef",
        ref: i,
        width: "100%",
        height: e.height,
        "show-grid": e.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: q(() => [
          A("div", {
            ref_key: "flowEl",
            ref: f,
            class: te(["nm-flow", { "nm-flow--editable": e.editable }]),
            style: re({ width: `${c.value.width}px`, height: `${c.value.height}px` })
          }, [
            (b(), R("svg", {
              class: "nm-flow__edges",
              width: c.value.width,
              height: c.value.height,
              "aria-hidden": "true"
            }, [
              A("defs", null, [
                A("marker", {
                  id: z(u),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...p[0] || (p[0] = [
                  A("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, Jn)
              ]),
              (b(!0), R(V, null, Z(c.value.edges, (M, O) => (b(), R("path", {
                key: O,
                d: M.path,
                class: te(["nm-flow__edge", { "nm-flow__edge--back": M.isBackEdge, "nm-flow__edge--thick": M.thick }]),
                "marker-end": `url(#${z(u)})`
              }, null, 10, es))), 128))
            ], 8, Zn)),
            (b(!0), R(V, null, Z(x.value, (M, O) => (b(), R("div", {
              key: `label-${O}`,
              class: "nm-flow__edge-label",
              style: re({ left: `${M.labelPos.x}px`, top: `${M.labelPos.y}px` })
            }, K(M.label), 5))), 128)),
            (b(!0), R(V, null, Z(d.value, (M) => (b(), R("div", {
              key: M.id,
              class: te(["nm-flow__node", [`nm-flow__node--${M.shape}`, { "nm-flow__node--link": M.docPath }]]),
              style: re({
                left: `${M.x}px`,
                top: `${M.y}px`,
                width: `${M.w}px`,
                height: `${M.h}px`
              }),
              role: M.docPath ? "link" : void 0,
              tabindex: M.docPath ? 0 : void 0,
              "aria-label": M.docPath ? `${M.label}（跳转到文档）` : M.label,
              "data-nm-no-pan": "",
              onPointerdown: (O) => w(O, M),
              onClick: (O) => o(M.docPath),
              onKeydown: (O) => v(O, M.docPath)
            }, [
              A("div", ns, [
                A("span", ss, K(M.label), 1),
                M.docPath ? (b(), R("span", os, [
                  B(J, {
                    name: "external",
                    size: "xs"
                  })
                ])) : ne("", !0)
              ])
            ], 46, ts))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), Je = /* @__PURE__ */ Re(as, [["__scopeId", "data-v-3c4663c5"]]);
function Nt(e) {
  return e.map((t) => {
    const n = t;
    return n.text ? String(n.text) : n.tokens ? Nt(n.tokens) : "";
  }).join("");
}
function is(e) {
  const t = et("toc");
  function n(r) {
    return `${t}-${ot(r)}`;
  }
  function s(r) {
    const c = [], d = /* @__PURE__ */ new Set(), x = Rt.lexer(r);
    for (const m of x)
      if (m.type === "heading") {
        const o = Nt(m.tokens);
        let f = ot(o);
        f || (f = "heading");
        let y = `${t}-${f}`, _ = 1;
        for (; d.has(y); )
          y = `${t}-${f}-${_}`, _++;
        d.add(y), c.push({
          level: m.depth,
          text: o,
          id: y
        });
      }
    return c;
  }
  const i = j(() => s(e.value)), u = j(() => {
    const r = i.value, c = [], d = [];
    for (const x of r) {
      const m = { level: x.level, text: x.text, id: x.id, children: [] };
      for (; d.length > 0 && d[d.length - 1].level >= m.level; )
        d.pop();
      d.length === 0 ? c.push(m) : d[d.length - 1].children.push(m), d.push(m);
    }
    return c;
  });
  return { toc: i, tocTree: u, makeUniqueId: n };
}
const ze = "md-math-mount", At = "md-math-src", Ne = "data-math-state";
function ls(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), i = /^[ \t]*(?:\r?\n|$)/.exec(s);
  if (!i) return null;
  const u = e.slice(0, t + 2 + i[0].length);
  return { tex: n, raw: u };
}
function rs(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  if (!n.trim()) return null;
  const s = e.slice(t + 2), i = /^[ \t]*(?:\r?\n|$)/.exec(s);
  return i ? { tex: n, raw: e.slice(0, t + 2 + i[0].length) } : null;
}
function cs(e) {
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
    const i = e.slice(1, n);
    return !i.trim() || /[`，。、；：！？…]/.test(i) ? null : { tex: i, raw: e.slice(0, n + 1) };
  }
  return null;
}
function us(e) {
  if (!e.startsWith("\\(")) return null;
  const t = e.indexOf("\\)", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function ds(e) {
  if (!e.startsWith("$$")) return null;
  const t = e.indexOf("$$", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function hs(e) {
  if (!e.startsWith("\\[")) return null;
  const t = e.indexOf("\\]", 2);
  if (t < 0) return null;
  const n = e.slice(2, t);
  return !n.trim() || /\n[ \t]*\n/.test(n) ? null : { tex: n, raw: e.slice(0, t + 2) };
}
function fs(e) {
  const t = e.trim(), n = [
    ["$$", "$$"],
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$", "$"]
  ];
  for (const [s, i] of n)
    if (t.startsWith(s) && t.endsWith(i) && t.length >= s.length + i.length)
      return t.slice(s.length, t.length - i.length);
  return t;
}
function ft(e) {
  const t = e.display ? "div" : "span", n = e.display ? `${ze} ${ze}--block` : ze, s = e.display ? "block" : "inline";
  return `<${t} class="${n}" data-math-display="${s}" data-tex="${xe(e.tex)}"><span class="${At}">${xe(e.text)}</span></${t}>`;
}
const ms = [
  {
    name: "blockMath",
    level: "block",
    tokenizer(e) {
      const t = ls(e) ?? rs(e);
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
      return ft(e);
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
      const t = ds(e) ?? cs(e) ?? us(e) ?? hs(e);
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
      return ft(e);
    }
  }
];
let Ue = null;
function ps() {
  return Ue || (Ue = import("katex").then((e) => {
    const t = e.default ?? e;
    return typeof (t == null ? void 0 : t.renderToString) == "function" ? t : null;
  }).catch(() => null)), Ue;
}
const Pe = /* @__PURE__ */ new Map(), gs = 400;
function vs(e, t, n) {
  const s = `${n ? "b" : "i"}\0${t}`, i = Pe.get(s);
  if (i !== void 0) return i;
  const u = e.renderToString(t, {
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
  return Pe.size >= gs && Pe.clear(), Pe.set(s, u), u;
}
async function xs(e) {
  var u;
  if (!e) return;
  const t = () => Array.from(e.querySelectorAll(`.${ze}:not([${Ne}])`));
  if (t().length === 0) return;
  const n = await ps(), s = e instanceof Node && e.isConnected, i = t().filter((r) => !s || r.isConnected);
  if (!n) {
    for (const r of i) r.setAttribute(Ne, "raw");
    return;
  }
  for (const r of i) {
    const c = r.dataset.mathDisplay === "block", d = ((u = r.querySelector(`.${At}`)) == null ? void 0 : u.textContent) ?? r.textContent ?? "", x = r.dataset.tex ?? fs(d);
    if (!x.trim()) {
      r.setAttribute(Ne, "raw");
      continue;
    }
    try {
      r.innerHTML = vs(n, x, c), r.setAttribute(Ne, "done");
    } catch {
      r.setAttribute(Ne, "raw");
    }
  }
}
const ys = "mermaid-diagram", It = "data-mermaid-state", _s = "data-mermaid-graph";
function ks(e) {
  return `<div class="${ys}" ${It}="loading"><pre><code>${xe(e)}</code></pre></div>`;
}
function mt(e, t) {
  e.setAttribute(It, t);
}
const Bt = /^gantt\s*$/i, $s = /^section\s+(.*)$/i, ws = /^title\s+(.*)$/i, bs = /^dateFormat\s+(.+)$/i, Ms = /^axisFormat\s+(.+)$/i, Cs = /^excludes\s+(.+)$/i, Ts = /^todayMarker\b.*$/i, Ss = /^(.+?)\s*:\s*(.+)$/;
function pt() {
  return { sections: [], startMs: 0, endMs: 0, errors: [] };
}
function Es(e) {
  var n;
  const t = (n = e.split(`
`).find((s) => s.trim() && !s.trim().startsWith("%%"))) == null ? void 0 : n.trim();
  return !!t && Bt.test(t);
}
const nt = {
  ms: 1,
  s: 1e3,
  m: 6e4,
  h: 36e5,
  d: 864e5,
  w: 6048e5
}, Rs = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/i, Ls = /^after\s+(.+)$/i, gt = {
  done: "done",
  active: "active",
  crit: "crit",
  milestone: "milestone"
};
function Ds(e) {
  const t = ["YYYY", "YY", "MM", "DD", "HH", "mm", "ss", "M", "D", "H", "S"], n = [];
  let s = "";
  for (let i = 0; i < e.length; ) {
    const u = t.find((c) => e.startsWith(c, i));
    if (u) {
      n.push(u), s += u === "YYYY" ? "(\\d{4})" : "(\\d{1,2})", i += u.length;
      continue;
    }
    const r = e[i];
    s += r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), i += 1;
  }
  return { re: new RegExp(`^${s}$`), fields: n };
}
function vt(e, t) {
  const n = t.re.exec(e.trim());
  if (!n) return null;
  const s = {};
  t.fields.forEach((o, f) => {
    s[o] = Number.parseInt(n[f + 1], 10);
  });
  const i = s.YYYY ?? (s.YY !== void 0 ? 2e3 + s.YY : 1970), u = (s.MM ?? s.M ?? 1) - 1, r = s.DD ?? s.D ?? 1, c = s.HH ?? s.H ?? 0, d = s.mm ?? 0, x = s.ss ?? s.S ?? 0, m = Date.UTC(i, u, r, c, d, x);
  return Number.isFinite(m) ? m : null;
}
function Ns(e) {
  const t = new Date(e).getUTCDay();
  return t === 0 || t === 6;
}
function As(e) {
  const t = new Date(e);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}
function xt(e, t) {
  return !Ns(e) && !t.has(As(e));
}
function Is(e, t, n) {
  let s = Math.max(0, Math.round(t)), i = e;
  if (s === 0) return i;
  xt(i, n) && (s -= 1);
  for (let u = 0; u < 4e3 && !(s <= 0 && i > e); u++)
    i += nt.d, xt(i, n) && (s -= 1);
  return i;
}
function Bs(e, t, n, s, i) {
  if ((t === "d" || t === "w") && (s || i.size > 0)) {
    const u = t === "w" ? e * 5 : e;
    return Is(n, u, i) - n;
  }
  return e * nt[t];
}
function Os(e) {
  return /^\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(e);
}
function Ws(e) {
  const t = { status: "default" };
  for (const n of e) {
    const s = n.trim();
    if (!s) continue;
    const i = s.toLowerCase();
    if (t.status === "default" && gt[i]) {
      t.status = gt[i];
      continue;
    }
    const u = Ls.exec(s);
    if (u) {
      t.start = { kind: "after", id: u[1].trim() };
      continue;
    }
    const r = Rs.exec(s);
    if (r) {
      t.end = {
        kind: "duration",
        amount: Number.parseFloat(r[1]),
        unit: r[2].toLowerCase()
      };
      continue;
    }
    if (Os(s)) {
      t.start ? t.end ? t.end = { kind: "date", value: s } : t.end = { kind: "date", value: s } : t.start = { kind: "date", value: s };
      continue;
    }
    if (!t.id) {
      t.id = s;
      continue;
    }
    t.end || (t.end = { kind: "date", value: s });
  }
  return t;
}
function Hs(e) {
  const t = [], n = [], s = /* @__PURE__ */ new Set();
  let i = !1, u = "YYYY-MM-DD", r, c, d = !1, x = "";
  const m = e.split(`
`);
  for (let k = 0; k < m.length; k++) {
    const S = k + 1, v = m[k].indexOf("%%"), l = (v >= 0 ? m[k].slice(0, v) : m[k]).trim();
    if (!l) continue;
    if (!d) {
      if (Bt.test(l)) {
        d = !0;
        continue;
      }
      return t.push({ line: S, source: l, message: "期望 gantt 声明" }), { ...pt(), errors: t };
    }
    const p = ws.exec(l);
    if (p) {
      c = p[1].trim();
      continue;
    }
    const M = bs.exec(l);
    if (M) {
      u = M[1].trim();
      continue;
    }
    const O = Ms.exec(l);
    if (O) {
      r = O[1].trim();
      continue;
    }
    const L = Cs.exec(l);
    if (L) {
      for (const Y of L[1].split(/[, ]+/).filter(Boolean)) {
        if (/^weekends?$/i.test(Y)) {
          i = !0;
          continue;
        }
        const Q = Date.parse(Y);
        if (Number.isFinite(Q)) {
          const T = new Date(Q);
          s.add(Date.UTC(T.getUTCFullYear(), T.getUTCMonth(), T.getUTCDate()));
        } else
          t.push({ line: S, source: l, message: `无法识别的 excludes 项 ${Y}` });
      }
      continue;
    }
    if (Ts.test(l)) continue;
    if (/^vert\b/i.test(l)) {
      t.push({ line: S, source: l, message: "不支持竖向布局 vert" });
      continue;
    }
    const P = $s.exec(l);
    if (P) {
      x = P[1].trim();
      continue;
    }
    const W = Ss.exec(l);
    if (W) {
      n.push({
        label: W[1].trim(),
        section: x,
        meta: Ws(W[2].split(",")),
        line: S,
        source: l
      });
      continue;
    }
    t.push({ line: S, source: l, message: "无法识别的语句" });
  }
  const o = Ds(u), f = /* @__PURE__ */ new Map(), y = [], _ = /* @__PURE__ */ new Map();
  let g, w = Number.POSITIVE_INFINITY, C = Number.NEGATIVE_INFINITY, N = 0;
  return n.forEach((k, S) => {
    var L, P, W, Y, Q, T;
    const v = ((L = k.meta.id) == null ? void 0 : L.trim()) || `task-${S}`;
    if (f.has(v)) {
      t.push({ line: k.line, source: k.source, message: `任务 id ${v} 重复` });
      return;
    }
    let l;
    if (((P = k.meta.start) == null ? void 0 : P.kind) === "date") {
      const E = vt(k.meta.start.value, o);
      if (E === null) {
        t.push({
          line: k.line,
          source: k.source,
          message: `日期 ${k.meta.start.value} 不符合 dateFormat ${u}`
        });
        return;
      }
      l = E;
    } else if (((W = k.meta.start) == null ? void 0 : W.kind) === "after") {
      const E = f.get(k.meta.start.id);
      if (!E) {
        t.push({
          line: k.line,
          source: k.source,
          message: `after 引用了未定义或尚未结算的任务 ${k.meta.start.id}`
        });
        return;
      }
      l = E.endMs;
    } else
      l = g ?? 0;
    let p;
    if (((Y = k.meta.end) == null ? void 0 : Y.kind) === "duration")
      p = l + Bs(
        k.meta.end.amount,
        k.meta.end.unit,
        l,
        i,
        s
      );
    else if (((Q = k.meta.end) == null ? void 0 : Q.kind) === "date") {
      const E = vt(k.meta.end.value, o);
      if (E === null) {
        t.push({
          line: k.line,
          source: k.source,
          message: `日期 ${k.meta.end.value} 不符合 dateFormat ${u}`
        });
        return;
      }
      p = E;
    } else
      p = l + nt.d;
    if (p < l) {
      t.push({ line: k.line, source: k.source, message: "结束时间早于开始时间" });
      return;
    }
    const M = {
      id: v,
      label: k.label,
      section: k.section,
      status: k.meta.status,
      startMs: l,
      endMs: p,
      ...((T = k.meta.start) == null ? void 0 : T.kind) === "after" ? { after: k.meta.start.id } : {}
    };
    f.set(v, M), N += 1, g = p, w = Math.min(w, l), C = Math.max(C, p);
    let O = _.get(k.section);
    O || (O = { name: k.section, tasks: [] }, _.set(k.section, O), y.push(O)), O.tasks.push(M);
  }), N === 0 ? (t.push({ line: 0, source: "", message: "没有任何任务" }), { ...pt(), errors: t }) : {
    ...c ? { title: c } : {},
    sections: y,
    startMs: w,
    endMs: C,
    ...r ? { axisFormat: r } : {},
    errors: t
  };
}
function Ot(e, t) {
  const n = new Date(e), s = (u) => String(u).padStart(2, "0"), i = t == null ? void 0 : t.trim();
  if (!i) {
    const u = n.getUTCHours() !== 0 || n.getUTCMinutes() !== 0;
    return Ot(e, u ? "%m-%d %H:%M" : "%m-%d");
  }
  return i.replace(/%[YmdHMS]/g, (u) => {
    switch (u) {
      case "%Y":
        return String(n.getUTCFullYear());
      case "%m":
        return s(n.getUTCMonth() + 1);
      case "%d":
        return s(n.getUTCDate());
      case "%H":
        return s(n.getUTCHours());
      case "%M":
        return s(n.getUTCMinutes());
      case "%S":
        return s(n.getUTCSeconds());
      default:
        return u;
    }
  });
}
const Ps = /^(?:flowchart|graph)\s+(LR|RL|TB|BT)\s*$/i, zs = /^(?:subgraph\b.*|end|direction\b.*)$/i, qs = /^(?:classDef\b.*|class\b.*|style\b.*|linkStyle\b.*)$/i;
function Ys(e) {
  var t;
  return ((t = e.split(`
`).find((n) => n.trim() && !n.trim().startsWith("%%"))) == null ? void 0 : t.trim()) ?? "";
}
function Wt(e) {
  return Ps.test(Ys(e));
}
function Us(e) {
  return e.replace(/<br\s*\/?\s*>/gi, " · ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/^\s*(["'])([\s\S]*)\1\s*$/, "$2").replace(/\s+/g, " ").trim();
}
function Fs(e) {
  return e.replace(
    /-\.\s*(?:"([^"]*)"|([^\.]*?))?\s*\.->/g,
    (n, s, i) => `-->|${(s ?? i ?? "").trim()}|`
  ).replace(
    /(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))/g,
    (n) => n[0] + Us(n.slice(1, -1)) + n[n.length - 1]
  );
}
function Xs(e) {
  const t = e.split(`
`);
  if (!Wt(e)) return null;
  const n = [];
  for (const i of t) {
    const u = i.trim();
    if (!u || u.startsWith("%%")) {
      n.push("");
      continue;
    }
    if (zs.test(u)) {
      if (/^direction\b/i.test(u)) return null;
      n.push("");
      continue;
    }
    if (qs.test(u)) {
      n.push("");
      continue;
    }
    if (/^(?:flowchart|graph)\s+/i.test(u)) {
      n.push(u.replace(/^flowchart/i, "graph"));
      continue;
    }
    n.push(Fs(u));
  }
  const s = tt(n.join(`
`));
  return s.nodes.length > 0 && s.errors.length === 0 ? s : null;
}
const Ht = /^sequenceDiagram\s*$/i, Gs = /^(participant|actor)\s+([^\s:]+)(?:\s+as\s+(.+))?$/i, Ks = /^note\s+(left of|right of|over)\s+([^:]+?)\s*:\s*(.*)$/i, Vs = /^(activate|deactivate)\s+([^\s:]+)$/i, js = /^(loop|alt|opt|par|critical|break)\b\s*(.*)$/i, Qs = /^(else|and)\b\s*(.*)$/i, Zs = /^end\s*$/i, Js = /^autonumber\s*$/i, yt = /^(.+?)\s*(-->>|->>|--\)|-\)|--x|-x|-->|->)\s*([+-])?\s*(.+?)$/;
function eo(e) {
  var n;
  const t = (n = e.split(`
`).find((s) => s.trim() && !s.trim().startsWith("%%"))) == null ? void 0 : n.trim();
  return !!t && Ht.test(t);
}
function Ae(e, t, n = "participant") {
  const s = t.trim();
  return s && (e.actorIds.has(s) || (e.actorIds.add(s), e.actors.push({ id: s, label: s, kind: n })), s);
}
function to(e) {
  const t = e.startsWith("--");
  return e.endsWith(">>") ? t ? "dashed-arrow" : "solid-arrow" : e.endsWith(")") ? t ? "dashed-open" : "solid-open" : e.endsWith("x") ? t ? "dashed-cross" : "solid-cross" : t ? "dashed-line" : "solid-line";
}
function no(e) {
  const t = {
    actors: [],
    actorIds: /* @__PURE__ */ new Set(),
    items: [],
    errors: [],
    autonumber: !1,
    counter: 0,
    openBlocks: []
  }, n = e.split(`
`);
  let s = !1;
  for (let i = 0; i < n.length; i++) {
    const u = i + 1, r = n[i].indexOf("%%"), c = (r >= 0 ? n[i].slice(0, r) : n[i]).trim();
    if (c) {
      if (!s) {
        if (Ht.test(c)) {
          s = !0;
          continue;
        }
        return t.errors.push({ line: u, source: c, message: "期望 sequenceDiagram 声明" }), { ..._t(t), errors: t.errors };
      }
      so(t, c) || t.errors.push({ line: u, source: c, message: "无法识别的语句" });
    }
  }
  return t.openBlocks.length > 0 && t.errors.push({
    line: n.length,
    source: "",
    message: `分组 ${t.openBlocks.map((i) => i.block).join(", ")} 缺少 end`
  }), _t(t);
}
function _t(e) {
  return {
    ...e.title ? { title: e.title } : {},
    actors: [...e.actors],
    items: [...e.items],
    errors: [...e.errors]
  };
}
function so(e, t) {
  var x;
  if (Js.test(t))
    return e.autonumber = !0, !0;
  if (Zs.test(t))
    return e.openBlocks.length === 0 ? !1 : (e.openBlocks.pop(), e.items.push({ kind: "block-end" }), !0);
  const n = Gs.exec(t);
  if (n) {
    const m = n[1].toLowerCase() === "actor" ? "actor" : "participant", o = n[2], f = ((x = n[3]) == null ? void 0 : x.trim()) || o;
    Ae(e, o, m);
    const y = e.actors.find((_) => _.id === o);
    return y && (y.label = f, y.kind = m), !0;
  }
  const s = Ks.exec(t);
  if (s) {
    const m = s[1].toLowerCase().replace(/\s+/g, " "), o = s[2].split(",").map((f) => Ae(e, f)).filter(Boolean);
    return e.items.push({ kind: "note", placement: m, actors: o, label: s[3].trim() }), !0;
  }
  const i = Vs.exec(t);
  if (i) {
    const m = Ae(e, i[2]);
    return e.items.push({
      kind: i[1].toLowerCase() === "activate" ? "activate" : "deactivate",
      actor: m
    }), !0;
  }
  const u = js.exec(t);
  if (u) {
    const m = {
      kind: "block",
      block: u[1].toLowerCase(),
      label: u[2].trim()
    };
    return e.items.push(m), e.openBlocks.push(m), !0;
  }
  const r = Qs.exec(t);
  if (r) {
    const m = e.openBlocks[e.openBlocks.length - 1], o = r[1].toLowerCase() === "else" ? "alt" : "par";
    return !m || m.block !== o ? !1 : (e.items.push({ kind: "block-split", label: r[2].trim() }), !0);
  }
  if (yt.exec(t)) {
    const m = t.lastIndexOf(":"), o = m >= 0 ? t.slice(0, m) : t, f = m >= 0 ? t.slice(m + 1).trim() : "", y = yt.exec(o);
    if (!y) return !1;
    const _ = Ae(e, y[1]), g = Ae(e, y[4]);
    if (!_ || !g) return !1;
    const w = {
      kind: "message",
      from: _,
      to: g,
      label: f,
      arrow: to(y[2]),
      self: _ === g
    };
    return e.autonumber && (w.number = ++e.counter), y[3] === "+" && (w.activate = !0), y[3] === "-" && (w.deactivate = !0), e.items.push(w), w.activate && e.items.push({ kind: "activate", actor: g }), w.deactivate && e.items.push({ kind: "deactivate", actor: g }), !0;
  }
  const d = /^title\s+(.*)$/i.exec(t);
  return d ? (e.title = d[1].trim(), !0) : !1;
}
function oo(e) {
  if (Wt(e)) {
    const t = Xs(e);
    return t ? { type: "flowchart", diagram: { kind: "flowchart", graph: t } } : { type: "flowchart" };
  }
  if (eo(e)) {
    const t = no(e);
    return t.errors.length === 0 && t.actors.length > 0 ? { type: "sequence", diagram: { kind: "sequence", graph: t } } : { type: "sequence" };
  }
  if (Es(e)) {
    const t = Hs(e);
    return t.errors.length === 0 && t.sections.length > 0 ? { type: "gantt", diagram: { kind: "gantt", graph: t } } : { type: "gantt" };
  }
  return { type: "other" };
}
function Pt(e, t) {
  const n = ee(0);
  let s = null;
  function i() {
    const u = e.value;
    if (!u) return;
    const r = getComputedStyle(u), c = Number.parseFloat(r.paddingLeft) || 0, d = Number.parseFloat(r.paddingRight) || 0, x = u.clientWidth - c - d;
    x > 0 && (n.value = x);
  }
  return wt(() => {
    i(), !(typeof ResizeObserver > "u" || !e.value) && (s = new ResizeObserver(() => i()), s.observe(e.value));
  }), Ee(() => {
    s == null || s.disconnect(), s = null;
  }), {
    width: j(() => Math.max(t.minWidth, n.value)),
    measured: n
  };
}
const ao = { class: "nm-seq" }, io = {
  key: 0,
  class: "nm-seq__title"
}, lo = ["width", "height"], ro = ["id"], co = ["id"], uo = ["id"], ho = ["x1", "y1", "x2", "y2"], fo = ["y", "width", "height"], mo = ["d"], po = ["y1", "x2", "y2"], go = ["d", "marker-end"], vo = ["x", "y", "height"], xo = {
  key: 0,
  class: "nm-seq__number"
}, Te = 24, Fe = 40, Xe = 12, yo = 34, _o = 52, kt = 46, ko = 26, $o = 28, wo = 104, $t = 32, bo = 220, Ge = 10, Mo = 360, Co = 13, To = /* @__PURE__ */ _e({
  __name: "DocSequenceChart",
  props: {
    graph: {},
    title: {}
  },
  setup(e) {
    const t = e, n = et("nm-seq"), s = ee(null), { width: i } = Pt(s, { minWidth: Mo });
    function u(x, m = Co) {
      let o = 0;
      for (const f of x)
        o += /[\u3000-\u9fff\uff00-\uffef]/.test(f) ? m : m * 0.55;
      return o;
    }
    const r = j(() => {
      const x = t.graph.actors, m = i.value, o = Math.max(1, x.length), f = (m - Te * 2 - $t * (o - 1)) / o, y = Math.min(bo, Math.max(wo, Math.round(f))), _ = y + $t, g = x.map((L, P) => ({
        id: L.id,
        label: L.label,
        actor: L.kind === "actor",
        x: Te + y / 2 + P * _,
        width: y
      })), w = new Map(g.map((L) => [L.id, L])), C = Math.max(
        m,
        Te * 2 + y + Math.max(0, x.length - 1) * _,
        y + Te * 2
      ), N = [], k = [], S = [], v = [], l = /* @__PURE__ */ new Map(), p = [];
      let M = Xe + Fe + ko;
      t.graph.items.forEach((L, P) => {
        switch (L.kind) {
          case "message": {
            const W = L.self ? _o : yo, Y = w.get(L.from), Q = w.get(L.to), T = M + W / 2;
            if (Y && Q)
              if (L.self) {
                const E = Y.x + 40;
                N.push({
                  key: P,
                  message: L,
                  path: `M ${Y.x + 6},${T - 11} L ${E},${T - 11} L ${E},${T + 11} L ${Y.x + 6},${T + 11}`,
                  labelX: Y.x + 52,
                  labelY: T - 8
                });
              } else
                N.push({
                  key: P,
                  message: L,
                  path: `M ${Y.x},${T} L ${Q.x},${T}`,
                  labelX: (Y.x + Q.x) / 2,
                  labelY: T - 17
                });
            M += W;
            break;
          }
          case "note": {
            const W = L.actors.map((Y) => {
              var Q;
              return (Q = w.get(Y)) == null ? void 0 : Q.x;
            }).filter((Y) => Y !== void 0);
            if (W.length > 0) {
              const Y = Math.max(120, Math.min(240, u(L.label) + 28)), Q = W[0], T = W[W.length - 1];
              let E = (Q + T) / 2 - Y / 2;
              L.placement === "left of" && (E = Q - Y - 12), L.placement === "right of" && (E = T + 12), k.push({
                key: P,
                label: L.label,
                // 备注框不越出舞台左右边界（左侧 note 撞墙会看不清）
                x: Math.min(Math.max(Te / 3, E), Math.max(Te / 3, C - Y - Te / 3)),
                y: M,
                w: Y,
                h: kt - 10
              });
            }
            M += kt;
            break;
          }
          case "block": {
            const W = {
              key: P,
              label: L.label || L.block,
              y: M - 4,
              h: 0,
              splits: []
            };
            S.push(W), p.push(W);
            break;
          }
          case "block-split": {
            const W = p[p.length - 1];
            W && W.splits.push({ label: L.label, y: M });
            break;
          }
          case "block-end": {
            const W = p.pop();
            W && (W.h = M - W.y - 4);
            break;
          }
          case "activate": {
            const W = l.get(L.actor) ?? [];
            W.push(M), l.set(L.actor, W);
            break;
          }
          case "deactivate": {
            const Y = (l.get(L.actor) ?? []).pop(), Q = w.get(L.actor);
            Y !== void 0 && Q && v.push({
              key: `${L.actor}-${Y}`,
              x: Q.x - Ge / 2,
              y: Y,
              h: Math.max(14, M - Y)
            });
            break;
          }
        }
      });
      const O = M + 4;
      for (const [L, P] of l) {
        const W = w.get(L);
        for (const Y of P)
          W && v.push({
            key: `${L}-${Y}-open`,
            x: W.x - Ge / 2,
            y: Y,
            h: Math.max(14, O - Y)
          });
      }
      return {
        columns: g,
        messages: N,
        notes: k,
        frames: S,
        activations: v,
        width: C,
        height: M + $o,
        headY: Xe,
        lifelineTop: Xe + Fe,
        lifelineBottom: O,
        scrollable: C > m
      };
    });
    function c(x) {
      switch (x.arrow) {
        case "solid-arrow":
        case "dashed-arrow":
          return `url(#${n}-arrow)`;
        case "solid-open":
        case "dashed-open":
          return `url(#${n}-open)`;
        case "solid-cross":
        case "dashed-cross":
          return `url(#${n}-cross)`;
        default:
          return;
      }
    }
    function d(x) {
      return x.arrow.startsWith("dashed");
    }
    return (x, m) => (b(), R("figure", ao, [
      e.title ? (b(), R("figcaption", io, K(e.title), 1)) : ne("", !0),
      A("div", {
        ref_key: "stageRef",
        ref: s,
        class: te(["nm-seq__scroll", { "nm-seq__scroll--x": r.value.scrollable }])
      }, [
        A("div", {
          class: "nm-seq__stage",
          style: re({ width: `${r.value.width}px`, height: `${r.value.height}px` })
        }, [
          (b(), R("svg", {
            class: "nm-seq__svg",
            width: r.value.width,
            height: r.value.height,
            "aria-hidden": "true"
          }, [
            A("defs", null, [
              A("marker", {
                id: `${z(n)}-arrow`,
                viewBox: "0 0 10 10",
                refX: "9",
                refY: "5",
                markerWidth: "7",
                markerHeight: "7",
                orient: "auto-start-reverse"
              }, [...m[0] || (m[0] = [
                A("path", {
                  class: "nm-seq__marker-fill",
                  d: "M 0 0 L 10 5 L 0 10 z"
                }, null, -1)
              ])], 8, ro),
              A("marker", {
                id: `${z(n)}-open`,
                viewBox: "0 0 10 10",
                refX: "9",
                refY: "5",
                markerWidth: "7",
                markerHeight: "7",
                orient: "auto-start-reverse"
              }, [...m[1] || (m[1] = [
                A("path", {
                  class: "nm-seq__marker-open",
                  d: "M 0 0 L 10 5 L 0 10"
                }, null, -1)
              ])], 8, co),
              A("marker", {
                id: `${z(n)}-cross`,
                viewBox: "0 0 10 10",
                refX: "5",
                refY: "5",
                markerWidth: "7",
                markerHeight: "7",
                orient: "auto"
              }, [...m[2] || (m[2] = [
                A("path", {
                  class: "nm-seq__marker-cross",
                  d: "M 0 0 L 10 10 M 10 0 L 0 10"
                }, null, -1)
              ])], 8, uo)
            ]),
            (b(!0), R(V, null, Z(r.value.columns, (o) => (b(), R("line", {
              key: `life-${o.id}`,
              class: "nm-seq__lifeline",
              x1: o.x,
              y1: r.value.lifelineTop,
              x2: o.x,
              y2: r.value.lifelineBottom
            }, null, 8, ho))), 128)),
            (b(!0), R(V, null, Z(r.value.frames, (o) => (b(), R("g", {
              key: `frame-${o.key}`
            }, [
              A("rect", {
                class: "nm-seq__frame",
                x: "6",
                y: o.y,
                width: r.value.width - 12,
                height: o.h,
                rx: "8"
              }, null, 8, fo),
              A("path", {
                class: "nm-seq__frame-tab",
                d: `M 6,${o.y + 10} a 8,8 0 0 1 8,-8 l 132,0 l 0,20 l -132,0 a 8,8 0 0 1 -8,-8 z`
              }, null, 8, mo),
              (b(!0), R(V, null, Z(o.splits, (f, y) => (b(), R("line", {
                key: `split-${o.key}-${y}`,
                class: "nm-seq__frame-split",
                x1: "6",
                y1: f.y,
                x2: r.value.width - 6,
                y2: f.y
              }, null, 8, po))), 128))
            ]))), 128)),
            (b(!0), R(V, null, Z(r.value.messages, (o) => (b(), R("path", {
              key: `msg-${o.key}`,
              class: te(["nm-seq__message", { "nm-seq__message--dashed": d(o.message) }]),
              d: o.path,
              "marker-end": c(o.message)
            }, null, 10, go))), 128)),
            (b(!0), R(V, null, Z(r.value.activations, (o) => (b(), R("rect", {
              key: `act-${o.key}`,
              class: "nm-seq__activation",
              x: o.x,
              y: o.y,
              width: Ge,
              height: o.h,
              rx: "3"
            }, null, 8, vo))), 128))
          ], 8, lo)),
          (b(!0), R(V, null, Z(r.value.columns, (o) => (b(), R("div", {
            key: `head-${o.id}`,
            class: te(["nm-seq__head", { "nm-seq__head--actor": o.actor }]),
            style: re({
              left: `${o.x - o.width / 2}px`,
              top: `${r.value.headY}px`,
              width: `${o.width}px`,
              height: `${Fe}px`
            })
          }, K(o.label), 7))), 128)),
          (b(!0), R(V, null, Z(r.value.frames, (o) => (b(), R(V, {
            key: `flabel-${o.key}`
          }, [
            A("div", {
              class: "nm-seq__frame-label",
              style: re({ left: "20px", top: `${o.y + 4}px` })
            }, K(o.label), 5),
            (b(!0), R(V, null, Z(o.splits, (f, y) => (b(), R("div", {
              key: `slabel-${o.key}-${y}`,
              class: "nm-seq__split-label",
              style: re({ left: "20px", top: `${f.y + 2}px` })
            }, " [" + K(f.label) + "] ", 5))), 128))
          ], 64))), 128)),
          (b(!0), R(V, null, Z(r.value.messages.filter((o) => o.message.label), (o) => (b(), R("div", {
            key: `mlabel-${o.key}`,
            class: te(["nm-seq__message-label", { "nm-seq__message-label--self": o.message.self }]),
            style: re({ left: `${o.labelX}px`, top: `${o.labelY}px` })
          }, [
            o.message.number ? (b(), R("span", xo, K(o.message.number), 1)) : ne("", !0),
            oe(" " + K(o.message.label), 1)
          ], 6))), 128)),
          (b(!0), R(V, null, Z(r.value.notes, (o) => (b(), R("div", {
            key: `note-${o.key}`,
            class: "nm-seq__note",
            style: re({
              left: `${o.x}px`,
              top: `${o.y + 2}px`,
              width: `${o.w}px`,
              height: `${o.h}px`
            })
          }, K(o.label), 5))), 128))
        ], 4)
      ], 2)
    ]));
  }
}), So = /* @__PURE__ */ Re(To, [["__scopeId", "data-v-fcf8b4b8"]]), Eo = {
  key: 0,
  class: "nm-gantt__title"
}, Ro = ["width", "height"], Lo = ["x1", "y1", "x2", "y2"], Do = ["x1", "y1", "x2", "y2"], No = ["x1", "y1", "x2", "y2"], Ao = ["d"], Ke = 12, Ve = 32, je = 30, Io = 26, Bo = 120, Oo = 220, Wo = 260, Ho = 400, Po = 13, we = 864e5, zo = /* @__PURE__ */ _e({
  __name: "DocGanttChart",
  props: {
    graph: {}
  },
  setup(e) {
    const t = e, n = ee(null), { width: s } = Pt(n, { minWidth: Ho });
    function i(x, m = Po) {
      let o = 0;
      for (const f of x)
        o += /[\u3000-\u9fff\uff00-\uffef]/.test(f) ? m : m * 0.55;
      return o;
    }
    function u(x) {
      return x <= 2 * we ? { stepMs: 6 * 36e5, align: "hour" } : x <= 21 * we ? { stepMs: we, align: "day" } : x <= 120 * we ? { stepMs: 7 * we, align: "week" } : { stepMs: 30 * we, align: "month" };
    }
    function r(x, m) {
      const o = new Date(x);
      switch (m) {
        case "hour":
          return Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate(), o.getUTCHours());
        case "day":
          return Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate());
        case "week":
          return Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate()) - (o.getUTCDay() + 6) % 7 * we;
        case "month":
          return Date.UTC(o.getUTCFullYear(), o.getUTCMonth(), 1);
      }
    }
    const c = j(() => {
      const x = t.graph, m = s.value, f = x.sections.flatMap((T) => T.tasks).reduce((T, E) => Math.max(T, i(E.label)), 0), y = Math.min(Oo, Math.max(Bo, Math.round(f + 40))), _ = x.endMs - x.startMs, g = _ > 0 ? _ : we, w = x.startMs - g * 0.02, C = (_ > 0 ? x.endMs : x.startMs + we) + g * 0.02, N = Math.max(1, C - w), k = Math.max(Wo, m - y - Ke), S = (T) => y + (T - w) / N * k, v = [], l = [];
      let p = Ve + 2;
      for (const T of x.sections) {
        const E = { name: T.name, y: p, tasks: [] };
        v.push(E), p += Io;
        for (const H of T.tasks) {
          E.tasks.push({ task: H, y: p });
          const U = S(H.startMs), X = H.status === "milestone" || H.endMs === H.startMs, D = Math.max(X ? 14 : 6, S(H.endMs) - U);
          l.push({
            task: H,
            x: X ? U - 7 : U,
            w: X ? 14 : D,
            y: p,
            h: je,
            milestone: X
          }), p += je;
        }
      }
      const M = new Map(l.map((T) => [T.task.id, T])), O = [];
      for (const T of l) {
        if (!T.task.after) continue;
        const E = M.get(T.task.after);
        if (!E) continue;
        const H = E.milestone ? E.x + 7 : E.x + E.w, U = E.y + E.h / 2, X = T.milestone ? T.x + 7 : T.x, D = T.y + T.h / 2, a = H + 8;
        O.push({
          key: `${E.task.id}->${T.task.id}`,
          path: X >= a ? `M ${H},${U} L ${a},${U} L ${a},${D} L ${X},${D}` : `M ${H},${U} L ${H + 4},${U} L ${H + 4},${D - 6} L ${X - 6},${D - 6} L ${X - 6},${D} L ${X},${D}`
        });
      }
      const { stepMs: L, align: P } = u(N), W = [];
      for (let T = r(w, P); T <= C && W.length < 200; T += L) {
        const E = S(T);
        E < y - 1 || W.push({ x: E, label: Ot(T, x.axisFormat) });
      }
      const Y = Date.now(), Q = Y >= w && Y <= C ? S(Y) : void 0;
      return {
        leftWidth: y,
        ticks: W,
        rows: v,
        bars: l,
        deps: O,
        todayX: Q,
        width: y + k + Ke,
        height: p + 12,
        axisY: Ve,
        gridTop: Ve,
        gridBottom: p - 2
      };
    });
    function d(x) {
      return `nm-gantt__bar--${x.status}`;
    }
    return (x, m) => (b(), R("figure", {
      class: te(["nm-gantt", { "nm-gantt--titled": !!e.graph.title }])
    }, [
      e.graph.title ? (b(), R("figcaption", Eo, K(e.graph.title), 1)) : ne("", !0),
      A("div", {
        ref_key: "stageRef",
        ref: n,
        class: "nm-gantt__scroll"
      }, [
        A("div", {
          class: "nm-gantt__stage",
          style: re({ width: `${c.value.width}px`, height: `${c.value.height}px` })
        }, [
          (b(), R("svg", {
            class: "nm-gantt__svg",
            width: c.value.width,
            height: c.value.height,
            "aria-hidden": "true"
          }, [
            (b(!0), R(V, null, Z(c.value.ticks, (o, f) => (b(), R("line", {
              key: `grid-${f}`,
              class: "nm-gantt__grid",
              x1: o.x,
              y1: c.value.gridTop,
              x2: o.x,
              y2: c.value.gridBottom
            }, null, 8, Lo))), 128)),
            A("line", {
              class: "nm-gantt__axis",
              x1: c.value.leftWidth,
              y1: c.value.axisY,
              x2: c.value.width - Ke,
              y2: c.value.axisY
            }, null, 8, Do),
            c.value.todayX !== void 0 ? (b(), R("line", {
              key: 0,
              class: "nm-gantt__today",
              x1: c.value.todayX,
              y1: c.value.gridTop,
              x2: c.value.todayX,
              y2: c.value.gridBottom
            }, null, 8, No)) : ne("", !0),
            (b(!0), R(V, null, Z(c.value.deps, (o) => (b(), R("path", {
              key: o.key,
              class: "nm-gantt__dep",
              d: o.path
            }, null, 8, Ao))), 128))
          ], 8, Ro)),
          (b(!0), R(V, null, Z(c.value.ticks, (o, f) => (b(), R("div", {
            key: `tick-${f}`,
            class: "nm-gantt__tick",
            style: re({ left: `${o.x}px`, top: "8px" })
          }, K(o.label), 5))), 128)),
          (b(!0), R(V, null, Z(c.value.rows, (o, f) => (b(), R(V, {
            key: `row-${f}`
          }, [
            o.name ? (b(), R("div", {
              key: 0,
              class: "nm-gantt__section",
              style: re({ left: "4px", top: `${o.y}px`, width: `${c.value.leftWidth - 8}px` })
            }, K(o.name), 5)) : ne("", !0),
            (b(!0), R(V, null, Z(o.tasks, (y) => (b(), R("div", {
              key: `task-${y.task.id}`,
              class: "nm-gantt__task-label",
              style: re({
                left: "12px",
                top: `${y.y}px`,
                width: `${c.value.leftWidth - 18}px`,
                height: `${je}px`
              })
            }, K(y.task.label), 5))), 128))
          ], 64))), 128)),
          (b(!0), R(V, null, Z(c.value.bars, (o) => (b(), R("div", {
            key: `bar-${o.task.id}`,
            class: te(["nm-gantt__bar", [d(o.task), { "nm-gantt__bar--milestone": o.milestone }]]),
            style: re({
              left: `${o.x}px`,
              top: `${o.y + 5}px`,
              width: `${o.w}px`,
              height: `${o.h - 10}px`
            })
          }, null, 6))), 128)),
          (b(!0), R(V, null, Z(c.value.bars, (o) => (b(), R(V, {
            key: `bar-label-${o.task.id}`
          }, [
            o.milestone ? (b(), R("div", {
              key: 0,
              class: "nm-gantt__milestone-label",
              style: re({ left: `${o.x + 16}px`, top: `${o.y + o.h / 2}px` })
            }, K(o.task.label), 5)) : ne("", !0)
          ], 64))), 128))
        ], 4)
      ], 512)
    ], 2));
  }
}), qo = /* @__PURE__ */ Re(zo, [["__scopeId", "data-v-b1ce83d6"]]), Yo = { class: "neumorphism-markdown-body" }, Uo = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, Fo = { class: "neumorphism-markdown-error-title" }, Xo = { class: "neumorphism-markdown-error-msg" }, Go = ["innerHTML"], Ko = ["aria-label"], Vo = { class: "neumorphism-toc-mobile-header" }, jo = { class: "neumorphism-toc-mobile-title" }, Qo = ["aria-label"], zt = /* @__PURE__ */ _e({
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
    const n = e, s = t, i = ee(null), u = ee(!1), { t: r } = Ye(), { toc: c, tocTree: d, makeUniqueId: x } = is(st(n, "content"));
    function m(D) {
      l(D), u.value = !1;
    }
    const o = new Rt.Renderer();
    o.code = ({ text: D, lang: a }) => a === "mermaid" ? ks(D) : a === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${xe(D)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${xe(a || "text")}"><pre><code>${xe(D)}</code></pre></div>`, o.codespan = ({ text: D }) => `<code class="inline-code">${xe(D)}</code>`, o.image = ({ href: D, title: a, text: h }) => `<img src="${D}" alt="${xe(h)}" title="${xe(a || "")}" loading="lazy" />`, o.listitem = function({ tokens: D, task: a, checked: h }) {
      if (a) {
        const $ = this.parser.parse(D.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${h ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${$}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(D)}</li>`;
    };
    const f = new Gt({ gfm: !0, breaks: !1 });
    f.use({ extensions: ms });
    const y = ee(null), _ = ee("");
    let g = null, w = !1, C = !1;
    function N() {
      w || (w = !0, import("dompurify").then((D) => {
        const a = D == null ? void 0 : D.default;
        a && typeof a.sanitize == "function" && (g = (h) => a.sanitize(h, {
          ADD_ATTR: ["data-code", "data-heading-id", "data-lang", "target"]
        }), k());
      }).catch(() => {
        C || (C = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function k() {
      y.value = null;
      try {
        const D = c.value.map((I) => I.id);
        let a = 0;
        const h = Object.create(o);
        h.heading = ({ tokens: I, depth: F }) => {
          const G = S(I), se = D[a++] ?? x(G);
          return `<h${F} id="${se}"><a href="#" data-heading-id="${se}" class="heading-anchor" aria-hidden="true">#</a>${G}</h${F}>`;
        };
        const $ = f.parse(n.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: h
        });
        _.value = g ? g($) : $;
      } catch (D) {
        y.value = D.message || "Unknown error rendering markdown", _.value = "";
      }
    }
    function S(D) {
      return D.map((a) => {
        const h = a;
        return h.text ? String(h.text) : h.tokens ? S(h.tokens) : "";
      }).join("");
    }
    N(), ve(() => n.content, k, { immediate: !0 });
    const { activeHeading: v, scrollToHeading: l } = hn({
      content: i,
      scrollContainer: st(n, "scrollContainer"),
      watchSource: () => _.value
    }), p = ee(/* @__PURE__ */ new Set());
    ve(
      () => n.content,
      () => {
        p.value = /* @__PURE__ */ new Set();
      }
    );
    function M() {
      E();
    }
    ve(_, () => {
      Y(), ye(O);
    }), wt(O);
    function O() {
      M(), H(), U(), xs(i.value), Q();
    }
    let L = [], P = null;
    const W = Yt();
    function Y() {
      const D = /* @__PURE__ */ new Map();
      for (const a of L) {
        const h = D.get(a.key) ?? [];
        h.push({ rootEl: a.rootEl, ownerContainer: a.ownerContainer }), D.set(a.key, h);
      }
      L = [], P = D;
    }
    function Q() {
      if (P) {
        for (const D of P.values())
          for (const a of D)
            Be(null, a.ownerContainer);
        P = null;
      }
    }
    function T(D, a, h) {
      const $ = P == null ? void 0 : P.get(a), I = $ == null ? void 0 : $.shift();
      if ($ && $.length === 0 && (P == null || P.delete(a)), D.innerHTML = "", I) {
        D.appendChild(I.rootEl), L.push({
          key: a,
          rootEl: I.rootEl,
          ownerContainer: I.ownerContainer
        });
        return;
      }
      const F = h();
      F.appContext = (W == null ? void 0 : W.appContext) ?? null, Be(F, D);
      const G = D.firstElementChild;
      G && L.push({ key: a, rootEl: G, ownerContainer: D });
    }
    function E() {
      var a;
      if (!i.value) return;
      const D = i.value.querySelectorAll(".mermaid-diagram");
      for (const h of D) {
        if (h.getAttribute("data-mermaid-state") === "done") continue;
        const $ = ((a = h.querySelector("pre code")) == null ? void 0 : a.textContent) ?? "", { type: I, diagram: F } = oo($);
        if (h.setAttribute(_s, I), !F) {
          mt(h, "error");
          continue;
        }
        const G = F.kind === "flowchart" ? De(Je, { graph: F.graph, height: "480px", editable: !1 }) : F.kind === "sequence" ? De(So, { graph: F.graph }) : De(qo, { graph: F.graph });
        T(h, `mermaid-${F.kind}:${$}`, () => G), mt(h, "done"), h.setAttribute("data-mermaid-renderer", "ui-frame");
      }
    }
    function H() {
      if (!i.value) return;
      i.value.querySelectorAll(".prodoc-flow-diagram").forEach((a, h) => {
        var F;
        const $ = ((F = a.querySelector("pre code")) == null ? void 0 : F.textContent) ?? a.textContent ?? "", I = tt($);
        I.nodes.length !== 0 && T(
          a,
          `flow:${$}`,
          () => De(Je, {
            graph: I,
            height: "420px",
            editable: n.flowEditable,
            onNavigate: (G) => s("docLink", G),
            onNodeMove: (G) => s("flowNodeMove", { ...G, source: $, blockIndex: h })
          })
        );
      });
    }
    function U() {
      var a;
      if (!i.value) return;
      const D = i.value.querySelectorAll(".doc-code-block-mount");
      for (const h of D) {
        const $ = ((a = h.querySelector("pre code")) == null ? void 0 : a.textContent) ?? h.textContent ?? "", I = h.dataset.lang || "text";
        T(h, `code:${I}:${$}`, () => De(qn, { code: $, lang: I }));
      }
    }
    function X(D) {
      const a = D.target, h = a.closest(".heading-anchor");
      if (h) {
        const I = h.dataset.headingId;
        I && (D.preventDefault(), l(I));
        return;
      }
      const $ = a.closest("a");
      if ($) {
        const I = $.getAttribute("href");
        I && !I.startsWith("//") && (I.startsWith("/") || I.startsWith(".") || I.endsWith(".md")) && (D.preventDefault(), s("docLink", I));
      }
    }
    return Ee(() => {
      for (const D of L)
        Be(null, D.ownerContainer);
      if (L = [], P) {
        for (const D of P.values())
          for (const a of D)
            Be(null, a.ownerContainer);
        P = null;
      }
    }), (D, a) => (b(), R("div", {
      class: te(`neumorphism-markdown ${n.className}`)
    }, [
      A("div", Yo, [
        y.value ? (b(), R("div", Uo, [
          A("p", Fo, [
            B(J, {
              name: "warning",
              size: "md"
            }),
            a[5] || (a[5] = oe(" 渲染错误 ", -1))
          ]),
          A("pre", Xo, K(y.value), 1)
        ])) : (b(), R("div", {
          key: 1,
          ref_key: "contentRef",
          ref: i,
          class: "neumorphism-markdown-content",
          onClick: X,
          innerHTML: _.value
        }, null, 8, Go))
      ]),
      e.showToc && z(c).length > 0 ? (b(), ge(rt, {
        key: 0,
        "collapsed-groups": p.value,
        "onUpdate:collapsedGroups": a[0] || (a[0] = (h) => p.value = h),
        items: z(d),
        "active-id": z(v),
        onSelect: z(l)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : ne("", !0),
      e.showToc && z(c).length > 0 ? (b(), R("button", {
        key: 1,
        class: te(["neumorphism-toc-mobile-btn", { active: u.value }]),
        "aria-label": z(r)("markdownTocToggle"),
        onClick: a[1] || (a[1] = (h) => u.value = !u.value)
      }, [
        B(J, {
          name: "list",
          size: "2xl"
        })
      ], 10, Ko)) : ne("", !0),
      B(bt, { name: "neumorphism-toc-drawer" }, {
        default: q(() => [
          e.showToc && z(c).length > 0 && u.value ? (b(), R("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: a[4] || (a[4] = Ut((h) => u.value = !1, ["self"]))
          }, [
            B(Me, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: q(() => [
                A("div", Vo, [
                  A("span", jo, [
                    B(J, {
                      name: "list",
                      size: "sm"
                    }),
                    oe(" " + K(z(r)("markdownTocLabel")), 1)
                  ]),
                  A("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": z(r)("markdownTocClose"),
                    onClick: a[2] || (a[2] = (h) => u.value = !1)
                  }, [
                    B(J, {
                      name: "close",
                      size: "sm"
                    })
                  ], 8, Qo)
                ]),
                B(rt, {
                  "collapsed-groups": p.value,
                  "onUpdate:collapsedGroups": a[3] || (a[3] = (h) => p.value = h),
                  items: z(d),
                  "active-id": z(v),
                  framed: !1,
                  onSelect: m
                }, null, 8, ["collapsed-groups", "items", "active-id"])
              ]),
              _: 1
            })
          ])) : ne("", !0)
        ]),
        _: 1
      })
    ], 2));
  }
}), qt = /* @__PURE__ */ _e({
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
    }, s = j(() => n[t.name] ?? "file");
    return (i, u) => (b(), ge(J, {
      name: s.value,
      size: t.size
    }, null, 8, ["name", "size"]));
  }
}), Zo = { class: "neumorphism-header-brand" }, Jo = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, ea = { class: "neumorphism-header-search" }, ta = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, na = { class: "neumorphism-search-list" }, sa = ["onClick"], oa = { class: "neumorphism-search-title" }, aa = { class: "neumorphism-search-path" }, ia = {
  key: 0,
  class: "neumorphism-sider-content"
}, la = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, ra = { class: "neumorphism-doc-header" }, ca = { class: "neumorphism-doc-title" }, ua = { class: "neumorphism-doc-meta" }, da = { class: "neumorphism-doc-body" }, ha = {
  key: 1,
  class: "neumorphism-empty-state"
}, fa = { class: "neumorphism-doc-empty-icon" }, ma = /* @__PURE__ */ _e({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: i,
      selectedKeys: u,
      expandedKeys: r,
      treeData: c,
      displayNode: d,
      themeModel: x,
      searchQuery: m,
      searchResults: o,
      docTree: f,
      handleTreeSelect: y,
      handleDocLink: _,
      handleSearchSelect: g
    } = Dt({ root: n.root, initialPath: n.initialPath });
    function w(S) {
      _(s, S);
    }
    const C = ee("doc"), N = j(
      () => d.value ? lt(d.value) : null
    );
    ve(d, () => {
      C.value = "doc";
    });
    function k(S) {
      const v = f.value.findByPath(S) ?? f.value.findByPath(`/${S}`) ?? f.value.findByPath(S.replace(/^\//, ""));
      v && (_(s, v.path), lt(v) || (C.value = "doc"));
    }
    return (S, v) => (b(), R("div", {
      class: te(`neumorphism-doc-viewer ${n.className}`)
    }, [
      B(Mt, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": q(() => [
          A("span", Zo, [
            B(J, {
              name: "book",
              size: "md"
            }),
            v[7] || (v[7] = oe(" Doc Viewer", -1))
          ])
        ]),
        "header-right": q(() => [
          A("div", Jo, [
            B(le, {
              size: "small",
              variant: C.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": C.value === "doc",
              onClick: v[0] || (v[0] = (l) => C.value = "doc")
            }, {
              default: q(() => [
                B(J, {
                  name: "file-text",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                v[8] || (v[8] = oe(" 文档 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            B(le, {
              size: "small",
              variant: C.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": C.value === "canvas",
              disabled: !N.value,
              title: N.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: v[1] || (v[1] = (l) => C.value = "canvas")
            }, {
              default: q(() => [
                B(J, {
                  name: "map",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                v[9] || (v[9] = oe(" 画布 ", -1))
              ]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          A("div", ea, [
            B(Xt, {
              modelValue: z(m),
              "onUpdate:modelValue": v[2] || (v[2] = (l) => Se(m) ? m.value = l : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            z(o).length > 0 ? (b(), R("div", ta, [
              A("ul", na, [
                (b(!0), R(V, null, Z(z(o), (l) => (b(), R("li", {
                  key: l.id,
                  class: "neumorphism-search-item",
                  onClick: (p) => z(g)(l)
                }, [
                  A("span", oa, K(l.title), 1),
                  A("span", aa, K(l.path), 1)
                ], 8, sa))), 128))
              ])
            ])) : ne("", !0)
          ]),
          B(Ct, {
            modelValue: z(x),
            "onUpdate:modelValue": v[3] || (v[3] = (l) => Se(x) ? x.value = l : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: q(({ collapsed: l }) => [
          l ? (b(), R("div", la, [
            B(J, {
              name: "book",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (b(), R("div", ia, [
            B(Tt, {
              "selected-keys": z(u),
              "onUpdate:selectedKeys": v[4] || (v[4] = (p) => Se(u) ? u.value = p : null),
              "expanded-keys": z(r),
              "onUpdate:expandedKeys": v[5] || (v[5] = (p) => Se(r) ? r.value = p : null),
              data: z(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: z(y)
            }, {
              icon: q(({ node: p }) => [
                B(qt, {
                  name: String(p.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: q(() => [
          B(Et, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: q(() => [
              B(Me, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: q(() => [
                  z(d) ? (b(), R(V, { key: 0 }, [
                    A("div", ra, [
                      A("h1", ca, K(z(d).title), 1),
                      A("div", ua, [
                        z(d).path ? (b(), ge(Ie, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: q(() => [
                            oe(K(z(d).path), 1)
                          ]),
                          _: 1
                        })) : ne("", !0),
                        z(d).children.length > 0 ? (b(), ge(Ie, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: q(() => [
                            B(J, {
                              name: "folder",
                              size: "sm",
                              class: "neumorphism-doc-icon-inline"
                            }),
                            v[10] || (v[10] = oe(" { displayNode.children.length } 个子项 ", -1))
                          ]),
                          _: 1
                        })) : ne("", !0)
                      ])
                    ]),
                    B(St),
                    A("div", da, [
                      B(bt, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: q(() => [
                          C.value === "doc" ? (b(), ge(zt, {
                            key: z(d).path,
                            content: z(d).body,
                            onDocLink: w
                          }, null, 8, ["content"])) : N.value ? (b(), ge(Je, {
                            key: `${z(d).path}:canvas`,
                            graph: N.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: k
                          }, null, 8, ["graph"])) : ne("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (b(), R("div", ha, [
                    B(Me, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: q(() => [
                        A("span", fa, [
                          B(J, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    v[12] || (v[12] = A("p", null, "请从左侧选择一篇文档", -1)),
                    B(le, {
                      variant: "raised",
                      size: "small",
                      onClick: v[6] || (v[6] = (l) => {
                        var p;
                        return i.value = ((p = z(c)[0]) == null ? void 0 : p.key) ?? "";
                      })
                    }, {
                      default: q(() => [...v[11] || (v[11] = [
                        oe(" 打开第一篇 ", -1)
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
}), ui = /* @__PURE__ */ Re(ma, [["__scopeId", "data-v-9ec4eb2c"]]), pa = { class: "neumorphism-editor-toolbar" }, ga = { class: "neumorphism-editor-toolbar-left" }, va = { class: "neumorphism-editor-toolbar-right" }, xa = ["aria-selected", "tabindex", "onClick", "onKeydown"], ya = { class: "nm-tabs__tab-label" }, _a = { class: "editor-stat" }, ka = /* @__PURE__ */ _e({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, i = ee("split");
    function u(T) {
      s("docLink", T);
    }
    function r(T, E) {
      if (T.key !== "ArrowLeft" && T.key !== "ArrowRight") return;
      T.preventDefault();
      const H = c.findIndex((D) => D.key === E), U = T.key === "ArrowRight" ? 1 : -1, X = c[(H + U + c.length) % c.length];
      i.value = X.key, ye(() => {
        var D, a;
        (a = (D = T.target.closest(".nm-tabs__nav")) == null ? void 0 : D.querySelectorAll(".nm-tabs__tab")[c.indexOf(X)]) == null || a.focus();
      });
    }
    const c = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], d = j(() => n.value.length), x = j(() => n.value.split(`
`).length), m = ee(null), o = ee(null);
    let f = !1;
    function y() {
      var T;
      return (T = m.value) == null ? void 0 : T.querySelector("textarea");
    }
    function _(T, E, H) {
      const U = y();
      if (!U) return;
      const X = U.selectionStart, D = U.selectionEnd, a = U.value.slice(X, D) || H, h = U.value.slice(0, X) + T + a + E + U.value.slice(D);
      s("change", h), ye(() => {
        U.focus();
        const $ = X + T.length;
        U.setSelectionRange($, $ + a.length);
      });
    }
    function g(T, E) {
      const H = y();
      if (!H) return;
      const U = H.selectionStart, X = H.value.slice(0, U), D = H.value.slice(U), $ = `${X.length > 0 && !X.endsWith(`
`) ? `
` : ""}${T} ${E}
`, I = X + $ + D;
      s("change", I), ye(() => {
        H.focus();
        const F = U + $.length - E.length - 2;
        H.setSelectionRange(F, F + E.length);
      });
    }
    function w() {
      _("**", "**", "粗体文字");
    }
    function C() {
      _("_", "_", "斜体文字");
    }
    function N() {
      g("##", "标题");
    }
    function k() {
      _("[", "](url)", "链接文字");
    }
    function S() {
      g("![alt text]", "(url)");
    }
    function v() {
      _("`", "`", "代码");
    }
    function l() {
      g("```\n", "code\n```");
    }
    function p() {
      g("-", "列表项");
    }
    function M() {
      const T = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, E = y();
      if (!E) return;
      const H = E.selectionStart, U = E.value.slice(0, H) + T + E.value.slice(E.selectionEnd);
      s("change", U), ye(() => {
        E.focus(), E.setSelectionRange(H + 3, H + 3);
      });
    }
    function O(T) {
      var X, D;
      const E = (D = (X = T.dataTransfer) == null ? void 0 : X.files) == null ? void 0 : D[0];
      if (!(E != null && E.type.startsWith("image/"))) return;
      T.preventDefault(), T.stopPropagation();
      const H = new FileReader(), U = E.name;
      H.onload = () => {
        const a = y();
        if (!a) return;
        const h = a.selectionStart, $ = `![${U}](${H.result})`, I = a.value.slice(0, h) + $ + a.value.slice(h);
        s("change", I), ye(() => {
          a.focus(), a.setSelectionRange(h + $.length, h + $.length);
        });
      }, H.readAsDataURL(E);
    }
    function L(T) {
      var E;
      (E = T.dataTransfer) != null && E.types.includes("Files") && T.preventDefault();
    }
    let P = null;
    function W() {
      n.autoSave && (P && clearTimeout(P), P = setTimeout(() => {
        s("change", n.value);
      }, n.autoSaveInterval));
    }
    ve(
      () => n.value,
      () => {
        W();
      }
    ), Ee(() => {
      P && clearTimeout(P);
    });
    function Y() {
      var U;
      if (f || i.value !== "split") return;
      const T = (U = m.value) == null ? void 0 : U.querySelector("textarea"), E = o.value;
      if (!T || !E) return;
      const H = T.scrollTop / (T.scrollHeight - T.clientHeight || 1);
      f = !0, E.scrollTop = H * (E.scrollHeight - E.clientHeight), requestAnimationFrame(() => {
        f = !1;
      });
    }
    function Q() {
      var U;
      if (f || i.value !== "split") return;
      const T = (U = m.value) == null ? void 0 : U.querySelector("textarea"), E = o.value;
      if (!T || !E) return;
      const H = E.scrollTop / (E.scrollHeight - E.clientHeight || 1);
      f = !0, T.scrollTop = H * (T.scrollHeight - T.clientHeight), requestAnimationFrame(() => {
        f = !1;
      });
    }
    return (T, E) => (b(), R("div", {
      class: te(`neumorphism-markdown-editor ${n.className}`)
    }, [
      A("div", pa, [
        A("div", ga, [
          B(le, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: w
          }, {
            default: q(() => [...E[2] || (E[2] = [
              A("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            "aria-label": "斜体",
            onClick: C
          }, {
            default: q(() => [...E[3] || (E[3] = [
              A("em", null, "I", -1)
            ])]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "标题",
            "aria-label": "标题",
            onClick: N
          }, {
            default: q(() => [...E[4] || (E[4] = [
              oe(" H ", -1)
            ])]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: k
          }, {
            default: q(() => [
              B(J, {
                name: "link",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "图片",
            "aria-label": "图片",
            onClick: S
          }, {
            default: q(() => [
              B(J, {
                name: "image",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "行内代码",
            "aria-label": "行内代码",
            onClick: v
          }, {
            default: q(() => [...E[5] || (E[5] = [
              oe(" </> ", -1)
            ])]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: l
          }, {
            default: q(() => [
              B(J, {
                name: "clipboard",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "无序列表",
            "aria-label": "无序列表",
            onClick: p
          }, {
            default: q(() => [
              B(J, {
                name: "list",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          }),
          B(le, {
            size: "small",
            title: "表格",
            "aria-label": "表格",
            onClick: M
          }, {
            default: q(() => [
              B(J, {
                name: "table",
                size: "sm",
                class: "neumorphism-editor-icon"
              })
            ]),
            _: 1
          })
        ]),
        A("div", va, [
          B(jt, {
            modelValue: i.value,
            "onUpdate:modelValue": E[0] || (E[0] = (H) => i.value = H),
            tabs: c,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: q(({ tab: H, active: U, activate: X }) => [
              A("button", {
                type: "button",
                class: te(["nm-tabs__tab", { "nm-tabs__tab--active": U }]),
                role: "tab",
                "aria-selected": U,
                tabindex: U ? 0 : -1,
                onClick: (D) => X(H.key),
                onKeydown: (D) => r(D, H.key)
              }, [
                B(J, {
                  name: H.key === "edit" ? "pencil" : H.key === "split" ? "split" : "eye",
                  size: "sm",
                  class: "neumorphism-editor-icon"
                }, null, 8, ["name"]),
                A("span", ya, K(H.label), 1)
              ], 42, xa)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          A("span", _a, K(x.value) + " 行 · " + K(d.value) + " 字", 1)
        ])
      ]),
      A("div", {
        class: te(["neumorphism-editor-panels", `neumorphism-mode-${i.value}`])
      }, [
        A("div", {
          ref_key: "editPanelRef",
          ref: m,
          class: te(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: i.value === "preview" }]),
          onScroll: Y,
          onDrop: O,
          onDragover: L
        }, [
          B(Me, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: q(() => [
              B(Qt, {
                class: "neumorphism-editor-textarea",
                "model-value": n.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": E[1] || (E[1] = (H) => s("change", H))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        A("div", {
          ref_key: "previewPanelRef",
          ref: o,
          class: te(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: i.value === "edit" }]),
          onScroll: Q
        }, [
          B(Me, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: q(() => [
              B(zt, {
                content: n.value,
                "show-toc": !1,
                onDocLink: u
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), $a = /* @__PURE__ */ Re(ka, [["__scopeId", "data-v-1d3fd848"]]), wa = { class: "neumorphism-editor-brand" }, ba = { class: "neumorphism-editor-actions" }, Ma = {
  key: 0,
  class: "neumorphism-editor-sider"
}, Ca = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, Ta = {
  key: 0,
  class: "neumorphism-editor-layout"
}, Sa = { class: "neumorphism-editor-header" }, Ea = { class: "neumorphism-editor-title" }, Ra = { class: "neumorphism-editor-meta" }, La = { class: "neumorphism-editor-body" }, Da = {
  key: 1,
  class: "neumorphism-editor-empty"
}, Na = { class: "neumorphism-doc-empty-icon" }, Aa = 50, Ia = /* @__PURE__ */ _e({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(e, { emit: t }) {
    const n = e, s = t, {
      selectedPath: i,
      selectedKeys: u,
      expandedKeys: r,
      treeData: c,
      displayNode: d,
      themeModel: x,
      handleTreeSelect: m
    } = Dt({ root: n.root, initialPath: n.initialPath }), o = ee({}), f = ee([]);
    function y(S, v) {
      const l = f.value.filter((p) => p !== S);
      for (l.push(S); l.length > Aa; ) {
        const p = l.shift();
        p !== S && delete o.value[p];
      }
      f.value = l, o.value[S] = v;
    }
    function _(S) {
      return o.value[S.path] ?? S.content;
    }
    function g(S) {
      d.value && y(d.value.path, S);
    }
    function w() {
      d.value && s("save", d.value.path, _(d.value));
    }
    function C(S) {
      i.value = S, s("docLink", S);
    }
    const N = j(() => {
      if (!d.value) return !1;
      const S = o.value[d.value.path];
      return S !== void 0 && S !== d.value.content;
    });
    function k(S) {
      (S.ctrlKey || S.metaKey) && S.key === "s" && (S.preventDefault(), w());
    }
    return (S, v) => (b(), R("div", {
      class: te(`neumorphism-doc-editor ${n.className}`),
      onKeydown: k
    }, [
      B(Mt, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": q(() => [
          A("span", wa, [
            B(J, {
              name: "pencil",
              size: "md"
            }),
            v[4] || (v[4] = oe(" Doc Editor", -1))
          ])
        ]),
        "header-center": q(() => [
          B(Ct, {
            modelValue: z(x),
            "onUpdate:modelValue": v[0] || (v[0] = (l) => Se(x) ? x.value = l : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": q(() => [
          A("div", ba, [
            N.value ? (b(), ge(Ie, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: q(() => [...v[5] || (v[5] = [
                oe(" 未保存 ", -1)
              ])]),
              _: 1
            })) : ne("", !0),
            B(le, {
              variant: "raised",
              size: "small",
              disabled: !N.value,
              onClick: w
            }, {
              default: q(() => [
                B(J, {
                  name: "save",
                  size: "xl",
                  class: "neumorphism-doc-icon"
                }),
                v[6] || (v[6] = oe(" 保存 ", -1))
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: q(({ collapsed: l }) => [
          l ? (b(), R("div", Ca, [
            B(J, {
              name: "pencil",
              size: "xl",
              class: "neumorphism-doc-icon-lg"
            })
          ])) : (b(), R("div", Ma, [
            B(Tt, {
              "selected-keys": z(u),
              "onUpdate:selectedKeys": v[1] || (v[1] = (p) => Se(u) ? u.value = p : null),
              "expanded-keys": z(r),
              "onUpdate:expandedKeys": v[2] || (v[2] = (p) => Se(r) ? r.value = p : null),
              data: z(c),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: z(m)
            }, {
              icon: q(({ node: p }) => [
                B(qt, {
                  name: String(p.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: q(() => [
          B(Et, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: q(() => [
              B(Me, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: q(() => [
                  z(d) ? (b(), R("div", Ta, [
                    A("header", Sa, [
                      A("div", null, [
                        A("h1", Ea, K(z(d).title), 1),
                        A("div", Ra, [
                          z(d).path ? (b(), ge(Ie, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: q(() => [
                              oe(K(z(d).path), 1)
                            ]),
                            _: 1
                          })) : ne("", !0),
                          N.value ? (b(), ge(Ie, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: q(() => [...v[7] || (v[7] = [
                              oe(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : ne("", !0)
                        ])
                      ]),
                      B(le, {
                        variant: "raised",
                        size: "small",
                        disabled: !N.value,
                        onClick: w
                      }, {
                        default: q(() => [
                          B(J, {
                            name: "save",
                            size: "xl",
                            class: "neumorphism-doc-icon"
                          }),
                          v[8] || (v[8] = oe(" 保存 ", -1))
                        ]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    B(St),
                    A("div", La, [
                      B($a, {
                        value: _(z(d)),
                        onChange: g,
                        onDocLink: C
                      }, null, 8, ["value"])
                    ])
                  ])) : (b(), R("div", Da, [
                    B(Me, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: q(() => [
                        A("span", Na, [
                          B(J, {
                            name: "folder-open",
                            size: "3xl",
                            class: "neumorphism-doc-icon-3xl"
                          })
                        ])
                      ]),
                      _: 1
                    }),
                    v[10] || (v[10] = A("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    B(le, {
                      variant: "raised",
                      size: "small",
                      onClick: v[3] || (v[3] = (l) => {
                        var p;
                        return i.value = ((p = z(c)[0]) == null ? void 0 : p.key) ?? "";
                      })
                    }, {
                      default: q(() => [...v[9] || (v[9] = [
                        oe(" 打开第一篇 ", -1)
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
}), di = /* @__PURE__ */ Re(Ia, [["__scopeId", "data-v-db1006bf"]]), Ba = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function Oa(e) {
  const t = e.match(Ba);
  if (!t)
    return { meta: {}, body: e };
  const n = t[1], s = e.slice(t[0].length), i = {};
  for (const u of n.split(`
`)) {
    const r = u.indexOf(":");
    if (r === -1) continue;
    const c = u.slice(0, r).trim();
    let d = u.slice(r + 1).trim();
    /^-?\d+$/.test(d) ? d = parseInt(d, 10) : /^-?\d+\.\d+$/.test(d) ? d = parseFloat(d) : d === "true" ? d = !0 : d === "false" ? d = !1 : (d.startsWith('"') && d.endsWith('"') || d.startsWith("'") && d.endsWith("'")) && (d = d.slice(1, -1)), i[c] = d;
  }
  return { meta: i, body: s };
}
function Wa(e) {
  return e.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function Ha(e, t) {
  if (t.title && typeof t.title == "string")
    return t.title;
  const n = e.match(/^#\s+(.+)$/m);
  return n ? n[1].trim() : "Untitled";
}
function Pa(e, t) {
  const { meta: n, body: s } = Oa(t), i = Ha(s, n), u = typeof n.order == "number" ? n.order : 9999;
  return {
    id: Wa(e),
    title: i,
    path: e,
    content: t,
    body: s,
    meta: n,
    children: [],
    order: u
  };
}
function hi(e) {
  const t = /* @__PURE__ */ new Map();
  for (const [r, c] of Object.entries(e)) {
    if (!r.endsWith(".md")) continue;
    const d = Pa(r, c);
    t.set(r, d);
  }
  const n = [], s = Array.from(t.keys()).sort();
  for (const r of s) {
    const c = r.split("/");
    if (c.length === 1) {
      n.push(r);
      continue;
    }
    let d = null;
    const m = `${c.slice(0, -1).join("/")}/index.md`;
    if (t.has(m) && m !== r)
      d = m;
    else {
      const o = c.slice(0, -1).join("/") + ".md";
      t.has(o) && (d = o);
    }
    if (d && t.has(d)) {
      const o = t.get(d), f = t.get(r);
      o.children.push(f);
    } else
      n.push(r);
  }
  for (const r of t.values())
    r.children.sort((c, d) => c.order - d.order || c.title.localeCompare(d.title));
  const i = n.map((r) => t.get(r)).sort((r, c) => r.order - c.order || r.title.localeCompare(c.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: i,
    order: 0
  };
}
const fi = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  qn as DocCodeBlock,
  di as DocEditor,
  Je as DocFlowCanvas,
  qo as DocGanttChart,
  So as DocSequenceChart,
  rt as DocTocNav,
  qt as DocTreeIcon,
  ui as DocViewer,
  ze as MATH_MOUNT_CLASS,
  At as MATH_SOURCE_CLASS,
  Ne as MATH_STATE_ATTR,
  $a as MarkdownEditor,
  zt as MarkdownRenderer,
  Qe as TocNodeItem,
  hi as buildDocTree,
  an as buildHierarchyGraph,
  fi as componentCategories,
  Jt as createDocTree,
  Pa as createNode,
  nn as extractFlowBlocks,
  Ha as extractTitle,
  li as flattenDocTree,
  Ot as formatGanttTick,
  ri as getAncestors,
  Zt as getNodeIcon,
  Ze as getScrollBehavior,
  Nn as highlightCode,
  Wt as isMermaidFlowchart,
  Es as isMermaidGantt,
  eo as isMermaidSequence,
  ht as layoutProDocFlow,
  rs as matchBlockBracket,
  ls as matchBlockDollar,
  hs as matchInlineBracket,
  cs as matchInlineDollar,
  ds as matchInlineDoubleDollar,
  us as matchInlineParen,
  ms as mathExtensions,
  Lt as nodeToTreeData,
  Oa as parseFrontmatter,
  oo as parseMermaidDiagram,
  Xs as parseMermaidFlow,
  Hs as parseMermaidGantt,
  no as parseMermaidSequence,
  tt as parseProDocFlow,
  Wa as pathToId,
  xs as renderMath,
  lt as resolveCanvasGraph,
  fs as stripMathDelimiters,
  Pt as useContainerWidth,
  Dt as useDocLayout,
  is as useMarkdownToc,
  hn as useScrollSpy,
  ci as writeFlowNodePosition
};
