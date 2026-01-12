/**
 * Hashing & Seeded Logic Utility
 * Generators seeds from photo hashes for deterministic shuffling.
 */

/**
 * Generates a numeric hash from a string (e.g., photo data URL).
 */
export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Seeded Mulberry32 RNG
 */
export function createRNG(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Shuffles a list using a seeded random number generator.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    const rng = createRNG(seed);

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}
