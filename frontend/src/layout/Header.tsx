import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
    const location = useLocation();
    const [userName, setUserName] = React.useState<string | null>(localStorage.getItem('userName'));

    React.useEffect(() => {
        const handleLoginSuccess = () => {
            setUserName(localStorage.getItem('userName'));
        };

        window.addEventListener('login-success', handleLoginSuccess);

        // Also check on mount
        setUserName(localStorage.getItem('userName'));

        return () => window.removeEventListener('login-success', handleLoginSuccess);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userName');
        localStorage.removeItem('memberId');
        setUserName(null);
        window.location.href = '/'; // Reload to clear state perfectly
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#e7ebf3] bg-white/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-2 sm:gap-8">
                    {/* Left: Logo/Icon */}
                    <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#135bec] text-white shrink-0">
                            <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
                        </div>
                        <span className="text-[#0d121b] font-bold text-lg tracking-tight hidden sm:block">AI 회의록</span>
                    </Link>

                    {/* Navigation - Moved to left next to logo */}
                    <nav className="flex items-center gap-1">
                        <Link
                            to="/live"
                            className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${location.pathname === '/live'
                                ? 'text-[#135bec] bg-blue-50'
                                : 'text-[#444746] hover:bg-[#f0f4f9]'
                                }`}
                        >
                            실시간 회의록
                        </Link>
                        <Link
                            to="/history"
                            className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${location.pathname === '/history'
                                ? 'text-[#135bec] bg-blue-50'
                                : 'text-[#444746] hover:bg-[#f0f4f9]'
                                }`}
                        >
                            회의 히스토리
                        </Link>
                        <Link
                            to="/upload"
                            className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${location.pathname === '/upload'
                                ? 'text-[#135bec] bg-blue-50'
                                : 'text-[#444746] hover:bg-[#f0f4f9]'
                                }`}
                        >
                            파일 업로드
                        </Link>
                    </nav>
                </div>

                {/* Right: Login/Profile */}
                <div className="flex items-center gap-4">
                    {userName ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#0d121b]">
                                {userName}님
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-[#4c669a] hover:text-[#135bec] underline"
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (

                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="px-3 py-2 rounded-lg text-sm font-medium text-[#444746] hover:bg-[#f0f4f9] transition-colors"
                            >
                                로그인
                            </Link>
                            <div className="w-[1px] h-3 bg-[#e7ebf3]"></div>
                            <Link
                                to="/signup"
                                className="px-3 py-2 rounded-lg text-sm font-medium text-[#135bec] hover:bg-blue-50 transition-colors"
                            >
                                회원가입
                            </Link>
                        </div>

                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
