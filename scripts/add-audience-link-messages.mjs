// Adds the labels for linking categories/collections to an audience (and the audience dropdown in the header).
// Safe to run more than once. Usage:  node scripts/add-audience-link-messages.mjs
import { readFileSync, writeFileSync } from "node:fs";

const add = {
  en: {
    audience: "Audience",
    audienceHint: "Who this belongs to. It appears under that audience in the store header and filters.",
    audiencePlaceholder: "Choose an audience…",
    allAudiences: "All audiences",
    audienceInUse: "Products, categories or collections still use this audience — move them to another one first.",
    showInHeader: "Show in the store header",
    showInHeaderHint: "Adds this audience to the header menu, with its categories and collections in a dropdown.",
    nav: { categories: "Categories", viewAll: "View all" },
    collectionsPage: { all: "All", filterByAudience: "Filter by audience", empty: "No collections here yet." },
  },
  ar: {
    audience: "الفئة المستهدفة",
    audienceHint: "لمن يتبع هذا العنصر. سيظهر تحت هذه الفئة في هيدر المتجر وفي الفلاتر.",
    audiencePlaceholder: "اختر الفئة المستهدفة…",
    allAudiences: "كل الفئات",
    audienceInUse: "توجد منتجات أو تصنيفات أو مجموعات تستخدم هذه الفئة — انقلها إلى فئة أخرى أولاً.",
    showInHeader: "إظهار في هيدر المتجر",
    showInHeaderHint: "تُضاف الفئة إلى قائمة الهيدر، وتظهر تصنيفاتها ومجموعاتها في قائمة منسدلة.",
    nav: { categories: "التصنيفات", viewAll: "عرض الكل" },
    collectionsPage: { all: "الكل", filterByAudience: "تصفية حسب الفئة", empty: "لا توجد مجموعات هنا بعد." },
  },
};

for (const lang of ["en", "ar"]) {
  const file = new URL(`../messages/${lang}.json`, import.meta.url);
  const json = JSON.parse(readFileSync(file, "utf8"));
  const a = add[lang];
  for (const key of ["categories", "collections"]) {
    Object.assign(json.admin[key], { audience: a.audience, audienceHint: a.audienceHint, audiencePlaceholder: a.audiencePlaceholder, allAudiences: a.allAudiences });
  }
  Object.assign(json.admin.audiences, { showInHeader: a.showInHeader, showInHeaderHint: a.showInHeaderHint, inUse: a.audienceInUse });
  Object.assign(json.nav, a.nav);
  Object.assign(json.collectionsPage, a.collectionsPage);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`updated messages/${lang}.json`);
}
