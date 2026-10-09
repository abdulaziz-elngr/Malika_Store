import type { Loc } from "./localize";

export const GOVERNORATES = [
  ["cairo", "القاهرة", "Cairo"], ["giza", "الجيزة", "Giza"], ["alexandria", "الإسكندرية", "Alexandria"],
  ["qalyubia", "القليوبية", "Qalyubia"], ["sharqia", "الشرقية", "Sharqia"], ["dakahlia", "الدقهلية", "Dakahlia"],
  ["gharbia", "الغربية", "Gharbia"], ["monufia", "المنوفية", "Monufia"], ["beheira", "البحيرة", "Beheira"],
  ["kafr-el-sheikh", "كفر الشيخ", "Kafr El Sheikh"], ["damietta", "دمياط", "Damietta"], ["port-said", "بورسعيد", "Port Said"],
  ["ismailia", "الإسماعيلية", "Ismailia"], ["suez", "السويس", "Suez"], ["north-sinai", "شمال سيناء", "North Sinai"],
  ["south-sinai", "جنوب سيناء", "South Sinai"], ["fayoum", "الفيوم", "Fayoum"], ["beni-suef", "بني سويف", "Beni Suef"],
  ["minya", "المنيا", "Minya"], ["assiut", "أسيوط", "Assiut"], ["sohag", "سوهاج", "Sohag"], ["qena", "قنا", "Qena"],
  ["luxor", "الأقصر", "Luxor"], ["aswan", "أسوان", "Aswan"], ["red-sea", "البحر الأحمر", "Red Sea"],
  ["new-valley", "الوادي الجديد", "New Valley"], ["matrouh", "مطروح", "Matrouh"],
] as const;

export const GOVERNORATE_KEYS = GOVERNORATES.map((g) => g[0]) as unknown as readonly [string, ...string[]];

export const governorateName = (key: string, loc: Loc) => {
  const g = GOVERNORATES.find((x) => x[0] === key);
  return g ? (loc === "ar" ? g[1] : g[2]) : key;
};
