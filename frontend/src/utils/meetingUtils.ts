import type { SttResultData } from '../types';

/**
 * Summary 마크다운 또는 JSON을 파싱해서 SttResultData로 변환
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

    // --- [추가] 1. JSON 형식인 경우 처리 ---
    if (summary.trim().includes('{') && (summary.includes('"description"') || summary.includes('```json'))) {
        try {
            // 마크다운 백틱(```json ... ```) 제거
            const cleanJson = summary.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            return {
                description: parsed.description || '',
                core_summary: parsed.core_summary || [],
                meeting_type: parsed.meeting_type || '',
                topics: parsed.topics || [],
                decisions: parsed.decisions || [],
                action_items: parsed.action_items || [],
                pending_items: parsed.pending_items || [],
                fullText: fullText
            };
        } catch (e) {
            console.error("JSON 파싱 시도 실패, 마크다운 파싱으로 전환합니다.", e);
            // 실패 시 아래의 기존 마크다운 파싱 로직으로 넘어감
        }
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

        if (trimmed.startsWith('- ')) {
            const item = trimmed.substring(2).trim();
            if (currentSection === 'core_summary') result.core_summary.push(item);
            else if (currentSection === 'topics') result.topics.push(item);
            else if (currentSection === 'decisions') result.decisions.push(item);
            else if (currentSection === 'action_items') result.action_items.push(item);
            else if (currentSection === 'pending_items') result.pending_items.push(item);
        } else if (currentSection === 'description' && trimmed && !trimmed.startsWith('#')) {
            result.description += (result.description ? ' ' : '') + trimmed;
        }
    }

    return result;
}