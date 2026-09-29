// A minimal DOM for driving the demo engine and its renderers under `node --test`, with no browser
// and no extra dependency. It has only what src/scripts/demo-engine.ts and src/scripts/demo/*.ts
// touch: elements and text nodes, attributes (id reflected), classes, hidden/disabled, a style object,
// click listeners (a click bubbles through its ancestors), focus, closest(), contains() and
// querySelector(All) for the selector forms "tag", ".class" and "[attr]", '[attr="value"]' (with an
// optional tag in front).
// Moved out of the Phase 0 tests/demo-a11y.test.mjs, which drove the old src/scripts/demo.ts.

export class FakeText {
  constructor(data) {
    this.data = String(data);
    this.parentNode = null;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v) {
    this.data = String(v);
  }
}

export class FakeElement {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map(Object.entries(attrs).map(([k, v]) => [k, String(v)]));
    this.classes = new Set();
    this.listeners = [];
    this.hidden = "hidden" in attrs;
    this.attributes.delete("hidden");
    this.disabled = false;
    this.style = {};
    this.offsetHeight = 0;
    this.classList = {
      contains: (c) => this.classes.has(c),
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
    };
  }
  get className() {
    return [...this.classes].join(" ");
  }
  set className(v) {
    this.classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  /** Reflects the id attribute, as a browser does, so "[id]" also finds an id set as a property. */
  get id() {
    return this.getAttribute("id") ?? "";
  }
  set id(v) {
    this.setAttribute("id", v);
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  set textContent(v) {
    this.replaceChildren(...(v === "" ? [] : [new FakeText(v)]));
  }
  append(...nodes) {
    for (const n of nodes) {
      const node = typeof n === "string" ? new FakeText(n) : n;
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const n of this.childNodes) n.parentNode = null;
    this.childNodes = [];
    this.append(...nodes);
  }
  getAttribute(n) {
    return this.attributes.get(n) ?? null;
  }
  setAttribute(n, v) {
    this.attributes.set(n, String(v));
  }
  removeAttribute(n) {
    this.attributes.delete(n);
  }
  addEventListener(type, fn) {
    if (type === "click") this.listeners.push(fn);
  }
  /**
   * A user's click: nothing happens on a disabled control, as in a browser; otherwise it bubbles up
   * through its ancestors' listeners, so a listener on the demo frame hears a click on a citation.
   */
  click() {
    if (this.disabled) return;
    const event = { target: this, preventDefault() {} };
    for (let n = this; n instanceof FakeElement; n = n.parentNode) for (const fn of n.listeners) fn(event);
  }
  focus() {
    if (!this.disabled) globalThis.document.activeElement = this;
  }
  /** A copy: attributes, classes, hidden and disabled, and with `deep` the whole subtree (Phase D Task 3's replay copies its transcript). */
  cloneNode(deep = false) {
    const copy = new FakeElement(this.tagName.toLowerCase());
    copy.attributes = new Map(this.attributes);
    copy.classes = new Set(this.classes);
    copy.hidden = this.hidden;
    copy.disabled = this.disabled;
    if (deep) copy.append(...this.childNodes.map((n) => (n instanceof FakeElement ? n.cloneNode(true) : new FakeText(n.data))));
    return copy;
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  closest(sel) {
    const match = matcher(sel);
    for (let n = this; n instanceof FakeElement; n = n.parentNode) if (match(n)) return n;
    return null;
  }
  *descendants() {
    for (const n of this.childNodes) {
      if (n instanceof FakeElement) {
        yield n;
        yield* n.descendants();
      }
    }
  }
  querySelectorAll(sel) {
    return [...this.descendants()].filter(matcher(sel));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

function matcher(sel) {
  let m;
  if ((m = sel.match(/^\.([\w-]+)$/))) return (e) => e.classes.has(m[1]);
  if ((m = sel.match(/^([a-z]*)\[([\w-]+)(?:="([^"]*)")?\]$/))) {
    const [, tag, name, value] = m;
    return (e) => {
      if (tag && e.tagName !== tag.toUpperCase()) return false;
      const v = e.getAttribute(name);
      return v !== null && (value === undefined || v === value);
    };
  }
  if ((m = sel.match(/^([a-z]+)$/))) return (e) => e.tagName === m[1].toUpperCase();
  throw new Error(`fake DOM: unsupported selector ${sel}`);
}

/** Builds an element tree: h("div", { "data-x": "" }, child, "text", …). An attrs key "hidden" sets .hidden. */
export function h(tag, attrs = {}, ...kids) {
  const e = new FakeElement(tag, attrs);
  e.append(...kids);
  return e;
}

/** Installs a global `document` over `body` (focus starts on it) and returns it. */
export function installDocument(body) {
  globalThis.document = {
    activeElement: body,
    body,
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (data) => new FakeText(data),
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel),
  };
  return globalThis.document;
}
