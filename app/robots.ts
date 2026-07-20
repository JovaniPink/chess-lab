import type { MetadataRoute } from "next";
import { isProduction, configuredSiteUrl } from "@/lib/site-config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isProduction ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
    sitemap: isProduction ? `${configuredSiteUrl}/sitemap.xml` : undefined,
  };
}
