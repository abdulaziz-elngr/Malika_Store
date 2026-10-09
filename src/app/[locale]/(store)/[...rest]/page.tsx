import { notFound } from "next/navigation";

// Routes not built yet resolve to the localized, branded 404 page.
export default function CatchAll() {
  notFound();
}
