import React from 'react';

const MainPage: React.FC = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-row overflow-hidden bg-[#f6f6f8] dark:bg-[#101622] font-['Inter',sans-serif] text-[#0d121b] dark:text-white antialiased">
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex h-full grow flex-col">
          <div className="flex flex-1 justify-center py-5 px-4 md:px-8 lg:px-12">
            <div className="flex flex-col max-w-[960px] flex-1">
              <div className="flex flex-wrap justify-between gap-3 pb-8">
                <div className="flex min-w-72 flex-col gap-2">
                  <h1 className="text-[#0d121b] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Upload Audio</h1>
                  <p className="text-[#4c669a] dark:text-gray-400 text-base font-normal leading-normal">Let our AI summarize your discussion. We support MP3 and M4A formats up to 500MB.</p>
                </div>
              </div>
              <div className="flex flex-col mb-8">
                <div className="group relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-[#cfd7e7] dark:border-gray-700 bg-white dark:bg-[#1a2235] hover:border-[#135bec]/50 hover:bg-[#135bec]/5 transition-all duration-300 px-6 py-16 cursor-pointer">
                  <div className="bg-[#f0f4fd] dark:bg-[#135bec]/20 rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#135bec] text-[40px] fill">cloud_upload</span>
                  </div>
                  <div className="flex max-w-[480px] flex-col items-center gap-2 z-10">
                    <p className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                      Drag & Drop files here
                    </p>
                    <p className="text-[#4c669a] dark:text-gray-400 text-sm font-normal leading-normal text-center">
                      or click to browse your files
                    </p>
                  </div>
                  <button className="flex min-w-[140px] items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-[#135bec] hover:bg-blue-700 text-white text-sm font-bold leading-normal transition-colors shadow-sm hover:shadow-md z-10">
                    <span className="truncate">Browse Files</span>
                  </button>
                  <div className="absolute bottom-4 flex items-center gap-1.5 opacity-60">
                    <span className="material-symbols-outlined text-[#4c669a] dark:text-gray-400 text-[16px]">lock</span>
                    <span className="text-[#4c669a] dark:text-gray-400 text-xs">Files are processed securely and encrypted</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 mb-8">
                <h3 className="text-[#0d121b] dark:text-white text-lg font-bold px-1">Selected Files</h3>
                <div className="flex items-center gap-4 bg-white dark:bg-[#1a2235] border border-[#e7ebf3] dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-[#e7ebf3] dark:bg-gray-800 flex items-center justify-center rounded-lg shrink-0 size-12 text-[#135bec]">
                    <span className="material-symbols-outlined">audio_file</span>
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[#0d121b] dark:text-white text-base font-medium leading-normal truncate">Q3_Marketing_Strategy.mp3</p>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Ready</span>
                    </div>
                    <p className="text-[#4c669a] dark:text-gray-400 text-sm font-normal leading-normal truncate">45.2 MB • 45:02 Duration</p>
                  </div>
                  <button className="shrink-0 text-[#4c669a] hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-end items-center pt-6 border-t border-[#e7ebf3] dark:border-gray-700 mt-auto pb-8">
                <p className="text-xs text-[#4c669a] dark:text-gray-400 mr-auto flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Estimated processing time: ~3 mins
                </p>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-[#cfd7e7] dark:border-gray-600 text-[#0d121b] dark:text-white text-sm font-semibold hover:bg-[#f0f2f5] dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#135bec] hover:bg-blue-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  Generate Minutes
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainPage;

