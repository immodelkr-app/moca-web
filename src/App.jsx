import React from 'react';
import ClassListPage from './components/ClassListPage';
import ClassDetailPage from './components/ClassDetailPage';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';

import HomeDashboard from './components/HomeDashboard';

import TourDiary from './components/TourDiary';
import AffiliatedAgencies from './components/AffiliatedAgencies';
import AgencyLanding from './components/AgencyLanding';
import AgencyDirectory from './components/AgencyDirectory';
import KimDaepyoTV from './components/KimDaepyoTV';
import AgencyTourCalendar from './components/AgencyTourCalendar';
import AdminPage from './components/AdminPage';
import UpgradePage from './components/UpgradePage';
import UpgradeApplicationPage from './components/UpgradeApplicationPage';
import ProtectedRoute from './components/ProtectedRoute';
import MembershipBenefits from './components/MembershipBenefits';
import ModelCoupons from './components/ModelCoupons';
import Membership from './components/Membership';
import KimDaepyoMessage from './components/KimDaepyoMessage';
import MocaLounge from './components/MocaLounge';
import GradeCelebrationModal from './components/GradeCelebrationModal';
import MocaShop from './components/MocaShop';
import BenefitsHub from './components/BenefitsHub';
import CertificationFeed from './components/CertificationFeed';
import SmartProfile from './components/SmartProfile';
import ExclusiveContractPage from './components/ExclusiveContractPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import PaymentSuccess from './components/shop/PaymentSuccess';
import PaymentFail from './components/shop/PaymentFail';
import ClassPaymentSuccess from './components/payment/ClassPaymentSuccess';
import { usePageView } from './hooks/usePageView';
import { useAutoLogout } from './hooks/useAutoLogout';
import { useAuthSync } from './hooks/useAuthSync';
import PopupBanner from './components/PopupBanner';

function AppContent() {
    usePageView(); // 라우트 변경 감지 및 조회수 기록
    useAutoLogout(); // 자동 로그아웃 체크 타이머 등록
    useAuthSync(); // 소셜 로그인 상태 감지 및 동기화

    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');

    return (
        <>
            <GradeCelebrationModal />
            {!isAdmin && <PopupBanner />}
            <Routes>
                {/* 에이전시 전용 랜딩 (레이아웃 없음) */}
                <Route path="/" element={<AgencyLanding />} />
                {/* 공개 페이지 (로그인 불필요) */}
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                {/* 토스페이먼츠 결제 콜백 (로그인 없이 접근 가능해야 함) */}
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/class-success" element={<ClassPaymentSuccess />} />
                <Route path="/payment/fail" element={<PaymentFail />} />
                {/* 보호된 라우트 (로그인 필요) */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/agencies" element={<Layout />}>
                        <Route index element={<AgencyDirectory />} />
                    </Route>

                    {/* 기존 앱 라우트 (현재 /home 로컬 변경됨) */}
                    <Route path="/home" element={<Layout />}>
                        <Route index element={<Navigate to="/home/dashboard" replace />} />
                        <Route path="dashboard" element={<HomeDashboard />} />
                        <Route path="diary" element={<TourDiary />} />
                        <Route path="calendar" element={<AgencyTourCalendar />} />
                        <Route path="content" element={<AffiliatedAgencies />} />
                        <Route path="tv" element={<KimDaepyoTV />} />
                        <Route path="membership" element={<MembershipBenefits />} />
                        <Route path="coupons" element={<ModelCoupons />} />
                        <Route path="message" element={<KimDaepyoMessage />} />
                        <Route path="lounge" element={<MocaLounge />} />
                        <Route path="shop" element={<MocaShop />} />
                        <Route path="benefits" element={<BenefitsHub />} />
                        <Route path="cert" element={<CertificationFeed />} />
                        <Route path="smart-profile" element={<SmartProfile />} />

                        <Route path="class" element={<ClassListPage />} />
                        <Route path="class/:id" element={<ClassDetailPage />} />
                    </Route>
                </Route>

                {/* /app 접근 시 랜딩 페이지(/)로 강제 리다이렉트 (이전 URL 대응) */}
                <Route path="/app/*" element={<Navigate to="/" replace />} />

                {/* 관리자 페이지 */}
                <Route path="/admin" element={<AdminPage />} />

                {/* 업그레이드 (페이월) 페이지 */}
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/upgrade-apply" element={<UpgradeApplicationPage />} />

                {/* 전속계약서 (공개 접근 허용) */}
                <Route path="/contract" element={<ExclusiveContractPage />} />
                <Route path="/contract/:name" element={<ExclusiveContractPage />} />
                <Route path="/home/contract" element={<Navigate to="/contract" replace />} />

            </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
