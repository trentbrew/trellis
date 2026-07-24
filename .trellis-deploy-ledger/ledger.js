// @bun
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/realtime/relay-persistence.ts
function chatKey(msg) {
  return msg.id ?? `${msg.from}:${msg.ts}`;
}
function tieKey(msg) {
  if (msg.t === "msg")
    return chatKey(msg);
  if (msg.t === "presence" || msg.t === "bye")
    return msg.from;
  return "";
}
function messageTs(msg) {
  if (msg.t === "presence" || msg.t === "bye" || msg.t === "msg") {
    return msg.ts;
  }
  return 0;
}

class RelayPersistence {
  maxChat;
  maxTextOps;
  presence = new Map;
  chatLog = [];
  chatKeys = new Set;
  textSnapshot = null;
  textOps = [];
  constructor(opts = {}) {
    this.maxChat = opts.maxChat ?? DEFAULT_MAX_CHAT;
    this.maxTextOps = opts.maxTextOps ?? DEFAULT_MAX_TEXT_OPS;
  }
  record(message) {
    if (message.v !== 1)
      return;
    switch (message.t) {
      case "hello":
        return;
      case "replay":
        return;
      case "presence":
        this.presence.set(message.from, message);
        return;
      case "bye":
        this.presence.delete(message.from);
        return;
      case "msg":
        this.recordBroadcast(message);
        return;
    }
  }
  buildReplay() {
    const out = [
      ...this.presence.values(),
      ...this.chatLog
    ];
    if (this.textSnapshot) {
      out.push(this.textSnapshot);
    } else {
      out.push(...this.textOps);
    }
    out.sort((a, b) => {
      const dt = messageTs(a) - messageTs(b);
      if (dt !== 0)
        return dt;
      return tieKey(a).localeCompare(tieKey(b));
    });
    return out;
  }
  getPresenceCount() {
    return this.presence.size;
  }
  getChatCount() {
    return this.chatLog.length;
  }
  hasTextSnapshot() {
    return this.textSnapshot !== null;
  }
  recordBroadcast(message) {
    if (message.channel === "chat" && message.event === "message") {
      const key = chatKey(message);
      if (this.chatKeys.has(key))
        return;
      this.chatKeys.add(key);
      this.chatLog.push(message);
      if (this.chatLog.length > this.maxChat) {
        const evicted = this.chatLog.splice(0, this.chatLog.length - this.maxChat);
        for (const m of evicted)
          this.chatKeys.delete(chatKey(m));
      }
      return;
    }
    if (message.channel === "text" && message.event === "state") {
      this.textSnapshot = message;
      this.textOps = [];
      return;
    }
    if (message.channel === "text" && message.event === "op") {
      if (this.textSnapshot)
        return;
      this.textOps.push(message);
      if (this.textOps.length > this.maxTextOps) {
        this.textOps.splice(0, this.textOps.length - this.maxTextOps);
      }
    }
  }
}
var DEFAULT_MAX_CHAT = 200, DEFAULT_MAX_TEXT_OPS = 2000;

// src/realtime/blob-handler.ts
function createBlobRequestHandler(store, opts = {}) {
  const maxBytes = opts.maxBlobBytes ?? DEFAULT_MAX_BLOB_BYTES;
  const authorize = opts.authorizeBlobWrite ?? (() => true);
  return (req, res) => {
    const reqPath = (req.url ?? "/").split("?")[0];
    const method = req.method ?? "GET";
    if (reqPath === "/blob" || reqPath.startsWith("/blob/")) {
      if (method === "OPTIONS") {
        res.writeHead(204, BLOB_CORS);
        res.end();
        return true;
      }
    }
    if (reqPath.startsWith("/blob/")) {
      const rest = reqPath.slice("/blob/".length);
      const metaMatch = /^([a-f0-9]{64})\/meta$/.exec(rest);
      if (metaMatch) {
        const hash2 = metaMatch[1];
        if (method === "PUT") {
          handlePutMeta(req, res, store, hash2, authorize);
          return true;
        }
        if (method === "GET") {
          if (!store.has(hash2)) {
            res.writeHead(404, {
              "content-type": "application/json",
              ...BLOB_CORS
            });
            res.end(JSON.stringify({ error: "not_found", hash: hash2 }));
            return true;
          }
          const meta = store.getMeta(hash2) ?? {};
          res.writeHead(200, {
            "content-type": "application/json",
            ...BLOB_CORS
          });
          res.end(JSON.stringify({ hash: hash2, ...meta }));
          return true;
        }
        res.writeHead(405, { allow: "GET, PUT, OPTIONS", ...BLOB_CORS });
        res.end();
        return true;
      }
      const hash = rest;
      if (!HASH_RE.test(hash)) {
        res.writeHead(400, {
          "content-type": "application/json",
          ...BLOB_CORS
        });
        res.end(JSON.stringify({ error: "invalid_hash", hash }));
        return true;
      }
      if (method === "HEAD") {
        const size = store.size(hash);
        if (size == null) {
          res.writeHead(404, BLOB_CORS);
          res.end();
          return true;
        }
        const meta = store.getMeta(hash);
        res.writeHead(200, {
          "content-type": meta?.contentType || "application/octet-stream",
          "content-length": size,
          etag: `"${hash}"`,
          "accept-ranges": "bytes",
          "cache-control": "public, max-age=31536000, immutable",
          ...BLOB_CORS
        });
        res.end();
        return true;
      }
      if (method === "GET") {
        const inm = req.headers["if-none-match"];
        if (inm && etagMatches(inm, hash)) {
          res.writeHead(304, {
            etag: `"${hash}"`,
            "cache-control": "public, max-age=31536000, immutable",
            ...BLOB_CORS
          });
          res.end();
          return true;
        }
        const size = store.size(hash);
        if (size == null) {
          res.writeHead(404, {
            "content-type": "application/json",
            ...BLOB_CORS
          });
          res.end(JSON.stringify({ error: "not_found", hash }));
          return true;
        }
        const meta = store.getMeta(hash);
        const baseHeaders = {
          "content-type": meta?.contentType || "application/octet-stream",
          etag: `"${hash}"`,
          "accept-ranges": "bytes",
          "cache-control": "public, max-age=31536000, immutable",
          ...BLOB_CORS
        };
        const rangeHeader = req.headers["range"];
        if (typeof rangeHeader === "string" && rangeHeader.length > 0) {
          const range = parseByteRange(rangeHeader, size);
          if (!range) {
            res.writeHead(416, {
              ...baseHeaders,
              "content-range": `bytes */${size}`
            });
            res.end();
            return true;
          }
          const stream2 = store.createReadStream(hash, range);
          if (!stream2) {
            res.writeHead(404, { "content-type": "application/json", ...BLOB_CORS });
            res.end(JSON.stringify({ error: "not_found", hash }));
            return true;
          }
          res.writeHead(206, {
            ...baseHeaders,
            "content-range": `bytes ${range.start}-${range.end}/${size}`,
            "content-length": range.end - range.start + 1
          });
          pipeBlob(stream2, res);
          return true;
        }
        const stream = store.createReadStream(hash);
        if (!stream) {
          res.writeHead(404, { "content-type": "application/json", ...BLOB_CORS });
          res.end(JSON.stringify({ error: "not_found", hash }));
          return true;
        }
        res.writeHead(200, {
          ...baseHeaders,
          "content-length": size
        });
        pipeBlob(stream, res);
        return true;
      }
      res.writeHead(405, {
        allow: "GET, HEAD, OPTIONS",
        ...BLOB_CORS
      });
      res.end();
      return true;
    }
    if (reqPath === "/blob" && method === "GET") {
      const blobs = store.listHashes().map((hash) => {
        const meta = store.getMeta(hash);
        return {
          hash,
          size: store.size(hash) ?? 0,
          ...meta?.name ? { name: meta.name } : {},
          ...meta?.contentType ? { contentType: meta.contentType } : {},
          ...meta?.uploadedAt ? { uploadedAt: meta.uploadedAt } : {}
        };
      });
      res.writeHead(200, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ blobs }));
      return true;
    }
    if (reqPath === "/blob" && method === "PUT") {
      handlePut(req, res, store, maxBytes, authorize);
      return true;
    }
    if (reqPath === "/blob") {
      res.writeHead(405, {
        allow: "GET, PUT, OPTIONS",
        ...BLOB_CORS
      });
      res.end();
      return true;
    }
    return false;
  };
}
function parseByteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m)
    return null;
  const [, startStr, endStr] = m;
  if (startStr === "" && endStr === "")
    return null;
  let start;
  let end;
  if (startStr === "") {
    const suffix = Number(endStr);
    if (suffix <= 0)
      return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr === "" ? size - 1 : Math.min(Number(endStr), size - 1);
  }
  if (start < 0 || start > end || start >= size)
    return null;
  return { start, end };
}
function pipeBlob(stream, res) {
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json", ...BLOB_CORS });
      res.end(JSON.stringify({ error: "read_failed" }));
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}
function etagMatches(ifNoneMatch, hash) {
  const expected = `"${hash}"`;
  return ifNoneMatch.split(",").map((s) => s.trim()).some((tag) => tag === "*" || tag === expected || tag === `W/${expected}` || tag === hash);
}
async function handlePut(req, res, store, maxBytes, authorize) {
  try {
    const allowed = await authorize(req);
    if (!allowed) {
      res.writeHead(401, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > maxBytes) {
      res.writeHead(413, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "payload_too_large", maxBlobBytes: maxBytes }));
      return;
    }
    const body = await readBodyLimited(req, maxBytes);
    if (body === "too_large") {
      res.writeHead(413, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "payload_too_large", maxBlobBytes: maxBytes }));
      return;
    }
    const hash = await store.put(body);
    const rawName = req.headers["x-trellis-filename"];
    const filename = typeof rawName === "string" ? rawName.trim().slice(0, 255) : "";
    const declaredType = req.headers["content-type"];
    const contentType = typeof declaredType === "string" && declaredType.length > 0 && !/^application\/octet-stream$/i.test(declaredType) ? declaredType.split(";")[0].trim().slice(0, 128) : undefined;
    if (filename || contentType) {
      store.setMeta(hash, {
        name: filename || undefined,
        contentType,
        uploadedAt: Date.now()
      });
    }
    res.writeHead(201, {
      "content-type": "application/json",
      etag: `"${hash}"`,
      ...BLOB_CORS
    });
    res.end(JSON.stringify({ hash }));
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "upload_failed" }));
    }
  }
}
async function handlePutMeta(req, res, store, hash, authorize) {
  try {
    const allowed = await authorize(req);
    if (!allowed) {
      res.writeHead(401, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (!store.has(hash)) {
      res.writeHead(404, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "not_found", hash }));
      return;
    }
    const body = await readBodyLimited(req, 64 * 1024);
    if (body === "too_large") {
      res.writeHead(413, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "payload_too_large" }));
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch {
      res.writeHead(400, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "invalid_json" }));
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      res.writeHead(400, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "invalid_meta" }));
      return;
    }
    const obj = parsed;
    const name = typeof obj.name === "string" ? obj.name.trim().slice(0, 255) : undefined;
    const contentType = typeof obj.contentType === "string" ? obj.contentType.trim().slice(0, 128) : undefined;
    store.setMeta(hash, {
      name,
      contentType,
      uploadedAt: typeof obj.uploadedAt === "number" ? obj.uploadedAt : Date.now()
    });
    res.writeHead(200, {
      "content-type": "application/json",
      ...BLOB_CORS
    });
    res.end(JSON.stringify({ hash, ...store.getMeta(hash) ?? {} }));
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, {
        "content-type": "application/json",
        ...BLOB_CORS
      });
      res.end(JSON.stringify({ error: "meta_failed" }));
    }
  }
}
function readBodyLimited(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    let tooLarge = false;
    const finish = (value) => {
      if (settled)
        return;
      settled = true;
      resolve(value);
    };
    req.on("data", (chunk) => {
      if (tooLarge)
        return;
      total += chunk.length;
      if (total > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        req.resume();
        finish("too_large");
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!settled)
        finish(Buffer.concat(chunks));
    });
    req.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}
var HASH_RE, DEFAULT_MAX_BLOB_BYTES, BLOB_CORS;
var init_blob_handler = __esm(() => {
  HASH_RE = /^[a-f0-9]{64}$/;
  DEFAULT_MAX_BLOB_BYTES = 64 * 1024 * 1024;
  BLOB_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match, X-Trellis-Filename"
  };
});

// src/realtime/relay-server.ts
var exports_relay_server = {};
__export(exports_relay_server, {
  isBlobRequestClaimed: () => isBlobRequestClaimed,
  createRealtimeRelay: () => createRealtimeRelay,
  createBlobRequestHandler: () => createBlobRequestHandler,
  attachRealtimeRelay: () => attachRealtimeRelay,
  TRELLIS_BLOB_CLAIMED: () => TRELLIS_BLOB_CLAIMED,
  BLOB_CORS: () => BLOB_CORS
});
function isBlobRequestClaimed(req) {
  return Boolean(req[TRELLIS_BLOB_CLAIMED]);
}
function resolveBlobStore(blobStore) {
  if (blobStore === false || blobStore == null)
    return null;
  return blobStore();
}
function blobHandlerOpts(opts) {
  return {
    maxBlobBytes: opts.maxBlobBytes,
    authorizeBlobWrite: opts.authorizeBlobWrite
  };
}
function roomFromPath(reqPath, basePath) {
  const normalized = reqPath.replace(/\/+$/, "") || "/";
  const base = basePath.replace(/\/+$/, "") || "/";
  if (normalized === base)
    return DEFAULT_ROOM;
  const prefix = base === "/" ? "/" : `${base}/`;
  if (!reqPath.startsWith(prefix))
    return null;
  const rest = reqPath.slice(prefix.length).split("?")[0].replace(/\/+$/, "");
  return rest ? decodeURIComponent(rest) : DEFAULT_ROOM;
}
async function attachRealtimeRelay(server, opts = {}) {
  const path = opts.path ?? "/rt";
  const graceMs = opts.replayGraceMs ?? REPLAY_GRACE_MS;
  const makePersistence = opts.persistence === false ? null : opts.persistence ?? (() => new RelayPersistence);
  const store = resolveBlobStore(opts.blobStore);
  const handleBlob = store ? createBlobRequestHandler(store, blobHandlerOpts(opts)) : null;
  const onRequest = handleBlob ? (req, res) => {
    if (handleBlob(req, res)) {
      req[TRELLIS_BLOB_CLAIMED] = true;
    }
  } : null;
  if (onRequest)
    server.prependListener("request", onRequest);
  const Wss = opts.WebSocketServerImpl ?? (await import("ws")).WebSocketServer;
  const wss = new Wss({ noServer: true });
  const rooms = new Map;
  const pendingRoom = new WeakMap;
  const roomState = (room) => {
    let st = rooms.get(room);
    if (!st) {
      st = { clients: new Set, persistence: makePersistence?.() ?? null };
      rooms.set(room, st);
    }
    return st;
  };
  const sendReplay = (ws, st) => {
    if (!st.persistence)
      return;
    const messages = st.persistence.buildReplay();
    if (messages.length === 0)
      return;
    const frame = {
      v: 1,
      t: "replay",
      from: "relay",
      messages
    };
    ws.send(JSON.stringify(frame));
  };
  wss.on("connection", (ws) => {
    const room = pendingRoom.get(ws) ?? DEFAULT_ROOM;
    pendingRoom.delete(ws);
    const st = roomState(room);
    st.clients.add(ws);
    const replaySent = { value: false };
    const deliverReplay = () => {
      if (replaySent.value)
        return;
      replaySent.value = true;
      sendReplay(ws, st);
    };
    const graceTimer = graceMs > 0 ? setTimeout(deliverReplay, graceMs) : null;
    graceTimer?.unref?.();
    ws.on("message", (data, isBinary) => {
      const raw = isBinary ? data : String(data);
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (message?.v === 1) {
        if (message.t === "hello")
          deliverReplay();
        st.persistence?.record(message);
      }
      for (const peer of st.clients) {
        if (peer === ws || peer.readyState !== peer.OPEN)
          continue;
        peer.send(String(raw));
      }
    });
    ws.on("close", () => {
      if (graceTimer)
        clearTimeout(graceTimer);
      st.clients.delete(ws);
      if (st.clients.size === 0)
        rooms.delete(room);
    });
  });
  const onUpgrade = (req, socket, head) => {
    const reqPath = (req.url ?? "").split("?")[0];
    const room = roomFromPath(reqPath, path);
    if (room === null)
      return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      pendingRoom.set(ws, room);
      wss.emit("connection", ws, req);
    });
  };
  server.on("upgrade", onUpgrade);
  return {
    clientCount: (room) => {
      if (room !== undefined)
        return rooms.get(room)?.clients.size ?? 0;
      let total = 0;
      for (const st of rooms.values())
        total += st.clients.size;
      return total;
    },
    rooms: () => [...rooms.keys()],
    persistenceFor: (room) => rooms.get(room)?.persistence ?? null,
    close: () => new Promise((resolve) => {
      server.off("upgrade", onUpgrade);
      if (onRequest)
        server.off("request", onRequest);
      for (const st of rooms.values()) {
        for (const ws of st.clients) {
          try {
            ws.close();
          } catch {}
        }
        st.clients.clear();
      }
      rooms.clear();
      wss.close(() => resolve());
    })
  };
}
async function createRealtimeRelay(opts = {}) {
  const { createServer } = await import("http");
  const path = opts.path ?? "/rt";
  const port = opts.port ?? 8231;
  const hostname = opts.hostname ?? "0.0.0.0";
  const store = resolveBlobStore(opts.blobStore);
  const handleBlob = store ? createBlobRequestHandler(store, blobHandlerOpts(opts)) : null;
  const server = createServer((req, res) => {
    if (handleBlob?.(req, res))
      return;
    const reqPath = (req.url ?? "/").split("?")[0];
    if (reqPath === "/" || reqPath === "/health") {
      if (req.method === "OPTIONS") {
        res.writeHead(204, RELAY_HEALTH_CORS);
        res.end();
        return;
      }
      if (req.method === "GET") {
        res.writeHead(200, {
          "content-type": "application/json",
          ...RELAY_HEALTH_CORS
        });
        res.end(JSON.stringify({ ok: true, relay: path }));
        return;
      }
    }
    res.writeHead(404).end("not found");
  });
  const { blobStore: _blob, ...relayOpts } = opts;
  const relay = await attachRealtimeRelay(server, {
    ...relayOpts,
    blobStore: false
  });
  await new Promise((resolve) => server.listen(port, hostname, resolve));
  const addr = server.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : port;
  return {
    ...relay,
    port: boundPort,
    server,
    close: async () => {
      await relay.close();
      await new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
var TRELLIS_BLOB_CLAIMED, REPLAY_GRACE_MS = 250, DEFAULT_ROOM = "default", RELAY_HEALTH_CORS;
var init_relay_server = __esm(() => {
  init_blob_handler();
  init_blob_handler();
  TRELLIS_BLOB_CLAIMED = Symbol.for("trellis.blobClaimed");
  RELAY_HEALTH_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };
});

// src/server/ledger-serve.ts
import { join as join2 } from "path";

// src/server/ledger-store.ts
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "fs";
import { join } from "path";
var CHECKPOINT_RETENTION = 8;
function validateJsonl(raw) {
  const lines = raw.split(`
`).filter((l) => l.trim());
  for (const line of lines) {
    JSON.parse(line);
  }
}
function checkpointFileName(tailHash) {
  return `${encodeURIComponent(tailHash)}.jsonl`;
}

class LedgerStore {
  dataRoot;
  constructor(dataRoot) {
    this.dataRoot = dataRoot;
    mkdirSync(this.dataRoot, { recursive: true });
  }
  repoRoot(repoId) {
    const dir = join(this.dataRoot, repoId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, "checkpoints"), { recursive: true });
    return dir;
  }
  getTail(repoId) {
    const tipPath = join(this.repoRoot(repoId), "tip.json");
    if (!existsSync(tipPath))
      return null;
    try {
      return JSON.parse(readFileSync(tipPath, "utf-8"));
    } catch {
      return null;
    }
  }
  getCheckpoint(repoId, tailHash) {
    const path = join(this.repoRoot(repoId), "checkpoints", checkpointFileName(tailHash));
    if (!existsSync(path))
      return null;
    return readFileSync(path, "utf-8");
  }
  findCheckpointByHash(tailHash) {
    if (!existsSync(this.dataRoot))
      return null;
    for (const repoId of readdirSync(this.dataRoot)) {
      const body = this.getCheckpoint(repoId, tailHash);
      if (body)
        return body;
    }
    return null;
  }
  push(payload) {
    const existing = this.getTail(payload.repoId);
    if (existing && payload.previousTail && existing.tailHash !== payload.previousTail) {
      return { ok: false, reason: "tail-mismatch" };
    }
    validateJsonl(payload.checkpoint);
    const repoDir = this.repoRoot(payload.repoId);
    const checkpointPath = join(repoDir, "checkpoints", checkpointFileName(payload.tailHash));
    const normalized = payload.checkpoint.endsWith(`
`) ? payload.checkpoint : `${payload.checkpoint}
`;
    writeFileSync(checkpointPath, normalized);
    const meta = {
      format: "jsonl",
      tailHash: payload.tailHash,
      byteLength: payload.byteLength,
      lineCount: payload.lineCount
    };
    writeFileSync(join(repoDir, "tip.json"), JSON.stringify(meta, null, 2));
    this.trimCheckpoints(payload.repoId);
    return { ok: true, meta };
  }
  trimCheckpoints(repoId) {
    const dir = join(this.repoRoot(repoId), "checkpoints");
    const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => ({
      name: f,
      mtime: statSync(join(dir, f)).mtimeMs
    })).sort((a, b) => b.mtime - a.mtime);
    for (const stale of files.slice(CHECKPOINT_RETENTION)) {
      try {
        unlinkSync(join(dir, stale.name));
      } catch {}
    }
  }
}

// src/server/node-adapter.ts
async function startNodeServer(opts) {
  const http = await import("http");
  const httpServer = http.createServer(async (req, res) => {
    const claimed = Boolean(req[Symbol.for("trellis.blobClaimed")]);
    if (claimed || res.headersSent || res.writableEnded) {
      return;
    }
    try {
      const fetchReq = await toFetchRequest(req);
      const fetchRes = await opts.fetch(fetchReq);
      await writeFetchResponse(res, fetchRes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error", message: msg }));
    }
  });
  let wss = null;
  try {
    const { WebSocketServer } = await import("ws");
    wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req, socket, head) => {
      const reqPath = (req.url ?? "").split("?")[0];
      if (reqPath !== "/realtime")
        return;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
    wss.on("connection", (ws) => {
      Promise.resolve(opts.websocket.open(ws)).catch(() => {});
      ws.on("message", (raw) => {
        const data = Array.isArray(raw) ? Buffer.concat(raw).toString() : raw instanceof ArrayBuffer ? Buffer.from(raw).toString() : raw.toString();
        Promise.resolve(opts.websocket.message(ws, data)).catch(() => {});
      });
      ws.on("close", () => opts.websocket.close(ws));
    });
  } catch {
    httpServer.on("upgrade", (_req, socket) => {
      socket.destroy();
    });
  }
  await new Promise((resolve) => httpServer.listen(opts.port, opts.hostname, resolve));
  if (opts.attachPresenceRelay) {
    const { attachRealtimeRelay: attachRealtimeRelay2 } = await Promise.resolve().then(() => (init_relay_server(), exports_relay_server));
    const relayOpts = typeof opts.attachPresenceRelay === "object" ? opts.attachPresenceRelay : { path: "/rt" };
    await attachRealtimeRelay2(httpServer, relayOpts);
  }
  const addr = httpServer.address();
  const boundPort = typeof addr === "object" && addr ? addr.port : opts.port;
  const boundHost = typeof addr === "object" && addr ? addr.address : opts.hostname;
  return wrapNodeServer(httpServer, wss, boundPort, boundHost);
}
async function toFetchRequest(req) {
  const host = req.headers.host ?? "localhost";
  const protocol = req.socket?.encrypted ? "https" : "http";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const method = req.method ?? "GET";
  const headers = new Headers;
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value)
        headers.append(key, v);
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? new Uint8Array(await readBody(req)) : undefined;
  return new Request(url, { method, headers, body });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function writeFetchResponse(res, fetchRes) {
  res.statusCode = fetchRes.status;
  fetchRes.headers.forEach((value, key) => res.setHeader(key, value));
  if (!fetchRes.body) {
    res.end();
    return;
  }
  const reader = fetchRes.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    res.write(value);
  }
  res.end();
}
function wrapNodeServer(httpServer, wss, port, hostname) {
  return {
    port,
    hostname: hostname ?? "localhost",
    stop(closeActiveConnections) {
      return new Promise((resolve, reject) => {
        const closeHttp = () => {
          httpServer.close((err) => err ? reject(err) : resolve());
        };
        if (!wss) {
          closeHttp();
          return;
        }
        if (closeActiveConnections) {
          for (const client of wss.clients)
            client.terminate();
        }
        wss.close(() => closeHttp());
      });
    }
  };
}

// src/server/ledger-handler.ts
function resolveLedgerApiKey() {
  const key = process.env.LEDGER_API_KEY?.trim();
  return key || undefined;
}
function authorize(req, apiKey) {
  if (!apiKey)
    return null;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${apiKey}`;
  if (header !== expected) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
function createLedgerFetchHandler(opts) {
  const { store, apiKey } = opts;
  return async (req) => {
    const url = new URL(req.url);
    const denied = authorize(req, apiKey);
    if (denied)
      return denied;
    if (url.pathname === "/health" && req.method === "GET") {
      return json({ ok: true, service: "trellis-ledger" });
    }
    if (url.pathname === "/v0/ledger/tail" && req.method === "GET") {
      const repoId = url.searchParams.get("repoId") ?? "";
      if (!repoId)
        return json({ error: "repoId required" }, 400);
      const tip = store.getTail(repoId);
      if (!tip)
        return new Response("{}", { status: 404 });
      return json(tip);
    }
    if (url.pathname === "/v0/ledger/push" && req.method === "POST") {
      let payload;
      try {
        payload = await req.json();
      } catch {
        return json({ error: "invalid json" }, 400);
      }
      const repoId = payload.repoId;
      const tailHash = payload.tailHash;
      const checkpoint = payload.checkpoint;
      if (typeof repoId !== "string" || typeof tailHash !== "string" || typeof checkpoint !== "string") {
        return json({ error: "invalid push payload" }, 400);
      }
      const result = store.push({
        repoId,
        previousTail: typeof payload.previousTail === "string" ? payload.previousTail : undefined,
        tailHash,
        format: typeof payload.format === "string" ? payload.format : "jsonl",
        byteLength: typeof payload.byteLength === "number" ? payload.byteLength : Buffer.byteLength(checkpoint, "utf-8"),
        lineCount: typeof payload.lineCount === "number" ? payload.lineCount : checkpoint.split(`
`).filter((l) => l.trim()).length,
        checkpoint
      });
      if (!result.ok) {
        return new Response("tail mismatch", { status: 409 });
      }
      return json({ ok: true });
    }
    const checkpointMatch = url.pathname.match(/^\/v0\/ledger\/checkpoints\/(.+)$/);
    if (checkpointMatch && req.method === "GET") {
      const tailHash = decodeURIComponent(checkpointMatch[1]);
      const body = store.findCheckpointByHash(tailHash);
      if (!body)
        return new Response("missing", { status: 404 });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/jsonl" }
      });
    }
    return json({ error: "not found" }, 404);
  };
}
async function startLedgerServer(opts) {
  const fetch = createLedgerFetchHandler({
    store: opts.store,
    apiKey: opts.apiKey
  });
  return startNodeServer({
    port: opts.port ?? 0,
    hostname: opts.hostname ?? "127.0.0.1",
    fetch,
    websocket: {
      open: () => {},
      message: () => {},
      close: () => {}
    }
  });
}

// src/server/ledger-serve.ts
async function startLedgerServerFromEnv(opts) {
  const dataRoot = opts?.dataDir ?? process.env.LEDGER_DATA_DIR ?? join2(process.cwd(), "data");
  const store = new LedgerStore(dataRoot);
  await startLedgerServer({
    store,
    apiKey: resolveLedgerApiKey(),
    port: opts?.port ?? Number(process.env.PORT ?? 8080),
    hostname: "0.0.0.0"
  });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  startLedgerServerFromEnv().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// .trellis-deploy-ledger/ledger-entry.ts
process.env.LEDGER_API_KEY = "35e97363c1e85b7813266eb916d2fba5a4c5e48595c21be9";
process.env.LEDGER_DATA_DIR = "/home/sprite/trellis-ledger/data";
await startLedgerServerFromEnv({ port: 8080 });
console.log("Trellis ledger sprite listening on port 8080");
