var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require3() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm-browser.js
var require_sql_wasm_browser = __commonJS({
  "node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm-browser.js"(exports, module) {
    var initSqlJsPromise = void 0;
    var initSqlJs = function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module = void 0;
        var k;
        k ||= typeof Module != "undefined" ? Module : {};
        var aa = !!globalThis.window, ba = !!globalThis.WorkerGlobalScope;
        k.onRuntimeInitialized = function() {
          function a(f2, l) {
            switch (typeof l) {
              case "boolean":
                $b(f2, l ? 1 : 0);
                break;
              case "number":
                ac(f2, l);
                break;
              case "string":
                bc(f2, l, -1, -1);
                break;
              case "object":
                if (null === l) eb(f2);
                else if (null != l.length) {
                  var n = ca(l.length);
                  m.set(l, n);
                  cc(f2, n, l.length, -1);
                  da(n);
                } else ra(f2, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                eb(f2);
            }
          }
          function b(f2, l) {
            for (var n = [], p = 0; p < f2; p += 1) {
              var u = r(l + 4 * p, "i32"), v = dc(u);
              if (1 === v || 2 === v) u = ec(u);
              else if (3 === v) u = fc(u);
              else if (4 === v) {
                v = u;
                u = gc(v);
                v = hc(v);
                for (var K = new Uint8Array(u), I = 0; I < u; I += 1) K[I] = m[v + I];
                u = K;
              } else u = null;
              n.push(u);
            }
            return n;
          }
          function c(f2, l) {
            this.Qa = f2;
            this.db = l;
            this.Oa = 1;
            this.yb = [];
          }
          function d(f2, l) {
            this.db = l;
            this.ob = ea(f2);
            if (null === this.ob) throw Error("Unable to allocate memory for the SQL string");
            this.ub = this.ob;
            this.gb = this.Fb = null;
          }
          function e(f2) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != f2) {
              var l = this.filename, n = "/", p = l;
              n && (n = "string" == typeof n ? n : fa(n), p = l ? ha(n + "/" + l) : n);
              l = ia(true, true);
              p = ja(
                p,
                l
              );
              if (f2) {
                if ("string" == typeof f2) {
                  n = Array(f2.length);
                  for (var u = 0, v = f2.length; u < v; ++u) n[u] = f2.charCodeAt(u);
                  f2 = n;
                }
                ka(p, l | 146);
                n = la(p, 577);
                ma(n, f2, 0, f2.length, 0);
                na(n);
                ka(p, l);
              }
            }
            this.handleError(q(this.filename, g));
            this.db = r(g, "i32");
            hb(this.db);
            this.pb = {};
            this.Sa = {};
          }
          var g = y(4), h = k.cwrap, q = h("sqlite3_open", "number", ["string", "number"]), w = h("sqlite3_close_v2", "number", ["number"]), t = h("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = h("sqlite3_changes", "number", ["number"]), D = h(
            "sqlite3_prepare_v2",
            "number",
            ["number", "string", "number", "number", "number"]
          ), ib = h("sqlite3_sql", "string", ["number"]), jc = h("sqlite3_normalized_sql", "string", ["number"]), jb = h("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), kc = h("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), kb = h("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), lc = h("sqlite3_bind_double", "number", ["number", "number", "number"]), mc = h("sqlite3_bind_int", "number", [
            "number",
            "number",
            "number"
          ]), nc = h("sqlite3_bind_parameter_index", "number", ["number", "string"]), oc = h("sqlite3_step", "number", ["number"]), pc = h("sqlite3_errmsg", "string", ["number"]), qc = h("sqlite3_column_count", "number", ["number"]), rc = h("sqlite3_data_count", "number", ["number"]), sc = h("sqlite3_column_double", "number", ["number", "number"]), lb = h("sqlite3_column_text", "string", ["number", "number"]), tc = h("sqlite3_column_blob", "number", ["number", "number"]), uc = h("sqlite3_column_bytes", "number", ["number", "number"]), vc = h(
            "sqlite3_column_type",
            "number",
            ["number", "number"]
          ), wc = h("sqlite3_column_name", "string", ["number", "number"]), xc = h("sqlite3_reset", "number", ["number"]), yc = h("sqlite3_clear_bindings", "number", ["number"]), zc = h("sqlite3_finalize", "number", ["number"]), mb = h("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), dc = h("sqlite3_value_type", "number", ["number"]), gc = h("sqlite3_value_bytes", "number", ["number"]), fc = h("sqlite3_value_text", "string", ["number"]), hc = h(
            "sqlite3_value_blob",
            "number",
            ["number"]
          ), ec = h("sqlite3_value_double", "number", ["number"]), ac = h("sqlite3_result_double", "", ["number", "number"]), eb = h("sqlite3_result_null", "", ["number"]), bc = h("sqlite3_result_text", "", ["number", "string", "number", "number"]), cc = h("sqlite3_result_blob", "", ["number", "number", "number", "number"]), $b = h("sqlite3_result_int", "", ["number", "number"]), ra = h("sqlite3_result_error", "", ["number", "string", "number"]), nb = h("sqlite3_aggregate_context", "number", ["number", "number"]), hb = h(
            "RegisterExtensionFunctions",
            "number",
            ["number"]
          ), ob = h("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(f2) {
            if (!this.Qa) throw "Statement closed";
            this.reset();
            return Array.isArray(f2) ? this.Wb(f2) : null != f2 && "object" === typeof f2 ? this.Xb(f2) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa) throw "Statement closed";
            this.Oa = 1;
            var f2 = oc(this.Qa);
            switch (f2) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(f2);
            }
          };
          c.prototype.Pb = function(f2) {
            null == f2 && (f2 = this.Oa, this.Oa += 1);
            return sc(this.Qa, f2);
          };
          c.prototype.hc = function(f2) {
            null == f2 && (f2 = this.Oa, this.Oa += 1);
            f2 = lb(this.Qa, f2);
            if ("function" !== typeof BigInt) throw Error("BigInt is not supported");
            return BigInt(f2);
          };
          c.prototype.mc = function(f2) {
            null == f2 && (f2 = this.Oa, this.Oa += 1);
            return lb(this.Qa, f2);
          };
          c.prototype.getBlob = function(f2) {
            null == f2 && (f2 = this.Oa, this.Oa += 1);
            var l = uc(this.Qa, f2);
            f2 = tc(this.Qa, f2);
            for (var n = new Uint8Array(l), p = 0; p < l; p += 1) n[p] = m[f2 + p];
            return n;
          };
          c.prototype.get = function(f2, l) {
            l = l || {};
            null != f2 && this.bind(f2) && this.step();
            f2 = [];
            for (var n = rc(this.Qa), p = 0; p < n; p += 1) switch (vc(this.Qa, p)) {
              case 1:
                var u = l.useBigInt ? this.hc(p) : this.Pb(p);
                f2.push(u);
                break;
              case 2:
                f2.push(this.Pb(p));
                break;
              case 3:
                f2.push(this.mc(p));
                break;
              case 4:
                f2.push(this.getBlob(p));
                break;
              default:
                f2.push(null);
            }
            return f2;
          };
          c.prototype.Db = function() {
            for (var f2 = [], l = qc(this.Qa), n = 0; n < l; n += 1) f2.push(wc(this.Qa, n));
            return f2;
          };
          c.prototype.Ob = function(f2, l) {
            f2 = this.get(f2, l);
            l = this.Db();
            for (var n = {}, p = 0; p < l.length; p += 1) n[l[p]] = f2[p];
            return n;
          };
          c.prototype.lc = function() {
            return ib(this.Qa);
          };
          c.prototype.ic = function() {
            return jc(this.Qa);
          };
          c.prototype.Jb = function(f2) {
            null != f2 && this.bind(f2);
            this.step();
            return this.reset();
          };
          c.prototype.Lb = function(f2, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            f2 = ea(f2);
            this.yb.push(f2);
            this.db.handleError(kc(this.Qa, l, f2, -1, 0));
          };
          c.prototype.Vb = function(f2, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = ca(f2.length);
            m.set(f2, n);
            this.yb.push(n);
            this.db.handleError(kb(this.Qa, l, n, f2.length, 0));
          };
          c.prototype.Kb = function(f2, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((f2 === (f2 | 0) ? mc : lc)(
              this.Qa,
              l,
              f2
            ));
          };
          c.prototype.Yb = function(f2) {
            null == f2 && (f2 = this.Oa, this.Oa += 1);
            kb(this.Qa, f2, 0, 0, 0);
          };
          c.prototype.Mb = function(f2, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof f2) {
              case "string":
                this.Lb(f2, l);
                return;
              case "number":
                this.Kb(f2, l);
                return;
              case "bigint":
                this.Lb(f2.toString(), l);
                return;
              case "boolean":
                this.Kb(f2 + 0, l);
                return;
              case "object":
                if (null === f2) {
                  this.Yb(l);
                  return;
                }
                if (null != f2.length) {
                  this.Vb(f2, l);
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + f2 + ").";
          };
          c.prototype.Xb = function(f2) {
            var l = this;
            Object.keys(f2).forEach(function(n) {
              var p = nc(l.Qa, n);
              0 !== p && l.Mb(f2[n], p);
            });
            return true;
          };
          c.prototype.Wb = function(f2) {
            for (var l = 0; l < f2.length; l += 1) this.Mb(f2[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.Cb();
            return 0 === yc(this.Qa) && 0 === xc(this.Qa);
          };
          c.prototype.Cb = function() {
            for (var f2; void 0 !== (f2 = this.yb.pop()); ) da(f2);
          };
          c.prototype.cb = function() {
            this.Cb();
            var f2 = 0 === zc(this.Qa);
            delete this.db.pb[this.Qa];
            this.Qa = 0;
            return f2;
          };
          d.prototype.next = function() {
            if (null === this.ob) return { done: true };
            null !== this.gb && (this.gb.cb(), this.gb = null);
            if (!this.db.db) throw this.Ab(), Error("Database closed");
            var f2 = oa(), l = y(4);
            pa(g);
            pa(l);
            try {
              this.db.handleError(jb(this.db.db, this.ub, -1, g, l));
              this.ub = r(l, "i32");
              var n = r(g, "i32");
              if (0 === n) return this.Ab(), { done: true };
              this.gb = new c(n, this.db);
              this.db.pb[n] = this.gb;
              return { value: this.gb, done: false };
            } catch (p) {
              throw this.Fb = z(this.ub), this.Ab(), p;
            } finally {
              qa(f2);
            }
          };
          d.prototype.Ab = function() {
            da(this.ob);
            this.ob = null;
          };
          d.prototype.jc = function() {
            return null !== this.Fb ? this.Fb : z(this.ub);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.Jb = function(f2, l) {
            if (!this.db) throw "Database closed";
            if (l) {
              f2 = this.Gb(f2, l);
              try {
                f2.step();
              } finally {
                f2.cb();
              }
            } else this.handleError(t(this.db, f2, 0, 0, g));
            return this;
          };
          e.prototype.exec = function(f2, l, n) {
            if (!this.db) throw "Database closed";
            var p = null, u = null, v = null;
            try {
              v = u = ea(f2);
              var K = y(4);
              for (f2 = []; 0 !== r(v, "i8"); ) {
                pa(g);
                pa(K);
                this.handleError(jb(this.db, v, -1, g, K));
                var I = r(g, "i32");
                v = r(
                  K,
                  "i32"
                );
                if (0 !== I) {
                  var H = null;
                  p = new c(I, this);
                  for (null != l && p.bind(l); p.step(); ) null === H && (H = { columns: p.Db(), values: [] }, f2.push(H)), H.values.push(p.get(null, n));
                  p.cb();
                }
              }
              return f2;
            } catch (L) {
              throw p && p.cb(), L;
            } finally {
              u && da(u);
            }
          };
          e.prototype.ec = function(f2, l, n, p, u) {
            "function" === typeof l && (p = n, n = l, l = void 0);
            f2 = this.Gb(f2, l);
            try {
              for (; f2.step(); ) n(f2.Ob(null, u));
            } finally {
              f2.cb();
            }
            if ("function" === typeof p) return p();
          };
          e.prototype.Gb = function(f2, l) {
            pa(g);
            this.handleError(D(this.db, f2, -1, g, 0));
            f2 = r(g, "i32");
            if (0 === f2) throw "Nothing to prepare";
            var n = new c(f2, this);
            null != l && n.bind(l);
            return this.pb[f2] = n;
          };
          e.prototype.pc = function(f2) {
            return new d(f2, this);
          };
          e.prototype.fc = function() {
            Object.values(this.pb).forEach(function(l) {
              l.cb();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(w(this.db));
            var f2 = sa(this.filename);
            this.handleError(q(this.filename, g));
            this.db = r(g, "i32");
            hb(this.db);
            return f2;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.pb).forEach(function(f2) {
              f2.cb();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.fb && (A(this.fb), this.fb = void 0), this.handleError(w(this.db)), ta("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(f2) {
            if (0 === f2) return null;
            f2 = pc(this.db);
            throw Error(f2);
          };
          e.prototype.kc = function() {
            return x(this.db);
          };
          e.prototype.bc = function(f2, l) {
            Object.prototype.hasOwnProperty.call(this.Sa, f2) && (A(this.Sa[f2]), delete this.Sa[f2]);
            var n = ua(function(p, u, v) {
              u = b(u, v);
              try {
                var K = l.apply(null, u);
              } catch (I) {
                ra(p, I, -1);
                return;
              }
              a(p, K);
            }, "viii");
            this.Sa[f2] = n;
            this.handleError(mb(
              this.db,
              f2,
              l.length,
              1,
              0,
              n,
              0,
              0,
              0
            ));
            return this;
          };
          e.prototype.ac = function(f2, l) {
            var n = l.init || function() {
              return null;
            }, p = l.finalize || function(H) {
              return H;
            }, u = l.step;
            if (!u) throw "An aggregate function must have a step function in " + f2;
            var v = {};
            Object.hasOwnProperty.call(this.Sa, f2) && (A(this.Sa[f2]), delete this.Sa[f2]);
            l = f2 + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var K = ua(function(H, L, Ka) {
              var V = nb(H, 1);
              Object.hasOwnProperty.call(v, V) || (v[V] = n());
              L = b(L, Ka);
              L = [v[V]].concat(L);
              try {
                v[V] = u.apply(
                  null,
                  L
                );
              } catch (Bc) {
                delete v[V], ra(H, Bc, -1);
              }
            }, "viii"), I = ua(function(H) {
              var L = nb(H, 1);
              try {
                var Ka = p(v[L]);
              } catch (V) {
                delete v[L];
                ra(H, V, -1);
                return;
              }
              a(H, Ka);
              delete v[L];
            }, "vi");
            this.Sa[f2] = K;
            this.Sa[l] = I;
            this.handleError(mb(this.db, f2, u.length - 1, 1, 0, 0, K, I, 0));
            return this;
          };
          e.prototype.vc = function(f2) {
            this.fb && (ob(this.db, 0, 0), A(this.fb), this.fb = void 0);
            if (!f2) return this;
            this.fb = ua(function(l, n, p, u, v) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              p = z(p);
              u = z(u);
              if (v > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
              f2(l, p, u, Number(v));
            }, "viiiij");
            ob(this.db, this.fb, 0);
            return this;
          };
          c.prototype.bind = c.prototype.bind;
          c.prototype.step = c.prototype.step;
          c.prototype.get = c.prototype.get;
          c.prototype.getColumnNames = c.prototype.Db;
          c.prototype.getAsObject = c.prototype.Ob;
          c.prototype.getSQL = c.prototype.lc;
          c.prototype.getNormalizedSQL = c.prototype.ic;
          c.prototype.run = c.prototype.Jb;
          c.prototype.reset = c.prototype.reset;
          c.prototype.freemem = c.prototype.Cb;
          c.prototype.free = c.prototype.cb;
          d.prototype.next = d.prototype.next;
          d.prototype.getRemainingSQL = d.prototype.jc;
          e.prototype.run = e.prototype.Jb;
          e.prototype.exec = e.prototype.exec;
          e.prototype.each = e.prototype.ec;
          e.prototype.prepare = e.prototype.Gb;
          e.prototype.iterateStatements = e.prototype.pc;
          e.prototype["export"] = e.prototype.fc;
          e.prototype.close = e.prototype.close;
          e.prototype.handleError = e.prototype.handleError;
          e.prototype.getRowsModified = e.prototype.kc;
          e.prototype.create_function = e.prototype.bc;
          e.prototype.create_aggregate = e.prototype.ac;
          e.prototype.updateHook = e.prototype.vc;
          k.Database = e;
        };
        var va = "./this.program", wa = globalThis.document?.currentScript?.src;
        ba && (wa = self.location.href);
        var xa = "", ya, za;
        if (aa || ba) {
          try {
            xa = new URL(".", wa).href;
          } catch {
          }
          ba && (za = (a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, false);
            b.responseType = "arraybuffer";
            b.send(null);
            return new Uint8Array(b.response);
          });
          ya = async (a) => {
            a = await fetch(a, { credentials: "same-origin" });
            if (a.ok) return a.arrayBuffer();
            throw Error(a.status + " : " + a.url);
          };
        }
        var Aa = console.log.bind(console), B = console.error.bind(console), Ba, Ca = false, Da, m, C, Ea, E, F, Fa, Ga, G;
        function Ha() {
          var a = Ia.buffer;
          m = new Int8Array(a);
          Ea = new Int16Array(a);
          C = new Uint8Array(a);
          new Uint16Array(a);
          E = new Int32Array(a);
          F = new Uint32Array(a);
          Fa = new Float32Array(a);
          Ga = new Float64Array(a);
          G = new BigInt64Array(a);
          new BigUint64Array(a);
        }
        function Ja(a) {
          k.onAbort?.(a);
          a = "Aborted(" + a + ")";
          B(a);
          Ca = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        var La;
        async function Ma(a) {
          if (!Ba) try {
            var b = await ya(a);
            return new Uint8Array(b);
          } catch {
          }
          if (a == La && Ba) a = new Uint8Array(Ba);
          else if (za) a = za(a);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        async function Na(a, b) {
          try {
            var c = await Ma(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            B(`failed to asynchronously prepare wasm: ${d}`), Ja(d);
          }
        }
        async function Oa(a) {
          var b = La;
          if (!Ba) try {
            var c = fetch(b, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(c, a);
          } catch (d) {
            B(`wasm streaming compile failed: ${d}`), B("falling back to ArrayBuffer instantiation");
          }
          return Na(b, a);
        }
        class Pa {
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Qa = (a) => {
          for (; 0 < a.length; ) a.shift()(k);
        }, Ra = [], Sa = [], Ta = () => {
          var a = k.preRun.shift();
          Sa.push(a);
        }, J = 0, Ua = null;
        function r(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return m[a];
            case "i8":
              return m[a];
            case "i16":
              return Ea[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return G[a >> 3];
            case "float":
              return Fa[a >> 2];
            case "double":
              return Ga[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Ja(`invalid type for getValue: ${b}`);
          }
        }
        var Va = true;
        function pa(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              m[a] = 0;
              break;
            case "i8":
              m[a] = 0;
              break;
            case "i16":
              Ea[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              G[a >> 3] = BigInt(0);
              break;
            case "float":
              Fa[a >> 2] = 0;
              break;
            case "double":
              Ga[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Ja(`invalid type for setValue: ${b}`);
          }
        }
        var Wa = new TextDecoder(), Xa = (a, b, c, d) => {
          c = b + c;
          if (d) return c;
          for (; a[b] && !(b >= c); ) ++b;
          return b;
        }, z = (a, b, c) => a ? Wa.decode(C.subarray(a, Xa(C, a, b, c))) : "", Ya = (a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b) for (; c; c--) a.unshift("..");
          return a;
        }, ha = (a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = Ya(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, Za = (a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b) return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, $a = (a) => a && a.match(/([^\/]+|\/)\/*$/)[1], ab = () => (a) => crypto.getRandomValues(a), bb = (a) => {
          (bb = ab())(a);
        }, cb = (...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c) throw new TypeError("Arguments to path.resolve must be strings");
            if (!c) return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = Ya(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, db = (a) => {
          var b = Xa(a, 0);
          return Wa.decode(a.buffer ? a.subarray(0, b) : new Uint8Array(a.slice(0, b)));
        }, fb = [], gb = (a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, M = (a, b, c, d) => {
          if (!(0 < d)) return 0;
          var e = c;
          d = c + d - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (c >= d) break;
              b[c++] = h;
            } else if (2047 >= h) {
              if (c + 1 >= d) break;
              b[c++] = 192 | h >> 6;
              b[c++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (c + 2 >= d) break;
              b[c++] = 224 | h >> 12;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
            } else {
              if (c + 3 >= d) break;
              b[c++] = 240 | h >> 18;
              b[c++] = 128 | h >> 12 & 63;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
              g++;
            }
          }
          b[c] = 0;
          return c - e;
        }, pb = [];
        function qb(a, b) {
          pb[a] = { input: [], output: [], kb: b };
          rb(a, sb);
        }
        var sb = { open(a) {
          var b = pb[a.node.nb];
          if (!b) throw new N(43);
          a.Va = b;
          a.seekable = false;
        }, close(a) {
          a.Va.kb.lb(a.Va);
        }, lb(a) {
          a.Va.kb.lb(a.Va);
        }, read(a, b, c, d) {
          if (!a.Va || !a.Va.kb.Qb) throw new N(60);
          for (var e = 0, g = 0; g < d; g++) {
            try {
              var h = a.Va.kb.Qb(a.Va);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === h && 0 === e) throw new N(6);
            if (null === h || void 0 === h) break;
            e++;
            b[c + g] = h;
          }
          e && (a.node.$a = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.Va || !a.Va.kb.Hb) throw new N(60);
          try {
            for (var e = 0; e < d; e++) a.Va.kb.Hb(a.Va, b[c + e]);
          } catch (g) {
            throw new N(29);
          }
          d && (a.node.Ua = a.node.Ta = Date.now());
          return e;
        } }, tb = { Qb() {
          a: {
            if (!fb.length) {
              var a = null;
              globalThis.window?.prompt && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                var b = null;
                break a;
              }
              b = Array(gb(a) + 1);
              a = M(a, b, 0, b.length);
              b.length = a;
              fb = b;
            }
            b = fb.shift();
          }
          return b;
        }, Hb(a, b) {
          null === b || 10 === b ? (Aa(db(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, lb(a) {
          0 < a.output?.length && (Aa(db(a.output)), a.output = []);
        }, Dc() {
          return { yc: 25856, Ac: 5, xc: 191, zc: 35387, wc: [
            3,
            28,
            127,
            21,
            4,
            0,
            1,
            0,
            17,
            19,
            26,
            0,
            18,
            15,
            23,
            22,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ] };
        }, Ec() {
          return 0;
        }, Fc() {
          return [24, 80];
        } }, ub = { Hb(a, b) {
          null === b || 10 === b ? (B(db(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, lb(a) {
          0 < a.output?.length && (B(db(a.output)), a.output = []);
        } }, O = { Za: null, ab() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new N(63);
          O.Za || (O.Za = { dir: { node: { Wa: O.La.Wa, Xa: O.La.Xa, mb: O.La.mb, rb: O.La.rb, Tb: O.La.Tb, xb: O.La.xb, vb: O.La.vb, Ib: O.La.Ib, wb: O.La.wb }, stream: { Ya: O.Ma.Ya } }, file: {
            node: { Wa: O.La.Wa, Xa: O.La.Xa },
            stream: { Ya: O.Ma.Ya, read: O.Ma.read, write: O.Ma.write, sb: O.Ma.sb, tb: O.Ma.tb }
          }, link: { node: { Wa: O.La.Wa, Xa: O.La.Xa, eb: O.La.eb }, stream: {} }, Nb: { node: { Wa: O.La.Wa, Xa: O.La.Xa }, stream: vb } });
          c = wb(a, b, c, d);
          P(c.mode) ? (c.La = O.Za.dir.node, c.Ma = O.Za.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Za.file.node, c.Ma = O.Za.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Za.link.node, c.Ma = O.Za.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Za.Nb.node, c.Ma = O.Za.Nb.stream);
          c.$a = c.Ua = c.Ta = Date.now();
          a && (a.Na[b] = c, a.$a = a.Ua = a.Ta = c.$a);
          return c;
        }, Cc(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: { Wa(a) {
          var b = {};
          b.cc = 8192 === (a.mode & 61440) ? a.id : 1;
          b.oc = a.id;
          b.mode = a.mode;
          b.rc = 1;
          b.uid = 0;
          b.nc = 0;
          b.nb = a.nb;
          P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
          b.$a = new Date(a.$a);
          b.Ua = new Date(a.Ua);
          b.Ta = new Date(a.Ta);
          b.Zb = 4096;
          b.$b = Math.ceil(b.size / b.Zb);
          return b;
        }, Xa(a, b) {
          for (var c of ["mode", "atime", "mtime", "ctime"]) null != b[c] && (a[c] = b[c]);
          void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
        }, mb() {
          O.zb || (O.zb = new N(44), O.zb.stack = "<generic error, no stack>");
          throw O.zb;
        }, rb(a, b, c, d) {
          return O.createNode(a, b, c, d);
        }, Tb(a, b, c) {
          try {
            var d = Q(b, c);
          } catch (g) {
          }
          if (d) {
            if (P(a.mode)) for (var e in d.Na) throw new N(55);
            xb(d);
          }
          delete a.parent.Na[a.name];
          b.Na[c] = a;
          a.name = c;
          b.Ta = b.Ua = a.parent.Ta = a.parent.Ua = Date.now();
        }, xb(a, b) {
          delete a.Na[b];
          a.Ta = a.Ua = Date.now();
        }, vb(a, b) {
          var c = Q(a, b), d;
          for (d in c.Na) throw new N(55);
          delete a.Na[b];
          a.Ta = a.Ua = Date.now();
        }, Ib(a) {
          return [".", "..", ...Object.keys(a.Na)];
        }, wb(a, b, c) {
          a = O.createNode(a, b, 41471, 0);
          a.link = c;
          return a;
        }, eb(a) {
          if (40960 !== (a.mode & 61440)) throw new N(28);
          return a.link;
        } }, Ma: { read(a, b, c, d, e) {
          var g = a.node.Na;
          if (e >= a.node.Ra) return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && g.subarray) b.set(g.subarray(e, e + a), c);
          else for (d = 0; d < a; d++) b[c + d] = g[e + d];
          return a;
        }, write(a, b, c, d, e, g) {
          b.buffer === m.buffer && (g = false);
          if (!d) return 0;
          a = a.node;
          a.Ua = a.Ta = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (g) return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e) return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra) return a.Na.set(b.subarray(c, c + d), e), d;
          }
          g = e + d;
          var h = a.Na ? a.Na.length : 0;
          h >= g || (g = Math.max(g, h * (1048576 > h ? 2 : 1.125) >>> 0), 0 != h && (g = Math.max(g, 256)), h = a.Na, a.Na = new Uint8Array(g), 0 < a.Ra && a.Na.set(h.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray) a.Na.set(b.subarray(c, c + d), e);
          else for (g = 0; g < d; g++) a.Na[e + g] = b[c + g];
          a.Ra = Math.max(
            a.Ra,
            e + d
          );
          return d;
        }, Ya(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b) throw new N(28);
          return b;
        }, sb(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440)) throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== m.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var g = yb(65536, d);
            g && C.fill(0, g, g + d);
            d = g;
            if (!d) throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              m.set(a, d);
            }
          } else e = false, d = a.byteOffset;
          return { tc: d, Ub: e };
        }, tb(a, b, c, d) {
          O.Ma.write(
            a,
            b,
            0,
            d,
            c,
            false
          );
          return 0;
        } } }, ia = (a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, zb = null, Ab = {}, Bb = [], Cb = 1, R = null, Db = false, Eb = true, N = class {
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Fb = class {
          qb = {};
          node = null;
          get flags() {
            return this.qb.flags;
          }
          set flags(a) {
            this.qb.flags = a;
          }
          get position() {
            return this.qb.position;
          }
          set position(a) {
            this.qb.position = a;
          }
        }, Gb = class {
          La = {};
          Ma = {};
          ib = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.ab = a.ab;
            this.id = Cb++;
            this.name = b;
            this.mode = c;
            this.nb = d;
            this.$a = this.Ua = this.Ta = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S(a, b = {}) {
          if (!a) throw new N(44);
          b.Bb ?? (b.Bb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a: for (; 40 > c; c++) {
            a = a.split("/").filter((q) => !!q);
            for (var d = zb, e = "/", g = 0; g < a.length; g++) {
              var h = g === a.length - 1;
              if (h && b.parent) break;
              if ("." !== a[g]) if (".." === a[g]) if (e = Za(e), d === d.parent) {
                a = e + "/" + a.slice(g + 1).join("/");
                c--;
                continue a;
              } else d = d.parent;
              else {
                e = ha(e + "/" + a[g]);
                try {
                  d = Q(d, a[g]);
                } catch (q) {
                  if (44 === q?.Pa && h && b.sc) return { path: e };
                  throw q;
                }
                !d.ib || h && !b.Bb || (d = d.ib.root);
                if (40960 === (d.mode & 61440) && (!h || b.hb)) {
                  if (!d.La.eb) throw new N(52);
                  d = d.La.eb(d);
                  "/" === d.charAt(0) || (d = Za(e) + "/" + d);
                  a = d + "/" + a.slice(g + 1).join("/");
                  continue a;
                }
              }
            }
            return { path: e, node: d };
          }
          throw new N(32);
        }
        function fa(a) {
          for (var b; ; ) {
            if (a === a.parent) return a = a.ab.Sb, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        function Hb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++) c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R.length;
        }
        function xb(a) {
          var b = Hb(a.parent.id, a.name);
          if (R[b] === a) R[b] = a.jb;
          else for (b = R[b]; b; ) {
            if (b.jb === a) {
              b.jb = a.jb;
              break;
            }
            b = b.jb;
          }
        }
        function Q(a, b) {
          var c = P(a.mode) ? (c = Ib(a, "x")) ? c : a.La.mb ? 0 : 2 : 54;
          if (c) throw new N(c);
          for (c = R[Hb(a.id, b)]; c; c = c.jb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
          }
          return a.La.mb(a, b);
        }
        function wb(a, b, c, d) {
          a = new Gb(a, b, c, d);
          b = Hb(a.parent.id, a.name);
          a.jb = R[b];
          return R[b] = a;
        }
        function P(a) {
          return 16384 === (a & 61440);
        }
        function Ib(a, b) {
          return Eb ? 0 : b.includes("r") && !(a.mode & 292) || b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73) ? 2 : 0;
        }
        function Jb(a, b) {
          if (!P(a.mode)) return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Ib(a, "wx");
        }
        function Kb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Ib(a, "wx")) return a;
          if (c) {
            if (!P(d.mode)) return 54;
            if (d === d.parent || "/" === fa(d)) return 10;
          } else if (P(d.mode)) return 31;
          return 0;
        }
        function Lb(a) {
          if (!a) throw new N(63);
          return a;
        }
        function T(a) {
          a = Bb[a];
          if (!a) throw new N(8);
          return a;
        }
        function Mb(a, b = -1) {
          a = Object.assign(new Fb(), a);
          if (-1 == b) a: {
            for (b = 0; 4096 >= b; b++) if (!Bb[b]) break a;
            throw new N(33);
          }
          a.bb = b;
          return Bb[b] = a;
        }
        function Nb(a, b = -1) {
          a = Mb(a, b);
          a.Ma?.Bc?.(a);
          return a;
        }
        function Ob(a, b, c) {
          var d = a?.Ma.Xa;
          a = d ? a : b;
          d ??= b.La.Xa;
          Lb(d);
          d(a, c);
        }
        var vb = { open(a) {
          a.Ma = Ab[a.node.nb].Ma;
          a.Ma.open?.(a);
        }, Ya() {
          throw new N(70);
        } };
        function rb(a, b) {
          Ab[a] = { Ma: b };
        }
        function Pb(a, b) {
          var c = "/" === b;
          if (c && zb) throw new N(10);
          if (!c && b) {
            var d = S(b, { Bb: false });
            b = d.path;
            d = d.node;
            if (d.ib) throw new N(10);
            if (!P(d.mode)) throw new N(54);
          }
          b = { type: a, Gc: {}, Sb: b, qc: [] };
          a = a.ab(b);
          a.ab = b;
          b.root = a;
          c ? zb = a : d && (d.ib = b, d.ab && d.ab.qc.push(b));
        }
        function Qb(a, b, c) {
          var d = S(a, { parent: true }).node;
          a = $a(a);
          if (!a) throw new N(28);
          if ("." === a || ".." === a) throw new N(20);
          var e = Jb(d, a);
          if (e) throw new N(e);
          if (!d.La.rb) throw new N(63);
          return d.La.rb(d, a, b, c);
        }
        function ja(a, b = 438) {
          return Qb(a, b & 4095 | 32768, 0);
        }
        function U(a, b = 511) {
          return Qb(a, b & 1023 | 16384, 0);
        }
        function Rb(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Qb(a, b | 8192, c);
        }
        function Sb(a, b) {
          if (!cb(a)) throw new N(44);
          var c = S(b, { parent: true }).node;
          if (!c) throw new N(44);
          b = $a(b);
          var d = Jb(c, b);
          if (d) throw new N(d);
          if (!c.La.wb) throw new N(63);
          c.La.wb(c, b, a);
        }
        function Tb(a) {
          var b = S(a, { parent: true }).node;
          a = $a(a);
          var c = Q(b, a), d = Kb(b, a, true);
          if (d) throw new N(d);
          if (!b.La.vb) throw new N(63);
          if (c.ib) throw new N(10);
          b.La.vb(b, a);
          xb(c);
        }
        function ta(a) {
          var b = S(a, { parent: true }).node;
          if (!b) throw new N(44);
          a = $a(a);
          var c = Q(b, a), d = Kb(b, a, false);
          if (d) throw new N(d);
          if (!b.La.xb) throw new N(63);
          if (c.ib) throw new N(10);
          b.La.xb(b, a);
          xb(c);
        }
        function Ub(a, b) {
          a = S(a, { hb: !b }).node;
          return Lb(a.La.Wa)(a);
        }
        function Vb(a, b, c, d) {
          Ob(a, b, { mode: c & 4095 | b.mode & -4096, Ta: Date.now(), dc: d });
        }
        function ka(a, b) {
          a = "string" == typeof a ? S(a, { hb: true }).node : a;
          Vb(null, a, b);
        }
        function Wb(a, b, c) {
          if (P(b.mode)) throw new N(31);
          if (32768 !== (b.mode & 61440)) throw new N(28);
          var d = Ib(b, "w");
          if (d) throw new N(d);
          Ob(a, b, { size: c, timestamp: Date.now() });
        }
        function la(a, b, c = 438) {
          if ("" === a) throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a) d = a;
          else {
            var e = a.endsWith("/");
            var g = S(a, { hb: !(b & 131072), sc: true });
            d = g.node;
            a = g.path;
          }
          g = false;
          if (b & 64) if (d) {
            if (b & 128) throw new N(20);
          } else {
            if (e) throw new N(31);
            d = Qb(a, c | 511, 0);
            g = true;
          }
          if (!d) throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode)) throw new N(54);
          if (!g && (d ? 40960 === (d.mode & 61440) ? e = 32 : (e = ["r", "w", "rw"][b & 3], b & 512 && (e += "w"), e = P(d.mode) && ("r" !== e || b & 576) ? 31 : Ib(d, e)) : e = 44, e)) throw new N(e);
          b & 512 && !g && (e = d, e = "string" == typeof e ? S(e, { hb: true }).node : e, Wb(null, e, 0));
          b = Mb({ node: d, path: fa(d), flags: b & -131713, seekable: true, position: 0, Ma: d.Ma, uc: [], error: false });
          b.Ma.open && b.Ma.open(b);
          g && ka(d, c & 511);
          return b;
        }
        function na(a) {
          if (null === a.bb) throw new N(8);
          a.Eb && (a.Eb = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Bb[a.bb] = null;
          }
          a.bb = null;
        }
        function Xb(a, b, c) {
          if (null === a.bb) throw new N(8);
          if (!a.seekable || !a.Ma.Ya) throw new N(70);
          if (0 != c && 1 != c && 2 != c) throw new N(28);
          a.position = a.Ma.Ya(a, b, c);
          a.uc = [];
        }
        function Yb(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.bb) throw new N(8);
          if (1 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.read) throw new N(28);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          g || (a.position += b);
          return b;
        }
        function ma(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.bb) throw new N(8);
          if (0 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.write) throw new N(28);
          a.seekable && a.flags & 1024 && Xb(a, 0, 2);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          g || (a.position += b);
          return b;
        }
        function sa(a) {
          var b = b || 0;
          var c = "binary";
          "utf8" !== c && "binary" !== c && Ja(`Invalid encoding type "${c}"`);
          b = la(a, b);
          a = Ub(a).size;
          var d = new Uint8Array(a);
          Yb(b, d, 0, a, 0);
          "utf8" === c && (d = db(d));
          na(b);
          return d;
        }
        function W(a, b, c) {
          a = ha("/dev/" + a);
          var d = ia(!!b, !!c);
          W.Rb ?? (W.Rb = 64);
          var e = W.Rb++ << 8 | 0;
          rb(e, { open(g) {
            g.seekable = false;
          }, close() {
            c?.buffer?.length && c(10);
          }, read(g, h, q, w) {
            for (var t = 0, x = 0; x < w; x++) {
              try {
                var D = b();
              } catch (ib) {
                throw new N(29);
              }
              if (void 0 === D && 0 === t) throw new N(6);
              if (null === D || void 0 === D) break;
              t++;
              h[q + x] = D;
            }
            t && (g.node.$a = Date.now());
            return t;
          }, write(g, h, q, w) {
            for (var t = 0; t < w; t++) try {
              c(h[q + t]);
            } catch (x) {
              throw new N(29);
            }
            w && (g.node.Ua = g.node.Ta = Date.now());
            return t;
          } });
          Rb(a, d, e);
        }
        var X = {};
        function Y(a, b, c) {
          if ("/" === b.charAt(0)) return b;
          a = -100 === a ? "/" : T(a).path;
          if (0 == b.length) {
            if (!c) throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        function Zb(a, b) {
          F[a >> 2] = b.cc;
          F[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.rc;
          F[a + 12 >> 2] = b.uid;
          F[a + 16 >> 2] = b.nc;
          F[a + 20 >> 2] = b.nb;
          G[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.$b;
          var c = b.$a.getTime(), d = b.Ua.getTime(), e = b.Ta.getTime();
          G[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          G[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          G[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          G[a + 88 >> 3] = BigInt(b.oc);
          return 0;
        }
        var ic = void 0, Ac = () => {
          var a = E[+ic >> 2];
          ic += 4;
          return a;
        }, Cc = 0, Dc = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Ec = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Fc = {}, Gc = (a) => {
          if (!(a instanceof Pa || "unwind" == a)) throw a;
        }, Hc = (a) => {
          Da = a;
          Va || 0 < Cc || (k.onExit?.(a), Ca = true);
          throw new Pa(a);
        }, Ic = (a) => {
          if (!Ca) try {
            a();
          } catch (b) {
            Gc(b);
          } finally {
            if (!(Va || 0 < Cc)) try {
              Da = a = Da, Hc(a);
            } catch (b) {
              Gc(b);
            }
          }
        }, Jc = {}, Lc = () => {
          if (!Kc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: va || "./this.program" }, b;
            for (b in Jc) void 0 === Jc[b] ? delete a[b] : a[b] = Jc[b];
            var c = [];
            for (b in a) c.push(`${b}=${a[b]}`);
            Kc = c;
          }
          return Kc;
        }, Kc, Mc = (a, b, c, d) => {
          var e = { string: (t) => {
            var x = 0;
            if (null !== t && void 0 !== t && 0 !== t) {
              x = gb(t) + 1;
              var D = y(x);
              M(t, C, D, x);
              x = D;
            }
            return x;
          }, array: (t) => {
            var x = y(t.length);
            m.set(t, x);
            return x;
          } };
          a = k["_" + a];
          var g = [], h = 0;
          if (d) for (var q = 0; q < d.length; q++) {
            var w = e[c[q]];
            w ? (0 === h && (h = oa()), g[q] = w(d[q])) : g[q] = d[q];
          }
          c = a(...g);
          return c = function(t) {
            0 !== h && qa(h);
            return "string" === b ? z(t) : "boolean" === b ? !!t : t;
          }(c);
        }, ea = (a) => {
          var b = gb(a) + 1, c = ca(b);
          c && M(a, C, c, b);
          return c;
        }, Nc, Oc = [], A = (a) => {
          Nc.delete(Z.get(a));
          Z.set(a, null);
          Oc.push(a);
        }, Pc = (a) => {
          const b = a.length;
          return [b % 128 | 128, b >> 7, ...a];
        }, Qc = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, Rc = (a) => Pc(Array.from(a, (b) => Qc[b])), ua = (a, b) => {
          if (!Nc) {
            Nc = /* @__PURE__ */ new WeakMap();
            var c = Z.length;
            if (Nc) for (var d = 0; d < 0 + c; d++) {
              var e = Z.get(d);
              e && Nc.set(e, d);
            }
          }
          if (c = Nc.get(a) || 0) return c;
          c = Oc.length ? Oc.pop() : Z.grow(1);
          try {
            Z.set(c, a);
          } catch (g) {
            if (!(g instanceof TypeError)) throw g;
            b = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...Pc([1, 96, ...Rc(b.slice(1)), ...Rc("v" === b[0] ? "" : b[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            b = new WebAssembly.Module(b);
            b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            Z.set(c, b);
          }
          Nc.set(a, c);
          return c;
        };
        R = Array(4096);
        Pb(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          rb(259, { read: () => 0, write: (d, e, g, h) => h, Ya: () => 0 });
          Rb("/dev/null", 259);
          qb(1280, tb);
          qb(1536, ub);
          Rb("/dev/tty", 1280);
          Rb("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = () => {
            0 === b && (bb(a), b = a.byteLength);
            return a[--b];
          };
          W("random", c);
          W("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Pb({ ab() {
            var b = wb(a, "fd", 16895, 73);
            b.Ma = { Ya: O.Ma.Ya };
            b.La = { mb(c, d) {
              c = +d;
              var e = T(c);
              c = { parent: null, ab: { Sb: "fake" }, La: { eb: () => e.path }, id: c + 1 };
              return c.parent = c;
            }, Ib() {
              return Array.from(Bb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        k.noExitRuntime && (Va = k.noExitRuntime);
        k.print && (Aa = k.print);
        k.printErr && (B = k.printErr);
        k.wasmBinary && (Ba = k.wasmBinary);
        k.thisProgram && (va = k.thisProgram);
        if (k.preInit) for ("function" == typeof k.preInit && (k.preInit = [k.preInit]); 0 < k.preInit.length; ) k.preInit.shift()();
        k.stackSave = () => oa();
        k.stackRestore = (a) => qa(a);
        k.stackAlloc = (a) => y(a);
        k.cwrap = (a, b, c, d) => {
          var e = !c || c.every((g) => "number" === g || "boolean" === g);
          return "string" !== b && e && !d ? k["_" + a] : (...g) => Mc(a, b, c, g);
        };
        k.addFunction = ua;
        k.removeFunction = A;
        k.UTF8ToString = z;
        k.stringToNewUTF8 = ea;
        k.writeArrayToMemory = (a, b) => {
          m.set(a, b);
        };
        var ca, da, yb, Sc, qa, y, oa, Ia, Z, Tc = {
          a: (a, b, c, d) => Ja(`Assertion failed: ${z(a)}, at: ` + [b ? z(b) : "unknown filename", c, d ? z(d) : "unknown function"]),
          i: function(a, b) {
            try {
              return a = z(a), ka(a, b), 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          L: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c & -8) return -28;
              var d = S(b, { hb: true }).node;
              if (!d) return -44;
              a = "";
              c & 4 && (a += "r");
              c & 2 && (a += "w");
              c & 1 && (a += "x");
              return a && Ib(d, a) ? -2 : 0;
            } catch (e) {
              if ("undefined" == typeof X || "ErrnoError" !== e.name) throw e;
              return -e.Pa;
            }
          },
          j: function(a, b) {
            try {
              var c = T(a);
              Vb(c, c.node, b, false);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          h: function(a) {
            try {
              var b = T(a);
              Ob(b, b.node, { timestamp: Date.now(), dc: false });
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          b: function(a, b, c) {
            ic = c;
            try {
              var d = T(a);
              switch (b) {
                case 0:
                  var e = Ac();
                  if (0 > e) break;
                  for (; Bb[e]; ) e++;
                  return Nb(d, e).bb;
                case 1:
                case 2:
                  return 0;
                case 3:
                  return d.flags;
                case 4:
                  return e = Ac(), d.flags |= e, 0;
                case 12:
                  return e = Ac(), Ea[e + 0 >> 1] = 2, 0;
                case 13:
                case 14:
                  return 0;
              }
              return -28;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          g: function(a, b) {
            try {
              var c = T(a), d = c.node, e = c.Ma.Wa;
              a = e ? c : d;
              e ??= d.La.Wa;
              Lb(e);
              var g = e(a);
              return Zb(b, g);
            } catch (h) {
              if ("undefined" == typeof X || "ErrnoError" !== h.name) throw h;
              return -h.Pa;
            }
          },
          H: function(a, b) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return -61;
              var c = T(a);
              if (0 > b || 0 === (c.flags & 2097155)) throw new N(28);
              Wb(c, c.node, b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          G: function(a, b) {
            try {
              if (0 === b) return -28;
              var c = gb("/") + 1;
              if (b < c) return -68;
              M("/", C, a, b);
              return c;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          K: function(a, b) {
            try {
              return a = z(a), Zb(b, Ub(a, true));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          C: function(a, b, c) {
            try {
              return b = z(b), b = Y(a, b), U(b, c), 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          J: function(a, b, c, d) {
            try {
              b = z(b);
              var e = d & 256;
              b = Y(a, b, d & 4096);
              return Zb(c, e ? Ub(b, true) : Ub(b));
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          x: function(a, b, c, d) {
            ic = d;
            try {
              b = z(b);
              b = Y(a, b);
              var e = d ? Ac() : 0;
              return la(b, c, e).bb;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          v: function(a, b, c, d) {
            try {
              b = z(b);
              b = Y(a, b);
              if (0 >= d) return -28;
              var e = S(b).node;
              if (!e) throw new N(44);
              if (!e.La.eb) throw new N(28);
              var g = e.La.eb(e);
              var h = Math.min(d, gb(g)), q = m[c + h];
              M(g, C, c, d + 1);
              m[c + h] = q;
              return h;
            } catch (w) {
              if ("undefined" == typeof X || "ErrnoError" !== w.name) throw w;
              return -w.Pa;
            }
          },
          u: function(a) {
            try {
              return a = z(a), Tb(a), 0;
            } catch (b) {
              if ("undefined" == typeof X || "ErrnoError" !== b.name) throw b;
              return -b.Pa;
            }
          },
          f: function(a, b) {
            try {
              return a = z(a), Zb(b, Ub(a));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          r: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c) if (512 === c) Tb(b);
              else return -28;
              else ta(b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          q: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b, true);
              var d = Date.now(), e, g;
              if (c) {
                var h = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
                1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * h + q / 1e6;
                c += 16;
                h = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
                q = E[c + 8 >> 2];
                1073741823 == q ? g = d : 1073741822 == q ? g = null : g = 1e3 * h + q / 1e6;
              } else g = e = d;
              if (null !== (g ?? e)) {
                a = e;
                var w = S(b, { hb: true }).node;
                Lb(w.La.Xa)(w, { $a: a, Ua: g });
              }
              return 0;
            } catch (t) {
              if ("undefined" == typeof X || "ErrnoError" !== t.name) throw t;
              return -t.Pa;
            }
          },
          m: () => Ja(""),
          l: () => {
            Va = false;
            Cc = 0;
          },
          A: function(a, b) {
            a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
            a = new Date(1e3 * a);
            E[b >> 2] = a.getSeconds();
            E[b + 4 >> 2] = a.getMinutes();
            E[b + 8 >> 2] = a.getHours();
            E[b + 12 >> 2] = a.getDate();
            E[b + 16 >> 2] = a.getMonth();
            E[b + 20 >> 2] = a.getFullYear() - 1900;
            E[b + 24 >> 2] = a.getDay();
            var c = a.getFullYear();
            E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Ec : Dc)[a.getMonth()] + a.getDate() - 1 | 0;
            E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
            c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
            var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
            E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
          },
          y: function(a, b, c, d, e, g, h) {
            e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
            try {
              var q = T(d);
              if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155)) throw new N(2);
              if (1 === (q.flags & 2097155)) throw new N(2);
              if (!q.Ma.sb) throw new N(43);
              if (!a) throw new N(28);
              var w = q.Ma.sb(q, a, e, b, c);
              var t = w.tc;
              E[g >> 2] = w.Ub;
              F[h >> 2] = t;
              return 0;
            } catch (x) {
              if ("undefined" == typeof X || "ErrnoError" !== x.name) throw x;
              return -x.Pa;
            }
          },
          z: function(a, b, c, d, e, g) {
            g = -9007199254740992 > g || 9007199254740992 < g ? NaN : Number(g);
            try {
              var h = T(e);
              if (c & 2) {
                if (32768 !== (h.node.mode & 61440)) throw new N(43);
                d & 2 || h.Ma.tb && h.Ma.tb(h, C.slice(a, a + b), g, b, d);
              }
            } catch (q) {
              if ("undefined" == typeof X || "ErrnoError" !== q.name) throw q;
              return -q.Pa;
            }
          },
          n: (a, b) => {
            Fc[a] && (clearTimeout(Fc[a].id), delete Fc[a]);
            if (!b) return 0;
            var c = setTimeout(() => {
              delete Fc[a];
              Ic(() => Sc(a, performance.now()));
            }, b);
            Fc[a] = { id: c, Hc: b };
            return 0;
          },
          B: (a, b, c, d) => {
            var e = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            F[a >> 2] = 60 * Math.max(g, e);
            E[b >> 2] = Number(g != e);
            b = (h) => {
              var q = Math.abs(h);
              return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
            };
            a = b(g);
            b = b(e);
            e < g ? (M(a, C, c, 17), M(b, C, d, 17)) : (M(a, C, d, 17), M(b, C, c, 17));
          },
          d: () => Date.now(),
          s: () => 2147483648,
          c: () => performance.now(),
          o: (a) => {
            var b = C.length;
            a >>>= 0;
            if (2147483648 < a) return false;
            for (var c = 1; 4 >= c; c *= 2) {
              var d = b * (1 + 0.2 / c);
              d = Math.min(d, a + 100663296);
              a: {
                d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(a, d) / 65536)) - Ia.buffer.byteLength + 65535) / 65536 | 0;
                try {
                  Ia.grow(d);
                  Ha();
                  var e = 1;
                  break a;
                } catch (g) {
                }
                e = void 0;
              }
              if (e) return true;
            }
            return false;
          },
          E: (a, b) => {
            var c = 0, d = 0, e;
            for (e of Lc()) {
              var g = b + c;
              F[a + d >> 2] = g;
              c += M(e, C, g, Infinity) + 1;
              d += 4;
            }
            return 0;
          },
          F: (a, b) => {
            var c = Lc();
            F[a >> 2] = c.length;
            a = 0;
            for (var d of c) a += gb(d) + 1;
            F[b >> 2] = a;
            return 0;
          },
          e: function(a) {
            try {
              var b = T(a);
              na(b);
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          p: function(a, b) {
            try {
              var c = T(a);
              m[b] = c.Va ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
              Ea[b + 2 >> 1] = 0;
              G[b + 8 >> 3] = BigInt(0);
              G[b + 16 >> 3] = BigInt(0);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return d.Pa;
            }
          },
          w: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], w = F[a + 4 >> 2];
                  a += 8;
                  var t = Yb(e, m, q, w, g);
                  if (0 > t) {
                    var x = -1;
                    break a;
                  }
                  b += t;
                  if (t < w) break;
                  "undefined" != typeof g && (g += t);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          D: function(a, b, c, d) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return 61;
              var e = T(a);
              Xb(e, b, c);
              G[d >> 3] = BigInt(e.position);
              e.Eb && 0 === b && 0 === c && (e.Eb = null);
              return 0;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return g.Pa;
            }
          },
          I: function(a) {
            try {
              var b = T(a);
              return b.Ma?.lb?.(b);
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          t: function(a, b, c, d) {
            try {
              a: {
                var e = T(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], w = F[a + 4 >> 2];
                  a += 8;
                  var t = ma(e, m, q, w, g);
                  if (0 > t) {
                    var x = -1;
                    break a;
                  }
                  b += t;
                  if (t < w) break;
                  "undefined" != typeof g && (g += t);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          k: Hc
        };
        function Uc() {
          function a() {
            k.calledRun = true;
            if (!Ca) {
              if (!k.noFSInit && !Db) {
                var b, c;
                Db = true;
                b ??= k.stdin;
                c ??= k.stdout;
                d ??= k.stderr;
                b ? W("stdin", b) : Sb("/dev/tty", "/dev/stdin");
                c ? W("stdout", null, c) : Sb("/dev/tty", "/dev/stdout");
                d ? W("stderr", null, d) : Sb("/dev/tty1", "/dev/stderr");
                la("/dev/stdin", 0);
                la("/dev/stdout", 1);
                la("/dev/stderr", 1);
              }
              Vc.N();
              Eb = false;
              k.onRuntimeInitialized?.();
              if (k.postRun) for ("function" == typeof k.postRun && (k.postRun = [k.postRun]); k.postRun.length; ) {
                var d = k.postRun.shift();
                Ra.push(d);
              }
              Qa(Ra);
            }
          }
          if (0 < J) Ua = Uc;
          else {
            if (k.preRun) for ("function" == typeof k.preRun && (k.preRun = [k.preRun]); k.preRun.length; ) Ta();
            Qa(Sa);
            0 < J ? Ua = Uc : k.setStatus ? (k.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => k.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        var Vc;
        (async function() {
          function a(c) {
            c = Vc = c.exports;
            k._sqlite3_free = c.P;
            k._sqlite3_value_text = c.Q;
            k._sqlite3_prepare_v2 = c.R;
            k._sqlite3_step = c.S;
            k._sqlite3_reset = c.T;
            k._sqlite3_exec = c.U;
            k._sqlite3_finalize = c.V;
            k._sqlite3_column_name = c.W;
            k._sqlite3_column_text = c.X;
            k._sqlite3_column_type = c.Y;
            k._sqlite3_errmsg = c.Z;
            k._sqlite3_clear_bindings = c._;
            k._sqlite3_value_blob = c.$;
            k._sqlite3_value_bytes = c.aa;
            k._sqlite3_value_double = c.ba;
            k._sqlite3_value_int = c.ca;
            k._sqlite3_value_type = c.da;
            k._sqlite3_result_blob = c.ea;
            k._sqlite3_result_double = c.fa;
            k._sqlite3_result_error = c.ga;
            k._sqlite3_result_int = c.ha;
            k._sqlite3_result_int64 = c.ia;
            k._sqlite3_result_null = c.ja;
            k._sqlite3_result_text = c.ka;
            k._sqlite3_aggregate_context = c.la;
            k._sqlite3_column_count = c.ma;
            k._sqlite3_data_count = c.na;
            k._sqlite3_column_blob = c.oa;
            k._sqlite3_column_bytes = c.pa;
            k._sqlite3_column_double = c.qa;
            k._sqlite3_bind_blob = c.ra;
            k._sqlite3_bind_double = c.sa;
            k._sqlite3_bind_int = c.ta;
            k._sqlite3_bind_text = c.ua;
            k._sqlite3_bind_parameter_index = c.va;
            k._sqlite3_sql = c.wa;
            k._sqlite3_normalized_sql = c.xa;
            k._sqlite3_changes = c.ya;
            k._sqlite3_close_v2 = c.za;
            k._sqlite3_create_function_v2 = c.Aa;
            k._sqlite3_update_hook = c.Ba;
            k._sqlite3_open = c.Ca;
            ca = k._malloc = c.Da;
            da = k._free = c.Ea;
            k._RegisterExtensionFunctions = c.Fa;
            yb = c.Ga;
            Sc = c.Ha;
            qa = c.Ia;
            y = c.Ja;
            oa = c.Ka;
            Ia = c.M;
            Z = c.O;
            Ha();
            J--;
            k.monitorRunDependencies?.(J);
            0 == J && Ua && (c = Ua, Ua = null, c());
            return Vc;
          }
          J++;
          k.monitorRunDependencies?.(J);
          var b = { a: Tc };
          if (k.instantiateWasm) return new Promise((c) => {
            k.instantiateWasm(b, (d, e) => {
              c(a(d, e));
            });
          });
          La ??= k.locateFile ? k.locateFile("sql-wasm-browser.wasm", xa) : xa + "sql-wasm-browser.wasm";
          return a((await Oa(b)).instance);
        })();
        Uc();
        return Module;
      });
      return initSqlJsPromise;
    };
    if (typeof exports === "object" && typeof module === "object") {
      module.exports = initSqlJs;
      module.exports.default = initSqlJs;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs;
      });
    } else if (typeof exports === "object") {
      exports["Module"] = initSqlJs;
    }
  }
});

// dist/chunk-BYTAOXGW.js
function isVariable(t) {
  return t.kind === "variable";
}
function isLiteral(t) {
  return t.kind === "literal";
}
var QueryEngine = class _QueryEngine {
  constructor(store) {
    this.store = store;
  }
  rules = /* @__PURE__ */ new Map();
  maxRuleDepth = 32;
  /** Register a Datalog rule. Multiple rules with the same name = union. */
  addRule(rule) {
    const existing = this.rules.get(rule.name) ?? [];
    existing.push(rule);
    this.rules.set(rule.name, existing);
  }
  removeRule(name) {
    this.rules.delete(name);
  }
  /** Execute a query against the store. */
  execute(query) {
    const start = performance.now();
    let results = this._evaluatePatterns(query.where, [/* @__PURE__ */ new Map()]);
    for (const filter of query.filters) {
      results = results.filter((b) => this._evalFilter(filter, b));
    }
    if (query.aggregates.length > 0) {
      results = this._aggregate(results, query.aggregates, query.select);
    }
    if (query.orderBy.length > 0) {
      results = this._order(results, query.orderBy);
    }
    if (query.offset > 0) results = results.slice(query.offset);
    if (query.limit > 0) results = results.slice(0, query.limit);
    const projectVars = query.select.length > 0 ? [...query.select, ...query.aggregates.map((a) => a.as)] : [];
    const projected = this._project(results, projectVars);
    return {
      bindings: projected,
      executionTime: performance.now() - start,
      count: projected.length
    };
  }
  // -------------------------------------------------------------------------
  // Pattern evaluation
  // -------------------------------------------------------------------------
  _evaluatePatterns(patterns, bindings) {
    let current = bindings;
    for (const pattern of patterns) {
      if (current.length === 0) break;
      current = this._evaluatePattern(pattern, current);
    }
    return current;
  }
  _evaluatePattern(pattern, bindings) {
    switch (pattern.kind) {
      case "fact":
        return this._evalFactPattern(pattern, bindings);
      case "link":
        return this._evalLinkPattern(pattern, bindings);
      case "not":
        return this._evalNotPattern(pattern, bindings);
      case "or":
        return this._evalOrPattern(pattern, bindings);
      case "rule":
        return this._evalRuleApplication(pattern, bindings);
    }
  }
  _evalFactPattern(p, bindings) {
    const results = [];
    for (const b of bindings) {
      const eResolved = this._resolve(p.entity, b);
      const aResolved = this._resolve(p.attribute, b);
      const vResolved = this._resolve(p.value, b);
      let facts;
      if (eResolved !== void 0 && aResolved !== void 0) {
        facts = this.store.getFactsByEntity(String(eResolved)).filter((f2) => f2.a === aResolved);
      } else if (eResolved !== void 0) {
        facts = this.store.getFactsByEntity(String(eResolved));
      } else if (aResolved !== void 0 && vResolved !== void 0) {
        facts = this.store.getFactsByValue(String(aResolved), vResolved);
      } else if (aResolved !== void 0) {
        facts = this.store.getFactsByAttribute(String(aResolved));
      } else {
        facts = this.store.getAllFacts();
      }
      if (vResolved !== void 0) {
        facts = facts.filter((f2) => f2.v === vResolved);
      }
      for (const fact of facts) {
        const nb = new Map(b);
        if (this._bind(p.entity, fact.e, nb) && this._bind(p.attribute, fact.a, nb) && this._bind(p.value, fact.v, nb)) {
          results.push(nb);
        }
      }
    }
    return results;
  }
  _evalLinkPattern(p, bindings) {
    const results = [];
    for (const b of bindings) {
      const srcResolved = this._resolve(p.source, b);
      const attrResolved = this._resolve(p.attribute, b);
      const tgtResolved = this._resolve(p.target, b);
      let links;
      if (srcResolved !== void 0 && attrResolved !== void 0) {
        links = this.store.getLinksByEntityAndAttribute(
          String(srcResolved),
          String(attrResolved)
        );
      } else if (srcResolved !== void 0) {
        links = this.store.getLinksByEntity(String(srcResolved));
      } else if (attrResolved !== void 0) {
        links = this.store.getLinksByAttribute(String(attrResolved));
      } else {
        links = this.store.getAllLinks();
      }
      if (tgtResolved !== void 0) {
        links = links.filter((l) => l.e2 === tgtResolved);
      }
      for (const link of links) {
        const nb = new Map(b);
        if (this._bind(p.source, link.e1, nb) && this._bind(p.attribute, link.a, nb) && this._bind(p.target, link.e2, nb)) {
          results.push(nb);
        }
      }
    }
    return results;
  }
  _evalNotPattern(p, bindings) {
    return bindings.filter((b) => {
      const matches = this._evaluatePattern(p.pattern, [b]);
      return matches.length === 0;
    });
  }
  _evalOrPattern(p, bindings) {
    const results = [];
    for (const branch of p.branches) {
      const branchResults = this._evaluatePatterns(branch, bindings);
      results.push(...branchResults);
    }
    return this._dedup(results);
  }
  _evalRuleApplication(p, bindings, depth = 0) {
    if (depth > this.maxRuleDepth) return [];
    const ruleDefs = this.rules.get(p.name);
    if (!ruleDefs) return [];
    const results = [];
    for (const b of bindings) {
      for (const rule of ruleDefs) {
        const ruleBindings = new Map(b);
        let ok = true;
        for (let i = 0; i < rule.params.length && i < p.args.length; i++) {
          const resolved = this._resolve(p.args[i], b);
          if (resolved !== void 0) {
            ruleBindings.set(rule.params[i], resolved);
          } else if (isVariable(p.args[i])) {
          }
        }
        if (!ok) continue;
        let bodyResults = this._evaluatePatterns(rule.body, [ruleBindings]);
        for (const f2 of rule.filters) {
          bodyResults = bodyResults.filter((rb) => this._evalFilter(f2, rb));
        }
        for (const rb of bodyResults) {
          const nb = new Map(b);
          for (let i = 0; i < rule.params.length && i < p.args.length; i++) {
            if (isVariable(p.args[i])) {
              const val = rb.get(rule.params[i]);
              if (val !== void 0)
                nb.set(p.args[i].name, val);
            }
          }
          results.push(nb);
        }
      }
    }
    return this._dedup(results);
  }
  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------
  _evalFilter(filter, b) {
    const left = this._resolve(filter.left, b);
    const right = this._resolve(filter.right, b);
    if (left === void 0 || right === void 0) return false;
    switch (filter.op) {
      case "=":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "contains":
        return String(left).includes(String(right));
      case "startsWith":
        return String(left).startsWith(String(right));
      case "endsWith":
        return String(left).endsWith(String(right));
      case "matches":
        return new RegExp(String(right)).test(String(left));
      default:
        return false;
    }
  }
  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------
  _aggregate(bindings, aggregates, groupBy) {
    const aggVarNames = new Set(aggregates.map((a) => a.as));
    const groupVars = groupBy.filter((v) => !aggVarNames.has(v));
    const groups = /* @__PURE__ */ new Map();
    for (const b of bindings) {
      const key = groupVars.map((v) => String(b.get(v) ?? "")).join("\0");
      const group = groups.get(key) ?? [];
      group.push(b);
      groups.set(key, group);
    }
    const results = [];
    for (const [, group] of groups) {
      const nb = new Map(group[0]);
      for (const agg of aggregates) {
        const vals = group.map((b) => b.get(agg.variable)).filter((v) => v !== void 0);
        nb.set(agg.as, this._computeAggregate(agg.op, vals));
      }
      results.push(nb);
    }
    return results;
  }
  _computeAggregate(op, vals) {
    switch (op) {
      case "count":
        return vals.length;
      case "sum":
        return vals.reduce(
          (s, v) => s + (Number(v) || 0),
          0
        );
      case "avg":
        return vals.length ? vals.reduce(
          (s, v) => s + (Number(v) || 0),
          0
        ) / vals.length : 0;
      case "min":
        return vals.reduce(
          (m, v) => v < m ? v : m,
          vals[0]
        );
      case "max":
        return vals.reduce(
          (m, v) => v > m ? v : m,
          vals[0]
        );
      case "collect":
        return JSON.stringify(vals);
      default:
        return vals.length;
    }
  }
  // -------------------------------------------------------------------------
  // Ordering
  // -------------------------------------------------------------------------
  /**
   * Semantic rank for known enum values. EQL-S stores these as raw strings, so
   * a plain `<`/`>` comparison would be lexicographic (medium > critical).
   * Mapping values to ranks lets `ORDER BY ?priority` / `ORDER BY ?status`
   * honor the workflow order. Keyed by value (not attribute) since the tokens
   * are unambiguous across the two enums.
   */
  static ENUM_RANKS = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    backlog: 0,
    queue: 1,
    in_progress: 2,
    paused: 3,
    closed: 4
  };
  _order(bindings, orderBy) {
    return [...bindings].sort((a, b) => {
      for (const o of orderBy) {
        const va = a.get(o.variable);
        const vb = b.get(o.variable);
        if (va === vb) continue;
        if (va === void 0) return 1;
        if (vb === void 0) return -1;
        const sa = String(va);
        const sb = String(vb);
        const ra = _QueryEngine.ENUM_RANKS[sa];
        const rb = _QueryEngine.ENUM_RANKS[sb];
        const cmp = ra !== void 0 && rb !== void 0 ? ra < rb ? -1 : 1 : sa < sb ? -1 : 1;
        return o.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }
  // -------------------------------------------------------------------------
  // Projection
  // -------------------------------------------------------------------------
  _project(bindings, select) {
    return bindings.map((b) => {
      const row = {};
      if (select.length === 0) {
        for (const [k, v] of b) row[k] = v;
      } else {
        for (const s of select) {
          const v = b.get(s);
          if (v !== void 0) row[s] = v;
        }
      }
      return row;
    });
  }
  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  _resolve(term, bindings) {
    if (isLiteral(term)) return term.value;
    return bindings.get(term.name);
  }
  _bind(term, value, bindings) {
    if (isLiteral(term)) return term.value === value;
    const existing = bindings.get(term.name);
    if (existing !== void 0) return existing === value;
    bindings.set(term.name, value);
    return true;
  }
  _dedup(bindings) {
    const seen = /* @__PURE__ */ new Set();
    return bindings.filter((b) => {
      const key = [...b.entries()].sort(([a], [b2]) => a.localeCompare(b2)).map(([k, v]) => `${k}=${v}`).join("\0");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
};

// dist/chunk-2ESYSVXG.js
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
};

// dist/chunk-G3XIHPSQ.js
var EAVStore;
var init_eav_store = __esm({
  "src/core/store/eav-store.ts"() {
    "use strict";
    EAVStore = class {
      facts = [];
      links = [];
      catalog = /* @__PURE__ */ new Map();
      // Indexes for fast lookups
      eavIndex = /* @__PURE__ */ new Map();
      aevIndex = /* @__PURE__ */ new Map();
      aveIndex = /* @__PURE__ */ new Map();
      // Link indexes for graph queries
      linkIndex = /* @__PURE__ */ new Map();
      // e1 -> a -> e2s
      linkReverseIndex = /* @__PURE__ */ new Map();
      // e2 -> a -> e1s
      linkAttrIndex = /* @__PURE__ */ new Map();
      // a -> [(e1, e2)]
      // Distinct value tracking
      distinct = /* @__PURE__ */ new Map();
      // attr -> set of valueKey
      addFacts(facts) {
        for (let i = 0; i < facts.length; i++) {
          const fact = facts[i];
          if (fact) {
            if (this.hasFact(fact.e, fact.a, fact.v)) {
              continue;
            }
            this.facts.push(fact);
            this.updateIndexes(fact, this.facts.length - 1);
            this.updateCatalog(fact);
          }
        }
      }
      /**
       * Check if a fact already exists in the store.
       */
      hasFact(entity, attribute, value) {
        const valueKey = this.valueKey(value);
        const indices = this.aveIndex.get(attribute)?.get(valueKey);
        if (!indices) return false;
        for (const idx of indices) {
          const fact = this.facts[idx];
          if (fact && fact.e === entity && fact.a === attribute) {
            return true;
          }
        }
        return false;
      }
      addLinks(links) {
        for (const link of links) {
          this.links.push(link);
          this.updateLinkIndexes(link);
        }
      }
      deleteFacts(factsToDelete) {
        for (const fact of factsToDelete) {
          const valueKey = this.valueKey(fact.v);
          const indices = this.aveIndex.get(fact.a)?.get(valueKey);
          if (!indices) continue;
          let foundIdx = -1;
          for (const idx of indices) {
            const storedFact = this.facts[idx];
            if (storedFact && storedFact.e === fact.e && storedFact.a === fact.a) {
              foundIdx = idx;
              break;
            }
          }
          if (foundIdx !== -1) {
            this.facts[foundIdx] = void 0;
            this.eavIndex.get(fact.e)?.get(fact.a)?.delete(foundIdx);
            this.aevIndex.get(fact.a)?.get(fact.e)?.delete(foundIdx);
            this.aveIndex.get(fact.a)?.get(valueKey)?.delete(foundIdx);
            const entry = this.catalog.get(fact.a);
            if (entry) {
            }
          }
        }
      }
      deleteLinks(linksToDelete) {
        for (const link of linksToDelete) {
          const initialLen = this.links.length;
          this.links = this.links.filter(
            (l) => !(l.e1 === link.e1 && l.a === link.a && l.e2 === link.e2)
          );
          if (this.links.length < initialLen) {
            this.linkIndex.get(link.e1)?.get(link.a)?.delete(link.e2);
            this.linkReverseIndex.get(link.e2)?.get(link.a)?.delete(link.e1);
            const attrPairs = this.linkAttrIndex.get(link.a);
            if (attrPairs) {
              for (const pair of attrPairs) {
                if (pair[0] === link.e1 && pair[1] === link.e2) {
                  attrPairs.delete(pair);
                  break;
                }
              }
            }
          }
        }
      }
      updateIndexes(fact, index) {
        if (!this.eavIndex.has(fact.e)) {
          this.eavIndex.set(fact.e, /* @__PURE__ */ new Map());
        }
        if (!this.eavIndex.get(fact.e).has(fact.a)) {
          this.eavIndex.get(fact.e).set(fact.a, /* @__PURE__ */ new Set());
        }
        this.eavIndex.get(fact.e).get(fact.a).add(index);
        if (!this.aevIndex.has(fact.a)) {
          this.aevIndex.set(fact.a, /* @__PURE__ */ new Map());
        }
        if (!this.aevIndex.get(fact.a).has(fact.e)) {
          this.aevIndex.get(fact.a).set(fact.e, /* @__PURE__ */ new Set());
        }
        this.aevIndex.get(fact.a).get(fact.e).add(index);
        if (!this.aveIndex.has(fact.a)) {
          this.aveIndex.set(fact.a, /* @__PURE__ */ new Map());
        }
        const valueKey = this.valueKey(fact.v);
        if (!this.aveIndex.get(fact.a).has(valueKey)) {
          this.aveIndex.get(fact.a).set(valueKey, /* @__PURE__ */ new Set());
        }
        this.aveIndex.get(fact.a).get(valueKey).add(index);
      }
      updateLinkIndexes(link) {
        if (!this.linkIndex.has(link.e1)) {
          this.linkIndex.set(link.e1, /* @__PURE__ */ new Map());
        }
        const e1Attrs = this.linkIndex.get(link.e1);
        if (!e1Attrs.has(link.a)) {
          e1Attrs.set(link.a, /* @__PURE__ */ new Set());
        }
        e1Attrs.get(link.a).add(link.e2);
        if (!this.linkReverseIndex.has(link.e2)) {
          this.linkReverseIndex.set(link.e2, /* @__PURE__ */ new Map());
        }
        const e2Attrs = this.linkReverseIndex.get(link.e2);
        if (!e2Attrs.has(link.a)) {
          e2Attrs.set(link.a, /* @__PURE__ */ new Set());
        }
        e2Attrs.get(link.a).add(link.e1);
        if (!this.linkAttrIndex.has(link.a)) {
          this.linkAttrIndex.set(link.a, /* @__PURE__ */ new Set());
        }
        this.linkAttrIndex.get(link.a).add([link.e1, link.e2]);
      }
      valueKey(v) {
        if (v instanceof Date) return `date:${v.toISOString()}`;
        return `${typeof v}:${v}`;
      }
      updateCatalog(fact) {
        const entry = this.catalog.get(fact.a) || {
          attribute: fact.a,
          type: this.inferType(fact.v),
          cardinality: "one",
          distinctCount: 0,
          examples: []
        };
        const factType = this.inferType(fact.v);
        if (entry.type !== factType && entry.type !== "mixed") {
          entry.type = "mixed";
        }
        const entityAttrs = this.eavIndex.get(fact.e)?.get(fact.a);
        if (entityAttrs && entityAttrs.size > 1) {
          entry.cardinality = "many";
        }
        const k = this.valueKey(fact.v);
        const s = this.distinct.get(fact.a) || (this.distinct.set(fact.a, /* @__PURE__ */ new Set()), this.distinct.get(fact.a));
        s.add(k);
        entry.distinctCount = s.size;
        if (entry.examples.length < 5 && !entry.examples.includes(fact.v)) {
          entry.examples.push(fact.v);
        }
        if (typeof fact.v === "number") {
          entry.min = Math.min(entry.min ?? fact.v, fact.v);
          entry.max = Math.max(entry.max ?? fact.v, fact.v);
        }
        this.catalog.set(fact.a, entry);
      }
      inferType(v) {
        if (typeof v === "string") return "string";
        if (typeof v === "number") return "number";
        if (typeof v === "boolean") return "boolean";
        if (v instanceof Date) return "date";
        return "mixed";
      }
      // Query methods
      getFactsByEntity(entity) {
        const indices = this.eavIndex.get(entity);
        if (!indices) return [];
        const result = [];
        for (const attrIndices of indices.values()) {
          for (const idx of attrIndices) {
            const fact = this.facts[idx];
            if (fact) {
              result.push(fact);
            }
          }
        }
        return result;
      }
      getFactsByAttribute(attribute) {
        const indices = this.aevIndex.get(attribute);
        if (!indices) return [];
        const result = [];
        for (const entityIndices of indices.values()) {
          for (const idx of entityIndices) {
            const fact = this.facts[idx];
            if (fact) {
              result.push(fact);
            }
          }
        }
        return result;
      }
      getFactsByValue(attribute, value) {
        const indices = this.aveIndex.get(attribute)?.get(this.valueKey(value));
        if (!indices) return [];
        return Array.from(indices).map((idx) => this.facts[idx]).filter((fact) => fact !== void 0);
      }
      getCatalog() {
        return Array.from(this.catalog.values());
      }
      getCatalogEntry(attribute) {
        return this.catalog.get(attribute);
      }
      // Statistics
      getAllFacts() {
        return this.facts.filter((f2) => f2 !== void 0);
      }
      getAllLinks() {
        return [...this.links];
      }
      getLinksByEntity(entity) {
        const results = [];
        const forwardLinks = this.linkIndex.get(entity);
        if (forwardLinks) {
          for (const [attr, targets] of forwardLinks) {
            for (const target of targets) {
              results.push({ e1: entity, a: attr, e2: target });
            }
          }
        }
        const reverseLinks = this.linkReverseIndex.get(entity);
        if (reverseLinks) {
          for (const [attr, sources] of reverseLinks) {
            for (const source of sources) {
              results.push({ e1: source, a: attr, e2: entity });
            }
          }
        }
        return results;
      }
      getLinksByAttribute(attribute) {
        const results = [];
        const links = this.linkAttrIndex.get(attribute);
        if (links) {
          for (const [e1, e2] of links) {
            results.push({ e1, a: attribute, e2 });
          }
        }
        return results;
      }
      getLinksByEntityAndAttribute(entity, attribute) {
        const results = [];
        const attrs = this.linkIndex.get(entity);
        if (attrs) {
          const targets = attrs.get(attribute);
          if (targets) {
            for (const target of targets) {
              results.push({ e1: entity, a: attribute, e2: target });
            }
          }
        }
        return results;
      }
      getStats() {
        return {
          totalFacts: this.facts.length,
          totalLinks: this.links.length,
          uniqueEntities: this.eavIndex.size,
          uniqueAttributes: this.aevIndex.size,
          catalogEntries: this.catalog.size
        };
      }
      /**
       * Creates a serializable snapshot of the current store state.
       */
      snapshot() {
        return {
          facts: this.facts.filter((f2) => f2 !== void 0),
          links: [...this.links],
          catalog: this.getCatalog()
        };
      }
      /**
       * Restores the store state from a snapshot and rebuilds all indexes.
       */
      restore(snapshot) {
        this.facts = [];
        this.links = [];
        this.catalog.clear();
        this.eavIndex.clear();
        this.aevIndex.clear();
        this.aveIndex.clear();
        this.linkIndex.clear();
        this.linkReverseIndex.clear();
        this.linkAttrIndex.clear();
        this.distinct.clear();
        this.addFacts(snapshot.facts);
        this.addLinks(snapshot.links);
        if (snapshot.catalog) {
          for (const entry of snapshot.catalog) {
            this.catalog.set(entry.attribute, entry);
          }
        }
      }
    };
  }
});

// dist/chunk-LEGH72HW.js
var RealtimeFieldError = class extends Error {
  field;
  status = 400;
  constructor(field) {
    super(
      `Field "${field}" has sync:realtime \u2014 use trellis/realtime, not durable mutate`
    );
    this.name = "RealtimeFieldError";
    this.field = field;
  }
};
function effectiveFieldSync(field) {
  if (field.sync) return field.sync;
  if (field.valueType === "formula" || field.valueType === "rollup" || field.computed === true) {
    return "derived";
  }
  return "durable";
}
function findSchemaForType(ontologies, type) {
  const list = Array.from(ontologies);
  const byId = list.find((s) => s["@id"] === type);
  if (byId) return byId;
  const trellisId = `trellis:${type}`;
  const byTrellis = list.find((s) => s["@id"] === trellisId);
  if (byTrellis) return byTrellis;
  const byLabel = list.find(
    (s) => (s.tier ?? "user") !== "core" && (s.label === type || s["@id"].endsWith(`:${type}`))
  );
  return byLabel;
}
function filterDurableAttributes(attributes, schema) {
  if (!schema) return attributes;
  const byName = new Map(schema.fields.map((f2) => [f2.name, f2]));
  const out = {};
  for (const [key, value] of Object.entries(attributes)) {
    const field = byName.get(key);
    if (!field) {
      out[key] = value;
      continue;
    }
    const tier = effectiveFieldSync(field);
    if (tier === "derived") continue;
    if (tier === "realtime") throw new RealtimeFieldError(key);
    out[key] = value;
  }
  return out;
}

// dist/chunk-RUMOVKR4.js
function canonicalFact(f2) {
  const out = { e: f2.e, a: f2.a, v: f2.v };
  if (f2.meta !== void 0) out.meta = canonicalFactMeta(f2.meta);
  return out;
}
function canonicalFactMeta(m) {
  const out = {};
  if (m.confidence !== void 0) out.confidence = m.confidence;
  if (m.dataTypeId !== void 0) out.dataTypeId = m.dataTypeId;
  if (m.sources !== void 0) out.sources = m.sources.map(canonicalSource);
  return out;
}
function canonicalSource(s) {
  const out = {};
  if (s.authors !== void 0) out.authors = [...s.authors];
  if (s.location !== void 0) out.location = { uri: s.location.uri };
  if (s.loadedAt !== void 0) out.loadedAt = s.loadedAt;
  if (s.firstPublished !== void 0) out.firstPublished = s.firstPublished;
  if (s.lastUpdated !== void 0) out.lastUpdated = s.lastUpdated;
  return out;
}
function canonicalLink(l) {
  return { e1: l.e1, a: l.a, e2: l.e2 };
}
function canonicalProvenance(p) {
  if (!p) return null;
  return { actorType: p.actorType, origin: p.origin };
}
function toCanonicalBody(payload, version) {
  return {
    ...version !== void 0 ? { v: version } : {},
    facts: (payload.facts ?? []).map(canonicalFact),
    links: (payload.links ?? []).map(canonicalLink),
    deleteFacts: (payload.deleteFacts ?? []).map(canonicalFact),
    deleteLinks: (payload.deleteLinks ?? []).map(canonicalLink),
    provenance: canonicalProvenance(payload.provenance)
  };
}
function canonicalOpBodyFromOp(op) {
  return JSON.stringify(
    toCanonicalBody(
      {
        facts: op.facts,
        links: op.links,
        deleteFacts: op.deleteFacts,
        deleteLinks: op.deleteLinks,
        provenance: op.provenance
      },
      op.v
    )
  );
}
function canonicalPreimage(header, payload) {
  return JSON.stringify({
    v: OP_PREIMAGE_VERSION,
    kind: header.kind,
    timestamp: header.timestamp,
    agentId: header.agentId,
    previousHash: header.previousHash ?? null,
    body: toCanonicalBody(payload, OP_PREIMAGE_VERSION)
  });
}
async function sha256Hex(data) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hashKernelOp(header, payload) {
  return `trellis:op:${await sha256Hex(canonicalPreimage(header, payload))}`;
}
var OP_PREIMAGE_VERSION;
var PROVENANCE;
var init_canonical_op = __esm({
  "src/core/persist/canonical-op.ts"() {
    OP_PREIMAGE_VERSION = 2;
    PROVENANCE = {
      cli: { actorType: "user", origin: "cli" },
      http: { actorType: "machine", origin: "http" },
      mcp: { actorType: "ai", origin: "mcp" },
      sdk: { actorType: "machine", origin: "sdk" },
      agent: { actorType: "ai", origin: "sdk" },
      sync: { actorType: "machine", origin: "sync" },
      migration: { actorType: "machine", origin: "migration" },
      cron: { actorType: "machine", origin: "cron" }
    };
  }
});

// dist/chunk-MXFSKGQH.js
init_eav_store();
init_canonical_op();
var VERSION = "1.0.0";
function f(name, valueType, opts) {
  return { name, valueType, ...opts };
}
var thing = {
  "@id": "core:Thing",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  label: "Thing",
  icon: "lucide:box",
  fields: [
    f("id", "title", { required: true }),
    f("createdAt", "date"),
    f("updatedAt", "date"),
    f("createdBy", "relation", {
      relation: { targetSchema: "core:Member", cardinality: "one" }
    }),
    f("tags", "multi_select")
  ]
};
var record = {
  "@id": "core:Record",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Record",
  icon: "lucide:file",
  fields: [
    f("title", "title", { required: true }),
    f("description", "rich_text"),
    f("status", "select"),
    f("tags", "multi_select")
  ]
};
var document2 = {
  "@id": "core:Document",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Record",
  label: "Document",
  icon: "lucide:file-text",
  fields: [
    f("content", "rich_text"),
    f("mimeType", "rich_text"),
    f("fileUrl", "url")
  ]
};
var event = {
  "@id": "core:Event",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Record",
  label: "Event",
  icon: "lucide:calendar",
  fields: [
    f("startDate", "date"),
    f("endDate", "date"),
    f("location", "rich_text"),
    f("allDay", "checkbox")
  ]
};
var collection = {
  "@id": "core:Collection",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Collection",
  icon: "lucide:database",
  fields: [
    f("title", "title", { required: true }),
    f("description", "rich_text"),
    f("icon", "rich_text"),
    f("schema", "rich_text"),
    f("recordType", "relation", {
      relation: { targetSchema: "core:Record", cardinality: "one" }
    })
  ]
};
var tag = {
  "@id": "core:Tag",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Tag",
  icon: "lucide:tag",
  fields: [
    f("name", "title", { required: true }),
    f("slug", "rich_text"),
    f("color", "rich_text"),
    f("icon", "rich_text"),
    f("parentTag", "relation", {
      relation: { targetSchema: "core:Tag", cardinality: "one" }
    })
  ]
};
var workspace = {
  "@id": "core:Workspace",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Workspace",
  icon: "lucide:building-2",
  fields: [
    f("name", "title", { required: true }),
    f("slug", "rich_text"),
    f("avatar", "files"),
    f("plan", "select")
  ]
};
var app = {
  "@id": "core:App",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "App",
  icon: "lucide:layout-grid",
  fields: [
    f("name", "title", { required: true }),
    f("slug", "rich_text"),
    f("icon", "rich_text"),
    f("color", "rich_text"),
    f("description", "rich_text"),
    f("ontologies", "multi_select")
  ]
};
var member = {
  "@id": "core:Member",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Member",
  icon: "lucide:user",
  fields: [
    f("name", "title", { required: true }),
    f("email", "email"),
    f("avatar", "files"),
    f("role", "select", {
      required: true,
      selectOptions: ["owner", "admin", "member", "guest"],
      defaultValue: "member"
    }),
    f("status", "select", {
      required: true,
      selectOptions: ["pending", "active", "suspended"],
      defaultValue: "pending"
    }),
    f("orgId", "relation", {
      required: true,
      relation: { targetSchema: "core:Workspace", cardinality: "one" }
    }),
    f("userId", "relation", {
      relation: { targetSchema: "core:Person", cardinality: "one" }
    }),
    f("invitedAt", "date"),
    f("joinedAt", "date")
  ]
};
var notification = {
  "@id": "core:Notification",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Notification",
  icon: "lucide:bell",
  fields: [
    f("recipientId", "relation", {
      required: true,
      relation: { targetSchema: "core:Person", cardinality: "one" }
    }),
    f("orgId", "relation", {
      relation: { targetSchema: "core:Workspace", cardinality: "one" }
    }),
    f("orgName", "rich_text"),
    f("type", "select", {
      required: true,
      selectOptions: [
        "invite_accepted",
        "invite_sent",
        "member_joined",
        "member_removed",
        "role_changed",
        "mention",
        "comment",
        "entity_updated",
        "system"
      ]
    }),
    f("title", "title", { required: true }),
    f("message", "rich_text", { required: true }),
    f("actionUrl", "url"),
    f("icon", "rich_text"),
    f("variant", "select", {
      selectOptions: ["default", "success", "warning", "destructive", "info"]
    }),
    f("isRead", "checkbox", { defaultValue: false }),
    f("actorId", "relation", {
      relation: { targetSchema: "core:Person", cardinality: "one" }
    }),
    f("actorName", "rich_text"),
    f("metadata", "rich_text"),
    f("createdAt", "date", { required: true })
  ]
};
var share = {
  "@id": "core:Share",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Share",
  icon: "lucide:share-2",
  fields: [
    f("entityId", "relation", { required: true }),
    f("entityType", "select", { selectOptions: ["entity", "collection"] }),
    f("userId", "relation", {
      required: true,
      relation: { targetSchema: "core:Person", cardinality: "one" }
    }),
    f("orgId", "relation", {
      relation: { targetSchema: "core:Workspace", cardinality: "one" }
    }),
    f("permission", "select", {
      required: true,
      selectOptions: ["view", "comment", "edit"],
      defaultValue: "view"
    }),
    f("sharedBy", "relation", {
      relation: { targetSchema: "core:Person", cardinality: "one" }
    }),
    f("createdAt", "date", { required: true })
  ]
};
var person = {
  "@id": "core:Person",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Person",
  icon: "lucide:user",
  fields: [f("name", "title", { required: true })]
};
var workflow = {
  "@id": "core:Workflow",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "core",
  subClassOf: "core:Thing",
  label: "Workflow",
  icon: "lucide:git-branch",
  fields: [
    f("name", "title", { required: true }),
    f("trigger", "rich_text"),
    f("steps", "multi_select"),
    f("active", "checkbox")
  ]
};
var workflowStep = {
  "@id": "core:WorkflowStep",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Workflow Step",
  icon: "lucide:list-checks",
  fields: [
    f("name", "title", { required: true }),
    f("description", "rich_text"),
    f("commands", "json"),
    f("turbo", "checkbox"),
    f("layer", "select", {
      selectOptions: ["pre_flight", "setup", "implement", "review", "closure"]
    })
  ]
};
var workflowEdge = {
  "@id": "core:WorkflowEdge",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Workflow Edge",
  icon: "lucide:arrow-right",
  fields: [
    f("name", "title", { required: true }),
    f("condition", "rich_text"),
    f("status", "select", {
      selectOptions: ["HANDOFF", "CLARIFY", "REJECT", "BLOCKED", "DECISION"],
      defaultValue: "HANDOFF"
    }),
    f("from", "relation", {
      relation: { targetSchema: "core:WorkflowStep", cardinality: "one" }
    }),
    f("to", "relation", {
      relation: { targetSchema: "core:WorkflowStep", cardinality: "one" }
    })
  ]
};
var workflowGate = {
  "@id": "core:WorkflowGate",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Workflow Gate",
  icon: "lucide:shield-check",
  fields: [
    f("name", "title", { required: true }),
    f("type", "select", {
      required: true,
      selectOptions: ["test", "manual", "ac_check", "semantic_diff"]
    }),
    f("criteria", "rich_text"),
    f("onFail", "select", {
      selectOptions: ["stop", "retry", "route_to"],
      defaultValue: "stop"
    }),
    f("step", "relation", {
      relation: { targetSchema: "core:WorkflowStep", cardinality: "one" }
    }),
    f("retryStep", "relation", {
      relation: { targetSchema: "core:WorkflowStep", cardinality: "one" }
    }),
    f("failRoute", "relation", {
      relation: { targetSchema: "core:WorkflowEdge", cardinality: "one" }
    })
  ]
};
var agent = {
  "@id": "core:Agent",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Agent",
  icon: "lucide:bot",
  fields: [
    f("name", "title", { required: true }),
    f("description", "rich_text"),
    f("role", "select", {
      required: true,
      selectOptions: [
        "strategist",
        "designer",
        "architect",
        "executor",
        "reviewer",
        "optimizer",
        "synthesist",
        "writer",
        "human"
      ]
    }),
    f("inbox", "rich_text"),
    f("model", "rich_text"),
    f("status", "select", {
      defaultValue: "active",
      selectOptions: ["active", "inactive", "deprecated"]
    }),
    f("capabilities", "multi_select"),
    f("provider", "rich_text"),
    f("systemPrompt", "rich_text"),
    f("temperature", "number"),
    f("maxTokens", "number"),
    f("workflow", "relation", {
      relation: { targetSchema: "core:Workflow", cardinality: "one" }
    }),
    f("tools", "relation", {
      relation: { targetSchema: "core:Tool", cardinality: "many" }
    })
  ]
};
var tool = {
  "@id": "core:Tool",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Tool",
  icon: "lucide:wrench",
  fields: [
    f("name", "title", { required: true }),
    f("description", "rich_text"),
    f("schema", "json"),
    f("endpoint", "url")
  ]
};
var agentRun = {
  "@id": "trellis:AgentRun",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "AgentRun",
  icon: "lucide:play",
  fields: [
    f("startedAt", "date", { required: true }),
    f("completedAt", "date"),
    f("status", "select", {
      required: true,
      selectOptions: ["running", "plan_pending", "paused", "completed", "failed", "cancelled"],
      defaultValue: "running"
    }),
    f("input", "rich_text"),
    f("output", "rich_text"),
    f("totalTokens", "number"),
    f("promptTokens", "number"),
    f("completionTokens", "number"),
    f("maxRetries", "number"),
    f("timeoutMs", "number"),
    f("executedBy", "relation", {
      relation: { targetSchema: "core:Agent", cardinality: "one" }
    }),
    f("hasPlan", "relation", {
      relation: { cardinality: "many" }
    }),
    f("usedTool", "relation", {
      relation: { targetSchema: "core:Tool", cardinality: "many" }
    }),
    f("handoffTo", "relation", {
      relation: { targetSchema: "trellis:AgentRun", cardinality: "many" }
    }),
    f("handoffFrom", "relation", {
      relation: { targetSchema: "trellis:AgentRun", cardinality: "one" }
    })
  ]
};
var decisionTrace = {
  "@id": "trellis:DecisionTrace",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "DecisionTrace",
  icon: "lucide:git-branch",
  fields: [
    f("toolName", "title", { required: true }),
    f("timestamp", "date", { required: true }),
    f("input", "json"),
    f("output", "rich_text"),
    f("rationale", "rich_text"),
    f("alternatives", "json"),
    f("belongsToRun", "relation", {
      relation: { targetSchema: "trellis:AgentRun", cardinality: "one" }
    }),
    f("madeBy", "relation", {
      relation: { targetSchema: "core:Agent", cardinality: "one" }
    }),
    f("relatedTo", "relation", {
      relation: { cardinality: "many" }
    })
  ]
};
var workerPoolTask = {
  "@id": "trellis:WorkerPoolTask",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "WorkerPool Task",
  icon: "lucide:list-queue",
  fields: [
    f("agentId", "title", { required: true }),
    f("runId", "title", { required: true }),
    f("input", "rich_text"),
    f("status", "select", {
      required: true,
      selectOptions: ["queued", "running", "paused", "completed", "failed", "cancelled"],
      defaultValue: "queued"
    }),
    f("queuedAt", "date", { required: true }),
    f("startedAt", "date"),
    f("completedAt", "date"),
    f("error", "rich_text")
  ]
};
var dagRun = {
  "@id": "trellis:DAGRun",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "DAG Run",
  icon: "lucide:workflow",
  fields: [
    f("workflowId", "title", { required: true }),
    f("workflowName", "title"),
    f("status", "select", {
      required: true,
      selectOptions: ["running", "completed", "failed", "cancelled"],
      defaultValue: "running"
    }),
    f("steps", "json"),
    f("startedAt", "date", { required: true }),
    f("completedAt", "date")
  ]
};
var handoff = {
  "@id": "core:Handoff",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Handoff",
  icon: "lucide:arrow-left-right",
  fields: [
    f("name", "title", { required: true }),
    f("status", "select", {
      required: true,
      selectOptions: ["HANDOFF", "CLARIFY", "REJECT", "BLOCKED", "DECISION"]
    }),
    f("body", "rich_text"),
    f("refs", "multi_select"),
    f("timestamp", "date"),
    f("from", "relation", {
      relation: { targetSchema: "core:Agent", cardinality: "one" }
    }),
    f("to", "relation", {
      relation: { targetSchema: "core:Agent", cardinality: "one" }
    }),
    f("re", "relation", {
      relation: { cardinality: "one" }
    })
  ]
};
var pipeline = {
  "@id": "trellis:Pipeline",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Pipeline",
  icon: "lucide:git-merge",
  fields: [
    f("name", "title", { required: true }),
    f("description", "rich_text"),
    f("trigger", "rich_text"),
    f("active", "checkbox"),
    f("phases", "relation", {
      relation: { targetSchema: "trellis:PipelinePhase", cardinality: "many" }
    }),
    f("workflow", "relation", {
      relation: { targetSchema: "core:Workflow", cardinality: "many" }
    })
  ]
};
var pipelinePhase = {
  "@id": "trellis:PipelinePhase",
  "@type": "trellis:Schema",
  version: VERSION,
  tier: "system",
  subClassOf: "core:Thing",
  label: "Pipeline Phase",
  icon: "lucide:step-forward",
  fields: [
    f("name", "title", { required: true }),
    f("description", "rich_text"),
    f("order", "number"),
    f("agentRole", "select", {
      required: true,
      selectOptions: [
        "strategist",
        "designer",
        "architect",
        "executor",
        "reviewer",
        "optimizer",
        "synthesist",
        "writer",
        "human"
      ]
    }),
    f("workflow", "relation", {
      relation: { targetSchema: "core:Workflow", cardinality: "one" }
    })
  ]
};
var CORE_ONTOLOGY = [
  thing,
  record,
  document2,
  event,
  collection,
  tag,
  workspace,
  app,
  member,
  notification,
  share,
  person,
  workflow,
  workflowStep,
  workflowEdge,
  workflowGate,
  agent,
  tool,
  agentRun,
  decisionTrace,
  workerPoolTask,
  dagRun,
  handoff,
  pipeline,
  pipelinePhase
];
var TrellisKernel = class {
  store;
  backend;
  middleware;
  agentId;
  snapshotThreshold;
  opsSinceSnapshot = 0;
  _booted = false;
  ontologies = /* @__PURE__ */ new Map();
  workspaceConfig = null;
  autoReplay = true;
  defaultProvenance;
  constructor(config) {
    this.store = new EAVStore();
    this.backend = config.backend;
    this.agentId = config.agentId;
    this.middleware = config.middleware ?? [];
    this.snapshotThreshold = config.snapshotThreshold ?? 0;
    this.autoReplay = config.autoReplay ?? true;
    this.defaultProvenance = config.provenance ?? {
      actorType: "machine",
      origin: "sdk"
    };
    for (const schema of CORE_ONTOLOGY) {
      this.ontologies.set(schema["@id"], schema);
    }
  }
  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  /**
   * Initialize the backend and replay persisted state.
   * Loads latest snapshot if available, then replays ops after it.
   */
  boot() {
    this.backend.init();
    if (!this.autoReplay) {
      this._booted = true;
      return { opsReplayed: 0, fromSnapshot: false };
    }
    let opsReplayed = 0;
    let fromSnapshot = false;
    const snapshot = this.backend.loadLatestSnapshot();
    if (snapshot) {
      this.store.restore(snapshot.data);
      fromSnapshot = true;
      const recentOps = this.backend.readAfter(snapshot.lastOpHash);
      for (const op of recentOps) {
        this._replayOp(op);
        opsReplayed++;
      }
    } else {
      const allOps = this.backend.readAll();
      for (const op of allOps) {
        this._replayOp(op);
        opsReplayed++;
      }
    }
    this._booted = true;
    return { opsReplayed, fromSnapshot };
  }
  /**
   * Close the backend connection.
   */
  close() {
    this.backend.close?.();
    this._booted = false;
  }
  isBooted() {
    return this._booted;
  }
  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  /**
   * Apply a mutation to the graph. Creates an op, runs it through middleware,
   * decomposes into EAV primitives, persists, and returns the result.
   */
  async mutate(kind, payload, ctx) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const lastOp = this.backend.getLastOp();
    const agentId = ctx?.agentId ?? this.agentId;
    const provenance = payload.provenance ?? ctx?.provenance ?? this.defaultProvenance;
    const resolved = { ...payload, provenance };
    const hash = await hashKernelOp(
      { kind, timestamp, agentId, previousHash: lastOp?.hash },
      resolved
    );
    const op = {
      hash,
      kind,
      timestamp,
      agentId,
      previousHash: lastOp?.hash,
      v: OP_PREIMAGE_VERSION,
      facts: [...payload.facts ?? []],
      links: [...payload.links ?? []],
      deleteFacts: payload.deleteFacts?.length ? [...payload.deleteFacts] : void 0,
      deleteLinks: payload.deleteLinks?.length ? [...payload.deleteLinks] : void 0,
      provenance
    };
    const mwCtx = { agentId, ...ctx };
    await this._runMiddleware(op, mwCtx);
    let factsAdded = 0;
    let factsDeleted = 0;
    let linksAdded = 0;
    let linksDeleted = 0;
    if (payload.deleteFacts && payload.deleteFacts.length > 0) {
      this.store.deleteFacts(payload.deleteFacts);
      factsDeleted = payload.deleteFacts.length;
    }
    if (payload.deleteLinks && payload.deleteLinks.length > 0) {
      this.store.deleteLinks(payload.deleteLinks);
      linksDeleted = payload.deleteLinks.length;
    }
    if (payload.facts && payload.facts.length > 0) {
      this.store.addFacts(payload.facts);
      factsAdded = payload.facts.length;
    }
    if (payload.links && payload.links.length > 0) {
      this.store.addLinks(payload.links);
      linksAdded = payload.links.length;
    }
    this.backend.append(op);
    this.opsSinceSnapshot++;
    if (this.snapshotThreshold > 0 && this.opsSinceSnapshot >= this.snapshotThreshold) {
      this.checkpoint();
    }
    return {
      op,
      factsDelta: { added: factsAdded, deleted: factsDeleted },
      linksDelta: { added: linksAdded, deleted: linksDeleted }
    };
  }
  /**
   * Create a snapshot of the current store state.
   */
  checkpoint() {
    const lastOp = this.backend.getLastOp();
    if (!lastOp) return;
    this.backend.saveSnapshot(lastOp.hash, this.store.snapshot());
    this.opsSinceSnapshot = 0;
  }
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------
  /**
   * Get the underlying EAV store for direct queries.
   */
  getStore() {
    return this.store;
  }
  /**
   * Get the persistence backend.
   */
  getBackend() {
    return this.backend;
  }
  /**
   * Get the agent ID.
   */
  getAgentId() {
    return this.agentId;
  }
  /**
   * Read all persisted ops.
   */
  readAllOps() {
    return this.backend.readAll();
  }
  /**
   * Get the last persisted op.
   */
  getLastOp() {
    return this.backend.getLastOp();
  }
  /**
   * Create a QueryEngine bound to this kernel's store.
   */
  createQueryEngine() {
    return new QueryEngine(this.store);
  }
  /**
   * Execute an EQL-S query, routing through middleware handleQuery hooks.
   * If no middleware intercepts, the query runs directly against the store.
   */
  async query(q) {
    const engine = new QueryEngine(this.store);
    const ctx = {
      agentId: this.agentId,
      store: this.store
    };
    const chain = this.middleware.filter((m) => m.handleQuery);
    if (chain.length === 0) {
      return engine.execute(q);
    }
    let result;
    let idx = 0;
    const next = (query, context) => {
      if (idx < chain.length) {
        const mw = chain[idx++];
        return mw.handleQuery(query, context, next);
      }
      result = engine.execute(query);
      return result;
    };
    result = next(q, ctx);
    return result;
  }
  /**
   * Time-travel: reconstruct the store state at a specific op hash.
   * Returns a new EAVStore with state replayed up to (and including) that op.
   */
  timeTravel(opHash) {
    const ops2 = this.backend.readUntil(opHash);
    const snapshot = new EAVStore();
    for (const op of ops2) {
      if (op.deleteFacts && op.deleteFacts.length > 0) {
        snapshot.deleteFacts(op.deleteFacts);
      }
      if (op.deleteLinks && op.deleteLinks.length > 0) {
        snapshot.deleteLinks(op.deleteLinks);
      }
      if (op.facts && op.facts.length > 0) {
        snapshot.addFacts(op.facts);
      }
      if (op.links && op.links.length > 0) {
        snapshot.addLinks(op.links);
      }
    }
    return snapshot;
  }
  // -------------------------------------------------------------------------
  // Entity CRUD (high-level graph operations)
  // -------------------------------------------------------------------------
  /**
   * Create a new entity with the given type and attributes.
   * Returns the entity ID.
   */
  async createEntity(entityId, type, attributes = {}, links, ctx) {
    const schema = findSchemaForType(this.ontologies.values(), type);
    const filtered = filterDurableAttributes(
      attributes,
      schema
    );
    const facts = [{ e: entityId, a: "type", v: type }];
    if (filtered.createdAt === void 0) {
      facts.push({ e: entityId, a: "createdAt", v: (/* @__PURE__ */ new Date()).toISOString() });
    }
    for (const [attr, value] of Object.entries(filtered)) {
      facts.push({ e: entityId, a: attr, v: value });
    }
    const linkRecords = (links ?? []).map((l) => ({
      e1: entityId,
      a: l.attribute,
      e2: l.targetEntityId
    }));
    return this.mutate(
      "addFacts",
      {
        facts,
        links: linkRecords.length > 0 ? linkRecords : void 0
      },
      ctx
    );
  }
  /**
   * Get an entity by ID, returning all its facts and links.
   */
  getEntity(entityId) {
    const facts = this.store.getFactsByEntity(entityId);
    if (facts.length === 0) return null;
    const typeFact = facts.find((f2) => f2.a === "type");
    return {
      id: entityId,
      type: typeFact?.v ?? "unknown",
      facts,
      links: this.store.getLinksByEntity(entityId)
    };
  }
  /**
   * Update an entity's attributes. Deletes old values and adds new ones.
   */
  async updateEntity(entityId, updates, ctx) {
    const existing = this.getEntity(entityId);
    const schema = existing ? findSchemaForType(this.ontologies.values(), existing.type) : void 0;
    const filtered = filterDurableAttributes(
      updates,
      schema
    );
    const existingFacts = this.store.getFactsByEntity(entityId);
    const deleteFacts = [];
    const addFacts = [];
    for (const [attr, newValue] of Object.entries(filtered)) {
      const existingAttr = existingFacts.filter((f2) => f2.a === attr);
      deleteFacts.push(...existingAttr);
      addFacts.push({ e: entityId, a: attr, v: newValue });
    }
    const updatedAtFacts = existingFacts.filter((f2) => f2.a === "updatedAt");
    deleteFacts.push(...updatedAtFacts);
    addFacts.push({ e: entityId, a: "updatedAt", v: (/* @__PURE__ */ new Date()).toISOString() });
    return this.mutate(
      "addFacts",
      {
        facts: addFacts,
        deleteFacts
      },
      ctx
    );
  }
  /**
   * Delete an entity and all its facts and links.
   */
  async deleteEntity(entityId, ctx) {
    const facts = this.store.getFactsByEntity(entityId);
    const links = this.store.getLinksByEntity(entityId);
    return this.mutate(
      "deleteFacts",
      {
        deleteFacts: facts,
        deleteLinks: links
      },
      ctx
    );
  }
  /**
   * List entities by type, with optional attribute filters.
   */
  listEntities(type, filters) {
    let entityIds;
    if (type) {
      const typeFacts = this.store.getFactsByValue("type", type);
      entityIds = new Set(typeFacts.map((f2) => f2.e));
    } else {
      const allTypeFacts = this.store.getFactsByAttribute("type");
      entityIds = new Set(allTypeFacts.map((f2) => f2.e));
    }
    if (filters) {
      for (const [attr, value] of Object.entries(filters)) {
        const matchingFacts = this.store.getFactsByValue(attr, value);
        const matchingEntities = new Set(matchingFacts.map((f2) => f2.e));
        for (const id of entityIds) {
          if (!matchingEntities.has(id)) {
            entityIds.delete(id);
          }
        }
      }
    }
    return Array.from(entityIds).map((id) => this.getEntity(id)).filter(Boolean);
  }
  /**
   * Add a link between two entities.
   */
  async addLink(sourceId, attribute, targetId, ctx) {
    return this.mutate(
      "addLinks",
      {
        links: [{ e1: sourceId, a: attribute, e2: targetId }]
      },
      ctx
    );
  }
  /**
   * Remove a link between two entities.
   */
  async removeLink(sourceId, attribute, targetId, ctx) {
    return this.mutate(
      "deleteLinks",
      {
        deleteLinks: [{ e1: sourceId, a: attribute, e2: targetId }]
      },
      ctx
    );
  }
  /**
   * Add a fact to an entity.
   */
  async addFact(entityId, attribute, value, ctx, meta) {
    return this.mutate(
      "addFacts",
      { facts: [{ e: entityId, a: attribute, v: value, ...meta ? { meta } : {} }] },
      ctx
    );
  }
  /**
   * Remove a fact from an entity.
   */
  async removeFact(entityId, attribute, value, ctx) {
    return this.mutate(
      "deleteFacts",
      { deleteFacts: [{ e: entityId, a: attribute, v: value }] },
      ctx
    );
  }
  // -------------------------------------------------------------------------
  // Ontology CRUD
  // -------------------------------------------------------------------------
  /**
   * Get an ontology schema by ID.
   */
  getOntology(id) {
    return this.ontologies.get(id);
  }
  /**
   * List all ontologies.
   */
  listOntologies() {
    return Array.from(this.ontologies.values());
  }
  /**
   * Create a new ontology schema.
   */
  createOntology(schema) {
    const tier = schema.tier ?? "user";
    if (tier === "core") {
      throw new Error("Cannot modify core ontologies");
    }
    if (this.ontologies.has(schema["@id"])) {
      throw new Error(`Ontology ${schema["@id"]} already exists`);
    }
    this.ontologies.set(schema["@id"], schema);
    const fact = {
      e: schema["@id"],
      a: "schema",
      v: JSON.stringify(schema)
    };
    this.store.addFacts([fact]);
  }
  /**
   * Update an existing ontology schema.
   */
  updateOntology(id, updates) {
    const existing = this.ontologies.get(id);
    if (!existing) {
      throw new Error(`Ontology ${id} not found`);
    }
    const tier = existing.tier ?? "user";
    if (tier === "core") {
      throw new Error("Cannot modify core ontologies");
    }
    const updated = { ...existing, ...updates };
    this.ontologies.set(id, updated);
    const existingFacts = this.store.getFactsByEntity(id);
    const schemaFacts = existingFacts.filter((f2) => f2.a === "schema");
    const deleteFacts = [...schemaFacts];
    const addFacts = [
      {
        e: id,
        a: "schema",
        v: JSON.stringify(updated)
      }
    ];
    this.store.deleteFacts(deleteFacts);
    this.store.addFacts(addFacts);
  }
  /**
   * Delete an ontology schema.
   */
  deleteOntology(id) {
    const existing = this.ontologies.get(id);
    if (!existing) {
      throw new Error(`Ontology ${id} not found`);
    }
    const tier = existing.tier ?? "user";
    if (tier === "core") {
      throw new Error("Cannot delete core ontologies");
    }
    this.ontologies.delete(id);
    const facts = this.store.getFactsByEntity(id);
    this.store.deleteFacts(facts);
  }
  // -------------------------------------------------------------------------
  // Workspace
  // -------------------------------------------------------------------------
  /**
   * Boot the kernel with a workspace configuration.
   * Loads ontologies, projections, and seed data.
   */
  bootWorkspace(config) {
    this.workspaceConfig = config;
    if (config.workspace.ontologies) {
      for (const [id, schema] of Object.entries(config.workspace.ontologies)) {
        if (!this.ontologies.has(id)) {
          this.ontologies.set(id, schema);
        }
      }
    }
    if (config.workspace.graph?.nodes) {
      for (const node of config.workspace.graph.nodes) {
        const n = node;
        if (n.id && n.type) {
          const facts = [
            { e: String(n.id), a: "type", v: String(n.type) }
          ];
          for (const [key, value] of Object.entries(n)) {
            if (key !== "id" && key !== "type") {
              facts.push({ e: String(n.id), a: key, v: value });
            }
          }
          this.store.addFacts(facts);
        }
      }
    }
    if (config.workspace.graph?.edges) {
      for (const edge of config.workspace.graph.edges) {
        const e = edge;
        if (e.source && e.target && e.relation) {
          this.store.addLinks([
            {
              e1: String(e.source),
              a: String(e.relation),
              e2: String(e.target)
            }
          ]);
        }
      }
    }
    this.boot();
  }
  /**
   * Export the current workspace configuration.
   */
  exportWorkspace() {
    const ontologies = {};
    for (const [id, schema] of this.ontologies) {
      if (schema.tier !== "core") {
        ontologies[id] = schema;
      }
    }
    const allFacts = this.store.getAllFacts();
    const nodes = [];
    const entityIds = new Set(allFacts.map((f2) => f2.e));
    for (const id of entityIds) {
      const facts = this.store.getFactsByEntity(id);
      const typeFact = facts.find((f2) => f2.a === "type");
      const node = { id };
      if (typeFact) {
        node.type = typeFact.v;
      }
      for (const fact of facts) {
        if (fact.a !== "type") {
          node[fact.a] = fact.v;
        }
      }
      nodes.push(node);
    }
    const allLinks = this.store.getAllLinks();
    const edges = allLinks.map((l) => ({
      source: l.e1,
      relation: l.a,
      target: l.e2
    }));
    return {
      workspace: {
        name: this.workspaceConfig?.workspace.name,
        description: this.workspaceConfig?.workspace.description,
        ontologies: Object.keys(ontologies).length > 0 ? ontologies : void 0,
        graph: { nodes, edges },
        projections: this.workspaceConfig?.workspace.projections,
        routes: this.workspaceConfig?.workspace.routes,
        app: this.workspaceConfig?.workspace.app
      }
    };
  }
  // -------------------------------------------------------------------------
  // TQL Compatibility Aliases
  // -------------------------------------------------------------------------
  /**
   * Create a node (alias for createEntity with schema validation).
   */
  async createNode(id, data, type, ctx) {
    return this.createEntity(id, type, data, void 0, ctx);
  }
  /**
   * Update a node (alias for updateEntity with schema validation).
   */
  async updateNode(id, data, type, ctx) {
    return this.updateEntity(id, data, ctx);
  }
  /**
   * Delete a node (alias for deleteEntity).
   */
  async deleteNode(id, ctx) {
    return this.deleteEntity(id, ctx);
  }
  /**
   * Link two nodes (alias for addLink).
   */
  async link(e1, a, e2, ctx) {
    return this.addLink(e1, a, e2, ctx);
  }
  /**
   * Unlink two nodes (alias for removeLink).
   */
  async unlink(e1, a, e2, ctx) {
    return this.removeLink(e1, a, e2, ctx);
  }
  // -------------------------------------------------------------------------
  // Middleware
  // -------------------------------------------------------------------------
  addMiddleware(mw) {
    this.middleware.push(mw);
  }
  removeMiddleware(name) {
    this.middleware = this.middleware.filter((m) => m.name !== name);
  }
  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------
  async _runMiddleware(op, ctx) {
    const chain = [...this.middleware];
    let idx = 0;
    const next = async (op2, ctx2) => {
      const mw = chain[idx++];
      if (mw?.handleOp) {
        await mw.handleOp(op2, ctx2, next);
      }
    };
    if (chain.length > 0) {
      await next(op, ctx);
    }
  }
  _replayOp(op) {
    if (op.deleteFacts && op.deleteFacts.length > 0) {
      this.store.deleteFacts(op.deleteFacts);
    }
    if (op.deleteLinks && op.deleteLinks.length > 0) {
      this.store.deleteLinks(op.deleteLinks);
    }
    if (op.facts && op.facts.length > 0) {
      this.store.addFacts(op.facts);
    }
    if (op.links && op.links.length > 0) {
      this.store.addLinks(op.links);
    }
  }
};

// dist/chunk-HAXURL2E.js
init_canonical_op();
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS ops (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  previous_hash TEXT,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_op_hash TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,
  content BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ops_kind ON ops(kind);
CREATE INDEX IF NOT EXISTS idx_ops_timestamp ON ops(timestamp);
CREATE INDEX IF NOT EXISTS idx_ops_agent ON ops(agent_id);
CREATE INDEX IF NOT EXISTS idx_ops_previous ON ops(previous_hash);
CREATE INDEX IF NOT EXISTS idx_snapshots_op ON snapshots(last_op_hash);
`;
var SqlJsKernelBackend = class _SqlJsKernelBackend {
  constructor(opts) {
    this.opts = opts;
    this.flushEvery = opts.autoFlushEvery ?? 50;
  }
  db;
  stmts;
  writes = 0;
  flushEvery;
  initialized = false;
  /**
   * Async factory — sql.js WASM init is async, but the resulting backend
   * exposes the synchronous KernelBackend surface, so it slots into the
   * existing kernel without interface changes.
   */
  static async create(opts) {
    const backend2 = new _SqlJsKernelBackend(opts);
    await backend2.bootstrap();
    return backend2;
  }
  async bootstrap() {
    let initSqlJs;
    try {
      const mod = await Promise.resolve().then(() => __toESM(require_sql_wasm_browser(), 1));
      initSqlJs = mod.default ?? mod;
    } catch (e) {
      throw new Error(
        'SqlJsKernelBackend requires the optional dependency "sql.js". Install it: npm install sql.js'
      );
    }
    let sqljsDistDir = null;
    if (typeof window === "undefined") {
      try {
        const moduleMod = await import("module");
        const pathMod = await import("path");
        const req = moduleMod.createRequire(import.meta.url);
        const sqlJsEntry = req.resolve("sql.js");
        sqljsDistDir = pathMod.dirname(sqlJsEntry);
      } catch {
        sqljsDistDir = null;
      }
    }
    const SQL = await initSqlJs({
      locateFile: (file) => {
        if (typeof window !== "undefined") return `/sql-wasm/${file}`;
        if (sqljsDistDir) return `${sqljsDistDir}/${file}`;
        return file;
      }
    });
    const existing = this.loadFromDisk();
    this.db = existing ? new SQL.Database(existing) : new SQL.Database();
  }
  loadFromDisk() {
    if (this.opts.dbPath === ":memory:") return null;
    try {
      const fs = __require2("fs");
      if (!fs.existsSync(this.opts.dbPath)) return null;
      return new Uint8Array(fs.readFileSync(this.opts.dbPath));
    } catch {
      return null;
    }
  }
  flushToDisk() {
    if (this.opts.dbPath === ":memory:") return;
    try {
      const fs = __require2("fs");
      const path = __require2("path");
      const data = this.db.export();
      fs.mkdirSync(path.dirname(this.opts.dbPath), { recursive: true });
      const tmp = `${this.opts.dbPath}.tmp`;
      fs.writeFileSync(tmp, Buffer.from(data));
      fs.renameSync(tmp, this.opts.dbPath);
    } catch {
    }
  }
  init() {
    if (this.initialized) return;
    this.db.exec(SCHEMA_SQL);
    this.prepareStatements();
    this.initialized = true;
  }
  prepareStatements() {
    this.stmts = {
      insert: this.db.prepare(
        `INSERT OR IGNORE INTO ops (hash, kind, timestamp, agent_id, previous_hash, payload)
         VALUES ($hash, $kind, $timestamp, $agentId, $previousHash, $payload)`
      ),
      readAll: this.db.prepare(
        `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
         FROM ops ORDER BY rowid ASC`
      ),
      readUntil: this.db.prepare(
        `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
         FROM ops WHERE rowid <= (SELECT rowid FROM ops WHERE hash = $hash)
         ORDER BY rowid ASC`
      ),
      readAfter: this.db.prepare(
        `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
         FROM ops WHERE rowid > (SELECT rowid FROM ops WHERE hash = $hash)
         ORDER BY rowid ASC`
      ),
      getByHash: this.db.prepare(
        `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
         FROM ops WHERE hash = $hash`
      ),
      getLast: this.db.prepare(
        `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
         FROM ops ORDER BY rowid DESC LIMIT 1`
      ),
      count: this.db.prepare(`SELECT COUNT(*) AS cnt FROM ops`),
      saveSnapshot: this.db.prepare(
        `INSERT INTO snapshots (last_op_hash, data) VALUES ($lastOpHash, $data)`
      ),
      loadSnapshot: this.db.prepare(
        `SELECT last_op_hash, data FROM snapshots ORDER BY id DESC LIMIT 1`
      ),
      putBlob: this.db.prepare(
        `INSERT OR IGNORE INTO blobs (hash, content) VALUES ($hash, $content)`
      ),
      getBlob: this.db.prepare(
        `SELECT content FROM blobs WHERE hash = $hash`
      ),
      hasBlob: this.db.prepare(
        `SELECT 1 AS present FROM blobs WHERE hash = $hash`
      )
    };
  }
  append(op) {
    const payload = canonicalOpBodyFromOp(op);
    this.stmts.insert.run({
      $hash: op.hash,
      $kind: op.kind,
      $timestamp: op.timestamp,
      $agentId: op.agentId,
      $previousHash: op.previousHash ?? null,
      $payload: payload
    });
    this.stmts.insert.reset();
    this.tickFlush();
  }
  readAll() {
    return this.runAll(this.stmts.readAll);
  }
  readUntil(hash) {
    return this.runAll(this.stmts.readUntil, { $hash: hash });
  }
  readAfter(hash) {
    return this.runAll(this.stmts.readAfter, { $hash: hash });
  }
  readUntilTimestamp(iso) {
    const stmt = this.db.prepare(
      `SELECT hash, kind, timestamp, agent_id, previous_hash, payload
       FROM ops WHERE timestamp <= $ts ORDER BY rowid ASC`
    );
    const rows = this.runAll(stmt, { $ts: iso });
    stmt.free();
    return rows;
  }
  getByHash(hash) {
    return this.runOne(this.stmts.getByHash, { $hash: hash });
  }
  getLastOp() {
    return this.runOne(this.stmts.getLast);
  }
  getOpCount() {
    this.stmts.count.bind({});
    const has = this.stmts.count.step();
    const row = has ? this.stmts.count.getAsObject() : { cnt: 0 };
    this.stmts.count.reset();
    return Number(row.cnt ?? 0);
  }
  saveSnapshot(lastOpHash, data) {
    this.stmts.saveSnapshot.run({
      $lastOpHash: lastOpHash,
      $data: typeof data === "string" ? data : JSON.stringify(data)
    });
    this.stmts.saveSnapshot.reset();
    this.tickFlush();
  }
  loadLatestSnapshot() {
    this.stmts.loadSnapshot.bind({});
    const has = this.stmts.loadSnapshot.step();
    if (!has) {
      this.stmts.loadSnapshot.reset();
      return void 0;
    }
    const row = this.stmts.loadSnapshot.getAsObject();
    this.stmts.loadSnapshot.reset();
    return { lastOpHash: row.last_op_hash, data: row.data };
  }
  putBlob(hash, content) {
    this.stmts.putBlob.run({
      $hash: hash,
      $content: content
    });
    this.stmts.putBlob.reset();
    this.tickFlush();
  }
  getBlob(hash) {
    this.stmts.getBlob.bind({ $hash: hash });
    const has = this.stmts.getBlob.step();
    if (!has) {
      this.stmts.getBlob.reset();
      return void 0;
    }
    const row = this.stmts.getBlob.getAsObject();
    this.stmts.getBlob.reset();
    if (!row.content) return void 0;
    return row.content instanceof Uint8Array ? row.content : new Uint8Array(row.content);
  }
  hasBlob(hash) {
    this.stmts.hasBlob.bind({ $hash: hash });
    const has = this.stmts.hasBlob.step();
    this.stmts.hasBlob.reset();
    return !!has;
  }
  close() {
    try {
      this.flushToDisk();
    } finally {
      for (const s of Object.values(this.stmts ?? {})) s?.free?.();
      this.db?.close?.();
    }
  }
  /** Force a write of the in-memory DB image to disk. */
  flush() {
    this.flushToDisk();
  }
  runAll(stmt, params = {}) {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(rowToOp(stmt.getAsObject()));
    stmt.reset();
    return rows;
  }
  runOne(stmt, params = {}) {
    stmt.bind(params);
    const has = stmt.step();
    const row = has ? stmt.getAsObject() : void 0;
    stmt.reset();
    return row ? rowToOp(row) : void 0;
  }
  tickFlush() {
    if (this.flushEvery === 0) return;
    if (++this.writes % this.flushEvery === 0) this.flushToDisk();
  }
};
function rowToOp(row) {
  const payload = JSON.parse(row.payload);
  return {
    hash: row.hash,
    kind: row.kind,
    timestamp: row.timestamp,
    agentId: row.agent_id,
    previousHash: row.previous_hash ?? void 0,
    facts: payload.facts,
    links: payload.links,
    deleteFacts: payload.deleteFacts,
    deleteLinks: payload.deleteLinks,
    // ADR 0021: `v` absent ⇒ legacy v1 op, never reverified.
    v: payload.v,
    provenance: payload.provenance ?? void 0
  };
}

// dist/chunk-H55CYDLS.js
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function makeStateUpdater(key, instance) {
  return (updater) => {
    instance.setState((old) => {
      return {
        ...old,
        [key]: functionalUpdate(updater, old[key])
      };
    });
  };
}
function isFunction(d) {
  return d instanceof Function;
}
function isNumberArray(d) {
  return Array.isArray(d) && d.every((val) => typeof val === "number");
}
function flattenBy(arr, getChildren) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children = getChildren(item);
      if (children != null && children.length) {
        recurse(children);
      }
    });
  };
  recurse(arr);
  return flat;
}
function memo(getDeps, fn, opts) {
  let deps = [];
  let result;
  return (depArgs) => {
    let depTime;
    if (opts.key && opts.debug) depTime = Date.now();
    const newDeps = getDeps(depArgs);
    const depsChanged = newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime;
    if (opts.key && opts.debug) resultTime = Date.now();
    result = fn(...newDeps);
    opts == null || opts.onChange == null || opts.onChange(result);
    if (opts.key && opts.debug) {
      if (opts != null && opts.debug()) {
        const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
        const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
        const resultFpsPercentage = resultEndTime / 16;
        const pad = (str, num) => {
          str = String(str);
          while (str.length < num) {
            str = " " + str;
          }
          return str;
        };
        console.info(`%c\u23F1 ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`, opts == null ? void 0 : opts.key);
      }
    }
    return result;
  };
}
function getMemoOptions(tableOptions, debugLevel, key, onChange) {
  return {
    debug: () => {
      var _tableOptions$debugAl;
      return (_tableOptions$debugAl = tableOptions == null ? void 0 : tableOptions.debugAll) != null ? _tableOptions$debugAl : tableOptions[debugLevel];
    },
    key,
    onChange
  };
}
function createCell(table2, row, column, columnId) {
  const getRenderValue = () => {
    var _cell$getValue;
    return (_cell$getValue = cell.getValue()) != null ? _cell$getValue : table2.options.renderFallbackValue;
  };
  const cell = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(columnId),
    renderValue: getRenderValue,
    getContext: memo(() => [table2, column, row, cell], (table22, column2, row2, cell2) => ({
      table: table22,
      column: column2,
      row: row2,
      cell: cell2,
      getValue: cell2.getValue,
      renderValue: cell2.renderValue
    }), getMemoOptions(table2.options, "debugCells", "cell.getContext"))
  };
  table2._features.forEach((feature) => {
    feature.createCell == null || feature.createCell(cell, column, row, table2);
  }, {});
  return cell;
}
function createColumn(table2, columnDef, depth, parent) {
  var _ref, _resolvedColumnDef$id;
  const defaultColumn = table2._getDefaultColumnDef();
  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  let id = (_ref = (_resolvedColumnDef$id = resolvedColumnDef.id) != null ? _resolvedColumnDef$id : accessorKey ? typeof String.prototype.replaceAll === "function" ? accessorKey.replaceAll(".", "_") : accessorKey.replace(/\./g, "_") : void 0) != null ? _ref : typeof resolvedColumnDef.header === "string" ? resolvedColumnDef.header : void 0;
  let accessorFn;
  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn;
  } else if (accessorKey) {
    if (accessorKey.includes(".")) {
      accessorFn = (originalRow) => {
        let result = originalRow;
        for (const key of accessorKey.split(".")) {
          var _result;
          result = (_result = result) == null ? void 0 : _result[key];
          if (result === void 0) {
            console.warn(`"${key}" in deeply nested key "${accessorKey}" returned undefined.`);
          }
        }
        return result;
      };
    } else {
      accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
    }
  }
  if (!id) {
    if (true) {
      throw new Error(resolvedColumnDef.accessorFn ? `Columns require an id when using an accessorFn` : `Columns require an id when using a non-string header`);
    }
    throw new Error();
  }
  let column = {
    id: `${String(id)}`,
    accessorFn,
    parent,
    depth,
    columnDef: resolvedColumnDef,
    columns: [],
    getFlatColumns: memo(() => [true], () => {
      var _column$columns;
      return [column, ...(_column$columns = column.columns) == null ? void 0 : _column$columns.flatMap((d) => d.getFlatColumns())];
    }, getMemoOptions(table2.options, "debugColumns", "column.getFlatColumns")),
    getLeafColumns: memo(() => [table2._getOrderColumnsFn()], (orderColumns2) => {
      var _column$columns2;
      if ((_column$columns2 = column.columns) != null && _column$columns2.length) {
        let leafColumns = column.columns.flatMap((column2) => column2.getLeafColumns());
        return orderColumns2(leafColumns);
      }
      return [column];
    }, getMemoOptions(table2.options, "debugColumns", "column.getLeafColumns"))
  };
  for (const feature of table2._features) {
    feature.createColumn == null || feature.createColumn(column, table2);
  }
  return column;
}
var debug = "debugHeaders";
function createHeader(table2, column, options) {
  var _options$id;
  const id = (_options$id = options.id) != null ? _options$id : column.id;
  let header = {
    id,
    column,
    index: options.index,
    isPlaceholder: !!options.isPlaceholder,
    placeholderId: options.placeholderId,
    depth: options.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null,
    getLeafHeaders: () => {
      const leafHeaders = [];
      const recurseHeader = (h) => {
        if (h.subHeaders && h.subHeaders.length) {
          h.subHeaders.map(recurseHeader);
        }
        leafHeaders.push(h);
      };
      recurseHeader(header);
      return leafHeaders;
    },
    getContext: () => ({
      table: table2,
      header,
      column
    })
  };
  table2._features.forEach((feature) => {
    feature.createHeader == null || feature.createHeader(header, table2);
  });
  return header;
}
var Headers = {
  createTable: (table2) => {
    table2.getHeaderGroups = memo(() => [table2.getAllColumns(), table2.getVisibleLeafColumns(), table2.getState().columnPinning.left, table2.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      var _left$map$filter, _right$map$filter;
      const leftColumns = (_left$map$filter = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter : [];
      const rightColumns = (_right$map$filter = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter : [];
      const centerColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      const headerGroups = buildHeaderGroups(allColumns, [...leftColumns, ...centerColumns, ...rightColumns], table2);
      return headerGroups;
    }, getMemoOptions(table2.options, debug, "getHeaderGroups"));
    table2.getCenterHeaderGroups = memo(() => [table2.getAllColumns(), table2.getVisibleLeafColumns(), table2.getState().columnPinning.left, table2.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      leafColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      return buildHeaderGroups(allColumns, leafColumns, table2, "center");
    }, getMemoOptions(table2.options, debug, "getCenterHeaderGroups"));
    table2.getLeftHeaderGroups = memo(() => [table2.getAllColumns(), table2.getVisibleLeafColumns(), table2.getState().columnPinning.left], (allColumns, leafColumns, left) => {
      var _left$map$filter2;
      const orderedLeafColumns = (_left$map$filter2 = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table2, "left");
    }, getMemoOptions(table2.options, debug, "getLeftHeaderGroups"));
    table2.getRightHeaderGroups = memo(() => [table2.getAllColumns(), table2.getVisibleLeafColumns(), table2.getState().columnPinning.right], (allColumns, leafColumns, right) => {
      var _right$map$filter2;
      const orderedLeafColumns = (_right$map$filter2 = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table2, "right");
    }, getMemoOptions(table2.options, debug, "getRightHeaderGroups"));
    table2.getFooterGroups = memo(() => [table2.getHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table2.options, debug, "getFooterGroups"));
    table2.getLeftFooterGroups = memo(() => [table2.getLeftHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table2.options, debug, "getLeftFooterGroups"));
    table2.getCenterFooterGroups = memo(() => [table2.getCenterHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table2.options, debug, "getCenterFooterGroups"));
    table2.getRightFooterGroups = memo(() => [table2.getRightHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table2.options, debug, "getRightFooterGroups"));
    table2.getFlatHeaders = memo(() => [table2.getHeaderGroups()], (headerGroups) => {
      return headerGroups.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table2.options, debug, "getFlatHeaders"));
    table2.getLeftFlatHeaders = memo(() => [table2.getLeftHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table2.options, debug, "getLeftFlatHeaders"));
    table2.getCenterFlatHeaders = memo(() => [table2.getCenterHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table2.options, debug, "getCenterFlatHeaders"));
    table2.getRightFlatHeaders = memo(() => [table2.getRightHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table2.options, debug, "getRightFlatHeaders"));
    table2.getCenterLeafHeaders = memo(() => [table2.getCenterFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders;
        return !((_header$subHeaders = header.subHeaders) != null && _header$subHeaders.length);
      });
    }, getMemoOptions(table2.options, debug, "getCenterLeafHeaders"));
    table2.getLeftLeafHeaders = memo(() => [table2.getLeftFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders2;
        return !((_header$subHeaders2 = header.subHeaders) != null && _header$subHeaders2.length);
      });
    }, getMemoOptions(table2.options, debug, "getLeftLeafHeaders"));
    table2.getRightLeafHeaders = memo(() => [table2.getRightFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders3;
        return !((_header$subHeaders3 = header.subHeaders) != null && _header$subHeaders3.length);
      });
    }, getMemoOptions(table2.options, debug, "getRightLeafHeaders"));
    table2.getLeafHeaders = memo(() => [table2.getLeftHeaderGroups(), table2.getCenterHeaderGroups(), table2.getRightHeaderGroups()], (left, center, right) => {
      var _left$0$headers, _left$, _center$0$headers, _center$, _right$0$headers, _right$;
      return [...(_left$0$headers = (_left$ = left[0]) == null ? void 0 : _left$.headers) != null ? _left$0$headers : [], ...(_center$0$headers = (_center$ = center[0]) == null ? void 0 : _center$.headers) != null ? _center$0$headers : [], ...(_right$0$headers = (_right$ = right[0]) == null ? void 0 : _right$.headers) != null ? _right$0$headers : []].map((header) => {
        return header.getLeafHeaders();
      }).flat();
    }, getMemoOptions(table2.options, debug, "getLeafHeaders"));
  }
};
function buildHeaderGroups(allColumns, columnsToGroup, table2, headerFamily) {
  var _headerGroups$0$heade, _headerGroups$;
  let maxDepth = 0;
  const findMaxDepth = function(columns, depth) {
    if (depth === void 0) {
      depth = 1;
    }
    maxDepth = Math.max(maxDepth, depth);
    columns.filter((column) => column.getIsVisible()).forEach((column) => {
      var _column$columns;
      if ((_column$columns = column.columns) != null && _column$columns.length) {
        findMaxDepth(column.columns, depth + 1);
      }
    }, 0);
  };
  findMaxDepth(allColumns);
  let headerGroups = [];
  const createHeaderGroup = (headersToGroup, depth) => {
    const headerGroup = {
      depth,
      id: [headerFamily, `${depth}`].filter(Boolean).join("_"),
      headers: []
    };
    const pendingParentHeaders = [];
    headersToGroup.forEach((headerToGroup) => {
      const latestPendingParentHeader = [...pendingParentHeaders].reverse()[0];
      const isLeafHeader = headerToGroup.column.depth === headerGroup.depth;
      let column;
      let isPlaceholder = false;
      if (isLeafHeader && headerToGroup.column.parent) {
        column = headerToGroup.column.parent;
      } else {
        column = headerToGroup.column;
        isPlaceholder = true;
      }
      if (latestPendingParentHeader && (latestPendingParentHeader == null ? void 0 : latestPendingParentHeader.column) === column) {
        latestPendingParentHeader.subHeaders.push(headerToGroup);
      } else {
        const header = createHeader(table2, column, {
          id: [headerFamily, depth, column.id, headerToGroup == null ? void 0 : headerToGroup.id].filter(Boolean).join("_"),
          isPlaceholder,
          placeholderId: isPlaceholder ? `${pendingParentHeaders.filter((d) => d.column === column).length}` : void 0,
          depth,
          index: pendingParentHeaders.length
        });
        header.subHeaders.push(headerToGroup);
        pendingParentHeaders.push(header);
      }
      headerGroup.headers.push(headerToGroup);
      headerToGroup.headerGroup = headerGroup;
    });
    headerGroups.push(headerGroup);
    if (depth > 0) {
      createHeaderGroup(pendingParentHeaders, depth - 1);
    }
  };
  const bottomHeaders = columnsToGroup.map((column, index) => createHeader(table2, column, {
    depth: maxDepth,
    index
  }));
  createHeaderGroup(bottomHeaders, maxDepth - 1);
  headerGroups.reverse();
  const recurseHeadersForSpans = (headers) => {
    const filteredHeaders = headers.filter((header) => header.column.getIsVisible());
    return filteredHeaders.map((header) => {
      let colSpan = 0;
      let rowSpan = 0;
      let childRowSpans = [0];
      if (header.subHeaders && header.subHeaders.length) {
        childRowSpans = [];
        recurseHeadersForSpans(header.subHeaders).forEach((_ref) => {
          let {
            colSpan: childColSpan,
            rowSpan: childRowSpan
          } = _ref;
          colSpan += childColSpan;
          childRowSpans.push(childRowSpan);
        });
      } else {
        colSpan = 1;
      }
      const minChildRowSpan = Math.min(...childRowSpans);
      rowSpan = rowSpan + minChildRowSpan;
      header.colSpan = colSpan;
      header.rowSpan = rowSpan;
      return {
        colSpan,
        rowSpan
      };
    });
  };
  recurseHeadersForSpans((_headerGroups$0$heade = (_headerGroups$ = headerGroups[0]) == null ? void 0 : _headerGroups$.headers) != null ? _headerGroups$0$heade : []);
  return headerGroups;
}
var createRow = (table2, id, original, rowIndex, depth, subRows, parentId) => {
  let row = {
    id,
    index: rowIndex,
    original,
    depth,
    parentId,
    _valuesCache: {},
    _uniqueValuesCache: {},
    getValue: (columnId) => {
      if (row._valuesCache.hasOwnProperty(columnId)) {
        return row._valuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      row._valuesCache[columnId] = column.accessorFn(row.original, rowIndex);
      return row._valuesCache[columnId];
    },
    getUniqueValues: (columnId) => {
      if (row._uniqueValuesCache.hasOwnProperty(columnId)) {
        return row._uniqueValuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      if (!column.columnDef.getUniqueValues) {
        row._uniqueValuesCache[columnId] = [row.getValue(columnId)];
        return row._uniqueValuesCache[columnId];
      }
      row._uniqueValuesCache[columnId] = column.columnDef.getUniqueValues(row.original, rowIndex);
      return row._uniqueValuesCache[columnId];
    },
    renderValue: (columnId) => {
      var _row$getValue;
      return (_row$getValue = row.getValue(columnId)) != null ? _row$getValue : table2.options.renderFallbackValue;
    },
    subRows: subRows != null ? subRows : [],
    getLeafRows: () => flattenBy(row.subRows, (d) => d.subRows),
    getParentRow: () => row.parentId ? table2.getRow(row.parentId, true) : void 0,
    getParentRows: () => {
      let parentRows = [];
      let currentRow = row;
      while (true) {
        const parentRow = currentRow.getParentRow();
        if (!parentRow) break;
        parentRows.push(parentRow);
        currentRow = parentRow;
      }
      return parentRows.reverse();
    },
    getAllCells: memo(() => [table2.getAllLeafColumns()], (leafColumns) => {
      return leafColumns.map((column) => {
        return createCell(table2, row, column, column.id);
      });
    }, getMemoOptions(table2.options, "debugRows", "getAllCells")),
    _getAllCellsByColumnId: memo(() => [row.getAllCells()], (allCells) => {
      return allCells.reduce((acc, cell) => {
        acc[cell.column.id] = cell;
        return acc;
      }, {});
    }, getMemoOptions(table2.options, "debugRows", "getAllCellsByColumnId"))
  };
  for (let i = 0; i < table2._features.length; i++) {
    const feature = table2._features[i];
    feature == null || feature.createRow == null || feature.createRow(row, table2);
  }
  return row;
};
var ColumnFaceting = {
  createColumn: (column, table2) => {
    column._getFacetedRowModel = table2.options.getFacetedRowModel && table2.options.getFacetedRowModel(table2, column.id);
    column.getFacetedRowModel = () => {
      if (!column._getFacetedRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return column._getFacetedRowModel();
    };
    column._getFacetedUniqueValues = table2.options.getFacetedUniqueValues && table2.options.getFacetedUniqueValues(table2, column.id);
    column.getFacetedUniqueValues = () => {
      if (!column._getFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return column._getFacetedUniqueValues();
    };
    column._getFacetedMinMaxValues = table2.options.getFacetedMinMaxValues && table2.options.getFacetedMinMaxValues(table2, column.id);
    column.getFacetedMinMaxValues = () => {
      if (!column._getFacetedMinMaxValues) {
        return void 0;
      }
      return column._getFacetedMinMaxValues();
    };
  }
};
var includesString = (row, columnId, filterValue) => {
  var _filterValue$toString, _row$getValue;
  const search = filterValue == null || (_filterValue$toString = filterValue.toString()) == null ? void 0 : _filterValue$toString.toLowerCase();
  return Boolean((_row$getValue = row.getValue(columnId)) == null || (_row$getValue = _row$getValue.toString()) == null || (_row$getValue = _row$getValue.toLowerCase()) == null ? void 0 : _row$getValue.includes(search));
};
includesString.autoRemove = (val) => testFalsey(val);
var includesStringSensitive = (row, columnId, filterValue) => {
  var _row$getValue2;
  return Boolean((_row$getValue2 = row.getValue(columnId)) == null || (_row$getValue2 = _row$getValue2.toString()) == null ? void 0 : _row$getValue2.includes(filterValue));
};
includesStringSensitive.autoRemove = (val) => testFalsey(val);
var equalsString = (row, columnId, filterValue) => {
  var _row$getValue3;
  return ((_row$getValue3 = row.getValue(columnId)) == null || (_row$getValue3 = _row$getValue3.toString()) == null ? void 0 : _row$getValue3.toLowerCase()) === (filterValue == null ? void 0 : filterValue.toLowerCase());
};
equalsString.autoRemove = (val) => testFalsey(val);
var arrIncludes = (row, columnId, filterValue) => {
  var _row$getValue4;
  return (_row$getValue4 = row.getValue(columnId)) == null ? void 0 : _row$getValue4.includes(filterValue);
};
arrIncludes.autoRemove = (val) => testFalsey(val);
var arrIncludesAll = (row, columnId, filterValue) => {
  return !filterValue.some((val) => {
    var _row$getValue5;
    return !((_row$getValue5 = row.getValue(columnId)) != null && _row$getValue5.includes(val));
  });
};
arrIncludesAll.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var arrIncludesSome = (row, columnId, filterValue) => {
  return filterValue.some((val) => {
    var _row$getValue6;
    return (_row$getValue6 = row.getValue(columnId)) == null ? void 0 : _row$getValue6.includes(val);
  });
};
arrIncludesSome.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var equals = (row, columnId, filterValue) => {
  return row.getValue(columnId) === filterValue;
};
equals.autoRemove = (val) => testFalsey(val);
var weakEquals = (row, columnId, filterValue) => {
  return row.getValue(columnId) == filterValue;
};
weakEquals.autoRemove = (val) => testFalsey(val);
var inNumberRange = (row, columnId, filterValue) => {
  let [min2, max2] = filterValue;
  const rowValue = row.getValue(columnId);
  return rowValue >= min2 && rowValue <= max2;
};
inNumberRange.resolveFilterValue = (val) => {
  let [unsafeMin, unsafeMax] = val;
  let parsedMin = typeof unsafeMin !== "number" ? parseFloat(unsafeMin) : unsafeMin;
  let parsedMax = typeof unsafeMax !== "number" ? parseFloat(unsafeMax) : unsafeMax;
  let min2 = unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin;
  let max2 = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax;
  if (min2 > max2) {
    const temp = min2;
    min2 = max2;
    max2 = temp;
  }
  return [min2, max2];
};
inNumberRange.autoRemove = (val) => testFalsey(val) || testFalsey(val[0]) && testFalsey(val[1]);
var filterFns = {
  includesString,
  includesStringSensitive,
  equalsString,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
  equals,
  weakEquals,
  inNumberRange
};
function testFalsey(val) {
  return val === void 0 || val === null || val === "";
}
var ColumnFiltering = {
  getDefaultColumnDef: () => {
    return {
      filterFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      columnFilters: [],
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnFiltersChange: makeStateUpdater("columnFilters", table2),
      filterFromLeafRows: false,
      maxLeafRowFilterDepth: 100
    };
  },
  createColumn: (column, table2) => {
    column.getAutoFilterFn = () => {
      const firstRow = table2.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return filterFns.includesString;
      }
      if (typeof value === "number") {
        return filterFns.inNumberRange;
      }
      if (typeof value === "boolean") {
        return filterFns.equals;
      }
      if (value !== null && typeof value === "object") {
        return filterFns.equals;
      }
      if (Array.isArray(value)) {
        return filterFns.arrIncludes;
      }
      return filterFns.weakEquals;
    };
    column.getFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      return isFunction(column.columnDef.filterFn) ? column.columnDef.filterFn : column.columnDef.filterFn === "auto" ? column.getAutoFilterFn() : (
        // @ts-ignore
        (_table$options$filter = (_table$options$filter2 = table2.options.filterFns) == null ? void 0 : _table$options$filter2[column.columnDef.filterFn]) != null ? _table$options$filter : filterFns[column.columnDef.filterFn]
      );
    };
    column.getCanFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2;
      return ((_column$columnDef$ena = column.columnDef.enableColumnFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table2.options.enableColumnFilters) != null ? _table$options$enable : true) && ((_table$options$enable2 = table2.options.enableFilters) != null ? _table$options$enable2 : true) && !!column.accessorFn;
    };
    column.getIsFiltered = () => column.getFilterIndex() > -1;
    column.getFilterValue = () => {
      var _table$getState$colum;
      return (_table$getState$colum = table2.getState().columnFilters) == null || (_table$getState$colum = _table$getState$colum.find((d) => d.id === column.id)) == null ? void 0 : _table$getState$colum.value;
    };
    column.getFilterIndex = () => {
      var _table$getState$colum2, _table$getState$colum3;
      return (_table$getState$colum2 = (_table$getState$colum3 = table2.getState().columnFilters) == null ? void 0 : _table$getState$colum3.findIndex((d) => d.id === column.id)) != null ? _table$getState$colum2 : -1;
    };
    column.setFilterValue = (value) => {
      table2.setColumnFilters((old) => {
        const filterFn = column.getFilterFn();
        const previousFilter = old == null ? void 0 : old.find((d) => d.id === column.id);
        const newFilter = functionalUpdate(value, previousFilter ? previousFilter.value : void 0);
        if (shouldAutoRemoveFilter(filterFn, newFilter, column)) {
          var _old$filter;
          return (_old$filter = old == null ? void 0 : old.filter((d) => d.id !== column.id)) != null ? _old$filter : [];
        }
        const newFilterObj = {
          id: column.id,
          value: newFilter
        };
        if (previousFilter) {
          var _old$map;
          return (_old$map = old == null ? void 0 : old.map((d) => {
            if (d.id === column.id) {
              return newFilterObj;
            }
            return d;
          })) != null ? _old$map : [];
        }
        if (old != null && old.length) {
          return [...old, newFilterObj];
        }
        return [newFilterObj];
      });
    };
  },
  createRow: (row, _table) => {
    row.columnFilters = {};
    row.columnFiltersMeta = {};
  },
  createTable: (table2) => {
    table2.setColumnFilters = (updater) => {
      const leafColumns = table2.getAllLeafColumns();
      const updateFn = (old) => {
        var _functionalUpdate;
        return (_functionalUpdate = functionalUpdate(updater, old)) == null ? void 0 : _functionalUpdate.filter((filter) => {
          const column = leafColumns.find((d) => d.id === filter.id);
          if (column) {
            const filterFn = column.getFilterFn();
            if (shouldAutoRemoveFilter(filterFn, filter.value, column)) {
              return false;
            }
          }
          return true;
        });
      };
      table2.options.onColumnFiltersChange == null || table2.options.onColumnFiltersChange(updateFn);
    };
    table2.resetColumnFilters = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      table2.setColumnFilters(defaultState ? [] : (_table$initialState$c = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.columnFilters) != null ? _table$initialState$c : []);
    };
    table2.getPreFilteredRowModel = () => table2.getCoreRowModel();
    table2.getFilteredRowModel = () => {
      if (!table2._getFilteredRowModel && table2.options.getFilteredRowModel) {
        table2._getFilteredRowModel = table2.options.getFilteredRowModel(table2);
      }
      if (table2.options.manualFiltering || !table2._getFilteredRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return table2._getFilteredRowModel();
    };
  }
};
function shouldAutoRemoveFilter(filterFn, value, column) {
  return (filterFn && filterFn.autoRemove ? filterFn.autoRemove(value, column) : false) || typeof value === "undefined" || typeof value === "string" && !value;
}
var sum = (columnId, _leafRows, childRows) => {
  return childRows.reduce((sum2, next) => {
    const nextValue = next.getValue(columnId);
    return sum2 + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
};
var min = (columnId, _leafRows, childRows) => {
  let min2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (min2 > value || min2 === void 0 && value >= value)) {
      min2 = value;
    }
  });
  return min2;
};
var max = (columnId, _leafRows, childRows) => {
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (max2 < value || max2 === void 0 && value >= value)) {
      max2 = value;
    }
  });
  return max2;
};
var extent = (columnId, _leafRows, childRows) => {
  let min2;
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null) {
      if (min2 === void 0) {
        if (value >= value) min2 = max2 = value;
      } else {
        if (min2 > value) min2 = value;
        if (max2 < value) max2 = value;
      }
    }
  });
  return [min2, max2];
};
var mean = (columnId, leafRows) => {
  let count2 = 0;
  let sum2 = 0;
  leafRows.forEach((row) => {
    let value = row.getValue(columnId);
    if (value != null && (value = +value) >= value) {
      ++count2, sum2 += value;
    }
  });
  if (count2) return sum2 / count2;
  return;
};
var median = (columnId, leafRows) => {
  if (!leafRows.length) {
    return;
  }
  const values = leafRows.map((row) => row.getValue(columnId));
  if (!isNumberArray(values)) {
    return;
  }
  if (values.length === 1) {
    return values[0];
  }
  const mid = Math.floor(values.length / 2);
  const nums = values.sort((a, b) => a - b);
  return values.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};
var unique = (columnId, leafRows) => {
  return Array.from(new Set(leafRows.map((d) => d.getValue(columnId))).values());
};
var uniqueCount = (columnId, leafRows) => {
  return new Set(leafRows.map((d) => d.getValue(columnId))).size;
};
var count = (_columnId, leafRows) => {
  return leafRows.length;
};
var aggregationFns = {
  sum,
  min,
  max,
  extent,
  mean,
  median,
  unique,
  uniqueCount,
  count
};
var ColumnGrouping = {
  getDefaultColumnDef: () => {
    return {
      aggregatedCell: (props) => {
        var _toString, _props$getValue;
        return (_toString = (_props$getValue = props.getValue()) == null || _props$getValue.toString == null ? void 0 : _props$getValue.toString()) != null ? _toString : null;
      },
      aggregationFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      grouping: [],
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onGroupingChange: makeStateUpdater("grouping", table2),
      groupedColumnMode: "reorder"
    };
  },
  createColumn: (column, table2) => {
    column.toggleGrouping = () => {
      table2.setGrouping((old) => {
        if (old != null && old.includes(column.id)) {
          return old.filter((d) => d !== column.id);
        }
        return [...old != null ? old : [], column.id];
      });
    };
    column.getCanGroup = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableGrouping) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table2.options.enableGrouping) != null ? _table$options$enable : true) && (!!column.accessorFn || !!column.columnDef.getGroupingValue);
    };
    column.getIsGrouped = () => {
      var _table$getState$group;
      return (_table$getState$group = table2.getState().grouping) == null ? void 0 : _table$getState$group.includes(column.id);
    };
    column.getGroupedIndex = () => {
      var _table$getState$group2;
      return (_table$getState$group2 = table2.getState().grouping) == null ? void 0 : _table$getState$group2.indexOf(column.id);
    };
    column.getToggleGroupingHandler = () => {
      const canGroup = column.getCanGroup();
      return () => {
        if (!canGroup) return;
        column.toggleGrouping();
      };
    };
    column.getAutoAggregationFn = () => {
      const firstRow = table2.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "number") {
        return aggregationFns.sum;
      }
      if (Object.prototype.toString.call(value) === "[object Date]") {
        return aggregationFns.extent;
      }
    };
    column.getAggregationFn = () => {
      var _table$options$aggreg, _table$options$aggreg2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.aggregationFn) ? column.columnDef.aggregationFn : column.columnDef.aggregationFn === "auto" ? column.getAutoAggregationFn() : (_table$options$aggreg = (_table$options$aggreg2 = table2.options.aggregationFns) == null ? void 0 : _table$options$aggreg2[column.columnDef.aggregationFn]) != null ? _table$options$aggreg : aggregationFns[column.columnDef.aggregationFn];
    };
  },
  createTable: (table2) => {
    table2.setGrouping = (updater) => table2.options.onGroupingChange == null ? void 0 : table2.options.onGroupingChange(updater);
    table2.resetGrouping = (defaultState) => {
      var _table$initialState$g, _table$initialState;
      table2.setGrouping(defaultState ? [] : (_table$initialState$g = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.grouping) != null ? _table$initialState$g : []);
    };
    table2.getPreGroupedRowModel = () => table2.getFilteredRowModel();
    table2.getGroupedRowModel = () => {
      if (!table2._getGroupedRowModel && table2.options.getGroupedRowModel) {
        table2._getGroupedRowModel = table2.options.getGroupedRowModel(table2);
      }
      if (table2.options.manualGrouping || !table2._getGroupedRowModel) {
        return table2.getPreGroupedRowModel();
      }
      return table2._getGroupedRowModel();
    };
  },
  createRow: (row, table2) => {
    row.getIsGrouped = () => !!row.groupingColumnId;
    row.getGroupingValue = (columnId) => {
      if (row._groupingValuesCache.hasOwnProperty(columnId)) {
        return row._groupingValuesCache[columnId];
      }
      const column = table2.getColumn(columnId);
      if (!(column != null && column.columnDef.getGroupingValue)) {
        return row.getValue(columnId);
      }
      row._groupingValuesCache[columnId] = column.columnDef.getGroupingValue(row.original);
      return row._groupingValuesCache[columnId];
    };
    row._groupingValuesCache = {};
  },
  createCell: (cell, column, row, table2) => {
    cell.getIsGrouped = () => column.getIsGrouped() && column.id === row.groupingColumnId;
    cell.getIsPlaceholder = () => !cell.getIsGrouped() && column.getIsGrouped();
    cell.getIsAggregated = () => {
      var _row$subRows;
      return !cell.getIsGrouped() && !cell.getIsPlaceholder() && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
  }
};
function orderColumns(leafColumns, grouping, groupedColumnMode) {
  if (!(grouping != null && grouping.length) || !groupedColumnMode) {
    return leafColumns;
  }
  const nonGroupingColumns = leafColumns.filter((col) => !grouping.includes(col.id));
  if (groupedColumnMode === "remove") {
    return nonGroupingColumns;
  }
  const groupingColumns = grouping.map((g) => leafColumns.find((col) => col.id === g)).filter(Boolean);
  return [...groupingColumns, ...nonGroupingColumns];
}
var ColumnOrdering = {
  getInitialState: (state) => {
    return {
      columnOrder: [],
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnOrderChange: makeStateUpdater("columnOrder", table2)
    };
  },
  createColumn: (column, table2) => {
    column.getIndex = memo((position) => [_getVisibleLeafColumns(table2, position)], (columns) => columns.findIndex((d) => d.id === column.id), getMemoOptions(table2.options, "debugColumns", "getIndex"));
    column.getIsFirstColumn = (position) => {
      var _columns$;
      const columns = _getVisibleLeafColumns(table2, position);
      return ((_columns$ = columns[0]) == null ? void 0 : _columns$.id) === column.id;
    };
    column.getIsLastColumn = (position) => {
      var _columns;
      const columns = _getVisibleLeafColumns(table2, position);
      return ((_columns = columns[columns.length - 1]) == null ? void 0 : _columns.id) === column.id;
    };
  },
  createTable: (table2) => {
    table2.setColumnOrder = (updater) => table2.options.onColumnOrderChange == null ? void 0 : table2.options.onColumnOrderChange(updater);
    table2.resetColumnOrder = (defaultState) => {
      var _table$initialState$c;
      table2.setColumnOrder(defaultState ? [] : (_table$initialState$c = table2.initialState.columnOrder) != null ? _table$initialState$c : []);
    };
    table2._getOrderColumnsFn = memo(() => [table2.getState().columnOrder, table2.getState().grouping, table2.options.groupedColumnMode], (columnOrder, grouping, groupedColumnMode) => (columns) => {
      let orderedColumns = [];
      if (!(columnOrder != null && columnOrder.length)) {
        orderedColumns = columns;
      } else {
        const columnOrderCopy = [...columnOrder];
        const columnsCopy = [...columns];
        while (columnsCopy.length && columnOrderCopy.length) {
          const targetColumnId = columnOrderCopy.shift();
          const foundIndex = columnsCopy.findIndex((d) => d.id === targetColumnId);
          if (foundIndex > -1) {
            orderedColumns.push(columnsCopy.splice(foundIndex, 1)[0]);
          }
        }
        orderedColumns = [...orderedColumns, ...columnsCopy];
      }
      return orderColumns(orderedColumns, grouping, groupedColumnMode);
    }, getMemoOptions(table2.options, "debugTable", "_getOrderColumnsFn"));
  }
};
var getDefaultColumnPinningState = () => ({
  left: [],
  right: []
});
var ColumnPinning = {
  getInitialState: (state) => {
    return {
      columnPinning: getDefaultColumnPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnPinningChange: makeStateUpdater("columnPinning", table2)
    };
  },
  createColumn: (column, table2) => {
    column.pin = (position) => {
      const columnIds = column.getLeafColumns().map((d) => d.id).filter(Boolean);
      table2.setColumnPinning((old) => {
        var _old$left3, _old$right3;
        if (position === "right") {
          var _old$left, _old$right;
          return {
            left: ((_old$left = old == null ? void 0 : old.left) != null ? _old$left : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
            right: [...((_old$right = old == null ? void 0 : old.right) != null ? _old$right : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds]
          };
        }
        if (position === "left") {
          var _old$left2, _old$right2;
          return {
            left: [...((_old$left2 = old == null ? void 0 : old.left) != null ? _old$left2 : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds],
            right: ((_old$right2 = old == null ? void 0 : old.right) != null ? _old$right2 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
          };
        }
        return {
          left: ((_old$left3 = old == null ? void 0 : old.left) != null ? _old$left3 : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
          right: ((_old$right3 = old == null ? void 0 : old.right) != null ? _old$right3 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
        };
      });
    };
    column.getCanPin = () => {
      const leafColumns = column.getLeafColumns();
      return leafColumns.some((d) => {
        var _d$columnDef$enablePi, _ref, _table$options$enable;
        return ((_d$columnDef$enablePi = d.columnDef.enablePinning) != null ? _d$columnDef$enablePi : true) && ((_ref = (_table$options$enable = table2.options.enableColumnPinning) != null ? _table$options$enable : table2.options.enablePinning) != null ? _ref : true);
      });
    };
    column.getIsPinned = () => {
      const leafColumnIds = column.getLeafColumns().map((d) => d.id);
      const {
        left,
        right
      } = table2.getState().columnPinning;
      const isLeft = leafColumnIds.some((d) => left == null ? void 0 : left.includes(d));
      const isRight = leafColumnIds.some((d) => right == null ? void 0 : right.includes(d));
      return isLeft ? "left" : isRight ? "right" : false;
    };
    column.getPinnedIndex = () => {
      var _table$getState$colum, _table$getState$colum2;
      const position = column.getIsPinned();
      return position ? (_table$getState$colum = (_table$getState$colum2 = table2.getState().columnPinning) == null || (_table$getState$colum2 = _table$getState$colum2[position]) == null ? void 0 : _table$getState$colum2.indexOf(column.id)) != null ? _table$getState$colum : -1 : 0;
    };
  },
  createRow: (row, table2) => {
    row.getCenterVisibleCells = memo(() => [row._getAllVisibleCells(), table2.getState().columnPinning.left, table2.getState().columnPinning.right], (allCells, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allCells.filter((d) => !leftAndRight.includes(d.column.id));
    }, getMemoOptions(table2.options, "debugRows", "getCenterVisibleCells"));
    row.getLeftVisibleCells = memo(() => [row._getAllVisibleCells(), table2.getState().columnPinning.left], (allCells, left) => {
      const cells = (left != null ? left : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "left"
      }));
      return cells;
    }, getMemoOptions(table2.options, "debugRows", "getLeftVisibleCells"));
    row.getRightVisibleCells = memo(() => [row._getAllVisibleCells(), table2.getState().columnPinning.right], (allCells, right) => {
      const cells = (right != null ? right : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "right"
      }));
      return cells;
    }, getMemoOptions(table2.options, "debugRows", "getRightVisibleCells"));
  },
  createTable: (table2) => {
    table2.setColumnPinning = (updater) => table2.options.onColumnPinningChange == null ? void 0 : table2.options.onColumnPinningChange(updater);
    table2.resetColumnPinning = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      return table2.setColumnPinning(defaultState ? getDefaultColumnPinningState() : (_table$initialState$c = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.columnPinning) != null ? _table$initialState$c : getDefaultColumnPinningState());
    };
    table2.getIsSomeColumnsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table2.getState().columnPinning;
      if (!position) {
        var _pinningState$left, _pinningState$right;
        return Boolean(((_pinningState$left = pinningState.left) == null ? void 0 : _pinningState$left.length) || ((_pinningState$right = pinningState.right) == null ? void 0 : _pinningState$right.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table2.getLeftLeafColumns = memo(() => [table2.getAllLeafColumns(), table2.getState().columnPinning.left], (allColumns, left) => {
      return (left != null ? left : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table2.options, "debugColumns", "getLeftLeafColumns"));
    table2.getRightLeafColumns = memo(() => [table2.getAllLeafColumns(), table2.getState().columnPinning.right], (allColumns, right) => {
      return (right != null ? right : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table2.options, "debugColumns", "getRightLeafColumns"));
    table2.getCenterLeafColumns = memo(() => [table2.getAllLeafColumns(), table2.getState().columnPinning.left, table2.getState().columnPinning.right], (allColumns, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allColumns.filter((d) => !leftAndRight.includes(d.id));
    }, getMemoOptions(table2.options, "debugColumns", "getCenterLeafColumns"));
  }
};
function safelyAccessDocument(_document) {
  return _document || (typeof document !== "undefined" ? document : null);
}
var defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER
};
var getDefaultColumnSizingInfoState = () => ({
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: []
});
var ColumnSizing = {
  getDefaultColumnDef: () => {
    return defaultColumnSizing;
  },
  getInitialState: (state) => {
    return {
      columnSizing: {},
      columnSizingInfo: getDefaultColumnSizingInfoState(),
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      columnResizeMode: "onEnd",
      columnResizeDirection: "ltr",
      onColumnSizingChange: makeStateUpdater("columnSizing", table2),
      onColumnSizingInfoChange: makeStateUpdater("columnSizingInfo", table2)
    };
  },
  createColumn: (column, table2) => {
    column.getSize = () => {
      var _column$columnDef$min, _ref, _column$columnDef$max;
      const columnSize = table2.getState().columnSizing[column.id];
      return Math.min(Math.max((_column$columnDef$min = column.columnDef.minSize) != null ? _column$columnDef$min : defaultColumnSizing.minSize, (_ref = columnSize != null ? columnSize : column.columnDef.size) != null ? _ref : defaultColumnSizing.size), (_column$columnDef$max = column.columnDef.maxSize) != null ? _column$columnDef$max : defaultColumnSizing.maxSize);
    };
    column.getStart = memo((position) => [position, _getVisibleLeafColumns(table2, position), table2.getState().columnSizing], (position, columns) => columns.slice(0, column.getIndex(position)).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table2.options, "debugColumns", "getStart"));
    column.getAfter = memo((position) => [position, _getVisibleLeafColumns(table2, position), table2.getState().columnSizing], (position, columns) => columns.slice(column.getIndex(position) + 1).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table2.options, "debugColumns", "getAfter"));
    column.resetSize = () => {
      table2.setColumnSizing((_ref2) => {
        let {
          [column.id]: _,
          ...rest
        } = _ref2;
        return rest;
      });
    };
    column.getCanResize = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableResizing) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table2.options.enableColumnResizing) != null ? _table$options$enable : true);
    };
    column.getIsResizing = () => {
      return table2.getState().columnSizingInfo.isResizingColumn === column.id;
    };
  },
  createHeader: (header, table2) => {
    header.getSize = () => {
      let sum2 = 0;
      const recurse = (header2) => {
        if (header2.subHeaders.length) {
          header2.subHeaders.forEach(recurse);
        } else {
          var _header$column$getSiz;
          sum2 += (_header$column$getSiz = header2.column.getSize()) != null ? _header$column$getSiz : 0;
        }
      };
      recurse(header);
      return sum2;
    };
    header.getStart = () => {
      if (header.index > 0) {
        const prevSiblingHeader = header.headerGroup.headers[header.index - 1];
        return prevSiblingHeader.getStart() + prevSiblingHeader.getSize();
      }
      return 0;
    };
    header.getResizeHandler = (_contextDocument) => {
      const column = table2.getColumn(header.column.id);
      const canResize = column == null ? void 0 : column.getCanResize();
      return (e) => {
        if (!column || !canResize) {
          return;
        }
        e.persist == null || e.persist();
        if (isTouchStartEvent(e)) {
          if (e.touches && e.touches.length > 1) {
            return;
          }
        }
        const startSize = header.getSize();
        const columnSizingStart = header ? header.getLeafHeaders().map((d) => [d.column.id, d.column.getSize()]) : [[column.id, column.getSize()]];
        const clientX = isTouchStartEvent(e) ? Math.round(e.touches[0].clientX) : e.clientX;
        const newColumnSizing = {};
        const updateOffset = (eventType, clientXPos) => {
          if (typeof clientXPos !== "number") {
            return;
          }
          table2.setColumnSizingInfo((old) => {
            var _old$startOffset, _old$startSize;
            const deltaDirection = table2.options.columnResizeDirection === "rtl" ? -1 : 1;
            const deltaOffset = (clientXPos - ((_old$startOffset = old == null ? void 0 : old.startOffset) != null ? _old$startOffset : 0)) * deltaDirection;
            const deltaPercentage = Math.max(deltaOffset / ((_old$startSize = old == null ? void 0 : old.startSize) != null ? _old$startSize : 0), -0.999999);
            old.columnSizingStart.forEach((_ref3) => {
              let [columnId, headerSize] = _ref3;
              newColumnSizing[columnId] = Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
            });
            return {
              ...old,
              deltaOffset,
              deltaPercentage
            };
          });
          if (table2.options.columnResizeMode === "onChange" || eventType === "end") {
            table2.setColumnSizing((old) => ({
              ...old,
              ...newColumnSizing
            }));
          }
        };
        const onMove = (clientXPos) => updateOffset("move", clientXPos);
        const onEnd = (clientXPos) => {
          updateOffset("end", clientXPos);
          table2.setColumnSizingInfo((old) => ({
            ...old,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
            deltaOffset: null,
            deltaPercentage: null,
            columnSizingStart: []
          }));
        };
        const contextDocument = safelyAccessDocument(_contextDocument);
        const mouseEvents = {
          moveHandler: (e2) => onMove(e2.clientX),
          upHandler: (e2) => {
            contextDocument == null || contextDocument.removeEventListener("mousemove", mouseEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("mouseup", mouseEvents.upHandler);
            onEnd(e2.clientX);
          }
        };
        const touchEvents = {
          moveHandler: (e2) => {
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onMove(e2.touches[0].clientX);
            return false;
          },
          upHandler: (e2) => {
            var _e$touches$;
            contextDocument == null || contextDocument.removeEventListener("touchmove", touchEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("touchend", touchEvents.upHandler);
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onEnd((_e$touches$ = e2.touches[0]) == null ? void 0 : _e$touches$.clientX);
          }
        };
        const passiveIfSupported = passiveEventSupported() ? {
          passive: false
        } : false;
        if (isTouchStartEvent(e)) {
          contextDocument == null || contextDocument.addEventListener("touchmove", touchEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("touchend", touchEvents.upHandler, passiveIfSupported);
        } else {
          contextDocument == null || contextDocument.addEventListener("mousemove", mouseEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("mouseup", mouseEvents.upHandler, passiveIfSupported);
        }
        table2.setColumnSizingInfo((old) => ({
          ...old,
          startOffset: clientX,
          startSize,
          deltaOffset: 0,
          deltaPercentage: 0,
          columnSizingStart,
          isResizingColumn: column.id
        }));
      };
    };
  },
  createTable: (table2) => {
    table2.setColumnSizing = (updater) => table2.options.onColumnSizingChange == null ? void 0 : table2.options.onColumnSizingChange(updater);
    table2.setColumnSizingInfo = (updater) => table2.options.onColumnSizingInfoChange == null ? void 0 : table2.options.onColumnSizingInfoChange(updater);
    table2.resetColumnSizing = (defaultState) => {
      var _table$initialState$c;
      table2.setColumnSizing(defaultState ? {} : (_table$initialState$c = table2.initialState.columnSizing) != null ? _table$initialState$c : {});
    };
    table2.resetHeaderSizeInfo = (defaultState) => {
      var _table$initialState$c2;
      table2.setColumnSizingInfo(defaultState ? getDefaultColumnSizingInfoState() : (_table$initialState$c2 = table2.initialState.columnSizingInfo) != null ? _table$initialState$c2 : getDefaultColumnSizingInfoState());
    };
    table2.getTotalSize = () => {
      var _table$getHeaderGroup, _table$getHeaderGroup2;
      return (_table$getHeaderGroup = (_table$getHeaderGroup2 = table2.getHeaderGroups()[0]) == null ? void 0 : _table$getHeaderGroup2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getHeaderGroup : 0;
    };
    table2.getLeftTotalSize = () => {
      var _table$getLeftHeaderG, _table$getLeftHeaderG2;
      return (_table$getLeftHeaderG = (_table$getLeftHeaderG2 = table2.getLeftHeaderGroups()[0]) == null ? void 0 : _table$getLeftHeaderG2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getLeftHeaderG : 0;
    };
    table2.getCenterTotalSize = () => {
      var _table$getCenterHeade, _table$getCenterHeade2;
      return (_table$getCenterHeade = (_table$getCenterHeade2 = table2.getCenterHeaderGroups()[0]) == null ? void 0 : _table$getCenterHeade2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getCenterHeade : 0;
    };
    table2.getRightTotalSize = () => {
      var _table$getRightHeader, _table$getRightHeader2;
      return (_table$getRightHeader = (_table$getRightHeader2 = table2.getRightHeaderGroups()[0]) == null ? void 0 : _table$getRightHeader2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getRightHeader : 0;
    };
  }
};
var passiveSupported = null;
function passiveEventSupported() {
  if (typeof passiveSupported === "boolean") return passiveSupported;
  let supported = false;
  try {
    const options = {
      get passive() {
        supported = true;
        return false;
      }
    };
    const noop = () => {
    };
    window.addEventListener("test", noop, options);
    window.removeEventListener("test", noop);
  } catch (err) {
    supported = false;
  }
  passiveSupported = supported;
  return passiveSupported;
}
function isTouchStartEvent(e) {
  return e.type === "touchstart";
}
var ColumnVisibility = {
  getInitialState: (state) => {
    return {
      columnVisibility: {},
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onColumnVisibilityChange: makeStateUpdater("columnVisibility", table2)
    };
  },
  createColumn: (column, table2) => {
    column.toggleVisibility = (value) => {
      if (column.getCanHide()) {
        table2.setColumnVisibility((old) => ({
          ...old,
          [column.id]: value != null ? value : !column.getIsVisible()
        }));
      }
    };
    column.getIsVisible = () => {
      var _ref, _table$getState$colum;
      const childColumns = column.columns;
      return (_ref = childColumns.length ? childColumns.some((c) => c.getIsVisible()) : (_table$getState$colum = table2.getState().columnVisibility) == null ? void 0 : _table$getState$colum[column.id]) != null ? _ref : true;
    };
    column.getCanHide = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableHiding) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table2.options.enableHiding) != null ? _table$options$enable : true);
    };
    column.getToggleVisibilityHandler = () => {
      return (e) => {
        column.toggleVisibility == null || column.toggleVisibility(e.target.checked);
      };
    };
  },
  createRow: (row, table2) => {
    row._getAllVisibleCells = memo(() => [row.getAllCells(), table2.getState().columnVisibility], (cells) => {
      return cells.filter((cell) => cell.column.getIsVisible());
    }, getMemoOptions(table2.options, "debugRows", "_getAllVisibleCells"));
    row.getVisibleCells = memo(() => [row.getLeftVisibleCells(), row.getCenterVisibleCells(), row.getRightVisibleCells()], (left, center, right) => [...left, ...center, ...right], getMemoOptions(table2.options, "debugRows", "getVisibleCells"));
  },
  createTable: (table2) => {
    const makeVisibleColumnsMethod = (key, getColumns) => {
      return memo(() => [getColumns(), getColumns().filter((d) => d.getIsVisible()).map((d) => d.id).join("_")], (columns) => {
        return columns.filter((d) => d.getIsVisible == null ? void 0 : d.getIsVisible());
      }, getMemoOptions(table2.options, "debugColumns", key));
    };
    table2.getVisibleFlatColumns = makeVisibleColumnsMethod("getVisibleFlatColumns", () => table2.getAllFlatColumns());
    table2.getVisibleLeafColumns = makeVisibleColumnsMethod("getVisibleLeafColumns", () => table2.getAllLeafColumns());
    table2.getLeftVisibleLeafColumns = makeVisibleColumnsMethod("getLeftVisibleLeafColumns", () => table2.getLeftLeafColumns());
    table2.getRightVisibleLeafColumns = makeVisibleColumnsMethod("getRightVisibleLeafColumns", () => table2.getRightLeafColumns());
    table2.getCenterVisibleLeafColumns = makeVisibleColumnsMethod("getCenterVisibleLeafColumns", () => table2.getCenterLeafColumns());
    table2.setColumnVisibility = (updater) => table2.options.onColumnVisibilityChange == null ? void 0 : table2.options.onColumnVisibilityChange(updater);
    table2.resetColumnVisibility = (defaultState) => {
      var _table$initialState$c;
      table2.setColumnVisibility(defaultState ? {} : (_table$initialState$c = table2.initialState.columnVisibility) != null ? _table$initialState$c : {});
    };
    table2.toggleAllColumnsVisible = (value) => {
      var _value;
      value = (_value = value) != null ? _value : !table2.getIsAllColumnsVisible();
      table2.setColumnVisibility(table2.getAllLeafColumns().reduce((obj, column) => ({
        ...obj,
        [column.id]: !value ? !(column.getCanHide != null && column.getCanHide()) : value
      }), {}));
    };
    table2.getIsAllColumnsVisible = () => !table2.getAllLeafColumns().some((column) => !(column.getIsVisible != null && column.getIsVisible()));
    table2.getIsSomeColumnsVisible = () => table2.getAllLeafColumns().some((column) => column.getIsVisible == null ? void 0 : column.getIsVisible());
    table2.getToggleAllColumnsVisibilityHandler = () => {
      return (e) => {
        var _target;
        table2.toggleAllColumnsVisible((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
function _getVisibleLeafColumns(table2, position) {
  return !position ? table2.getVisibleLeafColumns() : position === "center" ? table2.getCenterVisibleLeafColumns() : position === "left" ? table2.getLeftVisibleLeafColumns() : table2.getRightVisibleLeafColumns();
}
var GlobalFaceting = {
  createTable: (table2) => {
    table2._getGlobalFacetedRowModel = table2.options.getFacetedRowModel && table2.options.getFacetedRowModel(table2, "__global__");
    table2.getGlobalFacetedRowModel = () => {
      if (table2.options.manualFiltering || !table2._getGlobalFacetedRowModel) {
        return table2.getPreFilteredRowModel();
      }
      return table2._getGlobalFacetedRowModel();
    };
    table2._getGlobalFacetedUniqueValues = table2.options.getFacetedUniqueValues && table2.options.getFacetedUniqueValues(table2, "__global__");
    table2.getGlobalFacetedUniqueValues = () => {
      if (!table2._getGlobalFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return table2._getGlobalFacetedUniqueValues();
    };
    table2._getGlobalFacetedMinMaxValues = table2.options.getFacetedMinMaxValues && table2.options.getFacetedMinMaxValues(table2, "__global__");
    table2.getGlobalFacetedMinMaxValues = () => {
      if (!table2._getGlobalFacetedMinMaxValues) {
        return;
      }
      return table2._getGlobalFacetedMinMaxValues();
    };
  }
};
var GlobalFiltering = {
  getInitialState: (state) => {
    return {
      globalFilter: void 0,
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onGlobalFilterChange: makeStateUpdater("globalFilter", table2),
      globalFilterFn: "auto",
      getColumnCanGlobalFilter: (column) => {
        var _table$getCoreRowMode;
        const value = (_table$getCoreRowMode = table2.getCoreRowModel().flatRows[0]) == null || (_table$getCoreRowMode = _table$getCoreRowMode._getAllCellsByColumnId()[column.id]) == null ? void 0 : _table$getCoreRowMode.getValue();
        return typeof value === "string" || typeof value === "number";
      }
    };
  },
  createColumn: (column, table2) => {
    column.getCanGlobalFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2, _table$options$getCol;
      return ((_column$columnDef$ena = column.columnDef.enableGlobalFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table2.options.enableGlobalFilter) != null ? _table$options$enable : true) && ((_table$options$enable2 = table2.options.enableFilters) != null ? _table$options$enable2 : true) && ((_table$options$getCol = table2.options.getColumnCanGlobalFilter == null ? void 0 : table2.options.getColumnCanGlobalFilter(column)) != null ? _table$options$getCol : true) && !!column.accessorFn;
    };
  },
  createTable: (table2) => {
    table2.getGlobalAutoFilterFn = () => {
      return filterFns.includesString;
    };
    table2.getGlobalFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      const {
        globalFilterFn
      } = table2.options;
      return isFunction(globalFilterFn) ? globalFilterFn : globalFilterFn === "auto" ? table2.getGlobalAutoFilterFn() : (_table$options$filter = (_table$options$filter2 = table2.options.filterFns) == null ? void 0 : _table$options$filter2[globalFilterFn]) != null ? _table$options$filter : filterFns[globalFilterFn];
    };
    table2.setGlobalFilter = (updater) => {
      table2.options.onGlobalFilterChange == null || table2.options.onGlobalFilterChange(updater);
    };
    table2.resetGlobalFilter = (defaultState) => {
      table2.setGlobalFilter(defaultState ? void 0 : table2.initialState.globalFilter);
    };
  }
};
var RowExpanding = {
  getInitialState: (state) => {
    return {
      expanded: {},
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onExpandedChange: makeStateUpdater("expanded", table2),
      paginateExpandedRows: true
    };
  },
  createTable: (table2) => {
    let registered = false;
    let queued = false;
    table2._autoResetExpanded = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table2._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table2.options.autoResetAll) != null ? _table$options$autoRe : table2.options.autoResetExpanded) != null ? _ref : !table2.options.manualExpanding) {
        if (queued) return;
        queued = true;
        table2._queue(() => {
          table2.resetExpanded();
          queued = false;
        });
      }
    };
    table2.setExpanded = (updater) => table2.options.onExpandedChange == null ? void 0 : table2.options.onExpandedChange(updater);
    table2.toggleAllRowsExpanded = (expanded) => {
      if (expanded != null ? expanded : !table2.getIsAllRowsExpanded()) {
        table2.setExpanded(true);
      } else {
        table2.setExpanded({});
      }
    };
    table2.resetExpanded = (defaultState) => {
      var _table$initialState$e, _table$initialState;
      table2.setExpanded(defaultState ? {} : (_table$initialState$e = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.expanded) != null ? _table$initialState$e : {});
    };
    table2.getCanSomeRowsExpand = () => {
      return table2.getPrePaginationRowModel().flatRows.some((row) => row.getCanExpand());
    };
    table2.getToggleAllRowsExpandedHandler = () => {
      return (e) => {
        e.persist == null || e.persist();
        table2.toggleAllRowsExpanded();
      };
    };
    table2.getIsSomeRowsExpanded = () => {
      const expanded = table2.getState().expanded;
      return expanded === true || Object.values(expanded).some(Boolean);
    };
    table2.getIsAllRowsExpanded = () => {
      const expanded = table2.getState().expanded;
      if (typeof expanded === "boolean") {
        return expanded === true;
      }
      if (!Object.keys(expanded).length) {
        return false;
      }
      if (table2.getRowModel().flatRows.some((row) => !row.getIsExpanded())) {
        return false;
      }
      return true;
    };
    table2.getExpandedDepth = () => {
      let maxDepth = 0;
      const rowIds = table2.getState().expanded === true ? Object.keys(table2.getRowModel().rowsById) : Object.keys(table2.getState().expanded);
      rowIds.forEach((id) => {
        const splitId = id.split(".");
        maxDepth = Math.max(maxDepth, splitId.length);
      });
      return maxDepth;
    };
    table2.getPreExpandedRowModel = () => table2.getSortedRowModel();
    table2.getExpandedRowModel = () => {
      if (!table2._getExpandedRowModel && table2.options.getExpandedRowModel) {
        table2._getExpandedRowModel = table2.options.getExpandedRowModel(table2);
      }
      if (table2.options.manualExpanding || !table2._getExpandedRowModel) {
        return table2.getPreExpandedRowModel();
      }
      return table2._getExpandedRowModel();
    };
  },
  createRow: (row, table2) => {
    row.toggleExpanded = (expanded) => {
      table2.setExpanded((old) => {
        var _expanded;
        const exists = old === true ? true : !!(old != null && old[row.id]);
        let oldExpanded = {};
        if (old === true) {
          Object.keys(table2.getRowModel().rowsById).forEach((rowId) => {
            oldExpanded[rowId] = true;
          });
        } else {
          oldExpanded = old;
        }
        expanded = (_expanded = expanded) != null ? _expanded : !exists;
        if (!exists && expanded) {
          return {
            ...oldExpanded,
            [row.id]: true
          };
        }
        if (exists && !expanded) {
          const {
            [row.id]: _,
            ...rest
          } = oldExpanded;
          return rest;
        }
        return old;
      });
    };
    row.getIsExpanded = () => {
      var _table$options$getIsR;
      const expanded = table2.getState().expanded;
      return !!((_table$options$getIsR = table2.options.getIsRowExpanded == null ? void 0 : table2.options.getIsRowExpanded(row)) != null ? _table$options$getIsR : expanded === true || (expanded == null ? void 0 : expanded[row.id]));
    };
    row.getCanExpand = () => {
      var _table$options$getRow, _table$options$enable, _row$subRows;
      return (_table$options$getRow = table2.options.getRowCanExpand == null ? void 0 : table2.options.getRowCanExpand(row)) != null ? _table$options$getRow : ((_table$options$enable = table2.options.enableExpanding) != null ? _table$options$enable : true) && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
    row.getIsAllParentsExpanded = () => {
      let isFullyExpanded = true;
      let currentRow = row;
      while (isFullyExpanded && currentRow.parentId) {
        currentRow = table2.getRow(currentRow.parentId, true);
        isFullyExpanded = currentRow.getIsExpanded();
      }
      return isFullyExpanded;
    };
    row.getToggleExpandedHandler = () => {
      const canExpand = row.getCanExpand();
      return () => {
        if (!canExpand) return;
        row.toggleExpanded();
      };
    };
  }
};
var defaultPageIndex = 0;
var defaultPageSize = 10;
var getDefaultPaginationState = () => ({
  pageIndex: defaultPageIndex,
  pageSize: defaultPageSize
});
var RowPagination = {
  getInitialState: (state) => {
    return {
      ...state,
      pagination: {
        ...getDefaultPaginationState(),
        ...state == null ? void 0 : state.pagination
      }
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onPaginationChange: makeStateUpdater("pagination", table2)
    };
  },
  createTable: (table2) => {
    let registered = false;
    let queued = false;
    table2._autoResetPageIndex = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table2._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table2.options.autoResetAll) != null ? _table$options$autoRe : table2.options.autoResetPageIndex) != null ? _ref : !table2.options.manualPagination) {
        if (queued) return;
        queued = true;
        table2._queue(() => {
          table2.resetPageIndex();
          queued = false;
        });
      }
    };
    table2.setPagination = (updater) => {
      const safeUpdater = (old) => {
        let newState = functionalUpdate(updater, old);
        return newState;
      };
      return table2.options.onPaginationChange == null ? void 0 : table2.options.onPaginationChange(safeUpdater);
    };
    table2.resetPagination = (defaultState) => {
      var _table$initialState$p;
      table2.setPagination(defaultState ? getDefaultPaginationState() : (_table$initialState$p = table2.initialState.pagination) != null ? _table$initialState$p : getDefaultPaginationState());
    };
    table2.setPageIndex = (updater) => {
      table2.setPagination((old) => {
        let pageIndex = functionalUpdate(updater, old.pageIndex);
        const maxPageIndex = typeof table2.options.pageCount === "undefined" || table2.options.pageCount === -1 ? Number.MAX_SAFE_INTEGER : table2.options.pageCount - 1;
        pageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
        return {
          ...old,
          pageIndex
        };
      });
    };
    table2.resetPageIndex = (defaultState) => {
      var _table$initialState$p2, _table$initialState;
      table2.setPageIndex(defaultState ? defaultPageIndex : (_table$initialState$p2 = (_table$initialState = table2.initialState) == null || (_table$initialState = _table$initialState.pagination) == null ? void 0 : _table$initialState.pageIndex) != null ? _table$initialState$p2 : defaultPageIndex);
    };
    table2.resetPageSize = (defaultState) => {
      var _table$initialState$p3, _table$initialState2;
      table2.setPageSize(defaultState ? defaultPageSize : (_table$initialState$p3 = (_table$initialState2 = table2.initialState) == null || (_table$initialState2 = _table$initialState2.pagination) == null ? void 0 : _table$initialState2.pageSize) != null ? _table$initialState$p3 : defaultPageSize);
    };
    table2.setPageSize = (updater) => {
      table2.setPagination((old) => {
        const pageSize = Math.max(1, functionalUpdate(updater, old.pageSize));
        const topRowIndex = old.pageSize * old.pageIndex;
        const pageIndex = Math.floor(topRowIndex / pageSize);
        return {
          ...old,
          pageIndex,
          pageSize
        };
      });
    };
    table2.setPageCount = (updater) => table2.setPagination((old) => {
      var _table$options$pageCo;
      let newPageCount = functionalUpdate(updater, (_table$options$pageCo = table2.options.pageCount) != null ? _table$options$pageCo : -1);
      if (typeof newPageCount === "number") {
        newPageCount = Math.max(-1, newPageCount);
      }
      return {
        ...old,
        pageCount: newPageCount
      };
    });
    table2.getPageOptions = memo(() => [table2.getPageCount()], (pageCount) => {
      let pageOptions = [];
      if (pageCount && pageCount > 0) {
        pageOptions = [...new Array(pageCount)].fill(null).map((_, i) => i);
      }
      return pageOptions;
    }, getMemoOptions(table2.options, "debugTable", "getPageOptions"));
    table2.getCanPreviousPage = () => table2.getState().pagination.pageIndex > 0;
    table2.getCanNextPage = () => {
      const {
        pageIndex
      } = table2.getState().pagination;
      const pageCount = table2.getPageCount();
      if (pageCount === -1) {
        return true;
      }
      if (pageCount === 0) {
        return false;
      }
      return pageIndex < pageCount - 1;
    };
    table2.previousPage = () => {
      return table2.setPageIndex((old) => old - 1);
    };
    table2.nextPage = () => {
      return table2.setPageIndex((old) => {
        return old + 1;
      });
    };
    table2.firstPage = () => {
      return table2.setPageIndex(0);
    };
    table2.lastPage = () => {
      return table2.setPageIndex(table2.getPageCount() - 1);
    };
    table2.getPrePaginationRowModel = () => table2.getExpandedRowModel();
    table2.getPaginationRowModel = () => {
      if (!table2._getPaginationRowModel && table2.options.getPaginationRowModel) {
        table2._getPaginationRowModel = table2.options.getPaginationRowModel(table2);
      }
      if (table2.options.manualPagination || !table2._getPaginationRowModel) {
        return table2.getPrePaginationRowModel();
      }
      return table2._getPaginationRowModel();
    };
    table2.getPageCount = () => {
      var _table$options$pageCo2;
      return (_table$options$pageCo2 = table2.options.pageCount) != null ? _table$options$pageCo2 : Math.ceil(table2.getRowCount() / table2.getState().pagination.pageSize);
    };
    table2.getRowCount = () => {
      var _table$options$rowCou;
      return (_table$options$rowCou = table2.options.rowCount) != null ? _table$options$rowCou : table2.getPrePaginationRowModel().rows.length;
    };
  }
};
var getDefaultRowPinningState = () => ({
  top: [],
  bottom: []
});
var RowPinning = {
  getInitialState: (state) => {
    return {
      rowPinning: getDefaultRowPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onRowPinningChange: makeStateUpdater("rowPinning", table2)
    };
  },
  createRow: (row, table2) => {
    row.pin = (position, includeLeafRows, includeParentRows) => {
      const leafRowIds = includeLeafRows ? row.getLeafRows().map((_ref) => {
        let {
          id
        } = _ref;
        return id;
      }) : [];
      const parentRowIds = includeParentRows ? row.getParentRows().map((_ref2) => {
        let {
          id
        } = _ref2;
        return id;
      }) : [];
      const rowIds = /* @__PURE__ */ new Set([...parentRowIds, row.id, ...leafRowIds]);
      table2.setRowPinning((old) => {
        var _old$top3, _old$bottom3;
        if (position === "bottom") {
          var _old$top, _old$bottom;
          return {
            top: ((_old$top = old == null ? void 0 : old.top) != null ? _old$top : []).filter((d) => !(rowIds != null && rowIds.has(d))),
            bottom: [...((_old$bottom = old == null ? void 0 : old.bottom) != null ? _old$bottom : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)]
          };
        }
        if (position === "top") {
          var _old$top2, _old$bottom2;
          return {
            top: [...((_old$top2 = old == null ? void 0 : old.top) != null ? _old$top2 : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)],
            bottom: ((_old$bottom2 = old == null ? void 0 : old.bottom) != null ? _old$bottom2 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
          };
        }
        return {
          top: ((_old$top3 = old == null ? void 0 : old.top) != null ? _old$top3 : []).filter((d) => !(rowIds != null && rowIds.has(d))),
          bottom: ((_old$bottom3 = old == null ? void 0 : old.bottom) != null ? _old$bottom3 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
        };
      });
    };
    row.getCanPin = () => {
      var _ref3;
      const {
        enableRowPinning,
        enablePinning
      } = table2.options;
      if (typeof enableRowPinning === "function") {
        return enableRowPinning(row);
      }
      return (_ref3 = enableRowPinning != null ? enableRowPinning : enablePinning) != null ? _ref3 : true;
    };
    row.getIsPinned = () => {
      const rowIds = [row.id];
      const {
        top,
        bottom
      } = table2.getState().rowPinning;
      const isTop = rowIds.some((d) => top == null ? void 0 : top.includes(d));
      const isBottom = rowIds.some((d) => bottom == null ? void 0 : bottom.includes(d));
      return isTop ? "top" : isBottom ? "bottom" : false;
    };
    row.getPinnedIndex = () => {
      var _ref4, _visiblePinnedRowIds$;
      const position = row.getIsPinned();
      if (!position) return -1;
      const visiblePinnedRowIds = (_ref4 = position === "top" ? table2.getTopRows() : table2.getBottomRows()) == null ? void 0 : _ref4.map((_ref5) => {
        let {
          id
        } = _ref5;
        return id;
      });
      return (_visiblePinnedRowIds$ = visiblePinnedRowIds == null ? void 0 : visiblePinnedRowIds.indexOf(row.id)) != null ? _visiblePinnedRowIds$ : -1;
    };
  },
  createTable: (table2) => {
    table2.setRowPinning = (updater) => table2.options.onRowPinningChange == null ? void 0 : table2.options.onRowPinningChange(updater);
    table2.resetRowPinning = (defaultState) => {
      var _table$initialState$r, _table$initialState;
      return table2.setRowPinning(defaultState ? getDefaultRowPinningState() : (_table$initialState$r = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.rowPinning) != null ? _table$initialState$r : getDefaultRowPinningState());
    };
    table2.getIsSomeRowsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table2.getState().rowPinning;
      if (!position) {
        var _pinningState$top, _pinningState$bottom;
        return Boolean(((_pinningState$top = pinningState.top) == null ? void 0 : _pinningState$top.length) || ((_pinningState$bottom = pinningState.bottom) == null ? void 0 : _pinningState$bottom.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table2._getPinnedRows = (visibleRows, pinnedRowIds, position) => {
      var _table$options$keepPi;
      const rows = ((_table$options$keepPi = table2.options.keepPinnedRows) != null ? _table$options$keepPi : true) ? (
        //get all rows that are pinned even if they would not be otherwise visible
        //account for expanded parent rows, but not pagination or filtering
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => {
          const row = table2.getRow(rowId, true);
          return row.getIsAllParentsExpanded() ? row : null;
        })
      ) : (
        //else get only visible rows that are pinned
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => visibleRows.find((row) => row.id === rowId))
      );
      return rows.filter(Boolean).map((d) => ({
        ...d,
        position
      }));
    };
    table2.getTopRows = memo(() => [table2.getRowModel().rows, table2.getState().rowPinning.top], (allRows, topPinnedRowIds) => table2._getPinnedRows(allRows, topPinnedRowIds, "top"), getMemoOptions(table2.options, "debugRows", "getTopRows"));
    table2.getBottomRows = memo(() => [table2.getRowModel().rows, table2.getState().rowPinning.bottom], (allRows, bottomPinnedRowIds) => table2._getPinnedRows(allRows, bottomPinnedRowIds, "bottom"), getMemoOptions(table2.options, "debugRows", "getBottomRows"));
    table2.getCenterRows = memo(() => [table2.getRowModel().rows, table2.getState().rowPinning.top, table2.getState().rowPinning.bottom], (allRows, top, bottom) => {
      const topAndBottom = /* @__PURE__ */ new Set([...top != null ? top : [], ...bottom != null ? bottom : []]);
      return allRows.filter((d) => !topAndBottom.has(d.id));
    }, getMemoOptions(table2.options, "debugRows", "getCenterRows"));
  }
};
var RowSelection = {
  getInitialState: (state) => {
    return {
      rowSelection: {},
      ...state
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onRowSelectionChange: makeStateUpdater("rowSelection", table2),
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true
      // enableGroupingRowSelection: false,
      // isAdditiveSelectEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveSelectEvent: (e: unknown) => !!e.shiftKey,
    };
  },
  createTable: (table2) => {
    table2.setRowSelection = (updater) => table2.options.onRowSelectionChange == null ? void 0 : table2.options.onRowSelectionChange(updater);
    table2.resetRowSelection = (defaultState) => {
      var _table$initialState$r;
      return table2.setRowSelection(defaultState ? {} : (_table$initialState$r = table2.initialState.rowSelection) != null ? _table$initialState$r : {});
    };
    table2.toggleAllRowsSelected = (value) => {
      table2.setRowSelection((old) => {
        value = typeof value !== "undefined" ? value : !table2.getIsAllRowsSelected();
        const rowSelection = {
          ...old
        };
        const preGroupedFlatRows = table2.getPreGroupedRowModel().flatRows;
        if (value) {
          preGroupedFlatRows.forEach((row) => {
            if (!row.getCanSelect()) {
              return;
            }
            rowSelection[row.id] = true;
          });
        } else {
          preGroupedFlatRows.forEach((row) => {
            delete rowSelection[row.id];
          });
        }
        return rowSelection;
      });
    };
    table2.toggleAllPageRowsSelected = (value) => table2.setRowSelection((old) => {
      const resolvedValue = typeof value !== "undefined" ? value : !table2.getIsAllPageRowsSelected();
      const rowSelection = {
        ...old
      };
      table2.getRowModel().rows.forEach((row) => {
        mutateRowIsSelected(rowSelection, row.id, resolvedValue, true, table2);
      });
      return rowSelection;
    });
    table2.getPreSelectedRowModel = () => table2.getCoreRowModel();
    table2.getSelectedRowModel = memo(() => [table2.getState().rowSelection, table2.getCoreRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table2, rowModel);
    }, getMemoOptions(table2.options, "debugTable", "getSelectedRowModel"));
    table2.getFilteredSelectedRowModel = memo(() => [table2.getState().rowSelection, table2.getFilteredRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table2, rowModel);
    }, getMemoOptions(table2.options, "debugTable", "getFilteredSelectedRowModel"));
    table2.getGroupedSelectedRowModel = memo(() => [table2.getState().rowSelection, table2.getSortedRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table2, rowModel);
    }, getMemoOptions(table2.options, "debugTable", "getGroupedSelectedRowModel"));
    table2.getIsAllRowsSelected = () => {
      const preGroupedFlatRows = table2.getFilteredRowModel().flatRows;
      const {
        rowSelection
      } = table2.getState();
      let isAllRowsSelected = Boolean(preGroupedFlatRows.length && Object.keys(rowSelection).length);
      if (isAllRowsSelected) {
        if (preGroupedFlatRows.some((row) => row.getCanSelect() && !rowSelection[row.id])) {
          isAllRowsSelected = false;
        }
      }
      return isAllRowsSelected;
    };
    table2.getIsAllPageRowsSelected = () => {
      const paginationFlatRows = table2.getPaginationRowModel().flatRows.filter((row) => row.getCanSelect());
      const {
        rowSelection
      } = table2.getState();
      let isAllPageRowsSelected = !!paginationFlatRows.length;
      if (isAllPageRowsSelected && paginationFlatRows.some((row) => !rowSelection[row.id])) {
        isAllPageRowsSelected = false;
      }
      return isAllPageRowsSelected;
    };
    table2.getIsSomeRowsSelected = () => {
      var _table$getState$rowSe;
      const totalSelected = Object.keys((_table$getState$rowSe = table2.getState().rowSelection) != null ? _table$getState$rowSe : {}).length;
      return totalSelected > 0 && totalSelected < table2.getFilteredRowModel().flatRows.length;
    };
    table2.getIsSomePageRowsSelected = () => {
      const paginationFlatRows = table2.getPaginationRowModel().flatRows;
      return table2.getIsAllPageRowsSelected() ? false : paginationFlatRows.filter((row) => row.getCanSelect()).some((d) => d.getIsSelected() || d.getIsSomeSelected());
    };
    table2.getToggleAllRowsSelectedHandler = () => {
      return (e) => {
        table2.toggleAllRowsSelected(e.target.checked);
      };
    };
    table2.getToggleAllPageRowsSelectedHandler = () => {
      return (e) => {
        table2.toggleAllPageRowsSelected(e.target.checked);
      };
    };
  },
  createRow: (row, table2) => {
    row.toggleSelected = (value, opts) => {
      const isSelected = row.getIsSelected();
      table2.setRowSelection((old) => {
        var _opts$selectChildren;
        value = typeof value !== "undefined" ? value : !isSelected;
        if (row.getCanSelect() && isSelected === value) {
          return old;
        }
        const selectedRowIds = {
          ...old
        };
        mutateRowIsSelected(selectedRowIds, row.id, value, (_opts$selectChildren = opts == null ? void 0 : opts.selectChildren) != null ? _opts$selectChildren : true, table2);
        return selectedRowIds;
      });
    };
    row.getIsSelected = () => {
      const {
        rowSelection
      } = table2.getState();
      return isRowSelected(row, rowSelection);
    };
    row.getIsSomeSelected = () => {
      const {
        rowSelection
      } = table2.getState();
      return isSubRowSelected(row, rowSelection) === "some";
    };
    row.getIsAllSubRowsSelected = () => {
      const {
        rowSelection
      } = table2.getState();
      return isSubRowSelected(row, rowSelection) === "all";
    };
    row.getCanSelect = () => {
      var _table$options$enable;
      if (typeof table2.options.enableRowSelection === "function") {
        return table2.options.enableRowSelection(row);
      }
      return (_table$options$enable = table2.options.enableRowSelection) != null ? _table$options$enable : true;
    };
    row.getCanSelectSubRows = () => {
      var _table$options$enable2;
      if (typeof table2.options.enableSubRowSelection === "function") {
        return table2.options.enableSubRowSelection(row);
      }
      return (_table$options$enable2 = table2.options.enableSubRowSelection) != null ? _table$options$enable2 : true;
    };
    row.getCanMultiSelect = () => {
      var _table$options$enable3;
      if (typeof table2.options.enableMultiRowSelection === "function") {
        return table2.options.enableMultiRowSelection(row);
      }
      return (_table$options$enable3 = table2.options.enableMultiRowSelection) != null ? _table$options$enable3 : true;
    };
    row.getToggleSelectedHandler = () => {
      const canSelect = row.getCanSelect();
      return (e) => {
        var _target;
        if (!canSelect) return;
        row.toggleSelected((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
var mutateRowIsSelected = (selectedRowIds, id, value, includeChildren, table2) => {
  var _row$subRows;
  const row = table2.getRow(id, true);
  if (value) {
    if (!row.getCanMultiSelect()) {
      Object.keys(selectedRowIds).forEach((key) => delete selectedRowIds[key]);
    }
    if (row.getCanSelect()) {
      selectedRowIds[id] = true;
    }
  } else {
    delete selectedRowIds[id];
  }
  if (includeChildren && (_row$subRows = row.subRows) != null && _row$subRows.length && row.getCanSelectSubRows()) {
    row.subRows.forEach((row2) => mutateRowIsSelected(selectedRowIds, row2.id, value, includeChildren, table2));
  }
};
function selectRowsFn(table2, rowModel) {
  const rowSelection = table2.getState().rowSelection;
  const newSelectedFlatRows = [];
  const newSelectedRowsById = {};
  const recurseRows = function(rows, depth) {
    return rows.map((row) => {
      var _row$subRows2;
      const isSelected = isRowSelected(row, rowSelection);
      if (isSelected) {
        newSelectedFlatRows.push(row);
        newSelectedRowsById[row.id] = row;
      }
      if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length) {
        row = {
          ...row,
          subRows: recurseRows(row.subRows)
        };
      }
      if (isSelected) {
        return row;
      }
    }).filter(Boolean);
  };
  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newSelectedFlatRows,
    rowsById: newSelectedRowsById
  };
}
function isRowSelected(row, selection) {
  var _selection$row$id;
  return (_selection$row$id = selection[row.id]) != null ? _selection$row$id : false;
}
function isSubRowSelected(row, selection, table2) {
  var _row$subRows3;
  if (!((_row$subRows3 = row.subRows) != null && _row$subRows3.length)) return false;
  let allChildrenSelected = true;
  let someSelected = false;
  row.subRows.forEach((subRow) => {
    if (someSelected && !allChildrenSelected) {
      return;
    }
    if (subRow.getCanSelect()) {
      if (isRowSelected(subRow, selection)) {
        someSelected = true;
      } else {
        allChildrenSelected = false;
      }
    }
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenSelected = isSubRowSelected(subRow, selection);
      if (subRowChildrenSelected === "all") {
        someSelected = true;
      } else if (subRowChildrenSelected === "some") {
        someSelected = true;
        allChildrenSelected = false;
      } else {
        allChildrenSelected = false;
      }
    }
  });
  return allChildrenSelected ? "all" : someSelected ? "some" : false;
}
var reSplitAlphaNumeric = /([0-9]+)/gm;
var alphanumeric = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var alphanumericCaseSensitive = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var text = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var textCaseSensitive = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var datetime = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);
  return a > b ? 1 : a < b ? -1 : 0;
};
var basic = (rowA, rowB, columnId) => {
  return compareBasic(rowA.getValue(columnId), rowB.getValue(columnId));
};
function compareBasic(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function toString(a) {
  if (typeof a === "number") {
    if (isNaN(a) || a === Infinity || a === -Infinity) {
      return "";
    }
    return String(a);
  }
  if (typeof a === "string") {
    return a;
  }
  return "";
}
function compareAlphanumeric(aStr, bStr) {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a.length && b.length) {
    const aa = a.shift();
    const bb = b.shift();
    const an = parseInt(aa, 10);
    const bn = parseInt(bb, 10);
    const combo = [an, bn].sort();
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (isNaN(combo[1])) {
      return isNaN(an) ? -1 : 1;
    }
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b.length;
}
var sortingFns = {
  alphanumeric,
  alphanumericCaseSensitive,
  text,
  textCaseSensitive,
  datetime,
  basic
};
var RowSorting = {
  getInitialState: (state) => {
    return {
      sorting: [],
      ...state
    };
  },
  getDefaultColumnDef: () => {
    return {
      sortingFn: "auto",
      sortUndefined: 1
    };
  },
  getDefaultOptions: (table2) => {
    return {
      onSortingChange: makeStateUpdater("sorting", table2),
      isMultiSortEvent: (e) => {
        return e.shiftKey;
      }
    };
  },
  createColumn: (column, table2) => {
    column.getAutoSortingFn = () => {
      const firstRows = table2.getFilteredRowModel().flatRows.slice(10);
      let isString = false;
      for (const row of firstRows) {
        const value = row == null ? void 0 : row.getValue(column.id);
        if (Object.prototype.toString.call(value) === "[object Date]") {
          return sortingFns.datetime;
        }
        if (typeof value === "string") {
          isString = true;
          if (value.split(reSplitAlphaNumeric).length > 1) {
            return sortingFns.alphanumeric;
          }
        }
      }
      if (isString) {
        return sortingFns.text;
      }
      return sortingFns.basic;
    };
    column.getAutoSortDir = () => {
      const firstRow = table2.getFilteredRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return "asc";
      }
      return "desc";
    };
    column.getSortingFn = () => {
      var _table$options$sortin, _table$options$sortin2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.sortingFn) ? column.columnDef.sortingFn : column.columnDef.sortingFn === "auto" ? column.getAutoSortingFn() : (_table$options$sortin = (_table$options$sortin2 = table2.options.sortingFns) == null ? void 0 : _table$options$sortin2[column.columnDef.sortingFn]) != null ? _table$options$sortin : sortingFns[column.columnDef.sortingFn];
    };
    column.toggleSorting = (desc, multi) => {
      const nextSortingOrder = column.getNextSortingOrder();
      const hasManualValue = typeof desc !== "undefined" && desc !== null;
      table2.setSorting((old) => {
        const existingSorting = old == null ? void 0 : old.find((d) => d.id === column.id);
        const existingIndex = old == null ? void 0 : old.findIndex((d) => d.id === column.id);
        let newSorting = [];
        let sortAction;
        let nextDesc = hasManualValue ? desc : nextSortingOrder === "desc";
        if (old != null && old.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "add";
          }
        } else {
          if (old != null && old.length && existingIndex !== old.length - 1) {
            sortAction = "replace";
          } else if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "replace";
          }
        }
        if (sortAction === "toggle") {
          if (!hasManualValue) {
            if (!nextSortingOrder) {
              sortAction = "remove";
            }
          }
        }
        if (sortAction === "add") {
          var _table$options$maxMul;
          newSorting = [...old, {
            id: column.id,
            desc: nextDesc
          }];
          newSorting.splice(0, newSorting.length - ((_table$options$maxMul = table2.options.maxMultiSortColCount) != null ? _table$options$maxMul : Number.MAX_SAFE_INTEGER));
        } else if (sortAction === "toggle") {
          newSorting = old.map((d) => {
            if (d.id === column.id) {
              return {
                ...d,
                desc: nextDesc
              };
            }
            return d;
          });
        } else if (sortAction === "remove") {
          newSorting = old.filter((d) => d.id !== column.id);
        } else {
          newSorting = [{
            id: column.id,
            desc: nextDesc
          }];
        }
        return newSorting;
      });
    };
    column.getFirstSortDir = () => {
      var _ref, _column$columnDef$sor;
      const sortDescFirst = (_ref = (_column$columnDef$sor = column.columnDef.sortDescFirst) != null ? _column$columnDef$sor : table2.options.sortDescFirst) != null ? _ref : column.getAutoSortDir() === "desc";
      return sortDescFirst ? "desc" : "asc";
    };
    column.getNextSortingOrder = (multi) => {
      var _table$options$enable, _table$options$enable2;
      const firstSortDirection = column.getFirstSortDir();
      const isSorted = column.getIsSorted();
      if (!isSorted) {
        return firstSortDirection;
      }
      if (isSorted !== firstSortDirection && ((_table$options$enable = table2.options.enableSortingRemoval) != null ? _table$options$enable : true) && // If enableSortRemove, enable in general
      (multi ? (_table$options$enable2 = table2.options.enableMultiRemove) != null ? _table$options$enable2 : true : true)) {
        return false;
      }
      return isSorted === "desc" ? "asc" : "desc";
    };
    column.getCanSort = () => {
      var _column$columnDef$ena, _table$options$enable3;
      return ((_column$columnDef$ena = column.columnDef.enableSorting) != null ? _column$columnDef$ena : true) && ((_table$options$enable3 = table2.options.enableSorting) != null ? _table$options$enable3 : true) && !!column.accessorFn;
    };
    column.getCanMultiSort = () => {
      var _ref2, _column$columnDef$ena2;
      return (_ref2 = (_column$columnDef$ena2 = column.columnDef.enableMultiSort) != null ? _column$columnDef$ena2 : table2.options.enableMultiSort) != null ? _ref2 : !!column.accessorFn;
    };
    column.getIsSorted = () => {
      var _table$getState$sorti;
      const columnSort = (_table$getState$sorti = table2.getState().sorting) == null ? void 0 : _table$getState$sorti.find((d) => d.id === column.id);
      return !columnSort ? false : columnSort.desc ? "desc" : "asc";
    };
    column.getSortIndex = () => {
      var _table$getState$sorti2, _table$getState$sorti3;
      return (_table$getState$sorti2 = (_table$getState$sorti3 = table2.getState().sorting) == null ? void 0 : _table$getState$sorti3.findIndex((d) => d.id === column.id)) != null ? _table$getState$sorti2 : -1;
    };
    column.clearSorting = () => {
      table2.setSorting((old) => old != null && old.length ? old.filter((d) => d.id !== column.id) : []);
    };
    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort();
      return (e) => {
        if (!canSort) return;
        e.persist == null || e.persist();
        column.toggleSorting == null || column.toggleSorting(void 0, column.getCanMultiSort() ? table2.options.isMultiSortEvent == null ? void 0 : table2.options.isMultiSortEvent(e) : false);
      };
    };
  },
  createTable: (table2) => {
    table2.setSorting = (updater) => table2.options.onSortingChange == null ? void 0 : table2.options.onSortingChange(updater);
    table2.resetSorting = (defaultState) => {
      var _table$initialState$s, _table$initialState;
      table2.setSorting(defaultState ? [] : (_table$initialState$s = (_table$initialState = table2.initialState) == null ? void 0 : _table$initialState.sorting) != null ? _table$initialState$s : []);
    };
    table2.getPreSortedRowModel = () => table2.getGroupedRowModel();
    table2.getSortedRowModel = () => {
      if (!table2._getSortedRowModel && table2.options.getSortedRowModel) {
        table2._getSortedRowModel = table2.options.getSortedRowModel(table2);
      }
      if (table2.options.manualSorting || !table2._getSortedRowModel) {
        return table2.getPreSortedRowModel();
      }
      return table2._getSortedRowModel();
    };
  }
};
var builtInFeatures = [
  Headers,
  ColumnVisibility,
  ColumnOrdering,
  ColumnPinning,
  ColumnFaceting,
  ColumnFiltering,
  GlobalFaceting,
  //depends on ColumnFaceting
  GlobalFiltering,
  //depends on ColumnFiltering
  RowSorting,
  ColumnGrouping,
  //depends on RowSorting
  RowExpanding,
  RowPagination,
  RowPinning,
  RowSelection,
  ColumnSizing
];
function createTable(options) {
  var _options$_features, _options$initialState;
  if (options.debugAll || options.debugTable) {
    console.info("Creating Table Instance...");
  }
  const _features = [...builtInFeatures, ...(_options$_features = options._features) != null ? _options$_features : []];
  let table2 = {
    _features
  };
  const defaultOptions = table2._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions == null ? void 0 : feature.getDefaultOptions(table2));
  }, {});
  const mergeOptions = (options2) => {
    if (table2.options.mergeOptions) {
      return table2.options.mergeOptions(defaultOptions, options2);
    }
    return {
      ...defaultOptions,
      ...options2
    };
  };
  const coreInitialState = {};
  let initialState = {
    ...coreInitialState,
    ...(_options$initialState = options.initialState) != null ? _options$initialState : {}
  };
  table2._features.forEach((feature) => {
    var _feature$getInitialSt;
    initialState = (_feature$getInitialSt = feature.getInitialState == null ? void 0 : feature.getInitialState(initialState)) != null ? _feature$getInitialSt : initialState;
  });
  const queued = [];
  let queuedTimeout = false;
  const coreInstance = {
    _features,
    options: {
      ...defaultOptions,
      ...options
    },
    initialState,
    _queue: (cb) => {
      queued.push(cb);
      if (!queuedTimeout) {
        queuedTimeout = true;
        Promise.resolve().then(() => {
          while (queued.length) {
            queued.shift()();
          }
          queuedTimeout = false;
        }).catch((error) => setTimeout(() => {
          throw error;
        }));
      }
    },
    reset: () => {
      table2.setState(table2.initialState);
    },
    setOptions: (updater) => {
      const newOptions = functionalUpdate(updater, table2.options);
      table2.options = mergeOptions(newOptions);
    },
    getState: () => {
      return table2.options.state;
    },
    setState: (updater) => {
      table2.options.onStateChange == null || table2.options.onStateChange(updater);
    },
    _getRowId: (row, index, parent) => {
      var _table$options$getRow;
      return (_table$options$getRow = table2.options.getRowId == null ? void 0 : table2.options.getRowId(row, index, parent)) != null ? _table$options$getRow : `${parent ? [parent.id, index].join(".") : index}`;
    },
    getCoreRowModel: () => {
      if (!table2._getCoreRowModel) {
        table2._getCoreRowModel = table2.options.getCoreRowModel(table2);
      }
      return table2._getCoreRowModel();
    },
    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up
    getRowModel: () => {
      return table2.getPaginationRowModel();
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id, searchAll) => {
      let row = (searchAll ? table2.getPrePaginationRowModel() : table2.getRowModel()).rowsById[id];
      if (!row) {
        row = table2.getCoreRowModel().rowsById[id];
        if (!row) {
          if (true) {
            throw new Error(`getRow could not find row with ID: ${id}`);
          }
          throw new Error();
        }
      }
      return row;
    },
    _getDefaultColumnDef: memo(() => [table2.options.defaultColumn], (defaultColumn) => {
      var _defaultColumn;
      defaultColumn = (_defaultColumn = defaultColumn) != null ? _defaultColumn : {};
      return {
        header: (props) => {
          const resolvedColumnDef = props.header.column.columnDef;
          if (resolvedColumnDef.accessorKey) {
            return resolvedColumnDef.accessorKey;
          }
          if (resolvedColumnDef.accessorFn) {
            return resolvedColumnDef.id;
          }
          return null;
        },
        // footer: props => props.header.column.id,
        cell: (props) => {
          var _props$renderValue$to, _props$renderValue;
          return (_props$renderValue$to = (_props$renderValue = props.renderValue()) == null || _props$renderValue.toString == null ? void 0 : _props$renderValue.toString()) != null ? _props$renderValue$to : null;
        },
        ...table2._features.reduce((obj, feature) => {
          return Object.assign(obj, feature.getDefaultColumnDef == null ? void 0 : feature.getDefaultColumnDef());
        }, {}),
        ...defaultColumn
      };
    }, getMemoOptions(options, "debugColumns", "_getDefaultColumnDef")),
    _getColumnDefs: () => table2.options.columns,
    getAllColumns: memo(() => [table2._getColumnDefs()], (columnDefs) => {
      const recurseColumns = function(columnDefs2, parent, depth) {
        if (depth === void 0) {
          depth = 0;
        }
        return columnDefs2.map((columnDef) => {
          const column = createColumn(table2, columnDef, depth, parent);
          const groupingColumnDef = columnDef;
          column.columns = groupingColumnDef.columns ? recurseColumns(groupingColumnDef.columns, column, depth + 1) : [];
          return column;
        });
      };
      return recurseColumns(columnDefs);
    }, getMemoOptions(options, "debugColumns", "getAllColumns")),
    getAllFlatColumns: memo(() => [table2.getAllColumns()], (allColumns) => {
      return allColumns.flatMap((column) => {
        return column.getFlatColumns();
      });
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumns")),
    _getAllFlatColumnsById: memo(() => [table2.getAllFlatColumns()], (flatColumns) => {
      return flatColumns.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {});
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumnsById")),
    getAllLeafColumns: memo(() => [table2.getAllColumns(), table2._getOrderColumnsFn()], (allColumns, orderColumns2) => {
      let leafColumns = allColumns.flatMap((column) => column.getLeafColumns());
      return orderColumns2(leafColumns);
    }, getMemoOptions(options, "debugColumns", "getAllLeafColumns")),
    getColumn: (columnId) => {
      const column = table2._getAllFlatColumnsById()[columnId];
      if (!column) {
        console.error(`[Table] Column with id '${columnId}' does not exist.`);
      }
      return column;
    }
  };
  Object.assign(table2, coreInstance);
  for (let index = 0; index < table2._features.length; index++) {
    const feature = table2._features[index];
    feature == null || feature.createTable == null || feature.createTable(table2);
  }
  return table2;
}
function getCoreRowModel() {
  return (table2) => memo(() => [table2.options.data], (data) => {
    const rowModel = {
      rows: [],
      flatRows: [],
      rowsById: {}
    };
    const accessRows = function(originalRows, depth, parentRow) {
      if (depth === void 0) {
        depth = 0;
      }
      const rows = [];
      for (let i = 0; i < originalRows.length; i++) {
        const row = createRow(table2, table2._getRowId(originalRows[i], i, parentRow), originalRows[i], i, depth, void 0, parentRow == null ? void 0 : parentRow.id);
        rowModel.flatRows.push(row);
        rowModel.rowsById[row.id] = row;
        rows.push(row);
        if (table2.options.getSubRows) {
          var _row$originalSubRows;
          row.originalSubRows = table2.options.getSubRows(originalRows[i], i);
          if ((_row$originalSubRows = row.originalSubRows) != null && _row$originalSubRows.length) {
            row.subRows = accessRows(row.originalSubRows, depth + 1, row);
          }
        }
      }
      return rows;
    };
    rowModel.rows = accessRows(data);
    return rowModel;
  }, getMemoOptions(table2.options, "debugTable", "getRowModel", () => table2._autoResetPageIndex()));
}
function expandRows(rowModel) {
  const expandedRows = [];
  const handleRow = (row) => {
    var _row$subRows;
    expandedRows.push(row);
    if ((_row$subRows = row.subRows) != null && _row$subRows.length && row.getIsExpanded()) {
      row.subRows.forEach(handleRow);
    }
  };
  rowModel.rows.forEach(handleRow);
  return {
    rows: expandedRows,
    flatRows: rowModel.flatRows,
    rowsById: rowModel.rowsById
  };
}
function filterRows(rows, filterRowImpl, table2) {
  if (table2.options.filterFromLeafRows) {
    return filterRowModelFromLeafs(rows, filterRowImpl, table2);
  }
  return filterRowModelFromRoot(rows, filterRowImpl, table2);
}
function filterRowModelFromLeafs(rowsToFilter, filterRow, table2) {
  var _table$options$maxLea;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea = table2.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      var _row$subRows;
      let row = rowsToFilter2[i];
      const newRow = createRow(table2, row.id, row.original, row.index, row.depth, void 0, row.parentId);
      newRow.columnFilters = row.columnFilters;
      if ((_row$subRows = row.subRows) != null && _row$subRows.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
        row = newRow;
        if (filterRow(row) && !newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
        if (filterRow(row) || newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
      } else {
        row = newRow;
        if (filterRow(row)) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
        }
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function filterRowModelFromRoot(rowsToFilter, filterRow, table2) {
  var _table$options$maxLea2;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea2 = table2.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea2 : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      let row = rowsToFilter2[i];
      const pass = filterRow(row);
      if (pass) {
        var _row$subRows2;
        if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length && depth < maxDepth) {
          const newRow = createRow(table2, row.id, row.original, row.index, row.depth, void 0, row.parentId);
          newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
          row = newRow;
        }
        rows.push(row);
        newFilteredFlatRows.push(row);
        newFilteredRowsById[row.id] = row;
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function getFilteredRowModel() {
  return (table2) => memo(() => [table2.getPreFilteredRowModel(), table2.getState().columnFilters, table2.getState().globalFilter], (rowModel, columnFilters, globalFilter) => {
    if (!rowModel.rows.length || !(columnFilters != null && columnFilters.length) && !globalFilter) {
      for (let i = 0; i < rowModel.flatRows.length; i++) {
        rowModel.flatRows[i].columnFilters = {};
        rowModel.flatRows[i].columnFiltersMeta = {};
      }
      return rowModel;
    }
    const resolvedColumnFilters = [];
    const resolvedGlobalFilters = [];
    (columnFilters != null ? columnFilters : []).forEach((d) => {
      var _filterFn$resolveFilt;
      const column = table2.getColumn(d.id);
      if (!column) {
        return;
      }
      const filterFn = column.getFilterFn();
      if (!filterFn) {
        if (true) {
          console.warn(`Could not find a valid 'column.filterFn' for column with the ID: ${column.id}.`);
        }
        return;
      }
      resolvedColumnFilters.push({
        id: d.id,
        filterFn,
        resolvedValue: (_filterFn$resolveFilt = filterFn.resolveFilterValue == null ? void 0 : filterFn.resolveFilterValue(d.value)) != null ? _filterFn$resolveFilt : d.value
      });
    });
    const filterableIds = (columnFilters != null ? columnFilters : []).map((d) => d.id);
    const globalFilterFn = table2.getGlobalFilterFn();
    const globallyFilterableColumns = table2.getAllLeafColumns().filter((column) => column.getCanGlobalFilter());
    if (globalFilter && globalFilterFn && globallyFilterableColumns.length) {
      filterableIds.push("__global__");
      globallyFilterableColumns.forEach((column) => {
        var _globalFilterFn$resol;
        resolvedGlobalFilters.push({
          id: column.id,
          filterFn: globalFilterFn,
          resolvedValue: (_globalFilterFn$resol = globalFilterFn.resolveFilterValue == null ? void 0 : globalFilterFn.resolveFilterValue(globalFilter)) != null ? _globalFilterFn$resol : globalFilter
        });
      });
    }
    let currentColumnFilter;
    let currentGlobalFilter;
    for (let j = 0; j < rowModel.flatRows.length; j++) {
      const row = rowModel.flatRows[j];
      row.columnFilters = {};
      if (resolvedColumnFilters.length) {
        for (let i = 0; i < resolvedColumnFilters.length; i++) {
          currentColumnFilter = resolvedColumnFilters[i];
          const id = currentColumnFilter.id;
          row.columnFilters[id] = currentColumnFilter.filterFn(row, id, currentColumnFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          });
        }
      }
      if (resolvedGlobalFilters.length) {
        for (let i = 0; i < resolvedGlobalFilters.length; i++) {
          currentGlobalFilter = resolvedGlobalFilters[i];
          const id = currentGlobalFilter.id;
          if (currentGlobalFilter.filterFn(row, id, currentGlobalFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          })) {
            row.columnFilters.__global__ = true;
            break;
          }
        }
        if (row.columnFilters.__global__ !== true) {
          row.columnFilters.__global__ = false;
        }
      }
    }
    const filterRowsImpl = (row) => {
      for (let i = 0; i < filterableIds.length; i++) {
        if (row.columnFilters[filterableIds[i]] === false) {
          return false;
        }
      }
      return true;
    };
    return filterRows(rowModel.rows, filterRowsImpl, table2);
  }, getMemoOptions(table2.options, "debugTable", "getFilteredRowModel", () => table2._autoResetPageIndex()));
}
function getPaginationRowModel(opts) {
  return (table2) => memo(() => [table2.getState().pagination, table2.getPrePaginationRowModel(), table2.options.paginateExpandedRows ? void 0 : table2.getState().expanded], (pagination, rowModel) => {
    if (!rowModel.rows.length) {
      return rowModel;
    }
    const {
      pageSize,
      pageIndex
    } = pagination;
    let {
      rows,
      flatRows,
      rowsById
    } = rowModel;
    const pageStart = pageSize * pageIndex;
    const pageEnd = pageStart + pageSize;
    rows = rows.slice(pageStart, pageEnd);
    let paginatedRowModel;
    if (!table2.options.paginateExpandedRows) {
      paginatedRowModel = expandRows({
        rows,
        flatRows,
        rowsById
      });
    } else {
      paginatedRowModel = {
        rows,
        flatRows,
        rowsById
      };
    }
    paginatedRowModel.flatRows = [];
    const handleRow = (row) => {
      paginatedRowModel.flatRows.push(row);
      if (row.subRows.length) {
        row.subRows.forEach(handleRow);
      }
    };
    paginatedRowModel.rows.forEach(handleRow);
    return paginatedRowModel;
  }, getMemoOptions(table2.options, "debugTable", "getPaginationRowModel"));
}
function getSortedRowModel() {
  return (table2) => memo(() => [table2.getState().sorting, table2.getPreSortedRowModel()], (sorting, rowModel) => {
    if (!rowModel.rows.length || !(sorting != null && sorting.length)) {
      return rowModel;
    }
    const sortingState = table2.getState().sorting;
    const sortedFlatRows = [];
    const availableSorting = sortingState.filter((sort) => {
      var _table$getColumn;
      return (_table$getColumn = table2.getColumn(sort.id)) == null ? void 0 : _table$getColumn.getCanSort();
    });
    const columnInfoById = {};
    availableSorting.forEach((sortEntry) => {
      const column = table2.getColumn(sortEntry.id);
      if (!column) return;
      columnInfoById[sortEntry.id] = {
        sortUndefined: column.columnDef.sortUndefined,
        invertSorting: column.columnDef.invertSorting,
        sortingFn: column.getSortingFn()
      };
    });
    const sortData = (rows) => {
      const sortedData = rows.map((row) => ({
        ...row
      }));
      sortedData.sort((rowA, rowB) => {
        for (let i = 0; i < availableSorting.length; i += 1) {
          var _sortEntry$desc;
          const sortEntry = availableSorting[i];
          const columnInfo = columnInfoById[sortEntry.id];
          const sortUndefined = columnInfo.sortUndefined;
          const isDesc = (_sortEntry$desc = sortEntry == null ? void 0 : sortEntry.desc) != null ? _sortEntry$desc : false;
          let sortInt = 0;
          if (sortUndefined) {
            const aValue = rowA.getValue(sortEntry.id);
            const bValue = rowB.getValue(sortEntry.id);
            const aUndefined = aValue === void 0;
            const bUndefined = bValue === void 0;
            if (aUndefined || bUndefined) {
              if (sortUndefined === "first") return aUndefined ? -1 : 1;
              if (sortUndefined === "last") return aUndefined ? 1 : -1;
              sortInt = aUndefined && bUndefined ? 0 : aUndefined ? sortUndefined : -sortUndefined;
            }
          }
          if (sortInt === 0) {
            sortInt = columnInfo.sortingFn(rowA, rowB, sortEntry.id);
          }
          if (sortInt !== 0) {
            if (isDesc) {
              sortInt *= -1;
            }
            if (columnInfo.invertSorting) {
              sortInt *= -1;
            }
            return sortInt;
          }
        }
        return rowA.index - rowB.index;
      });
      sortedData.forEach((row) => {
        var _row$subRows;
        sortedFlatRows.push(row);
        if ((_row$subRows = row.subRows) != null && _row$subRows.length) {
          row.subRows = sortData(row.subRows);
        }
      });
      return sortedData;
    };
    return {
      rows: sortData(rowModel.rows),
      flatRows: sortedFlatRows,
      rowsById: rowModel.rowsById
    };
  }, getMemoOptions(table2.options, "debugTable", "getSortedRowModel", () => table2._autoResetPageIndex()));
}
function coerce(type, draft) {
  switch (type) {
    case "number": {
      const text2 = draft.trim();
      if (text2 === "") return { ok: true, value: null };
      const n = Number(text2);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
    }
    case "boolean":
      return { ok: true, value: draft === "true" || draft === "1" };
    default:
      return { ok: true, value: draft };
  }
}
function createTableCore(config) {
  const paginated = config.enablePagination ?? true;
  const pageSize = config.initialState?.pageSize ?? (paginated ? 10 : Number.POSITIVE_INFINITY);
  const getRowId = (row, index) => {
    if (config.getRowId) return config.getRowId(row, index);
    const id = row.id;
    return String(id ?? index);
  };
  const columnViews = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    editable: col.editable ?? col.accessorFn === void 0,
    type: col.type ?? "text",
    ...col.width !== void 0 ? { width: col.width } : {},
    ...col.align !== void 0 ? { align: col.align } : {}
  }));
  let rows = [...config.data];
  const tsState = {};
  const tsColumns = config.columns.map((col) => ({
    id: col.id,
    header: col.header ?? col.id,
    ...col.accessorKey !== void 0 ? { accessorKey: col.accessorKey } : {},
    ...col.accessorFn !== void 0 ? { accessorFn: col.accessorFn } : {}
  }));
  const table2 = createTable({
    data: rows,
    columns: tsColumns,
    state: tsState,
    onStateChange: (updater) => {
      Object.assign(
        tsState,
        typeof updater === "function" ? updater(tsState) : updater
      );
    },
    getRowId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}
  });
  Object.assign(tsState, table2.initialState, {
    sorting: [...config.initialState?.sorting ?? []],
    globalFilter: config.initialState?.globalFilter ?? "",
    pagination: {
      pageIndex: config.initialState?.pageIndex ?? 0,
      pageSize
    },
    rowSelection: {}
  });
  const undoHistory = config.undoHistory ?? null;
  let editing = null;
  let editDraft = null;
  const subscribers = /* @__PURE__ */ new Set();
  const notify = () => subscribers.forEach((fn) => fn());
  function valueOf(row, columnId) {
    const col = config.columns.find((c) => c.id === columnId);
    if (!col) return void 0;
    if (col.accessorKey !== void 0) {
      return row[col.accessorKey];
    }
    return col.accessorFn ? col.accessorFn(row) : void 0;
  }
  function indexOfRow(rowId) {
    return rows.findIndex((row, i) => getRowId(row, i) === rowId);
  }
  function syncData() {
    table2.setOptions((prev) => ({ ...prev, data: rows }));
    clampPage();
    refresh();
  }
  function clampPage() {
    if (!paginated) return;
    const pi = table2.getState().pagination.pageIndex;
    const last = Math.max(0, table2.getPageCount() - 1);
    if (pi > last) {
      table2.setPagination({ ...table2.getState().pagination, pageIndex: last });
    }
  }
  function cancelEditing() {
    if (editing === null) return false;
    editing = null;
    editDraft = null;
    return true;
  }
  function applyCellValue(rowId, columnId, value) {
    const index = indexOfRow(rowId);
    if (index === -1) return;
    const col = config.columns.find((c) => c.id === columnId);
    if (!col || col.accessorKey === void 0) return;
    const row = rows[index];
    rows = rows.map(
      (r, i) => i === index ? { ...row, [col.accessorKey]: value } : r
    );
    syncData();
  }
  function makeEditCommand(rowId, columnId, to, from, label) {
    const command = {
      label,
      execute: () => applyCellValue(rowId, columnId, to),
      invert: () => ({
        label,
        execute: () => applyCellValue(rowId, columnId, from),
        invert: () => command
      })
    };
    return command;
  }
  function deriveState() {
    const rowModel = table2.getRowModel();
    const pageRows = rowModel.rows;
    const filteredCount = table2.getFilteredRowModel().rows.length;
    const selection = tsState.rowSelection;
    const selectedIds = Object.keys(selection).filter((id) => selection[id]);
    return {
      columns: columnViews,
      rows: pageRows.map(
        (r) => ({
          id: r.id,
          cells: Object.fromEntries(
            r.getVisibleCells().map((c) => [c.column.id, c.getValue()])
          ),
          selected: r.getIsSelected()
        })
      ),
      totalRows: filteredCount,
      pageCount: paginated ? table2.getPageCount() : 1,
      pageIndex: paginated ? tsState.pagination.pageIndex : 0,
      pageSize: paginated ? tsState.pagination.pageSize : filteredCount,
      paginated,
      sorting: tsState.sorting.map((s) => ({ ...s })),
      globalFilter: tsState.globalFilter,
      selectedRows: selectedIds,
      allSelected: pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()),
      someSelected: pageRows.some((r) => r.getIsSelected()),
      editing,
      editDraft,
      canUndo: undoHistory?.state.canUndo ?? false,
      canRedo: undoHistory?.state.canRedo ?? false
    };
  }
  let state = deriveState();
  function refresh() {
    clampPage();
    state = deriveState();
    notify();
  }
  if (undoHistory) {
    undoHistory.subscribe(() => {
      clampPage();
      state = deriveState();
      notify();
    });
  }
  const actions = {
    sort: (columnId, dir) => {
      const cancelled = cancelEditing();
      const current = tsState.sorting[0];
      const next = (() => {
        if (dir !== void 0) {
          if (dir === "none") {
            return current?.id === columnId ? [] : tsState.sorting;
          }
          return [{ id: columnId, desc: dir === "desc" }];
        }
        if (!current || current.id !== columnId) {
          return [{ id: columnId, desc: false }];
        }
        if (current.desc) return [];
        return [{ id: columnId, desc: true }];
      })();
      if (JSON.stringify(next) === JSON.stringify(tsState.sorting)) {
        if (cancelled) refresh();
        return;
      }
      table2.setSorting(next);
      table2.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    clearSorting: () => {
      const cancelled = cancelEditing();
      if (tsState.sorting.length === 0) {
        if (cancelled) refresh();
        return;
      }
      table2.setSorting([]);
      table2.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    setGlobalFilter: (text2) => {
      const cancelled = cancelEditing();
      if (text2 === tsState.globalFilter) {
        if (cancelled) refresh();
        return;
      }
      table2.setGlobalFilter(text2);
      table2.setPagination({ ...tsState.pagination, pageIndex: 0 });
      refresh();
    },
    setPageSize: (size) => {
      if (size <= 0 || !paginated) return;
      const cancelled = cancelEditing();
      if (size === tsState.pagination.pageSize) {
        if (cancelled) refresh();
        return;
      }
      table2.setPageSize(size);
      clampPage();
      refresh();
    },
    nextPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table2.getPageCount() - 1);
      if (tsState.pagination.pageIndex >= last) {
        if (cancelled) refresh();
        return;
      }
      table2.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex + 1 });
      refresh();
    },
    previousPage: () => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      if (tsState.pagination.pageIndex <= 0) {
        if (cancelled) refresh();
        return;
      }
      table2.setPagination({ ...tsState.pagination, pageIndex: tsState.pagination.pageIndex - 1 });
      refresh();
    },
    setPageIndex: (index) => {
      if (!paginated) return;
      const cancelled = cancelEditing();
      const last = Math.max(0, table2.getPageCount() - 1);
      const clamped = Math.max(0, Math.min(index, last));
      if (clamped === tsState.pagination.pageIndex) {
        if (cancelled) refresh();
        return;
      }
      table2.setPagination({ ...tsState.pagination, pageIndex: clamped });
      refresh();
    },
    toggleRowSelected: (rowId, force) => {
      const row = table2.getCoreRowModel().rows.find((r) => r.id === rowId);
      if (!row) return;
      if (force !== void 0 && force === row.getIsSelected()) return;
      row.toggleSelected(force);
      refresh();
    },
    toggleAllSelected: (force) => {
      const pageRows = table2.getRowModel().rows;
      const target = force ?? !(pageRows.length > 0 && pageRows.every((r) => r.getIsSelected()));
      for (const row of pageRows) row.toggleSelected(target);
      refresh();
    },
    startEdit: (rowId, columnId) => {
      const col = columnViews.find((c) => c.id === columnId);
      if (!col || !col.editable) return;
      if (indexOfRow(rowId) === -1) return;
      editing = { rowId, columnId };
      editDraft = String(valueOf(rows[indexOfRow(rowId)], columnId) ?? "");
      refresh();
    },
    setEditDraft: (value) => {
      if (editing === null) return;
      if (value === editDraft) return;
      editDraft = value;
      refresh();
    },
    commitEdit: () => {
      if (editing === null) return false;
      const { rowId, columnId } = editing;
      const col = columnViews.find((c) => c.id === columnId);
      const index = indexOfRow(rowId);
      if (!col || index === -1) {
        cancelEditing();
        refresh();
        return false;
      }
      const row = rows[index];
      const oldValue = valueOf(row, columnId);
      const draft = editDraft ?? "";
      const coerced = coerce(col.type, draft);
      if (!coerced.ok) return false;
      if (coerced.value === oldValue) {
        cancelEditing();
        refresh();
        return true;
      }
      if (config.onCellEdit && config.onCellEdit(rowId, columnId, coerced.value, row) === false) {
        return false;
      }
      applyCellValue(rowId, columnId, coerced.value);
      if (undoHistory) {
        undoHistory.actions.push(
          makeEditCommand(
            rowId,
            columnId,
            coerced.value,
            oldValue,
            `Edit ${col.header}`
          )
        );
      }
      cancelEditing();
      refresh();
      return true;
    },
    cancelEdit: () => {
      if (editing === null) return;
      cancelEditing();
      refresh();
    },
    updateRow: (rowId, patch) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      rows = rows.map(
        (r, i) => i === index ? { ...r, ...patch } : r
      );
      syncData();
      return true;
    },
    addRow: (row) => {
      const id = getRowId(row, rows.length);
      rows = [...rows, row];
      syncData();
      if (undoHistory) {
        const command = {
          label: "Add row",
          execute: () => {
            rows = [...rows, row];
            syncData();
          },
          invert: () => ({
            label: "Remove row",
            execute: () => {
              rows = rows.filter((r) => r !== row);
              syncData();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return id;
    },
    removeRow: (rowId) => {
      const index = indexOfRow(rowId);
      if (index === -1) return false;
      const row = rows[index];
      if (editing?.rowId === rowId) cancelEditing();
      rows = rows.filter((_, i) => i !== index);
      syncData();
      if (undoHistory) {
        const command = {
          label: "Remove row",
          execute: () => {
            const i = indexOfRow(rowId);
            if (i === -1) return;
            rows = rows.filter((_, x) => x !== i);
            syncData();
          },
          invert: () => ({
            label: "Add row",
            execute: () => {
              rows = [...rows.slice(0, index), row, ...rows.slice(index)];
              syncData();
            },
            invert: () => command
          })
        };
        undoHistory.actions.push(command);
      }
      return true;
    },
    undo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.undo();
    },
    redo: () => {
      if (!undoHistory) return false;
      return undoHistory.actions.redo();
    }
  };
  const core = {
    get state() {
      return state;
    },
    actions,
    subscribe: (listener) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
  };
  return core;
}

// demo/wedge-smoke/dom.ts
function el(tag2, attrs = {}, ...children) {
  const node = document.createElement(tag2);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === void 0 || v === null || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "style") node.setAttribute("style", String(v));
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === void 0) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}
var $ = (id) => document.getElementById(id);

// demo/graph-composer/schema.ts
var taskFields = [
  { name: "title", label: "Title", valueType: "text", width: "54%", required: true },
  { name: "status", label: "Status", valueType: "select", options: ["todo", "doing", "done"] },
  { name: "priority", label: "Pri", valueType: "number", width: 52, align: "center" },
  { name: "owner", label: "Owner", valueType: "text", width: 88 }
];
function columnsFromSchema(fields) {
  return fields.map((f2) => ({
    id: f2.name,
    accessorKey: f2.name,
    header: f2.label,
    ...f2.valueType === "number" ? { type: "number" } : {},
    width: f2.width,
    align: f2.align,
    editable: f2.editable ?? true
  }));
}
function formFieldsFromSchema(fields) {
  return fields.map((f2) => ({
    name: f2.name,
    valueType: f2.valueType === "text" ? "title" : f2.valueType,
    required: f2.required ?? false,
    ...f2.valueType === "select" ? { selectOptions: f2.options } : {}
  }));
}

// demo/graph-composer/composer.ts
var SEED = [
  { title: "Ship the composer wedge", status: "todo", priority: 1, owner: "trent" },
  { title: "Iroh sync flake on reconnect", status: "doing", priority: 3, owner: "trent" },
  { title: "EQL-S window functions", status: "todo", priority: 2, owner: "ada" },
  { title: "Palette into Studio", status: "doing", priority: 1, owner: "trent" },
  { title: "Migrate studio to headless cores", status: "todo", priority: 2, owner: "ada" },
  { title: "Op-log compaction policy", status: "doing", priority: 3, owner: "lin" },
  { title: "Iroh doc key hygiene", status: "todo", priority: 1, owner: "lin" },
  { title: "Raster.tv studio session", status: "done", priority: 1, owner: "trent" }
];
var kernel;
var backend;
async function bootKernel() {
  kernel?.close();
  backend = await SqlJsKernelBackend.create({ dbPath: ":memory:" });
  kernel = new TrellisKernel({
    backend,
    agentId: "composer-demo",
    provenance: { actorType: "machine", origin: "composer-demo" }
  });
  kernel.boot();
}
async function seed() {
  for (let i = 0; i < SEED.length; i++) {
    const t = SEED[i];
    const id = `task-${i + 1}`;
    await kernel.mutate("task.seed", {
      facts: [
        { e: id, a: "type", v: "Task" },
        { e: id, a: "title", v: t.title },
        { e: id, a: "status", v: t.status },
        { e: id, a: "priority", v: t.priority },
        { e: id, a: "owner", v: t.owner },
        { e: id, a: "updatedAt", v: (/* @__PURE__ */ new Date()).toISOString() }
      ],
      provenance: { actorType: "machine", origin: "composer-seed" }
    });
  }
}
function rowsFromGraph() {
  return kernel.listEntities("Task").map((e) => {
    const cell = (a) => e.facts.find((f2) => f2.a === a)?.v ?? null;
    return {
      id: e.id,
      title: String(cell("title") ?? ""),
      status: cell("status") ?? "todo",
      priority: Number(cell("priority") ?? 0),
      owner: String(cell("owner") ?? "")
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function currentOps() {
  return backend.readAll();
}
var table;
function createTable2() {
  table = createTableCore({
    data: rowsFromGraph(),
    columns: columnsFromSchema(taskFields),
    initialState: { pageSize: 10, sorting: [{ id: "priority", desc: false }] },
    onCellEdit: (rowId, columnId, value) => {
      void kernel.updateEntity(rowId, { [columnId]: value }).then((r) => {
        ops = currentOps();
        renderOps();
        renderDelta(r.op);
      }).catch((err) => {
        console.error("op write failed", err);
      });
      return true;
    }
  });
}
function resyncTable() {
  const fresh = rowsFromGraph();
  for (const row of fresh) {
    table.actions.updateRow(row.id, row);
  }
}
var ops = [];
var traveling = null;
function renderOps() {
  const list = $("op-list");
  list.replaceChildren();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const added = op.facts?.length ?? 0;
    const removed = op.deleteFacts?.length ?? 0;
    const entry = el(
      "div",
      {
        class: "op" + (traveling?.opHash === op.hash ? " travel" : ""),
        onclick: () => travelTo(i)
      },
      el(
        "div",
        { class: "op-head" },
        el("span", { class: "chip" }, op.kind),
        el("span", { class: "op-hash", title: op.hash }, op.hash.replace("trellis:op:", "").slice(0, 10))
      ),
      el(
        "div",
        { class: "op-meta" },
        `${new Date(op.timestamp).toLocaleTimeString()} \xB7 ${added ? `+${added}` : ""}${removed ? ` \u2212${removed}` : ""} facts`
      )
    );
    list.append(entry);
  }
  $("op-count").textContent = String(ops.length);
  $("op-head-hash").textContent = ops.length ? ops[ops.length - 1].hash.slice(-8) : "\u2014";
}
function renderDelta(op) {
  const lines = [];
  const removed = new Map((op.deleteFacts ?? []).map((f2) => [`${f2.e}:${f2.a}`, f2.v]));
  for (const f2 of op.facts ?? []) {
    const old = removed.get(`${f2.e}:${f2.a}`);
    lines.push(
      old !== void 0 ? `${f2.e}.${f2.a}: ${JSON.stringify(old)} \u2192 ${JSON.stringify(f2.v)}` : `${f2.e}.${f2.a} = ${JSON.stringify(f2.v)}`
    );
  }
  const box = $("delta");
  box.replaceChildren(
    el("span", { class: "status-line", style: "margin:0" }, `last op ${op.hash.slice(-8)}:`),
    ...lines.length ? lines.map((l) => el("div", { class: "delta-line" }, l)) : [el("div", { class: "dim" }, "no facts")]
  );
}
async function undoLastOp() {
  const op = ops[ops.length - 1];
  if (!op) return;
  const inverse = await kernel.mutate(
    `${op.kind}.undo`,
    {
      facts: op.deleteFacts ?? [],
      deleteFacts: op.facts ?? [],
      links: op.deleteLinks ?? [],
      deleteLinks: op.links ?? [],
      provenance: { actorType: "machine", origin: "composer-undo" }
    }
  );
  ops = currentOps();
  renderOps();
  renderDelta(inverse.op);
  resyncTable();
  clearTravel();
}
function travelTo(index) {
  const op = ops[index];
  const store = kernel.timeTravel(op.hash);
  const typeFacts = store.getFactsByValue("type", "Task");
  const ids = new Set(typeFacts.map((f2) => f2.e));
  const rows = [];
  for (const id of ids) {
    const facts = store.getFactsByEntity(id);
    const cell = (a) => facts.find((f2) => f2.a === a)?.v ?? null;
    rows.push({
      id,
      title: String(cell("title") ?? ""),
      status: cell("status") ?? "todo",
      priority: Number(cell("priority") ?? 0),
      owner: String(cell("owner") ?? "")
    });
  }
  traveling = { opHash: op.hash, index };
  renderTravel(rows.sort((a, b) => a.id.localeCompare(b.id)));
  renderOps();
}
function renderTravel(rows) {
  const overlay = $("travel-overlay");
  overlay.style.display = "block";
  const grid = el("table", { class: "grid" });
  const thead = el("thead");
  const headRow = el("tr");
  for (const c of columnsFromSchema(taskFields)) {
    headRow.append(el("th", {}, c.header));
  }
  thead.append(headRow);
  grid.append(thead);
  const tbody = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    tr.append(
      el("td", {}, row.title),
      el("td", {}, row.status),
      el("td", {}, String(row.priority)),
      el("td", {}, row.owner)
    );
    tbody.append(tr);
  }
  grid.append(tbody);
  overlay.querySelector("#travel-rows").replaceChildren(grid);
  const idx = traveling.index;
  $("travel-label").textContent = `state at op ${idx + 1}/${ops.length} (${ops[idx].hash.slice(-8)}) \u2014 entities replayed from the op chain`;
}
function clearTravel() {
  traveling = null;
  $("travel-overlay").style.display = "none";
  $("travel-rows").replaceChildren();
}
var editInput = null;
var editKey = "";
var suppressNextBlur = false;
function renderTable() {
  const s = table.state;
  const root = $("table-root");
  let pendingFocus = null;
  let freshEditor = false;
  if (s.editing) {
    suppressNextBlur = true;
    window.setTimeout(() => {
      suppressNextBlur = false;
    }, 0);
  }
  root.replaceChildren();
  const grid = el("table", { class: "grid" });
  const thead = el("thead");
  const headRow = el("tr");
  headRow.append(
    el(
      "th",
      {},
      el("input", {
        type: "checkbox",
        checked: s.allSelected,
        indeterminate: s.someSelected && !s.allSelected,
        onchange: (e) => table.actions.toggleAllSelected(e.target.checked)
      })
    )
  );
  for (const col of s.columns) {
    const sort = s.sorting.find((x) => x.id === col.id);
    const marker = sort ? sort.desc ? " \u2193" : " \u2191" : "";
    headRow.append(
      el(
        "th",
        { onclick: () => table.actions.sort(col.id), title: col.header },
        col.header,
        el("span", { class: "marker" }, marker)
      )
    );
  }
  thead.append(headRow);
  grid.append(thead);
  const tbody = el("tbody");
  for (const row of s.rows) {
    const tr = el("tr");
    tr.append(
      el(
        "td",
        {},
        el("input", {
          type: "checkbox",
          checked: row.selected,
          onchange: (e) => table.actions.toggleRowSelected(row.id, e.target.checked)
        })
      )
    );
    for (const col of s.columns) {
      const editing = s.editing && s.editing.rowId === row.id && s.editing.columnId === col.id;
      if (editing) {
        const key = `${row.id}:${col.id}`;
        let input;
        if (key === editKey && editInput) {
          input = editInput;
          if (input.value !== s.editDraft) input.value = s.editDraft ?? "";
        } else {
          input = el("input", {
            type: "text",
            class: "cell-input",
            value: s.editDraft ?? "",
            oninput: (e) => table.actions.setEditDraft(e.target.value),
            onkeydown: (e) => {
              if (e.key === "Enter") table.actions.commitEdit();
              if (e.key === "Escape") table.actions.cancelEdit();
            },
            // Deferred: committing inside the blur event re-renders the
            // table and removes this input mid-event (DOMException).
            onblur: () => {
              if (suppressNextBlur) {
                suppressNextBlur = false;
                return;
              }
              window.setTimeout(() => table.actions.commitEdit(), 0);
            }
          });
          editInput = input;
          editKey = key;
          freshEditor = true;
        }
        tr.append(el("td", {}, input));
        pendingFocus = input;
      } else {
        const value = row.cells[col.id];
        tr.append(
          el(
            "td",
            {
              class: col.editable ? "editable" : "",
              ondblclick: () => col.editable && table.actions.startEdit(row.id, col.id),
              style: `text-align:${col.align ?? "left"}`
            },
            value === null ? "" : String(value)
          )
        );
      }
    }
    tbody.append(tr);
  }
  grid.append(tbody);
  root.append(grid);
  if (pendingFocus) {
    pendingFocus.focus();
    if (freshEditor) pendingFocus.select();
  }
  if (!s.editing) {
    editInput = null;
    editKey = "";
  }
  $("table-status").textContent = `${s.totalRows} tasks \xB7 page ${s.pageIndex + 1}/${Math.max(s.pageCount, 1)} \xB7 sorted by ${s.sorting.length ? s.sorting[0].id + (s.sorting[0].desc ? " \u2193" : " \u2191") : "\u2014"}`;
}
async function resetAll() {
  clearTravel();
  await bootKernel();
  await seed();
  ops = currentOps();
  createTable2();
  table.subscribe(renderTable);
  renderOps();
  renderTable();
  $("delta").replaceChildren(el("span", { class: "dim" }, "no edits yet \u2014 dbl-click a cell"));
}
async function main() {
  $("reset").addEventListener("click", () => void resetAll());
  $("undo-op").addEventListener("click", () => void undoLastOp());
  $("back-to-current").addEventListener("click", clearTravel);
  await resetAll();
  $("filter").addEventListener(
    "input",
    (e) => table.actions.setGlobalFilter(e.target.value)
  );
  const formFields = formFieldsFromSchema(taskFields);
  $("schema-line").textContent = `schema \u2192 ${taskFields.length} columns \xB7 ${formFields.length} form fields \xB7 same descriptor drives both (${taskFields.map((f2) => f2.name).join(", ")})`;
}
void main();
/*! Bundled license information:

@tanstack/table-core/build/lib/index.mjs:
  (**
     * table-core
     *
     * Copyright (c) TanStack
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE.md file in the root directory of this source tree.
     *
     * @license MIT
     *)
*/
