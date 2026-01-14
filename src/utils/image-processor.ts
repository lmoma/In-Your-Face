/**
 * Image Processor Utility
 * Functional implementation of downscaling and OpenCV-based edge extraction.
 */

// Declaring cv globally to satisfy TypeScript, assuming it's loaded via script tag in index.html
declare const cv: any;

/**
 * Downscales an image to exactly 1024px fit while maintaining aspect ratio.
 * Deterministic output using fixed quality JPEG.
 */
export async function downscaleImage(imageDataUrl: string, maxDim: number = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }
            }

            canvas.width = Math.floor(width);
            canvas.height = Math.floor(height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Failed to get 2D context');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Deterministic JPEG output
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject('Failed to load image');
        img.src = imageDataUrl;
    });
}

/**
 * Line Art Extraction Pipeline using OpenCV.js
 * Workflow: Grayscale -> Gaussian Blur -> Adaptive Thresholding (High Contrast)
 */
export async function extractLineArt(imageDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof cv === 'undefined') {
            console.warn("OpenCV.js not loaded. Returning raw image.");
            return resolve(imageDataUrl);
        }

        const img = new Image();
        img.onload = () => {
            const src = cv.imread(img);
            const gray = new cv.Mat();
            const blurred = new cv.Mat();
            const edges = new cv.Mat();

            // 1. Grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

            // 2. Gaussian Blur (5x5, sigma=1.5 for smoother thresholding)
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 1.5, 1.5, cv.BORDER_DEFAULT);

            // 3. Adaptive Thresholding (Aggressive for high-contrast linework)
            cv.adaptiveThreshold(
                blurred,
                edges,
                255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv.THRESH_BINARY,
                15, // Slightly larger block size for bolder lines
                4   // Higher constant to suppress subtle textures
            );

            // 4. Cleanup: Morphological closing to thicken lines slightly
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
            cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

            // Convert back to temporary canvas
            const canvas = document.createElement('canvas');
            cv.imshow(canvas, edges);
            const dataUrl = canvas.toDataURL('image/png');

            // Cleanup Mats
            src.delete();
            gray.delete();
            blurred.delete();
            edges.delete();
            kernel.delete();

            resolve(dataUrl);
        };
        img.onerror = () => reject('Failed to load image for LineArt');
        img.src = imageDataUrl;
    });
}

/**
 * Warp Image using Mesh Deformation
 * Applies localized shifts to the image based on region-mask shifts.
 */
export async function warpCaricature(
    imageDataUrl: string,
    sourceRegions: Region[],
    targetRegions: Region[]
): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof cv === 'undefined') return resolve(imageDataUrl);

        const img = new Image();
        img.onload = () => {
            console.log("CARICATURE PIPELINE ACTIVE");
            const canvas = document.createElement('canvas');
            const width = img.width;
            const height = img.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(imageDataUrl);

            // Start with a clean white slate (No photo base!)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // For each region, we apply a localized affine transform
            // and determine the scale and translation required to map them.
            sourceRegions.forEach((sRegion, i) => {
                const tRegion = targetRegions[i];
                if (sRegion.id === 'Background') return;

                // 2. Calculate Affine Transform Matrix
                // We use the first 3 points of the polygon to define the transform
                // (Assuming strict correspondence between source and target points)
                const p0s = sRegion.polygon[0];
                const p1s = sRegion.polygon[1];
                const p2s = sRegion.polygon[2];

                const p0t = tRegion.polygon[0];
                const p1t = tRegion.polygon[1];
                const p2t = tRegion.polygon[2];

                // Convert to pixel coordinates
                const x0s = p0s.x * width, y0s = p0s.y * height;
                const x1s = p1s.x * width, y1s = p1s.y * height;
                const x2s = p2s.x * width, y2s = p2s.y * height;

                const x0t = p0t.x * width, y0t = p0t.y * height;
                const x1t = p1t.x * width, y1t = p1t.y * height;
                const x2t = p2t.x * width, y2t = p2t.y * height;

                // Solve for Affine Matrix (a, b, c, d, e, f)
                // x' = ax + cy + e
                // y' = bx + dy + f
                //
                // Standard approach: Solve two systems of 3 linear equations
                const denom = (x0s * (y1s - y2s) - x1s * (y0s - y2s) + x2s * (y0s - y1s));
                if (Math.abs(denom) < 0.0001) return; // Collinear points or degenerate

                const a = ((x0t * (y1s - y2s) - x1t * (y0s - y2s) + x2t * (y0s - y1s)) / denom);
                const c = ((x0s * (x1t - x2t) - x1s * (x0t - x2t) + x2s * (x0t - x1t)) / denom); // Notice swapped x/y terms for Cramer's rule derivation logic
                // Actually, let's use a simpler known derivation
                // A = [x0s y0s 1; x1s y1s 1; x2s y2s 1]
                // B_x = [x0t; x1t; x2t]
                // B_y = [y0t; y1t; y2t]
                // Coeffs_x = inv(A) * B_x -> [a, c, e]
                // Coeffs_y = inv(A) * B_y -> [b, d, f]

                // Inverse of 3x3 matrix [x0 y0 1; x1 y1 1; x2 y2 1]
                // DET = x0(y1 - y2) - y0(x1 - x2) + 1(x1y2 - x2y1)

                const det = x0s * (y1s - y2s) - y0s * (x1s - x2s) + (x1s * y2s - x2s * y1s);
                if (Math.abs(det) < 0.001) return;

                const idet = 1 / det;

                // M_inv[0][0] = (y1 - y2) * idet
                // M_inv[0][1] = (y2 - y0) * idet
                // M_inv[0][2] = (y0 - y1) * idet
                // M_inv[1][0] = (x2 - x1) * idet
                // M_inv[1][1] = (x0 - x2) * idet
                // M_inv[1][2] = (x1 - x0) * idet
                // M_inv[2][0] = (x1y2 - x2y1) * idet
                // M_inv[2][1] = (x2y0 - x0y2) * idet
                // M_inv[2][2] = (x0y1 - x1y0) * idet

                const m00 = (y1s - y2s) * idet;
                const m01 = (y2s - y0s) * idet;
                const m02 = (y0s - y1s) * idet;

                const m10 = (x2s - x1s) * idet;
                const m11 = (x0s - x2s) * idet;
                const m12 = (x1s - x0s) * idet;

                const m20 = (x1s * y2s - x2s * y1s) * idet;
                const m21 = (x2s * y0s - x0s * y2s) * idet;
                const m22 = (x0s * y1s - x1s * y0s) * idet;

                // Compute coefficients
                const a_ = m00 * x0t + m01 * x1t + m02 * x2t;
                const c_ = m10 * x0t + m11 * x1t + m12 * x2t;
                const e_ = m20 * x0t + m21 * x1t + m22 * x2t;

                const b_ = m00 * y0t + m01 * y1t + m02 * y2t;
                const d_ = m10 * y0t + m11 * y1t + m12 * y2t;
                const f_ = m20 * y0t + m21 * y1t + m22 * y2t;

                ctx.save();

                // 3. Define Clipping Path based on TARGET region
                ctx.beginPath();
                tRegion.polygon.forEach((p, j) => {
                    const px = p.x * width;
                    const py = p.y * height;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.clip();

                // 4. Apply Affine Transform
                ctx.setTransform(a_, b_, c_, d_, e_, f_);

                // 5. Draw the Original Image (Source)
                ctx.drawImage(img, 0, 0);

                ctx.restore();
            });

            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
        };
        img.onerror = () => reject('Warp failed');
        img.src = imageDataUrl;
    });
}

/**
 * Point Interface for Warp
 */
interface Point {
    x: number;
    y: number;
}

import { Region } from '../logic/regions';
