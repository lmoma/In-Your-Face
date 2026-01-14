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
 * Maps a normalized value to a color based on the indicator type.
 */
export function getIndicatorColor(indicator: Indicator, normalizedValue: number, palette: PaletteType = 'Neutral'): string {
    const intensity = Math.floor(normalizedValue * 255);
    let r = 0, g = 0, b = 0;

    // 1. Determine Base Color Family
    if (indicator.id === 'gdp' || indicator.category === 'growth') {
        // Cool: Blue/Teal
        r = Math.floor(50 * (1 - normalizedValue));
        g = Math.floor(100 + 100 * normalizedValue);
        b = Math.floor(200 + 55 * normalizedValue);
        if (palette === 'Vibrant') { r = 0; g = Math.floor(g * 1.2); b = 255; }
    } else if (indicator.id === 'infl' || indicator.id === 'inflation_vol' || indicator.category === 'stability') {
        // Warm: Red/Orange
        r = Math.floor(200 + 55 * normalizedValue);
        g = Math.floor(100 * (1 - normalizedValue));
        b = Math.floor(50 * (1 - normalizedValue));
        if (palette === 'Vibrant') { r = 255; g = Math.floor(g * 0.8); b = 0; }
    } else if (indicator.id === 'gini' || indicator.category === 'social') {
        // Split: Purple/Green
        r = Math.floor(150 + 100 * normalizedValue);
        g = Math.floor(50 * (1 - normalizedValue));
        b = Math.floor(150 + 100 * normalizedValue);
        if (palette === 'Vibrant') { r = 200; g = 0; b = 255; }
    } else {
        // Neutral: Beige/Gray
        const v = Math.floor(180 + 75 * normalizedValue);
        r = v; g = Math.floor(v * 0.95); b = Math.floor(v * 0.9);
    }

    // 2. Apply Palette Modifier
    if (palette === 'Monochrome') {
        const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
        r = gray; g = gray; b = gray;
    } else if (palette === 'Neutral') {
        // Desaturate by blending 30% with gray
        const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
        r = Math.floor(r * 0.7 + gray * 0.3);
        g = Math.floor(g * 0.7 + gray * 0.3);
        b = Math.floor(b * 0.7 + gray * 0.3);
    }

    // Clamp
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getColorFromPalette(paletteName: PaletteType, normalizedValue: number): string {
    // Deprecated in favor of getIndicatorColor, but kept for compatibility
    const palette = PALETTES.find(p => p.name === paletteName) || PALETTES[0];
    const index = Math.floor(normalizedValue * (palette.colors.length - 1));
    return palette.colors[index];
}

/**
 * Mock data for economic indicators.
 */
export const MOCK_INDICATORS: Indicator[] = [
    { id: 'gdp', name: 'GDP Growth Rate', current: 2.5, min: -5, max: 10, unit: '%', category: 'growth' },
    { id: 'sentiment', name: 'Consumer Sentiment', current: 72, min: 50, max: 120, unit: 'pts', category: 'social' },
    { id: 'infl', name: 'Inflation Rate', current: 3.2, min: 0, max: 15, unit: '%', category: 'stability' },
    { id: 'inflation_vol', name: 'Inflation Volatility', current: 4.5, min: 0, max: 10, unit: 'pts', category: 'stability' },
    { id: 'unemp', name: 'Unemployment Rate', current: 4.1, min: 0, max: 20, unit: '%', category: 'social' },
    { id: 'gini', name: 'Gini Index (Inequality)', current: 32, min: 20, max: 60, unit: 'pts', category: 'social' },
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
