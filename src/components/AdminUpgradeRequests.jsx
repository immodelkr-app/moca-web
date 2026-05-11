import React, { useState, useEffect } from 'react';
import { fetchUpgradeRequests, approveUpgradeRequest, rejectUpgradeRequest } from '../services/adminService';

const STATUS_MAP = {
    pending: { label: '대기 중', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    approved: { label: '승인됨', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    rejected: { label: '반려됨', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const AdminUpgradeRequests = ({ setSuccessMsg, setError }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedSignature, setSelectedSignature] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data, error } = await fetchUpgradeRequests();
        if (error) {
            setError?.('신청 내역을 불러오는데 실패했습니다: ' + error.message);
        } else {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleApprove = async (req) => {
        if (!window.confirm(`${req.member_name}님의 활동 등업 신청을 승인하시겠습니까?\n회원 등급이 GOLD로 변경됩니다.`)) return;
        
        const { error } = await approveUpgradeRequest(req.id, req.user_nickname, req.plan_months);
        if (error) {
            setError?.('승인 처리 중 오류가 발생했습니다: ' + error.message);
        } else {
            setSuccessMsg?.('✅ 승인 처리가 완료되었습니다.');
            loadData();
            setTimeout(() => setSuccessMsg?.(''), 3000);
        }
    };

    const handleReject = async (req) => {
        if (!window.confirm(`${req.member_name}님의 활동 등업 신청을 반려하시겠습니까?`)) return;

        const { error } = await rejectUpgradeRequest(req.id);
        if (error) {
            setError?.('반려 처리 중 오류가 발생했습니다: ' + error.message);
        } else {
            setSuccessMsg?.('반려 처리가 완료되었습니다.');
            loadData();
            setTimeout(() => setSuccessMsg?.(''), 3000);
        }
    };

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
    }) : '-';

    return (
        <div className="animate-fadeIn space-y-6">
            {/* 통계 요약 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-1 rounded-lg">pending_actions</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">대기 중</span>
                    </div>
                    <p className="text-3xl font-black text-amber-700">
                        {requests.filter(r => r.status === 'pending').length}
                        <span className="text-base text-gray-400 ml-1">건</span>
                    </p>
                </div>
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-1 rounded-lg">check_circle</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">승인 완료</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-700">
                        {requests.filter(r => r.status === 'approved').length}
                        <span className="text-base text-gray-400 ml-1">건</span>
                    </p>
                </div>
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-red-600 bg-red-50 p-1 rounded-lg">cancel</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">반려됨</span>
                    </div>
                    <p className="text-3xl font-black text-red-700">
                        {requests.filter(r => r.status === 'rejected').length}
                        <span className="text-base text-gray-400 ml-1">건</span>
                    </p>
                </div>
            </div>

            {/* 필터 바 */}
            <div className="flex items-center gap-2">
                {['pending', 'approved', 'rejected', 'all'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            filter === f 
                            ? 'bg-[var(--moca-primary)] text-white border-[var(--moca-primary)] shadow-md' 
                            : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 shadow-sm'
                        }`}
                    >
                        {f === 'all' ? '전체' : (STATUS_MAP[f]?.label || f)}
                        {` (${f === 'all' ? requests.length : requests.filter(r => r.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* 신청 목록 */}
            {loading ? (
                <div className="text-center py-20 text-[var(--moca-text-3)]">
                    <div className="w-10 h-10 border-4 border-gray-100 border-t-[var(--moca-primary)] rounded-full animate-spin mx-auto mb-4" />
                    데이터를 불러오는 중입니다...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-3">inbox</span>
                    <p className="text-gray-400 font-bold">신청 내역이 없습니다</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map(req => {
                        const st = STATUS_MAP[req.status] || STATUS_MAP.pending;
                        return (
                            <div key={req.id} className={`bg-white border rounded-2xl p-5 transition-all shadow-sm hover:shadow-md ${req.status === 'pending' ? 'border-amber-100' : 'border-gray-100'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className="text-gray-900 font-black text-base">{req.member_name}</span>
                                            <span className="text-gray-400 text-xs font-bold">({req.user_nickname})</span>
                                            <span className={`text-[10px] font-black rounded-full px-2.5 py-0.5 border ${st.bg} ${st.color} ${st.border}`}>
                                                {st.label}
                                            </span>
                                            <span className="text-indigo-600 text-[10px] font-black bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
                                                {req.plan_months}개월 활동 신청
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="material-symbols-outlined text-[14px]">call</span>
                                                <span>{req.member_phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                <span>신청일: {formatDate(req.created_at)}</span>
                                            </div>
                                            {req.approved_at && (
                                                <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                                    <span>승인일: {formatDate(req.approved_at)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <button 
                                            onClick={() => setSelectedSignature(req.signature_image)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-gray-100 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">draw</span>
                                            서명 확인
                                        </button>
                                        
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleReject(req)}
                                                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black border border-red-100 hover:bg-red-100 transition-all"
                                                >
                                                    반려
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(req)}
                                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                                                >
                                                    승인
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 서명 보기 모달 */}
            {selectedSignature && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedSignature(null)}
                    />
                    <div className="relative bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-scaleUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600">draw</span>
                                신청자 서명
                            </h3>
                            <button 
                                onClick={() => setSelectedSignature(null)}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-4">
                            <img 
                                src={selectedSignature} 
                                alt="Signature" 
                                className="w-full h-auto object-contain max-h-[300px]"
                            />
                        </div>
                        <button 
                            onClick={() => setSelectedSignature(null)}
                            className="w-full mt-6 py-4 rounded-2xl bg-gray-900 text-white font-black hover:bg-black transition-all"
                        >
                            확인 완료
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUpgradeRequests;
