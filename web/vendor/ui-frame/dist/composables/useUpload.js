import { ref as L, onBeforeUnmount as C } from "vue";
import { generateId as z } from "../utils/index.js";
function q(D = {}) {
  const {
    accept: i,
    maxSize: c,
    maxCount: p,
    multiple: d,
    autoUpload: v,
    onExceed: g,
    onSizeExceed: m,
    onTypeError: h,
    uploadFn: w
  } = D, n = L([]), f = L(!1), P = L(null);
  let l = 0;
  const F = [];
  function U(e, t) {
    return t.split(",").map((r) => r.trim()).filter(Boolean).some((r) => {
      if (r.endsWith("/*")) {
        const o = r.slice(0, -1);
        return e.startsWith(o);
      }
      return r.startsWith(".") ? e.endsWith(r) || e === r.toLowerCase() : e === r;
    });
  }
  function M(e) {
    try {
      return URL.createObjectURL(e);
    } catch {
      return "";
    }
  }
  function y(e) {
    if (e)
      try {
        URL.revokeObjectURL(e);
      } catch {
      }
  }
  function O(e) {
    var t;
    if (c != null && c.value && e.size > c.value)
      return m == null || m(e), "sizeExceed";
    if (i != null && i.value && e.type && !U(e.type, i.value)) {
      const a = `.${(t = e.name.split(".").pop()) == null ? void 0 : t.toLowerCase()}`;
      if (!U(a, i.value))
        return h == null || h(e), "typeError";
    }
    return null;
  }
  function W(e) {
    const t = e.type.startsWith("image/") ? M(e) : void 0;
    return {
      id: z("upload_"),
      name: e.name,
      size: e.size,
      type: e.type,
      status: "pending",
      progress: 0,
      url: t,
      raw: e
    };
  }
  function I(e) {
    const t = Array.from(e), a = (d == null ? void 0 : d.value) ?? !1, r = p == null ? void 0 : p.value;
    if (r !== void 0) {
      const s = n.value.length + t.length;
      if (s > r) {
        g == null || g(s - r);
        const u = r - n.value.length;
        if (u <= 0) return;
        t.splice(u);
      }
    }
    a || R();
    const o = [];
    for (const s of t) {
      const u = O(s);
      if (u) {
        const B = {
          id: z("upload_"),
          name: s.name,
          size: s.size,
          type: s.type,
          status: "error",
          progress: 0,
          error: u === "sizeExceed" ? "sizeExceed" : "typeError"
        };
        o.push(B);
      } else
        o.push(W(s));
    }
    n.value = [...n.value, ...o], v != null && v.value && o.some((s) => s.status === "pending") && x();
  }
  function b(e) {
    const t = n.value.findIndex((r) => r.id === e);
    if (t === -1) return;
    const a = n.value[t];
    y(a.url), n.value = n.value.filter((r) => r.id !== e);
  }
  function R() {
    for (const e of n.value)
      y(e.url);
    n.value = [];
  }
  async function x() {
    const e = n.value.filter((t) => t.status === "pending");
    for (const t of e)
      t.status = "uploading", t.progress = 0;
    if (w) {
      await Promise.allSettled(
        e.map(async (t) => {
          try {
            await w(t), t.status = "done", t.progress = 100;
          } catch (a) {
            t.status = "error", t.error = a instanceof Error ? a.message : "uploadFail";
          }
        })
      );
      return;
    }
    await Promise.allSettled(
      e.map(
        (t) => new Promise((a) => {
          const r = setInterval(() => {
            if (t.status !== "uploading") {
              clearInterval(r);
              return;
            }
            t.progress = Math.min(100, t.progress + 15 + Math.random() * 10), t.progress >= 100 && (clearInterval(r), t.status = "done", a());
          }, 300);
          F.push(r);
        })
      )
    );
  }
  function j(e) {
    e.preventDefault(), e.stopPropagation(), (e.type === "dragover" || e.type === "dragenter") && (l++, f.value = !0);
  }
  function A(e) {
    e.preventDefault(), e.stopPropagation(), l = Math.max(0, l - 1), l === 0 && (f.value = !1);
  }
  function E(e) {
    e.preventDefault(), e.stopPropagation(), f.value = !1, l = 0;
    const t = e.dataTransfer;
    t != null && t.files && t.files.length > 0 && I(t.files);
  }
  function k(e) {
    const t = e.target;
    t != null && t.files && t.files.length > 0 && (I(t.files), t.value = "");
  }
  return C(() => {
    for (const e of F) clearInterval(e);
    for (const e of n.value)
      y(e.url);
  }), {
    files: n,
    dragOver: f,
    addFiles: I,
    removeFile: b,
    clearFiles: R,
    upload: x,
    fileInputRef: P,
    handleDrag: j,
    handleDragLeave: A,
    handleDrop: E,
    handleFileInput: k
  };
}
export {
  q as useUpload
};
