import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';

// 임시 결제 테스트 페이지 (토스 테스트키, 실제 청구 없음). 테스트 끝나면 삭제.
// 목적: 모카 Android 앱(Capacitor WebView)에서 토스 결제창/카드앱 왕복이 끝까지 되는지 확인.
const TEST_CLIENT_KEY = 'test_ck_Z1aOwX7K8mBQkwajndPa3yQxzvNP';

const PayTest = () => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    const auto = params.get('auto') === '1';
    const [log, setLog] = useState([]);
    const add = (m) => setLog((l) => [...l, m]);

    const pay = async () => {
        try {
            const toss = await loadTossPayments(TEST_CLIENT_KEY);
            const payment = toss.payment({ customerKey: ANONYMOUS });
            const base = window.location.origin + '/paytest';
            await payment.requestPayment({
                method: 'CARD',
                amount: { currency: 'KRW', value: 1000 },
                orderId: 'paytest_' + Date.now(),
                orderName: '모카 결제 테스트',
                successUrl: base + '?result=success',
                failUrl: base + '?result=fail',
            });
        } catch (e) {
            add('requestPayment 오류: ' + (e.code || '') + ' ' + (e.message || e));
        }
    };

    // B안: 외부 브라우저(Chrome Custom Tab)에서 결제 → 성공 페이지에서 앱으로 복귀
    const payViaBrowser = () => Browser.open({ url: window.location.origin + '/paytest?auto=1' });

    // 페이앱: 서버에서 결제요청 → payurl 을 크롬 커스텀 탭으로 열기
    const payApp = async () => {
        try {
            const r = await fetch('/api/payapp-test', { method: 'POST' });
            const j = await r.json();
            if (!j.payurl) return add('페이앱 오류: ' + (j.error || '알 수 없음'));
            add('결제요청 번호: ' + j.mul_no);
            await Browser.open({ url: j.payurl });
        } catch (e) {
            add('페이앱 오류: ' + (e.message || e));
        }
    };

    useEffect(() => { if (auto && !result) pay(); }, []); // eslint-disable-line

    return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.7 }}>
            <h2 style={{ fontWeight: 900 }}>모카 결제 테스트 (1,000원 / 테스트키)</h2>
            <p>플랫폼: {Capacitor.isNativePlatform() ? '앱(네이티브)' : '일반 브라우저'}</p>
            <p style={{ wordBreak: 'break-all', color: '#888', fontSize: 11 }}>{navigator.userAgent}</p>

            {params.get('payapp') === 'return' && (
                <div style={{ background: '#e8f7ee', padding: 12, borderRadius: 8, margin: '12px 0' }}>
                    ✅ 페이앱 결제창 → returnurl 도착
                    <a href="immodel://paytest" style={{ display: 'block', marginTop: 10, fontWeight: 900 }}>▶ 모카 앱으로 돌아가기</a>
                </div>
            )}
            {result === 'success' && (
                <div style={{ background: '#e8f7ee', padding: 12, borderRadius: 8, margin: '12px 0' }}>
                    ✅ 결제창 왕복 성공 (success 리다이렉트 도착)
                    <div style={{ wordBreak: 'break-all', fontSize: 11 }}>paymentKey: {params.get('paymentKey')}</div>
                    <a href="immodel://paytest" style={{ display: 'block', marginTop: 10, fontWeight: 900 }}>▶ 모카 앱으로 돌아가기</a>
                </div>
            )}
            {result === 'fail' && (
                <div style={{ background: '#fdecec', padding: 12, borderRadius: 8, margin: '12px 0' }}>
                    ❌ 실패: {params.get('code')} / {params.get('message')}
                </div>
            )}

            <button onClick={pay} style={btn}>A안: 앱 화면 안에서 바로 결제</button>
            <button onClick={payViaBrowser} style={{ ...btn, background: '#0ea5e9' }}>B안: 외부 브라우저로 결제 후 복귀</button>
            <button onClick={payApp} style={{ ...btn, background: '#10b981' }}>페이앱: 외부 브라우저로 결제 후 복귀 (1,000원)</button>
            {log.map((l, i) => <p key={i} style={{ color: '#c00' }}>{l}</p>)}
        </div>
    );
};

const btn = { display: 'block', width: '100%', padding: 14, margin: '10px 0', background: '#4f46e5', color: '#fff', border: 0, borderRadius: 12, fontWeight: 900, fontSize: 15 };

export default PayTest;
