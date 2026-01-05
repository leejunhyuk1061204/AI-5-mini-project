import type { SttResultData } from '../types';

/**
 * AI가 생성한 요약 데이터(JSON 또는 마크다운)를 파싱하여 SttResultData로 변환합니다.
 * 특정 노이즈 패턴 대신 범용적인 데이터 정제 로직을 사용합니다.
 */
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

    // 1. 범용적인 텍스트 정제 함수 (불필요한 줄바꿈, 양끝 공백 제거)
    const cleanText = (text: string): string => {
        if (!text || typeof text !== 'string') return text;
        return text.trim();
    };

    try {
        // 2. JSON 추출 로직: 응답에 포함된 JSON 블록({ ... })을 찾습니다.
        const jsonMatch = summary.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            // 마크다운 백틱(```json)이 섞여 있을 경우를 대비해 제거
            const cleanJsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJsonStr);

            return {
                description: cleanText(parsed.description || ''),
                core_summary: Array.isArray(parsed.core_summary)
                    ? parsed.core_summary.map(cleanText).filter(Boolean)
                    : [],
                meeting_type: cleanText(parsed.meeting_type || ''),
                topics: Array.isArray(parsed.topics)
                    ? parsed.topics.map(cleanText).filter(Boolean)
                    : [],
                decisions: Array.isArray(parsed.decisions)
                    ? parsed.decisions.map(cleanText).filter(Boolean)
                    : [],
                action_items: Array.isArray(parsed.action_items)
                    ? parsed.action_items.map(cleanText).filter(Boolean)
                    : [],
                pending_items: Array.isArray(parsed.pending_items)
                    ? parsed.pending_items.map(cleanText).filter(Boolean)
                    : [],
                fullText: fullText
            };
        }
    } catch (e) {
        console.warn("JSON 파싱 실패, 일반 마크다운 모드로 전환합니다.", e);
    }

    // 3. 마크다운 폴백(Fallback) 로직
    // AI가 JSON이 아닌 일반 텍스트로 응답했을 경우를 대비합니다.
    const lines = summary.split('\n');
    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('### 📝 회의 요약') || trimmed.startsWith('### 📝 회의 개요')) {
            currentSection = 'description';
            continue;
        } else if (trimmed.startsWith('#### 📌 핵심 요약') || trimmed.startsWith('#### 💡 핵심 요약')) {
            currentSection = 'core_summary';
            continue;
        } else if (trimmed.startsWith('#### 🏷️ 회의 유형')) {
            // "#### 🏷️ 회의 유형: 기술 협의" 형태 대응
            result.meeting_type = cleanText(trimmed.replace(/####\s*🏷️\s*회의\s*유형:?/, ''));
            currentSection = '';
            continue;
        } else if (trimmed.startsWith('#### 💬 논의 주제')) {
            currentSection = 'topics';
            continue;
        } else if (trimmed.startsWith('#### ✅ 결정 사항')) {
            currentSection = 'decisions';
            continue;
        } else if (trimmed.startsWith('#### 📅 할 일') || trimmed.startsWith('#### 🚀 조치 필요 사항')) {
            currentSection = 'action_items';
            continue;
        } else if (trimmed.startsWith('#### ⏳ 보류') || trimmed.startsWith('#### ⌛ 보류') || trimmed.startsWith('#### 보류')) {
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