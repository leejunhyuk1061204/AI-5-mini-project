import React from 'react';

interface FileListProps {
    files: File[];
    onRemoveFile: (index: number) => void;
    formatFileSize: (bytes: number) => string;
    selectedFileIndex: number | null;
    onSelectFile: (index: number) => void;
}

const FileList: React.FC<FileListProps> = ({
    files,
    onRemoveFile,
    formatFileSize,
    selectedFileIndex,
    onSelectFile
}) => {
    if (files.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 mb-8">
            <h3 className="text-[#0d121b] dark:text-white text-lg font-bold px-1">선택된 파일 ({files.length})</h3>
            {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-4 bg-white dark:bg-[#1a2235] border border-[#e7ebf3] dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-[#135bec] focus:ring-[#135bec] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        checked={selectedFileIndex === index}
                        onChange={() => onSelectFile(index)}
                        disabled={selectedFileIndex !== null && selectedFileIndex !== index}
                    />
                    <div className="bg-[#e7ebf3] dark:bg-gray-800 flex items-center justify-center rounded-lg shrink-0 size-12 text-[#135bec]">
                        <span className="material-symbols-outlined">audio_file</span>
                    </div>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                        <p className="text-[#0d121b] dark:text-white text-base font-medium leading-normal truncate mb-1">{file.name}</p>
                        <p className="text-[#4c669a] dark:text-gray-400 text-sm font-normal leading-normal truncate">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">준비됨</span>
                        <button
                            className="text-[#4c669a] hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => onRemoveFile(index)}
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FileList;
