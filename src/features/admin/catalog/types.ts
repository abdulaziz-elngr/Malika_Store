/** Serializable row shapes passed from server pages into the admin client screens. */

export type CategoryRow = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  tone: string;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
};

export type CollectionRow = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  tone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  visible: boolean;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
};

export type ProductListItem = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  priceMinor: number;
  salePriceMinor: number | null;
  status: "draft" | "published" | "archived";
  gender: "women" | "men" | "unisex";
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  categoryId: string | null;
  categoryNameEn: string | null;
  image: string | null;
  stock: number;
  createdAt: Date;
};

export type VariantRow = {
  v: {
    id: string;
    productId: string;
    sku: string;
    size: string;
    colorNameAr: string;
    colorNameEn: string;
    colorHex: string;
    priceMinor: number | null;
    stock: number;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };
  nameAr: string;
  nameEn: string;
  slug: string;
  status: "draft" | "published" | "archived";
  costMinor: number | null;
  priceMinor: number;
};
