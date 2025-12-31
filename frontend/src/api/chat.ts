export interface HistoryMessage {
    role: string;
    content: string;
}

export interface ChatRequest {
    message: string;
    session_id?: string;
    history?: HistoryMessage[];
    context?: Record<string, any>;
}

export interface ChatResponse {
    session_id: string;
    reply: string;
    took_ms: number;
}

const API_BASE_URL = 'http://localhost:8001/api';

export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || '채팅 서버 오류가 발생했습니다.');
        }

        return await response.json();
    } catch (error) {
        console.error('Chat API Error:', error);
        throw error;
    }
};
