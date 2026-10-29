// @bun
var __defProp = Object.defineProperty;
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
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
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};
var __exportCjs = (target, getters, setters) => {
  for (var name in getters)
    __defProp(target, name, {
      get: getters[name],
      set: setters[name],
      enumerable: true,
      configurable: true
    });
};
var __require = import.meta.require;

// src/core/paths.ts
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
function packageRoot(from) {
  for (let d = from, i = 0;i < 6; i++, d = dirname(d))
    if (existsSync(join(d, "skills")) && existsSync(join(d, "bin")))
      return d;
  return join(from, "..", "..");
}
function version() {
  try {
    const f = join(PKG_ROOT, "dist", "version.json");
    if (existsSync(f))
      return JSON.parse(readFileSync(f, "utf8")).commit.slice(0, 7);
    const r = Bun.spawnSync(["git", "-C", PKG_ROOT, "rev-parse", "--short", "HEAD"]);
    if (r.exitCode === 0)
      return `${r.stdout.toString().trim()} (checkout)`;
  } catch {}
  return "dev";
}
var PKG_ROOT, SKILLS_DIR, BIN_DIR, WEB_DIST, ANNOTATE_JS, REPO = "JustGoscha/omg-product";
var init_paths = __esm(() => {
  PKG_ROOT = packageRoot(import.meta.dir);
  SKILLS_DIR = join(PKG_ROOT, "skills");
  BIN_DIR = join(PKG_ROOT, "bin");
  WEB_DIST = join(PKG_ROOT, "dist", "web");
  ANNOTATE_JS = join(PKG_ROOT, "src", "server", "annotate.js");
});

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS(function(exports) {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS(function(exports) {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor === "function")
      return visitor(key, node, path);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path);
    return;
  }
  function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS(function(exports) {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS(function(exports) {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res) => {
        data.res = res;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS(function(exports) {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS(function(exports) {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      if (found && ctx) {
        const { anchors, doc, maxAliasCount } = ctx;
        let data = anchors.get(found);
        if (!data) {
          toJS.toJS(found, null, ctx);
          data = anchors.get(found);
        }
        if (data?.res === undefined) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, found, anchors);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const source = this.resolve(ctx.doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      return ctx.anchors.get(source).res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors && source && anchors.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors);
      const vc = getAliasCount(doc, node.value, anchors);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node = new Scalar.Scalar(value);
        if (ref)
          ref.node = node;
        return node;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS(function(exports) {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1;i >= 0; --i) {
      const k = path[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path, keepScalar) {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path, value) {
      const [key, ...rest] = path;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS(function(exports) {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS(function(exports) {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i = 0;i < folds.length; ++i) {
      const fold = folds[i];
      const end = folds[i + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS(function(exports) {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS(function(exports) {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS(function(exports) {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str = stringify.stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      if (chompKeep && comment)
        chompKeep = false;
      lines.push(blockItemPrefix + str);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS(function(exports) {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map, onError) {
      if (!identity.isMap(map))
        onError("Expected a mapping for this tag");
      return map;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq, onError) {
      if (!identity.isSeq(seq))
        onError("Expected a sequence for this tag");
      return seq;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS(function(exports) {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS(function(exports) {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS(function(exports) {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs = new YAMLSeq.YAMLSeq(schema);
    pairs.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS(function(exports) {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap = new this;
      omap.items = pairs$1.items;
      return omap;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n = BigInt(str);
      return sign === "-" ? BigInt(-1) * n : n;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set.items.push(Pair.createPair(value, null, ctx));
        }
      return set;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags.includes(tagObj))
        tags.push(tagObj);
      return tags;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS(function(exports) {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS(function(exports) {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path) {
      if (Collection.isEmptyPath(path)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path, keepScalar) {
      if (Collection.isEmptyPath(path))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path) {
      if (Collection.isEmptyPath(path))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path, value) {
      if (Collection.isEmptyPath(path)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS(function(exports) {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "\u2026" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "\u2026";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `\u2026
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS(function(exports) {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS(function(exports) {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS(function(exports) {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS(function(exports) {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS(function(exports) {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS(function(exports) {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS(function(exports) {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end = start + header.length;
      if (scalar.source)
        end += scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return unfoldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function unfoldLines(source) {
    const line = /(.*?)\r?\n/sy;
    let match = line.exec(source);
    if (!match)
      return source;
    let trimEnd, trimBoth;
    try {
      trimEnd = new RegExp("(?<![ \t])[ \t]+$");
      trimBoth = new RegExp("^[ \t]+|(?<![ \t])[ \t]+$", "g");
    } catch {
      trimEnd = /[ \t]+$/;
      trimBoth = /^[ \t]+|[ \t]+$/g;
    }
    let res = match[1].replace(trimEnd, "");
    let sep = " ";
    let pos = line.lastIndex;
    while (match = line.exec(source)) {
      const lm = match[1].replace(trimBoth, "");
      if (lm === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + lm;
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "\x85",
    _: "\xA0",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS(function(exports) {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS(function(exports) {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS(function(exports) {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0;i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0;i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS(function(exports) {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS(function(exports) {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS(function(exports) {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
  }
  exports.visit = visit;
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS(function(exports) {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS(function(exports) {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i = this.pos;ch = this.buffer[i]; ++i) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i = nl - 1;
          let ch = this.buffer[i];
          if (ch === "\r")
            ch = this.buffer[--i];
          const lastChar = i;
          while (ch === " ")
            ch = this.buffer[--i];
          if (ch === `
` && i >= this.pos && i + 1 + indent > lastChar)
            nl = i;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS(function(exports) {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS(function(exports) {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0;i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS(function(exports) {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// node_modules/yaml/dist/index.js
var exports_dist = {};
__exportCjs(exports_dist, {
  Composer: () => $Composer,
  Document: () => $Document,
  Schema: () => $Schema,
  YAMLError: () => $YAMLError,
  YAMLParseError: () => $YAMLParseError,
  YAMLWarning: () => $YAMLWarning,
  Alias: () => $Alias,
  isAlias: () => $isAlias,
  isCollection: () => $isCollection,
  isDocument: () => $isDocument,
  isMap: () => $isMap,
  isNode: () => $isNode,
  isPair: () => $isPair,
  isScalar: () => $isScalar,
  isSeq: () => $isSeq,
  Pair: () => $Pair,
  Scalar: () => $Scalar,
  YAMLMap: () => $YAMLMap,
  YAMLSeq: () => $YAMLSeq,
  CST: () => $CST,
  Lexer: () => $Lexer,
  LineCounter: () => $LineCounter,
  Parser: () => $Parser,
  parse: () => $parse,
  parseAllDocuments: () => $parseAllDocuments,
  parseDocument: () => $parseDocument,
  stringify: () => $stringify,
  visit: () => $visit,
  visitAsync: () => $visitAsync
}, {
  Composer: (value) => $Composer = value,
  Document: (value) => $Document = value,
  Schema: (value) => $Schema = value,
  YAMLError: (value) => $YAMLError = value,
  YAMLParseError: (value) => $YAMLParseError = value,
  YAMLWarning: (value) => $YAMLWarning = value,
  Alias: (value) => $Alias = value,
  isAlias: (value) => $isAlias = value,
  isCollection: (value) => $isCollection = value,
  isDocument: (value) => $isDocument = value,
  isMap: (value) => $isMap = value,
  isNode: (value) => $isNode = value,
  isPair: (value) => $isPair = value,
  isScalar: (value) => $isScalar = value,
  isSeq: (value) => $isSeq = value,
  Pair: (value) => $Pair = value,
  Scalar: (value) => $Scalar = value,
  YAMLMap: (value) => $YAMLMap = value,
  YAMLSeq: (value) => $YAMLSeq = value,
  CST: (value) => $CST = value,
  Lexer: (value) => $Lexer = value,
  LineCounter: (value) => $LineCounter = value,
  Parser: (value) => $Parser = value,
  parse: (value) => $parse = value,
  parseAllDocuments: (value) => $parseAllDocuments = value,
  parseDocument: (value) => $parseDocument = value,
  stringify: (value) => $stringify = value,
  visit: (value) => $visit = value,
  visitAsync: (value) => $visitAsync = value
});
var composer, Document, Schema, errors, Alias, identity, Pair, Scalar, YAMLMap, YAMLSeq, cst, lexer, lineCounter, parser, publicApi, visit, $Composer, $Document, $Schema, $YAMLError, $YAMLParseError, $YAMLWarning, $Alias, $isAlias, $isCollection, $isDocument, $isMap, $isNode, $isPair, $isScalar, $isSeq, $Pair, $Scalar, $YAMLMap, $YAMLSeq, $CST, $Lexer, $LineCounter, $Parser, $parse, $parseAllDocuments, $parseDocument, $stringify, $visit, $visitAsync;
var init_dist = __esm(() => {
  composer = require_composer();
  Document = require_Document();
  Schema = require_Schema();
  errors = require_errors();
  Alias = require_Alias();
  identity = require_identity();
  Pair = require_Pair();
  Scalar = require_Scalar();
  YAMLMap = require_YAMLMap();
  YAMLSeq = require_YAMLSeq();
  cst = require_cst();
  lexer = require_lexer();
  lineCounter = require_line_counter();
  parser = require_parser();
  publicApi = require_public_api();
  visit = require_visit();
  $Composer = composer.Composer;
  $Document = Document.Document;
  $Schema = Schema.Schema;
  $YAMLError = errors.YAMLError;
  $YAMLParseError = errors.YAMLParseError;
  $YAMLWarning = errors.YAMLWarning;
  $Alias = Alias.Alias;
  $isAlias = identity.isAlias;
  $isCollection = identity.isCollection;
  $isDocument = identity.isDocument;
  $isMap = identity.isMap;
  $isNode = identity.isNode;
  $isPair = identity.isPair;
  $isScalar = identity.isScalar;
  $isSeq = identity.isSeq;
  $Pair = Pair.Pair;
  $Scalar = Scalar.Scalar;
  $YAMLMap = YAMLMap.YAMLMap;
  $YAMLSeq = YAMLSeq.YAMLSeq;
  $CST = cst;
  $Lexer = lexer.Lexer;
  $LineCounter = lineCounter.LineCounter;
  $Parser = parser.Parser;
  $parse = publicApi.parse;
  $parseAllDocuments = publicApi.parseAllDocuments;
  $parseDocument = publicApi.parseDocument;
  $stringify = publicApi.stringify;
  $visit = visit.visit;
  $visitAsync = visit.visitAsync;
});

// src/core/files.ts
import { existsSync as existsSync2, readdirSync, readFileSync as readFileSync2, statSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { dirname as dirname2, join as join2, resolve } from "path";
function findRoot(from = process.cwd()) {
  let dir = resolve(from);
  while (true) {
    if (existsSync2(join2(dir, ROOT_FILE)))
      return dir;
    const up = dirname2(dir);
    if (up === dir)
      return null;
    dir = up;
  }
}
function readText(path) {
  return readFileSync2(path, "utf8");
}
function writeText(path, content) {
  mkdirSync(dirname2(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}
function listDir(path) {
  try {
    return readdirSync(path).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}
function splitFrontmatter(src) {
  const m = src.match(FM);
  if (!m)
    return { yaml: "", body: src };
  return { yaml: m[1], body: m[2] };
}
function parseYaml(src) {
  return exports_dist.parse(src, { prettyErrors: true });
}
function updateFrontmatter(path, patch) {
  const src = readText(path);
  const { yaml, body } = splitFrontmatter(src);
  const doc = exports_dist.parseDocument(yaml);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null)
      doc.delete(key);
    else if (typeof value === "object" && !Array.isArray(value)) {
      const node = doc.createNode(value);
      node.flow = true;
      doc.set(key, node);
    } else
      doc.set(key, value);
  }
  const yamlOut = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
  writeText(path, `---
${yamlOut.trimEnd()}
---
${body}`);
}
function yamlStringify(value) {
  return exports_dist.stringify(value, { lineWidth: 0 });
}
function markdownSections(body) {
  const out = {};
  let key = "";
  let buf = [];
  const flush = () => {
    const t = buf.join(`
`).trim();
    if (key || t)
      out[key] = t;
  };
  for (const line of body.split(`
`)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      key = m[1].toLowerCase();
      buf = [];
    } else
      buf.push(line);
  }
  flush();
  return out;
}
function htmlMeta(src) {
  const title = src.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = src.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  return { title, description };
}
var ROOT_FILE = "product.yaml", isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}, FM;
var init_files = __esm(() => {
  init_dist();
  FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
});

// src/core/time.ts
function parseTime(value) {
  if (value == null)
    return null;
  const v = String(value).trim();
  let m;
  if (m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)) {
    const d = toDate(v);
    if (Number.isNaN(d.getTime()) || iso(d) !== v)
      return null;
    return { start: v, end: v, resolution: "day" };
  }
  if (m = v.match(/^(\d{4})-(\d{2})$/)) {
    const y = +m[1], mo = +m[2];
    if (mo < 1 || mo > 12)
      return null;
    return { start: `${y}-${pad(mo)}-01`, end: lastDayOfMonth(y, mo), resolution: "month" };
  }
  if (m = v.match(/^(\d{4})-?Q([1-4])$/i)) {
    const y = +m[1], q = +m[2];
    const first = (q - 1) * 3 + 1;
    return { start: `${y}-${pad(first)}-01`, end: lastDayOfMonth(y, first + 2), resolution: "quarter" };
  }
  if (m = v.match(/^(\d{4})-?H([12])$/i)) {
    const y = +m[1], h = +m[2];
    return h === 1 ? { start: `${y}-01-01`, end: `${y}-06-30`, resolution: "half" } : { start: `${y}-07-01`, end: `${y}-12-31`, resolution: "half" };
  }
  if (m = v.match(/^(\d{4})$/))
    return { start: `${m[1]}-01-01`, end: `${m[1]}-12-31`, resolution: "year" };
  return null;
}
function resolveSpan(when, size) {
  if (!when)
    return null;
  const s = parseTime(when.start);
  const e = parseTime(when.end);
  const from = when.from;
  if (!s && !e)
    return null;
  if (s && e)
    return { start: s.start, end: e.end, resolution: coarser(s.resolution, e.resolution), from };
  if (s) {
    if (s.resolution !== "day")
      return { ...s, from };
    const days = Math.max(1, Math.round((sizeWeeks[size ?? "m"] ?? 2) * 7) - 1);
    return { start: s.start, end: addDays(s.start, days), resolution: "day", derived: true, derivedSide: "end", from };
  }
  const days = Math.max(1, Math.round((sizeWeeks[size ?? "m"] ?? 2) * 7) - 1);
  return { start: addDays(e.end, -days), end: e.end, resolution: e.resolution, derived: true, derivedSide: "start", from };
}
function weekStart(s) {
  const d = toDate(s);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return iso(d);
}
function todayIso(override) {
  if (override) {
    const r = parseTime(override);
    if (r)
      return r.start;
  }
  const d = new Date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
var order, coarser = (a, b) => order.indexOf(a) >= order.indexOf(b) ? a : b, pad = (n) => String(n).padStart(2, "0"), iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, toDate = (s) => new Date(`${s}T00:00:00Z`), addDays = (s, n) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}, daysBetween = (a, b) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000), lastDayOfMonth = (y, m) => iso(new Date(Date.UTC(y, m, 0))), sizeWeeks;
var init_time = __esm(() => {
  order = ["day", "month", "quarter", "half", "year"];
  sizeWeeks = { xs: 0.5, s: 1, m: 2, l: 4, xl: 8 };
});

// node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}

class Cached {
  constructor(getter) {
    this._getter = getter;
    this._value = undefined;
  }
  get value() {
    const getter = this._getter;
    if (getter !== undefined) {
      this._value = getter();
      this._getter = undefined;
    }
    return this._value;
  }
}
function cached(getter) {
  return new Cached(getter);
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function rawShape(def) {
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  return desc?.get ? desc.get.raw : desc?.value;
}
function sourceShape(schema) {
  return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
function deferProp(target, key, getter) {
  Object.defineProperty(target, key, {
    get() {
      const value = getter();
      assignProp(this, key, value);
      return value;
    },
    enumerable: true,
    configurable: true
  });
}
function putProp(target, key, value) {
  if (key in target)
    assignProp(target, key, value);
  else
    target[key] = value;
}
function mirrorShape(target, source, keys, wrap) {
  const raw = sourceShape(source);
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(raw, key);
    if (!desc.enumerable)
      continue;
    if (desc.get) {
      deferProp(target, key, () => {
        const value = source._zod.def.shape[key];
        return wrap ? wrap(value, key) : value;
      });
    } else
      putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
  }
}
function mirrorProps(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (!desc.enumerable)
      continue;
    if (desc.get)
      deferProp(target, key, () => source[key]);
    else
      putProp(target, key, desc.value);
  }
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin !== undefined && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const newShape = {};
  mirrorShape(newShape, schema, maskedKeys(schema, mask));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function maskedKeys(schema, mask) {
  const raw = sourceShape(schema);
  const keys = [];
  for (const key of Reflect.ownKeys(mask)) {
    if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) {
      throw new Error(`Unrecognized key: "${String(key)}"`);
    }
    if (mask[key])
      keys.push(key);
  }
  return keys;
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const omitted = new Set(maskedKeys(schema, mask));
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
  return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = sourceShape(schema);
    for (const key of Reflect.ownKeys(shape)) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function extended(schema, shape) {
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
  mirrorProps(newShape, shape);
  return newShape;
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
  if (!b?._zod?.def) {
    throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
  }
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const newShape = {};
  mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
  mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
  const def = mergeDefs(a._zod.def, {
    shape: newShape,
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask, name = "partial") {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
  }
  const selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class && ((value, key) => selected && !selected.has(key) ? value : new Class({ type: "optional", innerType: value })));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape, checks: [] }));
}
function required(Class, schema, mask) {
  const selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
  const newShape = {};
  mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => selected && !selected.has(key) ? value : new Class({ type: "nonoptional", innerType: value }));
  return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function sizeCaps(defChecks) {
  const caps = [];
  for (const ch of defChecks ?? []) {
    const d = ch._zod.def;
    if (!/_(length|size)$|_equals$/.test(d.check))
      break;
    const max = d.maximum ?? d.length ?? d.size;
    if (max >= 0)
      caps.push([max, ch]);
  }
  return caps;
}
function attachSchema(issues, start, inst) {
  var _a;
  for (let i = start;i < issues.length; i++) {
    (_a = issues[i]).schema ?? (_a.schema = inst);
  }
}
function finalizeIssue(iss, ctx, config) {
  var _a;
  const traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType")) {
    if (traits.has("$ZodCheck"))
      (_a = iss).schema ?? (_a.schema = iss.inst);
    else
      iss.schema = iss.inst;
  }
  const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : undefined;
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
  const full = {};
  for (const k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
      continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) {
    full.input = iss.input;
  }
  return full;
}
function codePointLength(str) {
  const units = str.length;
  if (!highSurrogate.test(str))
    return units;
  let count = units;
  for (let i = 0;i < units - 1; i++) {
    if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
      count--;
      i++;
    }
  }
  return count;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function members(proto, table) {
  for (const key in table) {
    const desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, { ...desc, enumerable: false });
    else
      defineBound(proto, key, desc.value);
  }
}
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
  return value;
}
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
function derived(computes, table) {
  for (const key in computes) {
    const compute = computes[key];
    Object.defineProperty(table, key, {
      configurable: true,
      enumerable: true,
      get() {
        return own(this, key, compute(this));
      },
      set(value) {
        own(this, key, value);
      }
    });
  }
  return table;
}
function defineBound(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    }
  });
}
function claim(inst, sentinel) {
  const proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? undefined : proto;
}
function defineLazyInternal(inst, key, compute) {
  const proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = undefined;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      const outer = broke;
      broke = false;
      try {
        const value = compute(this);
        if (broke)
          delete this[key];
        else
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }
  });
}
function installLazyProp(inst, key, make, enumerable) {
  const proto = claim(inst, key);
  if (!proto)
    return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      const desc = { configurable: true, writable: true, enumerable, value: undefined };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
    }
  });
}
function constantCatch(value) {
  const fn = () => value;
  fn[CONSTANT_CATCH] = true;
  return fn;
}
var captureStackTrace, allowsEval, propertyKeyTypes, NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES, highSurrogate, installing, broke = false, breaker, CONSTANT_CATCH = "~constantCatch";
var init_util = __esm(() => {
  init_core();
  captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
  allowsEval = /* @__PURE__ */ cached(() => {
    if (globalConfig.jitless) {
      return false;
    }
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  NUMBER_FORMAT_RANGES = /* @__PURE__ */ (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  }))();
  BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
  highSurrogate = /[\uD800-\uDBFF]/;
  breaker = {
    configurable: true,
    get() {
      broke = true;
      return;
    }
  };
});

// node_modules/zod/v4/core/core.js
function newError(Definition) {
  const E = _E;
  if (E) {
    const saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition;
      }
      try {
        return new Definition;
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition;
}
function $constructor(name, initializer, proto, params) {
  const zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = new Set;
  }
  Internals.prototype = zodProto;
  const protoMembers = proto;
  const initialized = protoMembers && new WeakSet;
  function init(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = undefined;
      }
    } else if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    if (initialized) {
      const own = Object.getPrototypeOf(inst);
      const ctorProto = inst._zod.constr.prototype;
      let up = own;
      while (up && up !== ctorProto)
        up = Object.getPrototypeOf(up);
      const target = up ?? own;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    const proto = _.prototype;
    for (const k in proto) {
      if (!Object.prototype.hasOwnProperty.call(proto, k))
        continue;
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    const inst = params?.Parent ? newError(Definition) : this;
    init(inst, def);
    const deferred = inst._zod.deferred;
    if (deferred) {
      for (const fn of deferred) {
        fn();
      }
      inst._zod.deferred = undefined;
    }
    const pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp)
      pp(inst);
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var _a, _zodDesc, _E, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm(() => {
  init_util();
  _zodDesc = { value: undefined, enumerable: false };
  _E = "captureStackTrace" in Error ? Error : null;
  $ZodAsyncError = class $ZodAsyncError extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  $ZodEncodeError = class $ZodEncodeError extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
  globalConfig = globalThis.__zod_globalConfig;
});

// node_modules/zod/v4/core/errors.js
function _getMessage() {
  const internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
function _setMessage(value) {
  this._zod.message = value;
}
function node(obj, key, make) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    if (key === "__proto__") {
      Object.defineProperty(obj, key, { value: make(), writable: true, enumerable: true, configurable: true });
    } else {
      obj[key] = make();
    }
  }
  return obj[key];
}
function flattenError(error, mapper = (issue) => issue.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue) => issue.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error, path = []) => {
    for (const issue of error.issues) {
      if (issue.code === "invalid_union" && issue.errors.length) {
        issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
      } else if (issue.code === "invalid_key") {
        processError({ issues: issue.issues }, [...path, ...issue.path]);
      } else if (issue.code === "invalid_element") {
        processError({ issues: issue.issues }, [...path, ...issue.path]);
      } else {
        const fullpath = [...path, ...issue.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (el === "_errors") {
              if (terminal)
                curr._errors.push(mapper(issue));
              i++;
              continue;
            }
            if (!Object.prototype.hasOwnProperty.call(curr, el)) {
              Object.defineProperty(curr, el, {
                value: { _errors: [] },
                enumerable: true,
                writable: true,
                configurable: true
              });
            }
            const node = curr[el];
            if (terminal) {
              node._errors.push(mapper(issue));
            }
            curr = node;
            i++;
          }
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
var _messageDesc, _issuesDesc, _installedToString, initializer = (inst, def) => {
  inst.name = "$ZodError";
  _issuesDesc.value = def;
  Object.defineProperty(inst, "issues", _issuesDesc);
  _issuesDesc.value = undefined;
  Object.defineProperty(inst, "message", _messageDesc);
  const proto = Object.getPrototypeOf(inst);
  if (!_installedToString.has(proto)) {
    _installedToString.add(proto);
    Object.defineProperty(proto, "toString", {
      configurable: true,
      enumerable: false,
      get() {
        const value = () => this.message;
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
        return value;
      },
      set(value) {
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
      }
    });
  }
}, $ZodError, $ZodRealError;
var init_errors = __esm(() => {
  init_core();
  init_util();
  _messageDesc = {
    get: _getMessage,
    set: _setMessage,
    enumerable: true,
    configurable: true
  };
  _issuesDesc = { value: undefined, enumerable: false };
  _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
  $ZodError = $constructor("$ZodError", initializer);
  $ZodRealError = $constructor("$ZodError", initializer, undefined, {
    Parent: Error
  });
});

// node_modules/zod/v4/core/parse.js
function finalizeParams(callee, params) {
  return { callee: params?.callee ?? callee, Err: params?.Err };
}
function failure(Err, issues, ctx) {
  let error;
  return {
    success: false,
    get error() {
      if (!error) {
        error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
        issues = undefined;
        ctx = undefined;
      }
      return error;
    },
    set error(e) {
      error = e;
      issues = undefined;
      ctx = undefined;
    }
  };
}
function validateFallback(schema, value, _ctx) {
  const ctx = _ctx ? { ..._ctx, async: false, abortEarly: true } : { async: false, abortEarly: true };
  const fallbackRun = schema._zod.bag.fallbackRun;
  let result;
  if (fallbackRun) {
    ctx[COMPILE_FALLBACK] = true;
    result = fallbackRun({ value, issues: [] }, ctx);
  } else {
    result = schema._zod.run({ value, issues: [] }, ctx);
  }
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length === 0;
}
var _parse = (_Err) => {
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError;
    }
    if (result.issues.length) {
      const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
}, _parseAsync = (_Err) => {
  const fn = async (schema, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
}, _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
}, _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
}, COMPILE_INVALID, COMPILE_FALLBACK, validate = (schema, value, _ctx) => {
  const validator = schema._zod.bag.validator;
  if (validator !== undefined) {
    if (validator(value) !== COMPILE_INVALID)
      return true;
    if (validator.definite === true && _ctx === undefined)
      return false;
  }
  return validateFallback(schema, value, _ctx);
}, validateAsync = async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true, abortEarly: true } : { async: true, abortEarly: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length === 0;
}, _encode = (_Err) => {
  const parse = _parse(_Err);
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return parse(schema, value, ctx, finalizeParams(fn, _params));
  };
  return fn;
}, _decode = (_Err) => {
  const parse = _parse(_Err);
  const fn = (schema, value, _ctx, _params) => {
    return parse(schema, value, _ctx, finalizeParams(fn, _params));
  };
  return fn;
}, _encodeAsync = (_Err) => {
  const parseAsync = _parseAsync(_Err);
  const fn = async (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return await parseAsync(schema, value, ctx, finalizeParams(fn, _params));
  };
  return fn;
}, _decodeAsync = (_Err) => {
  const parseAsync = _parseAsync(_Err);
  const fn = async (schema, value, _ctx, _params) => {
    return await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
  };
  return fn;
}, _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
}, _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
}, _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
}, _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
var init_parse = __esm(() => {
  init_core();
  init_util();
  COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
  COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
});

// node_modules/zod/v4/core/regexes.js
function nanoidOfLength(length) {
  return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
function emoji() {
  return new RegExp(_emoji, "u");
}
function anchor(source) {
  return new RegExp(`^${source}$`);
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const opts = ["Z"];
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const qualified = `${timeSource({ precision: args.precision, seconds: true })}(?:${opts.join("|")})`;
  const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, guid, uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
}, email, _emoji = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`, ipv4, ipv6, cidrv4, cidrv6, base64, base64url, httpProtocol, e164, dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`, date, anyString, bigint, integer, number, boolean, _null, lowercase, uppercase;
var init_regexes = __esm(() => {
  cuid = /^[cC][0-9a-z]{6,}$/;
  cuid2 = /^[0-9a-z]+$/;
  ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
  xid = /^[0-9a-vA-V]{20}$/;
  ksuid = /^[A-Za-z0-9]{27}$/;
  nanoid = /^[a-zA-Z0-9_-]{21}$/;
  duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
  httpProtocol = /^https?$/;
  e164 = /^\+[1-9]\d{6,14}$/;
  date = /* @__PURE__ */ anchor(dateSource);
  anyString = /^[\s\S]{0,}$/;
  bigint = /^-?\d+n?$/;
  integer = /^-?\d+$/;
  number = /^-?\d+(?:\.\d+)?$/;
  boolean = /^(?:true|false)$/i;
  _null = /^null$/i;
  lowercase = /^[^A-Z]*$/;
  uppercase = /^[^a-z]*$/;
});

// node_modules/zod/v4/core/checks.js
var $ZodCheck, _whenHasLength = (payload) => {
  const val = payload.value;
  return !nullish(val) && val.length !== undefined;
}, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckOverwrite;
var init_checks = __esm(() => {
  init_core();
  init_regexes();
  init_util();
  $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
  });
  numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin: numericOriginMap[typeof payload.value] ?? origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin: numericOriginMap[typeof payload.value] ?? origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units > def.maximum ? codePointLength(input) : units;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a, _b;
    $ZodCheck.init(inst, def);
    if (def.pattern)
      (_a = inst._zod).check ?? (_a.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {});
  });
  $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
});

// node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = [], closed = {}) {
    this.content = [];
    this.indent = 0;
    this.args = args;
    this.closed = closed;
  }
  indented(fn) {
    this.indent += 1;
    try {
      fn(this);
    } finally {
      this.indent -= 1;
    }
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const content = this?.content ?? [``];
    const factory = new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${content.join(`
`)}
};`);
    return factory(...Object.values(this.closed));
  }
}

// node_modules/zod/v4/core/versions.js
var version2;
var init_versions = __esm(() => {
  version2 = {
    major: 4,
    minor: 6,
    patch: 7
  };
});

// node_modules/zod/v4/core/schemas.js
async function validateAsync2(inst, value) {
  const ctx = { async: true };
  return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
}
function standardProps(inst) {
  return {
    validate: (value) => {
      const ctx = { async: false };
      try {
        const r = inst._zod.run({ value, issues: [] }, ctx);
        if (!(r instanceof Promise))
          return toStandardResult(r, ctx);
      } catch (_) {}
      return validateAsync2(inst, value);
    },
    vendor: "zod",
    version: 1
  };
}
function canParseURL(input) {
  try {
    if (typeof URL !== "undefined" && typeof URL.canParse === "function")
      return URL.canParse(input);
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
function validateURL(trimmed, def) {
  if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) {
    return canParseURL(trimmed) || URL_UNPARSEABLE;
  }
  return parseURLObject(trimmed, def);
}
function parseURLObject(trimmed, def) {
  if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) {
    return URL_BAD_FORMAT;
  }
  try {
    if (typeof URL !== "undefined") {
      const URLStatic = URL;
      if (typeof URLStatic.parse === "function")
        return URLStatic.parse(trimmed) ?? URL_UNPARSEABLE;
    }
    return new URL(trimmed);
  } catch {
    return URL_UNPARSEABLE;
  }
}
function stripTabAndNewline(value) {
  return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url, hostname) {
  hostname.lastIndex = 0;
  return hostname.test(url.hostname);
}
function urlProtocolOk(url, protocol) {
  protocol.lastIndex = 0;
  return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
function isValidIPv6(value) {
  if (!ipv6Alphabet.test(value))
    return false;
  return canParseURL(`http://[${value}]`);
}
function isValidCIDRv6(value) {
  const parts = value.split("/");
  if (parts.length !== 2)
    return false;
  const [address, prefix] = parts;
  if (!prefix)
    return false;
  const prefixNum = Number(prefix);
  if (`${prefixNum}` !== prefix)
    return false;
  if (prefixNum < 0 || prefixNum > 128)
    return false;
  return isValidIPv6(address);
}
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64urlCharset.test(data))
    return false;
  const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function capSize(inst, size) {
  const caps = sizeCaps(inst._zod.def.checks);
  if (!caps.length)
    return;
  const cap = Math.min(...caps.map((c) => c[0]));
  const parse = inst._zod.parse;
  inst._zod.parse = (payload, ctx) => {
    const n = size(payload.value);
    if (n > cap && !ctx?.skipChecks && ctx?.direction !== "backward") {
      for (const [max, ch] of sizeCaps(inst._zod.def.checks)) {
        if (n > max && ch._zod.def.when(payload)) {
          const start = payload.issues.length;
          ch._zod.check(payload);
          payload.issues[start].continue = false;
          attachSchema(payload.issues, start, inst);
          return payload;
        }
      }
    }
    return parse(payload, ctx);
  };
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input, optin, optout) {
  const isPresent = key in input;
  const isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") {
    return;
  }
  if (result.issues.length) {
    if (optin !== undefined && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && optin === undefined) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: undefined,
        path: [key]
      });
    }
    return;
  }
  if (result.value === undefined) {
    if (isPresent || optin === "defaulted" && !isOptionalOut) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
  for (const k of allKeys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const optin = _catchall.optin;
  const optout = _catchall.optout;
  let seen = 0;
  for (const key in input) {
    if (abortEarly && payload.issues.length !== seen) {
      if (aborted(payload, seen))
        break;
      seen = payload.issues.length;
    }
    if (keySet.has(key))
      continue;
    if (key === "__proto__") {
      if (t === "never")
        unrecognized.push(key);
      continue;
    }
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
    } else {
      handlePropertyResult(r, payload, key, input, optin, optout);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
      continue: true
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function discriminatorMap(def) {
  const map = new Map;
  for (const option of def.options) {
    const values = option._zod.propValues?.[def.discriminator];
    if (!values || values.size === 0)
      throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
    for (const value of values) {
      if (map.has(value)) {
        if (value !== undefined)
          throw new Error(`Duplicate discriminator value "${String(value)}"`);
        map.set(value, null);
      } else {
        map.set(value, option);
      }
    }
  }
  return map;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    if (Object.prototype.hasOwnProperty.call(newObj, "__proto__"))
      delete newObj.__proto__;
    for (const key of sharedKeys) {
      if (key === "__proto__")
        continue;
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = new Map;
  let unrecIssue;
  const keyIssues = new Map;
  const collect = (iss, side) => {
    let keys;
    if (iss.code === "unrecognized_keys" && !iss.path?.length) {
      unrecIssue ?? (unrecIssue = iss);
      keys = iss.keys;
    } else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
      const k = String(iss.path[0]);
      if (!keyIssues.has(k))
        keyIssues.set(k, iss);
      keys = [k];
    } else {
      return false;
    }
    for (const k of keys) {
      if (!unrecKeys.has(k))
        unrecKeys.set(k, {});
      unrecKeys.get(k)[side] = true;
    }
    return true;
  };
  for (const iss of left.issues) {
    if (!collect(iss, "l"))
      result.issues.push(iss);
  }
  for (const iss of right.issues) {
    if (!collect(iss, "r"))
      result.issues.push(iss);
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length) {
    const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
    if (aggregated.length)
      result.issues.push({ ...unrecIssue, keys: aggregated });
    for (const k of bothKeys) {
      if (!aggregated.includes(k) && keyIssues.has(k))
        result.issues.push(keyIssues.get(k));
    }
  }
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    if (aborted(result))
      return result;
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? undefined : result.value;
  return payload;
}
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handleCatchResult(payload, result, def, ctx) {
  if (!result.issues.length) {
    payload.value = result.value;
    if (result.memo)
      payload.memo = true;
    return payload;
  }
  payload.value = def.catchValue({
    ...result,
    value: payload.value,
    error: {
      issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
    },
    input: payload.value
  });
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  if (!payload.memo)
    payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value }, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, URL_BAD_FORMAT = 1, URL_UNPARSEABLE = 2, asciiTabOrNewline, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, ipv6Alphabet, $ZodIPv6, $ZodCIDRv4, $ZodCIDRv6, base64Charset, $ZodBase64, base64urlCharset, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodBigInt, $ZodNull, $ZodUnknown, $ZodNever, $ZodDate, arraySize = (input) => Array.isArray(input) ? input.length : -1, $ZodArray, NO_SYMBOL_KEYS, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodDiscriminatedUnion, $ZodIntersection, $ZodRecord, $ZodEnum, $ZodLiteral, $ZodTransform, $ZodOptional, $ZodExactOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodCatch, $ZodPipe, $ZodReadonly, $ZodCustom;
var init_schemas = __esm(() => {
  init_checks();
  init_core();
  init_regexes();
  init_util();
  init_versions();
  init_util();
  $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version2;
    const defChecks = inst._zod.def.checks;
    const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks, ctx) => {
        if (payload.memo)
          return payload;
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks) {
          if (ch._zod.def.when) {
            if (explicitlyAborted(payload))
              continue;
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError;
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              attachSchema(payload.issues, currLen, inst);
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary) => {
              return handleCanaryResult(canary, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError;
          return result.then((result) => runChecks(result, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
  }, {
    get "~standard"() {
      return hide(this, "~standard", standardProps(this));
    },
    set "~standard"(value) {
      own(this, "~standard", value);
    }
  });
  $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = def.pattern ?? anyString;
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_) {}
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === undefined)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  asciiTabOrNewline = /[\t\n\r]/g;
  $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url = validateURL(trimmed, def);
        if (url === URL_BAD_FORMAT) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
        if (url === URL_UNPARSEABLE) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
        if (url === true) {
          payload.value = stripTabAndNewline(trimmed);
          return;
        }
        if (def.hostname && !urlHostnameOk(url, def.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
        if (def.protocol && !urlProtocolOk(url, def.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
        payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    if (def.length !== undefined && (!Number.isInteger(def.length) || def.length < 1))
      throw new Error(`Invalid nanoid length: ${def.length}`);
    def.pattern ?? (def.pattern = def.length === undefined ? nanoid : nanoidOfLength(def.length));
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
  });
  ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
  $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidIPv6(payload.value)) {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidCIDRv6(payload.value)) {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
  $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64Charset);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  base64urlCharset = /^[A-Za-z0-9_-]*$/;
  $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64urlCharset);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : undefined : undefined;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {}
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_) {}
      if (typeof payload.value === "bigint")
        return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce) {
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {}
      }
      const input = payload.value;
      const isDate = input instanceof Date;
      const isValidDate = isDate && !Number.isNaN(input.getTime());
      if (isValidDate)
        return payload;
      payload.issues.push({
        expected: "date",
        code: "invalid_type",
        input,
        ...isDate ? { received: "Invalid Date" } : {},
        inst
      });
      return payload;
    };
  });
  $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    const memo = globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
      const proms = [];
      const abortEarly = ctx?.abortEarly;
      for (let i = 0;i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result) => handleArrayResult(result, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
          if (abortEarly && result.issues.length !== 0 && aborted(result))
            break;
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
    capSize(inst, arraySize);
  });
  NO_SYMBOL_KEYS = [];
  $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    const sh = desc?.get ? desc.get.raw : def.shape ?? {};
    if (sh) {
      const get = () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", { value: newSh });
        get.raw = newSh;
        return newSh;
      };
      get.raw = sh;
      Object.defineProperty(def, "shape", { get });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazyInternal(inst, "propValues", (zod) => {
      const shape = zod.def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
            assignProp(propValues, key, new Set);
          }
          for (const v of field.values)
            propValues[key].add(v);
          if (field.optin !== undefined)
            propValues[key].add(undefined);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    const memo = globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
      const proms = [];
      const shape = value.shape;
      const abortEarly = ctx?.abortEarly;
      let seen = payload.issues.length;
      for (const key of value.allKeys) {
        if (abortEarly && payload.issues.length !== seen) {
          if (aborted(payload, seen))
            break;
          seen = payload.issues.length;
        }
        if (key === "__proto__")
          continue;
        const el = shape[key];
        const optin = el._zod.optin;
        const optout = el._zod.optout;
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
        } else {
          handlePropertyResult(r, payload, key, input, optin, optout);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
    };
  });
  $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const memo = globalConfig.memoizer;
    const generateFastpass = (shape) => {
      const normalized = _normalized.value;
      const syms = normalized.symbolKeys;
      const doc = new Doc(["payload", "ctx"], { shape, inst, memo, syms });
      const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
      doc.write(`const input = payload.value;`);
      const ids = Object.create(null);
      let counter = 0;
      for (const key of normalized.allKeys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(memo ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
      for (const key of normalized.allKeys) {
        if (key === "__proto__")
          continue;
        const id = ids[key];
        const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
        const isPresent = `${k} in input`;
        const schema = shape[key];
        const optin = schema?._zod?.optin;
        const isOptionalIn = optin !== undefined;
        const isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(k)};`);
        if (isOptionalIn && isOptionalOut) {
          const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
          doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
        } else if (!isOptionalIn) {
          doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
          if (optin === "defaulted") {
            doc.write(`newResult[${k}] = ${id}.value;`);
          } else {
            doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
          }
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      return doc.compile();
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
      }
      return superParse(payload, ctx);
    };
  });
  $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== undefined) ? "optional" : undefined);
    defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    defineLazyInternal(inst, "values", (zod) => {
      if (zod.def.options.every((o) => o._zod.values)) {
        return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return;
    });
    defineLazyInternal(inst, "pattern", (zod) => {
      if (zod.def.options.every((o) => o._zod.pattern)) {
        const patterns = zod.def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results) => {
        return handleUnionResults(results, payload, inst, ctx);
      });
    };
  });
  $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazyInternal(inst, "propValues", (zod) => {
      const propValues = {};
      let undefinedCount = 0;
      for (const option of zod.def.options) {
        const pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
        if (pv[zod.def.discriminator]?.has(undefined))
          undefinedCount++;
        for (const [k, v] of Object.entries(pv)) {
          if (!Object.prototype.hasOwnProperty.call(propValues, k)) {
            assignProp(propValues, k, new Set);
          }
          for (const val of v) {
            propValues[k].add(val);
          }
        }
      }
      if (!zod.def.unionFallback && undefinedCount > 1)
        propValues[zod.def.discriminator]?.delete(undefined);
      return propValues;
    });
    def.options.forEach((option, i) => {
      const propShape = rawShape(option._zod.def);
      if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) {
        throw new Error(`Invalid discriminated union option at index "${i}"`);
      }
    });
    const disc = cached(() => discriminatorMap(def));
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const value = input?.[def.discriminator];
      const opt = disc.value.get(value);
      if (opt && (value !== undefined || ctx.direction !== "backward")) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback || ctx.direction === "backward") {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        options: Array.from(disc.value.keys()).filter((value) => disc.value.get(value) !== null),
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left, right]) => {
          return handleIntersectionResults(payload, left, right);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    const memo = globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      const values = def.keyType._zod.values;
      if (values && !def.partial) {
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        const recordKeys = new Set;
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            recordKeys.add(typeof key === "number" ? key.toString() : key);
            if (key === "__proto__")
              continue;
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (keyResult.issues.length) {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
              continue;
            }
            const outKey = keyResult.value;
            if (outKey === "__proto__")
              continue;
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result) => {
                if (result.issues.length) {
                  payload.issues.push(...prefixIssues(key, result.issues));
                }
                payload.value[outKey] = result.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!recordKeys.has(key)) {
            if (def.mode === "loose") {
              if (key === "__proto__")
                continue;
              payload.value[key] = input[key];
            } else {
              unrecognized = unrecognized ?? [];
              unrecognized.push(key);
            }
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized,
            continue: true
          });
        }
      } else {
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        let unrecognized;
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          if (!Object.prototype.propertyIsEnumerable.call(input, key))
            continue;
          let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
          if (checkNumericKey) {
            const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
            if (retryResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (retryResult.issues.length === 0) {
              keyResult = retryResult;
            }
          }
          if (keyResult.issues.length) {
            if (def.mode === "loose") {
              payload.value[key] = input[key];
            } else if (values) {
              unrecognized = unrecognized ?? [];
              unrecognized.push(key);
            } else {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
            }
            continue;
          }
          const outKey = keyResult.value;
          if (outKey === "__proto__")
            continue;
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result) => {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized,
            continue: true
          });
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    defineLazyInternal(inst, "pattern", (zod) => {
      const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
      return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
    });
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const values = new Set(def.values);
    inst._zod.values = values;
    defineLazyInternal(inst, "pattern", (zod) => {
      const vals = zod.def.values;
      return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
    });
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    globalConfig.memoizer?.guard(inst);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output) => {
          payload.value = output;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError;
      }
      payload.value = _out;
      return payload;
    };
  });
  $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    inst._zod.optout = "optional";
    defineLazyInternal(inst, "values", (zod) => {
      const values = zod.def.innerType._zod.values;
      return values ? new Set([...values, undefined]) : undefined;
    });
    defineLazyInternal(inst, "pattern", (zod) => {
      const pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === undefined) {
        if (def.innerType._zod.optin !== "defaulted")
          return payload;
        const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
        if (result instanceof Promise)
          return result.then((result) => handleOptionalResult(payload, result));
        return handleOptionalResult(payload, result);
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    defineLazyInternal(inst, "pattern", (zod) => {
      const pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    defineLazyInternal(inst, "values", (zod) => {
      return zod.def.innerType._zod.values ? new Set([...zod.def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result) => handleDefaultResult(result, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === undefined) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => {
      const v = zod.def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result) => handleNonOptionalResult(result, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
      if (result instanceof Promise) {
        return result.then((result) => handleCatchResult(payload, result, def, ctx));
      }
      return handleCatchResult(payload, result, def, ctx);
    };
  });
  $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right) => handlePipeResult(right, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left) => handlePipeResult(left, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r) => handleRefineResult(r, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
});

// node_modules/zod/v4/core/memoizer.js
function isRef(value) {
  return value !== null && typeof value === "object";
}
function cloneIssues(issues) {
  return issues.map((iss) => iss.path ? { ...iss, path: iss.path.slice() } : { ...iss });
}
function isRecursive(inst, stack, resolve) {
  const cached = recursive.get(inst);
  if (cached !== undefined)
    return cached ? PROVEN : NONE;
  if (stack.has(inst))
    return PROVEN;
  stack.add(inst);
  let result = NONE;
  const check = (child) => {
    if (result !== PROVEN && child?._zod) {
      const answer = isRecursive(child, stack, resolve);
      if (answer > result)
        result = answer;
    }
  };
  const shape = (sh, spread) => {
    let answer = NONE;
    for (const key of Reflect.ownKeys(sh)) {
      const desc = Object.getOwnPropertyDescriptor(sh, key);
      if (spread && !desc.enumerable)
        continue;
      const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve) : NONE;
      if (child > answer)
        answer = child;
    }
    return answer;
  };
  const merge = (answer) => {
    if (answer > result)
      result = answer;
  };
  const def = inst._zod.def;
  const kind = def.type;
  switch (kind) {
    case "object": {
      const raw = rawShape(def);
      merge(raw ? shape(raw, true) : ASSUMED);
      check(def.catchall);
      break;
    }
    case "array":
      check(def.element);
      break;
    case "tuple":
      for (const el of def.items)
        check(el);
      check(def.rest);
      break;
    case "record":
    case "map":
      check(def.keyType);
      check(def.valueType);
      break;
    case "set":
      check(def.valueType);
      break;
    case "union":
      for (const el of def.options)
        check(el);
      break;
    case "intersection":
      check(def.left);
      check(def.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      check(def.innerType);
      break;
    case "pipe":
      check(def.in);
      check(def.out);
      break;
    case "function":
      check(def.input);
      check(def.output);
      break;
    case "lazy": {
      const inner = def._cachedInner ?? (resolve ? inst._zod.innerType : undefined);
      merge(inner ? isRecursive(inner, stack, false) : ASSUMED);
      break;
    }
    case "template_literal":
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default: {
      for (const key in def) {
        const desc = Object.getOwnPropertyDescriptor(def, key);
        if (!desc || desc.get)
          continue;
        const value = desc.value;
        if (!value || typeof value !== "object")
          continue;
        if (value._zod)
          check(value);
        else if (Array.isArray(value))
          for (const el of value)
            check(el);
      }
    }
  }
  stack.delete(inst);
  return settle(inst, result);
}
function settle(inst, answer) {
  if (answer !== ASSUMED)
    recursive.set(inst, answer === PROVEN);
  return answer;
}
function bucketFor(state, inst) {
  let bucket = state.buckets.get(inst);
  if (!bucket) {
    bucket = new WeakMap;
    state.buckets.set(inst, bucket);
  }
  return bucket;
}
function memoizer() {
  return memo;
}
function isBackEdge(ctx, value) {
  const backEdges = ctx[STATE]?.backEdges;
  return backEdges !== undefined && isRef(value) && backEdges.has(value);
}
var $ZodCyclicError, STATE = "~memo", NO_ISSUES, recursive, NONE = 0, ASSUMED = 1, PROVEN = 2, handoff, open, memo;
var init_memoizer = __esm(() => {
  init_util();
  $ZodCyclicError = class $ZodCyclicError extends Error {
    constructor() {
      super(`Cannot parse a reference cycle that closes through a transform`);
      this.name = "ZodCyclicError";
    }
  };
  NO_ISSUES = [];
  recursive = /* @__PURE__ */ new WeakMap;
  open = [];
  memo = {
    alloc(_inst, payload, empty) {
      const bucket = handoff;
      if (!bucket)
        return empty;
      handoff = undefined;
      const entry = { value: empty, issues: null };
      bucket.set(payload.value, entry);
      open.push(entry);
      return empty;
    },
    guard(inst) {
      var _a;
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      inst._zod.deferred.push(() => {
        const base = inst._zod.parse;
        const wrapped = (payload, ctx) => {
          if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value))
            throw new $ZodCyclicError;
          return base(payload, ctx);
        };
        inst._zod.parse = wrapped;
        if (inst._zod.run === base)
          inst._zod.run = wrapped;
      });
    },
    attach(inst) {
      var _a;
      let isRecursiveInst;
      let rechecked = false;
      let lastCtx;
      let lastBucket;
      (_a = inst._zod).deferred ?? (_a.deferred = []);
      inst._zod.deferred.push(() => {
        const base = inst._zod.parse;
        const wrapped = (payload, ctx) => {
          if (isRecursiveInst === undefined) {
            const walked = isRecursive(inst, new Set, false);
            if (walked === NONE) {
              inst._zod.parse = base;
              if (inst._zod.run === wrapped)
                inst._zod.run = base;
              return base(payload, ctx);
            }
            if (walked === PROVEN || rechecked)
              isRecursiveInst = true;
            else
              rechecked = true;
          }
          const input = payload.value;
          if (!isRef(input))
            return base(payload, ctx);
          let state = ctx[STATE];
          if (!state) {
            state = { buckets: new WeakMap, backEdges: undefined };
            ctx[STATE] = state;
          }
          let bucket;
          if (lastCtx === ctx) {
            bucket = lastBucket;
          } else {
            bucket = bucketFor(state, inst);
            lastCtx = ctx;
            lastBucket = bucket;
          }
          const hit = bucket.get(input);
          if (hit) {
            payload.value = hit.value;
            if (hit.issues) {
              if (hit.issues.length)
                payload.issues.push(...cloneIssues(hit.issues));
            } else {
              payload.memo = true;
              state.backEdges ?? (state.backEdges = new WeakSet);
              state.backEdges.add(hit.value);
            }
            return payload;
          }
          handoff = bucket;
          const depth = open.length;
          const result = base(payload, ctx);
          handoff = undefined;
          const entry = open.length > depth ? open.pop() : undefined;
          if (result instanceof Promise) {
            return result.then((r) => {
              if (entry)
                entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
              return r;
            });
          }
          if (entry)
            entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
          return result;
        };
        inst._zod.parse = wrapped;
        if (inst._zod.run === base)
          inst._zod.run = wrapped;
      });
    }
  };
});

// node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error()
  };
}
var error = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const FormatDictionary = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    currency_code: "currency code",
    credit_card: "credit card number",
    iban: "IBAN",
    jwt: "JWT",
    template_literal: "input"
  };
  const TypeDictionary = {
    nan: "NaN"
  };
  function getTypeName(type, input) {
    if (type === "number" && typeof input === "number" && !Number.isFinite(input)) {
      return String(input);
    }
    return TypeDictionary[type] ?? type;
  }
  return (issue) => {
    switch (issue.code) {
      case "invalid_type": {
        const expected = getTypeName(issue.expected);
        const receivedType = parsedType(issue.input);
        const received = getTypeName(receivedType, issue.input);
        return `Invalid input: expected ${expected}, received ${received}`;
      }
      case "invalid_value":
        if (issue.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
      case "too_big": {
        const adj = issue.exact ? "exactly " : issue.inclusive ? "<=" : "<";
        const sizing = getSizing(issue.origin);
        if (sizing)
          return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue.exact ? "exactly " : issue.inclusive ? ">=" : ">";
        const sizing = getSizing(issue.origin);
        if (sizing) {
          return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue.origin}`;
      case "invalid_union":
        if (issue.options && Array.isArray(issue.options) && issue.options.length > 0) {
          const opts = issue.options.map((o) => `'${o}'`).join(" | ");
          return `Invalid discriminator value. Expected ${opts}`;
        }
        if (issue.inclusive === false) {
          return "Invalid input: more than one option matched";
        }
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
var init_en = __esm(() => {
  init_util();
});

// node_modules/zod/v4/locales/index.js
var init_locales = () => {};

// node_modules/zod/v4/core/registries.js
class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
var _a2, globalRegistry;
var init_registries = __esm(() => {
  (_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
  globalRegistry = globalThis.__zod_globalRegistry;
});

// node_modules/zod/v4/core/compile.js
var INVALID, FALLBACK_FLAG, WHEN_DEFAULTED_CHECKS, PATTERN_IS_COMPLETE;
var init_compile = __esm(() => {
  INVALID = Symbol.for("zod.compile.invalid");
  FALLBACK_FLAG = Symbol.for("zod.compile.fallback");
  WHEN_DEFAULTED_CHECKS = new Set([
    "max_size",
    "min_size",
    "size_equals",
    "max_length",
    "min_length",
    "length_equals"
  ]);
  PATTERN_IS_COMPLETE = new Set([
    "cidrv4",
    "cuid",
    "cuid2",
    "date",
    "datetime",
    "duration",
    "e164",
    "email",
    "emoji",
    "ends_with",
    "guid",
    "includes",
    "ipv4",
    "ksuid",
    "lowercase",
    "mac",
    "nanoid",
    "regex",
    "starts_with",
    "time",
    "ulid",
    "uppercase",
    "uuid",
    "xid"
  ]);
});

// node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
  if (def.checks)
    def.checks = [...def.checks];
  return def;
}
function _string(Class, params) {
  return new Class(snapshotChecks({ type: "string", ...normalizeParams(params) }));
}
function _coercedString(Class, params) {
  return new Class(snapshotChecks({ type: "string", coerce: true, ...normalizeParams(params) }));
}
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class, params) {
  return new Class(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
}
function _coercedNumber(Class, params) {
  return new Class(snapshotChecks({ type: "number", coerce: true, checks: [], ...normalizeParams(params) }));
}
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class, params) {
  return new Class({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class, params) {
  return new Class({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _null2(Class, params) {
  return new Class({
    type: "null",
    ...normalizeParams(params)
  });
}
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class, params) {
  return new Class({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _slugify() {
  return _overwrite((input) => slugify(input));
}
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn, params) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue))
          _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
var init_api = __esm(() => {
  init_checks();
  init_util();
});

// node_modules/zod/v4/core/to-json-schema.js
function assignProps(target, ...sources) {
  for (const source of sources) {
    for (const key of Reflect.ownKeys(source)) {
      if (Object.prototype.propertyIsEnumerable.call(source, key)) {
        assignProp(target, key, source[key]);
      }
    }
  }
  return target;
}
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {}),
    io: params?.io ?? "output",
    counter: 0,
    seen: new Map,
    sharedDefsExtractedFor: undefined,
    sharedEmitDoneFor: undefined,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    intersections: [],
    deferred: [],
    external: params?.external ?? undefined
  };
}
function handleUnrepresentable(schema, ctx, json, params, message) {
  const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({ zodSchema: schema, path: params.path, message }) : ctx.unrepresentable;
  if (result === "any")
    return false;
  if (result === undefined || result === "throw")
    throw new Error(message);
  Object.assign(json, result);
  return true;
}
function processSchema(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
  ctx.seen.set(schema, result);
  ctx.sharedDefsExtractedFor = undefined;
  ctx.sharedEmitDoneFor = undefined;
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      processSchema(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    assignProps(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a = result.schema).default ?? (_a.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function encodeJSONPointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external)
    return;
  const idToSchema = new Map;
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id) => id);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}` };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    if (entry[1] === root && !entry[1].schema.id) {
      return { ref: uriPrefix };
    }
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + encodeJSONPointerSegment(defId) };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema = seen.schema;
    for (const key in schema) {
      delete schema[key];
    }
    schema.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
      }
    }
  }
  if (ctx.external)
    ctx.sharedDefsExtractedFor = ctx.external;
}
function compactTypeUnion(schema) {
  const options = schema.anyOf;
  if (!Array.isArray(options) || options.length === 0 || schema.type !== undefined)
    return;
  const types = [];
  for (const option of options) {
    if (!option || typeof option !== "object")
      return;
    compactTypeUnion(option);
    const keys = Object.keys(option);
    if (keys.length !== 1 || keys[0] !== "type")
      return;
    const type = option.type;
    for (const member of Array.isArray(type) ? type : [type]) {
      if (typeof member !== "string")
        return;
      if (!types.includes(member))
        types.push(member);
    }
  }
  delete schema.anyOf;
  schema.type = types.length === 1 ? types[0] : types;
}
function undeclaredConstraint(member) {
  const extra = member.additionalProperties;
  if (extra === undefined || extra === false || typeof extra !== "object" || extra === null)
    return null;
  return Object.keys(extra).length ? extra : null;
}
function foldObjects(members) {
  const objects = [];
  for (const member of members) {
    if (typeof member !== "object" || member.type !== "object")
      return null;
    for (const key in member) {
      if (!FOLDABLE_KEYS.has(key))
        return null;
    }
    objects.push(member);
  }
  const properties = {};
  const required = new Set;
  for (const object of objects) {
    for (const key in object.properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key))
        continue;
      const parts = [];
      for (const other of objects) {
        const part = other.properties?.[key] ?? undeclaredConstraint(other);
        if (part === null || part === undefined)
          continue;
        if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part)))
          parts.push(part);
      }
      const merged = parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts };
      assignProp(properties, key, merged);
    }
    for (const key of object.required ?? [])
      required.add(key);
  }
  const folded = { type: "object", properties };
  if (required.size)
    folded.required = [...required];
  if (objects.every((object) => object.additionalProperties === false)) {
    folded.additionalProperties = false;
  } else {
    const constraints = [];
    for (const object of objects) {
      const constraint = undeclaredConstraint(object);
      if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
        constraints.push(constraint);
    }
    if (constraints.length === 1)
      folded.additionalProperties = constraints[0];
    else if (constraints.length > 1)
      folded.additionalProperties = { allOf: constraints };
  }
  return folded;
}
function foldIntersection(json) {
  const allOf = json.allOf;
  if (!Array.isArray(allOf) || allOf.length < 2)
    return;
  for (const key of FOLDABLE_KEYS)
    if (key in json)
      return;
  const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
  let folded = null;
  if (!unions.length) {
    folded = foldObjects(allOf);
  } else {
    const union = unions[0];
    const keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
    if (Object.keys(union).length !== 1)
      return;
    const rest = allOf.filter((m) => m !== union);
    const branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
    if (branches.some((b) => !b))
      return;
    folded = { [keyword]: branches };
  }
  if (!folded)
    return;
  delete json.allOf;
  assignProps(json, folded);
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema = seen.def ?? seen.schema;
    const _cached = { ...schema };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema.allOf = schema.allOf ?? [];
        schema.allOf.push(refSchema);
      } else {
        assignProps(schema, refSchema);
      }
      assignProps(schema, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema,
      path: seen.path ?? []
    });
  };
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of [...ctx.seen.entries()].reverse()) {
      flattenRef(entry[0]);
    }
    if (ctx.target !== "openapi-3.0") {
      for (const entry of ctx.seen.entries()) {
        compactTypeUnion(entry[1].def ?? entry[1].schema);
      }
    }
    for (const rewrite of ctx.deferred)
      rewrite();
    if (ctx.intersections.length) {
      const carriers = new Map;
      for (const seen of ctx.seen.values()) {
        for (const json of [seen.schema, seen.def]) {
          const allOf = json?.allOf;
          if (!Array.isArray(allOf))
            continue;
          const existing = carriers.get(allOf);
          if (existing)
            existing.push(json);
          else
            carriers.set(allOf, [json]);
        }
      }
      for (const allOf of ctx.intersections) {
        for (const json of carriers.get(allOf) ?? [])
          foldIntersection(json);
      }
    }
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {}
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== undefined && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        if (seen.def.id === seen.defId)
          delete seen.def.id;
        assignProp(defs, seen.defId, seen.def);
      }
    }
  }
  if (ctx.external)
    ctx.sharedEmitDoneFor = ctx.external;
  if (ctx.external) {} else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
var FOLDABLE_KEYS, UNION_KEYS, createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  processSchema(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
}, createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  processSchema(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var init_to_json_schema = __esm(() => {
  init_registries();
  init_util();
  FOLDABLE_KEYS = new Set(["type", "properties", "required", "additionalProperties"]);
  UNION_KEYS = ["oneOf", "anyOf"];
});

// node_modules/zod/v4/core/json-schema-processors.js
function aggregateChecks(schema) {
  const agg = {};
  const def = schema._zod.def;
  const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
  for (const ch of list)
    contributors[ch._zod.def.check]?.(agg, ch._zod.def);
  const bag = schema._zod.bag;
  if (bag.minimum !== undefined)
    narrowMin(agg, "minimum", bag.minimum);
  if (bag.exclusiveMinimum !== undefined)
    narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
  if (bag.maximum !== undefined)
    narrowMax(agg, "maximum", bag.maximum);
  if (bag.exclusiveMaximum !== undefined)
    narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
  if (bag.multipleOf !== undefined)
    addDivisor(agg, bag.multipleOf);
  if (bag.format !== undefined) {
    agg.format ?? (agg.format = bag.format);
    if (bag.format.includes("int"))
      agg.isInt = true;
  }
  if (bag.mime)
    intersectMime(agg, bag.mime);
  for (const pattern of bag.patterns ?? [])
    addPattern(agg, pattern);
  return agg;
}
function inputOptin(schema) {
  const def = schema._zod.def;
  if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) {
    return inputOptin(def.out);
  }
  if (def.type === "catch") {
    return inputOptin(def.innerType);
  }
  return schema._zod.optin;
}
function stringifyKeyNames(bySchema, json, visited) {
  if (json.$ref) {
    if (visited.has(json))
      return json;
    visited.add(json);
    const def = bySchema.get(json)?.def;
    if (!def)
      return json;
    const inlined = stringifyKeyNames(bySchema, def, visited);
    return inlined === def ? json : inlined;
  }
  for (const keyword of ["anyOf", "oneOf"]) {
    const branches = json[keyword];
    if (!Array.isArray(branches))
      continue;
    const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
    if (mapped.some((branch, i) => branch !== branches[i]))
      json = { ...json, [keyword]: mapped };
  }
  const types = Array.isArray(json.type) ? json.type : [json.type];
  const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
  const values = json.enum ?? (json.const !== undefined ? [json.const] : undefined);
  if (!numericType && !values?.some((v) => typeof v === "number"))
    return json;
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
  if (rest.enum)
    rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
  else if (typeof rest.const === "number")
    rest.const = String(rest.const);
  if (!numericType)
    return rest;
  rest.type = "string";
  if (!values)
    rest.pattern = (types.includes("number") ? number : integer).source;
  return rest;
}
function rewriteKeyNames(ctx) {
  const bySchema = new Map;
  for (const entry of ctx.seen.values()) {
    if (entry.def && !bySchema.has(entry.schema))
      bySchema.set(entry.schema, entry);
  }
  const rewrites = new Map;
  for (const record of pendingRecords.get(ctx) ?? []) {
    const seen = ctx.seen.get(record);
    const names = (seen?.def ?? seen?.schema)?.propertyNames;
    if (!names || names === true || rewrites.has(names))
      continue;
    const rewritten = stringifyKeyNames(bySchema, names, new Set);
    if (rewritten !== names)
      rewrites.set(names, rewritten);
  }
  if (!rewrites.size)
    return;
  for (const entry of ctx.seen.values()) {
    for (const carrier of [entry.schema, entry.def]) {
      const rewritten = carrier && rewrites.get(carrier.propertyNames);
      if (rewritten)
        carrier.propertyNames = rewritten;
    }
  }
}
function serializeDefaultValue(value, schema, ctx, json, params) {
  let unrepresentable = false;
  const serialized = JSON.stringify(value, (_, val) => {
    if (typeof val !== "bigint")
      return val;
    unrepresentable = true;
    return null;
  });
  if (!unrepresentable)
    return JSON.parse(serialized);
  handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
  return UNREPRESENTABLE_DEFAULT;
}
var narrowMin = (agg, key, value) => {
  if (agg[key] === undefined || value > agg[key])
    agg[key] = value;
}, narrowMax = (agg, key, value) => {
  if (agg[key] === undefined || value < agg[key])
    agg[key] = value;
}, narrowBoth = (agg, value) => {
  narrowMin(agg, "minimum", value);
  narrowMax(agg, "maximum", value);
}, addDivisor = (agg, value) => {
  agg.multipleOf ?? (agg.multipleOf = []);
  if (!agg.multipleOf.includes(value))
    agg.multipleOf.push(value);
}, addPattern = (agg, pattern) => {
  agg.patterns ?? (agg.patterns = new Set);
  agg.patterns.add(pattern);
}, intersectMime = (agg, mime) => {
  agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
}, setFormat = (agg, format) => {
  agg.format = format;
  if (format.includes("int"))
    agg.isInt = true;
}, minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum), maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum), formatContributor = (ranges) => (agg, def) => {
  setFormat(agg, def.format);
  const [minimum, maximum] = ranges[def.format];
  narrowMin(agg, "minimum", minimum);
  narrowMax(agg, "maximum", maximum);
}, contributors, formatMap, exactPatterns, exactPattern = (p) => exactPatterns.get(p) ?? p, stringProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  json.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
  if (typeof minimum === "number")
    json.minLength = minimum;
  if (typeof maximum === "number")
    json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "")
      delete json.format;
    if (format === "time" || laxFormat) {
      delete json.format;
    }
  }
  if (contentEncoding)
    json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const patternList = [...patterns].map(exactPattern);
    if (patternList.length === 1)
      json.pattern = patternList[0].source;
    else if (patternList.length > 1) {
      json.allOf = [
        ...patternList.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
}, numberProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
  json.type = isInt ? "integer" : "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json.maximum = maximum;
  }
  if (multipleOf) {
    const divisors = new Set;
    for (const divisor of multipleOf) {
      if (Number.isFinite(divisor) && divisor !== 0)
        divisors.add(Math.abs(divisor));
      else
        handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
    }
    const [first, ...rest] = divisors;
    if (first !== undefined)
      json.multipleOf = first;
    if (rest.length)
      json.allOf = [...json.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
  }
}, booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
}, bigintProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "BigInt cannot be represented in JSON Schema");
}, nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else {
    json.type = "null";
  }
}, neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
}, unknownProcessor = (_schema, _ctx, _json, _params) => {}, dateProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Date cannot be represented in JSON Schema");
}, enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.length === 0) {
    json.not = {};
    return;
  }
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
}, literalProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  if (def.values.length === 0) {
    json.not = {};
    return;
  }
  const vals = [];
  for (const val of def.values) {
    if (val === undefined) {
      if (handleUnrepresentable(schema, ctx, json, params, "Literal `undefined` cannot be represented in JSON Schema"))
        return;
    } else if (typeof val === "bigint") {
      if (handleUnrepresentable(schema, ctx, json, params, "BigInt literals cannot be represented in JSON Schema"))
        return;
      vals.push(Number(val));
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) {} else if (vals.length === 1) {
    const val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.enum = [val];
    } else {
      json.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json.type = "boolean";
    if (vals.every((v) => v === null))
      json.type = "null";
    json.enum = vals;
  }
}, customProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
}, transformProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
}, arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = aggregateChecks(schema);
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = processSchema(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
}, objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const shape = def.shape;
  const symbolKeys = Object.getOwnPropertySymbols(shape);
  if (symbolKeys.length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) {
    return;
  }
  json.type = "object";
  json.properties = {};
  for (const key in shape) {
    assignProp(json.properties, key, processSchema(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    }));
  }
  const requiredKeys = [];
  for (const key of Object.keys(shape)) {
    const field = def.shape[key];
    if (ctx.io === "input" ? inputOptin(field) === undefined : field._zod.optout === undefined) {
      requiredKeys.push(key);
    }
  }
  if (requiredKeys.length > 0) {
    json.required = requiredKeys;
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = processSchema(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
}, unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => processSchema(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
}, intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const a = processSchema(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = processSchema(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
  ctx.intersections.push(allOf);
}, pendingRecords, recordProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  const keyType = def.keyType;
  const patterns = aggregateChecks(keyType).patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json.patternProperties = {};
    for (const pattern of patterns) {
      assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = processSchema(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
      let pending = pendingRecords.get(ctx);
      if (!pending) {
        pending = [];
        pendingRecords.set(ctx, pending);
        ctx.deferred.push(() => rewriteKeyNames(ctx));
      }
      pending.push(schema);
    }
    json.additionalProperties = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== undefined;
  if (keyValues && !def.partial && !omittableOnInput) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json.required = validKeyValues.map(String);
    }
  }
}, nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
}, nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
}, UNREPRESENTABLE_DEFAULT, defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT)
    json.default = value;
}, prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io !== "input")
    return;
  const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT)
    json._prefault = value;
}, catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
    return;
  }
  json.default = catchValue;
}, pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  processSchema(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
}, readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
}, optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var init_json_schema_processors = __esm(() => {
  init_regexes();
  init_schemas();
  init_to_json_schema();
  init_util();
  contributors = {
    greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
    less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
    multiple_of: (agg, def) => addDivisor(agg, def.value),
    number_format: formatContributor(NUMBER_FORMAT_RANGES),
    bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
    min_length: minContributor,
    max_length: maxContributor,
    length_equals: (agg, def) => narrowBoth(agg, def.length),
    min_size: minContributor,
    max_size: maxContributor,
    size_equals: (agg, def) => narrowBoth(agg, def.size),
    string_format: (agg, def) => {
      setFormat(agg, def.format);
      if (def.pattern)
        addPattern(agg, def.pattern);
      if (def.format === "base64" || def.format === "base64url")
        agg.contentEncoding = def.format;
      if (def.local || def.precision === -1)
        agg.laxFormat = true;
    },
    mime_type: (agg, def) => intersectMime(agg, def.mime)
  };
  formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
  };
  exactPatterns = new Map([
    [base64Charset, base64],
    [base64urlCharset, base64url]
  ]);
  pendingRecords = new WeakMap;
  UNREPRESENTABLE_DEFAULT = Symbol();
});

// node_modules/zod/v4/core/json-schema.js
var init_json_schema = () => {};

// node_modules/zod/v4/core/index.js
var init_core2 = __esm(() => {
  init_util();
  init_regexes();
  init_locales();
  init_json_schema();
  init_core();
  init_parse();
  init_errors();
  init_schemas();
  init_memoizer();
  init_checks();
  init_versions();
  init_registries();
  init_compile();
  init_api();
  init_to_json_schema();
});

// node_modules/zod/v4/classic/checks.js
var init_checks2 = __esm(() => {
  init_core2();
});

// node_modules/zod/v4/classic/errors.js
function _lazyMethod(proto, key, make) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get() {
      const value = make(this);
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
      return value;
    },
    set(value) {
      Object.defineProperty(this, key, { value, configurable: true, writable: true });
    }
  });
}
var _installedErrorProtos, initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  const proto = Object.getPrototypeOf(inst);
  if (_installedErrorProtos.has(proto))
    return;
  _installedErrorProtos.add(proto);
  _lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
  _lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
  _lazyMethod(proto, "addIssue", (self) => (issue) => {
    self.issues.push(issue);
    self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
  });
  _lazyMethod(proto, "addIssues", (self) => (issues) => {
    self.issues.push(...issues);
    self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
  });
  Object.defineProperty(proto, "isEmpty", {
    configurable: true,
    enumerable: false,
    get() {
      return this.issues.length === 0;
    }
  });
}, ZodRealError;
var init_errors2 = __esm(() => {
  init_core2();
  init_core2();
  init_util();
  _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
  ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, undefined, {
    Parent: Error
  });
});

// node_modules/zod/v4/classic/parse.js
var parse2, parseAsync, safeParse, safeParseAsync, encode, decode, encodeAsync, decodeAsync, safeEncode, safeDecode, safeEncodeAsync, safeDecodeAsync;
var init_parse2 = __esm(() => {
  init_core2();
  init_errors2();
  init_core2();
  parse2 = /* @__PURE__ */ _parse(ZodRealError);
  parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
  safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
  safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  encode = /* @__PURE__ */ _encode(ZodRealError);
  decode = /* @__PURE__ */ _decode(ZodRealError);
  encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
  decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
  safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
  safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
  safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
});

// node_modules/zod/v4/classic/schemas.js
function _ensureDefaultLocale() {
  if (!globalConfig.localeError)
    config(en_default());
}
function _ensureDefaultMemoizer() {
  if (!globalConfig.memoizer)
    config({ memoizer: memoizer() });
}
function string2(params) {
  return _string(ZodString, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function _null3(params) {
  return _null2(ZodNull, params);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string2(),
      valueType: keyType,
      ...normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : constantCatch(catchValue)
  });
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return _superRefine(fn, params);
}
var ZodType, _ZodString, ZodString, ZodStringFormat, ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodNumber, ZodNumberFormat, ZodBoolean, ZodBigInt, ZodNull, ZodUnknown, ZodNever, ZodDate, ZodArray, ZodObject, ZodUnion, ZodDiscriminatedUnion, ZodIntersection, ZodRecord, ZodEnum, ZodLiteral, ZodTransform, ZodOptional, ZodExactOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodCatch, ZodPipe, ZodReadonly, ZodCustom;
var init_schemas2 = __esm(() => {
  init_core2();
  init_core2();
  init_json_schema_processors();
  init_to_json_schema();
  init_en();
  init_checks2();
  init_parse2();
  ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    _ensureDefaultLocale();
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    return inst;
  }, {
    check(...chks) {
      const def = this.def;
      return this.clone(mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def, params) {
      return clone(this, def, params);
    },
    brand() {
      return this;
    },
    register(reg, meta) {
      reg.add(this, meta);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(undefined).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn, ...args) {
      return args.length === 0 ? fn(this) : fn(this, ...args);
    },
    get "~standard"() {
      return hide(this, "~standard", {
        ...standardProps(this),
        jsonSchema: {
          input: createStandardJSONSchemaMethod(this, "input"),
          output: createStandardJSONSchemaMethod(this, "output")
        }
      });
    },
    set "~standard"(value) {
      own(this, "~standard", value);
    },
    parse: function _parse(data, params) {
      return parse2(this, data, params, { callee: _parse });
    },
    parseAsync: async function _parseAsync(data, params) {
      return await parseAsync(this, data, params, { callee: _parseAsync });
    },
    safeParse(data, params) {
      return safeParse(this, data, params);
    },
    async safeParseAsync(data, params) {
      return safeParseAsync(this, data, params);
    },
    get spa() {
      return this?.safeParseAsync;
    },
    set spa(value) {
      own(this, "spa", value);
    },
    validate(data, params) {
      return validate(this, data, params);
    },
    validateAsync(data, params) {
      return validateAsync(this, data, params);
    },
    encode: function _encode(data, params) {
      return encode(this, data, params, { callee: _encode });
    },
    decode: function _decode(data, params) {
      return decode(this, data, params, { callee: _decode });
    },
    encodeAsync: async function _encodeAsync(data, params) {
      return await encodeAsync(this, data, params, { callee: _encodeAsync });
    },
    decodeAsync: async function _decodeAsync(data, params) {
      return await decodeAsync(this, data, params, { callee: _decodeAsync });
    },
    safeEncode(data, params) {
      return safeEncode(this, data, params);
    },
    safeDecode(data, params) {
      return safeDecode(this, data, params);
    },
    async safeEncodeAsync(data, params) {
      return safeEncodeAsync(this, data, params);
    },
    async safeDecodeAsync(data, params) {
      return safeDecodeAsync(this, data, params);
    },
    toJSONSchema(params) {
      return createToJSONSchemaMethod(this, {})(params);
    },
    get description() {
      return globalRegistry.get(this)?.description;
    },
    get _def() {
      return this._zod.def;
    }
  });
  _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
  }, /* @__PURE__ */ derived({
    format: (inst) => aggregateChecks(inst).format ?? null,
    minLength: (inst) => aggregateChecks(inst).minimum ?? null,
    maxLength: (inst) => aggregateChecks(inst).maximum ?? null
  }, {
    regex(...args) {
      return this.check(_regex(...args));
    },
    includes(...args) {
      return this.check(_includes(...args));
    },
    startsWith(...args) {
      return this.check(_startsWith(...args));
    },
    endsWith(...args) {
      return this.check(_endsWith(...args));
    },
    min(...args) {
      return this.check(_minLength(...args));
    },
    max(...args) {
      return this.check(_maxLength(...args));
    },
    length(...args) {
      return this.check(_length(...args));
    },
    nonempty(...args) {
      return this.check(_minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(_lowercase(params));
    },
    uppercase(params) {
      return this.check(_uppercase(params));
    },
    trim() {
      return this.check(_trim());
    },
    normalize(...args) {
      return this.check(_normalize(...args));
    },
    toLowerCase() {
      return this.check(_toLowerCase());
    },
    toUpperCase() {
      return this.check(_toUpperCase());
    },
    slugify() {
      return this.check(_slugify());
    }
  }));
  ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
  }, {
    email(params) {
      return this.check(_email(ZodEmail, params));
    },
    url(params) {
      return this.check(_url(ZodURL, params));
    },
    jwt(params) {
      return this.check(_jwt(ZodJWT, params));
    },
    emoji(params) {
      return this.check(_emoji2(ZodEmoji, params));
    },
    guid(params) {
      return this.check(_guid(ZodGUID, params));
    },
    uuid(params) {
      return this.check(_uuid(ZodUUID, params));
    },
    uuidv4(params) {
      return this.check(_uuidv4(ZodUUID, params));
    },
    uuidv6(params) {
      return this.check(_uuidv6(ZodUUID, params));
    },
    uuidv7(params) {
      return this.check(_uuidv7(ZodUUID, params));
    },
    nanoid(params) {
      return this.check(_nanoid(ZodNanoID, params));
    },
    cuid(params) {
      return this.check(_cuid(ZodCUID, params));
    },
    cuid2(params) {
      return this.check(_cuid2(ZodCUID2, params));
    },
    ulid(params) {
      return this.check(_ulid(ZodULID, params));
    },
    base64(params) {
      return this.check(_base64(ZodBase64, params));
    },
    base64url(params) {
      return this.check(_base64url(ZodBase64URL, params));
    },
    xid(params) {
      return this.check(_xid(ZodXID, params));
    },
    ksuid(params) {
      return this.check(_ksuid(ZodKSUID, params));
    },
    ipv4(params) {
      return this.check(_ipv4(ZodIPv4, params));
    },
    ipv6(params) {
      return this.check(_ipv6(ZodIPv6, params));
    },
    cidrv4(params) {
      return this.check(_cidrv4(ZodCIDRv4, params));
    },
    cidrv6(params) {
      return this.check(_cidrv6(ZodCIDRv6, params));
    },
    e164(params) {
      return this.check(_e164(ZodE164, params));
    },
    datetime(params) {
      return this.check(_isoDateTime(ZodISODateTime, params));
    },
    date(params) {
      return this.check(_isoDate(ZodISODate, params));
    },
    time(params) {
      return this.check(_isoTime(ZodISOTime, params));
    },
    duration(params) {
      return this.check(_isoDuration(ZodISODuration, params));
    }
  });
  ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
    inst.isFinite = true;
  }, /* @__PURE__ */ derived({
    minValue: (inst) => {
      const { minimum, exclusiveMinimum } = aggregateChecks(inst);
      return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
    },
    maxValue: (inst) => {
      const { maximum, exclusiveMaximum } = aggregateChecks(inst);
      return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
    },
    isInt: (inst) => {
      const { isInt, multipleOf } = aggregateChecks(inst);
      return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
    },
    format: (inst) => aggregateChecks(inst).format ?? null
  }, {
    gt(value, params) {
      return this.check(_gt(value, params));
    },
    gte(value, params) {
      return this.check(_gte(value, params));
    },
    min(value, params) {
      return this.check(_gte(value, params));
    },
    lt(value, params) {
      return this.check(_lt(value, params));
    },
    lte(value, params) {
      return this.check(_lte(value, params));
    },
    max(value, params) {
      return this.check(_lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(_gt(0, params));
    },
    nonnegative(params) {
      return this.check(_gte(0, params));
    },
    negative(params) {
      return this.check(_lt(0, params));
    },
    nonpositive(params) {
      return this.check(_lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(_multipleOf(value, params));
    },
    step(value, params) {
      return this.check(_multipleOf(value, params));
    },
    finite() {
      return this;
    }
  }));
  ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
  });
  ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => bigintProcessor(inst, ctx, json, params);
  }, /* @__PURE__ */ derived({
    minValue: (inst) => aggregateChecks(inst).minimum ?? null,
    maxValue: (inst) => aggregateChecks(inst).maximum ?? null,
    format: (inst) => aggregateChecks(inst).format ?? null
  }, {
    gte(value, params) {
      return this.check(_gte(value, params));
    },
    min(value, params) {
      return this.check(_gte(value, params));
    },
    gt(value, params) {
      return this.check(_gt(value, params));
    },
    lt(value, params) {
      return this.check(_lt(value, params));
    },
    lte(value, params) {
      return this.check(_lte(value, params));
    },
    max(value, params) {
      return this.check(_lte(value, params));
    },
    positive(params) {
      return this.check(_gt(BigInt(0), params));
    },
    negative(params) {
      return this.check(_lt(BigInt(0), params));
    },
    nonpositive(params) {
      return this.check(_lte(BigInt(0), params));
    },
    nonnegative(params) {
      return this.check(_gte(BigInt(0), params));
    },
    multipleOf(value, params) {
      return this.check(_multipleOf(value, params));
    }
  }));
  ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
  });
  ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
  });
  ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
  });
  ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => dateProcessor(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
  }, /* @__PURE__ */ derived({
    minDate: (inst) => {
      const { minimum } = aggregateChecks(inst);
      return minimum ? new Date(minimum) : null;
    },
    maxDate: (inst) => {
      const { maximum } = aggregateChecks(inst);
      return maximum ? new Date(maximum) : null;
    }
  }, {}));
  ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
  }, {
    min(n, params) {
      return this.check(_minLength(n, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n, params) {
      return this.check(_maxLength(n, params));
    },
    length(n, params) {
      return this.check(_length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
  ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
  }, {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone(mergeDefs(this._zod.def, { catchall }));
    },
    passthrough() {
      return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    loose() {
      return this.clone(mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    strict() {
      return this.clone(mergeDefs(this._zod.def, { catchall: never() }));
    },
    strip() {
      return this.clone(mergeDefs(this._zod.def, { catchall: undefined }));
    },
    extend(incoming) {
      return extend(this, incoming);
    },
    safeExtend(incoming) {
      return safeExtend(this, incoming);
    },
    merge(other) {
      return merge(this, other);
    },
    pick(mask) {
      return pick(this, mask);
    },
    omit(mask) {
      return omit(this, mask);
    },
    partial(...args) {
      return partial(ZodOptional, this, args[0]);
    },
    exactPartial(...args) {
      return partial(ZodExactOptional, this, args[0], "exactPartial");
    },
    required(...args) {
      return required(ZodNonOptional, this, args[0]);
    }
  });
  ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = [...inst._zod.values];
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...normalizeParams(params),
        entries: newEntries
      });
    };
  });
  ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          if (!("input" in _issue))
            _issue.input = payload.value;
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output) => {
          payload.value = output;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
  });
});

// node_modules/zod/v4/classic/compat.js
var ZodFirstPartyTypeKind;
var init_compat = __esm(() => {
  (function(ZodFirstPartyTypeKind) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});

// node_modules/zod/v4/classic/iso.js
var init_iso = () => {};

// node_modules/zod/v4/classic/coerce.js
var exports_coerce = {};
__export(exports_coerce, {
  bigint: () => bigint2,
  boolean: () => boolean3,
  date: () => date2,
  number: () => number3,
  string: () => string3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint2(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date2(params) {
  return _coercedDate(ZodDate, params);
}
var init_coerce = __esm(() => {
  init_core2();
  init_schemas2();
});

// node_modules/zod/v4/classic/external.js
var init_external = __esm(() => {
  init_core2();
  init_locales();
  init_iso();
  init_coerce();
  init_schemas2();
  init_checks2();
  init_errors2();
  init_parse2();
  init_compat();
});

// node_modules/zod/index.js
var init_zod = __esm(() => {
  init_external();
  init_external();
});

// src/core/scales.ts
var triageScales, scaleValues;
var init_scales = __esm(() => {
  triageScales = ["priority", "severity", "frequency", "agreement"];
  scaleValues = {
    priority: ["must", "should", "nice", "no"],
    severity: ["critical", "noticeable", "minor", "none"],
    frequency: ["daily", "weekly", "rarely", "never"],
    agreement: ["yes", "rather", "unsure", "no"]
  };
});

// src/core/pulse.ts
function inPulse(p, doneMeans, today) {
  if (p.stage === "dropped")
    return false;
  if (p.snoozed && p.snoozed > (today ?? localDate()))
    return false;
  if (p.stage !== "done")
    return true;
  if (!doneMeans)
    return false;
  if (doneMeans === "never")
    return true;
  return reachIndex(p.reach) < reachIndex(doneMeans);
}
function elo(days, ids, k = K) {
  const r = new Map(ids.map((id) => [id, START]));
  const expect = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));
  for (const day of [...days].sort(byDate))
    for (const { win, over, neither } of day.duels) {
      if (!r.has(win) || !r.has(over))
        continue;
      if (neither) {
        const [a, b] = [r.get(win), r.get(over)];
        r.set(win, a - k * expect(a, START));
        r.set(over, b - k * expect(b, START));
        continue;
      }
      const expected = 1 / (1 + 10 ** ((r.get(over) - r.get(win)) / 400));
      r.set(win, r.get(win) + k * (1 - expected));
      r.set(over, r.get(over) - k * (1 - expected));
    }
  return r;
}
function rank(days, ids, opts = {}) {
  const mine = opts.voter ? days.filter((d) => voterSlug(d.voter) === voterSlug(opts.voter)) : days;
  const today = opts.today ?? localDate();
  const now = elo(mine, ids, opts.k);
  const weekAgo = elo(mine.filter((d) => d.date <= daysBefore(today, 7)), ids, opts.k);
  const calls = new Map;
  for (const d of [...mine].sort(byDate))
    for (const { win, over, neither } of d.duels) {
      if (neither)
        continue;
      const key = pairKey(win, over);
      if (!calls.has(key))
        calls.set(key, new Map);
      calls.get(key).set(voterSlug(d.voter), win);
    }
  const contested = new Map;
  for (const [key, who] of calls) {
    const winners = [...who.values()];
    const [a] = key.split("|");
    const share = winners.filter((w) => w === a).length / winners.length;
    if (winners.length >= 2 && Math.min(share, 1 - share) >= 0.3)
      for (const id of key.split("|"))
        contested.set(id, (contested.get(id) ?? 0) + 1);
  }
  return ids.map((id) => {
    let wins = 0;
    let losses = 0;
    for (const d of mine)
      for (const x of d.duels) {
        if (x.win === id && !x.neither)
          wins++;
        if (x.over === id || x.neither && x.win === id)
          losses++;
      }
    return {
      id,
      rating: Math.round(now.get(id)),
      delta: Math.round(now.get(id) - weekAgo.get(id)),
      wins,
      losses,
      split: (contested.get(id) ?? 0) >= 2
    };
  }).sort((a, b) => b.rating - a.rating || b.wins + b.losses - (a.wins + a.losses) || a.id.localeCompare(b.id));
}
function addDuel(days, voter, date, duel, undo = false) {
  const i = days.findIndex((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter));
  const day = i >= 0 ? { ...days[i], duels: [...days[i].duels] } : { voter, date, duels: [] };
  if (undo) {
    const key = pairKey(duel.win, duel.over);
    const j = day.duels.findLastIndex((d) => pairKey(d.win, d.over) === key);
    if (j >= 0)
      day.duels.splice(j, 1);
  } else
    day.duels.push(duel.neither ? { win: duel.win, over: duel.over, neither: true } : { win: duel.win, over: duel.over });
  const rest = days.filter((_, j) => j !== i);
  return day.duels.length || day.unclear?.length ? [...rest, day] : rest;
}
function markUnclear(days, voter, date, project, undo = false) {
  const i = days.findIndex((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter));
  const day = i >= 0 ? { ...days[i], unclear: [...days[i].unclear ?? []] } : { voter, date, duels: [], unclear: [] };
  day.unclear = undo ? day.unclear.filter((id) => id !== project) : [...new Set([...day.unclear, project])];
  const rest = days.filter((_, j) => j !== i);
  return day.duels.length || day.unclear.length ? [...rest, day] : rest;
}
function nextTasks(ranking, projects, n = 3) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out = [];
  ranking.forEach((id, i) => {
    const task = byId.get(id)?.next?.[0];
    if (task && out.length < n)
      out.push({ id, task, place: i + 1 });
  });
  return out;
}
var START = 1500, K = 32, DAILY = 5, reaches, reachIndex = (r) => Math.max(0, reaches.indexOf(r ?? "unreleased")), voterSlug = (name) => name.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036F]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "anonymous", localDate = (d = new Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, daysBefore = (date, n) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - n);
  return localDate(d);
}, byDate = (a, b) => a.date.localeCompare(b.date) || a.voter.localeCompare(b.voter), pairKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`, isDuel = (d) => !!d && typeof d.win === "string" && typeof d.over === "string" && d.win !== d.over, duelsToday = (days, voter, today) => days.find((d) => d.date === today && voterSlug(d.voter) === voterSlug(voter))?.duels.length ?? 0, mayDuel = (days, voter, today, cfg = {}) => cfg.more !== false || duelsToday(days, voter, today) < (cfg.daily ?? DAILY);
var init_pulse = __esm(() => {
  reaches = ["unreleased", "ready", "released", "launched", "marketing", "customers", "improving"];
});

// src/core/schema.ts
var id, text, strList, timeValue, levels, stages, sizes, phases, Participant, visualBase, story, StatesVisual, TablesVisual, flowKinds, FlowVisual, SequenceVisual, cell, MatrixVisual, PrototypeVisual, MermaidVisual, ImageVisual, HtmlVisual, MarkdownVisual, Visual, stepBase, Option, SlideStep, TriageStep, ChoiceStep, QuestionStep, PollStep, CheckpointStep, Step, SessionHeader, Section, StepResult, Annotation, Results, Stream, ProductConfig, When, Metric, LinearRef, Lighthouse, Vision, Initiative, depKinds, Project, Request, CommentTarget, Comment, Thread, CommentsFile;
var init_schema = __esm(() => {
  init_zod();
  init_scales();
  init_pulse();
  init_pulse();
  id = string2().regex(/^[a-z0-9][a-z0-9._-]*$/i, "ids are kebab-case: letters, digits, - _ .");
  text = string2();
  strList = array(exports_coerce.string());
  timeValue = union([string2(), number2()]).transform(String);
  levels = ["product", "ux", "tech", "business"];
  stages = [
    "idea",
    "exploring",
    "prototyping",
    "kickoff",
    "scoped",
    "building",
    "rollout",
    "measuring",
    "done",
    "paused",
    "dropped"
  ];
  sizes = ["xs", "s", "m", "l", "xl"];
  phases = ["context", "problem", "solution", "decisions", "wrapup"];
  Participant = object({
    name: string2(),
    role: string2().optional(),
    kind: _enum(["user", "decider", "tech", "expert", "facilitator"]).optional()
  });
  visualBase = { caption: text.optional(), height: number2().optional() };
  story = array(object({ at: exports_coerce.string(), text })).optional();
  StatesVisual = object({
    type: literal("states"),
    ...visualBase,
    story,
    direction: _enum(["LR", "TB"]).optional(),
    states: array(object({
      id,
      label: text.optional(),
      kind: _enum(["initial", "final", "normal"]).optional(),
      note: text.optional()
    })).min(1),
    transitions: array(object({
      from: string2(),
      to: string2(),
      label: text.optional(),
      by: text.optional(),
      note: text.optional()
    })).default([])
  });
  TablesVisual = object({
    type: literal("tables"),
    ...visualBase,
    tables: array(object({
      name: string2(),
      note: text.optional(),
      columns: array(object({
        name: string2(),
        type: text.optional(),
        pk: boolean2().optional(),
        fk: string2().optional(),
        nullable: boolean2().optional(),
        note: text.optional()
      })).default([])
    })).min(1)
  });
  flowKinds = ["system", "external", "ai", "human", "store"];
  FlowVisual = object({
    type: literal("flow"),
    ...visualBase,
    story,
    direction: _enum(["LR", "TB"]).optional(),
    nodes: array(object({
      id: string2(),
      label: text.optional(),
      sub: text.optional(),
      kind: _enum(flowKinds).optional()
    })).min(1),
    edges: array(object({
      from: string2(),
      to: string2(),
      label: text.optional(),
      dashed: boolean2().optional()
    })).default([])
  });
  SequenceVisual = object({
    type: literal("sequence"),
    ...visualBase,
    story,
    actors: strList.min(2),
    messages: array(object({
      from: string2(),
      to: string2(),
      label: text.optional(),
      dashed: boolean2().optional(),
      note: text.optional()
    })).default([])
  });
  cell = union([string2(), number2(), boolean2(), _null3()]);
  MatrixVisual = object({
    type: literal("matrix"),
    ...visualBase,
    columns: strList.min(1),
    rows: array(array(cell).min(1)).default([]),
    highlight: exports_coerce.string().optional()
  });
  PrototypeVisual = object({
    type: literal("prototype"),
    ...visualBase,
    src: string2(),
    focus: string2().optional()
  });
  MermaidVisual = object({ type: literal("mermaid"), ...visualBase, code: string2() });
  ImageVisual = object({ type: literal("image"), ...visualBase, src: string2(), alt: text.optional() });
  HtmlVisual = object({ type: literal("html"), ...visualBase, html: string2() });
  MarkdownVisual = object({ type: literal("markdown"), ...visualBase, text: string2() });
  Visual = discriminatedUnion("type", [
    PrototypeVisual,
    StatesVisual,
    TablesVisual,
    FlowVisual,
    SequenceVisual,
    MatrixVisual,
    MermaidVisual,
    ImageVisual,
    HtmlVisual,
    MarkdownVisual
  ]);
  stepBase = {
    id,
    title: text,
    body: text.optional(),
    visual: Visual.optional(),
    visuals: array(Visual).optional(),
    level: _enum(levels).optional(),
    decider: union([string2(), strList]).optional(),
    timing: _enum(["now", "later"]).optional(),
    reversibility: _enum(["one-way", "two-way"]).optional(),
    tags: strList.optional(),
    links: array(object({ label: text, url: string2() })).optional(),
    notes: text.optional(),
    problem: text.optional(),
    why: text.optional(),
    facts: strList.optional()
  };
  Option = object({
    id,
    label: text,
    summary: text.optional(),
    body: text.optional(),
    visual: Visual.optional(),
    visuals: array(Visual).optional(),
    pros: strList.optional(),
    cons: strList.optional(),
    effort: exports_coerce.string().optional(),
    consequence: text.optional(),
    enables: strList.optional(),
    forecloses: strList.optional(),
    baseline: boolean2().optional(),
    requestId: string2().optional()
  });
  SlideStep = object({ type: literal("slide"), ...stepBase });
  TriageStep = object({ type: literal("triage"), ...stepBase, scale: _enum(triageScales).default("priority") });
  ChoiceStep = object({
    type: literal("choice"),
    ...stepBase,
    options: array(Option).min(1),
    recommended: string2().optional(),
    because: text.optional(),
    baseline: string2().optional(),
    allowOther: boolean2().default(true)
  });
  QuestionStep = object({
    type: literal("question"),
    ...stepBase,
    placeholder: text.optional()
  });
  PollStep = object({
    type: literal("poll"),
    ...stepBase,
    answers: strList.min(2).default(["yes", "maybe", "no"])
  });
  CheckpointStep = object({
    type: literal("checkpoint"),
    ...stepBase,
    of: strList.optional()
  });
  Step = discriminatedUnion("type", [SlideStep, TriageStep, ChoiceStep, QuestionStep, PollStep, CheckpointStep]);
  SessionHeader = object({
    id,
    title: text,
    kind: _enum(["exploration", "kickoff", "tech-review", "review", "rollout-review"]).default("kickoff"),
    status: _enum(["draft", "planned", "live", "done"]).default("draft"),
    date: timeValue.optional(),
    duration: number2().optional(),
    goal: text.optional(),
    participants: array(Participant).default([])
  });
  Section = object({
    id,
    title: text,
    phase: _enum(phases).default("decisions"),
    steps: array(unknown()).default([])
  });
  StepResult = object({
    status: _enum(["decided", "deferred", "escalated", "skipped"]).optional(),
    value: string2().optional(),
    other: object({
      text: string2().optional(),
      sketch: string2().optional(),
      requestId: string2().optional()
    }).optional(),
    note: string2().optional(),
    reason: string2().optional(),
    votes: record(string2(), string2()).optional(),
    at: string2().optional()
  });
  Annotation = object({
    id: string2(),
    step: string2().optional(),
    src: string2(),
    selector: string2().optional(),
    label: string2().optional(),
    x: number2().optional(),
    y: number2().optional(),
    kind: _enum(["change", "question", "idea", "praise"]).default("change"),
    text: string2(),
    author: string2().optional(),
    at: string2().optional()
  });
  Results = object({
    session: string2(),
    startedAt: string2().optional(),
    updatedAt: string2().optional(),
    current: string2().optional(),
    steps: record(string2(), StepResult).default({}),
    annotations: array(Annotation).default([])
  });
  Stream = object({
    id,
    name: text,
    capacity: number2().positive().default(1),
    color: string2().optional()
  });
  ProductConfig = object({
    name: text,
    locale: _enum(["en", "de"]).default("en"),
    today: timeValue.optional(),
    brand: object({ css: string2().optional(), notes: string2().optional() }).optional(),
    roadmap: object({ streams: array(Stream).default([]) }).default({ streams: [] }),
    integrations: record(string2(), unknown()).optional(),
    agent: object({
      preset: _enum(["claude", "codex", "opencode", "pi"]).optional(),
      command: string2().optional(),
      model: string2().optional(),
      timeout: number2().default(900),
      concurrency: number2().int().min(1).max(4).default(1)
    }).optional(),
    profile: object({
      kind: _enum(["personal", "company"]).optional(),
      goals: strList.optional(),
      doneMeans: _enum([...reaches, "never"]).optional(),
      focus: number2().int().min(1).optional(),
      capacity: text.optional()
    }).optional(),
    pulse: object({
      daily: number2().int().min(1).optional(),
      more: boolean2().optional(),
      kill: boolean2().optional(),
      anonymous: boolean2().optional(),
      k: number2().positive().optional()
    }).optional()
  });
  When = object({ start: timeValue.optional(), end: timeValue.optional(), from: _enum(["linear", "manual", "estimate"]).optional() });
  Metric = object({
    name: text,
    baseline: exports_coerce.string().optional(),
    target: exports_coerce.string().optional(),
    current: exports_coerce.string().optional(),
    source: unknown().optional()
  });
  LinearRef = object({ id: string2().optional(), url: string2().optional() });
  Lighthouse = object({ id, name: text, when: timeValue.optional(), description: text.optional() });
  Vision = object({
    northStar: text.optional(),
    lighthouses: array(Lighthouse).default([])
  });
  Initiative = object({
    id,
    name: text,
    summary: text.optional(),
    status: _enum(["planned", "active", "done", "dropped"]).default("active"),
    when: When.optional(),
    lighthouse: string2().optional(),
    metric: Metric.optional(),
    color: string2().optional(),
    linear: LinearRef.optional()
  });
  depKinds = ["hard", "tight", "loose"];
  Project = object({
    id,
    name: text,
    summary: text.optional(),
    initiatives: strList.default([]),
    stage: _enum(stages).default("idea"),
    priority: _enum(["urgent", "high", "medium", "low"]).default("medium"),
    reach: _enum(reaches).optional(),
    openSource: boolean2().optional(),
    snoozed: timeValue.optional(),
    next: union([text, array(exports_coerce.string())]).transform((v) => (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean).slice(0, 3)).optional(),
    size: _enum(sizes).optional(),
    confidence: _enum(["high", "medium", "low"]).default("medium"),
    stream: string2().optional(),
    when: When.optional(),
    dependsOn: array(object({ on: string2(), kind: _enum(depKinds).default("loose"), note: text.optional() })).default([]),
    owner: text.optional(),
    stakeholders: array(Participant).default([]),
    metrics: array(Metric).default([]),
    linear: LinearRef.optional()
  });
  Request = object({
    id: string2(),
    kind: _enum(["option", "revise-option", "revise-step", "visual", "step", "prototype", "comment"]),
    project: string2(),
    thread: string2().optional(),
    threads: array(string2()).optional(),
    session: string2().optional(),
    step: string2().optional(),
    option: string2().optional(),
    text: string2().default(""),
    sketch: string2().optional(),
    author: string2().optional(),
    status: _enum(["open", "working", "done", "failed", "cancelled"]).default("open"),
    message: string2().optional(),
    createdAt: string2(),
    updatedAt: string2().optional(),
    startedAt: string2().optional(),
    finishedAt: string2().optional(),
    owner: object({ mode: _enum(["server", "worker", "listen"]), pid: number2().optional(), agent: string2().optional() }).optional(),
    log: array(object({ at: string2(), kind: _enum(["text", "tool", "status", "error"]), text: string2() })).default([])
  });
  CommentTarget = discriminatedUnion("kind", [
    object({ kind: literal("text"), file: string2(), quote: string2(), line: number2().optional(), section: string2().optional() }),
    object({ kind: literal("step"), file: string2(), step: string2(), option: string2().optional(), field: string2().optional() }),
    object({ kind: literal("element"), file: string2(), step: string2().optional(), option: string2().optional(), element: string2(), label: string2().optional() }),
    object({ kind: literal("prototype"), file: string2(), selector: string2().optional(), label: string2().optional(), x: number2().optional(), y: number2().optional() }),
    object({ kind: literal("file"), file: string2() })
  ]);
  Comment = object({
    id: string2(),
    author: string2().default("someone"),
    text: string2(),
    at: string2(),
    agent: boolean2().optional()
  });
  Thread = object({
    id: string2(),
    target: CommentTarget,
    status: _enum(["open", "resolved"]).default("open"),
    comments: array(Comment).min(1),
    createdAt: string2(),
    resolvedAt: string2().optional(),
    resolvedBy: string2().optional()
  });
  CommentsFile = object({ threads: array(Thread).default([]) });
});

// src/core/analysis.ts
function analyze(input) {
  const { projects, config } = input;
  const byId = new Map(projects.map((p) => [p.id, p]));
  const active = projects.filter((p) => activeStage(p.stage));
  const conflicts = [];
  for (const p of active) {
    for (const d of p.dependsOn) {
      const dep = byId.get(d.on);
      if (!dep || dep.stage === "done" || d.kind !== "hard")
        continue;
      if (dep.stage === "dropped") {
        conflicts.push({ project: p.id, on: dep.id, message: `${p.name} is blocked by ${dep.name}, which was dropped` });
        continue;
      }
      if (p.span && !dep.span)
        conflicts.push({ project: p.id, on: dep.id, message: `${p.name} is scheduled, but its blocker ${dep.name} is not` });
      else if (p.span && dep.span && p.span.start <= dep.span.end)
        conflicts.push({
          project: p.id,
          on: dep.id,
          message: `${p.name} starts ${p.span.start}, before its blocker ${dep.name} ends ${dep.span.end}`
        });
    }
  }
  const cycles = [];
  const state = new Map;
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (d.kind !== "hard" || !byId.has(d.on))
        continue;
      const s = state.get(d.on) ?? 0;
      if (s === 1)
        cycles.push([...stack.slice(stack.indexOf(d.on)), d.on]);
      else if (s === 0)
        visit(d.on);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const p of projects)
    if (!state.get(p.id))
      visit(p.id);
  const dependents = new Map;
  for (const p of active)
    for (const d of p.dependsOn)
      if (d.kind !== "loose") {
        if (!dependents.has(d.on))
          dependents.set(d.on, new Set);
        dependents.get(d.on).add(p.id);
      }
  const transitive = (id, seen = new Set) => {
    for (const x of dependents.get(id) ?? [])
      if (!seen.has(x)) {
        seen.add(x);
        transitive(x, seen);
      }
    return seen;
  };
  const bottlenecks = active.map((p) => ({ project: p.id, dependents: [...transitive(p.id)] })).filter((b) => b.dependents.length >= 2).sort((a, b) => b.dependents.length - a.dependents.length);
  const coupled = new Set;
  for (const p of active)
    for (const d of p.dependsOn) {
      const dep = byId.get(d.on);
      if (d.kind === "loose" || !dep || !activeStage(dep.stage))
        continue;
      coupled.add(p.id);
      coupled.add(d.on);
    }
  const delegatable = active.filter((p) => !coupled.has(p.id) && !["xl", "l"].includes(p.size ?? "m") && p.stage !== "paused").map((p) => p.id);
  const load = {};
  const overload = [];
  for (const stream of config.roadmap.streams) {
    const items = active.filter((p) => p.stream === stream.id && p.span && (p.span.resolution === "day" || p.span.resolution === "month") && p.stage !== "paused");
    if (!items.length)
      continue;
    const from = weekStart(items.reduce((m, p) => p.span.start < m ? p.span.start : m, items[0].span.start));
    const to = items.reduce((m, p) => p.span.end > m ? p.span.end : m, items[0].span.end);
    const weeks = [];
    for (let w = from;w <= to; w = addDays(w, 7)) {
      const wEnd = addDays(w, 6);
      let sum = 0;
      const who = [];
      for (const p of items) {
        const s = p.span;
        if (s.end < w || s.start > wEnd)
          continue;
        const weeksLong = Math.max(1, (daysBetween(s.start, s.end) + 1) / 7);
        sum += (sizeWeeks[p.size ?? "m"] ?? 2) / weeksLong;
        who.push(p.id);
      }
      weeks.push({ week: w, load: Math.round(sum * 100) / 100, projects: who });
    }
    load[stream.id] = weeks.map(({ week, load }) => ({ week, load }));
    let run = null;
    for (const wk of weeks) {
      if (wk.load > stream.capacity + 0.01) {
        if (!run)
          run = { stream: stream.id, from: wk.week, to: addDays(wk.week, 6), peak: wk.load, capacity: stream.capacity, projects: [] };
        run.to = addDays(wk.week, 6);
        run.peak = Math.max(run.peak, wk.load);
        for (const p of wk.projects)
          if (!run.projects.includes(p))
            run.projects.push(p);
      } else if (run) {
        overload.push(run);
        run = null;
      }
    }
    if (run)
      overload.push(run);
  }
  const unscheduled = active.filter((p) => !p.span && (p.priority === "urgent" || p.priority === "high") && p.stage !== "paused").map((p) => p.id);
  const doneMeans = config.profile?.doneMeans;
  const bar = reachIndex(!doneMeans || doneMeans === "never" ? "launched" : doneMeans);
  const notOut = config.profile ? projects.filter((p) => ["rollout", "measuring", "done"].includes(p.stage) && reachIndex(p.reach) < bar).map((p) => p.id) : [];
  const inProgress = projects.filter((p) => ["exploring", "prototyping", "kickoff", "scoped", "building", "rollout"].includes(p.stage)).map((p) => p.id);
  const focus = config.profile?.focus;
  const unfocused = focus && inProgress.length > focus ? { active: inProgress, focus } : null;
  return { conflicts, cycles, bottlenecks, delegatable, overload, unscheduled, notOut, unfocused, load };
}
var inactive, activeStage = (s) => !inactive.has(s);
var init_analysis = __esm(() => {
  init_time();
  init_pulse();
  inactive = new Set(["done", "dropped"]);
});

// src/core/workspace.ts
import { existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";
function readMarkdownEntity(root, rel, schema, issues) {
  let src;
  try {
    src = readText(join3(root, rel));
  } catch {
    return null;
  }
  const { yaml, body } = splitFrontmatter(src);
  let raw;
  try {
    raw = parseYaml(yaml) ?? {};
  } catch (e) {
    issues.push({ file: rel, level: "error", message: `frontmatter is not valid YAML: ${e.message}` });
    return null;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const m of fmtZod(parsed.error))
      issues.push({ file: rel, level: "error", message: m });
    return null;
  }
  return { data: parsed.data, body };
}
function readYamlFile(root, rel, issues) {
  try {
    return parseYaml(readText(join3(root, rel)));
  } catch (e) {
    issues.push({ file: rel, level: "error", message: `not valid YAML: ${e.message}` });
    return;
  }
}
function unknownKeys(raw, schema) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return [];
  const known = new Set(Object.keys(schema.shape));
  return Object.keys(raw).filter((k) => !known.has(k));
}
function loadSession(root, project, sessionId) {
  const rel = `projects/${project}/sessions/${sessionId}.yaml`;
  if (!existsSync3(join3(root, rel)))
    return null;
  const issues = [];
  const raw = readYamlFile(root, rel, issues);
  const header = SessionHeader.safeParse(raw ?? {});
  if (!header.success)
    for (const m of fmtZod(header.error))
      issues.push({ file: rel, level: "error", message: m });
  const head = header.success ? header.data : { id: sessionId, title: sessionId, kind: "kickoff", status: "draft", participants: [] };
  if (head.id !== sessionId)
    issues.push({ file: rel, level: "warning", message: `id "${head.id}" does not match file name "${sessionId}"` });
  const sections = [];
  const seen = new Set;
  const rawSections = Array.isArray(raw?.sections) ? raw.sections : [];
  if (!rawSections.length)
    issues.push({ file: rel, level: "warning", message: "session has no sections" });
  rawSections.forEach((rs, si) => {
    const sec = Section.safeParse(rs);
    if (!sec.success) {
      for (const m of fmtZod(sec.error))
        issues.push({ file: rel, level: "error", message: `sections.${si}.${m}` });
      return;
    }
    const steps = [];
    sec.data.steps.forEach((rawStep, i) => {
      const where = `sections.${si}(${sec.data.id}).steps.${i}`;
      const r = rawStep;
      const parsed = Step.safeParse(rawStep);
      const sid = typeof r?.id === "string" ? r.id : `${sec.data.id}-${i}`;
      if (!parsed.success) {
        const errors = fmtZod(parsed.error);
        for (const m of errors)
          issues.push({ file: rel, level: "error", message: `${where}: ${m}` });
        steps.push({ type: "broken", id: sid, title: typeof r?.title === "string" ? r.title : sid, errors });
        return;
      }
      const step = parsed.data;
      if (seen.has(step.id))
        issues.push({ file: rel, level: "error", message: `${where}: duplicate step id "${step.id}"` });
      seen.add(step.id);
      const schema = stepSchemas[step.type];
      for (const k of unknownKeys(r, schema))
        issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): unknown field "${k}"` });
      if (step.type === "choice") {
        const ids = new Set(step.options.map((o) => o.id));
        if (ids.size !== step.options.length)
          issues.push({ file: rel, level: "error", message: `${where}(${step.id}): duplicate option ids` });
        if (step.recommended && !ids.has(step.recommended))
          issues.push({ file: rel, level: "error", message: `${where}(${step.id}): recommended "${step.recommended}" is not an option id` });
        if (step.baseline && !ids.has(step.baseline))
          issues.push({ file: rel, level: "error", message: `${where}(${step.id}): baseline "${step.baseline}" is not an option id` });
        r.options.forEach((o, oi) => {
          for (const k of unknownKeys(o, Option))
            issues.push({ file: rel, level: "warning", message: `${where}(${step.id}).options.${oi}: unknown field "${k}"` });
        });
      }
      if (step.decider && head.participants.length) {
        const known = new Set(head.participants.flatMap((p) => [p.name, p.kind ?? ""]));
        for (const d of [].concat(step.decider))
          if (!known.has(d))
            issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): decider "${d}" is not a participant name or kind` });
      }
      if (step.type === "choice" && step.recommended && !step.because)
        issues.push({ file: rel, level: "warning", message: `${where}(${step.id}): recommended without a one-line "because"` });
      for (const v of stepVisuals(step))
        checkVisual(root, project, rel, `${where}(${step.id})`, v, issues);
      steps.push(step);
    });
    sections.push({ id: sec.data.id, title: sec.data.title, phase: sec.data.phase, steps });
  });
  const sectionIds = new Set(sections.map((s) => s.id));
  for (const sec of sections)
    for (const step of sec.steps)
      if (step.type === "checkpoint") {
        for (const ref of step.of ?? [])
          if (!sectionIds.has(ref))
            issues.push({ file: rel, level: "error", message: `sections.${sec.id}(${step.id}): "of" names unknown section "${ref}"` });
      }
  return { ...head, project, file: rel, sections, issues };
}
function stepVisuals(step) {
  const out = [];
  if (step.visual)
    out.push(step.visual);
  if (step.visuals)
    out.push(...step.visuals);
  if (step.type === "choice")
    for (const o of step.options) {
      if (o.visual)
        out.push(o.visual);
      if (o.visuals)
        out.push(...o.visuals);
    }
  return out;
}
function checkVisual(root, project, file, where, v, issues) {
  const warn = (message) => issues.push({ file, level: "warning", message: `${where}: ${message}` });
  if (v.type === "prototype" || v.type === "image") {
    if (/^https?:\/\//.test(v.src))
      return;
    const path = v.src.split(/[#?]/)[0];
    const full = join3(root, "projects", project, path);
    if (!existsSync3(full))
      return warn(`${v.type} "${path}" not found in projects/${project}/`);
    const hash = v.type === "prototype" ? v.src.split("#")[1] : undefined;
    if (hash) {
      const html = readText(full);
      const first = hash.split(/[/+?&]/)[0];
      if (first && !html.includes(first))
        warn(`state "#${hash}" does not appear in ${path}`);
    }
    const m = v.type === "prototype" && v.focus?.match(/^\[(data-[\w-]+)=["']?([^"'\]]+)["']?\]$|^#([\w-]+)$/);
    if (m) {
      const html = readText(full);
      const name = m[3] ?? m[2];
      const found = (m[3] ? new RegExp(`id=["']${m[3]}["']`).test(html) : html.includes(`${m[1]}="${m[2]}"`) || html.includes(`${m[1]}='${m[2]}'`) || html.includes(`${m[1]}=${m[2]}`)) || html.includes(`"${name}"`) || html.includes(`'${name}'`);
      if (!found)
        warn(`focus "${v.focus}" does not appear in ${path} (\`omgp check\` looks in the rendered page)`);
    }
  }
  if (v.type === "states") {
    const ids = new Set(v.states.map((s) => s.id));
    for (const t of v.transitions) {
      if (!ids.has(t.from))
        warn(`transition from unknown state "${t.from}"`);
      if (!ids.has(t.to))
        warn(`transition to unknown state "${t.to}"`);
    }
  }
  if (v.type === "flow") {
    const ids = new Set(v.nodes.map((n) => n.id));
    for (const e of v.edges) {
      if (!ids.has(e.from))
        warn(`edge from unknown node "${e.from}"`);
      if (!ids.has(e.to))
        warn(`edge to unknown node "${e.to}"`);
    }
  }
  if (v.type === "sequence") {
    const ids = new Set(v.actors);
    for (const m of v.messages) {
      if (!ids.has(m.from))
        warn(`message from unknown actor "${m.from}"`);
      if (!ids.has(m.to))
        warn(`message to unknown actor "${m.to}"`);
    }
  }
  if (v.type === "matrix") {
    for (const row of v.rows)
      if (row.length !== v.columns.length + 1)
        warn(`matrix row "${row[0]}" has ${row.length - 1} cells, expected ${v.columns.length}`);
  }
}
function loadResults(root, project, sessionId) {
  const path = join3(root, `projects/${project}/sessions/${sessionId}.results.json`);
  const empty = { session: sessionId, steps: {}, annotations: [] };
  if (!existsSync3(path))
    return empty;
  try {
    const parsed = Results.safeParse(JSON.parse(readText(path)));
    return parsed.success ? parsed.data : empty;
  } catch {
    return empty;
  }
}
function allSteps(s) {
  return s.sections.flatMap((sec) => sec.steps);
}
function summarizeSession(root, project, id) {
  const s = loadSession(root, project, id);
  if (!s)
    return null;
  const results = loadResults(root, project, id);
  const steps = allSteps(s).filter((x) => x.type !== "slide" && x.type !== "broken");
  const answered = steps.filter((x) => {
    const r = results.steps[x.id];
    return r && (r.status || r.value);
  }).length;
  return {
    id,
    file: s.file,
    title: s.title,
    kind: s.kind,
    status: s.status,
    date: s.date,
    steps: steps.length,
    answered
  };
}
function loadWorkspace(root) {
  const issues = [];
  const rawConfig = readYamlFile(root, "product.yaml", issues);
  const cfg = ProductConfig.safeParse(rawConfig ?? {});
  if (!cfg.success)
    for (const m of fmtZod(cfg.error))
      issues.push({ file: "product.yaml", level: "error", message: m });
  const config = cfg.success ? cfg.data : { name: "Untitled product", locale: "en", roadmap: { streams: [] } };
  const today = todayIso(config.today);
  let vision = null;
  if (existsSync3(join3(root, "vision.md"))) {
    const v = readMarkdownEntity(root, "vision.md", Vision, issues);
    if (v)
      vision = {
        northStar: v.data.northStar,
        body: v.body,
        lighthouses: v.data.lighthouses.map((l) => ({ ...l, span: rangeSpan(l.when) }))
      };
  }
  const initiatives = [];
  for (const f of listDir(join3(root, "initiatives")).filter((f) => f.endsWith(".md"))) {
    const rel = `initiatives/${f}`;
    const e = readMarkdownEntity(root, rel, Initiative, issues);
    if (!e)
      continue;
    if (e.data.id !== f.replace(/\.md$/, ""))
      issues.push({ file: rel, level: "warning", message: `id "${e.data.id}" does not match file name` });
    initiatives.push({ ...e.data, file: rel, body: e.body, span: resolveSpan(e.data.when) });
  }
  const projects = [];
  for (const dir of listDir(join3(root, "projects"))) {
    const pdir = join3(root, "projects", dir);
    if (!isDir(pdir))
      continue;
    const rel = `projects/${dir}/project.md`;
    if (!existsSync3(join3(root, rel))) {
      issues.push({ file: `projects/${dir}`, level: "warning", message: "folder has no project.md" });
      continue;
    }
    const e = readMarkdownEntity(root, rel, Project, issues);
    if (!e)
      continue;
    if (e.data.id !== dir)
      issues.push({ file: rel, level: "error", message: `id "${e.data.id}" must match folder name "${dir}"` });
    for (const t of [e.data.when?.start, e.data.when?.end])
      if (t && !parseTime(t))
        issues.push({ file: rel, level: "error", message: `"${t}" is not a time value (2026-10-26 \xB7 2026-11 \xB7 2026-Q1 \xB7 2027-H1 \xB7 2027)` });
    const prototypes = listDir(join3(pdir, "prototypes")).filter((f) => f.endsWith(".html")).map((f) => {
      const meta = htmlMeta(readText(join3(pdir, "prototypes", f)));
      return { file: `prototypes/${f}`, title: meta.title || f.replace(/\.html$/, ""), description: meta.description };
    });
    const sessions = listDir(join3(pdir, "sessions")).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => summarizeSession(root, dir, f.replace(/\.ya?ml$/, ""))).filter((s) => !!s).sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
    projects.push({
      ...e.data,
      file: rel,
      dir: `projects/${dir}`,
      body: e.body,
      sections: markdownSections(e.body),
      span: resolveSpan(e.data.when, e.data.size),
      prototypes,
      sessions,
      handoff: existsSync3(join3(pdir, "handoff.md"))
    });
  }
  const initiativeIds = new Set(initiatives.map((i) => i.id));
  const projectIds = new Set(projects.map((p) => p.id));
  const streamIds = new Set(config.roadmap.streams.map((s) => s.id));
  const lighthouseIds = new Set(vision?.lighthouses.map((l) => l.id) ?? []);
  for (const i of initiatives)
    if (i.lighthouse && !lighthouseIds.has(i.lighthouse))
      issues.push({ file: i.file, level: "error", message: `lighthouse "${i.lighthouse}" is not in vision.md` });
  for (const p of projects) {
    for (const i of p.initiatives)
      if (!initiativeIds.has(i))
        issues.push({ file: p.file, level: "error", message: `initiative "${i}" does not exist` });
    if (p.stream && streamIds.size && !streamIds.has(p.stream))
      issues.push({ file: p.file, level: "error", message: `stream "${p.stream}" is not in product.yaml roadmap.streams` });
    for (const d of p.dependsOn) {
      if (!projectIds.has(d.on))
        issues.push({ file: p.file, level: "error", message: `dependsOn "${d.on}" is not a project` });
      if (d.on === p.id)
        issues.push({ file: p.file, level: "error", message: "project depends on itself" });
    }
    const past = !["idea", "dropped"].includes(p.stage);
    if (past) {
      for (const need of ["problem", "metric"])
        if (!Object.keys(p.sections).some((k) => k.startsWith(need)))
          issues.push({ file: p.file, level: "warning", message: `missing "## ${need[0].toUpperCase()}${need.slice(1)}" section` });
    }
    for (const s of p.sessions) {
      const full = loadSession(root, p.id, s.id);
      if (full)
        issues.push(...full.issues);
    }
  }
  const analysis = analyze({ today, config, projects });
  const rulesFile = join3(root, "rules.md");
  const rules = existsSync3(rulesFile) ? readText(rulesFile) : null;
  return { root, config, today, vision, initiatives, projects, issues, analysis, rules };
}
function rangeSpan(v) {
  const r = parseTime(v);
  return r ? { ...r } : null;
}
var fmtZod = (err) => err.issues.map((i) => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`), stepSchemas;
var init_workspace = __esm(() => {
  init_schema();
  init_files();
  init_time();
  init_analysis();
  stepSchemas = {
    slide: SlideStep,
    triage: TriageStep,
    choice: ChoiceStep,
    question: QuestionStep,
    poll: PollStep,
    checkpoint: CheckpointStep
  };
});

// src/core/i18n.ts
function labels(locale) {
  return locale === "de" ? de : en;
}
var en, de;
var init_i18n = __esm(() => {
  en = {
    handoff: "Handoff",
    handoffGenerated: "Compiled by omgp from",
    handoffEnrich: "Agents: enrich below this line, keep the decisions as they are.",
    sectionAlias: {},
    metrics: "Metrics",
    baseline: "baseline",
    target: "target",
    decisions: "Decisions",
    decision: "Decision",
    scope: "Scope",
    polls: "Polls",
    answers: "Answers",
    changeRequests: "Change requests on prototypes",
    deferredTitle: "Deferred and escalated",
    openTitle: "Not decided yet",
    prototypes: "Prototypes",
    note: "Note",
    deferred: "deferred",
    escalated: "escalated",
    recommended: "recommended",
    recommendedWas: "Recommended was",
    notTriaged: "not triaged",
    timingLater: "can wait",
    ownOption: "Own option",
    sketch: "Sketch",
    enables: "Enables",
    forecloses: "Makes harder",
    effort: "Effort",
    votes: "Votes",
    rejected: "Rejected",
    triage: { must: "Needed at launch", should: "Soon after", nice: "Nice to have", no: "Not needed" },
    triageHint: { must: "We don't launch without it", should: "Not at launch, but in the first weeks", nice: "Some day, if there is time", no: "Drop it" },
    scales: {
      priority: { must: ["Needed at launch", "We don't launch without it"], should: ["Soon after", "Not at launch, but in the first weeks"], nice: ["Nice to have", "Some day, if there is time"], no: ["Not needed", "Drop it"] },
      severity: { critical: ["Critical", "Costs money, time or trust with the customer"], noticeable: ["Noticeable", "We work around it, but it hurts"], minor: ["Minor", "Barely matters"], none: ["Not a problem", "Doesn't happen to us"] },
      frequency: { daily: ["Daily", ""], weekly: ["Weekly", ""], rarely: ["Rarely", ""], never: ["Never", ""] },
      agreement: { yes: ["Agree", "That's how it is"], rather: ["Mostly", "With exceptions"], unsure: ["Not sure", "We'd have to check"], no: ["Disagree", "That's not how it is"] }
    },
    scaleTitles: { priority: "Scope", severity: "How severe the problems are", frequency: "How often", agreement: "Assumptions" },
    ctx: { problem: "What this is about", why: "Why it matters", facts: "What is fixed", consequence: "If we pick this" },
    agree: {
      title: "Where we agree",
      values: { agreed: ["Yes, we agree", "Good to go"], concerns: ["Yes, with concerns", "We go on, but note what bothers us"], "not-yet": ["Not yet", "Something is missing or wrong"] },
      said: "What you said",
      unrated: "Not rated yet",
      decided: "Questions and decisions",
      open: "Still open",
      parked: "Parked",
      concernPlaceholder: "What bothers you, or what is missing?",
      revisit: "Click an item to go back to it.",
      nothing: "Nothing to sum up yet."
    },
    annotationKinds: { change: "change", question: "question", idea: "idea", praise: "keep" },
    roadmap: "Roadmap",
    projects: "Projects",
    problems: "Problems",
    noProblems: "All files are valid.",
    today: "Today",
    backlog: "Backlog",
    backlogHint: "No date yet",
    sessions: "Sessions",
    start: "Start",
    resume: "Continue",
    summary: "Summary",
    next: "Next",
    back: "Back",
    skip: "Skip",
    defer: "Decide later",
    escalate: "Escalate",
    undo: "Undo",
    none: "None of these",
    ownTitle: "Describe what you want instead",
    ownPlaceholder: "Write, dictate or sketch it. The agent builds it as an option.",
    dictate: "Dictate",
    stopDictate: "Stop",
    sketchIt: "Sketch",
    build: "Build this option",
    building: "The agent is building your option\u2026",
    built: "Your option is ready",
    failed: "The agent could not build it",
    keepAsText: "Keep as text decision",
    recommendation: "Recommendation",
    pros: "Pros",
    cons: "Cons",
    details: "Details",
    compare: "Compare",
    compareWith: "Compare with",
    diffAdded: "new",
    diffRemoved: "removed",
    diffChanged: "changed",
    choose: "Choose",
    chosen: "Chosen",
    why: "Why this matters",
    notes: "Notes",
    notePlaceholder: "What was said, who decides, what's next\u2026",
    reasonPlaceholder: "Why, who decides, by when?",
    answerPlaceholder: "Type the answer\u2026",
    annotate: "Comment",
    annotating: "Click anything to comment on it",
    annotationPlaceholder: "What should change?",
    levels: { product: "Product", ux: "UX", tech: "Tech", business: "Business" },
    timing: { now: "Decide now", later: "Can wait" },
    reversibility: { "one-way": "Hard to undo", "two-way": "Easy to undo" },
    phases: { context: "Context", problem: "Problem", solution: "Solution", decisions: "Decisions", wrapup: "Wrap-up" },
    progress: "answered",
    writeHandoff: "Write handoff.md",
    handoffWritten: "handoff.md written",
    copyPrompt: "Copy prompt for your agent",
    copied: "Copied",
    join: "Vote on your phone",
    pulse: {
      title: "Pulse",
      open: "Pulse",
      hint: "Which project matters more? Two at a time, a few a day",
      question: "What is more important?",
      dontGet: "I don't get it",
      dontGetHint: "You can't judge this one: it collects ??? and isn't ready yet. Skips this duel.",
      unclearHint: (n) => `${n} ${n === 1 ? "person doesn't" : "people don't"} get this one: not ready`,
      vs: "or",
      pick: "Tap the one that matters more",
      skip: "Skip",
      skipHint: "Don't know one of them",
      neither: "Neither",
      neitherHint: "Neither matters right now: both drop a bit (N)",
      round: (i, n) => `${i} of ${n}`,
      roundDone: "Round done",
      roundBody: "Thanks. Keep going, or come back tomorrow. Here's what everyone feels so far:",
      more: (n) => `Keep going: ${n} more`,
      allDone: "You compared every pair. Come back when there are new projects.",
      limitBody: "That's it for today. Come back tomorrow. Here's what everyone feels so far:",
      inPulse: (n, out) => `${n} projects in the pulse${out ? ` \xB7 ${out} done or dropped are left out` : ""}`,
      nothing: "There need to be at least two projects to compare.",
      results: "Ranking",
      swipe: "Compare",
      everyone: "Everyone",
      justMe: "Just me",
      people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
      record: (w, l) => `won ${w} \xB7 lost ${l}`,
      noVotes: "No duels yet. Compare the first round.",
      split: "split",
      splitHint: "People decided pairs with this project both ways",
      declared: "on the roadmap",
      week: "7 days",
      undo: "Undo",
      who: "Who are you?",
      anonymous: "Anonymous: nobody sees who picked what."
    },
    joinAs: "Who are you?",
    waiting: "Waiting for the next question\u2026",
    yourVote: "Your vote",
    stage: "Stage",
    owner: "Owner",
    dependsOn: "Depends on",
    blocks: "Blocks",
    delegatable: "Can be handed off",
    bottleneck: "Bottleneck",
    conflict: "Conflict",
    overload: "Overloaded",
    open: "Open",
    zoom: { weeks: "Weeks", months: "Months", quarters: "Quarters", years: "Years" },
    groupBy: "Lanes",
    byInitiative: "Initiatives",
    byStream: "Streams",
    noInitiative: "No initiative",
    noStream: "Unassigned",
    rm: {
      focus: { now: "Current", planned: "Planned", all: "All" },
      focusHint: { now: "Running now, starting within 3 weeks, or with a meeting soon", planned: "Everything with a date", all: "Including backlog and done" },
      filter: "Filter",
      phase: "Phase",
      phases: { discover: "Discover", align: "Align", deliver: "Deliver", learn: "Learn" },
      reset: "Reset",
      more: "more",
      less: "Show less",
      moreGroups: "more groups",
      nothing: "Nothing current right now.",
      nothingFiltered: "Nothing matches these filters.",
      showAll: "Show all",
      of: "of",
      view: { stages: "Stages", time: "Timeline" },
      byStage: "Stages",
      order: "Order",
      orders: { stage: "Stage", start: "Start", priority: "Priority", pulse: "Pulse" },
      stages: { idea: "Idea", exploring: "Exploring", prototyping: "Prototype", kickoff: "Kickoff", scoped: "Scoped", building: "Building", rollout: "Rollout", measuring: "Measuring", done: "Done", paused: "Paused", dropped: "Dropped" },
      sessionKinds: { exploration: "Exploration", kickoff: "Kickoff", "tech-review": "Tech review", review: "Review", "rollout-review": "Rollout review" },
      live: "running now",
      on: "on",
      until: "until",
      starts: "starts",
      overdue: "overdue since",
      noProblem: "Problem not written yet",
      noDateYet: "no date yet"
    },
    findings: "Findings",
    reach: { unreleased: "Not out yet", ready: "Market-ready", released: "Released", launched: "Launched", marketing: "Marketing", customers: "Has customers", improving: "Improving" },
    nextMove: "Next",
    todo: { done: "Done: tick it off", title: "Do next", next: "Next tasks", edit: "Click to edit", addFirst: "What is the most important next task?", addMore: "Add a task" },
    focus: { line: (n) => `Focus: the top ${n}. Everything below waits.` },
    shelf: {
      title: "In the pulse?",
      hint: "Shelve: back in a month. Kill it: irrelevant, never comes back",
      in: "In the pulse",
      inHint: "Comes up in duels",
      shelve: "Shelve",
      shelveHint: "Out of the duels for a month, then back",
      kill: "Kill it",
      killHint: "Irrelevant, never comes back",
      until: (d) => `Shelved until ${d}`
    },
    status: {
      built: "Built:",
      out: "Out:",
      builtHint: "How far it is built",
      openSource: "Open source",
      openSourceHint: "The code is public; can be at any step above",
      outHint: "How far it is out in the world",
      reachHint: {
        unreleased: "Only on my machine",
        ready: "Could ship, not shipped yet",
        released: "Public, but nobody was told",
        launched: "Announced: post, launch, mailing",
        marketing: "Actively bringing people in",
        customers: "First users, customers or contributors",
        improving: "Out there, making it better"
      }
    },
    steps: {
      top: (n) => `#${n} right now`,
      ask: "What are the 3 most important next tasks?",
      check: "Still the 3 most important next tasks?",
      placeholder: ["Most important task", "Then", "Then"],
      save: "Save",
      saveNext: "Save & next",
      edit: "Edit",
      stop: "Done for now",
      thanks: "Done for today",
      thanksBody: "Here's the ranking. Come back tomorrow for the next round."
    },
    notOut: "Built, not launched",
    notOutHint: "Built is not done. These need a release, a launch or marketing.",
    unfocused: (n, focus) => `${n} projects in progress, focus is ${focus}`,
    depKinds: { hard: "blocks", tight: "tightly coupled", loose: "informs" },
    lighthouse: "Lighthouse",
    northStar: "North star",
    empty: "Nothing here yet.",
    results: "Results",
    decidedCount: "decided",
    live: "Live",
    requests: "Agent requests",
    cm: {
      comments: "Comments",
      comment: "Comment",
      placeholder: "Write a comment\u2026",
      reply: "Reply",
      replyPlaceholder: "Reply\u2026",
      resolve: "Resolve",
      reopen: "Reopen",
      resolved: "Resolved",
      open: "Open",
      showResolved: "Show resolved",
      fixWithAgent: "Fix with agent",
      sendToAgent: "Send to agent",
      saving: "Saving\u2026",
      savedState: "Saved",
      changedElsewhere: "Someone else changed this file while you were typing.",
      takeTheirs: "Load their version",
      keepMine: "Keep mine",
      sentToAgent: "Sent to the agent",
      outdated: "The text changed since",
      yourName: "Your name",
      none: "No comments yet. Hover a paragraph or select text to comment.",
      noneHere: "No comments here yet.",
      remove: "Delete",
      thisStep: "This step",
      all: "All",
      edit: "Edit",
      editAll: "Edit all",
      save: "Save",
      cancel: "Cancel",
      add: "Add",
      addSection: "Add section",
      review: "Review",
      reviewHint: "Click text to edit it, click diagram parts or the speech bubbles to comment.",
      conflict: "Someone changed this meanwhile. Reload and try again.",
      brief: "Brief",
      handoff: "Handoff",
      agent: "Agent"
    },
    ag: {
      agent: "Agent",
      ready: "ready",
      working: "working",
      offline: "No agent connected",
      offlineHint: "Requests wait until an agent picks them up. Start one next to the studio:",
      orConfigure: "or let the studio start it: add agent: { preset: claude } to product.yaml and restart omgp serve.",
      chat: "An agent chat is listening (omgp listen)",
      queued: "waiting",
      nobody: "Nobody is working on this. The agent that took it is gone.",
      cancel: "Cancel",
      retry: "Try again",
      history: "Earlier",
      empty: "Nothing yet. When someone asks for a new option or a rebuild, you see here what the agent does.",
      kinds: {
        option: "New option",
        "revise-option": "Rebuilding option",
        "revise-step": "Rebuilding decision",
        visual: "New visual",
        step: "New step",
        prototype: "Changing prototype",
        comment: "Fixing a comment"
      },
      status: { open: "waiting", working: "working", done: "done", failed: "failed", cancelled: "cancelled" }
    },
    sideBySide: "Side by side",
    resetResults: "Reset results (test run)",
    resetConfirm: "Delete all answers, votes and notes of this session? The deck itself stays.",
    playStory: "Show the scenario",
    rebuildOption: "Rebuild option",
    rebuildDecision: "Rebuild decision",
    rebuildHint: "What should change? Open comments are included.",
    noDate: "No date yet, drag to plan",
    noProjects: "No projects yet",
    pan: { back: "Earlier", forward: "Later" },
    saveFailed: "Could not save",
    facts: { stage: "Stage", reach: "Out in the world", priority: "Priority", size: "Size", confidence: "Confidence", stream: "Stream", when: "When", stakeholders: "Stakeholders" },
    demo: {
      badge: "Demo",
      source: "omg\xB7product on GitHub",
      hint: "A static copy of the studio. Nothing goes to a server: your answers stay in this browser, and the session menu resets them.",
      readOnly: "Demo: read-only",
      needsAgent: "Demo: read-only. With omgp serve and an agent, the agent builds your option while the room waits.",
      handoff: "Demo: read-only. omgp serve writes handoff.md from these results.",
      noDate: "No date yet"
    }
  };
  de = {
    ...en,
    handoff: "\xDCbergabe",
    handoffGenerated: "Von omgp erzeugt aus",
    handoffEnrich: "Agenten: unten erg\xE4nzen, die Entscheidungen bleiben wie sie sind.",
    sectionAlias: { problem: "problem", "for whom": "f\xFCr wen", metric: "metrik", solution: "l\xF6sung", "done when": "fertig wenn", "out of scope": "nicht im umfang" },
    metrics: "Metriken",
    baseline: "heute",
    target: "Ziel",
    decisions: "Entscheidungen",
    decision: "Entscheidung",
    scope: "Umfang",
    polls: "Abstimmungen",
    answers: "Antworten",
    changeRequests: "\xC4nderungsw\xFCnsche an Prototypen",
    deferredTitle: "Vertagt und eskaliert",
    openTitle: "Noch nicht entschieden",
    prototypes: "Prototypen",
    note: "Notiz",
    deferred: "vertagt",
    escalated: "eskaliert",
    recommended: "empfohlen",
    recommendedWas: "Empfohlen war",
    notTriaged: "nicht bewertet",
    timingLater: "kann warten",
    ownOption: "Eigene Option",
    sketch: "Skizze",
    enables: "Erm\xF6glicht",
    forecloses: "Erschwert",
    effort: "Aufwand",
    votes: "Stimmen",
    rejected: "Verworfen",
    triage: { must: "Muss zum Start", should: "Kurz danach", nice: "Nice to have", no: "Brauchen wir nicht" },
    triageHint: { must: "Ohne das starten wir nicht", should: "Nicht zum Start, aber in den ersten Wochen", nice: "Irgendwann, wenn Zeit ist", no: "Weglassen" },
    scales: {
      priority: { must: ["Muss zum Start", "Ohne das starten wir nicht"], should: ["Kurz danach", "Nicht zum Start, aber in den ersten Wochen"], nice: ["Nice to have", "Irgendwann, wenn Zeit ist"], no: ["Brauchen wir nicht", "Weglassen"] },
      severity: { critical: ["Kritisch", "Kostet Geld, Zeit oder \xC4rger mit Kunden"], noticeable: ["Sp\xFCrbar", "Wir behelfen uns, aber es nervt"], minor: ["Gering", "F\xE4llt kaum ins Gewicht"], none: ["Kein Problem", "Passiert bei uns nicht"] },
      frequency: { daily: ["T\xE4glich", ""], weekly: ["W\xF6chentlich", ""], rarely: ["Selten", ""], never: ["Nie", ""] },
      agreement: { yes: ["Stimmt", "So ist es"], rather: ["Stimmt meistens", "Mit Ausnahmen"], unsure: ["Wei\xDF nicht", "M\xFCssten wir pr\xFCfen"], no: ["Stimmt nicht", "So ist es nicht"] }
    },
    scaleTitles: { priority: "Umfang", severity: "Wie schwer die Probleme wiegen", frequency: "Wie oft", agreement: "Annahmen" },
    ctx: { problem: "Worum es geht", why: "Warum es wichtig ist", facts: "Was feststeht", consequence: "Wenn wir das w\xE4hlen" },
    agree: {
      title: "Wo wir uns einig sind",
      values: { agreed: ["Ja, wir sind uns einig", "So machen wir weiter"], concerns: ["Ja, mit Bedenken", "Wir machen weiter, halten die Bedenken fest"], "not-yet": ["Noch nicht", "Es fehlt etwas oder stimmt nicht"] },
      said: "Das habt ihr gesagt",
      unrated: "Noch nicht bewertet",
      decided: "Fragen und Entscheidungen",
      open: "Noch offen",
      parked: "Vertagt",
      concernPlaceholder: "Was st\xF6rt euch, oder was fehlt?",
      revisit: "Auf einen Punkt klicken, um zur\xFCckzugehen.",
      nothing: "Noch nichts zum Zusammenfassen."
    },
    annotationKinds: { change: "\xE4ndern", question: "Frage", idea: "Idee", praise: "behalten" },
    roadmap: "Roadmap",
    projects: "Projekte",
    problems: "Probleme",
    noProblems: "Alle Dateien sind g\xFCltig.",
    today: "Heute",
    backlog: "Backlog",
    backlogHint: "Noch kein Termin",
    sessions: "Sessions",
    start: "Starten",
    resume: "Weiter",
    summary: "Zusammenfassung",
    next: "Weiter",
    back: "Zur\xFCck",
    skip: "\xDCberspringen",
    defer: "Sp\xE4ter entscheiden",
    escalate: "Eskalieren",
    undo: "Zur\xFCcknehmen",
    none: "Nichts davon",
    ownTitle: "Beschreib, was du stattdessen willst",
    ownPlaceholder: "Schreiben, diktieren oder skizzieren. Der Agent baut daraus eine Option.",
    dictate: "Diktieren",
    stopDictate: "Stopp",
    sketchIt: "Skizze",
    build: "Option bauen lassen",
    building: "Der Agent baut deine Option\u2026",
    built: "Deine Option ist da",
    failed: "Der Agent konnte sie nicht bauen",
    keepAsText: "Als Text festhalten",
    recommendation: "Empfehlung",
    pros: "Daf\xFCr",
    cons: "Dagegen",
    details: "Details",
    compare: "Vergleichen",
    compareWith: "Vergleichen mit",
    diffAdded: "neu",
    diffRemoved: "entf\xE4llt",
    diffChanged: "ge\xE4ndert",
    choose: "W\xE4hlen",
    chosen: "Gew\xE4hlt",
    why: "Warum das wichtig ist",
    notes: "Notizen",
    notePlaceholder: "Was gesagt wurde, wer entscheidet, wie es weitergeht\u2026",
    reasonPlaceholder: "Warum, wer entscheidet, bis wann?",
    answerPlaceholder: "Antwort eintippen\u2026",
    annotate: "Kommentieren",
    annotating: "Klick auf eine Stelle, um sie zu kommentieren",
    annotationPlaceholder: "Was soll sich \xE4ndern?",
    levels: { product: "Produkt", ux: "UX", tech: "Technik", business: "Business" },
    timing: { now: "Jetzt entscheiden", later: "Kann warten" },
    reversibility: { "one-way": "Schwer umkehrbar", "two-way": "Leicht umkehrbar" },
    phases: { context: "Kontext", problem: "Problem", solution: "L\xF6sung", decisions: "Entscheidungen", wrapup: "Abschluss" },
    progress: "beantwortet",
    writeHandoff: "handoff.md schreiben",
    handoffWritten: "handoff.md geschrieben",
    copyPrompt: "Prompt f\xFCr den Agenten kopieren",
    copied: "Kopiert",
    join: "Am Handy abstimmen",
    pulse: {
      title: "Puls",
      open: "Puls",
      hint: "Welches Projekt ist wichtiger? Immer zwei, ein paar am Tag",
      question: "Was ist wichtiger?",
      dontGet: "Versteh ich nicht",
      dontGetHint: "Kannst du nicht beurteilen: sammelt ??? und ist noch nicht reif. \xDCberspringt dieses Duell.",
      unclearHint: (n) => `${n} ${n === 1 ? "Person versteht" : "Personen verstehen"} das nicht: noch nicht reif`,
      vs: "oder",
      pick: "Tipp auf das, was wichtiger ist",
      skip: "\xDCberspringen",
      skipHint: "Ich kenne eins davon nicht",
      neither: "Keins",
      neitherHint: "Beide gerade nicht wichtig: beide sinken etwas (N)",
      round: (i, n) => `${i} von ${n}`,
      roundDone: "Runde fertig",
      roundBody: "Danke. Weitermachen oder morgen wiederkommen. So sehen es bisher alle:",
      more: (n) => `Weiter: noch ${n}`,
      allDone: "Du hast jedes Paar verglichen. Komm wieder, wenn es neue Projekte gibt.",
      limitBody: "Das war's f\xFCr heute. Morgen geht's weiter. So sehen es bisher alle:",
      inPulse: (n, out) => `${n} Projekte im Puls${out ? ` \xB7 ${out} erledigte oder verworfene fehlen` : ""}`,
      nothing: "Zum Vergleichen braucht es mindestens zwei Projekte.",
      results: "Rangliste",
      swipe: "Vergleichen",
      everyone: "Alle",
      justMe: "Nur ich",
      people: (n) => `${n} ${n === 1 ? "Person" : "Personen"}`,
      record: (w, l) => `${w} gewonnen \xB7 ${l} verloren`,
      noVotes: "Noch keine Duelle. Vergleich die erste Runde.",
      split: "uneinig",
      splitHint: "Paare mit diesem Projekt wurden in beide Richtungen entschieden",
      declared: "auf der Roadmap",
      week: "7 Tage",
      undo: "R\xFCckg\xE4ngig",
      who: "Wer bist du?",
      anonymous: "Anonym: niemand sieht, wer was gew\xE4hlt hat."
    },
    joinAs: "Wer bist du?",
    waiting: "Warte auf die n\xE4chste Frage\u2026",
    yourVote: "Deine Stimme",
    stage: "Phase",
    owner: "Verantwortlich",
    dependsOn: "H\xE4ngt ab von",
    blocks: "Blockiert",
    delegatable: "Kann abgegeben werden",
    bottleneck: "Engpass",
    conflict: "Konflikt",
    overload: "\xDCberlastet",
    open: "\xD6ffnen",
    zoom: { weeks: "Wochen", months: "Monate", quarters: "Quartale", years: "Jahre" },
    groupBy: "Spuren",
    byInitiative: "Initiativen",
    byStream: "Streams",
    noInitiative: "Ohne Initiative",
    noStream: "Nicht zugeordnet",
    rm: {
      focus: { now: "Aktuell", planned: "Geplant", all: "Alle" },
      focusHint: { now: "L\xE4uft gerade, startet in den n\xE4chsten 3 Wochen oder hat bald ein Meeting", planned: "Alles mit Termin", all: "Auch Backlog und Erledigtes" },
      filter: "Filter",
      phase: "Phase",
      phases: { discover: "Entdecken", align: "Abstimmen", deliver: "Umsetzen", learn: "Lernen" },
      reset: "Zur\xFCcksetzen",
      more: "weitere",
      less: "Weniger zeigen",
      moreGroups: "weitere Gruppen",
      nothing: "Gerade ist nichts aktuell.",
      nothingFiltered: "Nichts passt zu diesen Filtern.",
      showAll: "Alle zeigen",
      of: "von",
      view: { stages: "Stufen", time: "Zeitplan" },
      byStage: "Stufen",
      order: "Reihenfolge",
      orders: { stage: "Stufe", start: "Start", priority: "Priorit\xE4t", pulse: "Puls" },
      stages: { idea: "Idee", exploring: "Erkunden", prototyping: "Prototyp", kickoff: "Kickoff", scoped: "Abgestimmt", building: "In Arbeit", rollout: "Rollout", measuring: "Messen", done: "Erledigt", paused: "Pausiert", dropped: "Verworfen" },
      sessionKinds: { exploration: "Erkundung", kickoff: "Kickoff", "tech-review": "Tech-Review", review: "Review", "rollout-review": "Rollout-Review" },
      live: "l\xE4uft gerade",
      on: "am",
      until: "bis",
      starts: "startet",
      overdue: "\xFCberf\xE4llig seit",
      noProblem: "Problem noch nicht beschrieben",
      noDateYet: "noch ohne Termin"
    },
    findings: "Befunde",
    reach: { unreleased: "Noch nicht drau\xDFen", ready: "Marktreif", released: "Ver\xF6ffentlicht", launched: "Gelauncht", marketing: "Marketing", customers: "Hat Kunden", improving: "Wird verbessert" },
    nextMove: "Als N\xE4chstes",
    todo: { done: "Erledigt: abhaken", title: "Als N\xE4chstes tun", next: "N\xE4chste Aufgaben", edit: "Klicken zum \xC4ndern", addFirst: "Was ist die wichtigste n\xE4chste Aufgabe?", addMore: "Aufgabe hinzuf\xFCgen" },
    focus: { line: (n) => `Fokus: die ersten ${n}. Alles darunter wartet.` },
    shelf: {
      title: "Im Puls?",
      hint: "Ins Regal: in einem Monat zur\xFCck. Beerdigen: irrelevant, kommt nie wieder",
      in: "Im Puls",
      inHint: "Taucht in Duellen auf",
      shelve: "Ins Regal",
      shelveHint: "Einen Monat raus aus den Duellen, dann zur\xFCck",
      kill: "Beerdigen",
      killHint: "Irrelevant, kommt nie wieder",
      until: (d) => `Im Regal bis ${d}`
    },
    status: {
      built: "Gebaut:",
      out: "Drau\xDFen:",
      builtHint: "Wie weit es gebaut ist",
      openSource: "Open Source",
      openSourceHint: "Der Code ist \xF6ffentlich; geht mit jeder Stufe oben",
      outHint: "Wie weit es drau\xDFen in der Welt ist",
      reachHint: {
        unreleased: "Nur auf meinem Rechner",
        ready: "K\xF6nnte raus, ist es noch nicht",
        released: "\xD6ffentlich, aber keiner wei\xDF es",
        launched: "Angek\xFCndigt: Post, Launch, Mailing",
        marketing: "Holt aktiv Leute rein",
        customers: "Erste Nutzer, Kunden oder Mitwirkende",
        improving: "Drau\xDFen, wird verbessert"
      }
    },
    steps: {
      top: (n) => `gerade Platz ${n}`,
      ask: "Was sind die 3 wichtigsten n\xE4chsten Aufgaben?",
      check: "Noch die 3 wichtigsten n\xE4chsten Aufgaben?",
      placeholder: ["Wichtigste Aufgabe", "Danach", "Danach"],
      save: "Speichern",
      saveNext: "Speichern & weiter",
      edit: "\xC4ndern",
      stop: "F\xFCr heute fertig",
      thanks: "Fertig f\xFCr heute",
      thanksBody: "Hier die Rangliste. Morgen geht's mit der n\xE4chsten Runde weiter."
    },
    notOut: "Gebaut, nicht gelauncht",
    notOutHint: "Gebaut ist nicht fertig. Diese brauchen Release, Launch oder Marketing.",
    unfocused: (n, focus) => `${n} Projekte in Arbeit, Fokus ist ${focus}`,
    depKinds: { hard: "blockiert", tight: "eng gekoppelt", loose: "informiert" },
    lighthouse: "Leuchtturm",
    northStar: "Nordstern",
    empty: "Noch nichts da.",
    results: "Ergebnisse",
    decidedCount: "entschieden",
    live: "Live",
    requests: "Agent-Auftr\xE4ge",
    cm: {
      comments: "Kommentare",
      comment: "Kommentieren",
      placeholder: "Kommentar schreiben\u2026",
      reply: "Antworten",
      replyPlaceholder: "Antworten\u2026",
      resolve: "Erledigt",
      reopen: "Wieder \xF6ffnen",
      resolved: "Erledigt",
      open: "Offen",
      showResolved: "Erledigte zeigen",
      fixWithAgent: "Vom Agenten umsetzen lassen",
      sendToAgent: "An Agent geben",
      saving: "Speichert\u2026",
      savedState: "Gespeichert",
      changedElsewhere: "Jemand anderes hat die Datei ge\xE4ndert, w\xE4hrend du getippt hast.",
      takeTheirs: "Deren Version laden",
      keepMine: "Meine behalten",
      sentToAgent: "An den Agenten geschickt",
      outdated: "Der Text hat sich seitdem ge\xE4ndert",
      yourName: "Dein Name",
      none: "Noch keine Kommentare. \xDCber einen Absatz fahren oder Text markieren, um zu kommentieren.",
      noneHere: "Hier noch keine Kommentare.",
      remove: "L\xF6schen",
      thisStep: "Dieser Schritt",
      all: "Alle",
      edit: "Bearbeiten",
      editAll: "Alles bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      add: "Hinzuf\xFCgen",
      addSection: "Abschnitt hinzuf\xFCgen",
      review: "Review",
      reviewHint: "Text anklicken zum Bearbeiten, Diagramm-Teile oder Sprechblasen anklicken zum Kommentieren.",
      conflict: "Jemand hat das inzwischen ge\xE4ndert. Neu laden und nochmal versuchen.",
      brief: "Brief",
      handoff: "\xDCbergabe",
      agent: "Agent"
    },
    ag: {
      agent: "Agent",
      ready: "bereit",
      working: "arbeitet",
      offline: "Kein Agent verbunden",
      offlineHint: "Anfragen warten, bis ein Agent sie \xFCbernimmt. Starte einen neben dem Studio:",
      orConfigure: "oder lass das Studio ihn starten: agent: { preset: claude } in product.yaml eintragen und omgp serve neu starten.",
      chat: "Ein Agent-Chat wartet (omgp listen)",
      queued: "wartet",
      nobody: "Niemand arbeitet daran. Der Agent, der es \xFCbernommen hat, ist weg.",
      cancel: "Abbrechen",
      retry: "Nochmal versuchen",
      history: "Vorher",
      empty: "Noch nichts. Wenn jemand eine neue Option oder einen Umbau anfragt, siehst du hier, was der Agent tut.",
      kinds: {
        option: "Neue Option",
        "revise-option": "Option wird neu gebaut",
        "revise-step": "Entscheidung wird neu gebaut",
        visual: "Neues Bild",
        step: "Neuer Schritt",
        prototype: "Prototyp wird ge\xE4ndert",
        comment: "Kommentar wird umgesetzt"
      },
      status: { open: "wartet", working: "arbeitet", done: "fertig", failed: "fehlgeschlagen", cancelled: "abgebrochen" }
    },
    sideBySide: "Nebeneinander",
    resetResults: "Ergebnisse zur\xFCcksetzen (Probelauf)",
    resetConfirm: "Alle Antworten, Stimmen und Notizen dieser Session l\xF6schen? Das Deck selbst bleibt.",
    playStory: "Ablauf zeigen",
    rebuildOption: "Option neu bauen",
    rebuildDecision: "Entscheidung neu bauen",
    rebuildHint: "Was soll anders werden? Offene Kommentare gehen mit.",
    noDate: "Noch kein Termin, ziehen zum Planen",
    noProjects: "Noch keine Projekte",
    pan: { back: "Fr\xFCher", forward: "Sp\xE4ter" },
    saveFailed: "Speichern fehlgeschlagen",
    facts: { stage: "Stufe", reach: "Drau\xDFen in der Welt", priority: "Priorit\xE4t", size: "Gr\xF6\xDFe", confidence: "Sicherheit", stream: "Stream", when: "Zeitraum", stakeholders: "Beteiligte" },
    demo: {
      badge: "Demo",
      source: "omg\xB7product auf GitHub",
      hint: "Eine statische Kopie des Studios. Nichts geht an einen Server: deine Antworten bleiben in diesem Browser, das Session-Men\xFC setzt sie zur\xFCck.",
      readOnly: "Demo: nur lesen",
      needsAgent: "Demo: nur lesen. Mit omgp serve und einem Agenten baut der Agent deine Option, w\xE4hrend der Raum wartet.",
      handoff: "Demo: nur lesen. omgp serve schreibt handoff.md aus diesen Ergebnissen.",
      noDate: "Noch kein Termin"
    }
  };
});

// src/core/comment-ops.ts
function applyCommentOp(doc, op, now = new Date().toISOString()) {
  const threads = JSON.parse(JSON.stringify(doc.threads));
  const find = (id) => threads.find((t) => t.id === id);
  switch (op.op) {
    case "add":
      if (!find(op.id))
        threads.push({
          id: op.id,
          target: op.target,
          status: "open",
          createdAt: now,
          comments: [{ id: `${op.id}-1`, author: op.author, text: op.text, at: now }]
        });
      break;
    case "reply": {
      const t = find(op.thread);
      if (t && !t.comments.some((c) => c.id === op.id))
        t.comments.push({ id: op.id, author: op.author, text: op.text, at: now, ...op.agent ? { agent: true } : {} });
      break;
    }
    case "edit": {
      const c = find(op.thread)?.comments.find((c) => c.id === op.comment);
      if (c)
        c.text = op.text;
      break;
    }
    case "resolve": {
      const t = find(op.thread);
      if (t)
        Object.assign(t, { status: "resolved", resolvedAt: now, ...op.by ? { resolvedBy: op.by } : {} });
      break;
    }
    case "reopen": {
      const t = find(op.thread);
      if (t) {
        t.status = "open";
        delete t.resolvedAt;
        delete t.resolvedBy;
      }
      break;
    }
    case "delete":
      return { threads: threads.filter((t) => t.id !== op.thread) };
  }
  return { threads };
}
function locateQuote(text, quote, hint) {
  if (!quote.trim())
    return null;
  let i = text.indexOf(quote);
  if (i < 0) {
    const flat = norm(stripMd(quote));
    const lines = text.split(`
`).map(stripMd);
    const windowHas = (start) => {
      let acc = "";
      for (let end = start;end < Math.min(lines.length, start + 40); end++) {
        acc = norm(`${acc} ${lines[end]}`);
        if (acc.includes(flat))
          return true;
        if (acc.length > flat.length * 2 + 400)
          return false;
      }
      return false;
    };
    let found = -1;
    for (let start = 0;start < lines.length; start++) {
      if (windowHas(start))
        found = start;
      else if (found >= 0)
        break;
    }
    return found >= 0 ? found + 1 : null;
  }
  let best = i;
  if (hint) {
    let bestDist = Infinity;
    for (let j = i;j >= 0; j = text.indexOf(quote, j + 1)) {
      const line = text.slice(0, j).split(`
`).length;
      const d = Math.abs(line - hint);
      if (d < bestDist)
        bestDist = d, best = j;
    }
  }
  return text.slice(0, best).split(`
`).length;
}
function targetLabel(t) {
  switch (t.kind) {
    case "text":
      return `${t.file}${t.line ? `:${t.line}` : ""} \u201C${t.quote.length > 60 ? t.quote.slice(0, 59) + "\u2026" : t.quote}\u201D`;
    case "step":
      return `${t.file} \u203A ${t.step}${t.option ? ` \u203A option ${t.option}` : ""}${t.field ? ` \u203A ${t.field}` : ""}`;
    case "element":
      return `${t.file}${t.step ? ` \u203A ${t.step}` : ""}${t.option ? ` \u203A ${t.option}` : ""} \u203A ${t.element}${t.label ? ` (${t.label})` : ""}`;
    case "prototype":
      return `${t.file}${t.label ? ` \u203A ${t.label}` : ""}${t.selector ? ` (${t.selector})` : ""}`;
    case "file":
      return t.file;
  }
}
var newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, norm = (s) => s.replace(/\s+/g, " ").trim(), stripMd = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__|[*_`]/g, "").replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/gm, "");

// src/core/comments.ts
import { existsSync as existsSync4 } from "fs";
import { join as join4 } from "path";
function scopeDir(root, scope) {
  return scope === ROOT_SCOPE ? root : join4(root, "projects", scope);
}
function loadComments(root, scope) {
  const path = commentsPath(root, scope);
  if (!existsSync4(path))
    return { threads: [] };
  try {
    const parsed = CommentsFile.safeParse(JSON.parse(readText(path)));
    return parsed.success ? parsed.data : { threads: [] };
  } catch {
    return { threads: [] };
  }
}
function updateComments(root, scope, op) {
  const next = applyCommentOp(loadComments(root, scope), op);
  writeText(commentsPath(root, scope), JSON.stringify(next, null, 2) + `
`);
  return next;
}
function anchorThreads(root, scope, doc) {
  const cache = new Map;
  const read = (file) => {
    if (!cache.has(file)) {
      const p = join4(scopeDir(root, scope), file);
      cache.set(file, existsSync4(p) ? readText(p) : null);
    }
    return cache.get(file);
  };
  return doc.threads.map((t) => {
    if (t.target.kind !== "text")
      return t;
    const text = read(t.target.file);
    if (text == null)
      return { ...t, line: null, outdated: true };
    const line = locateQuote(text, t.target.quote, t.target.line);
    return { ...t, line, outdated: line == null };
  });
}
function replaceSection(path, heading, content, expect) {
  const src = readText(path);
  const fm = splitFrontmatter(src);
  const head = src.slice(0, src.length - fm.body.length);
  const lines = fm.body.split(`
`);
  const isH2 = (l) => /^##\s+/.test(l);
  const start = lines.findIndex((l) => isH2(l) && l.replace(/^##\s+/, "").trim().toLowerCase() === heading.trim().toLowerCase());
  const clean = content.replace(/\s+$/, "");
  let body;
  if (start < 0) {
    if (expect?.trim())
      throw new EditConflict(`section "${heading}" no longer exists`);
    body = `${fm.body.replace(/\s+$/, "")}

## ${heading}
${clean}
`;
  } else {
    let end = lines.findIndex((l, i) => i > start && isH2(l));
    if (end < 0)
      end = lines.length;
    const current = lines.slice(start + 1, end).join(`
`).trim();
    if (expect !== undefined && current !== expect.trim())
      throw new EditConflict(`section "${heading}" was changed meanwhile`);
    const tail = lines.slice(end);
    body = [...lines.slice(0, start + 1), clean, ...tail.length ? ["", ...tail] : [""]].join(`
`);
  }
  writeText(path, head + body);
}
function replaceBody(path, content, expect) {
  const src = readText(path);
  const fm = splitFrontmatter(src);
  if (expect !== undefined && fm.body.trim() !== expect.trim())
    throw new EditConflict("the file was changed meanwhile");
  const head = src.slice(0, src.length - fm.body.length);
  writeText(path, head + content.replace(/\s+$/, "") + `
`);
}
var ROOT_SCOPE = "_root", commentsPath = (root, scope) => join4(scopeDir(root, scope), "comments.json"), EditConflict;
var init_comments = __esm(() => {
  init_files();
  init_schema();
  EditConflict = class EditConflict extends Error {
  };
});

// src/core/handoff.ts
import { join as join5 } from "path";
function optionLabel(step, id) {
  if (!id)
    return "";
  const o = step.options.find((o) => o.id === id);
  return o ? o.label : id;
}
function compileHandoff(ws, project, sessionIds) {
  const t = labels(ws.config.locale);
  const ids = sessionIds?.length ? sessionIds : project.sessions.map((s) => s.id);
  const sessions = ids.map((id) => ({ s: loadSession(ws.root, project.id, id), r: loadResults(ws.root, project.id, id) })).filter((x) => !!x.s);
  const out = [];
  out.push(`# ${t.handoff}: ${project.name}`, "");
  out.push(`> ${t.handoffGenerated} ${sessions.map((x) => `\`${x.s.file}\``).join(", ") || "\u2014"}. ${t.handoffEnrich}`, "");
  for (const key of ["problem", "for whom", "metric", "solution", "done when", "out of scope"]) {
    const k = Object.keys(project.sections).find((s) => s.startsWith(key) || s.startsWith(t.sectionAlias[key] ?? "\x00"));
    if (k && project.sections[k])
      out.push(`## ${k[0].toUpperCase()}${k.slice(1)}`, "", project.sections[k], "");
  }
  if (project.metrics.length)
    out.push(`## ${t.metrics}`, "", bullet(project.metrics.map((m) => `${m.name}${m.baseline ? ` \u2014 ${t.baseline} ${m.baseline}` : ""}${m.target ? `, ${t.target} ${m.target}` : ""}`)), "");
  const decided = [];
  const deferred = [];
  const open = [];
  const triaged = new Map;
  const answers = [];
  const agreed = [];
  const polls = [];
  const annotations = [];
  for (const { s, r } of sessions) {
    for (const a of r.annotations)
      annotations.push({ a, session: s.id });
    for (const step of allSteps(s)) {
      if (step.type === "broken" || step.type === "slide")
        continue;
      const res = r.steps[step.id];
      const note = q(res?.note) ? `
  ${t.note}: ${q(res?.note)}` : "";
      if (res?.status === "deferred" || res?.status === "escalated") {
        deferred.push(`**${step.title}** \u2014 ${res.status === "deferred" ? t.deferred : t.escalated}${q(res.reason) ? `: ${q(res.reason)}` : ""}${note}`);
        continue;
      }
      if (step.type === "choice") {
        if (!res?.value) {
          open.push(`**${step.title}**${step.recommended ? ` (${t.recommended}: ${optionLabel(step, step.recommended)})` : ""}`);
          continue;
        }
        decided.push(renderDecision(step, res.value, res, t, decided.length + 1));
      } else if (step.type === "triage") {
        const scale = step.scale ?? "priority";
        if (res?.value && scaleValues[scale].includes(res.value)) {
          if (!triaged.has(scale))
            triaged.set(scale, new Map(scaleValues[scale].map((v) => [v, []])));
          triaged.get(scale).get(res.value).push(`${step.title}${q(res.note) ? ` \u2014 ${q(res.note)}` : ""}`);
        } else
          open.push(`**${step.title}** (${t.notTriaged})`);
      } else if (step.type === "question") {
        if (q(res?.value))
          answers.push(`**${step.title}**
  ${q(res?.value).replace(/\n/g, `
  `)}${note}`);
        else
          open.push(`**${step.title}**`);
      } else if (step.type === "checkpoint") {
        const v = res?.value;
        if (v)
          agreed.push(`**${step.title}** \u2192 ${t.agree.values[v]?.[0] ?? v}${q(res?.note) ? `
  ${q(res?.note)}` : ""}${tallyCheckpoint(res?.votes, t)}`);
        else
          open.push(`**${step.title}**`);
      } else if (step.type === "poll") {
        const votes = Object.entries(res?.votes ?? {});
        const tally = votes.length ? tallyVotes(step.answers, votes.map(([, v]) => v)) : "";
        if (res?.value || votes.length)
          polls.push(`**${step.title}** \u2192 ${res?.value ?? "\u2014"}${tally ? ` (${tally})` : ""}${note}`);
        else
          open.push(`**${step.title}**`);
      }
    }
  }
  if (agreed.length)
    out.push(`## ${t.agree.title}`, "", bullet(agreed), "");
  if (decided.length)
    out.push(`## ${t.decisions}`, "", decided.join(`

`), "");
  for (const scale of triageScales) {
    const buckets = triaged.get(scale);
    if (!buckets)
      continue;
    out.push(`## ${t.scaleTitles[scale]}`, "");
    for (const [v, items] of buckets)
      if (items.length)
        out.push(`### ${t.scales[scale][v]?.[0] ?? v}`, "", bullet(items), "");
  }
  if (polls.length)
    out.push(`## ${t.polls}`, "", bullet(polls), "");
  if (answers.length)
    out.push(`## ${t.answers}`, "", bullet(answers), "");
  if (annotations.length) {
    out.push(`## ${t.changeRequests}`, "");
    for (const { a } of annotations)
      out.push(`- [${t.annotationKinds[a.kind]}] \`${a.src}\`${a.label ? ` \xB7 ${a.label}` : ""}${a.author ? ` \xB7 ${a.author}` : ""}: ${a.text}`);
    out.push("");
  }
  const threads = anchorThreads(ws.root, project.id, loadComments(ws.root, project.id)).filter((th) => th.status === "open");
  if (threads.length)
    out.push(`## ${t.cm.comments}`, "", bullet(threads.map((th) => {
      const where = th.target.kind === "text" ? { ...th.target, line: th.line ?? undefined } : th.target;
      const [first, ...rest] = th.comments;
      return `\`${targetLabel(where)}\` \xB7 ${first.author}: ${first.text}${rest.length ? ` (+${rest.length})` : ""}${th.outdated ? " _(outdated)_" : ""}`;
    })), "");
  if (deferred.length)
    out.push(`## ${t.deferredTitle}`, "", bullet(deferred), "");
  if (open.length)
    out.push(`## ${t.openTitle}`, "", bullet(open), "");
  if (project.prototypes.length)
    out.push(`## ${t.prototypes}`, "", bullet(project.prototypes.map((p) => `[${p.title}](${p.file})${p.description ? ` \u2014 ${p.description}` : ""}`)), "");
  return out.join(`
`).replace(/\n{3,}/g, `

`).trimEnd() + `
`;
}
function tallyCheckpoint(votes, t) {
  const all = Object.entries(votes ?? {});
  if (!all.length)
    return "";
  return ` (${all.map(([who, v]) => `${who}: ${t.agree.values[v]?.[0] ?? v}`).join(", ")})`;
}
function tallyVotes(answers, values) {
  const counts = new Map;
  for (const v of values)
    counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...answers, ...[...counts.keys()].filter((k) => !answers.includes(k))].filter((a) => counts.get(a)).map((a) => `${a} ${counts.get(a)}`).join(" \xB7 ");
}
function renderDecision(step, value, res, t, n) {
  const lines = [];
  const meta = [step.level, step.reversibility, step.timing === "later" ? t.timingLater : ""].filter(Boolean).join(" \xB7 ");
  lines.push(`### D${n}. ${step.title}${meta ? ` _(${meta})_` : ""}`);
  if (step.problem)
    lines.push(`${t.ctx.problem}: ${q(step.problem)}`);
  if (step.why)
    lines.push(`${t.ctx.why}: ${q(step.why)}`);
  if (value === "other") {
    lines.push(`**${t.decision}:** ${t.ownOption}: ${q(res.other?.text) || "\u2014"}`);
    if (res.other?.sketch)
      lines.push(`${t.sketch}: ${res.other.sketch}`);
  } else {
    const o = step.options.find((o) => o.id === value);
    lines.push(`**${t.decision}:** ${o?.label ?? value}${o?.summary ? ` \u2014 ${o.summary}` : ""}`);
    if (o?.consequence)
      lines.push(`${t.ctx.consequence}: ${o.consequence}`);
    if (o?.body)
      lines.push(o.body.trim());
    if (o?.enables?.length)
      lines.push(`${t.enables}: ${o.enables.join("; ")}`);
    if (o?.forecloses?.length)
      lines.push(`${t.forecloses}: ${o.forecloses.join("; ")}`);
    if (o?.effort)
      lines.push(`${t.effort}: ${o.effort}`);
  }
  if (step.recommended && step.recommended !== value)
    lines.push(`_${t.recommendedWas}: ${optionLabel(step, step.recommended)}_`);
  if (q(res.note))
    lines.push(`${t.note}: ${q(res.note)}`);
  const votes = Object.entries(res.votes ?? {});
  if (votes.length)
    lines.push(`${t.votes}: ${votes.map(([who, v]) => `${who} \u2192 ${optionLabel(step, v)}`).join(", ")}`);
  const rejected = step.options.filter((o) => o.id !== value && !o.baseline);
  if (rejected.length)
    lines.push(`${t.rejected}: ${rejected.map((o) => `${o.label}${o.cons?.length ? ` (${o.cons.join("; ")})` : ""}`).join(" \xB7 ")}`);
  return lines.join(`
`);
}
function writeHandoff(ws, project, sessionIds) {
  const md = compileHandoff(ws, project, sessionIds);
  writeText(join5(ws.root, project.dir, "handoff.md"), md);
  return md;
}
var q = (s) => (s ?? "").trim(), bullet = (items) => items.map((i) => `- ${i}`).join(`
`);
var init_handoff = __esm(() => {
  init_files();
  init_workspace();
  init_i18n();
  init_scales();
  init_comments();
});

// src/core/ops.ts
function applyOp(r, op, now = new Date().toISOString()) {
  const next = JSON.parse(JSON.stringify(r));
  next.startedAt ??= now;
  next.updatedAt = now;
  switch (op.op) {
    case "step": {
      if (op.patch === null) {
        delete next.steps[op.step];
        break;
      }
      const prev = next.steps[op.step] ?? {};
      const merged = { ...prev, ...op.patch, at: now };
      for (const k of Object.keys(merged))
        if (merged[k] === undefined || merged[k] === null || merged[k] === "")
          delete merged[k];
      next.steps[op.step] = merged;
      break;
    }
    case "vote": {
      const prev = next.steps[op.step] ?? {};
      const votes = { ...prev.votes ?? {} };
      if (op.value === null)
        delete votes[op.voter];
      else
        votes[op.voter] = op.value;
      next.steps[op.step] = { ...prev, votes };
      break;
    }
    case "current":
      next.current = op.step;
      break;
    case "annotate": {
      const i = next.annotations.findIndex((a) => a.id === op.annotation.id);
      const a = { ...op.annotation, at: op.annotation.at ?? now };
      if (i >= 0)
        next.annotations[i] = a;
      else
        next.annotations.push(a);
      break;
    }
    case "unannotate":
      next.annotations = next.annotations.filter((a) => a.id !== op.id);
      break;
    case "reset":
      return { session: r.session, steps: {}, annotations: [] };
  }
  return next;
}

// src/core/results.ts
import { join as join6 } from "path";
function resultsPath(root, project, session) {
  return join6(root, `projects/${project}/sessions/${session}.results.json`);
}
function updateResults(root, project, session, op) {
  const next = applyOp(loadResults(root, project, session), op);
  writeText(resultsPath(root, project, session), JSON.stringify(next, null, 2) + `
`);
  return next;
}
var init_results = __esm(() => {
  init_files();
  init_workspace();
});

// src/core/requests.ts
import { existsSync as existsSync5, rmSync } from "fs";
import { join as join7 } from "path";
function listRequests(root) {
  return listDir(requestsDir(root)).filter((f) => f.endsWith(".json")).map((f) => {
    try {
      const r = Request.safeParse(JSON.parse(readText(join7(requestsDir(root), f))));
      return r.success ? r.data : null;
    } catch {
      return null;
    }
  }).filter((r) => !!r).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
function getRequest(root, id) {
  const path = join7(requestsDir(root), `${id}.json`);
  if (!existsSync5(path))
    return null;
  try {
    const r = Request.safeParse(JSON.parse(readText(path)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
function saveRequest(root, r) {
  writeText(join7(requestsDir(root), `${r.id}.json`), JSON.stringify(r, null, 2) + `
`);
}
function update(root, id, fn) {
  const r = getRequest(root, id);
  if (!r)
    return null;
  const next = fn(r);
  if (!next)
    return null;
  next.updatedAt = new Date().toISOString();
  saveRequest(root, next);
  return next;
}
function createRequest(root, input) {
  const now = new Date;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const r = {
    ...input,
    text: input.text ?? "",
    log: [],
    id: `r-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
    status: "open",
    createdAt: now.toISOString()
  };
  saveRequest(root, r);
  return r;
}
function claimRequest(root, id, owner) {
  return update(root, id, (r) => r.status !== "open" ? null : { ...r, status: "working", owner, startedAt: new Date().toISOString(), finishedAt: undefined, message: undefined });
}
function setRequestStatus(root, id, status, message) {
  return update(root, id, (r) => ({
    ...r,
    status,
    message: message ?? (status === "open" ? undefined : r.message),
    ...status === "done" || status === "failed" || status === "cancelled" ? { finishedAt: new Date().toISOString() } : {},
    ...status === "open" ? { owner: undefined, startedAt: undefined, finishedAt: undefined } : {}
  }));
}
function appendLog(root, id, entries) {
  if (!entries.length)
    return null;
  const at = new Date().toISOString();
  return update(root, id, (r) => ({ ...r, log: [...r.log, ...entries.map((e) => ({ ...e, at }))].slice(-300) }));
}
function writeHeartbeat(root, hb) {
  writeText(heartbeatPath(root), JSON.stringify({ ...hb, beatAt: new Date().toISOString() }, null, 2) + `
`);
}
function clearHeartbeat(root, pid) {
  const hb = readHeartbeat(root);
  if (hb?.pid === pid)
    rmSync(heartbeatPath(root), { force: true });
}
function readHeartbeat(root) {
  try {
    const hb = JSON.parse(readText(heartbeatPath(root)));
    const fresh = Date.now() - Date.parse(hb.beatAt) < 12000;
    return { ...hb, alive: fresh && pidAlive(hb.pid) };
  } catch {
    return null;
  }
}
function requeueStale(root) {
  const out = [];
  for (const r of listRequests(root)) {
    if (r.status !== "working")
      continue;
    const last = Date.parse(r.log.at(-1)?.at ?? r.updatedAt ?? r.startedAt ?? r.createdAt);
    const gone = r.owner?.mode === "listen" || !r.owner ? Date.now() - last > 15 * 60000 : !pidAlive(r.owner.pid);
    if (!gone)
      continue;
    appendLog(root, r.id, [{ kind: "status", text: "requeued: the agent working on it is gone" }]);
    setRequestStatus(root, r.id, "open");
    out.push(r.id);
  }
  return out;
}
function fixPrompt(r, problems) {
  return [
    `You just worked on live omgp request ${r.id} for project ${r.project}, and the prototype you changed is broken now. A real browser reported:`,
    ...problems.slice(0, 12).map((p) => `- ${p}`),
    `Fix these in the prototype without undoing what the request asked for. Then run \`omgp check ${r.project} --shots\` until it reports ok, and look at the screenshots of the states you changed. Keep it small: people are waiting in a meeting.`
  ].join(`
`);
}
function requestPrompt(r, mode = "listen") {
  const where = r.session ? `projects/${r.project}/sessions/${r.session}.yaml` : `projects/${r.project}/`;
  const threads = r.threads?.length ? ` and address the comment threads ${r.threads.join(", ")} (read them with \`omgp comments ${r.project}\`; afterwards \`omgp reply <thread> "<what changed>"\` and \`omgp resolve <thread>\` for each)` : "";
  const what = {
    option: `Someone in the meeting rejected the options of step "${r.step}" and described their own. Append it as a new option (id "custom-<n>", requestId "${r.id}") with a visual of the same type as the sibling options so the studio can diff it, plus pros, cons and effort.`,
    "revise-option": `Rebuild option "${r.option}" of step "${r.step}" as described${threads}. Keep its id; update label, summary, visual (same type as its siblings, stable ids so it still diffs), pros, cons, effort, enables and forecloses so they match.`,
    "revise-step": `Rebuild decision "${r.step}" as described${threads}: options, their visuals, recommendation and because. Keep option ids that still make sense; results already recorded refer to them.`,
    visual: `Add or improve the visual of step "${r.step}" as described.`,
    step: `Add a new step after "${r.step}" as described.`,
    prototype: `Change the prototype as described. Fork it to a new file if the change is a real alternative.`,
    comment: `Address comment thread ${r.thread} (run \`omgp comments ${r.project}\` to read it with its target). Change the file it points at as asked. Then \`omgp reply ${r.thread} "<what you changed>"\` and \`omgp resolve ${r.thread}\`. If it needs a human decision instead, reply with the question and leave it open.`
  };
  const check = `If you changed a prototype, look at it before you finish: \`omgp check ${r.project} --shots\` opens it in a real browser, visits every #state the sessions use and saves a screenshot per state. Fix every problem it reports, then open the screenshots of the states you changed with your file reader and make sure they show what was asked. Never say it works unless the check passes and you saw it.`;
  const finish = mode === "worker" ? `${check} When you are done, run \`omgp validate\` and fix every error in the files you touched. You don't need to call \`omgp done\`; the worker marks the request when you exit.` : `${check} Then run \`omgp validate\` and \`omgp done ${r.id}\` (or \`omgp done ${r.id} --fail "why"\`). While you work, report each step in a few words with \`omgp progress ${r.id} "<what you're doing>"\` so the room can follow.`;
  return [
    `Live omgp request ${r.id} (${r.kind}). People are waiting in a meeting: keep it small, fast and correct.`,
    `File: ${where}`,
    what[r.kind],
    r.text ? `What they said: """${r.text}"""` : "",
    r.sketch ? `Their sketch (look at it): ${r.sketch}` : "",
    finish,
    `How to write it: ${skillsDir}/omgp-facilitate/SKILL.md and ${skillsDir}/omgp-kickoff/SKILL.md. File format: ${skillsDir}/omgp/references/format.md. Write in the session's language.`,
    `If the workspace has a rules.md, read it first: the team's rules win over the skills.`
  ].filter(Boolean).join(`
`);
}
var requestsDir = (root) => join7(root, ".omgp", "requests"), heartbeatPath = (root) => join7(root, ".omgp", "agent.json"), pidAlive = (pid) => {
  if (!pid)
    return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}, skillsDir;
var init_requests = __esm(() => {
  init_paths();
  init_files();
  init_schema();
  skillsDir = SKILLS_DIR;
});

// src/core/proto-check.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync2, mkdtempSync, readdirSync as readdirSync2, rmSync as rmSync2, writeFileSync as writeFileSync2 } from "fs";
import { tmpdir } from "os";
import { basename, join as join8 } from "path";
import { pathToFileURL } from "url";
function findChrome() {
  const env = process.env.OMGP_CHROME;
  if (env && existsSync6(env))
    return env;
  const fixed = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const p of fixed)
    if (existsSync6(p))
      return p;
  const cache = join8(process.env.HOME ?? "", process.platform === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  if (existsSync6(cache))
    for (const d of readdirSync2(cache).filter((d) => d.startsWith("chromium-")).sort().reverse())
      for (const sub of ["chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        const p = join8(cache, d, sub);
        if (existsSync6(p))
          return p;
      }
  return null;
}
async function checkPrototype(file, states, opts = {}) {
  const all = states.some((s) => s.hash === "") ? states : [{ hash: "" }, ...states];
  const result = { file, states: all.map((s) => s.hash), problems: [], shots: [] };
  const chrome = findChrome();
  if (!chrome)
    return { ...result, skipped: "no Chrome or Chromium found (set OMGP_CHROME)" };
  const profile = mkdtempSync(join8(tmpdir(), "omgp-chrome-"));
  const proc = Bun.spawn([
    chrome,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--mute-audio",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "about:blank"
  ], { stdout: "ignore", stderr: "ignore" });
  let ws = null;
  try {
    let port = "";
    let path = "";
    for (let i = 0;i < 100 && !port; i++) {
      const f = join8(profile, "DevToolsActivePort");
      if (existsSync6(f))
        [port, path] = (await Bun.file(f).text()).split(`
`);
      if (!port)
        await sleep(100);
    }
    if (!port)
      throw new Error("Chrome did not start");
    ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    await new Promise((ok, fail) => (ws.onopen = ok, ws.onerror = () => fail(new Error("cannot reach Chrome"))));
    let seq = 0;
    const pending = new Map;
    const listeners = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result);
      } else if (m.method)
        for (const l of listeners)
          l(m.method, m.params);
    };
    const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
      const id = ++seq;
      pending.set(id, { ok, fail });
      ws.send(JSON.stringify({ id, method, params, ...sessionId ? { sessionId } : {} }));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params = {}) => send(method, params, sessionId);
    let current = "";
    let loaded = false;
    listeners.push((method, p) => {
      if (method === "Page.loadEventFired")
        loaded = true;
      if (method === "Runtime.exceptionThrown") {
        const d = p.exceptionDetails;
        const text = (d.exception?.description ?? d.text ?? "error").split(`
`).slice(0, 2).join(" ");
        result.problems.push({ state: current, kind: "exception", text: `${text}${d.lineNumber != null ? ` (line ${d.lineNumber + 1})` : ""}` });
      }
      if (method === "Runtime.consoleAPICalled" && p.type === "error")
        result.problems.push({ state: current, kind: "console", text: p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300) });
      if (method === "Log.entryAdded" && p.entry.level === "error" && !/favicon/.test(p.entry.url ?? ""))
        result.problems.push({ state: current, kind: "load", text: `${p.entry.text}${p.entry.url ? ` ${p.entry.url}` : ""}`.slice(0, 300) });
    });
    await page("Page.enable");
    await page("Runtime.enable");
    await page("Log.enable");
    await page("Emulation.setDeviceMetricsOverride", { width: opts.width ?? 1280, height: opts.height ?? 860, deviceScaleFactor: 1, mobile: false });
    await page("Page.navigate", { url: pathToFileURL(file).href });
    for (let i = 0;i < 80 && !loaded; i++)
      await sleep(100);
    if (!loaded)
      result.problems.push({ state: "", kind: "load", text: "page did not finish loading in 8s" });
    await sleep(400);
    if (opts.shots)
      mkdirSync2(opts.shots, { recursive: true });
    const name = basename(file).replace(/\.html?$/, "");
    for (const s of all) {
      current = s.hash;
      if (s.hash) {
        await page("Runtime.evaluate", { expression: `location.hash = ${JSON.stringify(s.hash)}` });
        await sleep(350);
      }
      const probe = await page("Runtime.evaluate", {
        expression: `(() => ({ text: (document.body?.innerText ?? "").trim().length, missing: ${JSON.stringify(s.focus ?? [])}.filter((q) => { try { return !document.querySelector(q) } catch { return true } }) }))()`,
        returnByValue: true
      });
      const v = probe.result?.value ?? { text: 0, missing: [] };
      if (v.text < 20)
        result.problems.push({ state: s.hash, kind: "blank", text: "the page is (almost) empty" });
      for (const q of v.missing)
        result.problems.push({ state: s.hash, kind: "focus", text: `focus "${q}" is not on the page` });
      if (opts.shots) {
        const shot = await page("Page.captureScreenshot", { format: "png" });
        const out = join8(opts.shots, `${name}--${(s.hash || "start").replace(/[^\w-]+/g, "_")}.png`);
        writeFileSync2(out, Buffer.from(shot.data, "base64"));
        result.shots.push(out);
      }
    }
    await send("Browser.close").catch(() => {});
  } catch (e) {
    result.problems.push({ state: "", kind: "load", text: e.message });
  } finally {
    ws?.close();
    proc.kill();
    await proc.exited.catch(() => {});
    rmSync2(profile, { recursive: true, force: true });
  }
  return result;
}
function formatCheck(c, rel) {
  if (c.skipped)
    return [`${rel}: not checked, ${c.skipped}`];
  const lines = [`${rel}: ${c.problems.length ? `${c.problems.length} problem${c.problems.length > 1 ? "s" : ""}` : "ok"} in ${c.states.length} state${c.states.length > 1 ? "s" : ""}`];
  for (const p of c.problems)
    lines.push(`  \u2717 ${p.state ? `#${p.state}` : "start"} ${p.kind}: ${p.text}`);
  if (c.shots.length)
    lines.push(`  screenshots (look at them with your file reader):`, ...c.shots.map((s) => `    ${s}`));
  return lines;
}
function prototypeTargets(ws, project, only) {
  const dir = join8(ws.root, "projects", project.id);
  const byFile = new Map;
  for (const p of project.prototypes)
    byFile.set(p.file, new Map([["", new Set]]));
  for (const s of project.sessions) {
    const loaded = loadSession(ws.root, project.id, s.id);
    for (const step of loaded ? allSteps(loaded) : []) {
      if (step.type === "broken")
        continue;
      for (const v of stepVisuals(step)) {
        if (v.type !== "prototype" || /^https?:/.test(v.src))
          continue;
        const [path, hash = ""] = v.src.split("#");
        const states = byFile.get(path) ?? byFile.set(path, new Map).get(path);
        const focus = states.get(hash) ?? states.set(hash, new Set).get(hash);
        if (v.focus)
          focus.add(v.focus);
      }
    }
  }
  return [...byFile].filter(([rel]) => !only || rel === only || rel.endsWith(`/${only}`) || basename(rel) === only).map(([rel, states]) => ({ rel, abs: join8(dir, rel), states: [...states].map(([hash, f]) => ({ hash, focus: [...f] })) }));
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var init_proto_check = __esm(() => {
  init_workspace();
});

// src/core/agent-runner.ts
import { existsSync as existsSync7, statSync as statSync2 } from "fs";
import { basename as basename2 } from "path";
function describeAgent(cfg) {
  return cfg.preset ? `${cfg.preset}${cfg.model ? ` (${cfg.model})` : ""}` : cfg.command ?? "agent";
}
function invocation(cfg, prompt) {
  switch (cfg.preset) {
    case "claude":
      return {
        cmd: [
          "claude",
          "-p",
          "--output-format",
          "stream-json",
          "--verbose",
          "--permission-mode",
          "acceptEdits",
          "--allowedTools",
          "Read",
          "Edit",
          "Write",
          "Glob",
          "Grep",
          "Bash(omgp:*)",
          "--add-dir",
          skillsDir2,
          ...cfg.model ? ["--model", cfg.model] : []
        ],
        stdin: prompt,
        parse: "claude"
      };
    case "codex":
      return { cmd: ["codex", "exec", "--full-auto", ...cfg.model ? ["--model", cfg.model] : [], prompt], parse: "lines" };
    case "opencode":
      return { cmd: ["opencode", "run", ...cfg.model ? ["--model", cfg.model] : [], prompt], parse: "lines" };
    case "pi":
      return { cmd: ["pi", "-p", prompt], parse: "lines" };
    default:
      return { cmd: ["sh", "-c", cfg.command ?? "false"], stdin: prompt, parse: "lines" };
  }
}
function describeTool(name, input, locale) {
  const w = words(locale);
  const file = (p) => typeof p === "string" ? basename2(p) : "";
  switch (name) {
    case "Read":
      return `${w.read} ${file(input.file_path)}`;
    case "Edit":
    case "MultiEdit":
      return `${w.edit} ${file(input.file_path)}`;
    case "Write":
      return `${w.write} ${file(input.file_path)}`;
    case "Grep":
      return `${w.search} \u201C${String(input.pattern ?? "").slice(0, 40)}\u201D`;
    case "Glob":
      return `${w.find} ${String(input.pattern ?? "")}`;
    case "Bash": {
      const cmd = String(input.command ?? "");
      if (/omgp\s+validate/.test(cmd))
        return w.check;
      return typeof input.description === "string" && input.description ? input.description : `${w.run} ${cmd.slice(0, 60)}`;
    }
    case "Skill":
      return `${w.skill} ${String(input.skill ?? input.name ?? "")}`;
    case "TodoWrite": {
      const todos = input.todos ?? [];
      const now = todos.find((t) => t.status === "in_progress") ?? todos[0];
      return now ? `${w.plan}: ${now.content}` : w.plan;
    }
    default:
      return name;
  }
}
function parseClaudeLine(line, locale) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    return line.trim() ? [{ kind: "text", text: sentence(line) }] : [];
  }
  const out = [];
  if (ev.type === "assistant")
    for (const c of ev.message?.content ?? []) {
      if (c.type === "text" && c.text?.trim())
        out.push({ kind: "text", text: sentence(c.text) });
      if (c.type === "tool_use")
        out.push({ kind: "tool", text: describeTool(c.name, c.input ?? {}, locale) });
    }
  if (ev.type === "result" && ev.subtype !== "success")
    out.push({ kind: "error", text: `agent stopped: ${ev.subtype}` });
  return out;
}

class Runner {
  root;
  cfg;
  locale;
  opts;
  running = new Map;
  timers = [];
  startedAt = new Date().toISOString();
  constructor(root, cfg, locale, opts) {
    this.root = root;
    this.cfg = cfg;
    this.locale = locale;
    this.opts = opts;
  }
  start() {
    requeueStale(this.root);
    this.beat();
    this.timers.push(setInterval(() => this.tick(), 700));
    this.timers.push(setInterval(() => this.beat(), 3000));
    this.timers.push(setInterval(() => this.flush(), 400));
    this.timers.push(setInterval(() => requeueStale(this.root), 30000));
  }
  stop() {
    for (const t of this.timers)
      clearInterval(t);
    for (const [id, run] of this.running) {
      run.proc.kill();
      appendLog(this.root, id, [{ kind: "status", text: "worker stopped" }]);
      setRequestStatus(this.root, id, "open");
    }
    clearHeartbeat(this.root, process.pid);
  }
  beat() {
    writeHeartbeat(this.root, {
      pid: process.pid,
      mode: this.opts.mode,
      agent: describeAgent(this.cfg),
      startedAt: this.startedAt,
      busy: [...this.running.keys()]
    });
  }
  flush() {
    for (const [id, run] of this.running) {
      if (!run.buffer.length)
        continue;
      appendLog(this.root, id, run.buffer.splice(0));
    }
  }
  tick() {
    for (const [id, run] of this.running)
      if (getRequest(this.root, id)?.status === "cancelled") {
        run.proc.kill();
        this.running.delete(id);
      }
    if (this.running.size >= this.cfg.concurrency)
      return;
    const next = listRequests(this.root).find((r) => r.status === "open");
    if (next)
      this.run(next);
  }
  async run(r) {
    const claimed = claimRequest(this.root, r.id, { mode: this.opts.mode, pid: process.pid, agent: describeAgent(this.cfg) });
    if (!claimed)
      return;
    const run = { proc: null, started: Date.now(), buffer: [], stderr: [] };
    this.running.set(r.id, run);
    const push = (e) => {
      run.buffer.push(e);
      this.opts.onEntry?.(claimed, e);
    };
    const flushRun = () => run.buffer.length && appendLog(this.root, r.id, run.buffer.splice(0));
    const end = (status, note) => {
      flushRun();
      this.running.delete(r.id);
      setRequestStatus(this.root, r.id, status, note);
      this.opts.onFinish?.(getRequest(this.root, r.id));
    };
    const de = this.locale === "de";
    let code = await this.exec(claimed, requestPrompt(claimed, "worker"), run, push);
    if (code === null)
      return end("failed", `could not start the agent. Is it installed and on PATH?`);
    const now = getRequest(this.root, r.id);
    if (now && now.status !== "working") {
      flushRun();
      this.running.delete(r.id);
      return this.finish(r.id);
    }
    if (code !== 0) {
      push({ kind: "error", text: run.stderr.at(-1) ?? `exit code ${code}` });
      return end("failed", run.stderr.slice(-3).join(" ") || `agent exited with code ${code}`);
    }
    let broken = await this.brokenPrototypes(claimed, run.started);
    if (broken.length) {
      push({ kind: "status", text: de ? `Prototyp hat ${broken.length} Fehler, der Agent repariert sie` : `prototype has ${broken.length} problems, the agent fixes them` });
      for (const b of broken.slice(0, 3))
        push({ kind: "error", text: b });
      code = await this.exec(claimed, fixPrompt(claimed, broken), run, push);
      broken = code === 0 ? await this.brokenPrototypes(claimed, run.started) : broken;
      if (broken.length) {
        for (const b of broken.slice(0, 3))
          push({ kind: "error", text: b });
        return end("failed", `prototype still broken: ${broken[0]}`);
      }
      push({ kind: "status", text: de ? "Prototyp l\xE4uft wieder ohne Fehler" : "prototype renders without errors again" });
    }
    const errors = loadWorkspace(this.root).issues.filter((i) => i.level === "error" && i.file.startsWith(`projects/${r.project}/`));
    if (errors.length) {
      for (const e of errors.slice(0, 3))
        push({ kind: "error", text: `${e.file}: ${e.message}` });
      return end("failed", `${errors.length} validation errors left`);
    }
    push({ kind: "status", text: `done in ${Math.round((Date.now() - run.started) / 1000)}s` });
    end("done");
  }
  async exec(r, prompt, run, push) {
    const { cmd, stdin, parse } = invocation(this.cfg, prompt);
    push({ kind: "status", text: `${describeAgent(this.cfg)} started` });
    try {
      run.proc = Bun.spawn(cmd, {
        cwd: this.root,
        stdin: stdin ? new Blob([stdin]) : "ignore",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PATH: `${omgpBin}:${process.env.PATH}`, OMGP_DIR: this.root, OMGP_REQUEST: r.id }
      });
    } catch (e) {
      push({ kind: "error", text: `could not start ${cmd[0]}: ${e.message}` });
      return null;
    }
    const timeout = setTimeout(() => {
      push({ kind: "error", text: `timed out after ${this.cfg.timeout}s` });
      run.proc.kill();
    }, this.cfg.timeout * 1000);
    const lines = async (stream, each) => {
      const dec = new TextDecoder;
      const reader = stream.getReader();
      let rest = "";
      for (;; ) {
        const { value: chunk, done } = await reader.read();
        if (done)
          break;
        rest += dec.decode(chunk, { stream: true });
        const parts = rest.split(`
`);
        rest = parts.pop();
        for (const l of parts)
          each(l);
      }
      if (rest)
        each(rest);
    };
    await Promise.all([
      lines(run.proc.stdout, (l) => {
        if (parse === "claude")
          for (const e of parseClaudeLine(l, this.locale))
            push(e);
        else if (l.trim())
          push({ kind: "text", text: sentence(l, 200) });
      }),
      lines(run.proc.stderr, (l) => {
        if (l.trim())
          run.stderr.push(l.trim());
        run.stderr.splice(0, Math.max(0, run.stderr.length - 20));
      })
    ]);
    const code = await run.proc.exited;
    clearTimeout(timeout);
    return code;
  }
  async brokenPrototypes(r, since) {
    const ws = loadWorkspace(this.root);
    const project = ws.projects.find((p) => p.id === r.project);
    if (!project)
      return [];
    const out = [];
    for (const t of prototypeTargets(ws, project)) {
      if (!existsSync7(t.abs) || statSync2(t.abs).mtimeMs < since)
        continue;
      const res = await checkPrototype(t.abs, t.states);
      for (const p of res.problems)
        out.push(`${t.rel}${p.state ? `#${p.state}` : ""} ${p.kind}: ${p.text}`);
    }
    return out;
  }
  finish(id) {
    this.opts.onFinish?.(getRequest(this.root, id));
  }
}
var omgpBin, skillsDir2, words = (locale) => locale === "de" ? { read: "Liest", edit: "Bearbeitet", write: "Schreibt", run: "F\xFChrt aus", search: "Sucht", find: "Sucht Dateien", skill: "Nutzt Skill", plan: "Plant", check: "Pr\xFCft die Dateien" } : { read: "Reading", edit: "Editing", write: "Writing", run: "Running", search: "Searching for", find: "Looking for", skill: "Using skill", plan: "Planning", check: "Checking the files" }, sentence = (s, max = 180) => {
  const t = s.replace(/\s+/g, " ").trim();
  const cut = t.match(/^.{20,}?[.!?](\s|$)/)?.[0] ?? t;
  return cut.length > max ? cut.slice(0, max - 1) + "\u2026" : cut;
};
var init_agent_runner = __esm(() => {
  init_requests();
  init_workspace();
  init_proto_check();
  init_paths();
  omgpBin = BIN_DIR;
  skillsDir2 = SKILLS_DIR;
});

// src/core/session-edit.ts
import { join as join10 } from "path";
function findStep(doc, stepId) {
  const sections = doc.get("sections");
  if (!$isSeq(sections))
    return null;
  for (const sec of sections.items) {
    if (!$isMap(sec))
      continue;
    const steps = sec.get("steps");
    if (!$isSeq(steps))
      continue;
    for (const st of steps.items)
      if ($isMap(st) && st.get("id") === stepId)
        return st;
  }
  return null;
}
function resolvePath(step, path) {
  return path.map((seg, i) => {
    if (typeof seg !== "string" || !seg.startsWith("@"))
      return seg;
    const list = step.getIn(path.slice(0, i));
    if (!$isSeq(list))
      throw new EditConflict(`${path.slice(0, i).join(".")} is not a list`);
    const idx = list.items.findIndex((it) => $isMap(it) && it.get("id") === seg.slice(1));
    if (idx < 0)
      throw new EditConflict(`no option "${seg.slice(1)}"`);
    return idx;
  });
}
function scalarText(v) {
  if (typeof v !== "string")
    return String(v);
  const risky = /^[\s\-?:,[\]{}#&*!|>'"%@`]|[:#]\s|[,[\]{}]|\s$|^(true|false|null|yes|no|on|off|~)$|^[\d.+-]+$/i;
  return risky.test(v) || v === "" ? JSON.stringify(v) : v;
}
function keyLines(key, value, indent, src) {
  if (typeof value === "string" && value.includes(`
`))
    return `${indent}${key}: |
${value.replace(/\s+$/, "").split(`
`).map((l) => l ? `${indent}  ${l}` : "").join(`
`)}
`;
  if (Array.isArray(value)) {
    const inline = inlineSeq(src, value);
    if (inline.length < 90)
      return `${indent}${key}: ${inline}
`;
    return `${indent}${key}:
${value.map((v) => `${indent}  - ${scalarText(v)}
`).join("")}`;
  }
  return `${indent}${key}: ${scalarText(value)}
`;
}
function textEdit(src, parent, key, node, value, remove) {
  if (!remove && $isScalar(node) && node.range && ["string", "number", "boolean"].includes(typeof value)) {
    const [s, e] = node.range;
    const str = String(value);
    if (node.type === "BLOCK_LITERAL" || node.type === "BLOCK_FOLDED") {
      const indent = src.slice(s, e).match(/\n( +)\S/)?.[1] ?? " ".repeat(columnOf(src, s) + 2);
      return splice(src, s, e, `|
` + str.replace(/\s+$/, "").split(`
`).map((l) => l ? indent + l : "").join(`
`) + `
`);
    }
    if (!str.includes(`
`))
      return splice(src, s, e, scalarText(value));
    if ($isMap(parent) && !parent.flow) {
      const pair = parent.items.find((p) => p.value === node);
      const col = pair ? columnOf(src, pair.key.range[0]) : columnOf(src, s);
      return splice(src, s, e, `|
` + str.replace(/\s+$/, "").split(`
`).map((l) => l ? " ".repeat(col + 2) + l : "").join(`
`));
    }
    return null;
  }
  if (!remove && $isSeq(node) && node.range && Array.isArray(value) && value.every((v) => typeof v !== "object")) {
    const seq = node;
    const [s, e] = seq.range;
    if (seq.flow)
      return splice(src, s, e, inlineSeq(src, value));
    const col = columnOf(src, s);
    return splice(src, lineStart(src, s), lineEnd(src, e - 1), value.map((v) => `${" ".repeat(col)}- ${scalarText(v)}
`).join(""));
  }
  if (!$isMap(parent) || typeof key !== "string")
    return null;
  const map = parent;
  if (remove) {
    if (map.flow || node === undefined)
      return node === undefined ? src : null;
    const pair = map.items.find((p) => ($isScalar(p.key) ? p.key.value : p.key) === key);
    if (!pair)
      return src;
    const from = lineStart(src, pair.key.range[0]);
    const end = pairEnd(pair);
    return splice(src, from, src[end - 1] === `
` ? end : lineEnd(src, end), "");
  }
  if (node === undefined && map.range) {
    if (map.flow) {
      if (typeof value === "string" && value.includes(`
`))
        return null;
      const close = src.lastIndexOf("}", map.range[1]);
      const pad = src[close - 1] === " " ? 1 : 0;
      const inline = Array.isArray(value) ? inlineSeq(src, value) : scalarText(value);
      return splice(src, close - pad, close - pad, `, ${key}: ${inline}`);
    }
    const first = map.items[0];
    if (!first)
      return null;
    const indent = " ".repeat(columnOf(src, first.key.range[0]));
    const end = pairEnd(map.items[map.items.length - 1]);
    const at = src[end - 1] === `
` ? end : lineEnd(src, end);
    return splice(src, at, at, keyLines(key, value, indent, src));
  }
  return null;
}
function renderStep(src, step) {
  const [s, e] = step.range;
  const col = columnOf(src, s);
  const d = new $Document;
  d.contents = step;
  const out = d.toString({ lineWidth: 0 }).replace(/\n+$/, "");
  const indented = out.split(`
`).map((l, i) => i === 0 || !l ? l : " ".repeat(col) + l).join(`
`);
  const tail = src.slice(e);
  return src.slice(0, s) + indented + (tail.startsWith(`
`) ? "" : `
`) + tail;
}
function patchStep(root, project, session, stepId, path, value, expect) {
  const file = join10(root, "projects", project, "sessions", `${session}.yaml`);
  const src = readText(file);
  const doc = exports_dist.parseDocument(src);
  const step = findStep(doc, stepId);
  if (!step?.range)
    throw new EditConflict(`no step "${stepId}" in ${session}.yaml`);
  const p = resolvePath(step, path);
  if (expect !== undefined) {
    const current = plain(step.getIn(p));
    if (JSON.stringify(current ?? null) !== JSON.stringify(expect ?? null))
      throw new EditConflict(`${p.join(".")} was changed meanwhile`);
  }
  const remove = value === null || value === undefined || value === "" || Array.isArray(value) && !value.length;
  const parent = p.length > 1 ? step.getIn(p.slice(0, -1), true) : step;
  const node = step.getIn(p, true);
  const edited = textEdit(src, parent, p[p.length - 1], node, value, remove);
  if (edited != null) {
    exports_dist.parseDocument(edited, { prettyErrors: true }).errors.forEach((e) => {
      throw new EditConflict(`edit would break the YAML: ${e.message}`);
    });
    return writeText(file, edited);
  }
  if (remove)
    step.deleteIn(p);
  else
    step.setIn(p, value);
  writeText(file, renderStep(src, step));
}
var plain = (v) => v && typeof v === "object" && ("toJSON" in v) ? v.toJSON() : v, lineStart = (src, off) => src.lastIndexOf(`
`, off - 1) + 1, lineEnd = (src, off) => {
  const i = src.indexOf(`
`, off);
  return i < 0 ? src.length : i + 1;
}, columnOf = (src, off) => off - lineStart(src, off), splice = (src, from, to, text) => src.slice(0, from) + text + src.slice(to), inlineSeq = (src, items) => {
  const padded = (src.match(/\[ \S/g)?.length ?? 0) > (src.match(/\[[^\s\]]/g)?.length ?? 0);
  const inner = items.map(scalarText).join(", ");
  return padded ? `[ ${inner} ]` : `[${inner}]`;
}, pairEnd = (p) => {
  const v = p.value;
  const k = p.key;
  return v?.range?.[1] ?? k.range[1];
};
var init_session_edit = __esm(() => {
  init_dist();
  init_files();
  init_comments();
});

// src/core/pulse-files.ts
import { existsSync as existsSync8, readFileSync as readFileSync3, rmSync as rmSync3 } from "fs";
import { join as join11 } from "path";
function loadPulse(root) {
  const days = [];
  for (const date of listDir(join11(root, "pulse"))) {
    if (!DATE.test(date))
      continue;
    for (const file of listDir(join11(root, "pulse", date))) {
      if (!file.endsWith(".yaml"))
        continue;
      try {
        const raw = parseYaml(readFileSync3(join11(root, "pulse", date, file), "utf8"));
        const duels = (Array.isArray(raw?.duels) ? raw.duels : []).map(fromFile).filter(isDuel);
        const u = raw?.unclear;
        const unclear = Array.isArray(u) ? u.map(String) : [];
        days.push({ voter: String(raw?.voter ?? file.replace(/\.yaml$/, "")), date, duels, ...unclear.length ? { unclear } : {} });
      } catch {}
    }
  }
  return days;
}
function savePulseDuel(root, voter, date, duel, undo = false) {
  if (!DATE.test(date))
    throw new Error("date must be YYYY-MM-DD");
  if (!isDuel(duel))
    throw new Error("a duel is { win, over } with two different projects");
  const path = join11(root, "pulse", date, `${voterSlug(voter)}.yaml`);
  const before = existsSync8(path) ? loadPulse(root).filter((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter)) : [];
  writeDay(path, addDuel(before, voter, date, duel, undo)[0], date);
}
function savePulseUnclear(root, voter, date, project, undo = false) {
  if (!DATE.test(date))
    throw new Error("date must be YYYY-MM-DD");
  const path = join11(root, "pulse", date, `${voterSlug(voter)}.yaml`);
  const before = existsSync8(path) ? loadPulse(root).filter((d) => d.date === date && voterSlug(d.voter) === voterSlug(voter)) : [];
  writeDay(path, markUnclear(before, voter, date, project, undo)[0], date);
}
function writeDay(path, day, date) {
  if (!day)
    return rmSync3(path, { force: true });
  writeText(path, yamlStringify({
    voter: day.voter,
    date,
    duels: day.duels.map((d) => d.neither ? { neither: [d.win, d.over] } : { win: d.win, over: d.over }),
    ...day.unclear?.length ? { unclear: day.unclear } : {}
  }));
}
var DATE, fromFile = (d) => {
  const n = d?.neither;
  return Array.isArray(n) && n.length === 2 ? { win: String(n[0]), over: String(n[1]), neither: true } : d && { win: d.win, over: d.over };
}, pulseProjects = (ws) => ws.projects.filter((p) => inPulse(p, ws.config.profile?.doneMeans)).map((p) => p.id);
var init_pulse_files = __esm(() => {
  init_files();
  init_pulse();
  DATE = /^\d{4}-\d{2}-\d{2}$/;
});

// src/server/server.ts
import { watch, existsSync as existsSync9, readFileSync as readFileSync4, writeFileSync as writeFileSync3, mkdirSync as mkdirSync3 } from "fs";
import { networkInterfaces } from "os";
import { extname, join as join12, normalize, resolve as resolve4, sep } from "path";
import { timingSafeEqual } from "crypto";
function withAnnotate(html, src = "/__omgp/annotate.js") {
  const tag = `<script src="${src}"></script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}</body>`) : html + tag;
}
function safeJoin(root, rel) {
  const p = normalize(join12(root, decodeURIComponent(rel)));
  return p === root || p.startsWith(root + sep) ? p : null;
}
function serve({ root, port, host, hosted = false, key, data }) {
  root = resolve4(root);
  const pulseRoot = data ? resolve4(data) : root;
  let cache = null;
  const workspace = () => cache ??= loadWorkspace(root);
  const clients = new Set;
  const send = (event) => {
    const line = `data: ${JSON.stringify(event)}

`;
    for (const c of clients) {
      try {
        c.enqueue(line);
      } catch {
        clients.delete(c);
      }
    }
  };
  let pending = new Set;
  let timer = null;
  watch(root, { recursive: true }, (_event, file) => {
    if (!file)
      return;
    const f = String(file).split(sep).join("/");
    if (f.includes("node_modules") || f.split("/").includes(".git"))
      return;
    pending.add(f.replace(/\.\d+\.tmp$/, "").replace(/\.tmp[.\w-]*$/, ""));
    if (timer)
      clearTimeout(timer);
    timer = setTimeout(() => {
      const paths = [...pending];
      pending = new Set;
      if (paths.some((p) => !p.startsWith(".omgp/")))
        cache = null;
      send({ type: "change", paths });
    }, 120);
  });
  let runner = null;
  const agentCfg = workspace().config.agent;
  if (hosted)
    console.log("hosted: read-only studio, pulse duels only, no agent");
  else if (agentCfg && (agentCfg.preset || agentCfg.command)) {
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode === "worker")
      console.log(`agent: \`omgp work\` is already running (pid ${hb.pid}), the studio leaves requests to it`);
    else {
      runner = new Runner(root, agentCfg, workspace().config.locale, { mode: "server" });
      runner.start();
      console.log(`agent: ${describeAgent(agentCfg)} builds requests from the studio`);
      process.on("SIGINT", () => (runner?.stop(), process.exit(0)));
      process.on("SIGTERM", () => (runner?.stop(), process.exit(0)));
    }
  } else
    console.log("agent: none configured. Run `omgp work` next to the studio, or set agent: { preset: claude } in product.yaml");
  const server = Bun.serve({
    port,
    hostname: host,
    idleTimeout: 255,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
      try {
        if (key && parts[0] === "k") {
          if (!parts[1] || !sameKey(parts[1], key))
            return new Response(LOCKED, { status: 403, headers: { "content-type": mime[".html"] } });
          const secure = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" ? "; Secure" : "";
          return new Response(null, {
            status: 302,
            headers: { location: "/#/pulse", "set-cookie": `${KEY_COOKIE}=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` }
          });
        }
        if (key && !sameKey(cookie(req, KEY_COOKIE) ?? "", key)) {
          if (parts[0] === "api" || parts[0] === "files" || parts[0] === "__omgp")
            return json({ error: "open the link you were sent" }, 401);
          if (!extname(path))
            return new Response(LOCKED, { status: 401, headers: { "content-type": mime[".html"] } });
        }
        if (hosted && req.method !== "GET" && path !== "/api/pulse")
          return json({ error: "read-only: this studio is hosted for the pulse" }, 403);
        if (path === "/api/events") {
          let ctl;
          let beat;
          const stream = new ReadableStream({
            start(c) {
              ctl = c;
              clients.add(c);
              c.enqueue(`data: ${JSON.stringify({ type: "hello" })}

`);
              beat = setInterval(() => {
                try {
                  c.enqueue(`: ping

`);
                } catch {
                  clearInterval(beat);
                }
              }, 15000);
            },
            cancel() {
              clients.delete(ctl);
              clearInterval(beat);
            }
          });
          return new Response(stream, {
            headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" }
          });
        }
        if (path === "/api/workspace")
          return json(workspace());
        if (path === "/api/pulse") {
          if (req.method === "POST") {
            const { voter, date, win, over, undo, neither, unclear } = await req.json();
            const ws = workspace();
            if (!voter?.trim())
              return json({ error: "who decides?" }, 400);
            if (hosted && ![-1, 0, 1].some((n) => date === localDate(new Date(Date.now() + n * 86400000))))
              return json({ error: "wrong date" }, 400);
            if (unclear) {
              if (!ws.projects.some((p) => p.id === unclear))
                return json({ error: "project not found" }, 404);
              savePulseUnclear(pulseRoot, voter.trim(), date, unclear, !!undo);
              if (pulseRoot !== root)
                send({ type: "change", paths: [`pulse/${date}`] });
              return json({ days: loadPulse(pulseRoot) });
            }
            if (![win, over].every((id) => ws.projects.some((p) => p.id === id)))
              return json({ error: "project not found" }, 404);
            if (hosted && ![-1, 0, 1].some((n) => date === localDate(new Date(Date.now() + n * 86400000))))
              return json({ error: "wrong date" }, 400);
            if (!undo && !mayDuel(loadPulse(pulseRoot), voter, date, ws.config.pulse))
              return json({ error: "that's all for today" }, 429);
            savePulseDuel(pulseRoot, voter.trim(), date, neither ? { win, over, neither: true } : { win, over }, !!undo);
            if (pulseRoot !== root)
              send({ type: "change", paths: [`pulse/${date}`] });
          }
          return json({ days: loadPulse(pulseRoot) });
        }
        if (parts[0] === "api" && parts[1] === "session" && parts.length >= 4) {
          const [, , project, session, action] = parts;
          if (req.method === "GET" && !action) {
            const s = loadSession(root, project, session);
            if (!s)
              return json({ error: "session not found" }, 404);
            const requests = listRequests(root).filter((r) => r.project === project && r.session === session);
            return json({ session: s, results: loadResults(root, project, session), requests });
          }
          if (req.method === "POST" && action === "op") {
            const op = await req.json();
            const results = updateResults(root, project, session, op);
            send({ type: "results", project, session, results });
            return json(results);
          }
        }
        if (parts[0] === "api" && parts[1] === "session" && parts[4] === "step" && req.method === "PATCH") {
          const [, , project, session, , stepId] = parts;
          const { path, value, expect } = await req.json();
          patchStep(root, project, session, stepId, path, value, expect);
          cache = null;
          return json({ ok: true });
        }
        if (parts[0] === "api" && parts[1] === "comments" && parts[2]) {
          const scope = parts[2];
          if (scope !== ROOT_SCOPE && !workspace().projects.some((p) => p.id === scope))
            return json({ error: "unknown scope" }, 404);
          if (req.method === "POST") {
            const doc = updateComments(root, scope, await req.json());
            send({ type: "comments", scope });
            return json({ threads: anchorThreads(root, scope, doc) });
          }
          return json({ threads: anchorThreads(root, scope, loadComments(root, scope)) });
        }
        if (parts[0] === "api" && parts[1] === "text" && parts[2] && req.method === "PATCH") {
          const scope = parts[2];
          const { file, heading, content, expect } = await req.json();
          const path = safeJoin(scopeDir(root, scope), file);
          if (!path || !file.endsWith(".md") || !existsSync9(path))
            return json({ error: "can only edit existing .md files" }, 400);
          if (heading != null)
            replaceSection(path, heading, content, expect);
          else
            replaceBody(path, content, expect);
          cache = null;
          return json({ ok: true });
        }
        if (parts[0] === "api" && parts[1] === "handoff" && req.method === "POST") {
          const ws = workspace();
          const p = ws.projects.find((p) => p.id === parts[2]);
          if (!p)
            return json({ error: "project not found" }, 404);
          const body = await req.json().catch(() => ({}));
          return json({ markdown: writeHandoff(ws, p, body.sessions), file: `${p.dir}/handoff.md` });
        }
        if (parts[0] === "api" && parts[1] === "project" && req.method === "PATCH") {
          const p = workspace().projects.find((p) => p.id === parts[2]);
          if (!p)
            return json({ error: "project not found" }, 404);
          updateFrontmatter(join12(root, p.file), await req.json());
          cache = null;
          return json({ ok: true });
        }
        if (parts[0] === "api" && parts[1] === "assets" && req.method === "POST") {
          const project = parts[2];
          if (!workspace().projects.some((p) => p.id === project))
            return json({ error: "project not found" }, 404);
          const { dataUrl, name } = await req.json();
          const m = dataUrl.match(/^data:([\w/+.-]+);base64,(.*)$/);
          if (!m)
            return json({ error: "expected a base64 data URL" }, 400);
          const ext = { "image/png": "png", "image/jpeg": "jpg", "audio/webm": "webm", "image/svg+xml": "svg" }[m[1]] ?? "bin";
          const base = (name ?? `asset-${Date.now()}`).replace(/[^a-z0-9._-]/gi, "-");
          const rel = `assets/${base}.${ext}`;
          const dir = join12(root, "projects", project, "assets");
          mkdirSync3(dir, { recursive: true });
          writeFileSync3(join12(root, "projects", project, rel), Buffer.from(m[2], "base64"));
          return json({ path: rel, workspacePath: `projects/${project}/${rel}` });
        }
        if (path === "/api/requests" && req.method === "GET")
          return json(listRequests(root));
        if (path === "/api/agent") {
          const cfg = workspace().config.agent;
          return json({
            configured: cfg && (cfg.preset || cfg.command) ? describeAgent(cfg) : null,
            heartbeat: readHeartbeat(root),
            requests: listRequests(root).slice(-40)
          });
        }
        if (path === "/api/requests" && req.method === "POST") {
          const body = await req.json();
          const r = createRequest(root, body);
          send({ type: "request", request: r });
          const hb = readHeartbeat(root);
          return json({ ...r, prompt: requestPrompt(r), agent: !!runner || !!hb?.alive });
        }
        if (parts[0] === "api" && parts[1] === "requests" && parts[2] && req.method === "POST") {
          const id = parts[2];
          if (!getRequest(root, id))
            return json({ error: "no such request" }, 404);
          if (parts[3] === "cancel") {
            appendLog(root, id, [{ kind: "status", text: "cancelled in the studio" }]);
            return json(setRequestStatus(root, id, "cancelled"));
          }
          if (parts[3] === "retry") {
            appendLog(root, id, [{ kind: "status", text: "queued again from the studio" }]);
            return json(setRequestStatus(root, id, "open"));
          }
        }
        if (path === "/__omgp/annotate.js")
          return new Response(annotateJs(), { headers: { "content-type": mime[".js"], "cache-control": "no-cache" } });
        if (parts[0] === "files") {
          const file = safeJoin(root, parts.slice(1).join("/"));
          if (!file || !existsSync9(file))
            return new Response("not found", { status: 404 });
          const ext = extname(file).toLowerCase();
          if (ext === ".html" && url.searchParams.has("omgp"))
            return new Response(withAnnotate(readFileSync4(file, "utf8")), { headers: { "content-type": mime[".html"], "cache-control": "no-cache" } });
          return new Response(Bun.file(file), {
            headers: { "content-type": mime[ext] ?? "application/octet-stream", "cache-control": "no-cache" }
          });
        }
        if (req.method === "GET" && existsSync9(webDist)) {
          const asset = path !== "/" ? safeJoin(webDist, path.slice(1)) : null;
          if (asset && existsSync9(asset) && extname(asset))
            return new Response(Bun.file(asset), { headers: { "content-type": mime[extname(asset)] ?? "application/octet-stream" } });
          return new Response(Bun.file(join12(webDist, "index.html")), { headers: { "content-type": mime[".html"] } });
        }
        if (req.method === "GET" && path === "/")
          return new Response("Studio not built. Run `bun run build`, or `bun run dev` for development.", { status: 503 });
        return json({ error: "not found" }, 404);
      } catch (e) {
        if (e instanceof EditConflict)
          return json({ error: e.message, conflict: true }, 409);
        console.error(e);
        return json({ error: e.message }, 500);
      }
    }
  });
  const shown = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  console.log(`omgp studio  http://${shown}:${server.port}   workspace ${root}`);
  if (host === "0.0.0.0") {
    for (const nets of Object.values(networkInterfaces()))
      for (const n of nets ?? [])
        if (n.family === "IPv4" && !n.internal)
          console.log(`  on your network: http://${n.address}:${server.port}`);
  }
  return server;
}
var annotateJs = () => readFileSync4(ANNOTATE_JS, "utf8"), webDist, mime, json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } }), KEY_COOKIE = "omgp_key", sameKey = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)), cookie = (req, name) => req.headers.get("cookie")?.split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1], LOCKED = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>omg\xB7product</title><body style="font:1.1rem system-ui;display:grid;place-items:center;min-height:90vh;margin:0 1rem;text-align:center;color:#1b2430;background:#f2f4f3">
<p>This studio is private.<br>Open the link you were sent.</p></body>`;
var init_server = __esm(() => {
  init_paths();
  init_workspace();
  init_results();
  init_handoff();
  init_files();
  init_requests();
  init_agent_runner();
  init_comments();
  init_session_edit();
  init_pulse_files();
  init_pulse();
  webDist = WEB_DIST;
  mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".md": "text/markdown; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
    ".woff2": "font/woff2",
    ".mp3": "audio/mpeg",
    ".webm": "audio/webm",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf"
  };
});

// src/cli/main.ts
init_paths();
init_files();
init_time();
init_workspace();
init_handoff();
init_results();
init_comments();
init_requests();
init_agent_runner();
import { appendFileSync, cpSync as cpSync2, existsSync as existsSync11, mkdirSync as mkdirSync5, rmSync as rmSync5, symlinkSync } from "fs";
import { join as join14, resolve as resolve6 } from "path";

// src/cli/linear.ts
init_files();
init_comments();
import { join as join9 } from "path";
var QUERY = `query {
  initiatives(first: 100) { nodes { id name description status targetDate url } }
  projects(first: 250) { nodes {
    id name description url startDate targetDate priority
    status { type }
    initiatives { nodes { id name } }
  } }
}`;
var slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036F]/g, "").replace(/\u00DF/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "untitled";
var stageFor = { backlog: "idea", planned: "scoped", started: "building", paused: "paused", completed: "done", canceled: "dropped" };
var priorityFor = ["medium", "urgent", "high", "medium", "low"];
var initiativeStatus = (s) => ({ Planned: "planned", Active: "active", Completed: "done" })[s ?? ""] ?? "active";
var statusType = (p) => (typeof p.status === "string" ? p.status : p.status.type).toLowerCase();
var prio = (p) => priorityFor[typeof p.priority === "object" ? p.priority.value : p.priority ?? 0] ?? "medium";
var inits = (p) => Array.isArray(p.initiatives) ? p.initiatives : p.initiatives?.nodes ?? [];
async function linearPull(ws, opts) {
  let data;
  if (opts.from)
    data = JSON.parse(readText(opts.from));
  else {
    const key = process.env.LINEAR_API_KEY;
    if (!key) {
      console.error("Set LINEAR_API_KEY (Linear \u2192 Settings \u2192 API), or let an agent with a Linear MCP write the data to a file and run `omgp linear pull --from <file.json>`.");
      process.exit(1);
    }
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: key },
      body: JSON.stringify({ query: QUERY })
    });
    const body = await res.json();
    if (!body.data) {
      console.error("Linear request failed:", JSON.stringify(body.errors ?? body));
      process.exit(1);
    }
    data = { initiatives: body.data.initiatives.nodes, projects: body.data.projects.nodes };
  }
  for (const line of applyLinear(ws, data, opts.dryRun, opts.backlog))
    console.log(line);
  if (opts.dryRun)
    console.log("(dry run, nothing written)");
}
function applyLinear(ws, data, dryRun, backlog = false) {
  const log = [];
  const sameLinear = (ref, l) => !!ref && (ref.id === l.id || !!ref.url && !!l.url && ref.url === l.url);
  const initiativeId = new Map;
  for (const i of ws.initiatives) {
    initiativeId.set(i.name.toLowerCase(), i.id);
    if (i.linear?.id)
      initiativeId.set(i.linear.id, i.id);
  }
  for (const li of data.initiatives ?? []) {
    const existing = ws.initiatives.find((i) => sameLinear(i.linear, li) || i.name.toLowerCase() === li.name.toLowerCase());
    if (existing) {
      initiativeId.set(li.id, existing.id);
      continue;
    }
    if (li.status === "Completed" || li.status === "Canceled")
      continue;
    const id = slug(li.name);
    initiativeId.set(li.id, id);
    initiativeId.set(li.name.toLowerCase(), id);
    log.push(`+ initiative ${id}`);
    if (!dryRun)
      writeText(join9(ws.root, "initiatives", `${id}.md`), `---
${yamlStringify({
        id,
        name: li.name,
        status: initiativeStatus(li.status),
        ...li.targetDate ? { when: { end: li.targetDate } } : {},
        linear: { id: li.id, ...li.url ? { url: li.url } : {} }
      }).trimEnd()}
---
${li.description ?? ""}
`);
  }
  const linearWhen = (lp) => lp.startDate || lp.targetDate ? { ...lp.startDate ? { start: lp.startDate } : {}, ...lp.targetDate ? { end: lp.targetDate } : {}, from: "linear" } : null;
  const taken = new Set(ws.projects.map((p) => p.id));
  let skipped = 0;
  for (const lp of data.projects) {
    const st = statusType(lp);
    const existing = ws.projects.find((p) => sameLinear(p.linear, lp)) ?? ws.projects.find((p) => p.name.toLowerCase() === lp.name.toLowerCase());
    if (existing) {
      const patch = {};
      const want = linearWhen(lp);
      if (existing.when?.from !== "manual") {
        const now = existing.when ? JSON.stringify({ start: existing.when.start, end: existing.when.end, from: existing.when.from }) : "null";
        const next = want ? JSON.stringify({ start: want.start, end: want.end, from: "linear" }) : "null";
        if (now !== next) {
          patch.when = want;
          log.push(`~ ${existing.id}: when ${existing.when ? `${existing.when.start ?? "\u2026"} \u2192 ${existing.when.end ?? "\u2026"}` : "none"} \u21D2 ${want ? `${want.start ?? "\u2026"} \u2192 ${want.end ?? "\u2026"}` : "none (backlog)"}`);
        }
      }
      if ((st === "completed" || st === "canceled") && !["done", "dropped"].includes(existing.stage)) {
        patch.stage = stageFor[st];
        log.push(`~ ${existing.id}: stage ${existing.stage} \u21D2 ${stageFor[st]} (Linear: ${st})`);
      }
      if (!existing.linear?.id)
        patch.linear = { id: lp.id, ...lp.url ? { url: lp.url } : {} };
      if (Object.keys(patch).length && !dryRun)
        updateFrontmatter(join9(ws.root, existing.file), patch);
      const filled = fillFromLinear(join9(ws.root, existing.file), lp, dryRun);
      if (filled.length)
        log.push(`~ ${existing.id}: ${filled.join(" + ")} from Linear`);
      continue;
    }
    if (st === "completed" || st === "canceled")
      continue;
    if (st === "backlog" && !backlog && !lp.startDate && !lp.targetDate) {
      skipped++;
      continue;
    }
    let id = slug(lp.name);
    if (taken.has(id))
      id = `${id}-${slug(lp.id).slice(-4)}`;
    taken.add(id);
    const when = linearWhen(lp);
    log.push(`+ project ${id}${when ? ` (${when.start ?? "\u2026"} \u2192 ${when.end ?? "\u2026"})` : " (backlog)"}`);
    if (!dryRun)
      writeText(join9(ws.root, "projects", id, "project.md"), `---
${yamlStringify({
        id,
        name: lp.name,
        initiatives: inits(lp).map((n) => initiativeId.get(n.id ?? "") ?? initiativeId.get((n.name ?? "").toLowerCase())).filter(Boolean),
        stage: stageFor[st] ?? "idea",
        priority: prio(lp),
        confidence: "low",
        ...when ? { when } : {},
        linear: { id: lp.id, ...lp.url ? { url: lp.url } : {} }
      }).trimEnd()}
---

${newBody(lp)}
`);
  }
  if (skipped)
    log.push(`(${skipped} undated backlog projects left out; add them with --backlog)`);
  return log.length ? log : ["nothing to do"];
}
var PROBLEM = /^(das\s+)?(problem(stellung)?|pain|warum|why)\b/i;
var SOLUTION = /^(die\s+)?(l\u00F6sung(sansatz)?|loesung|solution|ansatz|approach|zielbild|how)\b/i;
function problemSolution(md) {
  const out = {};
  let key = null;
  let buf = [];
  const flush = () => {
    const text = buf.join(`
`).trim();
    if (key && text && !out[key])
      out[key] = text;
    buf = [];
  };
  for (const line of (md ?? "").split(`
`)) {
    const h = line.match(/^\s*#{1,6}\s+(.+?)\s*:?\s*$/) ?? line.match(/^\s*\*\*(.+?):?\*\*:?\s*(.*)$/);
    if (h) {
      flush();
      const title = h[1].replace(/[*:]/g, "").trim();
      key = PROBLEM.test(title) ? "problem" : SOLUTION.test(title) ? "solution" : null;
      if (key && h[2]?.trim())
        buf.push(h[2].trim());
    } else if (key)
      buf.push(line);
  }
  flush();
  return out;
}
function fillFromLinear(file, lp, dryRun) {
  const found = problemSolution(lp.body ?? lp.description);
  const have = markdownSections(splitFrontmatter(readText(file)).body);
  const done = [];
  for (const [key, heading] of [["problem", "Problem"], ["solution", "Solution"]]) {
    const mine = Object.entries(have).find(([k]) => k.startsWith(key))?.[1]?.trim();
    if (found[key] && !mine) {
      if (!dryRun)
        replaceSection(file, heading, found[key]);
      done.push(heading);
    }
  }
  return done;
}
function newBody(lp) {
  const { problem, solution } = problemSolution(lp.body ?? lp.description);
  return [lp.description?.trim(), `## Problem
${problem ?? ""}`.trim(), solution ? `## Solution
${solution}` : ""].filter(Boolean).join(`

`);
}

// src/cli/main.ts
init_proto_check();

// src/cli/templates.ts
var productYaml = (name) => `name: ${name}
locale: en
brand:
  css: brand/tokens.css
  notes: brand/BRAND.md
roadmap:
  streams:
    - { id: core, name: Core team, capacity: 2 }
    - { id: student, name: Working student, capacity: 0.5 }
# integrations:
#   linear: { workspace: your-workspace }
#   posthog: { host: https://eu.posthog.com, project: 12345 }
# agent:
#   command: "claude -p --permission-mode acceptEdits"
`;
var visionMd = `---
northStar: Write the one sentence that describes where the product is going.
lighthouses:
  - id: first-lighthouse
    name: A far goal you steer towards
    when: 2027-H2
    description: What is true for users when we get there.
---
Where we are going and why. Keep it short; the roadmap shows the steps.
`;
var brandCss = `/* Visual language for prototypes. Link with ../../../brand/tokens.css */
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f7f9;
  --color-text: #15171c;
  --color-muted: #5f6673;
  --color-primary: #3b5bdb;
  --color-danger: #d9480f;
  --radius: 8px;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
}
body { margin: 0; font-family: var(--font-body); color: var(--color-text); background: var(--color-bg); }
`;
var brandMd = `# Brand

Describe how the product looks and talks: colors and when to use them,
typography, components, tone of UI copy. Prototype agents read this.
`;
var initiativeMd = (id, name) => `---
id: ${id}
name: ${name}
summary: One sentence everyone in the company understands.
status: active
metric: { name: The number that tells us we got there, baseline: "?", target: "?" }
---
Why this matters.
`;
var projectMd = (id, name, initiative, stage = "idea") => `---
id: ${id}
name: ${name}
initiatives: [${initiative ?? ""}]
stage: ${stage}
priority: medium
size: m
confidence: low
dependsOn: []
---

## Problem
Who has the problem, what hurts, why it matters.

## For whom

## Metric
Which number tells us it is solved? Baseline \u2192 target.

## Solution

## Done when

## Out of scope
`;
var sessionYaml = (id, title, kind) => `id: ${id}
title: ${title}
kind: ${kind}
status: draft
goal: What the room decides today, in one sentence.
participants:
  - { name: Someone, role: User, kind: user }
  - { name: You, role: Product, kind: decider }
sections:
  - id: context
    title: Why we're here
    phase: context
    steps:
      - id: problem-today
        type: slide
        title: The problem today
        body: |
          - One line per pain
  - id: problems
    title: Which problems matter?
    phase: problem
    steps:
      - id: p-first
        type: triage
        title: The first problem, in the user's words
  - id: decisions
    title: Decisions
    phase: decisions
    steps:
      - id: d-first
        type: choice
        title: The first decision
        level: product
        timing: now
        recommended: a
        options:
          - { id: a, label: Option A, summary: One line, pros: [], cons: [] }
          - { id: b, label: Option B, summary: One line, pros: [], cons: [] }
  - id: wrapup
    title: Wrap-up
    phase: wrapup
    steps:
      - id: q-open
        type: question
        title: What did we forget?
`;
var rulesMd = `# Team rules

How this team wants omgp to work. Agents read this before every task and follow it
over the general skills. Add a rule when someone corrects how omgp works for you:
\`omgp learn "Problems are rated by severity, not priority" --why "a problem can't be nice to have"\`.

## Rules
`;

// src/cli/export.ts
init_paths();
init_workspace();
init_comments();
init_server();
init_pulse_files();
import { copyFileSync, cpSync, existsSync as existsSync10, mkdirSync as mkdirSync4, readdirSync as readdirSync3, readFileSync as readFileSync5, rmSync as rmSync4, statSync as statSync3, writeFileSync as writeFileSync4 } from "fs";
import { basename as basename3, dirname as dirname3, join as join13, relative, resolve as resolve5, sep as sep2 } from "path";
var MARKER = "static.json";
function exportStatic(root, outDir) {
  root = resolve5(root);
  outDir = resolve5(outDir);
  if (!existsSync10(join13(root, "product.yaml")))
    throw new Error(`${root} is not an omgp workspace (no product.yaml)`);
  for (const [what, dir] of [["the workspace", root], ["omgp itself", PKG_ROOT], ["the studio build", WEB_DIST]])
    if (inside(dir, outDir))
      throw new Error(`cannot export into ${outDir}: it would replace ${what}`);
  if (inside(outDir, WEB_DIST))
    throw new Error(`cannot export into the studio build (${WEB_DIST})`);
  checkTarget(outDir);
  const web = ensureWebBuild();
  rmSync4(outDir, { recursive: true, force: true });
  mkdirSync4(outDir, { recursive: true });
  cpSync(web, outDir, { recursive: true });
  const summary = writeSnapshots(root, outDir);
  const info = { workspace: summary.workspace, exportedAt: new Date().toISOString() };
  const index = join13(outDir, "index.html");
  const flag = `<script>window.__OMGP_STATIC__ = ${JSON.stringify(info).replace(/</g, "\\u003c")};</script>`;
  writeFileSync4(index, readFileSync5(index, "utf8").replace(/<\/head>/i, `  ${flag}
  </head>`));
  const { outDir: _, ...counts } = summary;
  writeFileSync4(join13(outDir, MARKER), JSON.stringify({ omgp: "static export", ...info, ...counts }, null, 2) + `
`);
  writeFileSync4(join13(outDir, ".nojekyll"), "");
  return summary;
}
function writeSnapshots(root, outDir) {
  root = resolve5(root);
  outDir = resolve5(outDir);
  const write = (rel, data) => {
    const path = join13(outDir, rel);
    mkdirSync4(dirname3(path), { recursive: true });
    writeFileSync4(path, typeof data === "string" ? data : JSON.stringify(data));
  };
  const ws = loadWorkspace(root);
  write("api/workspace.json", { ...ws, root: basename3(root) });
  let sessions = 0;
  for (const p of ws.projects) {
    for (const s of p.sessions) {
      const session = loadSession(root, p.id, s.id);
      if (!session)
        continue;
      write(`api/session/${p.id}/${s.id}.json`, { session, results: loadResults(root, p.id, s.id), requests: [] });
      sessions++;
    }
    write(`api/comments/${p.id}.json`, { threads: anchorThreads(root, p.id, loadComments(root, p.id)) });
  }
  write(`api/comments/${ROOT_SCOPE}.json`, { threads: anchorThreads(root, ROOT_SCOPE, loadComments(root, ROOT_SCOPE)) });
  write("api/agent.json", { configured: null, heartbeat: null, requests: [] });
  write("api/requests.json", []);
  write("api/pulse.json", { days: loadPulse(root) });
  write("omgp-layer/annotate.js", readFileSync5(ANNOTATE_JS, "utf8"));
  let files = 0;
  for (const rel of workspaceFiles(root, outDir)) {
    const from = join13(root, rel);
    const to = join13(outDir, "files", rel);
    mkdirSync4(dirname3(to), { recursive: true });
    if (rel.toLowerCase().endsWith(".html")) {
      const up = "../".repeat(relative(outDir, dirname3(to)).split(sep2).length);
      writeFileSync4(to, withAnnotate(readFileSync5(from, "utf8"), `${up}omgp-layer/annotate.js`));
    } else
      copyFileSync(from, to);
    files++;
  }
  return { outDir, workspace: ws.config.name, projects: ws.projects.length, sessions, files };
}
function inside(path, dir) {
  const r = relative(dir, path);
  return r === "" || !r.startsWith("..") && !r.startsWith(sep2) && !/^[a-zA-Z]:/.test(r);
}
function checkTarget(outDir) {
  if (!existsSync10(outDir))
    return;
  if (!statSync3(outDir).isDirectory())
    throw new Error(`${outDir} is a file`);
  const entries = readdirSync3(outDir).filter((f) => f !== ".DS_Store");
  if (entries.length && !entries.includes(MARKER))
    throw new Error(`${outDir} is not empty and not an earlier export (no ${MARKER}); choose an empty folder`);
}
function workspaceFiles(root, outDir) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync3(dir).sort()) {
      if (name.startsWith(".") || name === "node_modules")
        continue;
      const path = join13(dir, name);
      if (inside(path, outDir))
        continue;
      const st = statSync3(path);
      if (st.isDirectory())
        walk(path);
      else if (st.isFile())
        out.push(relative(root, path).split(sep2).join("/"));
    }
  };
  walk(root);
  return out;
}
function ensureWebBuild() {
  const index = join13(WEB_DIST, "index.html");
  const canBuild = ["web/src", "vite.config.ts", "node_modules/vite"].every((p) => existsSync10(join13(PKG_ROOT, p)));
  if (canBuild && (!existsSync10(index) || stale(index))) {
    console.log("studio: building it first (bun run build)");
    const r = Bun.spawnSync([process.execPath, "run", "build"], { cwd: PKG_ROOT, stdout: "inherit", stderr: "inherit" });
    if (r.exitCode !== 0)
      throw new Error("`bun run build` failed");
  }
  if (!existsSync10(index))
    throw new Error(`the studio is not built (${WEB_DIST} is missing); run \`bun run build\``);
  if (absoluteAssets(index))
    throw new Error(`${WEB_DIST} links its assets from /; rebuild it with \`bun run build\``);
  return WEB_DIST;
}
var absoluteAssets = (index) => /(src|href)="\/assets\//.test(readFileSync5(index, "utf8"));
function stale(index) {
  if (absoluteAssets(index))
    return true;
  const built = statSync3(index).mtimeMs;
  const newer = (path) => {
    if (!existsSync10(path))
      return false;
    const st = statSync3(path);
    if (!st.isDirectory())
      return st.mtimeMs > built;
    return readdirSync3(path).some((f) => f !== "node_modules" && !f.endsWith(".test.ts") && newer(join13(path, f)));
  };
  return ["web", join13("src", "core"), "vite.config.ts", "package.json"].some((p) => newer(join13(PKG_ROOT, p)));
}
function prepareForArtifact(outDir, capabilities) {
  const index = join13(outDir, "index.html");
  const html = readFileSync5(index, "utf8");
  const head = (html.match(/<head>([\s\S]*)<\/head>/)?.[1] ?? "").replace(/<meta (charset|name="viewport")[^>]*>\s*/g, "");
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  writeFileSync4(index, `${head.trim()}
${body.trim()}
`);
  const files = [];
  const walk = (dir, rel = "") => {
    for (const name of readdirSync3(dir)) {
      const path = rel ? `${rel}/${name}` : name;
      const abs = join13(dir, name);
      if (statSync3(abs).isDirectory())
        walk(abs, path);
      else if (name.startsWith(".") || /\.(ttf|woff)$/.test(name))
        rmSync4(abs);
      else if (path !== "index.html") {
        if (/\.(js|css)$/.test(name)) {
          const src = readFileSync5(abs, "utf8");
          if (src.includes("\uFFFD"))
            writeFileSync4(abs, src.replaceAll("\uFFFD", "\\uFFFD"));
        }
        files.push(/\.(ya?ml)$/.test(name) ? { path, contentType: "text/plain" } : { path });
      }
    }
  };
  walk(outDir);
  writeFileSync4(join13(outDir, "artifact.json"), JSON.stringify({ page: "index.html", capabilities, files }, null, 2));
  return files.length;
}

// web/src/lib/artifact.ts
init_pulse();
var ARTIFACT_CAPABILITIES = {
  db: { rules: [{ path: "pulse", read: "view", write: "owner" }, { path: "pulse/{self}", write: "interact" }] },
  user: {}
};

// src/cli/main.ts
init_pulse_files();
init_pulse();
var HELP = `omgp \u2014 product harness: roadmap, prototypes and decision sessions as files

  omgp init [dir] [--name "Product"]   scaffold a workspace
  omgp serve [--port 4747] [--host 0.0.0.0]   studio with live reload
             [--hosted] [--key k] [--data dir]
                                       for a team: read-only but the pulse, only via the link /k/<key>,
                                       duels written to <dir>/pulse (env OMGP_HOSTED, OMGP_KEY, OMGP_DATA, PORT)
  omgp validate [--json]               check files and references (exit 1 on errors)
  omgp check <project> [prototype] [--shots] [--state a,b]
                                       open the project's prototypes in headless Chrome, visit every #state its
                                       sessions use, report script errors, blank pages and missing focus targets;
                                       --shots saves a PNG per state to .omgp/shots to look at (exit 1 on problems)
  omgp roadmap [--json]                conflicts, bottlenecks, overload, delegatable work
  omgp pulse [--voter name] [--json]   what people swiped as most important (Elo, studio: #/pulse)
  omgp next [--json]                   what to do now: the first open task of the most important projects
  omgp status [project]                project and session progress
  omgp new project <id> --name "\u2026" [--initiative id] [--stage idea]
  omgp new session <project> <id> [--title "\u2026"] [--kind kickoff]
  omgp handoff <project> [--session id]\u2026   compile results into handoff.md
  omgp work [--agent claude|codex|opencode|pi|"<cmd>"] [--model m]
                                       keep running: start an agent for every live request, show what it does
  omgp listen [--timeout 600]          for agents in a chat: wait for one request, claim it, print it, exit
  omgp progress <request-id> "\u2026"       report what you're doing on a claimed request
  omgp done <request-id> [--fail "why"]
  omgp note <project> <session> <step> "text"   append to a step's meeting notes
  omgp comments [project] [--all]      open comment threads with what they point at
  omgp reply <thread> "text"           answer a thread as the agent
  omgp resolve <thread>                close a thread
  omgp requests                        list live requests
  omgp linear pull [--dry-run] [--from file.json] [--backlog]
                                       import initiatives + projects and sync dates (LINEAR_API_KEY, or a JSON
                                       file an agent wrote from a Linear MCP); dates marked from: manual stay
  omgp learn "rule" [--why "\u2026"] [--upstream]
                                       add a team rule to rules.md (agents follow it over the skills);
                                       --upstream prints a proposal for the shared omgp skills instead
  omgp skills install [--target claude|agents|opencode|pi] [--dir path] [--link]
  omgp export [--out dir] [--artifact] static studio of the workspace: for any static host, or (--artifact)
                                       ready to publish as a claude.ai Artifact where the pulse is shared
  omgp update                          update a git checkout of omgp (the Claude Code plugin updates itself)
  omgp version

Workspace: nearest folder with product.yaml, or --dir <path>, or OMGP_DIR.`;
function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0;i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=", 2);
      const val = inline ?? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true);
      const prev = flags[k];
      flags[k] = prev === undefined ? val : [].concat(prev, val);
    } else
      pos.push(a);
  }
  return { pos, flags };
}
var str = (v) => Array.isArray(v) ? v[v.length - 1] : typeof v === "string" ? v : undefined;
var list = (v) => v === undefined || v === true ? [] : [].concat(v);
function rootOrDie(flags) {
  const dir = str(flags.dir) ?? process.env.OMGP_DIR;
  const root = dir ? existsSync11(join14(resolve6(dir), "product.yaml")) ? resolve6(dir) : null : findRoot();
  if (!root) {
    console.error(`No product.yaml found${dir ? ` in ${dir}` : " here or above"}. Run \`omgp init\` or pass --dir.`);
    process.exit(1);
  }
  return root;
}
var c = {
  red: (s) => `\x1B[31m${s}\x1B[0m`,
  yellow: (s) => `\x1B[33m${s}\x1B[0m`,
  green: (s) => `\x1B[32m${s}\x1B[0m`,
  dim: (s) => `\x1B[2m${s}\x1B[0m`,
  bold: (s) => `\x1B[1m${s}\x1B[0m`
};
async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];
  if (!cmd || flags.help || cmd === "help")
    return console.log(HELP);
  if (cmd === "init") {
    const dir = resolve6(pos[1] ?? ".");
    if (existsSync11(join14(dir, "product.yaml")))
      return console.log(`${dir} already has a product.yaml`);
    const name = str(flags.name) ?? "My Product";
    writeText(join14(dir, "product.yaml"), productYaml(name));
    writeText(join14(dir, "vision.md"), visionMd);
    writeText(join14(dir, "rules.md"), rulesMd);
    writeText(join14(dir, "brand/tokens.css"), brandCss);
    writeText(join14(dir, "brand/BRAND.md"), brandMd);
    writeText(join14(dir, "initiatives/first-initiative.md"), initiativeMd("first-initiative", "First initiative"));
    writeText(join14(dir, "projects/first-project/project.md"), projectMd("first-project", "First project", "first-initiative"));
    writeText(join14(dir, "projects/first-project/sessions/kickoff.yaml"), sessionYaml("kickoff", "First project \u2014 kickoff", "kickoff"));
    console.log(`Workspace created in ${dir}
Next: omgp skills install, then omgp serve`);
    return;
  }
  if (cmd === "version")
    return console.log(`omgp ${version()}`);
  if (cmd === "update") {
    if (!existsSync11(join14(PKG_ROOT, ".git")))
      return console.log(`omgp ${version()} is installed as a plugin: it updates itself (Claude Code: /plugin \u2192 omgp \u2192 Update now to do it right away).`);
    for (const cmd of [["git", "pull", "--ff-only"], ["bun", "install"], ["bun", "run", "build"]]) {
      console.log(`$ ${cmd.join(" ")}`);
      const r = Bun.spawnSync(cmd, { cwd: PKG_ROOT, stdout: "inherit", stderr: "inherit" });
      if (r.exitCode !== 0)
        process.exit(r.exitCode ?? 1);
    }
    return console.log(`omgp ${version()}. Skills you copied with \`omgp skills install\` need a re-run; linked ones (--link) are current.`);
  }
  if (cmd === "skills") {
    if (pos[1] !== "install")
      return console.log("usage: omgp skills install [--target claude|agents|opencode|pi] [--dir path]");
    const targets = list(flags.target).length ? list(flags.target) : ["claude", "agents"];
    const base = resolve6(str(flags.dir) ?? process.cwd());
    const src = SKILLS_DIR;
    const dest = { claude: ".claude/skills", agents: ".agents/skills", opencode: ".opencode/skills", pi: ".pi/skills" };
    for (const t of targets) {
      if (!dest[t]) {
        console.error(`unknown target ${t}`);
        continue;
      }
      const to = join14(base, dest[t]);
      mkdirSync5(to, { recursive: true });
      for (const skill of new Bun.Glob("*/SKILL.md").scanSync(src)) {
        const name = skill.split("/")[0];
        rmSync5(join14(to, name), { recursive: true, force: true });
        if (flags.link)
          symlinkSync(join14(src, name), join14(to, name), "dir");
        else
          cpSync2(join14(src, name), join14(to, name), { recursive: true });
      }
      console.log(`skills ${flags.link ? "linked" : "copied"} \u2192 ${to}`);
    }
    return;
  }
  const root = rootOrDie(flags);
  if (cmd === "serve") {
    await Promise.resolve().then(() => init_server());
    const env = process.env;
    const hosted = !!flags.hosted || !!env.OMGP_HOSTED;
    serve({
      root,
      port: Number(str(flags.port) ?? env.OMGP_PORT ?? env.PORT ?? 4747),
      host: str(flags.host) ?? (hosted ? "0.0.0.0" : "127.0.0.1"),
      hosted,
      key: str(flags.key) ?? env.OMGP_KEY ?? undefined,
      data: str(flags.data) ?? env.OMGP_DATA ?? undefined
    });
    return;
  }
  if (cmd === "learn") {
    const rule = pos.slice(1).join(" ").trim();
    if (!rule)
      return console.error('usage: omgp learn "rule" [--why "\u2026"] [--upstream]');
    const why = str(flags.why);
    if (flags.upstream) {
      console.log(`Propose this for the shared omgp skills. Check it holds no company names or data, then open
https://github.com/${REPO}/issues/new and paste:
`);
      console.log(`Title: Rule: ${rule}

${rule}${why ? `

Why: ${why}` : ""}

(omgp ${version()})`);
      return;
    }
    const file = join14(root, "rules.md");
    if (!existsSync11(file))
      writeText(file, rulesMd);
    const text = readText(file);
    appendFileSync(file, `${text.endsWith(`
`) ? "" : `
`}- ${rule}${why ? ` (${why})` : ""} \xB7 ${todayIso()}
`);
    return console.log(`rules.md: ${rule}`);
  }
  const ws = loadWorkspace(root);
  if (cmd === "validate") {
    if (flags.json)
      return console.log(JSON.stringify(ws.issues, null, 2));
    const errors = ws.issues.filter((i) => i.level === "error");
    const warnings = ws.issues.filter((i) => i.level === "warning");
    for (const i of ws.issues)
      console.log(`${i.level === "error" ? c.red("error") : c.yellow("warn ")} ${i.file}: ${i.message}`);
    const sessions = ws.projects.reduce((n, p) => n + p.sessions.length, 0);
    console.log(`${errors.length ? c.red(`${errors.length} errors`) : c.green("0 errors")}, ${warnings.length} warnings \xB7 ${ws.initiatives.length} initiatives, ${ws.projects.length} projects, ${sessions} sessions`);
    process.exit(errors.length ? 1 : 0);
  }
  if (cmd === "check") {
    const project = ws.projects.find((p) => p.id === pos[1]);
    if (!project)
      return console.error(`usage: omgp check <project> [prototype] [--shots]${pos[1] ? `
no project "${pos[1]}"` : ""}`);
    const targets = prototypeTargets(ws, project, pos[2]);
    if (!targets.length)
      return console.log(`${project.id}: no prototypes${pos[2] ? ` matching "${pos[2]}"` : ""}`);
    const extra = list(flags.state).flatMap((s) => s.split(",")).filter(Boolean);
    let bad = 0;
    for (const t of targets) {
      const states = [...t.states, ...extra.filter((h) => !t.states.some((s) => s.hash === h)).map((hash) => ({ hash }))];
      const res = await checkPrototype(t.abs, states, { shots: flags.shots ? join14(root, ".omgp", "shots") : undefined });
      bad += res.problems.length;
      for (const l of formatCheck(res, `projects/${project.id}/${t.rel}`))
        console.log(l);
    }
    process.exit(bad ? 1 : 0);
  }
  if (cmd === "export") {
    const out = resolve6(str(flags.out) ?? "omgp-export");
    const r = exportStatic(root, out);
    if (flags.artifact) {
      const n = prepareForArtifact(out, ARTIFACT_CAPABILITIES);
      return console.log(`claude.ai Artifact in ${r.outDir}: index.html plus ${n} files, capabilities and file list in artifact.json. An agent publishes it; the pulse then runs on the page's shared db.`);
    }
    return console.log(`static read-only studio in ${r.outDir} (${r.projects} projects, ${r.sessions} sessions). Serve the folder with any static host.`);
  }
  if (cmd === "roadmap")
    return printRoadmap(ws, !!flags.json);
  if (cmd === "pulse")
    return printPulse(root, ws, str(flags.voter), !!flags.json);
  if (cmd === "next")
    return printNext(root, ws, !!flags.json);
  if (cmd === "status")
    return printStatus(ws, pos[1]);
  if (cmd === "new") {
    const what = pos[1];
    if (what === "project") {
      const id = pos[2];
      if (!id)
        return console.error('usage: omgp new project <id> --name "\u2026"');
      const file = join14(root, "projects", id, "project.md");
      if (existsSync11(file))
        return console.error(`${file} exists`);
      writeText(file, projectMd(id, str(flags.name) ?? id, str(flags.initiative), str(flags.stage)));
      return console.log(`created projects/${id}/project.md`);
    }
    if (what === "session") {
      const [, , project, id] = pos;
      if (!project || !id)
        return console.error("usage: omgp new session <project> <id>");
      if (!ws.projects.some((p) => p.id === project))
        return console.error(`no project ${project}`);
      const file = join14(root, "projects", project, "sessions", `${id}.yaml`);
      if (existsSync11(file))
        return console.error(`${file} exists`);
      writeText(file, sessionYaml(id, str(flags.title) ?? `${project} \u2014 ${id}`, str(flags.kind) ?? "kickoff"));
      return console.log(`created projects/${project}/sessions/${id}.yaml`);
    }
    return console.error("usage: omgp new project|session \u2026");
  }
  if (cmd === "handoff") {
    const p = ws.projects.find((p) => p.id === pos[1]);
    if (!p)
      return console.error(`usage: omgp handoff <project>   (projects: ${ws.projects.map((p) => p.id).join(", ")})`);
    writeHandoff(ws, p, list(flags.session));
    return console.log(`wrote ${p.dir}/handoff.md`);
  }
  if (cmd === "note") {
    const [, project, session, step, ...words] = pos;
    const text = words.join(" ").trim();
    if (!project || !session || !step || !text)
      return console.error('usage: omgp note <project> <session> <step> "text"');
    const s = loadSession(root, project, session);
    if (!s || !allSteps(s).some((x) => x.id === step))
      return console.error(`no step ${step} in ${project}/${session}`);
    const prev = loadResults(root, project, session).steps[step]?.note;
    updateResults(root, project, session, { op: "step", step, patch: { note: prev ? `${prev}
${text}` : text } });
    return console.log(`note added to ${step}`);
  }
  if (cmd === "comments") {
    const scopes = pos[1] ? [pos[1]] : [ROOT_SCOPE, ...ws.projects.map((p) => p.id)];
    let n = 0;
    for (const scope of scopes) {
      for (const t of anchorThreads(root, scope, loadComments(root, scope))) {
        if (t.status !== "open" && !flags.all)
          continue;
        n++;
        const where = t.target.kind === "text" ? { ...t.target, line: t.line ?? undefined } : t.target;
        console.log(`
${c.bold(t.id)} ${c.dim(scope === ROOT_SCOPE ? "(root)" : scope)} ${t.status === "resolved" ? c.green("resolved") : ""}${t.outdated ? c.yellow(" outdated: the quoted text changed") : ""}`);
        console.log(`  on ${targetLabel(where)}`);
        for (const cm of t.comments)
          console.log(`  ${cm.agent ? c.dim("agent") : c.bold(cm.author)}: ${cm.text.replace(/\n/g, `
    `)}`);
      }
    }
    if (!n)
      console.log("no open comments");
    return;
  }
  if (cmd === "reply" || cmd === "resolve") {
    const id = pos[1];
    const found = [ROOT_SCOPE, ...ws.projects.map((p) => p.id)].find((scope) => loadComments(root, scope).threads.some((t) => t.id === id));
    if (!id || !found)
      return console.error(`usage: omgp ${cmd} <thread>${cmd === "reply" ? ' "text"' : ""}  (see omgp comments)`);
    if (cmd === "reply") {
      const text = pos.slice(2).join(" ").trim();
      if (!text)
        return console.error('usage: omgp reply <thread> "text"');
      updateComments(root, found, { op: "reply", thread: id, id: newId("c"), text, author: str(flags.as) ?? "agent", agent: true });
    } else
      updateComments(root, found, { op: "resolve", thread: id, by: str(flags.as) ?? "agent" });
    return console.log(`${id} \u2192 ${cmd === "reply" ? "replied" : "resolved"}`);
  }
  if (cmd === "requests") {
    for (const r of listRequests(root))
      console.log(`${r.status.padEnd(8)} ${r.id}  ${r.kind} ${r.project}/${r.session ?? ""} ${r.step ?? ""}  ${c.dim(r.text.slice(0, 60))}`);
    return;
  }
  if (cmd === "listen") {
    const timeout = Number(str(flags.timeout) ?? 600) * 1000;
    const until = Date.now() + timeout;
    const started = new Date().toISOString();
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode !== "listen")
      console.error(c.yellow(`note: ${hb.mode === "server" ? "the studio" : "omgp work"} already builds requests with ${hb.agent}; this would take one away from it.`));
    console.error(c.dim(`waiting for one live request (timeout ${timeout / 1000}s). This claims it and exits, so the agent that ran it can do the work.`));
    console.error(c.dim(`To keep building requests in the background, run \`omgp work\` instead.`));
    requeueStale(root);
    while (Date.now() < until) {
      writeHeartbeat(root, { pid: process.pid, mode: "listen", agent: "an agent chat", startedAt: started, busy: [] });
      const open = listRequests(root).find((r) => r.status === "open");
      const claimed = open && claimRequest(root, open.id, { mode: "listen", agent: "agent chat (omgp listen)" });
      if (claimed) {
        appendLog(root, claimed.id, [{ kind: "status", text: "claimed by an agent chat (omgp listen)" }]);
        clearHeartbeat(root, process.pid);
        console.log(JSON.stringify({ ...claimed, log: undefined }, null, 2));
        console.log(`
` + requestPrompt(claimed, "listen"));
        return;
      }
      await Bun.sleep(400);
    }
    clearHeartbeat(root, process.pid);
    console.error("no request arrived");
    process.exit(2);
  }
  if (cmd === "progress") {
    const id = pos[1];
    const text = pos.slice(2).join(" ").trim();
    if (!id || !text || !getRequest(root, id))
      return console.error('usage: omgp progress <request-id> "what you are doing"');
    appendLog(root, id, [{ kind: "text", text }]);
    return;
  }
  if (cmd === "work") {
    const preset = str(flags.agent);
    const base = ws.config.agent ?? { timeout: 900, concurrency: 1 };
    const presets = ["claude", "codex", "opencode", "pi"];
    const cfg = {
      ...base,
      ...preset ? presets.includes(preset) ? { preset, command: undefined } : { preset: undefined, command: preset } : {},
      ...str(flags.model) ? { model: str(flags.model) } : {}
    };
    if (!cfg.preset && !cfg.command)
      cfg.preset = "claude";
    const hb = readHeartbeat(root);
    if (hb?.alive && hb.mode !== "listen") {
      console.error(`${hb.mode === "server" ? "The studio" : "Another omgp work"} (pid ${hb.pid}) already builds requests with ${hb.agent}. Stop it first, or remove agent from product.yaml.`);
      process.exit(1);
    }
    const kindColor = { tool: c.dim, text: (s) => s, status: c.green, error: c.red };
    const runner = new Runner(root, cfg, ws.config.locale, {
      mode: "worker",
      onEntry: (r, e) => console.log(`${c.dim(new Date().toLocaleTimeString())} ${c.bold(r.step ?? r.kind)} ${kindColor[e.kind](e.text)}`),
      onFinish: (r) => console.log(`${r.status === "done" ? c.green("\u2713") : c.red("\u2717")} ${r.id} ${r.status}${r.message ? `: ${r.message}` : ""}`)
    });
    runner.start();
    console.log(`${c.bold("omgp work")} \xB7 ${describeAgent(cfg)} \xB7 ${root}
Waiting for requests from the studio. Ctrl+C to stop.`);
    const stop = () => (runner.stop(), process.exit(0));
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    await new Promise(() => {});
  }
  if (cmd === "done") {
    const id = pos[1];
    if (!id || !getRequest(root, id))
      return console.error('usage: omgp done <request-id> [--fail "why"]');
    const fail = str(flags.fail);
    setRequestStatus(root, id, fail ? "failed" : "done", fail);
    return console.log(`${id} \u2192 ${fail ? "failed" : "done"}`);
  }
  if (cmd === "linear") {
    if (pos[1] !== "pull")
      return console.error("usage: omgp linear pull [--dry-run] [--from linear.json] [--backlog]");
    return linearPull(ws, { dryRun: !!flags["dry-run"], from: str(flags.from), backlog: !!flags.backlog });
  }
  console.error(`unknown command ${cmd}

${HELP}`);
  process.exit(1);
}
function printRoadmap(ws, asJson) {
  const a = ws.analysis;
  if (asJson)
    return console.log(JSON.stringify(a, null, 2));
  const name = (id) => ws.projects.find((p) => p.id === id)?.name ?? id;
  const scheduled = ws.projects.filter((p) => p.span && !["done", "dropped"].includes(p.stage)).sort((x, y) => x.span.start.localeCompare(y.span.start));
  console.log(c.bold(`Roadmap \xB7 ${ws.config.name} \xB7 today ${ws.today}`));
  for (const p of scheduled)
    console.log(`  ${p.span.start} \u2192 ${p.span.end}${p.span.resolution !== "day" ? c.dim(` (${p.span.resolution})`) : ""}  ${p.name}  ${c.dim(`${p.stage} \xB7 ${p.stream ?? "no stream"} \xB7 ${p.size ?? "?"} \xB7 ${p.confidence}`)}`);
  const backlog = ws.projects.filter((p) => !p.span && !["done", "dropped"].includes(p.stage));
  if (backlog.length)
    console.log(c.dim(`  backlog: ${backlog.map((p) => p.name).join(", ")}`));
  const section = (title, lines) => {
    if (!lines.length)
      return;
    console.log(`
${c.bold(title)}`);
    for (const l of lines)
      console.log(`  ${l}`);
  };
  section("Conflicts", a.conflicts.map((x) => c.red(x.message)));
  section("Cycles", a.cycles.map((cy) => c.red(cy.map(name).join(" \u2192 "))));
  section("Bottlenecks (others wait on these)", a.bottlenecks.map((b) => `${name(b.project)} \u2190 ${b.dependents.map(name).join(", ")}`));
  section("Overloaded streams", a.overload.map((o) => `${o.stream} ${o.from}\u2026${o.to}: load ${o.peak} > capacity ${o.capacity} (${o.projects.map(name).join(", ")})`));
  section("High priority, not scheduled", a.unscheduled.map(name));
  section("Can be handed to one person (no hard/tight links)", a.delegatable.map(name));
}
function printNext(root, ws, asJson) {
  const ranking = rank(loadPulse(root), pulseProjects(ws), { today: localDate(), k: ws.config.pulse?.k }).filter((r) => r.wins + r.losses > 0).slice(0, ws.config.profile?.focus ?? 3).map((r) => r.id);
  const tasks = nextTasks(ranking, ws.projects, 3);
  if (asJson)
    return console.log(JSON.stringify(tasks.map((x) => ({ ...x, project: ws.projects.find((p) => p.id === x.id)?.name })), null, 2));
  if (!tasks.length)
    return console.log("No next tasks yet. Finish a Pulse round: it asks the top 3 projects for theirs.");
  tasks.forEach((x, i) => {
    const name = ws.projects.find((p) => p.id === x.id)?.name ?? x.id;
    console.log(i === 0 ? `${c.bold("Do next:")} ${x.task}  ${c.dim(`\u2014 ${name}, #${x.place} in the Pulse`)}` : c.dim(`   then:  ${x.task}  \u2014 ${name}, #${x.place}`));
  });
}
function printPulse(root, ws, voter, asJson) {
  const days = loadPulse(root);
  const ranked = rank(days, pulseProjects(ws), { today: localDate(), voter, k: ws.config.pulse?.k });
  const people = new Set(days.map((d) => d.voter)).size;
  const duels = days.reduce((n, d) => n + d.duels.length, 0);
  if (asJson)
    return console.log(JSON.stringify({ people, duels, ranked }, null, 2));
  console.log(c.bold(`Pulse${voter ? ` (${voter})` : ""}`) + c.dim(`  ${people} ${people === 1 ? "person" : "people"}, ${duels} duels`));
  ranked.forEach((r, i) => {
    const p = ws.projects.find((p) => p.id === r.id);
    const delta = r.delta > 0 ? c.green(`\u25B2${r.delta}`.padEnd(5)) : r.delta < 0 ? c.red(`\u25BC${-r.delta}`.padEnd(5)) : c.dim("\xB7".padEnd(5));
    console.log(`${String(i + 1).padStart(3)}. ${String(r.rating).padStart(4)} ${delta} ${p.name}${r.split ? c.yellow("  \u26A1 split") : ""}  ${c.dim(`${r.wins}\u2013${r.losses}`)}`);
  });
}
function printStatus(ws, projectId) {
  if (!projectId) {
    for (const p of ws.projects)
      console.log(`${p.id.padEnd(36)} ${p.stage.padEnd(12)} ${p.sessions.map((s) => `${s.id} ${s.answered}/${s.steps}`).join(", ")}`);
    return;
  }
  const p = ws.projects.find((p) => p.id === projectId);
  if (!p)
    return console.error(`no project ${projectId}`);
  console.log(c.bold(`${p.name}`) + c.dim(`  ${p.stage} \xB7 ${p.priority} \xB7 ${p.size ?? "?"} \xB7 ${p.span ? `${p.span.start} \u2192 ${p.span.end}` : "no date"}`));
  if (p.dependsOn.length)
    console.log(`depends on: ${p.dependsOn.map((d) => `${d.on} (${d.kind})`).join(", ")}`);
  console.log(`prototypes: ${p.prototypes.map((x) => x.file).join(", ") || "\u2014"}`);
  for (const s of p.sessions) {
    const full = loadSession(ws.root, p.id, s.id);
    const res = loadResults(ws.root, p.id, s.id);
    console.log(`
session ${s.id} (${s.kind}, ${s.status}${s.date ? `, ${s.date}` : ""}): ${s.answered}/${s.steps} answered`);
    for (const st of allSteps(full)) {
      if (st.type === "slide")
        continue;
      const r = res.steps[st.id];
      const v = r?.status && r.status !== "decided" ? r.status : r?.value ?? "";
      console.log(`  ${v ? c.green("\u2713") : "\xB7"} ${st.type.padEnd(8)} ${st.id.padEnd(28)} ${v ? c.dim(String(v).slice(0, 50)) : ""}`);
    }
    if (res.annotations.length)
      console.log(`  ${res.annotations.length} annotations`);
  }
  const reqs = listRequests(ws.root).filter((r) => r.project === p.id && r.status !== "done");
  if (reqs.length)
    console.log(`
open requests: ${reqs.map((r) => `${r.id} (${r.status})`).join(", ")}`);
  if (p.handoff)
    console.log(`
handoff: ${p.dir}/handoff.md`);
}
main();
export {
  yamlStringify
};
