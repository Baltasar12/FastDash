import "server-only";
import type { F1DataProvider } from "@/types/f1-provider";
import { jolpicaProvider } from "./jolpica";

/** One process-local instance shares validated cache, deduplication and quota. */
export const f1Provider: F1DataProvider = jolpicaProvider;
