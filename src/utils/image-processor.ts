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
 * Workflow: Grayscale -> Gaussian Blur (5x5) -> Canny Edge Detection
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
            const dst = new cv.Mat();
            const edges = new cv.Mat();

            // 1. Grayscale
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

            // 2. Gaussian Blur (5x5, sigma=0)
            const ksize = new cv.Size(5, 5);
            cv.GaussianBlur(dst, dst, ksize, 0, 0, cv.BORDER_DEFAULT);

            // 3. Canny Edges
            // Thresholds 50 and 150 are standard for portrait line art
            cv.Canny(dst, edges, 50, 150, 3, false);

            // Convert back to temporary canvas
            const canvas = document.createElement('canvas');
            cv.imshow(canvas, edges);
            const dataUrl = canvas.toDataURL('image/png');

            // Cleanup Mats
            src.delete();
            dst.delete();
            edges.delete();

            resolve(dataUrl);
        };
        img.onerror = () => reject('Failed to load image for Canny');
        img.src = imageDataUrl;
    });
}

/**
 * Reasoning: Canny edges are binary (black/white). Using PNG for sharp edges.
 * Expansion Point: Adaptive thresholding based on image brightness or contrast.
 */
