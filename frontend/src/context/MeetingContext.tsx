import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface MeetingContextType {
    currentMeetingId: number;
    setCurrentMeetingId: (id: number) => void;
    isChatbotOpen: boolean;
    setIsChatbotOpen: (isOpen: boolean) => void;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentMeetingId, setCurrentMeetingId] = useState<number>(0);
    const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(window.innerWidth >= 1024);

    return (
        <MeetingContext.Provider value={{
            currentMeetingId,
            setCurrentMeetingId,
            isChatbotOpen,
            setIsChatbotOpen
        }}>
            {children}
        </MeetingContext.Provider>
    );
};

export const useMeetingContext = (): MeetingContextType => {
    const context = useContext(MeetingContext);
    if (!context) {
        throw new Error('useMeetingContext must be used within MeetingProvider');
    }
    return context;
};
