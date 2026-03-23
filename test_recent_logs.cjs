const crypto = require('crypto');

const SOLAPI_API_KEY = "NCSX2JQEWPNP6K4R";
const SOLAPI_SECRET_KEY = "IB1PHQULIRPJAY6VGWMLCQEWJIU9NUND";

const date = new Date().toISOString();
const salt = crypto.randomUUID().replace(/-/g, '');
const signature = crypto.createHmac('sha256', SOLAPI_SECRET_KEY).update(date + salt).digest('hex');

const auth = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

fetch('https://api.solapi.com/messages/v4/list?limit=5', {
    method: 'GET',
    headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
    }
})
.then(res => res.json())
.then(data => {
    if (data && data.messageList) {
        console.log("=== 최근 발송 내역 5건 ===");
        Object.values(data.messageList).forEach(msg => {
            console.log(`\n발송시간: ${new Date(msg.dateCreated).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}`);
            console.log(`수신번호: ${msg.to}`);
            console.log(`상태: ${msg.status} (코드: ${msg.statusCode})`);
            console.log(`비고: ${msg.reason || '정상'}`);
            console.log(`내용: ${msg.text ? msg.text.substring(0, 30) + '...' : '없음'}`);
            console.log(`템플릿ID: ${msg.kakaoOptions?.templateId || '없음'}`);
        });
    } else {
        console.log("응답:", data);
    }
})
.catch(err => console.error("Error:", err));
