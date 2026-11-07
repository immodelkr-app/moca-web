import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { unsubscribeOutreach } from '../services/outreachEmailService';

// 홍보 메일 수신거부(/unsubscribe/:token). 버튼을 눌러야 처리한다(메일 검사기가 링크를 열어도 자동 거부되지 않도록).
const OutreachUnsubscribePage = () => {
    const { token } = useParams();
    const [state, setState] = useState('ask'); // ask | busy | done | notfound | error

    const handle = async () => {
        setState('busy');
        const { found, error } = await unsubscribeOutreach(token);
        setState(error ? 'error' : found ? 'done' : 'notfound');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--moca-bg)] px-4">
            <div className="max-w-sm w-full rounded-2xl border border-[var(--moca-border)] bg-white p-6 text-center">
                <h1 className="text-lg font-black text-[var(--moca-text)] mb-2">메일 수신거부</h1>
                {state === 'ask' && (
                    <>
                        <p className="text-sm text-[var(--moca-text-3)] font-bold mb-5">모카캐스팅 안내 메일을 더 이상 받지 않으시겠어요?</p>
                        <button onClick={handle} className="w-full py-3 rounded-xl bg-[var(--moca-primary)] text-white text-sm font-black">수신거부하기</button>
                    </>
                )}
                {state === 'busy' && <p className="text-sm text-[var(--moca-text-3)] font-bold">처리 중...</p>}
                {state === 'done' && <p className="text-sm text-[var(--moca-text)] font-bold">수신거부가 완료되었습니다. 앞으로 안내 메일을 보내지 않겠습니다.</p>}
                {state === 'notfound' && <p className="text-sm text-[var(--moca-text-3)] font-bold">유효하지 않은 링크입니다. immodelkr@gmail.com 으로 문의해 주세요.</p>}
                {state === 'error' && <p className="text-sm text-red-500 font-bold">처리 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 immodelkr@gmail.com 으로 문의해 주세요.</p>}
            </div>
        </div>
    );
};

export default OutreachUnsubscribePage;
