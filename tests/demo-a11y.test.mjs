import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readDist } from "./helpers.mjs";

// Strip inline <style>/<script>: Astro inlines the demo's CSS (which contains
// "[data-demo-stage]"), and DOM-order checks must only see real elements.
const raw = readDist("index.html")
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "");
const tagOf = (attr) => {
  const m = raw.match(new RegExp(`<[a-z]+[^>]*\\b${attr}\\b[^>]*>`));
  assert.ok(m, `element with ${attr} not found`);
  return m[0];
};

test("typing stage is not a live region", () => {
  assert.doesNotMatch(tagOf("data-demo-stage"), /aria-live/);
});

test("pause and skip controls come before the stage in DOM order", () => {
  const stage = raw.indexOf("data-demo-stage");
  const pause = raw.indexOf("data-demo-pause");
  const skip = raw.indexOf("data-demo-skip");
  assert.ok(pause > 0 && skip > 0, "pause/skip controls missing");
  assert.ok(pause < stage && skip < stage, "controls must precede the animated region");
});

test("controls stay hidden until the script starts (no-JS visitors see no dead buttons)", () => {
  assert.match(tagOf("data-demo-controls"), /\bhidden\b/);
});

test("a status region announces progress politely", () => {
  assert.match(tagOf("data-demo-status"), /role="status"/);
});

test("replay is a control-bar button, not disabled in markup", () => {
  const replay = tagOf("data-demo-replay");
  assert.doesNotMatch(replay, /\bdisabled\b/);
  assert.ok(raw.indexOf("data-demo-replay") < raw.indexOf("data-demo-stage"));
});

// ---------------------------------------------------------------------------
// Engine behaviour: drive src/scripts/demo.ts against a minimal fake DOM with
// mocked timers (no browser, no extra dependencies).
// ---------------------------------------------------------------------------

// demo.ts uses bundler-style extensionless imports ("./playback"); resolve them to .ts.
registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {}
    }
    return next(specifier, context);
  },
});

class FakeText {
  constructor(data) {
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v) {
    this.data = String(v);
  }
}

class FakeElement {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.childNodes = [];
    this.attributes = new Map(Object.entries(attrs));
    this.classes = new Set();
    this.listeners = [];
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.classList = {
      contains: (c) => this.classes.has(c),
      remove: (c) => this.classes.delete(c),
      toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c), on),
    };
  }
  get className() {
    return [...this.classes].join(" ");
  }
  set className(v) {
    this.classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  set textContent(v) {
    this.childNodes = v ? [new FakeText(String(v))] : [];
  }
  set innerHTML(v) {
    assert.equal(v, "", "fake DOM only supports clearing innerHTML");
    this.childNodes = [];
  }
  append(...nodes) {
    this.childNodes.push(...nodes);
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
  click() {
    for (const fn of this.listeners) fn({ preventDefault() {} });
  }
  focus() {
    if (!this.disabled) globalThis.document.activeElement = this;
  }
  scrollIntoView() {}
  *descendants() {
    for (const n of this.childNodes) {
      if (n instanceof FakeElement) {
        yield n;
        yield* n.descendants();
      }
    }
  }
  querySelectorAll(sel) {
    let m;
    let match;
    if ((m = sel.match(/^\.([\w-]+)$/))) match = (e) => e.classes.has(m[1]);
    else if ((m = sel.match(/^([a-z]*)\[([\w-]+)(?:(\^?=)'([^']*)')?\]$/))) {
      const [, tag, name, op, val] = m;
      match = (e) => {
        if (tag && e.tagName !== tag.toUpperCase()) return false;
        const v = e.getAttribute(name);
        if (v === null) return false;
        if (op === "=") return v === val;
        if (op === "^=") return v.startsWith(val);
        return true;
      };
    } else throw new Error(`fake DOM: unsupported selector ${sel}`);
    return [...this.descendants()].filter(match);
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

function mountFakeDemo() {
  const h = (tag, attrs, ...kids) => {
    const e = new FakeElement(tag, attrs);
    e.append(...kids);
    return e;
  };
  const root = h(
    "div",
    { "data-demo-root": "" },
    h(
      "div",
      { "data-demo-controls": "" },
      h("button", { "data-demo-pause": "" }),
      h("button", { "data-demo-skip": "" }),
      h("button", { "data-demo-replay": "" }),
    ),
    h("p", { role: "status", "data-demo-status": "" }),
    h("div", { "data-demo-static": "" }),
    h("div", { "data-demo-stage": "" }),
    h("aside", {}, ...[1, 2, 3, 4].map((n) => h("div", { "data-demo-src": String(n) }))),
    h("details", { "data-demo-trace": "" }),
  );
  const body = h("body", {}, root);
  globalThis.document = {
    activeElement: body,
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (data) => new FakeText(data),
    querySelector: (sel) => body.querySelector(sel),
  };
  return root;
}

// Mounts a fresh fake demo, starts it (Node has no IntersectionObserver, so it starts at
// once) and returns helpers that advance the mocked clock.
async function startFakeDemo(t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const root = mountFakeDemo();
  const { initDemo } = await import("../src/scripts/demo.ts");
  const q = (sel) => root.querySelector(sel);
  const until = async (cond, what) => {
    for (let ms = 0; ms < 60_000; ms++) {
      if (cond()) return;
      t.mock.timers.tick(1);
      await new Promise((r) => setImmediate(r));
    }
    assert.fail(`timed out waiting for ${what}`);
  };
  initDemo();
  return { q, until };
}

// Names the focused element by its first attribute (e.g. "data-demo-replay"), or its tag.
const focused = () => {
  const a = document.activeElement;
  return a.attributes.keys().next().value ?? a.tagName;
};

test("Replay pressed between turns restarts cleanly (no stale turn from the old run)", async (t) => {
  const { q, until } = await startFakeDemo(t);
  const { demoScript } = await import("../src/lib/demoScript.ts");

  await until(() => q("[data-demo-status]").textContent === "Answer 1 of 2 shown.", "turn 1 to finish");
  q("[data-demo-replay]").click(); // lands in the pause before turn 2 starts
  await until(() => q("[data-demo-pause]").disabled, "the replayed run to finish");

  const questions = q("[data-demo-stage]")
    .querySelectorAll(".demo-turn")
    .map((turn) => turn.querySelector(".demo-q").textContent);
  assert.deepEqual(questions, demoScript.turns.map((turn) => turn.question));
});

test("activating Skip from the keyboard moves focus to Replay (not a disabled button)", async (t) => {
  const { q, until } = await startFakeDemo(t);
  await until(() => q("[data-demo-stage]").textContent.length > 10, "typing to start");

  q("[data-demo-skip]").focus();
  assert.equal(focused(), "data-demo-skip");
  q("[data-demo-skip]").click();
  await until(() => q("[data-demo-skip]").disabled, "the skipped run to finish");

  assert.equal(focused(), "data-demo-replay");
});

test("Pause focused when the run finishes naturally hands focus to Replay", async (t) => {
  const { q, until } = await startFakeDemo(t);
  q("[data-demo-pause]").focus();
  assert.equal(focused(), "data-demo-pause");
  await until(() => q("[data-demo-pause]").disabled, "the run to finish");

  assert.equal(focused(), "data-demo-replay");
});

test("finishing the run does not steal focus from elsewhere on the page", async (t) => {
  const { q, until } = await startFakeDemo(t);
  assert.equal(focused(), "BODY");
  await until(() => q("[data-demo-pause]").disabled, "the run to finish");

  assert.equal(focused(), "BODY");
});
