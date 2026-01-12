import React, { useEffect, useState } from 'react';
import { MOCK_INDICATORS, Indicator, normalizeIndicator, PaletteType, PALETTES } from '../utils/indicators';

interface ControlsProps {
    onUpdate: (data: { indicators: Indicator[], palette: PaletteType, subdivision: boolean }) => void;
    onExport: () => void;
    onShuffle: () => void;
    onReset: () => void;
    photoUploaded: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onUpdate, onExport, onShuffle, onReset, photoUploaded }) => {
    const [indicators, setIndicators] = useState<Indicator[]>(MOCK_INDICATORS);
    const [palette, setPalette] = useState<PaletteType>('Neutral');
    const [subdivision, setSubdivision] = useState<boolean>(true);

    const handleSliderChange = (id: string, value: number) => {
        const updated = indicators.map(ind =>
            ind.id === id ? { ...ind, current: value } : ind
        );
        setIndicators(updated);
    };

    useEffect(() => {
        onUpdate({ indicators, palette, subdivision });
    }, [indicators, palette, subdivision, onUpdate]);

    return (
        <div className="controls-container">
            <div className="flex flex-col gap-6" style={{ textAlign: 'left' }}>
                <section>
                    <h3>2. Global Settings</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Color Palette</label>
                            <select
                                value={palette}
                                onChange={(e) => setPalette(e.target.value as PaletteType)}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: '#444', color: '#fff' }}
                            >
                                {PALETTES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="subdiv"
                                checked={subdivision}
                                onChange={(e) => setSubdivision(e.target.checked)}
                            />
                            <label htmlFor="subdiv" style={{ fontSize: '0.9rem' }}>Enable Voronoi Subdivision</label>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4" style={{ marginTop: '1rem' }}>
                        <button onClick={onShuffle} disabled={!photoUploaded} className="btn-shuffle" style={{ flex: 1 }}>
                            Shuffle
                        </button>
                        <button onClick={onReset} className="btn-shuffle" style={{ flex: 1, background: '#444' }}>
                            Reset
                        </button>
                    </div>
                    <button
                        onClick={onExport}
                        disabled={!photoUploaded}
                        className="btn-shuffle"
                        style={{ width: '100%', marginTop: '0.5rem', background: '#33ff57', color: '#000' }}
                    >
                        Export 2048px PNG
                    </button>
                </section>

                <section>
                    <h3>3. Economic Indicators</h3>
                    {indicators.map((ind) => (
                        <div key={ind.id} style={{ marginBottom: '1rem' }}>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                <label>{ind.name}</label>
                                <span>{ind.current.toFixed(1)}{ind.unit}</span>
                            </div>
                            <input
                                type="range"
                                min={ind.min}
                                max={ind.max}
                                step={(ind.max - ind.min) / 100}
                                value={ind.current}
                                onChange={(e) => handleSliderChange(ind.id, parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                Mapped Influence: {(normalizeIndicator(ind) * 100).toFixed(0)}%
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
};

export default Controls;
