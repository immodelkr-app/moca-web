import Papa from 'papaparse';

const PRIMARY_CSV_URL = '/agencies.csv';
const FALLBACK_CSV_URL = '/agencies-fallback.csv';
// 네트워크가 멈춰 있으면 무한 로딩되므로 일정 시간 뒤 실패 처리
const FETCH_TIMEOUT_MS = 15000;

export const fetchAgencies = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const cacheBuster = Date.now() + '_' + Math.random().toString(36).substring(7);
            let response;
            try {
                response = await fetch(`${PRIMARY_CSV_URL}?v=${cacheBuster}`, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
                if (!response.ok) throw new Error('Primary CSV failed');
            } catch (err) {
                console.warn('Primary CSV fetch failed, falling back to legacy Korean CSV URL:', err);
                response = await fetch(`${FALLBACK_CSV_URL}?v=${cacheBuster}`, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
            }

            const buffer = await response.arrayBuffer();

            let text;
            try {
                const decoderUTF8 = new TextDecoder('utf-8', { fatal: true });
                text = decoderUTF8.decode(buffer);
            } catch (e) {
                const decoderKR = new TextDecoder('euc-kr');
                text = decoderKR.decode(buffer);
            }

            // Remove BOM if present
            if (text.startsWith('\ufeff')) {
                text = text.slice(1);
            }

            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const formatted = (results.data || []).map(item => ({
                        ...item,
                        booking_url: item.booking_url ? item.booking_url.trim() : ''
                    }));
                    resolve(formatted);
                },
                error: (error) => {
                    reject(error);
                },
            });
        } catch (error) {
            reject(error);
        }
    });
};
