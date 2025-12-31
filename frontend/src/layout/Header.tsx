import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
    const location = useLocation();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#e7ebf3] bg-white/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-8">
                    {/* Left: Logo/Icon */}
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#135bec] text-white">
                            <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
                        </div>
                        <span className="text-[#0d121b] font-bold text-lg tracking-tight">AI 회의록</span>
                    </Link>

                    {/* Navigation - Moved to left next to logo */}
                    <nav className="flex items-center gap-1">
                        <Link
                            to="/upload"
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/upload'
                                ? 'text-[#135bec] bg-blue-50'
                                : 'text-[#444746] hover:bg-[#f0f4f9]'
                                }`}
                        >
                            파일 업로드
                        </Link>
                        <Link
                            to="/live"
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/live'
                                ? 'text-[#135bec] bg-blue-50'
                                : 'text-[#444746] hover:bg-[#f0f4f9]'
                                }`}
                        >
                            실시간 회의록
                        </Link>
                    </nav>
                </div>

                {/* Right: Login/Profile */}
                <div className="flex items-center">
                    <Link
                        to="/login"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#444746] hover:bg-[#f0f4f9] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">login</span>
                        <span className="hidden sm:inline">로그인</span>
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
