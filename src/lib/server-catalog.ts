import "server-only";
import { cache } from "react";
import { getCatalog } from "@/lib/catalog-store";

export const getPageCatalog = cache(getCatalog);
export const getPageDate = cache(() => new Date().toISOString());
