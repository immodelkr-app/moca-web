import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMarketingConsent } from '../hooks/useMarketingConsent';

const DISMISS_KEY = 'casting_consent_dismissed_at';
const DISMISS_DAYS = 7;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.immodel.mocapp';

const isDismissed = () => {
    try {
        const at = Number(localStorage.getItem(DISMISS_KEY));
        return !!at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');

/**
 * 모카캐스팅 게시판 상단 — 마케팅 수신 동의 카드 (선택 동의)
 * 새 공고/새 에이전시 리스트 소식을 받아보겠다고 동의한 회원에게만 푸시·문자·톡 안내를 보낼 수 있게 한다.
 * 동의하지 않아도 공고 열람에는 제한이 없고, "나중에"를 누르면 7일간 숨긴다.
 * (GOLD 미만 회원은 이 화면에 들어올 수 없어, 같은 동의는 GOLD 안내 팝업에서 받는다 — GoldGateModal 참고)
 */
const CastingConsentCard = () => {
    const { user, checking, alreadyAgreed, saving, error, agree } = useMarketingConsent();
    const [dismissed, setDismissed] = useState(isDismissed());
    const [step, setStep] = useState('card'); // 'card' | 'sheet' | 'done'
    const [checked, setChecked] = useState(false);

    if (!user || user.user_type === 'company' || checking) return null;
    if (step !== 'done' && (alreadyAgreed || dismissed)) return null;

    const handleDismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* 저장 불가여도 이번 화면에서만 숨김 */ }
        setDismissed(true);
    };

    const handleAgree = async () => {
        if (!checked) return;
        if (await agree()) setStep('done');
    };

    if (step === 'done') {
        const native = Capacitor.isNativePlatform();
        return (
            <div className="mb-4 rounded-2xl border border-[#E8E0FA] bg-[#FAF8FF] p-4">
                <p className="text-[14px] font-black text-[#1F1235]">알림 신청이 완료됐어요 🎉</p>
                <p className="text-[12px] font-bold text-[#6B7280] mt-1 leading-relaxed">
                    모카캐스팅 새 공고와 새 에이전시 리스트 소식을 알려드릴게요.
                    {native && ' 알림 허용 창이 뜨면 "허용"을 눌러주세요.'}
                </p>
                {!native && (
                    isIos() ? (
                        <p className="text-[11px] font-bold text-[#9CA3AF] mt-2 leading-relaxed">아이폰은 모카 앱이 없어 푸시 알림은 받을 수 없고, 문자·카카오톡으로 소식을 받으실 수 있어요.</p>
                    ) : (
                        <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer noopener" className="inline-block mt-2 px-3.5 py-2 rounded-xl bg-[#9333EA] text-white text-[12px] font-black">
                            앱 설치하고 푸시로도 받기
                        </a>
                    )
                )}
            </div>
        );
    }

    return (
        <>
            <div className="mb-4 rounded-2xl border border-[#E8E0FA] bg-gradient-to-br from-[#FAF8FF] to-[#F3E8FF] p-4">
                <p className="text-[14px] font-black text-[#1F1235]">새 공고를 놓치지 마세요 📢</p>
                <p className="text-[12px] font-bold text-[#6B7280] mt-1 leading-relaxed">
                    마케팅 수신에 동의하면 모카캐스팅 새 공고와 새 에이전시 리스트 소식을 바로 받아볼 수 있어요.
                </p>
                <div className="flex gap-2 mt-3">
                    <button onClick={() => setStep('sheet')} className="px-4 py-2 rounded-xl bg-[#9333EA] text-white text-[12px] font-black active:scale-95 transition-all">알림 받기</button>
                    <button onClick={handleDismiss} className="px-4 py-2 rounded-xl border border-[#E8E0FA] bg-white text-[#9CA3AF] text-[12px] font-black active:scale-95 transition-all">나중에</button>
                </div>
            </div>

            {step === 'sheet' && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-6" onClick={() => !saving && setStep('card')}>
                    <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-[16px] font-black text-[#1F1235] mb-3">마케팅 정보 수신 동의 (선택)</h3>
                        <dl className="space-y-2.5 text-[12px] leading-relaxed">
                            <div>
                                <dt className="font-black text-[#7C3AED]">받는 내용</dt>
                                <dd className="font-bold text-[#4B3F6B]">모카캐스팅 새 공고, 새 에이전시 리스트</dd>
                            </div>
                            <div>
                                <dt className="font-black text-[#7C3AED]">받는 방법</dt>
                                <dd className="font-bold text-[#4B3F6B]">앱 푸시 · 문자 · 카카오톡</dd>
                            </div>
                            <div>
                                <dt className="font-black text-[#7C3AED]">해제 방법</dt>
                                <dd className="font-bold text-[#4B3F6B]">마이페이지의 &quot;마케팅 정보 수신 및 활용 동의&quot;를 해제하면 언제든 중단됩니다.</dd>
                            </div>
                        </dl>
                        <p className="text-[11px] font-bold text-[#9CA3AF] mt-3 leading-relaxed">동의하지 않아도 모카캐스팅 공고는 그대로 이용하실 수 있어요.</p>

                        <label className="flex items-start gap-2.5 mt-4 p-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 rounded-lg text-[#9333EA]" />
                            <span className="text-[12px] font-bold text-[#1F1235]">위 내용을 확인했으며 마케팅 정보 수신에 동의합니다. (선택)</span>
                        </label>

                        {error && <p className="text-[11px] font-bold text-red-500 mt-2">{error}</p>}

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setStep('card')} disabled={saving} className="flex-1 py-3 rounded-2xl border border-[#E8E0FA] text-[#6B7280] text-[13px] font-black disabled:opacity-40">취소</button>
                            <button onClick={handleAgree} disabled={!checked || saving} className="flex-1 py-3 rounded-2xl bg-[#9333EA] text-white text-[13px] font-black disabled:opacity-40 active:scale-95 transition-all">
                                {saving ? '저장 중...' : '동의하고 받기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CastingConsentCard;
