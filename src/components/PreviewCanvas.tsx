import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { extractLineArt, warpCaricature } from '../utils/image-processor';
import { Indicator, normalizeIndicator, getIndicatorColor, PaletteType } from '../utils/indicators';
import { getRegionAt, RegionType, FACE_REGIONS, Point, getDynamicRegions } from '../logic/regions';
import { hashString, seededShuffle } from '../utils/hashing';
import { generateClippedSeeds, findNearestSeed } from '../logic/voronoi';

interface PreviewProps {
    photo: string | null;
    config: {
        indicators: Indicator[] | null,
        palette: PaletteType,
        subdivision: boolean
    };
    onExportRef?: React.MutableRefObject<(() => void) | null>;
    onCapture?: (image: string, config: any) => void;
    overrideImage?: string | null;
}

const PreviewCanvas: React.FC<PreviewProps> = ({ photo, config, onExportRef, onCapture, overrideImage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lineArt, setLineArt] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const seed = useMemo(() => photo ? hashString(photo) : 0, [photo]);

    // Deterministic mapping of indicators to regions
    const regionMap = useMemo(() => {
        if (!photo || !config.indicators) return {} as any;
        const shuffled = seededShuffle(config.indicators, seed);
        const map: any = {};
        FACE_REGIONS.forEach((region, i) => {
            map[region.id] = shuffled[i % shuffled.length];
        });
        return map;
    }, [photo, config.indicators, seed]);

    useEffect(() => {
        if (photo && config.indicators && !overrideImage) {
            applyTransformations();
        }
    }, [photo, config]);

    // Handle Override Image (Revert)
    useEffect(() => {
        if (overrideImage && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
            img.src = overrideImage;
        }
    }, [overrideImage]);

    const applyTransformations = async () => {
        if (!photo || !config.indicators || overrideImage) return;

        console.log("Apply pressed: starting full pipeline");
        setIsProcessing(true);

        // Allow UI to update before heavy lifting
        await new Promise(r => setTimeout(r, 50));

        try {
            // A. Read slider values & Map Influence (Handled by props config)

            // B. Warp Sketch
            const art = await extractLineArt(photo);
            const dynamicRegions = getDynamicRegions(config.indicators, regionMap);
            const warped = await warpCaricature(art, FACE_REGIONS, dynamicRegions);
            setLineArt(warped);
            console.log("Warping complete");

            // C, D, E, F: Voronoi, Clip, Composite
            const render = () => {
                const ctx = canvasRef.current!.getContext('2d');
                if (!ctx) return;

                const width = ctx.canvas.width;
                const height = ctx.canvas.height;

                // D. Recompute Voronoi Seeds
                const regionSeeds: Record<string, Point[]> = {};
                if (config.subdivision) {
                    dynamicRegions.forEach(region => {
                        const indicator = regionMap[region.id];
                        const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;
                        const count = Math.ceil(magnitude * 10) + 2;
                        regionSeeds[region.id] = generateClippedSeeds(count, region.polygon, { width, height }, seed, magnitude);
                    });
                    console.log("Voronoi recomputed");
                }

                // E. Per-pixel Rendering (Clipped Logic)
                const imageData = ctx.createImageData(width, height);
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const nx = x / width;
                        const ny = y / height;
                        const regionId = getRegionAt(nx, ny, config.indicators?.length || 0, dynamicRegions);
                        const indicator = regionMap[regionId];

                        // Prevent bleed into non-indicator zones
                        if (!indicator || regionId === 'Background') continue;
                        const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;

                        let colorHex = getIndicatorColor(indicator, magnitude, config.palette);

                        // Sub-cell logic for Voronoi
                        if (config.subdivision && regionSeeds[regionId]) {
                            const nearest = findNearestSeed({ x, y }, regionSeeds[regionId]);
                            if (nearest) {
                                const seedMag = (hashString(JSON.stringify(nearest)) % 100) / 100;
                                // Average magnitude for cell variation
                                colorHex = getIndicatorColor(indicator, (magnitude + seedMag) / 2, config.palette);
                            }
                        }

                        const r = parseInt(colorHex.slice(1, 3), 16);
                        const g = parseInt(colorHex.slice(3, 5), 16);
                        const b = parseInt(colorHex.slice(5, 7), 16);

                        const idx = (y * width + x) * 4;
                        imageData.data[idx] = r;
                        imageData.data[idx + 1] = g;
                        imageData.data[idx + 2] = b;
                        imageData.data[idx + 3] = 255;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                console.log("Color clipping applied");

                // F. Composite Line Art
                const edgeImg = new Image();
                edgeImg.onload = () => {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.globalAlpha = 1.0;
                    ctx.drawImage(edgeImg, 0, 0, width, height);
                    ctx.globalCompositeOperation = 'source-over';

                    // Grain
                    ctx.globalAlpha = 0.05;
                    for (let i = 0; i < 5000; i++) {
                        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
                    }
                    ctx.globalAlpha = 1.0;

                    console.log("Final composite ready");
                    setIsProcessing(false);

                    if (onCapture) {
                        onCapture(canvasRef.current!.toDataURL('image/png'), config);
                    }
                };
                edgeImg.src = warped;
            };

            // Execute render immediately after warping
            render();

        } catch (e) {
            console.error("Pipeline failed", e);
            setIsProcessing(false);
        }
    };

    // High-Resolution Export Logic
    const exportPNG = useCallback(async () => {
        if (!photo || isExporting) return;
        setIsExporting(true);

        const exportDim = 2048;
        const offscreen = document.createElement('canvas');
        offscreen.width = exportDim;
        offscreen.height = exportDim;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        // 1. Seeds (Higher density for 2048px)
        const dynamicRegions = getDynamicRegions(config.indicators || [], regionMap);
        const regionSeeds: Record<string, Point[]> = {};
        if (config.subdivision && config.indicators) {
            dynamicRegions.forEach(region => {
                const indicator = regionMap[region.id];
                const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;
                const count = Math.ceil(magnitude * 20) + 5;
                regionSeeds[region.id] = generateClippedSeeds(count, region.polygon, { width: exportDim, height: exportDim }, seed, magnitude);
            });
        }

        // 2. Pixels
        const imageData = ctx.createImageData(exportDim, exportDim);
        for (let y = 0; y < exportDim; y++) {
            for (let x = 0; x < exportDim; x++) {
                const nx = x / exportDim;
                const ny = y / exportDim;
                const regionId = getRegionAt(nx, ny, config.indicators?.length || 0, dynamicRegions);
                const indicator = regionMap[regionId];
                const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;
                let colorHex = getIndicatorColor(indicator, magnitude, config.palette);

                if (config.subdivision && regionSeeds[regionId]) {
                    const nearest = findNearestSeed({ x: x, y: y }, regionSeeds[regionId]);
                    if (nearest) {
                        const seedMag = (hashString(JSON.stringify(nearest)) % 100) / 100;
                        colorHex = getIndicatorColor(indicator, (magnitude + seedMag) / 2, config.palette);
                    }
                }

                const r = parseInt(colorHex.slice(1, 3), 16);
                const g = parseInt(colorHex.slice(3, 5), 16);
                const b = parseInt(colorHex.slice(5, 7), 16);
                const idx = (y * exportDim + x) * 4;
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b;
                imageData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // 3. Overlay (Uses the already warped lineArt)
        if (lineArt) {
            const edgeImg = new Image();
            await new Promise((resolve) => {
                edgeImg.onload = () => {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.globalAlpha = 1.0;
                    ctx.drawImage(edgeImg, 0, 0, exportDim, exportDim);
                    ctx.globalCompositeOperation = 'source-over';

                    // Grain on export
                    ctx.globalAlpha = 0.03;
                    for (let i = 0; i < 20000; i++) {
                        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                        ctx.fillRect(Math.random() * exportDim, Math.random() * exportDim, 1, 1);
                    }
                    resolve(null);
                };
                edgeImg.src = lineArt;
            });
        }

        // Download
        offscreen.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `iyf-portrait-${Date.now()}.png`;
            link.href = url;
            link.click();
            setTimeout(() => { URL.revokeObjectURL(url); setIsExporting(false); }, 100);
        }, 'image/png');
    }, [photo, config, regionMap, seed, lineArt, isExporting]);

    useEffect(() => {
        if (onExportRef) onExportRef.current = exportPNG;
    }, [onExportRef, exportPNG]);

    return (
        <div className="preview-container">
            {isExporting && (
                <div className="export-overlay">
                    <div className="export-status">Building 2048px Caricature...</div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3>4. Portrait Result</h3>
                {isProcessing && <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Analyzing Face...</span>}
            </div>
            {!photo ? (
                <div className="placeholder-box">Portrait awaits extraction.</div>
            ) : (
                <div className="canvas-wrapper" style={{ position: 'relative' }}>
                    <canvas ref={canvasRef} width={512} height={512} className="main-canvas" />
                </div>
            )}
        </div>
    );
};

export default PreviewCanvas;
