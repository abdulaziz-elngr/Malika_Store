import { Boxes, FileText, GalleryVerticalEnd, Image as ImageIcon, LayoutDashboard, LayoutTemplate, Megaphone, Navigation, Package, Palette, PanelTop, Receipt, ScrollText, SearchCheck, Settings, ShieldCheck, Star, Tags, TicketPercent, UserCog, Users, type LucideIcon } from "lucide-react";
import type { IconName } from "../nav";

export const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard, products: Package, inventory: Boxes, categories: Tags, collections: GalleryVerticalEnd, orders: Receipt, customers: Users,
  coupons: TicketPercent, marketing: Megaphone, reviews: Star, homepage: LayoutTemplate, banners: PanelTop, pages: FileText, navigation: Navigation,
  media: ImageIcon, theme: Palette, seo: SearchCheck, users: UserCog, roles: ShieldCheck, audit: ScrollText, settings: Settings,
};
