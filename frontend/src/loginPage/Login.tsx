import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch('/api/members/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.');
                return;
            }

            const data = await res.json();
            // data.data contains the MemberResponse (id, name, email)
            const userData = data.data;

            // Store user info for Header display and meeting creation
            localStorage.setItem('userName', userData.name);
            localStorage.setItem('memberId', String(userData.memberId));

            // Dispatch event to update Header immediately
            window.dispatchEvent(new Event('login-success'));

            navigate('/');
        } catch (err) {
            setError('서버와 통신할 수 없습니다.');
        }
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
                        <h1 className="text-2xl font-extrabold text-[#0d121b] mb-2">로그인</h1>
                        <p className="text-[#4c669a] text-sm">환영합니다! 계정에 로그인하세요.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">error</span>
                            <div className="text-sm text-red-600 font-medium leading-relaxed">
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="mb-5">
                            <label className="block text-[#0d121b] text-sm font-semibold mb-2" htmlFor="email">
                                이메일
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-[#0d121b] text-sm font-semibold mb-2" htmlFor="password">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl bg-[#f0f4fd] border border-transparent focus:border-[#135bec] focus:bg-white text-[#0d121b] outline-none transition-all placeholder:text-[#9aa6c2]"
                            />
                        </div>

                        <div className="flex justify-end mb-6">
                            <button type="button" className="text-[#135bec] hover:text-blue-700 text-sm font-semibold transition-colors">
                                비밀번호를 잊으셨나요?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 rounded-xl bg-[#135bec] hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
                        >
                            로그인
                        </button>
                    </form>
                </div>

                <p className="text-center text-[#4c669a] text-sm">
                    아직 계정이 없으신가요?{' '}
                    <Link to="/signup" className="text-[#135bec] font-bold hover:underline">
                        회원가입
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
