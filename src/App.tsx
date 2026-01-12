import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Controls from './components/Controls';
import PreviewCanvas from './components/PreviewCanvas';
import Upload from './components/Upload';
import { Indicator, PaletteType } from './utils/indicators';

/**
 * Main Application Component
 */
const App: React.FC = () => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [shuffleKey, setShuffleKey] = useState(0); // For external shuffle trigger
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
    }, []);

    const handleReset = useCallback(() => {
        setPhoto(null);
        setShuffleKey(0);
    }, []);

    return (
        <Layout
            leftPanel={
                <div className="flex flex-col gap-6">
                    <Upload onUpload={setPhoto} />
                    <Controls
                        photoUploaded={!!photo}
                        onUpdate={setConfig}
                        onExport={() => exportRef.current?.()}
                        onShuffle={handleShuffle}
                        onReset={handleReset}
                    />
                </div>
            }
            rightPanel={
                <PreviewCanvas key={shuffleKey} photo={photo} config={config} onExportRef={exportRef} />
            }
        />
    );
};

export default App;
