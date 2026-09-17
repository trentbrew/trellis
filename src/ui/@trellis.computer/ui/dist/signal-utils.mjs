function i(t, n) {
  const e = () => {
    n.textContent = t.value;
  };
  return e(), t.subscribe(() => e());
}
function b(t, n, e) {
  const u = () => {
    for (const [s, r] of Object.entries(e))
      n.classList.toggle(r, t.value === s);
  };
  return u(), t.subscribe(() => u());
}
function c(t, n, e) {
  const u = () => {
    t.value ? n.setAttribute(e, "") : n.removeAttribute(e);
  };
  return u(), t.subscribe(() => u());
}
function o(t, n) {
  const e = () => {
    n.style.display = t.value ? "" : "none";
  };
  return e(), t.subscribe(() => e());
}
function d(t, n, e) {
  const u = () => {
    n.innerHTML = t.value.map(e).join("");
  };
  return u(), t.subscribe(() => u());
}
export {
  c as bindAttr,
  b as bindClass,
  d as bindList,
  i as bindText,
  o as bindVisible
};
