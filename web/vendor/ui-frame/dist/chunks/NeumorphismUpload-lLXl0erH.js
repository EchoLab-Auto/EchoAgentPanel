import { defineComponent as oe, computed as s, ref as te, onMounted as le, watch as O, openBlock as a, createElementBlock as n, normalizeClass as g, createElementVNode as o, unref as r, withKeys as z, withModifiers as c, renderSlot as P, toDisplayString as m, createBlock as ae, TransitionGroup as ne, withCtx as re, Fragment as f, renderList as R, createCommentVNode as v, normalizeStyle as E } from "vue";
import { useUpload as ie } from "../composables/useUpload.js";
import { u as se } from "./createComponent-jnXBYqCm.js";
import { useLocale as de } from "../composables/useLocale.js";
import { _ as ue } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismUpload.css';const pe = ["accept", "multiple", "disabled"], me = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], ce = { class: "nm-upload__trigger-content" }, ve = {
  key: 0,
  class: "nm-upload__trigger-icon nm-upload__trigger-icon--drop",
  width: "32",
  height: "32",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, _e = {
  key: 1,
  class: "nm-upload__trigger-icon",
  width: "32",
  height: "32",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, ge = { class: "nm-upload__trigger-text" }, he = ["tabindex", "aria-disabled", "aria-label", "onKeydown"], ke = {
  class: "nm-upload__item-icon",
  "aria-hidden": "true"
}, ye = {
  key: 0,
  class: "nm-upload__spinner",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, be = {
  key: 1,
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, xe = {
  key: 2,
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, we = {
  key: 3,
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, Ce = ["onClick"], $e = {
  key: 1,
  class: "nm-upload__item-name"
}, fe = { class: "nm-upload__item-size" }, Be = {
  key: 2,
  class: "nm-upload__item-error"
}, Le = {
  key: 3,
  class: "nm-upload__progress"
}, ze = ["aria-valuenow", "aria-label"], Me = ["aria-label", "onClick"], Ue = ["onMouseenter"], Se = ["aria-label", "onClick"], je = ["src", "alt"], Re = {
  key: 0,
  class: "nm-upload__item-overlay"
}, Te = { class: "nm-upload__item-info" }, Ve = ["onClick"], De = { class: "nm-upload__item-size" }, Fe = ["aria-label", "onClick"], Ie = ["onClick"], Ke = ["src", "alt"], Ne = {
  key: 0,
  class: "nm-upload__card-progress"
}, Oe = ["aria-valuenow"], Pe = { class: "nm-upload__card-actions" }, Ee = ["aria-label", "onClick"], He = ["aria-label", "onClick"], Ae = { class: "nm-upload__card-name" }, Ge = /* @__PURE__ */ oe({
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
  setup(d, { emit: H }) {
    const i = d, y = H, { config: b, resolveProp: x } = se(), { t: w } = de(), A = s(() => {
      var t;
      return x(i.size, (t = b.value.upload) == null ? void 0 : t.size, "medium");
    }), T = s(() => {
      var t;
      return x(i.drag, (t = b.value.upload) == null ? void 0 : t.drag, !0);
    }), G = s(
      () => {
        var t;
        return x(i.showUploadList, (t = b.value.upload) == null ? void 0 : t.showUploadList, !0);
      }
    ), C = s(
      () => {
        var t;
        return x(i.listType, (t = b.value.upload) == null ? void 0 : t.listType, "text");
      }
    ), W = s(
      () => {
        var t;
        return x(i.autoUpload, (t = b.value.upload) == null ? void 0 : t.autoUpload, !1);
      }
    ), B = s(() => i.triggerText || w("uploadSelectFile")), V = s(() => i.dropText || w("uploadDropFile")), M = s(() => i.removeLabel || w("uploadRemove")), q = s(() => i.accept), J = s(() => i.maxSize), Q = s(() => i.maxCount), X = s(() => i.multiple), Y = s(() => W.value), {
      files: p,
      dragOver: _,
      removeFile: Z,
      fileInputRef: D,
      handleDrag: L,
      handleDragLeave: F,
      handleDrop: I,
      handleFileInput: K
    } = ie({
      accept: q,
      maxSize: J,
      maxCount: Q,
      multiple: X,
      autoUpload: Y,
      onExceed: (t) => y("exceed", t)
    }), U = te(null);
    le(() => {
      i.modelValue && i.modelValue.length > 0 && (p.value = [...i.modelValue]);
    }), O(
      () => p.value,
      (t) => {
        y("update:modelValue", [...t]), y("change", [...t]);
      },
      { deep: !0 }
    );
    let S = !0;
    O(
      () => i.modelValue,
      (t) => {
        var u;
        if (!S) {
          S = !0;
          return;
        }
        const l = (t || []).map((k) => k.id).sort().join(","), e = p.value.map((k) => k.id).sort().join(",");
        if (l !== e) {
          S = !1;
          for (const k of p.value)
            if ((u = k.url) != null && u.startsWith("blob:"))
              try {
                URL.revokeObjectURL(k.url);
              } catch {
              }
          p.value = t ? [...t] : [];
        }
      },
      { immediate: !0, deep: !0 }
    );
    function j(t) {
      y("remove", t), Z(t.id);
    }
    function $(t) {
      y("preview", t);
    }
    function h() {
      var t;
      i.disabled || (_.value = !1, (t = D.value) == null || t.click());
    }
    const ee = s(() => [
      "nm-upload",
      `nm-upload--${A.value}`,
      `nm-upload--list-${C.value}`,
      {
        "nm-upload--disabled": i.disabled,
        "nm-upload--drag": T.value,
        "nm-upload--dragover": _.value
      }
    ]);
    function N(t) {
      return t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
    }
    return (t, l) => (a(), n("div", {
      class: g(ee.value),
      role: "group",
      "aria-label": "file upload"
    }, [
      o("input", {
        ref_key: "fileInputRef",
        ref: D,
        type: "file",
        accept: d.accept,
        multiple: d.multiple,
        disabled: d.disabled,
        class: "nm-upload__input",
        tabindex: "-1",
        "aria-hidden": "true",
        onChange: l[0] || (l[0] = //@ts-ignore
        (...e) => r(K) && r(K)(...e))
      }, null, 40, pe),
      T.value ? (a(), n("div", {
        key: 0,
        class: g(["nm-upload__trigger", {
          "nm-upload__trigger--dragover": r(_),
          "nm-upload__trigger--disabled": d.disabled
        }]),
        role: "button",
        tabindex: d.disabled ? -1 : 0,
        "aria-disabled": d.disabled,
        "aria-label": r(_) ? V.value : B.value,
        onClick: h,
        onDragover: l[1] || (l[1] = //@ts-ignore
        (...e) => r(L) && r(L)(...e)),
        onDragenter: l[2] || (l[2] = //@ts-ignore
        (...e) => r(L) && r(L)(...e)),
        onDragleave: l[3] || (l[3] = //@ts-ignore
        (...e) => r(F) && r(F)(...e)),
        onDrop: l[4] || (l[4] = //@ts-ignore
        (...e) => r(I) && r(I)(...e)),
        onKeydown: [
          z(c(h, ["prevent"]), ["enter"]),
          z(c(h, ["prevent"]), ["space"])
        ]
      }, [
        P(t.$slots, "trigger", {
          dragOver: r(_),
          disabled: d.disabled
        }, () => [
          o("div", ce, [
            r(_) ? (a(), n("svg", ve, [...l[6] || (l[6] = [
              o("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }, null, -1),
              o("polyline", { points: "17,8 12,3 7,8" }, null, -1),
              o("line", {
                x1: "12",
                y1: "3",
                x2: "12",
                y2: "15"
              }, null, -1)
            ])])) : (a(), n("svg", _e, [...l[7] || (l[7] = [
              o("line", {
                x1: "12",
                y1: "5",
                x2: "12",
                y2: "19"
              }, null, -1),
              o("line", {
                x1: "5",
                y1: "12",
                x2: "19",
                y2: "12"
              }, null, -1)
            ])])),
            o("span", ge, m(r(_) ? V.value : B.value), 1)
          ])
        ], !0)
      ], 42, me)) : (a(), n("div", {
        key: 1,
        class: g(["nm-upload__button", { "nm-upload__button--disabled": d.disabled }]),
        role: "button",
        tabindex: d.disabled ? -1 : 0,
        "aria-disabled": d.disabled,
        "aria-label": B.value,
        onClick: h,
        onKeydown: [
          z(c(h, ["prevent"]), ["enter"]),
          z(c(h, ["prevent"]), ["space"])
        ]
      }, [
        P(t.$slots, "trigger", {
          dragOver: !1,
          disabled: d.disabled
        }, () => [
          l[8] || (l[8] = o("svg", {
            class: "nm-upload__trigger-icon",
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true"
          }, [
            o("line", {
              x1: "12",
              y1: "5",
              x2: "12",
              y2: "19"
            }),
            o("line", {
              x1: "5",
              y1: "12",
              x2: "19",
              y2: "12"
            })
          ], -1)),
          o("span", null, m(B.value), 1)
        ], !0)
      ], 42, he)),
      G.value && r(p).length > 0 ? (a(), ae(ne, {
        key: 2,
        name: "nm-upload-item",
        tag: "div",
        class: g(["nm-upload__list", `nm-upload__list--${C.value}`]),
        role: "list",
        "aria-label": "uploaded files"
      }, {
        default: re(() => [
          C.value === "text" ? (a(!0), n(f, { key: 0 }, R(r(p), (e) => (a(), n("div", {
            key: e.id,
            class: g(["nm-upload__item", `nm-upload__item--${e.status}`]),
            role: "listitem"
          }, [
            o("span", ke, [
              e.status === "uploading" ? (a(), n("svg", ye, [...l[9] || (l[9] = [
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
              ])])) : e.status === "done" ? (a(), n("svg", be, [...l[10] || (l[10] = [
                o("polyline", { points: "20,6 9,17 4,12" }, null, -1)
              ])])) : e.status === "error" ? (a(), n("svg", xe, [...l[11] || (l[11] = [
                o("circle", {
                  cx: "12",
                  cy: "12",
                  r: "10"
                }, null, -1),
                o("line", {
                  x1: "15",
                  y1: "9",
                  x2: "9",
                  y2: "15"
                }, null, -1),
                o("line", {
                  x1: "9",
                  y1: "9",
                  x2: "15",
                  y2: "15"
                }, null, -1)
              ])])) : (a(), n("svg", we, [...l[12] || (l[12] = [
                o("path", { d: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }, null, -1),
                o("polyline", { points: "13,2 13,9 20,9" }, null, -1)
              ])]))
            ]),
            e.url ? (a(), n("a", {
              key: 0,
              class: "nm-upload__item-name nm-upload__item-name--link",
              href: "#",
              onClick: c((u) => $(e), ["prevent"])
            }, m(e.name), 9, Ce)) : (a(), n("span", $e, m(e.name), 1)),
            o("span", fe, m(N(e.size)), 1),
            e.error ? (a(), n("span", Be, m(e.error), 1)) : v("", !0),
            e.status === "uploading" ? (a(), n("div", Le, [
              o("div", {
                class: "nm-upload__progress-bar",
                style: E({ width: `${e.progress}%` }),
                role: "progressbar",
                "aria-valuenow": Math.round(e.progress),
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-label": `${e.name} ${Math.round(e.progress)}%`
              }, null, 12, ze)
            ])) : v("", !0),
            o("button", {
              class: "nm-upload__remove",
              type: "button",
              "aria-label": `${M.value} ${e.name}`,
              onClick: (u) => j(e)
            }, [...l[13] || (l[13] = [
              o("svg", {
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
                o("line", {
                  x1: "18",
                  y1: "6",
                  x2: "6",
                  y2: "18"
                }),
                o("line", {
                  x1: "6",
                  y1: "6",
                  x2: "18",
                  y2: "18"
                })
              ], -1)
            ])], 8, Me)
          ], 2))), 128)) : v("", !0),
          (a(!0), n(f, null, R(r(p), (e) => (a(), n(f, {
            key: e.id
          }, [
            C.value === "picture" && e.url ? (a(), n("div", {
              key: 0,
              class: g(["nm-upload__item nm-upload__item--picture", `nm-upload__item--${e.status}`]),
              role: "listitem",
              onMouseenter: (u) => U.value = e.id,
              onMouseleave: l[5] || (l[5] = (u) => U.value = null)
            }, [
              o("button", {
                class: "nm-upload__item-thumb",
                type: "button",
                "aria-label": `${i.previewLabel || r(w)("uploadPreview")} ${e.name}`,
                onClick: (u) => $(e)
              }, [
                o("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__item-img"
                }, null, 8, je),
                U.value === e.id ? (a(), n("span", Re, [...l[14] || (l[14] = [
                  o("svg", {
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  }, [
                    o("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
                    o("circle", {
                      cx: "12",
                      cy: "12",
                      r: "3"
                    })
                  ], -1)
                ])])) : v("", !0)
              ], 8, Se),
              o("div", Te, [
                o("a", {
                  class: "nm-upload__item-name nm-upload__item-name--link",
                  href: "#",
                  onClick: c((u) => $(e), ["prevent"])
                }, m(e.name), 9, Ve),
                o("span", De, m(N(e.size)), 1)
              ]),
              o("button", {
                class: "nm-upload__remove",
                type: "button",
                "aria-label": `${M.value} ${e.name}`,
                onClick: (u) => j(e)
              }, [...l[15] || (l[15] = [
                o("svg", {
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
                  o("line", {
                    x1: "18",
                    y1: "6",
                    x2: "6",
                    y2: "18"
                  }),
                  o("line", {
                    x1: "6",
                    y1: "6",
                    x2: "18",
                    y2: "18"
                  })
                ], -1)
              ])], 8, Fe)
            ], 42, Ue)) : v("", !0)
          ], 64))), 128)),
          (a(!0), n(f, null, R(r(p), (e) => (a(), n(f, {
            key: `card-${e.id}`
          }, [
            C.value === "picture-card" && e.url ? (a(), n("div", {
              key: 0,
              class: g(["nm-upload__item nm-upload__item--card", `nm-upload__item--${e.status}`]),
              role: "listitem"
            }, [
              o("div", {
                class: "nm-upload__card-inner",
                onClick: (u) => $(e)
              }, [
                o("img", {
                  src: e.url,
                  alt: e.name,
                  class: "nm-upload__card-img"
                }, null, 8, Ke),
                e.status === "uploading" ? (a(), n("div", Ne, [
                  o("div", {
                    class: "nm-upload__progress-bar",
                    style: E({ width: `${e.progress}%` }),
                    role: "progressbar",
                    "aria-valuenow": Math.round(e.progress),
                    "aria-valuemin": "0",
                    "aria-valuemax": "100"
                  }, null, 12, Oe)
                ])) : v("", !0),
                o("div", Pe, [
                  o("button", {
                    type: "button",
                    class: "nm-upload__card-preview",
                    "aria-label": `${i.previewLabel || r(w)("uploadPreview")} ${e.name}`,
                    onClick: c((u) => $(e), ["stop"])
                  }, [...l[16] || (l[16] = [
                    o("svg", {
                      width: "16",
                      height: "16",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "2"
                    }, [
                      o("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
                      o("circle", {
                        cx: "12",
                        cy: "12",
                        r: "3"
                      })
                    ], -1)
                  ])], 8, Ee),
                  o("button", {
                    type: "button",
                    class: "nm-upload__card-remove",
                    "aria-label": `${M.value} ${e.name}`,
                    onClick: c((u) => j(e), ["stop"])
                  }, [...l[17] || (l[17] = [
                    o("svg", {
                      width: "16",
                      height: "16",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "2",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    }, [
                      o("polyline", { points: "3,6 5,6 21,6" }),
                      o("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
                    ], -1)
                  ])], 8, He)
                ])
              ], 8, Ie),
              o("span", Ae, m(e.name), 1)
            ], 2)) : v("", !0)
          ], 64))), 128))
        ]),
        _: 1
      }, 8, ["class"])) : v("", !0)
    ], 2));
  }
}), Ye = /* @__PURE__ */ ue(Ge, [["__scopeId", "data-v-2e737e05"]]);
export {
  Ye as N
};
