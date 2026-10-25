/* Dependency-free UI regressions using the installed TypeScript and React runtimes.
 * These checks verify rendered structure; they do not replace browser layout QA.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const ReactDOM = require("react-dom");
const { renderToStaticMarkup } = require("react-dom/server");
const motion = require("framer-motion");
const postcss = require("postcss");
let invoiceMode = "easy";

function createLoader(overrides = {}) {
  const cache = new Map();
  return function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const resolve = (name) => {
      if (overrides[name]) return overrides[name];
      if (name.endsWith("aiService")) return {
        AI_PROMPT_MAX_CHARS: 20000,
        parseAIJsonReply: (reply) => { try { return JSON.parse(reply); } catch { return undefined; } },
        aiService: { generate: async () => { throw new Error("UI regression checks must not call live AI"); } },
      };
      if (name === "react-dom") return { ...ReactDOM, createPortal: (node) => node };
      if (name === "framer-motion") return motion;
      if (name === "react") return { ...React, useLayoutEffect: React.useEffect, useState: (initial) => React.useState(initial === "easy" ? invoiceMode : initial) };
      if (!name.startsWith(".")) return require(name);
      const base = path.resolve(path.dirname(file), name);
      return load([".tsx", ".ts", ".js"].map((extension) => base + extension).find(fs.existsSync) || base);
    };
    new Function("require", "module", "exports", source)(resolve, mod, mod.exports);
    return mod.exports;
  };
}

const load = createLoader();
const Dialog = load("src/components/ui/ResponsiveDialog.tsx").default;
const InvoiceForm = load("src/components/modular/invoices/invoiceDialog.tsx").default;
const { LiquidButton, LiquidIconButton } = load("src/components/ui/liquid.tsx");
const noop = () => {};
const formData = {
  invoice_no: "TEST-001", date: "2026-10-24", customer_name: "Test Customer",
  customer_phone: 9999999999, customer_email: "test@example.com", customer_address: "Test address",
  gst: false, po: false, quotation: false, gst_name: "", gst_no: "", gst_phone: "", gst_email: "", gst_address: "",
  products: [{ productName: "Water softener", productQuantity: 1, productPrice: 1000 }], paid_status: "unpaid", payment_type: "cash",
};

global.document = { body: {} };
try {
  const html = renderToStaticMarkup(React.createElement(Dialog, {
    open: true, title: "Test dialog", onClose: noop,
    footer: React.createElement("button", { type: "submit", form: "test-form" }, "Save"),
  }, React.createElement("form", { id: "test-form" }, React.createElement("input", { name: "title" }))));
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby=/);
  assert.ok(html.indexOf("crm-dialog-header") < html.indexOf("crm-dialog-scroll"));
  assert.ok(html.indexOf("<\/form>") < html.indexOf("crm-dialog-footer"));
  assert.match(html, /aria-label="Close Test dialog"/);
  assert.equal(renderToStaticMarkup(React.createElement(Dialog, { open: false, title: "Closed", onClose: noop }, "Hidden")), "");
  for (invoiceMode of ["easy", "standard", "quick"]) {
    const invoice = renderToStaticMarkup(React.createElement(InvoiceForm, {
      showModal: true, onClose: noop, onClear: noop, editingInvoice: null,
      handleSubmit: noop, formData, setFormData: noop,
      productForm: { productName: "", productQuantity: 1, productPrice: 0 },
      setProductForm: noop, availableProducts: [], handleProductSelect: noop, addProduct: noop,
      editingProductIndex: null, editProduct: noop, removeProduct: noop, cancelEditProduct: noop,
      isDraftDirty: true, calculateTotal: () => 1000,
    }));
    assert.match(invoice, /id="invoice-form"/);
    assert.match(invoice.match(/<button[^>]*form="invoice-form"[^>]*>/)?.[0] || "", /type="submit"/);
    assert.ok(invoice.indexOf("<\/form>") < invoice.indexOf("crm-dialog-footer"));
    assert.match(invoice, /aria-label="Invoice entry mode"/);
    assert.match(invoice, /Create Invoice/);
    if (invoiceMode === "quick") {
      assert.match(invoice, /Format with AI/);
      assert.match(invoice, /Unformatted invoice details/);
      assert.match(invoice, /Use local parser/);
    }
    console.log(`PASS invoice ${invoiceMode}: linked submit, fixed footer and mode controls`);
  }
  for (const Button of [LiquidButton, LiquidIconButton]) {
    assert.match(renderToStaticMarkup(React.createElement(Button, {}, "Action")), /type="button"/);
  }
} finally { delete global.document; }

// Exercise actual dialog effects with a small DOM double: nested layers, Escape,
// focus cycling/restoration, body lock and keyboard viewport listener cleanup.
const effects = [], refs = [], listeners = new Set();
class Element {
  constructor(name) { this.name = name; this.isConnected = true; this.style = { overflow: "auto", setProperty: noop }; }
  focus() { global.document.activeElement = this; }
  getClientRects() { return [{}]; }
  closest() { return null; }
  contains(target) { return target instanceof Element; }
  querySelector() { return null; }
  querySelectorAll() { return [first, last]; }
}
const first = new Element("first"), last = new Element("last"), opener = new Element("opener");
let refNumber = 0;
const hookReact = {
  ...React,
  useId: (() => { let id = 0; return () => `dialog-${++id}`; })(),
  useRef: (value) => { const ref = { current: value === null ? new Element(`ref-${refNumber++}`) : value }; refs.push(ref); return ref; },
  useEffect: (effect) => effects.push(effect),
};
global.HTMLElement = Element;
global.Node = Element;
global.requestAnimationFrame = (callback) => { callback(); return 1; };
global.cancelAnimationFrame = noop;
let viewportListeners = 0;
global.window = { visualViewport: { height: 400, offsetTop: 20, addEventListener: () => viewportListeners++, removeEventListener: () => viewportListeners-- } };
global.document = {
  activeElement: opener, body: new Element("body"),
  addEventListener: (_name, callback) => listeners.add(callback),
  removeEventListener: (_name, callback) => listeners.delete(callback),
};
try {
  const HookDialog = createLoader({ react: hookReact, "framer-motion": { ...motion, useReducedMotion: () => false } })("src/components/ui/ResponsiveDialog.tsx").default;
  let closed = 0;
  HookDialog({ open: true, title: "First", onClose: () => closed++, children: "Body" });
  const cleanup = effects.shift()();
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(refs[1].current.style.height, "400px");
  const event = (key, shiftKey = false) => ({ key, shiftKey, target: first, preventDefault: noop, stopPropagation: noop, defaultPrevented: false });
  document.activeElement = last;
  listeners.forEach((callback) => callback(event("Tab")));
  assert.equal(document.activeElement, first);
  document.activeElement = first;
  listeners.forEach((callback) => callback(event("Tab", true)));
  assert.equal(document.activeElement, last);
  HookDialog({ open: true, title: "Busy nested", busy: true, onClose: () => closed++, children: "Body" });
  const cleanupNested = effects.shift()();
  listeners.forEach((callback) => callback(event("Escape")));
  assert.equal(closed, 0);
  cleanupNested();
  assert.equal(document.body.style.overflow, "hidden");
  listeners.forEach((callback) => callback(event("Escape")));
  assert.equal(closed, 1);
  cleanup();
  assert.equal(document.body.style.overflow, "auto");
  assert.equal(document.activeElement, opener);
  assert.equal(listeners.size, 0);
  assert.equal(viewportListeners, 0);
  console.log("PASS dialog keyboard, nested busy state, focus return, viewport and scroll-lock cleanup");
} finally {
  for (const key of ["document", "window", "HTMLElement", "Node", "requestAnimationFrame", "cancelAnimationFrame"]) delete global[key];
}
const css = fs.readFileSync("src/styles/invoiceDialogMobile.css", "utf8");
postcss.parse(css);
assert.ok(!css.includes("!important"), "Shared responsive CSS must not force unrelated Tailwind layouts");
console.log("PASS responsive CSS parses without global grid overrides");
