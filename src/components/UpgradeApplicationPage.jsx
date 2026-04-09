import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { getUser } from '../services/userService';
import { saveUpgradeRequest } from '../services/adminService';

const PLANS = [
    { id: 'gold_3m',  months: 3,  price: 30000,  label: '3개월' },
    { id: 'gold_6m',  months: 6,  price: 50000,  label: '6개월' },
    { id: 'gold_12m', months: 12, price: 100000, label: '12개월' },
];

/* ── 서명 팝업 모달 ── */
const SignatureModal = ({ isOpen, onClose, onConfirm, existingSignature }) => {
    const sigRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (existingSignature && sigRef.current) {
                setTimeout(() => {
                    sigRef.current.fromDataURL(existingSignature);
                }, 100);
            }
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, existingSignature]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (sigRef.current?.isEmpty()) {
            alert('서명을 진행해 주세요.');
            return;
        }
        const dataURL = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
        onConfirm(dataURL);
    };

    const handleClear = () => sigRef.current?.clear();
    const preventScroll = (e) => e.preventDefault();

    return (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-[#E8E0FA] flex items-center justify-between bg-[#F8F5FF]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#9333EA] text-[20px]">draw</span>
                        </div>
                        <h3 className="text-[#1F1235] font-black text-lg">전자 서명</h3>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#EDE8FF] flex items-center justify-center hover:bg-[#E0DAFF] transition-colors">
                        <span className="material-symbols-outlined text-[#5B4E7A] text-[20px]">close</span>
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-[#5B4E7A] text-sm mb-4 text-center font-medium">아래 영역에 서명을 해주세요</p>
                    <div ref={containerRef} className="w-full bg-[#F8F5FF] rounded-2xl border-2 border-[#E8E0FA] overflow-hidden relative" style={{ touchAction: 'none' }} onTouchMove={preventScroll}>
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-[90%] border-b-2 border-dashed border-[#E8E0FA]" />
                        </div>
                        <div className="absolute top-3 left-4 text-[10px] font-black tracking-widest text-[#9CA3AF] pointer-events-none uppercase">
                            SIGN HERE (서명해 주세요)
                        </div>
                        <SignatureCanvas ref={sigRef} penColor="#1F1235" minWidth={1.5} maxWidth={3} canvasProps={{ className: 'w-full cursor-crosshair', style: { height: '220px', width: '100%', touchAction: 'none' } }} />
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button onClick={handleClear} className="flex-1 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] text-[#5B4E7A] font-bold text-sm hover:bg-[#EDE8FF] transition-colors flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            초기화
                        </button>
                        <button onClick={handleConfirm} className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-black text-sm shadow-lg shadow-[#9333EA]/20 hover:opacity-90 transition-all flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            서명 완료
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UpgradeApplicationPage = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userNickname = user?.nickname || '회원';

    const [formData, setFormData] = useState({
        signYear: new Date().getFullYear().toString(),
        signMonth: (new Date().getMonth() + 1).toString(),
        signDay: new Date().getDate().toString(),
        memberName: user?.name || userNickname,
        memberPhone: user?.phone || '',
        selectedPlanId: 'gold_6m', // 기본 6개월
    });

    const [signatureData, setSignatureData] = useState(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePlanSelect = (planId) => {
        setFormData(prev => ({ ...prev, selectedPlanId: planId }));
    };

    const handleSignatureConfirm = (dataURL) => {
        setSignatureData(dataURL);
        setShowSignModal(false);
    };

    const handleSave = async () => {
        if (!signatureData) {
            alert('하단의 서명 영역을 터치하여 서명을 진행해 주세요.');
            return;
        }
        if (!formData.memberName || !formData.memberPhone) {
            alert('이름과 연락처를 모두 채워주세요.');
            return;
        }
        
        setLoading(true);

        const selectedPlan = PLANS.find(p => p.id === formData.selectedPlanId);

        const requestPayload = {
            userNickname: userNickname,
            memberName: formData.memberName,
            memberPhone: formData.memberPhone,
            planMonths: selectedPlan.months,
            price: selectedPlan.price,
            signature: signatureData
        };

        try {
            const { error } = await saveUpgradeRequest(requestPayload);
            if (error) throw error;
            alert('🎉 멤버십 등업 신청서가 제출되었습니다!\n\n담당자가 확인 후 카카오톡으로 결제 및 승인 안내를 드립니다.');
            navigate('/home/dashboard');
        } catch (err) {
            console.error('Upgrade request save error:', err);
            alert('저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5FF] text-[#1F1235] pb-24 font-sans flex flex-col items-center">
            <header className="w-full max-w-4xl px-6 py-5 flex items-center bg-white border-b border-[#E8E0FA] sticky top-0 z-50 shadow-sm">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors text-[#9333EA] mr-4">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[#1F1235] tracking-tight">GOLD 멤버십 신청서 작성</h1>
            </header>

            <div className="w-full max-w-4xl mt-6 px-4">
                <div className="bg-white w-full p-6 sm:p-10 shadow-xl rounded-[32px] border border-[#E8E0FA]">
                    
                    <div className="mb-10 text-center">
                        <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">👑</span>
                        </div>
                        <h2 className="text-2xl font-black text-[#1F1235] mb-2 tracking-tight">멤버십 등업 신청서</h2>
                        <p className="text-[#5B4E7A] text-sm font-medium">광고 캐스팅 및 멤버십 혜택 이용을 위한 가입 동의</p>
                    </div>

                    {/* 플랜 선택 영역 */}
                    <div className="mb-10">
                        <h3 className="font-extrabold text-[#1F1235] text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#9333EA]">workspace_premium</span>
                            1. 희망 구독 플랜 선택
                        </h3>
                        <div className="flex flex-col gap-3">
                            {PLANS.map((plan) => {
                                const isSelected = formData.selectedPlanId === plan.id;
                                return (
                                    <button 
                                        key={plan.id}
                                        onClick={() => handlePlanSelect(plan.id)}
                                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                            isSelected 
                                                ? 'border-[#9333EA] bg-[#F8F5FF] shadow-sm' 
                                                : 'border-[#E8E0FA] bg-white hover:border-[#F3E8FF]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                isSelected ? 'border-[#9333EA] bg-[#9333EA]' : 'border-[#E8E0FA]'
                                            }`}>
                                                {isSelected && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                                            </div>
                                            <span className={`text-lg font-black ${isSelected ? 'text-[#9333EA]' : 'text-[#1F1235]'}`}>
                                                {plan.label} 신청
                                            </span>
                                        </div>
                                        <span className={`text-xl font-black ${isSelected ? 'text-[#1F1235]' : 'text-[#5B4E7A]'}`}>
                                            {plan.price.toLocaleString()}원
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-6 text-[15px] sm:text-[16px] leading-[1.8] text-gray-800 break-keep border-t border-[#E8E0FA] pt-8">
                        <h3 className="font-extrabold text-[#1F1235] text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#10B981]">gavel</span>
                            2. 규정 및 혜택 안내
                        </h3>
                        <div className="bg-[#F8F5FF] rounded-2xl p-6 text-sm text-[#5B4E7A] space-y-4">
                            <p>1. 신청 후 담당자가 카카오톡으로 결제 안내를 발송하며, 결제 완료 후 GOLD 등급이 즉시 반영됩니다.</p>
                            <p>2. GOLD 등급 회원은 앱 내 무제한 에이전시 조회 기능과 캐스팅 등록, 사진 등록 권한을 얻습니다.</p>
                            <p>3. 부가세(VAT)가 포함된 금액이며, 서비스 이용 기간 중 환불은 회사 규약에 따라 진행됩니다.</p>
                            <p>4. 제출되는 개인정보와 서명 기록은 등업 및 본인 확인 목적으로 안전하게 보관됩니다.</p>
                        </div>
                    </div>

                    <div className="text-center my-12 text-lg font-bold flex items-center justify-center text-[#1F1235]">
                        신청일: 
                        <input type="text" name="signYear" value={formData.signYear} onChange={handleInput} className="w-16 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center ml-2 mr-1 bg-transparent text-[#9333EA]" />년
                        <input type="text" name="signMonth" value={formData.signMonth} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />월
                        <input type="text" name="signDay" value={formData.signDay} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />일
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-10 mt-8 border-t-2 border-[#1F1235] pt-10">
                        <div className="flex-1">
                            <h4 className="font-black text-xl mb-4 text-[#1F1235]">MOCA (글로벌아임)</h4>
                            <div className="space-y-3 font-medium text-[14px]">
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">대표자:</span> 김 대 희</div>
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">주소:</span> 서울특별시 강남구 논현로 648</div>
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">연락처:</span> 010-5543-9674</div>
                            </div>
                            <div className="mt-8 text-right">
                                <div className="inline-flex items-center justify-end gap-3 px-4 py-2 border border-[#E8E0FA] rounded-2xl bg-[#F8F5FF]">
                                    <span className="text-xl font-black text-[#1F1235] tracking-widest">김 대 희</span>
                                    <img src="/company-stamp.png" alt="직인" className="w-12 h-12 object-contain opacity-100 mix-blend-multiply" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white p-6 rounded-3xl border-2 border-[#9333EA]/20 relative shadow-md">
                            <h4 className="font-black text-xl mb-5 text-[#9333EA] border-b border-[#9333EA]/10 pb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined">person</span>
                                신청자 확인
                            </h4>
                            <div className="space-y-5 font-medium text-[14px]">
                                <div className="flex items-center">
                                    <span className="w-20 text-[#5B4E7A] font-bold">신청인:</span>
                                    <input type="text" name="memberName" value={formData.memberName} onChange={handleInput} placeholder="이름 입력" className="flex-1 border-b-2 border-dashed border-[#E8E0FA] bg-transparent outline-none px-2 py-1 text-[#1F1235] font-black focus:border-[#9333EA] transition-colors" />
                                </div>
                                <div className="flex items-center">
                                    <span className="w-20 text-[#5B4E7A] font-bold">연락처:</span>
                                    <input type="text" name="memberPhone" value={formData.memberPhone} onChange={handleInput} placeholder="010-0000-0000" className="flex-1 border-b-2 border-dashed border-[#E8E0FA] bg-transparent outline-none px-2 py-1 text-[#1F1235] font-black focus:border-[#9333EA] transition-colors" />
                                </div>
                            </div>

                            <div className="mt-8">
                                {signatureData ? (
                                    <div className="border-2 border-emerald-500 bg-emerald-50/30 rounded-2xl relative overflow-hidden shadow-sm">
                                        <div className="absolute top-2 left-3 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-emerald-500 text-[14px]">check_circle</span>
                                            <span className="text-[10px] font-black text-emerald-600">서명 완료</span>
                                        </div>
                                        <img src={signatureData} alt="서명" className="w-full h-32 object-contain p-4" />
                                        <button onClick={() => setShowSignModal(true)} className="absolute bottom-2 right-2 text-[10px] bg-white text-[#5B4E7A] font-black py-1.5 px-3 rounded-xl shadow-sm border border-[#E8E0FA] flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            다시 서명
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSignModal(true)} className="w-full border-2 border-dashed border-[#9333EA] bg-white rounded-2xl h-32 flex flex-col items-center justify-center gap-2 hover:bg-[#F8F5FF] transition-all active:scale-[0.98] group">
                                        <div className="w-12 h-12 rounded-full bg-[#9333EA]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-[#9333EA] text-[28px]">draw</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[#9333EA] font-black text-sm">터치하여 내용 확인 및 서명하기</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-12 space-y-4">
                    <button onClick={handleSave} disabled={loading} className="w-full bg-[#1F1235] text-white hover:bg-black font-black text-lg py-5 rounded-[24px] shadow-[0_12px_24px_rgba(31,18,53,0.2)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        {loading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-2xl">send</span>}
                        등업 신청서 최종 제출하기
                    </button>
                    <p className="text-center text-[12px] text-[#9CA3AF] font-bold">
                        * 제출 버튼 클릭 시 신청이 완료되며, 개별 카카오톡 안내를 드립니다.
                    </p>
                </div>
            </div>

            <SignatureModal isOpen={showSignModal} onClose={() => setShowSignModal(false)} onConfirm={handleSignatureConfirm} existingSignature={signatureData} />
        </div>
    );
};

export default UpgradeApplicationPage;
