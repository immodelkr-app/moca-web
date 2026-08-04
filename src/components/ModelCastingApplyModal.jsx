import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyToCastingWithNotification } from '../services/modelCastingService';

const ModelCastingApplyModal = ({ casting, role, currentUser, companyEmail, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const hasProfile = !!currentUser?.portfolio_link;

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const { error: applyError } = await applyToCastingWithNotification({
                roleId: role.id,
                castingId: casting.id,
                modelUserId: currentUser.id,
                modelData: currentUser,
                castingTitle: casting.title,
                roleName: role.role_name || '',
                companyName: casting.companies?.company_name || '업체',
                companyEmail,
            });

            if (applyError) {
                if (applyError.code === '23505') {
                    setError('이미 지원한 역할입니다.');
                } else {
                    setError('지원 중 오류가 발생했습니다: ' + (applyError.message || '다시 시도해주세요.'));
                }
                return;
            }
            setDone(true);
        } catch (err) {
            setError('지원 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
            <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl z-10 overflow-hidden animate-slideUp">
                {done ? (
                    <div className="px-8 pt-10 pb-[10vh] sm:pb-10 text-center">
                        <div className="w-16 h-16 bg-[#9333EA] rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-purple-500/30">
                            <span className="material-symbols-outlined text-3xl text-white">task_alt</span>
                        </div>
                        <h3 className="text-xl font-black text-[#1F1235] mb-2">지원 완료!</h3>
                        <p className="text-[#9CA3AF] text-sm font-bold leading-relaxed mb-8">
                            프로필이 업체에 전달되었습니다.<br />연락은 업체 담당자를 통해 직접 오니 참고해 주세요.
                        </p>
                        <button
                            onClick={() => onSuccess(role.id)}
                            className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm hover:opacity-90 active:scale-95 transition-all"
                        >
                            확인
                        </button>
                    </div>
                ) : !hasProfile ? (
                    <div className="px-8 pt-10 pb-[10vh] sm:pb-10 text-center">
                        <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mx-auto mb-5">
                            <span className="material-symbols-outlined text-3xl text-[#7C3AED]">person_edit</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-2">프로필 등록이 필요해요</h3>
                        <p className="text-[#9CA3AF] text-sm font-bold leading-relaxed mb-8">
                            지원 시 프로필관리에 등록된 정보가<br />업체에 전달돼요. 먼저 프로필을 등록해 주세요.
                        </p>
                        <button
                            onClick={() => navigate('/home/smart-profile')}
                            className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm hover:opacity-90 active:scale-95 transition-all"
                        >
                            프로필 등록하러 가기
                        </button>
                    </div>
                ) : (
                    <div className="px-7 pt-8 pb-[6vh] sm:pb-8">
                        <h3 className="text-lg font-black text-[#1F1235] mb-1">지원하시겠어요?</h3>
                        <p className="text-[12px] text-[#9CA3AF] font-bold mb-5">{casting.title}{role.role_name ? ` · ${role.role_name}` : ''}</p>

                        <div className="bg-[#FAF8FF] border border-[#E8E0FA] rounded-2xl p-4 mb-5 space-y-1">
                            <p className="text-[13px] font-black text-[#1F1235]">{currentUser.name || currentUser.nickname}</p>
                            <p className="text-[11px] text-[#9CA3AF] font-bold">
                                {[currentUser.height && `${currentUser.height}cm`, currentUser.weight && `${currentUser.weight}kg`, currentUser.phone].filter(Boolean).join(' · ')}
                            </p>
                            <p className="text-[11px] text-[#7C3AED] font-bold truncate">{currentUser.portfolio_link}</p>
                        </div>

                        <p className="text-[11px] text-[#9CA3AF] font-bold leading-relaxed mb-6">
                            확인을 누르면 위 프로필 정보가 업체 담당자 이메일로 전달돼요.
                        </p>

                        {error && <p className="text-red-500 text-xs font-bold mb-3">{error}</p>}

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="flex-1 py-3.5 rounded-2xl border border-[#E8E0FA] text-[#9CA3AF] font-black text-sm hover:bg-[#FAF8FF] transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
                            >
                                {submitting ? '전송 중...' : '지원하기'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelCastingApplyModal;
