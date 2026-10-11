import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.uuid("invalid"),
  rating: z.coerce.number("ratingRequired").int("ratingRequired").min(1, "ratingRequired").max(5, "ratingRequired"),
  body: z.string().trim().min(3, "reviewShort").max(1500, "tooLong"),
});
