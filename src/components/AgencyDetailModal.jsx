import React from 'react';
import { getUserGrade } from '../services/userService';

const AgencyDetailModal = ({ agency, onClose, onWriteMemo, onSendProfile, sendInfo }) => {
    if (!agency) return null;

    const userGrade = getUserGrade();
    const naverMapsUrl = `https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`;

    // 투어일지 기록 가져오기
    let memos = [];
    try {
        const memosRaw = localStorage.getItem(`agency_memo_${agency.name}`);
        if (memosRaw) {
            memos = JSON.parse(memosRaw);
        }
    } catch (e) {
        console.error('Failed to parse agency memos:', e);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8E0FA] flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-[#F8F5FF] to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/10 flex items-center justify-center border border-[#6C63FF]/20 flex-shrink-0">
                            <span className="material-symbols-outlined text-[24px] text-[#6C63FF]">apartment</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-[#1F1235]">{agency.name}</h2>
                                <span className="text-[11px] font-bold text-[#6C63FF] bg-[#6C63FF]/10 px-2 py-0.5 rounded-md">
                                    {agency.category || 'MODEL'}
                                </span>
                            </div>
                            <p className="text-xs text-[#9CA3AF] mt-0.5">에이전시 상세 정보 및 투어 기록</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

                    {/* 기본정보 섹션 */}
                    <div className="bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">기본 정보</h3>

                        {/* 주소 */}
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-[18px] text-[#6C63FF] mt-0.5">location_on</span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[#1F1235] leading-snug">{agency.address || '주소 정보 없음'}</p>
                                <a
                                    href={naverMapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[12px] font-bold text-[#03C75A] hover:underline mt-1"
                                >
                                    <span>N 네이버 지도로 보기</span>
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </a>
                            </div>
                        </div>

                        {/* 전화번호 */}
                        {agency.phone && (
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-200/60">
                                <span className="material-symbols-outlined text-[18px] text-[#6C63FF]">call</span>
                                <a href={`tel:${agency.phone}`} className="text-sm font-bold text-[#6C63FF] hover:underline">
                                    {agency.phone}
                                </a>
                            </div>
                        )}

                        {/* 이메일 */}
                        {agency.email ? (
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-200/60">
                                <span className="material-symbols-outlined text-[18px] text-[#6C63FF]">mail</span>
                                {userGrade === 'GOLD' || userGrade === 'VIP' || userGrade === 'IMODEL' ? (
                                    <a href={`mailto:${agency.email}`} className="text-sm font-bold text-[#6C63FF] hover:underline">
                                        {agency.email}
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400 font-medium">
                                        🔒 이메일은 GOLD 등급 이상에게만 공개됩니다
                                    </span>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* 내가 남긴 투어일지 기록 */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-[#6C63FF]">edit_note</span>
                                <h3 className="text-sm font-black text-[#1F1235]">방문 투어일지 기록 ({memos.length}건)</h3>
                            </div>
                            <button
                                onClick={() => {
                                    onClose();
                                    onWriteMemo(agency);
                                }}
                                className="text-xs font-bold text-[#6C63FF] hover:underline flex items-center gap-0.5"
                            >
                                <span>+ 새 일지 작성</span>
                            </button>
                        </div>

                        {memos.length === 0 ? (
                            <div className="bg-[#F8F5FF]/50 border border-dashed border-[#E8E0FA] rounded-2xl p-5 text-center flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-[32px] text-[#A78BFA]/50">edit_off</span>
                                <p className="text-xs text-gray-400 font-bold">아직 이 에이전시에 남긴 투어일지가 없습니다.</p>
                                <button
                                    onClick={() => {
                                        onClose();
                                        onWriteMemo(agency);
                                    }}
                                    className="mt-1 px-3 py-1.5 rounded-xl bg-[#6C63FF] text-white text-xs font-black hover:bg-[#5B52E0] transition-colors"
                                >
                                    투어일지 작성하기
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                {memos.map((memo, idx) => (
                                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <span className="font-bold text-[#6C63FF]">{memo.date || '날짜 미상'}</span>
                                            {memo.status && (
                                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 font-bold">
                                                    {memo.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#1F1235] font-medium leading-relaxed whitespace-pre-wrap">{memo.text || memo.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 프로필 발송 정보 및 신중한 발송 안내 */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
                            <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                            <span>프로필 발송 전 확인</span>
                        </div>
                        <p className="text-[12px] text-emerald-950 font-medium leading-relaxed">
                            에이전시 상세 정보와 과거 투어 기록을 꼼꼼히 확인하셨나요?  
                            {sendInfo?.sent ? (
                                <span className="block mt-1 text-emerald-700 font-bold">
                                    ✓ 최근 발송 완료됨 ({sendInfo.lastSentStr})
                                </span>
                            ) : (
                                <span className="block mt-1 text-gray-500">
                                    신중하고 격식 있는 프로필 발송은 에이전시와의 좋은 인연을 만드는 첫걸음입니다.
                                </span>
                            )}
                        </p>
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
                    <button
                        onClick={() => {
                            onClose();
                            onWriteMemo(agency);
                        }}
                        className="flex-1 py-3 rounded-xl bg-white border border-[#9B8AFB]/40 hover:bg-[#6C63FF]/10 text-[#6C63FF] font-black text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        투어일지 작성
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            onSendProfile(agency);
                        }}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        프로필 발송하기
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AgencyDetailModal;
