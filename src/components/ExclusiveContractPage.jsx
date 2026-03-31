import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { getUser } from '../services/userService';
import { saveContract } from '../services/adminService';

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

const ExclusiveContractPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { name: paramName } = useParams();
    const user = getUser();

    // 쿼리 파라미터(?n=이름) 또는 경로 변수(/contract/이름)에서 성함 추출
    const queryParams = new URLSearchParams(location.search);
    const queryName = queryParams.get('n') || paramName || '';

    const [contractData, setContractData] = useState({
        startYear: '2026', startMonth: '03', startDay: '01',
        endYear: '2026', endMonth: '09', endDay: '01',
        fee: '',
        signYear: new Date().getFullYear().toString(),
        signMonth: (new Date().getMonth() + 1).toString(),
        signDay: new Date().getDate().toString(),
        memberName: user?.name || user?.nickname || queryName || '',
        memberIdNum: '',
        memberAddress: '',
        memberPhone: user?.phone || '',
    });

    const [signatureData, setSignatureData] = useState(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleInput = (e) => {
        const { name, value } = e.target;
        setContractData(prev => ({ ...prev, [name]: value }));
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
        if (!contractData.startMonth || !contractData.endMonth || !contractData.memberIdNum || !contractData.memberAddress) {
            alert('계약서의 빈칸(날짜, 개인정보 등)을 모두 채워주세요.');
            return;
        }
        setLoading(true);
        const finalData = { ...contractData, signature: signatureData };
        try {
            const { error } = await saveContract(finalData);
            if (error) throw error;
            alert('🎉 전속계약서가 제출되었습니다!\n\n대표님의 최종 승인 후 전속모델(VIP) 등급이 적용됩니다.');
            navigate('/home/dashboard');
        } catch (err) {
            console.error('Contract save error:', err);
            alert('저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F5FF] text-[#1F1235] pb-24 font-sans flex flex-col items-center">
            <header className="w-full max-w-4xl px-6 py-5 flex items-center bg-white border-b border-[#E8E0FA] sticky top-0 z-50">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors text-[#9333EA] mr-4">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[#1F1235]">전속모델 위탁 협약서 체결</h1>
            </header>

            <div className="w-full max-w-4xl mt-6 px-4">
                <div className="bg-white w-full p-6 sm:p-12 shadow-xl rounded-3xl border border-[#E8E0FA]" style={{ fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif" }}>

                    <h1 className="text-center text-2xl sm:text-3xl font-black mb-10 text-[#1F1235] tracking-tight break-keep">[광고 캐스팅 위탁 협약서]</h1>

                    <p className="leading-relaxed mb-10 text-[15px] sm:text-[16px] text-[#5B4E7A] text-center">
                        기획업자 글로벌아임(아임모델) 대표 김대희 (이하 "갑")와 광고모델
                        <input type="text" name="memberName" value={contractData.memberName} onChange={handleInput} className="w-24 border-b-2 border-dashed border-[#9333EA]/40 text-[#9333EA] focus:border-[#9333EA] outline-none text-center bg-[#F8F5FF] rounded-t-lg mt-1 mx-2 font-black" placeholder="성명 입력" />
                        (이하 "을")은 상호 신뢰를 바탕으로 다음과 같이 광고 캐스팅 위탁 및 매니지먼트 협약을 체결한다.
                    </p>

                    <div className="space-y-6 text-[15px] sm:text-[16px] leading-[1.8] text-gray-800 break-keep">
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제1조 [목적]</h3>
                            <p>본 협약은 "갑"이 "을"을 '아임 광고모델 크루'의 일원으로 발탁하여, 전문적인 실무 교육과 캐스팅 매니지먼트 서비스를 동시에 제공하고, "을"은 이에 대한 성실한 활동하여 광고모델로서의 수익을 창출함을 목적으로 한다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제2조 [계약 기간 및 의무 수강]</h3>
                            <p>1. 계약 기간: 본 계약의 기간은
                                <input type="text" name="startYear" value={contractData.startYear} onChange={handleInput} className="w-16 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />년
                                <input type="text" name="startMonth" value={contractData.startMonth} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />월
                                <input type="text" name="startDay" value={contractData.startDay} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />일 부터
                                <input type="text" name="endYear" value={contractData.endYear} onChange={handleInput} className="w-16 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />년
                                <input type="text" name="endMonth" value={contractData.endMonth} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />월
                                <input type="text" name="endDay" value={contractData.endDay} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA] bg-transparent" />일 까지로 한다.
                            </p>
                            <p>2. 의무 수강 기간 (원칙): "을"은 광고모델로서의 기본기를 다지고 실질적인 에이전시 홍보 효과를 거두기 위하여, 최소 6개월간 '에이전시 투어반' 과정을 의무적으로 수강 및 유지하여야 한다.</p>
                            <p>3. [기간 단축 예외]: 단, "을"의 실력이 현저히 향상되었다고 판단될 경우, "갑"의 내부 테스트 및 실력 체크를 통해 상호 협의 하에 의무 수강 기간을 조정(단축)할 수 있다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제3조 [수익 분배]</h3>
                            <p>1. 기본 배분 비율: 광고주로부터 지급받은 총액에서 제반 경비와 원천세(3.3%)를 공제한 순수익을 기준으로, "갑" 3 : "을" 7 (모델 70%)의 비율로 배분한다.</p>
                            <p>2. 지급 시기: 수익금 지급은 광고주로부터 입금이 확인된 후, "갑"의 정기 정산일에 "을"의 지정 계좌로 이체한다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제4조 ["을"의 의무 및 계약 위반]</h3>
                            <p>1. [교육 참여]: "을"은 계약 기간 동안 "갑"이 진행하는 에이전시 투어반 교육 및 오디션 실습에 성실히 참여해야 한다.</p>
                            <p>2. [프로필 촬영]: 캐스팅 제안에 필수적인 프로필 사진(PPT 등)은 "을"이 비용을 전액 부담하여 개별적으로 촬영 및 준비해야 한다. 단, "갑"은 컨셉과 의상에 대한 전문 가이드를 제공한다. 개인적 외부 촬영은 가능하다.</p>
                            <p>3. [독점 활동]: "을"은 본 계약 기간 동안 "갑"의 사전 동의 없이 타 에이전시와 전속 계약을 체결하거나 독자적인 영업 활동으로 "갑"의 업무를 방해해서는 안 된다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제5조 ["갑"의 지원 업무 및 교육]</h3>
                            <p>1. [교육 제공]: "갑"은 에이전시 투어 기간 동안 "을"의 경쟁력 강화를 위하여 표정, 포즈, 연기 등 실무 교육을 주기적으로 진행한다.</p>
                            <p>2. [매니지먼트]: "갑"은 "을"의 프로필을 주요 에이전시 및 프로덕션에 전달하여 오디션 기회를 확보하는 데 주력한다.</p>
                            <p>3. [협상 및 계약 관리]: "갑"은 광고주(또는 에이전시)와의 모델료(출연료) 협상을 전담하며, 광고 출연 계약 체결에 관한 일정 조율 및 제반 관리 업무를 수행하여 "을"의 권익을 보호한다.</p>
                            <p>4. [촬영 지원]: "갑"은 계약 기간 중 연 2회 영상 촬영(자기소개,표정,포즈,자유연기 등)을 지원할 수 있다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제6조 [초상권 및 저작권 귀속] (신설)</h3>
                            <p>1. [권리 귀속]: 본 계약 기간 동안 "갑"의 기획 및 주관하에 제작된 모든 콘텐츠(사진, 영상, 프로필, 교육 자료 등)에 대한 저작권 및 소유권은 "갑"에게 귀속된다.</p>
                            <p>2. [마케팅 활용]: "갑"은 "을"의 초상(얼굴 및 신체 이미지)이 담긴 자료를 "갑"의 브랜드(아임모델외) 홍보 및 마케팅(홈페이지, 블로그, 유튜브, SNS, 보도자료 등 온/오프라인 매체)을 위해 자유롭게 활용할 수 있으며, "을"은 이에 동의한다.</p>
                            <p>3. [활용 기간]: 위 홍보 자료는 계약 종료 후에도 "갑"의 포트폴리오 및 아카이브 목적으로 게시, 유지될 수 있다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제7조 [중도 해지 및 환불]</h3>
                            <p>1. "을"이 제2조의 의무 수강 기간(6개월)을 채우지 못하고 중도 포기하거나 단순 변심으로 계약을 해지할 경우, "갑"은 기 진행된 교육 횟수 공제 및 위약금을 제외한 잔액을 환불 규정에 따라 반환한다.</p>
                            <p>2. 단, "을"이 제4조의 의무를 위반하거나 정당한 사유 없이 교육에 불참하여 강제 해지되는 경우, 이는 "을"의 귀책사유로 간주된다.</p>
                            <p>3. 계약을 해지 해도 제 6조 사항들은 유지된다.</p>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-black text-lg mb-2">제8조 [관할 법원]</h3>
                            <p>본 협약과 관련하여 분쟁이 발생할 경우 "갑"의 본점 소재지 관할 법원을 1심 관할 법원으로 한다.</p>
                            <p className="mt-4 font-bold">위 내용을 증명하기 위해 협약서 2통을 작성하여 서명 날인 후 "갑"과 "을"이 각각 1통씩 보관한다.</p>
                        </div>
                    </div>

                    <div className="text-center my-16 text-xl font-bold flex items-center justify-center text-[#1F1235]">
                        <input type="text" name="signYear" value={contractData.signYear} onChange={handleInput} className="w-16 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />년
                        <input type="text" name="signMonth" value={contractData.signMonth} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />월
                        <input type="text" name="signDay" value={contractData.signDay} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />일
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-10 mt-10 border-t-2 border-[#1F1235] pt-10">
                        <div className="flex-1">
                            <h4 className="font-black text-xl mb-4 text-[#1F1235]">("갑") 소속에이전시</h4>
                            <div className="space-y-3 font-medium text-[13px]">
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">법명/상호:</span> 글로벌아임 (아임모델)</div>
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">대표자:</span> 김 대 희</div>
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">주소:</span> 서울특별시 강남구 논현로 648 (우:06103)</div>
                                <div className="flex"><span className="w-20 text-[#5B4E7A] font-bold">연락처:</span> 010-5543-9674</div>
                            </div>
                            <div className="mt-8 text-right">
                                <div className="inline-flex items-center justify-end gap-3 px-4 py-2 border border-[#E8E0FA] rounded-2xl bg-[#F8F5FF]">
                                    <span className="text-2xl font-black text-[#1F1235] tracking-widest">김 대 희</span>
                                    <img src="/company-stamp.png" alt="직인" className="w-16 h-16 object-contain opacity-100 mix-blend-multiply" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-[#F8F5FF] p-6 rounded-3xl border border-[#E8E0FA] relative shadow-sm">
                            <h4 className="font-black text-xl mb-5 text-[#9333EA] border-b border-[#9333EA]/10 pb-3">
                                ("을") 모델명: <span className="text-[#1F1235]">{contractData.memberName || "이름 입력"}</span>
                            </h4>
                            <div className="space-y-4 font-medium text-[13px]">
                                <div className="flex items-center">
                                    <span className="w-24 text-[#5B4E7A] font-bold whitespace-nowrap">주민등록번호:</span>
                                    <input type="text" name="memberIdNum" value={contractData.memberIdNum} onChange={handleInput} placeholder="예: 900101-2******" className="flex-1 border-b border-[#E8E0FA] bg-transparent outline-none px-1 text-[#1F1235] font-bold" />
                                </div>
                                <div className="flex items-center">
                                    <span className="w-24 text-[#5B4E7A] font-bold whitespace-nowrap">법정 주소:</span>
                                    <input type="text" name="memberAddress" value={contractData.memberAddress} onChange={handleInput} placeholder="계약 조항용 주소 입력" className="flex-1 border-b border-[#E8E0FA] bg-transparent outline-none px-1 text-[#1F1235] font-bold" />
                                </div>
                                <div className="flex items-center">
                                    <span className="w-24 text-[#5B4E7A] font-bold whitespace-nowrap">본인 연락처:</span>
                                    <input type="text" name="memberPhone" value={contractData.memberPhone} onChange={handleInput} className="flex-1 border-b border-[#E8E0FA] bg-transparent outline-none px-1 text-[#1F1235] font-bold" />
                                </div>
                            </div>

                            <div className="mt-8">
                                {signatureData ? (
                                    <div className="border-2 border-emerald-500 bg-white rounded-2xl relative overflow-hidden shadow-md">
                                        <div className="absolute top-2 left-3 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-emerald-500 text-[14px]">check_circle</span>
                                            <span className="text-[10px] font-black text-emerald-600">서명 완료</span>
                                        </div>
                                        <img src={signatureData} alt="서명" className="w-full h-32 object-contain p-4" />
                                        <button onClick={() => setShowSignModal(true)} className="absolute bottom-2 right-2 text-[10px] bg-[#F8F5FF] hover:bg-[#EDE8FF] text-[#5B4E7A] font-black py-1.5 px-3 rounded-xl transition-colors active:scale-95 flex items-center gap-1 border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            다시 서명
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSignModal(true)} className="w-full border-2 border-dashed border-[#9333EA]/30 bg-white rounded-2xl h-32 flex flex-col items-center justify-center gap-2 hover:bg-[#F3E8FF]/30 hover:border-[#9333EA]/60 transition-all active:scale-[0.98] group">
                                        <div className="w-12 h-12 rounded-full bg-[#9333EA]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-[#9333EA] text-[28px]">draw</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[#9333EA] font-black text-sm">터치하여 서명하기</p>
                                            <p className="text-[#9CA3AF] text-[10px] font-bold mt-0.5">아래 영역에 서명을 해주세요</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 mb-12">
                    <button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-[#9333EA] to-[#C084FC] hover:from-[#7C3AED] hover:to-[#9333EA] text-white font-black text-lg py-5 rounded-2xl transition-all shadow-xl shadow-[#9333EA]/30 flex items-center justify-center gap-2 active:scale-[0.98]">
                        {loading ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-2xl">draw</span>}
                        계약서 전송 및 전자서명 완료
                    </button>
                    <p className="text-center text-[10px] text-[#9CA3AF] mt-4 font-bold">
                        * 제출 버튼 클릭 시 기재된 서명 및 IP기록과 함께 법적 효력을 가진 계약서로 보관됩니다.
                    </p>
                </div>
            </div>

            <SignatureModal isOpen={showSignModal} onClose={() => setShowSignModal(false)} onConfirm={handleSignatureConfirm} existingSignature={signatureData} />
        </div>
    );
};

export default ExclusiveContractPage;
