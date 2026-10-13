import { ref as G, computed as j, watch as ue, onBeforeUnmount as Te, defineComponent as we, openBlock as N, createElementBlock as D, normalizeClass as te, createElementVNode as s, unref as I, createCommentVNode as ne, toDisplayString as X, Fragment as oe, renderList as ge, createBlock as fe, nextTick as he, createVNode as z, withCtx as P, createTextVNode as Y, normalizeStyle as De, toRef as ze, onMounted as ut, getCurrentInstance as ht, render as Se, createStaticVNode as Ve, Transition as Ze, withModifiers as ft, h as Oe, isRef as $e } from "vue";
import { useTheme as mt } from "../composables/useTheme.js";
import { N as Qe } from "../chunks/NeumorphismLayout-ortLGvgQ.js";
import { N as ee } from "../chunks/NeumorphismButton-CTLPjGe-.js";
import { N as ye } from "../chunks/NeumorphismCard-DGFr51dd.js";
import { N as Je } from "../chunks/NeumorphismThemeToggle-DUyFtb7A.js";
import { N as et } from "../chunks/NeumorphismTree-Dmru8CiZ.js";
import { N as tt } from "../chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as _e } from "../chunks/NeumorphismTag-D6Yz18Ws.js";
import { N as nt } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as pt } from "../chunks/NeumorphismInput-COGouhbp.js";
import { marked as Ae } from "marked";
import { escapeHtml as me, generateId as ot, slugify as qe } from "../utils/index.js";
import { useLocale as Be } from "../composables/useLocale.js";
import { useClipboard as vt } from "../composables/useClipboard.js";
import { N as gt } from "../chunks/NeumorphismCanvas-B8TpGQt6.js";
import { _ as He } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as wt } from "../chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as kt } from "../chunks/NeumorphismTextarea-D4alPN-q.js";
import '../index2.css';function yt(n) {
  var e;
  const o = ((e = n.path) == null ? void 0 : e.toLowerCase()) || "";
  return o.includes("api") ? "api" : o.includes("guide") ? "guide" : o.includes("config") ? "config" : o.includes("example") ? "example" : o.includes("install") ? "install" : o.includes("changelog") ? "changelog" : o.includes("faq") ? "faq" : "file";
}
function st(n) {
  const o = n.children.length > 0 ? "folder" : yt(n);
  return {
    key: n.path,
    label: n.title,
    icon: o,
    children: n.children.map(st)
  };
}
function xt(n) {
  const o = /* @__PURE__ */ new Map();
  function e(y) {
    o.set(y.path, y);
    for (const h of y.children)
      e(h);
  }
  e(n);
  const u = /* @__PURE__ */ new Map();
  function k(y) {
    u.set(y.id, y);
    for (const h of y.children)
      k(h);
  }
  return k(n), {
    root: n,
    nodeMap: o,
    findByPath(y) {
      return o.get(y);
    },
    findById(y) {
      return u.get(y);
    }
  };
}
function Ko(n) {
  const o = [];
  function e(u) {
    o.push(u);
    for (const k of u.children)
      e(k);
  }
  return e(n), o;
}
function Xo(n, o) {
  const e = [];
  function u(k, y, h) {
    if (k.id === y)
      return e.push(...h), !0;
    for (const a of k.children)
      if (u(a, y, [...h, k]))
        return !0;
    return !1;
  }
  return u(o, n.id, []), e;
}
function rt(n) {
  var w;
  const { root: o, initialPath: e } = n, u = typeof window < "u", k = n.syncUrlHash !== !1 && u, y = u ? window.location.hash.slice(1) : "", h = e || y || ((w = o.children[0]) == null ? void 0 : w.path) || "", a = G(h), l = G([]), { theme: E, setTheme: L } = mt(), T = j({
    get: () => E.value,
    set: ($) => L($)
  }), v = j(() => o.children.map(st)), _ = G(a.value ? [a.value] : []);
  ue(a, ($) => {
    _.value = $ ? [$] : [];
  });
  const g = j(() => xt(o)), d = j(() => {
    if (a.value)
      return g.value.findByPath(a.value);
  }), b = j(() => d.value || o.children[0]);
  function M($) {
    a.value = $;
  }
  function S($, V) {
    a.value = V, $("docLink", V);
  }
  const H = G(""), C = j(() => {
    if (!H.value.trim()) return [];
    const $ = H.value.toLowerCase();
    return r(o).filter((A) => A.id === "root" ? !1 : A.title.toLowerCase().includes($) || A.body.toLowerCase().includes($)).slice(0, 10);
  });
  function i($) {
    a.value = $.path, H.value = "";
  }
  function r($) {
    const V = [$];
    for (const A of $.children)
      V.push(...r(A));
    return V;
  }
  if (ue(
    () => e,
    ($) => {
      $ && (a.value = $);
    }
  ), k) {
    ue(a, (V) => {
      V && history.replaceState(null, "", `#${V}`);
    });
    const $ = () => {
      const V = window.location.hash.slice(1);
      V && V !== a.value && (a.value = V);
    };
    window.addEventListener("hashchange", $), Te(() => {
      window.removeEventListener("hashchange", $);
    });
  }
  return {
    selectedPath: a,
    selectedKeys: _,
    expandedKeys: l,
    treeData: v,
    selectedNode: d,
    displayNode: b,
    docTree: g,
    themeModel: T,
    searchQuery: H,
    searchResults: C,
    handleTreeSelect: M,
    handleDocLink: S,
    handleSearchSelect: i
  };
}
const Mt = /^graph\s+(LR|RL|TB|BT)\s*$/i, Me = /([A-Za-z_][\w-]*)\s*(\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/y, Le = /-->\s*(?:\|([^|]*)\|)?/y, je = /@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/y, $t = /^(\/|\.\/|\.\.\/)[^\s]*\.md$/, Re = /^```prodoc-flow\s*\n([\s\S]*?)^```/gm;
function bt(n) {
  const o = [];
  Re.lastIndex = 0;
  let e;
  for (; (e = Re.exec(n)) !== null; )
    o.push(e[1]);
  return o;
}
function Uo(n, o, e, u, k, y) {
  Re.lastIndex = 0;
  const h = o.replace(/\r\n/g, `
`).trim();
  let a, l = -1;
  for (; (a = Re.exec(n)) !== null; ) {
    if (l++, y !== void 0 && l !== y) continue;
    const E = a[1];
    if (E.replace(/\r\n/g, `
`).trim() !== h) continue;
    const L = new RegExp(
      `^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s\\[\\{\\(@]|$)`
    ), T = E.split(`
`);
    let v = !1;
    for (let d = 0; d < T.length; d++) {
      const b = T[d].indexOf("%%"), M = b >= 0 ? T[d].slice(0, b) : T[d], S = b >= 0 ? T[d].slice(b) : "", H = M.trim();
      if (H.includes("-->") || !L.test(H)) continue;
      const C = H.replace(/\s*@\s*-?[\d.]+\s*,\s*-?[\d.]+\s*$/, "");
      T[d] = `${C} @ ${u}, ${k}${S ? `  ${S}` : ""}`, v = !0;
      break;
    }
    if (!v) {
      const d = `${e} @ ${u}, ${k}`;
      T.length > 0 && T[T.length - 1].trim() === "" ? T.splice(T.length - 1, 0, d) : T.push(d);
    }
    const _ = T.join(`
`), g = a.index + a[0].indexOf(E);
    return n.slice(0, g) + _ + n.slice(g + E.length);
  }
  return n;
}
function Ct(n) {
  return n ? n.startsWith("[/") && n.endsWith("/]") ? { shape: "rounded", text: n.slice(2, -2) } : n.startsWith("{") ? { shape: "diamond", text: n.slice(1, -1) } : n.startsWith("(") ? { shape: "stadium", text: n.slice(1, -1) } : { shape: "rect", text: n.slice(1, -1) } : { shape: "rect", text: "" };
}
function _t(n) {
  const o = n.trim(), e = o.split("|");
  if (e.length > 1) {
    const u = e[e.length - 1].trim();
    if ($t.test(u))
      return {
        label: e.slice(0, -1).join("|").trim(),
        // 归一化为无前导斜杠：`/a/b.md` / `./b.md` / `../b.md` → `a/b.md` / `b.md`
        docPath: u.replace(/^(?:\.\.\/|\.\/|\/)/, "")
      };
  }
  return { label: o };
}
function lt(n) {
  const o = [], e = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Set(), k = [];
  let y = "LR", h = !1;
  function a(v, _) {
    const { shape: g, text: d } = Ct(_), { label: b, docPath: M } = _ ? _t(d) : { label: v, docPath: void 0 }, S = e.get(v);
    S ? _ && (S.label = b, S.shape = g, M !== void 0 && (S.docPath = M)) : e.set(v, { id: v, label: b, shape: g, docPath: M });
  }
  function l(v, _, g) {
    const d = e.get(v);
    d && (d.x = _, d.y = g);
  }
  function E(v, _, g) {
    const d = `${v}→${_}${g ?? ""}`;
    u.has(d) || (u.add(d), k.push({ from: v, to: _, label: g }));
  }
  const L = n.split(`
`);
  for (let v = 0; v < L.length; v++) {
    const _ = v + 1, g = L[v].indexOf("%%"), d = (g >= 0 ? L[v].slice(0, g) : L[v]).trim();
    if (d) {
      if (!h) {
        const b = Mt.exec(d);
        b ? y = b[1].toUpperCase() : (o.push({
          line: _,
          source: L[v].trim(),
          message: "缺少方向声明 graph LR|RL|TB|BT，已按 LR 处理"
        }), T(d, _, L[v].trim())), h = !0;
        continue;
      }
      T(d, _, L[v].trim());
    }
  }
  function T(v, _, g) {
    var S;
    let d = 0;
    Me.lastIndex = 0, Le.lastIndex = 0, Me.lastIndex = d;
    let b = Me.exec(v);
    if (!b || b.index !== 0)
      return o.push({ line: _, source: g, message: "无法识别的语句" }), !1;
    let M = b[1];
    for (a(b[1], b[2]), d = Me.lastIndex; ; ) {
      for (; d < v.length && /\s/.test(v[d]); ) d++;
      if (d >= v.length) break;
      if (v[d] === "@") {
        je.lastIndex = d;
        const r = je.exec(v);
        return r && r.index === d ? (l(M, parseFloat(r[1]), parseFloat(r[2])), !0) : (o.push({
          line: _,
          source: g,
          message: "无法识别的排版标注（应为行尾 @ x, y）"
        }), !1);
      }
      Le.lastIndex = d;
      const H = Le.exec(v);
      if (!H || H.index !== d)
        return o.push({
          line: _,
          source: g,
          message: `无法识别的内容: "${v.slice(d)}"`
        }), !1;
      const C = ((S = H[1]) == null ? void 0 : S.trim()) || void 0;
      for (d = Le.lastIndex; d < v.length && /\s/.test(v[d]); ) d++;
      if (Me.lastIndex = d, b = Me.exec(v), !b || b.index !== d)
        return o.push({ line: _, source: g, message: "箭头后缺少目标节点" }), !1;
      const i = b[1];
      a(b[1], b[2]), E(M, i, C), M = i, d = Me.lastIndex;
    }
    return !0;
  }
  return {
    direction: y,
    nodes: [...e.values()],
    edges: k,
    errors: o
  };
}
const Fe = "__hier_root";
function Tt(n) {
  const o = [
    {
      id: Fe,
      label: n.title,
      shape: "stadium",
      docPath: n.path || void 0
    }
  ], e = [];
  for (const u of n.children)
    o.push({
      id: u.id,
      label: u.title,
      // 有子级 = 可继续钻取（圆角），叶子 = 矩形
      shape: u.children.length > 0 ? "rounded" : "rect",
      docPath: u.path
    }), e.push({ from: Fe, to: u.id });
  return {
    // 子项较多时纵向排布更可读
    direction: n.children.length <= 5 ? "LR" : "TB",
    nodes: o,
    edges: e,
    errors: []
  };
}
function We(n) {
  for (const o of bt(n.body)) {
    const e = lt(o);
    if (e.nodes.length > 0) return e;
  }
  return n.children.length > 0 ? Tt(n) : null;
}
const St = { class: "toc-item-row" }, Lt = ["aria-expanded", "aria-controls", "aria-label"], Et = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, Nt = ["d"], Rt = ["data-toc-id", "aria-current"], Bt = { class: "toc-text" }, Ht = ["id"], Ie = /* @__PURE__ */ we({
  __name: "TocNodeItem",
  props: {
    node: {},
    activeHeading: {},
    collapsedGroups: {}
  },
  emits: ["toggle", "select"],
  setup(n, { emit: o }) {
    const e = n, u = o, { t: k } = Be(), y = j(() => e.activeHeading === e.node.id), h = j(() => e.node.children.length > 0), a = j(() => e.collapsedGroups.has(e.node.id));
    function l(L) {
      L.stopPropagation(), u("toggle", e.node.id);
    }
    function E(L) {
      L.preventDefault(), u("select", e.node.id);
    }
    return (L, T) => (N(), D("li", {
      class: te(["neumorphism-toc-item", { "has-children": h.value, active: y.value }]),
      role: "listitem"
    }, [
      s("div", St, [
        h.value ? (N(), D("button", {
          key: 0,
          type: "button",
          class: "toc-toggle",
          "aria-expanded": !a.value,
          "aria-controls": `toc-list-${n.node.id}`,
          "aria-label": a.value ? I(k)("markdownTocExpand") : I(k)("markdownTocCollapse"),
          onClick: l
        }, [
          (N(), D("svg", Et, [
            s("path", {
              d: a.value ? "M9 6l6 6-6 6" : "M6 9l6 6 6-6"
            }, null, 8, Nt)
          ]))
        ], 8, Lt)) : ne("", !0),
        s("a", {
          href: "#",
          "data-toc-id": n.node.id,
          role: "button",
          "aria-current": y.value ? "location" : void 0,
          onClick: E
        }, [
          s("span", Bt, X(n.node.text), 1)
        ], 8, Rt)
      ]),
      h.value && !a.value ? (N(), D("ul", {
        key: 0,
        id: `toc-list-${n.node.id}`,
        class: "neumorphism-toc-list",
        role: "list"
      }, [
        (N(!0), D(oe, null, ge(n.node.children, (v) => (N(), fe(Ie, {
          key: v.id,
          node: v,
          "active-heading": n.activeHeading,
          "collapsed-groups": n.collapsedGroups,
          onToggle: T[0] || (T[0] = (_) => L.$emit("toggle", _)),
          onSelect: T[1] || (T[1] = (_) => L.$emit("select", _))
        }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
      ], 8, Ht)) : ne("", !0)
    ], 2));
  }
});
function Pe() {
  return typeof window < "u" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
function Dt(n) {
  const { content: o } = n, e = n.headingSelector ?? "h1, h2, h3", u = G("");
  let k = !1, y = null;
  function h(M) {
    var C;
    const S = o.value;
    if (!S) return null;
    const H = (C = n.scrollContainer) == null ? void 0 : C.value;
    return H instanceof HTMLElement ? H : typeof H == "string" ? S.closest(H) : S.closest(".nm-layout__content");
  }
  function a(M) {
    const S = M ?? h();
    if (!S) return 64;
    const H = S.closest(".nm-layout"), C = H == null ? void 0 : H.querySelector(".nm-layout__header");
    return C ? C.getBoundingClientRect().height : 64;
  }
  function l(M) {
    var S;
    M !== u.value && (u.value = M, (S = n.onActiveChange) == null || S.call(n, M));
  }
  function E() {
    var i;
    const M = h();
    if (!M) return;
    const S = (i = o.value) == null ? void 0 : i.querySelectorAll(e);
    if (!S) return;
    const H = a(M) + 20;
    let C = "";
    for (const r of S) {
      const w = r.getBoundingClientRect(), $ = M.getBoundingClientRect();
      if (w.top - $.top <= H)
        C = r.id;
      else
        break;
    }
    l(C);
  }
  function L() {
    k = !1, y && (clearTimeout(y), y = null), E();
  }
  function T(M) {
    var H, C;
    y && clearTimeout(y), k = !0, u.value = M, (H = n.onActiveChange) == null || H.call(n, M);
    const S = (C = o.value) == null ? void 0 : C.querySelector(`[id="${M}"]`);
    S && S.scrollIntoView({ behavior: Pe() }), y = setTimeout(L, 800);
  }
  let v = null, _ = null, g = -1;
  function d() {
    v == null || v.disconnect(), v = null, _ == null || _.disconnect(), _ = null;
  }
  function b() {
    d();
    const M = h();
    if (!M || !o.value) return;
    const S = a(M);
    g = S;
    const H = Array.from(o.value.querySelectorAll(e));
    if (H.length === 0) return;
    const C = /* @__PURE__ */ new Map();
    v = new IntersectionObserver(
      (w) => {
        if (k) return;
        for (const A of w)
          A.isIntersecting ? C.set(A.target, A.boundingClientRect.top) : C.delete(A.target);
        let $ = "", V = -1 / 0;
        for (const [A, F] of C)
          F > V && (V = F, $ = A.id);
        $ && l($);
      },
      {
        root: M,
        rootMargin: `-${S + 20}px 0px -60% 0px`,
        threshold: 0
      }
    );
    for (const w of H)
      v.observe(w);
    const i = M.closest(".nm-layout"), r = i == null ? void 0 : i.querySelector(".nm-layout__header");
    r && typeof ResizeObserver < "u" && (_ = new ResizeObserver(() => {
      const w = r.getBoundingClientRect().height;
      w !== g && (g = w, he(() => b()));
    }), _.observe(r));
  }
  return ue(n.watchSource ? [o, n.watchSource] : [o], ([M]) => {
    M ? he(() => {
      b(), E();
    }) : d();
  }), Te(() => {
    d(), y && clearTimeout(y);
  }), { activeHeading: u, scrollToHeading: T, syncActiveHeading: E };
}
const At = ["aria-label"], It = { class: "neumorphism-toc-header" }, Pt = { class: "neumorphism-toc-title" }, zt = {
  class: "neumorphism-toc-list",
  role: "list"
}, Vt = {
  key: 1,
  class: "neumorphism-toc-list",
  role: "list"
}, Ge = /* @__PURE__ */ we({
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
    const u = n, k = e, { t: y } = Be(), h = j(() => u.title || y("markdownTocLabel")), a = G(null), l = G(/* @__PURE__ */ new Set()), E = j(() => u.collapsedGroups ?? l.value);
    function L(g) {
      u.collapsedGroups !== void 0 ? k("update:collapsedGroups", g) : l.value = g;
    }
    ue(
      () => u.items,
      () => {
        u.collapsedGroups === void 0 && (l.value = /* @__PURE__ */ new Set());
      }
    );
    function T(g) {
      const d = new Set(E.value), b = d.has(g);
      b ? d.delete(g) : d.add(g), L(d), b && he(() => v(g));
    }
    function v(g) {
      if (!a.value || window.innerWidth <= 1200) return;
      const d = a.value, b = d.querySelector(`[data-toc-id="${CSS.escape(g)}"]`);
      if (!b) return;
      const M = d.getBoundingClientRect(), S = b.closest(".neumorphism-toc-item"), H = Array.from((S == null ? void 0 : S.children) ?? []).find(
        (i) => i.classList.contains("neumorphism-toc-list")
      );
      if (H && H.getBoundingClientRect().bottom <= M.bottom + 10)
        return;
      const C = b.getBoundingClientRect().top - M.top + d.scrollTop;
      d.scrollTo({
        top: Math.max(0, C),
        behavior: Pe()
      });
    }
    function _() {
      if (!a.value || window.innerWidth <= 1200) return;
      const g = a.value, d = g.querySelector(".neumorphism-toc-item.active");
      if (!d) return;
      const b = g.getBoundingClientRect(), M = d.getBoundingClientRect(), S = b.top + b.height * 0.25, H = b.top + b.height * 0.75;
      if (M.top >= S && M.bottom <= H)
        return;
      const i = M.top - b.top + g.scrollTop - M.height / 2 - b.height / 2;
      g.scrollTo({
        top: Math.max(0, i),
        behavior: Pe()
      });
    }
    return ue(
      () => u.activeId,
      (g) => {
        if (!g) return;
        function d(b) {
          for (const M of b) {
            if (M.id === g) return !0;
            if (d(M.children)) {
              if (E.value.has(M.id)) {
                const S = new Set(E.value);
                S.delete(M.id), L(S);
              }
              return !0;
            }
          }
          return !1;
        }
        d(u.items), he(() => _());
      }
    ), o({ scrollTocToActive: _ }), (g, d) => n.framed ? (N(), D("nav", {
      key: 0,
      ref_key: "tocNavRef",
      ref: a,
      class: "neumorphism-toc",
      "aria-label": h.value
    }, [
      z(ye, {
        elevation: -2,
        "no-padding": "",
        class: "neumorphism-toc-card"
      }, {
        default: P(() => [
          s("div", It, [
            s("span", Pt, [
              d[2] || (d[2] = s("svg", {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("path", { d: "M8 6h13M8 12h13M8 18h13" }),
                s("circle", {
                  cx: "4",
                  cy: "6",
                  r: "1"
                }),
                s("circle", {
                  cx: "4",
                  cy: "12",
                  r: "1"
                }),
                s("circle", {
                  cx: "4",
                  cy: "18",
                  r: "1"
                })
              ], -1)),
              Y(" " + X(h.value), 1)
            ])
          ]),
          s("ul", zt, [
            (N(!0), D(oe, null, ge(n.items, (b) => (N(), fe(Ie, {
              key: b.id,
              node: b,
              "active-heading": n.activeId,
              "collapsed-groups": E.value,
              onToggle: T,
              onSelect: d[0] || (d[0] = (M) => k("select", M))
            }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
          ])
        ]),
        _: 1
      })
    ], 8, At)) : (N(), D("ul", Vt, [
      (N(!0), D(oe, null, ge(n.items, (b) => (N(), fe(Ie, {
        key: b.id,
        node: b,
        "active-heading": n.activeId,
        "collapsed-groups": E.value,
        onToggle: T,
        onSelect: d[1] || (d[1] = (M) => k("select", M))
      }, null, 8, ["node", "active-heading", "collapsed-groups"]))), 128))
    ]));
  }
}), Ot = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, qt = /(#\s+.*$)/gm, jt = /(--\s.*$)/gm, Ft = /$.^/gm, Wt = /* @__PURE__ */ new Set([
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
function Kt(n) {
  const o = (n ?? "").toLowerCase();
  return Wt.has(o) ? qt : Gt.has(o) ? jt : o === "html" || o === "xml" || o === "vue" ? Ft : Ot;
}
const Xt = /(&quot;.*?&quot;|&#0?39;.*?&#0?39;|`.*?`)/g, Ut = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|typeof|instanceof|class|extends|import|export|from|async|await|yield|static|public|private|protected|interface|type|enum|namespace|module|declare|abstract|readonly|implements|void|number|string|boolean|any|never|unknown|null|undefined|true|false)\b/g, Yt = /\b([a-zA-Z_]\w*)(?=\()/g, Zt = /\b(\d+\.?\d*)\b/g, Qt = /\b([A-Z][a-zA-Z0-9_]*)\b/g, Jt = /\u0001([a-z]+)\u0001/g;
function en(n) {
  let o = n, e = "";
  do
    e = String.fromCharCode(97 + o % 26) + e, o = Math.floor(o / 26) - 1;
  while (o >= 0);
  return "" + e + "";
}
function tn(n) {
  let o = 0;
  for (const e of n) o = o * 26 + (e.charCodeAt(0) - 96);
  return o - 1;
}
function nn(n, o) {
  if (!o || o === "text" || o === "plain")
    return me(n);
  let e = me(n);
  const u = [], k = (y) => (h) => (u.push(`<span class="${y}">${h}</span>`), en(u.length - 1));
  return e = e.replace(Xt, k("token-string")), e = e.replace(Kt(o), k("token-comment")), e = e.replace(Ut, '<span class="token-keyword">$1</span>'), e = e.replace(Yt, '<span class="token-function">$1</span>'), e = e.replace(Zt, '<span class="token-number">$1</span>'), e = e.replace(Qt, '<span class="token-type">$1</span>'), e = e.replace(Jt, (y, h) => u[tn(h)]), e;
}
const on = { class: "code-block-wrapper doc-code-block" }, sn = { class: "code-block-header" }, rn = { class: "code-lang" }, ln = { class: "code-lines" }, an = ["aria-label"], cn = { class: "code-block-body" }, dn = {
  key: 0,
  class: "line-numbers",
  "aria-hidden": "true"
}, un = ["innerHTML"], hn = /* @__PURE__ */ we({
  __name: "DocCodeBlock",
  props: {
    code: {},
    lang: { default: "text" },
    showLineNumbers: { type: Boolean, default: !0 }
  },
  setup(n) {
    const o = n, { t: e } = Be(), { copied: u, copy: k } = vt({ resetDelay: 1500 }), y = j(() => o.lang || "text"), h = j(() => nn(o.code, o.lang)), a = j(() => o.code.split(`
`).length), l = j(() => u.value ? e("markdownCodeCopied") : e("markdownCodeCopy"));
    return (E, L) => (N(), D("div", on, [
      s("div", sn, [
        s("span", rn, X(y.value), 1),
        s("span", ln, X(a.value) + " lines", 1),
        s("button", {
          type: "button",
          class: te(["code-copy-btn", { copied: I(u) }]),
          "aria-label": l.value,
          onClick: L[0] || (L[0] = (T) => I(k)(n.code))
        }, X(l.value), 11, an)
      ]),
      s("div", cn, [
        n.showLineNumbers ? (N(), D("div", dn, [
          (N(!0), D(oe, null, ge(a.value, (T) => (N(), D("span", {
            key: T,
            class: "line-num"
          }, X(T), 1))), 128))
        ])) : ne("", !0),
        s("pre", null, [
          s("code", {
            class: te(`language-${y.value}`),
            innerHTML: h.value
          }, null, 10, un)
        ])
      ])
    ]));
  }
}), Ke = 44, Xe = 96, Ee = 280, fn = 16, mn = 14, pn = 8, vn = 90, Ue = 28, ke = 48, gn = 4, Ne = 28, de = 20, wn = /[぀-ヿ㐀-鿿豈-﫿￠-￦⺀-〿＀-￯]/;
function kn(n) {
  let o = 0;
  for (const e of n)
    o += wn.test(e) ? mn : pn;
  return o;
}
function yn(n) {
  const o = kn(n.label) + fn * 2;
  if (n.shape === "diamond") {
    const e = Math.min(Math.max(o * 1.5 + 32, Xe * 1.4), Ee * 1.4);
    return { w: e, h: Math.max(64, e * 0.55) };
  }
  return o > Ee ? { w: Ee, h: Ke + 20 } : { w: Math.min(Math.max(o, Xe), Ee), h: Ke };
}
function Ye(n, o = gn) {
  const { nodes: e, edges: u, direction: k } = n, y = { nodes: /* @__PURE__ */ new Map(), edges: [], width: 0, height: 0 };
  if (e.length === 0) return y;
  const h = {};
  for (const t of e) h[t.id] = yn(t);
  const a = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
  for (const t of e)
    a.set(t.id, []), l.set(t.id, 0);
  for (const t of u)
    !a.has(t.from) || !l.has(t.to) || (a.get(t.from).push(t.to), l.set(t.to, l.get(t.to) + 1));
  const E = /* @__PURE__ */ new Map(), L = /* @__PURE__ */ new Set(), T = e.filter((t) => (l.get(t.id) ?? 0) === 0).map((t) => t.id), v = new Map(l);
  for (; T.length > 0; ) {
    const t = T.shift(), c = E.get(t) ?? 0;
    E.set(t, c);
    for (const m of a.get(t) ?? [])
      E.set(m, Math.max(E.get(m) ?? 0, c + 1)), v.set(m, v.get(m) - 1), v.get(m) === 0 && T.push(m);
  }
  for (const t of e) {
    if (E.has(t.id)) continue;
    let c = -1;
    for (const m of u)
      m.to === t.id && E.has(m.from) && (c = Math.max(c, E.get(m.from)));
    E.set(t.id, c + 1);
  }
  u.forEach((t, c) => {
    (E.get(t.to) ?? 0) <= (E.get(t.from) ?? 0) && L.add(c);
  });
  const _ = Math.max(...E.values()), g = Array.from({ length: _ + 1 }, () => []), d = new Map(e.map((t, c) => [t.id, c]));
  for (const t of e)
    g[E.get(t.id)].push(t.id);
  for (const t of g)
    t.sort((c, m) => d.get(c) - d.get(m));
  const b = /* @__PURE__ */ new Map();
  function M() {
    b.clear(), g.forEach((t) => t.forEach((c, m) => b.set(c, m)));
  }
  M();
  const S = /* @__PURE__ */ new Map();
  for (const t of u)
    S.has(t.to) || S.set(t.to, []), S.get(t.to).push(t.from);
  function H(t, c, m) {
    const B = (m.get(t) ?? []).filter((K) => c.has(K));
    return B.length === 0 ? b.get(t) : B.reduce((K, Z) => K + (b.get(Z) ?? 0), 0) / B.length;
  }
  for (let t = 0; t < o; t++) {
    for (let c = 1; c < g.length; c++) {
      const m = new Set(g[c - 1]);
      g[c].sort((B, W) => {
        const K = H(B, m, S), Z = H(W, m, S);
        return K !== Z ? K - Z : b.get(B) - b.get(W);
      }), M();
    }
    for (let c = g.length - 2; c >= 0; c--) {
      const m = new Set(g[c + 1]);
      g[c].sort((B, W) => {
        const K = H(B, m, a), Z = H(W, m, a);
        return K !== Z ? K - Z : b.get(B) - b.get(W);
      }), M();
    }
  }
  const C = k === "TB" || k === "BT", i = k === "RL" || k === "BT", r = g.map(
    (t) => t.reduce((c, m) => Math.max(c, C ? h[m].h : h[m].w), 0)
  ), w = g.map(
    (t) => t.reduce((c, m) => c + (C ? h[m].w : h[m].h), 0) + Math.max(t.length - 1, 0) * Ue
  ), $ = Math.max(...w), V = [];
  {
    let t = ke;
    for (let c = 0; c < g.length; c++)
      V.push(t), t += r[c] + vn;
  }
  const A = /* @__PURE__ */ new Map();
  g.forEach((t, c) => {
    let m = ke + ($ - w[c]) / 2;
    for (const B of t) {
      const W = h[B].w, K = h[B].h, Z = C ? K : W, J = V[c] + (r[c] - Z) / 2;
      A.set(B, {
        id: B,
        // LR：层推进为 x（列）、层内堆叠为 y；TB：层推进为 y（行）、层内为 x
        x: C ? m : J,
        y: C ? J : m,
        w: W,
        h: K
      }), m += (C ? W : K) + Ue;
    }
  });
  let F = 0, Q = 0;
  for (const t of A.values())
    F = Math.max(F, t.x + t.w), Q = Math.max(Q, t.y + t.h);
  if (F += ke, Q += ke, i)
    for (const t of A.values())
      k === "RL" ? t.x = F - t.x - t.w : t.y = Q - t.y - t.h;
  {
    let t = !1;
    for (const c of e) {
      const m = A.get(c.id);
      m && (typeof c.x == "number" && (m.x = c.x, t = !0), typeof c.y == "number" && (m.y = c.y, t = !0));
    }
    if (t) {
      F = 0, Q = 0;
      for (const c of A.values())
        F = Math.max(F, c.x + c.w), Q = Math.max(Q, c.y + c.h);
      F += ke, Q += ke;
    }
  }
  const be = Math.max(0, ...[...A.values()].map((t) => t.x + t.w)), xe = Math.max(0, ...[...A.values()].map((t) => t.y + t.h)), O = [], x = [], q = [], p = [];
  g.forEach((t, c) => {
    let m = 1 / 0, B = -1 / 0, W = 1 / 0, K = -1 / 0;
    for (const Z of t) {
      const J = A.get(Z);
      J && (m = Math.min(m, J.x), B = Math.max(B, J.x + J.w), W = Math.min(W, J.y), K = Math.max(K, J.y + J.h));
    }
    O[c] = m, x[c] = B, q[c] = W, p[c] = K;
  });
  const f = /* @__PURE__ */ new Map();
  {
    let t = 0;
    u.forEach((c, m) => {
      const B = Math.abs((E.get(c.to) ?? 0) - (E.get(c.from) ?? 0));
      (L.has(m) || B >= 2) && f.set(m, t++);
    });
  }
  const R = [];
  if (u.forEach((t, c) => {
    const m = A.get(t.from), B = A.get(t.to);
    if (!m || !B) return;
    const W = L.has(c), K = f.get(c);
    let Z, J;
    if (K !== void 0) {
      const se = E.get(t.from) ?? 0, re = E.get(t.to) ?? 0;
      if (C) {
        const le = m.x + m.w / 2, ie = i ? m.y : m.y + m.h, pe = B.x + B.w / 2, ve = i ? B.y : B.y + B.h, ae = i ? q[se] - de : p[se] + de, ce = i ? q[re] - de : p[re] + de, U = be + Ne + K * de;
        Z = `M ${le},${ie} L ${le},${ae} L ${U},${ae} L ${U},${ce} L ${pe},${ce} L ${pe},${ve}`, J = { x: U, y: (ae + ce) / 2 };
      } else {
        const le = i ? m.x : m.x + m.w, ie = m.y + m.h / 2, pe = i ? B.x : B.x + B.w, ve = B.y + B.h / 2, ae = i ? O[se] - de : x[se] + de, ce = i ? O[re] - de : x[re] + de, U = xe + Ne + K * de;
        Z = `M ${le},${ie} L ${ae},${ie} L ${ae},${U} L ${ce},${U} L ${ce},${ve} L ${pe},${ve}`, J = { x: (ae + ce) / 2, y: U };
      }
    } else {
      let se, re, le, ie, pe, ve, ae, ce;
      if (C) {
        const U = i ? -1 : 1;
        se = m.x + m.w / 2, re = m.y + (U > 0 ? m.h : 0), le = B.x + B.w / 2, ie = B.y + (U > 0 ? 0 : B.h);
        const Ce = Math.max(40, Math.abs(ie - re) / 2);
        pe = se, ve = re + Ce * U, ae = le, ce = ie - Ce * U;
      } else {
        const U = i ? -1 : 1;
        se = m.x + (U > 0 ? m.w : 0), re = m.y + m.h / 2, le = B.x + (U > 0 ? 0 : B.w), ie = B.y + B.h / 2;
        const Ce = Math.max(40, Math.abs(le - se) / 2);
        pe = se + Ce * U, ve = re, ae = le - Ce * U, ce = ie;
      }
      Z = `M ${se},${re} C ${pe},${ve} ${ae},${ce} ${le},${ie}`, J = {
        x: (se + 3 * pe + 3 * ae + le) / 8,
        y: (re + 3 * ve + 3 * ce + ie) / 8
      };
    }
    R.push({ from: t.from, to: t.to, label: t.label, path: Z, labelPos: J, isBackEdge: W });
  }), f.size > 0) {
    const t = f.size - 1;
    C ? F = Math.max(F, be + Ne + t * de + ke) : Q = Math.max(Q, xe + Ne + t * de + ke);
  }
  return { nodes: A, edges: R, width: F, height: Q };
}
const xn = { class: "nm-flow-canvas" }, Mn = ["width", "height"], $n = ["id"], bn = ["d", "marker-end"], Cn = ["role", "tabindex", "aria-label", "onPointerdown", "onClick", "onKeydown"], _n = { class: "nm-flow__node-inner" }, Tn = { class: "nm-flow__node-text" }, Sn = {
  key: 0,
  class: "nm-flow__node-link-icon",
  "aria-hidden": "true"
}, Ln = /* @__PURE__ */ we({
  __name: "DocFlowCanvas",
  props: {
    graph: {},
    height: { default: "480px" },
    showGrid: { type: Boolean, default: !0 },
    editable: { type: Boolean, default: !1 }
  },
  emits: ["navigate", "nodeMove"],
  setup(n, { emit: o }) {
    const e = n, u = o, k = G(), y = ot("nm-flow-arrow"), h = G(null), a = j(() => {
      const r = h.value;
      if (!r) return Ye(e.graph);
      const w = e.graph.nodes.map(
        ($) => $.id === r.id ? { ...$, x: r.x, y: r.y } : $
      );
      return Ye({ ...e.graph, nodes: w });
    }), l = j(() => {
      const r = new Map(e.graph.nodes.map((w) => [w.id, w]));
      return [...a.value.nodes.values()].map((w) => {
        var $, V, A;
        return {
          ...w,
          shape: (($ = r.get(w.id)) == null ? void 0 : $.shape) ?? "rect",
          docPath: (V = r.get(w.id)) == null ? void 0 : V.docPath,
          label: ((A = r.get(w.id)) == null ? void 0 : A.label) ?? w.id
        };
      });
    }), E = j(() => a.value.edges.filter((r) => r.label));
    ue(
      a,
      () => {
        h.value || he(() => {
          requestAnimationFrame(() => {
            var r;
            return (r = k.value) == null ? void 0 : r.fit();
          });
        });
      },
      { immediate: !0 }
    );
    let L = !1;
    function T(r) {
      if (L) {
        L = !1;
        return;
      }
      r && u("navigate", r);
    }
    const v = G(null), _ = G(null);
    function g() {
      window.addEventListener("pointermove", M), window.addEventListener("pointerup", H), window.addEventListener("pointercancel", C);
    }
    function d() {
      window.removeEventListener("pointermove", M), window.removeEventListener("pointerup", H), window.removeEventListener("pointercancel", C);
    }
    function b(r, w) {
      var A;
      if (!e.editable || r.button !== 0) return;
      const $ = (A = v.value) == null ? void 0 : A.getBoundingClientRect(), V = $ && a.value.width > 0 ? $.width / a.value.width : 1;
      _.value = {
        id: w.id,
        startClientX: r.clientX,
        startClientY: r.clientY,
        lastClientX: r.clientX,
        lastClientY: r.clientY,
        scale: V || 1,
        baseX: w.x,
        baseY: w.y,
        moved: !1,
        raf: 0
      }, g();
    }
    function M(r) {
      const w = _.value;
      w && (w.lastClientX = r.clientX, w.lastClientY = r.clientY, w.raf || (w.raf = requestAnimationFrame(S)));
    }
    function S() {
      const r = _.value;
      if (!r) return;
      r.raf = 0;
      const w = (r.lastClientX - r.startClientX) / r.scale, $ = (r.lastClientY - r.startClientY) / r.scale;
      !r.moved && Math.hypot(w, $) < 3 || (r.moved = !0, h.value = {
        id: r.id,
        x: Math.round(r.baseX + w),
        y: Math.round(r.baseY + $)
      });
    }
    function H() {
      d();
      const r = _.value;
      _.value = null, r != null && r.raf && cancelAnimationFrame(r.raf);
      const w = h.value;
      h.value = null, !(!(r != null && r.moved) || !w) && (L = !0, setTimeout(() => {
        L = !1;
      }, 0), u("nodeMove", { id: r.id, x: w.x, y: w.y }));
    }
    function C() {
      d();
      const r = _.value;
      _.value = null, r != null && r.raf && cancelAnimationFrame(r.raf), h.value = null;
    }
    Te(() => {
      var r;
      d(), (r = _.value) != null && r.raf && cancelAnimationFrame(_.value.raf);
    });
    function i(r, w) {
      w && (r.key === "Enter" || r.key === " ") && (r.preventDefault(), u("navigate", w));
    }
    return (r, w) => (N(), D("div", xn, [
      z(gt, {
        ref_key: "canvasRef",
        ref: k,
        width: "100%",
        height: n.height,
        "show-grid": n.showGrid,
        "grid-variant": "dots",
        "show-fit": "",
        "min-zoom": 0.25,
        "max-zoom": 3
      }, {
        default: P(() => [
          s("div", {
            ref_key: "flowEl",
            ref: v,
            class: te(["nm-flow", { "nm-flow--editable": n.editable }]),
            style: De({ width: `${a.value.width}px`, height: `${a.value.height}px` })
          }, [
            (N(), D("svg", {
              class: "nm-flow__edges",
              width: a.value.width,
              height: a.value.height,
              "aria-hidden": "true"
            }, [
              s("defs", null, [
                s("marker", {
                  id: I(y),
                  viewBox: "0 0 10 10",
                  refX: "9",
                  refY: "5",
                  markerWidth: "7",
                  markerHeight: "7",
                  orient: "auto-start-reverse"
                }, [...w[0] || (w[0] = [
                  s("path", {
                    class: "nm-flow__arrow-path",
                    d: "M 0 1 L 9 5 L 0 9 z"
                  }, null, -1)
                ])], 8, $n)
              ]),
              (N(!0), D(oe, null, ge(a.value.edges, ($, V) => (N(), D("path", {
                key: V,
                d: $.path,
                class: te(["nm-flow__edge", { "nm-flow__edge--back": $.isBackEdge }]),
                "marker-end": `url(#${I(y)})`
              }, null, 10, bn))), 128))
            ], 8, Mn)),
            (N(!0), D(oe, null, ge(E.value, ($, V) => (N(), D("div", {
              key: `label-${V}`,
              class: "nm-flow__edge-label",
              style: De({ left: `${$.labelPos.x}px`, top: `${$.labelPos.y}px` })
            }, X($.label), 5))), 128)),
            (N(!0), D(oe, null, ge(l.value, ($) => (N(), D("div", {
              key: $.id,
              class: te(["nm-flow__node", [`nm-flow__node--${$.shape}`, { "nm-flow__node--link": $.docPath }]]),
              style: De({
                left: `${$.x}px`,
                top: `${$.y}px`,
                width: `${$.w}px`,
                height: `${$.h}px`
              }),
              role: $.docPath ? "link" : void 0,
              tabindex: $.docPath ? 0 : void 0,
              "aria-label": $.docPath ? `${$.label}（跳转到文档）` : $.label,
              "data-nm-no-pan": "",
              onPointerdown: (V) => b(V, $),
              onClick: (V) => T($.docPath),
              onKeydown: (V) => i(V, $.docPath)
            }, [
              s("div", _n, [
                s("span", Tn, X($.label), 1),
                $.docPath ? (N(), D("span", Sn, [...w[1] || (w[1] = [
                  s("svg", {
                    width: "12",
                    height: "12",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2.5",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                  }, [
                    s("path", { d: "M7 17L17 7M8 7h9v9" })
                  ], -1)
                ])])) : ne("", !0)
              ])
            ], 46, Cn))), 128))
          ], 6)
        ]),
        _: 1
      }, 8, ["height", "show-grid"])
    ]));
  }
}), it = /* @__PURE__ */ He(Ln, [["__scopeId", "data-v-fb6214a4"]]);
function at(n) {
  return n.map((o) => {
    const e = o;
    return e.text ? String(e.text) : e.tokens ? at(e.tokens) : "";
  }).join("");
}
function En(n) {
  const o = ot("toc");
  function e(h) {
    return `${o}-${qe(h)}`;
  }
  function u(h) {
    const a = [], l = /* @__PURE__ */ new Set(), E = Ae.lexer(h);
    for (const L of E)
      if (L.type === "heading") {
        const T = at(L.tokens);
        let v = qe(T);
        v || (v = "heading");
        let _ = `${o}-${v}`, g = 1;
        for (; l.has(_); )
          _ = `${o}-${v}-${g}`, g++;
        l.add(_), a.push({
          level: L.depth,
          text: T,
          id: _
        });
      }
    return a;
  }
  const k = j(() => u(n.value)), y = j(() => {
    const h = k.value, a = [], l = [];
    for (const E of h) {
      const L = { level: E.level, text: E.text, id: E.id, children: [] };
      for (; l.length > 0 && l[l.length - 1].level >= L.level; )
        l.pop();
      l.length === 0 ? a.push(L) : l[l.length - 1].children.push(L), l.push(L);
    }
    return a;
  });
  return { toc: k, tocTree: y, makeUniqueId: e };
}
const Nn = { class: "neumorphism-markdown-body" }, Rn = {
  key: 0,
  class: "neumorphism-markdown-error",
  role: "alert"
}, Bn = { class: "neumorphism-markdown-error-msg" }, Hn = ["innerHTML"], Dn = ["aria-label"], An = { class: "neumorphism-toc-mobile-header" }, In = { class: "neumorphism-toc-mobile-title" }, Pn = ["aria-label"], ct = /* @__PURE__ */ we({
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
    const e = n, u = o, k = G(null), y = G(!1), { t: h } = Be(), { toc: a, tocTree: l, makeUniqueId: E } = En(ze(e, "content"));
    function L(p) {
      i(p), y.value = !1;
    }
    const T = new Ae.Renderer();
    T.code = ({ text: p, lang: f }) => f === "mermaid" ? `<div class="mermaid-diagram" data-mermaid="${me(p)}"><pre><code>${me(p)}</code></pre></div>` : f === "prodoc-flow" ? `<div class="prodoc-flow-diagram"><pre><code>${me(p)}</code></pre></div>` : `<div class="doc-code-block-mount" data-lang="${me(f || "text")}"><pre><code>${me(p)}</code></pre></div>`, T.codespan = ({ text: p }) => `<code class="inline-code">${me(p)}</code>`, T.image = ({ href: p, title: f, text: R }) => `<img src="${p}" alt="${me(R)}" title="${me(f || "")}" loading="lazy" />`, T.listitem = function({ tokens: p, task: f, checked: R }) {
      if (f) {
        const t = this.parser.parse(p.slice(1));
        return `
      <li class="task-list-item">
        <label class="task-checkbox">
          <input type="checkbox" ${R ? "checked" : ""} disabled />
          <span class="checkmark"></span>
          <span class="task-text">${t}</span>
        </label>
      </li>
    `;
      }
      return `<li>${this.parser.parse(p)}</li>`;
    };
    const v = G(null), _ = G("");
    let g = null, d = !1, b = !1;
    function M() {
      d || (d = !0, import("dompurify").then((p) => {
        const f = p == null ? void 0 : p.default;
        f && typeof f.sanitize == "function" && (g = (R) => f.sanitize(R, {
          // Preserve the data-* hooks emitted by this renderer.
          ADD_ATTR: ["data-mermaid", "data-code", "data-heading-id", "data-lang", "target"]
        }), S());
      }).catch(() => {
        b || (b = !0, console.warn(
          "[MarkdownRenderer] dompurify 未安装，markdown 输出未做 XSS 净化；建议安装 dompurify 作为可选依赖以渲染不可信内容。"
        ));
      }));
    }
    function S() {
      v.value = null;
      try {
        const p = a.value.map((c) => c.id);
        let f = 0;
        const R = Object.create(T);
        R.heading = ({ tokens: c, depth: m }) => {
          const B = H(c), W = p[f++] ?? E(B);
          return `<h${m} id="${W}"><a href="#" data-heading-id="${W}" class="heading-anchor" aria-hidden="true">#</a>${B}</h${m}>`;
        };
        const t = Ae.parse(e.content, {
          async: !1,
          gfm: !0,
          breaks: !1,
          renderer: R
        });
        _.value = g ? g(t) : t;
      } catch (p) {
        v.value = p.message || "Unknown error rendering markdown", _.value = "";
      }
    }
    function H(p) {
      return p.map((f) => {
        const R = f;
        return R.text ? String(R.text) : R.tokens ? H(R.tokens) : "";
      }).join("");
    }
    M(), ue(() => e.content, S, { immediate: !0 });
    const { activeHeading: C, scrollToHeading: i } = Dt({
      content: k,
      scrollContainer: ze(e, "scrollContainer"),
      watchSource: () => _.value
    }), r = G(/* @__PURE__ */ new Set());
    ue(
      () => e.content,
      () => {
        r.value = /* @__PURE__ */ new Set();
      }
    );
    async function w() {
      if (!k.value) return;
      const p = k.value.querySelectorAll(".mermaid-diagram");
      if (p.length !== 0)
        try {
          const f = await import("mermaid").catch(() => null);
          if (!(f != null && f.default)) return;
          let R = 0;
          for (const t of Array.from(p)) {
            const c = t.getAttribute("data-mermaid") ?? t.textContent ?? "";
            if (c.trim())
              try {
                const { svg: m } = await f.default.render(`nm-mermaid-${Date.now()}-${R++}`, c);
                t.innerHTML = m, t.setAttribute("data-processed", "true");
              } catch {
              }
          }
        } catch {
        }
    }
    ue(_, () => {
      Q(), he($);
    }), ut($);
    function $() {
      w(), O(), x(), be();
    }
    let V = [], A = null;
    const F = ht();
    function Q() {
      const p = /* @__PURE__ */ new Map();
      for (const f of V) {
        const R = p.get(f.key) ?? [];
        R.push({ rootEl: f.rootEl, ownerContainer: f.ownerContainer }), p.set(f.key, R);
      }
      V = [], A = p;
    }
    function be() {
      if (A) {
        for (const p of A.values())
          for (const f of p)
            Se(null, f.ownerContainer);
        A = null;
      }
    }
    function xe(p, f, R) {
      const t = A == null ? void 0 : A.get(f), c = t == null ? void 0 : t.shift();
      if (t && t.length === 0 && (A == null || A.delete(f)), p.innerHTML = "", c) {
        p.appendChild(c.rootEl), V.push({
          key: f,
          rootEl: c.rootEl,
          ownerContainer: c.ownerContainer
        });
        return;
      }
      const m = R();
      m.appContext = (F == null ? void 0 : F.appContext) ?? null, Se(m, p);
      const B = p.firstElementChild;
      B && V.push({ key: f, rootEl: B, ownerContainer: p });
    }
    function O() {
      if (!k.value) return;
      k.value.querySelectorAll(".prodoc-flow-diagram").forEach((f, R) => {
        var m;
        const t = ((m = f.querySelector("pre code")) == null ? void 0 : m.textContent) ?? f.textContent ?? "", c = lt(t);
        c.nodes.length !== 0 && xe(
          f,
          `flow:${t}`,
          () => Oe(it, {
            graph: c,
            height: "420px",
            editable: e.flowEditable,
            onNavigate: (B) => u("docLink", B),
            onNodeMove: (B) => u("flowNodeMove", { ...B, source: t, blockIndex: R })
          })
        );
      });
    }
    function x() {
      var f;
      if (!k.value) return;
      const p = k.value.querySelectorAll(".doc-code-block-mount");
      for (const R of p) {
        const t = ((f = R.querySelector("pre code")) == null ? void 0 : f.textContent) ?? R.textContent ?? "", c = R.dataset.lang || "text";
        xe(R, `code:${c}:${t}`, () => Oe(hn, { code: t, lang: c }));
      }
    }
    function q(p) {
      const f = p.target, R = f.closest(".heading-anchor");
      if (R) {
        const c = R.dataset.headingId;
        c && (p.preventDefault(), i(c));
        return;
      }
      const t = f.closest("a");
      if (t) {
        const c = t.getAttribute("href");
        c && !c.startsWith("//") && (c.startsWith("/") || c.startsWith(".") || c.endsWith(".md")) && (p.preventDefault(), u("docLink", c));
      }
    }
    return Te(() => {
      for (const p of V)
        Se(null, p.ownerContainer);
      if (V = [], A) {
        for (const p of A.values())
          for (const f of p)
            Se(null, f.ownerContainer);
        A = null;
      }
    }), (p, f) => (N(), D("div", {
      class: te(`neumorphism-markdown ${e.className}`)
    }, [
      s("div", Nn, [
        v.value ? (N(), D("div", Rn, [
          f[5] || (f[5] = Ve('<p class="neumorphism-markdown-error-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg> 渲染错误 </p>', 1)),
          s("pre", Bn, X(v.value), 1)
        ])) : (N(), D("div", {
          key: 1,
          ref_key: "contentRef",
          ref: k,
          class: "neumorphism-markdown-content",
          onClick: q,
          innerHTML: _.value
        }, null, 8, Hn))
      ]),
      n.showToc && I(a).length > 0 ? (N(), fe(Ge, {
        key: 0,
        "collapsed-groups": r.value,
        "onUpdate:collapsedGroups": f[0] || (f[0] = (R) => r.value = R),
        items: I(l),
        "active-id": I(C),
        onSelect: I(i)
      }, null, 8, ["collapsed-groups", "items", "active-id", "onSelect"])) : ne("", !0),
      n.showToc && I(a).length > 0 ? (N(), D("button", {
        key: 1,
        class: te(["neumorphism-toc-mobile-btn", { active: y.value }]),
        "aria-label": I(h)("markdownTocToggle"),
        onClick: f[1] || (f[1] = (R) => y.value = !y.value)
      }, [...f[6] || (f[6] = [
        Ve('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>', 1)
      ])], 10, Dn)) : ne("", !0),
      z(Ze, { name: "neumorphism-toc-drawer" }, {
        default: P(() => [
          n.showToc && I(a).length > 0 && y.value ? (N(), D("div", {
            key: 0,
            class: "neumorphism-toc-mobile-overlay",
            onClick: f[4] || (f[4] = ft((R) => y.value = !1, ["self"]))
          }, [
            z(ye, {
              elevation: 0,
              class: "neumorphism-toc-mobile-panel"
            }, {
              default: P(() => [
                s("div", An, [
                  s("span", In, [
                    f[7] || (f[7] = s("svg", {
                      width: "14",
                      height: "14",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "aria-hidden": "true"
                    }, [
                      s("path", { d: "M8 6h13M8 12h13M8 18h13" }),
                      s("circle", {
                        cx: "4",
                        cy: "6",
                        r: "1"
                      }),
                      s("circle", {
                        cx: "4",
                        cy: "12",
                        r: "1"
                      }),
                      s("circle", {
                        cx: "4",
                        cy: "18",
                        r: "1"
                      })
                    ], -1)),
                    Y(" " + X(I(h)("markdownTocLabel")), 1)
                  ]),
                  s("button", {
                    class: "neumorphism-toc-mobile-close",
                    "aria-label": I(h)("markdownTocClose"),
                    onClick: f[2] || (f[2] = (R) => y.value = !1)
                  }, [...f[8] || (f[8] = [
                    s("svg", {
                      width: "14",
                      height: "14",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      "aria-hidden": "true"
                    }, [
                      s("path", { d: "M18 6L6 18M6 6l12 12" })
                    ], -1)
                  ])], 8, Pn)
                ]),
                z(Ge, {
                  "collapsed-groups": r.value,
                  "onUpdate:collapsedGroups": f[3] || (f[3] = (R) => r.value = R),
                  items: I(l),
                  "active-id": I(C),
                  framed: !1,
                  onSelect: L
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
}), zn = ["width", "height"], Vn = ["d"], dt = /* @__PURE__ */ we({
  __name: "DocTreeIcon",
  props: {
    name: { default: "file" },
    size: { default: 14 }
  },
  setup(n) {
    const o = n, e = {
      folder: ["M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"],
      api: ["M12 22v-5", "M9 8V2", "M15 8V2", "M18 8v3a6 6 0 0 1-12 0V8z"],
      guide: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
      config: ["M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"],
      example: [
        "M9 18h6",
        "M10 22h4",
        "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"
      ],
      install: [
        "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        "M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
      ],
      changelog: [
        "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
        "M14 2v6h6",
        "M16 13H8M16 17H8"
      ],
      faq: [
        "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
        "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
        "M12 17h.01"
      ],
      file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"]
    }, u = j(() => e[o.name] ?? e.file);
    return (k, y) => (N(), D("svg", {
      width: o.size,
      height: o.size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true"
    }, [
      (N(!0), D(oe, null, ge(u.value, (h, a) => (N(), D("path", {
        key: a,
        d: h
      }, null, 8, Vn))), 128))
    ], 8, zn));
  }
}), On = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, qn = { class: "neumorphism-header-search" }, jn = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, Fn = { class: "neumorphism-search-list" }, Wn = ["onClick"], Gn = { class: "neumorphism-search-title" }, Kn = { class: "neumorphism-search-path" }, Xn = {
  key: 0,
  class: "neumorphism-sider-content"
}, Un = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, Yn = { class: "neumorphism-doc-header" }, Zn = { class: "neumorphism-doc-title" }, Qn = { class: "neumorphism-doc-meta" }, Jn = { class: "neumorphism-doc-body" }, eo = {
  key: 1,
  class: "neumorphism-empty-state"
}, to = /* @__PURE__ */ we({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(n, { emit: o }) {
    const e = n, u = o, {
      selectedPath: k,
      selectedKeys: y,
      expandedKeys: h,
      treeData: a,
      displayNode: l,
      themeModel: E,
      searchQuery: L,
      searchResults: T,
      docTree: v,
      handleTreeSelect: _,
      handleDocLink: g,
      handleSearchSelect: d
    } = rt({ root: e.root, initialPath: e.initialPath });
    function b(C) {
      g(u, C);
    }
    const M = G("doc"), S = j(
      () => l.value ? We(l.value) : null
    );
    ue(l, () => {
      M.value = "doc";
    });
    function H(C) {
      const i = v.value.findByPath(C) ?? v.value.findByPath(`/${C}`) ?? v.value.findByPath(C.replace(/^\//, ""));
      i && (g(u, i.path), We(i) || (M.value = "doc"));
    }
    return (C, i) => (N(), D("div", {
      class: te(`neumorphism-doc-viewer ${e.className}`)
    }, [
      z(Qe, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": P(() => [...i[7] || (i[7] = [
          s("span", { class: "neumorphism-header-brand" }, [
            s("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true"
            }, [
              s("path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" })
            ]),
            Y(" Doc Viewer")
          ], -1)
        ])]),
        "header-right": P(() => [
          s("div", On, [
            z(ee, {
              size: "small",
              variant: M.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": M.value === "doc",
              onClick: i[0] || (i[0] = (r) => M.value = "doc")
            }, {
              default: P(() => [...i[8] || (i[8] = [
                s("svg", {
                  class: "neumorphism-doc-icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "aria-hidden": "true"
                }, [
                  s("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                  s("path", { d: "M14 2v6h6" }),
                  s("path", { d: "M16 13H8M16 17H8M10 9H8" })
                ], -1),
                Y(" 文档 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            z(ee, {
              size: "small",
              variant: M.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": M.value === "canvas",
              disabled: !S.value,
              title: S.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: i[1] || (i[1] = (r) => M.value = "canvas")
            }, {
              default: P(() => [...i[9] || (i[9] = [
                s("svg", {
                  class: "neumorphism-doc-icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "aria-hidden": "true"
                }, [
                  s("path", { d: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" }),
                  s("path", { d: "M8 2v16M16 6v16" })
                ], -1),
                Y(" 画布 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          s("div", qn, [
            z(pt, {
              modelValue: I(L),
              "onUpdate:modelValue": i[2] || (i[2] = (r) => $e(L) ? L.value = r : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            I(T).length > 0 ? (N(), D("div", jn, [
              s("ul", Fn, [
                (N(!0), D(oe, null, ge(I(T), (r) => (N(), D("li", {
                  key: r.id,
                  class: "neumorphism-search-item",
                  onClick: (w) => I(d)(r)
                }, [
                  s("span", Gn, X(r.title), 1),
                  s("span", Kn, X(r.path), 1)
                ], 8, Wn))), 128))
              ])
            ])) : ne("", !0)
          ]),
          z(Je, {
            modelValue: I(E),
            "onUpdate:modelValue": i[3] || (i[3] = (r) => $e(E) ? E.value = r : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: P(({ collapsed: r }) => [
          r ? (N(), D("div", Un, [...i[10] || (i[10] = [
            s("svg", {
              class: "neumorphism-doc-icon-lg",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true"
            }, [
              s("path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" })
            ], -1)
          ])])) : (N(), D("div", Xn, [
            z(et, {
              "selected-keys": I(y),
              "onUpdate:selectedKeys": i[4] || (i[4] = (w) => $e(y) ? y.value = w : null),
              "expanded-keys": I(h),
              "onUpdate:expandedKeys": i[5] || (i[5] = (w) => $e(h) ? h.value = w : null),
              data: I(a),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(_)
            }, {
              icon: P(({ node: w }) => [
                z(dt, {
                  name: String(w.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: P(() => [
          z(nt, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: P(() => [
              z(ye, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: P(() => [
                  I(l) ? (N(), D(oe, { key: 0 }, [
                    s("div", Yn, [
                      s("h1", Zn, X(I(l).title), 1),
                      s("div", Qn, [
                        I(l).path ? (N(), fe(_e, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: P(() => [
                            Y(X(I(l).path), 1)
                          ]),
                          _: 1
                        })) : ne("", !0),
                        I(l).children.length > 0 ? (N(), fe(_e, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: P(() => [...i[11] || (i[11] = [
                            s("svg", {
                              class: "neumorphism-doc-icon-inline",
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              "stroke-width": "2",
                              "stroke-linecap": "round",
                              "stroke-linejoin": "round",
                              "aria-hidden": "true"
                            }, [
                              s("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })
                            ], -1),
                            Y(" { displayNode.children.length } 个子项 ", -1)
                          ])]),
                          _: 1
                        })) : ne("", !0)
                      ])
                    ]),
                    z(tt),
                    s("div", Jn, [
                      z(Ze, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: P(() => [
                          M.value === "doc" ? (N(), fe(ct, {
                            key: I(l).path,
                            content: I(l).body,
                            onDocLink: b
                          }, null, 8, ["content"])) : S.value ? (N(), fe(it, {
                            key: `${I(l).path}:canvas`,
                            graph: S.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: H
                          }, null, 8, ["graph"])) : ne("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (N(), D("div", eo, [
                    z(ye, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: P(() => [...i[12] || (i[12] = [
                        s("span", { class: "neumorphism-doc-empty-icon" }, [
                          s("svg", {
                            class: "neumorphism-doc-icon-3xl",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            "stroke-width": "2",
                            "stroke-linecap": "round",
                            "stroke-linejoin": "round",
                            "aria-hidden": "true"
                          }, [
                            s("path", { d: "M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" })
                          ])
                        ], -1)
                      ])]),
                      _: 1
                    }),
                    i[14] || (i[14] = s("p", null, "请从左侧选择一篇文档", -1)),
                    z(ee, {
                      variant: "raised",
                      size: "small",
                      onClick: i[6] || (i[6] = (r) => {
                        var w;
                        return k.value = ((w = I(a)[0]) == null ? void 0 : w.key) ?? "";
                      })
                    }, {
                      default: P(() => [...i[13] || (i[13] = [
                        Y(" 打开第一篇 ", -1)
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
}), Yo = /* @__PURE__ */ He(to, [["__scopeId", "data-v-3c867c3e"]]), no = { class: "neumorphism-editor-toolbar" }, oo = { class: "neumorphism-editor-toolbar-left" }, so = { class: "neumorphism-editor-toolbar-right" }, ro = ["aria-selected", "tabindex", "onClick", "onKeydown"], lo = {
  class: "neumorphism-editor-icon",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, io = { class: "nm-tabs__tab-label" }, ao = { class: "editor-stat" }, co = /* @__PURE__ */ we({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(n, { emit: o }) {
    const e = n, u = o, k = G("split");
    function y(O) {
      u("docLink", O);
    }
    function h(O, x) {
      if (O.key !== "ArrowLeft" && O.key !== "ArrowRight") return;
      O.preventDefault();
      const q = a.findIndex((R) => R.key === x), p = O.key === "ArrowRight" ? 1 : -1, f = a[(q + p + a.length) % a.length];
      k.value = f.key, he(() => {
        var R, t;
        (t = (R = O.target.closest(".nm-tabs__nav")) == null ? void 0 : R.querySelectorAll(".nm-tabs__tab")[a.indexOf(f)]) == null || t.focus();
      });
    }
    const a = [
      { key: "edit", label: "编辑" },
      { key: "split", label: "分栏" },
      { key: "preview", label: "预览" }
    ], l = j(() => e.value.length), E = j(() => e.value.split(`
`).length), L = G(null), T = G(null);
    let v = !1;
    function _() {
      var O;
      return (O = L.value) == null ? void 0 : O.querySelector("textarea");
    }
    function g(O, x, q) {
      const p = _();
      if (!p) return;
      const f = p.selectionStart, R = p.selectionEnd, t = p.value.slice(f, R) || q, c = p.value.slice(0, f) + O + t + x + p.value.slice(R);
      u("change", c), he(() => {
        p.focus();
        const m = f + O.length;
        p.setSelectionRange(m, m + t.length);
      });
    }
    function d(O, x) {
      const q = _();
      if (!q) return;
      const p = q.selectionStart, f = q.value.slice(0, p), R = q.value.slice(p), m = `${f.length > 0 && !f.endsWith(`
`) ? `
` : ""}${O} ${x}
`, B = f + m + R;
      u("change", B), he(() => {
        q.focus();
        const W = p + m.length - x.length - 2;
        q.setSelectionRange(W, W + x.length);
      });
    }
    function b() {
      g("**", "**", "粗体文字");
    }
    function M() {
      g("_", "_", "斜体文字");
    }
    function S() {
      d("##", "标题");
    }
    function H() {
      g("[", "](url)", "链接文字");
    }
    function C() {
      d("![alt text]", "(url)");
    }
    function i() {
      g("`", "`", "代码");
    }
    function r() {
      d("```\n", "code\n```");
    }
    function w() {
      d("-", "列表项");
    }
    function $() {
      const O = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, x = _();
      if (!x) return;
      const q = x.selectionStart, p = x.value.slice(0, q) + O + x.value.slice(x.selectionEnd);
      u("change", p), he(() => {
        x.focus(), x.setSelectionRange(q + 3, q + 3);
      });
    }
    function V(O) {
      var f, R;
      const x = (R = (f = O.dataTransfer) == null ? void 0 : f.files) == null ? void 0 : R[0];
      if (!(x != null && x.type.startsWith("image/"))) return;
      O.preventDefault(), O.stopPropagation();
      const q = new FileReader(), p = x.name;
      q.onload = () => {
        const t = _();
        if (!t) return;
        const c = t.selectionStart, m = `![${p}](${q.result})`, B = t.value.slice(0, c) + m + t.value.slice(c);
        u("change", B), he(() => {
          t.focus(), t.setSelectionRange(c + m.length, c + m.length);
        });
      }, q.readAsDataURL(x);
    }
    function A(O) {
      var x;
      (x = O.dataTransfer) != null && x.types.includes("Files") && O.preventDefault();
    }
    let F = null;
    function Q() {
      e.autoSave && (F && clearTimeout(F), F = setTimeout(() => {
        u("change", e.value);
      }, e.autoSaveInterval));
    }
    ue(
      () => e.value,
      () => {
        Q();
      }
    ), Te(() => {
      F && clearTimeout(F);
    });
    function be() {
      var p;
      if (v || k.value !== "split") return;
      const O = (p = L.value) == null ? void 0 : p.querySelector("textarea"), x = T.value;
      if (!O || !x) return;
      const q = O.scrollTop / (O.scrollHeight - O.clientHeight || 1);
      v = !0, x.scrollTop = q * (x.scrollHeight - x.clientHeight), requestAnimationFrame(() => {
        v = !1;
      });
    }
    function xe() {
      var p;
      if (v || k.value !== "split") return;
      const O = (p = L.value) == null ? void 0 : p.querySelector("textarea"), x = T.value;
      if (!O || !x) return;
      const q = x.scrollTop / (x.scrollHeight - x.clientHeight || 1);
      v = !0, O.scrollTop = q * (O.scrollHeight - O.clientHeight), requestAnimationFrame(() => {
        v = !1;
      });
    }
    return (O, x) => (N(), D("div", {
      class: te(`neumorphism-markdown-editor ${e.className}`)
    }, [
      s("div", no, [
        s("div", oo, [
          z(ee, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            "aria-label": "粗体",
            onClick: b
          }, {
            default: P(() => [...x[2] || (x[2] = [
              s("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            "aria-label": "斜体",
            onClick: M
          }, {
            default: P(() => [...x[3] || (x[3] = [
              s("em", null, "I", -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "标题",
            "aria-label": "标题",
            onClick: S
          }, {
            default: P(() => [...x[4] || (x[4] = [
              Y(" H ", -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "链接",
            "aria-label": "链接",
            onClick: H
          }, {
            default: P(() => [...x[5] || (x[5] = [
              s("svg", {
                class: "neumorphism-editor-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
                s("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })
              ], -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "图片",
            "aria-label": "图片",
            onClick: C
          }, {
            default: P(() => [...x[6] || (x[6] = [
              s("svg", {
                class: "neumorphism-editor-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("rect", {
                  x: "3",
                  y: "3",
                  width: "18",
                  height: "18",
                  rx: "2"
                }),
                s("circle", {
                  cx: "9",
                  cy: "9",
                  r: "2"
                }),
                s("path", { d: "M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })
              ], -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "行内代码",
            "aria-label": "行内代码",
            onClick: i
          }, {
            default: P(() => [...x[7] || (x[7] = [
              Y(" </> ", -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "代码块",
            "aria-label": "代码块",
            onClick: r
          }, {
            default: P(() => [...x[8] || (x[8] = [
              s("svg", {
                class: "neumorphism-editor-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("rect", {
                  x: "8",
                  y: "2",
                  width: "8",
                  height: "4",
                  rx: "1"
                }),
                s("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" })
              ], -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "无序列表",
            "aria-label": "无序列表",
            onClick: w
          }, {
            default: P(() => [...x[9] || (x[9] = [
              s("svg", {
                class: "neumorphism-editor-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("path", { d: "M8 6h13M8 12h13M8 18h13" }),
                s("path", { d: "M3 6h.01M3 12h.01M3 18h.01" })
              ], -1)
            ])]),
            _: 1
          }),
          z(ee, {
            size: "small",
            title: "表格",
            "aria-label": "表格",
            onClick: $
          }, {
            default: P(() => [...x[10] || (x[10] = [
              s("svg", {
                class: "neumorphism-editor-icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true"
              }, [
                s("rect", {
                  x: "3",
                  y: "3",
                  width: "18",
                  height: "18",
                  rx: "2"
                }),
                s("path", { d: "M3 9h18M3 15h18M9 3v18" })
              ], -1)
            ])]),
            _: 1
          })
        ]),
        s("div", so, [
          z(wt, {
            modelValue: k.value,
            "onUpdate:modelValue": x[0] || (x[0] = (q) => k.value = q),
            tabs: a,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, {
            tab: P(({ tab: q, active: p, activate: f }) => [
              s("button", {
                type: "button",
                class: te(["nm-tabs__tab", { "nm-tabs__tab--active": p }]),
                role: "tab",
                "aria-selected": p,
                tabindex: p ? 0 : -1,
                onClick: (R) => f(q.key),
                onKeydown: (R) => h(R, q.key)
              }, [
                (N(), D("svg", lo, [
                  q.key === "edit" ? (N(), D(oe, { key: 0 }, [
                    x[11] || (x[11] = s("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }, null, -1)),
                    x[12] || (x[12] = s("path", { d: "M15 5l4 4" }, null, -1))
                  ], 64)) : q.key === "split" ? (N(), D(oe, { key: 1 }, [
                    x[13] || (x[13] = s("rect", {
                      x: "3",
                      y: "3",
                      width: "18",
                      height: "18",
                      rx: "2"
                    }, null, -1)),
                    x[14] || (x[14] = s("path", { d: "M12 3v18" }, null, -1))
                  ], 64)) : (N(), D(oe, { key: 2 }, [
                    x[15] || (x[15] = s("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }, null, -1)),
                    x[16] || (x[16] = s("circle", {
                      cx: "12",
                      cy: "12",
                      r: "3"
                    }, null, -1))
                  ], 64))
                ])),
                s("span", io, X(q.label), 1)
              ], 42, ro)
            ]),
            _: 1
          }, 8, ["modelValue"]),
          s("span", ao, X(E.value) + " 行 · " + X(l.value) + " 字", 1)
        ])
      ]),
      s("div", {
        class: te(["neumorphism-editor-panels", `neumorphism-mode-${k.value}`])
      }, [
        s("div", {
          ref_key: "editPanelRef",
          ref: L,
          class: te(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: k.value === "preview" }]),
          onScroll: be,
          onDrop: V,
          onDragover: A
        }, [
          z(ye, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: P(() => [
              z(kt, {
                class: "neumorphism-editor-textarea",
                "model-value": e.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": x[1] || (x[1] = (q) => u("change", q))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        s("div", {
          ref_key: "previewPanelRef",
          ref: T,
          class: te(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: k.value === "edit" }]),
          onScroll: xe
        }, [
          z(ye, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: P(() => [
              z(ct, {
                content: e.value,
                "show-toc": !1,
                onDocLink: y
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), uo = /* @__PURE__ */ He(co, [["__scopeId", "data-v-d8c1b88c"]]), ho = { class: "neumorphism-editor-actions" }, fo = {
  key: 0,
  class: "neumorphism-editor-sider"
}, mo = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, po = {
  key: 0,
  class: "neumorphism-editor-layout"
}, vo = { class: "neumorphism-editor-header" }, go = { class: "neumorphism-editor-title" }, wo = { class: "neumorphism-editor-meta" }, ko = { class: "neumorphism-editor-body" }, yo = {
  key: 1,
  class: "neumorphism-editor-empty"
}, xo = 50, Mo = /* @__PURE__ */ we({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(n, { emit: o }) {
    const e = n, u = o, {
      selectedPath: k,
      selectedKeys: y,
      expandedKeys: h,
      treeData: a,
      displayNode: l,
      themeModel: E,
      handleTreeSelect: L
    } = rt({ root: e.root, initialPath: e.initialPath }), T = G({}), v = G([]);
    function _(C, i) {
      const r = v.value.filter((w) => w !== C);
      for (r.push(C); r.length > xo; ) {
        const w = r.shift();
        w !== C && delete T.value[w];
      }
      v.value = r, T.value[C] = i;
    }
    function g(C) {
      return T.value[C.path] ?? C.content;
    }
    function d(C) {
      l.value && _(l.value.path, C);
    }
    function b() {
      l.value && u("save", l.value.path, g(l.value));
    }
    function M(C) {
      k.value = C, u("docLink", C);
    }
    const S = j(() => {
      if (!l.value) return !1;
      const C = T.value[l.value.path];
      return C !== void 0 && C !== l.value.content;
    });
    function H(C) {
      (C.ctrlKey || C.metaKey) && C.key === "s" && (C.preventDefault(), b());
    }
    return (C, i) => (N(), D("div", {
      class: te(`neumorphism-doc-editor ${e.className}`),
      onKeydown: H
    }, [
      z(Qe, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": P(() => [...i[4] || (i[4] = [
          s("span", { class: "neumorphism-editor-brand" }, [
            s("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true"
            }, [
              s("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
              s("path", { d: "M15 5l4 4" })
            ]),
            Y(" Doc Editor")
          ], -1)
        ])]),
        "header-center": P(() => [
          z(Je, {
            modelValue: I(E),
            "onUpdate:modelValue": i[0] || (i[0] = (r) => $e(E) ? E.value = r : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": P(() => [
          s("div", ho, [
            S.value ? (N(), fe(_e, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: P(() => [...i[5] || (i[5] = [
                Y(" 未保存 ", -1)
              ])]),
              _: 1
            })) : ne("", !0),
            z(ee, {
              variant: "raised",
              size: "small",
              disabled: !S.value,
              onClick: b
            }, {
              default: P(() => [...i[6] || (i[6] = [
                s("svg", {
                  class: "neumorphism-doc-icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "aria-hidden": "true"
                }, [
                  s("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
                  s("path", { d: "M17 21v-8H7v8" }),
                  s("path", { d: "M7 3v5h8" })
                ], -1),
                Y(" 保存 ", -1)
              ])]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: P(({ collapsed: r }) => [
          r ? (N(), D("div", mo, [...i[7] || (i[7] = [
            s("svg", {
              class: "neumorphism-doc-icon-lg",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true"
            }, [
              s("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
            ], -1)
          ])])) : (N(), D("div", fo, [
            z(et, {
              "selected-keys": I(y),
              "onUpdate:selectedKeys": i[1] || (i[1] = (w) => $e(y) ? y.value = w : null),
              "expanded-keys": I(h),
              "onUpdate:expandedKeys": i[2] || (i[2] = (w) => $e(h) ? h.value = w : null),
              data: I(a),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: I(L)
            }, {
              icon: P(({ node: w }) => [
                z(dt, {
                  name: String(w.icon ?? "file")
                }, null, 8, ["name"])
              ]),
              _: 1
            }, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: P(() => [
          z(nt, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: P(() => [
              z(ye, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: P(() => [
                  I(l) ? (N(), D("div", po, [
                    s("header", vo, [
                      s("div", null, [
                        s("h1", go, X(I(l).title), 1),
                        s("div", wo, [
                          I(l).path ? (N(), fe(_e, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: P(() => [
                              Y(X(I(l).path), 1)
                            ]),
                            _: 1
                          })) : ne("", !0),
                          S.value ? (N(), fe(_e, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: P(() => [...i[8] || (i[8] = [
                              Y(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : ne("", !0)
                        ])
                      ]),
                      z(ee, {
                        variant: "raised",
                        size: "small",
                        disabled: !S.value,
                        onClick: b
                      }, {
                        default: P(() => [...i[9] || (i[9] = [
                          s("svg", {
                            class: "neumorphism-doc-icon",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            "stroke-width": "2",
                            "stroke-linecap": "round",
                            "stroke-linejoin": "round",
                            "aria-hidden": "true"
                          }, [
                            s("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
                            s("path", { d: "M17 21v-8H7v8" }),
                            s("path", { d: "M7 3v5h8" })
                          ], -1),
                          Y(" 保存 ", -1)
                        ])]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    z(tt),
                    s("div", ko, [
                      z(uo, {
                        value: g(I(l)),
                        onChange: d,
                        onDocLink: M
                      }, null, 8, ["value"])
                    ])
                  ])) : (N(), D("div", yo, [
                    z(ye, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: P(() => [...i[10] || (i[10] = [
                        s("span", { class: "neumorphism-doc-empty-icon" }, [
                          s("svg", {
                            class: "neumorphism-doc-icon-3xl",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            "stroke-width": "2",
                            "stroke-linecap": "round",
                            "stroke-linejoin": "round",
                            "aria-hidden": "true"
                          }, [
                            s("path", { d: "M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" })
                          ])
                        ], -1)
                      ])]),
                      _: 1
                    }),
                    i[12] || (i[12] = s("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    z(ee, {
                      variant: "raised",
                      size: "small",
                      onClick: i[3] || (i[3] = (r) => {
                        var w;
                        return k.value = ((w = I(a)[0]) == null ? void 0 : w.key) ?? "";
                      })
                    }, {
                      default: P(() => [...i[11] || (i[11] = [
                        Y(" 打开第一篇 ", -1)
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
}), Zo = /* @__PURE__ */ He(Mo, [["__scopeId", "data-v-c0c48514"]]), $o = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function bo(n) {
  const o = n.match($o);
  if (!o)
    return { meta: {}, body: n };
  const e = o[1], u = n.slice(o[0].length), k = {};
  for (const y of e.split(`
`)) {
    const h = y.indexOf(":");
    if (h === -1) continue;
    const a = y.slice(0, h).trim();
    let l = y.slice(h + 1).trim();
    /^-?\d+$/.test(l) ? l = parseInt(l, 10) : /^-?\d+\.\d+$/.test(l) ? l = parseFloat(l) : l === "true" ? l = !0 : l === "false" ? l = !1 : (l.startsWith('"') && l.endsWith('"') || l.startsWith("'") && l.endsWith("'")) && (l = l.slice(1, -1)), k[a] = l;
  }
  return { meta: k, body: u };
}
function Co(n) {
  return n.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function _o(n, o) {
  if (o.title && typeof o.title == "string")
    return o.title;
  const e = n.match(/^#\s+(.+)$/m);
  return e ? e[1].trim() : "Untitled";
}
function To(n, o) {
  const { meta: e, body: u } = bo(o), k = _o(u, e), y = typeof e.order == "number" ? e.order : 9999;
  return {
    id: Co(n),
    title: k,
    path: n,
    content: o,
    body: u,
    meta: e,
    children: [],
    order: y
  };
}
function Qo(n) {
  const o = /* @__PURE__ */ new Map();
  for (const [h, a] of Object.entries(n)) {
    if (!h.endsWith(".md")) continue;
    const l = To(h, a);
    o.set(h, l);
  }
  const e = [], u = Array.from(o.keys()).sort();
  for (const h of u) {
    const a = h.split("/");
    if (a.length === 1) {
      e.push(h);
      continue;
    }
    let l = null;
    const L = `${a.slice(0, -1).join("/")}/index.md`;
    if (o.has(L) && L !== h)
      l = L;
    else {
      const T = a.slice(0, -1).join("/") + ".md";
      o.has(T) && (l = T);
    }
    if (l && o.has(l)) {
      const T = o.get(l), v = o.get(h);
      T.children.push(v);
    } else
      e.push(h);
  }
  for (const h of o.values())
    h.children.sort((a, l) => a.order - l.order || a.title.localeCompare(l.title));
  const k = e.map((h) => o.get(h)).sort((h, a) => h.order - a.order || h.title.localeCompare(a.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: k,
    order: 0
  };
}
const Jo = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem", "DocTreeIcon"]
};
export {
  hn as DocCodeBlock,
  Zo as DocEditor,
  it as DocFlowCanvas,
  Ge as DocTocNav,
  dt as DocTreeIcon,
  Yo as DocViewer,
  uo as MarkdownEditor,
  ct as MarkdownRenderer,
  Ie as TocNodeItem,
  Qo as buildDocTree,
  Tt as buildHierarchyGraph,
  Jo as componentCategories,
  xt as createDocTree,
  To as createNode,
  bt as extractFlowBlocks,
  _o as extractTitle,
  Ko as flattenDocTree,
  Xo as getAncestors,
  yt as getNodeIcon,
  Pe as getScrollBehavior,
  nn as highlightCode,
  Ye as layoutProDocFlow,
  st as nodeToTreeData,
  bo as parseFrontmatter,
  lt as parseProDocFlow,
  Co as pathToId,
  We as resolveCanvasGraph,
  rt as useDocLayout,
  En as useMarkdownToc,
  Dt as useScrollSpy,
  Uo as writeFlowNodePosition
};
