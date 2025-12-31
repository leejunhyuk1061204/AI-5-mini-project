import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-full items-center bg-white font-['Inter',sans-serif]">
            {/* Hero Section */}
            <section className="w-full max-w-[1200px] px-4 py-20 md:py-32 flex flex-col items-center text-center animate-fade-in">
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-[#135bec] animate-pulse"></span>
                    <span className="text-sm font-bold text-[#135bec]">AI 기반 자동 회의록 서비스</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-[#0d121b] tracking-tight mb-6 leading-tight">
                    모든 대화를 <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#135bec] to-purple-600">가치있는 기록</span>으로 바꿉니다
                </h1>

                <p className="text-lg md:text-xl text-[#444746] max-w-2xl mb-10 leading-relaxed">
                    실시간 음성 인식부터 오디오 파일 업로드까지. <br />
                    AI가 회의 내용을 빠짐없이 기록하고 핵심만 요약해 드립니다.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        to="/upload"
                        className="px-8 py-4 bg-[#135bec] text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        <span>지금 시작하기</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                    <Link
                        to="/live"
                        className="px-8 py-4 bg-white text-[#444746] text-lg font-bold rounded-xl border border-[#e7ebf3] hover:bg-[#f8faff] transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[#135bec]">mic</span>
                        <span>실시간 기록</span>
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className="w-full bg-[#f8faff] py-20 border-t border-[#e7ebf3]">
                <div className="max-w-[1200px] mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#135bec] flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-3xl">upload_file</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#0d121b] mb-3">파일 업로드</h3>
                            <p className="text-[#444746] leading-relaxed">
                                녹음된 오디오 파일을 업로드하세요. M4A, MP3 등 다양한 포맷을 지원하며 대용량 파일도 빠르게 변환합니다.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-3xl">mic</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#0d121b] mb-3">실시간 기록</h3>
                            <p className="text-[#444746] leading-relaxed">
                                회의를 진행하면서 실시간으로 대화를 기록하세요. 놓치는 내용 없이 모든 순간을 포착합니다.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e7ebf3] hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#0d121b] mb-3">AI 요약</h3>
                            <p className="text-[#444746] leading-relaxed">
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
