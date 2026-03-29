import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmClassPayment, saveClassCalendarEvent, sendClassApplicationNotification } from '../../services/classService';
import { supabase } from '../../services/supabaseClient';

const ClassPaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [classInfo, setClassInfo] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const confirm = async () => {
            try {
                const paymentKey = searchParams.get('paymentKey');
                const orderId = searchParams.get('orderId');
                const amount = Number(searchParams.get('amount'));

                if (!paymentKey || !orderId || !amount) {
                    throw new Error('결제 정보가 올바르지 않습니다.');
                }

                // 1. 저장된 펜딩 신청 정보 불러오기
                const pendingRaw = localStorage.getItem('moca_pending_class_order');
                if (!pendingRaw) throw new Error('신청 정보를 찾을 수 없습니다.');
                const pending = JSON.parse(pendingRaw);

                // 2. 금액 검증 (조작 방지)
                if (pending.finalPrice !== amount) {
                    throw new Error('결제 금액이 일치하지 않습니다.');
                }

                // 3. 토스페이먼츠 결제 승인 & DB 업데이트 (paid)
                const { error: confirmError } = await confirmClassPayment({
                    paymentKey,
                    orderId,
                    amount,
                    applicationId: pending.applicationId
                });

                if (confirmError) {
                    throw new Error('결제 승인 처리 실패: ' + (confirmError.message || JSON.stringify(confirmError)));
                }

                // 4. 결제 성공 시 캘린더에 자동 저장
                // 클래스 정보를 DB에서 한번 더 가져와서 정확한 날짜/장소 확인
                const { data: cls } = await supabase
                    .from('classes')
                    .select('*')
                    .eq('id', pending.classId)
                    .single();

                if (cls) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        // 4. 결제 성공 시 캘린더에 자동 저장
                        await saveClassCalendarEvent({
                            userId: user.id,
                            classId: cls.id,
                            title: cls.title,
                            classDate: cls.class_date,
                            location: cls.location,
                            description: cls.description,
                        });

                        // 5. 신청 완료 알림톡 발송 (카드 결제 즉시 승인)
                        sendClassApplicationNotification({
                            userName:   pending.userName || user.email?.split('@')[0] || '회원',
                            phone:      (user.user_metadata?.phone || '').replace(/-/g, ''), // 유저 메타데이터나 펜딩 정보 활용
                            classTitle: cls.title,
                            classDate:  cls.class_date,
                            location:   cls.location,
                            paidPrice:  amount,
                        })
                            .then(() => console.log('카드결제 알림톡 발송 완료'))
                            .catch(err => console.error('알림톡 발송 실패:', err));
                    }
                    setClassInfo(cls);
                }

                // 5. 로컬스토리지 정리
                localStorage.removeItem('moca_pending_class_order');
                setStatus('success');

            } catch (err) {
                console.error('[ClassPaymentSuccess] 오류:', err);
                setErrorMsg(err.message || '결제 처리 중 오류가 발생했습니다.');
                setStatus('error');
            }
        };

        confirm();
    }, []);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-gray-500 font-bold">결제를 확인하고 캘린더를 업데이트하는 중입니다...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                </div>
                <h2 className="text-gray-900 font-black text-2xl mb-2">결제 승인 실패</h2>
                <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
                <button
                    onClick={() => navigate('/home/class')}
                    className="px-8 py-3 rounded-2xl bg-indigo-500 text-white font-black shadow-lg"
                >
                    클래스 목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
                </div>
                <h2 className="text-gray-900 font-black text-3xl mb-2">신청 완료! 🎉</h2>
                <p className="text-gray-500 text-sm mb-8 font-medium">카드 결제가 성공적으로 승인되었습니다.<br />일정이 모카앱 캘린더에 자동 저장되었습니다.</p>

                {classInfo && (
                    <div className="bg-indigo-50 rounded-[28px] p-6 mb-8 text-left border border-indigo-100/50 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">클래스 정보</p>
                        <h4 className="text-lg font-black text-gray-900 mb-4">{classInfo.title}</h4>
                        
                        <div className="space-y-2.5">
                            <InfoRow icon="calendar_month" label="일시" value={classInfo.class_date} />
                            <InfoRow icon="location_on" label="장소" value={classInfo.location} />
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/home/calendar')}
                        className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        내 캘린더 확인하기
                    </button>
                    <button
                        onClick={() => navigate('/home/class')}
                        className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-black hover:bg-gray-200 transition-all"
                    >
                        다른 클래스 보러가기
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[18px] text-indigo-400 mt-0.5">{icon}</span>
        <div>
            <p className="text-[11px] font-bold text-gray-400 leading-none mb-1">{label}</p>
            <p className="text-[13px] font-black text-gray-700">{value}</p>
        </div>
    </div>
);

export default ClassPaymentSuccess;
