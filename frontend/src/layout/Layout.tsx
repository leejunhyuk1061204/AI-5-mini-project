import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Chatbot from '../chatbot/Chatbot';

const Layout: React.FC = () => {
    // Initialize open state based on screen width (Desktop: Open, Mobile: Closed)
    const [isChatbotOpen, setIsChatbotOpen] = React.useState(window.innerWidth >= 1024);
    const location = useLocation();
    const isLandingPage = location.pathname === '/';
    const isLivePage = location.pathname === '/live';

    // Automatically handle visibility on window resize
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsChatbotOpen(true);
            } else {
                setIsChatbotOpen(false);
            }
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Initial check is handled by useState initializer, but safe to verify
        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#f6f6f8] relative">
            <Header />
            <main className="flex-1 flex flex-row relative w-full max-w-[1400px] mx-auto min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden h-full">
                    <Outlet />
                </div>
                {!isLandingPage && !isLivePage && (
                    <Chatbot
                        isOpen={isChatbotOpen}
                        onClose={() => setIsChatbotOpen(false)}
                        meetingId={0} // Global chatbot context (default)
                    />
                )}
            </main>
            <Footer
                onToggleChatbot={() => setIsChatbotOpen(!isChatbotOpen)}
                isChatbotOpen={isChatbotOpen}
                showChatbotToggle={!isLandingPage && !isLivePage}
            />
        </div>
    );
};

export default Layout;
