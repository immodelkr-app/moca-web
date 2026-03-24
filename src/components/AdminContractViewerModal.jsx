import React from 'react';

const AdminContractViewerModal = ({ contract, onClose }) => {
    if (!contract) return null;

    // Parse dates (assuming 'YYYY-MM-DD' format)
    const splitDate = (dateString) => {
        if (!dateString) return { year: '', month: '', day: '' };
        const parts = dateString.split('-');
        if (parts.length === 3) return { year: parts[0], month: parts[1], day: parts[2] };
        return { year: '', month: '', day: '' };
    };

    const startDate = splitDate(contract.start_date);
    const endDate = splitDate(contract.end_date);
    const signDate = splitDate(contract.sign_date);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#f0f0f5] w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col h-[90vh] sm:h-[85vh] overflow-hidden text-[#1a1a24]">
                
                {/* Header */}
                <header className="px-6 py-5 border-b border-gray-300 flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">전속모델(VIP) 계약서 상세 (서명 완료본)</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <span className="material-symbols-outlined text-gray-600">close</span>
                    </button>
                </header>

                {/* Contract Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 hide-scrollbar bg-[#f0f0f5]" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="bg-white p-6 sm:p-10 shadow-sm border border-gray-200" style={{ fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif" }}>
                        <h1 className="text-center text-3xl font-black mb-10 text-black tracking-widest break-keep">
                            [광고 캐스팅 위탁 협약서]
                        </h1>

                        <p className="leading-relaxed mb-8 text-[15px] sm:text-[16px]">
                            기획업자 글로벌아임(아임모델) 대표 김대희 (이하 "갑")와 
                            광고모델 <span className="w-24 border-b-2 border-gray-400 font-bold inline-block text-center mr-1 ml-1 text-black">{contract.member_name}</span> 
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
                                    <span className="font-bold underline mx-1">{startDate.year}</span>년 
                                    <span className="font-bold underline mx-1">{startDate.month}</span>월 
                                    <span className="font-bold underline mx-1">{startDate.day}</span>일 부터 
                                    <span className="font-bold underline mx-1">{endDate.year}</span>년 
                                    <span className="font-bold underline mx-1">{endDate.month}</span>월 
                                    <span className="font-bold underline mx-1">{endDate.day}</span>일 까지로 한다.
                                </p>
                                <p>2. 의무 수강 기간 (원칙): "을"은 광고모델로서의 기본기를 다지고 실질적인 에이전시 홍보 효과를 거두기 위하여, 최소 6개월간 '에이전시 투어반' 과정을 의무적으로 수강 및 유지하여야 한다.</p>
                                <p>3. [기간 단축 예외]: 단, "을"의 실력이 현저히 향상되었다고 판단될 경우, "갑"의 내부 테스트 및 실력 체크를 통해 상호 협의 하에 의무 수강 기간을 조정(단축)할 수 있다.</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-black text-lg mb-2">제3조 [교육비 비용]</h3>
                                <p>1. "을"은 제2조의 수강 기간에 해당하는 교육 및 관리 비용을 "갑"이 정한 방식(일시납 또는 월납)에 따라 선불로 납부한다.</p>
                                <p className="flex items-center flex-wrap">2. 납부 금액: 월 금 
                                    <span className="font-bold text-red-600 underline mx-2">{contract.fee}</span>원 (VAT 별도)
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
                        <div className="text-center my-14 text-xl font-bold">
                            <span className="font-bold underline mx-1">{signDate.year}</span>년
                            <span className="font-bold underline mx-1">{signDate.month}</span>월
                            <span className="font-bold underline mx-1">{signDate.day}</span>일
                        </div>

                        {/* Signatures Panel */}
                        <div className="flex flex-col md:flex-row justify-between gap-10">
                            {/* 갑 (회사) */}
                            <div className="flex-1 p-5 rounded-xl border-2 border-gray-200 bg-gray-50">
                                <h4 className="font-extrabold text-lg mb-4 text-black">("갑") 소속사</h4>
                                <div className="space-y-3 font-medium text-sm text-black">
                                    <div className="flex"><span className="w-20 text-gray-500">법명/상호:</span> 글로벌아임 (아임모델)</div>
                                    <div className="flex"><span className="w-20 text-gray-500">대표자:</span> 김대희 (인)</div>
                                    <div className="flex"><span className="w-20 text-gray-500">주소:</span> 서울특별시 강남구 논현로 648 (우:06103)</div>
                                    <div className="flex"><span className="w-20 text-gray-500">연락처:</span> 02-3443-4672</div>
                                </div>
                                <div className="mt-6 text-right">
                                    <div className="inline-flex items-center justify-end gap-3">
                                        <span className="text-2xl font-black text-black tracking-widest">김 대 희</span>
                                        <img src="/company-stamp.png" alt="직인" className="w-20 h-20 object-contain mx-auto" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                </div>
                            </div>

                            {/* 을 (회원) */}
                            <div className="flex-1 p-5 rounded-xl border-2 border-blue-200 bg-blue-50 relative">
                                <h4 className="font-extrabold text-lg mb-4 text-blue-900">("을") 소속 모델</h4>
                                <div className="space-y-3 font-medium text-sm text-black">
                                    <div className="flex"><span className="w-20 text-gray-500">성명:</span> <span className="font-bold">{contract.member_name}</span></div>
                                    <div className="flex"><span className="w-20 text-gray-500">주민번호:</span> <span className="font-bold">{contract.member_id_num}</span></div>
                                    <div className="flex"><span className="w-20 text-gray-500">주소:</span> <span className="font-bold">{contract.member_address}</span></div>
                                    <div className="flex"><span className="w-20 text-gray-500">연락처:</span> <span className="font-bold">{contract.member_phone}</span></div>
                                </div>
                                <div className="mt-6">
                                    <p className="font-extrabold text-lg mb-2 text-right text-black">서명 (인)</p>
                                    <div className="flex justify-end pr-8 relative">
                                        {contract.signature_image ? (
                                            <img src={contract.signature_image} alt="서명 이미지" className="max-w-[200px] h-20 object-contain -mt-4 border-b-2 border-black" />
                                        ) : (
                                            <div className="w-48 h-20 border-b-2 border-black border-dashed flex items-center justify-center text-gray-400 -mt-4">(서명 누락)</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminContractViewerModal;
