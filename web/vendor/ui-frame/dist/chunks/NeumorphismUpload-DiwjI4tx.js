import { defineComponent as le, computed as d, ref as ne, onMounted as se, watch as A, openBlock as t, createElementBlock as s, normalizeClass as b, createElementVNode as o, unref as l, withKeys as R, withModifiers as v, renderSlot as G, createBlock as L, createCommentVNode as c, createVNode as h, toDisplayString as _, TransitionGroup as re, withCtx as de, Fragment as U, renderList as F, normalizeStyle as W } from "vue";
import { useUpload as ie } from "../composables/useUpload.js";
import { u as ue } from "./createComponent-jnXBYqCm.js";
import { useLocale as me } from "../composables/useLocale.js";
import { N as m } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as pe } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismUpload.css';const ce = ["accept", "multiple", "disabled"], _e = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], ve = { class: "nm-upload__trigger-content" }, ge = { class: "nm-upload__trigger-text" }, be = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], he = {
  class: "nm-upload__item-icon",
  "aria-hidden": "true"
}, ke = {
  key: 0,
  class: "nm-upload__spinner",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, ye = ["onClick"], xe = {
  key: 1,
  class: "nm-upload__item-name"
}, $e = { class: "nm-upload__item-size" }, we = {
  key: 2,
  class: "nm-upload__item-error"
}, Ce = {
  key: 3,
  class: "nm-upload__progress"
}, ze = ["aria-valuenow", "aria-label"], fe = ["aria-label", "onClick"], Le = ["onMouseenter"], Ue = ["aria-label", "onClick"], Se = ["src", "alt"], Be = {
  key: 0,
  class: "nm-upload__item-overlay"
}, Re = { class: "nm-upload__item-info" }, Te = ["onClick"], De = { class: "nm-upload__item-size" }, Me = ["aria-label", "onClick"], Ve = ["onClick"], Fe = ["src", "alt"], Ne = {
  key: 0,
  class: "nm-upload__card-progress"
}, Ie = ["aria-valuenow"], Ke = { class: "nm-upload__card-actions" }, Oe = ["aria-label", "onClick"], Pe = ["aria-label", "onClick"], je = { class: "nm-upload__card-name" }, Ee = /* @__PURE__ */ le({
  __name: "NeumorphismUpload",
  props: {
    modelValue: { default: () => [] },
    accept: { default: void 0 },
    maxSize: { default: void 0 },
    maxCount: { default: void 0 },
    multiple: { type: Boolean, default: !1 },
    disabled: { type: Boolean, default: !1 },
    drag: { type: Boolean, default: void 0 },
    listType: {},
    showUploadList: { type: Boolean, default: void 0 },
    size: {},
    autoUpload: { type: Boolean, default: void 0 },
    triggerText: { default: "" },
    dropText: { default: "" },
    removeLabel: { default: "" },
    previewLabel: { default: "" }
  },
  emits: ["update:modelValue", "change", "preview", "remove", "exceed"],
  setup(i, { emit: q }) {
    const n = i, x = q, { config: $, resolveProp: w } = ue(), { t: C } = me(), H = d(() => {
      var a;
      return w(n.size, (a = $.value.upload) == null ? void 0 : a.size, "medium");
    }), N = d(() => {
      var a;
      return w(n.drag, (a = $.value.upload) == null ? void 0 : a.drag, !0);
    }), J = d(
      () => {
        var a;
        return w(n.showUploadList, (a = $.value.upload) == null ? void 0 : a.showUploadList, !0);
      }
    ), z = d(
      () => {
        var a;
        return w(n.listType, (a = $.value.upload) == null ? void 0 : a.listType, "text");
      }
    ), Q = d(
      () => {
        var a;
        return w(n.autoUpload, (a = $.value.upload) == null ? void 0 : a.autoUpload, !1);
      }
    ), S = d(() => n.triggerText || C("uploadSelectFile")), I = d(() => n.dropText || C("uploadDropFile")), T = d(() => n.removeLabel || C("uploadRemove")), X = d(() => n.accept), Y = d(() => n.maxSize), Z = d(() => n.maxCount), ee = d(() => n.multiple), ae = d(() => Q.value), {
      files: p,
      dragOver: g,
      removeFile: te,
      fileInputRef: K,
      handleDrag: B,
      handleDragLeave: O,
      handleDrop: P,
      handleFileInput: j
    } = ie({
      accept: X,
      maxSize: Y,
      maxCount: Z,
      multiple: ee,
      autoUpload: ae,
      onExceed: (a) => x("exceed", a)
    }), D = ne(null);
    se(() => {
      n.modelValue && n.modelValue.length > 0 && (p.value = [...n.modelValue]);
    }), A(
      () => p.value,
      (a) => {
        x("update:modelValue", [...a]), x("change", [...a]);
      },
      { deep: !0 }
    );
    let M = !0;
    A(
      () => n.modelValue,
      (a) => {
        var u;
        if (!M) {
          M = !0;
          return;
        }
        const r = (a || []).map((y) => y.id).sort().join(","), e = p.value.map((y) => y.id).sort().join(",");
        if (r !== e) {
          M = !1;
          for (const y of p.value)
            if ((u = y.url) != null && u.startsWith("blob:"))
              try {
                URL.revokeObjectURL(y.url);
              } catch {
              }
          p.value = a ? [...a] : [];
        }
      },
      { immediate: !0, deep: !0 }
    );
    function V(a) {
      x("remove", a), te(a.id);
    }
    function f(a) {
      x("preview", a);
    }
    function k() {
      var a;
      n.disabled || (g.value = !1, (a = K.value) == null || a.click());
    }
    const oe = d(() => [
      "nm-upload",
      `nm-upload--${H.value}`,
      `nm-upload--list-${z.value}`,
      {
        "nm-upload--disabled": n.disabled,
        "nm-upload--drag": N.value,
        "nm-upload--dragover": g.value
      }
    ]);
    function E(a) {
      return a < 1024 ? `${a} B` : a < 1024 * 1024 ? `${(a / 1024).toFixed(1)} KB` : `${(a / (1024 * 1024)).toFixed(1)} MB`;
    }
    return (a, r) => (t(), s("div", {
      class: b(oe.value),
      role: "group",
      "aria-label": "file upload"
    }, [
      o("input", {
        ref_key: "fileInputRef",
        ref: K,
        type: "file",
        accept: i.accept,
        multiple: i.multiple,
        disabled: i.disabled,
        class: "nm-upload__input",
        tabindex: "-1",
        "aria-hidden": "true",
        onChange: r[0] || (r[0] = //@ts-ignore
        (...e) => l(j) && l(j)(...e))
      }, null, 40, ce),
      N.value ? (t(), s("div", {
        key: 0,
        class: b(["nm-upload__trigger", {
          "nm-upload__trigger--dragover": l(g),
          "nm-upload__trigger--disabled": i.disabled
        }]),
        role: "button",
        tabindex: i.disabled ? -1 : 0,
        "aria-disabled": i.disabled,
        "aria-label": l(g) ? I.value : S.value,
        onClick: k,
        onDragover: r[1] || (r[1] = //@ts-ignore
        (...e) => l(B) && l(B)(...e)),
        onDragenter: r[2] || (r[2] = //@ts-ignore
        (...e) => l(B) && l(B)(...e)),
        onDragleave: r[3] || (r[3] = //@ts-ignore
        (...e) => l(O) && l(O)(...e)),
        onDrop: r[4] || (r[4] = //@ts-ignore
        (...e) => l(P) && l(P)(...e)),
        onKeydown: [
          R(v(k, ["prevent"]), ["enter"]),
          R(v(k, ["prevent"]), ["space"])
        ]
      }, [
        G(a.$slots, "trigger", {
          dragOver: l(g),
          disabled: i.disabled
        }, () => [
          o("div", ve, [
            l(g) ? (t(), L(m, {
              key: 0,
              name: "upload",
              size: "3xl",
              class: "nm-upload__trigger-icon nm-upload__trigger-icon--drop",
              "aria-hidden": "true"
            })) : c("", !0),
            h(m, {
              name: "plus",
              size: "3xl",
              class: "nm-upload__trigger-icon",
              "aria-hidden": "true"
            }),
            o("span", ge, _(l(g) ? I.value : S.value), 1)
          ])
        ], !0)
      ], 42, _e)) : (t(), s("div", {
        key: 1,
        class: b(["nm-upload__button", { "nm-upload__button--disabled": i.disabled }]),
        role: "button",
        tabindex: i.disabled ? -1 : 0,
        "aria-disabled": i.disabled,
        "aria-label": S.value,
        onClick: k,
        onKeydown: [
          R(v(k, ["prevent"]), ["enter"]),
          R(v(k, ["prevent"]), ["space"])
        ]
      }, [
        G(a.$slots, "trigger", {
          dragOver: !1,
          disabled: i.disabled
        }, () => [
          h(m, {
            name: "plus",
            size: "xl",
            class: "nm-upload__trigger-icon",
            "aria-hidden": "true"
          }),
          o("span", null, _(S.value), 1)
        ], !0)
      ], 42, be)),
      J.value && l(p).length > 0 ? (t(), L(re, {
        key: 2,
        name: "nm-upload-item",
        tag: "div",
        class: b(["nm-upload__list", `nm-upload__list--${z.value}`]),
        role: "list",
        "aria-label": "uploaded files"
      }, {
        default: de(() => [
          z.value === "text" ? (t(!0), s(U, { key: 0 }, F(l(p), (e) => (t(), s("div", {
            key: e.id,
            class: b(["nm-upload__item", `nm-upload__item--${e.status}`]),
            role: "listitem"
          }, [
            o("span", he, [
              e.status === "uploading" ? (t(), s("svg", ke, [...r[6] || (r[6] = [
                o("circle", {
                  cx: "12",
                  cy: "12",
                  r: "10",
                  "stroke-opacity": "0.25"
                }, null, -1),
                o("path", {
                  d: "M12 2a10 10 0 0 1 10 10",
                  "stroke-linecap": "round"
                }, null, -1)
              ])])) : e.status === "done" ? (t(), L(m, {
                key: 1,
                name: "check",
                size: "md"
              })) : e.status === "error" ? (t(), L(m, {
                key: 2,
                name: "circle-close",
                size: "md"
              })) : (t(), L(m, {
                key: 3,
                name: "file",
                size: "md"
              }))
            ]),
            e.url ? (t(), s("a", {
              key: 0,
              class: "nm-upload__item-name nm-upload__item-name--link",
              href: "#",
              onClick: v((u) => f(e), ["prevent"])
            }, _(e.name), 9, ye)) : (t(), s("span", xe, _(e.name), 1)),
            o("span", $e, _(E(e.size)), 1),
            e.error ? (t(), s("span", we, _(e.error), 1)) : c("", !0),
            e.status === "uploading" ? (t(), s("div", Ce, [
              o("div", {
                class: "nm-upload__progress-bar",
                style: W({ width: `${e.progress}%` }),
                role: "progressbar",
                "aria-valuenow": Math.round(e.progress),
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-label": `${e.name} ${Math.round(e.progress)}%`
              }, null, 12, ze)
            ])) : c("", !0),
            o("button", {
              class: "nm-upload__remove",
              type: "button",
              "aria-label": `${T.value} ${e.name}`,
              onClick: (u) => V(e)
            }, [
              h(m, {
                name: "close",
                size: "sm"
              })
            ], 8, fe)
          ], 2))), 128)) : c("", !0),
          (t(!0), s(U, null, F(l(p), (e) => (t(), s(U, {
            key: e.id
          }, [
            z.value === "picture" && e.url ? (t(), s("div", {
              key: 0,
              class: b(["nm-upload__item nm-upload__item--picture", `nm-upload__item--${e.status}`]),
              role: "listitem",
              onMouseenter: (u) => D.value = e.id,
              onMouseleave: r[5] || (r[5] = (u) => D.value = null)
            }, [
              o("button", {
                class: "nm-upload__item-thumb",
                type: "button",
                "aria-label": `${n.previewLabel || l(C)("uploadPreview")} ${e.name}`,
                onClick: (u) => f(e)
              }, [
                o("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__item-img"
                }, null, 8, Se),
                D.value === e.id ? (t(), s("span", Be, [
                  h(m, {
                    name: "eye",
                    size: "xl"
                  })
                ])) : c("", !0)
              ], 8, Ue),
              o("div", Re, [
                o("a", {
                  class: "nm-upload__item-name nm-upload__item-name--link",
                  href: "#",
                  onClick: v((u) => f(e), ["prevent"])
                }, _(e.name), 9, Te),
                o("span", De, _(E(e.size)), 1)
              ]),
              o("button", {
                class: "nm-upload__remove",
                type: "button",
                "aria-label": `${T.value} ${e.name}`,
                onClick: (u) => V(e)
              }, [
                h(m, {
                  name: "close",
                  size: "sm"
                })
              ], 8, Me)
            ], 42, Le)) : c("", !0)
          ], 64))), 128)),
          (t(!0), s(U, null, F(l(p), (e) => (t(), s(U, {
            key: `card-${e.id}`
          }, [
            z.value === "picture-card" && e.url ? (t(), s("div", {
              key: 0,
              class: b(["nm-upload__item nm-upload__item--card", `nm-upload__item--${e.status}`]),
              role: "listitem"
            }, [
              o("div", {
                class: "nm-upload__card-inner",
                onClick: (u) => f(e)
              }, [
                o("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__card-img"
                }, null, 8, Fe),
                e.status === "uploading" ? (t(), s("div", Ne, [
                  o("div", {
                    class: "nm-upload__progress-bar",
                    style: W({ width: `${e.progress}%` }),
                    role: "progressbar",
                    "aria-valuenow": Math.round(e.progress),
                    "aria-valuemin": "0",
                    "aria-valuemax": "100"
                  }, null, 12, Ie)
                ])) : c("", !0),
                o("div", Ke, [
                  o("button", {
                    type: "button",
                    class: "nm-upload__card-preview",
                    "aria-label": `${n.previewLabel || l(C)("uploadPreview")} ${e.name}`,
                    onClick: v((u) => f(e), ["stop"])
                  }, [
                    h(m, {
                      name: "eye",
                      size: "md"
                    })
                  ], 8, Oe),
                  o("button", {
                    type: "button",
                    class: "nm-upload__card-remove",
                    "aria-label": `${T.value} ${e.name}`,
                    onClick: v((u) => V(e), ["stop"])
                  }, [
                    h(m, {
                      name: "trash",
                      size: "md"
                    })
                  ], 8, Pe)
                ])
              ], 8, Ve),
              o("span", je, _(e.name), 1)
            ], 2)) : c("", !0)
          ], 64))), 128))
        ]),
        _: 1
      }, 8, ["class"])) : c("", !0)
    ], 2));
  }
}), Qe = /* @__PURE__ */ pe(Ee, [["__scopeId", "data-v-6e12a002"]]);
export {
  Qe as N
};
