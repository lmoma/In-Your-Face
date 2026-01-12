/**
 * Voronoi Generation Logic
 * Implements geometric clipping and indicator-driven distortion.
 */

import { Point, isPointInPolygon } from './regions';
import { createRNG } from '../utils/hashing';

export interface VoronoiCell {
    site: Point;
    indicatorId?: string;
    weight: number; // Magnitude-driven weight
}

/**
 * Generates Voronoi seeds clipped to a specific region polygon.
 * Density and jitter are influenced by indicator magnitude.
 */
export function generateClippedSeeds(
    count: number,
    polygon: Point[],
    bounds: { width: number; height: number },
    seed: number,
    magnitude: number
): Point[] {
    const rng = createRNG(seed);
    const points: Point[] = [];

    // We double the attempts to ensure we fill the clipped region
    const maxAttempts = count * 5;
    let attempts = 0;

    while (points.length < count && attempts < maxAttempts) {
        const x = rng();
        const y = rng();

        // Check if within the normalized polygon
        if (isPointInPolygon({ x, y }, polygon)) {
            // Apply distortion/jitter based on magnitude
            const jitterX = (rng() - 0.5) * magnitude * 0.1;
            const jitterY = (rng() - 0.5) * magnitude * 0.1;

            points.push({
                x: (x + jitterX) * bounds.width,
                y: (y + jitterY) * bounds.height
            });
        }
        attempts++;
    }

    return points;
}

/**
 * Functional Nearest-Neighbor Voronoi check.
 * Reasoning: Returning distance metrics allows the canvas to render paths or gradients.
 */
export function findNearestSeed(p: Point, seeds: Point[]): Point | null {
    if (seeds.length === 0) return null;
    let minDist = Infinity;
    let nearest = seeds[0];

    for (const s of seeds) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
            minDist = dist;
            nearest = s;
        }
    }
    return nearest;
}

/**
 * Reasoning: By clipping seeds to polygons during generation, we avoid 
 * performing expensive polygon checks during per-pixel rendering.
 */
