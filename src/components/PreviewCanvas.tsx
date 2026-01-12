import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { extractLineArt } from '../utils/image-processor';
import { Indicator, normalizeIndicator, getColorFromPalette, PaletteType } from '../utils/indicators';
import { getRegionAt, RegionType, FACE_REGIONS, Point } from '../logic/regions';
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
}

const PreviewCanvas: React.FC<PreviewProps> = ({ photo, config, onExportRef }) => {
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
        if (photo) {
            setIsProcessing(true);
            extractLineArt(photo).then(art => {
                setLineArt(art);
                setIsProcessing(false);
            });
        }
    }, [photo]);

    useEffect(() => {
        if (!photo || !canvasRef.current) return;

        const render = () => {
            const ctx = canvasRef.current!.getContext('2d');
            if (!ctx) return;

            const width = ctx.canvas.width;
            const height = ctx.canvas.height;

            // 1. Pre-generate Voronoi Seeds for subdivisions if active
            const regionSeeds: Record<string, Point[]> = {};
            if (config.subdivision && config.indicators) {
                FACE_REGIONS.forEach(region => {
                    const indicator = regionMap[region.id];
                    const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;
                    const count = Math.ceil(magnitude * 10) + 2;
                    regionSeeds[region.id] = generateClippedSeeds(count, region.polygon, { width, height }, seed, magnitude);
                });
            }

            // 2. Per-pixel Rendering (Clipped Logic)
            const imageData = ctx.createImageData(width, height);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const nx = x / width;
                    const ny = y / height;
                    const regionId = getRegionAt(nx, ny, config.indicators?.length || 0);
                    const indicator = regionMap[regionId];
                    const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;

                    let colorHex = getColorFromPalette(config.palette, magnitude);

                    // Sub-cell logic for Voronoi
                    if (config.subdivision && regionSeeds[regionId]) {
                        const nearest = findNearestSeed({ x, y }, regionSeeds[regionId]);
                        if (nearest) {
                            const seedMag = (hashString(JSON.stringify(nearest)) % 100) / 100;
                            colorHex = getColorFromPalette(config.palette, (magnitude + seedMag) / 2);
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

            // 3. Line Art Overlay & Grain Texture
            if (lineArt) {
                const edgeImg = new Image();
                edgeImg.onload = () => {
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(edgeImg, 0, 0, width, height);

                    // Simple procedural grain
                    ctx.globalAlpha = 0.05;
                    for (let i = 0; i < 5000; i++) {
                        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
                    }
                    ctx.globalAlpha = 1.0;
                };
                edgeImg.src = lineArt;
            }
        };

        render();
    }, [photo, lineArt, config, regionMap, seed]);

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
        const regionSeeds: Record<string, Point[]> = {};
        if (config.subdivision && config.indicators) {
            FACE_REGIONS.forEach(region => {
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
                const regionId = getRegionAt(nx, ny, config.indicators?.length || 0);
                const indicator = regionMap[regionId];
                const magnitude = indicator ? normalizeIndicator(indicator) : 0.5;
                let colorHex = getColorFromPalette(config.palette, magnitude);

                if (config.subdivision && regionSeeds[regionId]) {
                    const nearest = findNearestSeed({ x: x, y: y }, regionSeeds[regionId]);
                    if (nearest) {
                        const seedMag = (hashString(JSON.stringify(nearest)) % 100) / 100;
                        colorHex = getColorFromPalette(config.palette, (magnitude + seedMag) / 2);
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

        // 3. Overlay
        if (lineArt) {
            const edgeImg = new Image();
            await new Promise((resolve) => {
                edgeImg.onload = () => {
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(edgeImg, 0, 0, exportDim, exportDim);
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
