function h(n, c, o, x, t = 0.5) {
  const e = t, $ = 1 / 6, y = c.x + (o.x - n.x) * e * $, r = c.y + (o.y - n.y) * e * $, l = o.x - (x.x - c.x) * e * $, i = o.y - (x.y - c.y) * e * $;
  return `${y},${r} ${l},${i} ${o.x},${o.y}`;
}
function u(n) {
  if (n.length === 0) return "";
  if (n.length === 1) return `M${n[0].x},${n[0].y}`;
  if (n.length === 2) return `M${n[0].x},${n[0].y} L${n[1].x},${n[1].y}`;
  let c = `M${n[0].x},${n[0].y}`;
  for (let o = 0; o < n.length - 1; o++) {
    const x = n[Math.max(0, o - 1)], t = n[o], e = n[o + 1], $ = n[Math.min(n.length - 1, o + 2)], y = h(x, t, e, $, 0.5);
    o === 0 ? c += ` L${t.x},${t.y} C${y}` : c += ` C${y}`;
  }
  return c;
}
export {
  u as buildSmoothPath,
  h as catmullRomToBezier
};
