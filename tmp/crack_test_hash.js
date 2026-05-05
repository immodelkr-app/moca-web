const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

const targetHash = '-haqep1';
const commonPasswords = ['1234', '123456', '0000', 'password', 'immoca', 'test1234', 'test'];

commonPasswords.forEach(pw => {
    if (simpleHash(pw) === targetHash) {
        console.log(`Match found! Password: ${pw}`);
    }
});
