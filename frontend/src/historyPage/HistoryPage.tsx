import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import MeetingResultDisplay from '../components/MeetingResultDisplay';
import { parseSummaryMarkdown } from '../utils/meetingUtils';
import { useMeetingContext } from '../context/MeetingContext';
import type { SttResultData } from '../types';

interface MeetingListItem {
    meetingId: number;
    title: string;
    summary: string;
    fullText: string;
    status: string;
    createdAt: string;
}

const HistoryPage: React.FC = () => {
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMeeting, setSelectedMeeting] = useState<MeetingListItem | null>(null);
    const [parsedResult, setParsedResult] = useState<SttResultData | null>(null);
    const { setCurrentMeetingId } = useMeetingContext();

    const memberId = localStorage.getItem('memberId');

    const fetchMeetings = useCallback(async () => {
        if (!memberId) {
            setMeetings([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/meetings?memberId=${memberId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!response.ok) throw new Error('Failed to fetch meetings');
            const data = await response.json();
            // Sort by creation date descending
            const sorted = (data.data as MeetingListItem[]).sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setMeetings(sorted);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setIsLoading(false);
        }
    }, [memberId]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const handleSelectMeeting = (meeting: MeetingListItem) => {
        setSelectedMeeting(meeting);
        setCurrentMeetingId(meeting.meetingId);
        const parsed = parseSummaryMarkdown(meeting.summary, meeting.fullText);
        setParsedResult(parsed);
    };

    const handleDeleteMeeting = async (e: React.MouseEvent, meetingId: number) => {
        e.stopPropagation();
        if (!window.confirm('정말 이 회의록을 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!response.ok) throw new Error('Failed to delete meeting');

            setMeetings(prev => prev.filter(m => m.meetingId !== meetingId));
            if (selectedMeeting?.meetingId === meetingId) {
                setSelectedMeeting(null);
                setParsedResult(null);
                setCurrentMeetingId(0);
            }
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('삭제에 실패했습니다.');
        }
    };


    return (
        <div className="flex flex-col h-full bg-[#f1f4f9] font-['Pretendard'] overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex overflow-hidden">
                    {/* List Section */}
                    <div className={`flex-1 flex flex-col bg-white ${selectedMeeting ? 'hidden lg:flex' : 'flex'} w-full lg:w-auto lg:min-w-[320px] lg:max-w-sm lg:border-r lg:border-[#e7ebf3]`}>
                        <div className="p-4 border-b border-[#e7ebf3] bg-gray-50 flex justify-between items-center">
                            <span className="font-bold text-[#0d121b]">목록 ({meetings.length})</span>
                            <button
                                onClick={fetchMeetings}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-left">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-[#135bec] rounded-full animate-spin"></div>
                                    <p className="text-sm">목록 로딩 중...</p>
                                </div>
                            ) : meetings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-20 text-center">
                                    <span className="material-symbols-outlined text-4xl">folder_off</span>
                                    <p className="text-sm">저장된 회의록이 없습니다.</p>
                                </div>
                            ) : (
                                meetings.map((meeting) => (
                                    <div
                                        key={meeting.meetingId}
                                        onClick={() => handleSelectMeeting(meeting)}
                                        className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${selectedMeeting?.meetingId === meeting.meetingId
                                            ? 'bg-blue-50 border-[#135bec] shadow-sm'
                                            : 'bg-white border-[#e7ebf3] hover:border-[#135bec]/50 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1 text-left">
                                            <h3 className={`font-bold text-sm truncate pr-6 ${selectedMeeting?.meetingId === meeting.meetingId ? 'text-[#135bec]' : 'text-[#0d121b]'
                                                }`}>
                                                {meeting.title}
                                            </h3>
                                            <button
                                                onClick={(e) => handleDeleteMeeting(e, meeting.meetingId)}
                                                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-[#4c669a]">
                                            <span className="flex items-center gap-1">
                                                {new Date(meeting.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded font-medium ${meeting.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {meeting.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail Section */}
                    <div className={`flex-[2] flex bg-[#f8fafc] overflow-hidden ${selectedMeeting ? 'flex' : 'hidden lg:flex items-center justify-center'}`}>
                        {selectedMeeting && parsedResult ? (
                            <div className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col relative text-left">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedMeeting(null)}
                                            className="p-2 hover:bg-gray-200 rounded-lg lg:hidden"
                                        >
                                            <span className="material-symbols-outlined">arrow_back</span>
                                        </button>
                                        <h2 className="font-bold text-lg text-gray-800 truncate max-w-md">
                                            {selectedMeeting.title}
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto rounded-xl shadow-inner bg-white/50 p-1">
                                    <MeetingResultDisplay
                                        result={parsedResult}
                                        fileName={selectedMeeting.title}
                                        onClose={() => setSelectedMeeting(null)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-4 p-10 opacity-60">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-[#e7ebf3]">
                                    <span className="material-symbols-outlined text-4xl text-gray-300">description</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-[#0d121b]">회의록 상세 보기</h3>
                                    <p className="text-sm text-[#4c669a]">왼쪽 목록에서 회의를 선택하여 내용을 확인하세요.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HistoryPage;
