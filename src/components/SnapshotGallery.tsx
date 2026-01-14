import React from 'react';
import { Indicator, PaletteType } from '../utils/indicators';

export interface Snapshot {
    id: string;
    timestamp: string;
    image: string;
    config: {
        indicators: Indicator[];
        palette: PaletteType;
        subdivision: boolean;
    };
}

interface SnapshotGalleryProps {
    snapshots: Snapshot[];
    onRestore: (snapshot: Snapshot) => void;
}

const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({ snapshots, onRestore }) => {
    if (snapshots.length === 0) return null;

    return (
        <div className="gallery-container" style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.8 }}>Snapshots (Click to Revert)</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {snapshots.map((snap) => (
                    <div
                        key={snap.id}
                        onClick={() => onRestore(snap)}
                        className="snapshot-item"
                        style={{
                            width: '80px',
                            cursor: 'pointer',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'transform 0.1s'
                        }}
                        title={`Saved: ${snap.timestamp}\nGDP: ${snap.config.indicators.find(i => i.id === 'gdp')?.current.toFixed(1)}%`}
                    >
                        <img
                            src={snap.image}
                            alt={snap.timestamp}
                            style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.6)',
                            fontSize: '0.6rem',
                            padding: '2px',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {snap.timestamp}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SnapshotGallery;
