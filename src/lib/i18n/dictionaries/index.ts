import type { Locale } from "../locales";
import ja, { type Dictionary } from "./ja";
import en from "./en";
import ne from "./ne";

export const DICTIONARIES: Record<Locale, Dictionary> = { ja, en, ne };

export type { Dictionary };
