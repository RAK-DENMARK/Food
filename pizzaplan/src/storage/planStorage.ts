/**
 * Lokal lagring.
 *
 * MVP'en er offline-first og har hverken backend, login eller konto.
 * Der gemmes ikke personoplysninger – kun de tal, brugeren selv har tastet.
 *
 * Selve implementeringen er med vilje holdt bag et interface, så en senere
 * version kan skifte til AsyncStorage uden at røre hverken UI eller domæne.
 */

import type { DoughInput } from '../types';

/** Det, vi vil kunne huske til næste gang – uden serveringstidspunktet. */
export interface StoredPreferences {
  pizzaCount: number;
  ballWeightG: number;
  hydration: number;
  salt: number;
  roomTempC: number;
}

export interface PreferencesStore {
  load(): Promise<StoredPreferences | null>;
  save(preferences: StoredPreferences): Promise<void>;
  clear(): Promise<void>;
}

export function preferencesFromInput(input: DoughInput): StoredPreferences {
  return {
    pizzaCount: input.pizzaCount,
    ballWeightG: input.ballWeightG,
    hydration: input.hydration,
    salt: input.salt,
    roomTempC: input.roomTempC,
  };
}

/**
 * Standardimplementering: hukommelse i den kørende app.
 * Nok til MVP'en, hvor en dejplan laves fra start til slut i én omgang.
 */
export function createInMemoryPreferencesStore(): PreferencesStore {
  let value: StoredPreferences | null = null;
  return {
    async load() {
      return value;
    },
    async save(preferences) {
      value = preferences;
    },
    async clear() {
      value = null;
    },
  };
}
