// Adds the admin labels for the "Audiences" screen to messages/ar.json and messages/en.json.
// Safe to run more than once. Usage:  node scripts/add-audience-messages.mjs
import { readFileSync, writeFileSync } from "node:fs";

const add = {
  en: {
    resource: "Audiences",
    block: {
      eyebrow: "Catalogue",
      title: "Audiences",
      intro: "Who your pieces are for — Women, Men, Kids or anything you like. Each product is assigned to one audience.",
      listTitle: "All audiences",
      new: "New audience",
      newTitle: "New audience",
      editTitle: "Edit audience",
      empty: "No audiences yet",
      emptyBody: "Create the first audience so products can be assigned to it.",
      slug: "URL slug",
      slugHint: "Letters, numbers and dashes only, e.g. kids. Leave blank to generate it from the English name. It cannot be changed later.",
      slugLocked: "The slug cannot be changed after creation.",
      productCount: "Products",
      order: "Order",
      moveUp: "Move up",
      moveDown: "Move down",
      includeUnisex: "Also show unisex products",
      includeUnisexHint: "When on, products marked for both genders also appear in this audience.",
      storefrontLink: "Storefront page",
      inUse: "Products still use this audience — move them to another one first.",
    },
  },
  ar: {
    resource: "الفئات المستهدفة",
    block: {
      eyebrow: "الكتالوج",
      title: "الفئات المستهدفة",
      intro: "لمن هذه القطع — نسائي أو رجالي أو أطفال أو أي فئة تريدها. كل منتج يتبع فئة واحدة.",
      listTitle: "كل الفئات",
      new: "فئة جديدة",
      newTitle: "فئة جديدة",
      editTitle: "تعديل الفئة",
      empty: "لا توجد فئات بعد",
      emptyBody: "أنشئ أول فئة لتتمكن من ربط المنتجات بها.",
      slug: "الرابط المختصر",
      slugHint: "حروف إنجليزية وأرقام وشرطات فقط، مثل kids. اتركه فارغاً ليُنشأ من الاسم الإنجليزي. لا يمكن تغييره لاحقاً.",
      slugLocked: "لا يمكن تغيير الرابط المختصر بعد الإنشاء.",
      productCount: "المنتجات",
      order: "الترتيب",
      moveUp: "تحريك للأعلى",
      moveDown: "تحريك للأسفل",
      includeUnisex: "إظهار منتجات «للجنسين» أيضاً",
      includeUnisexHint: "عند التفعيل تظهر المنتجات المخصصة للجنسين داخل هذه الفئة.",
      storefrontLink: "صفحة المتجر",
      inUse: "توجد منتجات تستخدم هذه الفئة — انقلها إلى فئة أخرى أولاً.",
    },
  },
};

for (const lang of ["en", "ar"]) {
  const file = new URL(`../messages/${lang}.json`, import.meta.url);
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.admin.resources.audiences = add[lang].resource;
  json.admin.audiences = add[lang].block;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`updated messages/${lang}.json`);
}
