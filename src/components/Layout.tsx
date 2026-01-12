import React, { useState } from 'react';

interface LayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ leftPanel, rightPanel }) => {
    const [showIntro, setShowIntro] = useState(true);

    return (
        <div style={{ position: 'relative' }}>
            {showIntro && (
                <div className="intro-overlay">
                    <div className="intro-content">
                        <h1>In Your Face</h1>
                        <p className="cheeky">The satirical economic portrait generator.</p>
                        <p>
                            In Your Face transforms your portrait into a high-resolution economic caricature.
                            By mapping global indicators to your facial topology, we reveal the cheeky
                            reality of market aesthetics.
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                            Your data is processed entirely in-browser. No photos are uploaded to any server.
                        </p>
                        <button onClick={() => setShowIntro(false)} className="btn-shuffle">
                            Start Generating
                        </button>
                    </div>
                </div>
            )}

            <div className="layout-container">
                <aside className="panel">
                    <h2 style={{ color: '#646cff', marginBottom: '2rem' }}>IYF Processor</h2>
                    {leftPanel}
                </aside>
                <main className="panel">
                    {rightPanel}
                </main>
            </div>
        </div>
    );
};

export default Layout;
