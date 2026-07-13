import type { MetadataRoute } from "next";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
