import React from 'react';
import DigitalCard from './Membership/DigitalCard';
import CouponSection from './Membership/CouponSection';
import BenefitList from './Membership/BenefitList';

const Membership = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative pb-32">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#6C63FF]/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] bg-[#818CF8]/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

            <div className="max-w-md mx-auto px-5 pt-14 lg:pt-16 relative z-10 flex flex-col items-center">
                {/* 1. 디지털 명함 (상단) */}
                <DigitalCard />

                {/* 2. 내 쿠폰 & 3. 혜택 리스트 (중/하단) */}
                <div className="w-full mt-10 space-y-10">
                    <CouponSection />
                    <BenefitList />
                </div>
            </div>
        </div>
    );
};

export default Membership;
