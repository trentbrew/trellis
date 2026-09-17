var hc = (n) => {
  throw TypeError(n);
};
var fc = (n, e, t) => e.has(n) || hc("Cannot " + t);
var pe = (n, e, t) => (fc(n, e, "read from private field"), t ? t.call(n) : e.get(n)), me = (n, e, t) => e.has(n) ? hc("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), ge = (n, e, t, r) => (fc(n, e, "write to private field"), r ? r.call(n, t) : e.set(n, t), t);
import { LitElement as ce, html as x, css as ve, nothing as ln } from "lit";
import { liveEntity as Np, liveEntities as eu, liveQuery as $p } from "trellis/browser";
import { createTableCore as Ip } from "trellis/table";
import { createUndoHistoryCore as Dp } from "trellis/undo-history";
import { createPaletteCore as Pp } from "trellis/palette";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Rp = (n) => (e, t) => {
  t !== void 0 ? t.addInitializer(() => {
    customElements.define(n, e);
  }) : customElements.define(n, e);
};
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const gs = globalThis, sl = gs.ShadowRoot && (gs.ShadyCSS === void 0 || gs.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, tu = Symbol(), pc = /* @__PURE__ */ new WeakMap();
let Lp = class {
  constructor(e, t, r) {
    if (this._$cssResult$ = !0, r !== tu) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (sl && e === void 0) {
      const r = t !== void 0 && t.length === 1;
      r && (e = pc.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), r && pc.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const zp = (n) => new Lp(typeof n == "string" ? n : n + "", void 0, tu), Bp = (n, e) => {
  if (sl) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const r = document.createElement("style"), s = gs.litNonce;
    s !== void 0 && r.setAttribute("nonce", s), r.textContent = t.cssText, n.appendChild(r);
  }
}, mc = sl ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const r of e.cssRules) t += r.cssText;
  return zp(t);
})(n) : n;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Fp, defineProperty: Hp, getOwnPropertyDescriptor: Vp, getOwnPropertyNames: Wp, getOwnPropertySymbols: jp, getPrototypeOf: qp } = Object, ft = globalThis, gc = ft.trustedTypes, Up = gc ? gc.emptyScript : "", Po = ft.reactiveElementPolyfillSupport, jn = (n, e) => n, gi = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? Up : null;
      break;
    case Object:
    case Array:
      n = n == null ? n : JSON.stringify(n);
  }
  return n;
}, fromAttribute(n, e) {
  let t = n;
  switch (e) {
    case Boolean:
      t = n !== null;
      break;
    case Number:
      t = n === null ? null : Number(n);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(n);
      } catch {
        t = null;
      }
  }
  return t;
} }, il = (n, e) => !Fp(n, e), yc = { attribute: !0, type: String, converter: gi, reflect: !1, useDefault: !1, hasChanged: il };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), ft.litPropertyMetadata ?? (ft.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let Sn = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = yc) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const r = Symbol(), s = this.getPropertyDescriptor(e, r, t);
      s !== void 0 && Hp(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, r) {
    const { get: s, set: i } = Vp(this.prototype, e) ?? { get() {
      return this[t];
    }, set(o) {
      this[t] = o;
    } };
    return { get: s, set(o) {
      const a = s == null ? void 0 : s.call(this);
      i == null || i.call(this, o), this.requestUpdate(e, a, r);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? yc;
  }
  static _$Ei() {
    if (this.hasOwnProperty(jn("elementProperties"))) return;
    const e = qp(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(jn("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(jn("properties"))) {
      const t = this.properties, r = [...Wp(t), ...jp(t)];
      for (const s of r) this.createProperty(s, t[s]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [r, s] of t) this.elementProperties.set(r, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, r] of this.elementProperties) {
      const s = this._$Eu(t, r);
      s !== void 0 && this._$Eh.set(s, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const r = new Set(e.flat(1 / 0).reverse());
      for (const s of r) t.unshift(mc(s));
    } else e !== void 0 && t.push(mc(e));
    return t;
  }
  static _$Eu(e, t) {
    const r = t.attribute;
    return r === !1 ? void 0 : typeof r == "string" ? r : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const r of t.keys()) this.hasOwnProperty(r) && (e.set(r, this[r]), delete this[r]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Bp(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var r;
      return (r = t.hostConnected) == null ? void 0 : r.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var r;
      return (r = t.hostDisconnected) == null ? void 0 : r.call(t);
    });
  }
  attributeChangedCallback(e, t, r) {
    this._$AK(e, r);
  }
  _$ET(e, t) {
    var i;
    const r = this.constructor.elementProperties.get(e), s = this.constructor._$Eu(e, r);
    if (s !== void 0 && r.reflect === !0) {
      const o = (((i = r.converter) == null ? void 0 : i.toAttribute) !== void 0 ? r.converter : gi).toAttribute(t, r.type);
      this._$Em = e, o == null ? this.removeAttribute(s) : this.setAttribute(s, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var i, o;
    const r = this.constructor, s = r._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const a = r.getPropertyOptions(s), l = typeof a.converter == "function" ? { fromAttribute: a.converter } : ((i = a.converter) == null ? void 0 : i.fromAttribute) !== void 0 ? a.converter : gi;
      this._$Em = s;
      const c = l.fromAttribute(t, a.type);
      this[s] = c ?? ((o = this._$Ej) == null ? void 0 : o.get(s)) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, r, s = !1, i) {
    var o;
    if (e !== void 0) {
      const a = this.constructor;
      if (s === !1 && (i = this[e]), r ?? (r = a.getPropertyOptions(e)), !((r.hasChanged ?? il)(i, t) || r.useDefault && r.reflect && i === ((o = this._$Ej) == null ? void 0 : o.get(e)) && !this.hasAttribute(a._$Eu(e, r)))) return;
      this.C(e, t, r);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: r, reflect: s, wrapped: i }, o) {
    r && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, o ?? t ?? this[e]), i !== !0 || o !== void 0) || (this._$AL.has(e) || (this.hasUpdated || r || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var r;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [i, o] of this._$Ep) this[i] = o;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [i, o] of s) {
        const { wrapped: a } = o, l = this[i];
        a !== !0 || this._$AL.has(i) || l === void 0 || this.C(i, void 0, o, l);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (r = this._$EO) == null || r.forEach((s) => {
        var i;
        return (i = s.hostUpdate) == null ? void 0 : i.call(s);
      }), this.update(t)) : this._$EM();
    } catch (s) {
      throw e = !1, this._$EM(), s;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((r) => {
      var s;
      return (s = r.hostUpdated) == null ? void 0 : s.call(r);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
Sn.elementStyles = [], Sn.shadowRootOptions = { mode: "open" }, Sn[jn("elementProperties")] = /* @__PURE__ */ new Map(), Sn[jn("finalized")] = /* @__PURE__ */ new Map(), Po == null || Po({ ReactiveElement: Sn }), (ft.reactiveElementVersions ?? (ft.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Kp = { attribute: !0, type: String, converter: gi, reflect: !1, hasChanged: il }, Jp = (n = Kp, e, t) => {
  const { kind: r, metadata: s } = t;
  let i = globalThis.litPropertyMetadata.get(s);
  if (i === void 0 && globalThis.litPropertyMetadata.set(s, i = /* @__PURE__ */ new Map()), r === "setter" && ((n = Object.create(n)).wrapped = !0), i.set(t.name, n), r === "accessor") {
    const { name: o } = t;
    return { set(a) {
      const l = e.get.call(this);
      e.set.call(this, a), this.requestUpdate(o, l, n, !0, a);
    }, init(a) {
      return a !== void 0 && this.C(o, void 0, n, a), a;
    } };
  }
  if (r === "setter") {
    const { name: o } = t;
    return function(a) {
      const l = this[o];
      e.call(this, a), this.requestUpdate(o, l, n, !0, a);
    };
  }
  throw Error("Unsupported decorator location: " + r);
};
function M(n) {
  return (e, t) => typeof t == "object" ? Jp(n, e, t) : ((r, s, i) => {
    const o = s.hasOwnProperty(i);
    return s.constructor.createProperty(i, r), o ? Object.getOwnPropertyDescriptor(s, i) : void 0;
  })(n, e, t);
}
var Gp = Object.defineProperty, Yp = Object.getOwnPropertyDescriptor, nu = (n) => {
  throw TypeError(n);
}, ol = (n, e, t, r) => {
  for (var s = Yp(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && Gp(e, t, s), s;
}, ru = (n, e, t) => e.has(n) || nu("Cannot " + t), Ro = (n, e, t) => (ru(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Lo = (n, e, t) => e.has(n) ? nu("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), zo = (n, e, t, r) => (ru(n, e, "write to private field"), e.set(n, t), t), ys, bs, vs;
class co extends ce {
  constructor() {
    super(...arguments), Lo(this, ys, null), Lo(this, bs, null), Lo(this, vs, null), this._client = null;
  }
  get url() {
    return Ro(this, ys);
  }
  set url(e) {
    zo(this, ys, e);
  }
  get apiKey() {
    return Ro(this, bs);
  }
  set apiKey(e) {
    zo(this, bs, e);
  }
  get tenantId() {
    return Ro(this, vs);
  }
  set tenantId(e) {
    zo(this, vs, e);
  }
  get client() {
    return this._client;
  }
  willUpdate(e) {
    (e.has("url") || e.has("apiKey")) && this._reconnect();
  }
  async _reconnect() {
    if (!this.url) return;
    this._dispatch("trellis-disconnected");
    const { TrellisDb: e } = await import("trellis/browser");
    this._client = new e({ url: this.url, apiKey: this.apiKey ?? void 0, tenantId: this.tenantId ?? void 0 }), this._dispatch("trellis-connected");
  }
  _dispatch(e) {
    this.dispatchEvent(new CustomEvent(e, { bubbles: !0, composed: !0 }));
  }
  render() {
    return x`<slot></slot>`;
  }
}
ys = /* @__PURE__ */ new WeakMap();
bs = /* @__PURE__ */ new WeakMap();
vs = /* @__PURE__ */ new WeakMap();
ol([
  M({ type: String, reflect: !0 })
], co.prototype, "url");
ol([
  M({ type: String, reflect: !0, attribute: "api-key" })
], co.prototype, "apiKey");
ol([
  M({ type: String, reflect: !0, attribute: "tenant-id" })
], co.prototype, "tenantId");
customElements.define("trellis-provider", co);
function uo(n) {
  const e = n.closest("trellis-provider");
  return (e == null ? void 0 : e.client) ?? null;
}
function yi(n) {
  return n <= 4 ? "node" : n <= 7 ? "row" : "card";
}
var Xp = Object.defineProperty, Qp = Object.getOwnPropertyDescriptor, su = (n) => {
  throw TypeError(n);
}, Pr = (n, e, t, r) => {
  for (var s = Qp(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && Xp(e, t, s), s;
}, iu = (n, e, t) => e.has(n) || su("Cannot " + t), Cn = (n, e, t) => (iu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Mn = (n, e, t) => e.has(n) ? su("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), En = (n, e, t, r) => (iu(n, e, "write to private field"), e.set(n, t), t), ks, xs, ws, Ss, Cs;
const Ql = class Ql extends ce {
  constructor() {
    super(...arguments), Mn(this, ks, ""), Mn(this, xs, ""), Mn(this, ws, 8), Mn(this, Ss, "main"), Mn(this, Cs, !1), this._client = null, this._live = null, this._unsub = null;
  }
  get id() {
    return Cn(this, ks);
  }
  set id(e) {
    En(this, ks, e);
  }
  get type() {
    return Cn(this, xs);
  }
  set type(e) {
    En(this, xs, e);
  }
  get vantage() {
    return Cn(this, ws);
  }
  set vantage(e) {
    En(this, ws, e);
  }
  get lane() {
    return Cn(this, Ss);
  }
  set lane(e) {
    En(this, Ss, e);
  }
  get editable() {
    return Cn(this, Cs);
  }
  set editable(e) {
    En(this, Cs, e);
  }
  get data() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.data) ?? null;
  }
  get loading() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.loading) ?? !0;
  }
  get error() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.error) ?? null;
  }
  willUpdate(e) {
    (e.has("id") || e.has("type")) && this._fetch(), e.has("vantage") && this._updateShell();
  }
  connectedCallback() {
    super.connectedCallback(), this._connect(), this._updateShell();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._stop();
  }
  _connect() {
    this._client = uo(this), this._client && this.id && this.type && this._fetch();
  }
  _fetch() {
    !this._client || !this.id || (this._stop(), this._live = Np(this._client, this.type, this.id), this._unsub = this._live.signal.subscribe((e) => {
      e.error && this._dispatch("trellis-error"), this._dispatch("trellis-entity-update"), this.requestUpdate();
    }), this._live.start());
  }
  _stop() {
    this._unsub && (this._unsub(), this._unsub = null), this._live = null;
  }
  _updateShell() {
    this.setAttribute("data-shell", yi(this.vantage)), this.style.setProperty("--vantage", String(this.vantage));
  }
  _dispatch(e) {
    this.dispatchEvent(new CustomEvent(e, { bubbles: !0, composed: !0 }));
  }
  render() {
    if (this.loading)
      return x`<slot></slot>`;
    if (this.error)
      return x`<span class="missing">— error loading —</span><slot></slot>`;
    const e = yi(this.vantage), t = this.data;
    return x`<div class="entity" data-shell=${e}>
      ${t != null && t.title ? x`<span class="title">${t.title}</span>` : x`<span class="missing">— not present in ${this.lane} —</span>`}
      <slot></slot>
    </div>`;
  }
};
Ql.styles = ve`
    .entity {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      border: 1px solid var(--border);
      background: var(--bg);
      font-family: var(--font-sans);
    }
    .entity[data-shell='node'] {
      width: max-content;
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-xs);
    }
    .entity[data-shell='row'] {
      padding: var(--space-2) var(--space-3);
      font-size: var(--font-size-sm);
    }
    .entity[data-shell='card'] {
      flex-direction: column;
      align-items: flex-start;
      padding: var(--space-4);
      min-width: 14rem;
    }
    .title {
      font-weight: var(--font-weight-medium);
      color: var(--text-interactive);
    }
    .missing {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
    }
  `;
let kt = Ql;
ks = /* @__PURE__ */ new WeakMap();
xs = /* @__PURE__ */ new WeakMap();
ws = /* @__PURE__ */ new WeakMap();
Ss = /* @__PURE__ */ new WeakMap();
Cs = /* @__PURE__ */ new WeakMap();
Pr([
  M({ type: String, reflect: !0 })
], kt.prototype, "id");
Pr([
  M({ type: String, reflect: !0 })
], kt.prototype, "type");
Pr([
  M({ type: Number, reflect: !0 })
], kt.prototype, "vantage");
Pr([
  M({ type: String, reflect: !0 })
], kt.prototype, "lane");
Pr([
  M({ type: Boolean, reflect: !0 })
], kt.prototype, "editable");
customElements.define("trellis-entity", kt);
var Zp = Object.defineProperty, em = Object.getOwnPropertyDescriptor, ou = (n) => {
  throw TypeError(n);
}, Rr = (n, e, t, r) => {
  for (var s = em(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && Zp(e, t, s), s;
}, au = (n, e, t) => e.has(n) || ou("Cannot " + t), Tn = (n, e, t) => (au(n, e, "read from private field"), t ? t.call(n) : e.get(n)), An = (n, e, t) => e.has(n) ? ou("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), _n = (n, e, t, r) => (au(n, e, "write to private field"), e.set(n, t), t), Ms, Es, Ts, As, _s;
const Zl = class Zl extends ce {
  constructor() {
    super(...arguments), An(this, Ms, ""), An(this, Es, ""), An(this, Ts, ""), An(this, As, 8), An(this, _s, "Entity list"), this._client = null, this._live = null, this._unsub = null, this._selectedId = null;
  }
  get type() {
    return Tn(this, Ms);
  }
  set type(e) {
    _n(this, Ms, e);
  }
  get where() {
    return Tn(this, Es);
  }
  set where(e) {
    _n(this, Es, e);
  }
  get resolve() {
    return Tn(this, Ts);
  }
  set resolve(e) {
    _n(this, Ts, e);
  }
  get vantage() {
    return Tn(this, As);
  }
  set vantage(e) {
    _n(this, As, e);
  }
  get ariaLabel() {
    return Tn(this, _s);
  }
  set ariaLabel(e) {
    _n(this, _s, e);
  }
  get data() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.data) ?? null;
  }
  get loading() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.loading) ?? !0;
  }
  get error() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.error) ?? null;
  }
  willUpdate(e) {
    (e.has("type") || e.has("where") || e.has("resolve")) && this._fetch();
  }
  connectedCallback() {
    super.connectedCallback(), this._connect();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._stop();
  }
  _connect() {
    this._client = uo(this), this._client && this.type && this._fetch();
  }
  _fetch() {
    if (!this._client || !this.type) return;
    this._stop();
    const e = this.where ? JSON.parse(this.where) : void 0, t = this.resolve ? JSON.parse(this.resolve) : void 0, r = {};
    e && (r.where = e), t && (r.resolve = t), this._live = eu(this._client, this.type, Object.keys(r).length > 0 ? r : void 0), this._unsub = this._live.signal.subscribe((s) => {
      s.error && this._dispatch("trellis-error"), this._dispatch("trellis-entity-list-update"), this.requestUpdate();
    }), this._live.start();
  }
  _stop() {
    this._unsub && (this._unsub(), this._unsub = null), this._live = null;
  }
  _dispatch(e) {
    this.dispatchEvent(new CustomEvent(e, { bubbles: !0, composed: !0 }));
  }
  _handleItemClick(e) {
    const t = e.id || e.ID;
    t && (this._selectedId = t, this.dispatchEvent(new CustomEvent("trellis-entity-click", {
      bubbles: !0,
      composed: !0,
      detail: { entity: e }
    })));
  }
  _handleKeyDown(e, t) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._handleItemClick(t));
  }
  render() {
    if (this.loading)
      return x`
        <div class="list" role="list" aria-label="${this.ariaLabel}" aria-busy="true">
          <div class="loading" role="status">Loading...</div>
        </div>
      `;
    if (this.error)
      return x`
        <div class="list" role="list" aria-label="${this.ariaLabel}">
          <div class="error" role="alert">${this.error.message}</div>
        </div>
      `;
    const e = this.data ?? [];
    return e.length === 0 ? x`
        <div class="list" role="list" aria-label="${this.ariaLabel}">
          <div class="empty" role="status">No items found</div>
        </div>
      ` : x`
      <div class="list" role="list" aria-label="${this.ariaLabel}">
        ${e.map((t, r) => {
      const s = t.id || t.ID || `item-${r}`, i = this._selectedId === s, o = t.title || t.name || String(s), a = t.type || this.type;
      return x`
            <div
              class="item"
              role="listitem"
              tabindex="0"
              aria-selected="${i}"
              ?data-selected="${i}"
              @click="${() => this._handleItemClick(t)}"
              @keydown="${(l) => this._handleKeyDown(l, t)}"
            >
              <span class="entity-type">${a}</span>
              <span class="entity-title">${o}</span>
            </div>
          `;
    })}
      </div>
    `;
  }
};
Zl.styles = ve`
    :host {
      display: block;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      border: 1px solid var(--border);
      background: var(--bg);
      border-radius: var(--radius-md);
      padding: var(--space-2);
      max-height: 40rem;
      overflow-y: auto;
      position: relative;
    }

    .item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .item:hover {
      background: var(--sidebar-item-hover);
    }

    .item:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .item[data-selected] {
      background: var(--sidebar-item-hover);
      border-left: 2px solid var(--text-interactive);
    }

    .entity-title {
      font-weight: var(--font-weight-medium);
      color: var(--text-interactive);
    }

    .entity-type {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .empty {
      padding: var(--space-4);
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--font-size-sm);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      color: var(--text-tertiary);
      font-size: var(--font-size-sm);
    }

    .loading::before {
      content: '';
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--border);
      border-top-color: var(--border-focus);
      border-radius: var(--radius-full);
      animation: spin 1s linear infinite;
      margin-right: var(--space-2);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading::before {
        animation: none;
      }
    }

    .error {
      padding: var(--space-3);
      color: var(--destructive);
      font-size: var(--font-size-xs);
      border: 1px solid var(--destructive);
      border-radius: var(--radius-sm);
    }
  `;
let xt = Zl;
Ms = /* @__PURE__ */ new WeakMap();
Es = /* @__PURE__ */ new WeakMap();
Ts = /* @__PURE__ */ new WeakMap();
As = /* @__PURE__ */ new WeakMap();
_s = /* @__PURE__ */ new WeakMap();
Rr([
  M({ type: String, reflect: !0 })
], xt.prototype, "type");
Rr([
  M({ type: String, reflect: !0 })
], xt.prototype, "where");
Rr([
  M({ type: String, reflect: !0 })
], xt.prototype, "resolve");
Rr([
  M({ type: Number, reflect: !0 })
], xt.prototype, "vantage");
Rr([
  M({ type: String, reflect: !0, attribute: "aria-label" })
], xt.prototype, "ariaLabel");
customElements.define("trellis-entity-list", xt);
var tm = Object.defineProperty, nm = Object.getOwnPropertyDescriptor, lu = (n) => {
  throw TypeError(n);
}, nt = (n, e, t, r) => {
  for (var s = nm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && tm(e, t, s), s;
}, cu = (n, e, t) => e.has(n) || lu("Cannot " + t), Ve = (n, e, t) => (cu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), We = (n, e, t) => e.has(n) ? lu("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), je = (n, e, t, r) => (cu(n, e, "write to private field"), e.set(n, t), t), Os, Ns, $s, Is, Ds, Ps, Rs, Ls, zs;
const du = "trellis-entity-table-view";
function rm(n) {
  try {
    const e = localStorage.getItem(du);
    if (e) {
      const t = JSON.parse(e);
      if (t.mode && sm(t.mode)) return t.mode;
    }
  } catch {
  }
  return n;
}
function sm(n) {
  return n === "grid" || n === "table" || n === "kanban" || n === "card";
}
function im(n) {
  try {
    localStorage.setItem(du, JSON.stringify({ mode: n }));
  } catch {
  }
}
function om(n) {
  const e = /* @__PURE__ */ new Set();
  for (const t of n)
    for (const r of Object.keys(t)) e.add(r);
  return Array.from(e).slice(0, 8).map((t) => ({ id: t, header: t, accessorKey: t }));
}
function am(n) {
  return n.map((e) => ({
    id: e.id,
    header: e.header ?? e.id,
    accessorKey: e.accessorKey ?? e.id,
    ...e.accessorFn ? { accessorFn: e.accessorFn } : {},
    ...e.width !== void 0 ? { width: e.width } : {},
    ...e.align !== void 0 ? { align: e.align } : {},
    ...e.type !== void 0 ? { type: e.type } : {}
  }));
}
const ec = class ec extends ce {
  constructor() {
    super(), We(this, Os, ""), We(this, Ns, ""), We(this, $s, ""), We(this, Is, 8), We(this, Ds, []), We(this, Ps, "table"), We(this, Rs, []), We(this, Ls, !0), We(this, zs, 10), this._core = null, this._unsub = null, this._client = null, this._live = null, this._liveUnsub = null, this._lastSelected = [], this._resolvedMode = rm("table");
  }
  get type() {
    return Ve(this, Os);
  }
  set type(e) {
    je(this, Os, e);
  }
  get where() {
    return Ve(this, Ns);
  }
  set where(e) {
    je(this, Ns, e);
  }
  get resolve() {
    return Ve(this, $s);
  }
  set resolve(e) {
    je(this, $s, e);
  }
  get vantage() {
    return Ve(this, Is);
  }
  set vantage(e) {
    je(this, Is, e);
  }
  get columns() {
    return Ve(this, Ds);
  }
  set columns(e) {
    je(this, Ds, e);
  }
  get viewMode() {
    return Ve(this, Ps);
  }
  set viewMode(e) {
    je(this, Ps, e);
  }
  get data() {
    return Ve(this, Rs);
  }
  set data(e) {
    je(this, Rs, e);
  }
  get enablePagination() {
    return Ve(this, Ls);
  }
  set enablePagination(e) {
    je(this, Ls, e);
  }
  get pageSize() {
    return Ve(this, zs);
  }
  set pageSize(e) {
    je(this, zs, e);
  }
  get core() {
    return this._core;
  }
  get liveData() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.data) ?? null;
  }
  get loading() {
    var e;
    return this.data.length > 0 || !this.type || !this._client ? !1 : ((e = this._live) == null ? void 0 : e.signal.value.loading) ?? !0;
  }
  get error() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.error) ?? null;
  }
  connectedCallback() {
    super.connectedCallback(), this._connectLive(), this._mountCore(), this._updateShell(), this.setAttribute("data-view-mode", this._resolvedMode);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._unmountCore(), this._stopLive();
  }
  updated(e) {
    e.has("type") || e.has("where") || e.has("resolve") ? (this._stopLive(), this._connectLive(), this._mountCore()) : (e.has("data") || e.has("columns") || e.has("enablePagination") || e.has("pageSize")) && this._mountCore(), e.has("vantage") && this._updateShell(), e.has("viewMode") && (this._resolvedMode = this.viewMode, im(this.viewMode), this.setAttribute("data-view-mode", this.viewMode));
  }
  _connectLive() {
    if (this._client = uo(this), !this._client || !this.type || this.data.length > 0) return;
    const e = {};
    this.where && (e.where = JSON.parse(this.where)), this.resolve && (e.resolve = JSON.parse(this.resolve));
    const t = Object.keys(e).length > 0 ? e : void 0;
    this._live = eu(this._client, this.type, t), this._liveUnsub = this._live.signal.subscribe(() => {
      this._live.signal.value.error && this.dispatchEvent(new CustomEvent("trellis-error", { bubbles: !0, composed: !0 })), this._mountCore();
    }), this._live.start();
  }
  _stopLive() {
    var e;
    (e = this._liveUnsub) == null || e.call(this), this._liveUnsub = null, this._live = null;
  }
  _effectiveRows() {
    return this.data.length > 0 ? this.data : this.liveData ?? [];
  }
  _effectiveColumns() {
    return this.columns.length > 0 ? this.columns : om(this._effectiveRows());
  }
  _mountCore() {
    this._unmountCore();
    const e = this._effectiveRows(), t = this._effectiveColumns();
    t.length && (this._core = Ip({
      data: e,
      columns: am(t),
      enablePagination: this.enablePagination,
      initialState: { pageSize: this.pageSize },
      undoHistory: Dp(),
      onCellEdit: (r, s, i, o) => (this.dispatchEvent(
        new CustomEvent("trellis-cell-edit", {
          bubbles: !0,
          composed: !0,
          detail: { rowId: r, columnId: s, value: i, row: o }
        })
      ), !0),
      getRowId: (r, s) => {
        const i = r.id ?? r.ID ?? r.entityId;
        return i != null ? String(i) : `item-${s}`;
      }
    }), this._unsub = this._core.subscribe(() => {
      this._emitSelectionChange(), this.requestUpdate();
    }));
  }
  _unmountCore() {
    var e;
    (e = this._unsub) == null || e.call(this), this._unsub = null, this._core = null;
  }
  _emitSelectionChange() {
    var t;
    const e = ((t = this._core) == null ? void 0 : t.state.selectedRows) ?? [];
    e.join(",") !== this._lastSelected.join(",") && (this._lastSelected = [...e], this.dispatchEvent(
      new CustomEvent("trellis-table-selection-change", {
        bubbles: !0,
        composed: !0,
        detail: { selectedRows: e }
      })
    ));
  }
  _updateShell() {
    this.style.setProperty("--vantage", String(this.vantage)), this.setAttribute("data-shell", yi(this.vantage));
  }
  _handleSelect(e, t) {
    this.dispatchEvent(
      new CustomEvent("trellis-entity-click", {
        bubbles: !0,
        composed: !0,
        detail: { entity: { id: e, ...t }, rowId: e }
      })
    );
  }
  _handleKeyDown(e, t, r) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._handleSelect(t, r));
  }
  _handleFilterInput(e) {
    var r;
    const t = e.target.value;
    (r = this._core) == null || r.actions.setGlobalFilter(t);
  }
  _sortIndicator(e) {
    var r;
    const t = (r = this._core) == null ? void 0 : r.state.sorting[0];
    return !t || t.id !== e ? "" : t.desc ? " ↓" : " ↑";
  }
  _handleEditKeyDown(e, t) {
    e.key === "Enter" ? (e.preventDefault(), t.actions.commitEdit()) : e.key === "Escape" && (e.preventDefault(), t.actions.cancelEdit());
  }
  _renderCell(e, t, r) {
    const s = r.state.editing;
    return (s == null ? void 0 : s.rowId) === e.id && (s == null ? void 0 : s.columnId) === t.id ? x`
        <div class="table-cell table-cell--edit" role="cell" @click=${(o) => o.stopPropagation()}>
          <input
            class="cell-editor"
            .value=${r.state.editDraft ?? ""}
            @input=${(o) => r.actions.setEditDraft(o.target.value)}
            @keydown=${(o) => this._handleEditKeyDown(o, r)}
            @blur=${() => r.actions.commitEdit()}
          />
        </div>
      ` : x`
      <div
        class="table-cell"
        role="cell"
        data-editable=${t.editable ? "true" : "false"}
        @dblclick=${(o) => {
      o.stopPropagation(), t.editable && r.actions.startEdit(e.id, t.id);
    }}
      >
        <span class="cell-text">${e.cells[t.id] ?? ""}</span>
        <span class="cell-pip" aria-hidden="true"></span>
      </div>
    `;
  }
  _renderToolbar() {
    const e = this._core;
    return e ? x`
      <div class="table-toolbar">
        <div class="table-undo">
          <button
            type="button"
            class="undo-btn"
            ?disabled=${!e.state.canUndo}
            @click=${() => e.actions.undo()}
          >
            Undo
          </button>
          <button
            type="button"
            class="redo-btn"
            ?disabled=${!e.state.canRedo}
            @click=${() => e.actions.redo()}
          >
            Redo
          </button>
        </div>
        <input
          class="table-filter"
          type="search"
          placeholder="Filter rows…"
          .value=${e.state.globalFilter}
          @input=${this._handleFilterInput}
          aria-label="Filter table rows"
        />
        ${e.state.paginated ? x`
              <div class="table-pager">
                <button
                  type="button"
                  class="pager-btn"
                  ?disabled=${e.state.pageIndex <= 0}
                  @click=${() => e.actions.previousPage()}
                >
                  Prev
                </button>
                <span class="pager-label">
                  Page ${e.state.pageIndex + 1} / ${Math.max(e.state.pageCount, 1)}
                </span>
                <button
                  type="button"
                  class="pager-btn"
                  ?disabled=${e.state.pageIndex >= e.state.pageCount - 1}
                  @click=${() => e.actions.nextPage()}
                >
                  Next
                </button>
              </div>
            ` : ln}
      </div>
    ` : ln;
  }
  render() {
    if (this.loading)
      return x`
        <div class="table-container" role="table" aria-busy="true" data-view-mode=${this._resolvedMode}>
          <div class="table-loading" role="status">Loading...</div>
        </div>
      `;
    if (this.error)
      return x`
        <div class="table-container" role="table" aria-label="Entity table" data-view-mode=${this._resolvedMode}>
          <div class="table-error" role="alert">${this.error.message}</div>
        </div>
      `;
    const e = this._core;
    if (!e)
      return x`
        <div class="table-container" role="table" aria-label="Entity table" data-view-mode=${this._resolvedMode}>
          <div class="table-empty" role="status">No columns configured</div>
        </div>
      `;
    const { rows: t, columns: r } = e.state, s = yi(this.vantage);
    return t.length ? x`
      <div class="table-container" role="table" aria-label="Entity table" data-view-mode=${this._resolvedMode}>
        ${this._renderToolbar()}
        <div class="table-head" role="rowgroup">
          <div class="table-row table-header-row" role="row">
            <div class="table-cell table-cell--select" role="columnheader">
              <input
                type="checkbox"
                .checked=${e.state.allSelected}
                .indeterminate=${e.state.someSelected && !e.state.allSelected}
                @change=${(i) => e.actions.toggleAllSelected(i.target.checked)}
                aria-label="Select all rows on page"
              />
            </div>
            ${r.map(
      (i) => x`
                <button
                  type="button"
                  class="table-sort table-cell table-cell--header"
                  role="columnheader"
                  data-column-id=${i.id}
                  @click=${() => e.actions.sort(i.id)}
                >
                  ${i.header}${this._sortIndicator(i.id)}
                </button>
              `
    )}
          </div>
        </div>
        <div class="table-body" role="rowgroup">
          ${t.map((i) => x`
            <div
              class="table-row table-row--entity"
              role="row"
              data-entity-id=${i.id}
              data-shell="${s}"
              data-vantage="${this.vantage}"
              @click=${() => this._handleSelect(i.id, i.cells)}
              @keydown=${(o) => this._handleKeyDown(o, i.id, i.cells)}
              tabindex="0"
            >
              <div class="table-cell table-cell--select" role="cell" @click=${(o) => o.stopPropagation()}>
                <input
                  type="checkbox"
                  .checked=${i.selected}
                  @change=${(o) => e.actions.toggleRowSelected(i.id, o.target.checked)}
                  aria-label="Select row ${i.id}"
                />
              </div>
              ${r.map((o) => this._renderCell(i, o, e))}
            </div>
          `)}
        </div>
      </div>
    ` : x`
        <div class="table-container" role="table" aria-label="Entity table" data-view-mode=${this._resolvedMode}>
          ${this._renderToolbar()}
          <div class="table-empty" role="status">No items found</div>
        </div>
      `;
  }
};
ec.styles = ve`
    :host {
      display: block;
    }

    .table-container {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      background: var(--surface-bg);
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
    }

    .table-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--border);
      background: var(--surface-inset);
    }

    .table-undo {
      display: flex;
      gap: var(--space-1, 0.25rem);
    }

    .undo-btn,
    .redo-btn {
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm, 6px);
      background: var(--surface-raised);
      color: var(--text);
      font-size: var(--font-size-sm, 0.875rem);
      cursor: pointer;
    }

    .undo-btn:disabled,
    .redo-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .cell-editor {
      width: 100%;
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border: 1px solid var(--border-focus, var(--text-interactive));
      border-radius: var(--radius-sm, 6px);
      background: var(--surface-bg);
      color: var(--text);
      font: inherit;
    }

    .table-cell[data-editable='true'] {
      cursor: cell;
    }

    .table-filter {
      flex: 1 1 180px;
      min-width: 140px;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border: 1px solid var(--search-border, var(--border));
      border-radius: var(--radius-md, 8px);
      background: var(--search-bg, var(--surface-raised));
      color: var(--text);
      font: inherit;
    }

    .table-filter:focus-visible {
      outline: 2px solid var(--border-focus, var(--text-interactive));
      outline-offset: 1px;
    }

    .table-pager {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      color: var(--text-secondary);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .pager-btn {
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm, 6px);
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
    }

    .pager-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .table-container[data-view-mode='grid'] {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-2, 0.5rem);
      border: none;
      padding: var(--space-2, 0.5rem);
    }

    .table-container[data-view-mode='kanban'] {
      display: flex;
      flex-direction: row;
      gap: var(--space-2, 0.5rem);
      overflow-x: auto;
      padding: var(--space-2, 0.5rem);
      border: none;
    }

    .table-container[data-view-mode='card'] {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 0.5rem);
      border: none;
      padding: var(--space-2, 0.5rem);
    }

    .table-row {
      display: contents;
    }

    .table-container[data-view-mode='grid'] .table-row--entity,
    .table-container[data-view-mode='kanban'] .table-row--entity,
    .table-container[data-view-mode='card'] .table-row--entity {
      display: flex;
      flex-direction: column;
      padding: var(--space-3, 0.75rem);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 10px);
      background: var(--surface-raised);
    }

    .table-head {
      background: var(--surface-raised);
      border-bottom: 1px solid var(--border);
      font-size: var(--font-size-xs, 0.6875rem);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .table-header-row {
      display: contents;
    }

    .table-cell {
      display: table-cell;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .table-cell--header {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: var(--font-size-xs, 0.6875rem);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-tertiary);
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
    }

    .table-cell--select {
      width: 2.5rem;
      text-align: center;
    }

    .cell-text {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--font-size-sm, 0.8125rem);
      color: var(--text);
    }

    .cell-pip {
      display: none;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--entity-default);
    }

    [data-shell='node'] .cell-text {
      display: none;
    }

    [data-shell='node'] .cell-pip {
      display: inline-block;
    }

    [data-shell='row'] .table-cell {
      padding: 4px 8px;
    }

    [data-shell='card'] .table-row--entity {
      box-shadow: 0 2px 8px color-mix(in oklch, var(--surface-bg) 70%, transparent);
    }

    .table-row--entity {
      transition:
        padding 0.18s var(--motion-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
        border-radius 0.18s var(--motion-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
        background-color 0.15s ease;
    }

    .table-row--entity:hover {
      background: var(--surface-hover);
    }

    .table-row--entity:focus-visible {
      outline: 2px solid var(--text-interactive);
      outline-offset: -2px;
      z-index: 1;
    }

    .table-loading,
    .table-error,
    .table-empty {
      padding: var(--space-4, 1rem);
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--font-size-sm, 0.875rem);
    }

    @media (prefers-reduced-motion: reduce) {
      .table-row--entity {
        transition: none;
      }
    }
  `;
let Oe = ec;
Os = /* @__PURE__ */ new WeakMap();
Ns = /* @__PURE__ */ new WeakMap();
$s = /* @__PURE__ */ new WeakMap();
Is = /* @__PURE__ */ new WeakMap();
Ds = /* @__PURE__ */ new WeakMap();
Ps = /* @__PURE__ */ new WeakMap();
Rs = /* @__PURE__ */ new WeakMap();
Ls = /* @__PURE__ */ new WeakMap();
zs = /* @__PURE__ */ new WeakMap();
nt([
  M({ type: String, reflect: !0 })
], Oe.prototype, "type");
nt([
  M({ type: String, reflect: !0 })
], Oe.prototype, "where");
nt([
  M({ type: String, reflect: !0 })
], Oe.prototype, "resolve");
nt([
  M({ type: Number, reflect: !0 })
], Oe.prototype, "vantage");
nt([
  M({ type: Array })
], Oe.prototype, "columns");
nt([
  M({ type: String, reflect: !0 })
], Oe.prototype, "viewMode");
nt([
  M({ type: Array })
], Oe.prototype, "data");
nt([
  M({ type: Boolean, reflect: !0, attribute: "paginated" })
], Oe.prototype, "enablePagination");
nt([
  M({ type: Number, reflect: !0, attribute: "page-size" })
], Oe.prototype, "pageSize");
customElements.define("trellis-entity-table", Oe);
var lm = Object.defineProperty, cm = Object.getOwnPropertyDescriptor, uu = (n) => {
  throw TypeError(n);
}, al = (n, e, t, r) => {
  for (var s = cm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && lm(e, t, s), s;
}, hu = (n, e, t) => e.has(n) || uu("Cannot " + t), Bo = (n, e, t) => (hu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Fo = (n, e, t) => e.has(n) ? uu("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Ho = (n, e, t, r) => (hu(n, e, "write to private field"), e.set(n, t), t), Bs, Fs, Hs;
function bc(n, e) {
  const t = n.id ?? n.ID ?? n.entityId;
  return t != null ? String(t) : `item-${e}`;
}
function dm(n) {
  const e = n.title ?? n.name ?? n.text;
  if (e != null) return String(e);
  try {
    return JSON.stringify(n);
  } catch {
    return "Untitled";
  }
}
const tc = class tc extends ce {
  constructor() {
    super(...arguments), Fo(this, Bs, ""), Fo(this, Fs, ""), Fo(this, Hs, "Query results"), this._client = null, this._live = null, this._unsub = null, this._selectedId = null, this._parseError = null, this._provider = null, this._onProviderConnected = () => {
      this._connect(), this.query && this._fetch();
    };
  }
  get query() {
    return Bo(this, Bs);
  }
  set query(e) {
    Ho(this, Bs, e);
  }
  get resolve() {
    return Bo(this, Fs);
  }
  set resolve(e) {
    Ho(this, Fs, e);
  }
  get ariaLabel() {
    return Bo(this, Hs);
  }
  set ariaLabel(e) {
    Ho(this, Hs, e);
  }
  get data() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.data) ?? null;
  }
  get loading() {
    var e;
    return !this.query.trim() || this._parseError || !this._client ? !1 : ((e = this._live) == null ? void 0 : e.signal.value.loading) ?? !0;
  }
  get error() {
    var e;
    return ((e = this._live) == null ? void 0 : e.signal.value.error) ?? this._parseError;
  }
  willUpdate(e) {
    (e.has("query") || e.has("resolve")) && (e.has("query") && (this._selectedId = null), this._fetch());
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), this._provider = this.closest("trellis-provider"), (e = this._provider) == null || e.addEventListener("trellis-connected", this._onProviderConnected), this._connect(), this.query && this._fetch(), queueMicrotask(() => {
      this._connect(), this._client && this.query.trim() && this._fetch();
    });
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._provider) == null || e.removeEventListener("trellis-connected", this._onProviderConnected), this._provider = null, this._stop();
  }
  _connect() {
    this._client = uo(this);
  }
  _parseResolve() {
    if (this.resolve.trim())
      try {
        const e = JSON.parse(this.resolve);
        if (e == null || typeof e != "object" || Array.isArray(e))
          throw new Error("resolve must be a JSON object");
        return e;
      } catch (e) {
        return this._parseError = e instanceof Error ? e : new Error("Invalid JSON in resolve attribute"), null;
      }
  }
  _fetch() {
    if (this._stop(), this._parseError = null, !this.query.trim()) {
      this.requestUpdate();
      return;
    }
    if (this._parseResolve() === null) {
      this.requestUpdate();
      return;
    }
    if (this._connect(), !this._client) {
      this.requestUpdate();
      return;
    }
    this._live = $p(this._client, this.query.trim()), this._unsub = this._live.signal.subscribe(() => {
      this._live.signal.value.error && this._dispatch("trellis-error"), this._dispatch("trellis-query-update"), this.requestUpdate();
    }), this._live.start();
  }
  _stop() {
    this._unsub && (this._unsub(), this._unsub = null), this._live = null;
  }
  _dispatch(e) {
    this.dispatchEvent(new CustomEvent(e, { bubbles: !0, composed: !0 }));
  }
  _handleItemClick(e, t) {
    this._selectedId = bc(e, t), this.dispatchEvent(
      new CustomEvent("trellis-query-result-click", {
        bubbles: !0,
        composed: !0,
        detail: { item: e, index: t }
      })
    ), this.requestUpdate();
  }
  _handleKeyDown(e, t, r) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._handleItemClick(t, r));
  }
  render() {
    if (!this.query.trim())
      return x`
        <div class="query" role="list" aria-label="${this.ariaLabel}">
          <slot name="empty">
            <div class="query-empty" role="status">No query specified</div>
          </slot>
        </div>
      `;
    if (this.loading)
      return x`
        <div class="query" role="list" aria-label="${this.ariaLabel}" aria-busy="true">
          <slot name="loading">
            <div class="query-loading" role="status">Loading results…</div>
          </slot>
        </div>
      `;
    if (this.error)
      return x`
        <div class="query" role="list" aria-label="${this.ariaLabel}">
          <slot name="error">
            <div class="query-error" role="alert">${this.error.message}</div>
          </slot>
        </div>
      `;
    if (!this._client)
      return x`
        <div class="query" role="list" aria-label="${this.ariaLabel}">
          <slot name="empty">
            <div class="query-empty" role="status">Connect a trellis-provider to run queries</div>
          </slot>
        </div>
      `;
    const e = this.data ?? [];
    return e.length === 0 ? x`
        <div class="query" role="list" aria-label="${this.ariaLabel}">
          <slot name="empty">
            <div class="query-empty" role="status">No results found</div>
          </slot>
        </div>
      ` : x`
      <div class="query" role="list" aria-label="${this.ariaLabel}" aria-live="polite">
        ${e.map((t, r) => {
      const s = bc(t, r), i = this._selectedId === s;
      return x`
            <div
              class="query-item"
              role="listitem"
              tabindex="0"
              aria-selected="${i ? "true" : "false"}"
              ?data-selected=${i}
              @click=${() => this._handleItemClick(t, r)}
              @keydown=${(o) => this._handleKeyDown(o, t, r)}
            >
              <slot name="item">${this._defaultItemTemplate(t)}</slot>
            </div>
          `;
    })}
      </div>
    `;
  }
  _defaultItemTemplate(e) {
    const t = dm(e), r = e.type != null ? String(e.type) : "result";
    return x`
      <span class="query-item-title">${t}</span>
      <span class="query-item-type">${r}</span>
    `;
  }
};
tc.styles = ve`
    :host {
      display: block;
    }

    .query {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      background: var(--surface-bg);
      border-radius: var(--radius-md, 8px);
      padding: var(--space-2, 0.5rem);
      max-height: 40rem;
      overflow-y: auto;
    }

    .query-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border-radius: var(--radius-sm, 6px);
      border-left: 2px solid transparent;
      cursor: pointer;
      color: var(--text);
      transition: background-color 150ms ease, border-color 150ms ease;
    }

    .query-item:hover {
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
    }

    .query-item:focus-visible {
      outline: 2px solid var(--border-focus, var(--color-blue-500));
      outline-offset: 2px;
    }

    .query-item[data-selected] {
      background: var(--sidebar-item-active, rgba(157, 190, 254, 0.12));
      border-left-color: var(--border-focus, var(--color-blue-500));
    }

    .query-item-title {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .query-item-type {
      flex-shrink: 0;
      font-size: var(--font-size-xs, 0.75rem);
      padding: 2px 6px;
      border-radius: var(--radius-full, 9999px);
      background: var(--surface-inset);
      color: var(--text-tertiary);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
    }

    .query-empty,
    .query-loading {
      padding: var(--space-4, 1rem);
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .query-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2, 0.5rem);
    }

    .query-loading::before {
      content: '';
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--border, rgba(255, 255, 255, 0.195));
      border-top-color: var(--border-focus, var(--color-blue-500));
      border-radius: var(--radius-full, 9999px);
      animation: trellis-query-spin 1s linear infinite;
    }

    .query-error {
      padding: var(--space-3, 0.75rem);
      color: var(--destructive, var(--color-red-500));
      font-size: var(--font-size-xs, 0.75rem);
      border: 1px solid var(--destructive, var(--color-red-500));
      border-radius: var(--radius-sm, 6px);
      background: color-mix(in oklch, var(--destructive, var(--color-red-500)) 12%, transparent);
    }

    @keyframes trellis-query-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .query-item {
        transition: none;
      }

      .query-loading::before {
        animation: none;
      }
    }
  `;
let un = tc;
Bs = /* @__PURE__ */ new WeakMap();
Fs = /* @__PURE__ */ new WeakMap();
Hs = /* @__PURE__ */ new WeakMap();
al([
  M({ type: String, reflect: !0 })
], un.prototype, "query");
al([
  M({ type: String, reflect: !0 })
], un.prototype, "resolve");
al([
  M({ type: String, reflect: !0, attribute: "aria-label" })
], un.prototype, "ariaLabel");
customElements.define("trellis-query", un);
var um = Object.defineProperty, hm = Object.getOwnPropertyDescriptor, fu = (n, e, t, r) => {
  for (var s = hm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && um(e, t, s), s;
}, wr, Sr;
const nc = class nc extends ce {
  constructor() {
    super(...arguments);
    me(this, wr, !1);
    me(this, Sr, "light");
  }
  get collapsible() {
    return pe(this, wr);
  }
  set collapsible(t) {
    ge(this, wr, t);
  }
  get theme() {
    return pe(this, Sr);
  }
  set theme(t) {
    ge(this, Sr, t);
  }
  connectedCallback() {
    super.connectedCallback(), this.theme && this.setAttribute("data-theme", this.theme);
  }
  updated(t) {
    t.has("theme") && (this.theme ? this.setAttribute("data-theme", this.theme) : this.removeAttribute("data-theme"));
  }
  render() {
    return x`
      <div class="shell">
        <header class="shell-header">
          <slot name="header"></slot>
        </header>
        <div class="shell-body">
          <div class="shell-main">
            <slot name="main"></slot>
          </div>
          <slot name="sidebar"></slot>
          <slot name="oplog"></slot>
        </div>
      </div>
    `;
  }
};
wr = new WeakMap(), Sr = new WeakMap(), nc.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text);
      background: var(--surface-bg);
      min-height: 100vh;
    }

    .shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .shell-header {
      height: var(--header-height, 56px);
      background: var(--header-bg, rgba(22, 22, 22, 0.75));
      border-bottom: 1px solid
        var(--header-border, var(--border, rgba(255, 255, 255, 0.195)));
      display: flex;
      align-items: center;
      padding: 0 var(--space-4, 1rem);
      flex-shrink: 0;
    }

    .shell-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .shell-main {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4, 1rem);
      background: var(--surface-bg);
    }

    @media (max-width: 768px) {
      .shell-body {
        flex-direction: column;
      }
    }
  `;
let ir = nc;
fu([
  M({ type: Boolean, reflect: !0 })
], ir.prototype, "collapsible");
fu([
  M({ type: String, reflect: !0 })
], ir.prototype, "theme");
customElements.define("trellis-shell", ir);
var fm = Object.defineProperty, pm = Object.getOwnPropertyDescriptor, ho = (n, e, t, r) => {
  for (var s = pm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && fm(e, t, s), s;
}, Cr, Mr, Er, Tr;
const rc = class rc extends ce {
  constructor() {
    super(...arguments);
    me(this, Cr, !0);
    me(this, Mr, "left");
    me(this, Er, 200);
    me(this, Tr, !1);
  }
  get expanded() {
    return pe(this, Cr);
  }
  set expanded(t) {
    ge(this, Cr, t);
  }
  get position() {
    return pe(this, Mr);
  }
  set position(t) {
    ge(this, Mr, t);
  }
  get width() {
    return pe(this, Er);
  }
  set width(t) {
    ge(this, Er, t);
  }
  get rail() {
    return pe(this, Tr);
  }
  set rail(t) {
    ge(this, Tr, t);
  }
  connectedCallback() {
    super.connectedCallback(), this._applyWidth();
  }
  updated(t) {
    (t.has("width") || t.has("expanded")) && this._applyWidth();
  }
  _applyWidth() {
    !this.expanded && this.rail ? this.style.setProperty("--sidebar-w", "0px") : this.style.setProperty("--sidebar-w", `${this.width}px`);
  }
  toggle() {
    this.expanded = !this.expanded;
  }
  render() {
    return x`
      <aside class="sidebar" part="sidebar">
        <div class="sidebar-rail" @click=${this.toggle}>
          <slot name="rail"></slot>
        </div>
        <div class="sidebar-content">
          <slot></slot>
        </div>
      </aside>
    `;
  }
};
Cr = new WeakMap(), Mr = new WeakMap(), Er = new WeakMap(), Tr = new WeakMap(), rc.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text, #e8e8e8);
      background: var(--sidebar-bg, var(--surface-bg, #101010));
      border-right: 1px solid
        var(--sidebar-border, var(--border, rgba(255, 255, 255, 0.195)));
      transition: width 0.2s ease;
      overflow: hidden;
      flex-shrink: 0;
    }

    :host([position='right']) {
      border-right: none;
      border-left: 1px solid
        var(--sidebar-border, var(--border, rgba(255, 255, 255, 0.195)));
    }

    .sidebar {
      display: flex;
      width: var(--sidebar-w, var(--sidebar-expanded-w, 200px));
      min-width: var(--sidebar-min-w, 140px);
      max-width: var(--sidebar-max-w, 360px);
      height: 100%;
    }

    .sidebar-rail {
      width: var(--sidebar-rail-w, 56px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: var(--space-2, 0.5rem);
      border-right: 1px solid
        var(--sidebar-border, var(--border, rgba(255, 255, 255, 0.195)));
      cursor: pointer;
      flex-shrink: 0;
      overflow-y: auto;
    }

    .sidebar-rail::part(rail-item) {
      height: var(--sidebar-rail-w, 56px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-2, 0.5rem);
    }

    :host(:hover) .sidebar-content {
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        z-index: 100;
      }
    }
  `;
let Wt = rc;
ho([
  M({ type: Boolean, reflect: !0 })
], Wt.prototype, "expanded");
ho([
  M({ type: String, reflect: !0 })
], Wt.prototype, "position");
ho([
  M({ type: Number })
], Wt.prototype, "width");
ho([
  M({ type: Boolean, reflect: !0 })
], Wt.prototype, "rail");
customElements.define("trellis-sidebar", Wt);
var mm = Object.defineProperty, gm = Object.getOwnPropertyDescriptor, pu = (n) => {
  throw TypeError(n);
}, fo = (n, e, t, r) => {
  for (var s = gm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && mm(e, t, s), s;
}, mu = (n, e, t) => e.has(n) || pu("Cannot " + t), Ur = (n, e, t) => (mu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Kr = (n, e, t) => e.has(n) ? pu("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Jr = (n, e, t, r) => (mu(n, e, "write to private field"), e.set(n, t), t), Vs, Ws, js, qs;
const sc = class sc extends ce {
  constructor() {
    super(...arguments), Kr(this, Vs, ""), Kr(this, Ws, !0), Kr(this, js, "list"), Kr(this, qs, 50), this._chips = [];
  }
  get query() {
    return Ur(this, Vs);
  }
  set query(e) {
    Jr(this, Vs, e);
  }
  get expanded() {
    return Ur(this, Ws);
  }
  set expanded(e) {
    Jr(this, Ws, e);
  }
  get view() {
    return Ur(this, js);
  }
  set view(e) {
    Jr(this, js, e);
  }
  get maxResults() {
    return Ur(this, qs);
  }
  set maxResults(e) {
    Jr(this, qs, e);
  }
  connectedCallback() {
    super.connectedCallback();
  }
  updated(e) {
    if (e.has("query")) {
      const t = this.query.trim();
      t && !this._chips.includes(t) && (this._chips = [...this._chips, t]);
    }
  }
  _handleSearchInput(e) {
    const t = e.target, r = t.value.trim();
    r && !this._chips.includes(r) && (this._chips = [...this._chips, r], this.query = this._chips.join(" ")), t.value = "";
  }
  _removeChip(e) {
    this._chips = this._chips.filter((t) => t !== e), this.query = this._chips.join(" ");
  }
  _clearAll() {
    this._chips = [], this.query = "";
  }
  _toggleView() {
    this.view = this.view === "list" ? "grid" : "list";
  }
  _toggleExpanded() {
    this.expanded = !this.expanded;
  }
  render() {
    return x`
      <div class="query-container">
        <div class="query-search" role="search">
          <input
            class="query-input"
            type="search"
            placeholder="Search entities, milestones, branches..."
            aria-label="Search"
            @input=${this._handleSearchInput}
          />
          <div
            class="query-chips"
            role="list"
            aria-label="Active search filters"
          >
            ${this._chips.map(
      (e) => x`
                <span class="query-chip" role="listitem">
                  ${e}
                  <button
                    class="query-chip-remove"
                    aria-label="Remove filter: ${e}"
                    @click=${() => this._removeChip(e)}
                  >
                    ×
                  </button>
                </span>
              `
    )}
          </div>
          <div class="query-actions">
            <button
              class="query-view-toggle"
              aria-label="Toggle view mode"
              @click=${this._toggleView}
            >
              ${this.view === "list" ? "Grid" : "List"}
            </button>
            ${this._chips.length > 0 ? x`
                  <button
                    class="query-clear"
                    aria-label="Clear all filters"
                    @click=${this._clearAll}
                  >
                    Clear all
                  </button>
                ` : x``}
          </div>
        </div>

        ${this.expanded ? x`
              <div class="query-body">
                <div class="query-sidebar">
                  <slot name="facets"></slot>
                </div>
                <div class="query-results" aria-live="polite">
                  <slot name="results"></slot>
                </div>
              </div>
            ` : x``}
      </div>
    `;
  }
};
sc.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text);
      background: var(--surface-bg);
    }

    .query-container {
      display: flex;
      flex-direction: column;
      border: 1px solid
        var(--search-border, var(--border, rgba(255, 255, 255, 0.195)));
      border-radius: var(--radius-md, 8px);
      background: var(--search-bg, var(--surface-raised));
      overflow: hidden;
    }

    .query-search {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.195));
    }

    .query-input {
      flex: 1;
      min-width: 200px;
      height: 40px;
      padding: 0 var(--space-3, 0.75rem);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      border-radius: var(--radius-sm, 4px);
      background: var(--surface-bg);
      color: var(--text);
      font-size: var(--font-size-base, 1rem);
      font-family: inherit;
      outline: none;
    }

    .query-input:focus {
      border-color: var(--border-focus, var(--text-interactive));
    }

    .query-input::placeholder {
      color: var(--text-tertiary);
    }

    .query-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1, 0.25rem);
      flex: 1;
      min-width: 100px;
    }

    .query-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      background: var(--surface-inset, rgba(255, 255, 255, 0.06));
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .query-chip-remove {
      background: none;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: var(--font-size-base, 1rem);
      padding: 0;
      line-height: 1;
      min-width: 16px;
    }

    .query-chip-remove:hover {
      color: var(--text);
    }

    .query-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
    }

    .query-view-toggle {
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      background: var(--toolbar-track);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      border-radius: var(--radius-sm, 4px);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: var(--font-size-xs, 0.75rem);
      font-family: inherit;
    }

    .query-view-toggle:hover {
      background: var(--toolbar-active);
      color: var(--text-interactive);
    }

    .query-clear {
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      background: none;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      border-radius: var(--radius-sm, 4px);
      color: var(--text-tertiary);
      cursor: pointer;
      font-size: var(--font-size-xs, 0.75rem);
      font-family: inherit;
    }

    .query-clear:hover {
      color: var(--text);
      border-color: var(--text-interactive);
    }

    .query-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .query-sidebar {
      width: var(--sidebar-w, var(--sidebar-expanded-w, 200px));
      min-width: var(--sidebar-min-w, 140px);
      max-width: var(--sidebar-max-w, 360px);
      border-right: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      overflow-y: auto;
      padding: var(--space-3, 0.75rem);
      flex-shrink: 0;
    }

    .query-results {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3, 0.75rem);
    }

    @media (max-width: 768px) {
      .query-body {
        flex-direction: column;
      }

      .query-sidebar {
        width: 100%;
        max-width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      }
    }
  `;
let jt = sc;
Vs = /* @__PURE__ */ new WeakMap();
Ws = /* @__PURE__ */ new WeakMap();
js = /* @__PURE__ */ new WeakMap();
qs = /* @__PURE__ */ new WeakMap();
fo([
  M({ type: String, reflect: !0 })
], jt.prototype, "query");
fo([
  M({ type: Boolean, reflect: !0 })
], jt.prototype, "expanded");
fo([
  M({ type: String, reflect: !0 })
], jt.prototype, "view");
fo([
  M({ type: Number })
], jt.prototype, "maxResults");
customElements.define("trellis-query-builder", jt);
var ym = Object.defineProperty, bm = Object.getOwnPropertyDescriptor, gu = (n) => {
  throw TypeError(n);
}, po = (n, e, t, r) => {
  for (var s = bm(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && ym(e, t, s), s;
}, yu = (n, e, t) => e.has(n) || gu("Cannot " + t), Gr = (n, e, t) => (yu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Yr = (n, e, t) => e.has(n) ? gu("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Xr = (n, e, t, r) => (yu(n, e, "write to private field"), e.set(n, t), t), Us, Ks, Js, Gs;
const ic = class ic extends ce {
  constructor() {
    super(...arguments), Yr(this, Us, !1), Yr(this, Ks, []), Yr(this, Js, "Search commands…"), Yr(this, Gs, "Command palette"), this._core = null, this._unsub = null, this._onDocumentKeyDown = (e) => this._handleDocumentKeyDown(e);
  }
  get open() {
    return Gr(this, Us);
  }
  set open(e) {
    Xr(this, Us, e);
  }
  get items() {
    return Gr(this, Ks);
  }
  set items(e) {
    Xr(this, Ks, e);
  }
  get placeholder() {
    return Gr(this, Js);
  }
  set placeholder(e) {
    Xr(this, Js, e);
  }
  get ariaLabel() {
    return Gr(this, Gs);
  }
  set ariaLabel(e) {
    Xr(this, Gs, e);
  }
  get core() {
    return this._core;
  }
  connectedCallback() {
    super.connectedCallback(), this._mountCore();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._unmountCore();
  }
  updated(e) {
    this._core && (e.has("items") && this._core.actions.setItems(this.items), e.has("open") && (this._syncOpenToCore(), this._syncDocumentListener(), this.open && this.updateComplete.then(() => {
      var t, r;
      (r = (t = this.shadowRoot) == null ? void 0 : t.querySelector(".palette-input")) == null || r.focus();
    })));
  }
  show() {
    var e;
    (e = this._core) == null || e.actions.open();
  }
  hide() {
    var e;
    (e = this._core) == null || e.actions.close();
  }
  toggle() {
    var e;
    (e = this._core) == null || e.actions.toggle();
  }
  _mountCore() {
    this._core = Pp({
      items: this.items,
      onSelect: (e) => {
        this.dispatchEvent(
          new CustomEvent("trellis-palette-select", {
            bubbles: !0,
            composed: !0,
            detail: { item: e }
          })
        );
      }
    }), this._unsub = this._core.subscribe(() => {
      const e = this._core.state.open;
      e !== this.open && (this.open = e), this.requestUpdate();
    }), this.open && this._core.actions.open(), this._syncDocumentListener();
  }
  _unmountCore() {
    var e;
    document.removeEventListener("keydown", this._onDocumentKeyDown), (e = this._unsub) == null || e.call(this), this._unsub = null, this._core = null;
  }
  _syncOpenToCore() {
    this._core && (this.open && !this._core.state.open ? this._core.actions.open() : !this.open && this._core.state.open && this._core.actions.close());
  }
  _syncDocumentListener() {
    document.removeEventListener("keydown", this._onDocumentKeyDown), this.open && document.addEventListener("keydown", this._onDocumentKeyDown);
  }
  _handleDocumentKeyDown(e) {
    var t;
    if ((t = this._core) != null && t.state.open)
      switch (e.key) {
        case "Escape":
          e.preventDefault(), this._core.actions.close();
          break;
        case "ArrowDown":
          e.preventDefault(), this._core.actions.moveSelection(1);
          break;
        case "ArrowUp":
          e.preventDefault(), this._core.actions.moveSelection(-1);
          break;
        case "Enter":
          e.preventDefault(), this._core.actions.select();
          break;
      }
  }
  _handleQueryInput(e) {
    var r;
    const t = e.target.value;
    (r = this._core) == null || r.actions.setQuery(t);
  }
  _handleBackdropClick(e) {
    var t;
    e.target === e.currentTarget && ((t = this._core) == null || t.actions.close());
  }
  _handleItemClick(e) {
    var t, r;
    (t = this._core) == null || t.actions.setSelectedIndex(e), (r = this._core) == null || r.actions.select();
  }
  _handleItemMouseEnter(e) {
    var t;
    (t = this._core) == null || t.actions.setSelectedIndex(e);
  }
  _resultIndex(e) {
    var t;
    return ((t = this._core) == null ? void 0 : t.state.results.indexOf(e)) ?? -1;
  }
  render() {
    const e = this._core;
    if (!e || !e.state.open)
      return ln;
    const { state: t } = e, r = t.results.length > 0 ? `trellis-palette-option-${t.selectedIndex}` : void 0;
    return x`
      <div
        class="palette-backdrop"
        @click=${this._handleBackdropClick}
      >
        <div
          class="palette"
          role="dialog"
          aria-modal="true"
          aria-label=${this.ariaLabel}
          @click=${(s) => s.stopPropagation()}
        >
          <div class="palette-search" role="search">
            <input
              class="palette-input"
              type="search"
              .value=${t.query}
              placeholder=${this.placeholder}
              aria-controls="trellis-palette-listbox"
              aria-activedescendant=${r ?? ln}
              @input=${this._handleQueryInput}
            />
          </div>

          <div
            id="trellis-palette-listbox"
            class="palette-body"
            role="listbox"
            aria-label="Command results"
            aria-busy=${t.loading ? "true" : "false"}
          >
            ${t.loading ? x`<p class="palette-message" role="status">Loading…</p>` : t.empty ? x`<p class="palette-message" role="status">No results</p>` : t.groups.map(
      (s) => x`
                      <div class="palette-group">
                        <div class="palette-group-label">${s.title}</div>
                        ${s.items.map((i) => {
        const o = this._resultIndex(i), a = o === t.selectedIndex;
        return x`
                            <button
                              id=${o >= 0 ? `trellis-palette-option-${o}` : ln}
                              class="palette-item"
                              role="option"
                              aria-selected=${a ? "true" : "false"}
                              ?disabled=${i.disabled}
                              @click=${() => this._handleItemClick(o)}
                              @mouseenter=${() => this._handleItemMouseEnter(o)}
                            >
                              <span class="palette-item-label">${i.label}</span>
                              ${i.description ? x`<span class="palette-item-description">${i.description}</span>` : ln}
                            </button>
                          `;
      })}
                      </div>
                    `
    )}
          </div>
        </div>
      </div>
    `;
  }
};
ic.styles = ve`
    :host {
      display: contents;
    }

    .palette-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--palette-z, 1000);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 12vh var(--space-4, 1rem) var(--space-4, 1rem);
      background: var(--overlay-bg, rgba(0, 0, 0, 0.55));
    }

    .palette {
      width: min(100%, 560px);
      max-height: min(70vh, 520px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--surface-raised);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.195));
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 16px 48px rgba(0, 0, 0, 0.45));
    }

    .palette-search {
      padding: var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.195));
    }

    .palette-input {
      width: 100%;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      background: var(--search-bg, var(--surface-inset));
      border: 1px solid var(--search-border, var(--border, rgba(255, 255, 255, 0.195)));
      border-radius: var(--radius-md, 8px);
      color: var(--text);
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      font-size: var(--font-size-sm, 0.875rem);
      outline: none;
    }

    .palette-input:focus-visible {
      border-color: var(--border-focus, var(--color-blue-500));
      box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-blue-500) 35%, transparent);
    }

    .palette-body {
      overflow: auto;
      padding: var(--space-2, 0.5rem);
    }

    .palette-message {
      margin: var(--space-4, 1rem);
      color: var(--text-tertiary);
      font-size: var(--font-size-sm, 0.875rem);
      text-align: center;
    }

    .palette-group-label {
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem) var(--space-1, 0.25rem);
      color: var(--text-tertiary);
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .palette-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border: 1px solid transparent;
      border-radius: var(--radius-md, 8px);
      background: transparent;
      color: var(--text);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .palette-item[aria-selected='true'] {
      background: var(--sidebar-item-active, rgba(157, 190, 254, 0.12));
      border-color: var(--border-focus, var(--color-blue-500));
    }

    .palette-item:hover:not(:disabled) {
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
    }

    .palette-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .palette-item-label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
    }

    .palette-item-description {
      color: var(--text-tertiary);
      font-size: var(--font-size-xs, 0.75rem);
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .palette-input {
        transition: none;
      }
    }
  `;
let qt = ic;
Us = /* @__PURE__ */ new WeakMap();
Ks = /* @__PURE__ */ new WeakMap();
Js = /* @__PURE__ */ new WeakMap();
Gs = /* @__PURE__ */ new WeakMap();
po([
  M({ type: Boolean, reflect: !0 })
], qt.prototype, "open");
po([
  M({ type: Array })
], qt.prototype, "items");
po([
  M({ type: String, reflect: !0 })
], qt.prototype, "placeholder");
po([
  M({ type: String, reflect: !0, attribute: "aria-label" })
], qt.prototype, "ariaLabel");
customElements.define("trellis-palette", qt);
const vm = {
  "entity-issue": "tabler:git-issue",
  "entity-lane": "tabler:git-branch",
  "entity-project": "tabler:folder",
  "entity-person": "tabler:user",
  "entity-note": "tabler:file-text",
  "entity-doc": "tabler:file",
  "action-create": "tabler:plus",
  "action-edit": "tabler:pencil",
  "action-delete": "tabler:trash",
  "action-duplicate": "tabler:copy",
  "action-move": "tabler:arrow-right",
  "status-todo": "tabler:circle",
  "status-in-progress": "tabler:loader",
  "status-done": "tabler:circle-check",
  "status-blocked": "tabler:octagon-x",
  "status-cancelled": "tabler:ban",
  "core-chevron-down": "tabler:chevron-down",
  "core-menu": "tabler:menu-2",
  "core-close": "tabler:x",
  "core-search": "tabler:search",
  "core-plus": "tabler:plus"
};
function q(n, e) {
  return { default: n, packs: { tabler: vm[e] } };
}
const cn = {
  "entity-issue": q("lucide:git-issue", "entity-issue"),
  "entity-lane": q("lucide:git-branch", "entity-lane"),
  "entity-project": q("lucide:folder-kanban", "entity-project"),
  "entity-person": q("lucide:user", "entity-person"),
  "entity-note": q("lucide:file-text", "entity-note"),
  "entity-doc": q("lucide:file", "entity-doc"),
  "action-create": q("lucide:plus", "action-create"),
  "action-edit": q("lucide:pencil", "action-edit"),
  "action-delete": q("lucide:trash-2", "action-delete"),
  "action-duplicate": q("lucide:copy", "action-duplicate"),
  "action-move": q("lucide:arrow-right", "action-move"),
  "status-todo": q("lucide:circle", "status-todo"),
  "status-in-progress": q("lucide:loader-circle", "status-in-progress"),
  "status-done": q("lucide:check-circle-2", "status-done"),
  "status-blocked": q("lucide:octagon-x", "status-blocked"),
  "status-cancelled": q("lucide:ban", "status-cancelled"),
  "core-chevron-down": q("lucide:chevron-down", "core-chevron-down"),
  "core-menu": q("lucide:menu", "core-menu"),
  "core-close": q("lucide:x", "core-close"),
  "core-search": q("lucide:search", "core-search"),
  "core-plus": q("lucide:plus", "core-plus")
}, km = new RegExp("\\p{Extended_Pictographic}", "u"), bu = /^https?:\/\//i, xm = /^[a-z0-9-]+:[a-z0-9-]+$/i;
function wm(n) {
  return km.test(n);
}
function Sm(n) {
  return bu.test(n);
}
function Cm(n) {
  return xm.test(n) && !bu.test(n);
}
function Mm(n) {
  return n in cn;
}
function vc(n) {
  return wm(n) ? "emoji" : Sm(n) ? "image" : Cm(n) ? "iconify" : Mm(n) ? "alias" : "bare";
}
const kc = "lucide";
class Em {
  constructor() {
    this.icons = /* @__PURE__ */ new Map(), this.aliases = /* @__PURE__ */ new Map();
  }
  // ---- legacy bundled glyphs -------------------------------------------
  get(e) {
    return this.icons.get(e);
  }
  findByTag(e) {
    return Array.from(this.icons.values()).filter((t) => t.tags.includes(e));
  }
  findByCategory(e) {
    return Array.from(this.icons.values()).filter(
      (t) => t.category === e
    );
  }
  search(e) {
    const t = e.toLowerCase();
    return Array.from(this.icons.values()).filter(
      (r) => r.name.includes(t) || r.tags.some((s) => s.includes(t))
    );
  }
  /** Register bundled glyphs (legacy icon packs). */
  register(e) {
    for (const t of e)
      this.icons.set(t.name, t);
  }
  // ---- semantic aliases -------------------------------------------------
  /** Register alias entries; later registers override per-name. */
  registerAliases(e) {
    for (const [t, r] of Object.entries(e))
      this.aliases.set(t, r);
  }
  hasAlias(e) {
    return this.aliases.has(e) || e in cn;
  }
  findByKind(e) {
    const t = e, r = Array.from(this.icons.values()).filter(
      (i) => i.category === t || i.name.startsWith(`${e}-`)
    );
    if (r.length) return r;
    const s = `${e}-`;
    return Array.from(this.aliases.keys()).filter((i) => i.startsWith(s)).map((i) => this.iconForAlias(i)).filter((i) => i !== void 0);
  }
  // ---- detection + resolution -------------------------------------------
  detect(e) {
    return vc(e);
  }
  /** Resolve a `name` to a concrete `set:icon` ref for a pack. */
  resolve(e, t) {
    var i;
    const r = t ?? kc, s = vc(e);
    if (s === "iconify") return e;
    if (s === "alias") {
      const o = this.aliases.get(e) ?? cn[e];
      return o ? ((i = o.packs) == null ? void 0 : i[r]) ?? o.default : void 0;
    }
    if (s === "bare") return `${r}:${e}`;
  }
  /** Resolve the active icon pack from a DOM element's theme context. */
  activePack(e) {
    if (e) {
      const s = getComputedStyle(e).getPropertyValue("--icon-pack").trim();
      if (s) return s;
    }
    const t = document.documentElement;
    return getComputedStyle(t).getPropertyValue("--icon-pack").trim() || kc;
  }
  /**
   * Render a resolved `set:icon` ref (or bare name) to SVG markup.
   * Local-first: bundled glyph → `@iconify-json/<set>` dynamic import →
   * `undefined` (caller shows the fallback glyph).
   */
  async iconify(e, t) {
    const [r, s] = e.split(":");
    if (!(!r || !s))
      return e in this._bundledSvgs() ? this._bundledSvgs()[e] : Tm(r, s);
  }
  // ---- internals ---------------------------------------------------------
  _bundledSvgs() {
    const e = {};
    for (const [t, r] of [...this.aliases, ...Object.entries(cn)]) {
      const s = this.icons.get(t);
      if (s)
        for (const i of /* @__PURE__ */ new Set([r.default, ...Object.values(r.packs ?? {})]))
          i && !(i in e) && (e[i] = s.svg);
    }
    return e;
  }
  iconForAlias(e) {
    const t = this.aliases.get(e) ?? cn[e], r = this.icons.get(e);
    if (!(!t || !r))
      return {
        ...r,
        tags: [...r.tags, t.default]
      };
  }
}
async function Tm(n, e) {
  var t;
  try {
    const s = (await import(
      /* @vite-ignore */
      `@iconify-json/${n}/icons.json`
    )).default, i = (t = s == null ? void 0 : s.icons) == null ? void 0 : t[e];
    return i != null && i.body ? `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g>${i.body}</g></svg>` : void 0;
  } catch {
    return;
  }
}
const Be = new Em();
Be.registerAliases(cn);
Be.register([
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
Be.register([
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
Be.register([
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
Be.register([
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
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const qn = globalThis, xc = (n) => n, bi = qn.trustedTypes, wc = bi ? bi.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, vu = "$lit$", ct = `lit$${Math.random().toFixed(9).slice(2)}$`, ku = "?" + ct, Am = `<${ku}>`, Ut = document, vi = () => Ut.createComment(""), or = (n) => n === null || typeof n != "object" && typeof n != "function", ll = Array.isArray, _m = (n) => ll(n) || typeof (n == null ? void 0 : n[Symbol.iterator]) == "function", Vo = `[ 	
\f\r]`, On = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Sc = /-->/g, Cc = />/g, At = RegExp(`>|${Vo}(?:([^\\s"'>=/]+)(${Vo}*=${Vo}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Mc = /'/g, Ec = /"/g, xu = /^(?:script|style|textarea|title)$/i, Te = Symbol.for("lit-noChange"), U = Symbol.for("lit-nothing"), Tc = /* @__PURE__ */ new WeakMap(), Nt = Ut.createTreeWalker(Ut, 129);
function wu(n, e) {
  if (!ll(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return wc !== void 0 ? wc.createHTML(e) : e;
}
const Om = (n, e) => {
  const t = n.length - 1, r = [];
  let s, i = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", o = On;
  for (let a = 0; a < t; a++) {
    const l = n[a];
    let c, d, u = -1, h = 0;
    for (; h < l.length && (o.lastIndex = h, d = o.exec(l), d !== null); ) h = o.lastIndex, o === On ? d[1] === "!--" ? o = Sc : d[1] !== void 0 ? o = Cc : d[2] !== void 0 ? (xu.test(d[2]) && (s = RegExp("</" + d[2], "g")), o = At) : d[3] !== void 0 && (o = At) : o === At ? d[0] === ">" ? (o = s ?? On, u = -1) : d[1] === void 0 ? u = -2 : (u = o.lastIndex - d[2].length, c = d[1], o = d[3] === void 0 ? At : d[3] === '"' ? Ec : Mc) : o === Ec || o === Mc ? o = At : o === Sc || o === Cc ? o = On : (o = At, s = void 0);
    const f = o === At && n[a + 1].startsWith("/>") ? " " : "";
    i += o === On ? l + Am : u >= 0 ? (r.push(c), l.slice(0, u) + vu + l.slice(u) + ct + f) : l + ct + (u === -2 ? a : f);
  }
  return [wu(n, i + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), r];
};
class ar {
  constructor({ strings: e, _$litType$: t }, r) {
    let s;
    this.parts = [];
    let i = 0, o = 0;
    const a = e.length - 1, l = this.parts, [c, d] = Om(e, t);
    if (this.el = ar.createElement(c, r), Nt.currentNode = this.el.content, t === 2 || t === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (s = Nt.nextNode()) !== null && l.length < a; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const u of s.getAttributeNames()) if (u.endsWith(vu)) {
          const h = d[o++], f = s.getAttribute(u).split(ct), p = /([.?@])?(.*)/.exec(h);
          l.push({ type: 1, index: i, name: p[2], strings: f, ctor: p[1] === "." ? $m : p[1] === "?" ? Im : p[1] === "@" ? Dm : mo }), s.removeAttribute(u);
        } else u.startsWith(ct) && (l.push({ type: 6, index: i }), s.removeAttribute(u));
        if (xu.test(s.tagName)) {
          const u = s.textContent.split(ct), h = u.length - 1;
          if (h > 0) {
            s.textContent = bi ? bi.emptyScript : "";
            for (let f = 0; f < h; f++) s.append(u[f], vi()), Nt.nextNode(), l.push({ type: 2, index: ++i });
            s.append(u[h], vi());
          }
        }
      } else if (s.nodeType === 8) if (s.data === ku) l.push({ type: 2, index: i });
      else {
        let u = -1;
        for (; (u = s.data.indexOf(ct, u + 1)) !== -1; ) l.push({ type: 7, index: i }), u += ct.length - 1;
      }
      i++;
    }
  }
  static createElement(e, t) {
    const r = Ut.createElement("template");
    return r.innerHTML = e, r;
  }
}
function hn(n, e, t = n, r) {
  var o, a;
  if (e === Te) return e;
  let s = r !== void 0 ? (o = t._$Co) == null ? void 0 : o[r] : t._$Cl;
  const i = or(e) ? void 0 : e._$litDirective$;
  return (s == null ? void 0 : s.constructor) !== i && ((a = s == null ? void 0 : s._$AO) == null || a.call(s, !1), i === void 0 ? s = void 0 : (s = new i(n), s._$AT(n, t, r)), r !== void 0 ? (t._$Co ?? (t._$Co = []))[r] = s : t._$Cl = s), s !== void 0 && (e = hn(n, s._$AS(n, e.values), s, r)), e;
}
class Nm {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: r } = this._$AD, s = ((e == null ? void 0 : e.creationScope) ?? Ut).importNode(t, !0);
    Nt.currentNode = s;
    let i = Nt.nextNode(), o = 0, a = 0, l = r[0];
    for (; l !== void 0; ) {
      if (o === l.index) {
        let c;
        l.type === 2 ? c = new Lr(i, i.nextSibling, this, e) : l.type === 1 ? c = new l.ctor(i, l.name, l.strings, this, e) : l.type === 6 && (c = new Pm(i, this, e)), this._$AV.push(c), l = r[++a];
      }
      o !== (l == null ? void 0 : l.index) && (i = Nt.nextNode(), o++);
    }
    return Nt.currentNode = Ut, s;
  }
  p(e) {
    let t = 0;
    for (const r of this._$AV) r !== void 0 && (r.strings !== void 0 ? (r._$AI(e, r, t), t += r.strings.length - 2) : r._$AI(e[t])), t++;
  }
}
class Lr {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, r, s) {
    this.type = 2, this._$AH = U, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = r, this.options = s, this._$Cv = (s == null ? void 0 : s.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = hn(this, e, t), or(e) ? e === U || e == null || e === "" ? (this._$AH !== U && this._$AR(), this._$AH = U) : e !== this._$AH && e !== Te && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : _m(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== U && or(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Ut.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var i;
    const { values: t, _$litType$: r } = e, s = typeof r == "number" ? this._$AC(e) : (r.el === void 0 && (r.el = ar.createElement(wu(r.h, r.h[0]), this.options)), r);
    if (((i = this._$AH) == null ? void 0 : i._$AD) === s) this._$AH.p(t);
    else {
      const o = new Nm(s, this), a = o.u(this.options);
      o.p(t), this.T(a), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = Tc.get(e.strings);
    return t === void 0 && Tc.set(e.strings, t = new ar(e)), t;
  }
  k(e) {
    ll(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let r, s = 0;
    for (const i of e) s === t.length ? t.push(r = new Lr(this.O(vi()), this.O(vi()), this, this.options)) : r = t[s], r._$AI(i), s++;
    s < t.length && (this._$AR(r && r._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var r;
    for ((r = this._$AP) == null ? void 0 : r.call(this, !1, !0, t); e !== this._$AB; ) {
      const s = xc(e).nextSibling;
      xc(e).remove(), e = s;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class mo {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, r, s, i) {
    this.type = 1, this._$AH = U, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = i, r.length > 2 || r[0] !== "" || r[1] !== "" ? (this._$AH = Array(r.length - 1).fill(new String()), this.strings = r) : this._$AH = U;
  }
  _$AI(e, t = this, r, s) {
    const i = this.strings;
    let o = !1;
    if (i === void 0) e = hn(this, e, t, 0), o = !or(e) || e !== this._$AH && e !== Te, o && (this._$AH = e);
    else {
      const a = e;
      let l, c;
      for (e = i[0], l = 0; l < i.length - 1; l++) c = hn(this, a[r + l], t, l), c === Te && (c = this._$AH[l]), o || (o = !or(c) || c !== this._$AH[l]), c === U ? e = U : e !== U && (e += (c ?? "") + i[l + 1]), this._$AH[l] = c;
    }
    o && !s && this.j(e);
  }
  j(e) {
    e === U ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class $m extends mo {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === U ? void 0 : e;
  }
}
class Im extends mo {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== U);
  }
}
class Dm extends mo {
  constructor(e, t, r, s, i) {
    super(e, t, r, s, i), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = hn(this, e, t, 0) ?? U) === Te) return;
    const r = this._$AH, s = e === U && r !== U || e.capture !== r.capture || e.once !== r.once || e.passive !== r.passive, i = e !== U && (r === U || s);
    s && this.element.removeEventListener(this.name, this, r), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Pm {
  constructor(e, t, r) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = r;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    hn(this, e);
  }
}
const Rm = { I: Lr }, Wo = qn.litHtmlPolyfillSupport;
Wo == null || Wo(ar, Lr), (qn.litHtmlVersions ?? (qn.litHtmlVersions = [])).push("3.3.3");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Xe = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4 }, go = (n) => (...e) => ({ _$litDirective$: n, values: e });
let yo = class {
  constructor(e) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(e, t, r) {
    this._$Ct = e, this._$AM = t, this._$Ci = r;
  }
  _$AS(e, t) {
    return this.update(e, t);
  }
  update(e, t) {
    return this.render(...t);
  }
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
let Ca = class extends yo {
  constructor(e) {
    if (super(e), this.it = U, e.type !== Xe.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(e) {
    if (e === U || e == null) return this._t = void 0, this.it = e;
    if (e === Te) return e;
    if (typeof e != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (e === this.it) return this._t;
    this.it = e;
    const t = [e];
    return t.raw = t, this._t = { _$litType$: this.constructor.resultType, strings: t, values: [] };
  }
};
Ca.directiveName = "unsafeHTML", Ca.resultType = 1;
const Lm = go(Ca);
var zm = Object.defineProperty, Bm = Object.getOwnPropertyDescriptor, Su = (n) => {
  throw TypeError(n);
}, bo = (n, e, t, r) => {
  for (var s = r > 1 ? void 0 : r ? Bm(e, t) : e, i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = (r ? o(e, t, s) : o(s)) || s);
  return r && s && zm(e, t, s), s;
}, Cu = (n, e, t) => e.has(n) || Su("Cannot " + t), jo = (n, e, t) => (Cu(n, e, "read from private field"), t ? t.call(n) : e.get(n)), qo = (n, e, t) => e.has(n) ? Su("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Uo = (n, e, t, r) => (Cu(n, e, "write to private field"), e.set(n, t), t), Ys, Xs, Qs;
const Ac = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32
};
let lr = class extends ce {
  constructor() {
    super(...arguments), qo(this, Ys, ""), qo(this, Xs, "md"), qo(this, Qs), this._svgName = "", this._svgPack = "";
  }
  get name() {
    return jo(this, Ys);
  }
  set name(n) {
    Uo(this, Ys, n);
  }
  get size() {
    return jo(this, Xs);
  }
  set size(n) {
    Uo(this, Xs, n);
  }
  get color() {
    return jo(this, Qs);
  }
  set color(n) {
    Uo(this, Qs, n);
  }
  willUpdate(n) {
    n.has("name") && this._invalidateSvg();
  }
  updated(n) {
    (n.has("name") || this._packChanged()) && this._resolveSvg();
  }
  connectedCallback() {
    super.connectedCallback(), this._resolveSvg(), this._observeThemeChanges();
  }
  disconnectedCallback() {
    var n;
    (n = this._themeObserver) == null || n.disconnect(), this._themeObserver = void 0, super.disconnectedCallback();
  }
  /** True when the computed --icon-pack differs from the resolved one. */
  _packChanged() {
    return Be.activePack(this) !== this._svgPack;
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
    const n = this.size;
    if (typeof n == "number") return n;
    const e = Ac[n];
    if (e) return e;
    const t = Number.parseFloat(n);
    return Number.isFinite(t) ? t : Ac.md;
  }
  _resolveSvg() {
    const n = this.name || "", e = Be.activePack(this);
    if (!n || n === this._svgName && e === this._svgPack) return;
    this._svgName = n, this._svgPack = e;
    const t = Be.resolve(n, e);
    t && Be.iconify(t, e).then((r) => {
      n !== this._svgName || e !== this._svgPack || (this._svg = r, this.requestUpdate());
    });
  }
  render() {
    const n = this.name || "", e = Be.detect(n), t = this._sizePx(), r = `width:${t}px;height:${t}px;color:${this.color || "currentColor"};display:inline-flex;align-items:center;justify-content:center`;
    return e === "emoji" ? x`<span
        part="icon"
        style="${r};font-size:${Math.round(t * 0.8)}px;line-height:1"
        role="img"
        aria-label=${n}
        >${n}</span
      >` : e === "image" ? x`<img
        part="icon"
        src=${n}
        alt=""
        style="${r};object-fit:contain"
        aria-hidden="true"
      />` : this._svg ? x`<span
        part="icon"
        style="${r}"
        role="img"
        aria-label=${n}
        >${Lm(this._svg)}</span
      >` : x`<span
      part="icon"
      style="${r};border-radius:4px;background:currentColor;opacity:0.35"
      role="img"
      aria-label=${n}
    ></span>`;
  }
};
Ys = /* @__PURE__ */ new WeakMap();
Xs = /* @__PURE__ */ new WeakMap();
Qs = /* @__PURE__ */ new WeakMap();
bo([
  M({ type: String })
], lr.prototype, "name", 1);
bo([
  M({ type: String })
], lr.prototype, "size", 1);
bo([
  M({ type: String })
], lr.prototype, "color", 1);
lr = bo([
  Rp("trellis-icon")
], lr);
function pt(n, e = "sm") {
  return x`<trellis-icon name=${n} size=${e} aria-hidden="true"></trellis-icon>`;
}
class Fm {
  async snapshotTree(e) {
    return this.snapshotRecursive(e);
  }
  snapshotRecursive(e) {
    const t = [], r = document.createTreeWalker(
      e,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (s) => {
          const i = s.tagName.toLowerCase();
          return i.startsWith("trellis-") || i === "trellis-query" || i === "trellis-palette" || i === "trellis-editor" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      }
    );
    for (; r.nextNode(); ) {
      const s = r.currentNode;
      t.push(this.toState(s));
    }
    return t;
  }
  toState(e) {
    if (!e.toState)
      return this.createEmptyState(e.tagName);
    try {
      const t = e.toState();
      if (this.isValidComponentState(t))
        return {
          ...t,
          tag: e.tagName.toLowerCase(),
          boundingBox: e.getBoundingClientRect()
        };
    } catch (t) {
      console.warn("Failed to execute toState:", t);
    }
    return this.createEmptyState(e.tagName);
  }
  createEmptyState(e) {
    return {
      tag: e.toLowerCase(),
      attributes: {},
      properties: {},
      slots: {},
      children: [],
      events: [],
      animations: []
    };
  }
  isValidComponentState(e) {
    return e && typeof e == "object" && "tag" in e;
  }
  diffTrees(e, t) {
    const r = [], s = new Map(e.map((o) => [o.tag, o])), i = new Map(t.map((o) => [o.tag, o]));
    return s.forEach((o, a) => {
      const l = i.get(a);
      if (!l)
        r.push({ type: "remove", path: [a] });
      else {
        const c = this.diffAttributes(o, l), d = this.diffProperties(o, l), u = this.diffSlots(o, l);
        (c.length > 0 || d.length > 0 || u.length > 0) && r.push({ type: "modify", element: l, path: [a], oldValue: o, newValue: l });
      }
      i.delete(a);
    }), i.forEach((o, a) => {
      r.push({ type: "add", element: o, path: [a] });
    }), r;
  }
  diffAttributes(e, t) {
    const r = Object.keys(e.attributes), s = Object.keys(t.attributes), i = s.filter((l) => !r.includes(l)), o = r.filter((l) => !s.includes(l)), a = s.filter((l) => e.attributes[l] !== t.attributes[l]);
    return [...i, ...o, ...a];
  }
  diffProperties(e, t) {
    return Object.keys(e.properties), Object.keys(t.properties).filter((s) => e.properties[s] !== t.properties[s]);
  }
  diffSlots(e, t) {
    const r = Object.keys(e.slots);
    Object.keys(t.slots);
    const s = [];
    return r.forEach((i) => {
      var l;
      const o = e.slots[i].length, a = ((l = t.slots[i]) == null ? void 0 : l.length) || 0;
      o !== a && s.push(`${i}: ${o} → ${a}`);
    }), s;
  }
}
const q1 = new Fm();
class Hm {
  toState() {
    const e = this;
    return {
      tag: e.tagName.toLowerCase(),
      attributes: this.getAttributes(e),
      properties: this.getProperties(e),
      slots: this.getSlots(e),
      children: [],
      events: this.getEvents(e),
      animations: this.collectAnimationStates(e),
      boundingBox: e.getBoundingClientRect()
    };
  }
  getAttributes(e) {
    const t = {};
    return Array.from(e.attributes).forEach((r) => {
      t[r.name] = r.value;
    }), t;
  }
  getProperties(e) {
    const t = {};
    if (e.hasAttribute("data-trellis-role") && (t.role = e.getAttribute("data-trellis-role")), e.hasAttribute("data-trellis-state") && (t.state = e.getAttribute("data-trellis-state")), e.hasAttribute("data-trellis-payload"))
      try {
        t.payload = JSON.parse(e.getAttribute("data-trellis-payload") || "{}");
      } catch {
        t.payload = e.getAttribute("data-trellis-payload");
      }
    return t;
  }
  getSlots(e) {
    const t = {};
    return e.shadowRoot && Array.from(e.shadowRoot.children).forEach((r) => {
      r.slot && (t[r.slot] || (t[r.slot] = []), t[r.slot].push({
        name: r.slot,
        assignedNodes: e.querySelectorAll(`[slot="${r.slot}"]`).length,
        assignedElements: Array.from(e.querySelectorAll(`[slot="${r.slot}"]`)).map((s) => s.tagName.toLowerCase())
      }));
    }), t;
  }
  getEvents(e) {
    const t = [], r = e.__eventListeners || {};
    return Object.keys(r).forEach((s) => {
      const i = r[s];
      Array.isArray(i) && t.push(...i.map((o) => o.type || s));
    }), t;
  }
  collectAnimationStates(e) {
    var r;
    const t = [];
    try {
      const s = ((r = e.getAnimations) == null ? void 0 : r.call(e)) || [];
      t.push(...s.map((i) => {
        var o, a, l;
        return {
          name: ((a = (o = i.effect) == null ? void 0 : o.constructor) == null ? void 0 : a.name) || "unknown",
          phase: this.mapAnimationPhase(i.playState),
          duration: ((l = i.effect) == null ? void 0 : l.duration) || 0,
          currentTime: i.currentTime || 0,
          timeline: i.timeline ? {
            id: i.timeline.id || "default",
            iterations: i.timeline.iterations || 1,
            playbackRate: i.timeline.playbackRate || 1,
            startTime: i.timeline.startTime || 0,
            endTime: i.timeline.endTime || 0
          } : void 0
        };
      }));
    } catch (s) {
      console.warn("Failed to get animations:", s);
    }
    return t;
  }
  mapAnimationPhase(e) {
    switch (e) {
      case "idle":
        return "idle";
      case "running":
        return "running";
      case "paused":
        return "paused";
      case "finished":
        return "finished";
      default:
        return "idle";
    }
  }
}
function U1(n) {
  return class extends n {
    toState() {
      return new Hm().toState.call(this);
    }
  };
}
function ne(n) {
  this.content = n;
}
ne.prototype = {
  constructor: ne,
  find: function(n) {
    for (var e = 0; e < this.content.length; e += 2)
      if (this.content[e] === n) return e;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(n) {
    var e = this.find(n);
    return e == -1 ? void 0 : this.content[e + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(n, e, t) {
    var r = t && t != n ? this.remove(t) : this, s = r.find(n), i = r.content.slice();
    return s == -1 ? i.push(t || n, e) : (i[s + 1] = e, t && (i[s] = t)), new ne(i);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(n) {
    var e = this.find(n);
    if (e == -1) return this;
    var t = this.content.slice();
    return t.splice(e, 2), new ne(t);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(n, e) {
    return new ne([n, e].concat(this.remove(n).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(n, e) {
    var t = this.remove(n).content.slice();
    return t.push(n, e), new ne(t);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(n, e, t) {
    var r = this.remove(e), s = r.content.slice(), i = r.find(n);
    return s.splice(i == -1 ? s.length : i, 0, e, t), new ne(s);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(n) {
    for (var e = 0; e < this.content.length; e += 2)
      n(this.content[e], this.content[e + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(n) {
    return n = ne.from(n), n.size ? new ne(n.content.concat(this.subtract(n).content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(n) {
    return n = ne.from(n), n.size ? new ne(this.subtract(n).content.concat(n.content)) : this;
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(n) {
    var e = this;
    n = ne.from(n);
    for (var t = 0; t < n.content.length; t += 2)
      e = e.remove(n.content[t]);
    return e;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var n = {};
    return this.forEach(function(e, t) {
      n[e] = t;
    }), n;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
ne.from = function(n) {
  if (n instanceof ne) return n;
  var e = [];
  if (n) for (var t in n) e.push(t, n[t]);
  return new ne(e);
};
function Mu(n, e, t) {
  for (let r = 0; ; r++) {
    if (r == n.childCount || r == e.childCount)
      return n.childCount == e.childCount ? null : t;
    let s = n.child(r), i = e.child(r);
    if (s == i) {
      t += s.nodeSize;
      continue;
    }
    if (!s.sameMarkup(i))
      return t;
    if (s.isText && s.text != i.text) {
      let o = s.text, a = i.text, l = 0;
      for (; o[l] == a[l]; l++)
        t++;
      return l && l < o.length && l < a.length && Au(o.charCodeAt(l - 1)) && Tu(o.charCodeAt(l)) && t--, t;
    }
    if (s.content.size || i.content.size) {
      let o = Mu(s.content, i.content, t + 1);
      if (o != null)
        return o;
    }
    t += s.nodeSize;
  }
}
function Eu(n, e, t, r) {
  for (let s = n.childCount, i = e.childCount; ; ) {
    if (s == 0 || i == 0)
      return s == i ? null : { a: t, b: r };
    let o = n.child(--s), a = e.child(--i), l = o.nodeSize;
    if (o == a) {
      t -= l, r -= l;
      continue;
    }
    if (!o.sameMarkup(a))
      return { a: t, b: r };
    if (o.isText && o.text != a.text) {
      let c = o.text, d = a.text, u = c.length, h = d.length;
      for (; u > 0 && h > 0 && c[u - 1] == d[h - 1]; )
        u--, h--, t--, r--;
      return u && h && u < c.length && Au(c.charCodeAt(u - 1)) && Tu(c.charCodeAt(u)) && (t++, r++), { a: t, b: r };
    }
    if (o.content.size || a.content.size) {
      let c = Eu(o.content, a.content, t - 1, r - 1);
      if (c)
        return c;
    }
    t -= l, r -= l;
  }
}
function Tu(n) {
  return n >= 56320 && n < 57344;
}
function Au(n) {
  return n >= 55296 && n < 56320;
}
class b {
  /**
  @internal
  */
  constructor(e, t) {
    if (this.content = e, this.size = t || 0, t == null)
      for (let r = 0; r < e.length; r++)
        this.size += e[r].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(e, t, r, s = 0, i) {
    for (let o = 0, a = 0; a < t; o++) {
      let l = this.content[o], c = a + l.nodeSize;
      if (c > e && r(l, s + a, i || null, o) !== !1 && l.content.size) {
        let d = a + 1;
        l.nodesBetween(Math.max(0, e - d), Math.min(l.content.size, t - d), r, s + d);
      }
      a = c;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(e) {
    this.nodesBetween(0, this.size, e);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(e, t, r, s) {
    let i = "", o = !0;
    return this.nodesBetween(e, t, (a, l) => {
      let c = a.isText ? a.text.slice(Math.max(e, l) - l, t - l) : a.isLeaf ? s ? typeof s == "function" ? s(a) : s : a.type.spec.leafText ? a.type.spec.leafText(a) : "" : "";
      a.isBlock && (a.isLeaf && c || a.isTextblock) && r && (o ? o = !1 : i += r), i += c;
    }, 0), i;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(e) {
    if (!e.size)
      return this;
    if (!this.size)
      return e;
    let t = this.lastChild, r = e.firstChild, s = this.content.slice(), i = 0;
    for (t.isText && t.sameMarkup(r) && (s[s.length - 1] = t.withText(t.text + r.text), i = 1); i < e.content.length; i++)
      s.push(e.content[i]);
    return new b(s, this.size + e.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(e, t = this.size) {
    if (e == 0 && t == this.size)
      return this;
    let r = [], s = 0;
    if (t > e)
      for (let i = 0, o = 0; o < t; i++) {
        let a = this.content[i], l = o + a.nodeSize;
        l > e && ((o < e || l > t) && (a.isText ? a = a.cut(Math.max(0, e - o), Math.min(a.text.length, t - o)) : a = a.cut(Math.max(0, e - o - 1), Math.min(a.content.size, t - o - 1))), r.push(a), s += a.nodeSize), o = l;
      }
    return new b(r, s);
  }
  /**
  @internal
  */
  cutByIndex(e, t) {
    return e == t ? b.empty : e == 0 && t == this.content.length ? this : new b(this.content.slice(e, t));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(e, t) {
    let r = this.content[e];
    if (r == t)
      return this;
    let s = this.content.slice(), i = this.size + t.nodeSize - r.nodeSize;
    return s[e] = t, new b(s, i);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(e) {
    return new b([e].concat(this.content), this.size + e.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(e) {
    return new b(this.content.concat(e), this.size + e.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(e) {
    if (this.content.length != e.content.length)
      return !1;
    for (let t = 0; t < this.content.length; t++)
      if (!this.content[t].eq(e.content[t]))
        return !1;
    return !0;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(e) {
    let t = this.content[e];
    if (!t)
      throw new RangeError("Index " + e + " out of range for " + this);
    return t;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content[e] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    for (let t = 0, r = 0; t < this.content.length; t++) {
      let s = this.content[t];
      e(s, r, t), r += s.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(e, t = 0) {
    return Mu(this, e, t);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(e, t = this.size, r = e.size) {
    return Eu(this, e, t, r);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(e) {
    if (e == 0)
      return Qr(0, e);
    if (e == this.size)
      return Qr(this.content.length, e);
    if (e > this.size || e < 0)
      throw new RangeError(`Position ${e} outside of fragment (${this})`);
    for (let t = 0, r = 0; ; t++) {
      let s = this.child(t), i = r + s.nodeSize;
      if (i >= e)
        return i == e ? Qr(t + 1, i) : Qr(t, r);
      r = i;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((e) => e.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      return b.empty;
    if (!Array.isArray(t))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return b.fromArray(t.map(e.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(e) {
    if (!e.length)
      return b.empty;
    let t, r = 0;
    for (let s = 0; s < e.length; s++) {
      let i = e[s];
      r += i.nodeSize, s && i.isText && e[s - 1].sameMarkup(i) ? (t || (t = e.slice(0, s)), t[t.length - 1] = i.withText(t[t.length - 1].text + i.text)) : t && t.push(i);
    }
    return new b(t || e, r);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(e) {
    if (!e)
      return b.empty;
    if (e instanceof b)
      return e;
    if (Array.isArray(e))
      return this.fromArray(e);
    if (e.attrs)
      return new b([e], e.nodeSize);
    throw new RangeError("Can not convert " + e + " to a Fragment" + (e.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
}
b.empty = new b([], 0);
const Ko = { index: 0, offset: 0 };
function Qr(n, e) {
  return Ko.index = n, Ko.offset = e, Ko;
}
function ki(n, e) {
  if (n === e)
    return !0;
  if (!(n && typeof n == "object") || !(e && typeof e == "object"))
    return !1;
  let t = Array.isArray(n);
  if (Array.isArray(e) != t)
    return !1;
  if (t) {
    if (n.length != e.length)
      return !1;
    for (let r = 0; r < n.length; r++)
      if (!ki(n[r], e[r]))
        return !1;
  } else {
    for (let r in n)
      if (!(r in e) || !ki(n[r], e[r]))
        return !1;
    for (let r in e)
      if (!(r in n))
        return !1;
  }
  return !0;
}
let L = class Ma {
  /**
  @internal
  */
  constructor(e, t) {
    this.type = e, this.attrs = t;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(e) {
    let t, r = !1;
    for (let s = 0; s < e.length; s++) {
      let i = e[s];
      if (this.eq(i))
        return e;
      if (this.type.excludes(i.type))
        t || (t = e.slice(0, s));
      else {
        if (i.type.excludes(this.type))
          return e;
        !r && i.type.rank > this.type.rank && (t || (t = e.slice(0, s)), t.push(this), r = !0), t && t.push(i);
      }
    }
    return t || (t = e.slice()), r || t.push(this), t;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(e) {
    for (let t = 0; t < e.length; t++)
      if (this.eq(e[t]))
        return e.slice(0, t).concat(e.slice(t + 1));
    return e;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(e) {
    for (let t = 0; t < e.length; t++)
      if (this.eq(e[t]))
        return !0;
    return !1;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(e) {
    return this == e || this.type == e.type && ki(this.attrs, e.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let t in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return e;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(e, t) {
    if (!t)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let r = e.marks[t.type];
    if (!r)
      throw new RangeError(`There is no mark type ${t.type} in this schema`);
    let s = r.create(t.attrs);
    return r.checkAttrs(s.attrs), s;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(e, t) {
    if (e == t)
      return !0;
    if (e.length != t.length)
      return !1;
    for (let r = 0; r < e.length; r++)
      if (!e[r].eq(t[r]))
        return !1;
    return !0;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(e) {
    if (!e || Array.isArray(e) && e.length == 0)
      return Ma.none;
    if (e instanceof Ma)
      return [e];
    let t = e.slice();
    return t.sort((r, s) => r.type.rank - s.type.rank), t;
  }
};
L.none = [];
class cr extends Error {
}
class w {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.
  
  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(e, t, r) {
    this.content = e, this.openStart = t, this.openEnd = r;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(e, t) {
    let r = Ou(this.content, e + this.openStart, t, this.openStart + 1, this.openEnd + 1);
    return r && new w(r, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(e, t) {
    return new w(_u(this.content, e + this.openStart, t + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(e) {
    return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let e = { content: this.content.toJSON() };
    return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      return w.empty;
    let r = t.openStart || 0, s = t.openEnd || 0;
    if (typeof r != "number" || typeof s != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new w(b.fromJSON(e, t.content), r, s);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(e, t = !0) {
    let r = 0, s = 0;
    for (let i = e.firstChild; i && !i.isLeaf && (t || !i.type.spec.isolating); i = i.firstChild)
      r++;
    for (let i = e.lastChild; i && !i.isLeaf && (t || !i.type.spec.isolating); i = i.lastChild)
      s++;
    return new w(e, r, s);
  }
}
w.empty = new w(b.empty, 0, 0);
function _u(n, e, t) {
  let { index: r, offset: s } = n.findIndex(e), i = n.maybeChild(r), { index: o, offset: a } = n.findIndex(t);
  if (s == e || i.isText) {
    if (a != t && !n.child(o).isText)
      throw new RangeError("Removing non-flat range");
    return n.cut(0, e).append(n.cut(t));
  }
  if (r != o)
    throw new RangeError("Removing non-flat range");
  return n.replaceChild(r, i.copy(_u(i.content, e - s - 1, t - s - 1)));
}
function Ou(n, e, t, r, s, i) {
  let { index: o, offset: a } = n.findIndex(e), l = n.maybeChild(o);
  if (a == e || l.isText)
    return i && r <= 0 && s <= 0 && !i.canReplace(o, o, t) ? null : n.cut(0, e).append(t).append(n.cut(e));
  let c = Ou(l.content, e - a - 1, t, o == 0 ? r - 1 : 0, o == n.childCount - 1 ? s - 1 : 0, l);
  return c && n.replaceChild(o, l.copy(c));
}
function Vm(n, e, t) {
  if (t.openStart > n.depth)
    throw new cr("Inserted content deeper than insertion position");
  if (n.depth - t.openStart != e.depth - t.openEnd)
    throw new cr("Inconsistent open depths");
  return Nu(n, e, t, 0);
}
function Nu(n, e, t, r) {
  let s = n.index(r), i = n.node(r);
  if (s == e.index(r) && r < n.depth - t.openStart) {
    let o = Nu(n, e, t, r + 1);
    return i.copy(i.content.replaceChild(s, o));
  } else if (t.content.size)
    if (!t.openStart && !t.openEnd && n.depth == r && e.depth == r) {
      let o = n.parent, a = o.content;
      return Bt(o, a.cut(0, n.parentOffset).append(t.content).append(a.cut(e.parentOffset)));
    } else {
      let { start: o, end: a } = Wm(t, n);
      return Bt(i, Iu(n, o, a, e, r));
    }
  else return Bt(i, xi(n, e, r));
}
function $u(n, e) {
  if (!e.type.compatibleContent(n.type))
    throw new cr("Cannot join " + e.type.name + " onto " + n.type.name);
}
function Ea(n, e, t) {
  let r = n.node(t);
  return $u(r, e.node(t)), r;
}
function zt(n, e) {
  let t = e.length - 1;
  t >= 0 && n.isText && n.sameMarkup(e[t]) ? e[t] = n.withText(e[t].text + n.text) : e.push(n);
}
function Un(n, e, t, r) {
  let s = (e || n).node(t), i = 0, o = e ? e.index(t) : s.childCount;
  n && (i = n.index(t), n.depth > t ? i++ : n.textOffset && (zt(n.nodeAfter, r), i++));
  for (let a = i; a < o; a++)
    zt(s.child(a), r);
  e && e.depth == t && e.textOffset && zt(e.nodeBefore, r);
}
function Bt(n, e) {
  if (!n.type.validContent(e))
    throw new cr("Invalid content for node " + n.type.name);
  return n.copy(e);
}
function Iu(n, e, t, r, s) {
  let i = n.depth > s && Ea(n, e, s + 1), o = r.depth > s && Ea(t, r, s + 1), a = [];
  return Un(null, n, s, a), i && o && e.index(s) == t.index(s) ? ($u(i, o), zt(Bt(i, Iu(n, e, t, r, s + 1)), a)) : (i && zt(Bt(i, xi(n, e, s + 1)), a), Un(e, t, s, a), o && zt(Bt(o, xi(t, r, s + 1)), a)), Un(r, null, s, a), new b(a);
}
function xi(n, e, t) {
  let r = [];
  if (Un(null, n, t, r), n.depth > t) {
    let s = Ea(n, e, t + 1);
    zt(Bt(s, xi(n, e, t + 1)), r);
  }
  return Un(e, null, t, r), new b(r);
}
function Wm(n, e) {
  let t = e.depth - n.openStart, s = e.node(t).copy(n.content);
  for (let i = t - 1; i >= 0; i--)
    s = e.node(i).copy(b.from(s));
  return {
    start: s.resolveNoCache(n.openStart + t),
    end: s.resolveNoCache(s.content.size - n.openEnd - t)
  };
}
class dr {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.pos = e, this.path = t, this.parentOffset = r, this.depth = t.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(e) {
    return e == null ? this.depth : e < 0 ? this.depth + e : e;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(e) {
    return this.path[this.resolveDepth(e) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(e) {
    return this.path[this.resolveDepth(e) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(e) {
    return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(e) {
    return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(e) {
    return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position before the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(e) {
    if (e = this.resolveDepth(e), !e)
      throw new RangeError("There is no position after the top-level node");
    return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let e = this.parent, t = this.index(this.depth);
    if (t == e.childCount)
      return null;
    let r = this.pos - this.path[this.path.length - 1], s = e.child(t);
    return r ? e.child(t).cut(r) : s;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
    return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(e, t) {
    t = this.resolveDepth(t);
    let r = this.path[t * 3], s = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
    for (let i = 0; i < e; i++)
      s += r.child(i).nodeSize;
    return s;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let e = this.parent, t = this.index();
    if (e.content.size == 0)
      return L.none;
    if (this.textOffset)
      return e.child(t).marks;
    let r = e.maybeChild(t - 1), s = e.maybeChild(t);
    if (!r) {
      let a = r;
      r = s, s = a;
    }
    let i = r.marks;
    for (var o = 0; o < i.length; o++)
      i[o].type.spec.inclusive === !1 && (!s || !i[o].isInSet(s.marks)) && (i = i[o--].removeFromSet(i));
    return i;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross(e) {
    let t = this.parent.maybeChild(this.index());
    if (!t || !t.isInline)
      return null;
    let r = t.marks, s = e.parent.maybeChild(e.index());
    for (var i = 0; i < r.length; i++)
      r[i].type.spec.inclusive === !1 && (!s || !r[i].isInSet(s.marks)) && (r = r[i--].removeFromSet(r));
    return r;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(e) {
    for (let t = this.depth; t > 0; t--)
      if (this.start(t) <= e && this.end(t) >= e)
        return t;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(e = this, t) {
    if (e.pos < this.pos)
      return e.blockRange(this);
    for (let r = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); r >= 0; r--)
      if (e.pos <= this.end(r) && (!t || t(this.node(r))))
        return new wi(this, e, r);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(e) {
    return this.pos - this.parentOffset == e.pos - e.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(e) {
    return e.pos > this.pos ? e : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(e) {
    return e.pos < this.pos ? e : this;
  }
  /**
  @internal
  */
  toString() {
    let e = "";
    for (let t = 1; t <= this.depth; t++)
      e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
    return e + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(e, t) {
    if (!(t >= 0 && t <= e.content.size))
      throw new RangeError("Position " + t + " out of range");
    let r = [], s = 0, i = t;
    for (let o = e; ; ) {
      let { index: a, offset: l } = o.content.findIndex(i), c = i - l;
      if (r.push(o, a, s + l), !c || (o = o.child(a), o.isText))
        break;
      i = c - 1, s += l + 1;
    }
    return new dr(t, r, i);
  }
  /**
  @internal
  */
  static resolveCached(e, t) {
    let r = _c.get(e);
    if (r)
      for (let i = 0; i < r.elts.length; i++) {
        let o = r.elts[i];
        if (o.pos == t)
          return o;
      }
    else
      _c.set(e, r = new jm());
    let s = r.elts[r.i] = dr.resolve(e, t);
    return r.i = (r.i + 1) % qm, s;
  }
}
class jm {
  constructor() {
    this.elts = [], this.i = 0;
  }
}
const qm = 12, _c = /* @__PURE__ */ new WeakMap();
class wi {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor(e, t, r) {
    this.$from = e, this.$to = t, this.depth = r;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
}
const Um = /* @__PURE__ */ Object.create(null);
class Ie {
  /**
  @internal
  */
  constructor(e, t, r, s = L.none) {
    this.type = e, this.attrs = t, this.marks = s, this.content = r || b.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(e) {
    return this.content.child(e);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(e) {
    return this.content.maybeChild(e);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(e) {
    this.content.forEach(e);
  }
  /**
  Invoke a callback for all descendant nodes recursively overlapping
  the given two positions that are relative to start of this
  node's content. This includes all ancestors of the nodes
  containing the two positions. The callback is invoked with the
  node, its position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(e, t, r, s = 0) {
    this.content.nodesBetween(e, t, r, s, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(e) {
    this.nodesBetween(0, this.content.size, e);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(e, t, r, s) {
    return this.content.textBetween(e, t, r, s);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(e) {
    return this == e || this.sameMarkup(e) && this.content.eq(e.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(e) {
    return this.hasMarkup(e.type, e.attrs, e.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(e, t, r) {
    return this.type == e && ki(this.attrs, t || e.defaultAttrs || Um) && L.sameSet(this.marks, r || L.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(e = null) {
    return e == this.content ? this : new Ie(this.type, this.attrs, e, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(e) {
    return e == this.marks ? this : new Ie(this.type, this.attrs, this.content, e);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(e, t = this.content.size) {
    return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(e, t = this.content.size, r = !1) {
    if (e == t)
      return w.empty;
    let s = this.resolve(e), i = this.resolve(t), o = r ? 0 : s.sharedDepth(t), a = s.start(o), c = s.node(o).content.cut(s.pos - a, i.pos - a);
    return new w(c, s.depth - o, i.depth - o);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(e, t, r) {
    return Vm(this.resolve(e), this.resolve(t), r);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(e) {
    for (let t = this; ; ) {
      let { index: r, offset: s } = t.content.findIndex(e);
      if (t = t.maybeChild(r), !t)
        return null;
      if (s == e || t.isText)
        return t;
      e -= s + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(e) {
    let { index: t, offset: r } = this.content.findIndex(e);
    return { node: this.content.maybeChild(t), index: t, offset: r };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(e) {
    if (e == 0)
      return { node: null, index: 0, offset: 0 };
    let { index: t, offset: r } = this.content.findIndex(e);
    if (r < e)
      return { node: this.content.child(t), index: t, offset: r };
    let s = this.content.child(t - 1);
    return { node: s, index: t - 1, offset: r - s.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(e) {
    return dr.resolveCached(this, e);
  }
  /**
  @internal
  */
  resolveNoCache(e) {
    return dr.resolve(this, e);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(e, t, r) {
    let s = !1;
    return t > e && this.nodesBetween(e, t, (i) => (r.isInSet(i.marks) && (s = !0), !s)), s;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let e = this.type.name;
    return this.content.size && (e += "(" + this.content.toStringInner() + ")"), Du(this.marks, e);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(e) {
    let t = this.type.contentMatch.matchFragment(this.content, 0, e);
    if (!t)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return t;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(e, t, r = b.empty, s = 0, i = r.childCount) {
    let o = this.contentMatchAt(e).matchFragment(r, s, i), a = o && o.matchFragment(this.content, t);
    if (!a || !a.validEnd)
      return !1;
    for (let l = s; l < i; l++)
      if (!this.type.allowsMarks(r.child(l).marks))
        return !1;
    return !0;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(e, t, r, s) {
    if (s && !this.type.allowsMarks(s))
      return !1;
    let i = this.contentMatchAt(e).matchType(r), o = i && i.matchFragment(this.content, t);
    return o ? o.validEnd : !1;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(e) {
    return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
    let e = L.none;
    for (let t = 0; t < this.marks.length; t++) {
      let r = this.marks[t];
      r.type.checkAttrs(r.attrs), e = r.addToSet(e);
    }
    if (!L.sameSet(e, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((t) => t.type.name)}`);
    this.content.forEach((t) => t.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let e = { type: this.type.name };
    for (let t in this.attrs) {
      e.attrs = this.attrs;
      break;
    }
    return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((t) => t.toJSON())), e;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(e, t) {
    if (!t)
      throw new RangeError("Invalid input for Node.fromJSON");
    let r;
    if (t.marks) {
      if (!Array.isArray(t.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      r = t.marks.map(e.markFromJSON);
    }
    if (t.type == "text") {
      if (typeof t.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return e.text(t.text, r);
    }
    let s = b.fromJSON(e, t.content), i = e.nodeType(t.type).create(t.attrs, s, r);
    return i.type.checkAttrs(i.attrs), i;
  }
}
Ie.prototype.text = void 0;
class Si extends Ie {
  /**
  @internal
  */
  constructor(e, t, r, s) {
    if (super(e, t, null, s), !r)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = r;
  }
  toString() {
    return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : Du(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(e, t) {
    return this.text.slice(e, t);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(e) {
    return e == this.marks ? this : new Si(this.type, this.attrs, this.text, e);
  }
  withText(e) {
    return e == this.text ? this : new Si(this.type, this.attrs, e, this.marks);
  }
  cut(e = 0, t = this.text.length) {
    return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
  }
  eq(e) {
    return this.sameMarkup(e) && this.text == e.text;
  }
  toJSON() {
    let e = super.toJSON();
    return e.text = this.text, e;
  }
}
function Du(n, e) {
  for (let t = n.length - 1; t >= 0; t--)
    e = n[t].type.name + "(" + e + ")";
  return e;
}
class Kt {
  /**
  @internal
  */
  constructor(e) {
    this.validEnd = e, this.next = [], this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(e, t) {
    let r = new Km(e, t);
    if (r.next == null)
      return Kt.empty;
    let s = Pu(r);
    r.next && r.err("Unexpected trailing text");
    let i = eg(Zm(s));
    return tg(i, r), i;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(e) {
    for (let t = 0; t < this.next.length; t++)
      if (this.next[t].type == e)
        return this.next[t].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(e, t = 0, r = e.childCount) {
    let s = this;
    for (let i = t; s && i < r; i++)
      s = s.matchType(e.child(i).type);
    return s;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let e = 0; e < this.next.length; e++) {
      let { type: t } = this.next[e];
      if (!(t.isText || t.hasRequiredAttrs()))
        return t;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(e) {
    for (let t = 0; t < this.next.length; t++)
      for (let r = 0; r < e.next.length; r++)
        if (this.next[t].type == e.next[r].type)
          return !0;
    return !1;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(e, t = !1, r = 0) {
    let s = [this];
    function i(o, a) {
      let l = o.matchFragment(e, r);
      if (l && (!t || l.validEnd))
        return b.from(a.map((c) => c.createAndFill()));
      for (let c = 0; c < o.next.length; c++) {
        let { type: d, next: u } = o.next[c];
        if (!(d.isText || d.hasRequiredAttrs()) && s.indexOf(u) == -1) {
          s.push(u);
          let h = i(u, a.concat(d));
          if (h)
            return h;
        }
      }
      return null;
    }
    return i(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(e) {
    for (let r = 0; r < this.wrapCache.length; r += 2)
      if (this.wrapCache[r] == e)
        return this.wrapCache[r + 1];
    let t = this.computeWrapping(e);
    return this.wrapCache.push(e, t), t;
  }
  /**
  @internal
  */
  computeWrapping(e) {
    let t = /* @__PURE__ */ Object.create(null), r = [{ match: this, type: null, via: null }];
    for (; r.length; ) {
      let s = r.shift(), i = s.match;
      if (i.matchType(e)) {
        let o = [];
        for (let a = s; a.type; a = a.via)
          o.push(a.type);
        return o.reverse();
      }
      for (let o = 0; o < i.next.length; o++) {
        let { type: a, next: l } = i.next[o];
        !a.isLeaf && !a.hasRequiredAttrs() && !(a.name in t) && (!s.type || l.validEnd) && (r.push({ match: a.contentMatch, type: a, via: s }), t[a.name] = !0);
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(e) {
    if (e >= this.next.length)
      throw new RangeError(`There's no ${e}th edge in this content match`);
    return this.next[e];
  }
  /**
  @internal
  */
  toString() {
    let e = [];
    function t(r) {
      e.push(r);
      for (let s = 0; s < r.next.length; s++)
        e.indexOf(r.next[s].next) == -1 && t(r.next[s].next);
    }
    return t(this), e.map((r, s) => {
      let i = s + (r.validEnd ? "*" : " ") + " ";
      for (let o = 0; o < r.next.length; o++)
        i += (o ? ", " : "") + r.next[o].type.name + "->" + e.indexOf(r.next[o].next);
      return i;
    }).join(`
`);
  }
}
Kt.empty = new Kt(!0);
class Km {
  constructor(e, t) {
    this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(e) {
    return this.next == e && (this.pos++ || !0);
  }
  err(e) {
    throw new SyntaxError(e + " (in content expression '" + this.string + "')");
  }
}
function Pu(n) {
  let e = [];
  do
    e.push(Jm(n));
  while (n.eat("|"));
  return e.length == 1 ? e[0] : { type: "choice", exprs: e };
}
function Jm(n) {
  let e = [];
  do
    e.push(Gm(n));
  while (n.next && n.next != ")" && n.next != "|");
  return e.length == 1 ? e[0] : { type: "seq", exprs: e };
}
function Gm(n) {
  let e = Qm(n);
  for (; ; )
    if (n.eat("+"))
      e = { type: "plus", expr: e };
    else if (n.eat("*"))
      e = { type: "star", expr: e };
    else if (n.eat("?"))
      e = { type: "opt", expr: e };
    else if (n.eat("{"))
      e = Ym(n, e);
    else
      break;
  return e;
}
function Oc(n) {
  /\D/.test(n.next) && n.err("Expected number, got '" + n.next + "'");
  let e = Number(n.next);
  return n.pos++, e;
}
function Ym(n, e) {
  let t = Oc(n), r = t;
  return n.eat(",") && (n.next != "}" ? r = Oc(n) : r = -1), n.eat("}") || n.err("Unclosed braced range"), { type: "range", min: t, max: r, expr: e };
}
function Xm(n, e) {
  let t = n.nodeTypes, r = t[e];
  if (r)
    return [r];
  let s = [];
  for (let i in t) {
    let o = t[i];
    o.isInGroup(e) && s.push(o);
  }
  return s.length == 0 && n.err("No node type or group '" + e + "' found"), s;
}
function Qm(n) {
  if (n.eat("(")) {
    let e = Pu(n);
    return n.eat(")") || n.err("Missing closing paren"), e;
  } else if (/\W/.test(n.next))
    n.err("Unexpected token '" + n.next + "'");
  else {
    let e = Xm(n, n.next).map((t) => (n.inline == null ? n.inline = t.isInline : n.inline != t.isInline && n.err("Mixing inline and block content"), { type: "name", value: t }));
    return n.pos++, e.length == 1 ? e[0] : { type: "choice", exprs: e };
  }
}
function Zm(n) {
  let e = [[]];
  return s(i(n, 0), t()), e;
  function t() {
    return e.push([]) - 1;
  }
  function r(o, a, l) {
    let c = { term: l, to: a };
    return e[o].push(c), c;
  }
  function s(o, a) {
    o.forEach((l) => l.to = a);
  }
  function i(o, a) {
    if (o.type == "choice")
      return o.exprs.reduce((l, c) => l.concat(i(c, a)), []);
    if (o.type == "seq")
      for (let l = 0; ; l++) {
        let c = i(o.exprs[l], a);
        if (l == o.exprs.length - 1)
          return c;
        s(c, a = t());
      }
    else if (o.type == "star") {
      let l = t();
      return r(a, l), s(i(o.expr, l), l), [r(l)];
    } else if (o.type == "plus") {
      let l = t();
      return s(i(o.expr, a), l), s(i(o.expr, l), l), [r(l)];
    } else {
      if (o.type == "opt")
        return [r(a)].concat(i(o.expr, a));
      if (o.type == "range") {
        let l = a;
        for (let c = 0; c < o.min; c++) {
          let d = t();
          s(i(o.expr, l), d), l = d;
        }
        if (o.max == -1)
          s(i(o.expr, l), l);
        else
          for (let c = o.min; c < o.max; c++) {
            let d = t();
            r(l, d), s(i(o.expr, l), d), l = d;
          }
        return [r(l)];
      } else {
        if (o.type == "name")
          return [r(a, void 0, o.value)];
        throw new Error("Unknown expr type");
      }
    }
  }
}
function Ru(n, e) {
  return e - n;
}
function Nc(n, e) {
  let t = [];
  return r(e), t.sort(Ru);
  function r(s) {
    let i = n[s];
    if (i.length == 1 && !i[0].term)
      return r(i[0].to);
    t.push(s);
    for (let o = 0; o < i.length; o++) {
      let { term: a, to: l } = i[o];
      !a && t.indexOf(l) == -1 && r(l);
    }
  }
}
function eg(n) {
  let e = /* @__PURE__ */ Object.create(null);
  return t(Nc(n, 0));
  function t(r) {
    let s = [];
    r.forEach((o) => {
      n[o].forEach(({ term: a, to: l }) => {
        if (!a)
          return;
        let c;
        for (let d = 0; d < s.length; d++)
          s[d][0] == a && (c = s[d][1]);
        Nc(n, l).forEach((d) => {
          c || s.push([a, c = []]), c.indexOf(d) == -1 && c.push(d);
        });
      });
    });
    let i = e[r.join(",")] = new Kt(r.indexOf(n.length - 1) > -1);
    for (let o = 0; o < s.length; o++) {
      let a = s[o][1].sort(Ru);
      i.next.push({ type: s[o][0], next: e[a.join(",")] || t(a) });
    }
    return i;
  }
}
function tg(n, e) {
  for (let t = 0, r = [n]; t < r.length; t++) {
    let s = r[t], i = !s.validEnd, o = [];
    for (let a = 0; a < s.next.length; a++) {
      let { type: l, next: c } = s.next[a];
      o.push(l.name), i && !(l.isText || l.hasRequiredAttrs()) && (i = !1), r.indexOf(c) == -1 && r.push(c);
    }
    i && e.err("Only non-generatable nodes (" + o.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function Lu(n) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let t in n) {
    let r = n[t];
    if (!r.hasDefault)
      return null;
    e[t] = r.default;
  }
  return e;
}
function zu(n, e) {
  let t = /* @__PURE__ */ Object.create(null);
  for (let r in n) {
    let s = e && e[r];
    if (s === void 0) {
      let i = n[r];
      if (i.hasDefault)
        s = i.default;
      else
        throw new RangeError("No value supplied for attribute " + r);
    }
    t[r] = s;
  }
  return t;
}
function Bu(n, e, t, r) {
  for (let s in e)
    if (!(s in n))
      throw new RangeError(`Unsupported attribute ${s} for ${t} of type ${r}`);
  for (let s in n)
    n[s].validate && n[s].validate(e[s]);
}
function Fu(n, e) {
  let t = /* @__PURE__ */ Object.create(null);
  if (e)
    for (let r in e)
      t[r] = new rg(n, r, e[r]);
  return t;
}
let $c = class Hu {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.name = e, this.schema = t, this.spec = r, this.markSet = null, this.groups = r.group ? r.group.split(" ") : [], this.attrs = Fu(e, r.attrs), this.defaultAttrs = Lu(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(r.inline || e == "text"), this.isText = e == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == Kt.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(e) {
    return this.groups.indexOf(e) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let e in this.attrs)
      if (this.attrs[e].isRequired)
        return !0;
    return !1;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(e) {
    return this == e || this.contentMatch.compatible(e.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(e) {
    return !e && this.defaultAttrs ? this.defaultAttrs : zu(this.attrs, e);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(e = null, t, r) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new Ie(this, this.computeAttrs(e), b.from(t), L.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(e = null, t, r) {
    return t = b.from(t), this.checkContent(t), new Ie(this, this.computeAttrs(e), t, L.setFrom(r));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(e = null, t, r) {
    if (e = this.computeAttrs(e), t = b.from(t), t.size) {
      let o = this.contentMatch.fillBefore(t);
      if (!o)
        return null;
      t = o.append(t);
    }
    let s = this.contentMatch.matchFragment(t), i = s && s.fillBefore(b.empty, !0);
    return i ? new Ie(this, e, t.append(i), L.setFrom(r)) : null;
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(e) {
    let t = this.contentMatch.matchFragment(e);
    if (!t || !t.validEnd)
      return !1;
    for (let r = 0; r < e.childCount; r++)
      if (!this.allowsMarks(e.child(r).marks))
        return !1;
    return !0;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(e) {
    if (!this.validContent(e))
      throw new RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
  }
  /**
  @internal
  */
  checkAttrs(e) {
    Bu(this.attrs, e, "node", this.name);
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(e) {
    return this.markSet == null || this.markSet.indexOf(e) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(e) {
    if (this.markSet == null)
      return !0;
    for (let t = 0; t < e.length; t++)
      if (!this.allowsMarkType(e[t].type))
        return !1;
    return !0;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(e) {
    if (this.markSet == null)
      return e;
    let t;
    for (let r = 0; r < e.length; r++)
      this.allowsMarkType(e[r].type) ? t && t.push(e[r]) : t || (t = e.slice(0, r));
    return t ? t.length ? t : L.none : e;
  }
  /**
  @internal
  */
  static compile(e, t) {
    let r = /* @__PURE__ */ Object.create(null);
    e.forEach((i, o) => r[i] = new Hu(i, t, o));
    let s = t.spec.topNode || "doc";
    if (!r[s])
      throw new RangeError("Schema is missing its top node type ('" + s + "')");
    if (!r.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let i in r.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return r;
  }
};
function ng(n, e, t) {
  let r = t.split("|");
  return (s) => {
    let i = s === null ? "null" : typeof s;
    if (r.indexOf(i) < 0)
      throw new RangeError(`Expected value of type ${r} for attribute ${e} on type ${n}, got ${i}`);
  };
}
class rg {
  constructor(e, t, r) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(r, "default"), this.default = r.default, this.validate = typeof r.validate == "string" ? ng(e, t, r.validate) : r.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
}
class vo {
  /**
  @internal
  */
  constructor(e, t, r, s) {
    this.name = e, this.rank = t, this.schema = r, this.spec = s, this.attrs = Fu(e, s.attrs), this.excluded = null;
    let i = Lu(this.attrs);
    this.instance = i ? new L(this, i) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(e = null) {
    return !e && this.instance ? this.instance : new L(this, zu(this.attrs, e));
  }
  /**
  @internal
  */
  static compile(e, t) {
    let r = /* @__PURE__ */ Object.create(null), s = 0;
    return e.forEach((i, o) => r[i] = new vo(i, s++, t, o)), r;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(e) {
    for (var t = 0; t < e.length; t++)
      e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
    return e;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(e) {
    for (let t = 0; t < e.length; t++)
      if (e[t].type == this)
        return e[t];
  }
  /**
  @internal
  */
  checkAttrs(e) {
    Bu(this.attrs, e, "mark", this.name);
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(e) {
    return this.excluded.indexOf(e) > -1;
  }
}
class Vu {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(e) {
    this.linebreakReplacement = null, this.cached = /* @__PURE__ */ Object.create(null);
    let t = this.spec = {};
    for (let s in e)
      t[s] = e[s];
    t.nodes = ne.from(e.nodes), t.marks = ne.from(e.marks || {}), this.nodes = $c.compile(this.spec.nodes, this), this.marks = vo.compile(this.spec.marks, this);
    let r = /* @__PURE__ */ Object.create(null);
    for (let s in this.nodes) {
      if (s in this.marks)
        throw new RangeError(s + " can not be both a node and a mark");
      let i = this.nodes[s], o = i.spec.content || "", a = i.spec.marks;
      if (i.contentMatch = r[o] || (r[o] = Kt.parse(o, this.nodes)), i.inlineContent = i.contentMatch.inlineContent, i.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!i.isInline || !i.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = i;
      }
      i.markSet = a == "_" ? null : a ? Ic(this, a.split(" ")) : a == "" || !i.inlineContent ? [] : null;
    }
    for (let s in this.marks) {
      let i = this.marks[s], o = i.spec.excludes;
      i.excluded = o == null ? [i] : o == "" ? [] : Ic(this, o.split(" "));
    }
    this.nodeFromJSON = (s) => Ie.fromJSON(this, s), this.markFromJSON = (s) => L.fromJSON(this, s), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(e, t = null, r, s) {
    if (typeof e == "string")
      e = this.nodeType(e);
    else if (e instanceof $c) {
      if (e.schema != this)
        throw new RangeError("Node type from different schema used (" + e.name + ")");
    } else throw new RangeError("Invalid node type: " + e);
    return e.createChecked(t, r, s);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(e, t) {
    let r = this.nodes.text;
    return new Si(r, r.defaultAttrs, e, L.setFrom(t));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(e, t) {
    return typeof e == "string" && (e = this.marks[e]), e.create(t);
  }
  /**
  @internal
  */
  nodeType(e) {
    let t = this.nodes[e];
    if (!t)
      throw new RangeError("Unknown node type: " + e);
    return t;
  }
}
function Ic(n, e) {
  let t = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r], i = n.marks[s], o = i;
    if (i)
      t.push(i);
    else
      for (let a in n.marks) {
        let l = n.marks[a];
        (s == "_" || l.spec.group && l.spec.group.split(" ").indexOf(s) > -1) && t.push(o = l);
      }
    if (!o)
      throw new SyntaxError("Unknown mark type: '" + e[r] + "'");
  }
  return t;
}
function sg(n) {
  return n.tag != null;
}
function ig(n) {
  return n.style != null;
}
class mt {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(e, t) {
    this.schema = e, this.rules = t, this.tags = [], this.styles = [];
    let r = this.matchedStyles = [];
    t.forEach((s) => {
      if (sg(s))
        this.tags.push(s);
      else if (ig(s)) {
        let i = /[^=]*/.exec(s.style)[0];
        r.indexOf(i) < 0 && r.push(i), this.styles.push(s);
      }
    }), this.normalizeLists = !this.tags.some((s) => {
      if (!/^(ul|ol)\b/.test(s.tag) || !s.node)
        return !1;
      let i = e.nodes[s.node];
      return i.contentMatch.matchType(i);
    });
  }
  /**
  Parse a document from the content of a DOM node.
  */
  parse(e, t = {}) {
    let r = new Pc(this, t, !1);
    return r.addAll(e, L.none, t.from, t.to), r.finish();
  }
  /**
  Parses the content of the given DOM node, like
  [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
  options. But unlike that method, which produces a whole node,
  this one returns a slice that is open at the sides, meaning that
  the schema constraints aren't applied to the start of nodes to
  the left of the input and the end of nodes at the end.
  */
  parseSlice(e, t = {}) {
    let r = new Pc(this, t, !0);
    return r.addAll(e, L.none, t.from, t.to), w.maxOpen(r.finish());
  }
  /**
  @internal
  */
  matchTag(e, t, r) {
    for (let s = r ? this.tags.indexOf(r) + 1 : 0; s < this.tags.length; s++) {
      let i = this.tags[s];
      if (lg(e, i.tag) && (i.namespace === void 0 || e.namespaceURI == i.namespace) && (!i.context || t.matchesContext(i.context))) {
        if (i.getAttrs) {
          let o = i.getAttrs(e);
          if (o === !1)
            continue;
          i.attrs = o || void 0;
        }
        return i;
      }
    }
  }
  /**
  @internal
  */
  matchStyle(e, t, r, s) {
    for (let i = s ? this.styles.indexOf(s) + 1 : 0; i < this.styles.length; i++) {
      let o = this.styles[i], a = o.style;
      if (!(a.indexOf(e) != 0 || o.context && !r.matchesContext(o.context) || // Test that the style string either precisely matches the prop,
      // or has an '=' sign after the prop, followed by the given
      // value.
      a.length > e.length && (a.charCodeAt(e.length) != 61 || a.slice(e.length + 1) != t))) {
        if (o.getAttrs) {
          let l = o.getAttrs(t);
          if (l === !1)
            continue;
          o.attrs = l || void 0;
        }
        return o;
      }
    }
  }
  /**
  @internal
  */
  static schemaRules(e) {
    let t = [];
    function r(s) {
      let i = s.priority == null ? 50 : s.priority, o = 0;
      for (; o < t.length; o++) {
        let a = t[o];
        if ((a.priority == null ? 50 : a.priority) < i)
          break;
      }
      t.splice(o, 0, s);
    }
    for (let s in e.marks) {
      let i = e.marks[s].spec.parseDOM;
      i && i.forEach((o) => {
        r(o = Rc(o)), o.mark || o.ignore || o.clearMark || (o.mark = s);
      });
    }
    for (let s in e.nodes) {
      let i = e.nodes[s].spec.parseDOM;
      i && i.forEach((o) => {
        r(o = Rc(o)), o.node || o.ignore || o.mark || (o.node = s);
      });
    }
    return t;
  }
  /**
  Construct a DOM parser using the parsing rules listed in a
  schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
  [priority](https://prosemirror.net/docs/ref/#model.GenericParseRule.priority).
  */
  static fromSchema(e) {
    return e.cached.domParser || (e.cached.domParser = new mt(e, mt.schemaRules(e)));
  }
}
const Wu = {
  address: !0,
  article: !0,
  aside: !0,
  blockquote: !0,
  body: !0,
  canvas: !0,
  dd: !0,
  div: !0,
  dl: !0,
  fieldset: !0,
  figcaption: !0,
  figure: !0,
  footer: !0,
  form: !0,
  h1: !0,
  h2: !0,
  h3: !0,
  h4: !0,
  h5: !0,
  h6: !0,
  header: !0,
  hgroup: !0,
  hr: !0,
  li: !0,
  noscript: !0,
  ol: !0,
  output: !0,
  p: !0,
  pre: !0,
  section: !0,
  table: !0,
  tfoot: !0,
  ul: !0
}, og = {
  head: !0,
  noscript: !0,
  object: !0,
  script: !0,
  style: !0,
  title: !0
}, ju = { ol: !0, ul: !0 }, ur = 1, Ta = 2, Kn = 4;
function Dc(n, e, t) {
  return e != null ? (e ? ur : 0) | (e === "full" ? Ta : 0) : n && n.whitespace == "pre" ? ur | Ta : t & ~Kn;
}
class Zr {
  constructor(e, t, r, s, i, o) {
    this.type = e, this.attrs = t, this.marks = r, this.solid = s, this.options = o, this.content = [], this.activeMarks = L.none, this.match = i || (o & Kn ? null : e.contentMatch);
  }
  findWrapping(e) {
    if (!this.match) {
      if (!this.type)
        return [];
      let t = this.type.contentMatch.fillBefore(b.from(e));
      if (t)
        this.match = this.type.contentMatch.matchFragment(t);
      else {
        let r = this.type.contentMatch, s;
        return (s = r.findWrapping(e.type)) ? (this.match = r, s) : null;
      }
    }
    return this.match.findWrapping(e.type);
  }
  finish(e) {
    if (!(this.options & ur)) {
      let r = this.content[this.content.length - 1], s;
      if (r && r.isText && (s = /[ \t\r\n\u000c]+$/.exec(r.text))) {
        let i = r;
        r.text.length == s[0].length ? this.content.pop() : this.content[this.content.length - 1] = i.withText(i.text.slice(0, i.text.length - s[0].length));
      }
    }
    let t = b.from(this.content);
    return !e && this.match && (t = t.append(this.match.fillBefore(b.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
  }
  inlineContext(e) {
    return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Wu.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
  }
}
class Pc {
  constructor(e, t, r) {
    this.parser = e, this.options = t, this.isOpen = r, this.open = 0, this.localPreserveWS = !1;
    let s = t.topNode, i, o = Dc(null, t.preserveWhitespace, 0) | (r ? Kn : 0);
    s ? i = new Zr(s.type, s.attrs, L.none, !0, t.topMatch || s.type.contentMatch, o) : r ? i = new Zr(null, null, L.none, !0, null, o) : i = new Zr(e.schema.topNodeType, null, L.none, !0, null, o), this.nodes = [i], this.find = t.findPositions, this.needsBlock = !1;
  }
  get top() {
    return this.nodes[this.open];
  }
  // Add a DOM node to the content. Text is inserted as text node,
  // otherwise, the node is passed to `addElement` or, if it has a
  // `style` attribute, `addElementWithStyles`.
  addDOM(e, t) {
    e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
  }
  addTextNode(e, t) {
    let r = e.nodeValue, s = this.top, i = s.options & Ta ? "full" : this.localPreserveWS || (s.options & ur) > 0, { schema: o } = this.parser;
    if (i === "full" || s.inlineContext(e) || /[^ \t\r\n\u000c]/.test(r)) {
      if (i)
        if (i === "full")
          r = r.replace(/\r\n?/g, `
`);
        else if (o.linebreakReplacement && /[\r\n]/.test(r) && this.top.findWrapping(o.linebreakReplacement.create())) {
          let a = r.split(/\r?\n|\r/);
          for (let l = 0; l < a.length; l++)
            l && this.insertNode(o.linebreakReplacement.create(), t, !0), a[l] && this.insertNode(o.text(a[l]), t, !/\S/.test(a[l]));
          r = "";
        } else
          r = r.replace(/\r?\n|\r/g, " ");
      else if (r = r.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(r) && this.open == this.nodes.length - 1) {
        let a = s.content[s.content.length - 1], l = e.previousSibling;
        (!a || l && l.nodeName == "BR" || a.isText && /[ \t\r\n\u000c]$/.test(a.text)) && (r = r.slice(1));
      }
      r && this.insertNode(o.text(r), t, !/\S/.test(r)), this.findInText(e);
    } else
      this.findInside(e);
  }
  // Try to find a handler for the given tag and use that to parse. If
  // none is found, the element's content nodes are added directly.
  addElement(e, t, r) {
    let s = this.localPreserveWS, i = this.top;
    (e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
    let o = e.nodeName.toLowerCase(), a;
    ju.hasOwnProperty(o) && this.parser.normalizeLists && ag(e);
    let l = this.options.ruleFromNode && this.options.ruleFromNode(e) || (a = this.parser.matchTag(e, this, r));
    e: if (l ? l.ignore : og.hasOwnProperty(o))
      this.findInside(e), this.ignoreFallback(e, t);
    else if (!l || l.skip || l.closeParent) {
      l && l.closeParent ? this.open = Math.max(0, this.open - 1) : l && l.skip.nodeType && (e = l.skip);
      let c, d = this.needsBlock;
      if (Wu.hasOwnProperty(o))
        i.content.length && i.content[0].isInline && this.open && (this.open--, i = this.top), c = !0, i.type || (this.needsBlock = !0);
      else if (!e.firstChild) {
        this.leafFallback(e, t);
        break e;
      }
      let u = l && l.skip ? t : this.readStyles(e, t);
      u && this.addAll(e, u), c && this.sync(i), this.needsBlock = d;
    } else {
      let c = this.readStyles(e, t);
      c && this.addElementByRule(e, l, c, l.consuming === !1 ? a : void 0);
    }
    this.localPreserveWS = s;
  }
  // Called for leaf DOM nodes that would otherwise be ignored
  leafFallback(e, t) {
    e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode(`
`), t);
  }
  // Called for ignored nodes
  ignoreFallback(e, t) {
    e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, !0);
  }
  // Run any style parser associated with the node's styles. Either
  // return an updated array of marks, or null to indicate some of the
  // styles had a rule with `ignore` set.
  readStyles(e, t) {
    let r = e.style;
    if (r && r.length)
      for (let s = 0; s < this.parser.matchedStyles.length; s++) {
        let i = this.parser.matchedStyles[s], o = r.getPropertyValue(i);
        if (o)
          for (let a = void 0; ; ) {
            let l = this.parser.matchStyle(i, o, this, a);
            if (!l)
              break;
            if (l.ignore)
              return null;
            if (l.clearMark ? t = t.filter((c) => !l.clearMark(c)) : t = t.concat(this.parser.schema.marks[l.mark].create(l.attrs)), l.consuming === !1)
              a = l;
            else
              break;
          }
      }
    return t;
  }
  // Look up a handler for the given node. If none are found, return
  // false. Otherwise, apply it, use its return value to drive the way
  // the node's content is wrapped, and return true.
  addElementByRule(e, t, r, s) {
    let i, o;
    if (t.node)
      if (o = this.parser.schema.nodes[t.node], o.isLeaf)
        this.insertNode(o.create(t.attrs), r, e.nodeName == "BR") || this.leafFallback(e, r);
      else {
        let l = this.enter(o, t.attrs || null, r, t.preserveWhitespace);
        l && (i = !0, r = l);
      }
    else {
      let l = this.parser.schema.marks[t.mark];
      r = r.concat(l.create(t.attrs));
    }
    let a = this.top;
    if (o && o.isLeaf)
      this.findInside(e);
    else if (s)
      this.addElement(e, r, s);
    else if (t.getContent)
      this.findInside(e), t.getContent(e, this.parser.schema).forEach((l) => this.insertNode(l, r, !1));
    else {
      let l = e;
      typeof t.contentElement == "string" ? l = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? l = t.contentElement(e) : t.contentElement && (l = t.contentElement), this.findAround(e, l, !0), this.addAll(l, r), this.findAround(e, l, !1);
    }
    i && this.sync(a) && this.open--;
  }
  // Add all child nodes between `startIndex` and `endIndex` (or the
  // whole node, if not given). If `sync` is passed, use it to
  // synchronize after every block element.
  addAll(e, t, r, s) {
    let i = r || 0;
    for (let o = r ? e.childNodes[r] : e.firstChild, a = s == null ? null : e.childNodes[s]; o != a; o = o.nextSibling, ++i)
      this.findAtPoint(e, i), this.addDOM(o, t);
    this.findAtPoint(e, i);
  }
  // Try to find a way to fit the given node type into the current
  // context. May add intermediate wrappers and/or leave non-solid
  // nodes that we're in.
  findPlace(e, t, r) {
    let s, i;
    for (let o = this.open, a = 0; o >= 0; o--) {
      let l = this.nodes[o], c = l.findWrapping(e);
      if (c && (!s || s.length > c.length + a) && (s = c, i = l, !c.length))
        break;
      if (l.solid) {
        if (r)
          break;
        a += 2;
      }
    }
    if (!s)
      return null;
    this.sync(i);
    for (let o = 0; o < s.length; o++)
      t = this.enterInner(s[o], null, t, !1);
    return t;
  }
  // Try to insert the given node, adjusting the context when needed.
  insertNode(e, t, r) {
    if (e.isInline && this.needsBlock && !this.top.type) {
      let i = this.textblockFromContext();
      i && (t = this.enterInner(i, null, t));
    }
    let s = this.findPlace(e, t, r);
    if (s) {
      this.closeExtra();
      let i = this.top;
      i.match && (i.match = i.match.matchType(e.type));
      let o = L.none;
      for (let a of s.concat(e.marks))
        (i.type ? i.type.allowsMarkType(a.type) : Lc(a.type, e.type)) && (o = a.addToSet(o));
      return i.content.push(e.mark(o)), !0;
    }
    return !1;
  }
  // Try to start a node of the given type, adjusting the context when
  // necessary.
  enter(e, t, r, s) {
    let i = this.findPlace(e.create(t), r, !1);
    return i && (i = this.enterInner(e, t, r, !0, s)), i;
  }
  // Open a node of the given type
  enterInner(e, t, r, s = !1, i) {
    this.closeExtra();
    let o = this.top;
    o.match = o.match && o.match.matchType(e);
    let a = Dc(e, i, o.options);
    o.options & Kn && o.content.length == 0 && (a |= Kn);
    let l = L.none;
    return r = r.filter((c) => (o.type ? o.type.allowsMarkType(c.type) : Lc(c.type, e)) ? (l = c.addToSet(l), !1) : !0), this.nodes.push(new Zr(e, t, l, s, null, a)), this.open++, r;
  }
  // Make sure all nodes above this.open are finished and added to
  // their parents
  closeExtra(e = !1) {
    let t = this.nodes.length - 1;
    if (t > this.open) {
      for (; t > this.open; t--)
        this.nodes[t - 1].content.push(this.nodes[t].finish(e));
      this.nodes.length = this.open + 1;
    }
  }
  finish() {
    return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
  }
  sync(e) {
    for (let t = this.open; t >= 0; t--) {
      if (this.nodes[t] == e)
        return this.open = t, !0;
      this.localPreserveWS && (this.nodes[t].options |= ur);
    }
    return !1;
  }
  get currentPos() {
    this.closeExtra();
    let e = 0;
    for (let t = this.open; t >= 0; t--) {
      let r = this.nodes[t].content;
      for (let s = r.length - 1; s >= 0; s--)
        e += r[s].nodeSize;
      t && e++;
    }
    return e;
  }
  findAtPoint(e, t) {
    if (this.find)
      for (let r = 0; r < this.find.length; r++)
        this.find[r].node == e && this.find[r].offset == t && (this.find[r].pos = this.currentPos);
  }
  findInside(e) {
    if (this.find)
      for (let t = 0; t < this.find.length; t++)
        this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
  }
  findAround(e, t, r) {
    if (e != t && this.find)
      for (let s = 0; s < this.find.length; s++)
        this.find[s].pos == null && e.nodeType == 1 && e.contains(this.find[s].node) && t.compareDocumentPosition(this.find[s].node) & (r ? 2 : 4) && (this.find[s].pos = this.currentPos);
  }
  findInText(e) {
    if (this.find)
      for (let t = 0; t < this.find.length; t++)
        this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
  }
  // Determines whether the given context string matches this context.
  matchesContext(e) {
    if (e.indexOf("|") > -1)
      return e.split(/\s*\|\s*/).some(this.matchesContext, this);
    let t = e.split("/"), r = this.options.context, s = !this.isOpen && (!r || r.parent.type == this.nodes[0].type), i = -(r ? r.depth + 1 : 0) + (s ? 0 : 1), o = (a, l) => {
      for (; a >= 0; a--) {
        let c = t[a];
        if (c == "") {
          if (a == t.length - 1 || a == 0)
            continue;
          for (; l >= i; l--)
            if (o(a - 1, l))
              return !0;
          return !1;
        } else {
          let d = l > 0 || l == 0 && s ? this.nodes[l].type : r && l >= i ? r.node(l - i).type : null;
          if (!d || d.name != c && !d.isInGroup(c))
            return !1;
          l--;
        }
      }
      return !0;
    };
    return o(t.length - 1, this.open);
  }
  textblockFromContext() {
    let e = this.options.context;
    if (e)
      for (let t = e.depth; t >= 0; t--) {
        let r = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
        if (r && r.isTextblock && r.defaultAttrs)
          return r;
      }
    for (let t in this.parser.schema.nodes) {
      let r = this.parser.schema.nodes[t];
      if (r.isTextblock && r.defaultAttrs)
        return r;
    }
  }
}
function ag(n) {
  for (let e = n.firstChild, t = null; e; e = e.nextSibling) {
    let r = e.nodeType == 1 ? e.nodeName.toLowerCase() : null;
    r && ju.hasOwnProperty(r) && t ? (t.appendChild(e), e = t) : r == "li" ? t = e : r && (t = null);
  }
}
function lg(n, e) {
  return (n.matches || n.msMatchesSelector || n.webkitMatchesSelector || n.mozMatchesSelector).call(n, e);
}
function Rc(n) {
  let e = {};
  for (let t in n)
    e[t] = n[t];
  return e;
}
function Lc(n, e) {
  let t = e.schema.nodes;
  for (let r in t) {
    let s = t[r];
    if (!s.allowsMarkType(n))
      continue;
    let i = [], o = (a) => {
      i.push(a);
      for (let l = 0; l < a.edgeCount; l++) {
        let { type: c, next: d } = a.edge(l);
        if (c == e || i.indexOf(d) < 0 && o(d))
          return !0;
      }
    };
    if (o(s.contentMatch))
      return !0;
  }
}
class Qt {
  /**
  Create a serializer. `nodes` should map node names to functions
  that take a node and return a description of the corresponding
  DOM. `marks` does the same for mark names, but also gets an
  argument that tells it whether the mark's content is block or
  inline content (for typical use, it'll always be inline). A mark
  serializer may be `null` to indicate that marks of that type
  should not be serialized.
  */
  constructor(e, t) {
    this.nodes = e, this.marks = t;
  }
  /**
  Serialize the content of this fragment to a DOM fragment. When
  not in the browser, the `document` option, containing a DOM
  document, should be passed so that the serializer can create
  nodes.
  */
  serializeFragment(e, t = {}, r) {
    r || (r = es(t).createDocumentFragment());
    let s = r, i = [];
    return e.forEach((o) => {
      if (i.length || o.marks.length) {
        let a = 0, l = 0;
        for (; a < i.length && l < o.marks.length; ) {
          let c = o.marks[l];
          if (!this.marks[c.type.name]) {
            l++;
            continue;
          }
          if (!c.eq(i[a][0]) || c.type.spec.spanning === !1)
            break;
          a++, l++;
        }
        for (; a < i.length; )
          s = i.pop()[1];
        for (; l < o.marks.length; ) {
          let c = o.marks[l++], d = this.serializeMark(c, o.isInline, t);
          d && (i.push([c, s]), s.appendChild(d.dom), s = d.contentDOM || d.dom);
        }
      }
      s.appendChild(this.serializeNodeInner(o, t));
    }), r;
  }
  /**
  @internal
  */
  serializeNodeInner(e, t) {
    if (e.isText)
      return es(t).createTextNode(e.text);
    let { dom: r, contentDOM: s } = Zs(es(t), this.nodes[e.type.name](e), null, e.attrs);
    if (s) {
      if (e.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(e.content, t, s);
    }
    return r;
  }
  /**
  Serialize this node to a DOM node. This can be useful when you
  need to serialize a part of a document, as opposed to the whole
  document. To serialize a whole document, use
  [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
  its [content](https://prosemirror.net/docs/ref/#model.Node.content).
  */
  serializeNode(e, t = {}) {
    let r = this.serializeNodeInner(e, t);
    for (let s = e.marks.length - 1; s >= 0; s--) {
      let i = this.serializeMark(e.marks[s], e.isInline, t);
      i && ((i.contentDOM || i.dom).appendChild(r), r = i.dom);
    }
    return r;
  }
  /**
  @internal
  */
  serializeMark(e, t, r = {}) {
    let s = this.marks[e.type.name];
    return s && Zs(es(r), s(e, t), null, e.attrs);
  }
  static renderSpec(e, t, r = null, s) {
    return typeof t == "string" ? { dom: e.createTextNode(t) } : Zs(e, t, r, s);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(e) {
    return e.cached.domSerializer || (e.cached.domSerializer = new Qt(this.nodesFromSchema(e), this.marksFromSchema(e)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(e) {
    let t = zc(e.nodes);
    return t.text || (t.text = (r) => r.text), t;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(e) {
    return zc(e.marks);
  }
}
function zc(n) {
  let e = {};
  for (let t in n) {
    let r = n[t].spec.toDOM;
    r && (e[t] = r);
  }
  return e;
}
function es(n) {
  return n.document || window.document;
}
const Bc = /* @__PURE__ */ new WeakMap();
function cg(n) {
  let e = Bc.get(n);
  return e === void 0 && Bc.set(n, e = dg(n)), e;
}
function dg(n) {
  let e = null;
  function t(r) {
    if (r && typeof r == "object")
      if (Array.isArray(r))
        if (typeof r[0] == "string")
          e || (e = []), e.push(r);
        else
          for (let s = 0; s < r.length; s++)
            t(r[s]);
      else
        for (let s in r)
          t(r[s]);
  }
  return t(n), e;
}
function Zs(n, e, t, r) {
  if (e.nodeType == 1)
    return { dom: e };
  if (e.dom && e.dom.nodeType == 1)
    return e;
  let s = e[0], i;
  if (typeof s != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (r && (i = cg(r)) && i.indexOf(e) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let o = s.indexOf(" ");
  o > 0 && (t = s.slice(0, o), s = s.slice(o + 1));
  let a, l = t ? n.createElementNS(t, s) : n.createElement(s), c = e[1], d = 1;
  if (c && typeof c == "object" && c.nodeType == null && !Array.isArray(c)) {
    d = 2;
    for (let u in c)
      if (c[u] != null) {
        let h = u.indexOf(" ");
        h > 0 ? l.setAttributeNS(u.slice(0, h), u.slice(h + 1), c[u]) : u == "style" && l.style ? l.style.cssText = c[u] : l.setAttribute(u, c[u]);
      }
  }
  for (let u = d; u < e.length; u++) {
    let h = e[u];
    if (h === 0) {
      if (u < e.length - 1 || u > d)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom: l, contentDOM: l };
    } else if (typeof h == "string")
      l.appendChild(n.createTextNode(h));
    else {
      let { dom: f, contentDOM: p } = Zs(n, h, t, r);
      if (l.appendChild(f), p) {
        if (a)
          throw new RangeError("Multiple content holes");
        a = p;
      }
    }
  }
  return { dom: l, contentDOM: a };
}
const qu = 65535, Uu = Math.pow(2, 16);
function ug(n, e) {
  return n + e * Uu;
}
function Fc(n) {
  return n & qu;
}
function hg(n) {
  return (n - (n & qu)) / Uu;
}
const Ku = 1, Ju = 2, ei = 4, Gu = 8;
class Aa {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.pos = e, this.delInfo = t, this.recover = r;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & Gu) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (Ku | ei)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (Ju | ei)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & ei) > 0;
  }
}
class ke {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(e, t = !1) {
    if (this.ranges = e, this.inverted = t, !e.length && ke.empty)
      return ke.empty;
  }
  /**
  @internal
  */
  recover(e) {
    let t = 0, r = Fc(e);
    if (!this.inverted)
      for (let s = 0; s < r; s++)
        t += this.ranges[s * 3 + 2] - this.ranges[s * 3 + 1];
    return this.ranges[r * 3] + t + hg(e);
  }
  mapResult(e, t = 1) {
    return this._map(e, t, !1);
  }
  map(e, t = 1) {
    return this._map(e, t, !0);
  }
  /**
  @internal
  */
  _map(e, t, r) {
    let s = 0, i = this.inverted ? 2 : 1, o = this.inverted ? 1 : 2;
    for (let a = 0; a < this.ranges.length; a += 3) {
      let l = this.ranges[a] - (this.inverted ? s : 0);
      if (l > e)
        break;
      let c = this.ranges[a + i], d = this.ranges[a + o], u = l + c;
      if (e <= u) {
        let h = c ? e == l ? -1 : e == u ? 1 : t : t, f = l + s + (h < 0 ? 0 : d);
        if (r)
          return f;
        let p = e == (t < 0 ? l : u) ? null : ug(a / 3, e - l), m = e == l ? Ju : e == u ? Ku : ei;
        return (t < 0 ? e != l : e != u) && (m |= Gu), new Aa(f, m, p);
      }
      s += d - c;
    }
    return r ? e + s : new Aa(e + s, 0, null);
  }
  /**
  @internal
  */
  touches(e, t) {
    let r = 0, s = Fc(t), i = this.inverted ? 2 : 1, o = this.inverted ? 1 : 2;
    for (let a = 0; a < this.ranges.length; a += 3) {
      let l = this.ranges[a] - (this.inverted ? r : 0);
      if (l > e)
        break;
      let c = this.ranges[a + i], d = l + c;
      if (e <= d && a == s * 3)
        return !0;
      r += this.ranges[a + o] - c;
    }
    return !1;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(e) {
    let t = this.inverted ? 2 : 1, r = this.inverted ? 1 : 2;
    for (let s = 0, i = 0; s < this.ranges.length; s += 3) {
      let o = this.ranges[s], a = o - (this.inverted ? i : 0), l = o + (this.inverted ? 0 : i), c = this.ranges[s + t], d = this.ranges[s + r];
      e(a, a + c, l, l + d), i += d - c;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new ke(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(e) {
    return e == 0 ? ke.empty : new ke(e < 0 ? [0, -e, 0] : [0, 0, e]);
  }
}
ke.empty = new ke([]);
class hr {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(e, t, r = 0, s = e ? e.length : 0) {
    this.mirror = t, this.from = r, this.to = s, this._maps = e || [], this.ownData = !(e || t);
  }
  /**
  The step maps in this mapping.
  */
  get maps() {
    return this._maps;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(e = 0, t = this.maps.length) {
    return new hr(this._maps, this.mirror, e, t);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(e, t) {
    this.ownData || (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), this.ownData = !0), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(e) {
    for (let t = 0, r = this._maps.length; t < e._maps.length; t++) {
      let s = e.getMirror(t);
      this.appendMap(e._maps[t], s != null && s < t ? r + s : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(e) {
    if (this.mirror) {
      for (let t = 0; t < this.mirror.length; t++)
        if (this.mirror[t] == e)
          return this.mirror[t + (t % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(e, t) {
    this.mirror || (this.mirror = []), this.mirror.push(e, t);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(e) {
    for (let t = e.maps.length - 1, r = this._maps.length + e._maps.length; t >= 0; t--) {
      let s = e.getMirror(t);
      this.appendMap(e._maps[t].invert(), s != null && s > t ? r - s - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let e = new hr();
    return e.appendMappingInverted(this), e;
  }
  /**
  Map a position through this mapping.
  */
  map(e, t = 1) {
    if (this.mirror)
      return this._map(e, t, !0);
    for (let r = this.from; r < this.to; r++)
      e = this._maps[r].map(e, t);
    return e;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(e, t = 1) {
    return this._map(e, t, !1);
  }
  /**
  @internal
  */
  _map(e, t, r) {
    let s = 0;
    for (let i = this.from; i < this.to; i++) {
      let o = this._maps[i], a = o.mapResult(e, t);
      if (a.recover != null) {
        let l = this.getMirror(i);
        if (l != null && l > i && l < this.to) {
          i = l, e = this._maps[l].recover(a.recover);
          continue;
        }
      }
      s |= a.delInfo, e = a.pos;
    }
    return r ? e : new Aa(e, s, null);
  }
}
const Jo = /* @__PURE__ */ Object.create(null);
class de {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return ke.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(e) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(e, t) {
    if (!t || !t.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let r = Jo[t.stepType];
    if (!r)
      throw new RangeError(`No step type ${t.stepType} defined`);
    return r.fromJSON(e, t);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(e, t) {
    if (e in Jo)
      throw new RangeError("Duplicate use of step JSON ID " + e);
    return Jo[e] = t, t.prototype.jsonID = e, t;
  }
}
class J {
  /**
  @internal
  */
  constructor(e, t) {
    this.doc = e, this.failed = t;
  }
  /**
  Create a successful step result.
  */
  static ok(e) {
    return new J(e, null);
  }
  /**
  Create a failed step result.
  */
  static fail(e) {
    return new J(null, e);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(e, t, r, s) {
    try {
      return J.ok(e.replace(t, r, s));
    } catch (i) {
      if (i instanceof cr)
        return J.fail(i.message);
      throw i;
    }
  }
}
function cl(n, e, t) {
  let r = [];
  for (let s = 0; s < n.childCount; s++) {
    let i = n.child(s);
    i.content.size && (i = i.copy(cl(i.content, e, i))), i.isInline && (i = e(i, t, s)), r.push(i);
  }
  return b.fromArray(r);
}
class ut extends de {
  /**
  Create a mark step.
  */
  constructor(e, t, r) {
    super(), this.from = e, this.to = t, this.mark = r;
  }
  apply(e) {
    let t = e.slice(this.from, this.to), r = e.resolve(this.from), s = r.node(r.sharedDepth(this.to)), i = new w(cl(t.content, (o, a) => !o.isAtom || !a.type.allowsMarkType(this.mark.type) ? o : o.mark(this.mark.addToSet(o.marks)), s), t.openStart, t.openEnd);
    return J.fromReplace(e, this.from, this.to, i);
  }
  invert() {
    return new $e(this.from, this.to, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return t.deleted && r.deleted || t.pos >= r.pos ? null : new ut(t.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof ut && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new ut(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new ut(t.from, t.to, e.markFromJSON(t.mark));
  }
}
de.jsonID("addMark", ut);
class $e extends de {
  /**
  Create a mark-removing step.
  */
  constructor(e, t, r) {
    super(), this.from = e, this.to = t, this.mark = r;
  }
  apply(e) {
    let t = e.slice(this.from, this.to), r = new w(cl(t.content, (s) => s.mark(this.mark.removeFromSet(s.marks)), e), t.openStart, t.openEnd);
    return J.fromReplace(e, this.from, this.to, r);
  }
  invert() {
    return new ut(this.from, this.to, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1);
    return t.deleted && r.deleted || t.pos >= r.pos ? null : new $e(t.pos, r.pos, this.mark);
  }
  merge(e) {
    return e instanceof $e && e.mark.eq(this.mark) && this.from <= e.to && this.to >= e.from ? new $e(Math.min(this.from, e.from), Math.max(this.to, e.to), this.mark) : null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new $e(t.from, t.to, e.markFromJSON(t.mark));
  }
}
de.jsonID("removeMark", $e);
class ht extends de {
  /**
  Create a node mark step.
  */
  constructor(e, t) {
    super(), this.pos = e, this.mark = t;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return J.fail("No node at mark step's position");
    let r = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
    return J.fromReplace(e, this.pos, this.pos + 1, new w(b.from(r), 0, t.isLeaf ? 0 : 1));
  }
  invert(e) {
    let t = e.nodeAt(this.pos);
    if (t) {
      let r = this.mark.addToSet(t.marks);
      if (r.length == t.marks.length) {
        for (let s = 0; s < t.marks.length; s++)
          if (!t.marks[s].isInSet(r))
            return new ht(this.pos, t.marks[s]);
        return new ht(this.pos, this.mark);
      }
    }
    return new Jt(this.pos, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new ht(t.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new ht(t.pos, e.markFromJSON(t.mark));
  }
}
de.jsonID("addNodeMark", ht);
class Jt extends de {
  /**
  Create a mark-removing step.
  */
  constructor(e, t) {
    super(), this.pos = e, this.mark = t;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return J.fail("No node at mark step's position");
    let r = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
    return J.fromReplace(e, this.pos, this.pos + 1, new w(b.from(r), 0, t.isLeaf ? 0 : 1));
  }
  invert(e) {
    let t = e.nodeAt(this.pos);
    return !t || !this.mark.isInSet(t.marks) ? this : new ht(this.pos, this.mark);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new Jt(t.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new Jt(t.pos, e.markFromJSON(t.mark));
  }
}
de.jsonID("removeNodeMark", Jt);
class K extends de {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(e, t, r, s = !1) {
    super(), this.from = e, this.to = t, this.slice = r, this.structure = s;
  }
  apply(e) {
    return this.structure && _a(e, this.from, this.to) ? J.fail("Structure replace would overwrite content") : J.fromReplace(e, this.from, this.to, this.slice);
  }
  getMap() {
    return new ke([this.from, this.to - this.from, this.slice.size]);
  }
  invert(e) {
    return new K(this.from, this.from + this.slice.size, e.slice(this.from, this.to));
  }
  map(e) {
    let t = e.mapResult(this.to, -1), r = this.from == this.to && K.MAP_BIAS < 0 ? t : e.mapResult(this.from, 1);
    return r.deletedAcross && t.deletedAcross ? null : new K(r.pos, Math.max(r.pos, t.pos), this.slice, this.structure);
  }
  merge(e) {
    if (!(e instanceof K) || e.structure || this.structure)
      return null;
    if (this.from + this.slice.size == e.from && !this.slice.openEnd && !e.slice.openStart) {
      let t = this.slice.size + e.slice.size == 0 ? w.empty : new w(this.slice.content.append(e.slice.content), this.slice.openStart, e.slice.openEnd);
      return new K(this.from, this.to + (e.to - e.from), t, this.structure);
    } else if (e.to == this.from && !this.slice.openStart && !e.slice.openEnd) {
      let t = this.slice.size + e.slice.size == 0 ? w.empty : new w(e.slice.content.append(this.slice.content), e.slice.openStart, this.slice.openEnd);
      return new K(e.from, this.to, t, this.structure);
    } else
      return null;
  }
  toJSON() {
    let e = { stepType: "replace", from: this.from, to: this.to };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new K(t.from, t.to, w.fromJSON(e, t.slice), !!t.structure);
  }
}
K.MAP_BIAS = 1;
de.jsonID("replace", K);
class ee extends de {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(e, t, r, s, i, o, a = !1) {
    super(), this.from = e, this.to = t, this.gapFrom = r, this.gapTo = s, this.slice = i, this.insert = o, this.structure = a;
  }
  apply(e) {
    if (this.structure && (_a(e, this.from, this.gapFrom) || _a(e, this.gapTo, this.to)))
      return J.fail("Structure gap-replace would overwrite content");
    let t = e.slice(this.gapFrom, this.gapTo);
    if (t.openStart || t.openEnd)
      return J.fail("Gap is not a flat range");
    let r = this.slice.insertAt(this.insert, t.content);
    return r ? J.fromReplace(e, this.from, this.to, r) : J.fail("Content does not fit in gap");
  }
  getMap() {
    return new ke([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(e) {
    let t = this.gapTo - this.gapFrom;
    return new ee(this.from, this.from + this.slice.size + t, this.from + this.insert, this.from + this.insert + t, e.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(e) {
    let t = e.mapResult(this.from, 1), r = e.mapResult(this.to, -1), s = this.from == this.gapFrom ? t.pos : e.map(this.gapFrom, -1), i = this.to == this.gapTo ? r.pos : e.map(this.gapTo, 1);
    return t.deletedAcross && r.deletedAcross || s < t.pos || i > r.pos ? null : new ee(t.pos, r.pos, s, i, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let e = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.from != "number" || typeof t.to != "number" || typeof t.gapFrom != "number" || typeof t.gapTo != "number" || typeof t.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new ee(t.from, t.to, t.gapFrom, t.gapTo, w.fromJSON(e, t.slice), t.insert, !!t.structure);
  }
}
de.jsonID("replaceAround", ee);
function _a(n, e, t) {
  let r = n.resolve(e), s = t - e, i = r.depth;
  for (; s > 0 && i > 0 && r.indexAfter(i) == r.node(i).childCount; )
    i--, s--;
  if (s > 0) {
    let o = r.node(i).maybeChild(r.indexAfter(i));
    for (; s > 0; ) {
      if (!o || o.isLeaf)
        return !0;
      o = o.firstChild, s--;
    }
  }
  return !1;
}
function fg(n, e, t, r) {
  let s = [], i = [], o, a;
  n.doc.nodesBetween(e, t, (l, c, d) => {
    if (!l.isInline)
      return;
    let u = l.marks;
    if (!r.isInSet(u) && d.type.allowsMarkType(r.type)) {
      let h = Math.max(c, e), f = Math.min(c + l.nodeSize, t), p = r.addToSet(u);
      for (let m = 0; m < u.length; m++)
        u[m].isInSet(p) || (o && o.to == h && o.mark.eq(u[m]) ? o.to = f : s.push(o = new $e(h, f, u[m])));
      a && a.to == h ? a.to = f : i.push(a = new ut(h, f, r));
    }
  }), s.forEach((l) => n.step(l)), i.forEach((l) => n.step(l));
}
function pg(n, e, t, r) {
  let s = [], i = 0;
  n.doc.nodesBetween(e, t, (o, a) => {
    if (!o.isInline)
      return;
    i++;
    let l = null;
    if (r instanceof vo) {
      let c = o.marks, d;
      for (; d = r.isInSet(c); )
        (l || (l = [])).push(d), c = d.removeFromSet(c);
    } else r ? r.isInSet(o.marks) && (l = [r]) : l = o.marks;
    if (l && l.length) {
      let c = Math.min(a + o.nodeSize, t);
      for (let d = 0; d < l.length; d++) {
        let u = l[d], h;
        for (let f = 0; f < s.length; f++) {
          let p = s[f];
          p.step == i - 1 && u.eq(s[f].style) && (h = p);
        }
        h ? (h.to = c, h.step = i) : s.push({ style: u, from: Math.max(a, e), to: c, step: i });
      }
    }
  }), s.forEach((o) => n.step(new $e(o.from, o.to, o.style)));
}
function dl(n, e, t, r = t.contentMatch, s = !0) {
  let i = n.doc.nodeAt(e), o = [], a = e + 1;
  for (let l = 0; l < i.childCount; l++) {
    let c = i.child(l), d = a + c.nodeSize, u = r.matchType(c.type);
    if (!u)
      o.push(new K(a, d, w.empty));
    else {
      r = u;
      for (let h = 0; h < c.marks.length; h++)
        t.allowsMarkType(c.marks[h].type) || n.step(new $e(a, d, c.marks[h]));
      if (s && c.isText && t.whitespace != "pre") {
        let h, f = /\r?\n|\r/g, p;
        for (; h = f.exec(c.text); )
          p || (p = new w(b.from(t.schema.text(" ", t.allowedMarks(c.marks))), 0, 0)), o.push(new K(a + h.index, a + h.index + h[0].length, p));
      }
    }
    a = d;
  }
  if (!r.validEnd) {
    let l = r.fillBefore(b.empty, !0);
    n.replace(a, a, new w(l, 0, 0));
  }
  for (let l = o.length - 1; l >= 0; l--)
    n.step(o[l]);
}
function mg(n, e, t) {
  return (e == 0 || n.canReplace(e, n.childCount)) && (t == n.childCount || n.canReplace(0, t));
}
function wn(n) {
  let t = n.parent.content.cutByIndex(n.startIndex, n.endIndex);
  for (let r = n.depth, s = 0, i = 0; ; --r) {
    let o = n.$from.node(r), a = n.$from.index(r) + s, l = n.$to.indexAfter(r) - i;
    if (r < n.depth && o.canReplace(a, l, t))
      return r;
    if (r == 0 || o.type.spec.isolating || !mg(o, a, l))
      break;
    a && (s = 1), l < o.childCount && (i = 1);
  }
  return null;
}
function gg(n, e, t) {
  let { $from: r, $to: s, depth: i } = e, o = r.before(i + 1), a = s.after(i + 1), l = o, c = a, d = b.empty, u = 0;
  for (let p = i, m = !1; p > t; p--)
    m || r.index(p) > 0 ? (m = !0, d = b.from(r.node(p).copy(d)), u++) : l--;
  let h = b.empty, f = 0;
  for (let p = i, m = !1; p > t; p--)
    m || s.after(p + 1) < s.end(p) ? (m = !0, h = b.from(s.node(p).copy(h)), f++) : c++;
  n.step(new ee(l, c, o, a, new w(d.append(h), u, f), d.size - u, !0));
}
function ul(n, e, t = null, r = n) {
  let s = yg(n, e), i = s && bg(r, e);
  return i ? s.map(Hc).concat({ type: e, attrs: t }).concat(i.map(Hc)) : null;
}
function Hc(n) {
  return { type: n, attrs: null };
}
function yg(n, e) {
  let { parent: t, startIndex: r, endIndex: s } = n, i = t.contentMatchAt(r).findWrapping(e);
  if (!i)
    return null;
  let o = i.length ? i[0] : e;
  return t.canReplaceWith(r, s, o) ? i : null;
}
function bg(n, e) {
  let { parent: t, startIndex: r, endIndex: s } = n, i = t.child(r), o = e.contentMatch.findWrapping(i.type);
  if (!o)
    return null;
  let l = (o.length ? o[o.length - 1] : e).contentMatch;
  for (let c = r; l && c < s; c++)
    l = l.matchType(t.child(c).type);
  return !l || !l.validEnd ? null : o;
}
function vg(n, e, t) {
  let r = b.empty;
  for (let o = t.length - 1; o >= 0; o--) {
    if (r.size) {
      let a = t[o].type.contentMatch.matchFragment(r);
      if (!a || !a.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    r = b.from(t[o].type.create(t[o].attrs, r));
  }
  let s = e.start, i = e.end;
  n.step(new ee(s, i, s, i, new w(r, 0, 0), t.length, !0));
}
function kg(n, e, t, r, s) {
  if (!r.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let i = n.steps.length;
  n.doc.nodesBetween(e, t, (o, a) => {
    let l = typeof s == "function" ? s(o) : s;
    if (o.isTextblock && !o.hasMarkup(r, l) && xg(n.doc, n.mapping.slice(i).map(a), r)) {
      let c = null;
      if (r.schema.linebreakReplacement) {
        let f = r.whitespace == "pre", p = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
        f && !p ? c = !1 : !f && p && (c = !0);
      }
      c === !1 && Xu(n, o, a, i), dl(n, n.mapping.slice(i).map(a, 1), r, void 0, c === null);
      let d = n.mapping.slice(i), u = d.map(a, 1), h = d.map(a + o.nodeSize, 1);
      return n.step(new ee(u, h, u + 1, h - 1, new w(b.from(r.create(l, null, o.marks)), 0, 0), 1, !0)), c === !0 && Yu(n, o, a, i), !1;
    }
  });
}
function Yu(n, e, t, r) {
  e.forEach((s, i) => {
    if (s.isText) {
      let o, a = /\r?\n|\r/g;
      for (; o = a.exec(s.text); ) {
        let l = n.mapping.slice(r).map(t + 1 + i + o.index);
        n.replaceWith(l, l + 1, e.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function Xu(n, e, t, r) {
  e.forEach((s, i) => {
    if (s.type == s.type.schema.linebreakReplacement) {
      let o = n.mapping.slice(r).map(t + 1 + i);
      n.replaceWith(o, o + 1, e.type.schema.text(`
`));
    }
  });
}
function xg(n, e, t) {
  let r = n.resolve(e), s = r.index();
  return r.parent.canReplaceWith(s, s + 1, t);
}
function wg(n, e, t, r, s) {
  let i = n.doc.nodeAt(e);
  if (!i)
    throw new RangeError("No node at given position");
  t || (t = i.type);
  let o = t.create(r, null, s || i.marks);
  if (i.isLeaf)
    return n.replaceWith(e, e + i.nodeSize, o);
  if (!t.validContent(i.content))
    throw new RangeError("Invalid content for node type " + t.name);
  n.step(new ee(e, e + i.nodeSize, e + 1, e + i.nodeSize - 1, new w(b.from(o), 0, 0), 1, !0));
}
function et(n, e, t = 1, r) {
  let s = n.resolve(e), i = s.depth - t, o = r && r[r.length - 1] || s.parent;
  if (i < 0 || s.parent.type.spec.isolating || !s.parent.canReplace(s.index(), s.parent.childCount) || !o.type.validContent(s.parent.content.cutByIndex(s.index(), s.parent.childCount)))
    return !1;
  for (let c = s.depth - 1, d = t - 2; c > i; c--, d--) {
    let u = s.node(c), h = s.index(c);
    if (u.type.spec.isolating)
      return !1;
    let f = u.content.cutByIndex(h, u.childCount), p = r && r[d + 1];
    p && (f = f.replaceChild(0, p.type.create(p.attrs)));
    let m = r && r[d] || u;
    if (!u.canReplace(h + 1, u.childCount) || !m.type.validContent(f))
      return !1;
  }
  let a = s.indexAfter(i), l = r && r[0];
  return s.node(i).canReplaceWith(a, a, l ? l.type : s.node(i + 1).type);
}
function Sg(n, e, t = 1, r) {
  let s = n.doc.resolve(e), i = b.empty, o = b.empty;
  for (let a = s.depth, l = s.depth - t, c = t - 1; a > l; a--, c--) {
    i = b.from(s.node(a).copy(i));
    let d = r && r[c];
    o = b.from(d ? d.type.create(d.attrs, o) : s.node(a).copy(o));
  }
  n.step(new K(e, e, new w(i.append(o), t, t), !0));
}
function Et(n, e) {
  let t = n.resolve(e), r = t.index();
  return Qu(t.nodeBefore, t.nodeAfter) && t.parent.canReplace(r, r + 1);
}
function Cg(n, e) {
  e.content.size || n.type.compatibleContent(e.type);
  let t = n.contentMatchAt(n.childCount), { linebreakReplacement: r } = n.type.schema;
  for (let s = 0; s < e.childCount; s++) {
    let i = e.child(s), o = i.type == r ? n.type.schema.nodes.text : i.type;
    if (t = t.matchType(o), !t || !n.type.allowsMarks(i.marks))
      return !1;
  }
  return t.validEnd;
}
function Qu(n, e) {
  return !!(n && e && !n.isLeaf && Cg(n, e));
}
function ko(n, e, t = -1) {
  let r = n.resolve(e);
  for (let s = r.depth; ; s--) {
    let i, o, a = r.index(s);
    if (s == r.depth ? (i = r.nodeBefore, o = r.nodeAfter) : t > 0 ? (i = r.node(s + 1), a++, o = r.node(s).maybeChild(a)) : (i = r.node(s).maybeChild(a - 1), o = r.node(s + 1)), i && !i.isTextblock && Qu(i, o) && r.node(s).canReplace(a, a + 1))
      return e;
    if (s == 0)
      break;
    e = t < 0 ? r.before(s) : r.after(s);
  }
}
function Mg(n, e, t) {
  let r = null, { linebreakReplacement: s } = n.doc.type.schema, i = n.doc.resolve(e - t), o = i.node().type;
  if (s && o.inlineContent) {
    let d = o.whitespace == "pre", u = !!o.contentMatch.matchType(s);
    d && !u ? r = !1 : !d && u && (r = !0);
  }
  let a = n.steps.length;
  if (r === !1) {
    let d = n.doc.resolve(e + t);
    Xu(n, d.node(), d.before(), a);
  }
  o.inlineContent && dl(n, e + t - 1, o, i.node().contentMatchAt(i.index()), r == null);
  let l = n.mapping.slice(a), c = l.map(e - t);
  if (n.step(new K(c, l.map(e + t, -1), w.empty, !0)), r === !0) {
    let d = n.doc.resolve(c);
    Yu(n, d.node(), d.before(), n.steps.length);
  }
  return n;
}
function Eg(n, e, t) {
  let r = n.resolve(e);
  if (r.parent.canReplaceWith(r.index(), r.index(), t))
    return e;
  if (r.parentOffset == 0)
    for (let s = r.depth - 1; s >= 0; s--) {
      let i = r.index(s);
      if (r.node(s).canReplaceWith(i, i, t))
        return r.before(s + 1);
      if (i > 0)
        return null;
    }
  if (r.parentOffset == r.parent.content.size)
    for (let s = r.depth - 1; s >= 0; s--) {
      let i = r.indexAfter(s);
      if (r.node(s).canReplaceWith(i, i, t))
        return r.after(s + 1);
      if (i < r.node(s).childCount)
        return null;
    }
  return null;
}
function Zu(n, e, t) {
  let r = n.resolve(e);
  if (!t.content.size)
    return e;
  let s = t.content;
  for (let i = 0; i < t.openStart; i++)
    s = s.firstChild.content;
  for (let i = 1; i <= (t.openStart == 0 && t.size ? 2 : 1); i++)
    for (let o = r.depth; o >= 0; o--) {
      let a = o == r.depth ? 0 : r.pos <= (r.start(o + 1) + r.end(o + 1)) / 2 ? -1 : 1, l = r.index(o) + (a > 0 ? 1 : 0), c = r.node(o), d = !1;
      if (i == 1)
        d = c.canReplace(l, l, s);
      else {
        let u = c.contentMatchAt(l).findWrapping(s.firstChild.type);
        d = u && c.canReplaceWith(l, l, u[0]);
      }
      if (d)
        return a == 0 ? r.pos : a < 0 ? r.before(o + 1) : r.after(o + 1);
    }
  return null;
}
function xo(n, e, t = e, r = w.empty) {
  if (e == t && !r.size)
    return null;
  let s = n.resolve(e), i = n.resolve(t);
  return eh(s, i, r) ? new K(e, t, r) : new Tg(s, i, r).fit();
}
function eh(n, e, t) {
  return !t.openStart && !t.openEnd && n.start() == e.start() && n.parent.canReplace(n.index(), e.index(), t.content);
}
class Tg {
  constructor(e, t, r) {
    this.$from = e, this.$to = t, this.unplaced = r, this.frontier = [], this.placed = b.empty;
    for (let s = 0; s <= e.depth; s++) {
      let i = e.node(s);
      this.frontier.push({
        type: i.type,
        match: i.contentMatchAt(e.indexAfter(s))
      });
    }
    for (let s = e.depth; s > 0; s--)
      this.placed = b.from(e.node(s).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    for (; this.unplaced.size; ) {
      let c = this.findFittable();
      c ? this.placeNodes(c) : this.openMore() || this.dropNode();
    }
    let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, r = this.$from, s = this.close(e < 0 ? this.$to : r.doc.resolve(e));
    if (!s)
      return null;
    let i = this.placed, o = r.depth, a = s.depth;
    for (; o && a && i.childCount == 1; )
      i = i.firstChild.content, o--, a--;
    let l = new w(i, o, a);
    return e > -1 ? new ee(r.pos, e, this.$to.pos, this.$to.end(), l, t) : l.size || r.pos != this.$to.pos ? new K(r.pos, s.pos, l) : null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let e = this.unplaced.openStart;
    for (let t = this.unplaced.content, r = 0, s = this.unplaced.openEnd; r < e; r++) {
      let i = t.firstChild;
      if (t.childCount > 1 && (s = 0), i.type.spec.isolating && s <= r) {
        e = r;
        break;
      }
      t = i.content;
    }
    for (let t = 1; t <= 2; t++)
      for (let r = t == 1 ? e : this.unplaced.openStart; r >= 0; r--) {
        let s, i = null;
        r ? (i = Go(this.unplaced.content, r - 1).firstChild, s = i.content) : s = this.unplaced.content;
        let o = s.firstChild;
        for (let a = this.depth; a >= 0; a--) {
          let { type: l, match: c } = this.frontier[a], d, u = null;
          if (t == 1 && (o ? c.matchType(o.type) || (u = c.fillBefore(b.from(o), !1)) : i && l.compatibleContent(i.type)))
            return { sliceDepth: r, frontierDepth: a, parent: i, inject: u };
          if (t == 2 && o && (d = c.findWrapping(o.type)))
            return { sliceDepth: r, frontierDepth: a, parent: i, wrap: d };
          if (i && c.matchType(i.type))
            break;
        }
      }
  }
  openMore() {
    let { content: e, openStart: t, openEnd: r } = this.unplaced, s = Go(e, t);
    return !s.childCount || s.firstChild.isLeaf ? !1 : (this.unplaced = new w(e, t + 1, Math.max(r, s.size + t >= e.size - r ? t + 1 : 0)), !0);
  }
  dropNode() {
    let { content: e, openStart: t, openEnd: r } = this.unplaced, s = Go(e, t);
    if (s.childCount <= 1 && t > 0) {
      let i = e.size - t <= t + s.size;
      this.unplaced = new w(zn(e, t - 1, 1), t - 1, i ? t - 1 : r);
    } else
      this.unplaced = new w(zn(e, t, 1), t, r);
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth: e, frontierDepth: t, parent: r, inject: s, wrap: i }) {
    for (; this.depth > t; )
      this.closeFrontierNode();
    if (i)
      for (let m = 0; m < i.length; m++)
        this.openFrontierNode(i[m]);
    let o = this.unplaced, a = r ? r.content : o.content, l = o.openStart - e, c = 0, d = [], { match: u, type: h } = this.frontier[t];
    if (s) {
      for (let m = 0; m < s.childCount; m++)
        d.push(s.child(m));
      u = u.matchFragment(s);
    }
    let f = a.size + e - (o.content.size - o.openEnd);
    for (; c < a.childCount; ) {
      let m = a.child(c), g = u.matchType(m.type);
      if (!g)
        break;
      c++, (c > 1 || l == 0 || m.content.size) && (u = g, d.push(th(m.mark(h.allowedMarks(m.marks)), c == 1 ? l : 0, c == a.childCount ? f : -1)));
    }
    let p = c == a.childCount;
    p || (f = -1), this.placed = Bn(this.placed, t, b.from(d)), this.frontier[t].match = u, p && f < 0 && r && r.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
    for (let m = 0, g = a; m < f; m++) {
      let y = g.lastChild;
      this.frontier.push({ type: y.type, match: y.contentMatchAt(y.childCount) }), g = y.content;
    }
    this.unplaced = p ? e == 0 ? w.empty : new w(zn(o.content, e - 1, 1), e - 1, f < 0 ? o.openEnd : e - 1) : new w(zn(o.content, e, c), o.openStart, o.openEnd);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let e = this.frontier[this.depth], t;
    if (!e.type.isTextblock || !Yo(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth)
      return -1;
    let { depth: r } = this.$to, s = this.$to.after(r);
    for (; r > 1 && s == this.$to.end(--r); )
      ++s;
    return s;
  }
  findCloseLevel(e) {
    e: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
      let { match: r, type: s } = this.frontier[t], i = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), o = Yo(e, t, s, r, i);
      if (o) {
        for (let a = t - 1; a >= 0; a--) {
          let { match: l, type: c } = this.frontier[a], d = Yo(e, a, c, l, !0);
          if (!d || d.childCount)
            continue e;
        }
        return { depth: t, fit: o, move: i ? e.doc.resolve(e.after(t + 1)) : e };
      }
    }
  }
  close(e) {
    let t = this.findCloseLevel(e);
    if (!t)
      return null;
    for (; this.depth > t.depth; )
      this.closeFrontierNode();
    t.fit.childCount && (this.placed = Bn(this.placed, t.depth, t.fit)), e = t.move;
    for (let r = t.depth + 1; r <= e.depth; r++) {
      let s = e.node(r), i = s.type.contentMatch.fillBefore(s.content, !0, e.index(r));
      this.openFrontierNode(s.type, s.attrs, i);
    }
    return e;
  }
  openFrontierNode(e, t = null, r) {
    let s = this.frontier[this.depth];
    s.match = s.match.matchType(e), this.placed = Bn(this.placed, this.depth, b.from(e.create(t, r))), this.frontier.push({ type: e, match: e.contentMatch });
  }
  closeFrontierNode() {
    let t = this.frontier.pop().match.fillBefore(b.empty, !0);
    t.childCount && (this.placed = Bn(this.placed, this.frontier.length, t));
  }
}
function zn(n, e, t) {
  return e == 0 ? n.cutByIndex(t, n.childCount) : n.replaceChild(0, n.firstChild.copy(zn(n.firstChild.content, e - 1, t)));
}
function Bn(n, e, t) {
  return e == 0 ? n.append(t) : n.replaceChild(n.childCount - 1, n.lastChild.copy(Bn(n.lastChild.content, e - 1, t)));
}
function Go(n, e) {
  for (let t = 0; t < e; t++)
    n = n.firstChild.content;
  return n;
}
function th(n, e, t) {
  if (e <= 0)
    return n;
  let r = n.content;
  return e > 1 && (r = r.replaceChild(0, th(r.firstChild, e - 1, r.childCount == 1 ? t - 1 : 0))), e > 0 && (r = n.type.contentMatch.fillBefore(r).append(r), t <= 0 && (r = r.append(n.type.contentMatch.matchFragment(r).fillBefore(b.empty, !0)))), n.copy(r);
}
function Yo(n, e, t, r, s) {
  let i = n.node(e), o = s ? n.indexAfter(e) : n.index(e);
  if (o == i.childCount && !t.compatibleContent(i.type))
    return null;
  let a = r.fillBefore(i.content, !0, o);
  return a && !Ag(t, i.content, o) ? a : null;
}
function Ag(n, e, t) {
  for (let r = t; r < e.childCount; r++)
    if (!n.allowsMarks(e.child(r).marks))
      return !0;
  return !1;
}
function _g(n) {
  return n.spec.defining || n.spec.definingForContent;
}
function Og(n, e, t, r) {
  if (!r.size)
    return n.deleteRange(e, t);
  let s = n.doc.resolve(e), i = n.doc.resolve(t);
  if (eh(s, i, r))
    return n.step(new K(e, t, r));
  let o = rh(s, i);
  o[o.length - 1] == 0 && o.pop();
  let a = -(s.depth + 1);
  o.unshift(a);
  for (let h = s.depth, f = s.pos - 1; h > 0; h--, f--) {
    let p = s.node(h).type.spec;
    if (p.defining || p.definingAsContext || p.isolating)
      break;
    o.indexOf(h) > -1 ? a = h : s.before(h) == f && o.splice(1, 0, -h);
  }
  let l = o.indexOf(a), c = [], d = r.openStart;
  for (let h = r.content, f = 0; ; f++) {
    let p = h.firstChild;
    if (c.push(p), f == r.openStart)
      break;
    h = p.content;
  }
  for (let h = d - 1; h >= 0; h--) {
    let f = c[h], p = _g(f.type);
    if (p && !f.sameMarkup(s.node(Math.abs(a) - 1)))
      d = h;
    else if (p || !f.type.isTextblock)
      break;
  }
  for (let h = r.openStart; h >= 0; h--) {
    let f = (h + d + 1) % (r.openStart + 1), p = c[f];
    if (p)
      for (let m = 0; m < o.length; m++) {
        let g = o[(m + l) % o.length], y = !0;
        g < 0 && (y = !1, g = -g);
        let k = s.node(g - 1), C = s.index(g - 1);
        if (k.canReplaceWith(C, C, p.type, p.marks))
          return n.replace(s.before(g), y ? i.after(g) : t, new w(nh(r.content, 0, r.openStart, f), f, r.openEnd));
      }
  }
  let u = n.steps.length;
  for (let h = o.length - 1; h >= 0 && (n.replace(e, t, r), !(n.steps.length > u)); h--) {
    let f = o[h];
    f < 0 || (e = s.before(f), t = i.after(f));
  }
}
function nh(n, e, t, r, s) {
  if (e < t) {
    let i = n.firstChild;
    n = n.replaceChild(0, i.copy(nh(i.content, e + 1, t, r, i)));
  }
  if (e > r) {
    let i = s.contentMatchAt(0), o = i.fillBefore(n).append(n);
    n = o.append(i.matchFragment(o).fillBefore(b.empty, !0));
  }
  return n;
}
function Ng(n, e, t, r) {
  if (!r.isInline && e == t && n.doc.resolve(e).parent.content.size) {
    let s = Eg(n.doc, e, r.type);
    s != null && (e = t = s);
  }
  n.replaceRange(e, t, new w(b.from(r), 0, 0));
}
function $g(n, e, t) {
  let r = n.doc.resolve(e), s = n.doc.resolve(t);
  if (r.parent.isTextblock && s.parent.isTextblock && r.start() != s.start() && r.parentOffset == 0 && s.parentOffset == 0) {
    let o = r.sharedDepth(t), a = !1;
    for (let l = r.depth; l > o; l--)
      r.node(l).type.spec.isolating && (a = !0);
    for (let l = s.depth; l > o; l--)
      s.node(l).type.spec.isolating && (a = !0);
    if (!a) {
      for (let l = r.depth; l > 0 && e == r.start(l); l--)
        e = r.before(l);
      for (let l = s.depth; l > 0 && t == s.start(l); l--)
        t = s.before(l);
      r = n.doc.resolve(e), s = n.doc.resolve(t);
    }
  }
  let i = rh(r, s);
  for (let o = 0; o < i.length; o++) {
    let a = i[o], l = o == i.length - 1;
    if (l && a == 0 || r.node(a).type.contentMatch.validEnd)
      return n.delete(r.start(a), s.end(a));
    if (a > 0 && (l || r.node(a - 1).canReplace(r.index(a - 1), s.indexAfter(a - 1))))
      return n.delete(r.before(a), s.after(a));
  }
  for (let o = 1; o <= r.depth && o <= s.depth; o++)
    if (e - r.start(o) == r.depth - o && t > r.end(o) && s.end(o) - t != s.depth - o && r.start(o - 1) == s.start(o - 1) && r.node(o - 1).canReplace(r.index(o - 1), s.index(o - 1)))
      return n.delete(r.before(o), t);
  n.delete(e, t);
}
function rh(n, e) {
  let t = [], r = Math.min(n.depth, e.depth);
  for (let s = r; s >= 0; s--) {
    let i = n.start(s);
    if (i < n.pos - (n.depth - s) || e.end(s) > e.pos + (e.depth - s) || n.node(s).type.spec.isolating || e.node(s).type.spec.isolating)
      break;
    (i == e.start(s) || s == n.depth && s == e.depth && n.parent.inlineContent && e.parent.inlineContent && s && e.start(s - 1) == i - 1) && t.push(s);
  }
  return t;
}
class dn extends de {
  /**
  Construct an attribute step.
  */
  constructor(e, t, r) {
    super(), this.pos = e, this.attr = t, this.value = r;
  }
  apply(e) {
    let t = e.nodeAt(this.pos);
    if (!t)
      return J.fail("No node at attribute step's position");
    let r = /* @__PURE__ */ Object.create(null);
    for (let i in t.attrs)
      r[i] = t.attrs[i];
    r[this.attr] = this.value;
    let s = t.type.create(r, null, t.marks);
    return J.fromReplace(e, this.pos, this.pos + 1, new w(b.from(s), 0, t.isLeaf ? 0 : 1));
  }
  getMap() {
    return ke.empty;
  }
  invert(e) {
    return new dn(this.pos, this.attr, e.nodeAt(this.pos).attrs[this.attr]);
  }
  map(e) {
    let t = e.mapResult(this.pos, 1);
    return t.deletedAfter ? null : new dn(t.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(e, t) {
    if (typeof t.pos != "number" || typeof t.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new dn(t.pos, t.attr, t.value);
  }
}
de.jsonID("attr", dn);
class fr extends de {
  /**
  Construct an attribute step.
  */
  constructor(e, t) {
    super(), this.attr = e, this.value = t;
  }
  apply(e) {
    let t = /* @__PURE__ */ Object.create(null);
    for (let s in e.attrs)
      t[s] = e.attrs[s];
    t[this.attr] = this.value;
    let r = e.type.create(t, e.content, e.marks);
    return J.ok(r);
  }
  getMap() {
    return ke.empty;
  }
  invert(e) {
    return new fr(this.attr, e.attrs[this.attr]);
  }
  map(e) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(e, t) {
    if (typeof t.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new fr(t.attr, t.value);
  }
}
de.jsonID("docAttr", fr);
let fn = class extends Error {
};
fn = function n(e) {
  let t = Error.call(this, e);
  return t.__proto__ = n.prototype, t;
};
fn.prototype = Object.create(Error.prototype);
fn.prototype.constructor = fn;
fn.prototype.name = "TransformError";
class sh {
  /**
  Create a transform that starts with the given document.
  */
  constructor(e) {
    this.doc = e, this.steps = [], this.docs = [], this.mapping = new hr();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(e) {
    let t = this.maybeStep(e);
    if (t.failed)
      throw new fn(t.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(e) {
    let t = e.apply(this.doc);
    return t.failed || this.addStep(e, t.doc), t;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  Return a single range, in post-transform document positions,
  that covers all content changed by this transform. Returns null
  if no replacements are made. Note that this will ignore changes
  that add/remove marks without replacing the underlying content.
  */
  changedRange() {
    let e = 1e9, t = -1e9;
    for (let r = 0; r < this.mapping.maps.length; r++) {
      let s = this.mapping.maps[r];
      r && (e = s.map(e, 1), t = s.map(t, -1)), s.forEach((i, o, a, l) => {
        e = Math.min(e, a), t = Math.max(t, l);
      });
    }
    return e == 1e9 ? null : { from: e, to: t };
  }
  /**
  @internal
  */
  addStep(e, t) {
    this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(e, t = e, r = w.empty) {
    let s = xo(this.doc, e, t, r);
    return s && this.step(s), this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(e, t, r) {
    return this.replace(e, t, new w(b.from(r), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(e, t) {
    return this.replace(e, t, w.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(e, t) {
    return this.replaceWith(e, e, t);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
  
  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(e, t, r) {
    return Og(this, e, t, r), this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(e, t, r) {
    return Ng(this, e, t, r), this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(e, t) {
    return $g(this, e, t), this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(e, t) {
    return gg(this, e, t), this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(e, t = 1) {
    return Mg(this, e, t), this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(e, t) {
    return vg(this, e, t), this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(e, t = e, r, s = null) {
    return kg(this, e, t, r, s), this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(e, t, r = null, s) {
    return wg(this, e, t, r, s), this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(e, t, r) {
    return this.step(new dn(e, t, r)), this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(e, t) {
    return this.step(new fr(e, t)), this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(e, t) {
    return this.step(new ht(e, t)), this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(e, t) {
    let r = this.doc.nodeAt(e);
    if (!r)
      throw new RangeError("No node at position " + e);
    if (t instanceof L)
      t.isInSet(r.marks) && this.step(new Jt(e, t));
    else {
      let s = r.marks, i, o = [];
      for (; i = t.isInSet(s); )
        o.push(new Jt(e, i)), s = i.removeFromSet(s);
      for (let a = o.length - 1; a >= 0; a--)
        this.step(o[a]);
    }
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split (with the outermost nodes coming first).
  */
  split(e, t = 1, r) {
    return Sg(this, e, t, r), this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(e, t, r) {
    return fg(this, e, t, r), this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(e, t, r) {
    return pg(this, e, t, r), this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(e, t, r) {
    return dl(this, e, t, r), this;
  }
}
const Xo = /* @__PURE__ */ Object.create(null);
class $ {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor(e, t, r) {
    this.$anchor = e, this.$head = t, this.ranges = r || [new Ig(e.min(t), e.max(t))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let e = this.ranges;
    for (let t = 0; t < e.length; t++)
      if (e[t].$from.pos != e[t].$to.pos)
        return !1;
    return !0;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, !0);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(e, t = w.empty) {
    let r = t.content.lastChild, s = null;
    for (let a = 0; a < t.openEnd; a++)
      s = r, r = r.lastChild;
    let i = e.steps.length, o = this.ranges;
    for (let a = 0; a < o.length; a++) {
      let { $from: l, $to: c } = o[a], d = e.mapping.slice(i);
      e.replaceRange(d.map(l.pos), d.map(c.pos), a ? w.empty : t), a == 0 && jc(e, i, (r ? r.isInline : s && s.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(e, t) {
    let r = e.steps.length, s = this.ranges;
    for (let i = 0; i < s.length; i++) {
      let { $from: o, $to: a } = s[i], l = e.mapping.slice(r), c = l.map(o.pos), d = l.map(a.pos);
      i ? e.deleteRange(c, d) : (e.replaceRangeWith(c, d, t), jc(e, r, t.isInline ? -1 : 1));
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom(e, t, r = !1) {
    let s = e.parent.inlineContent ? new O(e) : sn(e.node(0), e.parent, e.pos, e.index(), t, r);
    if (s)
      return s;
    for (let i = e.depth - 1; i >= 0; i--) {
      let o = t < 0 ? sn(e.node(0), e.node(i), e.before(i + 1), e.index(i), t, r) : sn(e.node(0), e.node(i), e.after(i + 1), e.index(i) + 1, t, r);
      if (o)
        return o;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near(e, t = 1) {
    return this.findFrom(e, t) || this.findFrom(e, -t) || new xe(e.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(e) {
    return sn(e, e, 0, 0, 1) || new xe(e);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(e) {
    return sn(e, e, e.content.size, e.childCount, -1) || new xe(e);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(e, t) {
    if (!t || !t.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let r = Xo[t.type];
    if (!r)
      throw new RangeError(`No selection type ${t.type} defined`);
    return r.fromJSON(e, t);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(e, t) {
    if (e in Xo)
      throw new RangeError("Duplicate use of selection JSON ID " + e);
    return Xo[e] = t, t.prototype.jsonID = e, t;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return O.between(this.$anchor, this.$head).getBookmark();
  }
}
$.prototype.visible = !0;
class Ig {
  /**
  Create a range.
  */
  constructor(e, t) {
    this.$from = e, this.$to = t;
  }
}
let Vc = !1;
function Wc(n) {
  !Vc && !n.parent.inlineContent && (Vc = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + n.parent.type.name + ")"));
}
class O extends $ {
  /**
  Construct a text selection between the given points.
  */
  constructor(e, t = e) {
    Wc(e), Wc(t), super(e, t);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(e, t) {
    let r = e.resolve(t.map(this.head));
    if (!r.parent.inlineContent)
      return $.near(r);
    let s = e.resolve(t.map(this.anchor));
    return new O(s.parent.inlineContent ? s : r, r);
  }
  replace(e, t = w.empty) {
    if (super.replace(e, t), t == w.empty) {
      let r = this.$from.marksAcross(this.$to);
      r && e.ensureMarks(r);
    }
  }
  eq(e) {
    return e instanceof O && e.anchor == this.anchor && e.head == this.head;
  }
  getBookmark() {
    return new wo(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.anchor != "number" || typeof t.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new O(e.resolve(t.anchor), e.resolve(t.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(e, t, r = t) {
    let s = e.resolve(t);
    return new this(s, r == t ? s : e.resolve(r));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between(e, t, r) {
    let s = e.pos - t.pos;
    if ((!r || s) && (r = s >= 0 ? 1 : -1), !t.parent.inlineContent) {
      let i = $.findFrom(t, r, !0) || $.findFrom(t, -r, !0);
      if (i)
        t = i.$head;
      else
        return $.near(t, r);
    }
    return e.parent.inlineContent || (s == 0 ? e = t : (e = ($.findFrom(e, -r, !0) || $.findFrom(e, r, !0)).$anchor, e.pos < t.pos != s < 0 && (e = t))), new O(e, t);
  }
}
$.jsonID("text", O);
class wo {
  constructor(e, t) {
    this.anchor = e, this.head = t;
  }
  map(e) {
    return new wo(e.map(this.anchor), e.map(this.head));
  }
  resolve(e) {
    return O.between(e.resolve(this.anchor), e.resolve(this.head));
  }
}
class _ extends $ {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor(e) {
    let t = e.nodeAfter, r = e.node(0).resolve(e.pos + t.nodeSize);
    super(e, r), this.node = t;
  }
  map(e, t) {
    let { deleted: r, pos: s } = t.mapResult(this.anchor), i = e.resolve(s);
    return r ? $.near(i) : new _(i);
  }
  content() {
    return new w(b.from(this.node), 0, 0);
  }
  eq(e) {
    return e instanceof _ && e.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new hl(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new _(e.resolve(t.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(e, t) {
    return new _(e.resolve(t));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(e) {
    return !e.isText && e.type.spec.selectable !== !1;
  }
}
_.prototype.visible = !1;
$.jsonID("node", _);
class hl {
  constructor(e) {
    this.anchor = e;
  }
  map(e) {
    let { deleted: t, pos: r } = e.mapResult(this.anchor);
    return t ? new wo(r, r) : new hl(r);
  }
  resolve(e) {
    let t = e.resolve(this.anchor), r = t.nodeAfter;
    return r && _.isSelectable(r) ? new _(t) : $.near(t);
  }
}
class xe extends $ {
  /**
  Create an all-selection over the given document.
  */
  constructor(e) {
    super(e.resolve(0), e.resolve(e.content.size));
  }
  replace(e, t = w.empty) {
    if (t == w.empty) {
      e.delete(0, e.doc.content.size);
      let r = $.atStart(e.doc);
      r.eq(e.selection) || e.setSelection(r);
    } else
      super.replace(e, t);
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(e) {
    return new xe(e);
  }
  map(e) {
    return new xe(e);
  }
  eq(e) {
    return e instanceof xe;
  }
  getBookmark() {
    return Dg;
  }
}
$.jsonID("all", xe);
const Dg = {
  map() {
    return this;
  },
  resolve(n) {
    return new xe(n);
  }
};
function sn(n, e, t, r, s, i = !1) {
  if (e.inlineContent)
    return O.create(n, t);
  for (let o = r - (s > 0 ? 0 : 1); s > 0 ? o < e.childCount : o >= 0; o += s) {
    let a = e.child(o);
    if (a.isAtom) {
      if (!i && _.isSelectable(a))
        return _.create(n, t - (s < 0 ? a.nodeSize : 0));
    } else {
      let l = sn(n, a, t + s, s < 0 ? a.childCount : 0, s, i);
      if (l)
        return l;
    }
    t += a.nodeSize * s;
  }
  return null;
}
function jc(n, e, t) {
  let r = n.steps.length - 1;
  if (r < e)
    return;
  let s = n.steps[r];
  if (!(s instanceof K || s instanceof ee))
    return;
  let i = n.mapping.maps[r], o;
  i.forEach((a, l, c, d) => {
    o == null && (o = d);
  }), n.setSelection($.near(n.doc.resolve(o), t));
}
const qc = 1, ts = 2, Uc = 4;
class Pg extends sh {
  /**
  @internal
  */
  constructor(e) {
    super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = /* @__PURE__ */ Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(e) {
    if (e.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | qc) & ~ts, this.storedMarks = null, this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & qc) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(e) {
    return this.storedMarks = e, this.updated |= ts, this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(e) {
    return L.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(e) {
    return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(e) {
    return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & ts) > 0;
  }
  /**
  @internal
  */
  addStep(e, t) {
    super.addStep(e, t), this.updated = this.updated & ~ts, this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(e) {
    return this.time = e, this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(e) {
    return this.selection.replace(this, e), this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(e, t = !0) {
    let r = this.selection;
    return t && (e = e.mark(this.storedMarks || (r.empty ? r.$from.marks() : r.$from.marksAcross(r.$to) || L.none))), r.replaceWith(this, e), this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    return this.selection.replace(this), this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(e, t, r) {
    let s = this.doc.type.schema;
    if (t == null)
      return e ? this.replaceSelectionWith(s.text(e), !0) : this.deleteSelection();
    {
      if (r == null && (r = t), !e)
        return this.deleteRange(t, r);
      let i = this.storedMarks;
      if (!i) {
        let o = this.doc.resolve(t);
        i = r == t ? o.marks() : o.marksAcross(this.doc.resolve(r));
      }
      return this.replaceRangeWith(t, r, s.text(e, i)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection($.near(this.selection.$to)), this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(e, t) {
    return this.meta[typeof e == "string" ? e : e.key] = t, this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(e) {
    return this.meta[typeof e == "string" ? e : e.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let e in this.meta)
      return !1;
    return !0;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    return this.updated |= Uc, this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & Uc) > 0;
  }
}
function Kc(n, e) {
  return !e || !n ? n : n.bind(e);
}
class Fn {
  constructor(e, t, r) {
    this.name = e, this.init = Kc(t.init, r), this.apply = Kc(t.apply, r);
  }
}
const Rg = [
  new Fn("doc", {
    init(n) {
      return n.doc || n.schema.topNodeType.createAndFill();
    },
    apply(n) {
      return n.doc;
    }
  }),
  new Fn("selection", {
    init(n, e) {
      return n.selection || $.atStart(e.doc);
    },
    apply(n) {
      return n.selection;
    }
  }),
  new Fn("storedMarks", {
    init(n) {
      return n.storedMarks || null;
    },
    apply(n, e, t, r) {
      return r.selection.$cursor ? n.storedMarks : null;
    }
  }),
  new Fn("scrollToSelection", {
    init() {
      return 0;
    },
    apply(n, e) {
      return n.scrolledIntoView ? e + 1 : e;
    }
  })
];
class Qo {
  constructor(e, t) {
    this.schema = e, this.plugins = [], this.pluginsByKey = /* @__PURE__ */ Object.create(null), this.fields = Rg.slice(), t && t.forEach((r) => {
      if (this.pluginsByKey[r.key])
        throw new RangeError("Adding different instances of a keyed plugin (" + r.key + ")");
      this.plugins.push(r), this.pluginsByKey[r.key] = r, r.spec.state && this.fields.push(new Fn(r.key, r.spec.state, r));
    });
  }
}
class $t {
  /**
  @internal
  */
  constructor(e) {
    this.config = e;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(e) {
    return this.applyTransaction(e).state;
  }
  /**
  @internal
  */
  filterTransaction(e, t = -1) {
    for (let r = 0; r < this.config.plugins.length; r++)
      if (r != t) {
        let s = this.config.plugins[r];
        if (s.spec.filterTransaction && !s.spec.filterTransaction.call(s, e, this))
          return !1;
      }
    return !0;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(e) {
    if (!this.filterTransaction(e))
      return { state: this, transactions: [] };
    let t = [e], r = this.applyInner(e), s = null;
    for (; ; ) {
      let i = !1;
      for (let o = 0; o < this.config.plugins.length; o++) {
        let a = this.config.plugins[o];
        if (a.spec.appendTransaction) {
          let l = s ? s[o].n : 0, c = s ? s[o].state : this, d = l < t.length && a.spec.appendTransaction.call(a, l ? t.slice(l) : t, c, r);
          if (d && r.filterTransaction(d, o)) {
            if (d.setMeta("appendedTransaction", e), !s) {
              s = [];
              for (let u = 0; u < this.config.plugins.length; u++)
                s.push(u < o ? { state: r, n: t.length } : { state: this, n: 0 });
            }
            t.push(d), r = r.applyInner(d), i = !0;
          }
          s && (s[o] = { state: r, n: t.length });
        }
      }
      if (!i)
        return { state: r, transactions: t };
    }
  }
  /**
  @internal
  */
  applyInner(e) {
    if (!e.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let t = new $t(this.config), r = this.config.fields;
    for (let s = 0; s < r.length; s++) {
      let i = r[s];
      t[i.name] = i.apply(e, this[i.name], this, t);
    }
    return t;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Pg(this);
  }
  /**
  Create a new state.
  */
  static create(e) {
    let t = new Qo(e.doc ? e.doc.type.schema : e.schema, e.plugins), r = new $t(t);
    for (let s = 0; s < t.fields.length; s++)
      r[t.fields[s].name] = t.fields[s].init(e, r);
    return r;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(e) {
    let t = new Qo(this.schema, e.plugins), r = t.fields, s = new $t(t);
    for (let i = 0; i < r.length; i++) {
      let o = r[i].name;
      s[o] = this.hasOwnProperty(o) ? this[o] : r[i].init(e, s);
    }
    return s;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(e) {
    let t = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks && (t.storedMarks = this.storedMarks.map((r) => r.toJSON())), e && typeof e == "object")
      for (let r in e) {
        if (r == "doc" || r == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let s = e[r], i = s.spec.state;
        i && i.toJSON && (t[r] = i.toJSON.call(s, this[s.key]));
      }
    return t;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(e, t, r) {
    if (!t)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!e.schema)
      throw new RangeError("Required config field 'schema' missing");
    let s = new Qo(e.schema, e.plugins), i = new $t(s);
    return s.fields.forEach((o) => {
      if (o.name == "doc")
        i.doc = Ie.fromJSON(e.schema, t.doc);
      else if (o.name == "selection")
        i.selection = $.fromJSON(i.doc, t.selection);
      else if (o.name == "storedMarks")
        t.storedMarks && (i.storedMarks = t.storedMarks.map(e.schema.markFromJSON));
      else {
        if (r)
          for (let a in r) {
            let l = r[a], c = l.spec.state;
            if (l.key == o.name && c && c.fromJSON && Object.prototype.hasOwnProperty.call(t, a)) {
              i[o.name] = c.fromJSON.call(l, e, t[a], i);
              return;
            }
          }
        i[o.name] = o.init(e, i);
      }
    }), i;
  }
}
function ih(n, e, t) {
  for (let r in n) {
    let s = n[r];
    s instanceof Function ? s = s.bind(e) : r == "handleDOMEvents" && (s = ih(s, e, {})), t[r] = s;
  }
  return t;
}
class F {
  /**
  Create a plugin.
  */
  constructor(e) {
    this.spec = e, this.props = {}, e.props && ih(e.props, this, this.props), this.key = e.key ? e.key.key : oh("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const Zo = /* @__PURE__ */ Object.create(null);
function oh(n) {
  return n in Zo ? n + "$" + ++Zo[n] : (Zo[n] = 0, n + "$");
}
class X {
  /**
  Create a plugin key.
  */
  constructor(e = "key") {
    this.key = oh(e);
  }
  /**
  Get the active plugin with this key, if any, from an editor
  state.
  */
  get(e) {
    return e.config.pluginsByKey[this.key];
  }
  /**
  Get the plugin's state from an editor state.
  */
  getState(e) {
    return e[this.key];
  }
}
const ah = (n, e) => n.selection.empty ? !1 : (e && e(n.tr.deleteSelection().scrollIntoView()), !0);
function lh(n, e) {
  let { $cursor: t } = n.selection;
  return !t || (e ? !e.endOfTextblock("backward", n) : t.parentOffset > 0) ? null : t;
}
const ch = (n, e, t) => {
  let r = lh(n, t);
  if (!r)
    return !1;
  let s = fl(r);
  if (!s) {
    let o = r.blockRange(), a = o && wn(o);
    return a == null ? !1 : (e && e(n.tr.lift(o, a).scrollIntoView()), !0);
  }
  let i = s.nodeBefore;
  if (bh(n, s, e, -1))
    return !0;
  if (r.parent.content.size == 0 && (pn(i, "end") || _.isSelectable(i)))
    for (let o = r.depth; ; o--) {
      let a = xo(n.doc, r.before(o), r.after(o), w.empty);
      if (a && a.slice.size < a.to - a.from) {
        if (e) {
          let l = n.tr.step(a);
          l.setSelection(pn(i, "end") ? $.findFrom(l.doc.resolve(l.mapping.map(s.pos, -1)), -1) : _.create(l.doc, s.pos - i.nodeSize)), e(l.scrollIntoView());
        }
        return !0;
      }
      if (o == 1 || r.node(o - 1).childCount > 1)
        break;
    }
  return i.isAtom && s.depth == r.depth - 1 ? (e && e(n.tr.delete(s.pos - i.nodeSize, s.pos).scrollIntoView()), !0) : !1;
}, Lg = (n, e, t) => {
  let r = lh(n, t);
  if (!r)
    return !1;
  let s = fl(r);
  return s ? dh(n, s, e) : !1;
}, zg = (n, e, t) => {
  let r = hh(n, t);
  if (!r)
    return !1;
  let s = pl(r);
  return s ? dh(n, s, e) : !1;
};
function dh(n, e, t) {
  let r = e.nodeBefore, s = r, i = e.pos - 1;
  for (; !s.isTextblock; i--) {
    if (s.type.spec.isolating)
      return !1;
    let d = s.lastChild;
    if (!d)
      return !1;
    s = d;
  }
  let o = e.nodeAfter, a = o, l = e.pos + 1;
  for (; !a.isTextblock; l++) {
    if (a.type.spec.isolating)
      return !1;
    let d = a.firstChild;
    if (!d)
      return !1;
    a = d;
  }
  let c = xo(n.doc, i, l, w.empty);
  if (!c || c.from != i || c instanceof K && c.slice.size >= l - i)
    return !1;
  if (t) {
    let d = n.tr.step(c);
    d.setSelection(O.create(d.doc, i)), t(d.scrollIntoView());
  }
  return !0;
}
function pn(n, e, t = !1) {
  for (let r = n; r; r = e == "start" ? r.firstChild : r.lastChild) {
    if (r.isTextblock)
      return !0;
    if (t && r.childCount != 1)
      return !1;
  }
  return !1;
}
const uh = (n, e, t) => {
  let { $head: r, empty: s } = n.selection, i = r;
  if (!s)
    return !1;
  if (r.parent.isTextblock) {
    if (t ? !t.endOfTextblock("backward", n) : r.parentOffset > 0)
      return !1;
    i = fl(r);
  }
  let o = i && i.nodeBefore;
  return !o || !_.isSelectable(o) ? !1 : (e && e(n.tr.setSelection(_.create(n.doc, i.pos - o.nodeSize)).scrollIntoView()), !0);
};
function fl(n) {
  if (!n.parent.type.spec.isolating)
    for (let e = n.depth - 1; e >= 0; e--) {
      if (n.index(e) > 0)
        return n.doc.resolve(n.before(e + 1));
      if (n.node(e).type.spec.isolating)
        break;
    }
  return null;
}
function hh(n, e) {
  let { $cursor: t } = n.selection;
  return !t || (e ? !e.endOfTextblock("forward", n) : t.parentOffset < t.parent.content.size) ? null : t;
}
const fh = (n, e, t) => {
  let r = hh(n, t);
  if (!r)
    return !1;
  let s = pl(r);
  if (!s)
    return !1;
  let i = s.nodeAfter;
  if (bh(n, s, e, 1))
    return !0;
  if (r.parent.content.size == 0 && (pn(i, "start") || _.isSelectable(i))) {
    let o = xo(n.doc, r.before(), r.after(), w.empty);
    if (o && o.slice.size < o.to - o.from) {
      if (e) {
        let a = n.tr.step(o);
        a.setSelection(pn(i, "start") ? $.findFrom(a.doc.resolve(a.mapping.map(s.pos)), 1) : _.create(a.doc, a.mapping.map(s.pos))), e(a.scrollIntoView());
      }
      return !0;
    }
  }
  return i.isAtom && s.depth == r.depth - 1 ? (e && e(n.tr.delete(s.pos, s.pos + i.nodeSize).scrollIntoView()), !0) : !1;
}, ph = (n, e, t) => {
  let { $head: r, empty: s } = n.selection, i = r;
  if (!s)
    return !1;
  if (r.parent.isTextblock) {
    if (t ? !t.endOfTextblock("forward", n) : r.parentOffset < r.parent.content.size)
      return !1;
    i = pl(r);
  }
  let o = i && i.nodeAfter;
  return !o || !_.isSelectable(o) ? !1 : (e && e(n.tr.setSelection(_.create(n.doc, i.pos)).scrollIntoView()), !0);
};
function pl(n) {
  if (!n.parent.type.spec.isolating)
    for (let e = n.depth - 1; e >= 0; e--) {
      let t = n.node(e);
      if (n.index(e) + 1 < t.childCount)
        return n.doc.resolve(n.after(e + 1));
      if (t.type.spec.isolating)
        break;
    }
  return null;
}
const Bg = (n, e) => {
  let t = n.selection, r = t instanceof _, s;
  if (r) {
    if (t.node.isTextblock || !Et(n.doc, t.from))
      return !1;
    s = t.from;
  } else if (s = ko(n.doc, t.from, -1), s == null)
    return !1;
  if (e) {
    let i = n.tr.join(s);
    r && i.setSelection(_.create(i.doc, s - n.doc.resolve(s).nodeBefore.nodeSize)), e(i.scrollIntoView());
  }
  return !0;
}, Fg = (n, e) => {
  let t = n.selection, r;
  if (t instanceof _) {
    if (t.node.isTextblock || !Et(n.doc, t.to))
      return !1;
    r = t.to;
  } else if (r = ko(n.doc, t.to, 1), r == null)
    return !1;
  return e && e(n.tr.join(r).scrollIntoView()), !0;
}, Hg = (n, e) => {
  let { $from: t, $to: r } = n.selection, s = t.blockRange(r), i = s && wn(s);
  return i == null ? !1 : (e && e(n.tr.lift(s, i).scrollIntoView()), !0);
}, mh = (n, e) => {
  let { $head: t, $anchor: r } = n.selection;
  return !t.parent.type.spec.code || !t.sameParent(r) ? !1 : (e && e(n.tr.insertText(`
`).scrollIntoView()), !0);
};
function ml(n) {
  for (let e = 0; e < n.edgeCount; e++) {
    let { type: t } = n.edge(e);
    if (t.isTextblock && !t.hasRequiredAttrs())
      return t;
  }
  return null;
}
const Vg = (n, e) => {
  let { $head: t, $anchor: r } = n.selection;
  if (!t.parent.type.spec.code || !t.sameParent(r))
    return !1;
  let s = t.node(-1), i = t.indexAfter(-1), o = ml(s.contentMatchAt(i));
  if (!o || !s.canReplaceWith(i, i, o))
    return !1;
  if (e) {
    let a = t.after(), l = n.tr.replaceWith(a, a, o.createAndFill());
    l.setSelection($.near(l.doc.resolve(a), 1)), e(l.scrollIntoView());
  }
  return !0;
}, gh = (n, e) => {
  let t = n.selection, { $from: r, $to: s } = t;
  if (t instanceof xe || r.parent.inlineContent || s.parent.inlineContent)
    return !1;
  let i = ml(s.parent.contentMatchAt(s.indexAfter()));
  if (!i || !i.isTextblock)
    return !1;
  if (e) {
    let o = (!r.parentOffset && s.index() < s.parent.childCount ? r : s).pos, a = n.tr.insert(o, i.createAndFill());
    a.setSelection(O.create(a.doc, o + 1)), e(a.scrollIntoView());
  }
  return !0;
}, yh = (n, e) => {
  let { $cursor: t } = n.selection;
  if (!t || t.parent.content.size)
    return !1;
  if (t.depth > 1 && t.after() != t.end(-1)) {
    let i = t.before();
    if (et(n.doc, i))
      return e && e(n.tr.split(i).scrollIntoView()), !0;
  }
  let r = t.blockRange(), s = r && wn(r);
  return s == null ? !1 : (e && e(n.tr.lift(r, s).scrollIntoView()), !0);
};
function Wg(n) {
  return (e, t) => {
    let { $from: r, $to: s } = e.selection;
    if (e.selection instanceof _ && e.selection.node.isBlock)
      return !r.parentOffset || !et(e.doc, r.pos) ? !1 : (t && t(e.tr.split(r.pos).scrollIntoView()), !0);
    if (!r.depth)
      return !1;
    let i = [], o, a, l = !1, c = !1;
    for (let f = r.depth; ; f--)
      if (r.node(f).isBlock) {
        l = r.end(f) == r.pos + (r.depth - f), c = r.start(f) == r.pos - (r.depth - f), a = ml(r.node(f - 1).contentMatchAt(r.indexAfter(f - 1))), i.unshift(l && a ? { type: a } : null), o = f;
        break;
      } else {
        if (f == 1)
          return !1;
        i.unshift(null);
      }
    let d = e.tr;
    (e.selection instanceof O || e.selection instanceof xe) && d.deleteSelection();
    let u = d.mapping.map(r.pos), h = et(d.doc, u, i.length, i);
    if (h || (i[0] = a ? { type: a } : null, h = et(d.doc, u, i.length, i)), !h)
      return !1;
    if (d.split(u, i.length, i), !l && c && r.node(o).type != a) {
      let f = d.mapping.map(r.before(o)), p = d.doc.resolve(f);
      a && r.node(o - 1).canReplaceWith(p.index(), p.index() + 1, a) && d.setNodeMarkup(d.mapping.map(r.before(o)), a);
    }
    return t && t(d.scrollIntoView()), !0;
  };
}
const jg = Wg(), qg = (n, e) => {
  let { $from: t, to: r } = n.selection, s, i = t.sharedDepth(r);
  return i == 0 ? !1 : (s = t.before(i), e && e(n.tr.setSelection(_.create(n.doc, s))), !0);
};
function Ug(n, e, t) {
  let r = e.nodeBefore, s = e.nodeAfter, i = e.index();
  return !r || !s || !r.type.compatibleContent(s.type) ? !1 : !r.content.size && e.parent.canReplace(i - 1, i) ? (t && t(n.tr.delete(e.pos - r.nodeSize, e.pos).scrollIntoView()), !0) : !e.parent.canReplace(i, i + 1) || !(s.isTextblock || Et(n.doc, e.pos)) ? !1 : (t && t(n.tr.join(e.pos).scrollIntoView()), !0);
}
function bh(n, e, t, r) {
  let s = e.nodeBefore, i = e.nodeAfter, o, a, l = s.type.spec.isolating || i.type.spec.isolating;
  if (!l && Ug(n, e, t))
    return !0;
  let c = !l && e.parent.canReplace(e.index(), e.index() + 1);
  if (c && (o = (a = s.contentMatchAt(s.childCount)).findWrapping(i.type)) && a.matchType(o[0] || i.type).validEnd) {
    if (t) {
      let f = e.pos + i.nodeSize, p = b.empty;
      for (let y = o.length - 1; y >= 0; y--)
        p = b.from(o[y].create(null, p));
      p = b.from(s.copy(p));
      let m = n.tr.step(new ee(e.pos - 1, f, e.pos, f, new w(p, 1, 0), o.length, !0)), g = m.doc.resolve(f + 2 * o.length);
      g.nodeAfter && g.nodeAfter.type == s.type && Et(m.doc, g.pos) && m.join(g.pos), t(m.scrollIntoView());
    }
    return !0;
  }
  let d = i.type.spec.isolating || r > 0 && l ? null : $.findFrom(e, 1), u = d && d.$from.blockRange(d.$to), h = u && wn(u);
  if (h != null && h >= e.depth)
    return t && t(n.tr.lift(u, h).scrollIntoView()), !0;
  if (c && pn(i, "start", !0) && pn(s, "end")) {
    let f = s, p = [];
    for (; p.push(f), !f.isTextblock; )
      f = f.lastChild;
    let m = i, g = 1;
    for (; !m.isTextblock; m = m.firstChild)
      g++;
    if (f.canReplace(f.childCount, f.childCount, m.content)) {
      if (t) {
        let y = b.empty;
        for (let C = p.length - 1; C >= 0; C--)
          y = b.from(p[C].copy(y));
        let k = n.tr.step(new ee(e.pos - p.length, e.pos + i.nodeSize, e.pos + g, e.pos + i.nodeSize - g, new w(y, p.length, 0), 0, !0));
        t(k.scrollIntoView());
      }
      return !0;
    }
  }
  return !1;
}
function vh(n) {
  return function(e, t) {
    let r = e.selection, s = n < 0 ? r.$from : r.$to, i = s.depth;
    for (; s.node(i).isInline; ) {
      if (!i)
        return !1;
      i--;
    }
    return s.node(i).isTextblock ? (t && t(e.tr.setSelection(O.create(e.doc, n < 0 ? s.start(i) : s.end(i)))), !0) : !1;
  };
}
const Kg = vh(-1), Jg = vh(1);
function Gg(n, e = null) {
  return function(t, r) {
    let { $from: s, $to: i } = t.selection, o = s.blockRange(i), a = o && ul(o, n, e);
    return a ? (r && r(t.tr.wrap(o, a).scrollIntoView()), !0) : !1;
  };
}
function Jc(n, e = null) {
  return function(t, r) {
    let s = !1;
    for (let i = 0; i < t.selection.ranges.length && !s; i++) {
      let { $from: { pos: o }, $to: { pos: a } } = t.selection.ranges[i];
      t.doc.nodesBetween(o, a, (l, c) => {
        if (s)
          return !1;
        if (!(!l.isTextblock || l.hasMarkup(n, e)))
          if (l.type == n)
            s = !0;
          else {
            let d = t.doc.resolve(c), u = d.index();
            s = d.parent.canReplaceWith(u, u + 1, n);
          }
      });
    }
    if (!s)
      return !1;
    if (r) {
      let i = t.tr;
      for (let o = 0; o < t.selection.ranges.length; o++) {
        let { $from: { pos: a }, $to: { pos: l } } = t.selection.ranges[o];
        i.setBlockType(a, l, n, e);
      }
      r(i.scrollIntoView());
    }
    return !0;
  };
}
function gl(...n) {
  return function(e, t, r) {
    for (let s = 0; s < n.length; s++)
      if (n[s](e, t, r))
        return !0;
    return !1;
  };
}
gl(ah, ch, uh);
gl(ah, fh, ph);
gl(mh, gh, yh, jg);
typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform && os.platform() == "darwin";
function Yg(n, e = null) {
  return function(t, r) {
    let { $from: s, $to: i } = t.selection, o = s.blockRange(i);
    if (!o)
      return !1;
    let a = r ? t.tr : null;
    return Xg(a, o, n, e) ? (r && r(a.scrollIntoView()), !0) : !1;
  };
}
function Xg(n, e, t, r = null) {
  let s = !1, i = e, o = e.$from.doc;
  if (e.depth >= 2 && e.$from.node(e.depth - 1).type.compatibleContent(t) && e.startIndex == 0) {
    if (e.$from.index(e.depth - 1) == 0)
      return !1;
    let l = o.resolve(e.start - 2);
    i = new wi(l, l, e.depth), e.endIndex < e.parent.childCount && (e = new wi(e.$from, o.resolve(e.$to.end(e.depth)), e.depth)), s = !0;
  }
  let a = ul(i, t, r, e);
  return a ? (n && Qg(n, e, a, s, t), !0) : !1;
}
function Qg(n, e, t, r, s) {
  let i = b.empty;
  for (let d = t.length - 1; d >= 0; d--)
    i = b.from(t[d].type.create(t[d].attrs, i));
  n.step(new ee(e.start - (r ? 2 : 0), e.end, e.start, e.end, new w(i, 0, 0), t.length, !0));
  let o = 0;
  for (let d = 0; d < t.length; d++)
    t[d].type == s && (o = d + 1);
  let a = t.length - o, l = e.start + t.length - (r ? 2 : 0), c = e.parent;
  for (let d = e.startIndex, u = e.endIndex, h = !0; d < u; d++, h = !1)
    !h && et(n.doc, l, a) && (n.split(l, a), l += 2 * a), l += c.child(d).nodeSize;
  return n;
}
function Zg(n) {
  return function(e, t) {
    let { $from: r, $to: s } = e.selection, i = r.blockRange(s, (o) => o.childCount > 0 && o.firstChild.type == n);
    return i ? t ? r.node(i.depth - 1).type == n ? ey(e, t, n, i) : ty(e, t, i) : !0 : !1;
  };
}
function ey(n, e, t, r) {
  let s = n.tr, i = r.end, o = r.$to.end(r.depth);
  i < o && (s.step(new ee(i - 1, o, i, o, new w(b.from(t.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new wi(s.doc.resolve(r.$from.pos), s.doc.resolve(o), r.depth));
  const a = wn(r);
  if (a == null)
    return !1;
  s.lift(r, a);
  let l = s.doc.resolve(s.mapping.map(i, -1) - 1);
  return Et(s.doc, l.pos) && l.nodeBefore.type == l.nodeAfter.type && s.join(l.pos), e(s.scrollIntoView()), !0;
}
function ty(n, e, t) {
  let r = n.tr, s = t.parent;
  for (let f = t.end, p = t.endIndex - 1, m = t.startIndex; p > m; p--)
    f -= s.child(p).nodeSize, r.delete(f - 1, f + 1);
  let i = r.doc.resolve(t.start), o = i.nodeAfter;
  if (r.mapping.map(t.end) != t.start + i.nodeAfter.nodeSize)
    return !1;
  let a = t.startIndex == 0, l = t.endIndex == s.childCount, c = i.node(-1), d = i.index(-1);
  if (!c.canReplace(d + (a ? 0 : 1), d + 1, o.content.append(l ? b.empty : b.from(s))))
    return !1;
  let u = i.pos, h = u + o.nodeSize;
  return r.step(new ee(u - (a ? 1 : 0), h + (l ? 1 : 0), u + 1, h - 1, new w((a ? b.empty : b.from(s.copy(b.empty))).append(l ? b.empty : b.from(s.copy(b.empty))), a ? 0 : 1, l ? 0 : 1), a ? 0 : 1)), e(r.scrollIntoView()), !0;
}
function ny(n) {
  return function(e, t) {
    let { $from: r, $to: s } = e.selection, i = r.blockRange(s, (c) => c.childCount > 0 && c.firstChild.type == n);
    if (!i)
      return !1;
    let o = i.startIndex;
    if (o == 0)
      return !1;
    let a = i.parent, l = a.child(o - 1);
    if (l.type != n)
      return !1;
    if (t) {
      let c = l.lastChild && l.lastChild.type == a.type, d = b.from(c ? n.create() : null), u = new w(b.from(n.create(null, b.from(a.type.create(null, d)))), c ? 3 : 1, 0), h = i.start, f = i.end;
      t(e.tr.step(new ee(h - (c ? 3 : 1), f, h, f, u, 1, !0)).scrollIntoView());
    }
    return !0;
  };
}
const re = function(n) {
  for (var e = 0; ; e++)
    if (n = n.previousSibling, !n)
      return e;
}, mn = function(n) {
  let e = n.assignedSlot || n.parentNode;
  return e && e.nodeType == 11 ? e.host : e;
};
let Oa = null;
const Ye = function(n, e, t) {
  let r = Oa || (Oa = document.createRange());
  return r.setEnd(n, t ?? n.nodeValue.length), r.setStart(n, e || 0), r;
}, ry = function() {
  Oa = null;
}, Gt = function(n, e, t, r) {
  return t && (Gc(n, e, t, r, -1) || Gc(n, e, t, r, 1));
}, sy = /^(img|br|input|textarea|hr)$/i;
function Gc(n, e, t, r, s) {
  for (var i; ; ) {
    if (n == t && e == r)
      return !0;
    if (e == (s < 0 ? 0 : Ee(n))) {
      let o = n.parentNode;
      if (!o || o.nodeType != 1 || zr(n) || sy.test(n.nodeName) || n.contentEditable == "false")
        return !1;
      e = re(n) + (s < 0 ? 0 : 1), n = o;
    } else if (n.nodeType == 1) {
      let o = n.childNodes[e + (s < 0 ? -1 : 0)];
      if (o.nodeType == 1 && o.contentEditable == "false")
        if (!((i = o.pmViewDesc) === null || i === void 0) && i.ignoreForSelection)
          e += s;
        else
          return !1;
      else
        n = o, e = s < 0 ? Ee(n) : 0;
    } else
      return !1;
  }
}
function Ee(n) {
  return n.nodeType == 3 ? n.nodeValue.length : n.childNodes.length;
}
function iy(n, e) {
  for (; ; ) {
    if (n.nodeType == 3 && e)
      return n;
    if (n.nodeType == 1 && e > 0) {
      if (n.contentEditable == "false")
        return null;
      n = n.childNodes[e - 1], e = Ee(n);
    } else if (n.parentNode && !zr(n))
      e = re(n), n = n.parentNode;
    else
      return null;
  }
}
function oy(n, e) {
  for (; ; ) {
    if (n.nodeType == 3 && e < n.nodeValue.length)
      return n;
    if (n.nodeType == 1 && e < n.childNodes.length) {
      if (n.contentEditable == "false")
        return null;
      n = n.childNodes[e], e = 0;
    } else if (n.parentNode && !zr(n))
      e = re(n) + 1, n = n.parentNode;
    else
      return null;
  }
}
function ay(n, e, t) {
  for (let r = e == 0, s = e == Ee(n); r || s; ) {
    if (n == t)
      return !0;
    let i = re(n);
    if (n = n.parentNode, !n)
      return !1;
    r = r && i == 0, s = s && i == Ee(n);
  }
}
function zr(n) {
  let e;
  for (let t = n; t && !(e = t.pmViewDesc); t = t.parentNode)
    ;
  return e && e.node && e.node.isBlock && (e.dom == n || e.contentDOM == n);
}
const So = function(n) {
  return n.focusNode && Gt(n.focusNode, n.focusOffset, n.anchorNode, n.anchorOffset);
};
function Ot(n, e) {
  let t = document.createEvent("Event");
  return t.initEvent("keydown", !0, !0), t.keyCode = n, t.key = t.code = e, t;
}
function ly(n) {
  let e = n.activeElement;
  for (; e && e.shadowRoot; )
    e = e.shadowRoot.activeElement;
  return e;
}
function cy(n, e, t) {
  if (n.caretPositionFromPoint)
    try {
      let r = n.caretPositionFromPoint(e, t);
      if (r)
        return { node: r.offsetNode, offset: Math.min(Ee(r.offsetNode), r.offset) };
    } catch {
    }
  if (n.caretRangeFromPoint) {
    let r = n.caretRangeFromPoint(e, t);
    if (r)
      return { node: r.startContainer, offset: Math.min(Ee(r.startContainer), r.startOffset) };
  }
}
const Fe = typeof navigator < "u" ? navigator : null, Yc = typeof document < "u" ? document : null, Tt = Fe && Fe.userAgent || "", Na = /Edge\/(\d+)/.exec(Tt), kh = /MSIE \d/.exec(Tt), $a = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(Tt), be = !!(kh || $a || Na), gt = kh ? document.documentMode : $a ? +$a[1] : Na ? +Na[1] : 0, Ae = !be && /gecko\/(\d+)/i.test(Tt);
Ae && +(/Firefox\/(\d+)/.exec(Tt) || [0, 0])[1];
const Ia = !be && /Chrome\/(\d+)/.exec(Tt), ie = !!Ia, xh = Ia ? +Ia[1] : 0, le = !be && !!Fe && /Apple Computer/.test(Fe.vendor), gn = le && (/Mobile\/\w+/.test(Tt) || !!Fe && Fe.maxTouchPoints > 2), Me = gn || (Fe ? /Mac/.test(Fe.platform) : !1), wh = Fe ? /Win/.test(Fe.platform) : !1, Qe = /Android \d/.test(Tt), Br = !!Yc && "webkitFontSmoothing" in Yc.documentElement.style, dy = Br ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function uy(n) {
  let e = n.defaultView && n.defaultView.visualViewport;
  return e ? {
    left: 0,
    right: e.width,
    top: 0,
    bottom: e.height
  } : {
    left: 0,
    right: n.documentElement.clientWidth,
    top: 0,
    bottom: n.documentElement.clientHeight
  };
}
function qe(n, e) {
  return typeof n == "number" ? n : n[e];
}
function hy(n) {
  let e = n.getBoundingClientRect(), t = e.width / n.offsetWidth || 1, r = e.height / n.offsetHeight || 1;
  return {
    left: e.left,
    right: e.left + n.clientWidth * t,
    top: e.top,
    bottom: e.top + n.clientHeight * r
  };
}
function Xc(n, e, t) {
  if (!Da(e) && e.left == 0)
    return;
  let r = n.someProp("scrollThreshold") || 0, s = n.someProp("scrollMargin") || 5, i = n.dom.ownerDocument;
  for (let o = t || n.dom; o; ) {
    if (o.nodeType != 1) {
      o = mn(o);
      continue;
    }
    let a = o, l = a == i.body, c = l ? uy(i) : hy(a), d = 0, u = 0;
    if (e.top < c.top + qe(r, "top") ? u = -(c.top - e.top + qe(s, "top")) : e.bottom > c.bottom - qe(r, "bottom") && (u = e.bottom - e.top > c.bottom - c.top ? e.top + qe(s, "top") - c.top : e.bottom - c.bottom + qe(s, "bottom")), e.left < c.left + qe(r, "left") ? d = -(c.left - e.left + qe(s, "left")) : e.right > c.right - qe(r, "right") && (d = e.right - c.right + qe(s, "right")), d || u)
      if (l)
        i.defaultView.scrollBy(d, u);
      else {
        let f = a.scrollLeft, p = a.scrollTop;
        u && (a.scrollTop += u), d && (a.scrollLeft += d);
        let m = a.scrollLeft - f, g = a.scrollTop - p;
        e = { left: e.left - m, top: e.top - g, right: e.right - m, bottom: e.bottom - g };
      }
    let h = l ? "fixed" : getComputedStyle(o).position;
    if (/^(fixed|sticky)$/.test(h))
      break;
    o = h == "absolute" ? o.offsetParent : mn(o);
  }
}
function fy(n) {
  let e = n.dom.getBoundingClientRect(), t = Math.max(0, e.top), r, s;
  for (let i = (e.left + e.right) / 2, o = t + 1; o < Math.min(innerHeight, e.bottom); o += 5) {
    let a = n.root.elementFromPoint(i, o);
    if (!a || a == n.dom || !n.dom.contains(a))
      continue;
    let l = a.getBoundingClientRect();
    if (l.top >= t - 20) {
      r = a, s = l.top;
      break;
    }
  }
  return { refDOM: r, refTop: s, stack: Sh(n.dom) };
}
function Sh(n) {
  let e = [], t = n.ownerDocument;
  for (let r = n; r && (e.push({ dom: r, top: r.scrollTop, left: r.scrollLeft }), n != t); r = mn(r))
    ;
  return e;
}
function py({ refDOM: n, refTop: e, stack: t }) {
  let r = n ? n.getBoundingClientRect().top : 0;
  Ch(t, r == 0 ? 0 : r - e);
}
function Ch(n, e) {
  for (let t = 0; t < n.length; t++) {
    let { dom: r, top: s, left: i } = n[t];
    r.scrollTop != s + e && (r.scrollTop = s + e), r.scrollLeft != i && (r.scrollLeft = i);
  }
}
let nn = null;
function my(n) {
  if (n.setActive)
    return n.setActive();
  if (nn)
    return n.focus(nn);
  let e = Sh(n);
  n.focus(nn == null ? {
    get preventScroll() {
      return nn = { preventScroll: !0 }, !0;
    }
  } : void 0), nn || (nn = !1, Ch(e, 0));
}
function Mh(n, e) {
  let t, r = 2e8, s, i = 0, o = e.top, a = e.top, l, c;
  for (let d = n.firstChild, u = 0; d; d = d.nextSibling, u++) {
    let h;
    if (d.nodeType == 1)
      h = d.getClientRects();
    else if (d.nodeType == 3)
      h = Ye(d).getClientRects();
    else
      continue;
    for (let f = 0; f < h.length; f++) {
      let p = h[f];
      if (p.top <= o && p.bottom >= a) {
        o = Math.max(p.bottom, o), a = Math.min(p.top, a);
        let m = p.left > e.left ? p.left - e.left : p.right < e.left ? e.left - p.right : 0;
        if (m < r) {
          t = d, r = m, s = m && t.nodeType == 3 ? {
            left: p.right < e.left ? p.right : p.left,
            top: e.top
          } : e, d.nodeType == 1 && m && (i = u + (e.left >= (p.left + p.right) / 2 ? 1 : 0));
          continue;
        }
      } else p.top > e.top && !l && p.left <= e.left && p.right >= e.left && (l = d, c = { left: Math.max(p.left, Math.min(p.right, e.left)), top: p.top });
      !t && (e.left >= p.right && e.top >= p.top || e.left >= p.left && e.top >= p.bottom) && (i = u + 1);
    }
  }
  return !t && l && (t = l, s = c, r = 0), t && t.nodeType == 3 ? gy(t, s) : !t || r && t.nodeType == 1 ? { node: n, offset: i } : Mh(t, s);
}
function gy(n, e) {
  let t = n.nodeValue.length, r = document.createRange(), s;
  for (let i = 0; i < t; i++) {
    r.setEnd(n, i + 1), r.setStart(n, i);
    let o = it(r, 1);
    if (o.top != o.bottom && yl(e, o)) {
      s = { node: n, offset: i + (e.left >= (o.left + o.right) / 2 ? 1 : 0) };
      break;
    }
  }
  return r.detach(), s || { node: n, offset: 0 };
}
function yl(n, e) {
  return n.left >= e.left - 1 && n.left <= e.right + 1 && n.top >= e.top - 1 && n.top <= e.bottom + 1;
}
function yy(n, e) {
  let t = n.parentNode;
  return t && /^li$/i.test(t.nodeName) && e.left < n.getBoundingClientRect().left ? t : n;
}
function by(n, e, t) {
  let { node: r, offset: s } = Mh(e, t), i = -1;
  if (r.nodeType == 1 && !r.firstChild) {
    let o = r.getBoundingClientRect();
    i = o.left != o.right && t.left > (o.left + o.right) / 2 ? 1 : -1;
  }
  return n.docView.posFromDOM(r, s, i);
}
function vy(n, e, t, r) {
  let s = -1;
  for (let i = e, o = !1; i != n.dom; ) {
    let a = n.docView.nearestDesc(i, !0), l;
    if (!a)
      return null;
    if (a.dom.nodeType == 1 && (a.node.isBlock && a.parent || !a.contentDOM) && // Ignore elements with zero-size bounding rectangles
    ((l = a.dom.getBoundingClientRect()).width || l.height) && (a.node.isBlock && a.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(a.dom.nodeName) && (!o && l.left > r.left || l.top > r.top ? s = a.posBefore : (!o && l.right < r.left || l.bottom < r.top) && (s = a.posAfter), o = !0), !a.contentDOM && s < 0 && !a.node.isText))
      return (a.node.isBlock ? r.top < (l.top + l.bottom) / 2 : r.left < (l.left + l.right) / 2) ? a.posBefore : a.posAfter;
    i = a.dom.parentNode;
  }
  return s > -1 ? s : n.docView.posFromDOM(e, t, -1);
}
function Eh(n, e, t) {
  let r = n.childNodes.length;
  if (r && t.top < t.bottom)
    for (let s = Math.max(0, Math.min(r - 1, Math.floor(r * (e.top - t.top) / (t.bottom - t.top)) - 2)), i = s; ; ) {
      let o = n.childNodes[i];
      if (o.nodeType == 1) {
        let a = o.getClientRects();
        for (let l = 0; l < a.length; l++) {
          let c = a[l];
          if (yl(e, c))
            return Eh(o, e, c);
        }
      }
      if ((i = (i + 1) % r) == s)
        break;
    }
  return n;
}
function ky(n, e) {
  let t = n.dom.ownerDocument, r, s = 0, i = cy(t, e.left, e.top);
  i && ({ node: r, offset: s } = i);
  let o = (n.root.elementFromPoint ? n.root : t).elementFromPoint(e.left, e.top), a;
  if (!o || !n.dom.contains(o.nodeType != 1 ? o.parentNode : o)) {
    let c = n.dom.getBoundingClientRect();
    if (!yl(e, c) || (o = Eh(n.dom, e, c), !o))
      return null;
  }
  if (le)
    for (let c = o; r && c; c = mn(c))
      c.draggable && (r = void 0);
  if (o = yy(o, e), r) {
    if (Ae && r.nodeType == 1 && (s = Math.min(s, r.childNodes.length), s < r.childNodes.length)) {
      let d = r.childNodes[s], u;
      d.nodeName == "IMG" && (u = d.getBoundingClientRect()).right <= e.left && u.bottom > e.top && s++;
    }
    let c;
    Br && s && r.nodeType == 1 && (c = r.childNodes[s - 1]).nodeType == 1 && c.contentEditable == "false" && c.getBoundingClientRect().top >= e.top && s--, r == n.dom && s == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && e.top > r.lastChild.getBoundingClientRect().bottom ? a = n.state.doc.content.size : (s == 0 || r.nodeType != 1 || r.childNodes[s - 1].nodeName != "BR") && (a = vy(n, r, s, e));
  }
  a == null && (a = by(n, o, e));
  let l = n.docView.nearestDesc(o, !0);
  return { pos: a, inside: l ? l.posAtStart - l.border : -1 };
}
function Da(n) {
  return n.top < n.bottom || n.left < n.right;
}
function it(n, e) {
  let t = n.getClientRects();
  if (t.length) {
    let r = t[e < 0 ? 0 : t.length - 1];
    if (Da(r))
      return r;
  }
  return Array.prototype.find.call(t, Da) || n.getBoundingClientRect();
}
const xy = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Th(n, e, t) {
  let { node: r, offset: s, atom: i } = n.docView.domFromPos(e, t < 0 ? -1 : 1), o = Br || Ae;
  if (r.nodeType == 3)
    if (o && (xy.test(r.nodeValue) || (t < 0 ? !s : s == r.nodeValue.length))) {
      let l = it(Ye(r, s, s), t);
      if (Ae && s && /\s/.test(r.nodeValue[s - 1]) && s < r.nodeValue.length) {
        let c = it(Ye(r, s - 1, s - 1), -1);
        if (c.top == l.top) {
          let d = it(Ye(r, s, s + 1), -1);
          if (d.top != l.top)
            return Nn(d, d.left < c.left);
        }
      }
      return l;
    } else {
      let l = s, c = s, d = t < 0 ? 1 : -1;
      return t < 0 && !s ? (c++, d = -1) : t >= 0 && s == r.nodeValue.length ? (l--, d = 1) : t < 0 ? l-- : c++, Nn(it(Ye(r, l, c), d), d < 0);
    }
  if (!n.state.doc.resolve(e - (i || 0)).parent.inlineContent) {
    if (i == null && s && (t < 0 || s == Ee(r))) {
      let l = r.childNodes[s - 1];
      if (l.nodeType == 1)
        return ea(l.getBoundingClientRect(), !1);
    }
    if (i == null && s < Ee(r)) {
      let l = r.childNodes[s];
      if (l.nodeType == 1)
        return ea(l.getBoundingClientRect(), !0);
    }
    return ea(r.getBoundingClientRect(), t >= 0);
  }
  if (i == null && s && (t < 0 || s == Ee(r))) {
    let l = r.childNodes[s - 1], c = l.nodeType == 3 ? Ye(l, Ee(l) - (o ? 0 : 1)) : l.nodeType == 1 && (l.nodeName != "BR" || !l.nextSibling) ? l : null;
    if (c)
      return Nn(it(c, 1), !1);
  }
  if (i == null && s < Ee(r)) {
    let l = r.childNodes[s];
    for (; l.pmViewDesc && l.pmViewDesc.ignoreForCoords; )
      l = l.nextSibling;
    let c = l ? l.nodeType == 3 ? Ye(l, 0, o ? 0 : 1) : l.nodeType == 1 ? l : null : null;
    if (c)
      return Nn(it(c, -1), !0);
  }
  return Nn(it(r.nodeType == 3 ? Ye(r) : r, -t), t >= 0);
}
function Nn(n, e) {
  if (n.width == 0)
    return n;
  let t = e ? n.left : n.right;
  return { top: n.top, bottom: n.bottom, left: t, right: t };
}
function ea(n, e) {
  if (n.height == 0)
    return n;
  let t = e ? n.top : n.bottom;
  return { top: t, bottom: t, left: n.left, right: n.right };
}
function Ah(n, e, t) {
  let r = n.state, s = n.root.activeElement;
  r != e && n.updateState(e), s != n.dom && n.focus();
  try {
    return t();
  } finally {
    r != e && n.updateState(r), s != n.dom && s && s.focus();
  }
}
function wy(n, e, t) {
  let r = e.selection, s = t == "up" ? r.$from : r.$to;
  return Ah(n, e, () => {
    let { node: i } = n.docView.domFromPos(s.pos, t == "up" ? -1 : 1);
    for (; ; ) {
      let a = n.docView.nearestDesc(i, !0);
      if (!a)
        break;
      if (a.node.isBlock) {
        i = a.contentDOM || a.dom;
        break;
      }
      i = a.dom.parentNode;
    }
    let o = Th(n, s.pos, 1);
    for (let a = i.firstChild; a; a = a.nextSibling) {
      let l;
      if (a.nodeType == 1)
        l = a.getClientRects();
      else if (a.nodeType == 3)
        l = Ye(a, 0, a.nodeValue.length).getClientRects();
      else
        continue;
      for (let c = 0; c < l.length; c++) {
        let d = l[c];
        if (d.bottom > d.top + 1 && (t == "up" ? o.top - d.top > (d.bottom - o.top) * 2 : d.bottom - o.bottom > (o.bottom - d.top) * 2))
          return !1;
      }
    }
    return !0;
  });
}
const Sy = /[\u0590-\u08ac]/;
function Cy(n, e, t) {
  let { $head: r } = e.selection;
  if (!r.parent.isTextblock)
    return !1;
  let s = r.parentOffset, i = !s, o = s == r.parent.content.size, a = n.domSelection();
  return a ? !Sy.test(r.parent.textContent) || !a.modify ? t == "left" || t == "backward" ? i : o : Ah(n, e, () => {
    let { focusNode: l, focusOffset: c, anchorNode: d, anchorOffset: u } = n.domSelectionRange(), h = a.caretBidiLevel;
    a.modify("move", t, "character");
    let f = r.depth ? n.docView.domAfterPos(r.before()) : n.dom, { focusNode: p, focusOffset: m } = n.domSelectionRange(), g = p && !f.contains(p.nodeType == 1 ? p : p.parentNode) || l == p && c == m;
    try {
      a.collapse(d, u), l && (l != d || c != u) && a.extend && a.extend(l, c);
    } catch {
    }
    return h != null && (a.caretBidiLevel = h), g;
  }) : r.pos == r.start() || r.pos == r.end();
}
let Qc = null, Zc = null, ed = !1;
function My(n, e, t) {
  return Qc == e && Zc == t ? ed : (Qc = e, Zc = t, ed = t == "up" || t == "down" ? wy(n, e, t) : Cy(n, e, t));
}
const _e = 0, td = 1, It = 2, De = 3;
class Fr {
  constructor(e, t, r, s) {
    this.parent = e, this.children = t, this.dom = r, this.contentDOM = s, this.dirty = _e, r.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(e) {
    return !1;
  }
  matchesMark(e) {
    return !1;
  }
  matchesNode(e, t, r) {
    return !1;
  }
  matchesHack(e) {
    return !1;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule(e) {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(e) {
    return !1;
  }
  // The size of the content represented by this desc.
  get size() {
    let e = 0;
    for (let t = 0; t < this.children.length; t++)
      e += this.children[t].size;
    return e;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
    for (let e = 0; e < this.children.length; e++)
      this.children[e].destroy();
  }
  posBeforeChild(e) {
    for (let t = 0, r = this.posAtStart; ; t++) {
      let s = this.children[t];
      if (s == e)
        return r;
      r += s.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(e, t, r) {
    if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode))
      if (r < 0) {
        let i, o;
        if (e == this.contentDOM)
          i = e.childNodes[t - 1];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          i = e.previousSibling;
        }
        for (; i && !((o = i.pmViewDesc) && o.parent == this); )
          i = i.previousSibling;
        return i ? this.posBeforeChild(o) + o.size : this.posAtStart;
      } else {
        let i, o;
        if (e == this.contentDOM)
          i = e.childNodes[t];
        else {
          for (; e.parentNode != this.contentDOM; )
            e = e.parentNode;
          i = e.nextSibling;
        }
        for (; i && !((o = i.pmViewDesc) && o.parent == this); )
          i = i.nextSibling;
        return i ? this.posBeforeChild(o) : this.posAtEnd;
      }
    let s;
    if (e == this.dom && this.contentDOM)
      s = t > re(this.contentDOM);
    else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM))
      s = e.compareDocumentPosition(this.contentDOM) & 2;
    else if (this.dom.firstChild) {
      if (t == 0)
        for (let i = e; ; i = i.parentNode) {
          if (i == this.dom) {
            s = !1;
            break;
          }
          if (i.previousSibling)
            break;
        }
      if (s == null && t == e.childNodes.length)
        for (let i = e; ; i = i.parentNode) {
          if (i == this.dom) {
            s = !0;
            break;
          }
          if (i.nextSibling)
            break;
        }
    }
    return s ?? r > 0 ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(e, t = !1) {
    for (let r = !0, s = e; s; s = s.parentNode) {
      let i = this.getDesc(s), o;
      if (i && (!t || i.node))
        if (r && (o = i.nodeDOM) && !(o.nodeType == 1 ? o.contains(e.nodeType == 1 ? e : e.parentNode) : o == e))
          r = !1;
        else
          return i;
    }
  }
  getDesc(e) {
    let t = e.pmViewDesc;
    for (let r = t; r; r = r.parent)
      if (r == this)
        return t;
  }
  posFromDOM(e, t, r) {
    for (let s = e; s; s = s.parentNode) {
      let i = this.getDesc(s);
      if (i)
        return i.localPosFromDOM(e, t, r);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(e) {
    for (let t = 0, r = 0; t < this.children.length; t++) {
      let s = this.children[t], i = r + s.size;
      if (r == e && i != r) {
        for (; !s.border && s.children.length; )
          for (let o = 0; o < s.children.length; o++) {
            let a = s.children[o];
            if (a.size) {
              s = a;
              break;
            }
          }
        return s;
      }
      if (e < i)
        return s.descAt(e - r - s.border);
      r = i;
    }
  }
  domFromPos(e, t) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: e + 1 };
    let r = 0, s = 0;
    for (let i = 0; r < this.children.length; r++) {
      let o = this.children[r], a = i + o.size;
      if (a > e || o instanceof Oh) {
        s = e - i;
        break;
      }
      i = a;
    }
    if (s)
      return this.children[r].domFromPos(s - this.children[r].border, t);
    for (let i; r && !(i = this.children[r - 1]).size && i instanceof _h && i.side >= 0; r--)
      ;
    if (t <= 0) {
      let i, o = !0;
      for (; i = r ? this.children[r - 1] : null, !(!i || i.dom.parentNode == this.contentDOM); r--, o = !1)
        ;
      return i && t && o && !i.border && !i.domAtom ? i.domFromPos(i.size, t) : { node: this.contentDOM, offset: i ? re(i.dom) + 1 : 0 };
    } else {
      let i, o = !0;
      for (; i = r < this.children.length ? this.children[r] : null, !(!i || i.dom.parentNode == this.contentDOM); r++, o = !1)
        ;
      return i && o && !i.border && !i.domAtom ? i.domFromPos(0, t) : { node: this.contentDOM, offset: i ? re(i.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(e, t, r = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: e, to: t, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let s = -1, i = -1;
    for (let o = r, a = 0; ; a++) {
      let l = this.children[a], c = o + l.size;
      if (s == -1 && e <= c) {
        let d = o + l.border;
        if (e >= d && t <= c - l.border && l.node && l.contentDOM && this.contentDOM.contains(l.contentDOM))
          return l.parseRange(e, t, d);
        e = o;
        for (let u = a; u > 0; u--) {
          let h = this.children[u - 1];
          if (h.size && h.dom.parentNode == this.contentDOM && !h.emptyChildAt(1)) {
            s = re(h.dom) + 1;
            break;
          }
          e -= h.size;
        }
        s == -1 && (s = 0);
      }
      if (s > -1 && (c > t || a == this.children.length - 1)) {
        t = c;
        for (let d = a + 1; d < this.children.length; d++) {
          let u = this.children[d];
          if (u.size && u.dom.parentNode == this.contentDOM && !u.emptyChildAt(-1)) {
            i = re(u.dom);
            break;
          }
          t += u.size;
        }
        i == -1 && (i = this.contentDOM.childNodes.length);
        break;
      }
      o = c;
    }
    return { node: this.contentDOM, from: e, to: t, fromOffset: s, toOffset: i };
  }
  emptyChildAt(e) {
    if (this.border || !this.contentDOM || !this.children.length)
      return !1;
    let t = this.children[e < 0 ? 0 : this.children.length - 1];
    return t.size == 0 || t.emptyChildAt(e);
  }
  domAfterPos(e) {
    let { node: t, offset: r } = this.domFromPos(e, 0);
    if (t.nodeType != 1 || r == t.childNodes.length)
      throw new RangeError("No node after pos " + e);
    return t.childNodes[r];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(e, t, r, s = !1) {
    let i = Math.min(e, t), o = Math.max(e, t);
    for (let f = 0, p = 0; f < this.children.length; f++) {
      let m = this.children[f], g = p + m.size;
      if (i > p && o < g)
        return m.setSelection(e - p - m.border, t - p - m.border, r, s);
      p = g;
    }
    let a = this.domFromPos(e, e ? -1 : 1), l = t == e ? a : this.domFromPos(t, t ? -1 : 1), c = r.root.getSelection(), d = r.domSelectionRange(), u = !1;
    if ((Ae || le) && e == t) {
      let { node: f, offset: p } = a;
      if (f.nodeType == 3) {
        if (u = !!(p && f.nodeValue[p - 1] == `
`), u && p == f.nodeValue.length)
          for (let m = f, g; m; m = m.parentNode) {
            if (g = m.nextSibling) {
              g.nodeName == "BR" && (a = l = { node: g.parentNode, offset: re(g) + 1 });
              break;
            }
            let y = m.pmViewDesc;
            if (y && y.node && y.node.isBlock)
              break;
          }
      } else {
        let m = f.childNodes[p - 1];
        u = m && (m.nodeName == "BR" || m.contentEditable == "false");
      }
    }
    if (Ae && d.focusNode && d.focusNode != l.node && d.focusNode.nodeType == 1) {
      let f = d.focusNode.childNodes[d.focusOffset];
      f && f.contentEditable == "false" && (s = !0);
    }
    if (!(s || u && le) && Gt(a.node, a.offset, d.anchorNode, d.anchorOffset) && Gt(l.node, l.offset, d.focusNode, d.focusOffset))
      return;
    let h = !1;
    if ((c.extend || e == t) && !(u && Ae)) {
      c.collapse(a.node, a.offset);
      try {
        e != t && c.extend(l.node, l.offset), h = !0;
      } catch {
      }
    }
    if (!h) {
      if (e > t) {
        let p = a;
        a = l, l = p;
      }
      let f = document.createRange();
      f.setEnd(l.node, l.offset), f.setStart(a.node, a.offset), c.removeAllRanges(), c.addRange(f);
    }
  }
  ignoreMutation(e) {
    return !this.contentDOM && e.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(e, t) {
    for (let r = 0, s = 0; s < this.children.length; s++) {
      let i = this.children[s], o = r + i.size;
      if (r == o ? e <= o && t >= r : e < o && t > r) {
        let a = r + i.border, l = o - i.border;
        if (e >= a && t <= l) {
          this.dirty = e == r || t == o ? It : td, e == a && t == l && (i.contentLost || i.dom.parentNode != this.contentDOM) ? i.dirty = De : i.markDirty(e - a, t - a);
          return;
        } else
          i.dirty = i.dom == i.contentDOM && i.dom.parentNode == this.contentDOM && !i.children.length ? It : De;
      }
      r = o;
    }
    this.dirty = It;
  }
  markParentsDirty() {
    let e = 1;
    for (let t = this.parent; t; t = t.parent, e++) {
      let r = e == 1 ? It : td;
      t.dirty < r && (t.dirty = r);
    }
  }
  get domAtom() {
    return !1;
  }
  get ignoreForCoords() {
    return !1;
  }
  get ignoreForSelection() {
    return !1;
  }
  isText(e) {
    return !1;
  }
}
class _h extends Fr {
  constructor(e, t, r, s) {
    let i, o = t.type.toDOM;
    if (typeof o == "function" && (o = o(r, () => {
      if (!i)
        return s;
      if (i.parent)
        return i.parent.posBeforeChild(i);
    })), !t.type.spec.raw) {
      if (o.nodeType != 1) {
        let a = document.createElement("span");
        a.appendChild(o), o = a;
      }
      o.contentEditable = "false", o.classList.add("ProseMirror-widget");
    }
    super(e, [], o, null), this.widget = t, this.widget = t, i = this;
  }
  matchesWidget(e) {
    return this.dirty == _e && e.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: !0 };
  }
  stopEvent(e) {
    let t = this.widget.spec.stopEvent;
    return t ? t(e) : !1;
  }
  ignoreMutation(e) {
    return e.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom), super.destroy();
  }
  get domAtom() {
    return !0;
  }
  get ignoreForSelection() {
    return !!this.widget.type.spec.relaxedSide;
  }
  get side() {
    return this.widget.type.side;
  }
}
class Ey extends Fr {
  constructor(e, t, r, s) {
    super(e, [], t, null), this.textDOM = r, this.text = s;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(e, t) {
    return e != this.textDOM ? this.posAtStart + (t ? this.size : 0) : this.posAtStart + t;
  }
  domFromPos(e) {
    return { node: this.textDOM, offset: e };
  }
  ignoreMutation(e) {
    return e.type === "characterData" && e.target.nodeValue == e.oldValue;
  }
}
class yt extends Fr {
  constructor(e, t, r, s, i) {
    super(e, [], r, s), this.mark = t, this.spec = i;
  }
  static create(e, t, r, s) {
    let i = s.nodeViews[t.type.name], o = i && i(t, s, r);
    return (!o || !o.dom) && (o = Qt.renderSpec(document, t.type.spec.toDOM(t, r), null, t.attrs)), new yt(e, t, o.dom, o.contentDOM || o.dom, o);
  }
  parseRule() {
    return this.dirty & De || this.mark.type.spec.reparseInView ? null : { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(e) {
    return this.dirty != De && this.mark.eq(e);
  }
  markDirty(e, t) {
    if (super.markDirty(e, t), this.dirty != _e) {
      let r = this.parent;
      for (; !r.node; )
        r = r.parent;
      r.dirty < this.dirty && (r.dirty = this.dirty), this.dirty = _e;
    }
  }
  slice(e, t, r) {
    let s = yt.create(this.parent, this.mark, !0, r), i = this.children, o = this.size;
    t < o && (i = Ra(i, t, o, r)), e > 0 && (i = Ra(i, 0, e, r));
    for (let a = 0; a < i.length; a++)
      i[a].parent = s;
    return s.children = i, s;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
}
class bt extends Fr {
  constructor(e, t, r, s, i, o, a) {
    super(e, [], i, o), this.node = t, this.outerDeco = r, this.innerDeco = s, this.nodeDOM = a;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(e, t, r, s, i, o) {
    let a = i.nodeViews[t.type.name], l, c = a && a(t, i, () => {
      if (!l)
        return o;
      if (l.parent)
        return l.parent.posBeforeChild(l);
    }, r, s), d = c && c.dom, u = c && c.contentDOM;
    if (t.isText) {
      if (!d)
        d = document.createTextNode(t.text);
      else if (d.nodeType != 3)
        throw new RangeError("Text must be rendered as a DOM text node");
    } else d || ({ dom: d, contentDOM: u } = Qt.renderSpec(document, t.type.spec.toDOM(t), null, t.attrs));
    !u && !t.isText && d.nodeName != "BR" && (d.hasAttribute("contenteditable") || (d.contentEditable = "false"), t.type.spec.draggable && (d.draggable = !0));
    let h = d;
    return d = Ih(d, r, t), c ? l = new Ty(e, t, r, s, d, u || null, h, c) : t.isText ? new Co(e, t, r, s, d, h) : new bt(e, t, r, s, d, u || null, h);
  }
  parseRule(e) {
    if (this.node.type.spec.reparseInView)
      return null;
    let t = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre" && (t.preserveWhitespace = "full"), !this.contentDOM)
      t.getContent = () => this.node.content;
    else if (!this.contentLost)
      t.contentElement = this.contentDOM;
    else {
      for (let r = this.children.length - 1; r >= 0; r--) {
        let s = this.children[r];
        if (this.dom.contains(s.dom.parentNode)) {
          t.contentElement = s.dom.parentNode;
          break;
        }
      }
      if (!t.contentElement) {
        let r = e && e.find((s) => s.nodeType == 1 && e.indexOf(s.parentNode) < 0 && this.dom.contains(s));
        r ? t.contentElement = r : t.getContent = () => b.empty;
      }
    }
    return t;
  }
  matchesNode(e, t, r) {
    return this.dirty == _e && e.eq(this.node) && Ci(t, this.outerDeco) && r.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(e, t) {
    let r = this.node.inlineContent, s = t, i = e.composing ? this.localCompositionInfo(e, t) : null, o = i && i.pos > -1 ? i : null, a = i && i.pos < 0, l = new _y(this, o && o.node, e);
    $y(this.node, this.innerDeco, (c, d, u) => {
      c.spec.marks ? l.syncToMarks(c.spec.marks, r, e, d) : c.type.side >= 0 && !u && l.syncToMarks(d == this.node.childCount ? L.none : this.node.child(d).marks, r, e, d), l.placeWidget(c, e, s);
    }, (c, d, u, h) => {
      l.syncToMarks(c.marks, r, e, h);
      let f;
      l.findNodeMatch(c, d, u, h) || a && e.state.selection.from > s && e.state.selection.to < s + c.nodeSize && (f = l.findIndexWithChild(i.node)) > -1 && l.updateNodeAt(c, d, u, f, e) || l.updateNextNode(c, d, u, e, h, s) || l.addNode(c, d, u, e, s), s += c.nodeSize;
    }), l.syncToMarks([], r, e, 0), this.node.isTextblock && l.addTextblockHacks(), l.destroyRest(), (l.changed || this.dirty == It) && (o && this.protectLocalComposition(e, o), Nh(this.contentDOM, this.children, e), gn && Iy(this.dom));
  }
  localCompositionInfo(e, t) {
    let { from: r, to: s } = e.state.selection;
    if (!(e.state.selection instanceof O) || r < t || s > t + this.node.content.size)
      return null;
    let i = e.input.compositionNode;
    if (!i || !this.dom.contains(i.parentNode))
      return null;
    if (this.node.inlineContent) {
      let o = i.nodeValue, a = Dy(this.node.content, o, r - t, s - t);
      return a < 0 ? null : { node: i, pos: a, text: o };
    } else
      return { node: i, pos: -1, text: "" };
  }
  protectLocalComposition(e, { node: t, pos: r, text: s }) {
    if (this.getDesc(t))
      return;
    let i = t;
    for (; i.parentNode != this.contentDOM; i = i.parentNode) {
      for (; i.previousSibling; )
        i.parentNode.removeChild(i.previousSibling);
      for (; i.nextSibling; )
        i.parentNode.removeChild(i.nextSibling);
      i.pmViewDesc && (i.pmViewDesc = void 0);
    }
    let o = new Ey(this, i, t, s);
    e.input.compositionNodes.push(o), this.children = Ra(this.children, r, r + s.length, e, o);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(e, t, r, s) {
    return this.dirty == De || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, r, s), !0);
  }
  updateInner(e, t, r, s) {
    this.updateOuterDeco(t), this.node = e, this.innerDeco = r, this.contentDOM && this.updateChildren(s, this.posAtStart), this.dirty = _e;
  }
  updateOuterDeco(e) {
    if (Ci(e, this.outerDeco))
      return;
    let t = this.nodeDOM.nodeType != 1, r = this.dom;
    this.dom = $h(this.dom, this.nodeDOM, Pa(this.outerDeco, this.node, t), Pa(e, this.node, t)), this.dom != r && (r.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
  }
  // Mark this node as being the selected node.
  selectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
  }
  // Remove selected node marking from this node.
  deselectNode() {
    this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
  }
  get domAtom() {
    return this.node.isAtom;
  }
}
function nd(n, e, t, r, s) {
  Ih(r, e, n);
  let i = new bt(void 0, n, e, t, r, r, r);
  return i.contentDOM && i.updateChildren(s, 0), i;
}
class Co extends bt {
  constructor(e, t, r, s, i, o) {
    super(e, t, r, s, i, null, o);
  }
  parseRule() {
    let e = this.nodeDOM.parentNode;
    for (; e && e != this.dom && !e.pmIsDeco; )
      e = e.parentNode;
    return { skip: e || !0 };
  }
  update(e, t, r, s) {
    return this.dirty == De || this.dirty != _e && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != _e || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, s.trackWrites == this.nodeDOM && (s.trackWrites = null)), this.node = e, this.dirty = _e, !0);
  }
  inParent() {
    let e = this.parent.contentDOM;
    for (let t = this.nodeDOM; t; t = t.parentNode)
      if (t == e)
        return !0;
    return !1;
  }
  domFromPos(e) {
    return { node: this.nodeDOM, offset: e };
  }
  localPosFromDOM(e, t, r) {
    return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, r);
  }
  ignoreMutation(e) {
    return e.type != "characterData" && e.type != "selection";
  }
  slice(e, t, r) {
    let s = this.node.cut(e, t), i = document.createTextNode(s.text);
    return new Co(this.parent, s, this.outerDeco, this.innerDeco, i, i);
  }
  markDirty(e, t) {
    super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = De);
  }
  get domAtom() {
    return !1;
  }
  isText(e) {
    return this.node.text == e;
  }
}
class Oh extends Fr {
  parseRule() {
    return { ignore: !0 };
  }
  matchesHack(e) {
    return this.dirty == _e && this.dom.nodeName == e;
  }
  get domAtom() {
    return !0;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
}
class Ty extends bt {
  constructor(e, t, r, s, i, o, a, l) {
    super(e, t, r, s, i, o, a), this.spec = l;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(e, t, r, s) {
    if (this.dirty == De)
      return !1;
    if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
      let i = this.spec.update(e, t, r);
      return i && this.updateInner(e, t, r, s), i;
    } else return !this.contentDOM && !e.isLeaf ? !1 : super.update(e, t, r, s);
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(e, t, r, s) {
    this.spec.setSelection ? this.spec.setSelection(e, t, r.root) : super.setSelection(e, t, r, s);
  }
  destroy() {
    this.spec.destroy && this.spec.destroy(), super.destroy();
  }
  stopEvent(e) {
    return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
  }
  ignoreMutation(e) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
  }
}
function Nh(n, e, t) {
  let r = n.firstChild, s = !1;
  for (let i = 0; i < e.length; i++) {
    let o = e[i], a = o.dom;
    if (a.parentNode == n) {
      for (; a != r; )
        r = rd(r), s = !0;
      r = r.nextSibling;
    } else
      s = !0, n.insertBefore(a, r);
    if (o instanceof yt) {
      let l = r ? r.previousSibling : n.lastChild;
      Nh(o.contentDOM, o.children, t), r = l ? l.nextSibling : n.firstChild;
    }
  }
  for (; r; )
    r = rd(r), s = !0;
  s && t.trackWrites == n && (t.trackWrites = null);
}
const Jn = function(n) {
  n && (this.nodeName = n);
};
Jn.prototype = /* @__PURE__ */ Object.create(null);
const Dt = [new Jn()];
function Pa(n, e, t) {
  if (n.length == 0)
    return Dt;
  let r = t ? Dt[0] : new Jn(), s = [r];
  for (let i = 0; i < n.length; i++) {
    let o = n[i].type.attrs;
    if (o) {
      o.nodeName && s.push(r = new Jn(o.nodeName));
      for (let a in o) {
        let l = o[a];
        l != null && (t && s.length == 1 && s.push(r = new Jn(e.isInline ? "span" : "div")), a == "class" ? r.class = (r.class ? r.class + " " : "") + l : a == "style" ? r.style = (r.style ? r.style + ";" : "") + l : a != "nodeName" && (r[a] = l));
      }
    }
  }
  return s;
}
function $h(n, e, t, r) {
  if (t == Dt && r == Dt)
    return e;
  let s = e;
  for (let i = 0; i < r.length; i++) {
    let o = r[i], a = t[i];
    if (i) {
      let l;
      a && a.nodeName == o.nodeName && s != n && (l = s.parentNode) && l.nodeName.toLowerCase() == o.nodeName || (l = document.createElement(o.nodeName), l.pmIsDeco = !0, l.appendChild(s), a = Dt[0]), s = l;
    }
    Ay(s, a || Dt[0], o);
  }
  return s;
}
function Ay(n, e, t) {
  for (let r in e)
    r != "class" && r != "style" && r != "nodeName" && !(r in t) && n.removeAttribute(r);
  for (let r in t)
    r != "class" && r != "style" && r != "nodeName" && t[r] != e[r] && n.setAttribute(r, t[r]);
  if (e.class != t.class) {
    let r = e.class ? e.class.split(" ").filter(Boolean) : [], s = t.class ? t.class.split(" ").filter(Boolean) : [];
    for (let i = 0; i < r.length; i++)
      s.indexOf(r[i]) == -1 && n.classList.remove(r[i]);
    for (let i = 0; i < s.length; i++)
      r.indexOf(s[i]) == -1 && n.classList.add(s[i]);
    n.classList.length == 0 && n.removeAttribute("class");
  }
  if (e.style != t.style) {
    if (e.style) {
      let r = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, s;
      for (; s = r.exec(e.style); )
        n.style.removeProperty(s[1]);
    }
    t.style && (n.style.cssText += t.style);
  }
}
function Ih(n, e, t) {
  return $h(n, n, Dt, Pa(e, t, n.nodeType != 1));
}
function Ci(n, e) {
  if (n.length != e.length)
    return !1;
  for (let t = 0; t < n.length; t++)
    if (!n[t].type.eq(e[t].type))
      return !1;
  return !0;
}
function rd(n) {
  let e = n.nextSibling;
  return n.parentNode.removeChild(n), e;
}
class _y {
  constructor(e, t, r) {
    this.lock = t, this.view = r, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = Oy(e.node.content, e);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(e, t) {
    if (e != t) {
      for (let r = e; r < t; r++)
        this.top.children[r].destroy();
      this.top.children.splice(e, t - e), this.changed = !0;
    }
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(e, t, r, s) {
    let i = 0, o = this.stack.length >> 1, a = Math.min(o, e.length);
    for (; i < a && (i == o - 1 ? this.top : this.stack[i + 1 << 1]).matchesMark(e[i]) && e[i].type.spec.spanning !== !1; )
      i++;
    for (; i < o; )
      this.destroyRest(), this.top.dirty = _e, this.index = this.stack.pop(), this.top = this.stack.pop(), o--;
    for (; o < e.length; ) {
      this.stack.push(this.top, this.index + 1);
      let l = -1, c = this.top.children.length;
      s < this.preMatch.index && (c = Math.min(this.index + 3, c));
      for (let d = this.index; d < c; d++) {
        let u = this.top.children[d];
        if (u.matchesMark(e[o]) && !this.isLocked(u.dom)) {
          l = d;
          break;
        }
      }
      if (l < 0 && this.index < this.top.children.length) {
        let d = this.top.children[this.index];
        d instanceof yt && d.dirty != De && d.mark.type == e[o].type && d.spec.update && !this.isLocked(d.dom) && d.spec.update(e[o]) && (d.mark = e[o], l = this.index, this.changed = !0);
      }
      if (l > -1)
        l > this.index && (this.changed = !0, this.destroyBetween(this.index, l)), this.top = this.top.children[this.index];
      else {
        let d = yt.create(this.top, e[o], t, r);
        this.top.children.splice(this.index, 0, d), this.top = d, this.changed = !0;
      }
      this.index = 0, o++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(e, t, r, s) {
    let i = -1, o;
    if (s >= this.preMatch.index && (o = this.preMatch.matches[s - this.preMatch.index]).parent == this.top && o.matchesNode(e, t, r))
      i = this.top.children.indexOf(o, this.index);
    else
      for (let a = this.index, l = Math.min(this.top.children.length, a + 5); a < l; a++) {
        let c = this.top.children[a];
        if (c.matchesNode(e, t, r) && !this.preMatch.matched.has(c)) {
          i = a;
          break;
        }
      }
    return i < 0 ? !1 : (this.destroyBetween(this.index, i), this.index++, !0);
  }
  updateNodeAt(e, t, r, s, i) {
    let o = this.top.children[s];
    return o.dirty == De && o.dom == o.contentDOM && (o.dirty = It), o.update(e, t, r, i) ? (this.destroyBetween(this.index, s), this.index++, !0) : !1;
  }
  findIndexWithChild(e) {
    for (; ; ) {
      let t = e.parentNode;
      if (!t)
        return -1;
      if (t == this.top.contentDOM) {
        let r = e.pmViewDesc;
        if (r) {
          for (let s = this.index; s < this.top.children.length; s++)
            if (this.top.children[s] == r)
              return s;
        }
        return -1;
      }
      e = t;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(e, t, r, s, i, o) {
    for (let a = this.index; a < this.top.children.length; a++) {
      let l = this.top.children[a];
      if (l instanceof bt) {
        let c = this.preMatch.matched.get(l);
        if (c != null && c != i)
          return !1;
        let d = l.dom, u, h = this.isLocked(d) && !(e.isText && l.node && l.node.isText && l.nodeDOM.nodeValue == e.text && l.dirty != De && Ci(t, l.outerDeco));
        if (!h && l.update(e, t, r, s))
          return this.destroyBetween(this.index, a), l.dom != d && (this.changed = !0), this.index++, !0;
        if (!h && (u = this.recreateWrapper(l, e, t, r, s, o)))
          return this.destroyBetween(this.index, a), this.top.children[this.index] = u, u.contentDOM && (u.dirty = It, u.updateChildren(s, o + 1), u.dirty = _e), this.changed = !0, this.index++, !0;
        break;
      }
    }
    return !1;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(e, t, r, s, i, o) {
    if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !Ci(r, e.outerDeco) || !s.eq(e.innerDeco))
      return null;
    let a = bt.create(this.top, t, r, s, i, o);
    if (a.contentDOM) {
      a.children = e.children, e.children = [];
      for (let l of a.children)
        l.parent = a;
    }
    return e.destroy(), a;
  }
  // Insert the node as a newly created node desc.
  addNode(e, t, r, s, i) {
    let o = bt.create(this.top, e, t, r, s, i);
    o.contentDOM && o.updateChildren(s, i + 1), this.top.children.splice(this.index++, 0, o), this.changed = !0;
  }
  placeWidget(e, t, r) {
    let s = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (s && s.matchesWidget(e) && (e == s.widget || !s.widget.type.toDOM.parentNode))
      this.index++;
    else {
      let i = new _h(this.top, e, t, r);
      this.top.children.splice(this.index++, 0, i), this.changed = !0;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let e = this.top.children[this.index - 1], t = this.top;
    for (; e instanceof yt; )
      t = e, e = t.children[t.children.length - 1];
    (!e || // Empty textblock
    !(e instanceof Co) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((le || ie) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
  }
  addHackNode(e, t) {
    if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e))
      this.index++;
    else {
      let r = document.createElement(e);
      e == "IMG" && (r.className = "ProseMirror-separator", r.alt = ""), e == "BR" && (r.className = "ProseMirror-trailingBreak");
      let s = new Oh(this.top, [], r, null);
      t != this.top ? t.children.push(s) : t.children.splice(this.index++, 0, s), this.changed = !0;
    }
  }
  isLocked(e) {
    return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
  }
}
function Oy(n, e) {
  let t = e, r = t.children.length, s = n.childCount, i = /* @__PURE__ */ new Map(), o = [];
  e: for (; s > 0; ) {
    let a;
    for (; ; )
      if (r) {
        let c = t.children[r - 1];
        if (c instanceof yt)
          t = c, r = c.children.length;
        else {
          a = c, r--;
          break;
        }
      } else {
        if (t == e)
          break e;
        r = t.parent.children.indexOf(t), t = t.parent;
      }
    let l = a.node;
    if (l) {
      if (l != n.child(s - 1))
        break;
      --s, i.set(a, s), o.push(a);
    }
  }
  return { index: s, matched: i, matches: o.reverse() };
}
function Ny(n, e) {
  return n.type.side - e.type.side;
}
function $y(n, e, t, r) {
  let s = e.locals(n), i = 0;
  if (s.length == 0) {
    for (let c = 0; c < n.childCount; c++) {
      let d = n.child(c);
      r(d, s, e.forChild(i, d), c), i += d.nodeSize;
    }
    return;
  }
  let o = 0, a = [], l = null;
  for (let c = 0; ; ) {
    let d, u;
    for (; o < s.length && s[o].to == i; ) {
      let g = s[o++];
      g.widget && (d ? (u || (u = [d])).push(g) : d = g);
    }
    if (d)
      if (u) {
        u.sort(Ny);
        for (let g = 0; g < u.length; g++)
          t(u[g], c, !!l);
      } else
        t(d, c, !!l);
    let h, f;
    if (l)
      f = -1, h = l, l = null;
    else if (c < n.childCount)
      f = c, h = n.child(c++);
    else
      break;
    for (let g = 0; g < a.length; g++)
      a[g].to <= i && a.splice(g--, 1);
    for (; o < s.length && s[o].from <= i && s[o].to > i; )
      a.push(s[o++]);
    let p = i + h.nodeSize;
    if (h.isText) {
      let g = p;
      o < s.length && s[o].from < g && (g = s[o].from);
      for (let y = 0; y < a.length; y++)
        a[y].to < g && (g = a[y].to);
      g < p && (l = h.cut(g - i), h = h.cut(0, g - i), p = g, f = -1);
    } else
      for (; o < s.length && s[o].to < p; )
        o++;
    let m = h.isInline && !h.isLeaf ? a.filter((g) => !g.inline) : a.slice();
    r(h, m, e.forChild(i, h), f), i = p;
  }
}
function Iy(n) {
  if (n.nodeName == "UL" || n.nodeName == "OL") {
    let e = n.style.cssText;
    n.style.cssText = e + "; list-style: square !important", window.getComputedStyle(n).listStyle, n.style.cssText = e;
  }
}
function Dy(n, e, t, r) {
  for (let s = 0, i = 0; s < n.childCount && i <= r; ) {
    let o = n.child(s++), a = i;
    if (i += o.nodeSize, !o.isText)
      continue;
    let l = o.text;
    for (; s < n.childCount; ) {
      let c = n.child(s++);
      if (i += c.nodeSize, !c.isText)
        break;
      l += c.text;
    }
    if (i >= t) {
      if (i >= r && l.slice(r - e.length - a, r - a) == e)
        return r - e.length;
      let c = a < r ? l.lastIndexOf(e, r - a - 1) : -1;
      if (c >= 0 && c + e.length + a >= t)
        return a + c;
      if (t == r && l.length >= r + e.length - a && l.slice(r - a, r - a + e.length) == e)
        return r;
    }
  }
  return -1;
}
function Ra(n, e, t, r, s) {
  let i = [];
  for (let o = 0, a = 0; o < n.length; o++) {
    let l = n[o], c = a, d = a += l.size;
    c >= t || d <= e ? i.push(l) : (c < e && i.push(l.slice(0, e - c, r)), s && (i.push(s), s = void 0), d > t && i.push(l.slice(t - c, l.size, r)));
  }
  return i;
}
function bl(n, e = null) {
  let t = n.domSelectionRange(), r = n.state.doc;
  if (!t.focusNode)
    return null;
  let s = n.docView.nearestDesc(t.focusNode), i = s && s.size == 0, o = n.docView.posFromDOM(t.focusNode, t.focusOffset, 1);
  if (o < 0)
    return null;
  let a = r.resolve(o), l, c;
  if (So(t)) {
    for (l = o; s && !s.node; )
      s = s.parent;
    let u = s.node;
    if (s && u.isAtom && _.isSelectable(u) && s.parent && !(u.isInline && ay(t.focusNode, t.focusOffset, s.dom))) {
      let h = s.posBefore;
      c = new _(o == h ? a : r.resolve(h));
    }
  } else {
    if (t instanceof n.dom.ownerDocument.defaultView.Selection && t.rangeCount > 1) {
      let u = o, h = o;
      for (let f = 0; f < t.rangeCount; f++) {
        let p = t.getRangeAt(f);
        u = Math.min(u, n.docView.posFromDOM(p.startContainer, p.startOffset, 1)), h = Math.max(h, n.docView.posFromDOM(p.endContainer, p.endOffset, -1));
      }
      if (u < 0)
        return null;
      [l, o] = h == n.state.selection.anchor ? [h, u] : [u, h], a = r.resolve(o);
    } else
      l = n.docView.posFromDOM(t.anchorNode, t.anchorOffset, 1);
    if (l < 0)
      return null;
  }
  let d = r.resolve(l);
  if (!c) {
    let u = e == "pointer" || n.state.selection.head < a.pos && !i ? 1 : -1;
    c = vl(n, d, a, u);
  }
  return c;
}
function Dh(n) {
  return n.editable ? n.hasFocus() : Rh(n) && document.activeElement && document.activeElement.contains(n.dom);
}
function tt(n, e = !1) {
  let t = n.state.selection;
  if (Ph(n, t), !Dh(n))
    return;
  let r = n.input.mouseDown;
  if (!e && ie && r) {
    let s = n.domSelectionRange(), i = n.domObserver.currentSelection;
    if (s.anchorNode && i.anchorNode && Gt(s.anchorNode, s.anchorOffset, i.anchorNode, i.anchorOffset) && r.delaySelUpdate()) {
      n.domObserver.setCurSelection();
      return;
    }
  }
  if (n.domObserver.disconnectSelection(), n.cursorWrapper)
    Ry(n);
  else {
    let { anchor: s, head: i } = t, o, a;
    sd && !(t instanceof O) && (t.$from.parent.inlineContent || (o = id(n, t.from)), !t.empty && !t.$from.parent.inlineContent && (a = id(n, t.to))), n.docView.setSelection(s, i, n, e), sd && (o && od(o), a && od(a)), t.visible ? n.dom.classList.remove("ProseMirror-hideselection") : (n.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && Py(n));
  }
  n.domObserver.setCurSelection(), n.domObserver.connectSelection();
}
const sd = le || ie && xh < 63;
function id(n, e) {
  let { node: t, offset: r } = n.docView.domFromPos(e, 0), s = r < t.childNodes.length ? t.childNodes[r] : null, i = r ? t.childNodes[r - 1] : null;
  if (le && s && s.contentEditable == "false")
    return ta(s);
  if ((!s || s.contentEditable == "false") && (!i || i.contentEditable == "false")) {
    if (s)
      return ta(s);
    if (i)
      return ta(i);
  }
}
function ta(n) {
  return n.contentEditable = "true", le && n.draggable && (n.draggable = !1, n.wasDraggable = !0), n;
}
function od(n) {
  n.contentEditable = "false", n.wasDraggable && (n.draggable = !0, n.wasDraggable = null);
}
function Py(n) {
  let e = n.dom.ownerDocument;
  e.removeEventListener("selectionchange", n.input.hideSelectionGuard);
  let t = n.domSelectionRange(), r = t.anchorNode, s = t.anchorOffset;
  e.addEventListener("selectionchange", n.input.hideSelectionGuard = () => {
    (t.anchorNode != r || t.anchorOffset != s) && (e.removeEventListener("selectionchange", n.input.hideSelectionGuard), setTimeout(() => {
      (!Dh(n) || n.state.selection.visible) && n.dom.classList.remove("ProseMirror-hideselection");
    }, 20));
  });
}
function Ry(n) {
  let e = n.domSelection();
  if (!e)
    return;
  let t = n.cursorWrapper.dom, r = t.nodeName == "IMG";
  r ? e.collapse(t.parentNode, re(t) + 1) : e.collapse(t, 0), !r && !n.state.selection.visible && be && gt <= 11 && (t.disabled = !0, t.disabled = !1);
}
function Ph(n, e) {
  if (e instanceof _) {
    let t = n.docView.descAt(e.from);
    t != n.lastSelectedViewDesc && (ad(n), t && t.selectNode(), n.lastSelectedViewDesc = t);
  } else
    ad(n);
}
function ad(n) {
  n.lastSelectedViewDesc && (n.lastSelectedViewDesc.parent && n.lastSelectedViewDesc.deselectNode(), n.lastSelectedViewDesc = void 0);
}
function vl(n, e, t, r) {
  return n.someProp("createSelectionBetween", (s) => s(n, e, t)) || O.between(e, t, r);
}
function ld(n) {
  return n.editable && !n.hasFocus() ? !1 : Rh(n);
}
function Rh(n) {
  let e = n.domSelectionRange();
  if (!e.anchorNode)
    return !1;
  try {
    return n.dom.contains(e.anchorNode.nodeType == 3 ? e.anchorNode.parentNode : e.anchorNode) && (n.editable || n.dom.contains(e.focusNode.nodeType == 3 ? e.focusNode.parentNode : e.focusNode));
  } catch {
    return !1;
  }
}
function Ly(n) {
  let e = n.docView.domFromPos(n.state.selection.anchor, 0), t = n.domSelectionRange();
  return Gt(e.node, e.offset, t.anchorNode, t.anchorOffset);
}
function La(n, e) {
  let { $anchor: t, $head: r } = n.selection, s = e > 0 ? t.max(r) : t.min(r), i = s.parent.inlineContent ? s.depth ? n.doc.resolve(e > 0 ? s.after() : s.before()) : null : s;
  return i && $.findFrom(i, e);
}
function ot(n, e) {
  return n.dispatch(n.state.tr.setSelection(e).scrollIntoView()), !0;
}
function cd(n, e, t) {
  let r = n.state.selection;
  if (r instanceof O)
    if (t.indexOf("s") > -1) {
      let { $head: s } = r, i = s.textOffset ? null : e < 0 ? s.nodeBefore : s.nodeAfter;
      if (!i || i.isText || !i.isLeaf)
        return !1;
      let o = n.state.doc.resolve(s.pos + i.nodeSize * (e < 0 ? -1 : 1));
      return ot(n, new O(r.$anchor, o));
    } else if (r.empty) {
      if (n.endOfTextblock(e > 0 ? "forward" : "backward")) {
        let s = La(n.state, e);
        return s && s instanceof _ ? ot(n, s) : !1;
      } else if (!(Me && t.indexOf("m") > -1)) {
        let s = r.$head, i = s.textOffset ? null : e < 0 ? s.nodeBefore : s.nodeAfter, o;
        if (!i || i.isText)
          return !1;
        let a = e < 0 ? s.pos - i.nodeSize : s.pos;
        return i.isAtom || (o = n.docView.descAt(a)) && !o.contentDOM ? _.isSelectable(i) ? ot(n, new _(e < 0 ? n.state.doc.resolve(s.pos - i.nodeSize) : s)) : Br ? ot(n, new O(n.state.doc.resolve(e < 0 ? a : a + i.nodeSize))) : !1 : !1;
      }
    } else return !1;
  else {
    if (r instanceof _ && r.node.isInline)
      return ot(n, new O(e > 0 ? r.$to : r.$from));
    {
      let s = La(n.state, e);
      return s ? ot(n, s) : !1;
    }
  }
}
function Mi(n) {
  return n.nodeType == 3 ? n.nodeValue.length : n.childNodes.length;
}
function Gn(n, e) {
  let t = n.pmViewDesc;
  return t && t.size == 0 && (e < 0 || n.nextSibling || n.nodeName != "BR");
}
function rn(n, e) {
  return e < 0 ? zy(n) : By(n);
}
function zy(n) {
  let e = n.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
  if (!t)
    return;
  let s, i, o = !1;
  for (Ae && t.nodeType == 1 && r < Mi(t) && Gn(t.childNodes[r], -1) && (o = !0); ; )
    if (r > 0) {
      if (t.nodeType != 1)
        break;
      {
        let a = t.childNodes[r - 1];
        if (Gn(a, -1))
          s = t, i = --r;
        else if (a.nodeType == 3)
          t = a, r = t.nodeValue.length;
        else
          break;
      }
    } else {
      if (Lh(t))
        break;
      {
        let a = t.previousSibling;
        for (; a && Gn(a, -1); )
          s = t.parentNode, i = re(a), a = a.previousSibling;
        if (a)
          t = a, r = Mi(t);
        else {
          if (t = t.parentNode, t == n.dom)
            break;
          r = 0;
        }
      }
    }
  o ? za(n, t, r) : s && za(n, s, i);
}
function By(n) {
  let e = n.domSelectionRange(), t = e.focusNode, r = e.focusOffset;
  if (!t)
    return;
  let s = Mi(t), i, o;
  for (; ; )
    if (r < s) {
      if (t.nodeType != 1)
        break;
      let a = t.childNodes[r];
      if (Gn(a, 1))
        i = t, o = ++r;
      else
        break;
    } else {
      if (Lh(t))
        break;
      {
        let a = t.nextSibling;
        for (; a && Gn(a, 1); )
          i = a.parentNode, o = re(a) + 1, a = a.nextSibling;
        if (a)
          t = a, r = 0, s = Mi(t);
        else {
          if (t = t.parentNode, t == n.dom)
            break;
          r = s = 0;
        }
      }
    }
  i && za(n, i, o);
}
function Lh(n) {
  let e = n.pmViewDesc;
  return e && e.node && e.node.isBlock;
}
function Fy(n, e) {
  for (; n && e == n.childNodes.length && !zr(n); )
    e = re(n) + 1, n = n.parentNode;
  for (; n && e < n.childNodes.length; ) {
    let t = n.childNodes[e];
    if (t.nodeType == 3)
      return t;
    if (t.nodeType == 1 && t.contentEditable == "false")
      break;
    n = t, e = 0;
  }
}
function Hy(n, e) {
  for (; n && !e && !zr(n); )
    e = re(n), n = n.parentNode;
  for (; n && e; ) {
    let t = n.childNodes[e - 1];
    if (t.nodeType == 3)
      return t;
    if (t.nodeType == 1 && t.contentEditable == "false")
      break;
    n = t, e = n.childNodes.length;
  }
}
function za(n, e, t) {
  if (e.nodeType != 3) {
    let i, o;
    (o = Fy(e, t)) ? (e = o, t = 0) : (i = Hy(e, t)) && (e = i, t = i.nodeValue.length);
  }
  let r = n.domSelection();
  if (!r)
    return;
  if (So(r)) {
    let i = document.createRange();
    i.setEnd(e, t), i.setStart(e, t), r.removeAllRanges(), r.addRange(i);
  } else r.extend && r.extend(e, t);
  n.domObserver.setCurSelection();
  let { state: s } = n;
  setTimeout(() => {
    n.state == s && tt(n);
  }, 50);
}
function dd(n, e) {
  let t = n.state.doc.resolve(e);
  if (!(ie || wh) && t.parent.inlineContent) {
    let s = n.coordsAtPos(e);
    if (e > t.start()) {
      let i = n.coordsAtPos(e - 1), o = (i.top + i.bottom) / 2;
      if (o > s.top && o < s.bottom && Math.abs(i.left - s.left) > 1)
        return i.left < s.left ? "ltr" : "rtl";
    }
    if (e < t.end()) {
      let i = n.coordsAtPos(e + 1), o = (i.top + i.bottom) / 2;
      if (o > s.top && o < s.bottom && Math.abs(i.left - s.left) > 1)
        return i.left > s.left ? "ltr" : "rtl";
    }
  }
  return getComputedStyle(n.dom).direction == "rtl" ? "rtl" : "ltr";
}
function ud(n, e, t) {
  let r = n.state.selection;
  if (r instanceof O && !r.empty || t.indexOf("s") > -1 || Me && t.indexOf("m") > -1)
    return !1;
  let { $from: s, $to: i } = r;
  if (!s.parent.inlineContent || n.endOfTextblock(e < 0 ? "up" : "down")) {
    let o = La(n.state, e);
    if (o && o instanceof _)
      return ot(n, o);
  }
  if (!s.parent.inlineContent) {
    let o = e < 0 ? s : i, a = r instanceof xe ? $.near(o, e) : $.findFrom(o, e);
    return a ? ot(n, a) : !1;
  }
  return !1;
}
function hd(n, e) {
  if (!(n.state.selection instanceof O))
    return !0;
  let { $head: t, $anchor: r, empty: s } = n.state.selection;
  if (!t.sameParent(r))
    return !0;
  if (!s)
    return !1;
  if (n.endOfTextblock(e > 0 ? "forward" : "backward"))
    return !0;
  let i = !t.textOffset && (e < 0 ? t.nodeBefore : t.nodeAfter);
  if (i && !i.isText) {
    let o = n.state.tr;
    return e < 0 ? o.delete(t.pos - i.nodeSize, t.pos) : o.delete(t.pos, t.pos + i.nodeSize), n.dispatch(o), !0;
  }
  return !1;
}
function fd(n, e, t) {
  n.domObserver.stop(), e.contentEditable = t, n.domObserver.start();
}
function Vy(n) {
  if (!le || n.state.selection.$head.parentOffset > 0)
    return !1;
  let { focusNode: e, focusOffset: t } = n.domSelectionRange();
  if (e && e.nodeType == 1 && t == 0 && e.firstChild && e.firstChild.contentEditable == "false") {
    let r = e.firstChild;
    fd(n, r, "true"), setTimeout(() => fd(n, r, "false"), 20);
  }
  return !1;
}
function Wy(n) {
  let e = "";
  return n.ctrlKey && (e += "c"), n.metaKey && (e += "m"), n.altKey && (e += "a"), n.shiftKey && (e += "s"), e;
}
function jy(n, e) {
  let t = e.keyCode, r = Wy(e);
  if (t == 8 || Me && t == 72 && r == "c")
    return hd(n, -1) || rn(n, -1);
  if (t == 46 && !e.shiftKey || Me && t == 68 && r == "c")
    return hd(n, 1) || rn(n, 1);
  if (t == 13 || t == 27)
    return !0;
  if (t == 37 || Me && t == 66 && r == "c") {
    let s = t == 37 ? dd(n, n.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return cd(n, s, r) || rn(n, s);
  } else if (t == 39 || Me && t == 70 && r == "c") {
    let s = t == 39 ? dd(n, n.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return cd(n, s, r) || rn(n, s);
  } else {
    if (t == 38 || Me && t == 80 && r == "c")
      return ud(n, -1, r) || rn(n, -1);
    if (t == 40 || Me && t == 78 && r == "c")
      return Vy(n) || ud(n, 1, r) || rn(n, 1);
    if (r == (Me ? "m" : "c") && (t == 66 || t == 73 || t == 89 || t == 90))
      return !0;
  }
  return !1;
}
function kl(n, e) {
  n.someProp("transformCopied", (f) => {
    e = f(e, n);
  });
  let t = [], { content: r, openStart: s, openEnd: i } = e;
  for (; s > 1 && i > 1 && r.childCount == 1 && r.firstChild.childCount == 1; ) {
    s--, i--;
    let f = r.firstChild;
    t.push(f.type.name, f.attrs != f.type.defaultAttrs ? f.attrs : null), r = f.content;
  }
  let o = n.someProp("clipboardSerializer") || Qt.fromSchema(n.state.schema), a = Wh(), l = a.createElement("div");
  l.appendChild(o.serializeFragment(r, { document: a }));
  let c = l.firstChild, d, u = 0;
  for (; c && c.nodeType == 1 && (d = Vh[c.nodeName.toLowerCase()]); ) {
    for (let f = d.length - 1; f >= 0; f--) {
      let p = a.createElement(d[f]);
      for (; l.firstChild; )
        p.appendChild(l.firstChild);
      l.appendChild(p), u++;
    }
    c = l.firstChild;
  }
  c && c.nodeType == 1 && c.setAttribute("data-pm-slice", `${s} ${i}${u ? ` -${u}` : ""} ${JSON.stringify(t)}`);
  let h = n.someProp("clipboardTextSerializer", (f) => f(e, n)) || e.content.textBetween(0, e.content.size, `

`);
  return { dom: l, text: h, slice: e };
}
function zh(n, e, t, r, s) {
  let i = s.parent.type.spec.code, o, a;
  if (!t && !e)
    return null;
  let l = !!e && (r || i || !t);
  if (l) {
    if (n.someProp("transformPastedText", (h) => {
      e = h(e, i || r, n);
    }), i)
      return a = new w(b.from(n.state.schema.text(e.replace(/\r\n?/g, `
`))), 0, 0), n.someProp("transformPasted", (h) => {
        a = h(a, n, !0);
      }), a;
    let u = n.someProp("clipboardTextParser", (h) => h(e, s, r, n));
    if (u)
      a = u;
    else {
      let h = s.marks(), { schema: f } = n.state, p = Qt.fromSchema(f);
      o = document.createElement("div"), e.split(/(?:\r\n?|\n)+/).forEach((m) => {
        let g = o.appendChild(document.createElement("p"));
        m && g.appendChild(p.serializeNode(f.text(m, h)));
      });
    }
  } else
    n.someProp("transformPastedHTML", (u) => {
      t = u(t, n);
    }), o = Jy(t), Br && Gy(o);
  let c = o && o.querySelector("[data-pm-slice]"), d = c && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(c.getAttribute("data-pm-slice") || "");
  if (d && d[3])
    for (let u = +d[3]; u > 0; u--) {
      let h = o.firstChild;
      for (; h && h.nodeType != 1; )
        h = h.nextSibling;
      if (!h)
        break;
      o = h;
    }
  if (a || (a = (n.someProp("clipboardParser") || n.someProp("domParser") || mt.fromSchema(n.state.schema)).parseSlice(o, {
    preserveWhitespace: !!(l || d),
    context: s,
    ruleFromNode(h) {
      return h.nodeName == "BR" && !h.nextSibling && h.parentNode && !qy.test(h.parentNode.nodeName) ? { ignore: !0 } : null;
    }
  })), d)
    a = Yy(pd(a, +d[1], +d[2]), d[4]);
  else if (a = w.maxOpen(Uy(a.content, s), !0), a.openStart || a.openEnd) {
    let u = 0, h = 0;
    for (let f = a.content.firstChild; u < a.openStart && !f.type.spec.isolating; u++, f = f.firstChild)
      ;
    for (let f = a.content.lastChild; h < a.openEnd && !f.type.spec.isolating; h++, f = f.lastChild)
      ;
    a = pd(a, u, h);
  }
  return n.someProp("transformPasted", (u) => {
    a = u(a, n, l);
  }), a;
}
const qy = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function Uy(n, e) {
  if (n.childCount < 2)
    return n;
  for (let t = e.depth; t >= 0; t--) {
    let s = e.node(t).contentMatchAt(e.index(t)), i, o = [];
    if (n.forEach((a) => {
      if (!o)
        return;
      let l = s.findWrapping(a.type), c;
      if (!l)
        return o = null;
      if (c = o.length && i.length && Fh(l, i, a, o[o.length - 1], 0))
        o[o.length - 1] = c;
      else {
        o.length && (o[o.length - 1] = Hh(o[o.length - 1], i.length));
        let d = Bh(a, l);
        o.push(d), s = s.matchType(d.type), i = l;
      }
    }), o)
      return b.from(o);
  }
  return n;
}
function Bh(n, e, t = 0) {
  for (let r = e.length - 1; r >= t; r--)
    n = e[r].create(null, b.from(n));
  return n;
}
function Fh(n, e, t, r, s) {
  if (s < n.length && s < e.length && n[s] == e[s]) {
    let i = Fh(n, e, t, r.lastChild, s + 1);
    if (i)
      return r.copy(r.content.replaceChild(r.childCount - 1, i));
    if (r.contentMatchAt(r.childCount).matchType(s == n.length - 1 ? t.type : n[s + 1]))
      return r.copy(r.content.append(b.from(Bh(t, n, s + 1))));
  }
}
function Hh(n, e) {
  if (e == 0)
    return n;
  let t = n.content.replaceChild(n.childCount - 1, Hh(n.lastChild, e - 1)), r = n.contentMatchAt(n.childCount).fillBefore(b.empty, !0);
  return n.copy(t.append(r));
}
function Ba(n, e, t, r, s, i) {
  let o = e < 0 ? n.firstChild : n.lastChild, a = o.content;
  return n.childCount > 1 && (i = 0), s < r - 1 && (a = Ba(a, e, t, r, s + 1, i)), s >= t && (a = e < 0 ? o.contentMatchAt(0).fillBefore(a, i <= s).append(a) : a.append(o.contentMatchAt(o.childCount).fillBefore(b.empty, !0))), n.replaceChild(e < 0 ? 0 : n.childCount - 1, o.copy(a));
}
function pd(n, e, t) {
  return e < n.openStart && (n = new w(Ba(n.content, -1, e, n.openStart, 0, n.openEnd), e, n.openEnd)), t < n.openEnd && (n = new w(Ba(n.content, 1, t, n.openEnd, 0, 0), n.openStart, t)), n;
}
const Vh = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
function Wh() {
  return document.implementation.createHTMLDocument("title");
}
let na = null;
function Ky(n) {
  let e = window.trustedTypes;
  return e ? (na || (na = e.defaultPolicy || e.createPolicy("ProseMirrorClipboard", { createHTML: (t) => t })), na.createHTML(n)) : n;
}
function Jy(n) {
  let e = /^(\s*<meta [^>]*>)*/.exec(n);
  e && (n = n.slice(e[0].length));
  let t = Wh(), r = t.body, s = /<([a-z][^>\s]+)/i.exec(n), i;
  if ((i = s && Vh[s[1].toLowerCase()]) && (n = i.map((o) => "<" + o + ">").join("") + n + i.map((o) => "</" + o + ">").reverse().join("")), r.innerHTML = Ky(n), i)
    for (let o = 0; o < i.length; o++)
      r = r.querySelector(i[o]) || r;
  for (let o = 0; o < t.styleSheets.length; o++) {
    let a = t.styleSheets[o];
    for (let l = 0; l < a.rules.length; l++) {
      let c = a.rules[l];
      if (c instanceof CSSStyleRule) {
        let d = r.querySelectorAll(c.selectorText);
        for (let u = 0; u < d.length; u++)
          d[u].style.cssText += c.style.cssText;
      }
    }
  }
  return r;
}
function Gy(n) {
  let e = n.querySelectorAll(ie ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let t = 0; t < e.length; t++) {
    let r = e[t];
    r.childNodes.length == 1 && r.textContent == " " && r.parentNode && r.parentNode.replaceChild(n.ownerDocument.createTextNode(" "), r);
  }
}
function Yy(n, e) {
  if (!n.size)
    return n;
  let t = n.content.firstChild.type.schema, r;
  try {
    r = JSON.parse(e);
  } catch {
    return n;
  }
  let { content: s, openStart: i, openEnd: o } = n;
  for (let a = r.length - 2; a >= 0; a -= 2) {
    let l = t.nodes[r[a]];
    if (!l || l.hasRequiredAttrs())
      break;
    s = b.from(l.create(r[a + 1], s)), i++, o++;
  }
  return new w(s, i, o);
}
const he = {}, fe = {}, Xy = { touchstart: !0, touchmove: !0 };
class Qy {
  constructor() {
    this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 }, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = /* @__PURE__ */ Object.create(null), this.hideSelectionGuard = null;
  }
}
function Zy(n) {
  for (let e in he) {
    let t = he[e];
    n.dom.addEventListener(e, n.input.eventHandlers[e] = (r) => {
      tb(n, r) && !xl(n, r) && (n.editable || !(r.type in fe)) && t(n, r);
    }, Xy[e] ? { passive: !0 } : void 0);
  }
  le && n.dom.addEventListener("input", () => null), Fa(n);
}
function Ze(n, e) {
  n.input.lastSelectionOrigin = e, n.input.lastSelectionTime = Date.now();
}
function eb(n) {
  n.input.mouseDown && n.input.mouseDown.done(), n.domObserver.stop();
  for (let e in n.input.eventHandlers)
    n.dom.removeEventListener(e, n.input.eventHandlers[e]);
  clearTimeout(n.input.composingTimeout), clearTimeout(n.input.lastIOSEnterFallbackTimeout);
}
function Fa(n) {
  n.someProp("handleDOMEvents", (e) => {
    for (let t in e)
      n.input.eventHandlers[t] || n.dom.addEventListener(t, n.input.eventHandlers[t] = (r) => xl(n, r));
  });
}
function xl(n, e) {
  return n.someProp("handleDOMEvents", (t) => {
    let r = t[e.type];
    return r ? r(n, e) || e.defaultPrevented : !1;
  });
}
function tb(n, e) {
  if (!e.bubbles)
    return !0;
  if (e.defaultPrevented)
    return !1;
  for (let t = e.target; t != n.dom; t = t.parentNode)
    if (!t || t.nodeType == 11 || t.pmViewDesc && t.pmViewDesc.stopEvent(e))
      return !1;
  return !0;
}
function nb(n, e) {
  !xl(n, e) && he[e.type] && (n.editable || !(e.type in fe)) && he[e.type](n, e);
}
fe.keydown = (n, e) => {
  let t = e;
  if (n.input.shiftKey = t.keyCode == 16 || t.shiftKey, !Kh(n) && (n.input.lastKeyCode = t.keyCode, n.input.lastKeyCodeTime = Date.now(), !(Qe && ie && t.keyCode == 13)))
    if (t.keyCode != 229 && n.domObserver.forceFlush(), gn && t.keyCode == 13 && !t.ctrlKey && !t.altKey && !t.metaKey) {
      let r = Date.now();
      n.input.lastIOSEnter = r, n.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
        n.input.lastIOSEnter == r && (n.someProp("handleKeyDown", (s) => s(n, Ot(13, "Enter"))), n.input.lastIOSEnter = 0);
      }, 200);
    } else n.someProp("handleKeyDown", (r) => r(n, t)) || jy(n, t) ? t.preventDefault() : Ze(n, "key");
};
fe.keyup = (n, e) => {
  e.keyCode == 16 && (n.input.shiftKey = !1);
};
fe.keypress = (n, e) => {
  let t = e;
  if (Kh(n) || !t.charCode || t.ctrlKey && !t.altKey || Me && t.metaKey)
    return;
  if (n.someProp("handleKeyPress", (s) => s(n, t))) {
    t.preventDefault();
    return;
  }
  let r = n.state.selection;
  if (!(r instanceof O) || !r.$from.sameParent(r.$to)) {
    let s = String.fromCharCode(t.charCode), i = () => n.state.tr.insertText(s).scrollIntoView();
    !/[\r\n]/.test(s) && !n.someProp("handleTextInput", (o) => o(n, r.$from.pos, r.$to.pos, s, i)) && n.dispatch(i()), t.preventDefault();
  }
};
function Hr(n) {
  return { left: n.clientX, top: n.clientY };
}
function rb(n, e) {
  let t = e.x - n.clientX, r = e.y - n.clientY;
  return t * t + r * r < 100;
}
function wl(n, e, t, r, s) {
  if (r == -1)
    return !1;
  let i = n.state.doc.resolve(r);
  for (let o = i.depth + 1; o > 0; o--)
    if (n.someProp(e, (a) => o > i.depth ? a(n, t, i.nodeAfter, i.before(o), s, !0) : a(n, t, i.node(o), i.before(o), s, !1)))
      return !0;
  return !1;
}
function Vr(n, e, t) {
  if (n.focused || n.focus(), n.state.selection.eq(e))
    return;
  let r = n.state.tr.setSelection(e);
  r.setMeta("pointer", !0), n.dispatch(r);
}
function sb(n, e) {
  if (e == -1)
    return !1;
  let t = n.state.doc.resolve(e), r = t.nodeAfter;
  return r && r.isAtom && _.isSelectable(r) ? (Vr(n, new _(t)), !0) : !1;
}
function ib(n, e) {
  if (e == -1)
    return !1;
  let t = n.state.selection, r, s;
  t instanceof _ && (r = t.node);
  let i = n.state.doc.resolve(e);
  for (let o = i.depth + 1; o > 0; o--) {
    let a = o > i.depth ? i.nodeAfter : i.node(o);
    if (_.isSelectable(a)) {
      r && t.$from.depth > 0 && o >= t.$from.depth && i.before(t.$from.depth + 1) == t.$from.pos ? s = i.before(t.$from.depth) : s = i.before(o);
      break;
    }
  }
  return s != null ? (Vr(n, _.create(n.state.doc, s)), !0) : !1;
}
function ob(n, e, t, r, s) {
  return wl(n, "handleClickOn", e, t, r) || n.someProp("handleClick", (i) => i(n, e, r)) || (s ? ib(n, t) : sb(n, t));
}
function ab(n, e, t, r) {
  return wl(n, "handleDoubleClickOn", e, t, r) || n.someProp("handleDoubleClick", (s) => s(n, e, r));
}
function lb(n, e, t, r) {
  return wl(n, "handleTripleClickOn", e, t, r) || n.someProp("handleTripleClick", (s) => s(n, e, r)) || cb(n, t, r);
}
function cb(n, e, t) {
  if (t.button != 0)
    return !1;
  let r = jh(n, e, !0), s = n.state.doc;
  return r ? (Vr(n, r), r instanceof O && s.eq(n.state.doc) && (n.input.mouseDown = new ub(n, r)), !0) : !1;
}
function jh(n, e, t) {
  let r = n.state.doc;
  if (e == -1)
    return r.inlineContent ? O.create(r, 0, r.content.size) : null;
  let s = r.resolve(e);
  for (let i = s.depth + 1; i > 0; i--) {
    let o = i > s.depth ? s.nodeAfter : s.node(i), a = s.before(i);
    if (o.inlineContent)
      return O.create(r, a + 1, a + 1 + o.content.size);
    if (t && _.isSelectable(o))
      return _.create(r, a);
  }
  return null;
}
function Sl(n) {
  return Ei(n);
}
const qh = Me ? "metaKey" : "ctrlKey";
he.mousedown = (n, e) => {
  let t = e;
  n.input.shiftKey = t.shiftKey;
  let r = Sl(n), s = Date.now(), i = "singleClick";
  s - n.input.lastClick.time < 500 && rb(t, n.input.lastClick) && !t[qh] && n.input.lastClick.button == t.button && (n.input.lastClick.type == "singleClick" ? i = "doubleClick" : n.input.lastClick.type == "doubleClick" && (i = "tripleClick")), n.input.lastClick = { time: s, x: t.clientX, y: t.clientY, type: i, button: t.button }, n.input.mouseDown && n.input.mouseDown.done();
  let o = n.posAtCoords(Hr(t));
  o && (i == "singleClick" ? n.input.mouseDown = new db(n, o, t, !!r) : (i == "doubleClick" ? ab : lb)(n, o.pos, o.inside, t) ? t.preventDefault() : Ze(n, "pointer"));
};
class Uh {
  constructor(e) {
    this.view = e, this.mightDrag = null, e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this));
  }
  up(e) {
    this.done();
  }
  move(e) {
    e.buttons == 0 && this.done();
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.view.input.mouseDown == this && (this.view.input.mouseDown = null);
  }
  delaySelUpdate() {
    return !1;
  }
}
class db extends Uh {
  constructor(e, t, r, s) {
    super(e), this.pos = t, this.event = r, this.flushed = s, this.delayedSelectionSync = !1, this.startDoc = e.state.doc, this.selectNode = !!r[qh], this.allowDefault = r.shiftKey;
    let i, o;
    if (t.inside > -1)
      i = e.state.doc.nodeAt(t.inside), o = t.inside;
    else {
      let d = e.state.doc.resolve(t.pos);
      i = d.parent, o = d.depth ? d.before() : 0;
    }
    const a = s ? null : r.target, l = a ? e.docView.nearestDesc(a, !0) : null;
    this.target = l && l.nodeDOM.nodeType == 1 ? l.nodeDOM : null;
    let { selection: c } = e.state;
    r.button == 0 && (i.type.spec.draggable && i.type.spec.selectable !== !1 || c instanceof _ && c.from <= o && c.to > o) && (this.mightDrag = {
      node: i,
      pos: o,
      addAttr: !!(this.target && !this.target.draggable),
      setUneditable: !!(this.target && Ae && !this.target.hasAttribute("contentEditable"))
    }), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
      this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
    }, 20), this.view.domObserver.start()), Ze(e, "pointer");
  }
  done() {
    super.done(), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => {
      this.view.isDestroyed || tt(this.view);
    });
  }
  up(e) {
    if (this.done(), !this.view.dom.contains(e.target))
      return;
    let t = this.pos;
    this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(Hr(e))), this.updateAllowDefault(e), this.allowDefault || !t ? Ze(this.view, "pointer") : ob(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    le && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    ie && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Vr(this.view, $.near(this.view.state.doc.resolve(t.pos))), e.preventDefault()) : Ze(this.view, "pointer");
  }
  move(e) {
    this.updateAllowDefault(e), Ze(this.view, "pointer"), super.move(e);
  }
  updateAllowDefault(e) {
    !this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
  }
  delaySelUpdate() {
    return this.allowDefault ? (this.delayedSelectionSync = !0, !0) : !1;
  }
}
class ub extends Uh {
  constructor(e, t) {
    super(e), this.startSelection = t, this.startDoc = e.state.doc;
  }
  move(e) {
    if (e.buttons == 0 || this.view.isDestroyed || !this.view.state.doc.eq(this.startDoc)) {
      this.done();
      return;
    }
    e.preventDefault(), Ze(this.view, "pointer");
    let t = this.view.posAtCoords(Hr(e)), r = t && jh(this.view, t.inside, !1);
    if (!r)
      return;
    let { doc: s } = this.view.state, i = this.startSelection, [o, a] = r.from < i.from ? [i.to, r.from] : [i.from, r.to];
    Vr(this.view, O.create(s, o, a));
  }
}
he.touchstart = (n) => {
  n.input.lastTouch = Date.now(), Sl(n), Ze(n, "pointer");
};
he.touchmove = (n) => {
  n.input.lastTouch = Date.now(), Ze(n, "pointer");
};
he.contextmenu = (n) => Sl(n);
function Kh(n, e) {
  return n.composing ? !0 : le && Math.abs(Date.now() - n.input.compositionEndedAt) < 500 ? (n.input.compositionEndedAt = -2e8, !0) : !1;
}
const hb = Qe ? 5e3 : -1;
fe.compositionstart = fe.compositionupdate = (n) => {
  if (!n.composing) {
    n.domObserver.flush();
    let { state: e } = n, t = e.selection.$to;
    if (e.selection instanceof O && (e.storedMarks || !t.textOffset && t.parentOffset && t.nodeBefore.marks.some((r) => r.type.spec.inclusive === !1) || ie && wh && fb(n)))
      n.markCursor = n.state.storedMarks || t.marks(), Ei(n, !0), n.markCursor = null;
    else if (Ei(n, !e.selection.empty), Ae && e.selection.empty && t.parentOffset && !t.textOffset && t.nodeBefore.marks.length) {
      let r = n.domSelectionRange();
      for (let s = r.focusNode, i = r.focusOffset; s && s.nodeType == 1 && i != 0; ) {
        let o = i < 0 ? s.lastChild : s.childNodes[i - 1];
        if (!o)
          break;
        if (o.nodeType == 3) {
          let a = n.domSelection();
          a && a.collapse(o, o.nodeValue.length);
          break;
        } else
          s = o, i = -1;
      }
    }
    n.input.composing = !0;
  }
  Jh(n, hb);
};
function fb(n) {
  let { focusNode: e, focusOffset: t } = n.domSelectionRange();
  if (!e || e.nodeType != 1 || t >= e.childNodes.length)
    return !1;
  let r = e.childNodes[t];
  return r.nodeType == 1 && r.contentEditable == "false";
}
fe.compositionend = (n, e) => {
  n.composing && (n.input.composing = !1, n.input.compositionEndedAt = Date.now(), n.input.compositionPendingChanges = n.domObserver.pendingRecords().length ? n.input.compositionID : 0, n.input.compositionNode = null, n.input.badSafariComposition ? n.domObserver.forceFlush() : n.input.compositionPendingChanges && Promise.resolve().then(() => n.domObserver.flush()), n.input.compositionID++, Jh(n, 20));
};
function Jh(n, e) {
  clearTimeout(n.input.composingTimeout), e > -1 && (n.input.composingTimeout = setTimeout(() => Ei(n), e));
}
function Gh(n) {
  for (n.composing && (n.input.composing = !1, n.input.compositionEndedAt = Date.now()); n.input.compositionNodes.length > 0; )
    n.input.compositionNodes.pop().markParentsDirty();
}
function pb(n) {
  let e = n.domSelectionRange();
  if (!e.focusNode)
    return null;
  let t = iy(e.focusNode, e.focusOffset), r = oy(e.focusNode, e.focusOffset);
  if (t && r && t != r) {
    let s = r.pmViewDesc, i = n.domObserver.lastChangedTextNode;
    if (t == i || r == i)
      return i;
    if (!s || !s.isText(r.nodeValue))
      return r;
    if (n.input.compositionNode == r) {
      let o = t.pmViewDesc;
      if (!(!o || !o.isText(t.nodeValue)))
        return r;
    }
  }
  return t || r;
}
function Ei(n, e = !1) {
  if (!(Qe && n.domObserver.flushingSoon >= 0)) {
    if (n.domObserver.forceFlush(), Gh(n), e || n.docView && n.docView.dirty) {
      let t = bl(n), r = n.state.selection;
      return t && !t.eq(r) ? n.dispatch(n.state.tr.setSelection(t)) : (n.markCursor || e) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? n.dispatch(n.state.tr.deleteSelection()) : n.updateState(n.state), !0;
    }
    return !1;
  }
}
function mb(n, e) {
  if (!n.dom.parentNode)
    return;
  let t = n.dom.parentNode.appendChild(document.createElement("div"));
  t.appendChild(e), t.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let r = getSelection(), s = document.createRange();
  s.selectNodeContents(e), n.dom.blur(), r.removeAllRanges(), r.addRange(s), setTimeout(() => {
    t.parentNode && t.parentNode.removeChild(t), n.focus();
  }, 50);
}
const pr = be && gt < 15 || gn && dy < 604;
he.copy = fe.cut = (n, e) => {
  let t = e, r = n.state.selection, s = t.type == "cut";
  if (r.empty)
    return;
  let i = pr ? null : t.clipboardData, o = r.content(), { dom: a, text: l } = kl(n, o);
  i ? (t.preventDefault(), i.clearData(), i.setData("text/html", a.innerHTML), i.setData("text/plain", l)) : mb(n, a), s && n.dispatch(n.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function gb(n) {
  return n.openStart == 0 && n.openEnd == 0 && n.content.childCount == 1 ? n.content.firstChild : null;
}
function yb(n, e) {
  if (!n.dom.parentNode)
    return;
  let t = n.input.shiftKey || n.state.selection.$from.parent.type.spec.code, r = n.dom.parentNode.appendChild(document.createElement(t ? "textarea" : "div"));
  t || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
  let s = n.input.shiftKey && n.input.lastKeyCode != 45;
  setTimeout(() => {
    n.focus(), r.parentNode && r.parentNode.removeChild(r), t ? mr(n, r.value, null, s, e) : mr(n, r.textContent, r.innerHTML, s, e);
  }, 50);
}
function mr(n, e, t, r, s) {
  let i = zh(n, e, t, r, n.state.selection.$from);
  if (n.someProp("handlePaste", (l) => l(n, s, i || w.empty)))
    return !0;
  if (!i)
    return !1;
  let o = gb(i), a = o ? n.state.tr.replaceSelectionWith(o, r) : n.state.tr.replaceSelection(i);
  return n.dispatch(a.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function Yh(n) {
  let e = n.getData("text/plain") || n.getData("Text");
  if (e)
    return e;
  let t = n.getData("text/uri-list");
  return t ? t.replace(/\r?\n/g, " ") : "";
}
fe.paste = (n, e) => {
  let t = e;
  if (n.composing && !Qe)
    return;
  let r = pr ? null : t.clipboardData, s = n.input.shiftKey && n.input.lastKeyCode != 45;
  r && mr(n, Yh(r), r.getData("text/html"), s, t) ? t.preventDefault() : yb(n, t);
};
class Xh {
  constructor(e, t, r) {
    this.slice = e, this.move = t, this.node = r;
  }
}
const bb = Me ? "altKey" : "ctrlKey";
function Qh(n, e) {
  let t;
  return n.someProp("dragCopies", (r) => {
    t = t || r(e);
  }), t != null ? !t : !e[bb];
}
he.dragstart = (n, e) => {
  let t = e, r = n.input.mouseDown;
  if (r && r.done(), !t.dataTransfer)
    return;
  let s = n.state.selection, i = s.empty ? null : n.posAtCoords(Hr(t)), o;
  if (!(i && i.pos >= s.from && i.pos <= (s instanceof _ ? s.to - 1 : s.to))) {
    if (r && r.mightDrag)
      o = _.create(n.state.doc, r.mightDrag.pos);
    else if (t.target && t.target.nodeType == 1) {
      let u = n.docView.nearestDesc(t.target, !0);
      u && u.node.type.spec.draggable && u != n.docView && (o = _.create(n.state.doc, u.posBefore));
    }
  }
  let a = (o || n.state.selection).content(), { dom: l, text: c, slice: d } = kl(n, a);
  (!t.dataTransfer.files.length || !ie || xh > 120) && t.dataTransfer.clearData(), t.dataTransfer.setData(pr ? "Text" : "text/html", l.innerHTML), t.dataTransfer.effectAllowed = "copyMove", pr || t.dataTransfer.setData("text/plain", c), n.dragging = new Xh(d, Qh(n, t), o);
};
he.dragend = (n) => {
  let e = n.dragging;
  window.setTimeout(() => {
    n.dragging == e && (n.dragging = null);
  }, 50);
};
fe.dragover = fe.dragenter = (n, e) => e.preventDefault();
fe.drop = (n, e) => {
  try {
    vb(n, e, n.dragging);
  } finally {
    n.dragging = null;
  }
};
function vb(n, e, t) {
  if (!e.dataTransfer)
    return;
  let r = n.posAtCoords(Hr(e));
  if (!r)
    return;
  let s = n.state.doc.resolve(r.pos), i = t && t.slice;
  i ? n.someProp("transformPasted", (f) => {
    i = f(i, n, !1);
  }) : i = zh(n, Yh(e.dataTransfer), pr ? null : e.dataTransfer.getData("text/html"), !1, s);
  let o = !!(t && Qh(n, e));
  if (n.someProp("handleDrop", (f) => f(n, e, i || w.empty, o))) {
    e.preventDefault();
    return;
  }
  if (!i)
    return;
  e.preventDefault();
  let a = i ? Zu(n.state.doc, s.pos, i) : s.pos;
  a == null && (a = s.pos);
  let l = n.state.tr;
  if (o) {
    let { node: f } = t;
    f ? f.replace(l) : l.deleteSelection();
  }
  let c = l.mapping.map(a), d = i.openStart == 0 && i.openEnd == 0 && i.content.childCount == 1, u = l.doc;
  if (d ? l.replaceRangeWith(c, c, i.content.firstChild) : l.replaceRange(c, c, i), l.doc.eq(u))
    return;
  let h = l.doc.resolve(c);
  if (d && _.isSelectable(i.content.firstChild) && h.nodeAfter && h.nodeAfter.sameMarkup(i.content.firstChild))
    l.setSelection(new _(h));
  else {
    let f = l.mapping.map(a);
    l.mapping.maps[l.mapping.maps.length - 1].forEach((p, m, g, y) => f = y), l.setSelection(vl(n, h, l.doc.resolve(f)));
  }
  n.focus(), n.dispatch(l.setMeta("uiEvent", "drop"));
}
he.focus = (n) => {
  n.input.lastFocus = Date.now(), n.focused || (n.domObserver.stop(), n.dom.classList.add("ProseMirror-focused"), n.domObserver.start(), n.focused = !0, setTimeout(() => {
    n.docView && n.hasFocus() && !n.domObserver.currentSelection.eq(n.domSelectionRange()) && tt(n);
  }, 20));
};
he.blur = (n, e) => {
  let t = e;
  n.focused && (n.domObserver.stop(), n.dom.classList.remove("ProseMirror-focused"), n.domObserver.start(), t.relatedTarget && n.dom.contains(t.relatedTarget) && n.domObserver.currentSelection.clear(), n.focused = !1);
};
he.beforeinput = (n, e) => {
  if (Qe && e.inputType == "deleteContentBackward") {
    n.domObserver.flushSoon();
    let { domChangeCount: r } = n.input;
    setTimeout(() => {
      if (n.input.domChangeCount != r || (n.dom.blur(), n.focus(), n.someProp("handleKeyDown", (i) => i(n, Ot(8, "Backspace")))))
        return;
      let { $cursor: s } = n.state.selection;
      s && s.pos > 0 && n.dispatch(n.state.tr.delete(s.pos - 1, s.pos).scrollIntoView());
    }, 50);
  }
};
for (let n in fe)
  he[n] = fe[n];
function gr(n, e) {
  if (n == e)
    return !0;
  for (let t in n)
    if (n[t] !== e[t])
      return !1;
  for (let t in e)
    if (!(t in n))
      return !1;
  return !0;
}
class Ti {
  constructor(e, t) {
    this.toDOM = e, this.spec = t || Ft, this.side = this.spec.side || 0;
  }
  map(e, t, r, s) {
    let { pos: i, deleted: o } = e.mapResult(t.from + s, this.side < 0 ? -1 : 1);
    return o ? null : new ue(i - r, i - r, this);
  }
  valid() {
    return !0;
  }
  eq(e) {
    return this == e || e instanceof Ti && (this.spec.key && this.spec.key == e.spec.key || this.toDOM == e.toDOM && gr(this.spec, e.spec));
  }
  destroy(e) {
    this.spec.destroy && this.spec.destroy(e);
  }
}
class vt {
  constructor(e, t) {
    this.attrs = e, this.spec = t || Ft;
  }
  map(e, t, r, s) {
    let i = e.map(t.from + s, this.spec.inclusiveStart ? -1 : 1) - r, o = e.map(t.to + s, this.spec.inclusiveEnd ? 1 : -1) - r;
    return i >= o ? null : new ue(i, o, this);
  }
  valid(e, t) {
    return t.from < t.to;
  }
  eq(e) {
    return this == e || e instanceof vt && gr(this.attrs, e.attrs) && gr(this.spec, e.spec);
  }
  static is(e) {
    return e.type instanceof vt;
  }
  destroy() {
  }
}
class Cl {
  constructor(e, t) {
    this.attrs = e, this.spec = t || Ft;
  }
  map(e, t, r, s) {
    let i = e.mapResult(t.from + s, 1);
    if (i.deleted)
      return null;
    let o = e.mapResult(t.to + s, -1);
    return o.deleted || o.pos <= i.pos ? null : new ue(i.pos - r, o.pos - r, this);
  }
  valid(e, t) {
    let { index: r, offset: s } = e.content.findIndex(t.from), i;
    return s == t.from && !(i = e.child(r)).isText && s + i.nodeSize == t.to;
  }
  eq(e) {
    return this == e || e instanceof Cl && gr(this.attrs, e.attrs) && gr(this.spec, e.spec);
  }
  destroy() {
  }
}
class ue {
  /**
  @internal
  */
  constructor(e, t, r) {
    this.from = e, this.to = t, this.type = r;
  }
  /**
  @internal
  */
  copy(e, t) {
    return new ue(e, t, this.type);
  }
  /**
  @internal
  */
  eq(e, t = 0) {
    return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
  }
  /**
  @internal
  */
  map(e, t, r) {
    return this.type.map(e, this, t, r);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(e, t, r) {
    return new ue(e, e, new Ti(t, r));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(e, t, r, s) {
    return new ue(e, t, new vt(r, s));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(e, t, r, s) {
    return new ue(e, t, new Cl(r, s));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof vt;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof Ti;
  }
}
const on = [], Ft = {};
class z {
  /**
  @internal
  */
  constructor(e, t) {
    this.local = e.length ? e : on, this.children = t.length ? t : on;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(e, t) {
    return t.length ? Ai(t, e, 0, Ft) : ae;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(e, t, r) {
    let s = [];
    return this.findInner(e ?? 0, t ?? 1e9, s, 0, r), s;
  }
  findInner(e, t, r, s, i) {
    for (let o = 0; o < this.local.length; o++) {
      let a = this.local[o];
      a.from <= t && a.to >= e && (!i || i(a.spec)) && r.push(a.copy(a.from + s, a.to + s));
    }
    for (let o = 0; o < this.children.length; o += 3)
      if (this.children[o] < t && this.children[o + 1] > e) {
        let a = this.children[o] + 1;
        this.children[o + 2].findInner(e - a, t - a, r, s + a, i);
      }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(e, t, r) {
    return this == ae || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, r || Ft);
  }
  /**
  @internal
  */
  mapInner(e, t, r, s, i) {
    let o;
    for (let a = 0; a < this.local.length; a++) {
      let l = this.local[a].map(e, r, s);
      l && l.type.valid(t, l) ? (o || (o = [])).push(l) : i.onRemove && i.onRemove(this.local[a].spec);
    }
    return this.children.length ? kb(this.children, o || [], e, t, r, s, i) : o ? new z(o.sort(Ht), on) : ae;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(e, t) {
    return t.length ? this == ae ? z.create(e, t) : this.addInner(e, t, 0) : this;
  }
  addInner(e, t, r) {
    let s, i = 0;
    e.forEach((a, l) => {
      let c = l + r, d;
      if (d = ef(t, a, c)) {
        for (s || (s = this.children.slice()); i < s.length && s[i] < l; )
          i += 3;
        s[i] == l ? s[i + 2] = s[i + 2].addInner(a, d, c + 1) : s.splice(i, 0, l, l + a.nodeSize, Ai(d, a, c + 1, Ft)), i += 3;
      }
    });
    let o = Zh(i ? tf(t) : t, -r);
    for (let a = 0; a < o.length; a++)
      o[a].type.valid(e, o[a]) || o.splice(a--, 1);
    return new z(o.length ? this.local.concat(o).sort(Ht) : this.local, s || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(e) {
    return e.length == 0 || this == ae ? this : this.removeInner(e, 0);
  }
  removeInner(e, t) {
    let r = this.children, s = this.local;
    for (let i = 0; i < r.length; i += 3) {
      let o, a = r[i] + t, l = r[i + 1] + t;
      for (let d = 0, u; d < e.length; d++)
        (u = e[d]) && u.from > a && u.to < l && (e[d] = null, (o || (o = [])).push(u));
      if (!o)
        continue;
      r == this.children && (r = this.children.slice());
      let c = r[i + 2].removeInner(o, a + 1);
      c != ae ? r[i + 2] = c : (r.splice(i, 3), i -= 3);
    }
    if (s.length) {
      for (let i = 0, o; i < e.length; i++)
        if (o = e[i])
          for (let a = 0; a < s.length; a++)
            s[a].eq(o, t) && (s == this.local && (s = this.local.slice()), s.splice(a--, 1));
    }
    return r == this.children && s == this.local ? this : s.length || r.length ? new z(s, r) : ae;
  }
  forChild(e, t) {
    if (this == ae)
      return this;
    if (t.isLeaf)
      return z.empty;
    let r, s;
    for (let a = 0; a < this.children.length; a += 3)
      if (this.children[a] >= e) {
        this.children[a] == e && (r = this.children[a + 2]);
        break;
      }
    let i = e + 1, o = i + t.content.size;
    for (let a = 0; a < this.local.length; a++) {
      let l = this.local[a];
      if (l.from < o && l.to > i && l.type instanceof vt) {
        let c = Math.max(i, l.from) - i, d = Math.min(o, l.to) - i;
        c < d && (s || (s = [])).push(l.copy(c, d));
      }
    }
    if (s) {
      let a = new z(s.sort(Ht), on);
      return r ? new dt([a, r]) : a;
    }
    return r || ae;
  }
  /**
  @internal
  */
  eq(e) {
    if (this == e)
      return !0;
    if (!(e instanceof z) || this.local.length != e.local.length || this.children.length != e.children.length)
      return !1;
    for (let t = 0; t < this.local.length; t++)
      if (!this.local[t].eq(e.local[t]))
        return !1;
    for (let t = 0; t < this.children.length; t += 3)
      if (this.children[t] != e.children[t] || this.children[t + 1] != e.children[t + 1] || !this.children[t + 2].eq(e.children[t + 2]))
        return !1;
    return !0;
  }
  /**
  @internal
  */
  locals(e) {
    return Ml(this.localsInner(e));
  }
  /**
  @internal
  */
  localsInner(e) {
    if (this == ae)
      return on;
    if (e.inlineContent || !this.local.some(vt.is))
      return this.local;
    let t = [];
    for (let r = 0; r < this.local.length; r++)
      this.local[r].type instanceof vt || t.push(this.local[r]);
    return t;
  }
  forEachSet(e) {
    e(this);
  }
}
z.empty = new z([], []);
z.removeOverlap = Ml;
const ae = z.empty;
class dt {
  constructor(e) {
    this.members = e;
  }
  map(e, t) {
    const r = this.members.map((s) => s.map(e, t, Ft));
    return dt.from(r);
  }
  forChild(e, t) {
    if (t.isLeaf)
      return z.empty;
    let r = [];
    for (let s = 0; s < this.members.length; s++) {
      let i = this.members[s].forChild(e, t);
      i != ae && (i instanceof dt ? r = r.concat(i.members) : r.push(i));
    }
    return dt.from(r);
  }
  eq(e) {
    if (!(e instanceof dt) || e.members.length != this.members.length)
      return !1;
    for (let t = 0; t < this.members.length; t++)
      if (!this.members[t].eq(e.members[t]))
        return !1;
    return !0;
  }
  locals(e) {
    let t, r = !0;
    for (let s = 0; s < this.members.length; s++) {
      let i = this.members[s].localsInner(e);
      if (i.length)
        if (!t)
          t = i;
        else {
          r && (t = t.slice(), r = !1);
          for (let o = 0; o < i.length; o++)
            t.push(i[o]);
        }
    }
    return t ? Ml(r ? t : t.sort(Ht)) : on;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(e) {
    switch (e.length) {
      case 0:
        return ae;
      case 1:
        return e[0];
      default:
        return new dt(e.every((t) => t instanceof z) ? e : e.reduce((t, r) => t.concat(r instanceof z ? r : r.members), []));
    }
  }
  forEachSet(e) {
    for (let t = 0; t < this.members.length; t++)
      this.members[t].forEachSet(e);
  }
}
function kb(n, e, t, r, s, i, o) {
  let a = n.slice();
  for (let c = 0, d = i; c < t.maps.length; c++) {
    let u = 0;
    t.maps[c].forEach((h, f, p, m) => {
      let g = m - p - (f - h);
      for (let y = 0; y < a.length; y += 3) {
        let k = a[y + 1];
        if (k < 0 || h > k + d - u)
          continue;
        let C = a[y] + d - u;
        f >= C ? a[y + 1] = h <= C ? -2 : -1 : h >= d && g && (a[y] += g, a[y + 1] += g);
      }
      u += g;
    }), d = t.maps[c].map(d, -1);
  }
  let l = !1;
  for (let c = 0; c < a.length; c += 3)
    if (a[c + 1] < 0) {
      if (a[c + 1] == -2) {
        l = !0, a[c + 1] = -1;
        continue;
      }
      let d = t.map(n[c] + i), u = d - s;
      if (u < 0 || u >= r.content.size) {
        l = !0;
        continue;
      }
      let h = t.map(n[c + 1] + i, -1), f = h - s, { index: p, offset: m } = r.content.findIndex(u), g = r.maybeChild(p);
      if (g && m == u && m + g.nodeSize == f) {
        let y = a[c + 2].mapInner(t, g, d + 1, n[c] + i + 1, o);
        y != ae ? (a[c] = u, a[c + 1] = f, a[c + 2] = y) : (a[c + 1] = -2, l = !0);
      } else
        l = !0;
    }
  if (l) {
    let c = xb(a, n, e, t, s, i, o), d = Ai(c, r, 0, o);
    e = d.local;
    for (let u = 0; u < a.length; u += 3)
      a[u + 1] < 0 && (a.splice(u, 3), u -= 3);
    for (let u = 0, h = 0; u < d.children.length; u += 3) {
      let f = d.children[u];
      for (; h < a.length && a[h] < f; )
        h += 3;
      a.splice(h, 0, d.children[u], d.children[u + 1], d.children[u + 2]);
    }
  }
  return new z(e.sort(Ht), a);
}
function Zh(n, e) {
  if (!e || !n.length)
    return n;
  let t = [];
  for (let r = 0; r < n.length; r++) {
    let s = n[r];
    t.push(new ue(s.from + e, s.to + e, s.type));
  }
  return t;
}
function xb(n, e, t, r, s, i, o) {
  function a(l, c) {
    for (let d = 0; d < l.local.length; d++) {
      let u = l.local[d].map(r, s, c);
      u ? t.push(u) : o.onRemove && o.onRemove(l.local[d].spec);
    }
    for (let d = 0; d < l.children.length; d += 3)
      a(l.children[d + 2], l.children[d] + c + 1);
  }
  for (let l = 0; l < n.length; l += 3)
    n[l + 1] == -1 && a(n[l + 2], e[l] + i + 1);
  return t;
}
function ef(n, e, t) {
  if (e.isLeaf)
    return null;
  let r = t + e.nodeSize, s = null;
  for (let i = 0, o; i < n.length; i++)
    (o = n[i]) && o.from > t && o.to < r && ((s || (s = [])).push(o), n[i] = null);
  return s;
}
function tf(n) {
  let e = [];
  for (let t = 0; t < n.length; t++)
    n[t] != null && e.push(n[t]);
  return e;
}
function Ai(n, e, t, r) {
  let s = [], i = !1;
  e.forEach((a, l) => {
    let c = ef(n, a, l + t);
    if (c) {
      i = !0;
      let d = Ai(c, a, t + l + 1, r);
      d != ae && s.push(l, l + a.nodeSize, d);
    }
  });
  let o = Zh(i ? tf(n) : n, -t).sort(Ht);
  for (let a = 0; a < o.length; a++)
    o[a].type.valid(e, o[a]) || (r.onRemove && r.onRemove(o[a].spec), o.splice(a--, 1));
  return o.length || s.length ? new z(o, s) : ae;
}
function Ht(n, e) {
  return n.from - e.from || n.to - e.to;
}
function Ml(n) {
  let e = n;
  for (let t = 0; t < e.length - 1; t++) {
    let r = e[t];
    if (r.from != r.to)
      for (let s = t + 1; s < e.length; s++) {
        let i = e[s];
        if (i.from == r.from) {
          i.to != r.to && (e == n && (e = n.slice()), e[s] = i.copy(i.from, r.to), md(e, s + 1, i.copy(r.to, i.to)));
          continue;
        } else {
          i.from < r.to && (e == n && (e = n.slice()), e[t] = r.copy(r.from, i.from), md(e, s, r.copy(i.from, r.to)));
          break;
        }
      }
  }
  return e;
}
function md(n, e, t) {
  for (; e < n.length && Ht(t, n[e]) > 0; )
    e++;
  n.splice(e, 0, t);
}
function ra(n) {
  let e = [];
  return n.someProp("decorations", (t) => {
    let r = t(n.state);
    r && r != ae && e.push(r);
  }), n.cursorWrapper && e.push(z.create(n.state.doc, [n.cursorWrapper.deco])), dt.from(e);
}
const wb = {
  childList: !0,
  characterData: !0,
  characterDataOldValue: !0,
  attributes: !0,
  attributeOldValue: !0,
  subtree: !0
}, Sb = be && gt <= 11;
class Cb {
  constructor() {
    this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
  }
  set(e) {
    this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(e) {
    return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
  }
}
class Mb {
  constructor(e, t) {
    this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new Cb(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((r) => {
      for (let s = 0; s < r.length; s++)
        this.queue.push(r[s]);
      be && gt <= 11 && r.some((s) => s.type == "childList" && s.removedNodes.length || s.type == "characterData" && s.oldValue.length > s.target.nodeValue.length) ? this.flushSoon() : le && e.composing && r.some((s) => s.type == "childList" && s.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
    }), Sb && (this.onCharData = (r) => {
      this.queue.push({ target: r.target, type: "characterData", oldValue: r.prevValue }), this.flushSoon();
    }), this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
      this.flushingSoon = -1, this.flush();
    }, 20));
  }
  forceFlush() {
    this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
  }
  start() {
    this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, wb)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let e = this.observer.takeRecords();
      if (e.length) {
        for (let t = 0; t < e.length; t++)
          this.queue.push(e[t]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
  }
  onSelectionChange() {
    if (ld(this.view)) {
      if (this.suppressingSelectionUpdates)
        return tt(this.view);
      if (be && gt <= 11 && !this.view.state.selection.empty) {
        let e = this.view.domSelectionRange();
        if (e.focusNode && Gt(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset))
          return this.flushSoon();
      }
      this.flush();
    }
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(e) {
    if (!e.focusNode)
      return !0;
    let t = /* @__PURE__ */ new Set(), r;
    for (let i = e.focusNode; i; i = mn(i))
      t.add(i);
    for (let i = e.anchorNode; i; i = mn(i))
      if (t.has(i)) {
        r = i;
        break;
      }
    let s = r && this.view.docView.nearestDesc(r);
    if (s && s.ignoreMutation({
      type: "selection",
      target: r.nodeType == 3 ? r.parentNode : r
    }))
      return this.setCurSelection(), !0;
  }
  pendingRecords() {
    if (this.observer)
      for (let e of this.observer.takeRecords())
        this.queue.push(e);
    return this.queue;
  }
  flush() {
    let { view: e } = this;
    if (!e.docView || this.flushingSoon > -1)
      return;
    let t = this.pendingRecords();
    t.length && (this.queue = []);
    let r = e.domSelectionRange(), s = !this.suppressingSelectionUpdates && !this.currentSelection.eq(r) && ld(e) && !this.ignoreSelectionChange(r), i = -1, o = -1, a = !1, l = [];
    if (e.editable)
      for (let d = 0; d < t.length; d++) {
        let u = this.registerMutation(t[d], l);
        u && (i = i < 0 ? u.from : Math.min(u.from, i), o = o < 0 ? u.to : Math.max(u.to, o), u.typeOver && (a = !0));
      }
    if (l.some((d) => d.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46 || ie && (e.composing || e.input.compositionEndedAt > Date.now() - 50) && t.some((d) => d.type == "childList" && d.removedNodes.length))) {
      for (let d of l)
        if (d.nodeName == "BR" && d.parentNode) {
          let u = d.nextSibling;
          for (; u && u.nodeType == 1; ) {
            if (u.contentEditable == "false") {
              d.parentNode.removeChild(d);
              break;
            }
            u = u.firstChild;
          }
        }
    } else if (Ae && l.length) {
      let d = l.filter((u) => u.nodeName == "BR");
      if (d.length == 2) {
        let [u, h] = d;
        u.parentNode && u.parentNode.parentNode == h.parentNode ? h.remove() : u.remove();
      } else {
        let { focusNode: u } = this.currentSelection;
        for (let h of d) {
          let f = h.parentNode;
          f && f.nodeName == "LI" && (!u || Ab(e, u) != f) && h.remove();
        }
      }
    }
    let c = null;
    i < 0 && s && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && So(r) && (c = bl(e)) && c.eq($.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, tt(e), this.currentSelection.set(r), e.scrollToSelection()) : (i > -1 || s) && (i > -1 && (e.docView.markDirty(i, o), Eb(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, _b(e, l)), this.handleDOMChange(i, o, a, l), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(r) || tt(e), this.currentSelection.set(r));
  }
  registerMutation(e, t) {
    if (t.indexOf(e.target) > -1)
      return null;
    let r = this.view.docView.nearestDesc(e.target);
    if (e.type == "attributes" && (r == this.view.docView || e.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !r || r.ignoreMutation(e))
      return null;
    if (e.type == "childList") {
      for (let d = 0; d < e.addedNodes.length; d++) {
        let u = e.addedNodes[d];
        t.push(u), u.nodeType == 3 && (this.lastChangedTextNode = u);
      }
      if (r.contentDOM && r.contentDOM != r.dom && !r.contentDOM.contains(e.target))
        return { from: r.posBefore, to: r.posAfter };
      let s = e.previousSibling, i = e.nextSibling;
      if (be && gt <= 11 && e.addedNodes.length)
        for (let d = 0; d < e.addedNodes.length; d++) {
          let { previousSibling: u, nextSibling: h } = e.addedNodes[d];
          (!u || Array.prototype.indexOf.call(e.addedNodes, u) < 0) && (s = u), (!h || Array.prototype.indexOf.call(e.addedNodes, h) < 0) && (i = h);
        }
      let o = s && s.parentNode == e.target ? re(s) + 1 : 0, a = r.localPosFromDOM(e.target, o, -1), l = i && i.parentNode == e.target ? re(i) : e.target.childNodes.length, c = r.localPosFromDOM(e.target, l, 1);
      return { from: a, to: c };
    } else return e.type == "attributes" ? { from: r.posAtStart - r.border, to: r.posAtEnd + r.border } : (this.lastChangedTextNode = e.target, {
      from: r.posAtStart,
      to: r.posAtEnd,
      // An event was generated for a text change that didn't change
      // any text. Mark the dom change to fall back to assuming the
      // selection was typed over with an identical value if it can't
      // find another change.
      typeOver: e.target.nodeValue == e.oldValue
    });
  }
}
let gd = /* @__PURE__ */ new WeakMap(), yd = !1;
function Eb(n) {
  if (!gd.has(n) && (gd.set(n, null), ["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(n.dom).whiteSpace) !== -1)) {
    if (n.requiresGeckoHackNode = Ae, yd)
      return;
    console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), yd = !0;
  }
}
function bd(n, e) {
  let t = e.startContainer, r = e.startOffset, s = e.endContainer, i = e.endOffset, o = n.domAtPos(n.state.selection.anchor);
  return Gt(o.node, o.offset, s, i) && ([t, r, s, i] = [s, i, t, r]), { anchorNode: t, anchorOffset: r, focusNode: s, focusOffset: i };
}
function Tb(n, e) {
  if (e.getComposedRanges) {
    let s = e.getComposedRanges(n.root)[0];
    if (s)
      return bd(n, s);
  }
  let t;
  function r(s) {
    s.preventDefault(), s.stopImmediatePropagation(), t = s.getTargetRanges()[0];
  }
  return n.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), n.dom.removeEventListener("beforeinput", r, !0), t ? bd(n, t) : null;
}
function Ab(n, e) {
  for (let t = e.parentNode; t && t != n.dom; t = t.parentNode) {
    let r = n.docView.nearestDesc(t, !0);
    if (r && r.node.isBlock)
      return t;
  }
  return null;
}
function _b(n, e) {
  var t;
  let { focusNode: r, focusOffset: s } = n.domSelectionRange();
  for (let i of e)
    if (((t = i.parentNode) === null || t === void 0 ? void 0 : t.nodeName) == "TR") {
      let o = i.nextSibling;
      for (; o && o.nodeName != "TD" && o.nodeName != "TH"; )
        o = o.nextSibling;
      if (o) {
        let a = o;
        for (; ; ) {
          let l = a.firstChild;
          if (!l || l.nodeType != 1 || l.contentEditable == "false" || /^(BR|IMG)$/.test(l.nodeName))
            break;
          a = l;
        }
        a.insertBefore(i, a.firstChild), r == i && n.domSelection().collapse(i, s);
      } else
        i.parentNode.removeChild(i);
    }
}
function Ob(n, e, t, r) {
  let { node: s, fromOffset: i, toOffset: o, from: a, to: l } = n.docView.parseRange(e, t), c = n.domSelectionRange(), d, u = c.anchorNode;
  if (u && n.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (d = [{ node: u, offset: c.anchorOffset }], So(c) || d.push({ node: c.focusNode, offset: c.focusOffset })), ie && n.input.lastKeyCode === 8)
    for (let y = o; y > i; y--) {
      let k = s.childNodes[y - 1], C = k.pmViewDesc;
      if (k.nodeName == "BR" && !C) {
        o = y;
        break;
      }
      if (!C || C.size)
        break;
    }
  let h = n.state.doc, f = n.someProp("domParser") || mt.fromSchema(n.state.schema), p = h.resolve(a), m = null, g = f.parse(s, {
    topNode: p.parent,
    topMatch: p.parent.contentMatchAt(p.index()),
    topOpen: !0,
    from: i,
    to: o,
    preserveWhitespace: p.parent.type.whitespace == "pre" ? "full" : !0,
    findPositions: d,
    ruleFromNode: Nb(r),
    context: p
  });
  if (d && d[0].pos != null) {
    let y = d[0].pos, k = d[1] && d[1].pos;
    k == null && (k = y), m = { anchor: y + a, head: k + a };
  }
  return { doc: g, sel: m, from: a, to: l };
}
const Nb = (n) => (e) => {
  let t = e.pmViewDesc;
  if (t)
    return t.parseRule(n);
  if (e.nodeName == "BR" && e.parentNode) {
    if (le && /^(ul|ol)$/i.test(e.parentNode.nodeName)) {
      let r = document.createElement("div");
      return r.appendChild(document.createElement("li")), { skip: r };
    } else if (e.parentNode.lastChild == e || le && /^(tr|table)$/i.test(e.parentNode.nodeName))
      return { ignore: !0 };
  } else if (e.nodeName == "IMG" && e.getAttribute("mark-placeholder"))
    return { ignore: !0 };
  return null;
}, $b = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function Ib(n, e, t, r, s) {
  let i = n.input.compositionPendingChanges || (n.composing ? n.input.compositionID : 0);
  if (n.input.compositionPendingChanges = 0, e < 0) {
    let T = n.input.lastSelectionTime > Date.now() - 50 ? n.input.lastSelectionOrigin : null, D = bl(n, T);
    if (D && !n.state.selection.eq(D)) {
      if (ie && Qe && n.input.lastKeyCode === 13 && Date.now() - 100 < n.input.lastKeyCodeTime && n.someProp("handleKeyDown", (Q) => Q(n, Ot(13, "Enter"))))
        return;
      let P = n.state.tr.setSelection(D);
      T == "pointer" ? P.setMeta("pointer", !0) : T == "key" && P.scrollIntoView(), i && P.setMeta("composition", i), n.dispatch(P);
    }
    return;
  }
  let o = n.state.doc.resolve(e), a = o.sharedDepth(t);
  e = o.before(a + 1), t = n.state.doc.resolve(t).after(a + 1);
  let l = n.state.selection, c = Ob(n, e, t, s), d = n.state.doc, u = d.slice(c.from, c.to), h, f;
  n.input.lastKeyCode === 8 && Date.now() - 100 < n.input.lastKeyCodeTime ? (h = n.state.selection.to, f = "end") : (h = n.state.selection.from, f = "start"), n.input.lastKeyCode = null;
  let p = Rb(u.content, c.doc.content, c.from, h, f);
  if (p && n.input.domChangeCount++, (gn && n.input.lastIOSEnter > Date.now() - 225 || Qe) && s.some((T) => T.nodeType == 1 && !$b.test(T.nodeName)) && (!p || p.endA >= p.endB) && n.someProp("handleKeyDown", (T) => T(n, Ot(13, "Enter")))) {
    n.input.lastIOSEnter = 0;
    return;
  }
  if (!p)
    if (r && l instanceof O && !l.empty && l.$head.sameParent(l.$anchor) && !n.composing && !(c.sel && c.sel.anchor != c.sel.head))
      p = { start: l.from, endA: l.to, endB: l.to };
    else {
      if (c.sel) {
        let T = vd(n, n.state.doc, c.sel);
        if (T && !T.eq(n.state.selection)) {
          let D = n.state.tr.setSelection(T);
          i && D.setMeta("composition", i), n.dispatch(D);
        }
      }
      return;
    }
  n.state.selection.from < n.state.selection.to && p.start == p.endB && n.state.selection instanceof O && (p.start > n.state.selection.from && p.start <= n.state.selection.from + 2 && n.state.selection.from >= c.from ? p.start = n.state.selection.from : p.endA < n.state.selection.to && p.endA >= n.state.selection.to - 2 && n.state.selection.to <= c.to && (p.endB += n.state.selection.to - p.endA, p.endA = n.state.selection.to)), be && gt <= 11 && p.endB == p.start + 1 && p.endA == p.start && p.start > c.from && c.doc.textBetween(p.start - c.from - 1, p.start - c.from + 1) == "  " && (p.start--, p.endA--, p.endB--);
  let m = c.doc.resolveNoCache(p.start - c.from), g = c.doc.resolveNoCache(p.endB - c.from), y = d.resolve(p.start), k = m.sameParent(g) && m.parent.inlineContent && y.end() >= p.endA;
  if ((gn && n.input.lastIOSEnter > Date.now() - 225 && (!k || s.some((T) => T.nodeName == "DIV" || T.nodeName == "P")) || !k && m.pos < c.doc.content.size && (!m.sameParent(g) || !m.parent.inlineContent) && m.pos < g.pos && !/\S/.test(c.doc.textBetween(m.pos, g.pos, "", ""))) && n.someProp("handleKeyDown", (T) => T(n, Ot(13, "Enter")))) {
    n.input.lastIOSEnter = 0;
    return;
  }
  if (n.state.selection.anchor > p.start && Pb(d, p.start, p.endA, m, g) && n.someProp("handleKeyDown", (T) => T(n, Ot(8, "Backspace")))) {
    Qe && ie && n.domObserver.suppressSelectionUpdates();
    return;
  }
  ie && p.endB == p.start && (n.input.lastChromeDelete = Date.now()), Qe && !k && m.start() != g.start() && g.parentOffset == 0 && m.depth == g.depth && c.sel && c.sel.anchor == c.sel.head && c.sel.head == p.endA && (p.endB -= 2, g = c.doc.resolveNoCache(p.endB - c.from), setTimeout(() => {
    n.someProp("handleKeyDown", function(T) {
      return T(n, Ot(13, "Enter"));
    });
  }, 20));
  let C = p.start, S = p.endA, A = (T) => {
    let D = T || n.state.tr.replace(C, S, c.doc.slice(p.start - c.from, p.endB - c.from));
    if (c.sel) {
      let P = vd(n, D.doc, c.sel);
      P && !(ie && n.composing && P.empty && (p.start != p.endB || n.input.lastChromeDelete < Date.now() - 100) && (P.head == C || P.head == D.mapping.map(S) - 1) || be && P.empty && P.head == C) && D.setSelection(P);
    }
    return i && D.setMeta("composition", i), D.scrollIntoView();
  }, N;
  if (k)
    if (m.pos == g.pos) {
      be && gt <= 11 && m.parentOffset == 0 && (n.domObserver.suppressSelectionUpdates(), setTimeout(() => tt(n), 20));
      let T = A(n.state.tr.delete(C, S)), D = d.resolve(p.start).marksAcross(d.resolve(p.endA));
      D && T.ensureMarks(D), n.dispatch(T);
    } else if (
      // Adding or removing a mark
      p.endA == p.endB && (N = Db(m.parent.content.cut(m.parentOffset, g.parentOffset), y.parent.content.cut(y.parentOffset, p.endA - y.start())))
    ) {
      let T = A(n.state.tr);
      N.type == "add" ? T.addMark(C, S, N.mark) : T.removeMark(C, S, N.mark), n.dispatch(T);
    } else if (m.parent.child(m.index()).isText && m.index() == g.index() - (g.textOffset ? 0 : 1)) {
      let T = m.parent.textBetween(m.parentOffset, g.parentOffset), D = () => A(n.state.tr.insertText(T, C, S));
      n.someProp("handleTextInput", (P) => P(n, C, S, T, D)) || n.dispatch(D());
    } else
      n.dispatch(A());
  else
    n.dispatch(A());
}
function vd(n, e, t) {
  return Math.max(t.anchor, t.head) > e.content.size ? null : vl(n, e.resolve(t.anchor), e.resolve(t.head));
}
function Db(n, e) {
  let t = n.firstChild.marks, r = e.firstChild.marks, s = t, i = r, o, a, l;
  for (let d = 0; d < r.length; d++)
    s = r[d].removeFromSet(s);
  for (let d = 0; d < t.length; d++)
    i = t[d].removeFromSet(i);
  if (s.length == 1 && i.length == 0)
    a = s[0], o = "add", l = (d) => d.mark(a.addToSet(d.marks));
  else if (s.length == 0 && i.length == 1)
    a = i[0], o = "remove", l = (d) => d.mark(a.removeFromSet(d.marks));
  else
    return null;
  let c = [];
  for (let d = 0; d < e.childCount; d++)
    c.push(l(e.child(d)));
  if (b.from(c).eq(n))
    return { mark: a, type: o };
}
function Pb(n, e, t, r, s) {
  if (
    // The content must have shrunk
    t - e <= s.pos - r.pos || // newEnd must point directly at or after the end of the block that newStart points into
    sa(r, !0, !1) < s.pos
  )
    return !1;
  let i = n.resolve(e);
  if (!r.parent.isTextblock) {
    let a = i.nodeAfter;
    return a != null && t == e + a.nodeSize;
  }
  if (i.parentOffset < i.parent.content.size || !i.parent.isTextblock)
    return !1;
  let o = n.resolve(sa(i, !0, !0));
  return !o.parent.isTextblock || o.pos > t || sa(o, !0, !1) < t ? !1 : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
}
function sa(n, e, t) {
  let r = n.depth, s = e ? n.end() : n.pos;
  for (; r > 0 && (e || n.indexAfter(r) == n.node(r).childCount); )
    r--, s++, e = !1;
  if (t) {
    let i = n.node(r).maybeChild(n.indexAfter(r));
    for (; i && !i.isLeaf; )
      i = i.firstChild, s++;
  }
  return s;
}
function Rb(n, e, t, r, s) {
  let i = n.findDiffStart(e, t), o = t + n.size, a = t + e.size;
  if (i == null)
    return null;
  let { a: l, b: c } = n.findDiffEnd(e, o, a);
  if (s == "end") {
    let d = Math.max(0, i - Math.min(l, c));
    r -= l + d - i;
  }
  if (l < i && o < a) {
    let d = r <= i && r >= l ? i - r : 0;
    i -= d, c = i + (c - l), l = i;
  } else if (c < i) {
    let d = r <= i && r >= c ? i - r : 0;
    i -= d, l = i + (l - c), c = i;
  }
  return { start: i, endA: l, endB: c };
}
class nf {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(e, t) {
    this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Qy(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(Cd), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = wd(this), xd(this), this.nodeViews = Sd(this), this.docView = nd(this.state.doc, kd(this), ra(this), this.dom, this), this.domObserver = new Mb(this, (r, s, i, o) => Ib(this, r, s, i, o)), this.domObserver.start(), Zy(this), this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let e = this._props;
      this._props = {};
      for (let t in e)
        this._props[t] = e[t];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(e) {
    e.handleDOMEvents != this._props.handleDOMEvents && Fa(this);
    let t = this._props;
    this._props = e, e.plugins && (e.plugins.forEach(Cd), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(e) {
    let t = {};
    for (let r in this._props)
      t[r] = this._props[r];
    t.state = this.state;
    for (let r in e)
      t[r] = e[r];
    this.update(t);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(e) {
    this.updateStateInner(e, this._props);
  }
  updateStateInner(e, t) {
    var r;
    let s = this.state, i = !1, o = !1;
    e.storedMarks && this.composing && (Gh(this), o = !0), this.state = e;
    let a = s.plugins != e.plugins || this._props.plugins != t.plugins;
    if (a || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
      let f = Sd(this);
      zb(f, this.nodeViews) && (this.nodeViews = f, i = !0);
    }
    (a || t.handleDOMEvents != this._props.handleDOMEvents) && Fa(this), this.editable = wd(this), xd(this);
    let l = ra(this), c = kd(this), d = s.plugins != e.plugins && !s.doc.eq(e.doc) ? "reset" : e.scrollToSelection > s.scrollToSelection ? "to selection" : "preserve", u = i || !this.docView.matchesNode(e.doc, c, l);
    (u || !e.selection.eq(s.selection)) && (o = !0);
    let h = d == "preserve" && o && this.dom.style.overflowAnchor == null && fy(this);
    if (o) {
      this.domObserver.stop();
      let f = u && (be || ie) && !this.composing && !s.selection.empty && !e.selection.empty && Lb(s.selection, e.selection);
      if (u) {
        let m = ie ? this.trackWrites = this.domSelectionRange().focusNode : null;
        this.composing && (this.input.compositionNode = pb(this)), (i || !this.docView.update(e.doc, c, l, this)) && (this.docView.updateOuterDeco(c), this.docView.destroy(), this.docView = nd(e.doc, c, l, this.dom, this)), m && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (f = !0);
      }
      let p = this.input.mouseDown;
      f || !(p && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Ly(this) && p.delaySelUpdate()) ? tt(this, f) : (Ph(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
    }
    this.updatePluginViews(s), !((r = this.dragging) === null || r === void 0) && r.node && !s.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, s), d == "reset" ? this.dom.scrollTop = 0 : d == "to selection" ? this.scrollToSelection() : h && py(h);
  }
  /**
  @internal
  */
  scrollToSelection() {
    let e = this.domSelectionRange().focusNode;
    if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode))) {
      if (!this.someProp("handleScrollToSelection", (t) => t(this))) if (this.state.selection instanceof _) {
        let t = this.docView.domAfterPos(this.state.selection.from);
        t.nodeType == 1 && Xc(this, t.getBoundingClientRect(), e);
      } else
        Xc(this, this.coordsAtPos(this.state.selection.head, 1), e);
    }
  }
  destroyPluginViews() {
    let e;
    for (; e = this.pluginViews.pop(); )
      e.destroy && e.destroy();
  }
  updatePluginViews(e) {
    if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
      for (let t = 0; t < this.directPlugins.length; t++) {
        let r = this.directPlugins[t];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
      for (let t = 0; t < this.state.plugins.length; t++) {
        let r = this.state.plugins[t];
        r.spec.view && this.pluginViews.push(r.spec.view(this));
      }
    } else
      for (let t = 0; t < this.pluginViews.length; t++) {
        let r = this.pluginViews[t];
        r.update && r.update(this, e);
      }
  }
  updateDraggedNode(e, t) {
    let r = e.node, s = -1;
    if (r.from < this.state.doc.content.size && this.state.doc.nodeAt(r.from) == r.node)
      s = r.from;
    else {
      let i = r.from + (this.state.doc.content.size - t.doc.content.size);
      (i > 0 && i < this.state.doc.content.size && this.state.doc.nodeAt(i)) == r.node && (s = i);
    }
    this.dragging = new Xh(e.slice, e.move, s < 0 ? void 0 : _.create(this.state.doc, s));
  }
  someProp(e, t) {
    let r = this._props && this._props[e], s;
    if (r != null && (s = t ? t(r) : r))
      return s;
    for (let o = 0; o < this.directPlugins.length; o++) {
      let a = this.directPlugins[o].props[e];
      if (a != null && (s = t ? t(a) : a))
        return s;
    }
    let i = this.state.plugins;
    if (i)
      for (let o = 0; o < i.length; o++) {
        let a = i[o].props[e];
        if (a != null && (s = t ? t(a) : a))
          return s;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (be) {
      let e = this.root.activeElement;
      if (e == this.dom)
        return !0;
      if (!e || !this.dom.contains(e))
        return !1;
      for (; e && this.dom != e && this.dom.contains(e); ) {
        if (e.contentEditable == "false")
          return !1;
        e = e.parentElement;
      }
      return !0;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop(), this.editable && my(this.dom), tt(this), this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let e = this._root;
    if (e == null) {
      for (let t = this.dom.parentNode; t; t = t.parentNode)
        if (t.nodeType == 9 || t.nodeType == 11 && t.host)
          return t.getSelection || (Object.getPrototypeOf(t).getSelection = () => t.ownerDocument.getSelection()), this._root = t;
    }
    return e || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(e) {
    return ky(this, e);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(e, t = 1) {
    return Th(this, e, t);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.
  
  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(e, t = 0) {
    return this.docView.domFromPos(e, t);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.
  
  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(e) {
    let t = this.docView.descAt(e);
    return t ? t.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)
  
  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(e, t, r = -1) {
    let s = this.docView.posFromDOM(e, t, r);
    if (s == null)
      throw new RangeError("DOM position not inside the editor");
    return s;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(e, t) {
    return My(this, t || this.state, e);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(e, t) {
    return mr(this, "", e, !1, t || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(e, t) {
    return mr(this, e, null, !0, t || new ClipboardEvent("paste"));
  }
  /**
  Serialize the given slice as it would be if it was copied from
  this editor. Returns a DOM element that contains a
  representation of the slice as its children, a textual
  representation, and the transformed slice (which can be
  different from the given input due to hooks like
  [`transformCopied`](https://prosemirror.net/docs/ref/#view.EditorProps.transformCopied)).
  */
  serializeForClipboard(e) {
    return kl(this, e);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    this.docView && (eb(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], ra(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, ry());
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(e) {
    return nb(this, e);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let e = this.domSelection();
    return e ? le && this.root.nodeType === 11 && ly(this.dom.ownerDocument) == this.dom && Tb(this, e) || e : { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
}
nf.prototype.dispatch = function(n) {
  let e = this._props.dispatchTransaction;
  e ? e.call(this, n) : this.updateState(this.state.apply(n));
};
function kd(n) {
  let e = /* @__PURE__ */ Object.create(null);
  return e.class = "ProseMirror", e.contenteditable = String(n.editable), n.someProp("attributes", (t) => {
    if (typeof t == "function" && (t = t(n.state)), t)
      for (let r in t)
        r == "class" ? e.class += " " + t[r] : r == "style" ? e.style = (e.style ? e.style + ";" : "") + t[r] : !e[r] && r != "contenteditable" && r != "nodeName" && (e[r] = String(t[r]));
  }), e.translate || (e.translate = "no"), [ue.node(0, n.state.doc.content.size, e)];
}
function xd(n) {
  if (n.markCursor) {
    let e = document.createElement("img");
    e.className = "ProseMirror-separator", e.setAttribute("mark-placeholder", "true"), e.setAttribute("alt", ""), n.cursorWrapper = { dom: e, deco: ue.widget(n.state.selection.from, e, { raw: !0, marks: n.markCursor }) };
  } else
    n.cursorWrapper = null;
}
function wd(n) {
  return !n.someProp("editable", (e) => e(n.state) === !1);
}
function Lb(n, e) {
  let t = Math.min(n.$anchor.sharedDepth(n.head), e.$anchor.sharedDepth(e.head));
  return n.$anchor.start(t) != e.$anchor.start(t);
}
function Sd(n) {
  let e = /* @__PURE__ */ Object.create(null);
  function t(r) {
    for (let s in r)
      Object.prototype.hasOwnProperty.call(e, s) || (e[s] = r[s]);
  }
  return n.someProp("nodeViews", t), n.someProp("markViews", t), e;
}
function zb(n, e) {
  let t = 0, r = 0;
  for (let s in n) {
    if (n[s] != e[s])
      return !0;
    t++;
  }
  for (let s in e)
    r++;
  return t != r;
}
function Cd(n) {
  if (n.spec.state || n.spec.filterTransaction || n.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}
var wt = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
}, _i = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
}, Bb = typeof navigator < "u" && /Mac/.test(navigator.platform), Fb = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (var se = 0; se < 10; se++) wt[48 + se] = wt[96 + se] = String(se);
for (var se = 1; se <= 24; se++) wt[se + 111] = "F" + se;
for (var se = 65; se <= 90; se++)
  wt[se] = String.fromCharCode(se + 32), _i[se] = String.fromCharCode(se);
for (var ia in wt) _i.hasOwnProperty(ia) || (_i[ia] = wt[ia]);
function Hb(n) {
  var e = Bb && n.metaKey && n.shiftKey && !n.ctrlKey && !n.altKey || Fb && n.shiftKey && n.key && n.key.length == 1 || n.key == "Unidentified", t = !e && n.key || (n.shiftKey ? _i : wt)[n.keyCode] || n.key || "Unidentified";
  return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
const Vb = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), Wb = typeof navigator < "u" && /Win/.test(navigator.platform);
function jb(n) {
  let e = n.split(/-(?!$)/), t = e[e.length - 1];
  t == "Space" && (t = " ");
  let r, s, i, o;
  for (let a = 0; a < e.length - 1; a++) {
    let l = e[a];
    if (/^(cmd|meta|m)$/i.test(l))
      o = !0;
    else if (/^a(lt)?$/i.test(l))
      r = !0;
    else if (/^(c|ctrl|control)$/i.test(l))
      s = !0;
    else if (/^s(hift)?$/i.test(l))
      i = !0;
    else if (/^mod$/i.test(l))
      Vb ? o = !0 : s = !0;
    else
      throw new Error("Unrecognized modifier name: " + l);
  }
  return r && (t = "Alt-" + t), s && (t = "Ctrl-" + t), o && (t = "Meta-" + t), i && (t = "Shift-" + t), t;
}
function qb(n) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let t in n)
    e[jb(t)] = n[t];
  return e;
}
function oa(n, e, t = !0) {
  return e.altKey && (n = "Alt-" + n), e.ctrlKey && (n = "Ctrl-" + n), e.metaKey && (n = "Meta-" + n), t && e.shiftKey && (n = "Shift-" + n), n;
}
function Ub(n) {
  return new F({ props: { handleKeyDown: rf(n) } });
}
function rf(n) {
  let e = qb(n);
  return function(t, r) {
    let s = Hb(r), i, o = e[oa(s, r)];
    if (o && o(t.state, t.dispatch, t))
      return !0;
    if (s.length == 1 && s != " ") {
      if (r.shiftKey) {
        let a = e[oa(s, r, !1)];
        if (a && a(t.state, t.dispatch, t))
          return !0;
      }
      if ((r.altKey || r.metaKey || r.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(Wb && r.ctrlKey && r.altKey) && (i = wt[r.keyCode]) && i != s) {
        let a = e[oa(i, r)];
        if (a && a(t.state, t.dispatch, t))
          return !0;
      }
    }
    return !1;
  };
}
var Kb = Object.defineProperty, El = (n, e) => {
  for (var t in e)
    Kb(n, t, { get: e[t], enumerable: !0 });
};
function Mo(n) {
  const { state: e, transaction: t } = n;
  let { selection: r } = t, { doc: s } = t, { storedMarks: i } = t;
  return {
    ...e,
    apply: e.apply.bind(e),
    applyTransaction: e.applyTransaction.bind(e),
    plugins: e.plugins,
    schema: e.schema,
    reconfigure: e.reconfigure.bind(e),
    toJSON: e.toJSON.bind(e),
    get storedMarks() {
      return i;
    },
    get selection() {
      return r;
    },
    get doc() {
      return s;
    },
    get tr() {
      return r = t.selection, s = t.doc, i = t.storedMarks, t;
    }
  };
}
var Eo = class {
  constructor(n) {
    this.editor = n.editor, this.rawCommands = this.editor.extensionManager.commands, this.customState = n.state;
  }
  get hasCustomState() {
    return !!this.customState;
  }
  get state() {
    return this.customState || this.editor.state;
  }
  get commands() {
    const { rawCommands: n, editor: e, state: t } = this, { view: r } = e, { tr: s } = t, i = this.buildProps(s);
    return Object.fromEntries(
      Object.entries(n).map(([o, a]) => [o, (...c) => {
        const d = a(...c)(i);
        return !s.getMeta("preventDispatch") && !this.hasCustomState && r.dispatch(s), d;
      }])
    );
  }
  get chain() {
    return () => this.createChain();
  }
  get can() {
    return () => this.createCan();
  }
  createChain(n, e = !0) {
    const { rawCommands: t, editor: r, state: s } = this, { view: i } = r, o = [], a = !!n, l = n || s.tr, c = () => (!a && e && !l.getMeta("preventDispatch") && !this.hasCustomState && i.dispatch(l), o.every((u) => u === !0)), d = {
      ...Object.fromEntries(
        Object.entries(t).map(([u, h]) => [u, (...p) => {
          const m = this.buildProps(l, e), g = h(...p)(m);
          return o.push(g), d;
        }])
      ),
      run: c
    };
    return d;
  }
  createCan(n) {
    const { rawCommands: e, state: t } = this, r = !1, s = n || t.tr, i = this.buildProps(s, r);
    return {
      ...Object.fromEntries(
        Object.entries(e).map(([a, l]) => [a, (...c) => l(...c)({ ...i, dispatch: void 0 })])
      ),
      chain: () => this.createChain(s, r)
    };
  }
  buildProps(n, e = !0) {
    const { rawCommands: t, editor: r, state: s } = this, { view: i } = r, o = {
      tr: n,
      editor: r,
      view: i,
      state: Mo({
        state: s,
        transaction: n
      }),
      dispatch: e ? () => {
      } : void 0,
      chain: () => this.createChain(n, e),
      can: () => this.createCan(n),
      get commands() {
        return Object.fromEntries(
          Object.entries(t).map(([a, l]) => [a, (...c) => l(...c)(o)])
        );
      }
    };
    return o;
  }
}, sf = {};
El(sf, {
  blur: () => Jb,
  clearContent: () => Gb,
  clearNodes: () => Yb,
  command: () => Xb,
  createParagraphNear: () => Qb,
  cut: () => Zb,
  deleteCurrentNode: () => ev,
  deleteNode: () => tv,
  deleteRange: () => nv,
  deleteSelection: () => iv,
  enter: () => ov,
  exitCode: () => av,
  extendMarkRange: () => lv,
  first: () => cv,
  focus: () => uv,
  forEach: () => hv,
  insertContent: () => fv,
  insertContentAt: () => mv,
  insertDefaultBlock: () => gv,
  joinBackward: () => vv,
  joinDown: () => bv,
  joinForward: () => kv,
  joinItemBackward: () => xv,
  joinItemForward: () => wv,
  joinTextblockBackward: () => Sv,
  joinTextblockForward: () => Cv,
  joinUp: () => yv,
  keyboardShortcut: () => Ev,
  lift: () => Tv,
  liftEmptyBlock: () => Av,
  liftListItem: () => _v,
  newlineInCode: () => Ov,
  resetAttributes: () => Nv,
  scrollIntoView: () => $v,
  selectAll: () => Iv,
  selectNodeBackward: () => Dv,
  selectNodeForward: () => Pv,
  selectParentNode: () => Rv,
  selectTextblockEnd: () => Lv,
  selectTextblockStart: () => zv,
  setContent: () => Bv,
  setMark: () => i0,
  setMeta: () => o0,
  setNode: () => a0,
  setNodeSelection: () => l0,
  setTextDirection: () => c0,
  setTextSelection: () => d0,
  sinkListItem: () => u0,
  splitBlock: () => h0,
  splitListItem: () => f0,
  toggleList: () => m0,
  toggleMark: () => g0,
  toggleNode: () => y0,
  toggleWrap: () => b0,
  undoInputRule: () => v0,
  unsetAllMarks: () => k0,
  unsetMark: () => x0,
  unsetTextDirection: () => w0,
  updateAttributes: () => S0,
  wrapIn: () => C0,
  wrapInList: () => M0
});
var Jb = () => ({ editor: n, view: e }) => (requestAnimationFrame(() => {
  var t;
  n.isDestroyed || (e.dom.blur(), (t = window == null ? void 0 : window.getSelection()) == null || t.removeAllRanges());
}), !0), Gb = (n = !0) => ({ commands: e }) => e.setContent("", { emitUpdate: n }), Yb = () => ({ state: n, tr: e, dispatch: t }) => {
  const { selection: r } = e, { ranges: s } = r;
  return t && s.forEach(({ $from: i, $to: o }) => {
    n.doc.nodesBetween(i.pos, o.pos, (a, l) => {
      if (a.type.isText)
        return;
      const { doc: c, mapping: d } = e, u = c.resolve(d.map(l)), h = c.resolve(d.map(l + a.nodeSize)), f = u.blockRange(h);
      if (!f)
        return;
      const p = wn(f);
      if (a.type.isTextblock) {
        const { defaultType: m } = u.parent.contentMatchAt(u.index());
        e.setNodeMarkup(f.start, m);
      }
      (p || p === 0) && e.lift(f, p);
    });
  }), !0;
}, Xb = (n) => (e) => n(e), Qb = () => ({ state: n, dispatch: e }) => gh(n, e), Zb = (n, e) => ({ editor: t, tr: r }) => {
  const { state: s } = t, i = s.doc.slice(n.from, n.to);
  r.deleteRange(n.from, n.to);
  const o = r.mapping.map(e);
  return r.insert(o, i.content), r.setSelection(new O(r.doc.resolve(Math.max(o - 1, 0)))), !0;
}, ev = () => ({ tr: n, dispatch: e }) => {
  const { selection: t } = n, r = t.$anchor.node();
  if (r.content.size > 0)
    return !1;
  const s = n.selection.$anchor;
  for (let i = s.depth; i > 0; i -= 1)
    if (s.node(i).type === r.type) {
      if (e) {
        const a = s.before(i), l = s.after(i);
        n.delete(a, l).scrollIntoView();
      }
      return !0;
    }
  return !1;
};
function G(n, e) {
  if (typeof n == "string") {
    if (!e.nodes[n])
      throw Error(
        `There is no node type named '${n}'. Maybe you forgot to add the extension?`
      );
    return e.nodes[n];
  }
  return n;
}
var tv = (n) => ({ tr: e, state: t, dispatch: r }) => {
  const s = G(n, t.schema), i = e.selection.$anchor;
  for (let o = i.depth; o > 0; o -= 1)
    if (i.node(o).type === s) {
      if (r) {
        const l = i.before(o), c = i.after(o);
        e.delete(l, c).scrollIntoView();
      }
      return !0;
    }
  return !1;
}, nv = (n) => ({ tr: e, dispatch: t }) => {
  const { from: r, to: s } = n;
  return t && e.delete(r, s), !0;
}, rv = (n) => n.content ? /^text(\*|\+)/.test(n.content) : !1, Md = (n, e, t) => {
  if (!n.parent.isInline || t === "left" && n.pos > n.start() || t === "right" && n.pos < n.end())
    return n.pos;
  const r = e.nodes[n.parent.type.name].spec;
  return rv(r) ? t === "left" ? n.start() - 1 : n.end() + 1 : n.pos;
}, sv = (n, e, t) => {
  const r = Md(n, t, "left"), s = Md(e, t, "right");
  return { from: r, to: s };
}, iv = () => ({ state: n, dispatch: e }) => {
  if (n.selection.empty)
    return !1;
  if (e) {
    const t = n.tr, { ranges: r } = n.selection, s = t.steps.length;
    r.forEach((i) => {
      const o = t.mapping.slice(s), a = t.doc.resolve(o.map(i.$from.pos)), l = t.doc.resolve(o.map(i.$to.pos)), { from: c, to: d } = sv(a, l, n.schema);
      t.deleteRange(c, d);
    }), t.selection.empty || t.setSelection(O.near(t.doc.resolve(t.selection.from))), t.scrollIntoView(), e(t);
  }
  return !0;
}, ov = () => ({ commands: n }) => n.keyboardShortcut("Enter"), av = () => ({ state: n, dispatch: e }) => Vg(n, e);
function Tl(n) {
  return Object.prototype.toString.call(n) === "[object RegExp]";
}
function Oi(n, e, t = { strict: !0 }) {
  const r = Object.keys(e);
  return r.length ? r.every((s) => t.strict ? e[s] === n[s] : Tl(e[s]) ? e[s].test(n[s]) : e[s] === n[s]) : !0;
}
function of(n, e, t = {}) {
  return n.find((r) => r.type === e && Oi(
    // Only check equality for the attributes that are provided
    Object.fromEntries(Object.keys(t).map((s) => [s, r.attrs[s]])),
    t
  ));
}
function Ed(n, e, t = {}) {
  return !!of(n, e, t);
}
function Al(n, e, t) {
  if (!n || !e)
    return;
  let r = n.parent.childAfter(n.parentOffset);
  if ((!r.node || !r.node.marks.some((c) => c.type === e)) && (r = n.parent.childBefore(n.parentOffset)), !r.node || !r.node.marks.some((c) => c.type === e))
    return;
  if (!t) {
    const c = r.node.marks.find((d) => d.type === e);
    c && (t = c.attrs);
  }
  if (!of([...r.node.marks], e, t))
    return;
  let i = r.index, o = n.start() + r.offset, a = i + 1, l = o + r.node.nodeSize;
  for (; i > 0 && Ed([...n.parent.child(i - 1).marks], e, t); )
    i -= 1, o -= n.parent.child(i).nodeSize;
  for (; a < n.parent.childCount && Ed([...n.parent.child(a).marks], e, t); )
    l += n.parent.child(a).nodeSize, a += 1;
  return {
    from: o,
    to: l
  };
}
function rt(n, e) {
  if (typeof n == "string") {
    if (!e.marks[n])
      throw Error(
        `There is no mark type named '${n}'. Maybe you forgot to add the extension?`
      );
    return e.marks[n];
  }
  return n;
}
var lv = (n, e) => ({ tr: t, state: r, dispatch: s }) => {
  const i = rt(n, r.schema), { doc: o, selection: a } = t, { $from: l, from: c, to: d } = a;
  if (s) {
    const u = Al(l, i, e);
    if (u && u.from <= c && u.to >= d) {
      const h = O.create(o, u.from, u.to);
      t.setSelection(h);
    }
  }
  return !0;
}, cv = (n) => (e) => {
  const t = typeof n == "function" ? n(e) : n;
  for (let r = 0; r < t.length; r += 1)
    if (t[r](e))
      return !0;
  return !1;
};
function af(n) {
  return n instanceof O;
}
function Pt(n = 0, e = 0, t = 0) {
  return Math.min(Math.max(n, e), t);
}
function Ha(n, e = null) {
  if (!e)
    return null;
  const t = $.atStart(n), r = $.atEnd(n);
  if (e === "start" || e === !0)
    return t;
  if (e === "end")
    return r;
  const s = t.from, i = r.to;
  return e === "all" ? O.create(
    n,
    Pt(0, s, i),
    Pt(n.content.size, s, i)
  ) : O.create(
    n,
    Pt(e, s, i),
    Pt(e, s, i)
  );
}
function Td() {
  return ["Android"].includes(navigator.platform) || /android/i.test(navigator.userAgent);
}
function Ni() {
  return ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(
    navigator.platform
  ) || // iPad on iOS 13 detection
  navigator.userAgent.includes("Mac") && "ontouchend" in document;
}
function dv() {
  return typeof navigator < "u" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : !1;
}
var uv = (n = null, e = {}) => ({ editor: t, view: r, tr: s, dispatch: i }) => {
  e = {
    scrollIntoView: !0,
    ...e
  };
  const o = () => {
    (Ni() || Td()) && r.dom.focus(), dv() && !Ni() && !Td() && r.dom.focus({ preventScroll: !0 }), requestAnimationFrame(() => {
      t.isDestroyed || (r.focus(), e != null && e.scrollIntoView && t.commands.scrollIntoView());
    });
  };
  try {
    if (r.hasFocus() && n === null || n === !1)
      return !0;
  } catch {
    return !1;
  }
  if (i && n === null && !af(t.state.selection))
    return o(), !0;
  const a = Ha(s.doc, n) || t.state.selection, l = t.state.selection.eq(a);
  return i && (l || s.setSelection(a), l && s.storedMarks && s.setStoredMarks(s.storedMarks), o()), !0;
}, hv = (n, e) => (t) => n.every((r, s) => e(r, { ...t, index: s })), fv = (n, e) => ({ tr: t, commands: r }) => r.insertContentAt(
  { from: t.selection.from, to: t.selection.to },
  n,
  e
), lf = (n) => {
  const e = n.childNodes;
  for (let t = e.length - 1; t >= 0; t -= 1) {
    const r = e[t];
    r.nodeType === 3 && r.nodeValue && /^(\n\s\s|\n)$/.test(r.nodeValue) ? n.removeChild(r) : r.nodeType === 1 && lf(r);
  }
  return n;
};
function ns(n) {
  if (typeof window > "u")
    throw new Error(
      "[tiptap error]: there is no window object available, so this function cannot be used"
    );
  const e = `<body>${n}</body>`, t = new window.DOMParser().parseFromString(e, "text/html").body;
  return lf(t);
}
function yn(n, e, t) {
  if (n instanceof Ie || n instanceof b)
    return n;
  t = {
    slice: !0,
    parseOptions: {},
    ...t
  };
  const r = typeof n == "object" && n !== null, s = typeof n == "string";
  if (r)
    try {
      if (Array.isArray(n) && n.length > 0)
        return b.fromArray(n.map((a) => e.nodeFromJSON(a)));
      const o = e.nodeFromJSON(n);
      return t.errorOnInvalidContent && o.check(), o;
    } catch (i) {
      if (t.errorOnInvalidContent)
        throw new Error("[tiptap error]: Invalid JSON content", { cause: i });
      return console.warn("[tiptap warn]: Invalid content.", "Passed value:", n, "Error:", i), yn("", e, t);
    }
  if (s) {
    if (t.errorOnInvalidContent) {
      let o = !1, a = "";
      const l = new Vu({
        topNode: e.spec.topNode,
        marks: e.spec.marks,
        // Prosemirror's schemas are executed such that: the last to execute, matches last
        // This means that we can add a catch-all node at the end of the schema to catch any content that we don't know how to handle
        nodes: e.spec.nodes.append({
          __tiptap__private__unknown__catch__all__node: {
            content: "inline*",
            group: "block",
            parseDOM: [
              {
                tag: "*",
                getAttrs: (c) => (o = !0, a = typeof c == "string" ? c : c.outerHTML, null)
              }
            ]
          }
        })
      });
      if (t.slice ? mt.fromSchema(l).parseSlice(
        ns(n),
        t.parseOptions
      ) : mt.fromSchema(l).parse(
        ns(n),
        t.parseOptions
      ), t.errorOnInvalidContent && o)
        throw new Error("[tiptap error]: Invalid HTML content", {
          cause: new Error(`Invalid element found: ${a}`)
        });
    }
    const i = mt.fromSchema(e);
    return t.slice ? i.parseSlice(ns(n), t.parseOptions).content : i.parse(ns(n), t.parseOptions);
  }
  return yn("", e, t);
}
function cf(n, e, t) {
  const r = n.steps.length - 1;
  if (r < e)
    return;
  const s = n.steps[r];
  if (!(s instanceof K || s instanceof ee))
    return;
  const i = n.mapping.maps[r];
  let o = 0;
  i.forEach((a, l, c, d) => {
    o === 0 && (o = d);
  }), n.setSelection($.near(n.doc.resolve(o), t));
}
var pv = (n) => !("type" in n), mv = (n, e, t) => ({ tr: r, dispatch: s, editor: i }) => {
  var o;
  if (s) {
    t = {
      parseOptions: i.options.parseOptions,
      updateSelection: !0,
      applyInputRules: !1,
      applyPasteRules: !1,
      ...t
    };
    let a;
    const l = (g) => {
      i.emit("contentError", {
        editor: i,
        error: g,
        disableCollaboration: () => {
          "collaboration" in i.storage && typeof i.storage.collaboration == "object" && i.storage.collaboration && (i.storage.collaboration.isDisabled = !0);
        }
      });
    }, c = {
      preserveWhitespace: "full",
      ...t.parseOptions
    };
    if (!t.errorOnInvalidContent && !i.options.enableContentCheck && i.options.emitContentError)
      try {
        yn(e, i.schema, {
          parseOptions: c,
          errorOnInvalidContent: !0
        });
      } catch (g) {
        l(g);
      }
    try {
      a = yn(e, i.schema, {
        parseOptions: c,
        errorOnInvalidContent: (o = t.errorOnInvalidContent) != null ? o : i.options.enableContentCheck
      });
    } catch (g) {
      return l(g), !1;
    }
    let { from: d, to: u } = typeof n == "number" ? { from: n, to: n } : { from: n.from, to: n.to }, h = !0, f = !0;
    if ((pv(a) ? a : [a]).forEach((g) => {
      g.check(), h = h ? g.isText && g.marks.length === 0 : !1, f = f ? g.isBlock : !1;
    }), d === u && f) {
      const { parent: g } = r.doc.resolve(d);
      g.isTextblock && !g.type.spec.code && !g.childCount && (d -= 1, u += 1);
    }
    let m;
    if (h) {
      if (Array.isArray(e))
        m = e.map((g) => g.text || "").join("");
      else if (e instanceof b) {
        let g = "";
        e.forEach((y) => {
          y.text && (g += y.text);
        }), m = g;
      } else typeof e == "object" && e && e.text ? m = e.text : m = e;
      r.insertText(m, d, u);
    } else {
      m = a;
      const g = r.doc.resolve(d), y = g.node(), k = g.parentOffset === 0, C = y.isText || y.isTextblock, S = y.content.size > 0;
      k && C && S && f && (d = Math.max(0, d - 1)), r.replaceWith(d, u, m);
    }
    t.updateSelection && cf(r, r.steps.length - 1, -1), t.applyInputRules && r.setMeta("applyInputRules", { from: d, text: m }), t.applyPasteRules && r.setMeta("applyPasteRules", { from: d, text: m });
  }
  return !0;
};
function df(n) {
  for (let e = 0; e < n.edgeCount; e += 1) {
    const { type: t } = n.edge(e);
    if (t.isTextblock && !t.hasRequiredAttrs())
      return t;
  }
  return null;
}
var gv = (n = {}) => ({ tr: e, dispatch: t, editor: r }) => {
  const { pos: s, attrs: i, content: o, updateSelection: a = !0 } = n;
  let l;
  typeof s == "number" ? l = e.doc.resolve(s) : s ? l = s : l = e.selection.$from;
  const c = df(l.parent.contentMatchAt(l.index()));
  if (!c)
    return !1;
  const d = Object.keys(c.spec.attrs || {}), u = i ? Object.fromEntries(Object.entries(i).filter(([f]) => d.includes(f))) : {};
  let h;
  if (o) {
    const f = yn(o, r.schema);
    h = c.createAndFill(u, f);
  } else
    h = c.createAndFill(u);
  return h ? (t && (e.insert(l.pos, h), a && cf(e, e.steps.length - 1, -1)), !0) : !1;
}, yv = () => ({ state: n, dispatch: e }) => Bg(n, e), bv = () => ({ state: n, dispatch: e }) => Fg(n, e), vv = () => ({ state: n, dispatch: e }) => ch(n, e), kv = () => ({ state: n, dispatch: e }) => fh(n, e), xv = () => ({ state: n, dispatch: e, tr: t }) => {
  try {
    const r = ko(n.doc, n.selection.$from.pos, -1);
    return r == null ? !1 : (t.join(r, 2), e && e(t), !0);
  } catch {
    return !1;
  }
}, wv = () => ({ state: n, dispatch: e, tr: t }) => {
  try {
    const r = ko(n.doc, n.selection.$from.pos, 1);
    return r == null ? !1 : (t.join(r, 2), e && e(t), !0);
  } catch {
    return !1;
  }
}, Sv = () => ({ state: n, dispatch: e }) => Lg(n, e), Cv = () => ({ state: n, dispatch: e }) => zg(n, e);
function uf() {
  return typeof navigator < "u" ? /Mac/.test(navigator.platform) : !1;
}
function Mv(n) {
  const e = n.split(/-(?!$)/);
  let t = e[e.length - 1];
  t === "Space" && (t = " ");
  let r, s, i, o;
  for (let a = 0; a < e.length - 1; a += 1) {
    const l = e[a];
    if (/^(cmd|meta|m)$/i.test(l))
      o = !0;
    else if (/^a(lt)?$/i.test(l))
      r = !0;
    else if (/^(c|ctrl|control)$/i.test(l))
      s = !0;
    else if (/^s(hift)?$/i.test(l))
      i = !0;
    else if (/^mod$/i.test(l))
      Ni() || uf() ? o = !0 : s = !0;
    else
      throw new Error(`Unrecognized modifier name: ${l}`);
  }
  return r && (t = `Alt-${t}`), s && (t = `Ctrl-${t}`), o && (t = `Meta-${t}`), i && (t = `Shift-${t}`), t;
}
var Ev = (n) => ({ editor: e, view: t, tr: r, dispatch: s }) => {
  const i = Mv(n).split(/-(?!$)/), o = i.find((c) => !["Alt", "Ctrl", "Meta", "Shift"].includes(c)), a = new KeyboardEvent("keydown", {
    key: o === "Space" ? " " : o,
    altKey: i.includes("Alt"),
    ctrlKey: i.includes("Ctrl"),
    metaKey: i.includes("Meta"),
    shiftKey: i.includes("Shift"),
    bubbles: !0,
    cancelable: !0
  }), l = e.captureTransaction(() => {
    t.someProp("handleKeyDown", (c) => c(t, a));
  });
  return l == null || l.steps.forEach((c) => {
    const d = c.map(r.mapping);
    d && s && r.maybeStep(d);
  }), !0;
};
function St(n, e, t = {}) {
  const { from: r, to: s, empty: i } = n.selection, o = e ? G(e, n.schema) : null, a = [];
  n.doc.nodesBetween(r, s, (u, h) => {
    if (u.isText)
      return;
    const f = Math.max(r, h), p = Math.min(s, h + u.nodeSize);
    a.push({
      node: u,
      from: f,
      to: p
    });
  });
  const l = s - r, c = a.filter((u) => o ? o.name === u.node.type.name : !0).filter((u) => Oi(u.node.attrs, t, { strict: !1 }));
  return i ? !!c.length : c.reduce((u, h) => u + h.to - h.from, 0) >= l;
}
var Tv = (n, e = {}) => ({ state: t, dispatch: r }) => {
  const s = G(n, t.schema);
  return St(t, s, e) ? Hg(t, r) : !1;
}, Av = () => ({ state: n, dispatch: e }) => yh(n, e), _v = (n) => ({ state: e, dispatch: t }) => {
  const r = G(n, e.schema);
  return Zg(r)(e, t);
}, Ov = () => ({ state: n, dispatch: e }) => mh(n, e);
function To(n, e) {
  return e.nodes[n] ? "node" : e.marks[n] ? "mark" : null;
}
function Ad(n, e) {
  const t = typeof e == "string" ? [e] : e;
  return Object.keys(n).reduce((r, s) => (t.includes(s) || (r[s] = n[s]), r), {});
}
var Nv = (n, e) => ({ tr: t, state: r, dispatch: s }) => {
  let i = null, o = null;
  const a = To(
    typeof n == "string" ? n : n.name,
    r.schema
  );
  if (!a)
    return !1;
  a === "node" && (i = G(n, r.schema)), a === "mark" && (o = rt(n, r.schema));
  let l = !1;
  return t.selection.ranges.forEach((c) => {
    r.doc.nodesBetween(c.$from.pos, c.$to.pos, (d, u) => {
      i && i === d.type && (l = !0, s && t.setNodeMarkup(u, void 0, Ad(d.attrs, e))), o && d.marks.length && d.marks.forEach((h) => {
        o === h.type && (l = !0, s && t.addMark(
          u,
          u + d.nodeSize,
          o.create(Ad(h.attrs, e))
        ));
      });
    });
  }), l;
}, $v = () => ({ tr: n, dispatch: e }) => (e && n.scrollIntoView(), !0), Iv = () => ({ tr: n, dispatch: e }) => {
  if (e) {
    const t = new xe(n.doc);
    n.setSelection(t);
  }
  return !0;
}, Dv = () => ({ state: n, dispatch: e }) => uh(n, e), Pv = () => ({ state: n, dispatch: e }) => ph(n, e), Rv = () => ({ state: n, dispatch: e }) => qg(n, e), Lv = () => ({ state: n, dispatch: e }) => Jg(n, e), zv = () => ({ state: n, dispatch: e }) => Kg(n, e);
function Va(n, e, t = {}, r = {}) {
  return yn(n, e, {
    slice: !1,
    parseOptions: t,
    errorOnInvalidContent: r.errorOnInvalidContent
  });
}
var Bv = (n, { errorOnInvalidContent: e, emitUpdate: t = !0, parseOptions: r = {} } = {}) => ({ editor: s, tr: i, dispatch: o, commands: a }) => {
  const { doc: l } = i;
  if (r.preserveWhitespace !== "full") {
    const c = Va(n, s.schema, r, {
      errorOnInvalidContent: e ?? s.options.enableContentCheck
    });
    return o && i.replaceWith(0, l.content.size, c).setMeta("preventUpdate", !t), !0;
  }
  return o && i.setMeta("preventUpdate", !t), a.insertContentAt({ from: 0, to: l.content.size }, n, {
    parseOptions: r,
    errorOnInvalidContent: e ?? s.options.enableContentCheck
  });
};
function hf(n, e) {
  const t = rt(e, n.schema), { from: r, to: s, empty: i } = n.selection, o = [];
  i ? (n.storedMarks && o.push(...n.storedMarks), o.push(...n.selection.$head.marks())) : n.doc.nodesBetween(r, s, (l) => {
    o.push(...l.marks);
  });
  const a = o.find((l) => l.type.name === t.name);
  return a ? { ...a.attrs } : {};
}
function ff(n, e) {
  const t = new sh(n);
  return e.forEach((r) => {
    r.steps.forEach((s) => {
      t.step(s);
    });
  }), t;
}
function Fv(n, e, t) {
  const r = [];
  return n.nodesBetween(e.from, e.to, (s, i) => {
    t(s) && r.push({
      node: s,
      pos: i
    });
  }), r;
}
function Hv(n, e) {
  for (let t = n.depth; t > 0; t -= 1) {
    const r = n.node(t);
    if (e(r))
      return {
        pos: t > 0 ? n.before(t) : 0,
        start: n.start(t),
        depth: t,
        node: r
      };
  }
}
function Ao(n) {
  return (e) => Hv(e.$from, n);
}
function E(n, e, t) {
  return n.config[e] === void 0 && n.parent ? E(n.parent, e, t) : typeof n.config[e] == "function" ? n.config[e].bind({
    ...t,
    parent: n.parent ? E(n.parent, e, t) : null
  }) : n.config[e];
}
function _l(n) {
  return n.map((e) => {
    const t = {
      name: e.name,
      options: e.options,
      storage: e.storage
    }, r = E(
      e,
      "addExtensions",
      t
    );
    return r ? [e, ..._l(r())] : e;
  }).flat(10);
}
function Ol(n, e) {
  const t = Qt.fromSchema(e).serializeFragment(n), s = document.implementation.createHTMLDocument().createElement("div");
  return s.appendChild(t), s.innerHTML;
}
function pf(n) {
  return typeof n == "function";
}
function R(n, e = void 0, ...t) {
  return pf(n) ? e ? n.bind(e)(...t) : n(...t) : n;
}
function Vv(n = {}) {
  return Object.keys(n).length === 0 && n.constructor === Object;
}
function bn(n) {
  const e = n.filter(
    (s) => s.type === "extension"
  ), t = n.filter((s) => s.type === "node"), r = n.filter((s) => s.type === "mark");
  return {
    baseExtensions: e,
    nodeExtensions: t,
    markExtensions: r
  };
}
function mf(n) {
  const e = [], { nodeExtensions: t, markExtensions: r } = bn(n), s = [...t, ...r], i = {
    default: null,
    validate: void 0,
    rendered: !0,
    renderHTML: null,
    parseHTML: null,
    keepOnSplit: !0,
    isRequired: !1
  }, o = t.filter((c) => c.name !== "text").map((c) => c.name), a = r.map((c) => c.name), l = [...o, ...a];
  return n.forEach((c) => {
    const d = {
      name: c.name,
      options: c.options,
      storage: c.storage,
      extensions: s
    }, u = E(
      c,
      "addGlobalAttributes",
      d
    );
    if (!u)
      return;
    u().forEach((f) => {
      let p;
      Array.isArray(f.types) ? p = f.types : f.types === "*" ? p = l : f.types === "nodes" ? p = o : f.types === "marks" ? p = a : p = [], p.forEach((m) => {
        Object.entries(f.attributes).forEach(([g, y]) => {
          e.push({
            type: m,
            name: g,
            attribute: {
              ...i,
              ...y
            }
          });
        });
      });
    });
  }), s.forEach((c) => {
    const d = {
      name: c.name,
      options: c.options,
      storage: c.storage
    }, u = E(c, "addAttributes", d);
    if (!u)
      return;
    const h = u();
    Object.entries(h).forEach(([f, p]) => {
      const m = {
        ...i,
        ...p
      };
      typeof (m == null ? void 0 : m.default) == "function" && (m.default = m.default()), m != null && m.isRequired && (m == null ? void 0 : m.default) === void 0 && delete m.default, e.push({
        type: c.name,
        name: f,
        attribute: m
      });
    });
  }), e;
}
function Wv(n) {
  const e = [];
  let t = "", r = !1, s = !1, i = 0;
  const o = n.length;
  for (let a = 0; a < o; a += 1) {
    const l = n[a];
    if (l === "'" && !s) {
      r = !r, t += l;
      continue;
    }
    if (l === '"' && !r) {
      s = !s, t += l;
      continue;
    }
    if (!r && !s) {
      if (l === "(") {
        i += 1, t += l;
        continue;
      }
      if (l === ")" && i > 0) {
        i -= 1, t += l;
        continue;
      }
      if (l === ";" && i === 0) {
        e.push(t), t = "";
        continue;
      }
    }
    t += l;
  }
  return t && e.push(t), e;
}
function _d(n) {
  const e = [], t = Wv(n || ""), r = t.length;
  for (let s = 0; s < r; s += 1) {
    const i = t[s], o = i.indexOf(":");
    if (o === -1)
      continue;
    const a = i.slice(0, o).trim(), l = i.slice(o + 1).trim();
    a && l && e.push([a, l]);
  }
  return e;
}
function Y(...n) {
  return n.filter((e) => !!e).reduce((e, t) => {
    const r = { ...e };
    return Object.entries(t).forEach(([s, i]) => {
      if (!r[s]) {
        r[s] = i;
        return;
      }
      if (s === "class") {
        const a = i ? String(i).split(" ") : [], l = r[s] ? r[s].split(" ") : [], c = a.filter(
          (d) => !l.includes(d)
        );
        r[s] = [...l, ...c].join(" ");
      } else if (s === "style") {
        const a = new Map([
          ..._d(r[s]),
          ..._d(i)
        ]);
        r[s] = Array.from(a.entries()).map(([l, c]) => `${l}: ${c}`).join("; ");
      } else
        r[s] = i;
    }), r;
  }, {});
}
function yr(n, e) {
  return e.filter((t) => t.type === n.type.name).filter((t) => t.attribute.rendered).map((t) => t.attribute.renderHTML ? t.attribute.renderHTML(n.attrs) || {} : {
    [t.name]: n.attrs[t.name]
  }).reduce((t, r) => Y(t, r), {});
}
function jv(n) {
  return typeof n != "string" ? n : n.match(/^[+-]?(?:\d*\.)?\d+$/) ? Number(n) : n === "true" ? !0 : n === "false" ? !1 : n;
}
function Od(n, e) {
  return "style" in n ? n : {
    ...n,
    getAttrs: (t) => {
      const r = n.getAttrs ? n.getAttrs(t) : n.attrs;
      if (r === !1)
        return !1;
      const s = e.reduce((i, o) => {
        const a = o.attribute.parseHTML ? o.attribute.parseHTML(t) : jv(t.getAttribute(o.name));
        return a == null ? i : {
          ...i,
          [o.name]: a
        };
      }, {});
      return { ...r, ...s };
    }
  };
}
function Nd(n) {
  return Object.fromEntries(
    // @ts-ignore
    Object.entries(n).filter(([e, t]) => e === "attrs" && Vv(t) ? !1 : t != null)
  );
}
function $d(n) {
  var e, t;
  const r = {};
  return !((e = n == null ? void 0 : n.attribute) != null && e.isRequired) && "default" in ((n == null ? void 0 : n.attribute) || {}) && (r.default = n.attribute.default), ((t = n == null ? void 0 : n.attribute) == null ? void 0 : t.validate) !== void 0 && (r.validate = n.attribute.validate), [n.name, r];
}
function qv(n, e) {
  var t;
  const r = mf(n), { nodeExtensions: s, markExtensions: i } = bn(n), o = (t = s.find((c) => E(c, "topNode"))) == null ? void 0 : t.name, a = Object.fromEntries(
    s.map((c) => {
      const d = r.filter(
        (y) => y.type === c.name
      ), u = {
        name: c.name,
        options: c.options,
        storage: c.storage,
        editor: e
      }, h = n.reduce((y, k) => {
        const C = E(
          k,
          "extendNodeSchema",
          u
        );
        return {
          ...y,
          ...C ? C(c) : {}
        };
      }, {}), f = Nd({
        ...h,
        content: R(
          E(c, "content", u)
        ),
        marks: R(E(c, "marks", u)),
        group: R(E(c, "group", u)),
        inline: R(E(c, "inline", u)),
        atom: R(E(c, "atom", u)),
        selectable: R(
          E(c, "selectable", u)
        ),
        draggable: R(
          E(c, "draggable", u)
        ),
        code: R(E(c, "code", u)),
        whitespace: R(
          E(c, "whitespace", u)
        ),
        linebreakReplacement: R(
          E(
            c,
            "linebreakReplacement",
            u
          )
        ),
        defining: R(
          E(c, "defining", u)
        ),
        isolating: R(
          E(c, "isolating", u)
        ),
        attrs: Object.fromEntries(d.map($d))
      }), p = R(
        E(c, "parseHTML", u)
      );
      p && (f.parseDOM = p.map(
        (y) => Od(y, d)
      ));
      const m = E(
        c,
        "renderHTML",
        u
      );
      m && (f.toDOM = (y) => m({
        node: y,
        HTMLAttributes: yr(y, d)
      }));
      const g = E(
        c,
        "renderText",
        u
      );
      return g && (f.toText = g), [c.name, f];
    })
  ), l = Object.fromEntries(
    i.map((c) => {
      const d = r.filter(
        (g) => g.type === c.name
      ), u = {
        name: c.name,
        options: c.options,
        storage: c.storage,
        editor: e
      }, h = n.reduce((g, y) => {
        const k = E(
          y,
          "extendMarkSchema",
          u
        );
        return {
          ...g,
          ...k ? k(c) : {}
        };
      }, {}), f = Nd({
        ...h,
        inclusive: R(
          E(c, "inclusive", u)
        ),
        excludes: R(
          E(c, "excludes", u)
        ),
        group: R(E(c, "group", u)),
        spanning: R(
          E(c, "spanning", u)
        ),
        code: R(E(c, "code", u)),
        attrs: Object.fromEntries(d.map($d))
      }), p = R(
        E(c, "parseHTML", u)
      );
      p && (f.parseDOM = p.map(
        (g) => Od(g, d)
      ));
      const m = E(
        c,
        "renderHTML",
        u
      );
      return m && (f.toDOM = (g) => m({
        mark: g,
        HTMLAttributes: yr(g, d)
      })), [c.name, f];
    })
  );
  return new Vu({
    topNode: o,
    nodes: a,
    marks: l
  });
}
function Uv(n) {
  const e = n.filter((t, r) => n.indexOf(t) !== r);
  return Array.from(new Set(e));
}
function Yn(n) {
  return n.sort((t, r) => {
    const s = E(t, "priority") || 100, i = E(r, "priority") || 100;
    return s > i ? -1 : s < i ? 1 : 0;
  });
}
function gf(n) {
  const e = Yn(_l(n)), t = Uv(e.map((r) => r.name));
  return t.length && console.warn(
    `[tiptap warn]: Duplicate extension names found: [${t.map((r) => `'${r}'`).join(", ")}]. This can lead to issues.`
  ), e;
}
function yf(n, e, t) {
  const { from: r, to: s } = e, { blockSeparator: i = `

`, textSerializers: o = {} } = t || {};
  let a = "";
  return n.nodesBetween(r, s, (l, c, d, u) => {
    var h;
    l.isBlock && c > r && (a += i);
    const f = o == null ? void 0 : o[l.type.name];
    if (f)
      return d && (a += f({
        node: l,
        pos: c,
        parent: d,
        index: u,
        range: e
      })), !1;
    l.isText && (a += (h = l == null ? void 0 : l.text) == null ? void 0 : h.slice(Math.max(r, c) - c, s - c));
  }), a;
}
function Kv(n, e) {
  const t = {
    from: 0,
    to: n.content.size
  };
  return yf(n, t, e);
}
function bf(n) {
  return Object.fromEntries(
    Object.entries(n.nodes).filter(([, e]) => e.spec.toText).map(([e, t]) => [e, t.spec.toText])
  );
}
function Jv(n, e) {
  const t = G(e, n.schema), { from: r, to: s } = n.selection, i = [];
  n.doc.nodesBetween(r, s, (a) => {
    i.push(a);
  });
  const o = i.reverse().find((a) => a.type.name === t.name);
  return o ? { ...o.attrs } : {};
}
function vf(n, e) {
  const t = To(
    typeof e == "string" ? e : e.name,
    n.schema
  );
  return t === "node" ? Jv(n, e) : t === "mark" ? hf(n, e) : {};
}
function Gv(n, e = JSON.stringify) {
  const t = {};
  return n.filter((r) => {
    const s = e(r);
    return Object.prototype.hasOwnProperty.call(t, s) ? !1 : t[s] = !0;
  });
}
function Yv(n) {
  const e = Gv(n);
  return e.length === 1 ? e : e.filter((t, r) => !e.filter((i, o) => o !== r).some((i) => t.oldRange.from >= i.oldRange.from && t.oldRange.to <= i.oldRange.to && t.newRange.from >= i.newRange.from && t.newRange.to <= i.newRange.to));
}
function Nl(n) {
  const { mapping: e, steps: t } = n, r = [];
  return e.maps.forEach((s, i) => {
    const o = [];
    if (s.ranges.length)
      s.forEach((a, l) => {
        o.push({ from: a, to: l });
      });
    else {
      const { from: a, to: l } = t[i];
      if (a === void 0 || l === void 0)
        return;
      o.push({ from: a, to: l });
    }
    o.forEach(({ from: a, to: l }) => {
      const c = e.slice(i).map(a, -1), d = e.slice(i).map(l), u = e.invert().map(c, -1), h = e.invert().map(d);
      r.push({
        oldRange: {
          from: u,
          to: h
        },
        newRange: {
          from: c,
          to: d
        }
      });
    });
  }), Yv(r);
}
function $l(n, e, t) {
  const r = [];
  return n === e ? t.resolve(n).marks().forEach((s) => {
    const i = t.resolve(n), o = Al(i, s.type);
    o && r.push({
      mark: s,
      ...o
    });
  }) : t.nodesBetween(n, e, (s, i) => {
    !s || (s == null ? void 0 : s.nodeSize) === void 0 || r.push(
      ...s.marks.map((o) => ({
        from: i,
        to: i + s.nodeSize,
        mark: o
      }))
    );
  }), r;
}
var Xv = (n, e, t, r = 20) => {
  const s = n.doc.resolve(t);
  let i = r, o = null;
  for (; i > 0 && o === null; ) {
    const a = s.node(i);
    (a == null ? void 0 : a.type.name) === e ? o = a : i -= 1;
  }
  return [o, i];
};
function $n(n, e) {
  return e.nodes[n] || e.marks[n] || null;
}
function ti(n, e, t) {
  return Object.fromEntries(
    Object.entries(t).filter(([r]) => {
      const s = n.find((i) => i.type === e && i.name === r);
      return s ? s.attribute.keepOnSplit : !1;
    })
  );
}
var Qv = (n, e = 500) => {
  let t = "";
  const r = n.parentOffset;
  return n.parent.nodesBetween(
    Math.max(0, r - e),
    r,
    (s, i, o, a) => {
      var l, c;
      const d = ((c = (l = s.type.spec).toText) == null ? void 0 : c.call(l, {
        node: s,
        pos: i,
        parent: o,
        index: a
      })) || s.textContent || "%leaf%";
      t += s.isAtom && !s.isText ? d : d.slice(0, Math.max(0, r - i));
    }
  ), t;
};
function Wa(n, e, t = {}) {
  const { empty: r, ranges: s } = n.selection, i = e ? rt(e, n.schema) : null;
  if (r)
    return !!(n.storedMarks || n.selection.$from.marks()).filter((u) => i ? i.name === u.type.name : !0).find((u) => Oi(u.attrs, t, { strict: !1 }));
  let o = 0;
  const a = [];
  if (s.forEach(({ $from: u, $to: h }) => {
    const f = u.pos, p = h.pos;
    n.doc.nodesBetween(f, p, (m, g) => {
      if (i && m.inlineContent && !m.type.allowsMarkType(i))
        return !1;
      if (!m.isText && !m.marks.length)
        return;
      const y = Math.max(f, g), k = Math.min(p, g + m.nodeSize), C = k - y;
      o += C, a.push(
        ...m.marks.map((S) => ({
          mark: S,
          from: y,
          to: k
        }))
      );
    });
  }), o === 0)
    return !1;
  const l = a.filter((u) => i ? i.name === u.mark.type.name : !0).filter((u) => Oi(u.mark.attrs, t, { strict: !1 })).reduce((u, h) => u + h.to - h.from, 0), c = a.filter((u) => i ? u.mark.type !== i && u.mark.type.excludes(i) : !0).reduce((u, h) => u + h.to - h.from, 0);
  return (l > 0 ? l + c : l) >= o;
}
function Zv(n, e, t = {}) {
  if (!e)
    return St(n, null, t) || Wa(n, null, t);
  const r = To(e, n.schema);
  return r === "node" ? St(n, e, t) : r === "mark" ? Wa(n, e, t) : !1;
}
var e0 = (n, e) => {
  const { $from: t, $to: r, $anchor: s } = n.selection;
  if (e) {
    const i = Ao((a) => a.type.name === e)(n.selection);
    if (!i)
      return !1;
    const o = n.doc.resolve(i.pos + 1);
    return s.pos + 1 === o.end();
  }
  return !(r.parentOffset < r.parent.nodeSize - 2 || t.pos !== r.pos);
}, t0 = (n) => {
  const { $from: e, $to: t } = n.selection;
  return !(e.parentOffset > 0 || e.pos !== t.pos);
};
function Id(n, e) {
  return Array.isArray(e) ? e.some((t) => (typeof t == "string" ? t : t.name) === n.name) : e;
}
function aa(n, e) {
  const { nodeExtensions: t } = bn(e), r = t.find((o) => o.name === n);
  if (!r)
    return !1;
  const s = {
    name: r.name,
    options: r.options,
    storage: r.storage
  }, i = R(E(r, "group", s));
  return typeof i != "string" ? !1 : i.split(" ").includes("list");
}
function Wr(n, {
  checkChildren: e = !0,
  ignoreWhitespace: t = !1
} = {}) {
  var r;
  if (t) {
    if (n.type.name === "hardBreak")
      return !0;
    if (n.isText)
      return !/\S/.test((r = n.text) != null ? r : "");
  }
  if (n.isText)
    return !n.text;
  if (n.isAtom || n.isLeaf)
    return !1;
  if (n.content.childCount === 0)
    return !0;
  if (e) {
    let s = !0;
    return n.content.forEach((i) => {
      s !== !1 && (Wr(i, { ignoreWhitespace: t, checkChildren: e }) || (s = !1));
    }), s;
  }
  return !1;
}
function kf(n) {
  return n instanceof _;
}
var xf = class wf {
  constructor(e) {
    this.position = e;
  }
  /**
   * Creates a MappablePosition from a JSON object.
   */
  static fromJSON(e) {
    return new wf(e.position);
  }
  /**
   * Converts the MappablePosition to a JSON object.
   */
  toJSON() {
    return {
      position: this.position
    };
  }
};
function n0(n, e) {
  const t = e.mapping.mapResult(n.position);
  return {
    position: new xf(t.pos),
    mapResult: t
  };
}
function r0(n) {
  return new xf(n);
}
function s0(n, e, t) {
  var r;
  const { selection: s } = e;
  let i = null;
  if (af(s) && (i = s.$cursor), i) {
    const a = (r = n.storedMarks) != null ? r : i.marks();
    return i.parent.type.allowsMarkType(t) && (!!t.isInSet(a) || !a.some((c) => c.type.excludes(t)));
  }
  const { ranges: o } = s;
  return o.some(({ $from: a, $to: l }) => {
    let c = a.depth === 0 ? n.doc.inlineContent && n.doc.type.allowsMarkType(t) : !1;
    return n.doc.nodesBetween(a.pos, l.pos, (d, u, h) => {
      if (c)
        return !1;
      if (d.isInline) {
        const f = !h || h.type.allowsMarkType(t), p = !!t.isInSet(d.marks) || !d.marks.some((m) => m.type.excludes(t));
        c = f && p;
      }
      return !c;
    }), c;
  });
}
var i0 = (n, e = {}) => ({ tr: t, state: r, dispatch: s }) => {
  const { selection: i } = t, { empty: o, ranges: a } = i, l = rt(n, r.schema);
  if (s)
    if (o) {
      const c = hf(r, l);
      t.addStoredMark(
        l.create({
          ...c,
          ...e
        })
      );
    } else
      a.forEach((c) => {
        const d = c.$from.pos, u = c.$to.pos;
        r.doc.nodesBetween(d, u, (h, f) => {
          const p = Math.max(f, d), m = Math.min(f + h.nodeSize, u);
          h.marks.find((y) => y.type === l) ? h.marks.forEach((y) => {
            l === y.type && t.addMark(
              p,
              m,
              l.create({
                ...y.attrs,
                ...e
              })
            );
          }) : t.addMark(p, m, l.create(e));
        });
      });
  return s0(r, t, l);
}, o0 = (n, e) => ({ tr: t }) => (t.setMeta(n, e), !0), a0 = (n, e = {}) => ({ state: t, dispatch: r, chain: s }) => {
  const i = G(n, t.schema);
  let o;
  return t.selection.$anchor.sameParent(t.selection.$head) && (o = t.selection.$anchor.parent.attrs), i.isTextblock ? s().command(({ commands: a }) => Jc(i, { ...o, ...e })(t) ? !0 : a.clearNodes()).command(({ state: a }) => Jc(i, { ...o, ...e })(a, r)).run() : (console.warn('[tiptap warn]: Currently "setNode()" only supports text block nodes.'), !1);
}, l0 = (n) => ({ tr: e, dispatch: t }) => {
  if (t) {
    const { doc: r } = e, s = Pt(n, 0, r.content.size), i = _.create(r, s);
    e.setSelection(i);
  }
  return !0;
}, c0 = (n, e) => ({ tr: t, state: r, dispatch: s }) => {
  const { selection: i } = r;
  let o, a;
  return typeof e == "number" ? (o = e, a = e) : e && "from" in e && "to" in e ? (o = e.from, a = e.to) : (o = i.from, a = i.to), s && t.doc.nodesBetween(o, a, (l, c) => {
    l.isText || t.setNodeMarkup(c, void 0, {
      ...l.attrs,
      dir: n
    });
  }), !0;
}, d0 = (n) => ({ tr: e, dispatch: t }) => {
  if (t) {
    const { doc: r } = e, { from: s, to: i } = typeof n == "number" ? { from: n, to: n } : n, o = O.atStart(r).from, a = O.atEnd(r).to, l = Pt(s, o, a), c = Pt(i, o, a), d = O.create(r, l, c);
    e.setSelection(d);
  }
  return !0;
}, u0 = (n) => ({ state: e, dispatch: t }) => {
  const r = G(n, e.schema);
  return ny(r)(e, t);
};
function Dd(n, e) {
  const t = n.storedMarks || n.selection.$to.parentOffset && n.selection.$from.marks();
  if (t) {
    const r = t.filter((s) => e == null ? void 0 : e.includes(s.type.name));
    n.tr.ensureMarks(r);
  }
}
var h0 = ({ keepMarks: n = !0 } = {}) => ({ tr: e, state: t, dispatch: r, editor: s }) => {
  const { selection: i, doc: o } = e, { $from: a, $to: l } = i, c = s.extensionManager.attributes, d = ti(
    c,
    a.node().type.name,
    a.node().attrs
  );
  if (i instanceof _ && i.node.isBlock)
    return !a.parentOffset || !et(o, a.pos) ? !1 : (r && (n && Dd(t, s.extensionManager.splittableMarks), e.split(a.pos).scrollIntoView()), !0);
  if (!a.parent.isBlock)
    return !1;
  const u = l.parentOffset === l.parent.content.size, h = a.depth === 0 ? void 0 : df(a.node(-1).contentMatchAt(a.indexAfter(-1)));
  let f = u && h ? [
    {
      type: h,
      attrs: d
    }
  ] : void 0, p = et(e.doc, e.mapping.map(a.pos), 1, f);
  if (!f && !p && et(e.doc, e.mapping.map(a.pos), 1, h ? [{ type: h }] : void 0) && (p = !0, f = h ? [
    {
      type: h,
      attrs: d
    }
  ] : void 0), r) {
    if (p && (i instanceof O && e.deleteSelection(), e.split(e.mapping.map(a.pos), 1, f), h && !u && !a.parentOffset && a.parent.type !== h)) {
      const m = e.mapping.map(a.before()), g = e.doc.resolve(m);
      a.node(-1).canReplaceWith(g.index(), g.index() + 1, h) && e.setNodeMarkup(e.mapping.map(a.before()), h);
    }
    n && Dd(t, s.extensionManager.splittableMarks), e.scrollIntoView();
  }
  return p;
}, f0 = (n, e = {}) => ({ tr: t, state: r, dispatch: s, editor: i }) => {
  var o;
  const a = G(n, r.schema), { $from: l, $to: c } = r.selection, d = r.selection.node;
  if (d && d.isBlock || l.depth < 2 || !l.sameParent(c))
    return !1;
  const u = l.node(-1);
  if (u.type !== a)
    return !1;
  const h = i.extensionManager.attributes;
  if (l.parent.content.size === 0 && l.node(-1).childCount === l.indexAfter(-1)) {
    if (l.depth === 2 || l.node(-3).type !== a || l.index(-2) !== l.node(-2).childCount - 1)
      return !1;
    if (s) {
      let y = b.empty;
      const k = l.index(-1) ? 1 : l.index(-2) ? 2 : 3;
      for (let D = l.depth - k; D >= l.depth - 3; D -= 1)
        y = b.from(l.node(D).copy(y));
      const C = (
        // oxlint-disable-next-line no-nested-ternary
        l.indexAfter(-1) < l.node(-2).childCount ? 1 : l.indexAfter(-2) < l.node(-3).childCount ? 2 : 3
      ), S = {
        ...ti(h, l.node().type.name, l.node().attrs),
        ...e
      }, A = ((o = a.contentMatch.defaultType) == null ? void 0 : o.createAndFill(S)) || void 0;
      y = y.append(b.from(a.createAndFill(null, A) || void 0));
      const N = l.before(l.depth - (k - 1));
      t.replace(N, l.after(-C), new w(y, 4 - k, 0));
      let T = -1;
      t.doc.nodesBetween(N, t.doc.content.size, (D, P) => {
        if (T > -1)
          return !1;
        D.isTextblock && D.content.size === 0 && (T = P + 1);
      }), T > -1 && t.setSelection(O.near(t.doc.resolve(T))), t.scrollIntoView();
    }
    return !0;
  }
  const f = c.pos === l.end() ? u.contentMatchAt(0).defaultType : null, p = {
    ...ti(h, u.type.name, u.attrs),
    ...e
  }, m = {
    ...ti(h, l.node().type.name, l.node().attrs),
    ...e
  };
  t.delete(l.pos, c.pos);
  const g = f ? [
    { type: a, attrs: p },
    { type: f, attrs: m }
  ] : [{ type: a, attrs: p }];
  if (!et(t.doc, l.pos, 2))
    return !1;
  if (s) {
    const { selection: y, storedMarks: k } = r, { splittableMarks: C } = i.extensionManager, S = k || y.$to.parentOffset && y.$from.marks();
    if (t.split(l.pos, 2, g).scrollIntoView(), !S || !s)
      return !0;
    const A = S.filter((N) => C.includes(N.type.name));
    t.ensureMarks(A);
  }
  return !0;
};
function Pd(n) {
  return !n || n === "1" ? null : n;
}
function Sf(n, e) {
  return Pd(n) === Pd(e);
}
var la = (n, e) => {
  const t = Ao((o) => o.type === e)(n.selection);
  if (!t)
    return !0;
  const r = n.doc.resolve(Math.max(0, t.pos - 1)).before(t.depth);
  if (r === void 0)
    return !0;
  const s = n.doc.nodeAt(r);
  return !(t.node.type === (s == null ? void 0 : s.type) && Et(n.doc, t.pos)) || !Sf(t.node.attrs.type, s == null ? void 0 : s.attrs.type) || n.join(t.pos), !0;
}, ca = (n, e) => {
  const t = Ao((o) => o.type === e)(n.selection);
  if (!t)
    return !0;
  const r = n.doc.resolve(t.start).after(t.depth);
  if (r === void 0)
    return !0;
  const s = n.doc.nodeAt(r);
  return !(t.node.type === (s == null ? void 0 : s.type) && Et(n.doc, r)) || !Sf(t.node.attrs.type, s == null ? void 0 : s.attrs.type) || n.join(r), !0;
};
function p0(n) {
  const e = n.doc, t = e.firstChild;
  if (!t)
    return null;
  const r = e.resolve(1), s = e.resolve(t.nodeSize - 1);
  return O.between(r, s);
}
var m0 = (n, e, t, r = {}) => ({ editor: s, tr: i, state: o, dispatch: a, chain: l, commands: c, can: d }) => {
  const { extensions: u, splittableMarks: h } = s.extensionManager, f = G(n, o.schema), p = G(e, o.schema), { selection: m, storedMarks: g } = o, { $from: y, $to: k } = m, C = y.blockRange(k), S = g || m.$to.parentOffset && m.$from.marks();
  if (!C)
    return !1;
  const A = Ao((oe) => aa(oe.type.name, u))(m), N = m.from === 0 && m.to === o.doc.content.size, T = o.doc.content.content, D = T.length === 1 ? T[0] : null, P = N && D && aa(D.type.name, u) ? {
    node: D,
    pos: 0
  } : null, Q = A ?? P, He = !!A && C.depth >= 1 && C.depth - A.depth <= 1, Pe = !!P;
  if ((He || Pe) && Q) {
    if (Q.node.type === f)
      return N && Pe ? l().command(({ tr: oe, dispatch: Z }) => {
        const j = p0(oe);
        return j ? (oe.setSelection(j), Z && Z(oe), !0) : !1;
      }).liftListItem(p).run() : c.liftListItem(p);
    if (aa(Q.node.type.name, u) && f.validContent(Q.node.content))
      return l().command(() => (i.setNodeMarkup(Q.pos, f), !0)).command(() => la(i, f)).command(() => ca(i, f)).run();
  }
  return !t || !S || !a ? l().command(() => d().wrapInList(f, r) ? !0 : c.clearNodes()).wrapInList(f, r).command(() => la(i, f)).command(() => ca(i, f)).run() : l().command(() => {
    const oe = d().wrapInList(f, r), Z = S.filter((j) => h.includes(j.type.name));
    return i.ensureMarks(Z), oe ? !0 : c.clearNodes();
  }).wrapInList(f, r).command(() => la(i, f)).command(() => ca(i, f)).run();
}, g0 = (n, e = {}, t = {}) => ({ state: r, commands: s }) => {
  const { extendEmptyMarkRange: i = !1 } = t, o = rt(n, r.schema);
  return Wa(r, o, e) ? s.unsetMark(o, { extendEmptyMarkRange: i }) : s.setMark(o, e);
}, y0 = (n, e, t = {}) => ({ state: r, commands: s }) => {
  const i = G(n, r.schema), o = G(e, r.schema), a = St(r, i, t);
  let l;
  return r.selection.$anchor.sameParent(r.selection.$head) && (l = r.selection.$anchor.parent.attrs), a ? s.setNode(o, l) : s.setNode(i, { ...l, ...t });
}, b0 = (n, e = {}) => ({ state: t, commands: r }) => {
  const s = G(n, t.schema);
  return St(t, s, e) ? r.lift(s) : r.wrapIn(s, e);
}, v0 = () => ({ state: n, dispatch: e }) => {
  const t = n.plugins;
  for (let r = 0; r < t.length; r += 1) {
    const s = t[r];
    let i;
    if (s.spec.isInputRules && (i = s.getState(n))) {
      if (e) {
        const o = n.tr, a = i.transform;
        for (let l = a.steps.length - 1; l >= 0; l -= 1)
          o.step(a.steps[l].invert(a.docs[l]));
        if (i.text) {
          const l = o.doc.resolve(i.from).marks();
          o.replaceWith(i.from, i.to, n.schema.text(i.text, l));
        } else
          o.delete(i.from, i.to);
      }
      return !0;
    }
  }
  return !1;
}, k0 = (n = {}) => ({ tr: e, dispatch: t, editor: r }) => {
  const { ignoreClearable: s = !1 } = n, { selection: i } = e, { empty: o, ranges: a } = i;
  if (o)
    return !0;
  const { nonClearableMarks: l } = r.extensionManager;
  if (t) {
    const c = Object.values(r.schema.marks).filter(
      (d) => s || !l.includes(d.name)
    );
    a.forEach((d) => {
      for (const u of c)
        e.removeMark(d.$from.pos, d.$to.pos, u);
    });
  }
  return !0;
}, x0 = (n, e = {}) => ({ tr: t, state: r, dispatch: s }) => {
  var i;
  const { extendEmptyMarkRange: o = !1 } = e, { selection: a } = t, l = rt(n, r.schema), { $from: c, empty: d, ranges: u } = a;
  if (!s)
    return !0;
  if (d && o) {
    let { from: h, to: f } = a;
    const p = (i = c.marks().find((g) => g.type === l)) == null ? void 0 : i.attrs, m = Al(c, l, p);
    m && (h = m.from, f = m.to), t.removeMark(h, f, l);
  } else
    u.forEach((h) => {
      t.removeMark(h.$from.pos, h.$to.pos, l);
    });
  return t.removeStoredMark(l), !0;
}, w0 = (n) => ({ tr: e, state: t, dispatch: r }) => {
  const { selection: s } = t;
  let i, o;
  return typeof n == "number" ? (i = n, o = n) : n && "from" in n && "to" in n ? (i = n.from, o = n.to) : (i = s.from, o = s.to), r && e.doc.nodesBetween(i, o, (a, l) => {
    if (a.isText)
      return;
    const c = { ...a.attrs };
    delete c.dir, e.setNodeMarkup(l, void 0, c);
  }), !0;
}, S0 = (n, e = {}) => ({ tr: t, state: r, dispatch: s }) => {
  let i = null, o = null;
  const a = To(
    typeof n == "string" ? n : n.name,
    r.schema
  );
  if (!a)
    return !1;
  a === "node" && (i = G(n, r.schema)), a === "mark" && (o = rt(n, r.schema));
  let l = !1;
  return t.selection.ranges.forEach((c) => {
    const d = c.$from.pos, u = c.$to.pos;
    let h, f, p, m;
    t.selection.empty ? r.doc.nodesBetween(d, u, (g, y) => {
      i && i === g.type && (l = !0, p = Math.max(y, d), m = Math.min(y + g.nodeSize, u), h = y, f = g);
    }) : r.doc.nodesBetween(d, u, (g, y) => {
      y < d && i && i === g.type && (l = !0, p = Math.max(y, d), m = Math.min(y + g.nodeSize, u), h = y, f = g), y >= d && y <= u && (i && i === g.type && (l = !0, s && t.setNodeMarkup(y, void 0, {
        ...g.attrs,
        ...e
      })), o && g.marks.length && g.marks.forEach((k) => {
        if (o === k.type && (l = !0, s)) {
          const C = Math.max(y, d), S = Math.min(y + g.nodeSize, u);
          t.addMark(
            C,
            S,
            o.create({
              ...k.attrs,
              ...e
            })
          );
        }
      }));
    }), f && (h !== void 0 && s && t.setNodeMarkup(h, void 0, {
      ...f.attrs,
      ...e
    }), o && f.marks.length && f.marks.forEach((g) => {
      o === g.type && s && t.addMark(
        p,
        m,
        o.create({
          ...g.attrs,
          ...e
        })
      );
    }));
  }), l;
}, C0 = (n, e = {}) => ({ state: t, dispatch: r }) => {
  const s = G(n, t.schema);
  return Gg(s, e)(t, r);
}, M0 = (n, e = {}) => ({ state: t, dispatch: r }) => {
  const s = G(n, t.schema);
  return Yg(s, e)(t, r);
}, E0 = class {
  constructor() {
    this.callbacks = {};
  }
  on(n, e) {
    return this.callbacks[n] || (this.callbacks[n] = []), this.callbacks[n].push(e), this;
  }
  emit(n, ...e) {
    const t = this.callbacks[n];
    return t && t.forEach((r) => r.apply(this, e)), this;
  }
  off(n, e) {
    const t = this.callbacks[n];
    return t && (e ? this.callbacks[n] = t.filter((r) => r !== e) : delete this.callbacks[n]), this;
  }
  once(n, e) {
    const t = (...r) => {
      this.off(n, t), e.apply(this, r);
    };
    return this.on(n, t);
  }
  removeAllListeners() {
    this.callbacks = {};
  }
};
function T0(n, e) {
  const { selection: t } = n, { $from: r } = t;
  if (t instanceof _) {
    const i = r.index();
    return r.parent.canReplaceWith(i, i + 1, e);
  }
  let s = r.depth;
  for (; s >= 0; ) {
    const i = r.index(s);
    if (r.node(s).contentMatchAt(i).matchType(e))
      return !0;
    s -= 1;
  }
  return !1;
}
function A0(n, e, t) {
  const r = document.querySelector("style[data-tiptap-style]");
  if (r !== null)
    return r;
  const s = document.createElement("style");
  return e && s.setAttribute("nonce", e), s.setAttribute("data-tiptap-style", ""), s.innerHTML = n, document.getElementsByTagName("head")[0].appendChild(s), s;
}
function _0(n) {
  return typeof n == "number";
}
function O0(n) {
  return Object.prototype.toString.call(n).slice(8, -1);
}
function rs(n) {
  return O0(n) !== "Object" ? !1 : n.constructor === Object && Object.getPrototypeOf(n) === Object.prototype;
}
var N0 = {};
El(N0, {
  createAtomBlockMarkdownSpec: () => $0,
  createBlockMarkdownSpec: () => I0,
  createInlineMarkdownSpec: () => R0,
  parseAttributes: () => Il,
  parseIndentedBlocks: () => ja,
  renderNestedMarkdownContent: () => Pl,
  serializeAttributes: () => Dl
});
function Il(n) {
  if (!(n != null && n.trim()))
    return {};
  const e = {}, t = [], r = n.replace(/["']([^"']*)["']/g, (c) => (t.push(c), `__QUOTED_${t.length - 1}__`)), s = r.match(/(?:^|\s)\.([\w-]+)/g);
  if (s) {
    const c = s.map((d) => d.trim().slice(1));
    e.class = c.join(" ");
  }
  const i = r.match(/(?:^|\s)#([\w-]+)/);
  i && (e.id = i[1]);
  const o = /([a-zA-Z][\w-]*)\s*=\s*(__QUOTED_\d+__)/g;
  Array.from(r.matchAll(o)).forEach(([, c, d]) => {
    var u;
    const h = parseInt(((u = d.match(/__QUOTED_(\d+)__/)) == null ? void 0 : u[1]) || "0", 10), f = t[h];
    f && (e[c] = f.slice(1, -1));
  });
  const l = r.replace(/(?:^|\s)\.([\w-]+)/g, "").replace(/(?:^|\s)#([\w-]+)/g, "").replace(/([a-zA-Z][\w-]*)\s*=\s*__QUOTED_\d+__/g, "").trim();
  return l && l.split(/\s+/).filter(Boolean).forEach((d) => {
    d.match(/^[a-zA-Z][\w-]*$/) && (e[d] = !0);
  }), e;
}
function Dl(n) {
  if (!n || Object.keys(n).length === 0)
    return "";
  const e = [];
  return n.class && String(n.class).split(/\s+/).filter(Boolean).forEach((r) => e.push(`.${r}`)), n.id && e.push(`#${n.id}`), Object.entries(n).forEach(([t, r]) => {
    t === "class" || t === "id" || (r === !0 ? e.push(t) : r !== !1 && r != null && e.push(`${t}="${String(r)}"`));
  }), e.join(" ");
}
function $0(n) {
  const {
    nodeName: e,
    name: t,
    parseAttributes: r = Il,
    serializeAttributes: s = Dl,
    defaultAttributes: i = {},
    requiredAttributes: o = [],
    allowedAttributes: a
  } = n, l = t || e, c = (d) => {
    if (!a)
      return d;
    const u = {};
    return a.forEach((h) => {
      h in d && (u[h] = d[h]);
    }), u;
  };
  return {
    parseMarkdown: (d, u) => {
      const h = { ...i, ...d.attributes };
      return u.createNode(e, h, []);
    },
    markdownTokenizer: {
      name: e,
      level: "block",
      start(d) {
        var u;
        const h = new RegExp(`^:::${l}(?:\\s|$)`, "m"), f = (u = d.match(h)) == null ? void 0 : u.index;
        return f !== void 0 ? f : -1;
      },
      tokenize(d, u, h) {
        const f = new RegExp(`^:::${l}(?:\\s+\\{([^}]*)\\})?\\s*:::(?:\\n|$)`), p = d.match(f);
        if (!p)
          return;
        const m = p[1] || "", g = r(m);
        if (!o.find((k) => !(k in g)))
          return {
            type: e,
            raw: p[0],
            attributes: g
          };
      }
    },
    renderMarkdown: (d) => {
      const u = c(d.attrs || {}), h = s(u), f = h ? ` {${h}}` : "";
      return `:::${l}${f} :::`;
    }
  };
}
function I0(n) {
  const {
    nodeName: e,
    name: t,
    getContent: r,
    parseAttributes: s = Il,
    serializeAttributes: i = Dl,
    defaultAttributes: o = {},
    content: a = "block",
    allowedAttributes: l
  } = n, c = t || e, d = (u) => {
    if (!l)
      return u;
    const h = {};
    return l.forEach((f) => {
      f in u && (h[f] = u[f]);
    }), h;
  };
  return {
    parseMarkdown: (u, h) => {
      let f;
      if (r) {
        const m = r(u);
        f = typeof m == "string" ? [{ type: "text", text: m }] : m;
      } else a === "block" ? f = h.parseChildren(u.tokens || []) : f = h.parseInline(u.tokens || []);
      const p = { ...o, ...u.attributes };
      return h.createNode(e, p, f);
    },
    markdownTokenizer: {
      name: e,
      level: "block",
      start(u) {
        var h;
        const f = new RegExp(`^:::${c}`, "m"), p = (h = u.match(f)) == null ? void 0 : h.index;
        return p !== void 0 ? p : -1;
      },
      tokenize(u, h, f) {
        var p;
        const m = new RegExp(`^:::${c}(?:\\s+\\{([^}]*)\\})?\\s*\\n`), g = u.match(m);
        if (!g)
          return;
        const [y, k = ""] = g, C = s(k);
        let S = 1;
        const A = y.length;
        let N = "";
        const T = /^:::([\w-]*)(\s.*)?/gm, D = u.slice(A);
        for (T.lastIndex = 0; ; ) {
          const P = T.exec(D);
          if (P === null)
            break;
          const Q = P.index, He = P[1];
          if (!((p = P[2]) != null && p.endsWith(":::"))) {
            if (He)
              S += 1;
            else if (S -= 1, S === 0) {
              const Pe = D.slice(0, Q);
              N = Pe.trim();
              const oe = u.slice(0, A + Q + P[0].length);
              let Z = [];
              if (N)
                if (a === "block")
                  for (Z = f.blockTokens(Pe), Z.forEach((j) => {
                    j.text && (!j.tokens || j.tokens.length === 0) && (j.tokens = f.inlineTokens(j.text));
                  }); Z.length > 0; ) {
                    const j = Z[Z.length - 1];
                    if (j.type === "paragraph" && (!j.text || j.text.trim() === ""))
                      Z.pop();
                    else
                      break;
                  }
                else
                  Z = f.inlineTokens(N);
              return {
                type: e,
                raw: oe,
                attributes: C,
                content: N,
                tokens: Z
              };
            }
          }
        }
      }
    },
    renderMarkdown: (u, h) => {
      const f = d(u.attrs || {}), p = i(f), m = p ? ` {${p}}` : "", g = h.renderChildren(u.content || [], `

`);
      return `:::${c}${m}

${g}

:::`;
    }
  };
}
function D0(n) {
  if (!n.trim())
    return {};
  const e = {}, t = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
  let r = t.exec(n);
  for (; r !== null; ) {
    const [, s, i, o] = r;
    e[s] = i || o, r = t.exec(n);
  }
  return e;
}
function P0(n) {
  return Object.entries(n).filter(([, e]) => e != null).map(([e, t]) => `${e}="${t}"`).join(" ");
}
function R0(n) {
  const {
    nodeName: e,
    name: t,
    getContent: r,
    parseAttributes: s = D0,
    serializeAttributes: i = P0,
    defaultAttributes: o = {},
    selfClosing: a = !1,
    allowedAttributes: l
  } = n, c = t || e, d = (h) => {
    if (!l)
      return h;
    const f = {};
    return l.forEach((p) => {
      const m = typeof p == "string" ? p : p.name, g = typeof p == "string" ? void 0 : p.skipIfDefault;
      if (m in h) {
        const y = h[m];
        if (g !== void 0 && y === g)
          return;
        f[m] = y;
      }
    }), f;
  }, u = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    parseMarkdown: (h, f) => {
      const p = { ...o, ...h.attributes };
      if (a)
        return f.createNode(e, p);
      const m = r ? r(h) : h.content || "";
      return m ? f.createNode(e, p, [f.createTextNode(m)]) : f.createNode(e, p, []);
    },
    markdownTokenizer: {
      name: e,
      level: "inline",
      start(h) {
        const f = a ? new RegExp(`\\[${u}\\s*[^\\]]*\\]`) : new RegExp(`\\[${u}\\s*[^\\]]*\\][\\s\\S]*?\\[\\/${u}\\]`), p = h.match(f), m = p == null ? void 0 : p.index;
        return m !== void 0 ? m : -1;
      },
      tokenize(h, f, p) {
        const m = a ? new RegExp(`^\\[${u}\\s*([^\\]]*)\\]`) : new RegExp(
          `^\\[${u}\\s*([^\\]]*)\\]([\\s\\S]*?)\\[\\/${u}\\]`
        ), g = h.match(m);
        if (!g)
          return;
        let y = "", k = "";
        if (a) {
          const [, S] = g;
          k = S;
        } else {
          const [, S, A] = g;
          k = S, y = A || "";
        }
        const C = s(k.trim());
        return {
          type: e,
          raw: g[0],
          content: y.trim(),
          attributes: C
        };
      }
    },
    renderMarkdown: (h) => {
      let f = "";
      r ? f = r(h) : h.content && h.content.length > 0 && (f = h.content.filter((y) => y.type === "text").map((y) => y.text).join(""));
      const p = d(h.attrs || {}), m = i(p), g = m ? ` ${m}` : "";
      return a ? `[${c}${g}]` : `[${c}${g}]${f}[/${c}]`;
    }
  };
}
function ja(n, e, t) {
  var r, s, i, o;
  const a = n.split(`
`), l = [];
  let c = "", d = 0;
  const u = e.baseIndentSize || 2;
  for (; d < a.length; ) {
    const h = a[d], f = h.match(e.itemPattern);
    if (!f) {
      if (l.length > 0)
        break;
      if (h.trim() === "") {
        d += 1, c = `${c}${h}
`;
        continue;
      } else
        return;
    }
    const p = e.extractItemData(f), { indentLevel: m, mainContent: g } = p;
    c = `${c}${h}
`;
    const y = [g];
    for (d += 1; d < a.length; ) {
      const A = a[d];
      if (A.trim() === "") {
        const T = a.slice(d + 1).findIndex((Q) => Q.trim() !== "");
        if (T === -1)
          break;
        if ((((s = (r = a[d + 1 + T].match(/^(\s*)/)) == null ? void 0 : r[1]) == null ? void 0 : s.length) || 0) > m) {
          y.push(A), c = `${c}${A}
`, d += 1;
          continue;
        } else
          break;
      }
      if ((((o = (i = A.match(/^(\s*)/)) == null ? void 0 : i[1]) == null ? void 0 : o.length) || 0) > m)
        y.push(A), c = `${c}${A}
`, d += 1;
      else
        break;
    }
    let k;
    const C = y.slice(1);
    if (C.length > 0) {
      const A = C.map((N) => N.slice(m + u)).join(`
`);
      A.trim() && (e.customNestedParser ? k = e.customNestedParser(A) : k = t.blockTokens(A));
    }
    const S = e.createToken(p, k);
    l.push(S);
  }
  if (l.length !== 0)
    return {
      items: l,
      raw: c
    };
}
function Pl(n, e, t, r) {
  if (!n || !Array.isArray(n.content))
    return "";
  const s = typeof t == "function" ? t(r) : t, [i, ...o] = n.content, a = e.renderChildren([i]);
  let l = `${s}${a}`;
  return o && o.length > 0 && o.forEach((c, d) => {
    var u, h;
    const f = (h = (u = e.renderChild) == null ? void 0 : u.call(e, c, d + 1)) != null ? h : e.renderChildren([c]);
    if (f != null) {
      const p = f.split(`
`).map((m) => m ? e.indent(m) : e.indent("")).join(`
`);
      l += c.type === "paragraph" ? `

${p}` : `
${p}`;
    }
  }), l;
}
function Cf(n, e) {
  const t = { ...n };
  return rs(n) && rs(e) && Object.keys(e).forEach((r) => {
    rs(e[r]) && rs(n[r]) ? t[r] = Cf(n[r], e[r]) : t[r] = e[r];
  }), t;
}
function L0(n, e, t = {}) {
  const { state: r } = e, { doc: s, tr: i } = r, o = n;
  s.descendants((a, l) => {
    const c = i.mapping.map(l), d = i.mapping.map(l) + a.nodeSize;
    let u = null;
    if (a.marks.forEach((f) => {
      if (f !== o)
        return !1;
      u = f;
    }), !u)
      return;
    let h = !1;
    if (Object.keys(t).forEach((f) => {
      t[f] !== u.attrs[f] && (h = !0);
    }), h) {
      const f = n.type.create({
        ...n.attrs,
        ...t
      });
      i.removeMark(c, d, n.type), i.addMark(c, d, f);
    }
  }), i.docChanged && e.view.dispatch(i);
}
var jr = class {
  constructor(n) {
    var e;
    this.find = n.find, this.handler = n.handler, this.undoable = (e = n.undoable) != null ? e : !0;
  }
}, z0 = (n, e) => {
  if (Tl(e))
    return e.exec(n);
  const t = e(n);
  if (!t)
    return null;
  const r = [t.text];
  return r.index = t.index, r.input = n, r.data = t.data, t.replaceWith && (t.text.includes(t.replaceWith) || console.warn(
    '[tiptap warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".'
  ), r.push(t.replaceWith)), r;
};
function ss(n) {
  var e;
  const { editor: t, from: r, to: s, text: i, rules: o, plugin: a } = n, { view: l } = t;
  if (l.composing)
    return !1;
  const c = l.state.doc.resolve(r);
  if (
    // check for code node
    c.parent.type.spec.code || (e = c.nodeBefore || c.nodeAfter) != null && e.marks.find((h) => h.type.spec.code)
  )
    return !1;
  let d = !1;
  const u = Qv(c) + i;
  return o.forEach((h) => {
    if (d)
      return;
    const f = z0(u, h.find);
    if (!f)
      return;
    const p = f[0].length - i.length;
    if (p > 0) {
      const N = c.parentOffset - p;
      if (N < 0 || c.parent.textBetween(N, c.parentOffset) !== f[0].slice(0, p))
        return;
    }
    const m = l.state.tr, g = Mo({
      state: l.state,
      transaction: m
    }), y = {
      from: r - (f[0].length - i.length),
      to: s
    }, { commands: k, chain: C, can: S } = new Eo({
      editor: t,
      state: g
    });
    h.handler({
      state: g,
      range: y,
      match: f,
      commands: k,
      chain: C,
      can: S
    }) === null || !m.steps.length || (h.undoable && m.setMeta(a, {
      transform: m,
      from: r,
      to: s,
      text: i
    }), l.dispatch(m), d = !0);
  }), d;
}
function B0(n) {
  const { editor: e, rules: t } = n, r = new F({
    state: {
      init() {
        return null;
      },
      apply(s, i, o) {
        const a = s.getMeta(r);
        if (a)
          return a;
        const l = s.getMeta("applyInputRules");
        return !!l && setTimeout(() => {
          let { text: d } = l;
          typeof d == "string" ? d = d : d = Ol(b.from(d), o.schema);
          const { from: u } = l, h = u + d.length;
          ss({
            editor: e,
            from: u,
            to: h,
            text: d,
            rules: t,
            plugin: r
          });
        }), s.selectionSet || s.docChanged ? null : i;
      }
    },
    props: {
      handleTextInput(s, i, o, a) {
        return ss({
          editor: e,
          from: i,
          to: o,
          text: a,
          rules: t,
          plugin: r
        });
      },
      handleDOMEvents: {
        compositionend: (s) => (setTimeout(() => {
          const { $cursor: i } = s.state.selection;
          i && ss({
            editor: e,
            from: i.pos,
            to: i.pos,
            text: "",
            rules: t,
            plugin: r
          });
        }), !1)
      },
      // add support for input rules to trigger on enter
      // this is useful for example for code blocks
      handleKeyDown(s, i) {
        if (i.key !== "Enter")
          return !1;
        const { $cursor: o } = s.state.selection;
        return o ? ss({
          editor: e,
          from: o.pos,
          to: o.pos,
          text: `
`,
          rules: t,
          plugin: r
        }) : !1;
      }
    },
    // @ts-ignore
    isInputRules: !0
  });
  return r;
}
var Rl = class {
  constructor(n = {}) {
    this.type = "extendable", this.parent = null, this.child = null, this.name = "", this.config = {
      name: this.name
    }, this.config = {
      ...this.config,
      ...n
    }, this.name = this.config.name;
  }
  get options() {
    return {
      ...R(
        E(this, "addOptions", {
          name: this.name
        })
      )
    };
  }
  get storage() {
    return {
      ...R(
        E(this, "addStorage", {
          name: this.name,
          options: this.options
        })
      )
    };
  }
  configure(n = {}) {
    const e = this.extend({
      ...this.config,
      addOptions: () => Cf(this.options, n)
    });
    return e.name = this.name, e.parent = this.parent, this.child = null, e;
  }
  extend(n = {}) {
    const e = new this.constructor({ ...this.config, ...n });
    return e.parent = this, this.child = e, e.name = "name" in n ? n.name : e.parent.name, e;
  }
}, Zt = class Mf extends Rl {
  constructor() {
    super(...arguments), this.type = "mark";
  }
  /**
   * Create a new Mark instance
   * @param config - Mark configuration object or a function that returns a configuration object
   */
  static create(e = {}) {
    const t = typeof e == "function" ? e() : e;
    return new Mf(t);
  }
  static handleExit({ editor: e, mark: t }) {
    const { tr: r } = e.state, s = e.state.selection.$from;
    if (s.pos === s.end()) {
      const o = s.marks();
      if (!!!o.find((c) => (c == null ? void 0 : c.type.name) === t.name))
        return !1;
      const l = o.find((c) => (c == null ? void 0 : c.type.name) === t.name);
      return l && r.removeStoredMark(l), r.insertText(" ", s.pos), e.view.dispatch(r), !0;
    }
    return !1;
  }
  configure(e) {
    return super.configure(e);
  }
  extend(e) {
    const t = typeof e == "function" ? e() : e;
    return super.extend(t);
  }
}, Ef = class {
  constructor(n) {
    this.find = n.find, this.handler = n.handler;
  }
}, F0 = (n, e, t) => {
  if (Tl(e))
    return [...n.matchAll(e)];
  const r = e(n, t);
  return r ? r.map((s) => {
    const i = [s.text];
    return i.index = s.index, i.input = n, i.data = s.data, s.replaceWith && (s.text.includes(s.replaceWith) || console.warn(
      '[tiptap warn]: "pasteRuleMatch.replaceWith" must be part of "pasteRuleMatch.text".'
    ), i.push(s.replaceWith)), i;
  }) : [];
};
function H0(n) {
  const { editor: e, state: t, from: r, to: s, rule: i, pasteEvent: o, dropEvent: a } = n, { commands: l, chain: c, can: d } = new Eo({
    editor: e,
    state: t
  }), u = [];
  return t.doc.nodesBetween(r, s, (f, p) => {
    var m, g, y, k, C;
    if ((g = (m = f.type) == null ? void 0 : m.spec) != null && g.code || !(f.isText || f.isTextblock || f.isInline))
      return;
    const S = (C = (k = (y = f.content) == null ? void 0 : y.size) != null ? k : f.nodeSize) != null ? C : 0, A = Math.max(r, p), N = Math.min(s, p + S);
    if (A >= N)
      return;
    const T = f.isText ? f.text || "" : f.textBetween(A - p, N - p, void 0, "￼");
    F0(T, i.find, o).forEach((P) => {
      if (P.index === void 0)
        return;
      const Q = A + P.index + 1, He = Q + P[0].length, Pe = {
        from: t.tr.mapping.map(Q),
        to: t.tr.mapping.map(He)
      }, oe = i.handler({
        state: t,
        range: Pe,
        match: P,
        commands: l,
        chain: c,
        can: d,
        pasteEvent: o,
        dropEvent: a
      });
      u.push(oe);
    });
  }), u.every((f) => f !== null);
}
var is = null, V0 = (n) => {
  var e;
  const t = new ClipboardEvent("paste", {
    clipboardData: new DataTransfer()
  });
  return (e = t.clipboardData) == null || e.setData("text/html", n), t;
};
function W0(n) {
  const { editor: e, rules: t } = n;
  let r = null, s = !1, i = !1, o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, a;
  try {
    a = typeof DragEvent < "u" ? new DragEvent("drop") : null;
  } catch {
    a = null;
  }
  const l = ({
    state: d,
    from: u,
    to: h,
    rule: f,
    pasteEvt: p
  }) => {
    const m = d.tr, g = Mo({
      state: d,
      transaction: m
    });
    if (!(!H0({
      editor: e,
      state: g,
      from: Math.max(u - 1, 0),
      to: h.b - 1,
      rule: f,
      pasteEvent: p,
      dropEvent: a
    }) || !m.steps.length)) {
      try {
        a = typeof DragEvent < "u" ? new DragEvent("drop") : null;
      } catch {
        a = null;
      }
      return o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, m;
    }
  };
  return t.map((d) => new F({
    // we register a global drag handler to track the current drag source element
    view(u) {
      const h = (p) => {
        var m;
        r = (m = u.dom.parentElement) != null && m.contains(p.target) ? u.dom.parentElement : null, r && (is = e);
      }, f = () => {
        is && (is = null);
      };
      return window.addEventListener("dragstart", h), window.addEventListener("dragend", f), {
        destroy() {
          window.removeEventListener("dragstart", h), window.removeEventListener("dragend", f);
        }
      };
    },
    props: {
      handleDOMEvents: {
        drop: (u, h) => {
          if (i = r === u.dom.parentElement, a = h, !i) {
            const f = is;
            f != null && f.isEditable && setTimeout(() => {
              const p = f.state.selection;
              p && f.commands.deleteRange({
                from: p.from,
                to: p.to
              });
            }, 10);
          }
          return !1;
        },
        paste: (u, h) => {
          var f;
          const p = (f = h.clipboardData) == null ? void 0 : f.getData("text/html");
          return o = h, s = !!(p != null && p.includes("data-pm-slice")), !1;
        }
      }
    },
    appendTransaction: (u, h, f) => {
      const p = u[0], m = p.getMeta("uiEvent") === "paste" && !s, g = p.getMeta("uiEvent") === "drop" && !i, y = p.getMeta("applyPasteRules"), k = !!y;
      if (!m && !g && !k)
        return;
      if (k) {
        let { text: A } = y;
        typeof A == "string" ? A = A : A = Ol(b.from(A), f.schema);
        const { from: N } = y, T = N + A.length, D = V0(A);
        return l({
          rule: d,
          state: f,
          from: N,
          to: { b: T },
          pasteEvt: D
        });
      }
      const C = h.doc.content.findDiffStart(f.doc.content), S = h.doc.content.findDiffEnd(f.doc.content);
      if (!(!_0(C) || !S || C === S.b))
        return l({
          rule: d,
          state: f,
          from: C,
          to: S,
          pasteEvt: o
        });
    }
  }));
}
var _o = class {
  constructor(n, e) {
    this.splittableMarks = [], this.nonClearableMarks = [], this.editor = e, this.baseExtensions = n, this.extensions = gf(n), this.schema = qv(this.extensions, e), this.setupExtensions();
  }
  /**
   * Get all commands from the extensions.
   * @returns An object with all commands where the key is the command name and the value is the command function
   */
  get commands() {
    return this.extensions.reduce((n, e) => {
      const t = {
        name: e.name,
        options: e.options,
        storage: this.editor.extensionStorage[e.name],
        editor: this.editor,
        type: $n(e.name, this.schema)
      }, r = E(
        e,
        "addCommands",
        t
      );
      return r ? {
        ...n,
        ...r()
      } : n;
    }, {});
  }
  /**
   * Get all registered Prosemirror plugins from the extensions.
   * @returns An array of Prosemirror plugins
   */
  get plugins() {
    const { editor: n } = this;
    return Yn([...this.extensions].reverse()).flatMap((r) => {
      const s = {
        name: r.name,
        options: r.options,
        storage: this.editor.extensionStorage[r.name],
        editor: n,
        type: $n(r.name, this.schema)
      }, i = [], o = E(
        r,
        "addKeyboardShortcuts",
        s
      );
      let a = {};
      if (r.type === "mark" && E(r, "exitable", s) && (a.ArrowRight = () => Zt.handleExit({ editor: n, mark: r })), o) {
        const h = Object.fromEntries(
          Object.entries(o()).map(([f, p]) => [f, () => p({ editor: n })])
        );
        a = { ...a, ...h };
      }
      const l = Ub(a);
      i.push(l);
      const c = E(
        r,
        "addInputRules",
        s
      );
      if (Id(r, n.options.enableInputRules) && c) {
        const h = c();
        if (h && h.length) {
          const f = B0({
            editor: n,
            rules: h
          }), p = Array.isArray(f) ? f : [f];
          i.push(...p);
        }
      }
      const d = E(
        r,
        "addPasteRules",
        s
      );
      if (Id(r, n.options.enablePasteRules) && d) {
        const h = d();
        if (h && h.length) {
          const f = W0({ editor: n, rules: h });
          i.push(...f);
        }
      }
      const u = E(
        r,
        "addProseMirrorPlugins",
        s
      );
      if (u) {
        const h = u();
        i.push(...h);
      }
      return i;
    });
  }
  /**
   * Get all attributes from the extensions.
   * @returns An array of attributes
   */
  get attributes() {
    return mf(this.extensions);
  }
  /**
   * Get all node views from the extensions.
   * @returns An object with all node views where the key is the node name and the value is the node view function
   */
  get nodeViews() {
    const { editor: n } = this, { nodeExtensions: e } = bn(this.extensions);
    return Object.fromEntries(
      e.filter((t) => !!E(t, "addNodeView")).map((t) => {
        const r = this.attributes.filter(
          (l) => l.type === t.name
        ), s = {
          name: t.name,
          options: t.options,
          storage: this.editor.extensionStorage[t.name],
          editor: n,
          type: G(t.name, this.schema)
        }, i = E(
          t,
          "addNodeView",
          s
        );
        if (!i)
          return [];
        const o = i();
        if (!o)
          return [];
        const a = (l, c, d, u, h) => {
          const f = yr(l, r);
          return o({
            // pass-through
            node: l,
            view: c,
            getPos: d,
            decorations: u,
            innerDecorations: h,
            // tiptap-specific
            editor: n,
            extension: t,
            HTMLAttributes: f
          });
        };
        return [t.name, a];
      })
    );
  }
  /**
   * Get the composed dispatchTransaction function from all extensions.
   * @param baseDispatch The base dispatch function (e.g. from the editor or user props)
   * @returns A composed dispatch function
   */
  dispatchTransaction(n) {
    const { editor: e } = this;
    return Yn([...this.extensions].reverse()).reduceRight((r, s) => {
      const i = {
        name: s.name,
        options: s.options,
        storage: this.editor.extensionStorage[s.name],
        editor: e,
        type: $n(s.name, this.schema)
      }, o = E(
        s,
        "dispatchTransaction",
        i
      );
      return o ? (a) => {
        o.call(i, { transaction: a, next: r });
      } : r;
    }, n);
  }
  /**
   * Get the composed transformPastedHTML function from all extensions.
   * @param baseTransform The base transform function (e.g. from the editor props)
   * @returns A composed transform function that chains all extension transforms
   */
  transformPastedHTML(n) {
    const { editor: e } = this;
    return Yn([...this.extensions]).reduce(
      (r, s) => {
        const i = {
          name: s.name,
          options: s.options,
          storage: this.editor.extensionStorage[s.name],
          editor: e,
          type: $n(s.name, this.schema)
        }, o = E(
          s,
          "transformPastedHTML",
          i
        );
        return o ? (a, l) => {
          const c = r(a, l);
          return o.call(i, c);
        } : r;
      },
      n || ((r) => r)
    );
  }
  get markViews() {
    const { editor: n } = this, { markExtensions: e } = bn(this.extensions);
    return Object.fromEntries(
      e.filter((t) => !!E(t, "addMarkView")).map((t) => {
        const r = this.attributes.filter(
          (a) => a.type === t.name
        ), s = {
          name: t.name,
          options: t.options,
          storage: this.editor.extensionStorage[t.name],
          editor: n,
          type: rt(t.name, this.schema)
        }, i = E(
          t,
          "addMarkView",
          s
        );
        if (!i)
          return [];
        const o = (a, l, c) => {
          const d = yr(a, r);
          return i()({
            // pass-through
            mark: a,
            view: l,
            inline: c,
            // tiptap-specific
            editor: n,
            extension: t,
            HTMLAttributes: d,
            updateAttributes: (u) => {
              L0(a, n, u);
            }
          });
        };
        return [t.name, o];
      })
    );
  }
  /**
   * Destroy the extension manager and clean up all extension references
   * to prevent memory leaks through parent/child extension chains.
   *
   * Walks each extension's full parent chain and nulls every forward
   * `parent.child → current` link where the parent still points to the
   * current node. This breaks the retention path from module-scope
   * singleton roots through deep extend() chains.
   *
   * Only ancestor `.child` links matching the current chain are cleared.
   * The `.parent` pointer on ancestors is never touched — extensions
   * may be shared across live editors, so their own backward references
   * and non-matching forward links must remain intact.
   */
  destroy() {
    this.extensions.forEach((n) => {
      let e = n;
      for (; e.parent; ) {
        const t = e.parent;
        t.child === e && (t.child = null), e = t;
      }
    }), this.extensions = [], this.baseExtensions = [], this.schema = null, this.editor = null;
  }
  /**
   * Go through all extensions, create extension storages & setup marks
   * & bind editor event listener.
   */
  setupExtensions() {
    const n = this.extensions;
    this.editor.extensionStorage = Object.fromEntries(
      n.map((e) => [e.name, e.storage])
    ), n.forEach((e) => {
      var t, r;
      const s = {
        name: e.name,
        options: e.options,
        storage: this.editor.extensionStorage[e.name],
        editor: this.editor,
        type: $n(e.name, this.schema)
      };
      e.type === "mark" && (((t = R(E(e, "keepOnSplit", s))) == null || t) && this.splittableMarks.push(e.name), (r = R(
        E(e, "clearable", s)
      )) == null || r || this.nonClearableMarks.push(e.name));
      const i = E(
        e,
        "onBeforeCreate",
        s
      ), o = E(e, "onCreate", s), a = E(e, "onUpdate", s), l = E(
        e,
        "onSelectionUpdate",
        s
      ), c = E(
        e,
        "onTransaction",
        s
      ), d = E(e, "onFocus", s), u = E(e, "onBlur", s), h = E(e, "onDestroy", s);
      i && this.editor.on("beforeCreate", i), o && this.editor.on("create", o), a && this.editor.on("update", a), l && this.editor.on("selectionUpdate", l), c && this.editor.on("transaction", c), d && this.editor.on("focus", d), u && this.editor.on("blur", u), h && this.editor.on("destroy", h);
    });
  }
};
_o.resolve = gf;
_o.sort = Yn;
_o.flatten = _l;
var j0 = {};
El(j0, {
  ClipboardTextSerializer: () => Af,
  Commands: () => _f,
  Delete: () => Of,
  Drop: () => Nf,
  Editable: () => $f,
  FocusEvents: () => Df,
  Keymap: () => Pf,
  Paste: () => Rf,
  Tabindex: () => Lf,
  TextDirection: () => zf,
  focusEventsPluginKey: () => If
});
var W = class Tf extends Rl {
  constructor() {
    super(...arguments), this.type = "extension";
  }
  /**
   * Create a new Extension instance
   * @param config - Extension configuration object or a function that returns a configuration object
   */
  static create(e = {}) {
    const t = typeof e == "function" ? e() : e;
    return new Tf(t);
  }
  configure(e) {
    return super.configure(e);
  }
  extend(e) {
    const t = typeof e == "function" ? e() : e;
    return super.extend(t);
  }
}, Af = W.create({
  name: "clipboardTextSerializer",
  addOptions() {
    return {
      blockSeparator: void 0
    };
  },
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: () => {
            const { editor: n } = this, { state: e, schema: t } = n, { doc: r, selection: s } = e, i = bf(t), { blockSeparator: o } = this.options, a = {
              ...o !== void 0 ? { blockSeparator: o } : {},
              textSerializers: i
            };
            return [...s.ranges].sort((c, d) => c.$from.pos - d.$from.pos).map(
              ({ $from: c, $to: d }) => yf(r, { from: c.pos, to: d.pos }, a)
            ).join(o ?? `

`);
          }
        }
      })
    ];
  }
}), _f = W.create({
  name: "commands",
  addCommands() {
    return {
      ...sf
    };
  }
}), Of = W.create({
  name: "delete",
  onUpdate({ transaction: n, appendedTransactions: e }) {
    var t, r, s;
    const i = () => {
      var o, a, l, c;
      if ((c = (l = (a = (o = this.editor.options.coreExtensionOptions) == null ? void 0 : o.delete) == null ? void 0 : a.filterTransaction) == null ? void 0 : l.call(a, n)) != null ? c : n.getMeta("y-sync$"))
        return;
      const d = ff(n.before, [
        n,
        ...e
      ]);
      Nl(d).forEach((f) => {
        d.mapping.mapResult(f.oldRange.from).deletedAfter && d.mapping.mapResult(f.oldRange.to).deletedBefore && d.before.nodesBetween(
          f.oldRange.from,
          f.oldRange.to,
          (p, m) => {
            const g = m + p.nodeSize - 2, y = f.oldRange.from <= m && g <= f.oldRange.to;
            this.editor.emit("delete", {
              type: "node",
              node: p,
              from: m,
              to: g,
              newFrom: d.mapping.map(m),
              newTo: d.mapping.map(g),
              deletedRange: f.oldRange,
              newRange: f.newRange,
              partial: !y,
              editor: this.editor,
              transaction: n,
              combinedTransform: d
            });
          }
        );
      });
      const h = d.mapping;
      d.steps.forEach((f, p) => {
        var m, g;
        if (f instanceof $e) {
          const y = h.slice(p).map(f.from, -1), k = h.slice(p).map(f.to), C = h.invert().map(y, -1), S = h.invert().map(k), A = y > 0 ? (m = d.doc.nodeAt(y - 1)) == null ? void 0 : m.marks.some((T) => T.eq(f.mark)) : !1, N = (g = d.doc.nodeAt(k)) == null ? void 0 : g.marks.some((T) => T.eq(f.mark));
          this.editor.emit("delete", {
            type: "mark",
            mark: f.mark,
            from: f.from,
            to: f.to,
            deletedRange: {
              from: C,
              to: S
            },
            newRange: {
              from: y,
              to: k
            },
            partial: !!(N || A),
            editor: this.editor,
            transaction: n,
            combinedTransform: d
          });
        }
      });
    };
    (s = (r = (t = this.editor.options.coreExtensionOptions) == null ? void 0 : t.delete) == null ? void 0 : r.async) == null || s ? setTimeout(i, 0) : i();
  }
}), Nf = W.create({
  name: "drop",
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("tiptapDrop"),
        props: {
          handleDrop: (n, e, t, r) => {
            this.editor.emit("drop", {
              editor: this.editor,
              event: e,
              slice: t,
              moved: r
            });
          }
        }
      })
    ];
  }
}), $f = W.create({
  name: "editable",
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("editable"),
        props: {
          editable: () => this.editor.options.editable
        }
      })
    ];
  }
}), If = new X("focusEvents"), Df = W.create({
  name: "focusEvents",
  addProseMirrorPlugins() {
    const { editor: n } = this;
    return [
      new F({
        key: If,
        props: {
          handleDOMEvents: {
            focus: (e, t) => {
              n.isFocused = !0;
              const r = n.state.tr.setMeta("focus", { event: t }).setMeta("addToHistory", !1);
              return e.dispatch(r), !1;
            },
            blur: (e, t) => {
              n.isFocused = !1;
              const r = n.state.tr.setMeta("blur", { event: t }).setMeta("addToHistory", !1);
              return e.dispatch(r), !1;
            }
          }
        }
      })
    ];
  }
}), Pf = W.create({
  name: "keymap",
  addKeyboardShortcuts() {
    const n = () => this.editor.commands.first(({ commands: o }) => [
      () => o.undoInputRule(),
      // maybe convert first text block node to default node
      () => o.command(({ tr: a }) => {
        const { selection: l, doc: c } = a, { empty: d, $anchor: u } = l, { pos: h, parent: f } = u, p = u.parent.isTextblock && h > 0 ? a.doc.resolve(h - 1) : u, m = p.parent.type.spec.isolating, g = u.pos - u.parentOffset, y = m && p.parent.childCount === 1 ? g === u.pos : $.atStart(c).from === h;
        return !d || !f.type.isTextblock || f.textContent.length || !y || y && u.parent.type.name === "paragraph" ? !1 : o.clearNodes();
      }),
      () => o.deleteSelection(),
      () => o.joinBackward(),
      () => o.selectNodeBackward()
    ]), e = () => this.editor.commands.first(({ commands: o }) => [
      () => o.deleteSelection(),
      () => o.deleteCurrentNode(),
      () => o.joinForward(),
      () => o.selectNodeForward()
    ]), r = {
      Enter: () => this.editor.commands.first(({ commands: o }) => [
        () => o.newlineInCode(),
        () => o.createParagraphNear(),
        () => o.liftEmptyBlock(),
        () => o.splitBlock()
      ]),
      "Mod-Enter": () => this.editor.commands.exitCode(),
      Backspace: n,
      "Mod-Backspace": n,
      "Shift-Backspace": n,
      Delete: e,
      "Mod-Delete": e,
      "Mod-a": () => this.editor.commands.selectAll()
    }, s = {
      ...r
    }, i = {
      ...r,
      "Ctrl-h": n,
      "Alt-Backspace": n,
      "Ctrl-d": e,
      "Ctrl-Alt-Backspace": e,
      "Alt-Delete": e,
      "Alt-d": e,
      "Ctrl-a": () => this.editor.commands.selectTextblockStart(),
      "Ctrl-e": () => this.editor.commands.selectTextblockEnd()
    };
    return Ni() || uf() ? i : s;
  },
  addProseMirrorPlugins() {
    return [
      // With this plugin we check if the whole document was selected and deleted.
      // In this case we will additionally call `clearNodes()` to convert e.g. a heading
      // to a paragraph if necessary.
      // This is an alternative to ProseMirror's `AllSelection`, which doesn’t work well
      // with many other commands.
      new F({
        key: new X("clearDocument"),
        appendTransaction: (n, e, t) => {
          if (n.some((m) => m.getMeta("composition")))
            return;
          const r = n.some((m) => m.docChanged) && !e.doc.eq(t.doc), s = n.some(
            (m) => m.getMeta("preventClearDocument")
          );
          if (!r || s)
            return;
          const { empty: i, from: o, to: a } = e.selection, l = $.atStart(e.doc).from, c = $.atEnd(e.doc).to;
          if (i || !(o === l && a === c) || !Wr(t.doc))
            return;
          const h = t.tr, f = Mo({
            state: t,
            transaction: h
          }), { commands: p } = new Eo({
            editor: this.editor,
            state: f
          });
          if (p.clearNodes(), !!h.steps.length)
            return h;
        }
      })
    ];
  }
}), Rf = W.create({
  name: "paste",
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("tiptapPaste"),
        props: {
          handlePaste: (n, e, t) => {
            this.editor.emit("paste", {
              editor: this.editor,
              event: e,
              slice: t
            });
          }
        }
      })
    ];
  }
}), Lf = W.create({
  name: "tabindex",
  addOptions() {
    return {
      value: void 0
    };
  },
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("tabindex"),
        props: {
          attributes: () => {
            var n;
            return !this.editor.isEditable && this.options.value === void 0 ? {} : { tabindex: (n = this.options.value) != null ? n : "0" };
          }
        }
      })
    ];
  }
}), zf = W.create({
  name: "textDirection",
  addOptions() {
    return {
      direction: void 0
    };
  },
  addGlobalAttributes() {
    if (!this.options.direction)
      return [];
    const { nodeExtensions: n } = bn(this.extensions);
    return [
      {
        types: n.filter((e) => e.name !== "text").map((e) => e.name),
        attributes: {
          dir: {
            default: this.options.direction,
            parseHTML: (e) => {
              const t = e.getAttribute("dir");
              return t && (t === "ltr" || t === "rtl" || t === "auto") ? t : this.options.direction;
            },
            renderHTML: (e) => e.dir ? {
              dir: e.dir
            } : {}
          }
        }
      }
    ];
  },
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("textDirection"),
        props: {
          attributes: () => {
            const n = this.options.direction;
            return n ? {
              dir: n
            } : {};
          }
        }
      })
    ];
  }
}), q0 = class Hn {
  constructor(e, t, r = !1, s = null) {
    this.currentNode = null, this.actualDepth = null, this.isBlock = r, this.resolvedPos = e, this.editor = t, this.currentNode = s;
  }
  get name() {
    return this.node.type.name;
  }
  get node() {
    return this.currentNode || this.resolvedPos.node();
  }
  get element() {
    return this.editor.view.domAtPos(this.pos).node;
  }
  get depth() {
    var e;
    return (e = this.actualDepth) != null ? e : this.resolvedPos.depth;
  }
  get pos() {
    return this.resolvedPos.pos;
  }
  get content() {
    return this.node.content;
  }
  set content(e) {
    let t = this.from, r = this.to;
    if (this.isBlock) {
      if (this.content.size === 0) {
        console.error(
          `You can’t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`
        );
        return;
      }
      t = this.from + 1, r = this.to - 1;
    }
    this.editor.commands.insertContentAt({ from: t, to: r }, e);
  }
  get attributes() {
    return this.node.attrs;
  }
  get textContent() {
    return this.node.textContent;
  }
  get size() {
    return this.node.nodeSize;
  }
  get from() {
    return this.isBlock ? this.pos : this.resolvedPos.start(this.resolvedPos.depth);
  }
  get range() {
    return {
      from: this.from,
      to: this.to
    };
  }
  get to() {
    return this.isBlock ? this.pos + this.size : this.resolvedPos.end(this.resolvedPos.depth) + (this.node.isText ? 0 : 1);
  }
  get parent() {
    if (this.depth === 0)
      return null;
    const e = this.resolvedPos.start(this.resolvedPos.depth - 1), t = this.resolvedPos.doc.resolve(e);
    return new Hn(t, this.editor);
  }
  get before() {
    let e = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
    return e.depth !== this.depth && (e = this.resolvedPos.doc.resolve(this.from - 3)), new Hn(e, this.editor);
  }
  get after() {
    let e = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
    return e.depth !== this.depth && (e = this.resolvedPos.doc.resolve(this.to + 3)), new Hn(e, this.editor);
  }
  get children() {
    const e = [];
    return this.node.content.forEach((t, r) => {
      const s = t.isBlock && !t.isTextblock, i = t.isAtom && !t.isText, o = t.isInline, a = this.pos + r + (i ? 0 : 1);
      if (a < 0 || a > this.resolvedPos.doc.nodeSize - 2)
        return;
      const l = this.resolvedPos.doc.resolve(a);
      if (!s && !o && l.depth <= this.depth)
        return;
      const c = new Hn(
        l,
        this.editor,
        s,
        s || o ? t : null
      );
      s && (c.actualDepth = this.depth + 1), e.push(c);
    }), e;
  }
  get firstChild() {
    return this.children[0] || null;
  }
  get lastChild() {
    const e = this.children;
    return e[e.length - 1] || null;
  }
  closest(e, t = {}) {
    let r = null, s = this.parent;
    for (; s && !r; ) {
      if (s.node.type.name === e)
        if (Object.keys(t).length > 0) {
          const i = s.node.attrs, o = Object.keys(t);
          for (let a = 0; a < o.length; a += 1) {
            const l = o[a];
            if (i[l] !== t[l])
              break;
          }
        } else
          r = s;
      s = s.parent;
    }
    return r;
  }
  querySelector(e, t = {}) {
    return this.querySelectorAll(e, t, !0)[0] || null;
  }
  querySelectorAll(e, t = {}, r = !1) {
    let s = [];
    if (!this.children || this.children.length === 0)
      return s;
    const i = Object.keys(t);
    return this.children.forEach((o) => {
      r && s.length > 0 || (o.node.type.name === e && i.every(
        (l) => t[l] === o.node.attrs[l]
      ) && s.push(o), !(r && s.length > 0) && (s = s.concat(o.querySelectorAll(e, t, r))));
    }), s;
  }
  setAttribute(e) {
    const { tr: t } = this.editor.state;
    t.setNodeMarkup(this.from, void 0, {
      ...this.node.attrs,
      ...e
    }), this.editor.view.dispatch(t);
  }
}, U0 = `.ProseMirror {
  position: relative;
}

.ProseMirror {
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
}

.ProseMirror [contenteditable="false"] {
  white-space: normal;
}

.ProseMirror [contenteditable="false"] [contenteditable="true"] {
  white-space: pre-wrap;
}

.ProseMirror pre {
  white-space: pre-wrap;
}

img.ProseMirror-separator {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
  margin: 0;
}

.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid black;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}

.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}

.ProseMirror-hideselection * {
  caret-color: transparent;
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}`, K0 = class extends E0 {
  constructor(n = {}) {
    super(), this.css = null, this.className = "tiptap", this.editorView = null, this.isFocused = !1, this.destroyed = !1, this.isInitialized = !1, this.extensionStorage = {}, this.instanceId = Math.random().toString(36).slice(2, 9), this.options = {
      element: typeof document < "u" ? document.createElement("div") : null,
      content: "",
      injectCSS: !0,
      injectNonce: void 0,
      extensions: [],
      autofocus: !1,
      editable: !0,
      textDirection: void 0,
      editorProps: {},
      parseOptions: {},
      coreExtensionOptions: {},
      enableInputRules: !0,
      enablePasteRules: !0,
      enableCoreExtensions: !0,
      enableContentCheck: !1,
      emitContentError: !1,
      onBeforeCreate: () => null,
      onCreate: () => null,
      onMount: () => null,
      onUnmount: () => null,
      onUpdate: () => null,
      onSelectionUpdate: () => null,
      onTransaction: () => null,
      onFocus: () => null,
      onBlur: () => null,
      onDestroy: () => null,
      onContentError: ({ error: t }) => {
        throw t;
      },
      onPaste: () => null,
      onDrop: () => null,
      onDelete: () => null,
      enableExtensionDispatchTransaction: !0
    }, this.isCapturingTransaction = !1, this.capturedTransaction = null, this.utils = {
      getUpdatedPosition: n0,
      createMappablePosition: r0
    }, this.setOptions(n), this.createExtensionManager(), this.createCommandManager(), this.createSchema(), this.on("beforeCreate", this.options.onBeforeCreate), this.emit("beforeCreate", { editor: this }), this.on("mount", this.options.onMount), this.on("unmount", this.options.onUnmount), this.on("contentError", this.options.onContentError), this.on("create", this.options.onCreate), this.on("update", this.options.onUpdate), this.on("selectionUpdate", this.options.onSelectionUpdate), this.on("transaction", this.options.onTransaction), this.on("focus", this.options.onFocus), this.on("blur", this.options.onBlur), this.on("destroy", this.options.onDestroy), this.on("drop", ({ event: t, slice: r, moved: s }) => this.options.onDrop(t, r, s)), this.on("paste", ({ event: t, slice: r }) => this.options.onPaste(t, r)), this.on("delete", this.options.onDelete);
    const e = this.createDoc();
    if (!this.editorState) {
      const t = Ha(e, this.options.autofocus);
      this.editorState = $t.create({
        doc: e,
        schema: this.schema,
        selection: t || void 0
      });
    }
    this.options.element && this.mount(this.options.element);
  }
  /**
   * Attach the editor to the DOM, creating a new editor view.
   */
  mount(n) {
    if (typeof document > "u")
      throw new Error(
        "[tiptap error]: The editor cannot be mounted because there is no 'document' defined in this environment."
      );
    this.createView(n), this.emit("mount", { editor: this }), this.css && !document.head.contains(this.css) && document.head.appendChild(this.css), window.setTimeout(() => {
      this.isDestroyed || (this.options.autofocus !== !1 && this.options.autofocus !== null && this.commands.focus(this.options.autofocus), this.emit("create", { editor: this }), this.isInitialized = !0);
    }, 0);
  }
  /**
   * Remove the editor from the DOM, but still allow remounting at a different point in time
   */
  unmount() {
    if (this.editorView) {
      const n = this.editorView.dom;
      n != null && n.editor && delete n.editor, this.editorView.destroy();
    }
    if (this.editorView = null, this.isInitialized = !1, this.css && !document.querySelectorAll(`.${this.className}`).length)
      try {
        typeof this.css.remove == "function" ? this.css.remove() : this.css.parentNode && this.css.parentNode.removeChild(this.css);
      } catch (n) {
        console.warn("Failed to remove CSS element:", n);
      }
    this.css = null, this.emit("unmount", { editor: this });
  }
  /**
   * Returns the editor storage.
   */
  get storage() {
    return this.extensionStorage;
  }
  /**
   * An object of all registered commands.
   */
  get commands() {
    return this.commandManager.commands;
  }
  /**
   * Create a command chain to call multiple commands at once.
   */
  chain() {
    return this.commandManager.chain();
  }
  /**
   * Check if a command or a command chain can be executed. Without executing it.
   */
  can() {
    return this.commandManager.can();
  }
  /**
   * Inject CSS styles.
   */
  injectCSS() {
    this.options.injectCSS && typeof document < "u" && (this.css = A0(U0, this.options.injectNonce));
  }
  /**
   * Update editor options.
   *
   * @param options A list of options
   */
  setOptions(n = {}) {
    this.options = {
      ...this.options,
      ...n
    }, !(!this.editorView || !this.state || this.isDestroyed) && (this.options.editorProps && this.view.setProps(this.options.editorProps), this.view.updateState(this.state));
  }
  /**
   * Update editable state of the editor.
   */
  setEditable(n, e = !0) {
    this.setOptions({ editable: n }), e && this.emit("update", { editor: this, transaction: this.state.tr, appendedTransactions: [] });
  }
  /**
   * Returns whether the editor is editable.
   */
  get isEditable() {
    return this.options.editable && this.view && this.view.editable;
  }
  /**
   * Returns the editor view.
   */
  get view() {
    return this.editorView ? this.editorView : new Proxy(
      {
        state: this.editorState,
        updateState: (n) => {
          this.editorState = n;
        },
        dispatch: (n) => {
          this.dispatchTransaction(n);
        },
        // Stub some commonly accessed properties to prevent errors
        composing: !1,
        dragging: null,
        editable: !0,
        isDestroyed: !1
      },
      {
        get: (n, e) => {
          if (this.editorView)
            return this.editorView[e];
          if (e === "state")
            return this.editorState;
          if (e in n)
            return Reflect.get(n, e);
          throw new Error(
            `[tiptap error]: The editor view is not available. Cannot access view['${e}']. The editor may not be mounted yet.`
          );
        }
      }
    );
  }
  /**
   * Returns the editor state.
   */
  get state() {
    return this.editorView && (this.editorState = this.view.state), this.editorState;
  }
  /**
   * Register a ProseMirror plugin.
   *
   * @param plugin A ProseMirror plugin
   * @param handlePlugins Control how to merge the plugin into the existing plugins.
   * @returns The new editor state
   */
  registerPlugin(n, e) {
    const t = pf(e) ? e(n, [...this.state.plugins]) : [...this.state.plugins, n], r = this.state.reconfigure({ plugins: t });
    return this.view.updateState(r), r;
  }
  /**
   * Unregister a ProseMirror plugin.
   *
   * @param nameOrPluginKeyToRemove The plugins name
   * @returns The new editor state or undefined if the editor is destroyed
   */
  unregisterPlugin(n) {
    if (this.isDestroyed)
      return;
    const e = this.state.plugins;
    let t = e;
    if ([].concat(n).forEach((s) => {
      const i = typeof s == "string" ? `${s}$` : s.key;
      t = t.filter((o) => !o.key.startsWith(i));
    }), e.length === t.length)
      return;
    const r = this.state.reconfigure({
      plugins: t
    });
    return this.view.updateState(r), r;
  }
  /**
   * Creates an extension manager.
   */
  createExtensionManager() {
    var n, e, t, r;
    const i = [...this.options.enableCoreExtensions ? [
      $f,
      Af.configure({
        blockSeparator: (e = (n = this.options.coreExtensionOptions) == null ? void 0 : n.clipboardTextSerializer) == null ? void 0 : e.blockSeparator
      }),
      _f,
      Df,
      Pf,
      Lf.configure({
        value: (r = (t = this.options.coreExtensionOptions) == null ? void 0 : t.tabindex) == null ? void 0 : r.value
      }),
      Nf,
      Rf,
      Of,
      zf.configure({
        direction: this.options.textDirection
      })
    ].filter((o) => typeof this.options.enableCoreExtensions == "object" ? this.options.enableCoreExtensions[o.name] !== !1 : !0) : [], ...this.options.extensions].filter((o) => ["extension", "node", "mark"].includes(o == null ? void 0 : o.type));
    this.extensionManager = new _o(i, this);
  }
  /**
   * Creates an command manager.
   */
  createCommandManager() {
    this.commandManager = new Eo({
      editor: this
    });
  }
  /**
   * Creates a ProseMirror schema.
   */
  createSchema() {
    this.schema = this.extensionManager.schema;
  }
  /**
   * Creates the initial document.
   */
  createDoc() {
    let n;
    try {
      n = Va(this.options.content, this.schema, this.options.parseOptions, {
        errorOnInvalidContent: this.options.enableContentCheck
      });
    } catch (e) {
      if (!(e instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(
        e.message
      ))
        throw e;
      const t = Va(
        this.options.content,
        this.schema,
        this.options.parseOptions,
        {
          errorOnInvalidContent: !1
        }
      );
      return this.editorState = $t.create({
        doc: t,
        schema: this.schema,
        selection: Ha(t, this.options.autofocus) || void 0
      }), this.emit("contentError", {
        editor: this,
        error: e,
        disableCollaboration: () => {
          "collaboration" in this.storage && typeof this.storage.collaboration == "object" && this.storage.collaboration && (this.storage.collaboration.isDisabled = !0), this.options.extensions = this.options.extensions.filter(
            (r) => r.name !== "collaboration"
          ), this.createExtensionManager();
        }
      }), this.editorState.doc;
    }
    return n;
  }
  /**
   * Creates a ProseMirror view.
   */
  createView(n) {
    const { editorProps: e, enableExtensionDispatchTransaction: t } = this.options, r = e.dispatchTransaction || this.dispatchTransaction.bind(this), s = t ? this.extensionManager.dispatchTransaction(r) : r, i = e.transformPastedHTML, o = this.extensionManager.transformPastedHTML(i);
    this.editorView = new nf(n, {
      ...e,
      attributes: {
        // add `role="textbox"` to the editor element
        role: "textbox",
        ...e == null ? void 0 : e.attributes
      },
      dispatchTransaction: s,
      transformPastedHTML: o,
      state: this.editorState,
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews
    });
    const a = this.state.reconfigure({
      plugins: this.extensionManager.plugins
    });
    this.view.updateState(a), this.prependClass(), this.injectCSS();
    const l = this.view.dom;
    l.editor = this;
  }
  /**
   * Creates all node and mark views.
   */
  createNodeViews() {
    this.view.isDestroyed || this.view.setProps({
      markViews: this.extensionManager.markViews,
      nodeViews: this.extensionManager.nodeViews
    });
  }
  /**
   * Prepend class name to element.
   */
  prependClass() {
    this.view.dom.className = `${this.className} ${this.view.dom.className}`;
  }
  captureTransaction(n) {
    this.isCapturingTransaction = !0, n(), this.isCapturingTransaction = !1;
    const e = this.capturedTransaction;
    return this.capturedTransaction = null, e;
  }
  /**
   * The callback over which to send transactions (state updates) produced by the view.
   *
   * @param transaction An editor state transaction
   */
  dispatchTransaction(n) {
    if (this.view.isDestroyed)
      return;
    if (this.isCapturingTransaction) {
      if (!this.capturedTransaction) {
        this.capturedTransaction = n;
        return;
      }
      n.steps.forEach((c) => {
        var d;
        return (d = this.capturedTransaction) == null ? void 0 : d.step(c);
      });
      return;
    }
    const { state: e, transactions: t } = this.state.applyTransaction(n), r = !this.state.selection.eq(e.selection), s = t.includes(n), i = this.state;
    if (this.emit("beforeTransaction", {
      editor: this,
      transaction: n,
      nextState: e
    }), !s)
      return;
    this.view.updateState(e), this.emit("transaction", {
      editor: this,
      transaction: n,
      appendedTransactions: t.slice(1)
    }), r && this.emit("selectionUpdate", {
      editor: this,
      transaction: n
    });
    const o = t.findLast((c) => c.getMeta("focus") || c.getMeta("blur")), a = o == null ? void 0 : o.getMeta("focus"), l = o == null ? void 0 : o.getMeta("blur");
    a && this.emit("focus", {
      editor: this,
      event: a.event,
      // oxlint-disable-next-lineno-non-null-assertion
      transaction: o
    }), l && this.emit("blur", {
      editor: this,
      event: l.event,
      // oxlint-disable-next-lineno-non-null-assertion
      transaction: o
    }), !(n.getMeta("preventUpdate") || !t.some((c) => c.docChanged) || i.doc.eq(e.doc)) && this.emit("update", {
      editor: this,
      transaction: n,
      appendedTransactions: t.slice(1)
    });
  }
  /**
   * Get attributes of the currently selected node or mark.
   */
  getAttributes(n) {
    return vf(this.state, n);
  }
  isActive(n, e) {
    const t = typeof n == "string" ? n : null, r = typeof n == "string" ? e : n;
    return Zv(this.state, t, r);
  }
  /**
   * Get the document as JSON.
   */
  getJSON() {
    return this.state.doc.toJSON();
  }
  /**
   * Get the document as HTML.
   */
  getHTML() {
    return Ol(this.state.doc.content, this.schema);
  }
  /**
   * Get the document as text.
   */
  getText(n) {
    const { blockSeparator: e = `

`, textSerializers: t = {} } = n || {};
    return Kv(this.state.doc, {
      blockSeparator: e,
      textSerializers: {
        ...bf(this.schema),
        ...t
      }
    });
  }
  /**
   * Check if there is no content.
   */
  get isEmpty() {
    return Wr(this.state.doc);
  }
  /**
   * Destroy the editor.
   */
  destroy() {
    this.destroyed || (this.destroyed = !0, this.emit("destroy"), this.unmount(), this.removeAllListeners(), this.extensionManager.destroy(), this.extensionManager = null, this.schema = null, this.commandManager = null, this.extensionStorage = {});
  }
  /**
   * Check if the editor is already destroyed.
   */
  get isDestroyed() {
    var n, e;
    return (e = (n = this.editorView) == null ? void 0 : n.isDestroyed) != null ? e : !0;
  }
  $node(n, e) {
    var t;
    return ((t = this.$doc) == null ? void 0 : t.querySelector(n, e)) || null;
  }
  $nodes(n, e) {
    var t;
    return ((t = this.$doc) == null ? void 0 : t.querySelectorAll(n, e)) || null;
  }
  $pos(n) {
    const e = this.state.doc.resolve(n), t = n > 0 && e.nodeAfter && !e.nodeAfter.isText && e.nodeAfter.isAtom ? e.nodeAfter : null;
    return new q0(e, this, !1, t);
  }
  get $doc() {
    return this.$pos(0);
  }
};
function Yt(n) {
  return new jr({
    find: n.find,
    handler: ({ state: e, range: t, match: r }) => {
      const s = R(n.getAttributes, void 0, r);
      if (s === !1 || s === null)
        return null;
      const { tr: i } = e, o = r[r.length - 1], a = r[0];
      if (o) {
        const l = a.search(/\S/), c = t.from + a.indexOf(o), d = c + o.length;
        if ($l(t.from, t.to, e.doc).filter((f) => f.mark.type.excluded.find((m) => m === n.type && m !== f.mark.type)).filter((f) => f.to > c).length)
          return null;
        d < t.to && i.delete(d, t.to), c > t.from && i.delete(t.from + l, c);
        const h = t.from + l + o.length;
        i.addMark(t.from + l, h, n.type.create(s || {})), i.removeStoredMark(n.type);
      }
    },
    undoable: n.undoable
  });
}
function J0(n) {
  return new jr({
    find: n.find,
    handler: ({ state: e, range: t, match: r }) => {
      const s = R(n.getAttributes, void 0, r) || {}, { tr: i } = e, o = t.from;
      let a = t.to;
      const l = n.type.create(s);
      if (r[1]) {
        const c = r[0].lastIndexOf(r[1]);
        let d = o + c;
        d > a ? d = a : a = d + r[1].length;
        const u = r[0][r[0].length - 1];
        i.insertText(u, o + r[0].length - 1), i.replaceWith(d, a, l);
      } else if (r[0]) {
        const c = n.type.isInline ? o : o - 1;
        i.insert(c, n.type.create(s)).delete(
          i.mapping.map(o),
          i.mapping.map(a)
        );
      }
      i.scrollIntoView();
    },
    undoable: n.undoable
  });
}
function qa(n) {
  return new jr({
    find: n.find,
    handler: ({ state: e, range: t, match: r }) => {
      const s = e.doc.resolve(t.from), i = R(n.getAttributes, void 0, r) || {};
      if (!s.node(-1).canReplaceWith(s.index(-1), s.indexAfter(-1), n.type))
        return null;
      e.tr.delete(t.from, t.to).setBlockType(t.from, t.from, n.type, i);
    },
    undoable: n.undoable
  });
}
function vn(n) {
  return new jr({
    find: n.find,
    handler: ({ state: e, range: t, match: r, chain: s }) => {
      const i = R(n.getAttributes, void 0, r) || {}, o = e.tr.delete(t.from, t.to), l = o.doc.resolve(t.from).blockRange(), c = l && ul(l, n.type, i);
      if (!c)
        return null;
      if (o.wrap(l, c), n.keepMarks && n.editor) {
        const { selection: u, storedMarks: h } = e, { splittableMarks: f } = n.editor.extensionManager, p = h || u.$to.parentOffset && u.$from.marks();
        if (p) {
          const m = p.filter((g) => f.includes(g.type.name));
          o.ensureMarks(m);
        }
      }
      if (n.keepAttributes) {
        const u = n.type.name === "bulletList" || n.type.name === "orderedList" ? "listItem" : "taskList";
        s().updateAttributes(u, i).run();
      }
      const d = o.doc.resolve(t.from - 1).nodeBefore;
      d && d.type === n.type && Et(o.doc, t.from - 1) && (!n.joinPredicate || n.joinPredicate(r, d)) && o.join(t.from - 1);
    },
    undoable: n.undoable
  });
}
var we = class Bf extends Rl {
  constructor() {
    super(...arguments), this.type = "node";
  }
  /**
   * Create a new Node instance
   * @param config - Node configuration object or a function that returns a configuration object
   */
  static create(e = {}) {
    const t = typeof e == "function" ? e() : e;
    return new Bf(t);
  }
  configure(e) {
    return super.configure(e);
  }
  extend(e) {
    const t = typeof e == "function" ? e() : e;
    return super.extend(t);
  }
};
function Ct(n) {
  return new Ef({
    find: n.find,
    handler: ({ state: e, range: t, match: r, pasteEvent: s }) => {
      const i = R(n.getAttributes, void 0, r, s);
      if (i === !1 || i === null)
        return null;
      const { tr: o } = e, a = r[r.length - 1], l = r[0];
      let c = t.to;
      if (a) {
        const d = l.search(/\S/), u = t.from + l.indexOf(a), h = u + a.length;
        if ($l(t.from, t.to, e.doc).filter((m) => m.mark.type.excluded.find((y) => y === n.type && y !== m.mark.type)).filter((m) => m.to > u).length)
          return null;
        h < t.to && o.delete(h, t.to), u > t.from && o.delete(t.from + d, u), c = t.from + d + a.length, o.addMark(t.from + d, c, n.type.create(i || {})), r.index !== void 0 && r.input !== void 0 && r.index + r[0].length >= r.input.length || o.removeStoredMark(n.type);
      }
    }
  });
}
var $i = (n, e) => {
  if (n === "slot")
    return 0;
  if (n instanceof Function)
    return n(e);
  const { children: t, ...r } = e ?? {};
  if (n === "svg")
    throw new Error(
      "SVG elements are not supported in the JSX syntax, use the array syntax instead"
    );
  return [n, r, t];
}, G0 = (n, e) => {
  var t;
  const { state: r, view: s } = n, { selection: i } = r;
  if (!i.empty) return !1;
  const { $from: o } = i;
  if (o.parentOffset !== 0) return !1;
  const a = o.depth - 1;
  if (a < 0) return !1;
  const l = o.node(a), c = o.index(a);
  if (c === 0) return !1;
  if (l.type === e)
    return n.commands.lift(e.name);
  const d = l.child(c - 1);
  if (d.type !== e || !((t = d.lastChild) != null && t.isTextblock))
    return !1;
  const u = o.before(), f = u - 1 - 1, { tr: p } = r;
  return p.delete(u, o.after()).insert(f, o.parent.content), p.setSelection(O.create(p.doc, f)), s.dispatch(p.scrollIntoView()), !0;
}, Y0 = /^\s*>\s$/, X0 = we.create({
  name: "blockquote",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  content: "block+",
  group: "block",
  defining: !0,
  parseHTML() {
    return [{ tag: "blockquote" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return /* @__PURE__ */ $i("blockquote", { ...Y(this.options.HTMLAttributes, n), children: /* @__PURE__ */ $i("slot", {}) });
  },
  parseMarkdown: (n, e) => {
    var t;
    const r = (t = e.parseBlockChildren) != null ? t : e.parseChildren;
    return e.createNode("blockquote", void 0, r(n.tokens || []));
  },
  renderMarkdown: (n, e) => {
    if (!n.content)
      return "";
    const t = ">", r = [];
    return n.content.forEach((s, i) => {
      var o, a;
      const d = ((a = (o = e.renderChild) == null ? void 0 : o.call(e, s, i)) != null ? a : e.renderChildren([s])).split(`
`).map((u) => u.trim() === "" ? t : `${t} ${u}`);
      r.push(d.join(`
`));
    }), r.join(`
${t}
`);
  },
  addCommands() {
    return {
      setBlockquote: () => ({ commands: n }) => n.wrapIn(this.name),
      toggleBlockquote: () => ({ commands: n }) => n.toggleWrap(this.name),
      unsetBlockquote: () => ({ commands: n }) => n.lift(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
      Backspace: () => G0(this.editor, this.type)
    };
  },
  addInputRules() {
    return [
      vn({
        find: Y0,
        type: this.type
      })
    ];
  }
}), Q0 = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/, Z0 = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g, ek = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/, tk = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g, nk = Zt.create({
  name: "bold",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      {
        tag: "strong"
      },
      {
        tag: "b",
        getAttrs: (n) => n.style.fontWeight !== "normal" && null
      },
      {
        style: "font-weight=400",
        clearMark: (n) => n.type.name === this.name
      },
      {
        style: "font-weight",
        getAttrs: (n) => /^(bold(er)?|[5-9]\d{2,})$/.test(n) && null
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return /* @__PURE__ */ $i("strong", { ...Y(this.options.HTMLAttributes, n), children: /* @__PURE__ */ $i("slot", {}) });
  },
  markdownTokenName: "strong",
  parseMarkdown: (n, e) => e.applyMark("bold", e.parseInline(n.tokens || [])),
  markdownOptions: {
    htmlReopen: {
      open: "<strong>",
      close: "</strong>"
    }
  },
  renderMarkdown: (n, e) => `**${e.renderChildren(n)}**`,
  addCommands() {
    return {
      setBold: () => ({ commands: n }) => n.setMark(this.name),
      toggleBold: () => ({ commands: n }) => n.toggleMark(this.name),
      unsetBold: () => ({ commands: n }) => n.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-b": () => this.editor.commands.toggleBold(),
      "Mod-B": () => this.editor.commands.toggleBold()
    };
  },
  addInputRules() {
    return [
      Yt({
        find: Q0,
        type: this.type
      }),
      Yt({
        find: ek,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      Ct({
        find: Z0,
        type: this.type
      }),
      Ct({
        find: tk,
        type: this.type
      })
    ];
  }
}), rk = (n) => {
  const e = /`([^`]+)`(?!`)$/.exec(n);
  return !e || e.index > 0 && n[e.index - 1] === "`" ? null : {
    index: e.index,
    text: e[0],
    replaceWith: e[1]
  };
}, sk = (n) => {
  const e = /`([^`]+)`(?!`)/g, t = [];
  let r;
  for (; (r = e.exec(n)) !== null; )
    r.index > 0 && n[r.index - 1] === "`" || t.push({
      index: r.index,
      text: r[0],
      replaceWith: r[1]
    });
  return t;
}, ik = Zt.create({
  name: "code",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  excludes: "_",
  code: !0,
  exitable: !0,
  parseHTML() {
    return [{ tag: "code" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["code", Y(this.options.HTMLAttributes, n), 0];
  },
  markdownTokenName: "codespan",
  parseMarkdown: (n, e) => e.applyMark("code", [{ type: "text", text: n.text || "" }]),
  renderMarkdown: (n, e) => n.content ? `\`${e.renderChildren(n.content)}\`` : "",
  addCommands() {
    return {
      setCode: () => ({ commands: n }) => n.setMark(this.name),
      toggleCode: () => ({ commands: n }) => n.toggleMark(this.name),
      unsetCode: () => ({ commands: n }) => n.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-e": () => this.editor.commands.toggleCode()
    };
  },
  addInputRules() {
    return [
      Yt({
        find: rk,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      Ct({
        find: sk,
        type: this.type
      })
    ];
  }
}), da = 4, ok = /^```([a-z]+)?[\s\n]$/, ak = /^~~~([a-z]+)?[\s\n]$/, lk = we.create({
  name: "codeBlock",
  addOptions() {
    return {
      languageClassPrefix: "language-",
      exitOnTripleEnter: !0,
      exitOnArrowDown: !0,
      exitOnArrowUp: !0,
      defaultLanguage: null,
      enableTabIndentation: !1,
      tabSize: da,
      HTMLAttributes: {}
    };
  },
  content: "text*",
  marks: "",
  group: "block",
  code: !0,
  defining: !0,
  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (n) => {
          var e;
          const { languageClassPrefix: t } = this.options;
          if (!t)
            return null;
          const i = [...((e = n.firstElementChild) == null ? void 0 : e.classList) || []].filter((o) => o.startsWith(t)).map((o) => o.replace(t, ""))[0];
          return i || null;
        },
        rendered: !1
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full"
      }
    ];
  },
  renderHTML({ node: n, HTMLAttributes: e }) {
    return [
      "pre",
      Y(this.options.HTMLAttributes, e),
      [
        "code",
        {
          class: n.attrs.language ? this.options.languageClassPrefix + n.attrs.language : null
        },
        0
      ]
    ];
  },
  markdownTokenName: "code",
  parseMarkdown: (n, e) => {
    var t, r;
    return ((t = n.raw) == null ? void 0 : t.startsWith("```")) === !1 && ((r = n.raw) == null ? void 0 : r.startsWith("~~~")) === !1 && n.codeBlockStyle !== "indented" ? [] : e.createNode(
      "codeBlock",
      { language: n.lang || null },
      n.text ? [e.createTextNode(n.text)] : []
    );
  },
  renderMarkdown: (n, e) => {
    var t;
    let r = "";
    const s = ((t = n.attrs) == null ? void 0 : t.language) || "";
    return n.content ? r = [`\`\`\`${s}`, e.renderChildren(n.content), "```"].join(`
`) : r = `\`\`\`${s}

\`\`\``, r;
  },
  addCommands() {
    return {
      setCodeBlock: (n) => ({ commands: e }) => e.setNode(this.name, n),
      toggleCodeBlock: (n) => ({ commands: e }) => e.toggleNode(this.name, "paragraph", n)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
      // remove code block when at start of document or code block is empty
      Backspace: () => {
        const { empty: n, $anchor: e } = this.editor.state.selection, t = e.pos === 1;
        return !n || e.parent.type.name !== this.name ? !1 : t || !e.parent.textContent.length ? this.editor.commands.clearNodes() : !1;
      },
      // handle tab indentation
      Tab: ({ editor: n }) => {
        var e;
        if (!this.options.enableTabIndentation)
          return !1;
        const t = (e = this.options.tabSize) != null ? e : da, { state: r } = n, { selection: s } = r, { $from: i, empty: o } = s;
        if (i.parent.type !== this.type)
          return !1;
        const a = " ".repeat(t);
        return o ? n.commands.insertContent(a) : n.commands.command(({ tr: l }) => {
          const { from: c, to: d } = s, f = r.doc.textBetween(c, d, `
`, `
`).split(`
`).map((p) => a + p).join(`
`);
          return l.replaceWith(c, d, r.schema.text(f)), !0;
        });
      },
      // handle shift+tab reverse indentation
      "Shift-Tab": ({ editor: n }) => {
        var e;
        if (!this.options.enableTabIndentation)
          return !1;
        const t = (e = this.options.tabSize) != null ? e : da, { state: r } = n, { selection: s } = r, { $from: i, empty: o } = s;
        return i.parent.type !== this.type ? !1 : o ? n.commands.command(({ tr: a }) => {
          var l;
          const { pos: c } = i, d = i.start(), u = i.end(), f = r.doc.textBetween(d, u, `
`, `
`).split(`
`);
          let p = 0, m = 0;
          const g = c - d;
          for (let N = 0; N < f.length; N += 1) {
            if (m + f[N].length >= g) {
              p = N;
              break;
            }
            m += f[N].length + 1;
          }
          const k = ((l = f[p].match(/^ */)) == null ? void 0 : l[0]) || "", C = Math.min(k.length, t);
          if (C === 0)
            return !0;
          let S = d;
          for (let N = 0; N < p; N += 1)
            S += f[N].length + 1;
          return a.delete(S, S + C), c - S <= C && a.setSelection(O.create(a.doc, S)), !0;
        }) : n.commands.command(({ tr: a }) => {
          const { from: l, to: c } = s, h = r.doc.textBetween(l, c, `
`, `
`).split(`
`).map((f) => {
            var p;
            const m = ((p = f.match(/^ */)) == null ? void 0 : p[0]) || "", g = Math.min(m.length, t);
            return f.slice(g);
          }).join(`
`);
          return a.replaceWith(l, c, r.schema.text(h)), !0;
        });
      },
      // exit node on triple enter
      Enter: ({ editor: n }) => {
        if (!this.options.exitOnTripleEnter)
          return !1;
        const { state: e } = n, { selection: t } = e, { $from: r, empty: s } = t;
        if (!s || r.parent.type !== this.type)
          return !1;
        const i = r.parentOffset === r.parent.nodeSize - 2, o = r.parent.textContent.endsWith(`

`);
        return !i || !o ? !1 : n.chain().command(({ tr: a }) => (a.delete(r.pos - 2, r.pos), !0)).exitCode().run();
      },
      // exit node on arrow up if there is no node before it
      ArrowUp: ({ editor: n }) => {
        if (!this.options.exitOnArrowUp)
          return !1;
        const { state: e } = n, { selection: t } = e, { $from: r, empty: s } = t;
        if (!s || r.parent.type !== this.type || r.parentOffset !== 0)
          return !1;
        const i = r.before();
        return i > 0 ? !1 : n.commands.insertDefaultBlock({ pos: i });
      },
      // exit node on arrow down
      ArrowDown: ({ editor: n }) => {
        if (!this.options.exitOnArrowDown)
          return !1;
        const { state: e } = n, { selection: t, doc: r } = e, { $from: s, empty: i } = t;
        if (!i || s.parent.type !== this.type || !(s.parentOffset === s.parent.nodeSize - 2))
          return !1;
        const a = s.after();
        return a === void 0 ? !1 : r.nodeAt(a) ? n.commands.command(({ tr: c }) => (c.setSelection($.near(r.resolve(a))), !0)) : n.commands.exitCode();
      }
    };
  },
  addInputRules() {
    return [
      qa({
        find: ok,
        type: this.type,
        getAttributes: (n) => ({
          language: n[1]
        })
      }),
      qa({
        find: ak,
        type: this.type,
        getAttributes: (n) => ({
          language: n[1]
        })
      })
    ];
  },
  addProseMirrorPlugins() {
    return [
      // this plugin creates a code block for pasted content from VS Code
      // we can also detect the copied code language
      new F({
        key: new X("codeBlockVSCodeHandler"),
        props: {
          handlePaste: (n, e) => {
            if (!e.clipboardData || this.editor.isActive(this.type.name))
              return !1;
            const t = e.clipboardData.getData("text/plain"), r = e.clipboardData.getData("vscode-editor-data"), s = r ? JSON.parse(r) : void 0, i = s == null ? void 0 : s.mode;
            if (!t || !i)
              return !1;
            const { tr: o, schema: a } = n.state, l = a.text(t.replace(/\r\n?/g, `
`));
            return o.replaceSelectionWith(this.type.create({ language: i }, l)), o.selection.$from.parent.type !== this.type && o.setSelection(
              O.near(o.doc.resolve(Math.max(0, o.selection.from - 2)))
            ), o.setMeta("paste", !0), n.dispatch(o), !0;
          }
        }
      })
    ];
  }
}), ck = we.create({
  name: "doc",
  topNode: !0,
  content: "block+",
  renderMarkdown: (n, e) => n.content ? e.renderChildren(n.content, `

`) : ""
}), dk = we.create({
  name: "hardBreak",
  markdownTokenName: "br",
  addOptions() {
    return {
      keepMarks: !0,
      HTMLAttributes: {}
    };
  },
  inline: !0,
  group: "inline",
  selectable: !1,
  linebreakReplacement: !0,
  parseHTML() {
    return [{ tag: "br" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["br", Y(this.options.HTMLAttributes, n)];
  },
  renderText() {
    return `
`;
  },
  renderMarkdown: () => `  
`,
  parseMarkdown: () => ({
    type: "hardBreak"
  }),
  addCommands() {
    return {
      setHardBreak: () => ({ commands: n, chain: e, state: t, editor: r }) => n.first([
        () => n.exitCode(),
        () => n.command(() => {
          const { selection: s, storedMarks: i } = t;
          if (s.$from.parent.type.spec.isolating)
            return !1;
          const { keepMarks: o } = this.options, { splittableMarks: a } = r.extensionManager, l = i || s.$to.parentOffset && s.$from.marks();
          return e().insertContent({ type: this.name }).command(({ tr: c, dispatch: d }) => {
            if (d && l && o) {
              const u = l.filter(
                (h) => a.includes(h.type.name)
              );
              c.ensureMarks(u);
            }
            return !0;
          }).scrollIntoView().run();
        })
      ])
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setHardBreak(),
      "Shift-Enter": () => this.editor.commands.setHardBreak()
    };
  }
}), uk = we.create({
  name: "heading",
  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {}
    };
  },
  content: "inline*",
  group: "block",
  defining: !0,
  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: !1
      }
    };
  },
  parseHTML() {
    return this.options.levels.map((n) => ({
      tag: `h${n}`,
      attrs: { level: n }
    }));
  },
  renderHTML({ node: n, HTMLAttributes: e }) {
    return [`h${this.options.levels.includes(n.attrs.level) ? n.attrs.level : this.options.levels[0]}`, Y(this.options.HTMLAttributes, e), 0];
  },
  parseMarkdown: (n, e) => e.createNode(
    "heading",
    { level: n.depth || 1 },
    e.parseInline(n.tokens || [])
  ),
  renderMarkdown: (n, e) => {
    var t;
    const r = (t = n.attrs) != null && t.level ? parseInt(n.attrs.level, 10) : 1, s = "#".repeat(r);
    return n.content ? `${s} ${e.renderChildren(n.content)}` : "";
  },
  addCommands() {
    return {
      setHeading: (n) => ({ commands: e }) => this.options.levels.includes(n.level) ? e.setNode(this.name, n) : !1,
      toggleHeading: (n) => ({ commands: e }) => this.options.levels.includes(n.level) ? e.toggleNode(this.name, "paragraph", n) : !1
    };
  },
  addKeyboardShortcuts() {
    return this.options.levels.reduce(
      (n, e) => ({
        ...n,
        [`Mod-Alt-${e}`]: () => this.editor.commands.toggleHeading({ level: e })
      }),
      {}
    );
  },
  addInputRules() {
    return this.options.levels.map((n) => qa({
      find: new RegExp(`^(#{${Math.min(...this.options.levels)},${n}})\\s$`),
      type: this.type,
      getAttributes: {
        level: n
      }
    }));
  }
}), hk = we.create({
  name: "horizontalRule",
  addOptions() {
    return {
      HTMLAttributes: {},
      nextNodeType: "paragraph"
    };
  },
  group: "block",
  parseHTML() {
    return [{ tag: "hr" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["hr", Y(this.options.HTMLAttributes, n)];
  },
  markdownTokenName: "hr",
  parseMarkdown: (n, e) => e.createNode("horizontalRule"),
  renderMarkdown: () => "---",
  addCommands() {
    return {
      setHorizontalRule: () => ({ chain: n, state: e }) => {
        if (!T0(e, e.schema.nodes[this.name]))
          return !1;
        const { selection: t } = e, { $to: r } = t, s = n();
        return kf(t) ? s.insertContentAt(r.pos, {
          type: this.name
        }) : s.insertContent({ type: this.name }), s.command(({ state: i, tr: o, dispatch: a }) => {
          if (a) {
            const { $to: l } = o.selection, c = l.end();
            if (l.nodeAfter)
              l.nodeAfter.isTextblock ? o.setSelection(O.create(o.doc, l.pos + 1)) : l.nodeAfter.isBlock ? o.setSelection(_.create(o.doc, l.pos)) : o.setSelection(O.create(o.doc, l.pos));
            else {
              const d = i.schema.nodes[this.options.nextNodeType] || l.parent.type.contentMatch.defaultType, u = d == null ? void 0 : d.create();
              u && (o.insert(c, u), o.setSelection(O.create(o.doc, c + 1)));
            }
            o.scrollIntoView();
          }
          return !0;
        }).run();
      }
    };
  },
  addInputRules() {
    return [
      J0({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        type: this.type
      })
    ];
  }
}), fk = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, pk = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g, mk = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, gk = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g, yk = Zt.create({
  name: "italic",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      {
        tag: "em"
      },
      {
        tag: "i",
        getAttrs: (n) => n.style.fontStyle !== "normal" && null
      },
      {
        style: "font-style=normal",
        clearMark: (n) => n.type.name === this.name
      },
      {
        style: "font-style=italic"
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["em", Y(this.options.HTMLAttributes, n), 0];
  },
  addCommands() {
    return {
      setItalic: () => ({ commands: n }) => n.setMark(this.name),
      toggleItalic: () => ({ commands: n }) => n.toggleMark(this.name),
      unsetItalic: () => ({ commands: n }) => n.unsetMark(this.name)
    };
  },
  markdownTokenName: "em",
  parseMarkdown: (n, e) => e.applyMark("italic", e.parseInline(n.tokens || [])),
  markdownOptions: {
    htmlReopen: {
      open: "<em>",
      close: "</em>"
    }
  },
  renderMarkdown: (n, e) => `*${e.renderChildren(n)}*`,
  addKeyboardShortcuts() {
    return {
      "Mod-i": () => this.editor.commands.toggleItalic(),
      "Mod-I": () => this.editor.commands.toggleItalic()
    };
  },
  addInputRules() {
    return [
      Yt({
        find: fk,
        type: this.type
      }),
      Yt({
        find: mk,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      Ct({
        find: pk,
        type: this.type
      }),
      Ct({
        find: gk,
        type: this.type
      })
    ];
  }
});
const bk = "aaa1rp3bb0ott3vie4c1le2ogado5udhabi7c0ademy5centure6ountant0s9o1tor4d0s1ult4e0g1ro2tna4f0l1rica5g0akhan5ency5i0g1rbus3force5tel5kdn3l0ibaba4pay4lfinanz6state5y2sace3tom5m0azon4ericanexpress7family11x2fam3ica3sterdam8nalytics7droid5quan4z2o0l2partments8p0le4q0uarelle8r0ab1mco4chi3my2pa2t0e3s0da2ia2sociates9t0hleta5torney7u0ction5di0ble3o3spost5thor3o0s4w0s2x0a2z0ure5ba0by2idu3namex4d1k2r0celona5laycard4s5efoot5gains6seball5ketball8uhaus5yern5b0c1t1va3cg1n2d1e0ats2uty4er2rlin4st0buy5t2f1g1h0arti5i0ble3d1ke2ng0o3o1z2j1lack0friday9ockbuster8g1omberg7ue3m0s1w2n0pparibas9o0ats3ehringer8fa2m1nd2o0k0ing5sch2tik2on4t1utique6x2r0adesco6idgestone9oadway5ker3ther5ussels7s1t1uild0ers6siness6y1zz3v1w1y1z0h3ca0b1fe2l0l1vinklein9m0era3p2non3petown5ital0one8r0avan4ds2e0er0s4s2sa1e1h1ino4t0ering5holic7ba1n1re3c1d1enter4o1rn3f0a1d2g1h0anel2nel4rity4se2t2eap3intai5ristmas6ome4urch5i0priani6rcle4sco3tadel4i0c2y3k1l0aims4eaning6ick2nic1que6othing5ud3ub0med6m1n1o0ach3des3ffee4llege4ogne5m0mbank4unity6pany2re3uter5sec4ndos3struction8ulting7tact3ractors9oking4l1p2rsica5untry4pon0s4rses6pa2r0edit0card4union9icket5own3s1uise0s6u0isinella9v1w1x1y0mru3ou3z2dad1nce3ta1e1ing3sun4y2clk3ds2e0al0er2s3gree4livery5l1oitte5ta3mocrat6ntal2ist5si0gn4v2hl2iamonds6et2gital5rect0ory7scount3ver5h2y2j1k1m1np2o0cs1tor4g1mains5t1wnload7rive4tv2ubai3pont4rban5vag2r2z2earth3t2c0o2deka3u0cation8e1g1mail3erck5nergy4gineer0ing9terprises10pson4quipment8r0icsson6ni3s0q1tate5t1u0rovision8s2vents5xchange6pert3osed4ress5traspace10fage2il1rwinds6th3mily4n0s2rm0ers5shion4t3edex3edback6rrari3ero6i0delity5o2lm2nal1nce1ial7re0stone6mdale6sh0ing5t0ness6j1k1lickr3ghts4r2orist4wers5y2m1o0o0d1tball6rd1ex2sale4um3undation8x2r0ee1senius7l1ogans4ntier7tr2ujitsu5n0d2rniture7tbol5yi3ga0l0lery3o1up4me0s3p1rden4y2b0iz3d0n2e0a1nt0ing5orge5f1g0ee3h1i0ft0s3ves2ing5l0ass3e1obal2o4m0ail3bh2o1x2n1odaddy5ld0point6f2odyear5g0le4p1t1v2p1q1r0ainger5phics5tis4een3ipe3ocery4up4s1t1u0cci3ge2ide2tars5ru3w1y2hair2mburg5ngout5us3bo2dfc0bank7ealth0care8lp1sinki6re1mes5iphop4samitsu7tachi5v2k0t2m1n1ockey4ldings5iday5medepot5goods5s0ense7nda3rse3spital5t0ing5t0els3mail5use3w2r1sbc3t1u0ghes5yatt3undai7ibm2cbc2e1u2d1e0ee3fm2kano4l1m0amat4db2mo0bilien9n0c1dustries8finiti5o2g1k1stitute6urance4e4t0ernational10uit4vestments10o1piranga7q1r0ish4s0maili5t0anbul7t0au2v3jaguar4va3cb2e0ep2tzt3welry6io2ll2m0p2nj2o0bs1urg4t1y2p0morgan6rs3uegos4niper7kaufen5ddi3e0rryhotels6properties14fh2g1h1i0a1ds2m1ndle4tchen5wi3m1n1oeln3matsu5sher5p0mg2n2r0d1ed3uokgroup8w1y0oto4z2la0caixa5mborghini8er3nd0rover6xess5salle5t0ino3robe5w0yer5b1c1ds2ease3clerc5frak4gal2o2xus4gbt3i0dl2fe0insurance9style7ghting6ke2lly3mited4o2ncoln4k2ve1ing5k1lc1p2oan0s3cker3us3l1ndon4tte1o3ve3pl0financial11r1s1t0d0a3u0ndbeck6xe1ury5v1y2ma0drid4if1son4keup4n0agement7go3p1rket0ing3s4riott5shalls7ttel5ba2c0kinsey7d1e0d0ia3et2lbourne7me1orial6n0u2rck0msd7g1h1iami3crosoft7l1ni1t2t0subishi9k1l0b1s2m0a2n1o0bi0le4da2e1i1m1nash3ey2ster5rmon3tgage6scow4to0rcycles9v0ie4p1q1r1s0d2t0n1r2u0seum3ic4v1w1x1y1z2na0b1goya4me2vy3ba2c1e0c1t0bank4flix4work5ustar5w0s2xt0direct7us4f0l2g0o2hk2i0co2ke1on3nja3ssan1y5l1o0kia3rton4w0ruz3tv4p1r0a1w2tt2u1yc2z2obi1server7ffice5kinawa6layan0group9lo3m0ega4ne1g1l0ine5oo2pen3racle3nge4g0anic5igins6saka4tsuka4t2vh3pa0ge2nasonic7ris2s1tners4s1y3y2ccw3e0t2f0izer5g1h0armacy6d1ilips5one2to0graphy6s4ysio5ics1tet2ures6d1n0g1k2oneer5zza4k1l0ace2y0station9umbing5s3m1n0c2ohl2ker3litie5rn2st3r0axi3ess3ime3o0d0uctions8f1gressive8mo2perties3y5tection8u0dential9s1t1ub2w0c2y2qa1pon3uebec3st5racing4dio4e0ad1lestate6tor2y4cipes5d0umbrella9hab3ise0n3t2liance6n0t0als5pair3ort3ublican8st0aurant8view0s5xroth6ich0ardli6oh3l1o1p2o0cks3deo3gers4om3s0vp3u0gby3hr2n2w0e2yukyu6sa0arland6fe0ty4kura4le1on3msclub4ung5ndvik0coromant12ofi4p1rl2s1ve2xo3b0i1s2c0b1haeffler7midt4olarships8ol3ule3warz5ience5ot3d1e0arch3t2cure1ity6ek2lect4ner3rvices6ven3w1x0y3fr2g1h0angrila6rp3ell3ia1ksha5oes2p0ping5uji3w3i0lk2na1gles5te3j1k0i0n2y0pe4l0ing4m0art3ile4n0cf3o0ccer3ial4ftbank4ware6hu2lar2utions7ng1y2y2pa0ce3ort2t3r0l2s1t0ada2ples4r1tebank4farm7c0group6ockholm6rage3e3ream4udio2y3yle4u0cks3pplies3y2ort5rf1gery5zuki5v1watch4iss4x1y0dney4stems6z2tab1ipei4lk2obao4rget4tamotors6r2too4x0i3c0i2d0k2eam2ch0nology8l1masek5nnis4va3f1g1h0d1eater2re6iaa2ckets5enda4ps2res2ol4j0maxx4x2k0maxx5l1m0all4n1o0day3kyo3ols3p1ray3shiba5tal3urs3wn2yota3s3r0ade1ing4ining5vel0ers0insurance16ust3v2t1ube2i1nes3shu4v0s2w1z2ua1bank3s2g1k1nicom3versity8o2ol2ps2s1y1z2va0cations7na1guard7c1e0gas3ntures6risign5mögensberater2ung14sicherung10t2g1i0ajes4deo3g1king4llas4n1p1rgin4sa1ion4va1o3laanderen9n1odka3lvo3te1ing3o2yage5u2wales2mart4ter4ng0gou5tch0es6eather0channel12bcam3er2site5d0ding5ibo2r3f1hoswho6ien2ki2lliamhill9n0dows4e1ners6me2oodside6rk0s2ld3w2s1tc1f3xbox3erox4ihuan4n2xx2yz3yachts4hoo3maxun5ndex5e1odobashi7ga2kohama6u0tube6t1un3za0ppos4ra3ero3ip2m1one3uerich6w2", vk = "ελ1υ2бг1ел3дети4ею2католик6ом3мкд2он1сква6онлайн5рг3рус2ф2сайт3рб3укр3қаз3հայ3ישראל5קום3ابوظبي5رامكو5لاردن4بحرين5جزائر5سعودية6عليان5مغرب5مارات5یران5بارت2زار4يتك3ھارت5تونس4سودان3رية5شبكة4عراق2ب2مان4فلسطين6قطر3كاثوليك6وم3مصر2ليسيا5وريتانيا7قع4همراه5پاکستان7ڀارت4कॉम3नेट3भारत0म्3ोत5संगठन5বাংলা5ভারত2ৰত4ਭਾਰਤ4ભારત4ଭାରତ4இந்தியா6லங்கை6சிங்கப்பூர்11భారత్5ಭಾರತ4ഭാരതം5ලංකා4คอม3ไทย3ລາວ3გე2みんな3アマゾン4クラウド4グーグル4コム2ストア3セール3ファッション6ポイント4世界2中信1国1國1文网3亚马逊3企业2佛山2信息2健康2八卦2公司1益2台湾1灣2商城1店1标2嘉里0大酒店5在线2大拿2天主教3娱乐2家電2广东2微博2慈善2我爱你3手机2招聘2政务1府2新加坡2闻2时尚2書籍2机构2淡马锡3游戏2澳門2点看2移动2组织机构4网址1店1站1络2联通2谷歌2购物2通販2集团2電訊盈科4飞利浦3食品2餐厅2香格里拉3港2닷넷1컴2삼성2한국2", Ua = "numeric", Ka = "ascii", Ja = "alpha", Xn = "asciinumeric", Vn = "alphanumeric", Ga = "domain", Ff = "emoji", kk = "scheme", xk = "slashscheme", ua = "whitespace";
function wk(n, e) {
  return n in e || (e[n] = []), e[n];
}
function Rt(n, e, t) {
  e[Ua] && (e[Xn] = !0, e[Vn] = !0), e[Ka] && (e[Xn] = !0, e[Ja] = !0), e[Xn] && (e[Vn] = !0), e[Ja] && (e[Vn] = !0), e[Vn] && (e[Ga] = !0), e[Ff] && (e[Ga] = !0);
  for (const r in e) {
    const s = wk(r, t);
    s.indexOf(n) < 0 && s.push(n);
  }
}
function Sk(n, e) {
  const t = {};
  for (const r in e)
    e[r].indexOf(n) >= 0 && (t[r] = !0);
  return t;
}
function ye(n = null) {
  this.j = {}, this.jr = [], this.jd = null, this.t = n;
}
ye.groups = {};
ye.prototype = {
  accepts() {
    return !!this.t;
  },
  /**
   * Follow an existing transition from the given input to the next state.
   * Does not mutate.
   * @param {string} input character or token type to transition on
   * @returns {?State<T>} the next state, if any
   */
  go(n) {
    const e = this, t = e.j[n];
    if (t)
      return t;
    for (let r = 0; r < e.jr.length; r++) {
      const s = e.jr[r][0], i = e.jr[r][1];
      if (i && s.test(n))
        return i;
    }
    return e.jd;
  },
  /**
   * Whether the state has a transition for the given input. Set the second
   * argument to true to only look for an exact match (and not a default or
   * regular-expression-based transition)
   * @param {string} input
   * @param {boolean} exactOnly
   */
  has(n, e = !1) {
    return e ? n in this.j : !!this.go(n);
  },
  /**
   * Short for "transition all"; create a transition from the array of items
   * in the given list to the same final resulting state.
   * @param {string | string[]} inputs Group of inputs to transition on
   * @param {Transition<T> | State<T>} [next] Transition options
   * @param {Flags} [flags] Collections flags to add token to
   * @param {Collections<T>} [groups] Master list of token groups
   */
  ta(n, e, t, r) {
    for (let s = 0; s < n.length; s++)
      this.tt(n[s], e, t, r);
  },
  /**
   * Short for "take regexp transition"; defines a transition for this state
   * when it encounters a token which matches the given regular expression
   * @param {RegExp} regexp Regular expression transition (populate first)
   * @param {T | State<T>} [next] Transition options
   * @param {Flags} [flags] Collections flags to add token to
   * @param {Collections<T>} [groups] Master list of token groups
   * @returns {State<T>} taken after the given input
   */
  tr(n, e, t, r) {
    r = r || ye.groups;
    let s;
    return e && e.j ? s = e : (s = new ye(e), t && r && Rt(e, t, r)), this.jr.push([n, s]), s;
  },
  /**
   * Short for "take transitions", will take as many sequential transitions as
   * the length of the given input and returns the
   * resulting final state.
   * @param {string | string[]} input
   * @param {T | State<T>} [next] Transition options
   * @param {Flags} [flags] Collections flags to add token to
   * @param {Collections<T>} [groups] Master list of token groups
   * @returns {State<T>} taken after the given input
   */
  ts(n, e, t, r) {
    let s = this;
    const i = n.length;
    if (!i)
      return s;
    for (let o = 0; o < i - 1; o++)
      s = s.tt(n[o]);
    return s.tt(n[i - 1], e, t, r);
  },
  /**
   * Short for "take transition", this is a method for building/working with
   * state machines.
   *
   * If a state already exists for the given input, returns it.
   *
   * If a token is specified, that state will emit that token when reached by
   * the linkify engine.
   *
   * If no state exists, it will be initialized with some default transitions
   * that resemble existing default transitions.
   *
   * If a state is given for the second argument, that state will be
   * transitioned to on the given input regardless of what that input
   * previously did.
   *
   * Specify a token group flags to define groups that this token belongs to.
   * The token will be added to corresponding entires in the given groups
   * object.
   *
   * @param {string} input character, token type to transition on
   * @param {T | State<T>} [next] Transition options
   * @param {Flags} [flags] Collections flags to add token to
   * @param {Collections<T>} [groups] Master list of groups
   * @returns {State<T>} taken after the given input
   */
  tt(n, e, t, r) {
    r = r || ye.groups;
    const s = this;
    if (e && e.j)
      return s.j[n] = e, e;
    const i = e;
    let o, a = s.go(n);
    if (a ? (o = new ye(), Object.assign(o.j, a.j), o.jr.push.apply(o.jr, a.jr), o.jd = a.jd, o.t = a.t) : o = new ye(), i) {
      if (r)
        if (o.t && typeof o.t == "string") {
          const l = Object.assign(Sk(o.t, r), t);
          Rt(i, l, r);
        } else t && Rt(i, t, r);
      o.t = i;
    }
    return s.j[n] = o, o;
  }
};
const I = (n, e, t, r, s) => n.ta(e, t, r, s), H = (n, e, t, r, s) => n.tr(e, t, r, s), Rd = (n, e, t, r, s) => n.ts(e, t, r, s), v = (n, e, t, r, s) => n.tt(e, t, r, s), Ge = "WORD", Ya = "UWORD", Hf = "ASCIINUMERICAL", Vf = "ALPHANUMERICAL", br = "LOCALHOST", Xa = "TLD", Qa = "UTLD", ni = "SCHEME", an = "SLASH_SCHEME", Ll = "NUM", Za = "WS", zl = "NL", Qn = "OPENBRACE", Zn = "CLOSEBRACE", Ii = "OPENBRACKET", Di = "CLOSEBRACKET", Pi = "OPENPAREN", Ri = "CLOSEPAREN", Li = "OPENANGLEBRACKET", zi = "CLOSEANGLEBRACKET", Bi = "FULLWIDTHLEFTPAREN", Fi = "FULLWIDTHRIGHTPAREN", Hi = "LEFTCORNERBRACKET", Vi = "RIGHTCORNERBRACKET", Wi = "LEFTWHITECORNERBRACKET", ji = "RIGHTWHITECORNERBRACKET", qi = "FULLWIDTHLESSTHAN", Ui = "FULLWIDTHGREATERTHAN", Ki = "AMPERSAND", Ji = "APOSTROPHE", Gi = "ASTERISK", at = "AT", Yi = "BACKSLASH", Xi = "BACKTICK", Qi = "CARET", Lt = "COLON", Bl = "COMMA", Zi = "DOLLAR", Re = "DOT", eo = "EQUALS", Fl = "EXCLAMATION", Ce = "HYPHEN", er = "PERCENT", to = "PIPE", no = "PLUS", ro = "POUND", tr = "QUERY", Hl = "QUOTE", Wf = "FULLWIDTHMIDDLEDOT", Vl = "SEMI", Le = "SLASH", nr = "TILDE", so = "UNDERSCORE", jf = "EMOJI", io = "SYM";
var qf = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ALPHANUMERICAL: Vf,
  AMPERSAND: Ki,
  APOSTROPHE: Ji,
  ASCIINUMERICAL: Hf,
  ASTERISK: Gi,
  AT: at,
  BACKSLASH: Yi,
  BACKTICK: Xi,
  CARET: Qi,
  CLOSEANGLEBRACKET: zi,
  CLOSEBRACE: Zn,
  CLOSEBRACKET: Di,
  CLOSEPAREN: Ri,
  COLON: Lt,
  COMMA: Bl,
  DOLLAR: Zi,
  DOT: Re,
  EMOJI: jf,
  EQUALS: eo,
  EXCLAMATION: Fl,
  FULLWIDTHGREATERTHAN: Ui,
  FULLWIDTHLEFTPAREN: Bi,
  FULLWIDTHLESSTHAN: qi,
  FULLWIDTHMIDDLEDOT: Wf,
  FULLWIDTHRIGHTPAREN: Fi,
  HYPHEN: Ce,
  LEFTCORNERBRACKET: Hi,
  LEFTWHITECORNERBRACKET: Wi,
  LOCALHOST: br,
  NL: zl,
  NUM: Ll,
  OPENANGLEBRACKET: Li,
  OPENBRACE: Qn,
  OPENBRACKET: Ii,
  OPENPAREN: Pi,
  PERCENT: er,
  PIPE: to,
  PLUS: no,
  POUND: ro,
  QUERY: tr,
  QUOTE: Hl,
  RIGHTCORNERBRACKET: Vi,
  RIGHTWHITECORNERBRACKET: ji,
  SCHEME: ni,
  SEMI: Vl,
  SLASH: Le,
  SLASH_SCHEME: an,
  SYM: io,
  TILDE: nr,
  TLD: Xa,
  UNDERSCORE: so,
  UTLD: Qa,
  UWORD: Ya,
  WORD: Ge,
  WS: Za
});
const Ue = /[a-z]/, In = new RegExp("\\p{L}", "u"), ha = new RegExp("\\p{Emoji}", "u"), Ke = /\d/, fa = /\s/, Ld = "\r", pa = `
`, Ck = "️", Mk = "‍", ma = "￼";
let as = null, ls = null;
function Ek(n = []) {
  const e = {};
  ye.groups = e;
  const t = new ye();
  as == null && (as = zd(bk)), ls == null && (ls = zd(vk)), v(t, "'", Ji), v(t, "{", Qn), v(t, "}", Zn), v(t, "[", Ii), v(t, "]", Di), v(t, "(", Pi), v(t, ")", Ri), v(t, "<", Li), v(t, ">", zi), v(t, "（", Bi), v(t, "）", Fi), v(t, "「", Hi), v(t, "」", Vi), v(t, "『", Wi), v(t, "』", ji), v(t, "＜", qi), v(t, "＞", Ui), v(t, "&", Ki), v(t, "*", Gi), v(t, "@", at), v(t, "`", Xi), v(t, "^", Qi), v(t, ":", Lt), v(t, ",", Bl), v(t, "$", Zi), v(t, ".", Re), v(t, "=", eo), v(t, "!", Fl), v(t, "-", Ce), v(t, "%", er), v(t, "|", to), v(t, "+", no), v(t, "#", ro), v(t, "?", tr), v(t, '"', Hl), v(t, "/", Le), v(t, ";", Vl), v(t, "~", nr), v(t, "_", so), v(t, "\\", Yi), v(t, "・", Wf);
  const r = H(t, Ke, Ll, {
    [Ua]: !0
  });
  H(r, Ke, r);
  const s = H(r, Ue, Hf, {
    [Xn]: !0
  }), i = H(r, In, Vf, {
    [Vn]: !0
  }), o = H(t, Ue, Ge, {
    [Ka]: !0
  });
  H(o, Ke, s), H(o, Ue, o), H(s, Ke, s), H(s, Ue, s);
  const a = H(t, In, Ya, {
    [Ja]: !0
  });
  H(a, Ue), H(a, Ke, i), H(a, In, a), H(i, Ke, i), H(i, Ue), H(i, In, i);
  const l = v(t, pa, zl, {
    [ua]: !0
  }), c = v(t, Ld, Za, {
    [ua]: !0
  }), d = H(t, fa, Za, {
    [ua]: !0
  });
  v(t, ma, d), v(c, pa, l), v(c, ma, d), H(c, fa, d), v(d, Ld), v(d, pa), H(d, fa, d), v(d, ma, d);
  const u = H(t, ha, jf, {
    [Ff]: !0
  });
  v(u, "#"), H(u, ha, u), v(u, Ck, u);
  const h = v(u, Mk);
  v(h, "#"), H(h, ha, u);
  const f = [[Ue, o], [Ke, s]], p = [[Ue, null], [In, a], [Ke, i]];
  for (let m = 0; m < as.length; m++)
    st(t, as[m], Xa, Ge, f);
  for (let m = 0; m < ls.length; m++)
    st(t, ls[m], Qa, Ya, p);
  Rt(Xa, {
    tld: !0,
    ascii: !0
  }, e), Rt(Qa, {
    utld: !0,
    alpha: !0
  }, e), st(t, "file", ni, Ge, f), st(t, "mailto", ni, Ge, f), st(t, "http", an, Ge, f), st(t, "https", an, Ge, f), st(t, "ftp", an, Ge, f), st(t, "ftps", an, Ge, f), Rt(ni, {
    scheme: !0,
    ascii: !0
  }, e), Rt(an, {
    slashscheme: !0,
    ascii: !0
  }, e), n = n.sort((m, g) => m[0] > g[0] ? 1 : -1);
  for (let m = 0; m < n.length; m++) {
    const g = n[m][0], k = n[m][1] ? {
      [kk]: !0
    } : {
      [xk]: !0
    };
    g.indexOf("-") >= 0 ? k[Ga] = !0 : Ue.test(g) ? Ke.test(g) ? k[Xn] = !0 : k[Ka] = !0 : k[Ua] = !0, Rd(t, g, g, k);
  }
  return Rd(t, "localhost", br, {
    ascii: !0
  }), t.jd = new ye(io), {
    start: t,
    tokens: Object.assign({
      groups: e
    }, qf)
  };
}
function Uf(n, e) {
  const t = Tk(e.replace(/[A-Z]/g, (a) => a.toLowerCase())), r = t.length, s = [];
  let i = 0, o = 0;
  for (; o < r; ) {
    let a = n, l = null, c = 0, d = null, u = -1, h = -1;
    for (; o < r && (l = a.go(t[o])); )
      a = l, a.accepts() ? (u = 0, h = 0, d = a) : u >= 0 && (u += t[o].length, h++), c += t[o].length, i += t[o].length, o++;
    i -= u, o -= h, c -= u, s.push({
      t: d.t,
      // token type/name
      v: e.slice(i - c, i),
      // string value
      s: i - c,
      // start index
      e: i
      // end index (excluding)
    });
  }
  return s;
}
function Tk(n) {
  const e = [], t = n.length;
  let r = 0;
  for (; r < t; ) {
    let s = n.charCodeAt(r), i, o = s < 55296 || s > 56319 || r + 1 === t || (i = n.charCodeAt(r + 1)) < 56320 || i > 57343 ? n[r] : n.slice(r, r + 2);
    e.push(o), r += o.length;
  }
  return e;
}
function st(n, e, t, r, s) {
  let i;
  const o = e.length;
  for (let a = 0; a < o - 1; a++) {
    const l = e[a];
    n.j[l] ? i = n.j[l] : (i = new ye(r), i.jr = s.slice(), n.j[l] = i), n = i;
  }
  return i = new ye(t), i.jr = s.slice(), n.j[e[o - 1]] = i, i;
}
function zd(n) {
  const e = [], t = [];
  let r = 0, s = "0123456789";
  for (; r < n.length; ) {
    let i = 0;
    for (; s.indexOf(n[r + i]) >= 0; )
      i++;
    if (i > 0) {
      e.push(t.join(""));
      for (let o = parseInt(n.substring(r, r + i), 10); o > 0; o--)
        t.pop();
      r += i;
    } else
      t.push(n[r]), r++;
  }
  return e;
}
const vr = {
  defaultProtocol: "http",
  events: null,
  format: Bd,
  formatHref: Bd,
  nl2br: !1,
  tagName: "a",
  target: null,
  rel: null,
  validate: !0,
  truncate: 1 / 0,
  className: null,
  attributes: null,
  ignoreTags: [],
  render: null
};
function Wl(n, e = null) {
  let t = Object.assign({}, vr);
  n && (t = Object.assign(t, n instanceof Wl ? n.o : n));
  const r = t.ignoreTags, s = [];
  for (let i = 0; i < r.length; i++)
    s.push(r[i].toUpperCase());
  this.o = t, e && (this.defaultRender = e), this.ignoreTags = s;
}
Wl.prototype = {
  o: vr,
  /**
   * @type string[]
   */
  ignoreTags: [],
  /**
   * @param {IntermediateRepresentation} ir
   * @returns {any}
   */
  defaultRender(n) {
    return n;
  },
  /**
   * Returns true or false based on whether a token should be displayed as a
   * link based on the user options.
   * @param {MultiToken} token
   * @returns {boolean}
   */
  check(n) {
    return this.get("validate", n.toString(), n);
  },
  // Private methods
  /**
   * Resolve an option's value based on the value of the option and the given
   * params. If operator and token are specified and the target option is
   * callable, automatically calls the function with the given argument.
   * @template {keyof Opts} K
   * @param {K} key Name of option to use
   * @param {string} [operator] will be passed to the target option if it's a
   * function. If not specified, RAW function value gets returned
   * @param {MultiToken} [token] The token from linkify.tokenize
   * @returns {Opts[K] | any}
   */
  get(n, e, t) {
    const r = e != null;
    let s = this.o[n];
    return s && (typeof s == "object" ? (s = t.t in s ? s[t.t] : vr[n], typeof s == "function" && r && (s = s(e, t))) : typeof s == "function" && r && (s = s(e, t.t, t)), s);
  },
  /**
   * @template {keyof Opts} L
   * @param {L} key Name of options object to use
   * @param {string} [operator]
   * @param {MultiToken} [token]
   * @returns {Opts[L] | any}
   */
  getObj(n, e, t) {
    let r = this.o[n];
    return typeof r == "function" && e != null && (r = r(e, t.t, t)), r;
  },
  /**
   * Convert the given token to a rendered element that may be added to the
   * calling-interface's DOM
   * @param {MultiToken} token Token to render to an HTML element
   * @returns {any} Render result; e.g., HTML string, DOM element, React
   *   Component, etc.
   */
  render(n) {
    const e = n.render(this);
    return (this.get("render", null, n) || this.defaultRender)(e, n.t, n);
  }
};
function Bd(n) {
  return n;
}
function Kf(n, e) {
  this.t = "token", this.v = n, this.tk = e;
}
Kf.prototype = {
  isLink: !1,
  /**
   * Return the string this token represents.
   * @return {string}
   */
  toString() {
    return this.v;
  },
  /**
   * What should the value for this token be in the `href` HTML attribute?
   * Returns the `.toString` value by default.
   * @param {string} [scheme]
   * @return {string}
   */
  toHref(n) {
    return this.toString();
  },
  /**
   * @param {Options} options Formatting options
   * @returns {string}
   */
  toFormattedString(n) {
    const e = this.toString(), t = n.get("truncate", e, this), r = n.get("format", e, this);
    return t && r.length > t ? r.substring(0, t) + "…" : r;
  },
  /**
   *
   * @param {Options} options
   * @returns {string}
   */
  toFormattedHref(n) {
    return n.get("formatHref", this.toHref(n.get("defaultProtocol")), this);
  },
  /**
   * The start index of this token in the original input string
   * @returns {number}
   */
  startIndex() {
    return this.tk[0].s;
  },
  /**
   * The end index of this token in the original input string (up to this
   * index but not including it)
   * @returns {number}
   */
  endIndex() {
    return this.tk[this.tk.length - 1].e;
  },
  /**
  	Returns an object  of relevant values for this token, which includes keys
  	* type - Kind of token ('url', 'email', etc.)
  	* value - Original text
  	* href - The value that should be added to the anchor tag's href
  		attribute
  		@method toObject
  	@param {string} [protocol] `'http'` by default
  */
  toObject(n = vr.defaultProtocol) {
    return {
      type: this.t,
      value: this.toString(),
      isLink: this.isLink,
      href: this.toHref(n),
      start: this.startIndex(),
      end: this.endIndex()
    };
  },
  /**
   *
   * @param {Options} options Formatting option
   */
  toFormattedObject(n) {
    return {
      type: this.t,
      value: this.toFormattedString(n),
      isLink: this.isLink,
      href: this.toFormattedHref(n),
      start: this.startIndex(),
      end: this.endIndex()
    };
  },
  /**
   * Whether this token should be rendered as a link according to the given options
   * @param {Options} options
   * @returns {boolean}
   */
  validate(n) {
    return n.get("validate", this.toString(), this);
  },
  /**
   * Return an object that represents how this link should be rendered.
   * @param {Options} options Formattinng options
   */
  render(n) {
    const e = this, t = this.toHref(n.get("defaultProtocol")), r = n.get("formatHref", t, this), s = n.get("tagName", t, e), i = this.toFormattedString(n), o = {}, a = n.get("className", t, e), l = n.get("target", t, e), c = n.get("rel", t, e), d = n.getObj("attributes", t, e), u = n.getObj("events", t, e);
    return o.href = r, a && (o.class = a), l && (o.target = l), c && (o.rel = c), d && Object.assign(o, d), {
      tagName: s,
      attributes: o,
      content: i,
      eventListeners: u
    };
  }
};
function Oo(n, e) {
  class t extends Kf {
    constructor(s, i) {
      super(s, i), this.t = n;
    }
  }
  for (const r in e)
    t.prototype[r] = e[r];
  return t.t = n, t;
}
const Ak = Oo("email", {
  isLink: !0,
  toHref() {
    return "mailto:" + this.toString();
  }
}), Fd = Oo("text"), _k = Oo("nl"), cs = Oo("url", {
  isLink: !0,
  /**
  	Lowercases relevant parts of the domain and adds the protocol if
  	required. Note that this will not escape unsafe HTML characters in the
  	URL.
  		@param {string} [scheme] default scheme (e.g., 'https')
  	@return {string} the full href
  */
  toHref(n = vr.defaultProtocol) {
    return this.hasProtocol() ? this.v : `${n}://${this.v}`;
  },
  /**
   * Check whether this URL token has a protocol
   * @return {boolean}
   */
  hasProtocol() {
    const n = this.tk;
    return n.length >= 2 && n[0].t !== br && n[1].t === Lt;
  }
}), Se = (n) => new ye(n);
function Ok({
  groups: n
}) {
  const e = n.domain.concat([Ki, Gi, at, Yi, Xi, Qi, Zi, eo, Ce, Ll, er, to, no, ro, Le, io, nr, so]), t = [Ji, Lt, Bl, Re, Fl, er, tr, Hl, Vl, Li, zi, Qn, Zn, Di, Ii, Pi, Ri, Bi, Fi, Hi, Vi, Wi, ji, qi, Ui], r = [Ki, Ji, Gi, Yi, Xi, Qi, Zi, eo, Ce, Qn, Zn, er, to, no, ro, tr, Le, io, nr, so], s = Se(), i = v(s, nr);
  I(i, r, i), I(i, n.domain, i);
  const o = Se(), a = Se(), l = Se();
  I(s, n.domain, o), I(s, n.scheme, a), I(s, n.slashscheme, l), I(o, r, i), I(o, n.domain, o);
  const c = v(o, at);
  v(i, at, c), v(a, at, c), v(l, at, c);
  const d = v(i, Re);
  I(d, r, i), I(d, n.domain, i);
  const u = Se();
  I(c, n.domain, u), I(u, n.domain, u);
  const h = v(u, Re);
  I(h, n.domain, u);
  const f = Se(Ak);
  I(h, n.tld, f), I(h, n.utld, f), v(c, br, f);
  const p = v(u, Ce);
  v(p, Ce, p), I(p, n.domain, u), I(f, n.domain, u), v(f, Re, h), v(f, Ce, p);
  const m = v(o, Ce), g = v(o, Re);
  v(m, Ce, m), I(m, n.domain, o), I(g, r, i), I(g, n.domain, o);
  const y = Se(cs);
  I(g, n.tld, y), I(g, n.utld, y), I(y, n.domain, o), I(y, r, i), v(y, Re, g), v(y, Ce, m), v(y, at, c);
  const k = v(y, Lt), C = Se(cs);
  I(k, n.numeric, C);
  const S = Se(cs), A = Se();
  I(S, e, S), I(S, t, A), I(A, e, S), I(A, t, A), v(y, Le, S), v(C, Le, S);
  const N = v(a, Lt), T = v(l, Lt), D = v(T, Le), P = v(D, Le);
  I(a, n.domain, o), v(a, Re, g), v(a, Ce, m), I(l, n.domain, o), v(l, Re, g), v(l, Ce, m), I(N, n.domain, S), v(N, Le, S), v(N, tr, S), I(P, n.domain, S), I(P, e, S), v(P, Le, S);
  const Q = [
    [Qn, Zn],
    // {}
    [Ii, Di],
    // []
    [Pi, Ri],
    // ()
    [Li, zi],
    // <>
    [Bi, Fi],
    // （）
    [Hi, Vi],
    // 「」
    [Wi, ji],
    // 『』
    [qi, Ui]
    // ＜＞
  ];
  for (let He = 0; He < Q.length; He++) {
    const [Pe, oe] = Q[He], Z = v(S, Pe);
    v(A, Pe, Z);
    const j = Se(cs);
    I(Z, e, j);
    const tn = Se();
    I(Z, t, tn), v(Z, oe, S), I(j, e, j), I(j, t, tn), I(tn, e, j), I(tn, t, tn), v(j, oe, S), v(tn, oe, S);
  }
  return v(s, br, y), v(s, zl, _k), {
    start: s,
    tokens: qf
  };
}
function Nk(n, e, t) {
  let r = t.length, s = 0, i = [], o = [];
  for (; s < r; ) {
    let a = n, l = null, c = null, d = 0, u = null, h = -1;
    for (; s < r && !(l = a.go(t[s].t)); )
      o.push(t[s++]);
    for (; s < r && (c = l || a.go(t[s].t)); )
      l = null, a = c, a.accepts() ? (h = 0, u = a) : h >= 0 && h++, s++, d++;
    if (h < 0)
      s -= d, s < r && (o.push(t[s]), s++);
    else {
      o.length > 0 && (i.push(ga(Fd, e, o)), o = []), s -= h, d -= h;
      const f = u.t, p = t.slice(s - d, s);
      i.push(ga(f, e, p));
    }
  }
  return o.length > 0 && i.push(ga(Fd, e, o)), i;
}
function ga(n, e, t) {
  const r = t[0].s, s = t[t.length - 1].e, i = e.slice(r, s);
  return new n(i, t);
}
const $k = typeof console < "u" && console && console.warn || (() => {
}), Ik = "until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.", B = {
  scanner: null,
  parser: null,
  tokenQueue: [],
  pluginQueue: [],
  customSchemes: [],
  initialized: !1
};
function Dk() {
  return ye.groups = {}, B.scanner = null, B.parser = null, B.tokenQueue = [], B.pluginQueue = [], B.customSchemes = [], B.initialized = !1, B;
}
function Hd(n, e = !1) {
  if (B.initialized && $k(`linkifyjs: already initialized - will not register custom scheme "${n}" ${Ik}`), !/^[0-9a-z]+(-[0-9a-z]+)*$/.test(n))
    throw new Error(`linkifyjs: incorrect scheme format.
1. Must only contain digits, lowercase ASCII letters or "-"
2. Cannot start or end with "-"
3. "-" cannot repeat`);
  B.customSchemes.push([n, e]);
}
function Pk() {
  B.scanner = Ek(B.customSchemes);
  for (let n = 0; n < B.tokenQueue.length; n++)
    B.tokenQueue[n][1]({
      scanner: B.scanner
    });
  B.parser = Ok(B.scanner.tokens);
  for (let n = 0; n < B.pluginQueue.length; n++)
    B.pluginQueue[n][1]({
      scanner: B.scanner,
      parser: B.parser
    });
  return B.initialized = !0, B;
}
function jl(n) {
  return B.initialized || Pk(), Nk(B.parser.start, n, Uf(B.scanner.start, n));
}
jl.scan = Uf;
function Jf(n, e = null, t = null) {
  if (e && typeof e == "object") {
    if (t)
      throw Error(`linkifyjs: Invalid link type ${e}; must be a string`);
    t = e, e = null;
  }
  const r = new Wl(t), s = jl(n), i = [];
  for (let o = 0; o < s.length; o++) {
    const a = s[o];
    a.isLink && (!e || a.t === e) && r.check(a) && i.push(a.toFormattedObject(r));
  }
  return i;
}
var ql = "[\0-   ᠎ -\u2029 　]", Rk = new RegExp(ql), Lk = new RegExp(`${ql}$`), zk = new RegExp(ql, "g");
function Bk(n) {
  return n.length === 1 ? n[0].isLink : n.length === 3 && n[1].isLink ? ["()", "[]"].includes(n[0].value + n[2].value) : !1;
}
function Fk(n) {
  return new F({
    key: new X("autolink"),
    appendTransaction: (e, t, r) => {
      const s = e.some((c) => c.docChanged) && !t.doc.eq(r.doc), i = e.some(
        (c) => c.getMeta("preventAutolink")
      );
      if (!s || i)
        return;
      const { tr: o } = r, a = ff(t.doc, [...e]);
      if (Nl(a).forEach(({ newRange: c }) => {
        const d = Fv(
          r.doc,
          c,
          (f) => f.isTextblock
        );
        let u, h;
        if (d.length > 1)
          u = d[0], h = r.doc.textBetween(
            u.pos,
            u.pos + u.node.nodeSize,
            void 0,
            " "
          );
        else if (d.length) {
          const f = r.doc.textBetween(c.from, c.to, " ", " ");
          if (!Lk.test(f))
            return;
          u = d[0], h = r.doc.textBetween(
            u.pos,
            c.to,
            void 0,
            " "
          );
        }
        if (u && h) {
          const f = h.split(Rk).filter(Boolean);
          if (f.length <= 0)
            return !1;
          const p = f[f.length - 1], m = u.pos + h.lastIndexOf(p);
          if (!p)
            return !1;
          const g = jl(p).map(
            (y) => y.toObject(n.defaultProtocol)
          );
          if (!Bk(g))
            return !1;
          g.filter((y) => y.isLink).map((y) => ({
            ...y,
            from: m + y.start + 1,
            to: m + y.end + 1
          })).filter((y) => r.schema.marks.code ? !r.doc.rangeHasMark(y.from, y.to, r.schema.marks.code) : !0).filter((y) => n.validate(y.value)).filter((y) => n.shouldAutoLink(y.value)).forEach((y) => {
            $l(y.from, y.to, r.doc).some(
              (k) => k.mark.type === n.type
            ) || o.addMark(
              y.from,
              y.to,
              n.type.create({
                href: y.href
              })
            );
          });
        }
      }), !!o.steps.length)
        return o;
    }
  });
}
function Hk(n) {
  return new F({
    key: new X("handleClickLink"),
    props: {
      handleClick: (e, t, r) => {
        var s, i;
        if (r.button !== 0 || !e.editable)
          return !1;
        let o = null;
        if (r.target instanceof HTMLAnchorElement)
          o = r.target;
        else {
          const l = r.target;
          if (!l)
            return !1;
          const c = n.editor.view.dom;
          o = l.closest("a"), o && !c.contains(o) && (o = null);
        }
        if (!o)
          return !1;
        let a = !1;
        if (n.enableClickSelection && (a = n.editor.commands.extendMarkRange(n.type.name)), n.openOnClick) {
          const l = vf(e.state, n.type.name), c = (s = o.href) != null ? s : l.href, d = (i = o.target) != null ? i : l.target;
          c && (window.open(c, d), a = !0);
        }
        return a;
      }
    }
  });
}
var Vk = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)$/, Wk = /\[([^[\]]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(?:(["'])(.*?)\3|“(.*?)”|‘(.*?)’))?\)/g;
function Gf(n, e) {
  let t = 0;
  for (let r = e - 1; r >= 0 && n[r] === "\\"; r -= 1)
    t += 1;
  return t % 2 === 1;
}
function jk(n, e) {
  let t = 0, r = 0;
  for (; r < e; ) {
    if (n[r] !== "`") {
      r += 1;
      continue;
    }
    if (t === 0 && Gf(n, r)) {
      r += 1;
      continue;
    }
    let s = 0;
    for (; r < e && n[r] === "`"; )
      s += 1, r += 1;
    t === 0 ? t = s : s === t && (t = 0);
  }
  return t > 0;
}
function Yf(n, e, t) {
  var r, s;
  const [, i, o] = e;
  return (e.index ? n[e.index - 1] : void 0) === "!" || Gf(n, (r = e.index) != null ? r : 0) || jk(n, (s = e.index) != null ? s : 0) ? !1 : !!i.trim() && t(o);
}
function Xf(n) {
  var e, t;
  const [r, s, i, , o, a, l] = n, c = (e = o ?? a) != null ? e : l;
  return {
    index: (t = n.index) != null ? t : 0,
    text: r,
    replaceWith: s,
    data: {
      href: i,
      // an empty title ("") counts as no title, as in CommonMark
      title: c || null,
      markdown: !0
    }
  };
}
function qk(n, e) {
  return n.index < e.index + e.text.length && e.index < n.index + n.text.length;
}
function Qf(n) {
  var e, t, r;
  return {
    href: (e = n.data) == null ? void 0 : e.href,
    title: (r = (t = n.data) == null ? void 0 : t.title) != null ? r : null
  };
}
function Uk(n) {
  const e = Yt({
    find: (t) => {
      const r = Vk.exec(t);
      return !r || !Yf(t, r, n.isAllowedHref) ? null : Xf(r);
    },
    type: n.type,
    getAttributes: Qf
  });
  return new jr({
    find: e.find,
    handler: (t) => {
      const r = e.handler(t);
      return r !== null && t.state.tr.steps.length && t.state.tr.setMeta("preventAutolink", !0), r;
    }
  });
}
function Kk(n) {
  const e = Ct({
    find: (t) => {
      var r, s;
      const i = [];
      for (const a of t.matchAll(Wk))
        Yf(t, a, n.isAllowedHref) && i.push(Xf(a));
      const o = ((s = (r = n.findPlainUrls) == null ? void 0 : r.call(n, t)) != null ? s : []).filter(
        (a) => !i.some((l) => qk(l, a))
      );
      return [...i, ...o];
    },
    type: n.type,
    getAttributes: Qf
  });
  return new Ef({
    find: e.find,
    handler: (t) => {
      var r;
      const s = e.handler(t);
      return s !== null && t.state.tr.steps.length && ((r = t.match.data) != null && r.markdown) && t.state.tr.setMeta("preventAutolink", !0), s;
    }
  });
}
function Jk(n) {
  return new F({
    key: new X("handlePasteLink"),
    props: {
      handlePaste: (e, t, r) => {
        const { shouldAutoLink: s } = n, { state: i } = e, { selection: o } = i, { empty: a } = o;
        if (a)
          return !1;
        let l = "";
        r.content.forEach((d) => {
          l += d.textContent;
        });
        const c = Jf(l, { defaultProtocol: n.defaultProtocol }).find(
          (d) => d.isLink && d.value === l
        );
        return !l || !c || s !== void 0 && !s(c.value) ? !1 : n.editor.commands.setMark(n.type, {
          href: c.href
        });
      }
    }
  });
}
function Je(n, e) {
  const t = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp"
  ];
  return e && e.forEach((r) => {
    const s = typeof r == "string" ? r : r.scheme;
    s && t.push(s);
  }), !n || n.replace(zk, "").match(
    new RegExp(
      `^(?:(?:${t.map((r) => r.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")}):|[^a-z]|[a-z0-9+.\\-]+(?:[^a-z+.\\-:]|$))`,
      "i"
    )
  );
}
var Gk = Zt.create({
  name: "link",
  priority: 1e3,
  keepOnSplit: !1,
  exitable: !0,
  onCreate() {
    this.options.validate && !this.options.shouldAutoLink && (this.options.shouldAutoLink = this.options.validate, console.warn(
      "The `validate` option is deprecated. Rename to the `shouldAutoLink` option instead."
    )), this.options.protocols.forEach((n) => {
      if (typeof n == "string") {
        Hd(n);
        return;
      }
      Hd(n.scheme, n.optionalSlashes);
    });
  },
  onDestroy() {
    Dk();
  },
  inclusive() {
    return this.options.autolink;
  },
  addOptions() {
    return {
      openOnClick: !0,
      enableClickSelection: !1,
      linkOnPaste: !0,
      markdownLinks: !1,
      // TODO (major) - default to true on next major version
      autolink: !0,
      protocols: [],
      defaultProtocol: "http",
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        class: null
      },
      isAllowedUri: (n, e) => !!Je(n, e.protocols),
      validate: (n) => !!n,
      shouldAutoLink: (n) => {
        const e = /^[a-z][a-z0-9+.-]*:\/\//i.test(n), t = /^[a-z][a-z0-9+.-]*:/i.test(n);
        if (e || t && !n.includes("@"))
          return !0;
        const s = (n.includes("@") ? n.split("@").pop() : n).split(/[/?#:]/)[0];
        return !(/^\d{1,3}(\.\d{1,3}){3}$/.test(s) || !/\./.test(s));
      }
    };
  },
  addAttributes() {
    var n, e, t;
    return {
      href: {
        default: null,
        parseHTML(r) {
          return r.getAttribute("href");
        }
      },
      target: {
        // Coerce `undefined` to `null` because `undefined` is an invalid attribute value
        default: (n = this.options.HTMLAttributes.target) != null ? n : null
      },
      rel: {
        // Coerce `undefined` to `null` because `undefined` is an invalid attribute value
        default: (e = this.options.HTMLAttributes.rel) != null ? e : null
      },
      class: {
        // Coerce `undefined` to `null` because `undefined` is an invalid attribute value
        default: (t = this.options.HTMLAttributes.class) != null ? t : null
      },
      title: {
        default: null
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (n) => {
          const e = n.getAttribute("href");
          return !e || !this.options.isAllowedUri(e, {
            defaultValidate: (t) => !!Je(t, this.options.protocols),
            protocols: this.options.protocols,
            defaultProtocol: this.options.defaultProtocol
          }) ? !1 : null;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return this.options.isAllowedUri(n.href, {
      defaultValidate: (e) => !!Je(e, this.options.protocols),
      protocols: this.options.protocols,
      defaultProtocol: this.options.defaultProtocol
    }) ? ["a", Y(this.options.HTMLAttributes, n), 0] : ["a", Y(this.options.HTMLAttributes, { ...n, href: "" }), 0];
  },
  markdownTokenName: "link",
  parseMarkdown: (n, e) => e.applyMark("link", e.parseInline(n.tokens || []), {
    href: n.href,
    title: n.title || null
  }),
  renderMarkdown: (n, e) => {
    var t, r, s, i;
    const o = (r = (t = n.attrs) == null ? void 0 : t.href) != null ? r : "", a = (i = (s = n.attrs) == null ? void 0 : s.title) != null ? i : "", l = e.renderChildren(n);
    return a ? `[${l}](${o} "${a}")` : `[${l}](${o})`;
  },
  addCommands() {
    return {
      setLink: (n) => ({ chain: e }) => {
        const { href: t } = n;
        return this.options.isAllowedUri(t, {
          defaultValidate: (r) => !!Je(r, this.options.protocols),
          protocols: this.options.protocols,
          defaultProtocol: this.options.defaultProtocol
        }) ? e().setMark(this.name, n).setMeta("preventAutolink", !0).run() : !1;
      },
      toggleLink: (n) => ({ chain: e }) => {
        const { href: t } = n || {};
        return t && !this.options.isAllowedUri(t, {
          defaultValidate: (r) => !!Je(r, this.options.protocols),
          protocols: this.options.protocols,
          defaultProtocol: this.options.defaultProtocol
        }) ? !1 : e().toggleMark(this.name, n, { extendEmptyMarkRange: !0 }).setMeta("preventAutolink", !0).run();
      },
      unsetLink: () => ({ chain: n }) => n().unsetMark(this.name, { extendEmptyMarkRange: !0 }).setMeta("preventAutolink", !0).run()
    };
  },
  addInputRules() {
    return this.options.markdownLinks ? [
      Uk({
        type: this.type,
        isAllowedHref: (n) => this.options.isAllowedUri(n, {
          defaultValidate: (e) => !!Je(e, this.options.protocols),
          protocols: this.options.protocols,
          defaultProtocol: this.options.defaultProtocol
        })
      })
    ] : [];
  },
  addPasteRules() {
    const n = (e) => {
      const t = [];
      if (e) {
        const { protocols: r, defaultProtocol: s } = this.options;
        Jf(e).filter(
          (o) => o.isLink && this.options.isAllowedUri(o.value, {
            defaultValidate: (a) => !!Je(a, r),
            protocols: r,
            defaultProtocol: s
          })
        ).forEach((o) => {
          this.options.shouldAutoLink(o.value) && t.push({
            text: o.value,
            data: {
              href: o.href
            },
            index: o.start
          });
        });
      }
      return t;
    };
    return this.options.markdownLinks ? [
      Kk({
        type: this.type,
        isAllowedHref: (e) => this.options.isAllowedUri(e, {
          defaultValidate: (t) => !!Je(t, this.options.protocols),
          protocols: this.options.protocols,
          defaultProtocol: this.options.defaultProtocol
        }),
        findPlainUrls: n
      })
    ] : [
      Ct({
        find: n,
        type: this.type,
        getAttributes: (e) => {
          var t;
          return {
            href: (t = e.data) == null ? void 0 : t.href
          };
        }
      })
    ];
  },
  addProseMirrorPlugins() {
    const n = [], { protocols: e, defaultProtocol: t } = this.options;
    return this.options.autolink && n.push(
      Fk({
        type: this.type,
        defaultProtocol: this.options.defaultProtocol,
        validate: (r) => this.options.isAllowedUri(r, {
          defaultValidate: (s) => !!Je(s, e),
          protocols: e,
          defaultProtocol: t
        }),
        shouldAutoLink: this.options.shouldAutoLink
      })
    ), n.push(
      Hk({
        type: this.type,
        editor: this.editor,
        openOnClick: this.options.openOnClick === "whenNotEditable" ? !0 : this.options.openOnClick,
        enableClickSelection: this.options.enableClickSelection
      })
    ), this.options.linkOnPaste && n.push(
      Jk({
        editor: this.editor,
        defaultProtocol: this.options.defaultProtocol,
        type: this.type,
        shouldAutoLink: this.options.shouldAutoLink
      })
    ), n;
  }
}), Yk = Object.defineProperty, Xk = (n, e) => {
  for (var t in e)
    Yk(n, t, { get: e[t], enumerable: !0 });
}, Qk = "listItem", Vd = "textStyle", Wd = /^\s*([-+*])\s$/, Zf = we.create({
  name: "bulletList",
  addOptions() {
    return {
      itemTypeName: "listItem",
      HTMLAttributes: {},
      keepMarks: !1,
      keepAttributes: !1
    };
  },
  group: "block list",
  content() {
    return `${this.options.itemTypeName}+`;
  },
  parseHTML() {
    return [{ tag: "ul" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["ul", Y(this.options.HTMLAttributes, n), 0];
  },
  markdownTokenName: "list",
  parseMarkdown: (n, e) => n.type !== "list" || n.ordered ? [] : {
    type: "bulletList",
    content: n.items ? e.parseChildren(n.items) : []
  },
  renderMarkdown: (n, e) => n.content ? e.renderChildren(n.content, `
`) : "",
  markdownOptions: {
    indentsContent: !0
  },
  addCommands() {
    return {
      toggleBulletList: () => ({ commands: n, chain: e }) => this.options.keepAttributes ? e().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(Qk, this.editor.getAttributes(Vd)).run() : n.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList()
    };
  },
  addInputRules() {
    let n = vn({
      find: Wd,
      type: this.type
    });
    return (this.options.keepMarks || this.options.keepAttributes) && (n = vn({
      find: Wd,
      type: this.type,
      keepMarks: this.options.keepMarks,
      keepAttributes: this.options.keepAttributes,
      getAttributes: () => this.editor.getAttributes(Vd),
      editor: this.editor
    })), [n];
  }
}), Zk = (n, e, t) => {
  const { selection: r } = n;
  if (!r.empty)
    return null;
  const { $from: s } = r;
  if (!s.parent.isTextblock || s.parentOffset !== s.parent.content.size)
    return null;
  let i = -1;
  for (let f = s.depth; f > 0; f -= 1)
    if (s.node(f).type.name === e) {
      i = f;
      break;
    }
  if (i < 0)
    return null;
  const o = s.node(i), a = s.index(i);
  if (a + 1 >= o.childCount)
    return null;
  const l = o.child(a + 1);
  if (!t.includes(l.type.name))
    return null;
  const c = n.schema.nodes[e];
  let d = !1;
  if (l.forEach((f) => {
    f.type === c && f.childCount > 1 && (d = !0);
  }), !d)
    return null;
  const u = n.doc.resolve(s.after()).nodeAfter;
  if (!u || !t.includes(u.type.name))
    return null;
  const h = [];
  return u.forEach((f) => {
    h.push(f);
  }), h.length === 0 ? null : {
    listItemDepth: i,
    nestedList: u,
    nestedListPos: s.after(),
    insertPos: s.after(i),
    items: h
  };
}, ex = (n, e, t, r) => {
  const s = Zk(n, t, r);
  if (!s)
    return !1;
  const { selection: i } = n, { nestedList: o, nestedListPos: a, insertPos: l, items: c } = s, d = n.tr;
  d.delete(a, a + o.nodeSize);
  const u = d.mapping.map(l);
  return d.insert(u, b.from(c)), d.setSelection(i.map(d.doc, d.mapping)), e && e(d), !0;
}, tx = (n, e, t) => ex(n.state, n.view.dispatch, e, t), ep = (n, e) => W.create({
  name: `${n}BranchingDeleteKeymap`,
  priority: 101,
  addKeyboardShortcuts() {
    const t = () => tx(this.editor, n, e);
    return {
      Delete: t,
      "Mod-Delete": t
    };
  }
}), tp = [
  [1e3, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"]
], ds = "abcdefghijklmnopqrstuvwxyz", nx = "[a-zA-Z]{1,2}", np = String.raw`\d+|[ivxlcdmIVXLCDM]+|${nx}`;
function No(n) {
  let e = n, t = "";
  for (const [r, s] of tp)
    for (; e >= r; )
      t += s, e -= r;
  return t;
}
function Ul(n) {
  return No(n).toUpperCase();
}
function rp(n) {
  const e = n.toLowerCase();
  let t = 0, r = 0;
  for (; t < e.length; ) {
    let s = !1;
    for (const [i, o] of tp)
      if (e.startsWith(o, t)) {
        r += i, t += o.length, s = !0;
        break;
      }
    if (!s)
      return 0;
  }
  return r;
}
function rx(n) {
  if (!/^[ivxlcdmIVXLCDM]+$/.test(n))
    return !1;
  const e = rp(n);
  return e <= 0 ? !1 : (n === n.toLowerCase() ? No(e) : Ul(e)) === n;
}
function sx(n) {
  const e = n.toLowerCase();
  if (e.length === 1)
    return e.charCodeAt(0) - 97 + 1;
  if (e.length === 2) {
    const t = e.charCodeAt(0) - 97, r = e.charCodeAt(1) - 97;
    return (t + 1) * 26 + r + 1;
  }
  return 0;
}
function oo(n) {
  if (n <= 26)
    return ds[n - 1];
  const e = Math.floor((n - 1) / 26) - 1, t = (n - 1) % 26;
  return e < 0 ? ds[t] : ds[e] + ds[t];
}
function $o(n) {
  if (!(!n || /^\d+$/.test(n))) {
    if (rx(n))
      return n === n.toLowerCase() ? "i" : "I";
    if (/^[a-z]{1,2}$/.test(n))
      return "a";
    if (/^[A-Z]{1,2}$/.test(n))
      return "A";
  }
}
function Kl(n) {
  if (/^\d+$/.test(n))
    return parseInt(n, 10);
  const e = $o(n);
  if (e === "i" || e === "I")
    return rp(n);
  if (e === "a" || e === "A") {
    const r = sx(n);
    return r > 0 ? r : 1;
  }
  const t = parseInt(n, 10);
  return Number.isNaN(t) ? 1 : t;
}
function ix(n, e) {
  if (n === "numeric")
    return String(e);
  switch (n) {
    case "a":
      return oo(e);
    case "A":
      return oo(e).toUpperCase();
    case "i":
      return No(e);
    case "I":
      return Ul(e);
    default:
      return String(e);
  }
}
function ox(n) {
  var e;
  if (n.length === 0)
    return !1;
  const t = (e = $o(n[0])) != null ? e : "numeric", r = Kl(n[0]);
  if (r < 1)
    return !1;
  for (let s = 0; s < n.length; s++) {
    const i = ix(t, r + s);
    if (n[s] !== i)
      return !1;
  }
  return !0;
}
function ax(n) {
  return {
    type: $o(n),
    start: Kl(n)
  };
}
function lx(n) {
  const { type: e, start: t } = ax(n), r = {};
  return e && (r.type = e), t !== 1 && (r.start = t), r;
}
function cx(n, e, t = ". ") {
  const r = e + 1;
  if (!n || n === "1")
    return `${r}${t}`;
  switch (n) {
    case "a":
      return `${oo(r)}${t}`;
    case "A":
      return `${oo(r).toUpperCase()}${t}`;
    case "i":
      return `${No(r)}${t}`;
    case "I":
      return `${Ul(r)}${t}`;
    default:
      return `${r}${t}`;
  }
}
function dx(n) {
  var e, t;
  const r = (e = n.tokens) == null ? void 0 : e[0];
  return !!(n.text && ((t = n.tokens) == null ? void 0 : t.length) === 1 && (r == null ? void 0 : r.type) === "list" && r.ordered && r.raw === n.text);
}
function ux(n, e) {
  return e.tokenizeInline ? e.parseInline(e.tokenizeInline(n)) : e.parseInline([
    {
      type: "text",
      raw: n,
      text: n
    }
  ]);
}
var sp = we.create({
  name: "listItem",
  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: "bulletList",
      orderedListTypeName: "orderedList"
    };
  },
  content: "paragraph block*",
  defining: !0,
  parseHTML() {
    return [
      {
        tag: "li"
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["li", Y(this.options.HTMLAttributes, n), 0];
  },
  markdownTokenName: "list_item",
  parseMarkdown: (n, e) => {
    var t;
    if (n.type !== "list_item")
      return [];
    const r = (t = e.parseBlockChildren) != null ? t : e.parseChildren;
    let s = [];
    if (n.tokens && n.tokens.length > 0) {
      if (dx(n))
        return {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: ux(n.text || "", e)
            }
          ]
        };
      if (n.tokens.some((o) => o.type === "paragraph"))
        s = r(n.tokens);
      else {
        const o = n.tokens[0];
        if (o && o.type === "text" && o.tokens && o.tokens.length > 0) {
          if (s = [
            {
              type: "paragraph",
              content: e.parseInline(o.tokens)
            }
          ], n.tokens.length > 1) {
            const l = n.tokens.slice(1), c = r(l);
            s.push(...c);
          }
        } else
          s = r(n.tokens);
      }
    }
    return s.length === 0 && (s = [
      {
        type: "paragraph",
        content: []
      }
    ]), {
      type: "listItem",
      content: s
    };
  },
  renderMarkdown: (n, e, t) => Pl(
    n,
    e,
    (r) => {
      var s, i, o, a;
      if (r.parentType === "bulletList")
        return "- ";
      if (r.parentType === "orderedList") {
        const l = ((i = (s = r.meta) == null ? void 0 : s.parentAttrs) == null ? void 0 : i.start) || 1, c = (a = (o = r.meta) == null ? void 0 : o.parentAttrs) == null ? void 0 : a.type, d = l - 1 + (r.index || 0);
        return cx(c, d, ". ");
      }
      return "- ";
    },
    t
  ),
  addExtensions() {
    return [
      ep(this.name, [
        this.options.bulletListTypeName,
        this.options.orderedListTypeName
      ])
    ];
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name)
    };
  }
}), hx = {};
Xk(hx, {
  findListItemPos: () => Io,
  getNextListDepth: () => Jl,
  handleBackspace: () => el,
  handleDelete: () => tl,
  hasListBefore: () => ip,
  hasListItemAfter: () => fx,
  hasListItemBefore: () => px,
  listItemHasSubList: () => mx,
  nextListIsDeeper: () => op,
  nextListIsHigher: () => ap
});
var Io = (n, e) => {
  const { $from: t } = e.selection, r = G(n, e.schema);
  let s = null, i = t.depth, o = t.pos, a = null;
  for (; i > 0 && a === null; )
    s = t.node(i), s.type === r ? a = i : (i -= 1, o -= 1);
  return a === null ? null : { $pos: e.doc.resolve(o), depth: a };
}, Jl = (n, e) => {
  const t = Io(n, e);
  if (!t)
    return !1;
  const [, r] = Xv(e, n, t.$pos.pos + 4);
  return r;
}, ip = (n, e, t) => {
  const { $anchor: r } = n.selection, s = Math.max(0, r.pos - 2), i = n.doc.resolve(s).node();
  return !(!i || !t.includes(i.type.name));
}, el = (n, e, t) => {
  if (n.commands.undoInputRule())
    return !0;
  if (n.state.selection.from !== n.state.selection.to)
    return !1;
  if (!St(n.state, e) && ip(n.state, e, t)) {
    const { $anchor: r } = n.state.selection, s = n.state.doc.resolve(r.before() - 1), i = [];
    s.node().descendants((l, c) => {
      l.type.name === e && i.push({ node: l, pos: c });
    });
    const o = i.at(-1);
    if (!o)
      return !1;
    const a = n.state.doc.resolve(s.start() + o.pos + 1);
    return n.chain().cut({ from: r.start() - 1, to: r.end() + 1 }, a.end()).joinForward().run();
  }
  return !St(n.state, e) || !t0(n.state) ? !1 : n.chain().liftListItem(e).run();
}, op = (n, e) => {
  const t = Jl(n, e), r = Io(n, e);
  return !r || !t ? !1 : t > r.depth;
}, ap = (n, e) => {
  const t = Jl(n, e), r = Io(n, e);
  return !r || !t ? !1 : t < r.depth;
}, tl = (n, e) => {
  if (!St(n.state, e) || !e0(n.state, e))
    return !1;
  const { selection: t } = n.state, { $from: r, $to: s } = t;
  return !t.empty && r.sameParent(s) ? !1 : op(e, n.state) ? n.chain().focus(n.state.selection.from + 4).lift(e).joinBackward().run() : ap(e, n.state) ? n.chain().joinForward().joinBackward().run() : n.commands.joinItemForward();
}, fx = (n, e) => {
  var t;
  const { $anchor: r } = e.selection, s = e.doc.resolve(r.pos - r.parentOffset - 2);
  return !(s.index() === s.parent.childCount - 1 || ((t = s.nodeAfter) == null ? void 0 : t.type.name) !== n);
}, px = (n, e) => {
  var t;
  const { $anchor: r } = e.selection, s = e.doc.resolve(r.pos - 2);
  return !(s.index() === 0 || ((t = s.nodeBefore) == null ? void 0 : t.type.name) !== n);
}, mx = (n, e, t) => {
  if (!t)
    return !1;
  const r = G(n, e.schema);
  let s = !1;
  return t.descendants((i) => {
    i.type === r && (s = !0);
  }), s;
}, lp = W.create({
  name: "listKeymap",
  addOptions() {
    return {
      listTypes: [
        {
          itemName: "listItem",
          wrapperNames: ["bulletList", "orderedList"]
        },
        {
          itemName: "taskItem",
          wrapperNames: ["taskList"]
        }
      ]
    };
  },
  addKeyboardShortcuts() {
    return {
      Delete: ({ editor: n }) => {
        let e = !1;
        return this.options.listTypes.forEach(({ itemName: t }) => {
          n.state.schema.nodes[t] !== void 0 && tl(n, t) && (e = !0);
        }), e;
      },
      "Mod-Delete": ({ editor: n }) => {
        let e = !1;
        return this.options.listTypes.forEach(({ itemName: t }) => {
          n.state.schema.nodes[t] !== void 0 && tl(n, t) && (e = !0);
        }), e;
      },
      Backspace: ({ editor: n }) => {
        let e = !1;
        return this.options.listTypes.forEach(({ itemName: t, wrapperNames: r }) => {
          n.state.schema.nodes[t] !== void 0 && el(n, t, r) && (e = !0);
        }), e;
      },
      "Mod-Backspace": ({ editor: n }) => {
        let e = !1;
        return this.options.listTypes.forEach(({ itemName: t, wrapperNames: r }) => {
          n.state.schema.nodes[t] !== void 0 && el(n, t, r) && (e = !0);
        }), e;
      }
    };
  }
}), nl = new RegExp(
  `^(\\s*)(${np})([.)])\\s+(.*)$`
), gx = /^\s/, Wn = {
  heading: /^#{1,6}(?:\s|$)/,
  bulletItem: /^[-+*]\s+/,
  codeFence: /^(?:```|~~~)/,
  thematicBreak: /^(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/
};
function yx(n) {
  return nl.test(n.trimStart());
}
function bx(n) {
  const e = n.trimStart();
  return Wn.bulletItem.test(e) || yx(e) || Wn.heading.test(e) || // dash breaks are excluded: "---" directly below paragraph text is a
  // setext heading underline, not a thematic break
  Wn.thematicBreak.test(e) && !e.startsWith("-") || // oxlint-disable-next-line prefer-string-starts-ends-with
  /^>\s?/.test(e) || Wn.codeFence.test(e);
}
function vx(n) {
  return Object.values(Wn).some((e) => e.test(n));
}
function kx(n) {
  const e = [], t = [];
  let r = !1;
  return n.forEach((s) => {
    if (r) {
      t.push(s);
      return;
    }
    if (s.trim() === "") {
      r = !0, t.push(s);
      return;
    }
    if (e.length > 0 && bx(s)) {
      r = !0, t.push(s);
      return;
    }
    e.push(s);
  }), {
    paragraphLines: e,
    blockLines: t
  };
}
function xx(n) {
  const e = [];
  let t = 0, r = 0;
  for (; t < n.length; ) {
    const s = n[t], i = s.match(nl);
    if (!i)
      break;
    const [, o, a, l, c] = i, d = o.length, u = parseInt(a, 10), h = isNaN(u) ? $o(a) : void 0, f = isNaN(u) ? Kl(a) : u, p = [c];
    let m = t + 1;
    const g = [s];
    let y = !1;
    for (; m < n.length; ) {
      const k = n[m];
      if (k.match(nl))
        break;
      if (k.trim() === "")
        g.push(k), p.push(""), y = !0, m += 1;
      else if (k.match(gx)) {
        const S = k.length - k.trimStart().length, A = d + a.length + 1;
        g.push(k), p.push(k.slice(Math.min(S, A))), m += 1;
      } else {
        if (y || vx(k))
          break;
        g.push(k), p.push(k), m += 1;
      }
    }
    e.push({
      indent: d,
      number: f,
      type: h,
      content: p.join(`
`).trim(),
      contentLines: p,
      raw: g.join(`
`)
    }), r = m, t = m;
  }
  return [e, r];
}
var wx = new RegExp(
  `^(${np})([.)])\\s+(.+)$`
);
function Sx(n) {
  const e = n.split(`
`).filter((i) => i.trim().length > 0);
  if (e.length === 0)
    return null;
  const t = [];
  for (const i of e) {
    const o = i.trim().match(wx);
    if (!o)
      return null;
    t.push({
      marker: o[1],
      content: o[3]
    });
  }
  const r = t.map((i) => i.marker);
  return ox(r) ? {
    type: "orderedList",
    attrs: lx(t[0].marker),
    content: t.map((i) => ({
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: i.content }]
        }
      ]
    }))
  } : null;
}
function cp(n, e, t) {
  const r = [];
  let s = 0;
  for (; s < n.length; ) {
    const i = n[s];
    if (i.indent === e) {
      const { paragraphLines: o, blockLines: a } = kx(i.contentLines), l = o.join(`
`).trim(), c = [];
      l && c.push({
        type: "paragraph",
        raw: l,
        tokens: t.inlineTokens(l)
      });
      const d = a.join(`
`).trim();
      if (d) {
        const f = t.blockTokens(d);
        c.push(...f);
      }
      let u = s + 1;
      const h = [];
      for (; u < n.length && n[u].indent > e; )
        h.push(n[u]), u += 1;
      if (h.length > 0) {
        const f = Math.min(...h.map((m) => m.indent)), p = cp(h, f, t);
        c.push({
          type: "list",
          ordered: !0,
          start: h[0].number,
          typeMarker: h[0].type,
          items: p,
          raw: h.map((m) => m.raw).join(`
`)
        });
      }
      r.push({
        type: "list_item",
        raw: i.raw,
        tokens: c
      }), s = u;
    } else
      s += 1;
  }
  return r;
}
function Cx(n, e) {
  return n.map((t) => {
    if (t.type !== "list_item")
      return e.parseChildren([t])[0];
    const r = [];
    return t.tokens && t.tokens.length > 0 && t.tokens.forEach((s) => {
      if (s.type === "paragraph" || s.type === "list" || s.type === "blockquote" || s.type === "code")
        r.push(...e.parseChildren([s]));
      else if (s.type === "text" && s.tokens) {
        const i = e.parseChildren([s]);
        r.push({
          type: "paragraph",
          content: i
        });
      } else {
        const i = e.parseChildren([s]);
        i.length > 0 && r.push(...i);
      }
    }), {
      type: "listItem",
      content: r
    };
  });
}
var Mx = "listItem", jd = "textStyle", qd = /^(\d+)\.\s$/;
function Ud(n) {
  const e = n.match(/list-style-type\s*:\s*([^;]+)/i);
  if (!e)
    return null;
  switch (e[1].trim().toLowerCase()) {
    case "upper-roman":
      return "I";
    case "lower-roman":
      return "i";
    case "upper-alpha":
    case "upper-latin":
      return "A";
    case "lower-alpha":
    case "lower-latin":
      return "a";
    default:
      return null;
  }
}
var dp = we.create({
  name: "orderedList",
  addOptions() {
    return {
      itemTypeName: "listItem",
      HTMLAttributes: {},
      keepMarks: !1,
      keepAttributes: !1
    };
  },
  group: "block list",
  content() {
    return `${this.options.itemTypeName}+`;
  },
  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (n) => n.hasAttribute("start") ? parseInt(n.getAttribute("start") || "", 10) : 1
      },
      type: {
        default: null,
        parseHTML: (n) => {
          const e = n.getAttribute("type");
          if (e)
            return e;
          const t = n.getAttribute("style");
          if (t) {
            const s = Ud(t);
            if (s)
              return s;
          }
          const r = n.querySelector("li");
          if (r) {
            const s = r.getAttribute("style");
            if (s) {
              const i = Ud(s);
              if (i)
                return i;
            }
          }
          return null;
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "ol"
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    const { start: e, type: t, ...r } = n, s = Y(this.options.HTMLAttributes, r);
    return e !== 1 && (s.start = e), t && t !== "1" && (s.type = t), ["ol", s, 0];
  },
  markdownTokenName: "list",
  parseMarkdown: (n, e) => {
    if (n.type !== "list" || !n.ordered)
      return [];
    const t = n.start || 1, r = n.typeMarker, s = n.items ? Cx(n.items, e) : [], i = {};
    return t !== 1 && (i.start = t), r && (i.type = r), Object.keys(i).length > 0 ? {
      type: "orderedList",
      attrs: i,
      content: s
    } : {
      type: "orderedList",
      content: s
    };
  },
  renderMarkdown: (n, e) => n.content ? e.renderChildren(n.content, `
`) : "",
  markdownTokenizer: {
    name: "orderedList",
    level: "block",
    // marked already breaks paragraphs before a start-of-line list marker. It
    // probes this with `src.slice(1)`, so any marker it surfaces here is
    // mid-line (like the "216)" in "(216) 555-1234") and must not start a list.
    // We still define the callback so marked does not fall back to probing
    // `tokenize`, which would re-introduce the mid-line split.
    start: () => -1,
    tokenize: (n, e, t) => {
      var r, s;
      const i = n.split(`
`), [o, a] = xx(i);
      if (o.length === 0)
        return;
      const l = cp(o, o[0].indent, t);
      if (l.length === 0)
        return;
      const c = ((r = o[0]) == null ? void 0 : r.number) || 1, d = (s = o[0]) == null ? void 0 : s.type;
      return {
        type: "list",
        ordered: !0,
        start: c,
        typeMarker: d,
        items: l,
        raw: i.slice(0, a).join(`
`)
      };
    }
  },
  markdownOptions: {
    indentsContent: !0
  },
  addCommands() {
    return {
      toggleOrderedList: () => ({ commands: n, chain: e }) => this.options.keepAttributes ? e().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(Mx, this.editor.getAttributes(jd)).run() : n.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-7": () => this.editor.commands.toggleOrderedList()
    };
  },
  addProseMirrorPlugins() {
    return [
      new F({
        props: {
          handlePaste: (n, e) => {
            var t, r;
            const s = (t = e.clipboardData) == null ? void 0 : t.getData("text/html");
            if (s != null && s.trim())
              return !1;
            const i = (r = e.clipboardData) == null ? void 0 : r.getData("text/plain");
            if (!i)
              return !1;
            const o = Sx(i);
            if (!o)
              return !1;
            try {
              const a = n.state.schema.nodeFromJSON(o), l = n.state.tr.replaceSelectionWith(a);
              return n.dispatch(l), !0;
            } catch {
              return !1;
            }
          }
        }
      })
    ];
  },
  addInputRules() {
    const n = (t, r) => (!r.attrs.type || r.attrs.type === "1") && r.childCount + r.attrs.start === +t[1];
    let e = vn({
      find: qd,
      type: this.type,
      getAttributes: (t) => ({ start: +t[1] }),
      joinPredicate: n
    });
    return (this.options.keepMarks || this.options.keepAttributes) && (e = vn({
      find: qd,
      type: this.type,
      keepMarks: this.options.keepMarks,
      keepAttributes: this.options.keepAttributes,
      getAttributes: (t) => ({ start: +t[1], ...this.editor.getAttributes(jd) }),
      joinPredicate: n,
      editor: this.editor
    })), [e];
  }
}), Ex = /^\s*(\[([( |x])?\])\s$/, Tx = we.create({
  name: "taskItem",
  addOptions() {
    return {
      nested: !1,
      HTMLAttributes: {},
      taskListTypeName: "taskList",
      a11y: void 0
    };
  },
  content() {
    return this.options.nested ? "paragraph block*" : "paragraph+";
  },
  defining: !0,
  addAttributes() {
    return {
      checked: {
        default: !1,
        keepOnSplit: !1,
        parseHTML: (n) => {
          const e = n.getAttribute("data-checked");
          return e === "" || e === "true";
        },
        renderHTML: (n) => ({
          "data-checked": n.checked
        })
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: `li[data-type="${this.name}"]`,
        priority: 51
      }
    ];
  },
  renderHTML({ node: n, HTMLAttributes: e }) {
    return [
      "li",
      Y(this.options.HTMLAttributes, e, {
        "data-type": this.name
      }),
      [
        "label",
        [
          "input",
          {
            type: "checkbox",
            checked: n.attrs.checked ? "checked" : null
          }
        ],
        ["span"]
      ],
      ["div", 0]
    ];
  },
  parseMarkdown: (n, e) => {
    const t = [];
    if (n.tokens && n.tokens.length > 0 ? t.push(e.createNode("paragraph", {}, e.parseInline(n.tokens))) : n.text ? t.push(e.createNode("paragraph", {}, [e.createNode("text", { text: n.text })])) : t.push(e.createNode("paragraph", {}, [])), n.nestedTokens && n.nestedTokens.length > 0) {
      const r = e.parseChildren(n.nestedTokens);
      t.push(...r);
    }
    return e.createNode("taskItem", { checked: n.checked || !1 }, t);
  },
  renderMarkdown: (n, e) => {
    var t;
    const s = `- [${(t = n.attrs) != null && t.checked ? "x" : " "}] `;
    return Pl(n, e, s);
  },
  addExtensions() {
    return this.options.nested ? [ep(this.name, [this.options.taskListTypeName])] : [];
  },
  addKeyboardShortcuts() {
    const n = {
      Enter: () => this.editor.commands.splitListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name)
    };
    return this.options.nested ? {
      ...n,
      Tab: () => this.editor.commands.sinkListItem(this.name)
    } : n;
  },
  addNodeView() {
    return ({ node: n, HTMLAttributes: e, getPos: t, editor: r }) => {
      const s = document.createElement("li"), i = document.createElement("label"), o = document.createElement("span"), a = document.createElement("input"), l = document.createElement("div"), c = (u) => {
        var h, f;
        a.ariaLabel = ((f = (h = this.options.a11y) == null ? void 0 : h.checkboxLabel) == null ? void 0 : f.call(h, u, a.checked)) || `Task item checkbox for ${u.textContent || "empty task item"}`;
      };
      c(n), i.contentEditable = "false", a.type = "checkbox", a.addEventListener("mousedown", (u) => u.preventDefault()), a.addEventListener("change", (u) => {
        if (!r.isEditable && !this.options.onReadOnlyChecked) {
          a.checked = !a.checked;
          return;
        }
        const { checked: h } = u.target;
        r.isEditable && typeof t == "function" && r.chain().focus(void 0, { scrollIntoView: !1 }).command(({ tr: f }) => {
          const p = t();
          if (typeof p != "number")
            return !1;
          const m = f.doc.nodeAt(p);
          return f.setNodeMarkup(p, void 0, {
            ...m == null ? void 0 : m.attrs,
            checked: h
          }), !0;
        }).run(), !r.isEditable && this.options.onReadOnlyChecked && (this.options.onReadOnlyChecked(n, h) || (a.checked = !a.checked));
      }), Object.entries(this.options.HTMLAttributes).forEach(([u, h]) => {
        s.setAttribute(u, h);
      }), s.dataset.checked = n.attrs.checked, a.checked = n.attrs.checked, i.append(a, o), s.append(i, l), Object.entries(e).forEach(([u, h]) => {
        s.setAttribute(u, h);
      });
      let d = new Set(Object.keys(e));
      return {
        dom: s,
        contentDOM: l,
        update: (u) => {
          if (u.type !== this.type)
            return !1;
          s.dataset.checked = u.attrs.checked, a.checked = u.attrs.checked, c(u);
          const h = r.extensionManager.attributes, f = yr(u, h), p = new Set(Object.keys(f)), m = this.options.HTMLAttributes;
          return d.forEach((g) => {
            p.has(g) || (g in m ? s.setAttribute(g, m[g]) : s.removeAttribute(g));
          }), Object.entries(f).forEach(([g, y]) => {
            y == null ? g in m ? s.setAttribute(g, m[g]) : s.removeAttribute(g) : s.setAttribute(g, y);
          }), d = p, !0;
        }
      };
    };
  },
  addInputRules() {
    return [
      vn({
        find: Ex,
        type: this.type,
        getAttributes: (n) => ({
          checked: n[n.length - 1] === "x"
        })
      })
    ];
  }
}), Ax = we.create({
  name: "taskList",
  addOptions() {
    return {
      itemTypeName: "taskItem",
      HTMLAttributes: {}
    };
  },
  group: "block list",
  content() {
    return `${this.options.itemTypeName}+`;
  },
  parseHTML() {
    return [
      {
        tag: `ul[data-type="${this.name}"]`,
        priority: 51
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return [
      "ul",
      Y(this.options.HTMLAttributes, n, { "data-type": this.name }),
      0
    ];
  },
  parseMarkdown: (n, e) => e.createNode("taskList", {}, e.parseChildren(n.items || [])),
  renderMarkdown: (n, e) => n.content ? e.renderChildren(n.content, `
`) : "",
  markdownTokenizer: {
    name: "taskList",
    level: "block",
    start(n) {
      var e;
      const t = (e = n.match(/^\s*[-+*]\s+\[([ xX])\]\s+/)) == null ? void 0 : e.index;
      return t !== void 0 ? t : -1;
    },
    tokenize(n, e, t) {
      const r = (i) => {
        const o = ja(
          i,
          {
            itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/,
            extractItemData: (a) => ({
              indentLevel: a[1].length,
              mainContent: a[4],
              checked: a[3].toLowerCase() === "x"
            }),
            createToken: (a, l) => ({
              type: "taskItem",
              raw: "",
              mainContent: a.mainContent,
              indentLevel: a.indentLevel,
              checked: a.checked,
              text: a.mainContent,
              tokens: t.inlineTokens(a.mainContent),
              nestedTokens: l
            }),
            // Allow recursive nesting
            customNestedParser: r
          },
          t
        );
        if (o) {
          const a = {
            type: "taskList",
            raw: o.raw,
            items: o.items
          }, l = i.slice(o.raw.length);
          return l.trim() ? [a, ...t.blockTokens(l)] : [a];
        }
        return t.blockTokens(i);
      }, s = ja(
        n,
        {
          itemPattern: /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/,
          extractItemData: (i) => ({
            indentLevel: i[1].length,
            mainContent: i[4],
            checked: i[3].toLowerCase() === "x"
          }),
          createToken: (i, o) => ({
            type: "taskItem",
            raw: "",
            mainContent: i.mainContent,
            indentLevel: i.indentLevel,
            checked: i.checked,
            text: i.mainContent,
            tokens: t.inlineTokens(i.mainContent),
            nestedTokens: o
          }),
          // Use the recursive parser for nested content
          customNestedParser: r
        },
        t
      );
      if (s)
        return {
          type: "taskList",
          raw: s.raw,
          items: s.items
        };
    }
  },
  markdownOptions: {
    indentsContent: !0
  },
  addCommands() {
    return {
      toggleTaskList: () => ({ commands: n }) => n.toggleList(this.name, this.options.itemTypeName)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-9": () => this.editor.commands.toggleTaskList()
    };
  }
});
W.create({
  name: "listKit",
  addExtensions() {
    const n = [];
    return this.options.bulletList !== !1 && n.push(Zf.configure(this.options.bulletList)), this.options.listItem !== !1 && n.push(sp.configure(this.options.listItem)), this.options.listKeymap !== !1 && n.push(lp.configure(this.options.listKeymap)), this.options.orderedList !== !1 && n.push(dp.configure(this.options.orderedList)), this.options.taskItem !== !1 && n.push(Tx.configure(this.options.taskItem)), this.options.taskList !== !1 && n.push(Ax.configure(this.options.taskList)), n;
  }
});
var us = "&nbsp;", ya = " ", _x = we.create({
  name: "paragraph",
  priority: 1e3,
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "p" }];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["p", Y(this.options.HTMLAttributes, n), 0];
  },
  parseMarkdown: (n, e) => {
    const t = n.tokens || [];
    if (t.length === 1 && t[0].type === "image")
      return e.parseChildren([t[0]]);
    const r = e.parseInline(t);
    return t.length === 1 && t[0].type === "text" && (t[0].raw === us || t[0].text === us || t[0].raw === ya || t[0].text === ya) && r.length === 1 && r[0].type === "text" && (r[0].text === us || r[0].text === ya) ? e.createNode("paragraph", void 0, []) : e.createNode("paragraph", void 0, r);
  },
  renderMarkdown: (n, e, t) => {
    var r, s;
    if (!n)
      return "";
    const i = Array.isArray(n.content) ? n.content : [];
    if (i.length === 0) {
      const o = Array.isArray((r = t == null ? void 0 : t.previousNode) == null ? void 0 : r.content) ? t.previousNode.content : [];
      return ((s = t == null ? void 0 : t.previousNode) == null ? void 0 : s.type) === "paragraph" && o.length === 0 ? us : "";
    }
    return e.renderChildren(i);
  },
  addCommands() {
    return {
      setParagraph: () => ({ commands: n }) => n.setNode(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Alt-0": () => this.editor.commands.setParagraph()
    };
  }
}), Ox = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/, Nx = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g, $x = Zt.create({
  name: "strike",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      {
        tag: "s"
      },
      {
        tag: "del"
      },
      {
        tag: "strike"
      },
      {
        style: "text-decoration",
        consuming: !1,
        getAttrs: (n) => n.includes("line-through") ? {} : !1
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["s", Y(this.options.HTMLAttributes, n), 0];
  },
  markdownTokenName: "del",
  parseMarkdown: (n, e) => e.applyMark("strike", e.parseInline(n.tokens || [])),
  renderMarkdown: (n, e) => `~~${e.renderChildren(n)}~~`,
  addCommands() {
    return {
      setStrike: () => ({ commands: n }) => n.setMark(this.name),
      toggleStrike: () => ({ commands: n }) => n.toggleMark(this.name),
      unsetStrike: () => ({ commands: n }) => n.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-s": () => this.editor.commands.toggleStrike()
    };
  },
  addInputRules() {
    return [
      Yt({
        find: Ox,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      Ct({
        find: Nx,
        type: this.type
      })
    ];
  }
}), Ix = we.create({
  name: "text",
  group: "inline",
  parseMarkdown: (n) => ({
    type: "text",
    text: n.text || ""
  }),
  renderMarkdown: (n) => n.text || ""
}), Dx = Zt.create({
  name: "underline",
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      {
        tag: "u"
      },
      {
        style: "text-decoration",
        consuming: !1,
        getAttrs: (n) => n.includes("underline") ? {} : !1
      }
    ];
  },
  renderHTML({ HTMLAttributes: n }) {
    return ["u", Y(this.options.HTMLAttributes, n), 0];
  },
  parseMarkdown(n, e) {
    return e.applyMark(this.name || "underline", e.parseInline(n.tokens || []));
  },
  renderMarkdown(n, e) {
    return `++${e.renderChildren(n)}++`;
  },
  markdownTokenizer: {
    name: "underline",
    level: "inline",
    start(n) {
      return n.indexOf("++");
    },
    tokenize(n, e, t) {
      const s = /^(\+\+)([\s\S]+?)(\+\+)/.exec(n);
      if (!s)
        return;
      const i = s[2].trim();
      return {
        type: "underline",
        raw: s[0],
        text: i,
        tokens: t.inlineTokens(i)
      };
    }
  },
  addCommands() {
    return {
      setUnderline: () => ({ commands: n }) => n.setMark(this.name),
      toggleUnderline: () => ({ commands: n }) => n.toggleMark(this.name),
      unsetUnderline: () => ({ commands: n }) => n.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleUnderline(),
      "Mod-U": () => this.editor.commands.toggleUnderline()
    };
  }
});
function Px(n = {}) {
  return new F({
    view(e) {
      return new Rx(e, n);
    }
  });
}
class Rx {
  constructor(e, t) {
    var r;
    this.editorView = e, this.cursorPos = null, this.element = null, this.timeout = -1, this.lastDragEvent = null, this.width = (r = t.width) !== null && r !== void 0 ? r : 1, this.color = t.color === !1 ? void 0 : t.color || "black", this.class = t.class, this.handlers = ["dragover", "dragend", "drop", "dragleave"].map((s) => {
      let i = (o) => {
        this[s](o);
      };
      return e.dom.addEventListener(s, i), { name: s, handler: i };
    });
  }
  destroy() {
    this.handlers.forEach(({ name: e, handler: t }) => this.editorView.dom.removeEventListener(e, t));
  }
  update(e, t) {
    if (this.cursorPos != null && t.doc != e.state.doc)
      if (this.lastDragEvent) {
        let r = this.computeTarget(this.lastDragEvent);
        r == this.cursorPos ? this.updateOverlay() : this.setCursor(r);
      } else
        this.updateOverlay();
  }
  setCursor(e) {
    e != this.cursorPos && (this.cursorPos = e, e == null ? (this.element.parentNode.removeChild(this.element), this.element = null) : this.updateOverlay());
  }
  updateOverlay() {
    let e = this.editorView.state.doc.resolve(this.cursorPos), t = !e.parent.inlineContent, r, s = this.editorView.dom, i = s.getBoundingClientRect(), o = i.width / s.offsetWidth, a = i.height / s.offsetHeight;
    if (t) {
      let u = e.nodeBefore, h = e.nodeAfter;
      if (u || h) {
        let f = this.editorView.nodeDOM(this.cursorPos - (u ? u.nodeSize : 0));
        if (f) {
          let p = f.getBoundingClientRect(), m = u ? p.bottom : p.top;
          u && h && (m = (m + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2);
          let g = this.width / 2 * a;
          r = { left: p.left, right: p.right, top: m - g, bottom: m + g };
        }
      }
    }
    if (!r) {
      let u = this.editorView.coordsAtPos(this.cursorPos), h = this.width / 2 * o;
      r = { left: u.left - h, right: u.left + h, top: u.top, bottom: u.bottom };
    }
    let l = this.editorView.dom.offsetParent;
    this.element || (this.element = l.appendChild(document.createElement("div")), this.class && (this.element.className = this.class), this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;", this.color && (this.element.style.backgroundColor = this.color)), this.element.classList.toggle("prosemirror-dropcursor-block", t), this.element.classList.toggle("prosemirror-dropcursor-inline", !t);
    let c, d;
    if (!l || l == document.body && getComputedStyle(l).position == "static")
      c = -pageXOffset, d = -pageYOffset;
    else {
      let u = l.getBoundingClientRect(), h = u.width / l.offsetWidth, f = u.height / l.offsetHeight;
      c = u.left - l.scrollLeft * h, d = u.top - l.scrollTop * f;
    }
    this.element.style.left = (r.left - c) / o + "px", this.element.style.top = (r.top - d) / a + "px", this.element.style.width = (r.right - r.left) / o + "px", this.element.style.height = (r.bottom - r.top) / a + "px";
  }
  scheduleRemoval(e) {
    clearTimeout(this.timeout), this.timeout = setTimeout(() => this.setCursor(null), e);
  }
  computeTarget(e) {
    let t = this.editorView.posAtCoords({ left: e.clientX, top: e.clientY }), r = t && t.inside >= 0 && this.editorView.state.doc.nodeAt(t.inside), s = r && r.type.spec.disableDropCursor, i = typeof s == "function" ? s(this.editorView, t, e) : s;
    if (!t || i)
      return null;
    let o = t.pos;
    if (this.editorView.dragging && this.editorView.dragging.slice) {
      let a = Zu(this.editorView.state.doc, o, this.editorView.dragging.slice);
      a != null && (o = a);
    }
    return o;
  }
  dragover(e) {
    if (!this.editorView.editable)
      return;
    this.lastDragEvent = e;
    let t = this.computeTarget(e);
    t != null && (this.setCursor(t), this.scheduleRemoval(5e3));
  }
  dragend() {
    this.scheduleRemoval(20);
  }
  drop() {
    this.scheduleRemoval(20);
  }
  dragleave(e) {
    this.editorView.dom.contains(e.relatedTarget) || this.setCursor(null);
  }
}
class V extends $ {
  /**
  Create a gap cursor.
  */
  constructor(e) {
    super(e, e);
  }
  map(e, t) {
    let r = e.resolve(t.map(this.head));
    return V.valid(r) ? new V(r) : $.near(r);
  }
  content() {
    return w.empty;
  }
  eq(e) {
    return e instanceof V && e.head == this.head;
  }
  toJSON() {
    return { type: "gapcursor", pos: this.head };
  }
  /**
  @internal
  */
  static fromJSON(e, t) {
    if (typeof t.pos != "number")
      throw new RangeError("Invalid input for GapCursor.fromJSON");
    return new V(e.resolve(t.pos));
  }
  /**
  @internal
  */
  getBookmark() {
    return new Gl(this.anchor);
  }
  /**
  @internal
  */
  static valid(e) {
    let t = e.parent;
    if (t.inlineContent || !Lx(e) || !zx(e))
      return !1;
    let r = t.type.spec.allowGapCursor;
    if (r != null)
      return r;
    let s = t.contentMatchAt(e.index()).defaultType;
    return s && s.isTextblock;
  }
  /**
  @internal
  */
  static findGapCursorFrom(e, t, r = !1) {
    e: for (; ; ) {
      if (!r && V.valid(e))
        return e;
      let s = e.pos, i = null;
      for (let o = e.depth; ; o--) {
        let a = e.node(o);
        if (t > 0 ? e.indexAfter(o) < a.childCount : e.index(o) > 0) {
          i = a.child(t > 0 ? e.indexAfter(o) : e.index(o) - 1);
          break;
        } else if (o == 0)
          return null;
        s += t;
        let l = e.doc.resolve(s);
        if (V.valid(l))
          return l;
      }
      for (; ; ) {
        let o = t > 0 ? i.firstChild : i.lastChild;
        if (!o) {
          if (i.isAtom && !i.isText && !_.isSelectable(i)) {
            e = e.doc.resolve(s + i.nodeSize * t), r = !1;
            continue e;
          }
          break;
        }
        i = o, s += t;
        let a = e.doc.resolve(s);
        if (V.valid(a))
          return a;
      }
      return null;
    }
  }
}
V.prototype.visible = !1;
V.findFrom = V.findGapCursorFrom;
$.jsonID("gapcursor", V);
class Gl {
  constructor(e) {
    this.pos = e;
  }
  map(e) {
    return new Gl(e.map(this.pos));
  }
  resolve(e) {
    let t = e.resolve(this.pos);
    return V.valid(t) ? new V(t) : $.near(t);
  }
}
function up(n) {
  return n.isAtom || n.spec.isolating || n.spec.createGapCursor;
}
function Lx(n) {
  for (let e = n.depth; e >= 0; e--) {
    let t = n.index(e), r = n.node(e);
    if (t == 0) {
      if (r.type.spec.isolating)
        return !0;
      continue;
    }
    for (let s = r.child(t - 1); ; s = s.lastChild) {
      if (s.childCount == 0 && !s.inlineContent || up(s.type))
        return !0;
      if (s.inlineContent)
        return !1;
    }
  }
  return !0;
}
function zx(n) {
  for (let e = n.depth; e >= 0; e--) {
    let t = n.indexAfter(e), r = n.node(e);
    if (t == r.childCount) {
      if (r.type.spec.isolating)
        return !0;
      continue;
    }
    for (let s = r.child(t); ; s = s.firstChild) {
      if (s.childCount == 0 && !s.inlineContent || up(s.type))
        return !0;
      if (s.inlineContent)
        return !1;
    }
  }
  return !0;
}
function Bx() {
  return new F({
    props: {
      decorations: Wx,
      createSelectionBetween(n, e, t) {
        return e.pos == t.pos && V.valid(t) ? new V(t) : null;
      },
      handleClick: Hx,
      handleKeyDown: Fx,
      handleDOMEvents: { beforeinput: Vx }
    }
  });
}
const Fx = rf({
  ArrowLeft: hs("horiz", -1),
  ArrowRight: hs("horiz", 1),
  ArrowUp: hs("vert", -1),
  ArrowDown: hs("vert", 1)
});
function hs(n, e) {
  const t = n == "vert" ? e > 0 ? "down" : "up" : e > 0 ? "right" : "left";
  return function(r, s, i) {
    let o = r.selection, a = e > 0 ? o.$to : o.$from, l = o.empty;
    if (o instanceof O) {
      if (!i.endOfTextblock(t) || a.depth == 0)
        return !1;
      l = !1, a = r.doc.resolve(e > 0 ? a.after() : a.before());
    }
    let c = V.findGapCursorFrom(a, e, l);
    return c ? (s && s(r.tr.setSelection(new V(c))), !0) : !1;
  };
}
function Hx(n, e, t) {
  if (!n || !n.editable)
    return !1;
  let r = n.state.doc.resolve(e);
  if (!V.valid(r))
    return !1;
  let s = n.posAtCoords({ left: t.clientX, top: t.clientY });
  return s && s.inside > -1 && _.isSelectable(n.state.doc.nodeAt(s.inside)) ? !1 : (n.dispatch(n.state.tr.setSelection(new V(r))), !0);
}
function Vx(n, e) {
  if (e.inputType != "insertCompositionText" || !(n.state.selection instanceof V))
    return !1;
  let { $from: t } = n.state.selection, r = t.parent.contentMatchAt(t.index()).findWrapping(n.state.schema.nodes.text);
  if (!r)
    return !1;
  let s = b.empty;
  for (let o = r.length - 1; o >= 0; o--)
    s = b.from(r[o].createAndFill(null, s));
  let i = n.state.tr.replace(t.pos, t.pos, new w(s, 0, 0));
  return i.setSelection(O.near(i.doc.resolve(t.pos + 1))), n.dispatch(i), !1;
}
function Wx(n) {
  if (!(n.selection instanceof V))
    return null;
  let e = document.createElement("div");
  return e.className = "ProseMirror-gapcursor", z.create(n.doc, [ue.widget(n.selection.head, e, { key: "gapcursor" })]);
}
var ao = 200, te = function() {
};
te.prototype.append = function(e) {
  return e.length ? (e = te.from(e), !this.length && e || e.length < ao && this.leafAppend(e) || this.length < ao && e.leafPrepend(this) || this.appendInner(e)) : this;
};
te.prototype.prepend = function(e) {
  return e.length ? te.from(e).append(this) : this;
};
te.prototype.appendInner = function(e) {
  return new jx(this, e);
};
te.prototype.slice = function(e, t) {
  return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? te.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
};
te.prototype.get = function(e) {
  if (!(e < 0 || e >= this.length))
    return this.getInner(e);
};
te.prototype.forEach = function(e, t, r) {
  t === void 0 && (t = 0), r === void 0 && (r = this.length), t <= r ? this.forEachInner(e, t, r, 0) : this.forEachInvertedInner(e, t, r, 0);
};
te.prototype.map = function(e, t, r) {
  t === void 0 && (t = 0), r === void 0 && (r = this.length);
  var s = [];
  return this.forEach(function(i, o) {
    return s.push(e(i, o));
  }, t, r), s;
};
te.from = function(e) {
  return e instanceof te ? e : e && e.length ? new hp(e) : te.empty;
};
var hp = /* @__PURE__ */ (function(n) {
  function e(r) {
    n.call(this), this.values = r;
  }
  n && (e.__proto__ = n), e.prototype = Object.create(n && n.prototype), e.prototype.constructor = e;
  var t = { length: { configurable: !0 }, depth: { configurable: !0 } };
  return e.prototype.flatten = function() {
    return this.values;
  }, e.prototype.sliceInner = function(s, i) {
    return s == 0 && i == this.length ? this : new e(this.values.slice(s, i));
  }, e.prototype.getInner = function(s) {
    return this.values[s];
  }, e.prototype.forEachInner = function(s, i, o, a) {
    for (var l = i; l < o; l++)
      if (s(this.values[l], a + l) === !1)
        return !1;
  }, e.prototype.forEachInvertedInner = function(s, i, o, a) {
    for (var l = i - 1; l >= o; l--)
      if (s(this.values[l], a + l) === !1)
        return !1;
  }, e.prototype.leafAppend = function(s) {
    if (this.length + s.length <= ao)
      return new e(this.values.concat(s.flatten()));
  }, e.prototype.leafPrepend = function(s) {
    if (this.length + s.length <= ao)
      return new e(s.flatten().concat(this.values));
  }, t.length.get = function() {
    return this.values.length;
  }, t.depth.get = function() {
    return 0;
  }, Object.defineProperties(e.prototype, t), e;
})(te);
te.empty = new hp([]);
var jx = /* @__PURE__ */ (function(n) {
  function e(t, r) {
    n.call(this), this.left = t, this.right = r, this.length = t.length + r.length, this.depth = Math.max(t.depth, r.depth) + 1;
  }
  return n && (e.__proto__ = n), e.prototype = Object.create(n && n.prototype), e.prototype.constructor = e, e.prototype.flatten = function() {
    return this.left.flatten().concat(this.right.flatten());
  }, e.prototype.getInner = function(r) {
    return r < this.left.length ? this.left.get(r) : this.right.get(r - this.left.length);
  }, e.prototype.forEachInner = function(r, s, i, o) {
    var a = this.left.length;
    if (s < a && this.left.forEachInner(r, s, Math.min(i, a), o) === !1 || i > a && this.right.forEachInner(r, Math.max(s - a, 0), Math.min(this.length, i) - a, o + a) === !1)
      return !1;
  }, e.prototype.forEachInvertedInner = function(r, s, i, o) {
    var a = this.left.length;
    if (s > a && this.right.forEachInvertedInner(r, s - a, Math.max(i, a) - a, o + a) === !1 || i < a && this.left.forEachInvertedInner(r, Math.min(s, a), i, o) === !1)
      return !1;
  }, e.prototype.sliceInner = function(r, s) {
    if (r == 0 && s == this.length)
      return this;
    var i = this.left.length;
    return s <= i ? this.left.slice(r, s) : r >= i ? this.right.slice(r - i, s - i) : this.left.slice(r, i).append(this.right.slice(0, s - i));
  }, e.prototype.leafAppend = function(r) {
    var s = this.right.leafAppend(r);
    if (s)
      return new e(this.left, s);
  }, e.prototype.leafPrepend = function(r) {
    var s = this.left.leafPrepend(r);
    if (s)
      return new e(s, this.right);
  }, e.prototype.appendInner = function(r) {
    return this.left.depth >= Math.max(this.right.depth, r.depth) + 1 ? new e(this.left, new e(this.right, r)) : new e(this, r);
  }, e;
})(te);
const qx = 500;
class Ne {
  constructor(e, t) {
    this.items = e, this.eventCount = t;
  }
  // Pop the latest event off the branch's history and apply it
  // to a document transform.
  popEvent(e, t) {
    if (this.eventCount == 0)
      return null;
    let r = this.items.length;
    for (; ; r--)
      if (this.items.get(r - 1).selection) {
        --r;
        break;
      }
    let s, i;
    t && (s = this.remapping(r, this.items.length), i = s.maps.length);
    let o = e.tr, a, l, c = [], d = [];
    return this.items.forEach((u, h) => {
      if (!u.step) {
        s || (s = this.remapping(r, h + 1), i = s.maps.length), i--, d.push(u);
        return;
      }
      if (s) {
        d.push(new ze(u.map));
        let f = u.step.map(s.slice(i)), p;
        f && o.maybeStep(f).doc && (p = o.mapping.maps[o.mapping.maps.length - 1], c.push(new ze(p, void 0, void 0, c.length + d.length))), i--, p && s.appendMap(p, i);
      } else
        o.maybeStep(u.step);
      if (u.selection)
        return a = s ? u.selection.map(s.slice(i)) : u.selection, l = new Ne(this.items.slice(0, r).append(d.reverse().concat(c)), this.eventCount - 1), !1;
    }, this.items.length, 0), { remaining: l, transform: o, selection: a };
  }
  // Create a new branch with the given transform added.
  addTransform(e, t, r, s) {
    let i = [], o = this.eventCount, a = this.items, l = !s && a.length ? a.get(a.length - 1) : null;
    for (let d = 0; d < e.steps.length; d++) {
      let u = e.steps[d].invert(e.docs[d]), h = new ze(e.mapping.maps[d], u, t), f;
      (f = l && l.merge(h)) && (h = f, d ? i.pop() : a = a.slice(0, a.length - 1)), i.push(h), t && (o++, t = void 0), s || (l = h);
    }
    let c = o - r.depth;
    return c > Kx && (a = Ux(a, c), o -= c), new Ne(a.append(i), o);
  }
  remapping(e, t) {
    let r = new hr();
    return this.items.forEach((s, i) => {
      let o = s.mirrorOffset != null && i - s.mirrorOffset >= e ? r.maps.length - s.mirrorOffset : void 0;
      r.appendMap(s.map, o);
    }, e, t), r;
  }
  addMaps(e) {
    return this.eventCount == 0 ? this : new Ne(this.items.append(e.map((t) => new ze(t))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(e, t) {
    if (!this.eventCount)
      return this;
    let r = [], s = Math.max(0, this.items.length - t), i = e.mapping, o = e.steps.length, a = this.eventCount;
    this.items.forEach((h) => {
      h.selection && a--;
    }, s);
    let l = t;
    this.items.forEach((h) => {
      let f = i.getMirror(--l);
      if (f == null)
        return;
      o = Math.min(o, f);
      let p = i.maps[f];
      if (h.step) {
        let m = e.steps[f].invert(e.docs[f]), g = h.selection && h.selection.map(i.slice(l + 1, f));
        g && a++, r.push(new ze(p, m, g));
      } else
        r.push(new ze(p));
    }, s);
    let c = [];
    for (let h = t; h < o; h++)
      c.push(new ze(i.maps[h]));
    let d = this.items.slice(0, s).append(c).append(r), u = new Ne(d, a);
    return u.emptyItemCount() > qx && (u = u.compress(this.items.length - r.length)), u;
  }
  emptyItemCount() {
    let e = 0;
    return this.items.forEach((t) => {
      t.step || e++;
    }), e;
  }
  // Compressing a branch means rewriting it to push the air (map-only
  // items) out. During collaboration, these naturally accumulate
  // because each remote change adds one. The `upto` argument is used
  // to ensure that only the items below a given level are compressed,
  // because `rebased` relies on a clean, untouched set of items in
  // order to associate old items with rebased steps.
  compress(e = this.items.length) {
    let t = this.remapping(0, e), r = t.maps.length, s = [], i = 0;
    return this.items.forEach((o, a) => {
      if (a >= e)
        s.push(o), o.selection && i++;
      else if (o.step) {
        let l = o.step.map(t.slice(r)), c = l && l.getMap();
        if (r--, c && t.appendMap(c, r), l) {
          let d = o.selection && o.selection.map(t.slice(r));
          d && i++;
          let u = new ze(c.invert(), l, d), h, f = s.length - 1;
          (h = s.length && s[f].merge(u)) ? s[f] = h : s.push(u);
        }
      } else o.map && r--;
    }, this.items.length, 0), new Ne(te.from(s.reverse()), i);
  }
}
Ne.empty = new Ne(te.empty, 0);
function Ux(n, e) {
  let t;
  return n.forEach((r, s) => {
    if (r.selection && e-- == 0)
      return t = s, !1;
  }), n.slice(t);
}
class ze {
  constructor(e, t, r, s) {
    this.map = e, this.step = t, this.selection = r, this.mirrorOffset = s;
  }
  merge(e) {
    if (this.step && e.step && !e.selection) {
      let t = e.step.merge(this.step);
      if (t)
        return new ze(t.getMap().invert(), t, this.selection);
    }
  }
}
class lt {
  constructor(e, t, r, s, i) {
    this.done = e, this.undone = t, this.prevRanges = r, this.prevTime = s, this.prevComposition = i;
  }
}
const Kx = 20;
function Jx(n, e, t, r) {
  let s = t.getMeta(Vt), i;
  if (s)
    return s.historyState;
  t.getMeta(Xx) && (n = new lt(n.done, n.undone, null, 0, -1));
  let o = t.getMeta("appendedTransaction");
  if (t.steps.length == 0)
    return n;
  if (o && o.getMeta(Vt))
    return o.getMeta(Vt).redo ? new lt(n.done.addTransform(t, void 0, r, ri(e)), n.undone, Kd(t.mapping.maps), n.prevTime, n.prevComposition) : new lt(n.done, n.undone.addTransform(t, void 0, r, ri(e)), null, n.prevTime, n.prevComposition);
  if (t.getMeta("addToHistory") !== !1 && !(o && o.getMeta("addToHistory") === !1)) {
    let a = t.getMeta("composition"), l = n.prevTime == 0 || !o && n.prevComposition != a && (n.prevTime < (t.time || 0) - r.newGroupDelay || !Gx(t, n.prevRanges)), c = o ? ba(n.prevRanges, t.mapping) : Kd(t.mapping.maps);
    return new lt(n.done.addTransform(t, l ? e.selection.getBookmark() : void 0, r, ri(e)), Ne.empty, c, t.time, a ?? n.prevComposition);
  } else return (i = t.getMeta("rebased")) ? new lt(n.done.rebased(t, i), n.undone.rebased(t, i), ba(n.prevRanges, t.mapping), n.prevTime, n.prevComposition) : new lt(n.done.addMaps(t.mapping.maps), n.undone.addMaps(t.mapping.maps), ba(n.prevRanges, t.mapping), n.prevTime, n.prevComposition);
}
function Gx(n, e) {
  if (!e)
    return !1;
  if (!n.docChanged)
    return !0;
  let t = !1;
  return n.mapping.maps[0].forEach((r, s) => {
    for (let i = 0; i < e.length; i += 2)
      r <= e[i + 1] && s >= e[i] && (t = !0);
  }), t;
}
function Kd(n) {
  let e = [];
  for (let t = n.length - 1; t >= 0 && e.length == 0; t--)
    n[t].forEach((r, s, i, o) => e.push(i, o));
  return e;
}
function ba(n, e) {
  if (!n)
    return null;
  let t = [];
  for (let r = 0; r < n.length; r += 2) {
    let s = e.map(n[r], 1), i = e.map(n[r + 1], -1);
    s <= i && t.push(s, i);
  }
  return t;
}
function Yx(n, e, t) {
  let r = ri(e), s = Vt.get(e).spec.config, i = (t ? n.undone : n.done).popEvent(e, r);
  if (!i)
    return null;
  let o = i.selection.resolve(i.transform.doc), a = (t ? n.done : n.undone).addTransform(i.transform, e.selection.getBookmark(), s, r), l = new lt(t ? a : i.remaining, t ? i.remaining : a, null, 0, -1);
  return i.transform.setSelection(o).setMeta(Vt, { redo: t, historyState: l });
}
let va = !1, Jd = null;
function ri(n) {
  let e = n.plugins;
  if (Jd != e) {
    va = !1, Jd = e;
    for (let t = 0; t < e.length; t++)
      if (e[t].spec.historyPreserveItems) {
        va = !0;
        break;
      }
  }
  return va;
}
const Vt = new X("history"), Xx = new X("closeHistory");
function Qx(n = {}) {
  return n = {
    depth: n.depth || 100,
    newGroupDelay: n.newGroupDelay || 500
  }, new F({
    key: Vt,
    state: {
      init() {
        return new lt(Ne.empty, Ne.empty, null, 0, -1);
      },
      apply(e, t, r) {
        return Jx(t, r, e, n);
      }
    },
    config: n,
    props: {
      handleDOMEvents: {
        beforeinput(e, t) {
          let r = t.inputType, s = r == "historyUndo" ? pp : r == "historyRedo" ? mp : null;
          return !s || !e.editable ? !1 : (t.preventDefault(), s(e.state, e.dispatch));
        }
      }
    }
  });
}
function fp(n, e) {
  return (t, r) => {
    let s = Vt.getState(t);
    if (!s || (n ? s.undone : s.done).eventCount == 0)
      return !1;
    if (r) {
      let i = Yx(s, t, n);
      i && r(e ? i.scrollIntoView() : i);
    }
    return !0;
  };
}
const pp = fp(!1, !0), mp = fp(!0, !0);
W.create({
  name: "characterCount",
  addOptions() {
    return {
      limit: null,
      autoTrim: !0,
      mode: "textSize",
      textCounter: (n) => n.length,
      wordCounter: (n) => n.split(" ").filter((e) => e !== "").length
    };
  },
  addStorage() {
    return {
      characters: () => 0,
      words: () => 0
    };
  },
  onBeforeCreate() {
    this.storage.characters = (n) => {
      const e = (n == null ? void 0 : n.node) || this.editor.state.doc;
      if (((n == null ? void 0 : n.mode) || this.options.mode) === "textSize") {
        const r = e.textBetween(0, e.content.size, void 0, " ");
        return this.options.textCounter(r);
      }
      return e.nodeSize;
    }, this.storage.words = (n) => {
      const e = (n == null ? void 0 : n.node) || this.editor.state.doc, t = e.textBetween(0, e.content.size, " ", " ");
      return this.options.wordCounter(t);
    };
  },
  addProseMirrorPlugins() {
    let n = !1;
    return [
      new F({
        key: new X("characterCount"),
        appendTransaction: (e, t, r) => {
          if (n)
            return;
          const s = this.options.limit, i = this.options.autoTrim;
          if (s == null || s === 0 || i === !1) {
            n = !0;
            return;
          }
          const o = this.storage.characters({ node: r.doc });
          if (o > s) {
            const a = o - s, l = 0, c = a;
            console.warn(
              `[CharacterCount] Initial content exceeded limit of ${s} characters. Content was automatically trimmed.`
            );
            const d = r.tr.deleteRange(l, c);
            return n = !0, d;
          }
          n = !0;
        },
        filterTransaction: (e, t) => {
          const r = this.options.limit;
          if (!e.docChanged || r === 0 || r === null || r === void 0)
            return !0;
          const s = this.storage.characters({ node: t.doc }), i = this.storage.characters({ node: e.doc });
          if (i <= r || s > r && i > r && i <= s)
            return !0;
          if (s > r && i > r && i > s || !e.getMeta("paste"))
            return !1;
          const a = e.selection.$head.pos, l = i - r, c = a - l, d = a;
          return e.deleteRange(c, d), !(this.storage.characters({ node: e.doc }) > r);
        }
      })
    ];
  }
});
var Zx = W.create({
  name: "dropCursor",
  addOptions() {
    return {
      color: "currentColor",
      width: 1,
      class: void 0
    };
  },
  addProseMirrorPlugins() {
    return [Px(this.options)];
  }
});
W.create({
  name: "focus",
  addOptions() {
    return {
      className: "has-focus",
      mode: "all"
    };
  },
  addProseMirrorPlugins() {
    return [
      new F({
        key: new X("focus"),
        props: {
          decorations: ({ doc: n, selection: e }) => {
            const { isEditable: t, isFocused: r } = this.editor, { anchor: s } = e, i = [];
            if (!t || !r)
              return z.create(n, []);
            let o = 0;
            this.options.mode === "deepest" && n.descendants((l, c) => {
              if (l.isText)
                return;
              if (!(s >= c && s <= c + l.nodeSize - 1))
                return !1;
              o += 1;
            });
            let a = 0;
            return n.descendants((l, c) => {
              if (l.isText || !(s >= c && s <= c + l.nodeSize - 1))
                return !1;
              if (a += 1, this.options.mode === "deepest" && o - a > 0 || this.options.mode === "shallowest" && a > 1)
                return this.options.mode === "deepest";
              i.push(
                ue.node(c, c + l.nodeSize, {
                  class: this.options.className
                })
              );
            }), z.create(n, i);
          }
        }
      })
    ];
  }
});
var e1 = W.create({
  name: "gapCursor",
  addProseMirrorPlugins() {
    return [Bx()];
  },
  extendNodeSchema(n) {
    var e;
    const t = {
      name: n.name,
      options: n.options,
      storage: n.storage
    };
    return {
      allowGapCursor: (e = R(E(n, "allowGapCursor", t))) != null ? e : null
    };
  }
}), gp = "placeholder", Gd = new X("tiptap__placeholder");
function yp(n) {
  const {
    editor: e,
    placeholder: t,
    dataAttribute: r,
    pos: s,
    node: i,
    isEmptyDoc: o,
    hasAnchor: a,
    classes: { emptyNode: l, emptyEditor: c }
  } = n, d = [l];
  return o && d.push(c), ue.node(s, s + i.nodeSize, {
    class: d.join(" "),
    [r]: typeof t == "function" ? t({
      editor: e,
      node: i,
      pos: s,
      hasAnchor: a
    }) : t
  });
}
function bp(n, e) {
  return typeof n == "function" ? n(e) : n;
}
function vp({
  editor: n,
  options: e,
  dataAttribute: t,
  doc: r,
  selection: s,
  from: i,
  to: o
}) {
  const { anchor: a } = s, l = [], c = n.isEmpty;
  return r.nodesBetween(i, o, (d, u) => {
    const h = a >= u && a <= u + d.nodeSize, f = !d.isLeaf && Wr(d);
    return d.type.isTextblock && (h || !e.showOnlyCurrent) && f && l.push(
      yp({
        editor: n,
        isEmptyDoc: c,
        dataAttribute: t,
        hasAnchor: h,
        placeholder: e.placeholder,
        classes: {
          emptyEditor: e.emptyEditorClass,
          emptyNode: bp(e.emptyNodeClass, {
            editor: n,
            node: d,
            pos: u,
            hasAnchor: h
          })
        },
        node: d,
        pos: u
      })
    ), e.includeChildren;
  }), l;
}
function kp({
  editor: n,
  options: e,
  dataAttribute: t,
  doc: r,
  selection: s
}) {
  if (!(n.isEditable || !e.showOnlyWhenEditable))
    return null;
  const { anchor: o } = s, a = [], l = n.isEmpty;
  if (e.showOnlyCurrent && !e.includeChildren) {
    const d = r.resolve(o), u = d.depth > 0 ? d.node(1) : d.nodeAfter, h = d.depth > 0 ? d.before(1) : o;
    if (u && u.type.isTextblock && Wr(u)) {
      const f = o >= h && o <= h + u.nodeSize;
      a.push(
        yp({
          editor: n,
          isEmptyDoc: l,
          dataAttribute: t,
          hasAnchor: f,
          placeholder: e.placeholder,
          classes: {
            emptyEditor: e.emptyEditorClass,
            emptyNode: bp(e.emptyNodeClass, {
              editor: n,
              node: u,
              pos: h,
              hasAnchor: f
            })
          },
          node: u,
          pos: h
        })
      );
    }
  } else
    a.push(
      ...vp({
        editor: n,
        options: e,
        dataAttribute: t,
        doc: r,
        selection: s,
        from: 0,
        to: r.content.size
      })
    );
  return z.create(r, a);
}
function rr(n, e) {
  var t;
  const r = n.resolve(e);
  if (r.depth === 0) {
    const o = (t = r.nodeAfter) != null ? t : r.nodeBefore;
    if (!o)
      return { from: e, to: e };
    const a = r.nodeAfter ? e : e - o.nodeSize;
    return { from: a, to: a + o.nodeSize };
  }
  const s = r.before(1), i = r.node(1);
  return { from: s, to: s + i.nodeSize };
}
function sr(n, e) {
  return {
    from: Math.max(0, e.from - 1),
    to: Math.min(n.content.size, e.to - 1)
  };
}
function t1(n, e, t) {
  const r = [];
  return n.forEach((s, i) => {
    const o = i, a = o + s.nodeSize, l = o + 1, c = a + 1;
    l < t && c > e && r.push({ from: o, to: a });
  }), r;
}
function n1(n) {
  if (n.length === 0)
    return [];
  const e = [...n].sort((r, s) => r.from - s.from), t = [{ ...e[0] }];
  for (let r = 1; r < e.length; r += 1) {
    const s = t[t.length - 1], i = e[r];
    i.from <= s.to ? s.to = Math.max(s.to, i.to) : t.push({ ...i });
  }
  return t;
}
function r1(n, e) {
  const t = t1(n, e.from, e.to);
  return t.push(sr(n, rr(n, e.from))), e.to > e.from ? t.push(
    sr(
      n,
      rr(n, Math.min(e.to, n.content.size + 1) - 1)
    )
  ) : e.from < n.content.size + 1 && t.push(
    sr(
      n,
      rr(n, Math.min(e.from + 1, n.content.size))
    )
  ), t;
}
function s1(n, e, t) {
  const r = [];
  if (n.docChanged) {
    const s = Nl(n);
    for (const i of s)
      r.push(...r1(t.doc, i.newRange));
  }
  return n.selectionSet && (r.push(
    sr(
      t.doc,
      rr(t.doc, n.mapping.map(e.selection.anchor))
    )
  ), r.push(
    sr(
      t.doc,
      rr(t.doc, t.selection.anchor)
    )
  )), n1(r);
}
function i1(n, e, t) {
  const r = Math.max(0, Math.min(n, t.content.size)), s = Math.max(r, Math.min(e, t.content.size));
  return { from: r, to: s };
}
function o1({
  decorations: n,
  ranges: e,
  editor: t,
  options: r,
  dataAttribute: s,
  doc: i,
  selection: o
}) {
  let a = n;
  for (const l of e) {
    const { from: c, to: d } = i1(l.from, l.to, i), u = a.find(c, d).filter((f) => f.from >= c && f.to <= d);
    u.length && (a = a.remove(u));
    const h = vp({
      editor: t,
      options: r,
      dataAttribute: s,
      doc: i,
      selection: o,
      from: c,
      to: d
    });
    h.length && (a = a.add(i, h));
  }
  return a;
}
function a1({
  editor: n,
  options: e,
  dataAttribute: t
}) {
  return {
    init(r, s) {
      const i = kp({
        editor: n,
        options: e,
        dataAttribute: t,
        doc: s.doc,
        selection: s.selection
      });
      return i ?? z.empty;
    },
    apply(r, s, i, o) {
      if (!r.docChanged && !r.selectionSet)
        return s;
      const a = s.map(r.mapping, r.doc), l = s1(r, i, o);
      return o1({
        decorations: a,
        ranges: l,
        editor: n,
        options: e,
        dataAttribute: t,
        doc: o.doc,
        selection: o.selection
      });
    }
  };
}
function l1(n) {
  return n.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/^[0-9-]+/, "").replace(/^-+/, "").toLowerCase();
}
function c1({ editor: n, options: e }) {
  const t = e.dataAttribute ? `data-${l1(e.dataAttribute)}` : `data-${gp}`, r = e.showOnlyCurrent && !e.includeChildren;
  return new F({
    key: Gd,
    ...r ? {} : {
      state: a1({ editor: n, options: e, dataAttribute: t })
    },
    props: {
      decorations: r ? ({ doc: s, selection: i }) => kp({ editor: n, options: e, dataAttribute: t, doc: s, selection: i }) : (s) => {
        var i;
        return e.showOnlyWhenEditable && !n.isEditable ? z.empty : (i = Gd.getState(s)) != null ? i : z.empty;
      }
    }
  });
}
W.create({
  name: "placeholder",
  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      dataAttribute: gp,
      placeholder: "Write something …",
      showOnlyWhenEditable: !0,
      showOnlyCurrent: !0,
      includeChildren: !1
    };
  },
  addProseMirrorPlugins() {
    return [c1({ editor: this.editor, options: this.options })];
  }
});
function rl(n, e) {
  return !n.selection.empty && !kf(n.selection) && e.isEditable;
}
function d1(n, e) {
  return rl(n, e) && !e.isFocused && !e.view.dragging;
}
function u1() {
  var n;
  (n = window.getSelection()) == null || n.removeAllRanges();
}
function h1(n) {
  n.focus();
}
W.create({
  name: "selection",
  addOptions() {
    return {
      className: "selection"
    };
  },
  addProseMirrorPlugins() {
    const { editor: n, options: e } = this;
    return [
      new F({
        key: new X("selection"),
        props: {
          decorations(t) {
            return d1(t, n) ? z.create(t.doc, [
              ue.inline(t.selection.from, t.selection.to, {
                class: e.className
              })
            ]) : null;
          },
          handleDOMEvents: {
            blur(t) {
              return rl(t.state, n) && u1(), !1;
            },
            focus(t) {
              return rl(t.state, n) && requestAnimationFrame(() => {
                !n.isDestroyed && t.hasFocus() && h1(t);
              }), !1;
            }
          }
        }
      })
    ];
  }
});
var f1 = "skipTrailingNode";
function Yd({
  types: n,
  node: e
}) {
  return e && Array.isArray(n) && n.includes(e.type) || (e == null ? void 0 : e.type) === n;
}
var p1 = W.create({
  name: "trailingNode",
  addOptions() {
    return {
      node: void 0,
      notAfter: []
    };
  },
  addProseMirrorPlugins() {
    var n;
    const e = new X(this.name), t = this.options.node || ((n = this.editor.schema.topNodeType.contentMatch.defaultType) == null ? void 0 : n.name) || "paragraph", r = Object.entries(this.editor.schema.nodes).map(([, s]) => s).filter((s) => (this.options.notAfter || []).concat(t).includes(s.name));
    return [
      new F({
        key: e,
        appendTransaction: (s, i, o) => {
          const { doc: a, tr: l, schema: c } = o, d = e.getState(o), u = a.content.size, h = c.nodes[t];
          if (!s.some((f) => f.getMeta(f1)) && d)
            return l.insert(u, h.create());
        },
        state: {
          init: (s, i) => {
            const o = i.tr.doc.lastChild;
            return !Yd({ node: o, types: r });
          },
          apply: (s, i) => {
            if (!s.docChanged || s.getMeta("__uniqueIDTransaction"))
              return i;
            const o = s.doc.lastChild;
            return !Yd({ node: o, types: r });
          }
        }
      })
    ];
  }
}), m1 = W.create({
  name: "undoRedo",
  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500
    };
  },
  addCommands() {
    return {
      undo: () => ({ state: n, dispatch: e }) => pp(n, e),
      redo: () => ({ state: n, dispatch: e }) => mp(n, e)
    };
  },
  addProseMirrorPlugins() {
    return [Qx(this.options)];
  },
  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
      "Mod-y": () => this.editor.commands.redo(),
      // Russian keyboard layouts
      "Mod-я": () => this.editor.commands.undo(),
      "Shift-Mod-я": () => this.editor.commands.redo()
    };
  }
}), g1 = W.create({
  name: "starterKit",
  addExtensions() {
    var n, e, t, r;
    const s = [];
    return this.options.bold !== !1 && s.push(nk.configure(this.options.bold)), this.options.blockquote !== !1 && s.push(X0.configure(this.options.blockquote)), this.options.bulletList !== !1 && s.push(Zf.configure(this.options.bulletList)), this.options.code !== !1 && s.push(ik.configure(this.options.code)), this.options.codeBlock !== !1 && s.push(lk.configure(this.options.codeBlock)), this.options.document !== !1 && s.push(ck.configure(this.options.document)), this.options.dropcursor !== !1 && s.push(Zx.configure(this.options.dropcursor)), this.options.gapcursor !== !1 && s.push(e1.configure(this.options.gapcursor)), this.options.hardBreak !== !1 && s.push(dk.configure(this.options.hardBreak)), this.options.heading !== !1 && s.push(uk.configure(this.options.heading)), this.options.undoRedo !== !1 && s.push(m1.configure(this.options.undoRedo)), this.options.horizontalRule !== !1 && s.push(hk.configure(this.options.horizontalRule)), this.options.italic !== !1 && s.push(yk.configure(this.options.italic)), this.options.listItem !== !1 && s.push(sp.configure(this.options.listItem)), this.options.listKeymap !== !1 && s.push(lp.configure((n = this.options) == null ? void 0 : n.listKeymap)), this.options.link !== !1 && s.push(Gk.configure((e = this.options) == null ? void 0 : e.link)), this.options.orderedList !== !1 && s.push(dp.configure(this.options.orderedList)), this.options.paragraph !== !1 && s.push(_x.configure(this.options.paragraph)), this.options.strike !== !1 && s.push($x.configure(this.options.strike)), this.options.text !== !1 && s.push(Ix.configure(this.options.text)), this.options.underline !== !1 && s.push(Dx.configure((t = this.options) == null ? void 0 : t.underline)), this.options.trailingNode !== !1 && s.push(p1.configure((r = this.options) == null ? void 0 : r.trailingNode)), s;
  }
}), y1 = Object.defineProperty, b1 = Object.getOwnPropertyDescriptor, xp = (n) => {
  throw TypeError(n);
}, qr = (n, e, t, r) => {
  for (var s = b1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && y1(e, t, s), s;
}, wp = (n, e, t) => e.has(n) || xp("Cannot " + t), Dn = (n, e, t) => (wp(n, e, "read from private field"), t ? t.call(n) : e.get(n)), Pn = (n, e, t) => e.has(n) ? xp("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Rn = (n, e, t, r) => (wp(n, e, "write to private field"), e.set(n, t), t), si, ii, oi, ai, li;
const oc = class oc extends ce {
  constructor() {
    super(...arguments), Pn(this, si, ""), Pn(this, ii, ""), Pn(this, oi, 8), Pn(this, ai, !1), Pn(this, li, "Start writing…"), this._editor = null, this._content = "";
  }
  get id() {
    return Dn(this, si);
  }
  set id(e) {
    Rn(this, si, e);
  }
  get type() {
    return Dn(this, ii);
  }
  set type(e) {
    Rn(this, ii, e);
  }
  get vantage() {
    return Dn(this, oi);
  }
  set vantage(e) {
    Rn(this, oi, e);
  }
  get editable() {
    return Dn(this, ai);
  }
  set editable(e) {
    Rn(this, ai, e);
  }
  get placeholder() {
    return Dn(this, li);
  }
  set placeholder(e) {
    Rn(this, li, e);
  }
  connectedCallback() {
    super.connectedCallback(), this._createEditor(), this._updateVantage();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._destroyEditor();
  }
  _createEditor() {
    const e = document.createElement("div");
    this.shadowRoot && this.shadowRoot.appendChild(e), this._editor = new K0({
      content: "",
      extensions: [g1],
      editable: this.editable,
      onUpdate: () => {
        var t;
        this._content = ((t = this._editor) == null ? void 0 : t.getHTML()) || "", this._dispatch("trellis-editor-update", { html: this._content });
      },
      onFocus: () => {
        this._dispatch("trellis-editor-focus");
      },
      onBlur: () => {
        this._dispatch("trellis-editor-blur");
      }
    }), this._dispatch("trellis-editor-ready", { editor: this._editor });
  }
  _destroyEditor() {
    this._editor && (this._editor.destroy(), this._editor = null);
  }
  _updateVantage() {
    this._editor && this._editor.setEditable(this.editable);
  }
  getHTML() {
    var e;
    return ((e = this._editor) == null ? void 0 : e.getHTML()) || "";
  }
  setContent(e) {
    this._editor && this._editor.commands.setContent(e);
  }
  _dispatch(e, t) {
    this.dispatchEvent(new CustomEvent(e, {
      bubbles: !0,
      composed: !0,
      detail: t
    }));
  }
  render() {
    return x`<div class="editor-container">
      <div class="editor-content" id="editor-content"></div>
      <slot name="toolbar"></slot>
      ${this._content === "" ? x`<div class="placeholder">${this.placeholder}</div>` : null}
    </div>`;
  }
};
oc.styles = ve`
    .editor-container {
      position: relative;
      min-height: 2rem;
      width: 100%;
    }
    .editor-content {
      min-height: inherit;
      width: 100%;
      padding: 0.5rem;
      outline: none;
    }
    .placeholder {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      color: var(--muted-foreground, #6f6f6f);
      pointer-events: none;
    }
  `;
let Mt = oc;
si = /* @__PURE__ */ new WeakMap();
ii = /* @__PURE__ */ new WeakMap();
oi = /* @__PURE__ */ new WeakMap();
ai = /* @__PURE__ */ new WeakMap();
li = /* @__PURE__ */ new WeakMap();
qr([
  M({ type: String, reflect: !0 })
], Mt.prototype, "id");
qr([
  M({ type: String, reflect: !0 })
], Mt.prototype, "type");
qr([
  M({ type: Number, reflect: !0 })
], Mt.prototype, "vantage");
qr([
  M({ type: Boolean, reflect: !0 })
], Mt.prototype, "editable");
qr([
  M({ type: String, reflect: !0 })
], Mt.prototype, "placeholder");
customElements.define("trellis-editor", Mt);
var v1 = Object.defineProperty, k1 = Object.getOwnPropertyDescriptor, Sp = (n, e, t, r) => {
  for (var s = k1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && v1(e, t, s), s;
}, Ar, _r;
const ac = class ac extends ce {
  constructor() {
    super(...arguments);
    me(this, Ar, !1);
    me(this, _r, "glass");
  }
  get sticky() {
    return pe(this, Ar);
  }
  set sticky(t) {
    ge(this, Ar, t);
  }
  get variant() {
    return pe(this, _r);
  }
  set variant(t) {
    ge(this, _r, t);
  }
  render() {
    return x`
      <header class="header" part="header">
        <div class="header-start" part="header-start">
          <slot name="breadcrumb"></slot>
        </div>
        <div class="header-center" part="header-center">
          <slot name="stats"></slot>
        </div>
        <div class="header-end" part="header-end">
          <slot name="actions"></slot>
        </div>
        <slot></slot>
      </header>
    `;
  }
};
Ar = new WeakMap(), _r = new WeakMap(), ac.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text);
    }

    :host([sticky]) {
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .header {
      display: flex;
      align-items: center;
      height: var(--header-height, 56px);
      padding: 0 var(--space-4, 1rem);
      gap: var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--header-border, var(--border, rgba(255, 255, 255, 0.195)));
      flex-shrink: 0;
    }

    .header-start {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      gap: var(--space-2, 0.5rem);
    }

    .header-center {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
    }

    .header-end {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      flex-shrink: 0;
    }

    :host([variant='glass']) .header {
      background: var(--header-bg, var(--glass-surface, rgba(22, 22, 22, 0.75)));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    :host([variant='default']) .header {
      background: var(--surface-bg);
    }

    :host([variant='inset']) .header {
      background: var(--surface-inset);
    }

    @media (max-width: 820px) {
      .header-center {
        display: none;
      }
    }
  `;
let kr = ac;
Sp([
  M({ type: Boolean, reflect: !0 })
], kr.prototype, "sticky");
Sp([
  M({ type: String, reflect: !0 })
], kr.prototype, "variant");
customElements.define("trellis-header", kr);
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { I: x1 } = Rm, Xd = (n) => n, w1 = (n) => n.strings === void 0, Qd = () => document.createComment(""), Ln = (n, e, t) => {
  var i;
  const r = n._$AA.parentNode, s = e === void 0 ? n._$AB : e._$AA;
  if (t === void 0) {
    const o = r.insertBefore(Qd(), s), a = r.insertBefore(Qd(), s);
    t = new x1(o, a, n, n.options);
  } else {
    const o = t._$AB.nextSibling, a = t._$AM, l = a !== n;
    if (l) {
      let c;
      (i = t._$AQ) == null || i.call(t, n), t._$AM = n, t._$AP !== void 0 && (c = n._$AU) !== a._$AU && t._$AP(c);
    }
    if (o !== s || l) {
      let c = t._$AA;
      for (; c !== o; ) {
        const d = Xd(c).nextSibling;
        Xd(r).insertBefore(c, s), c = d;
      }
    }
  }
  return t;
}, _t = (n, e, t = n) => (n._$AI(e, t), n), S1 = {}, Cp = (n, e = S1) => n._$AH = e, C1 = (n) => n._$AH, ka = (n) => {
  n._$AR(), n._$AA.remove();
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Zd = (n, e, t) => {
  const r = /* @__PURE__ */ new Map();
  for (let s = e; s <= t; s++) r.set(n[s], s);
  return r;
}, Mp = go(class extends yo {
  constructor(n) {
    if (super(n), n.type !== Xe.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(n, e, t) {
    let r;
    t === void 0 ? t = e : e !== void 0 && (r = e);
    const s = [], i = [];
    let o = 0;
    for (const a of n) s[o] = r ? r(a, o) : o, i[o] = t(a, o), o++;
    return { values: i, keys: s };
  }
  render(n, e, t) {
    return this.dt(n, e, t).values;
  }
  update(n, [e, t, r]) {
    const s = C1(n), { values: i, keys: o } = this.dt(e, t, r);
    if (!Array.isArray(s)) return this.ut = o, i;
    const a = this.ut ?? (this.ut = []), l = [];
    let c, d, u = 0, h = s.length - 1, f = 0, p = i.length - 1;
    for (; u <= h && f <= p; ) if (s[u] === null) u++;
    else if (s[h] === null) h--;
    else if (a[u] === o[f]) l[f] = _t(s[u], i[f]), u++, f++;
    else if (a[h] === o[p]) l[p] = _t(s[h], i[p]), h--, p--;
    else if (a[u] === o[p]) l[p] = _t(s[u], i[p]), Ln(n, l[p + 1], s[u]), u++, p--;
    else if (a[h] === o[f]) l[f] = _t(s[h], i[f]), Ln(n, s[u], s[h]), h--, f++;
    else if (c === void 0 && (c = Zd(o, f, p), d = Zd(a, u, h)), c.has(a[u])) if (c.has(a[h])) {
      const m = d.get(o[f]), g = m !== void 0 ? s[m] : null;
      if (g === null) {
        const y = Ln(n, s[u]);
        _t(y, i[f]), l[f] = y;
      } else l[f] = _t(g, i[f]), Ln(n, s[u], g), s[m] = null;
      f++;
    } else ka(s[h]), h--;
    else ka(s[u]), u++;
    for (; f <= p; ) {
      const m = Ln(n, l[p + 1]);
      _t(m, i[f]), l[f++] = m;
    }
    for (; u <= h; ) {
      const m = s[u++];
      m !== null && ka(m);
    }
    return this.ut = o, Cp(n, l), Te;
  }
});
var M1 = Object.defineProperty, E1 = Object.getOwnPropertyDescriptor, Ep = (n, e, t, r) => {
  for (var s = E1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && M1(e, t, s), s;
}, Or, Nr;
const lc = class lc extends ce {
  constructor() {
    super(...arguments);
    me(this, Or, []);
    me(this, Nr, "chevron");
  }
  get segments() {
    return pe(this, Or);
  }
  set segments(t) {
    ge(this, Or, t);
  }
  get separator() {
    return pe(this, Nr);
  }
  set separator(t) {
    ge(this, Nr, t);
  }
  _handleSegmentClick(t, r) {
    r !== this.segments.length - 1 && (t.href || this.dispatchEvent(new CustomEvent("trellis-breadcrumb-navigate", {
      bubbles: !0,
      composed: !0,
      detail: { segment: t, index: r }
    })));
  }
  _handleKeyDown(t, r, s) {
    (t.key === "Enter" || t.key === " ") && (t.preventDefault(), this._handleSegmentClick(r, s));
  }
  _separatorTemplate(t) {
    if (t === 0) return "";
    switch (this.separator) {
      case "slash":
        return x`<span class="sep" aria-hidden="true">/</span>`;
      case "dot":
        return x`<span class="sep dot" aria-hidden="true"></span>`;
      default:
        return x`<span class="sep chevron" aria-hidden="true"></span>`;
    }
  }
  render() {
    return this.segments.length === 0 ? x`<nav class="breadcrumb" aria-label="Breadcrumb"><slot></slot></nav>` : x`
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          ${Mp(this.segments, (t, r) => t.id || r, (t, r) => {
      const s = r === this.segments.length - 1;
      return x`
              <li class="breadcrumb-item">
                ${this._separatorTemplate(r)}
                ${s ? x`
                      <span class="segment current" aria-current="page">
                        ${t.icon ? pt(t.icon, "xs") : ""}
                        <span class="seg-label">${t.label}</span>
                      </span>
                    ` : t.href ? x`
                        <a class="segment" href=${t.href}>
                          ${t.icon ? pt(t.icon, "xs") : ""}
                          <span class="seg-label">${t.label}</span>
                        </a>
                      ` : x`
                        <button
                          class="segment"
                          @click=${() => this._handleSegmentClick(t, r)}
                          @keydown=${(i) => this._handleKeyDown(i, t, r)}
                        >
                          ${t.icon ? pt(t.icon, "xs") : ""}
                          <span class="seg-label">${t.label}</span>
                        </button>
                      `}
              </li>
            `;
    })}
        </ol>
        <slot></slot>
      </nav>
    `;
  }
};
Or = new WeakMap(), Nr = new WeakMap(), lc.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text-secondary, #9e9e9e);
      font-size: var(--font-size-sm, 0.875rem);
    }

    .breadcrumb {
      display: flex;
      align-items: center;
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: var(--space-1, 0.25rem);
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
    }

    .segment {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-0, 0) var(--space-1, 0.25rem);
      background: none;
      border: none;
      border-radius: var(--radius-sm, 6px);
      color: var(--text-secondary, #9e9e9e);
      cursor: pointer;
      font-family: inherit;
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      text-decoration: none;
      line-height: 2;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .segment:hover {
      color: var(--text, #e8e8e8);
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
    }

    .segment:focus-visible {
      outline: 2px solid var(--border-focus, var(--color-blue-500));
      outline-offset: 2px;
    }

    .segment.current {
      color: var(--text, #e8e8e8);
      font-weight: 600;
      cursor: default;
      background: none;
    }

    a.segment {
      color: var(--text-interactive, #9dbefe);
    }

    a.segment:hover {
      color: var(--text-interactive, #9dbefe);
      text-decoration: underline;
    }

    .segment trellis-icon {
      flex-shrink: 0;
    }

    .seg-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sep {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary, #6f6f6f);
      user-select: none;
      flex-shrink: 0;
    }

    .sep.chevron::after {
      content: '';
      display: block;
      width: 6px;
      height: 6px;
      border-right: 1.5px solid var(--text-tertiary, #6f6f6f);
      border-bottom: 1.5px solid var(--text-tertiary, #6f6f6f);
      transform: rotate(-45deg);
    }

    .sep.dot::after {
      content: '';
      display: block;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--text-tertiary, #6f6f6f);
    }

    @media (prefers-reduced-motion: reduce) {
      .segment {
        transition: none;
      }
    }
  `;
let xr = lc;
Ep([
  M({ type: Array })
], xr.prototype, "segments");
Ep([
  M({ type: String, reflect: !0 })
], xr.prototype, "separator");
customElements.define("trellis-breadcrumb", xr);
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const lo = go(class extends yo {
  constructor(n) {
    var e;
    if (super(n), n.type !== Xe.ATTRIBUTE || n.name !== "class" || ((e = n.strings) == null ? void 0 : e.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(n) {
    return " " + Object.keys(n).filter((e) => n[e]).join(" ") + " ";
  }
  update(n, [e]) {
    var r, s;
    if (this.st === void 0) {
      this.st = /* @__PURE__ */ new Set(), n.strings !== void 0 && (this.nt = new Set(n.strings.join(" ").split(/\s/).filter((i) => i !== "")));
      for (const i in e) e[i] && !((r = this.nt) != null && r.has(i)) && this.st.add(i);
      return this.render(e);
    }
    const t = n.element.classList;
    for (const i of this.st) i in e || (t.remove(i), this.st.delete(i));
    for (const i in e) {
      const o = !!e[i];
      o === this.st.has(i) || (s = this.nt) != null && s.has(i) || (o ? (t.add(i), this.st.add(i)) : (t.remove(i), this.st.delete(i)));
    }
    return Te;
  }
});
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const T1 = go(class extends yo {
  constructor(n) {
    if (super(n), n.type !== Xe.PROPERTY && n.type !== Xe.ATTRIBUTE && n.type !== Xe.BOOLEAN_ATTRIBUTE) throw Error("The `live` directive is not allowed on child or event bindings");
    if (!w1(n)) throw Error("`live` bindings can only contain a single expression");
  }
  render(n) {
    return n;
  }
  update(n, [e]) {
    if (e === Te || e === U) return e;
    const t = n.element, r = n.name;
    if (n.type === Xe.PROPERTY) {
      if (e === t[r]) return Te;
    } else if (n.type === Xe.BOOLEAN_ATTRIBUTE) {
      if (!!e === t.hasAttribute(r)) return Te;
    } else if (n.type === Xe.ATTRIBUTE && t.getAttribute(r) === e + "") return Te;
    return Cp(n), e;
  }
});
var A1 = Object.defineProperty, _1 = Object.getOwnPropertyDescriptor, Tp = (n) => {
  throw TypeError(n);
}, Do = (n, e, t, r) => {
  for (var s = _1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && A1(e, t, s), s;
}, Ap = (n, e, t) => e.has(n) || Tp("Cannot " + t), fs = (n, e, t) => (Ap(n, e, "read from private field"), t ? t.call(n) : e.get(n)), ps = (n, e, t) => e.has(n) ? Tp("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), ms = (n, e, t, r) => (Ap(n, e, "write to private field"), e.set(n, t), t), ci, di, ui, hi;
const cc = class cc extends ce {
  constructor() {
    super(...arguments), ps(this, ci, ""), ps(this, di, "Search..."), ps(this, ui, !1), ps(this, hi, !1), this._inputEl = null;
  }
  get value() {
    return fs(this, ci);
  }
  set value(e) {
    ms(this, ci, e);
  }
  get placeholder() {
    return fs(this, di);
  }
  set placeholder(e) {
    ms(this, di, e);
  }
  get disabled() {
    return fs(this, ui);
  }
  set disabled(e) {
    ms(this, ui, e);
  }
  get autofocus() {
    return fs(this, hi);
  }
  set autofocus(e) {
    ms(this, hi, e);
  }
  get _hasValue() {
    return this.value.length > 0;
  }
  connectedCallback() {
    super.connectedCallback(), this.autofocus && this.updateComplete.then(() => {
      var e;
      return (e = this._inputEl) == null ? void 0 : e.focus();
    });
  }
  _handleInput(e) {
    const t = e.target;
    this.value = t.value, this.dispatchEvent(new CustomEvent("trellis-search-input", {
      bubbles: !0,
      composed: !0,
      detail: { value: this.value }
    }));
  }
  _handleClear() {
    var e;
    this.value = "", (e = this._inputEl) == null || e.focus(), this.dispatchEvent(new CustomEvent("trellis-search-clear", {
      bubbles: !0,
      composed: !0
    })), this.dispatchEvent(new CustomEvent("trellis-search-input", {
      bubbles: !0,
      composed: !0,
      detail: { value: "" }
    }));
  }
  _handleKeyDown(e) {
    e.key === "Escape" && this._hasValue && this._handleClear();
  }
  focus() {
    var e;
    (e = this._inputEl) == null || e.focus();
  }
  clear() {
    this._handleClear();
  }
  render() {
    return x`
      <div class="search ${lo({ focused: this._hasValue })}" role="search">
        <span class="search-icon">${pt("core-search", "sm")}</span>
        <input
          class="search-input"
          type="search"
          .value=${T1(this.value)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          aria-label=${this.placeholder}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
        />
        <button
          class="search-clear"
          ?hidden=${!this._hasValue}
          aria-label="Clear search"
          @click=${this._handleClear}
        >
          ${pt("core-close", "xs")}
        </button>
      </div>
    `;
  }
};
cc.styles = ve`
    :host {
      display: block;
    }

    .search {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      height: var(--toolbar-control-h, 34px);
      padding: 0 var(--space-3, 0.75rem);
      background: var(--search-bg, var(--surface-raised, #1c1c1c));
      border: 1px solid var(--search-border, var(--border, rgba(255, 255, 255, 0.195)));
      border-radius: var(--radius-md, 8px);
      transition: border-color 150ms ease;
    }

    .search:focus-within {
      border-color: var(--border-focus, var(--color-blue-500));
    }

    .search.focused {
      border-color: var(--border-focus, var(--color-blue-500));
    }

    .search-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--text-tertiary, #6f6f6f);
      pointer-events: none;
    }

    .search-input {
      flex: 1;
      min-width: 0;
      padding: 0;
      background: none;
      border: none;
      outline: none;
      color: var(--text, #e8e8e8);
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      line-height: 1;
    }

    .search-input::placeholder {
      color: var(--text-tertiary, #6f6f6f);
      font-weight: 400;
    }

    .search-input:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .search-clear {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-full, 999px);
      color: var(--text-tertiary, #6f6f6f);
      cursor: pointer;
      flex-shrink: 0;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .search-clear:hover {
      color: var(--text, #e8e8e8);
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
    }

    .search-clear:focus-visible {
      outline: 2px solid var(--border-focus, var(--color-blue-500));
      outline-offset: 2px;
    }

    .search-clear[hidden] {
      display: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .search {
        transition: none;
      }
      .search-clear {
        transition: none;
      }
    }
  `;
let Xt = cc;
ci = /* @__PURE__ */ new WeakMap();
di = /* @__PURE__ */ new WeakMap();
ui = /* @__PURE__ */ new WeakMap();
hi = /* @__PURE__ */ new WeakMap();
Do([
  M({ type: String, reflect: !0 })
], Xt.prototype, "value");
Do([
  M({ type: String, reflect: !0 })
], Xt.prototype, "placeholder");
Do([
  M({ type: Boolean, reflect: !0 })
], Xt.prototype, "disabled");
Do([
  M({ type: Boolean, reflect: !0 })
], Xt.prototype, "autofocus");
customElements.define("trellis-search", Xt);
var O1 = Object.defineProperty, N1 = Object.getOwnPropertyDescriptor, Yl = (n, e, t, r) => {
  for (var s = N1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && O1(e, t, s), s;
}, $r, Ir, Dr;
const dc = class dc extends ce {
  constructor() {
    super(...arguments);
    me(this, $r, []);
    me(this, Ir, "");
    me(this, Dr, !1);
  }
  get views() {
    return pe(this, $r);
  }
  set views(t) {
    ge(this, $r, t);
  }
  get value() {
    return pe(this, Ir);
  }
  set value(t) {
    ge(this, Ir, t);
  }
  get disabled() {
    return pe(this, Dr);
  }
  set disabled(t) {
    ge(this, Dr, t);
  }
  _handleSelect(t) {
    this.disabled || t === this.value || (this.value = t, this.dispatchEvent(new CustomEvent("trellis-view-toggle", {
      bubbles: !0,
      composed: !0,
      detail: { view: t }
    })));
  }
  _handleKeyDown(t, r) {
    var o;
    const s = this.views.length;
    let i = -1;
    if (t.key === "ArrowRight" || t.key === "ArrowDown" ? (t.preventDefault(), i = (r + 1) % s) : (t.key === "ArrowLeft" || t.key === "ArrowUp") && (t.preventDefault(), i = (r - 1 + s) % s), i >= 0) {
      const a = this.views[i];
      if (a) {
        this._handleSelect(a.id);
        const l = (o = this.shadowRoot) == null ? void 0 : o.querySelector(`[data-view-id="${a.id}"]`);
        l == null || l.focus();
      }
    }
  }
  render() {
    const t = this.views.length > 0 ? this.views : [
      { id: "grid", label: "Grid" },
      { id: "kanban", label: "Kanban" },
      { id: "table", label: "Table" }
    ];
    return x`
      <div class="toggle" role="radiogroup" aria-label="View mode">
        ${t.map((r, s) => {
      const i = this.value === r.id || !this.value && s === 0, o = this.disabled;
      return x`
            <button
              class="toggle-option ${lo({ selected: i, disabled: o })}"
              role="radio"
              aria-checked=${i}
              aria-label=${r.label}
              ?disabled=${o}
              data-view-id=${r.id}
              tabindex=${i ? "0" : "-1"}
              @click=${() => this._handleSelect(r.id)}
              @keydown=${(a) => this._handleKeyDown(a, s)}
            >
              ${r.icon ? pt(r.icon, "xs") : ""}
              <span class="option-label">${r.label}</span>
            </button>
          `;
    })}
        <div class="toggle-indicator" style="transform: translateX(${this._indicatorOffset()}px); width: ${this._indicatorWidth()}px;"></div>
      </div>
    `;
  }
  _indicatorOffset() {
    var s;
    const t = this.value || ((s = this.views[0]) == null ? void 0 : s.id) || "grid", r = this.views.findIndex((i) => i.id === t);
    return r < 0 ? 0 : r * 100;
  }
  _indicatorWidth() {
    return this.views.length > 0 ? 100 / this.views.length : 33.33;
  }
};
$r = new WeakMap(), Ir = new WeakMap(), Dr = new WeakMap(), dc.styles = ve`
    :host {
      display: inline-block;
    }

    .toggle {
      position: relative;
      display: inline-flex;
      background: var(--toolbar-track, #1e1e1e);
      border-radius: var(--radius-md, 8px);
      padding: 2px;
      gap: 0;
    }

    .toggle-option {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      background: none;
      border: none;
      border-radius: var(--radius-sm, 6px);
      color: var(--text-tertiary, #6f6f6f);
      cursor: pointer;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 500;
      line-height: 2;
      white-space: nowrap;
      transition: color 150ms ease;
    }

    .toggle-option:hover {
      color: var(--text-secondary, #9e9e9e);
    }

    .toggle-option:focus-visible {
      outline: 2px solid var(--border-focus, var(--color-blue-500));
      outline-offset: 2px;
    }

    .toggle-option.selected {
      color: var(--text, #e8e8e8);
    }

    .toggle-option.disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    .toggle-option:disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    .toggle-option trellis-icon {
      flex-shrink: 0;
    }

    .toggle-indicator {
      position: absolute;
      top: 2px;
      left: 2px;
      height: calc(100% - 4px);
      background: var(--toolbar-active, #1c1c1c);
      border-radius: var(--radius-sm, 6px);
      z-index: 0;
      transition: transform 200ms ease, width 200ms ease;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .toggle-option {
        transition: none;
      }
      .toggle-indicator {
        transition: none;
      }
    }
  `;
let kn = dc;
Yl([
  M({ type: Array })
], kn.prototype, "views");
Yl([
  M({ type: String, reflect: !0 })
], kn.prototype, "value");
Yl([
  M({ type: Boolean, reflect: !0 })
], kn.prototype, "disabled");
customElements.define("trellis-view-toggle", kn);
var $1 = Object.defineProperty, I1 = Object.getOwnPropertyDescriptor, _p = (n) => {
  throw TypeError(n);
}, Xl = (n, e, t, r) => {
  for (var s = I1(e, t), i = n.length - 1, o; i >= 0; i--)
    (o = n[i]) && (s = o(e, t, s) || s);
  return s && $1(e, t, s), s;
}, Op = (n, e, t) => e.has(n) || _p("Cannot " + t), xa = (n, e, t) => (Op(n, e, "read from private field"), t ? t.call(n) : e.get(n)), wa = (n, e, t) => e.has(n) ? _p("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(n) : e.set(n, t), Sa = (n, e, t, r) => (Op(n, e, "write to private field"), e.set(n, t), t), fi, pi, mi;
const uc = class uc extends ce {
  constructor() {
    super(...arguments), wa(this, fi, []), wa(this, pi, ""), wa(this, mi, !1), this._collapsedZones = /* @__PURE__ */ new Set();
  }
  get zones() {
    return xa(this, fi);
  }
  set zones(e) {
    Sa(this, fi, e);
  }
  get activeId() {
    return xa(this, pi);
  }
  set activeId(e) {
    Sa(this, pi, e);
  }
  get disabled() {
    return xa(this, mi);
  }
  set disabled(e) {
    Sa(this, mi, e);
  }
  _toggleZone(e) {
    this._collapsedZones.has(e) ? this._collapsedZones.delete(e) : this._collapsedZones.add(e), this.requestUpdate();
  }
  _handleNavClick(e) {
    this.disabled || e.disabled || e.href || (this.activeId = e.id, this.dispatchEvent(new CustomEvent("trellis-nav-select", {
      bubbles: !0,
      composed: !0,
      detail: { item: e }
    })));
  }
  _handleKeyDown(e, t) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._handleNavClick(t));
  }
  render() {
    return this.zones.length === 0 ? x`
        <nav class="nav" aria-label="Sidebar navigation">
          <slot></slot>
        </nav>
      ` : x`
      <nav class="nav" aria-label="Sidebar navigation">
        ${Mp(this.zones, (e) => e.id, (e) => {
      const t = this._collapsedZones.has(e.id) ?? e.collapsed;
      return x`
            <div class="zone" role="group" aria-label="${e.label}">
              <button
                class="zone-toggle"
                aria-expanded="${!t}"
                aria-controls="zone-${e.id}"
                @click=${() => this._toggleZone(e.id)}
              >
                <span class="zone-label">${e.label}</span>
                <span class="zone-chevron" data-open=${!t}></span>
              </button>
              <div class="zone-items" id="zone-${e.id}" ?hidden=${t} role="list">
                ${e.items.map((r) => {
        const s = this.activeId === r.id, i = !!(this.disabled || r.disabled);
        return r.href ? x`
                      <a
                        class="nav-item ${lo({ active: s, disabled: i })}"
                        href=${r.href}
                        role="listitem"
                        aria-current=${s ? "page" : void 0}
                        aria-disabled=${i}
                      >
                        ${r.icon ? pt(r.icon, "sm") : x`<span class="nav-dot"></span>`}
                        <span class="nav-label">${r.label}</span>
                        ${r.count != null ? x`<span class="nav-count">${r.count}</span>` : ""}
                      </a>
                    ` : x`
                    <button
                      class="nav-item ${lo({ active: s, disabled: i })}"
                      role="listitem"
                      ?disabled=${i}
                      aria-current=${s ? "page" : void 0}
                      @click=${() => this._handleNavClick(r)}
                      @keydown=${(o) => this._handleKeyDown(o, r)}
                    >
                      ${r.icon ? pt(r.icon, "sm") : x`<span class="nav-dot"></span>`}
                      <span class="nav-label">${r.label}</span>
                      ${r.count != null ? x`<span class="nav-count">${r.count}</span>` : ""}
                    </button>
                  `;
      })}
              </div>
            </div>
          `;
    })}
        <slot></slot>
      </nav>
    `;
  }
};
uc.styles = ve`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      color: var(--text, #e8e8e8);
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-2, 0.5rem) 0;
    }

    .zone {
      display: flex;
      flex-direction: column;
    }

    .zone-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      background: none;
      border: none;
      color: var(--text-tertiary, #6f6f6f);
      cursor: pointer;
      font-family: inherit;
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 2;
      transition: color 150ms ease;
    }

    .zone-toggle:hover {
      color: var(--text-secondary, #9e9e9e);
    }

    .zone-label {
      flex: 1;
      text-align: left;
    }

    .zone-chevron {
      display: inline-block;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid var(--text-tertiary, #6f6f6f);
      transition: transform 150ms ease;
    }

    .zone-chevron[data-open='false'] {
      transform: rotate(-90deg);
    }

    .zone-items {
      display: flex;
      flex-direction: column;
      gap: var(--space-0, 0);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      width: 100%;
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      background: none;
      border: none;
      border-radius: var(--radius-sm, 6px);
      color: var(--text-secondary, #9e9e9e);
      cursor: pointer;
      font-family: inherit;
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 500;
      text-align: left;
      text-decoration: none;
      line-height: 2;
      transition: background-color 150ms ease, color 150ms ease;
    }

    .nav-item:hover {
      background: var(--sidebar-item-hover, rgba(255, 255, 255, 0.06));
      color: var(--text, #e8e8e8);
    }

    .nav-item:focus-visible {
      outline: 2px solid var(--border-focus, var(--color-blue-500));
      outline-offset: -2px;
    }

    .nav-item.active {
      background: var(--sidebar-item-active, color-mix(in oklch, var(--text-interactive) 12%, transparent));
      color: var(--text-interactive, #9dbefe);
    }

    .nav-item.disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    .nav-item:disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    .nav-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-tertiary, #6f6f6f);
      flex-shrink: 0;
    }

    .nav-item.active .nav-dot {
      background: var(--text-interactive, #9dbefe);
    }

    .nav-item trellis-icon {
      flex-shrink: 0;
      color: var(--text-tertiary);
    }

    .nav-item.active trellis-icon {
      color: var(--text-interactive);
    }

    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-count {
      font-size: var(--font-size-xs, 0.75rem);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 500;
      color: var(--text-tertiary, #6f6f6f);
      padding: 1px 6px;
      border-radius: var(--radius-full, 999px);
      background: var(--badge-neutral-bg, color-mix(in oklch, var(--text-tertiary) 15%, transparent));
      flex-shrink: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .zone-toggle,
      .nav-item {
        transition: none;
      }
      .zone-chevron {
        transition: none;
      }
    }
  `;
let xn = uc;
fi = /* @__PURE__ */ new WeakMap();
pi = /* @__PURE__ */ new WeakMap();
mi = /* @__PURE__ */ new WeakMap();
Xl([
  M({ type: Array })
], xn.prototype, "zones");
Xl([
  M({ type: String, reflect: !0 })
], xn.prototype, "activeId");
Xl([
  M({ type: Boolean, reflect: !0 })
], xn.prototype, "disabled");
customElements.define("trellis-sidebar-nav", xn);
function en(n) {
  let e = n;
  const t = /* @__PURE__ */ new Set(), r = () => t.forEach((s) => s());
  return {
    get state() {
      return e;
    },
    subscribe(s) {
      return t.add(s), () => t.delete(s);
    },
    set(s) {
      e = s, r();
    }
  };
}
function K1(n = {}) {
  const e = n.defaultOpen ?? !1, t = en({
    open: e,
    expanded: e
  }), r = {
    toggle: () => t.set({ open: !t.state.open, expanded: !t.state.open }),
    expand: () => t.set({ open: !0, expanded: !0 }),
    collapse: () => t.set({ open: !1, expanded: !1 }),
    setOpen: (s) => t.set({ open: s, expanded: s })
  };
  return {
    get state() {
      return t.state;
    },
    subscribe: t.subscribe,
    actions: r
  };
}
function J1(n) {
  const e = n.wrap ?? !0, t = Math.max(
    0,
    n.tabs.indexOf(n.defaultTab ?? "")
  ), r = en({
    tabs: n.tabs,
    activeTab: n.tabs[t] ?? null,
    activeIndex: n.tabs.length ? t : -1
  }), s = (a) => {
    const l = r.state.tabs.length;
    return l === 0 ? -1 : e ? (a % l + l) % l : Math.max(0, Math.min(l - 1, a));
  }, i = (a) => {
    const l = s(a);
    r.set({
      tabs: r.state.tabs,
      activeTab: l >= 0 ? r.state.tabs[l] : null,
      activeIndex: l
    });
  }, o = {
    setTab: (a) => {
      const l = r.state.tabs.indexOf(a);
      l >= 0 && i(l);
    },
    next: () => i(r.state.activeIndex + 1),
    prev: () => i(r.state.activeIndex - 1),
    focus: (a) => {
    }
  };
  return {
    get state() {
      return r.state;
    },
    subscribe: r.subscribe,
    actions: o
  };
}
function G1(n) {
  const e = n.multiple ?? !0, t = en({
    ids: n.ids,
    selectedIds: n.defaultSelected ?? []
  }), s = {
    toggle: (i) => {
      const o = t.state.selectedIds.includes(i);
      t.set({
        ids: t.state.ids,
        selectedIds: o ? t.state.selectedIds.filter((a) => a !== i) : e ? [...t.state.selectedIds, i] : [i]
      });
    },
    select: (i) => t.set({
      ids: t.state.ids,
      selectedIds: e ? [.../* @__PURE__ */ new Set([...t.state.selectedIds, i])] : [i]
    }),
    deselect: (i) => t.set({
      ids: t.state.ids,
      selectedIds: t.state.selectedIds.filter((o) => o !== i)
    }),
    selectRange: (i, o) => {
      const { ids: a } = t.state, l = a.indexOf(i), c = a.indexOf(o);
      if (l < 0 || c < 0) return;
      const [d, u] = l <= c ? [l, c] : [c, l];
      t.set({ ids: a, selectedIds: a.slice(d, u + 1) });
    },
    clear: () => t.set({ ids: t.state.ids, selectedIds: [] }),
    setSelected: (i) => t.set({ ids: t.state.ids, selectedIds: i })
  };
  return {
    get state() {
      return t.state;
    },
    subscribe: t.subscribe,
    actions: s
  };
}
function Y1(n = {}) {
  const e = en({
    open: n.defaultOpen ?? !1,
    lastReason: null
  }), t = {
    open: () => e.set({ open: !0, lastReason: null }),
    close: (r = "explicit") => {
      var s;
      (s = n.ignoreReasons) != null && s.includes(r) || e.state.open && e.set({ open: !1, lastReason: r });
    },
    toggle: () => e.set(
      e.state.open ? { open: !1, lastReason: "explicit" } : { open: !0, lastReason: null }
    )
  };
  return {
    get state() {
      return e.state;
    },
    subscribe: e.subscribe,
    actions: t
  };
}
function X1(n = {}) {
  const e = en({
    open: n.defaultOpen ?? !1,
    placement: n.placement ?? "top",
    lastTrigger: null
  }), t = {
    open: (r = "hover") => e.set({ ...e.state, open: !0, lastTrigger: r }),
    close: () => e.set({ ...e.state, open: !1, lastTrigger: null }),
    toggle: (r = "hover") => e.set({
      ...e.state,
      open: !e.state.open,
      lastTrigger: e.state.open ? null : r
    }),
    setPlacement: (r) => e.set({ ...e.state, placement: r })
  };
  return {
    get state() {
      return e.state;
    },
    subscribe: e.subscribe,
    actions: t
  };
}
function Q1(n = {}) {
  const e = en({
    autoScroll: n.defaultAutoScroll ?? !1,
    anchorId: n.anchorId ?? null,
    preserveOnPrepend: n.preserveOnPrepend ?? !1,
    dataScrollable: !0,
    dataAutoscrolling: n.defaultAutoScroll ?? !1
  }), t = {
    setAutoScroll: (r) => e.set({ ...e.state, autoScroll: r, dataAutoscrolling: r }),
    setAnchor: (r) => e.set({ ...e.state, anchorId: r }),
    atLiveEdge: (r) => e.set({ ...e.state, autoScroll: r, dataAutoscrolling: r }),
    markAnchored: () => {
      e.set({ ...e.state });
    }
  };
  return {
    get state() {
      return e.state;
    },
    subscribe: e.subscribe,
    actions: t
  };
}
function Z1(n) {
  const e = n.sizeMode ?? "px", t = n.panels.map((o) => ({
    id: o.id,
    size: o.size,
    min: o.min ?? 0,
    max: o.max ?? Number.POSITIVE_INFINITY,
    collapsible: o.collapsible ?? !1,
    collapsed: o.collapsed ?? !1,
    collapsedSize: o.collapsedSize ?? (e === "ratio" ? 0 : 48)
  })), r = en({
    orientation: n.orientation ?? "horizontal",
    panels: t,
    sizeMode: e
  }), s = (o, a) => o.collapsed ? o.collapsedSize : Math.max(o.min, Math.min(o.max, a)), i = {
    setPanelSize: (o, a) => {
      r.set({
        ...r.state,
        panels: r.state.panels.map(
          (l) => l.id === o ? { ...l, size: s(l, a) } : l
        )
      });
    },
    collapse: (o) => {
      r.set({
        ...r.state,
        panels: r.state.panels.map(
          (a) => a.id === o && a.collapsible ? { ...a, collapsed: !0, size: a.collapsedSize } : a
        )
      });
    },
    expand: (o) => {
      r.set({
        ...r.state,
        panels: r.state.panels.map(
          (a) => a.id === o && a.collapsible ? { ...a, collapsed: !1, size: s(a, a.min || a.collapsedSize) } : a
        )
      });
    },
    toggleCollapsed: (o) => {
      const a = r.state.panels.find((l) => l.id === o);
      a && (a.collapsed ? i.expand(o) : i.collapse(o));
    },
    setOrientation: (o) => r.set({ ...r.state, orientation: o }),
    reorder: (o) => {
      const a = new Map(o.map((c, d) => [c, d])), l = [...r.state.panels].sort(
        (c, d) => (a.get(c.id) ?? 0) - (a.get(d.id) ?? 0)
      );
      r.set({ ...r.state, panels: l });
    }
  };
  return {
    get state() {
      return r.state;
    },
    subscribe: r.subscribe,
    actions: i
  };
}
function ew(n, e = {}) {
  const t = e.overflow ?? 99;
  return n > t ? `${t}+` : String(n);
}
function D1(n) {
  let e = 2166136261;
  for (let t = 0; t < n.length; t++)
    e ^= n.charCodeAt(t), e = Math.imul(e, 16777619);
  return (e >>> 0) % 360 >>> 0;
}
function tw(n, e = 2) {
  return { initials: n.trim().split(/\s+/).filter(Boolean).slice(0, e).map((s) => s[0] ?? "").join("").toUpperCase() || "?", hue: D1(n) };
}
export {
  Fm as InspectionService,
  xr as TrellisBreadcrumb,
  Mt as TrellisEditor,
  kt as TrellisEntity,
  xt as TrellisEntityList,
  Oe as TrellisEntityTable,
  kr as TrellisHeader,
  lr as TrellisIcon,
  Hm as TrellisInspectable,
  qt as TrellisPalette,
  co as TrellisProvider,
  un as TrellisQuery,
  jt as TrellisQueryBuilder,
  Xt as TrellisSearch,
  ir as TrellisShell,
  Wt as TrellisSidebar,
  xn as TrellisSidebarNav,
  kn as TrellisViewToggle,
  tw as avatar,
  D1 as avatarHue,
  ew as badgeText,
  K1 as createDisclosureCore,
  Y1 as createDismissCore,
  Q1 as createScrollCore,
  G1 as createSelectableCore,
  Z1 as createSplitCore,
  J1 as createTabsCore,
  X1 as createTooltipCore,
  uo as getTrellisClient,
  q1 as inspect,
  U1 as inspectable,
  yi as resolveShell,
  pt as trellisIcon
};
