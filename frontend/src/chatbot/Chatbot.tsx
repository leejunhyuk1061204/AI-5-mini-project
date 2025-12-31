import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, type ChatResponse } from '../api/chat';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    id: number;
    text: string;
    isUser: boolean;
    isError?: boolean;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", isUser: false },
        { id: 2, text: "회의록 요약이나 검색을 도와드릴 수 있습니다.", isUser: false }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue("");

        // Add user message immediately
        setMessages(prev => [...prev, { id: Date.now(), text: userMessage, isUser: true }]);
        setIsLoading(true);

        try {
            // Prepare history for context (last 10 messages)
            const history = messages.slice(-10).map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
            }));

            const response: ChatResponse = await sendMessage({
                message: userMessage,
                session_id: sessionId,
                history: history
            });

            // Update session ID if established
            if (response.session_id) {
                setSessionId(response.session_id);
            }

            // Add bot response
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: response.reply,
                isUser: false
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                isUser: false,
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div
            className={`
                flex flex-col h-full border-l border-[#e7ebf3] bg-white transition-all duration-300 overflow-hidden relative
                ${isOpen ? 'w-[350px] min-w-[350px] opacity-100' : 'w-0 min-w-0 opacity-0'}
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7ebf3] bg-[#f8faff] min-w-[350px]">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#135bec]">smart_toy</span>
                    <span className="font-bold text-[#0d121b]">AI Assistant</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-[#e7ebf0] text-[#444746] transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fc] min-w-[350px]">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${msg.isUser
                                ? 'bg-[#135bec] text-white rounded-tr-none'
                                : msg.isError
                                    ? 'bg-red-50 border border-red-200 text-red-600 rounded-tl-none'
                                    : 'bg-white border border-[#e7ebf3] text-[#0d121b] rounded-tl-none shadow-sm'
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-[#e7ebf3] px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-[#135bec] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-[#135bec] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-[#135bec] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-[#e7ebf3] min-w-[350px]">
                <div className="flex items-center gap-2 bg-[#f0f4f9] px-3 py-2 rounded-full border border-transparent focus-within:border-[#135bec] transition-colors">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-[#0d121b] placeholder-[#444746]"
                    />
                    <button
                        onClick={handleSendMessage}
                        className={`p-1.5 rounded-full transition-colors ${inputValue.trim() && !isLoading
                            ? 'bg-[#135bec] text-white hover:bg-blue-700'
                            : 'bg-[#e7ebf0] text-[#9aa6c2] cursor-not-allowed'
                            }`}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <span className="material-symbols-outlined text-[18px] leading-none flex items-center justify-center">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
