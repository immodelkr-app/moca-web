import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/60">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-white">개인정보처리방침</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
                {/* 회사 정보 */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
                    <p className="text-white/60 text-sm leading-relaxed">
                        <strong className="text-white">아임모카(IMMOCA)</strong>는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
                        본 방침을 통해 이용자의 개인정보가 어떻게 수집·이용·보관·파기되는지 알려드립니다.
                    </p>
                    <p className="text-white/30 text-xs mt-2">시행일: 2026년 3월 1일 | 최종 수정: 2026년 3월 24일</p>
                </div>

                {/* 제1조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">1</span>
                        수집하는 개인정보 항목
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                        <div>
                            <p className="text-indigo-400 text-xs font-black mb-1">필수 항목</p>
                            <p className="text-white/60 text-sm">닉네임, 비밀번호, 이름, 휴대폰번호, 이메일, 주소</p>
                        </div>
                        <div>
                            <p className="text-amber-400 text-xs font-black mb-1">선택 항목</p>
                            <p className="text-white/60 text-sm">프로필 사진, 포트폴리오 링크(Google Drive), 키/몸무게/나이/신발사이즈, 배송 메모</p>
                        </div>
                        <div>
                            <p className="text-emerald-400 text-xs font-black mb-1">자동 수집 항목</p>
                            <p className="text-white/60 text-sm">접속 IP, 브라우저 종류, 접속 일시, 서비스 이용 기록</p>
                        </div>
                    </div>
                </section>

                {/* 제2조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">2</span>
                        개인정보의 수집 및 이용 목적
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>회원 가입 및 관리: 본인 식별, 가입 의사 확인, 서비스 부정 이용 방지</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>서비스 제공: 에이전시 프로필 전송, 스마트 캐스팅, 모카 에디트 쇼핑</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>주문 및 배송: 상품 주문 처리, 배송 진행, CS 대응</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>Google Drive 연동: 사용자의 Google Drive에서 포트폴리오 파일을 선택하기 위한 읽기 전용 접근 (drive.readonly)</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>마케팅 및 이벤트 안내 (선택 동의 시)</li>
                        </ul>
                    </div>
                </section>

                {/* 제3조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">3</span>
                        개인정보의 보유 및 이용 기간
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>회원 탈퇴 시 즉시 삭제</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>단, 관련 법령에 따라 아래 기간 보관:
                                <ul className="ml-4 mt-1 space-y-1">
                                    <li>- 계약 또는 청약철회 등에 관한 기록: 5년</li>
                                    <li>- 대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                                    <li>- 소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
                                    <li>- 접속에 관한 기록: 3개월</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 제4조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">4</span>
                        개인정보의 제3자 제공
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span><strong className="text-white/80">제공받는 자:</strong> 개별 상품 판매사, 택배사 (CJ대한통운, 한진택배, 롯데택배 등)</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span><strong className="text-white/80">제공 항목:</strong> 수령인명, 배송주소, 휴대폰번호, 주문상품명</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span><strong className="text-white/80">제공 목적:</strong> 상품 배송 및 배송 현황 조회</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span><strong className="text-white/80">보유 기간:</strong> 배송 완료 후 3개월 또는 회원 탈퇴 시까지</li>
                        </ul>
                    </div>
                </section>

                {/* 제5조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">5</span>
                        Google API 서비스 이용 관련
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>본 서비스는 Google Drive API를 사용하여 사용자가 자신의 Google Drive에서 포트폴리오 파일을 선택할 수 있도록 합니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>요청하는 권한: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">drive.readonly</code> (읽기 전용)</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>사용자가 선택한 파일의 링크(URL)만 저장하며, 파일 내용을 별도로 복사하거나 저장하지 않습니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>사용자는 언제든지 <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Google 계정 권한 관리</a>에서 접근 권한을 철회할 수 있습니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>본 앱은 <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Google API Services User Data Policy</a>를 준수합니다.</li>
                        </ul>
                    </div>
                </section>

                {/* 제6조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">6</span>
                        개인정보의 파기 절차 및 방법
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>전자적 파일: 기술적 방법을 사용하여 복구 불가능하도록 삭제</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>종이 문서: 파쇄 또는 소각</li>
                        </ul>
                    </div>
                </section>

                {/* 제7조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">7</span>
                        이용자의 권리와 행사 방법
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>요청 방법: 이메일 (immodelkr@gmail.com) 또는 앱 내 문의</li>
                        </ul>
                    </div>
                </section>

                {/* 제8조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-black">8</span>
                        개인정보 보호책임자
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <div className="text-white/60 text-sm space-y-1">
                            <p><strong className="text-white/80">담당:</strong> 아임모카 개인정보 보호 담당</p>
                            <p><strong className="text-white/80">이메일:</strong> immodelkr@gmail.com</p>
                            <p><strong className="text-white/80">웹사이트:</strong> https://immoca.kr</p>
                        </div>
                    </div>
                </section>

                {/* 푸터 */}
                <div className="text-center text-white/20 text-xs pt-4 pb-8 border-t border-white/5">
                    <p>© 2026 아임모카(IMMOCA). All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
