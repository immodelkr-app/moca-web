import React from 'react';

// 클래스 상세 설명 서식 렌더러. 운영자가 일반 텍스트로 쓰는 관습 표기를 읽어 제목/목록/들여쓰기로 정리한다.
//   *제목        → 굵은 소제목        1) 제목 / 1. 제목 → 번호 소제목
//   -항목 / •항목 → 불릿(앞 공백 2칸 이상이면 들여쓰기)   : 설명 → 흐린 보조 설명
//   **강조**     → 굵게              빈 줄 → 문단 간격
//   ■항목 / ✓항목 → 점/체크 불릿 ("라벨: 내용"이면 라벨 굵게)   1~4주: 내용 → 기간 칩
// 표기가 없는 줄은 그대로 문단으로 표시되므로 기존 설명도 깨지지 않는다.
const renderInline = (text) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i} className="font-black text-[var(--moca-text)]">{part.slice(2, -2)}</strong> : part
    );

const ClassDescription = ({ text, className = '' }) => (
    <div className={`text-[var(--moca-text-2)] text-[15px] font-medium leading-[1.8] break-keep px-1 ${className}`}>
        {(text || '').split('\n').map((raw, i) => {
            const line = raw.replace(/\t+/g, '  ').replace(/\s+$/, '');
            const t = line.trim();
            const indent = line.match(/^ */)[0].length;
            if (!t) return <div key={i} className="h-3" />;

            const star = t.match(/^\*(?!\*)\s*(.+)/);
            if (star) return <p key={i} className="mt-4 font-black text-[var(--moca-text)]">{renderInline(star[1])}</p>;

            const num = t.match(/^(\d+)[.)]\s*(.+)/);
            if (num) return <p key={i} className="mt-4 font-black text-[var(--moca-text)]">{num[1]}. {renderInline(num[2])}</p>;

            const hash = t.match(/^#\s*(\d+\..+)/);
            if (hash) return <p key={i} className="font-black text-[var(--moca-text)]">{renderInline(hash[1])}</p>;

            // "1~4주: 내용" → 기간 칩 + 내용 (줄바꿈돼도 칩 아래로 흘러내리지 않음)
            const week = t.match(/^(\d+(?:\s*[~\-–]\s*\d+)?\s*주차?)\s*[:：]\s*(.+)/);
            if (week) return (
                <p key={i} className="flex gap-3 items-start mt-2">
                    <span className="flex-shrink-0 min-w-[3.5rem] text-center text-[12px] font-black leading-[1.8] px-2.5 rounded-full bg-indigo-50 text-indigo-600">{week[1].replace(/\s+/g, '')}</span>
                    <span className="flex-1 min-w-0">{renderInline(week[2])}</span>
                </p>
            );

            // -, •, ·, ■ 등 → 점 불릿 / ✓, ✔, ☑ → 체크 불릿. "라벨: 내용"이면 라벨을 굵게
            const bullet = t.match(/^([-•·■□●○◆◇▪▫]|[✓✔☑])\s*(.+)/);
            if (bullet) {
                const lab = bullet[2].match(/^([^:：]{1,10})[:：]\s*(.+)/);
                return (
                    <p key={i} className={`flex gap-2 ${indent >= 2 ? 'ml-5' : 'ml-1'}`}>
                        <span className="text-indigo-400 flex-shrink-0">{/[✓✔☑]/.test(bullet[1]) ? '✓' : '•'}</span>
                        <span className="flex-1 min-w-0">
                            {lab ? <><b className="font-black text-[var(--moca-text)]">{lab[1]}</b>{' '}{renderInline(lab[2])}</> : renderInline(bullet[2])}
                        </span>
                    </p>
                );
            }

            const colon = t.match(/^:\s*(.+)/);
            if (colon) return <p key={i} className="ml-3 text-[var(--moca-text-3)]">{renderInline(colon[1])}</p>;

            return <p key={i} className={indent >= 2 ? 'ml-3 text-[var(--moca-text-3)]' : ''}>{renderInline(t)}</p>;
        })}
    </div>
);

export default ClassDescription;
