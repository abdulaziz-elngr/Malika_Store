/** Plain data handed from the server page to the page screens (no db types cross the boundary). */
export type PageDTO = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  visible: boolean;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  createdAt: Date;
  updatedAt: Date;
};
