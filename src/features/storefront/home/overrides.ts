/** Tone names understood by ImageSlot and the banner band. */
export const TONES = ["wine", "copper", "cream", "sage"] as const;
export type Tone = (typeof TONES)[number];

/** Config-driven tone with a safe fallback — CMS input is free text, the palette is not. */
export const toneOf = (value: string | undefined, fallback: Tone): Tone =>
  TONES.includes(value as Tone) ? (value as Tone) : fallback;

/**
 * Optional CMS overrides the homepage builder injects into the fixed section designs.
 * Every field is already resolved to the visitor's language by the renderer;
 * components fall back to their i18n copy when an override is missing.
 */
export type SectionOverrides = {
  eyebrow?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  image?: string;
  mobileImage?: string;
  secondaryImage?: string;
  tone?: string;
  items?: string[];
};
