import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Controls from './components/Controls';
import PreviewCanvas from './components/PreviewCanvas';
import Upload from './components/Upload';
import { Indicator, PaletteType } from './utils/indicators';

import SnapshotGallery, { Snapshot } from './components/SnapshotGallery';

/**
 * Main Application Component
 */
const App: React.FC = () => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [shuffleKey, setShuffleKey] = useState(0);
    const [renderedImage, setRenderedImage] = useState<string | null>(null); // For reverts
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

    const [config, setConfig] = useState<{
        indicators: Indicator[] | null;
        palette: PaletteType;
        subdivision: boolean;
    }>({
        indicators: null,
        palette: 'Neutral',
        subdivision: true
    });

    const exportRef = useRef<(() => void) | null>(null);

    const handleShuffle = useCallback(() => {
        setShuffleKey(prev => prev + 1);
        setRenderedImage(null); // Clear manual override on new shuffle
    }, []);

    const handleReset = useCallback(() => {
        setPhoto(null);
        setShuffleKey(0);
        setRenderedImage(null);
        setSnapshots([]);
    }, []);

    const handleCapture = useCallback((image: string, currentConfig: typeof config) => {
        const now = new Date();
        const timestamp = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newSnap: Snapshot = {
            id: Date.now().toString(),
            timestamp,
            image,
            config: JSON.parse(JSON.stringify(currentConfig)) // Deep copy
        };

        setSnapshots(prev => {
            const updated = [...prev, newSnap];
            if (updated.length > 5) updated.shift(); // Keep max 5
            return updated;
        });
    }, []);

    const handleRestore = useCallback((snap: Snapshot) => {
        // 1. Restore Config
        setConfig(snap.config);

        // 2. Restore Image (Prevent re-render)
        setRenderedImage(snap.image);

        // 3. Log
        const gdp = snap.config.indicators?.find(i => i.id === 'gdp')?.current.toFixed(1) || '?';
        const sent = snap.config.indicators?.find(i => i.id === 'sentiment')?.current.toFixed(1) || '?';
        console.log(`Reverted to snapshot from ${snap.timestamp}, GDP=${gdp}%, Sentiment=${sent}`);
    }, []);

    return (
        <Layout
            leftPanel={
                <div className="flex flex-col gap-6">
                    <Upload onUpload={setPhoto} />
                    <Controls
                        photoUploaded={!!photo}
                        onUpdate={(newConfig) => {
                            setConfig(newConfig);
                            setRenderedImage(null); // Clear override when user makes new changes
                        }}
                        onExport={() => exportRef.current?.()}
                        onShuffle={handleShuffle}
                        onReset={handleReset}
                        // We need to pass the current config to Controls if we want sliders to update visually on revert!
                        // But Controls maintains its own state. We need to lift state up fully or use a key to reset Controls.
                        // For now, let's force re-mount of Controls on revert by using a key logic or passing external state.
                        // Actually, Controls has internal state 'indicators'. If we change 'config' here, Controls doesn't know.
                        // Let's pass 'config' to Controls to sync it.
                        externalConfig={config}
                    />
                </div>
            }
            rightPanel={
                <>
                    <PreviewCanvas
                        key={shuffleKey}
                        photo={photo}
                        config={config}
                        onExportRef={exportRef}
                        onCapture={handleCapture}
                        overrideImage={renderedImage}
                    />
                    <SnapshotGallery snapshots={snapshots} onRestore={handleRestore} />
                </>
            }
        />
    );
};

export default App;
