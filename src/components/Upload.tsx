import React, { useCallback } from 'react';
import { downscaleImage } from '../utils/image-processor';

interface UploadProps {
    onUpload: (dataUrl: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onUpload }) => {
    const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result as string;
            const downscaled = await downscaleImage(result);
            onUpload(downscaled);
        };
        reader.readAsDataURL(file);
    }, [onUpload]);

    return (
        <div className="upload-container">
            <h3>1. Upload Photo</h3>
            <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ width: '100%' }}
            />
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Photos are auto-downscaled to 1024px for processing.
            </p>
        </div>
    );
};

export default Upload;
