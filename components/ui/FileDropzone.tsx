import React, { useState, useRef } from 'react';
import { UploadIcon } from '../icons/UploadIcon';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  accept: string;
  label: string;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileAccepted, accept, label }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileAccepted(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileAccepted(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`w-full h-40 bg-future-dark border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-photonic-blue transition-colors relative ${
        isDragActive ? 'border-photonic-blue bg-photonic-blue/10' : 'border-photonic-blue/30'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <UploadIcon className="w-8 h-8 text-future-gray" />
      <p className="mt-2 text-sm text-future-gray">
        {isDragActive ? 'Drop the file here...' : label}
      </p>
    </div>
  );
};

export default FileDropzone;
