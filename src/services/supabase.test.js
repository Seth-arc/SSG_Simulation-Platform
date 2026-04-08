import { afterEach, describe, expect, it } from 'vitest';

import { ConfigurationError } from '../core/errors.js';
import { createUnavailableSupabaseClient, getSupabaseAuthStorageBackend } from './supabase.js';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }
}

describe('supabase unavailable adapter', () => {
    afterEach(() => {
        delete global.window;
        delete global.localStorage;
        delete global.sessionStorage;
    });

    it('throws a configuration error instead of exposing a null client', () => {
        const unavailableClient = createUnavailableSupabaseClient();

        expect(() => unavailableClient.from('sessions')).toThrow(ConfigurationError);
    });

    it('prefers sessionStorage for browser auth persistence when available', () => {
        global.localStorage = new MemoryStorage();
        global.sessionStorage = new MemoryStorage();
        global.window = {
            localStorage: global.localStorage,
            sessionStorage: global.sessionStorage
        };

        expect(getSupabaseAuthStorageBackend()).toBe('sessionStorage');
    });
});
