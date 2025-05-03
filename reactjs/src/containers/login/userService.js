import axios from 'axios';

const login = async (username, password) => {
    return await axios.post('http://localhost:3000/api/v1/login', { username, password }, { withCredentials: true });
};

const logout = async () => {
    return await axios.get('http://localhost:3000/api/v1/logout', { withCredentials: true });
};

const account = async () => {
    return await axios.get('http://localhost:3000/api/v1/account', { withCredentials: true });
};

const loginWithGoogle = async (googleId, email, fullname) => {
    return await axios.post('http://localhost:3000/api/v1/google', { googleId, email, fullname }, { withCredentials: true });
};

export { login, logout, account, loginWithGoogle };