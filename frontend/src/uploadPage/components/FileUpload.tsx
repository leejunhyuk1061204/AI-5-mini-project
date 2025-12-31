import React, { useRef, useCallback } from 'react';

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    isDragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
    onFilesSelected,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            onFilesSelected(newFiles);
            // Reset input value to allow re-selecting the same file
            if (e.target) {
                e.target.value = '';
            }
        }
    }, [onFilesSelected]);

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col mb-8">
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="audio/*,.mp3,.m4a"
                multiple
            />
            <div
                className={`group relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed transition-all duration-300 px-6 py-16 cursor-pointer
          ${isDragging
                        ? 'border-[#135bec] bg-[#135bec]/10'
                        : 'border-[#cfd7e7] bg-white hover:border-[#135bec]/50 hover:bg-[#135bec]/5'
                    }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={openFileDialog}
            >
                <div className="bg-[#f0f4fd] rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#135bec] text-[40px]">cloud_upload</span>
                </div>
                <div className="flex max-w-[480px] flex-col items-center gap-2 z-10">
                    <p className="text-[#0d121b] text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                        이곳에 파일을 드래그 앤 드롭하세요
                    </p>
                    <p className="text-[#4c669a] text-sm font-normal leading-normal text-center">
                        또는 클릭하여 파일을 찾아보세요
                    </p>
                </div>
                <button
                    className="flex min-w-[140px] items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-[#135bec] hover:bg-blue-700 text-white text-sm font-bold leading-normal transition-colors shadow-sm hover:shadow-md z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        openFileDialog();
                    }}
                >
                    <span className="truncate">파일 탐색</span>
                </button>
                <div className="absolute bottom-4 flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[#4c669a] text-[16px]">lock</span>
                    <span className="text-[#4c669a] text-xs">안전하게 암호화되어 처리됩니다</span>
                </div>
            </div>
        </div>
    );
};

export default FileUpload;
