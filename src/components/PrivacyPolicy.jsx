import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8F5FF] text-[#1F1235]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#F8F5FF]/90 backdrop-blur-xl border-b border-[#E8E0FA] px-5 pt-14 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-2xl bg-white border border-[#E8E0FA] flex items-center justify-center hover:bg-[#F8F5FF] transition-all shadow-sm group"
                >
                    <span className="material-symbols-outlined text-[20px] text-[#5B4E7A] group-hover:text-[#9333EA]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[#1F1235]">개인정보처리방침</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-10 space-y-10">
                {/* 회사 정보 */}
                <div className="bg-white border border-[#E8E0FA] rounded-[32px] p-8 shadow-sm">
                    <p className="text-[#5B4E7A] text-[15px] leading-relaxed font-medium">
                        <strong className="text-[#1F1235] font-black underline decoration-[#9333EA]/20 underline-offset-4">아임모카(IMMOCA)</strong>는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
                        본 방침을 통해 이용자의 개인정보가 어떻게 수집·이용·보관·파기되는지 알려드립니다.
                    </p>
                    <p className="text-[#9CA3AF] text-xs mt-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        시행일: 2026년 3월 1일 | 최종 수정: 2026년 3월 24일
                    </p>
                </div>

                {/* 제1조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">1</span>
                        수집하는 개인정보 항목
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm space-y-5">
                        <div className="bg-[#F8F5FF] p-4 rounded-2xl border border-[#E8E0FA]/50">
                            <p className="text-[#9333EA] text-xs font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" />
                                필수 항목
                            </p>
                            <p className="text-[#5B4E7A] text-[15px] font-medium leading-relaxed">닉네임, 비밀번호, 이름, 휴대폰번호, 이메일, 주소</p>
                        </div>
                        <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#FEF3C7]">
                            <p className="text-[#D97706] text-xs font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                선택 항목
                            </p>
                            <p className="text-[#5B4E7A] text-[15px] font-medium leading-relaxed">프로필 사진, 포트폴리오 (Google Drive), 키/몸무게/나이/신발사이즈, 배송 메모</p>
                        </div>
                        <div className="bg-[#ECFDF5] p-4 rounded-2xl border border-[#D1FAE5]">
                            <p className="text-[#059669] text-xs font-black mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                                자동 수집 항목
                            </p>
                            <p className="text-[#5B4E7A] text-[15px] font-medium leading-relaxed">접속 IP, 브라우저 종류, 접속 일시, 서비스 이용 기록</p>
                        </div>
                    </div>
                </section>

                {/* 제2조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">2</span>
                        개인정보의 수집 및 이용 목적
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <ul className="text-[#5B4E7A] text-[15px] space-y-3 font-medium">
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>회원 가입 및 관리: 본인 식별, 가입 의사 확인, 서비스 부정 이용 방지</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>서비스 제공: 에이전시 프로필 전송, 스마트 캐스팅, 모카 에디트 쇼핑</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>주문 및 배송: 상품 주문 처리, 배송 진행, CS 대응</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>Google Drive 연동: 사용자의 Google Drive에서 포트폴리오 파일을 선택하기 위한 읽기 전용 접근</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>마케팅 및 이벤트 안내 (선택 동의 시)</li>
                        </ul>
                    </div>
                </section>

                {/* 제3조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">3</span>
                        개인정보의 보유 및 이용 기간
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <ul className="text-[#5B4E7A] text-[15px] space-y-4 font-medium">
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>회원 탈퇴 시 즉시 삭제</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>단, 관련 법령에 따라 아래 기간 보관:
                                <ul className="ml-6 mt-2 space-y-2 bg-[#F8F5FF] p-4 rounded-2xl border border-[#E8E0FA]/50">
                                    <li className="flex justify-between items-center text-sm font-bold"><span>계약 또는 청약철회 기록</span> <span className="text-[#9333EA]">5년</span></li>
                                    <li className="flex justify-between items-center text-sm font-bold"><span>대금결제 및 재화 공급 기록</span> <span className="text-[#9333EA]">5년</span></li>
                                    <li className="flex justify-between items-center text-sm font-bold"><span>소비자 불만 또는 분쟁처리</span> <span className="text-[#9333EA]">3년</span></li>
                                    <li className="flex justify-between items-center text-sm font-bold"><span>접속 기록</span> <span className="text-[#9333EA]">3개월</span></li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 제4조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">4</span>
                        개인정보의 제3자 제공
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black bg-[#F8F5FF] text-[#9333EA] px-2 py-1 rounded-md border border-[#E8E0FA]">제공받는 자</span>
                                <p className="text-[#5B4E7A] text-[15px] font-bold">개별 판매사, 택배사 (CJ, 한진, 롯데 등)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black bg-[#F8F5FF] text-[#9333EA] px-2 py-1 rounded-md border border-[#E8E0FA]">제공 항목</span>
                                <p className="text-[#5B4E7A] text-[15px] font-bold">수령인명, 주소, 휴대폰번호, 주문상품명</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black bg-[#F8F5FF] text-[#9333EA] px-2 py-1 rounded-md border border-[#E8E0FA]">제공 목적</span>
                                <p className="text-[#5B4E7A] text-[15px] font-bold">상품 배송 및 현황 조회</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 제5조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">5</span>
                        Google API 서비스 이용 관련
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <ul className="text-[#5B4E7A] text-[15px] space-y-3 font-medium">
                            <li className="flex gap-3 leading-relaxed font-black text-[#1F1235]">본 서비스는 Google Drive API를 사용하여 사용자가 자신의 Google Drive에서 포트폴리오 파일을 선택할 수 있도록 합니다.</li>
                            <li className="flex gap-3 leading-relaxed items-center">
                                <span className="text-[#9333EA] font-black">•</span>
                                요청하는 권한: <code className="bg-[#F8F5FF] px-2 py-0.5 rounded-lg border border-[#E8E0FA] text-[#9333EA] text-xs font-black tracking-tight self-start mt-1">drive.readonly</code>
                            </li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>선택한 파일의 링크만 저장하며, 파일 내용을 별도로 복사하지 않습니다.</li>
                            <li className="flex gap-3 leading-relaxed">
                                <span className="text-[#9333EA] font-black">•</span>
                                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-[#9333EA] font-black underline decoration-[#9333EA]/20 underline-offset-4 hover:decoration-[#9333EA]/50 transition-all">Google 계정 권한 관리</a> 에서 상시 철회 가능
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 제6조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">6</span>
                        개인정보의 파기 절차 및 방법
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <ul className="text-[#5B4E7A] text-[15px] space-y-3 font-medium">
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>전자적 파일: 기술적 방법을 사용하여 복구 불가능하도록 삭제</li>
                            <li className="flex gap-3 leading-relaxed"><span className="text-[#9333EA] font-black">•</span>종이 문서: 파쇄 또는 소각</li>
                        </ul>
                    </div>
                </section>

                {/* 제7조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">7</span>
                        이용자의 권리와 행사 방법
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <p className="text-[#5B4E7A] text-[15px] font-medium leading-relaxed mb-4">
                            이용자는 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
                        </p>
                        <div className="bg-[#F8F5FF] p-4 rounded-2xl border border-[#E8E0FA] flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#9333EA]">mail</span>
                            <span className="text-[#1F1235] font-black text-sm">immodelkr@gmail.com</span>
                        </div>
                    </div>
                </section>

                {/* 제8조 */}
                <section className="space-y-4">
                    <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">8</span>
                        개인정보 보호책임자
                    </h2>
                    <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
                        <div className="text-[#5B4E7A] text-[15px] space-y-2 font-medium">
                            <p className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" /> <strong className="text-[#1F1235] font-black">담당:</strong> 아임모카 개인정보 보호 담당</p>
                            <p className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" /> <strong className="text-[#1F1235] font-black">이메일:</strong> immodelkr@gmail.com</p>
                            <p className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" /> <strong className="text-[#1F1235] font-black">웹사이트:</strong> https://immoca.kr</p>
                        </div>
                    </div>
                </section>

                {/* 푸터 */}
                <div className="text-center text-[#9CA3AF] text-xs pt-8 pb-12 border-t border-[#E8E0FA] font-medium">
                    <p>© 2026 아임모카(IMMOCA). All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
