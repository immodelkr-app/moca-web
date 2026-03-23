

const url = 'https://zlbteyntcolscvsptxzf.supabase.co/functions/v1/aligo-send';
const key = process.env.VITE_SUPABASE_ANON_KEY;

const payload = {
    type: 'kakao',
    templateCode: 'KA01TP26030909163775811k3Q5BZRBk',
    receivers: [{
        phone: '01090424521',
        name: '김대희',
        variables: {
            "이름": "김대희",
            "변경등급": "GOLD",
            "적용일자": "2026. 3. 10.",
            "만료일자": "2027. 3. 10." // Updated format just in case
        },
        button: {
            button: [
                {
                    name: "멤버십 혜택 보러가기",
                    linkType: "WL",
                    linkTypeName: "웹링크",
                    linkM: "https://immoca.kr/home/membership",
                    linkP: "https://immoca.kr/home/membership"
                }
            ]
        }
    }]
};

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log('Edge Response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Edge Error:', err));
