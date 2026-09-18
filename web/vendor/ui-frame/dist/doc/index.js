import { ref as F, computed as H, watch as J, onBeforeUnmount as re, defineComponent as ne, openBlock as N, createElementBlock as P, normalizeClass as X, createVNode as u, withCtx as r, unref as p, Fragment as le, createElementVNode as f, toDisplayString as U, createBlock as j, createTextVNode as D, createCommentVNode as G, Transition as we, isRef as Q, renderList as Ce, nextTick as ee } from "vue";
import { useTheme as _e } from "../composables/useTheme.js";
import { e as Ne, p as De, _ as de, D as be } from "../chunks/MarkdownRenderer.vue_vue_type_style_index_0_lang-CQWAEYiQ.js";
import { a as Mt, b as Ht, c as Ft, g as Kt, h as At, l as Ut, u as qt, d as Ot, w as Wt } from "../chunks/MarkdownRenderer.vue_vue_type_style_index_0_lang-CQWAEYiQ.js";
import { N as ue } from "../chunks/NeumorphismLayout-GEx80IRW.js";
import { N as L } from "../chunks/NeumorphismButton-DEVgFO0I.js";
import { N as Y } from "../chunks/NeumorphismCard-BE0-5aJC.js";
import { N as ce } from "../chunks/NeumorphismThemeToggle-Fx7ILGsu.js";
import { N as me } from "../chunks/NeumorphismTree-DKdQqI-G.js";
import { N as he } from "../chunks/NeumorphismDivider-BYSWiIDi.js";
import { N as Z } from "../chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as pe } from "../chunks/NeumorphismContainer-CGr-px2A.js";
import { N as Te } from "../chunks/NeumorphismInput-BlgrjPEH.js";
import { _ as oe } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as Se } from "../chunks/NeumorphismTabs-Duap_z9d.js";
import { N as $e } from "../chunks/NeumorphismTextarea-CSZ2VWdh.js";
import '../index.css';function xe(l) {
  var s;
  const n = ((s = l.path) == null ? void 0 : s.toLowerCase()) || "";
  return n.includes("api") ? "🔌" : n.includes("guide") ? "📖" : n.includes("config") ? "⚙️" : n.includes("example") ? "💡" : n.includes("install") ? "📦" : n.includes("changelog") ? "📝" : n.includes("faq") ? "❓" : "📄";
}
function fe(l) {
  const n = l.children.length > 0 ? "📁" : xe(l);
  return {
    key: l.path,
    label: l.title,
    icon: n,
    children: l.children.map(fe)
  };
}
function Le(l) {
  const n = /* @__PURE__ */ new Map();
  function s(c) {
    n.set(c.path, c);
    for (const i of c.children)
      s(i);
  }
  s(l);
  const a = /* @__PURE__ */ new Map();
  function h(c) {
    a.set(c.id, c);
    for (const i of c.children)
      h(i);
  }
  return h(l), {
    root: l,
    nodeMap: n,
    findByPath(c) {
      return n.get(c);
    },
    findById(c) {
      return a.get(c);
    }
  };
}
function Lt(l) {
  const n = [];
  function s(a) {
    n.push(a);
    for (const h of a.children)
      s(h);
  }
  return s(l), n;
}
function Pt(l, n) {
  const s = [];
  function a(h, c, i) {
    if (h.id === c)
      return s.push(...i), !0;
    for (const d of h.children)
      if (a(d, c, [...i, h]))
        return !0;
    return !1;
  }
  return a(n, l.id, []), s;
}
function ve(l) {
  var g;
  const { root: n, initialPath: s } = l, a = typeof window < "u", h = l.syncUrlHash !== !1 && a, c = a ? window.location.hash.slice(1) : "", i = s || c || ((g = n.children[0]) == null ? void 0 : g.path) || "", d = F(i), e = F([]), { theme: b, setTheme: T } = _e(), _ = H({
    get: () => b.value,
    set: (k) => T(k)
  }), S = H(() => n.children.map(fe)), V = F(d.value ? [d.value] : []);
  J(d, (k) => {
    V.value = k ? [k] : [];
  });
  const z = H(() => Le(n)), q = H(() => {
    if (d.value)
      return z.value.findByPath(d.value);
  }), K = H(() => q.value || n.children[0]);
  function $(k) {
    d.value = k;
  }
  function B(k, x) {
    d.value = x, k("docLink", x);
  }
  const E = F(""), m = H(() => {
    if (!E.value.trim()) return [];
    const k = E.value.toLowerCase();
    return y(n).filter((R) => R.id === "root" ? !1 : R.title.toLowerCase().includes(k) || R.body.toLowerCase().includes(k)).slice(0, 10);
  });
  function t(k) {
    d.value = k.path, E.value = "";
  }
  function y(k) {
    const x = [k];
    for (const R of k.children)
      x.push(...y(R));
    return x;
  }
  if (J(
    () => s,
    (k) => {
      k && (d.value = k);
    }
  ), h) {
    J(d, (x) => {
      x && history.replaceState(null, "", `#${x}`);
    });
    const k = () => {
      const x = window.location.hash.slice(1);
      x && x !== d.value && (d.value = x);
    };
    window.addEventListener("hashchange", k), re(() => {
      window.removeEventListener("hashchange", k);
    });
  }
  return {
    selectedPath: d,
    selectedKeys: V,
    expandedKeys: e,
    treeData: S,
    selectedNode: q,
    displayNode: K,
    docTree: z,
    themeModel: _,
    searchQuery: E,
    searchResults: m,
    handleTreeSelect: $,
    handleDocLink: B,
    handleSearchSelect: t
  };
}
const ie = "__hier_root";
function Pe(l) {
  const n = [
    {
      id: ie,
      label: l.title,
      shape: "stadium",
      docPath: l.path || void 0
    }
  ], s = [];
  for (const a of l.children)
    n.push({
      id: a.id,
      label: a.title,
      // 有子级 = 可继续钻取（圆角），叶子 = 矩形
      shape: a.children.length > 0 ? "rounded" : "rect",
      docPath: a.path
    }), s.push({ from: ie, to: a.id });
  return {
    // 子项较多时纵向排布更可读
    direction: l.children.length <= 5 ? "LR" : "TB",
    nodes: n,
    edges: s,
    errors: []
  };
}
function ae(l) {
  for (const n of Ne(l.body)) {
    const s = De(n);
    if (s.nodes.length > 0) return s;
  }
  return l.children.length > 0 ? Pe(l) : null;
}
const ze = {
  class: "neumorphism-view-switch",
  role: "tablist",
  "aria-label": "视图切换"
}, Be = { class: "neumorphism-header-search" }, Ve = {
  key: 0,
  class: "neumorphism-search-dropdown"
}, Re = { class: "neumorphism-search-list" }, Ee = ["onClick"], Ie = { class: "neumorphism-search-title" }, Me = { class: "neumorphism-search-path" }, He = {
  key: 0,
  class: "neumorphism-sider-content"
}, Fe = {
  key: 1,
  class: "neumorphism-sider-collapsed"
}, Ke = { class: "neumorphism-doc-header" }, Ae = { class: "neumorphism-doc-title" }, Ue = { class: "neumorphism-doc-meta" }, qe = { class: "neumorphism-doc-body" }, Oe = {
  key: 1,
  class: "neumorphism-empty-state"
}, We = /* @__PURE__ */ ne({
  __name: "DocViewer",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["docLink"],
  setup(l, { emit: n }) {
    const s = l, a = n, {
      selectedPath: h,
      selectedKeys: c,
      expandedKeys: i,
      treeData: d,
      displayNode: e,
      themeModel: b,
      searchQuery: T,
      searchResults: _,
      docTree: S,
      handleTreeSelect: V,
      handleDocLink: z,
      handleSearchSelect: q
    } = ve({ root: s.root, initialPath: s.initialPath });
    function K(m) {
      z(a, m);
    }
    const $ = F("doc"), B = H(
      () => e.value ? ae(e.value) : null
    );
    J(e, () => {
      $.value = "doc";
    });
    function E(m) {
      const t = S.value.findByPath(m) ?? S.value.findByPath(`/${m}`) ?? S.value.findByPath(m.replace(/^\//, ""));
      t && (z(a, t.path), ae(t) || ($.value = "doc"));
    }
    return (m, t) => (N(), P("div", {
      class: X(`neumorphism-doc-viewer ${s.className}`)
    }, [
      u(ue, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": r(() => [...t[7] || (t[7] = [
          f("span", { class: "neumorphism-header-brand" }, "📚 Doc Viewer", -1)
        ])]),
        "header-right": r(() => [
          f("div", ze, [
            u(L, {
              size: "small",
              variant: $.value === "doc" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": $.value === "doc",
              onClick: t[0] || (t[0] = (y) => $.value = "doc")
            }, {
              default: r(() => [...t[8] || (t[8] = [
                D(" 📄 文档 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected"]),
            u(L, {
              size: "small",
              variant: $.value === "canvas" ? "pressed" : "raised",
              role: "tab",
              "aria-selected": $.value === "canvas",
              disabled: !B.value,
              title: B.value ? "流程画布" : "当前文档无流程图与子文档",
              onClick: t[1] || (t[1] = (y) => $.value = "canvas")
            }, {
              default: r(() => [...t[9] || (t[9] = [
                D(" 🗺 画布 ", -1)
              ])]),
              _: 1
            }, 8, ["variant", "aria-selected", "disabled", "title"])
          ]),
          f("div", Be, [
            u(Te, {
              modelValue: p(T),
              "onUpdate:modelValue": t[2] || (t[2] = (y) => Q(T) ? T.value = y : null),
              size: "small",
              placeholder: "搜索文档...",
              class: "neumorphism-search-input"
            }, null, 8, ["modelValue"]),
            p(_).length > 0 ? (N(), P("div", Ve, [
              f("ul", Re, [
                (N(!0), P(le, null, Ce(p(_), (y) => (N(), P("li", {
                  key: y.id,
                  class: "neumorphism-search-item",
                  onClick: (g) => p(q)(y)
                }, [
                  f("span", Ie, U(y.title), 1),
                  f("span", Me, U(y.path), 1)
                ], 8, Ee))), 128))
              ])
            ])) : G("", !0)
          ]),
          u(ce, {
            modelValue: p(b),
            "onUpdate:modelValue": t[3] || (t[3] = (y) => Q(b) ? b.value = y : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        sider: r(({ collapsed: y }) => [
          y ? (N(), P("div", Fe, "📚")) : (N(), P("div", He, [
            u(me, {
              "selected-keys": p(c),
              "onUpdate:selectedKeys": t[4] || (t[4] = (g) => Q(c) ? c.value = g : null),
              "expanded-keys": p(i),
              "onUpdate:expandedKeys": t[5] || (t[5] = (g) => Q(i) ? i.value = g : null),
              data: p(d),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: p(V)
            }, null, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: r(() => [
          u(pe, {
            "no-padding": "",
            class: "neumorphism-main-container"
          }, {
            default: r(() => [
              u(Y, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-content-card"
              }, {
                default: r(() => [
                  p(e) ? (N(), P(le, { key: 0 }, [
                    f("div", Ke, [
                      f("h1", Ae, U(p(e).title), 1),
                      f("div", Ue, [
                        p(e).path ? (N(), j(Z, {
                          key: 0,
                          variant: "primary",
                          size: "small",
                          rounded: ""
                        }, {
                          default: r(() => [
                            D(U(p(e).path), 1)
                          ]),
                          _: 1
                        })) : G("", !0),
                        p(e).children.length > 0 ? (N(), j(Z, {
                          key: 1,
                          variant: "info",
                          size: "small",
                          rounded: ""
                        }, {
                          default: r(() => [
                            D(" 📁 " + U(p(e).children.length) + " 个子项 ", 1)
                          ]),
                          _: 1
                        })) : G("", !0)
                      ])
                    ]),
                    u(he),
                    f("div", qe, [
                      u(we, {
                        name: "neumorphism-doc-switch",
                        mode: "out-in"
                      }, {
                        default: r(() => [
                          $.value === "doc" ? (N(), j(de, {
                            key: p(e).path,
                            content: p(e).body,
                            onDocLink: K
                          }, null, 8, ["content"])) : B.value ? (N(), j(be, {
                            key: `${p(e).path}:canvas`,
                            graph: B.value,
                            height: "calc(100vh - 320px)",
                            onNavigate: E
                          }, null, 8, ["graph"])) : G("", !0)
                        ]),
                        _: 1
                      })
                    ])
                  ], 64)) : (N(), P("div", Oe, [
                    u(Y, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-empty-icon"
                    }, {
                      default: r(() => [...t[10] || (t[10] = [
                        f("span", { class: "neumorphism-empty-emoji" }, "📂", -1)
                      ])]),
                      _: 1
                    }),
                    t[12] || (t[12] = f("p", null, "请从左侧选择一篇文档", -1)),
                    u(L, {
                      variant: "raised",
                      size: "small",
                      onClick: t[6] || (t[6] = (y) => {
                        var g;
                        return h.value = ((g = p(d)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: r(() => [...t[11] || (t[11] = [
                        D(" 打开第一篇 ", -1)
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
}), zt = /* @__PURE__ */ oe(We, [["__scopeId", "data-v-1bc6bb9e"]]), je = { class: "neumorphism-editor-toolbar" }, Ge = { class: "neumorphism-editor-toolbar-left" }, Qe = { class: "neumorphism-editor-toolbar-right" }, Xe = { class: "editor-stat" }, Ye = /* @__PURE__ */ ne({
  __name: "MarkdownEditor",
  props: {
    value: {},
    className: { default: "" },
    autoSave: { type: Boolean, default: !1 },
    autoSaveInterval: { default: 3e4 }
  },
  emits: ["change", "docLink"],
  setup(l, { emit: n }) {
    const s = l, a = n, h = F("split");
    function c(v) {
      a("docLink", v);
    }
    const i = [
      { key: "edit", label: "✏️ 编辑" },
      { key: "split", label: "⬌ 分栏" },
      { key: "preview", label: "👁 预览" }
    ], d = H(() => s.value.length), e = H(() => s.value.split(`
`).length), b = F(null), T = F(null);
    let _ = !1;
    function S() {
      var v;
      return (v = b.value) == null ? void 0 : v.querySelector("textarea");
    }
    function V(v, o, w) {
      const C = S();
      if (!C) return;
      const I = C.selectionStart, O = C.selectionEnd, M = C.value.slice(I, O) || w, W = C.value.slice(0, I) + v + M + o + C.value.slice(O);
      a("change", W), ee(() => {
        C.focus();
        const A = I + v.length;
        C.setSelectionRange(A, A + M.length);
      });
    }
    function z(v, o) {
      const w = S();
      if (!w) return;
      const C = w.selectionStart, I = w.value.slice(0, C), O = w.value.slice(C), A = `${I.length > 0 && !I.endsWith(`
`) ? `
` : ""}${v} ${o}
`, te = I + A + O;
      a("change", te), ee(() => {
        w.focus();
        const se = C + A.length - o.length - 2;
        w.setSelectionRange(se, se + o.length);
      });
    }
    function q() {
      V("**", "**", "粗体文字");
    }
    function K() {
      V("_", "_", "斜体文字");
    }
    function $() {
      z("##", "标题");
    }
    function B() {
      V("[", "](url)", "链接文字");
    }
    function E() {
      z("![alt text]", "(url)");
    }
    function m() {
      V("`", "`", "代码");
    }
    function t() {
      z("```\n", "code\n```");
    }
    function y() {
      z("-", "列表项");
    }
    function g() {
      const v = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`, o = S();
      if (!o) return;
      const w = o.selectionStart, C = o.value.slice(0, w) + v + o.value.slice(o.selectionEnd);
      a("change", C), ee(() => {
        o.focus(), o.setSelectionRange(w + 3, w + 3);
      });
    }
    function k(v) {
      var I, O;
      const o = (O = (I = v.dataTransfer) == null ? void 0 : I.files) == null ? void 0 : O[0];
      if (!(o != null && o.type.startsWith("image/"))) return;
      v.preventDefault(), v.stopPropagation();
      const w = new FileReader(), C = o.name;
      w.onload = () => {
        const M = S();
        if (!M) return;
        const W = M.selectionStart, A = `![${C}](${w.result})`, te = M.value.slice(0, W) + A + M.value.slice(W);
        a("change", te), ee(() => {
          M.focus(), M.setSelectionRange(W + A.length, W + A.length);
        });
      }, w.readAsDataURL(o);
    }
    function x(v) {
      var o;
      (o = v.dataTransfer) != null && o.types.includes("Files") && v.preventDefault();
    }
    let R = null;
    function ye() {
      s.autoSave && (R && clearTimeout(R), R = setTimeout(() => {
        a("change", s.value);
      }, s.autoSaveInterval));
    }
    J(
      () => s.value,
      () => {
        ye();
      }
    ), re(() => {
      R && clearTimeout(R);
    });
    function ge() {
      var C;
      if (_ || h.value !== "split") return;
      const v = (C = b.value) == null ? void 0 : C.querySelector("textarea"), o = T.value;
      if (!v || !o) return;
      const w = v.scrollTop / (v.scrollHeight - v.clientHeight || 1);
      _ = !0, o.scrollTop = w * (o.scrollHeight - o.clientHeight), requestAnimationFrame(() => {
        _ = !1;
      });
    }
    function ke() {
      var C;
      if (_ || h.value !== "split") return;
      const v = (C = b.value) == null ? void 0 : C.querySelector("textarea"), o = T.value;
      if (!v || !o) return;
      const w = o.scrollTop / (o.scrollHeight - o.clientHeight || 1);
      _ = !0, v.scrollTop = w * (v.scrollHeight - v.clientHeight), requestAnimationFrame(() => {
        _ = !1;
      });
    }
    return (v, o) => (N(), P("div", {
      class: X(`neumorphism-markdown-editor ${s.className}`)
    }, [
      f("div", je, [
        f("div", Ge, [
          u(L, {
            size: "small",
            title: "粗体 (Ctrl+B)",
            onClick: q
          }, {
            default: r(() => [...o[2] || (o[2] = [
              f("strong", null, "B", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "斜体 (Ctrl+I)",
            onClick: K
          }, {
            default: r(() => [...o[3] || (o[3] = [
              f("em", null, "I", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "标题",
            onClick: $
          }, {
            default: r(() => [...o[4] || (o[4] = [
              D(" H ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "链接",
            onClick: B
          }, {
            default: r(() => [...o[5] || (o[5] = [
              D(" 🔗 ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "图片",
            onClick: E
          }, {
            default: r(() => [...o[6] || (o[6] = [
              D(" 🖼 ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "行内代码",
            onClick: m
          }, {
            default: r(() => [...o[7] || (o[7] = [
              D(" </> ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "代码块",
            onClick: t
          }, {
            default: r(() => [...o[8] || (o[8] = [
              D(" 📋 ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "无序列表",
            onClick: y
          }, {
            default: r(() => [...o[9] || (o[9] = [
              D(" •≡ ", -1)
            ])]),
            _: 1
          }),
          u(L, {
            size: "small",
            title: "表格",
            onClick: g
          }, {
            default: r(() => [...o[10] || (o[10] = [
              D(" ⏏ ", -1)
            ])]),
            _: 1
          })
        ]),
        f("div", Qe, [
          u(Se, {
            modelValue: h.value,
            "onUpdate:modelValue": o[0] || (o[0] = (w) => h.value = w),
            tabs: i,
            size: "small",
            class: "neumorphism-editor-mode-tabs"
          }, null, 8, ["modelValue"]),
          f("span", Xe, U(e.value) + " 行 · " + U(d.value) + " 字", 1)
        ])
      ]),
      f("div", {
        class: X(["neumorphism-editor-panels", `neumorphism-mode-${h.value}`])
      }, [
        f("div", {
          ref_key: "editPanelRef",
          ref: b,
          class: X(["neumorphism-editor-panel neumorphism-editor-panel--edit", { hidden: h.value === "preview" }]),
          onScroll: ge,
          onDrop: k,
          onDragover: x
        }, [
          u(Y, {
            elevation: -3,
            "no-padding": "",
            class: "edit-card"
          }, {
            default: r(() => [
              u($e, {
                class: "neumorphism-editor-textarea",
                "model-value": s.value,
                placeholder: "在此输入 Markdown...",
                "auto-resize": !1,
                "show-count": !1,
                "onUpdate:modelValue": o[1] || (o[1] = (w) => a("change", w))
              }, null, 8, ["model-value"])
            ]),
            _: 1
          })
        ], 34),
        f("div", {
          ref_key: "previewPanelRef",
          ref: T,
          class: X(["neumorphism-editor-panel neumorphism-editor-panel--preview", { hidden: h.value === "edit" }]),
          onScroll: ke
        }, [
          u(Y, {
            elevation: -2,
            "no-padding": "",
            class: "preview-card"
          }, {
            default: r(() => [
              u(de, {
                content: s.value,
                "show-toc": !1,
                onDocLink: c
              }, null, 8, ["content"])
            ]),
            _: 1
          })
        ], 34)
      ], 2)
    ], 2));
  }
}), Je = /* @__PURE__ */ oe(Ye, [["__scopeId", "data-v-a3afee3e"]]), Ze = { class: "neumorphism-editor-actions" }, et = {
  key: 0,
  class: "neumorphism-editor-sider"
}, tt = {
  key: 1,
  class: "neumorphism-editor-sider-collapsed"
}, nt = {
  key: 0,
  class: "neumorphism-editor-layout"
}, ot = { class: "neumorphism-editor-header" }, st = { class: "neumorphism-editor-title" }, lt = { class: "neumorphism-editor-meta" }, it = { class: "neumorphism-editor-body" }, at = {
  key: 1,
  class: "neumorphism-editor-empty"
}, rt = 50, dt = /* @__PURE__ */ ne({
  __name: "DocEditor",
  props: {
    root: {},
    initialPath: {},
    className: { default: "" }
  },
  emits: ["save", "docLink"],
  setup(l, { emit: n }) {
    const s = l, a = n, {
      selectedPath: h,
      selectedKeys: c,
      expandedKeys: i,
      treeData: d,
      displayNode: e,
      themeModel: b,
      handleTreeSelect: T
    } = ve({ root: s.root, initialPath: s.initialPath }), _ = F({}), S = F([]);
    function V(m, t) {
      const y = S.value.filter((g) => g !== m);
      for (y.push(m); y.length > rt; ) {
        const g = y.shift();
        g !== m && delete _.value[g];
      }
      S.value = y, _.value[m] = t;
    }
    function z(m) {
      return _.value[m.path] ?? m.content;
    }
    function q(m) {
      e.value && V(e.value.path, m);
    }
    function K() {
      e.value && a("save", e.value.path, z(e.value));
    }
    function $(m) {
      h.value = m, a("docLink", m);
    }
    const B = H(() => {
      if (!e.value) return !1;
      const m = _.value[e.value.path];
      return m !== void 0 && m !== e.value.content;
    });
    function E(m) {
      (m.ctrlKey || m.metaKey) && m.key === "s" && (m.preventDefault(), K());
    }
    return (m, t) => (N(), P("div", {
      class: X(`neumorphism-doc-editor ${s.className}`),
      onKeydown: E
    }, [
      u(ue, {
        "show-header": "",
        "show-sider": "",
        "sider-width": 280,
        collapsible: ""
      }, {
        "header-left": r(() => [...t[4] || (t[4] = [
          f("span", { class: "neumorphism-editor-brand" }, "📝 Doc Editor", -1)
        ])]),
        "header-center": r(() => [
          u(ce, {
            modelValue: p(b),
            "onUpdate:modelValue": t[0] || (t[0] = (y) => Q(b) ? b.value = y : null),
            size: "small"
          }, null, 8, ["modelValue"])
        ]),
        "header-right": r(() => [
          f("div", Ze, [
            B.value ? (N(), j(Z, {
              key: 0,
              variant: "warning",
              size: "small"
            }, {
              default: r(() => [...t[5] || (t[5] = [
                D(" 未保存 ", -1)
              ])]),
              _: 1
            })) : G("", !0),
            u(L, {
              variant: "raised",
              size: "small",
              disabled: !B.value,
              onClick: K
            }, {
              default: r(() => [...t[6] || (t[6] = [
                D(" 💾 保存 ", -1)
              ])]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        sider: r(({ collapsed: y }) => [
          y ? (N(), P("div", tt, "📝")) : (N(), P("div", et, [
            u(me, {
              "selected-keys": p(c),
              "onUpdate:selectedKeys": t[1] || (t[1] = (g) => Q(c) ? c.value = g : null),
              "expanded-keys": p(i),
              "onUpdate:expandedKeys": t[2] || (t[2] = (g) => Q(i) ? i.value = g : null),
              data: p(d),
              "show-search": "",
              "search-placeholder": "搜索文档...",
              onNodeSelect: p(T)
            }, null, 8, ["selected-keys", "expanded-keys", "data", "onNodeSelect"])
          ]))
        ]),
        default: r(() => [
          u(pe, {
            "no-padding": "",
            class: "neumorphism-editor-container"
          }, {
            default: r(() => [
              u(Y, {
                elevation: -3,
                "no-padding": "",
                class: "neumorphism-editor-card"
              }, {
                default: r(() => [
                  p(e) ? (N(), P("div", nt, [
                    f("header", ot, [
                      f("div", null, [
                        f("h1", st, U(p(e).title), 1),
                        f("div", lt, [
                          p(e).path ? (N(), j(Z, {
                            key: 0,
                            variant: "primary",
                            size: "small",
                            rounded: ""
                          }, {
                            default: r(() => [
                              D(U(p(e).path), 1)
                            ]),
                            _: 1
                          })) : G("", !0),
                          B.value ? (N(), j(Z, {
                            key: 1,
                            variant: "warning",
                            size: "small"
                          }, {
                            default: r(() => [...t[7] || (t[7] = [
                              D(" 已修改 ", -1)
                            ])]),
                            _: 1
                          })) : G("", !0)
                        ])
                      ]),
                      u(L, {
                        variant: "raised",
                        size: "small",
                        disabled: !B.value,
                        onClick: K
                      }, {
                        default: r(() => [...t[8] || (t[8] = [
                          D(" 💾 保存 ", -1)
                        ])]),
                        _: 1
                      }, 8, ["disabled"])
                    ]),
                    u(he),
                    f("div", it, [
                      u(Je, {
                        value: z(p(e)),
                        onChange: q,
                        onDocLink: $
                      }, null, 8, ["value"])
                    ])
                  ])) : (N(), P("div", at, [
                    u(Y, {
                      elevation: 2,
                      hoverable: "bulge",
                      class: "neumorphism-editor-empty-icon"
                    }, {
                      default: r(() => [...t[9] || (t[9] = [
                        f("span", { class: "neumorphism-editor-empty-emoji" }, "📂", -1)
                      ])]),
                      _: 1
                    }),
                    t[11] || (t[11] = f("p", null, "请从左侧选择一篇文档进行编辑", -1)),
                    u(L, {
                      variant: "raised",
                      size: "small",
                      onClick: t[3] || (t[3] = (y) => {
                        var g;
                        return h.value = ((g = p(d)[0]) == null ? void 0 : g.key) ?? "";
                      })
                    }, {
                      default: r(() => [...t[10] || (t[10] = [
                        D(" 打开第一篇 ", -1)
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
}), Bt = /* @__PURE__ */ oe(dt, [["__scopeId", "data-v-d36faefa"]]), ut = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
function ct(l) {
  const n = l.match(ut);
  if (!n)
    return { meta: {}, body: l };
  const s = n[1], a = l.slice(n[0].length), h = {};
  for (const c of s.split(`
`)) {
    const i = c.indexOf(":");
    if (i === -1) continue;
    const d = c.slice(0, i).trim();
    let e = c.slice(i + 1).trim();
    /^-?\d+$/.test(e) ? e = parseInt(e, 10) : /^-?\d+\.\d+$/.test(e) ? e = parseFloat(e) : e === "true" ? e = !0 : e === "false" ? e = !1 : (e.startsWith('"') && e.endsWith('"') || e.startsWith("'") && e.endsWith("'")) && (e = e.slice(1, -1)), h[d] = e;
  }
  return { meta: h, body: a };
}
function mt(l) {
  return l.replace(/\.md$/i, "").replace(/\//g, "-").replace(/\\/g, "-");
}
function ht(l, n) {
  if (n.title && typeof n.title == "string")
    return n.title;
  const s = l.match(/^#\s+(.+)$/m);
  return s ? s[1].trim() : "Untitled";
}
function pt(l, n) {
  const { meta: s, body: a } = ct(n), h = ht(a, s), c = typeof s.order == "number" ? s.order : 9999;
  return {
    id: mt(l),
    title: h,
    path: l,
    content: n,
    body: a,
    meta: s,
    children: [],
    order: c
  };
}
function Vt(l) {
  const n = /* @__PURE__ */ new Map();
  for (const [i, d] of Object.entries(l)) {
    if (!i.endsWith(".md")) continue;
    const e = pt(i, d);
    n.set(i, e);
  }
  const s = [], a = Array.from(n.keys()).sort();
  for (const i of a) {
    const d = i.split("/");
    if (d.length === 1) {
      s.push(i);
      continue;
    }
    let e = null;
    const T = `${d.slice(0, -1).join("/")}/index.md`;
    if (n.has(T) && T !== i)
      e = T;
    else {
      const _ = d.slice(0, -1).join("/") + ".md";
      n.has(_) && (e = _);
    }
    if (e && n.has(e)) {
      const _ = n.get(e), S = n.get(i);
      _.children.push(S);
    } else
      s.push(i);
  }
  for (const i of n.values())
    i.children.sort((d, e) => d.order - e.order || d.title.localeCompare(e.title));
  const h = s.map((i) => n.get(i)).sort((i, d) => i.order - d.order || i.title.localeCompare(d.title));
  return {
    id: "root",
    title: "Root",
    path: "",
    content: "",
    body: "",
    meta: {},
    children: h,
    order: 0
  };
}
const Rt = {
  composite: ["DocViewer", "DocEditor", "MarkdownRenderer", "MarkdownEditor", "DocFlowCanvas"],
  meta: ["DocCodeBlock", "DocTocNav", "TocNodeItem"]
};
export {
  Mt as DocCodeBlock,
  Bt as DocEditor,
  be as DocFlowCanvas,
  Ht as DocTocNav,
  zt as DocViewer,
  Je as MarkdownEditor,
  de as MarkdownRenderer,
  Ft as TocNodeItem,
  Vt as buildDocTree,
  Pe as buildHierarchyGraph,
  Rt as componentCategories,
  Le as createDocTree,
  pt as createNode,
  Ne as extractFlowBlocks,
  ht as extractTitle,
  Lt as flattenDocTree,
  Pt as getAncestors,
  xe as getNodeIcon,
  Kt as getScrollBehavior,
  At as highlightCode,
  Ut as layoutProDocFlow,
  fe as nodeToTreeData,
  ct as parseFrontmatter,
  De as parseProDocFlow,
  mt as pathToId,
  ae as resolveCanvasGraph,
  ve as useDocLayout,
  qt as useMarkdownToc,
  Ot as useScrollSpy,
  Wt as writeFlowNodePosition
};
