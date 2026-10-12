import type { CounterSettings, MessageLanguage } from "@/types/cash-counter";

/**
 * Only shop configuration is persisted (on this device). Cash quantities,
 * customer numbers and summaries are never written to storage.
 */
export const SETTINGS_STORAGE_KEY = "smart-cash-counter:settings:v1";

export const DEFAULT_SETTINGS: CounterSettings = {
  shopName: "",
  defaultNumber: "",
  language: "en",
  includeDate: true,
  showLegacy2000: false,
};

export function sanitizeSettings(value: unknown): CounterSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const v = value as Record<string, unknown>;
  const language: MessageLanguage = v.language === "hi" ? "hi" : "en";
  return {
    shopName: typeof v.shopName === "string" ? v.shopName.slice(0, 60) : "",
    defaultNumber: typeof v.defaultNumber === "string" ? v.defaultNumber.slice(0, 20) : "",
    language,
    includeDate: typeof v.includeDate === "boolean" ? v.includeDate : DEFAULT_SETTINGS.includeDate,
    showLegacy2000: v.showLegacy2000 === true,
  };
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSettings: CounterSettings = DEFAULT_SETTINGS;
/** Used when localStorage is blocked (e.g. private mode): settings last for this tab only. */
let memoryFallback: CounterSettings | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSettingsSnapshot(): CounterSettings {
  if (memoryFallback) return memoryFallback;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSettings = raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
    } catch {
      cachedSettings = DEFAULT_SETTINGS;
    }
  }
  return cachedSettings;
}

export function getServerSettingsSnapshot(): CounterSettings {
  return DEFAULT_SETTINGS;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns false when storage is unavailable; the settings then apply to this tab only. */
export function saveSettings(next: CounterSettings): boolean {
  const clean = sanitizeSettings(next);
  let persisted = true;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    memoryFallback = null;
  } catch {
    persisted = false;
    memoryFallback = clean;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}
