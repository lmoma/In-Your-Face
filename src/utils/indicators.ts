/**
 * Economic Indicator Data Module
 * Functional implementation for fetching, normalizing, and palette mapping.
 */

export interface Indicator {
    id: string;
    name: string;
    current: number;
    min: number;
    max: number;
    unit: string;
    category: 'growth' | 'stability' | 'social';
}

export type PaletteType = 'Neutral' | 'Vibrant' | 'Monochrome';

export interface Palette {
    name: PaletteType;
    colors: string[];
}

export const PALETTES: Palette[] = [
    {
        name: 'Neutral',
        colors: ['#4A5568', '#718096', '#A0AEC0', '#CBD5E0', '#EDF2F7', '#2D3748']
    },
    {
        name: 'Vibrant',
        colors: ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF3']
    },
    {
        name: 'Monochrome',
        colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF']
    }
];

/**
 * Normalizes a value between 0 and 1.
 */
export function normalizeIndicator(indicator: Indicator): number {
    const { current, min, max } = indicator;
    if (max <= min) return 0.5;
    const normalized = (current - min) / (max - min);
    return Math.max(0, Math.min(1, normalized));
}

/**
 * Maps a normalized value to a color within a palette.
 */
export function getColorFromPalette(paletteName: PaletteType, normalizedValue: number): string {
    const palette = PALETTES.find(p => p.name === paletteName) || PALETTES[0];
    const index = Math.floor(normalizedValue * (palette.colors.length - 1));
    return palette.colors[index];
}

/**
 * Mock data for economic indicators.
 */
export const MOCK_INDICATORS: Indicator[] = [
    { id: 'gdp', name: 'GDP Growth Rate', current: 2.5, min: -5, max: 10, unit: '%', category: 'growth' },
    { id: 'infl', name: 'Inflation Rate', current: 3.2, min: 0, max: 15, unit: '%', category: 'stability' },
    { id: 'unemp', name: 'Unemployment Rate', current: 4.1, min: 0, max: 20, unit: '%', category: 'social' },
    { id: 'debt', name: 'Debt-to-GDP', current: 65, min: 0, max: 150, unit: '%', category: 'stability' },
    { id: 'trade', name: 'Trade Balance', current: 1.2, min: -10, max: 10, unit: '$B', category: 'growth' },
    { id: 'gini', name: 'Gini Index', current: 32, min: 20, max: 60, unit: 'pts', category: 'social' },
];

export function getSortedIndicators(
    indicators: Indicator[],
    by: 'magnitude' | 'name' = 'magnitude'
): Indicator[] {
    return [...indicators].sort((a, b) => {
        if (by === 'magnitude') {
            return normalizeIndicator(b) - normalizeIndicator(a);
        }
        return a.name.localeCompare(b.name);
    });
}
