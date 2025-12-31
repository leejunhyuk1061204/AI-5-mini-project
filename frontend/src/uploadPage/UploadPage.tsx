import React, { useState, useCallback, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import SttConversion from './components/SttConversion';
import Sidebar from '../sidebar/Sidebar';
import type { HistoryItem, SttResultData } from '../types';

const UploadPage: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showStt, setShowStt] = useState(false);
    const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            const saved = localStorage.getItem('stt_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load history', e);
            return [];
        }
    });

    // Save history to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('stt_history', JSON.stringify(history));
    }, [history]);

    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).filter(file =>
                file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.m4a')
            );

            if (newFiles.length > 0) {
                setFiles(prev => [...prev, ...newFiles]);
                setSelectedFileIndex(null);
            }
        }
    }, []);

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
        setSelectedFileIndex(null);
    }, []);

    const removeFile = useCallback((indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        if (selectedFileIndex === indexToRemove) {
            setSelectedFileIndex(null);
        } else if (selectedFileIndex !== null && selectedFileIndex > indexToRemove) {
            setSelectedFileIndex(selectedFileIndex - 1);
        }
    }, [selectedFileIndex]);

    const handleSelectFile = useCallback((index: number) => {
        setSelectedFileIndex(prev => prev === index ? null : index);
    }, []);

    // History Logic
    const handleNewChat = useCallback(() => {
        setShowStt(false);
        setSelectedHistoryId(null);
        setSelectedFileIndex(null);
    }, []);

    const handleSelectHistory = useCallback((id: string) => {
        setSelectedHistoryId(id);
        setShowStt(true);
    }, []);

    const handleConversionComplete = useCallback((result: SttResultData) => {
        if (selectedFileIndex === null) return;

        const fileName = files[selectedFileIndex].name;
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            title: fileName,
            date: new Date().toISOString(),
            data: result
        };

        setHistory(prev => [newItem, ...prev]);
        setSelectedHistoryId(newItem.id);
    }, [files, selectedFileIndex]);

    const handleDeleteHistory = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryId === id) {
            setShowStt(false);
            setSelectedHistoryId(null);
        }
    };

    const activeHistoryItem = selectedHistoryId ? history.find(h => h.id === selectedHistoryId) : null;
    const currentFileName = activeHistoryItem ? activeHistoryItem.title : (selectedFileIndex !== null ? files[selectedFileIndex]?.name : '');

    return (
        <div className="relative flex h-full w-full flex-row overflow-hidden bg-[#f6f6f8] font-['Inter',sans-serif] text-[#0d121b] antialiased">
            {/* Sidebar */}
            <Sidebar
                history={history}
                onSelectHistory={handleSelectHistory}
                onDelete={handleDeleteHistory}
                currentHistoryId={selectedHistoryId}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main className="flex-1 flex flex-col h-full overflow-y-auto transition-all duration-300 relative">
                <div className="flex-1 flex flex-col max-w-[960px] mx-auto w-full p-4 md:p-8 pt-20">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between gap-3 pb-8">
                        <div className="flex min-w-72 flex-col gap-2">
                            <div className="flex items-center gap-4">
                                <h1 className="text-[#0d121b] text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                                    오디오 업로드
                                </h1>
                            </div>
                            <p className="text-[#4c669a] text-base font-normal leading-normal">
                                AI가 회의 내용을 요약해 드립니다. MP3, M4A 포맷을 지원하며 최대 500MB까지 업로드 가능합니다.
                            </p>
                        </div>
                    </div>

                    {/* Content Area */}
                    {!showStt ? (
                        <>
                            <FileUpload
                                onFilesSelected={handleFilesSelected}
                                isDragging={isDragging}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            />

                            <FileList
                                files={files}
                                onRemoveFile={removeFile}
                                formatFileSize={formatFileSize}
                                selectedFileIndex={selectedFileIndex}
                                onSelectFile={handleSelectFile}
                            />

                            <div className="flex flex-col sm:flex-row gap-4 justify-end items-center pt-6 border-t border-[#e7ebf3] mt-auto pb-8">
                                <button
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#135bec] hover:bg-blue-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setShowStt(true)}
                                    disabled={files.length === 0 || selectedFileIndex === null}
                                >
                                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                                    회의록 생성
                                </button>
                            </div>
                        </>
                    ) : (
                        <SttConversion
                            fileName={currentFileName}
                            onCancel={() => {
                                if (activeHistoryItem) {
                                    handleNewChat();
                                } else {
                                    setShowStt(false);
                                }
                            }}
                            onConversionComplete={handleConversionComplete}
                            initialData={activeHistoryItem?.data}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default UploadPage;

