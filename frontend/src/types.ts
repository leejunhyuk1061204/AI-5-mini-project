export interface SttResultData {
    description: string;
    core_summary: string[];
    meeting_type: string;
    topics: string[];
    decisions: string[];
    action_items: string[];
    pending_items: string[];
}

export interface HistoryItem {
    id: string;
    title: string;
    date: string;
    data: SttResultData;
    type?: 'upload' | 'live';
}
