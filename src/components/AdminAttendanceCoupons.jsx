import React, { useState, useEffect } from 'react';
import { fetchAttendanceCandidates, issueCoupon, fetchAllCoupons, COUPON_GOAL_DAYS } from '../services/attendanceService';

const AdminAttendanceCoupons = () => {
    const [candidates, setCandidates] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [issuingId, setIssuingId] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    const loadAll = async () => {
        setLoading(true);
        const [{ data: candidateData, error: candErr }, { data: couponData, error: couponErr }] = await Promise.all([
            fetchAttendanceCandidates(),
            fetchAllCoupons(),
        ]);
        if (candErr) setError('발급 대상자 조회 중 오류: ' + (candErr.message || String(candErr)));
        else if (couponErr) setError('프리패스 이력 조회 중 오류: ' + (couponErr.message || String(couponErr)));
        setCandidates(candidateData || []);
        setCoupons(couponData || []);
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleIssue = async (candidate) => {
        const name = candidate.name || candidate.nickname;
        if (!window.confirm(`${name}님에게 원데이클래스 참석 프리패스 1장을 발급하시겠습니까?\n(누적 유효출석 ${candidate.progress}일 기준)`)) return;
        setIssuingId(candidate.id);
        try {
            const { error: issueErr } = await issueCoupon(candidate.id, candidate.nickname, '어드민 수동발급');
            if (issueErr) throw issueErr;
            showSuccess(`✅ ${name}님에게 참석 프리패스가 발급되었습니다.`);
            await loadAll();
        } catch (err) {
            alert('발급 중 오류: ' + (err.message || String(err)));
        } finally {
            setIssuingId(null);
        }
    };

    return (
        <div className="animate-fadeIn min-h-screen pb-20">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#633AE8]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#633AE8] text-2xl font-black">confirmation_number</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[var(--moca-text)] tracking-tight">출석체크 참석 프리패스 관리</h2>
                        <p className="text-[var(--moca-text-3)] text-xs font-bold leading-none mt-1.5 opacity-70">
                            출석체크 + 모카그램 업로드 누적 {COUPON_GOAL_DAYS}일 달성자 확인 및 프리패스 발급
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadAll}
                    className="flex items-center gap-2 bg-white border border-[var(--moca-border)] text-[var(--moca-text-2)] px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all"
                >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    새로고침
                </button>
            </div>

            {successMsg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-[var(--moca-text)] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-bounce-short">{successMsg}</div>}
            {error && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-bounce-short">{error}</div>}

            {/* ── 발급 대상자 ── */}
            <div className="bg-white border border-[var(--moca-border)] rounded-[32px] overflow-hidden shadow-sm mb-8">
                <div className="p-6 border-b border-[var(--moca-border)] flex items-center justify-between">
                    <h3 className="font-black text-[var(--moca-text)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#633AE8] text-[18px]">military_tech</span>
                        프리패스 발급 대상자 ({candidates.length}명)
                    </h3>
                </div>
                <div className="p-6 overflow-x-auto">
                    {loading ? (
                        <div className="py-16 text-center text-[var(--moca-text-3)] font-black">불러오는 중...</div>
                    ) : candidates.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">hourglass_empty</span>
                            <p className="text-[var(--moca-text-3)] font-black">아직 {COUPON_GOAL_DAYS}일을 달성한 유저가 없습니다</p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-[var(--moca-border)] text-left">
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] uppercase tracking-widest">모델</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] uppercase">등급</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] text-center">누적 유효출석</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] text-center">현재 사이클 진행</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] text-center">기발급</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] text-center">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--moca-border)]">
                                {candidates.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#633AE8]/10 border border-[#633AE8]/20 flex items-center justify-center font-black text-[#633AE8] text-xs flex-shrink-0">
                                                    {(c.name || c.nickname || '?')[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[var(--moca-text)]">{c.name || c.nickname}</p>
                                                    <p className="text-[11px] font-bold text-[var(--moca-text-3)]">{c.phone || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-2.5 py-1 rounded-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[10px] font-black text-[var(--moca-text-2)] uppercase">{c.grade || 'SILVER'}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm font-black text-[var(--moca-text)]">{c.validDays}일</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-green-50 text-green-600 border border-green-200">
                                                {c.progress} / {COUPON_GOAL_DAYS}일
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-[var(--moca-text-3)]">{c.issuedCount}장</td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => handleIssue(c)}
                                                disabled={issuingId === c.id}
                                                className="px-4 py-2 rounded-xl text-[11px] font-black bg-[#633AE8] text-white hover:bg-[#5327c9] transition-all shadow-lg shadow-[#633AE8]/20 disabled:opacity-50"
                                            >
                                                {issuingId === c.id ? '처리 중...' : '프리패스 발급'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── 발급/사용 이력 ── */}
            <div className="bg-white border border-[var(--moca-border)] rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[var(--moca-border)]">
                    <h3 className="font-black text-[var(--moca-text)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--moca-text-3)] text-[18px]">history</span>
                        전체 프리패스 이력 ({coupons.length}건)
                    </h3>
                </div>
                <div className="p-6 overflow-x-auto">
                    {loading ? (
                        <div className="py-16 text-center text-[var(--moca-text-3)] font-black">불러오는 중...</div>
                    ) : coupons.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">inbox</span>
                            <p className="text-[var(--moca-text-3)] font-black">발급된 프리패스가 없습니다</p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-[var(--moca-border)] text-left">
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] uppercase tracking-widest">닉네임</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] text-center">상태</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] uppercase">발급일</th>
                                    <th className="px-4 py-3 text-[11px] font-black text-[var(--moca-text-3)] uppercase">사용 클래스</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--moca-border)]">
                                {coupons.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-black text-[var(--moca-text)]">{c.user_nickname}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${c.status === 'unused' ? 'bg-[#633AE8]/10 text-[#633AE8] border-[#633AE8]/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {c.status === 'unused' ? '사용가능' : '사용완료'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-[var(--moca-text-3)]">
                                            {c.issued_at ? new Date(c.issued_at).toLocaleDateString('ko-KR') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-[var(--moca-text-3)]">
                                            {c.classes?.title || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAttendanceCoupons;
