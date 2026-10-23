import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const source = stripTypeScriptTypes(readFileSync(new URL("../src/lib/meta-pixel.ts", import.meta.url), "utf8"))
  .replace(/^export /gm, "");
function browser({ blockedStorage = false, storage = new Map(), failScript = false } = {}) {
  const scripts = [];
  const window = {};
  if (failScript) Object.defineProperty(window, "dataLayer", { get: () => { throw Error("blocked"); }, set: () => { throw Error("blocked"); } });
  const context = vm.createContext({
    window,
    localStorage: {
      getItem: (key) => { if (blockedStorage) throw Error("blocked"); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (blockedStorage) throw Error("blocked"); storage.set(key, value); },
    },
  });
  vm.runInContext(source, context);
  return { context, scripts, storage, run: (code) => vm.runInContext(code, context) };
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test("events are pushed to the GTM dataLayer in order and no Meta library is loaded directly", () => {
  const b = browser();
  b.run('trackMeta("PageView"); trackMeta("Search", { search_string: "dress" })');
  assert.equal(b.scripts.length, 0);
  assert.equal(b.context.window.fbq, undefined);
  assert.deepEqual(plain(b.context.window.dataLayer), [
    { event: "PageView" }, { search_string: "dress", event: "Search" },
  ]);
});

test("minor prices convert to EGP, quantities and unique product ids are preserved", () => {
  const b = browser();
  const payload = plain(b.run('metaCart({ totalMinor: 125050, lines: [{productId:"p1", quantity:2, unitPriceMinor:50000},{productId:"p1", quantity:1, unitPriceMinor:25000},{productId:"p2", quantity:0, unitPriceMinor:20000}] })'));
  assert.equal(payload.value, 1250.5);
  assert.equal(payload.currency, "EGP");
  assert.equal(payload.num_items, 3);
  assert.deepEqual(payload.content_ids, ["p1"]);
  assert.equal(payload.contents[0].item_price, 500);
});

test("accepted additions exclude out-of-stock, missing, unchanged and stock-capped units", () => {
  const b = browser();
  assert.equal(b.run("acceptedAddition(undefined, 0, 2)"), 0);
  assert.equal(b.run("acceptedAddition({ quantity: 0 }, 0, 2)"), 0);
  assert.equal(b.run("acceptedAddition({ quantity: 3 }, 3, 2)"), 0);
  assert.equal(b.run("acceptedAddition({ quantity: 4 }, 3, 5)"), 1);
  assert.equal(b.run("acceptedAddition({ quantity: 10 }, 3, 2)"), 2);
});

test("purchase repeats and remounts are deduplicated; different orders are counted", () => {
  const b = browser();
  b.run('trackPurchase("order-1", {value:500,currency:"EGP"}); trackPurchase("order-1", {}); trackPurchase("order-2", {})');
  const events = plain(b.context.window.dataLayer).filter((row) => row.event === "Purchase");
  assert.equal(events.length, 2);
  assert.equal(events[0].event_id, "purchase_order-1");
  const reload = browser({ storage: b.storage });
  reload.run('trackPurchase("order-1", {})');
  assert.equal(reload.scripts.length, 0);
});

test("registration has its own deduplication key; storage denial does not break purchases", () => {
  const b = browser({ blockedStorage: true });
  b.run('trackOnceMeta("CompleteRegistration", "id1", {}); trackOnceMeta("CompleteRegistration", "id1", {}); trackPurchase("id1", {}); trackPurchase("id1", {})');
  const events = plain(b.context.window.dataLayer);
  assert.equal(events.length, 2);
});

test("analytics failures never throw into store operations; server rendering is safe", () => {
  const b = browser({ failScript: true });
  assert.equal(b.run('trackMeta("AddToCart", {})'), false);
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('trackMeta("PageView")', context), false);
});
