const crypto = require('crypto');

const SOLAPI_API_KEY = "NCSX2JQEWPNP6K4R";
const SOLAPI_SECRET_KEY = "IB1PHQULIRPJAY6VGWMLCQEWJIU9NUND";

const date = new Date().toISOString();
const salt = crypto.randomUUID().replace(/-/g, '');
const signature = crypto.createHmac('sha256', SOLAPI_SECRET_KEY).update(date + salt).digest('hex');

const auth = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

fetch('https://api.solapi.com/messages/v4/list?limit=1', {
    method: 'GET',
    headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
    }
})
.then(res => res.json())
.then(data => console.log("Response:", JSON.stringify(data, null, 2)))
.catch(err => console.error("Error:", err));
