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

for (let i = 0; i < 10000; i++) {
    const pw = i.toString().padStart(4, '0');
    if (simpleHash(pw) === targetHash) {
        console.log(`Match found! Password: ${pw}`);
        process.exit();
    }
}

for (let i = 0; i < 10000; i++) {
    const pw = i.toString();
    if (simpleHash(pw) === targetHash) {
        console.log(`Match found! Password: ${pw}`);
        process.exit();
    }
}

console.log('No 4-digit match found.');
