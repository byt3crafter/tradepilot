import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon } from '../icons/UploadIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ImageUploaderProps {
  label: string;
  onImageUpload: (base64: string | null) => void;
  currentImage?: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onImageUpload, currentImage }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImagePreview(currentImage || null);
  }, [currentImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        onImageUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImagePreview(null);
    onImageUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-future-gray mb-2">{label}</label>
      <div 
        onClick={handleSelectImage}
        className="w-full h-40 bg-future-dark border-2 border-dashed border-photonic-blue/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-photonic-blue transition-colors relative"
      >
        <input
          type="file"
          accept="image/png, image/jpeg, image/gif"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg p-1" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1.5 bg-risk-high/80 text-white rounded-full hover:bg-risk-high transition-transform transform hover:scale-110"
              aria-label="Remove image"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-future-gray">
            <UploadIcon className="w-8 h-8 mx-auto" />
            <p className="mt-1 text-xs">Click to upload</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;