import { describe, expect, it } from 'vitest';

import { ConfigurationError } from '../core/errors.js';
import { createUnavailableSupabaseClient } from './supabase.js';

describe('supabase unavailable adapter', () => {
    it('throws a configuration error instead of exposing a null client', () => {
        const unavailableClient = createUnavailableSupabaseClient();

        expect(() => unavailableClient.from('sessions')).toThrow(ConfigurationError);
    });
});
