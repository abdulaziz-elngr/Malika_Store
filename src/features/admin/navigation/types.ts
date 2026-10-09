export type NavMenu = "header" | "footer";

/** Plain data handed from the server page to the navigation screens (no db types cross the boundary). */
export type NavDTO = {
  id: string;
  menu: string;
  labelAr: string;
  labelEn: string;
  href: string;
  sortOrder: number;
  visible: boolean;
  updatedAt: Date;
};
