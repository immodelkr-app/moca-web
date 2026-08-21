/**
 * /api/claude-marketing.js
 * Vercel Serverless Function - 어드민 "AI 마케팅 & 데이터 분석 센터" 전용 Claude 프록시
 *
 * Claude API 키를 서버 환경변수(ANTHROPIC_API_KEY)에만 보관하고, 브라우저에는 절대 내려주지 않습니다.
 * (기존에는 관리자가 브라우저 localStorage에 개인 키를 저장했는데, RLS가 public으로 열려있는
 *  Supabase에 저장하면 anon key만 알면 누구나 키를 읽어갈 수 있어 서버 프록시 방식으로 전환했습니다.)
 *
 * POST /api/claude-marketing
 * headers: { 'x-admin-token': string }  ← 어드민 로그인 비밀번호와 동일한 값
 * body: { model, system, prompt, maxTokens }
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_TOKEN = process.env.VITE_ADMIN_PASSWORD || 'immodel2024';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    if (!ANTHROPIC_API_KEY) {
        console.error('[claude-marketing] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
        return res.status(500).json({ error: 'Server configuration error: missing Claude API key.' });
    }

    const { model, system, prompt, maxTokens } = req.body || {};
    if (!model || !prompt) {
        return res.status(400).json({ error: 'model, prompt는 필수입니다.' });
    }

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens || 1500,
                thinking: { type: 'disabled' },
                system,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data?.error?.message || `Claude API 오류 (HTTP ${response.status})`;
            return res.status(response.status).json({ error: message });
        }

        const text = (data.content || [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();

        return res.status(200).json({
            text,
            usage: data.usage || {},
            stopReason: data.stop_reason,
        });
    } catch (error) {
        console.error('[claude-marketing] 호출 오류:', error.message);
        return res.status(500).json({ error: '네트워크 오류로 Claude API 호출에 실패했습니다.' });
    }
}
