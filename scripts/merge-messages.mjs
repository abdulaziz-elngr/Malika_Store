/**
 * Merges staging message files into messages/en.json and messages/ar.json.
 *
 * Each staging file (i18n-staging/*.json) looks like:
 *   { "en": { "admin.products": { ... } }, "ar": { "admin.products": { ... } } }
 *
 * Nested namespace keys ("admin.products") are created as nested objects; existing keys are
 * deep-merged (staging wins). Run from the malika root: node scripts/merge-messages.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "i18n-staging");
if (!existsSync(dir)) {
  console.log("no i18n-staging directory — nothing to merge");
  process.exit(0);
}

function deepMerge(base, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v)) base[k] = deepMerge(base[k] && typeof base[k] === "object" ? base[k] : {}, v);
    else base[k] = v;
  }
  return base;
}

function apply(messages, additions) {
  for (const [ns, keys] of Object.entries(additions)) {
    const parts = ns.split(".");
    let node = messages;
    for (const p of parts.slice(0, -1)) node = (node[p] ??= {});
    const last = parts[parts.length - 1];
    node[last] = deepMerge(typeof node[last] === "object" && node[last] ? node[last] : {}, keys);
  }
}

for (const locale of ["en", "ar"]) {
  const path = join(process.cwd(), "messages", `${locale}.json`);
  const messages = JSON.parse(readFileSync(path, "utf8"));
  let merged = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const staging = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (staging[locale]) {
      apply(messages, staging[locale]);
      merged++;
    }
  }
  writeFileSync(path, JSON.stringify(messages, null, 2) + "\n", "utf8");
  console.log(`messages/${locale}.json ← ${merged} staging file(s)`);
}
