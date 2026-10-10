const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export type SocialKey = "instagram" | "tiktok" | "facebook" | "x" | "whatsapp";

export function SocialIcon({ name, size = 18 }: { name: SocialKey; size?: number }) {
  const p = { ...base, width: size, height: size };
  switch (name) {
    case "instagram":
      return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>);
    case "facebook":
      return (<svg {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>);
    case "tiktok":
      return (<svg {...p}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>);
    case "x":
      return (<svg {...p}><path d="M4 4l16 16M20 4L4 20" /></svg>);
    case "whatsapp":
      return (<svg {...p}><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></svg>);
  }
}
