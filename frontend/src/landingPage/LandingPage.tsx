import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
    return (
        <div className="flex flex-col h-full items-center bg-white font-['Inter',sans-serif] overflow-y-auto">
            {/* Hero Section */}
            <section className="w-full max-w-[1200px] px-4 py-12 md:py-16 flex flex-col items-center text-center animate-fade-in shrink-0">
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-[#135bec] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#135bec]">AI 기반 자동 회의록 서비스</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-[#0d121b] tracking-tight mb-4 leading-tight">
                    모든 대화를 <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#135bec] to-purple-600">가치있는 기록</span>으로 바꿉니다
                </h1>
                <p className="text-base md:text-lg text-[#444746] max-w-2xl mb-8 leading-relaxed">
                    실시간 음성 인식부터 오디오 파일 업로드까지. <br />
                    AI가 회의 내용을 빠짐없이 기록하고 핵심만 요약해 드립니다.
                </p>
                <h3 className="font-semibold text-gray-400 tracking-widest text-xs md:text-sm mb-3 font-['Inter']">
                    "Where Conversations Become Actions"
                </h3>
                <br />
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/live"
                        className="px-6 py-3 bg-[#135bec] text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        <span>지금 시작하기</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </Link>
                    <Link
                        to="/upload"
                        className="px-6 py-3 bg-white text-[#444746] text-base font-bold rounded-xl border border-[#e7ebf3] hover:bg-[#f8faff] transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[#135bec] text-[20px]">upload_file</span>
                        <span>파일 업로드</span>
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full bg-[#f8faff] py-12 border-t border-[#e7ebf3] flex-1 flex items-center">
                <div className="max-w-[1200px] mx-auto px-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#135bec] flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl">upload_file</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#0d121b] mb-2">파일 업로드</h3>
                            <p className="text-[#444746] text-sm leading-relaxed">
                                녹음된 오디오 파일을 업로드하세요. M4A, MP3 등 다양한 포맷을 지원하며 대용량 파일도 빠르게 변환합니다.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl">mic</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#0d121b] mb-2">실시간 기록</h3>
                            <p className="text-[#444746] text-sm leading-relaxed">
                                회의를 진행하면서 실시간으로 대화를 기록하세요. 놓치는 내용 없이 모든 순간을 포착합니다.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#0d121b] mb-2">AI 요약</h3>
                            <p className="text-[#444746] text-sm leading-relaxed">
                                긴 회의 내용을 모두 읽을 필요 없습니다. AI가 핵심 주제와 결정 사항을 자동으로 요약해 드립니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
