import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const SignUp: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // Mock SignUp Error
        if (name.includes('fail')) {
            setError('이미 존재하는 이메일입니다.');
            return;
        }

        // SignUp logic here
        console.log('Signing up with', name, email, password);
        // Navigate to login or main page
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f0f4fd] p-4 font-['Inter',sans-serif]">
            <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
                {/* Home Link Logo */}
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#135bec] text-white shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
                    </div>
                    <span className="text-[#0d121b] font-bold text-xl tracking-tight">AI 회의록</span>
                </Link>

                <div className="bg-white p-8 rounded-2xl shadow-xl w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-extrabold text-[#0d121b] mb-2">회원가입</h1>
                        <p className="text-[#4c669a] text-sm">새로운 계정으로 시작해보세요</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">error</span>
                            <div className="text-sm text-red-600 font-medium leading-relaxed">
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#0d121b] text-sm font-semibold pl-1">이름</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#0d121b] text-sm font-semibold pl-1">이메일</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#0d121b] text-sm font-semibold pl-1">비밀번호</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="8자 이상 입력"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[#0d121b] text-sm font-semibold pl-1">비밀번호 확인</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="비밀번호 재입력"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 rounded-xl bg-[#135bec] hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] mt-2"
                        >
                            회원가입 완료
                        </button>
                    </form>
                </div>

                <p className="text-center text-[#4c669a] text-sm">
                    이미 계정이 있으신가요?{' '}
                    <Link to="/login" className="text-[#135bec] font-bold hover:underline">
                        로그인
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignUp;
