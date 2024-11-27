import React from 'react';

interface FileAttachmentProps {
  file: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
  onRemove?: () => void;
  className?: string;
}

export default function FileAttachment({ file, onRemove, className = '' }: FileAttachmentProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (type.includes('pdf')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`group relative flex items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700 ${className}`}>
      <div className="text-gray-400">
        {getFileIcon(file.type)}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">
          {file.name}
        </div>
        <div className="text-xs text-gray-400">
          {formatFileSize(file.size)}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-2 p-1 rounded-md opacity-0 group-hover:opacity-100 
                     hover:bg-red-500/10 transition-all
                     text-gray-400 hover:text-red-400"
          title="Remove file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
} 