const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let response;
let request;
let requests = 0;
const mockedAI = {
  AI_PROMPT_MAX_CHARS: 20000,
  parseAIJsonReply: (reply) => { try { return JSON.parse(reply); } catch { return undefined; } },
  aiService: { generate: async (body) => { request = body; requests++; return response; } },
};
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync("src/services/invoiceAI.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function("require", "module", "exports", source)((name) => {
  assert.equal(name, "./aiService");
  return mockedAI;
}, mod, mod.exports);
const { normalizeInvoicePaste, formatInvoicePaste } = mod.exports;
const original = "Please bill Ananya Rao, +91 98765 43210, ananya@example.com. Flat 12 Hyderabad 500001. Softener qty 2 unit price INR 1,999.50 serial SN-12.";
const result = { name: "Ananya Rao", phone: "+91 98765 43210", email: "ananya@example.com", address: "Flat 12, Hyderabad, 500001", products: [{ productName: "Softener", productQuantity: 2, productPrice: 1999.5, productSerialNo: "SN-12" }], warnings: [] };
(async () => {
  response = { data: { reply: JSON.stringify(result) } };
  const draft = await formatInvoicePaste(original);
  assert.equal(draft.phone, "9876543210");
  assert.equal(draft.address, "Flat 12, Hyderabad, 500001");
  assert.equal(draft.products[0].productPrice, 1999.5);
  assert.equal(draft.products[0].productQuantity, 2);
  assert.equal(request.json, true);
  assert.equal(request.prompt, original);
  assert.equal(draft.products[0].productSerialNo, "SN-12");
  const incomplete = normalizeInvoicePaste({ ...result, products: [{ productName: "Filter", productQuantity: null, productPrice: null }] }, original);
  assert.deepEqual(incomplete.products, []);
  assert.equal(incomplete.warnings.length, 1);
  for (const row of [
    { productName: "Filter", productQuantity: 1, productPrice: -10 },
    { productName: "Filter", productQuantity: 0, productPrice: 10 },
    { productName: "Filter", productQuantity: 1.5, productPrice: 10 },
    { productName: "Filter", productQuantity: 1, productPrice: Infinity },
  ]) assert.equal(normalizeInvoicePaste({ ...result, products: [row] }, original).products.length, 0);
  assert.throws(() => normalizeInvoicePaste({ ...result, phone: "9123456789" }, original), /does not match/);
  assert.throws(() => normalizeInvoicePaste({ ...result, email: "invented@example.com" }, original), /does not match/);
  assert.throws(() => normalizeInvoicePaste([], original), /invalid format/);
  assert.throws(() => normalizeInvoicePaste({}, original), /No invoice details/);
  assert.equal(normalizeInvoicePaste({ name: "Ananya", products: [] }, original).phone, "");
  const previousRequests = requests;
  await assert.rejects(formatInvoicePaste(""), /Paste invoice/);
  await assert.rejects(formatInvoicePaste("x".repeat(20001)), /under/);
  assert.equal(requests, previousRequests);
  response = { data: { reply: "invalid JSON" } };
  await assert.rejects(formatInvoicePaste(original), /invalid format/);
  response = { error: "AI service unavailable" };
  await assert.rejects(formatInvoicePaste(original), /AI service unavailable/);
  console.log("PASS invoice AI extraction: JSON request, contact grounding, product amounts, missing values, invalid replies, limits and API errors");
})().catch((error) => { console.error(error); process.exitCode = 1; });
