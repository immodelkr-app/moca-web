/**
 * aiMarketingService.js
 * AI 마케팅 분석 탭 - Claude API 연동, 프롬프트 빌더, 로컬 설정 저장
 */

const API_KEY_STORAGE = 'i_model_ai_marketing_api_key';
const MODEL_STORAGE = 'i_model_ai_marketing_model';

export const CLAUDE_MODELS = [
    { id: 'claude-opus-5', label: 'Claude Opus 5 (고품질)' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (균형)' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (빠른 초안)' },
];

// 100만 토큰당 USD (input/output)
const MODEL_PRICING = {
    'claude-opus-5': { input: 5, output: 25 },
    'claude-sonnet-5': { input: 2, output: 10 },
    'claude-haiku-4-5': { input: 1, output: 5 },
};

export const getSavedApiKey = () => localStorage.getItem(API_KEY_STORAGE) || '';
export const saveApiKey = (key) => {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
};
export const clearApiKey = () => localStorage.removeItem(API_KEY_STORAGE);

export const getSavedModel = () => localStorage.getItem(MODEL_STORAGE) || CLAUDE_MODELS[0].id;
export const saveModel = (model) => localStorage.setItem(MODEL_STORAGE, model);

export const maskApiKey = (key) => {
    if (!key) return '';
    if (key.length <= 10) return '••••••••';
    return `${key.slice(0, 7)}···${key.slice(-4)}`;
};

/**
 * Claude Messages API를 브라우저에서 직접 호출합니다.
 * 관리자 개인 API 키를 사용하며, 서버를 거치지 않습니다.
 */
export async function callClaude({ apiKey, model, system, prompt, maxTokens = 1500 }) {
    if (!apiKey) {
        throw new Error('Claude API 키를 먼저 입력해주세요.');
    }

    let res;
    try {
        res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                // 이 탭은 짧은 정형 텍스트/카피 생성이 목적이라 깊은 추론이 불필요합니다.
                // thinking을 켜두면(Opus 5 기본값) 생각 토큰이 max_tokens를 잠식해 답변이 중간에 잘릴 수 있어 꺼둡니다.
                thinking: { type: 'disabled' },
                system,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
    } catch {
        throw new Error('네트워크 오류로 Claude API 호출에 실패했습니다.');
    }

    if (!res.ok) {
        let message = `요청 실패 (HTTP ${res.status})`;
        if (res.status === 401) {
            message = 'API 키가 올바르지 않습니다. 키를 다시 확인해주세요.';
        } else if (res.status === 429) {
            message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        } else {
            try {
                const body = await res.json();
                if (body?.error?.message) message = body.error.message;
            } catch {
                // 응답 본문 파싱 실패는 무시하고 기본 메시지 사용
            }
        }
        throw new Error(message);
    }

    const data = await res.json();
    let text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
    const usage = data.usage || {};
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-opus-5'];
    const estimatedCost =
        ((usage.input_tokens || 0) * pricing.input + (usage.output_tokens || 0) * pricing.output) / 1_000_000;

    if (data.stop_reason === 'max_tokens') {
        text += '\n\n⚠️ (답변이 토큰 한도로 중간에 잘렸습니다. "다시 생성"을 눌러 재시도해주세요.)';
    }

    return {
        text,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        estimatedCost,
    };
}

const BRAND_CONTEXT = `당신은 모델 에이전시 통합 플랫폼 "MOCA(모카클래스, 아임모델)"의 마케팅 담당자를 돕는 AI 어시스턴트입니다.
MOCA는 모델 지망생/현직 모델을 위한 앱으로 다음 기능을 제공합니다: 소속 에이전시 정보/투어 예약, 투어일지 기록, 인증샷 피드, 클래스(오프라인 강의) 신청, Q&A 게시판, 등급별 멤버십, "아임모델 공화국" 통합 포인트 시스템(자매 앱 modelbeauty와 포인트 연동).
항상 자연스러운 한국어로, 실무에 바로 쓸 수 있는 구체적인 문장으로 답하세요. 불필요한 서론 없이 핵심만 전달하세요.

위 배경 설명은 맥락 이해용일 뿐입니다. 실제 답변은 반드시 사용자가 이번 요청에서 제공한 데이터/조건에만 근거해야 합니다. 아래 규칙을 엄격히 지키세요:
- 제공되지 않은 수치, 회원 이름, 나이, 경력, 등급, 유입 경로, SNS/게시물 활동, 에이전시명 등은 절대로 지어내지 마세요. 배경 설명에 나온 기능이라도 이번 요청 데이터에 없으면 언급하지 마세요.
- 숫자는 제공된 값을 그대로 사용하세요. 임의로 반올림하거나 다른 값으로 바꾸지 마세요.
- 분석에 필요한 정보가 데이터에 없다면 지어내지 말고 "제공된 데이터에는 없음"이라고 명시하세요.
- 실존 인물처럼 보이는 가상의 이름·경력을 만들어내는 것은 절대 금지입니다.
- 답변에 내부/시스템용 XML 태그를 포함하지 마세요.`;

export function buildInsightPrompt(stats) {
    const summary = {
        '오늘 방문': stats.stats1Day,
        '주간 방문': stats.stats7Days,
        '월간 방문': stats.stats30Days,
        '전체 가입자 수': stats.totalUsersCount,
        '등급별 회원 분포': stats.gradeBreakdown || {},
        '남성 비율(%)': stats.signupMalePercent,
        '여성 비율(%)': stats.signupFemalePercent,
        '연령대 분포': stats.signupAgeGroups,
        '프로필 발송 많이 받은 에이전시 TOP5': (stats.castingStats || []).slice(0, 5),
        '방문 많이 한 멤버 TOP5': (stats.top10Users || []).slice(0, 5).map((u) => ({ name: u.name, count: u.count })),
        '최다 방문처 TOP5': stats.top5Places,
        '인기 앱 페이지 TOP5': stats.popularPages,
        '인기 클래스 TOP5 (활성 신청자 수 기준)': stats.popularClasses || [],
    };

    return {
        system: BRAND_CONTEXT,
        prompt: `아래는 MOCA 앱의 최근 데이터 스냅샷 전체입니다 (JSON). 이것이 당신이 가진 데이터의 전부이며, 이 외의 수치나 정보(등급별 분포, 유입 경로, 회원 개인정보, SNS/게시물 활동 등)는 전혀 주어지지 않았습니다.

${JSON.stringify(summary, null, 2)}

이 JSON 안의 값만 근거로 분석해서 다음 형식으로 답해주세요. 위 JSON에 없는 항목은 절대 언급하거나 추측하지 마세요:

1. 핵심 요약 (3줄 이내, 첫 줄에 "전체 가입자 ${stats.totalUsersCount}명" 처럼 JSON의 실제 수치를 그대로 인용)
2. 주목할 트렌드/이상치 (2~3개, JSON 값 근거로만, 왜 주목해야 하는지 포함)
3. 바로 실행 가능한 마케팅 액션 제안 (3~5개, 각 1~2문장)`,
    };
}

export function buildCopywriterPrompt({ topic, channel, tone }) {
    return {
        system: BRAND_CONTEXT,
        prompt: `채널: ${channel}
톤앤매너: ${tone || '친근하지만 신뢰감 있게'}
요청 내용: ${topic}

위 조건에 맞는 문구를 서로 다른 스타일로 2~3개 버전 작성해주세요. 각 버전 앞에 "버전 1:", "버전 2:" 형식으로 구분해주세요.`,
    };
}

const CARD_TEMPLATE_GUIDE = {
    stat: '통계를 강조하는 카드뉴스입니다. 큰 숫자 하나와 그 숫자를 임팩트있게 설명하는 짧은 문구가 필요합니다.',
    class: '클래스(오프라인 강의) 홍보 카드뉴스입니다. 신청을 유도하는 문구가 필요합니다.',
    app: 'MOCA 앱의 장점/필요성을 알리는 홍보 카드뉴스입니다.',
};

export function buildCardCopyPrompt({ templateType, data, context }) {
    return {
        system: BRAND_CONTEXT,
        prompt: `${CARD_TEMPLATE_GUIDE[templateType] || ''}

참고 데이터:
${JSON.stringify(data, null, 2)}
${context ? `\n참고할 최신 데이터 인사이트 (이 내용에서 인스타/SNS에 어필할 만한 포인트를 반영하세요):\n${context}\n` : ''}
다음 정확한 형식으로만 답해주세요 (다른 설명 없이):
제목: (12자 이내, 임팩트있게)
부제: (24자 이내)
CTA: (6자 이내, 행동 유도 문구)`,
    };
}

export function parseCardCopy(text) {
    const titleMatch = text.match(/제목\s*[:：]\s*(.+)/);
    const subMatch = text.match(/부제\s*[:：]\s*(.+)/);
    const ctaMatch = text.match(/CTA\s*[:：]\s*(.+)/i);
    if (titleMatch || subMatch || ctaMatch) {
        return {
            title: titleMatch ? titleMatch[1].trim() : '',
            subtitle: subMatch ? subMatch[1].trim() : '',
            cta: ctaMatch ? ctaMatch[1].trim() : '',
        };
    }
    return { title: text.trim().slice(0, 30), subtitle: '', cta: '' };
}
