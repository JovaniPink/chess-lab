import type { MetadataRoute } from "next";
import { configuredSiteUrl } from "@/lib/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: configuredSiteUrl, changeFrequency: "monthly", priority: 1 }];
}
