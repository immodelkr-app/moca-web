/**
 * cardNewsRenderer.js
 * 카드뉴스 캔버스 렌더러 - 외부 라이브러리 없이 Canvas 2D API로 1080x1080 이미지를 그린다.
 */

export const CARD_SIZE = 1080;

export const BRAND = {
    primary: '#9333EA',
    primary2: '#7C3AED',
    accent: '#C084FC',
    text: '#1F1235',
    text2: '#5B4E7A',
    surface: '#FFFFFF',
    surface2: '#F8F5FF',
};

const FONT = "Pretendard, 'Noto Sans KR', sans-serif";

function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let current = '';
    for (const ch of String(text || '')) {
        const test = current + ch;
        if (current && ctx.measureText(test).width > maxWidth) {
            lines.push(current);
            current = ch;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, align = 'center') {
    ctx.textAlign = align;
    const lines = wrapText(ctx, text, maxWidth);
    lines.forEach((line, i) => {
        ctx.fillText(line, x, y + i * lineHeight);
    });
    return lines.length * lineHeight;
}

function fillRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.rect(x, y, w, h);
    }
    ctx.fill();
}

function drawWatermark(ctx, color = 'rgba(255,255,255,0.85)') {
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText('MOCA', CARD_SIZE / 2, CARD_SIZE - 60);
}

function prepareCanvas(canvas) {
    canvas.width = CARD_SIZE;
    canvas.height = CARD_SIZE;
    return canvas.getContext('2d');
}

/** 통계강조형: 큰 숫자 + 라벨을 그라디언트 배경에 강조 */
export async function drawStatCard(canvas, { label = '', value = '', unit = '', sublabel = '' }) {
    const ctx = prepareCanvas(canvas);

    const grad = ctx.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE);
    grad.addColorStop(0, BRAND.primary);
    grad.addColorStop(1, BRAND.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

    ctx.fillStyle = '#fff';
    ctx.font = `700 44px ${FONT}`;
    drawWrappedText(ctx, label, CARD_SIZE / 2, 300, 860, 56);

    ctx.font = `900 220px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${value}${unit}`, CARD_SIZE / 2, 620);

    if (sublabel) {
        ctx.font = `500 36px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        drawWrappedText(ctx, sublabel, CARD_SIZE / 2, 720, 800, 46);
    }

    drawWatermark(ctx);
}

function loadImageSafe(url) {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/** 클래스홍보형: 상단 이미지(있으면) + 하단 텍스트 오버레이 */
export async function drawClassPromoCard(canvas, { title = '', schedule = '', priceInfo = '', imageUrl = '' }) {
    const ctx = prepareCanvas(canvas);

    let img = await loadImageSafe(imageUrl);
    if (img) {
        try {
            const scale = Math.max(CARD_SIZE / img.width, CARD_SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (CARD_SIZE - w) / 2, (CARD_SIZE - h) / 2, w, h);
        } catch {
            img = null;
        }
    }
    if (!img) {
        const grad = ctx.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE);
        grad.addColorStop(0, BRAND.primary2);
        grad.addColorStop(1, BRAND.primary);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
    }

    // 하단 텍스트 가독성을 위한 그라디언트 오버레이
    const overlay = ctx.createLinearGradient(0, CARD_SIZE * 0.42, 0, CARD_SIZE);
    overlay.addColorStop(0, 'rgba(31,18,53,0)');
    overlay.addColorStop(1, 'rgba(31,18,53,0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, CARD_SIZE * 0.42, CARD_SIZE, CARD_SIZE * 0.58);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText('MOCA CLASS', 70, CARD_SIZE - 330);

    ctx.font = `900 64px ${FONT}`;
    const titleLines = wrapText(ctx, title, 940);
    let y = CARD_SIZE - 260;
    titleLines.forEach((line, i) => ctx.fillText(line, 70, y + i * 78));
    y += titleLines.length * 78 + 20;

    ctx.font = `500 34px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (schedule) {
        ctx.fillText(schedule, 70, y);
        y += 48;
    }
    if (priceInfo) {
        ctx.fillText(priceInfo, 70, y);
    }

    // CTA 알약 버튼
    const ctaText = '지금 신청하기 →';
    ctx.font = `700 30px ${FONT}`;
    const ctaWidth = ctx.measureText(ctaText).width + 60;
    ctx.fillStyle = '#fff';
    fillRoundedRect(ctx, 70, CARD_SIZE - 90, ctaWidth, 60, 30);
    ctx.fillStyle = BRAND.primary;
    ctx.textAlign = 'center';
    ctx.fillText(ctaText, 70 + ctaWidth / 2, CARD_SIZE - 50);
}

/** MOCA 앱 홍보형: 헤드라인 + 강조 포인트(불릿) + CTA */
export async function drawAppPromoCard(canvas, { headline = '', bullets = [], cta = '' }) {
    const ctx = prepareCanvas(canvas);

    ctx.fillStyle = BRAND.surface2;
    ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
    ctx.fillStyle = BRAND.primary;
    ctx.fillRect(0, 0, CARD_SIZE, 16);

    ctx.fillStyle = BRAND.text;
    ctx.textAlign = 'left';
    ctx.font = `900 56px ${FONT}`;
    const headLines = wrapText(ctx, headline, 900);
    let y = 190;
    headLines.forEach((line, i) => ctx.fillText(line, 90, y + i * 72));
    y += headLines.length * 72 + 60;

    ctx.font = `600 38px ${FONT}`;
    bullets.slice(0, 3).forEach((b) => {
        ctx.fillStyle = BRAND.primary;
        ctx.beginPath();
        ctx.arc(105, y - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BRAND.text2;
        const bLines = wrapText(ctx, b, 820);
        bLines.forEach((line, i) => ctx.fillText(line, 140, y + i * 46));
        y += bLines.length * 46 + 40;
    });

    if (cta) {
        ctx.font = `700 34px ${FONT}`;
        const ctaWidth = Math.max(320, ctx.measureText(cta).width + 100);
        ctx.fillStyle = BRAND.primary;
        fillRoundedRect(ctx, 90, CARD_SIZE - 180, ctaWidth, 90, 45);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(cta, 90 + ctaWidth / 2, CARD_SIZE - 128);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = BRAND.text2;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText('MOCA', CARD_SIZE - 70, CARD_SIZE - 60);
}

/** 인증샷 하이라이트형: 마케팅 동의한 인증샷(모카그램) 게시물을 소개하는 카드 */
export async function drawCertHighlightCard(canvas, { headline = '', activityType = '', caption = '', likes = 0, imageUrl = '' }) {
    const ctx = prepareCanvas(canvas);

    let img = await loadImageSafe(imageUrl);
    if (img) {
        try {
            const scale = Math.max(CARD_SIZE / img.width, CARD_SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (CARD_SIZE - w) / 2, (CARD_SIZE - h) / 2, w, h);
        } catch {
            img = null;
        }
    }
    if (!img) {
        const grad = ctx.createLinearGradient(0, 0, CARD_SIZE, CARD_SIZE);
        grad.addColorStop(0, BRAND.accent);
        grad.addColorStop(1, BRAND.primary2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
    }

    if (activityType) {
        ctx.font = `700 28px ${FONT}`;
        const badgeText = `📸 ${activityType}`;
        const badgeWidth = ctx.measureText(badgeText).width + 48;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        fillRoundedRect(ctx, 60, 60, badgeWidth, 56, 28);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(badgeText, 84, 98);
    }

    // 하단 텍스트 가독성을 위한 그라디언트 오버레이
    const overlay = ctx.createLinearGradient(0, CARD_SIZE * 0.45, 0, CARD_SIZE);
    overlay.addColorStop(0, 'rgba(31,18,53,0)');
    overlay.addColorStop(1, 'rgba(31,18,53,0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, CARD_SIZE * 0.45, CARD_SIZE, CARD_SIZE * 0.55);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `900 58px ${FONT}`;
    const headLines = wrapText(ctx, headline, 940);
    let y = CARD_SIZE - 300;
    headLines.forEach((line, i) => ctx.fillText(line, 70, y + i * 70));
    y += headLines.length * 70 + 24;

    if (caption) {
        ctx.font = `500 32px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const capLines = wrapText(ctx, `“${caption}”`, 940).slice(0, 2);
        capLines.forEach((line, i) => ctx.fillText(line, 70, y + i * 42));
        y += capLines.length * 42 + 20;
    }

    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`❤️ ${likes}`, 70, CARD_SIZE - 60);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('MOCA', CARD_SIZE - 70, CARD_SIZE - 60);
}

export const CARD_TEMPLATES = [
    { id: 'stat', label: '📊 통계강조형', draw: drawStatCard },
    { id: 'class', label: '🎓 클래스홍보형', draw: drawClassPromoCard },
    { id: 'app', label: '📱 MOCA 앱 홍보형', draw: drawAppPromoCard },
    { id: 'cert', label: '📸 인증샷 하이라이트형', draw: drawCertHighlightCard },
];
