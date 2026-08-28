const t = [];
function c() {
  const n = [];
  return {
    push(o) {
      o && t.push(o), n.push(o);
    },
    pop() {
      const o = t.pop(), s = n.pop();
      return o ?? s ?? null;
    },
    depth() {
      return t.length;
    },
    destroy() {
      for (const o of n) {
        const s = t.indexOf(o);
        s !== -1 && t.splice(s, 1);
      }
      n.length = 0;
    }
  };
}
export {
  c as useFocusStack
};
