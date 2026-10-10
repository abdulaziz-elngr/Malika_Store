"use client";

import { createContext, useContext } from "react";

export type BrandAssets = { logoUrl: string; logoDarkUrl: string };
const BrandContext = createContext<BrandAssets>({ logoUrl: "", logoDarkUrl: "" });

/** Carries the logo URLs saved in Admin → Appearance down to every <Logo />. Empty = built-in MALIKA files. */
export function BrandProvider({ value, children }: { value: BrandAssets; children: React.ReactNode }) {
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export const useBrand = () => useContext(BrandContext);
