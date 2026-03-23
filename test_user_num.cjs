const crypto = require('crypto');

const SOLAPI_API_KEY = "NCSX2JQEWPNP6K4R";
const SOLAPI_SECRET_KEY = "IB1PHQULIRPJAY6VGWMLCQEWJIU9NUND";

const date = new Date().toISOString();
const salt = crypto.randomUUID().replace(/-/g, '');
const signature = crypto.createHmac('sha256', SOLAPI_SECRET_KEY).update(date + salt).digest('hex');

const auth = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

const body = {
    message: {
        to: "01090424521",
        from: "01055439674",
        kakaoOptions: {
            pfId: "KA01PF260309085923456gdN56tP4xVG",
            templateId: "KA01TP26030909163775811k3Q5BZRBk", 
            variables: {
                "#{이름}": "김대희",
                "#{변경등급}": "GOLD",
                "#{적용일자}": "2026. 3. 10.",
                "#{만료일자}": "27. 03. 10."
            },
            buttons: [{
                buttonType: "WL",
                buttonName: "멤버십 혜택 보러가기",
                linkMo: "https://immoca.kr/home/membership",
                linkPc: "https://immoca.kr/home/membership"
            }]
        }
    }
};

fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
})
.then(res => res.json())
.then(data => console.log("Response:", JSON.stringify(data, null, 2)))
.catch(err => console.error("Error:", err));
