/**
 * Region System Logic
 * Defines facial region polygons and logic for subdivision.
 */

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
 * Finds the highest priority unlocked region at a normalized point.
 */
export function getRegionAt(x: number, y: number, indicatorCount: number): RegionType {
    const unlocked = getUnlockedRegions(indicatorCount);
    const sorted = [...unlocked].sort((a, b) => b.priority - a.priority);
    for (const region of sorted) {
        if (isPointInPolygon({ x, y }, region.polygon)) {
            return region.id;
        }
    }
    return 'Background';
}
