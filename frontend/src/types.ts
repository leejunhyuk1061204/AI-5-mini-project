export interface SttResultData {
    description: string;
    core_summary: string[];
    meeting_type: string;
    topics: string[];
    decisions: string[];
    action_items: string[];
    pending_items: string[];
    fullText?: string; // 전체 대본 (화자 분리된 원문)
}

export interface HistoryItem {
    id: string;
    title: string;
    date: string;
    data: SttResultData;
    type?: 'upload' | 'live';
    meetingId?: number; // For fetching more data or using chatbot
}

// Backend API Response
export interface MeetingUploadResponse {
    meetingId: number;
    memberId: number;
    title: string;
    fullText: string;
    summary: string;
    status: string;
    createdAt: string;
}
