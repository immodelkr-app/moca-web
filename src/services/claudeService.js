// claudeService.js — Claude Sonnet 4.5 / Opus 4 API 연동 서비스

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

const SAVED_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

export const callClaude = async (systemPrompt, userMessage, model = DEFAULT_MODEL, apiKey = null) => {
    const key = apiKey || SAVED_API_KEY;
    if (!key) throw new Error('Claude API Key가 설정되지 않았습니다.');
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Claude API 오류: ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || '';
};

export const analyzeAppData = async (snapshot, apiKey = null, model = DEFAULT_MODEL) => {
    const system = `당신은 MOCA(아임모카) 광고모델 플랫폼의 전문 데이터 마케팅 분석가입니다.
30대, 40대, 60대 한국 광고모델들의 활동 데이터를 분석하여 구체적이고 실행 가능한 마케팅 전략을 제안합니다.
아임모델 공화국(통합 회원·포인트 서버)과 연계된 모카포인트 및 modelbeauty(뷰티·잡화) 앱 연동 시너지를 적극 활용합니다.
분석 결과는 반드시 한국어로 작성하며, 이모지와 마크다운 형식으로 읽기 쉽게 구성합니다.`;
    const user = `다음 MOCA 앱 운영 데이터를 분석하고, 이번 주 마케팅 전략 리포트를 작성해주세요:\n\n${JSON.stringify(snapshot, null, 2)}\n\n다음 항목을 포함해 주세요:\n1. 📊 핵심 지표 요약 (가입자, 모카그램 활동, 포인트 적립 현황)\n2. 🔥 이번 주 인기 에이전시 TOP 3\n3. 🎯 30대·40대·60대 모델별 활동 패턴 분석\n4. 💡 이번 주 추천 마케팅 액션 3가지\n5. 🛍️ 모카포인트 & modelbeauty 연동 프로모션 제안`;
    return callClaude(system, user, model, apiKey);
};

export const convertToKimDaepyoTone = async (rawText, brandPrompt = '', apiKey = null, model = DEFAULT_MODEL) => {
    const brandSection = brandPrompt ? `\n브랜드 지침:\n${brandPrompt}` : '';
    const system = `당신은 MOCA(아임모카) 플랫폼 '김대표'의 페르소나로 공지/메시지를 작성하는 브랜딩 전문가입니다.${brandSection}\n\n다음 원칙을 항상 적용합니다:\n- 어조: 친근하고 밝으며 신뢰감 있는 ~해요, ~해보세요 어조\n- 이모지: ✨, 📸, 💜, 🎉, 👑을 자연스럽게 활용\n- 강조: 핵심 내용에 굵게(<b>태그</b>)와 보라색(<span> 태그)으로 포인트\n- 형광펜: 중요 혜택에 mark 태그로 노란 하이라이트 적용\n- 결론은 항상 긍정적이고 행동을 유도하는 문장으로 마무리`;
    const user = `다음 원문을 김대표 브랜드 톤앤매너와 HTML 서식(굵게, 보라색, 형광펜 강조)을 적용하여 완성도 높은 공지문으로 변환해주세요:\n\n원문:\n${rawText}\n\n변환된 HTML 서식이 적용된 공지문만 출력해주세요.`;
    return callClaude(system, user, model, apiKey);
};

export const generateMarketingCopy = async (topic, targetAudience = '30~60대 광고모델', apiKey = null, model = DEFAULT_MODEL) => {
    const system = `당신은 MOCA(아임모카) 플랫폼의 전문 카피라이터입니다.\n30대, 40대, 60대 한국 광고모델 타겟에 맞는 감성적이고 설득력 있는 홍보 문구를 작성합니다.\n인스타그램, 카카오톡 채널, 문자 발송에 최적화된 형식으로 작성합니다.`;
    const user = `다음 주제로 MOCA 홍보 카드뉴스 카피를 작성해주세요:\n\n주제: ${topic}\n타겟: ${targetAudience}\n\n아래 형식으로 작성해주세요:\n\n📌 [인스타그램용 캡션] (최대 5줄, 해시태그 5개 포함)\n\n📢 [카카오톡 채널 메시지용] (2~3줄, 간결하고 강렬하게)\n\n📱 [문자 발송용] (1~2줄, 80자 이내)\n\n🎨 [카드뉴스 슬라이드 구성안] (3~5장 구성, 각 슬라이드 헤드라인 + 서브카피)`;
    return callClaude(system, user, model, apiKey);
};

export const generatePointMarketingProposal = async (pointStats, apiKey = null, model = DEFAULT_MODEL) => {
    const system = `당신은 MOCA(아임모카) 플랫폼과 아임모델 공화국(통합 회원·포인트 서버), modelbeauty(뷰티·잡화) 앱의 통합 마케팅 전략가입니다.\n모카포인트 적립 현황을 분석하고, modelbeauty에서 사용 가능한 포인트 프로모션 전략을 제안합니다.\n30대, 40대, 60대 각 연령대 모델들의 소비 패턴과 관심 뷰티 아이템을 고려합니다.`;
    const user = `다음 포인트 적립 데이터를 바탕으로 아임모델 공화국 × modelbeauty 연동 마케팅 전략을 제안해주세요:\n\n${JSON.stringify(pointStats, null, 2)}\n\n다음을 포함해주세요:\n1. 💎 이달의 모카포인트 MVP 활동 TOP 3\n2. 🛍️ 연령대별(30대/40대/60대) modelbeauty 추천 아이템 카테고리\n3. 🎁 포인트 소진 촉진을 위한 이달의 프로모션 기획안\n4. 📣 팝업 공지문 초안 (앱 팝업 발송용)`;
    return callClaude(system, user, model, apiKey);
};
