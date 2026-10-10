/** Plain data handed from the server page to the banner screens (no db types cross the boundary). */
export type BannerDTO = {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string | null;
  bodyEn: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabelAr: string | null;
  ctaLabelEn: string | null;
  href: string | null;
  position: string;
  tone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};
