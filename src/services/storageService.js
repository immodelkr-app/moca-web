export const saveToStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const getFromStorage = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};
