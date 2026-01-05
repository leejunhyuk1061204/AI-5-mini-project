import type { SttResultData } from '../types';

/**
 * AI가 생성한 요약 데이터(JSON 또는 마크다운)를 파싱하여 SttResultData로 변환합니다.
 * 특정 노이즈 패턴 대신 범용적인 데이터 정제 로직을 사용합니다.
 */

/**
 * 텍스트 정제 헬퍼 함수 - 불필요한 공백, 특수문자 제거
 */
function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/^\s+|\s+$/g, '')  // trim
        .replace(/\s+/g, ' ')        // 다중 공백 제거
        .replace(/^[-*•]\s*/, '')    // 리스트 마커 제거
        .trim();
}

export function parseSummaryMarkdown(summary: string, fullText: string): SttResultData {
    const result: SttResultData = {
        description: '',
        core_summary: [],
        meeting_type: '',
        topics: [],
        decisions: [],
        action_items: [],
        pending_items: [],
        fullText: fullText
    };

    if (!summary) return result;


    // --- 1. JSON 형식인 경우 처리 ---
    // Case A: 마크다운 코드 블록(```json ... ```)이 포함된 경우 추출해서 파싱
    const jsonBlockMatch = summary.match(/```json([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            const jsonStr = jsonBlockMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            return mapParsedToResult(parsed, fullText);
        } catch (e) {
            console.warn("Found JSON block but failed to parse. Attempting repair...", e);
            try {
                // Common error: missing opening quote in string list: ["A", B"] -> ["A", "B"]
                // Regex: comma, optional space, capture text (not starting with " { [ digit - n), ending with quote
                const repaired = jsonBlockMatch[1].replace(/,\s*([^"{\[\s\d\-ntf][^:\]]*?)"/g, ', "$1"');
                const parsed = JSON.parse(repaired);
                console.log("JSON Repaired successfully!");
                return mapParsedToResult(parsed, fullText);
            } catch (e2) {
                console.warn("Repair failed:", e2);
            }
        }
    }

    // Case B: 전체가 순수 JSON인 경우 ({로 시작)
    const trimmedSummary = summary.trim();
    if (trimmedSummary.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmedSummary);
            return mapParsedToResult(parsed, fullText);
        } catch (e) {
            console.warn("Looks like JSON but failed to parse, falling back to Markdown parser.", e);
        }
    }

    // Helper function to map parsed JSON object to SttResultData
    function mapParsedToResult(parsed: any, text: string): SttResultData {
        return {
            description: parsed.description || '',
            core_summary: parsed.core_summary || [],
            meeting_type: parsed.meeting_type || '',
            topics: parsed.topics || [],
            decisions: parsed.decisions || [],
            action_items: parsed.action_items || [],
            pending_items: parsed.pending_items || [],
            fullText: text
        };
    }

    // --- 2. 기존 마크다운 파싱 로직 (유지) ---

    const lines = summary.split('\n');
    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();


        if (trimmed.startsWith('### 📝 회의 요약')) {
            currentSection = 'description';
            continue;
        } else if (trimmed.startsWith('#### 📌 핵심 요약')) {
            currentSection = 'core_summary';
            continue;
        } else if (trimmed.startsWith('#### 🏷️ 회의 유형:')) {
            result.meeting_type = trimmed.replace('#### 🏷️ 회의 유형:', '').trim();

            currentSection = '';
            continue;
        } else if (trimmed.startsWith('#### 💬 논의 주제')) {
            currentSection = 'topics';
            continue;
        } else if (trimmed.startsWith('#### ✅ 결정 사항')) {
            currentSection = 'decisions';
            continue;
        } else if (trimmed.startsWith('#### 📅 할 일')) {
            currentSection = 'action_items';
            continue;
        } else if (trimmed.startsWith('#### ⏳ 보류') || trimmed.startsWith('#### 보류')) {
            currentSection = 'pending_items';
            continue;
        }


        // 마운트 시 JSON 블록이나 코드 블록 기호(```)는 건너뜁니다.
        if (trimmed.startsWith('```') || trimmed === '{' || trimmed === '}') continue;

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const item = cleanText(trimmed.substring(2));
            if (!item) continue;
            if (currentSection === 'core_summary') result.core_summary.push(item);
            else if (currentSection === 'topics') result.topics.push(item);
            else if (currentSection === 'decisions') result.decisions.push(item);
            else if (currentSection === 'action_items') result.action_items.push(item);
            else if (currentSection === 'pending_items') result.pending_items.push(item);
        } else if (currentSection === 'description' && trimmed && !trimmed.startsWith('#')) {

            const cleanedLine = cleanText(trimmed);
            if (cleanedLine) {
                // 이전 문장과 합칠 때 공백 추가
                result.description += (result.description ? ' ' : '') + cleanedLine;
            }
        }
    }

    return result;
}