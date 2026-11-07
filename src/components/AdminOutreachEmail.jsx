import React, { useEffect, useMemo, useState } from 'react';
import { buildOutreachRecipients } from '../utils/castingContacts';
import { fetchOutreachStats, sendOutreachBatch, sendOutreachTest } from '../services/outreachEmailService';

// 업체 대상 홍보 메일: 업체 체크 → 분할 발송 → 열람/클릭/반송 모니터링 (관리자 전용)
// 광고 메일이라 (광고) 표기·수신거부·야간 차단·수신거부 업체 제외·반송률 자동 중단은 서버(outreach-email 함수)가 강제한다.
const MAX_PER_BATCH = 50;
const DEFAULT_SUBJECT = '(광고) 광고모델을 찾으세요? 모카에서 찾으세요';
const DEFAULT_CAMPAIGN = '2026-11 업체 초대';

const STATUS_LABEL = {
    none: ['미발송', 'bg-gray-100 text-gray-500'],
    sent: ['발송', 'bg-blue-50 text-blue-600'],
    delivered: ['도달', 'bg-blue-50 text-blue-600'],
    opened: ['열람', 'bg-amber-50 text-amber-700'],
    clicked: ['클릭', 'bg-emerald-50 text-emerald-700'],
    bounced: ['반송', 'bg-red-50 text-red-600'],
    complained: ['스팸신고', 'bg-red-50 text-red-600'],
    failed: ['실패', 'bg-red-50 text-red-600'],
    unsub: ['수신거부', 'bg-gray-200 text-gray-600'],
};

const pct = (n, d) => (d > 0 ? `${(n / d * 100).toFixed(1)}%` : '-');
const fmt = (v) => (v ? new Date(v).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

const AdminOutreachEmail = ({ castings }) => {
    const [campaignName, setCampaignName] = useState(DEFAULT_CAMPAIGN);
    const [subject, setSubject] = useState(DEFAULT_SUBJECT);
    const [testTo, setTestTo] = useState('immodelkr@gmail.com');
    const [stats, setStats] = useState({ campaigns: [], sends: [], unsubscribed: [] });
    const [selected, setSelected] = useState(new Set());
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const recipients = useMemo(() => buildOutreachRecipients(castings), [castings]);

    const loadStats = async () => {
        const r = await fetchOutreachStats();
        if (r.success) setStats({ campaigns: r.campaigns, sends: r.sends, unsubscribed: r.unsubscribed });
        else setMessage(`현황 조회 실패: ${r.error}`);
    };
    useEffect(() => { loadStats(); }, []);

    const campaign = stats.campaigns.find((c) => c.name === campaignName.trim());
    const sends = useMemo(() => stats.sends.filter((s) => campaign && s.campaign_id === campaign.id), [stats.sends, campaign]);
    const sendByEmail = useMemo(() => new Map(sends.map((s) => [s.email, s])), [sends]);
    const unsubSet = useMemo(() => new Set(stats.unsubscribed), [stats.unsubscribed]);

    const statusOf = (email) => {
        if (unsubSet.has(email)) return 'unsub';
        const s = sendByEmail.get(email);
        if (!s) return 'none';
        if (s.clicked_at) return 'clicked';
        if (s.status === 'bounced' || s.status === 'complained' || s.status === 'failed') return s.status;
        if (s.opened_at) return 'opened';
        return s.status === 'delivered' ? 'delivered' : 'sent';
    };

    const rows = useMemo(() => recipients.map((r) => ({ ...r, st: statusOf(r.email) })), [recipients, sendByEmail, unsubSet]);
    const FILTERS = [
        ['all', '전체', () => true],
        ['none', '미발송', (r) => r.st === 'none'],
        ['sent', '발송됨', (r) => !['none', 'unsub'].includes(r.st)],
        ['clicked', '클릭', (r) => r.st === 'clicked'],
        ['bad', '반송·수신거부', (r) => ['bounced', 'complained', 'failed', 'unsub'].includes(r.st)],
    ];
    const visible = rows.filter(FILTERS.find((f) => f[0] === filter)[2]);
    const unsentRows = rows.filter((r) => r.st === 'none' || r.st === 'failed');

    // 요약 지표
    const counted = sends.filter((s) => s.status !== 'queued' && s.status !== 'failed');
    const n = counted.length;
    const delivered = counted.filter((s) => s.delivered_at || s.status === 'delivered').length;
    const bounced = counted.filter((s) => s.status === 'bounced' || s.status === 'complained').length;
    const opened = counted.filter((s) => s.opened_at).length;
    const clicked = counted.filter((s) => s.clicked_at).length;

    const batches = useMemo(() => {
        const m = new Map();
        for (const s of counted) {
            const b = m.get(s.batch_no) || { no: s.batch_no, at: s.sent_at, n: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
            b.n++; b.delivered += (s.delivered_at || s.status === 'delivered') ? 1 : 0; b.opened += s.opened_at ? 1 : 0;
            b.clicked += s.clicked_at ? 1 : 0; b.bounced += (s.status === 'bounced' || s.status === 'complained') ? 1 : 0;
            if (s.sent_at && (!b.at || s.sent_at < b.at)) b.at = s.sent_at;
            m.set(s.batch_no, b);
        }
        return Array.from(m.values()).sort((a, b) => a.no - b.no);
    }, [counted]);

    const toggle = (email) => setSelected((prev) => { const next = new Set(prev); next.has(email) ? next.delete(email) : next.add(email); return next; });
    const pickFirst = () => setSelected(new Set(unsentRows.slice(0, MAX_PER_BATCH).map((r) => r.email)));

    const handleTest = async () => {
        setBusy(true); setMessage('');
        const r = await sendOutreachTest(testTo.trim(), subject);
        setBusy(false);
        setMessage(r.success ? `테스트 메일을 ${testTo}로 보냈습니다.` : `테스트 발송 실패: ${r.error}`);
    };

    const handleSend = async () => {
        const list = rows.filter((r) => selected.has(r.email) && (r.st === 'none' || r.st === 'failed'));
        if (list.length === 0) { setMessage('발송할 업체를 선택해 주세요. (미발송 업체만 선택됩니다)'); return; }
        if (!window.confirm(`${list.length}곳에 홍보 메일을 발송할까요?\n\n캠페인: ${campaignName}\n제목: ${subject.startsWith('(광고)') ? subject : `(광고) ${subject}`}\n\n※ 발송 후에는 취소할 수 없습니다. 수신거부 업체는 자동 제외됩니다.`)) return;
        setBusy(true); setMessage('발송 중입니다... (1곳당 약 1초, 창을 닫지 마세요)');
        const r = await sendOutreachBatch({ campaignName: campaignName.trim(), subject, recipients: list.map(({ email, companyName }) => ({ email, companyName })) });
        setBusy(false);
        if (!r.success) { setMessage(`발송 실패: ${r.error}`); return; }
        setMessage(`배치 ${r.batchNo ?? '-'} 발송 완료 · 성공 ${r.sent}건 / 실패 ${r.failed}건 · 수신거부 제외 ${r.skippedUnsub}건 · 중복 제외 ${r.skippedDup}건`);
        setSelected(new Set());
        loadStats();
    };

    const cardCls = 'rounded-xl border border-[var(--moca-border)] bg-white px-3 py-2 text-center';
    const inputCls = 'w-full border border-[var(--moca-border)] rounded-lg px-2.5 py-1.5 text-sm font-bold text-[var(--moca-text)] bg-white';

    return (
        <div className="mb-5 border border-[var(--moca-border)] rounded-xl p-4 bg-[var(--moca-surface-2)]">
            <p className="text-sm font-black text-[var(--moca-text)] mb-3">📧 업체 홍보 메일 발송 <span className="text-[var(--moca-text-3)] font-bold">· 받는 곳 {recipients.length}곳</span></p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <label className="block"><span className="block text-[11px] text-[var(--moca-text-3)] font-bold mb-1">캠페인 이름 (같은 이름이면 중복 발송을 막고 통계를 합산)</span>
                    <input className={inputCls} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></label>
                <label className="block"><span className="block text-[11px] text-[var(--moca-text-3)] font-bold mb-1">메일 제목 ((광고)는 자동으로 붙습니다)</span>
                    <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <input className={`${inputCls} max-w-[240px]`} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="테스트 받을 이메일" />
                <button onClick={handleTest} disabled={busy} className="px-3 py-1.5 rounded-lg border border-[var(--moca-border)] bg-white text-xs font-black text-[var(--moca-text)] disabled:opacity-40">내게 테스트 발송</button>
            </div>

            {/* 요약 */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-1">
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">발송</p><p className="text-sm font-black">{n}</p></div>
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">도달</p><p className="text-sm font-black">{pct(delivered, n)}</p></div>
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">반송·신고</p><p className={`text-sm font-black ${n > 0 && bounced / n > 0.05 ? 'text-red-600' : ''}`}>{pct(bounced, n)}</p></div>
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">열람(추정)</p><p className="text-sm font-black">{pct(opened, n)}</p></div>
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">클릭</p><p className="text-sm font-black text-emerald-600">{pct(clicked, n)}</p></div>
                <div className={cardCls}><p className="text-[10px] text-[var(--moca-text-3)] font-bold">등록 전환</p><p className="text-sm font-black text-[var(--moca-text-3)]">준비중</p></div>
            </div>
            <p className="text-[10px] text-[var(--moca-text-3)] mb-4">열람은 메일 앱이 이미지를 미리 불러오면 실제보다 높게 잡힐 수 있어 참고용입니다. 판단은 클릭 기준으로 하세요. 도달·반송·열람은 Resend 웹훅 연결 후 집계됩니다.</p>

            {batches.length > 0 && (
                <div className="overflow-x-auto mb-4">
                    <table className="w-full text-xs">
                        <thead><tr className="text-left text-[10px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                            <th className="py-1.5 pr-3">배치</th><th className="py-1.5 pr-3">발송 시작</th><th className="py-1.5 pr-3">발송</th><th className="py-1.5 pr-3">도달</th><th className="py-1.5 pr-3">열람</th><th className="py-1.5 pr-3">클릭</th><th className="py-1.5 pr-3">반송</th>
                        </tr></thead>
                        <tbody>{batches.map((b) => (
                            <tr key={b.no} className="border-b border-[var(--moca-border)] last:border-0">
                                <td className="py-1.5 pr-3 font-bold">{b.no}차</td><td className="py-1.5 pr-3">{fmt(b.at)}</td><td className="py-1.5 pr-3">{b.n}</td>
                                <td className="py-1.5 pr-3">{pct(b.delivered, b.n)}</td><td className="py-1.5 pr-3">{pct(b.opened, b.n)}</td>
                                <td className="py-1.5 pr-3 font-bold text-emerald-600">{pct(b.clicked, b.n)}</td><td className="py-1.5 pr-3">{pct(b.bounced, b.n)}</td>
                            </tr>))}</tbody>
                    </table>
                </div>
            )}

            {/* 업체 목록 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {FILTERS.map(([key, label, test]) => (
                    <button key={key} onClick={() => setFilter(key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${filter === key ? 'bg-[var(--moca-primary)] text-white border-transparent' : 'bg-white text-[var(--moca-text-3)] border-[var(--moca-border)]'}`}>
                        {label} {rows.filter(test).length}
                    </button>
                ))}
                <button onClick={pickFirst} className="ml-auto text-[11px] font-black text-[var(--moca-primary)]">미발송 앞 {MAX_PER_BATCH}곳 선택</button>
                <button onClick={() => setSelected(new Set())} className="text-[11px] font-bold text-[var(--moca-text-3)]">선택 해제</button>
                <button onClick={loadStats} className="text-[11px] font-bold text-[var(--moca-text-3)]">새로고침</button>
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto mb-3">
                <table className="w-full text-xs">
                    <thead><tr className="text-left text-[10px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)] sticky top-0 bg-[var(--moca-surface-2)]">
                        <th className="py-1.5 pr-2 w-6"></th><th className="py-1.5 pr-3">업체명</th><th className="py-1.5 pr-3">이메일</th><th className="py-1.5 pr-3">상태</th><th className="py-1.5 pr-3">발송</th><th className="py-1.5 pr-3">클릭</th>
                    </tr></thead>
                    <tbody>{visible.map((r) => {
                        const s = sendByEmail.get(r.email);
                        const canPick = r.st === 'none' || r.st === 'failed';
                        const [label, cls] = STATUS_LABEL[r.st];
                        return (
                            <tr key={r.email} className="border-b border-[var(--moca-border)] last:border-0">
                                <td className="py-1.5 pr-2"><input type="checkbox" disabled={!canPick} checked={selected.has(r.email)} onChange={() => toggle(r.email)} /></td>
                                <td className="py-1.5 pr-3 font-bold text-[var(--moca-text)]">{r.companyName || '-'}</td>
                                <td className="py-1.5 pr-3 text-[var(--moca-text-3)]">{r.email}</td>
                                <td className="py-1.5 pr-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cls}`}>{label}</span></td>
                                <td className="py-1.5 pr-3 text-[var(--moca-text-3)]">{fmt(s?.sent_at)}</td>
                                <td className="py-1.5 pr-3 text-[var(--moca-text-3)]">{s?.click_count || 0}</td>
                            </tr>);
                    })}</tbody>
                </table>
            </div>

            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold min-h-[1rem]">{message}</p>
                <button onClick={handleSend} disabled={busy || selected.size === 0}
                    className="px-4 py-2 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40 flex-shrink-0">
                    선택 {selected.size}곳 발송 (1회 최대 {MAX_PER_BATCH}곳)
                </button>
            </div>
        </div>
    );
};

export default AdminOutreachEmail;
