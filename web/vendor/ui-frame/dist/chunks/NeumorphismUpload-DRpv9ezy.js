import { defineComponent as de, computed as r, ref as ie, onMounted as ue, watch as q, openBlock as o, createElementBlock as s, normalizeStyle as I, normalizeClass as b, createElementVNode as t, unref as l, withKeys as T, withModifiers as _, renderSlot as H, createBlock as L, createCommentVNode as c, createVNode as h, toDisplayString as v, TransitionGroup as me, withCtx as pe, Fragment as S, renderList as K } from "vue";
import { useUpload as ce } from "../composables/useUpload.js";
import { u as ve } from "./createComponent-jnXBYqCm.js";
import { useLocale as _e } from "../composables/useLocale.js";
import { n as ge, r as be, U as J } from "./controlScales-CPj0Htdh.js";
import { N as m } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as he } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismUpload.css';const ye = ["accept", "multiple", "disabled"], ke = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], xe = { class: "nm-upload__trigger-content" }, $e = { class: "nm-upload__trigger-text" }, ze = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], we = {
  class: "nm-upload__item-icon",
  "aria-hidden": "true"
}, Ce = {
  key: 0,
  class: "nm-upload__spinner",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, fe = ["onClick"], Le = {
  key: 1,
  class: "nm-upload__item-name"
}, Se = { class: "nm-upload__item-size" }, Ue = {
  key: 2,
  class: "nm-upload__item-error"
}, Be = {
  key: 3,
  class: "nm-upload__progress"
}, Re = ["aria-valuenow", "aria-label"], Te = ["aria-label", "onClick"], De = ["onMouseenter"], Me = ["aria-label", "onClick"], Ne = ["src", "alt"], Ve = {
  key: 0,
  class: "nm-upload__item-overlay"
}, Fe = { class: "nm-upload__item-info" }, Ie = ["onClick"], Ke = { class: "nm-upload__item-size" }, Oe = ["aria-label", "onClick"], Pe = ["onClick"], Ee = ["src", "alt"], je = {
  key: 0,
  class: "nm-upload__card-progress"
}, Ae = ["aria-valuenow"], Ge = { class: "nm-upload__card-actions" }, We = ["aria-label", "onClick"], qe = ["aria-label", "onClick"], He = { class: "nm-upload__card-name" }, Je = /* @__PURE__ */ de({
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
  setup(i, { emit: Q }) {
    const n = i, x = Q, { config: $, resolveProp: z } = ve(), { t: w } = _e(), U = r(
      () => {
        var a;
        return z(n.size, (a = $.value.upload) == null ? void 0 : a.size, "medium");
      }
    ), D = r(
      () => typeof U.value == "number" ? ge(U.value, J.primary.md) : void 0
    ), X = r(
      () => typeof U.value == "string" ? U.value : "medium"
    ), Y = r(
      () => D.value === void 0 ? void 0 : be(J, D.value)
    ), O = r(() => {
      var a;
      return z(n.drag, (a = $.value.upload) == null ? void 0 : a.drag, !0);
    }), Z = r(
      () => {
        var a;
        return z(n.showUploadList, (a = $.value.upload) == null ? void 0 : a.showUploadList, !0);
      }
    ), C = r(
      () => {
        var a;
        return z(n.listType, (a = $.value.upload) == null ? void 0 : a.listType, "text");
      }
    ), ee = r(
      () => {
        var a;
        return z(n.autoUpload, (a = $.value.upload) == null ? void 0 : a.autoUpload, !1);
      }
    ), B = r(() => n.triggerText || w("uploadSelectFile")), P = r(() => n.dropText || w("uploadDropFile")), M = r(() => n.removeLabel || w("uploadRemove")), ae = r(() => n.accept), oe = r(() => n.maxSize), te = r(() => n.maxCount), le = r(() => n.multiple), ne = r(() => ee.value), {
      files: p,
      dragOver: g,
      removeFile: se,
      fileInputRef: E,
      handleDrag: R,
      handleDragLeave: j,
      handleDrop: A,
      handleFileInput: G
    } = ce({
      accept: ae,
      maxSize: oe,
      maxCount: te,
      multiple: le,
      autoUpload: ne,
      onExceed: (a) => x("exceed", a)
    }), N = ie(null);
    ue(() => {
      n.modelValue && n.modelValue.length > 0 && (p.value = [...n.modelValue]);
    }), q(
      () => p.value,
      (a) => {
        x("update:modelValue", [...a]), x("change", [...a]);
      },
      { deep: !0 }
    );
    let V = !0;
    q(
      () => n.modelValue,
      (a) => {
        var u;
        if (!V) {
          V = !0;
          return;
        }
        const d = (a || []).map((k) => k.id).sort().join(","), e = p.value.map((k) => k.id).sort().join(",");
        if (d !== e) {
          V = !1;
          for (const k of p.value)
            if ((u = k.url) != null && u.startsWith("blob:"))
              try {
                URL.revokeObjectURL(k.url);
              } catch {
              }
          p.value = a ? [...a] : [];
        }
      },
      { immediate: !0, deep: !0 }
    );
    function F(a) {
      x("remove", a), se(a.id);
    }
    function f(a) {
      x("preview", a);
    }
    function y() {
      var a;
      n.disabled || (g.value = !1, (a = E.value) == null || a.click());
    }
    const re = r(() => [
      "nm-upload",
      // 数字与档位类互斥：几何全由内联 `--nm-upload-sz-*` 决定
      D.value === void 0 ? `nm-upload--${X.value}` : "nm-upload--sized",
      `nm-upload--list-${C.value}`,
      {
        "nm-upload--disabled": n.disabled,
        "nm-upload--drag": O.value,
        "nm-upload--dragover": g.value
      }
    ]);
    function W(a) {
      return a < 1024 ? `${a} B` : a < 1024 * 1024 ? `${(a / 1024).toFixed(1)} KB` : `${(a / (1024 * 1024)).toFixed(1)} MB`;
    }
    return (a, d) => (o(), s("div", {
      class: b(re.value),
      style: I(Y.value),
      role: "group",
      "aria-label": "file upload"
    }, [
      t("input", {
        ref_key: "fileInputRef",
        ref: E,
        type: "file",
        accept: i.accept,
        multiple: i.multiple,
        disabled: i.disabled,
        class: "nm-upload__input",
        tabindex: "-1",
        "aria-hidden": "true",
        onChange: d[0] || (d[0] = //@ts-ignore
        (...e) => l(G) && l(G)(...e))
      }, null, 40, ye),
      O.value ? (o(), s("div", {
        key: 0,
        class: b(["nm-upload__trigger", {
          "nm-upload__trigger--dragover": l(g),
          "nm-upload__trigger--disabled": i.disabled
        }]),
        role: "button",
        tabindex: i.disabled ? -1 : 0,
        "aria-disabled": i.disabled,
        "aria-label": l(g) ? P.value : B.value,
        onClick: y,
        onDragover: d[1] || (d[1] = //@ts-ignore
        (...e) => l(R) && l(R)(...e)),
        onDragenter: d[2] || (d[2] = //@ts-ignore
        (...e) => l(R) && l(R)(...e)),
        onDragleave: d[3] || (d[3] = //@ts-ignore
        (...e) => l(j) && l(j)(...e)),
        onDrop: d[4] || (d[4] = //@ts-ignore
        (...e) => l(A) && l(A)(...e)),
        onKeydown: [
          T(_(y, ["prevent"]), ["enter"]),
          T(_(y, ["prevent"]), ["space"])
        ]
      }, [
        H(a.$slots, "trigger", {
          dragOver: l(g),
          disabled: i.disabled
        }, () => [
          t("div", xe, [
            l(g) ? (o(), L(m, {
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
            t("span", $e, v(l(g) ? P.value : B.value), 1)
          ])
        ], !0)
      ], 42, ke)) : (o(), s("div", {
        key: 1,
        class: b(["nm-upload__button", { "nm-upload__button--disabled": i.disabled }]),
        role: "button",
        tabindex: i.disabled ? -1 : 0,
        "aria-disabled": i.disabled,
        "aria-label": B.value,
        onClick: y,
        onKeydown: [
          T(_(y, ["prevent"]), ["enter"]),
          T(_(y, ["prevent"]), ["space"])
        ]
      }, [
        H(a.$slots, "trigger", {
          dragOver: !1,
          disabled: i.disabled
        }, () => [
          h(m, {
            name: "plus",
            size: "xl",
            class: "nm-upload__trigger-icon",
            "aria-hidden": "true"
          }),
          t("span", null, v(B.value), 1)
        ], !0)
      ], 42, ze)),
      Z.value && l(p).length > 0 ? (o(), L(me, {
        key: 2,
        name: "nm-upload-item",
        tag: "div",
        class: b(["nm-upload__list", `nm-upload__list--${C.value}`]),
        role: "list",
        "aria-label": "uploaded files"
      }, {
        default: pe(() => [
          C.value === "text" ? (o(!0), s(S, { key: 0 }, K(l(p), (e) => (o(), s("div", {
            key: e.id,
            class: b(["nm-upload__item", `nm-upload__item--${e.status}`]),
            role: "listitem"
          }, [
            t("span", we, [
              e.status === "uploading" ? (o(), s("svg", Ce, [...d[6] || (d[6] = [
                t("circle", {
                  cx: "12",
                  cy: "12",
                  r: "10",
                  "stroke-opacity": "0.25"
                }, null, -1),
                t("path", {
                  d: "M12 2a10 10 0 0 1 10 10",
                  "stroke-linecap": "round"
                }, null, -1)
              ])])) : e.status === "done" ? (o(), L(m, {
                key: 1,
                name: "check",
                size: "md"
              })) : e.status === "error" ? (o(), L(m, {
                key: 2,
                name: "circle-close",
                size: "md"
              })) : (o(), L(m, {
                key: 3,
                name: "file",
                size: "md"
              }))
            ]),
            e.url ? (o(), s("a", {
              key: 0,
              class: "nm-upload__item-name nm-upload__item-name--link",
              href: "#",
              onClick: _((u) => f(e), ["prevent"])
            }, v(e.name), 9, fe)) : (o(), s("span", Le, v(e.name), 1)),
            t("span", Se, v(W(e.size)), 1),
            e.error ? (o(), s("span", Ue, v(e.error), 1)) : c("", !0),
            e.status === "uploading" ? (o(), s("div", Be, [
              t("div", {
                class: "nm-upload__progress-bar",
                style: I({ width: `${e.progress}%` }),
                role: "progressbar",
                "aria-valuenow": Math.round(e.progress),
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-label": `${e.name} ${Math.round(e.progress)}%`
              }, null, 12, Re)
            ])) : c("", !0),
            t("button", {
              class: "nm-upload__remove",
              type: "button",
              "aria-label": `${M.value} ${e.name}`,
              onClick: (u) => F(e)
            }, [
              h(m, {
                name: "close",
                size: "sm"
              })
            ], 8, Te)
          ], 2))), 128)) : c("", !0),
          (o(!0), s(S, null, K(l(p), (e) => (o(), s(S, {
            key: e.id
          }, [
            C.value === "picture" && e.url ? (o(), s("div", {
              key: 0,
              class: b(["nm-upload__item nm-upload__item--picture", `nm-upload__item--${e.status}`]),
              role: "listitem",
              onMouseenter: (u) => N.value = e.id,
              onMouseleave: d[5] || (d[5] = (u) => N.value = null)
            }, [
              t("button", {
                class: "nm-upload__item-thumb",
                type: "button",
                "aria-label": `${n.previewLabel || l(w)("uploadPreview")} ${e.name}`,
                onClick: (u) => f(e)
              }, [
                t("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__item-img"
                }, null, 8, Ne),
                N.value === e.id ? (o(), s("span", Ve, [
                  h(m, {
                    name: "eye",
                    size: "xl"
                  })
                ])) : c("", !0)
              ], 8, Me),
              t("div", Fe, [
                t("a", {
                  class: "nm-upload__item-name nm-upload__item-name--link",
                  href: "#",
                  onClick: _((u) => f(e), ["prevent"])
                }, v(e.name), 9, Ie),
                t("span", Ke, v(W(e.size)), 1)
              ]),
              t("button", {
                class: "nm-upload__remove",
                type: "button",
                "aria-label": `${M.value} ${e.name}`,
                onClick: (u) => F(e)
              }, [
                h(m, {
                  name: "close",
                  size: "sm"
                })
              ], 8, Oe)
            ], 42, De)) : c("", !0)
          ], 64))), 128)),
          (o(!0), s(S, null, K(l(p), (e) => (o(), s(S, {
            key: `card-${e.id}`
          }, [
            C.value === "picture-card" && e.url ? (o(), s("div", {
              key: 0,
              class: b(["nm-upload__item nm-upload__item--card", `nm-upload__item--${e.status}`]),
              role: "listitem"
            }, [
              t("div", {
                class: "nm-upload__card-inner",
                onClick: (u) => f(e)
              }, [
                t("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__card-img"
                }, null, 8, Ee),
                e.status === "uploading" ? (o(), s("div", je, [
                  t("div", {
                    class: "nm-upload__progress-bar",
                    style: I({ width: `${e.progress}%` }),
                    role: "progressbar",
                    "aria-valuenow": Math.round(e.progress),
                    "aria-valuemin": "0",
                    "aria-valuemax": "100"
                  }, null, 12, Ae)
                ])) : c("", !0),
                t("div", Ge, [
                  t("button", {
                    type: "button",
                    class: "nm-upload__card-preview",
                    "aria-label": `${n.previewLabel || l(w)("uploadPreview")} ${e.name}`,
                    onClick: _((u) => f(e), ["stop"])
                  }, [
                    h(m, {
                      name: "eye",
                      size: "md"
                    })
                  ], 8, We),
                  t("button", {
                    type: "button",
                    class: "nm-upload__card-remove",
                    "aria-label": `${M.value} ${e.name}`,
                    onClick: _((u) => F(e), ["stop"])
                  }, [
                    h(m, {
                      name: "trash",
                      size: "md"
                    })
                  ], 8, qe)
                ])
              ], 8, Pe),
              t("span", He, v(e.name), 1)
            ], 2)) : c("", !0)
          ], 64))), 128))
        ]),
        _: 1
      }, 8, ["class"])) : c("", !0)
    ], 6));
  }
}), ta = /* @__PURE__ */ he(Je, [["__scopeId", "data-v-a4ff305b"]]);
export {
  ta as N
};
