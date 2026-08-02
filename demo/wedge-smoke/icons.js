var Zt = Object.defineProperty;
var Jt = (r, t, e) => t in r ? Zt(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e;
var Q = (r, t, e) => Jt(r, typeof t != "symbol" ? t + "" : t, e);
const M = {
  // entity
  "entity-issue": {
    default: "lucide:git-issue",
    packs: { tabler: "tabler:git-issue" }
  },
  "entity-lane": { default: "lucide:git-branch" },
  "entity-project": { default: "lucide:folder-kanban" },
  "entity-person": { default: "lucide:user" },
  "entity-note": { default: "lucide:file-text" },
  "entity-doc": { default: "lucide:file" },
  // action
  "action-create": { default: "lucide:plus" },
  "action-edit": { default: "lucide:pencil" },
  "action-delete": { default: "lucide:trash-2" },
  "action-duplicate": { default: "lucide:copy" },
  "action-move": { default: "lucide:arrow-right" },
  // status
  "status-todo": { default: "lucide:circle" },
  "status-in-progress": { default: "lucide:loader-circle" },
  "status-done": { default: "lucide:check-circle-2" },
  "status-blocked": { default: "lucide:octagon-x" },
  "status-cancelled": { default: "lucide:ban" },
  // chrome (core)
  "core-chevron-down": { default: "lucide:chevron-down" },
  "core-menu": { default: "lucide:menu" },
  "core-close": { default: "lucide:x" },
  "core-search": { default: "lucide:search" },
  "core-plus": { default: "lucide:plus" }
}, Gt = new RegExp("\\p{Extended_Pictographic}", "u"), Nt = /^https?:\/\//i, Qt = /^[a-z0-9-]+:[a-z0-9-]+$/i;
function Xt(r) {
  return Gt.test(r);
}
function Yt(r) {
  return Nt.test(r);
}
function te(r) {
  return Qt.test(r) && !Nt.test(r);
}
function ee(r) {
  return r in M;
}
function vt(r) {
  return Xt(r) ? "emoji" : Yt(r) ? "image" : te(r) ? "iconify" : ee(r) ? "alias" : "bare";
}
const _t = "lucide";
class se {
  constructor() {
    Q(this, "icons", /* @__PURE__ */ new Map());
    Q(this, "aliases", /* @__PURE__ */ new Map());
  }
  // ---- legacy bundled glyphs -------------------------------------------
  get(t) {
    return this.icons.get(t);
  }
  findByTag(t) {
    return Array.from(this.icons.values()).filter((e) => e.tags.includes(t));
  }
  findByCategory(t) {
    return Array.from(this.icons.values()).filter(
      (e) => e.category === t
    );
  }
  search(t) {
    const e = t.toLowerCase();
    return Array.from(this.icons.values()).filter(
      (s) => s.name.includes(e) || s.tags.some((i) => i.includes(e))
    );
  }
  /** Register bundled glyphs (legacy icon packs). */
  register(t) {
    for (const e of t)
      this.icons.set(e.name, e);
  }
  // ---- semantic aliases -------------------------------------------------
  /** Register alias entries; later registers override per-name. */
  registerAliases(t) {
    for (const [e, s] of Object.entries(t))
      this.aliases.set(e, s);
  }
  hasAlias(t) {
    return this.aliases.has(t) || t in M;
  }
  findByKind(t) {
    const e = t, s = Array.from(this.icons.values()).filter(
      (o) => o.category === e || o.name.startsWith(`${t}-`)
    );
    if (s.length) return s;
    const i = `${t}-`;
    return Array.from(this.aliases.keys()).filter((o) => o.startsWith(i)).map((o) => this.iconForAlias(o)).filter((o) => o !== void 0);
  }
  // ---- detection + resolution -------------------------------------------
  detect(t) {
    return vt(t);
  }
  /** Resolve a `name` to a concrete `set:icon` ref for a pack. */
  resolve(t, e) {
    var o;
    const s = e ?? _t, i = vt(t);
    if (i === "iconify") return t;
    if (i === "alias") {
      const n = this.aliases.get(t) ?? M[t];
      return n ? ((o = n.packs) == null ? void 0 : o[s]) ?? n.default : void 0;
    }
    if (i === "bare") return `${s}:${t}`;
  }
  /** Resolve the active icon pack from a DOM element's theme context. */
  activePack(t) {
    if (t) {
      const i = getComputedStyle(t).getPropertyValue("--icon-pack").trim();
      if (i) return i;
    }
    const e = document.documentElement;
    return getComputedStyle(e).getPropertyValue("--icon-pack").trim() || _t;
  }
  /**
   * Render a resolved `set:icon` ref (or bare name) to SVG markup.
   * Local-first: bundled glyph → `@iconify-json/<set>` dynamic import →
   * `undefined` (caller shows the fallback glyph).
   */
  async iconify(t, e) {
    const [s, i] = t.split(":");
    if (!(!s || !i))
      return t in this._bundledSvgs() ? this._bundledSvgs()[t] : ie(s, i);
  }
  // ---- internals ---------------------------------------------------------
  _bundledSvgs() {
    const t = {};
    for (const [e, s] of [...this.aliases, ...Object.entries(M)]) {
      const i = this.icons.get(e);
      if (i)
        for (const o of /* @__PURE__ */ new Set([s.default, ...Object.values(s.packs ?? {})]))
          o && !(o in t) && (t[o] = i.svg);
    }
    return t;
  }
  iconForAlias(t) {
    const e = this.aliases.get(t) ?? M[t], s = this.icons.get(t);
    if (!(!e || !s))
      return {
        ...s,
        tags: [...s.tags, e.default]
      };
  }
}
async function ie(r, t) {
  var e;
  try {
    const i = (await import(
      /* @vite-ignore */
      `@iconify-json/${r}/icons.json`
    )).default, o = (e = i == null ? void 0 : i.icons) == null ? void 0 : e[t];
    return o != null && o.body ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g>${o.body}</g></svg>` : void 0;
  } catch {
    return;
  }
}
const $ = new se();
$.registerAliases(M);
$.register([
  {
    name: "entity-issue",
    category: "entity",
    tags: ["issue", "task", "ticket"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 13v1" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "entity-lane",
    category: "entity",
    tags: ["lane", "stream"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 10h14" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "entity-project",
    category: "entity",
    tags: ["project", "workspace"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/></svg>'
  },
  {
    name: "entity-person",
    category: "entity",
    tags: ["person", "user", "member"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>'
  },
  {
    name: "entity-note",
    category: "entity",
    tags: ["note", "memo"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M7 7h6M7 10h6M7 13h4" stroke="white" stroke-width="1" fill="none"/></svg>'
  },
  {
    name: "entity-doc",
    category: "entity",
    tags: ["doc", "document", "file"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2h5l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M11 2v5h5" fill="none" stroke="white" stroke-width="1"/></svg>'
  }
]);
$.register([
  {
    name: "status-todo",
    category: "status",
    tags: ["todo", "pending", "backlog"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "status-in-progress",
    category: "status",
    tags: ["in-progress", "active", "doing"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 5v5l3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "status-done",
    category: "status",
    tags: ["done", "completed", "finished"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M6 10l3 3 5-5" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "status-blocked",
    category: "status",
    tags: ["blocked", "stuck"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/><path d="M7 10h6" stroke="white" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "status-cancelled",
    category: "status",
    tags: ["cancelled", "abandoned"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5"/></svg>'
  }
]);
$.register([
  {
    name: "action-create",
    category: "action",
    tags: ["create", "add", "new", "plus"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "action-edit",
    category: "action",
    tags: ["edit", "pencil", "write"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M14 2l4 4-8 8H6v-4l8-8z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-delete",
    category: "action",
    tags: ["delete", "remove", "trash"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 7h10l-1 10H6L5 7zM8 2h4l1 2H7l1-2zM4 5h12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-duplicate",
    category: "action",
    tags: ["duplicate", "copy", "clone"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><rect x="6" y="6" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "action-move",
    category: "action",
    tags: ["move", "drag", "reorder"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2v16M2 10h16" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="6" cy="14" r="1.5"/><circle cx="14" cy="14" r="1.5"/></svg>'
  }
]);
$.register([
  {
    name: "core-chevron-down",
    category: "core",
    tags: ["chevron", "down", "expand", "arrow"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  {
    name: "core-menu",
    category: "core",
    tags: ["menu", "hamburger", "nav"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-close",
    category: "core",
    tags: ["close", "x", "dismiss"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-search",
    category: "core",
    tags: ["search", "find", "magnify"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    name: "core-plus",
    category: "core",
    tags: ["plus", "add", "new"],
    svg: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  }
]);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const V = globalThis, nt = V.ShadowRoot && (V.ShadyCSS === void 0 || V.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ht = Symbol(), $t = /* @__PURE__ */ new WeakMap();
let re = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== Ht) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (nt && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = $t.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && $t.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const oe = (r) => new re(typeof r == "string" ? r : r + "", void 0, Ht), ne = (r, t) => {
  if (nt) r.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const s = document.createElement("style"), i = V.litNonce;
    i !== void 0 && s.setAttribute("nonce", i), s.textContent = e.cssText, r.appendChild(s);
  }
}, yt = nt ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules) e += s.cssText;
  return oe(e);
})(r) : r;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ae, defineProperty: ce, getOwnPropertyDescriptor: le, getOwnPropertyNames: he, getOwnPropertySymbols: de, getPrototypeOf: ue } = Object, A = globalThis, mt = A.trustedTypes, pe = mt ? mt.emptyScript : "", X = A.reactiveElementPolyfillSupport, H = (r, t) => r, F = { toAttribute(r, t) {
  switch (t) {
    case Boolean:
      r = r ? pe : null;
      break;
    case Object:
    case Array:
      r = r == null ? r : JSON.stringify(r);
  }
  return r;
}, fromAttribute(r, t) {
  let e = r;
  switch (t) {
    case Boolean:
      e = r !== null;
      break;
    case Number:
      e = r === null ? null : Number(r);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(r);
      } catch {
        e = null;
      }
  }
  return e;
} }, at = (r, t) => !ae(r, t), At = { attribute: !0, type: String, converter: F, reflect: !1, useDefault: !1, hasChanged: at };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), A.litPropertyMetadata ?? (A.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let x = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = At) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), i = this.getPropertyDescriptor(t, s, e);
      i !== void 0 && ce(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: i, set: o } = le(this.prototype, t) ?? { get() {
      return this[e];
    }, set(n) {
      this[e] = n;
    } };
    return { get: i, set(n) {
      const a = i == null ? void 0 : i.call(this);
      o == null || o.call(this, n), this.requestUpdate(t, a, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? At;
  }
  static _$Ei() {
    if (this.hasOwnProperty(H("elementProperties"))) return;
    const t = ue(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(H("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(H("properties"))) {
      const e = this.properties, s = [...he(e), ...de(e)];
      for (const i of s) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s, i] of e) this.elementProperties.set(s, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const i = this._$Eu(e, s);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const i of s) e.unshift(yt(i));
    } else t !== void 0 && e.push(yt(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ne(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostConnected) == null ? void 0 : s.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostDisconnected) == null ? void 0 : s.call(e);
    });
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$ET(t, e) {
    var o;
    const s = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, s);
    if (i !== void 0 && s.reflect === !0) {
      const n = (((o = s.converter) == null ? void 0 : o.toAttribute) !== void 0 ? s.converter : F).toAttribute(e, s.type);
      this._$Em = t, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, n;
    const s = this.constructor, i = s._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const a = s.getPropertyOptions(i), l = typeof a.converter == "function" ? { fromAttribute: a.converter } : ((o = a.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? a.converter : F;
      this._$Em = i;
      const h = l.fromAttribute(e, a.type);
      this[i] = h ?? ((n = this._$Ej) == null ? void 0 : n.get(i)) ?? h, this._$Em = null;
    }
  }
  requestUpdate(t, e, s, i = !1, o) {
    var n;
    if (t !== void 0) {
      const a = this.constructor;
      if (i === !1 && (o = this[t]), s ?? (s = a.getPropertyOptions(t)), !((s.hasChanged ?? at)(o, e) || s.useDefault && s.reflect && o === ((n = this._$Ej) == null ? void 0 : n.get(t)) && !this.hasAttribute(a._$Eu(t, s)))) return;
      this.C(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: s, reflect: i, wrapped: o }, n) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, n ?? e ?? this[t]), o !== !0 || n !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (e = void 0), this._$AL.set(t, e)), i === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, n] of this._$Ep) this[o] = n;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, n] of i) {
        const { wrapped: a } = n, l = this[o];
        a !== !0 || this._$AL.has(o) || l === void 0 || this.C(o, void 0, n, l);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (s = this._$EO) == null || s.forEach((i) => {
        var o;
        return (o = i.hostUpdate) == null ? void 0 : o.call(i);
      }), this.update(e)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((s) => {
      var i;
      return (i = s.hostUpdated) == null ? void 0 : i.call(s);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
x.elementStyles = [], x.shadowRootOptions = { mode: "open" }, x[H("elementProperties")] = /* @__PURE__ */ new Map(), x[H("finalized")] = /* @__PURE__ */ new Map(), X == null || X({ ReactiveElement: x }), (A.reactiveElementVersions ?? (A.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const z = globalThis, wt = (r) => r, q = z.trustedTypes, bt = q ? q.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, zt = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, Bt = "?" + m, ge = `<${Bt}>`, k = document, R = () => k.createComment(""), I = (r) => r === null || typeof r != "object" && typeof r != "function", ct = Array.isArray, fe = (r) => ct(r) || typeof (r == null ? void 0 : r[Symbol.iterator]) == "function", Y = `[ 	
\f\r]`, T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ct = /-->/g, Et = />/g, w = RegExp(`>|${Y}(?:([^\\s"'>=/]+)(${Y}*=${Y}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), kt = /'/g, St = /"/g, Rt = /^(?:script|style|textarea|title)$/i, ve = (r) => (t, ...e) => ({ _$litType$: r, strings: t, values: e }), L = ve(1), S = Symbol.for("lit-noChange"), u = Symbol.for("lit-nothing"), xt = /* @__PURE__ */ new WeakMap(), C = k.createTreeWalker(k, 129);
function It(r, t) {
  if (!ct(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return bt !== void 0 ? bt.createHTML(t) : t;
}
const _e = (r, t) => {
  const e = r.length - 1, s = [];
  let i, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = T;
  for (let a = 0; a < e; a++) {
    const l = r[a];
    let h, d, c = -1, g = 0;
    for (; g < l.length && (n.lastIndex = g, d = n.exec(l), d !== null); ) g = n.lastIndex, n === T ? d[1] === "!--" ? n = Ct : d[1] !== void 0 ? n = Et : d[2] !== void 0 ? (Rt.test(d[2]) && (i = RegExp("</" + d[2], "g")), n = w) : d[3] !== void 0 && (n = w) : n === w ? d[0] === ">" ? (n = i ?? T, c = -1) : d[1] === void 0 ? c = -2 : (c = n.lastIndex - d[2].length, h = d[1], n = d[3] === void 0 ? w : d[3] === '"' ? St : kt) : n === St || n === kt ? n = w : n === Ct || n === Et ? n = T : (n = w, i = void 0);
    const p = n === w && r[a + 1].startsWith("/>") ? " " : "";
    o += n === T ? l + ge : c >= 0 ? (s.push(h), l.slice(0, c) + zt + l.slice(c) + m + p) : l + m + (c === -2 ? a : p);
  }
  return [It(r, o + (r[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class j {
  constructor({ strings: t, _$litType$: e }, s) {
    let i;
    this.parts = [];
    let o = 0, n = 0;
    const a = t.length - 1, l = this.parts, [h, d] = _e(t, e);
    if (this.el = j.createElement(h, s), C.currentNode = this.el.content, e === 2 || e === 3) {
      const c = this.el.content.firstChild;
      c.replaceWith(...c.childNodes);
    }
    for (; (i = C.nextNode()) !== null && l.length < a; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const c of i.getAttributeNames()) if (c.endsWith(zt)) {
          const g = d[n++], p = i.getAttribute(c).split(m), y = /([.?@])?(.*)/.exec(g);
          l.push({ type: 1, index: o, name: y[2], strings: p, ctor: y[1] === "." ? ye : y[1] === "?" ? me : y[1] === "@" ? Ae : K }), i.removeAttribute(c);
        } else c.startsWith(m) && (l.push({ type: 6, index: o }), i.removeAttribute(c));
        if (Rt.test(i.tagName)) {
          const c = i.textContent.split(m), g = c.length - 1;
          if (g > 0) {
            i.textContent = q ? q.emptyScript : "";
            for (let p = 0; p < g; p++) i.append(c[p], R()), C.nextNode(), l.push({ type: 2, index: ++o });
            i.append(c[g], R());
          }
        }
      } else if (i.nodeType === 8) if (i.data === Bt) l.push({ type: 2, index: o });
      else {
        let c = -1;
        for (; (c = i.data.indexOf(m, c + 1)) !== -1; ) l.push({ type: 7, index: o }), c += m.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const s = k.createElement("template");
    return s.innerHTML = t, s;
  }
}
function P(r, t, e = r, s) {
  var n, a;
  if (t === S) return t;
  let i = s !== void 0 ? (n = e._$Co) == null ? void 0 : n[s] : e._$Cl;
  const o = I(t) ? void 0 : t._$litDirective$;
  return (i == null ? void 0 : i.constructor) !== o && ((a = i == null ? void 0 : i._$AO) == null || a.call(i, !1), o === void 0 ? i = void 0 : (i = new o(r), i._$AT(r, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = i : e._$Cl = i), i !== void 0 && (t = P(r, i._$AS(r, t.values), i, s)), t;
}
class $e {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, i = ((t == null ? void 0 : t.creationScope) ?? k).importNode(e, !0);
    C.currentNode = i;
    let o = C.nextNode(), n = 0, a = 0, l = s[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let h;
        l.type === 2 ? h = new D(o, o.nextSibling, this, t) : l.type === 1 ? h = new l.ctor(o, l.name, l.strings, this, t) : l.type === 6 && (h = new we(o, this, t)), this._$AV.push(h), l = s[++a];
      }
      n !== (l == null ? void 0 : l.index) && (o = C.nextNode(), n++);
    }
    return C.currentNode = k, i;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
}
class D {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, s, i) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = i, this._$Cv = (i == null ? void 0 : i.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = P(this, t, e), I(t) ? t === u || t == null || t === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : t !== this._$AH && t !== S && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : fe(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== u && I(this._$AH) ? this._$AA.nextSibling.data = t : this.T(k.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: s } = t, i = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = j.createElement(It(s.h, s.h[0]), this.options)), s);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === i) this._$AH.p(e);
    else {
      const n = new $e(i, this), a = n.u(this.options);
      n.p(e), this.T(a), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = xt.get(t.strings);
    return e === void 0 && xt.set(t.strings, e = new j(t)), e;
  }
  k(t) {
    ct(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, i = 0;
    for (const o of t) i === e.length ? e.push(s = new D(this.O(R()), this.O(R()), this, this.options)) : s = e[i], s._$AI(o), i++;
    i < e.length && (this._$AR(s && s._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, e); t !== this._$AB; ) {
      const i = wt(t).nextSibling;
      wt(t).remove(), t = i;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class K {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, i, o) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = u;
  }
  _$AI(t, e = this, s, i) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) t = P(this, t, e, 0), n = !I(t) || t !== this._$AH && t !== S, n && (this._$AH = t);
    else {
      const a = t;
      let l, h;
      for (t = o[0], l = 0; l < o.length - 1; l++) h = P(this, a[s + l], e, l), h === S && (h = this._$AH[l]), n || (n = !I(h) || h !== this._$AH[l]), h === u ? t = u : t !== u && (t += (h ?? "") + o[l + 1]), this._$AH[l] = h;
    }
    n && !i && this.j(t);
  }
  j(t) {
    t === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class ye extends K {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === u ? void 0 : t;
  }
}
class me extends K {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== u);
  }
}
class Ae extends K {
  constructor(t, e, s, i, o) {
    super(t, e, s, i, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = P(this, t, e, 0) ?? u) === S) return;
    const s = this._$AH, i = t === u && s !== u || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, o = t !== u && (s === u || i);
    i && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class we {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    P(this, t);
  }
}
const tt = z.litHtmlPolyfillSupport;
tt == null || tt(j, D), (z.litHtmlVersions ?? (z.litHtmlVersions = [])).push("3.3.3");
const be = (r, t, e) => {
  const s = (e == null ? void 0 : e.renderBefore) ?? t;
  let i = s._$litPart$;
  if (i === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    s._$litPart$ = i = new D(t.insertBefore(R(), o), o, void 0, e ?? {});
  }
  return i._$AI(r), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const E = globalThis;
let B = class extends x {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = be(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return S;
  }
};
var Tt;
B._$litElement$ = !0, B.finalized = !0, (Tt = E.litElementHydrateSupport) == null || Tt.call(E, { LitElement: B });
const et = E.litElementPolyfillSupport;
et == null || et({ LitElement: B });
(E.litElementVersions ?? (E.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ce = (r) => (t, e) => {
  e !== void 0 ? e.addInitializer(() => {
    customElements.define(r, t);
  }) : customElements.define(r, t);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ee = { attribute: !0, type: String, converter: F, reflect: !1, hasChanged: at }, ke = (r = Ee, t, e) => {
  const { kind: s, metadata: i } = e;
  let o = globalThis.litPropertyMetadata.get(i);
  if (o === void 0 && globalThis.litPropertyMetadata.set(i, o = /* @__PURE__ */ new Map()), s === "setter" && ((r = Object.create(r)).wrapped = !0), o.set(e.name, r), s === "accessor") {
    const { name: n } = e;
    return { set(a) {
      const l = t.get.call(this);
      t.set.call(this, a), this.requestUpdate(n, l, r, !0, a);
    }, init(a) {
      return a !== void 0 && this.C(n, void 0, r, a), a;
    } };
  }
  if (s === "setter") {
    const { name: n } = e;
    return function(a) {
      const l = this[n];
      t.call(this, a), this.requestUpdate(n, l, r, !0, a);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function st(r) {
  return (t, e) => typeof e == "object" ? ke(r, t, e) : ((s, i, o) => {
    const n = i.hasOwnProperty(o);
    return i.constructor.createProperty(o, s), n ? Object.getOwnPropertyDescriptor(i, o) : void 0;
  })(r, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Se = { CHILD: 2 }, xe = (r) => (...t) => ({ _$litDirective$: r, values: t });
class Me {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, s) {
    this._$Ct = t, this._$AM = e, this._$Ci = s;
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class rt extends Me {
  constructor(t) {
    if (super(t), this.it = u, t.type !== Se.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(t) {
    if (t === u || t == null) return this._t = void 0, this.it = t;
    if (t === S) return t;
    if (typeof t != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (t === this.it) return this._t;
    this.it = t;
    const e = [t];
    return e.raw = e, this._t = { _$litType$: this.constructor.resultType, strings: e, values: [] };
  }
}
rt.directiveName = "unsafeHTML", rt.resultType = 1;
const Pe = xe(rt);
var Oe = Object.create, lt = Object.defineProperty, Ue = Object.getOwnPropertyDescriptor, jt = (r, t) => (t = Symbol[r]) ? t : Symbol.for("Symbol." + r), U = (r) => {
  throw TypeError(r);
}, Dt = (r, t, e) => t in r ? lt(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e, Mt = (r, t) => lt(r, "name", { value: t, configurable: !0 }), Te = (r) => [, , , Oe((r == null ? void 0 : r[jt("metadata")]) ?? null)], Lt = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"], N = (r) => r !== void 0 && typeof r != "function" ? U("Function expected") : r, Ne = (r, t, e, s, i) => ({ kind: Lt[r], name: t, metadata: s, addInitializer: (o) => e._ ? U("Already initialized") : i.push(N(o || null)) }), He = (r, t) => Dt(t, jt("metadata"), r[3]), b = (r, t, e, s) => {
  for (var i = 0, o = r[t >> 1], n = o && o.length; i < n; i++) t & 1 ? o[i].call(e) : s = o[i].call(e, s);
  return s;
}, Z = (r, t, e, s, i, o) => {
  var n, a, l, h, d, c = t & 7, g = !!(t & 8), p = !!(t & 16), y = c > 3 ? r.length + 1 : c ? g ? 1 : 2 : 0, gt = Lt[c + 5], ft = c > 3 && (r[y - 1] = []), Kt = r[y] || (r[y] = []), _ = c && (!p && !g && (i = i.prototype), c < 5 && (c > 3 || !p) && Ue(c < 4 ? i : { get [e]() {
    return Pt(this, o);
  }, set [e](f) {
    return Ot(this, o, f);
  } }, e));
  c ? p && c < 4 && Mt(o, (c > 2 ? "set " : c > 1 ? "get " : "") + e) : Mt(i, e);
  for (var J = s.length - 1; J >= 0; J--)
    h = Ne(c, e, l = {}, r[3], Kt), c && (h.static = g, h.private = p, d = h.access = { has: p ? (f) => ze(i, f) : (f) => e in f }, c ^ 3 && (d.get = p ? (f) => (c ^ 1 ? Pt : Be)(f, i, c ^ 4 ? o : _.get) : (f) => f[e]), c > 2 && (d.set = p ? (f, G) => Ot(f, i, G, c ^ 4 ? o : _.set) : (f, G) => f[e] = G)), a = (0, s[J])(c ? c < 4 ? p ? o : _[gt] : c > 4 ? void 0 : { get: _.get, set: _.set } : i, h), l._ = 1, c ^ 4 || a === void 0 ? N(a) && (c > 4 ? ft.unshift(a) : c ? p ? o = a : _[gt] = a : i = a) : typeof a != "object" || a === null ? U("Object expected") : (N(n = a.get) && (_.get = n), N(n = a.set) && (_.set = n), N(n = a.init) && ft.unshift(n));
  return c || He(r, i), _ && lt(i, e, _), p ? c ^ 4 ? o : _ : i;
}, W = (r, t, e) => Dt(r, typeof t != "symbol" ? t + "" : t, e), ht = (r, t, e) => t.has(r) || U("Cannot " + e), ze = (r, t) => Object(t) !== t ? U('Cannot use the "in" operator on this value') : r.has(t), Pt = (r, t, e) => (ht(r, t, "read from private field"), e ? e.call(r) : t.get(r)), it = (r, t, e) => t.has(r) ? U("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(r) : t.set(r, e), Ot = (r, t, e, s) => (ht(r, t, "write to private field"), s ? s.call(r, e) : t.set(r, e), e), Be = (r, t, e) => (ht(r, t, "access private method"), e), Wt, Vt, Ft, ot, qt, v, dt, ut, pt;
const Ut = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};
qt = [Ce("trellis-icon")];
class O extends (ot = B, Ft = [st({ type: String })], Vt = [st({ type: String })], Wt = [st({ type: String })], ot) {
  constructor() {
    super(...arguments), it(this, dt, b(v, 8, this, "")), b(v, 11, this), it(this, ut, b(v, 12, this, "md")), b(v, 15, this), it(this, pt, b(v, 16, this)), b(v, 19, this), W(this, "_svg"), W(this, "_svgName", ""), W(this, "_svgPack", ""), W(this, "_themeObserver");
  }
  willUpdate(t) {
    t.has("name") && this._invalidateSvg();
  }
  updated(t) {
    (t.has("name") || this._packChanged()) && this._resolveSvg();
  }
  connectedCallback() {
    super.connectedCallback(), this._resolveSvg(), this._observeThemeChanges();
  }
  disconnectedCallback() {
    var t;
    (t = this._themeObserver) == null || t.disconnect(), this._themeObserver = void 0, super.disconnectedCallback();
  }
  /** True when the computed --icon-pack differs from the resolved one. */
  _packChanged() {
    return $.activePack(this) !== this._svgPack;
  }
  /**
   * Re-resolve on theme mutations (data-theme / style / class on
   * ancestors). Always observes the light-DOM document root: theme
   * attributes live in the light DOM (even for elements nested in a
   * shadow root, the host's ancestors are light-DOM), and custom
   * properties inherit into shadow trees. The _packChanged() guard
   * makes unrelated mutations a no-op.
   */
  _observeThemeChanges() {
    this._themeObserver = new MutationObserver(() => {
      this._packChanged() && this._resolveSvg();
    }), this._themeObserver.observe(document.documentElement, {
      attributes: !0,
      attributeFilter: ["data-theme", "style", "class"],
      subtree: !0
    });
  }
  _invalidateSvg() {
    this._svg = void 0, this._svgName = "", this._svgPack = "";
  }
  _sizePx() {
    const t = this.size;
    if (typeof t == "number") return t;
    const e = Ut[t];
    if (e) return e;
    const s = Number.parseFloat(t);
    return Number.isFinite(s) ? s : Ut.md;
  }
  _resolveSvg() {
    const t = this.name || "", e = $.activePack(this);
    if (!t || t === this._svgName && e === this._svgPack) return;
    this._svgName = t, this._svgPack = e;
    const s = $.resolve(t, e);
    s && $.iconify(s, e).then((i) => {
      t !== this._svgName || e !== this._svgPack || (this._svg = i, this.requestUpdate());
    });
  }
  render() {
    const t = this.name || "", e = $.detect(t), s = this._sizePx(), i = `width:${s}px;height:${s}px;color:${this.color || "currentColor"};display:inline-flex;align-items:center;justify-content:center`;
    return e === "emoji" ? L`<span
        part="icon"
        style="${i};font-size:${Math.round(s * 0.8)}px;line-height:1"
        role="img"
        aria-label=${t}
        >${t}</span
      >` : e === "image" ? L`<img
        part="icon"
        src=${t}
        alt=""
        style="${i};object-fit:contain"
        aria-hidden="true"
      />` : this._svg ? L`<span
        part="icon"
        style="${i}"
        role="img"
        aria-label=${t}
        >${Pe(this._svg)}</span
      >` : L`<span
      part="icon"
      style="${i};border-radius:4px;background:currentColor;opacity:0.35"
      role="img"
      aria-label=${t}
    ></span>`;
  }
}
v = Te(ot);
dt = /* @__PURE__ */ new WeakMap();
ut = /* @__PURE__ */ new WeakMap();
pt = /* @__PURE__ */ new WeakMap();
Z(v, 4, "name", Ft, O, dt);
Z(v, 4, "size", Vt, O, ut);
Z(v, 4, "color", Wt, O, pt);
O = Z(v, 0, "TrellisIcon", qt, O);
b(v, 1, O);
export {
  M as ALIASES,
  O as TrellisIcon,
  vt as detectKind,
  $ as registry
};
