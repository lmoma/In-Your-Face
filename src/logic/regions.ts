/**
 * Region System Logic
 * Defines facial region polygons and logic for subdivision.
 */

import { Indicator, normalizeIndicator } from '../utils/indicators';

export type RegionType =
    | 'Forehead'
    | 'Nose'
    | 'Eyes'
    | 'Mouth'
    | 'Cheeks'
    | 'Chin'
    | 'Hair'
    | 'Neck'
    | 'Background';

export interface Point {
    x: number;
    y: number;
}

export interface Region {
    id: RegionType;
    priority: number;
    polygon: Point[];
    tier: 'primary' | 'secondary' | 'auxiliary';
}

export const FACE_REGIONS: Region[] = [
    { id: 'Forehead', tier: 'primary', priority: 1, polygon: [{ x: 0.3, y: 0.1 }, { x: 0.7, y: 0.1 }, { x: 0.8, y: 0.25 }, { x: 0.2, y: 0.25 }] },
    { id: 'Eyes', tier: 'primary', priority: 2, polygon: [{ x: 0.2, y: 0.25 }, { x: 0.8, y: 0.25 }, { x: 0.8, y: 0.45 }, { x: 0.2, y: 0.45 }] },
    { id: 'Nose', tier: 'primary', priority: 3, polygon: [{ x: 0.4, y: 0.25 }, { x: 0.6, y: 0.25 }, { x: 0.65, y: 0.6 }, { x: 0.35, y: 0.6 }] },
    { id: 'Mouth', tier: 'primary', priority: 4, polygon: [{ x: 0.3, y: 0.6 }, { x: 0.7, y: 0.6 }, { x: 0.75, y: 0.75 }, { x: 0.25, y: 0.75 }] },
    { id: 'Background', tier: 'primary', priority: 0, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] },

    { id: 'Cheeks', tier: 'secondary', priority: 5, polygon: [{ x: 0.15, y: 0.25 }, { x: 0.35, y: 0.6 }, { x: 0.65, y: 0.6 }, { x: 0.85, y: 0.25 }] },
    { id: 'Chin', tier: 'secondary', priority: 6, polygon: [{ x: 0.3, y: 0.75 }, { x: 0.7, y: 0.75 }, { x: 0.5, y: 0.9 }] },

    { id: 'Hair', tier: 'auxiliary', priority: 7, polygon: [{ x: 0.1, y: 0.0 }, { x: 0.9, y: 0.0 }, { x: 1.0, y: 0.5 }, { x: 0.9, y: 0.3 }, { x: 0.1, y: 0.3 }, { x: 0.0, y: 0.5 }] },
    { id: 'Neck', tier: 'auxiliary', priority: 8, polygon: [{ x: 0.3, y: 0.85 }, { x: 0.7, y: 0.85 }, { x: 0.7, y: 1.0 }, { x: 0.3, y: 1.0 }] },
];

/**
 * Returns regions currently unlocked based on indicator count.
 */
export function getUnlockedRegions(indicatorCount: number): Region[] {
    return FACE_REGIONS.filter(region => {
        if (indicatorCount <= 3) return region.tier === 'primary';
        if (indicatorCount <= 6) return region.tier === 'primary' || region.tier === 'secondary';
        return true; // 7+ unlocks all
    });
}

/**
 * Ray-casting Point-in-Polygon check.
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Adjusts regions based on indicator magnitudes.
 * GDP (Forehead): Vertical stretch.
 * Sentiment (Mouth): Scale.
 * Inflation (Jaw/Chin): Tilt/Shift.
 */
export function getDynamicRegions(indicators: Indicator[], regionMap: Record<RegionType, Indicator>): Region[] {
    return FACE_REGIONS.map(region => {
        const indicator = regionMap[region.id];
        if (!indicator) return region;

        const magnitude = normalizeIndicator(indicator);
        const shiftedPolygon = [...region.polygon].map(p => ({ ...p }));

        // Apply distortions
        // Apply distortions
        if (region.id === 'Forehead') {
            // GDP Growth -> Vertical stretch + slight upward shift
            const shiftY = (magnitude - 0.5) * 0.15;
            const scaleY = 1.0 + (magnitude - 0.5) * 0.6;
            const topY = shiftedPolygon.reduce((min, p) => Math.min(min, p.y), 1);
            console.log(`Warping forehead: scaleY=${scaleY.toFixed(2)}, gdpMapped=${(magnitude * 100).toFixed(0)}%`);

            shiftedPolygon.forEach(p => {
                p.y = topY + (p.y - topY) * scaleY - shiftY;
            });
        }
        else if (region.id === 'Mouth') {
            // Consumer Sentiment -> Non-uniform scaling (Shrink width if low)
            const sentiment = magnitude; // 0 to 1
            const scaleX = 0.6 + sentiment * 0.8; // Wide range: 0.6 to 1.4
            const scaleY = 0.8 + sentiment * 0.4; // 0.8 to 1.2
            const centerX = shiftedPolygon.reduce((acc, p) => acc + p.x, 0) / shiftedPolygon.length;
            const centerY = shiftedPolygon.reduce((acc, p) => acc + p.y, 0) / shiftedPolygon.length;

            console.log(`Warping mouth: scaleX=${scaleX.toFixed(2)}, scaleY=${scaleY.toFixed(2)}, sentimentMapped=${(magnitude * 100).toFixed(0)}%`);

            shiftedPolygon.forEach(p => {
                p.x = centerX + (p.x - centerX) * scaleX;
                p.y = centerY + (p.y - centerY) * scaleY;
            });
        }
        else if (region.id === 'Chin') {
            // Inflation Volatility -> Skew with asymmetry threshold
            const skewX = (magnitude - 0.5) * 0.2;

            if (magnitude > 0.5) {
                console.log(`Asymmetric warp triggered: inflationMapped=${(magnitude * 100).toFixed(0)}%`);
                console.log(`Skewing jaw: skewX=${skewX.toFixed(2)}, inflationMapped=${(magnitude * 100).toFixed(0)}%`);

                shiftedPolygon.forEach(p => {
                    // Non-linear skew (more severe on one side)
                    const sideFactor = p.x > 0.5 ? 1.5 : 0.5;
                    p.x += (p.y - 0.75) * skewX * sideFactor;
                });
            } else {
                console.log(`Skewing jaw: skewX=${skewX.toFixed(2)}, inflationMapped=${(magnitude * 100).toFixed(0)}%`);
                shiftedPolygon.forEach(p => {
                    p.x += (p.y - 0.75) * skewX;
                });
            }
        }
        else if (region.id === 'Eyes' || region.id === 'Cheeks') {
            // Inequality (Gini) -> Rotation/Tilt with asymmetric scaling
            const angleDeg = (magnitude - 0.5) * 30;
            const angleRad = (angleDeg * Math.PI) / 180;
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            const centerX = shiftedPolygon.reduce((acc, p) => acc + p.x, 0) / shiftedPolygon.length;
            const centerY = shiftedPolygon.reduce((acc, p) => acc + p.y, 0) / shiftedPolygon.length;

            if (magnitude > 0.6) {
                console.log(`Asymmetric warp triggered: giniMapped=${(magnitude * 100).toFixed(0)}%`);
                // Example: "Left eye scaledX=1.2, right eye scaledX=0.9"
                // Since we process broad regions, we use X coordinate to differentiate
                shiftedPolygon.forEach(p => {
                    const isLeft = p.x < 0.5;
                    const scaleFactor = isLeft ? 1.2 : 0.9;

                    // Rotate then Scale Asymmetrically
                    // 1. Rotate
                    const dx = p.x - centerX;
                    const dy = p.y - centerY;
                    const rx = centerX + (dx * cos - dy * sin);
                    const ry = centerY + (dx * sin + dy * cos);

                    // 2. Scale relative to center
                    p.x = centerX + (rx - centerX) * scaleFactor;
                    p.y = ry;
                });
                console.log(`Tilting ${region.id.toLowerCase()} (Asymmetric): rotate=${angleDeg.toFixed(1)}°, leftScale=1.2, rightScale=0.9`);
            } else {
                console.log(`Tilting ${region.id.toLowerCase()}: rotate=${angleDeg.toFixed(1)}°, giniMapped=${(magnitude * 100).toFixed(0)}%`);
                shiftedPolygon.forEach(p => {
                    const dx = p.x - centerX;
                    const dy = p.y - centerY;
                    p.x = centerX + (dx * cos - dy * sin);
                    p.y = centerY + (dx * sin + dy * cos);
                });
            }
        }

        return { ...region, polygon: shiftedPolygon };
    });
}

/**
 * Finds the highest priority unlocked region at a normalized point.
 */
export function getRegionAt(x: number, y: number, indicatorCount: number, dynamicRegions?: Region[]): RegionType {
    const regions = dynamicRegions || getUnlockedRegions(indicatorCount);
    const sorted = [...regions].sort((a, b) => b.priority - a.priority);
    for (const region of sorted) {
        if (isPointInPolygon({ x, y }, region.polygon)) {
            return region.id;
        }
    }
    return 'Background';
}
