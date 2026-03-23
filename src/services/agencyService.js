import Papa from 'papaparse';

const CSV_URL = '/에이전시주소.csv';

export const fetchAgencies = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const cacheBuster = new Date().getTime();
            const response = await fetch(`${CSV_URL}?t=${cacheBuster}`);
            const buffer = await response.arrayBuffer();

            let text;

            // Try decoding as UTF-8 (strict) first
            try {
                const decoderUTF8 = new TextDecoder('utf-8', { fatal: true });
                text = decoderUTF8.decode(buffer);
            } catch (e) {
                // If invalid UTF-8 (e.g. EUC-KR/CP949), fallback to EUC-KR
                console.log("UTF-8 decoding failed, falling back to EUC-KR");
                const decoderKR = new TextDecoder('euc-kr');
                text = decoderKR.decode(buffer);
            }

            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
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
