import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '../chatbot/Chatbot';

const Layout: React.FC = () => {
    const [isChatbotOpen, setIsChatbotOpen] = React.useState(true);
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#f6f6f8] relative">
            <Header />
            <main className="flex-1 flex flex-row relative w-full max-w-[1400px] mx-auto min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden h-full">
                    <Outlet />
                </div>
                {!isLandingPage && (
                    <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
                )}
            </main>
            <Footer
                onToggleChatbot={() => setIsChatbotOpen(!isChatbotOpen)}
                isChatbotOpen={isChatbotOpen}
                showChatbotToggle={!isLandingPage}
            />
        </div>
    );
};

export default Layout;
