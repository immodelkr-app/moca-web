import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

// ── 필드 팝업 입력 컴포넌트 ──────────────────────────────────────────
const FieldInputPopup = ({ label, value, onChange, onClose, placeholder, type = 'text', hint }) => {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);

    const handleSave = () => {
        onChange(localValue);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 animate-fadeIn border border-[#E8E0FA]">
                <h3 className="text-lg font-black text-[#1F1235] mb-1">{label} 입력</h3>
                {hint && <p className="text-xs text-[#9CA3AF] mb-5 font-medium">{hint}</p>}
                <input
                    ref={inputRef}
                    type={type}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder={placeholder}
                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 rounded-xl px-4 py-3.5 text-base outline-none transition-colors mb-6 font-bold text-[#1F1235] placeholder-[#9CA3AF]"
                />
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border border-[#E8E0FA] bg-[#F8F5FF] text-[#5B4E7A] font-bold text-sm hover:bg-[#EDE8FF] transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3.5 rounded-2xl bg-[#9333EA] hover:bg-[#7C3AED] text-white font-black text-sm shadow-lg shadow-[#9333EA]/20 transition-all active:scale-[0.98]"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── 메인 계약서 모달 ─────────────────────────────────────────────────
const ExclusiveContractModal = ({ isOpen, onClose, userName = '', userPhone = '', onComplete }) => {
    const [contractData, setContractData] = useState({
        startYear: '2026', startMonth: '', startDay: '',
        endYear: '2026', endMonth: '', endDay: '',
        fee: '',
        signYear: new Date().getFullYear().toString(),
        signMonth: (new Date().getMonth() + 1).toString(),
        signDay: new Date().getDate().toString(),
        memberName: userName || '',
        memberIdNum: '',
        memberAddress: '',
        memberPhone: userPhone || '',
    });

    // 팝업 상태: null이면 닫힘, 필드명 문자열이면 해당 필드 팝업 열림
    const [activePopup, setActivePopup] = useState(null);

    const sigCanvas = useRef(null);
    const [signatureImg, setSignatureImg] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSignatureImg(null);
            if (sigCanvas.current) {
                sigCanvas.current.clear();
            }
        }
    }, [isOpen]);

    const handleInput = (e) => {
        const { name, value } = e.target;
        setContractData(prev => ({ ...prev, [name]: value }));
    };

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setSignatureImg(null);
    };

    const handleSave = () => {
        if (sigCanvas.current?.isEmpty()) {
            alert('서명을 진행해 주세요.');
            return;
        }

        if (!contractData.startMonth || !contractData.endMonth || !contractData.fee || !contractData.memberIdNum) {
            alert('계약서의 빈칸(날짜, 수수료, 개인정보 등)을 모두 채워주세요.');
            return;
        }

        setLoading(true);
        const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        
        // 실제 운영 시에는 이 서명 이미지(dataURL)와 contractData를 서버 DB나 이메일로 전송합니다.
        setTimeout(() => {
            setLoading(false);
            if(onComplete) onComplete({ ...contractData, signature: dataURL });
            alert('전속계약서 서명이 완료되었습니다! 환영합니다 전속모델님!');
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    // 팝업 필드 정의
    const popupFields = [
        { key: 'memberName',    label: '성명',    hint: '계약서에 표시될 실명을 입력해주세요.',         placeholder: '홍길동',               type: 'text' },
        { key: 'memberIdNum',   label: '주민번호', hint: '예: 900101-2****** (뒷자리 마스킹 가능)',     placeholder: '000000-0000000',       type: 'text' },
        { key: 'memberAddress', label: '주소',     hint: '현재 거주지 주소를 입력해주세요.',            placeholder: '서울특별시 강남구 …',   type: 'text' },
        { key: 'memberPhone',   label: '연락처',   hint: '휴대폰 번호를 입력해주세요.',                 placeholder: '010-0000-0000',        type: 'tel'  },
    ];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#F8F5FF] w-full max-w-3xl rounded-[32px] shadow-2xl flex flex-col h-[90vh] sm:h-[85vh] overflow-hidden text-[#1F1235]">
                
                {/* Header */}
                <header className="px-6 py-5 border-b border-[#E8E0FA] flex justify-between items-center bg-white">
                    <h2 className="text-xl sm:text-2xl font-black text-[#1F1235] tracking-tight">전속모델(VIP) 전자 계약서</h2>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F3E8FF] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors">
                        <span className="material-symbols-outlined text-[#9333EA] text-[20px]">close</span>
                    </button>
                </header>

                {/* Contract Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="bg-white p-6 sm:p-10 shadow-xl rounded-2xl border border-[#E8E0FA]" style={{ fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif" }}>
                        <h1 className="text-center text-2xl sm:text-3xl font-black mb-10 text-[#1F1235] tracking-tight break-keep">
                            [광고 캐스팅 위탁 협약서]
                        </h1>

                        <p className="leading-relaxed mb-10 text-[15px] sm:text-[16px] text-[#5B4E7A] text-center">
                            기획업자 글로벌아임(아임모델) 대표 김대희 (이하 "갑")와 
                            광고모델 <input type="text" name="memberName" value={contractData.memberName} onChange={handleInput} className="w-24 border-b-2 border-dashed border-[#9333EA]/40 text-[#9333EA] focus:border-[#9333EA] outline-none text-center bg-[#F8F5FF] rounded-t-lg mt-1 mx-1 font-black" placeholder="성함" /> 
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
                                <p>1. 계약 기간: 본 계약의 기간은 
                                    <input type="text" name="startYear" value={contractData.startYear} onChange={handleInput} className="w-16 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />년 
                                    <input type="text" name="startMonth" value={contractData.startMonth} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />월 
                                    <input type="text" name="startDay" value={contractData.startDay} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />일 부터 
                                    <input type="text" name="endYear" value={contractData.endYear} onChange={handleInput} className="w-16 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />년 
                                    <input type="text" name="endMonth" value={contractData.endMonth} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />월 
                                    <input type="text" name="endDay" value={contractData.endDay} onChange={handleInput} className="w-10 border-b border-[#E8E0FA] outline-none text-center mx-1 font-bold text-[#9333EA]" />일 까지로 한다.
                                </p>
                                </p>
                                <p>2. 의무 수강 기간 (원칙): "을"은 광고모델로서의 기본기를 다지고 실질적인 에이전시 홍보 효과를 거두기 위하여, 최소 6개월간 '에이전시 투어반' 과정을 의무적으로 수강 및 유지하여야 한다.</p>
                                <p>3. [기간 단축 예외]: 단, "을"의 실력이 현저히 향상되었다고 판단될 경우, "갑"의 내부 테스트 및 실력 체크를 통해 상호 협의 하에 의무 수강 기간을 조정(단축)할 수 있다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제3조 [교육비 비용]</h3>
                                <p>1. "을"은 제2조의 수강 기간에 해당하는 교육 및 관리 비용을 "갑"이 정한 방식(일시납 또는 월납)에 따라 선불로 납부한다.</p>
                                <p className="flex items-center flex-wrap">2. 납부 금액: 월 금 
                                    <input type="text" name="fee" value={contractData.fee} onChange={handleInput} placeholder="요금 입력" className="w-32 border-b-2 border-dashed border-[#9333EA]/40 focus:border-[#9333EA] outline-none mx-2 text-right font-black text-[#9333EA] px-1 bg-[#F8F5FF] rounded-t-lg" />
                                    원 (VAT 별도)
                                </p>
                                <p>3. 해당 비용은 "갑"이 제공하는 모델 실무 교육, 이미지 컨설팅, 에이전시 홍보 대행 업무 등에 사용된다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제4조 [수익 분배]</h3>
                                <p>1. 기본 배분 비율: 광고주로부터 지급받은 총액에서 제반 경비와 원천세(3.3%)를 공제한 순수익을 기준으로, "갑" 3 : "을" 7 (모델 70%)의 비율로 배분한다.</p>
                                <p>2. 지급 시기: 수익금 지급은 광고주로부터 입금이 확인된 후, "갑"의 정기 정산일에 "을"의 지정 계좌로 이체한다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제5조 ["을"의 의무 및 계약 위반]</h3>
                                <p>1. [교육 참여]: "을"은 계약 기간 동안 "갑"이 진행하는 에이전시 투어반 교육 및 오디션 실습에 성실히 참여해야 한다.</p>
                                <p>2. [프로필 촬영]: 캐스팅 제안에 필수적인 프로필 사진(PPT 등)은 "을"이 비용을 전액 부담하여 개별적으로 촬영 및 준비해야 한다. 단, "갑"은 컨셉과 의상에 대한 전문 가이드를 제공한다. 개인적 외부 촬영은 가능하다.</p>
                                <p>3. [독점 활동]: "을"은 본 계약 기간 동안 "갑"의 사전 동의 없이 타 에이전시와 전속 계약을 체결하거나 독자적인 영업 활동으로 "갑"의 업무를 방해해서는 안 된다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제6조 ["갑"의 지원 업무 및 교육]</h3>
                                <p>1. [교육 제공]: "갑"은 에이전시 투어 기간 동안 "을"의 경쟁력 강화를 위하여 표정, 포즈, 연기 등 실무 교육을 주기적으로 진행한다.</p>
                                <p>2. [매니지먼트]: "갑"은 "을"의 프로필을 주요 에이전시 및 프로덕션에 전달하여 오디션 기회를 확보하는 데 주력한다.</p>
                                <p>3. [협상 및 계약 관리]: "갑"은 광고주(또는 에이전시)와의 모델료(출연료) 협상을 전담하며, 광고 출연 계약 체결에 관한 일정 조율 및 제반 관리 업무를 수행하여 "을"의 권익을 보호한다.</p>
                                <p>4. [촬영 지원]: "갑"은 계약 기간 중 연 2회 영상 촬영(자기소개, 표정, 포즈, 자유연기 등)을 지원할 수 있다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제7조 [초상권 및 저작권 귀속]</h3>
                                <p>1. [권리 귀속]: 본 계약 기간 동안 "갑"의 기획 및 주관하에 제작된 모든 콘텐츠(사진, 영상, 프로필, 교육 자료 등)에 대한 저작권 및 소유권은 "갑"에게 귀속된다.</p>
                                <p>2. [마케팅 활용]: "갑"은 "을"의 초상(얼굴 및 신체 이미지)이 담긴 자료를 "갑"의 브랜드(아임모델 외) 홍보 및 마케팅(홈페이지, 블로그, 유튜브, SNS, 보도자료 등 온/오프라인 매체)을 위해 자유롭게 활용할 수 있으며, "을"은 이에 동의한다.</p>
                                <p>3. [활용 기간]: 위 홍보 자료는 계약 종료 후에도 "갑"의 포트폴리오 및 아카이브 목적으로 게시, 유지될 수 있다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제8조 [중도 해지 및 환불]</h3>
                                <p>1. "을"이 제2조의 의무 수강 기간(6개월)을 채우지 못하고 중도 포기하거나 단순 변심으로 계약을 해지할 경우, "갑"은 기 진행된 교육 횟수 공제 및 위약금을 제외한 잔액을 환불 규정에 따라 반환한다.</p>
                                <p>2. 단, "을"이 제5조의 의무를 위반하거나 정당한 사유 없이 교육에 불참하여 강제 해지되는 경우, 이는 "을"의 귀책사유로 간주된다.</p>
                                <p>3. 계약을 해지 해도 제 7조 사항들은 유지된다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제9조 [관할 법원]</h3>
                                <p>본 협약과 관련하여 분쟁이 발생할 경우 "갑"의 본점 소재지 관할 법원을 1심 관할 법원으로 한다.</p>
                                <p className="mt-4 font-bold">위 내용을 증명하기 위해 협약서 2통을 작성하여 서명 날인 후 "갑"과 "을"이 각각 1통씩 보관한다.</p>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="text-center my-14 text-xl font-bold text-[#1F1235]">
                            <input type="text" name="signYear" value={contractData.signYear} onChange={handleInput} className="w-16 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />년
                            <input type="text" name="signMonth" value={contractData.signMonth} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />월
                            <input type="text" name="signDay" value={contractData.signDay} onChange={handleInput} className="w-10 border-b-2 border-dashed border-[#E8E0FA] outline-none text-center mx-1 bg-transparent text-[#9333EA]" />일
                        </div>

                        {/* Signatures Panel */}
                        <div className="flex flex-col md:flex-row justify-between gap-10">
                            {/* 갑 (회사) */}
                            <div className="flex-1 p-5 rounded-3xl border border-[#E8E0FA] bg-[#F8F5FF]">
                                <h4 className="font-black text-lg mb-4 text-[#1F1235]">("갑") 소속사</h4>
                                <div className="space-y-3 font-medium text-[13px] text-[#5B4E7A]">
                                    <div className="flex"><span className="w-20 font-bold">법명/상호:</span> 글로벌아임 (아임모델)</div>
                                    <div className="flex"><span className="w-20 font-bold">대표자:</span> 김대희 (인)</div>
                                    <div className="flex"><span className="w-20 font-bold">주소:</span> 서울특별시 강남구 논현로 648 (우:06103)</div>
                                    <div className="flex"><span className="w-20 font-bold">연락처:</span> 02-3443-4672</div>
                                </div>
                                <div className="mt-8 text-right">
                                    <div className="inline-flex items-center justify-end gap-3 px-4 py-2 border border-[#E8E0FA] rounded-2xl bg-white shadow-sm">
                                        <span className="text-2xl font-black text-[#1F1235] tracking-widest">김 대 희</span>
                                        <img src="/company-stamp.png" alt="직인" className="w-16 h-16 object-contain opacity-100 mix-blend-multiply" />
                                    </div>
                                </div>
                            </div>

                            {/* 을 (회원) - 팝업 방식 입력 */}
                            <div className="flex-1 p-5 rounded-3xl border border-[#9333EA]/20 bg-[#F8F5FF]">
                                <h4 className="font-black text-lg mb-1 text-[#9333EA]">("을") 소속 모델</h4>
                                <p className="text-[10px] text-[#9CA3AF] mb-5 font-bold">각 항목을 터치하면 입력창이 열립니다 ✏️</p>

                                {/* 팝업 방식 필드 목록 */}
                                <div className="space-y-4 font-medium text-[13px] mb-6">
                                    {popupFields.map(({ key, label }) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="w-20 text-[#5B4E7A] font-bold whitespace-nowrap shrink-0">{label}:</span>
                                            <button
                                                type="button"
                                                onClick={() => setActivePopup(key)}
                                                className={`flex-1 text-left border-b border-[#E8E0FA] px-2 py-1.5 rounded-t-lg transition-all ${
                                                    contractData[key]
                                                        ? 'border-[#9333EA] text-[#1F1235] font-black'
                                                        : 'border-dashed border-[#9CA3AF]/40 text-[#9CA3AF]'
                                                } hover:bg-[#9333EA]/5`}
                                            >
                                                {contractData[key] || `${label} 입력`}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* 서명 캔버스 */}
                                <div className="border border-[#9333EA]/20 bg-white rounded-2xl relative overflow-hidden shadow-inner">
                                    <div className="absolute top-2 left-4 text-[10px] font-black text-[#9CA3AF] pointer-events-none uppercase">SIGNATURE</div>
                                    <SignatureCanvas 
                                        ref={sigCanvas}
                                        penColor="#1F1235"
                                        canvasProps={{ className: 'signature-canvas w-full h-32 md:h-40 cursor-crosshair' }} 
                                    />
                                    <button 
                                        onClick={clearSignature}
                                        className="absolute bottom-2 right-2 text-[10px] bg-[#F8F5FF] hover:bg-[#EDE8FF] text-[#5B4E7A] font-black py-1.5 px-3 rounded-xl transition-all active:scale-95 border border-[#E8E0FA]"
                                    >
                                        지우기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-white border-t border-[#E8E0FA]">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#9333EA] to-[#C084FC] hover:from-[#7C3AED] hover:to-[#9333EA] text-white font-black text-lg py-4.5 rounded-2xl transition-all shadow-xl shadow-[#9333EA]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        {loading
                            ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-[24px]">draw</span>
                        }
                        동의 및 전자 서명 제출하기
                    </button>
                    <p className="text-center text-[11px] text-[#9CA3AF] mt-4 font-bold">
                        * 제출된 계약서는 법적 효력을 가지며 아임모카 서버에 안전하게 보관됩니다.
                    </p>
                </div>
            </div>

            {/* 필드별 팝업 */}
            {activePopup && (() => {
                const field = popupFields.find(f => f.key === activePopup);
                if (!field) return null;
                return (
                    <FieldInputPopup
                        label={field.label}
                        value={contractData[field.key]}
                        hint={field.hint}
                        onChange={(v) => setContractData(p => ({ ...p, [field.key]: v }))}
                        onClose={() => setActivePopup(null)}
                        placeholder={field.placeholder}
                        type={field.type}
                    />
                );
            })()}
        </div>
    );
};

export default ExclusiveContractModal;
