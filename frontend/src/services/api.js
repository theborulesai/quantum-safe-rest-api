import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/api/register', data);
export const login = (data) => api.post('/api/login', data);
export const getMe = () => api.get('/api/me');

// Keys
export const generateKeys = (algorithm = 'both') => api.post('/api/keys/generate', { algorithm });
export const getPublicKeys = (username) => api.get(`/api/keys/public?username=${username}`);

// KEM
export const kemEncapsulate = (recipientUsername) =>
  api.post('/api/kem/encapsulate', { recipient_username: recipientUsername });
export const kemDecapsulate = (kemCiphertext) =>
  api.post('/api/kem/decapsulate', { kem_ciphertext: kemCiphertext });

// Encrypt / Decrypt
export const encryptMessage = (plaintext, recipientUsername) =>
  api.post('/api/encrypt', { plaintext, recipient_username: recipientUsername });
export const decryptMessage = (nonce, ciphertext, kemCiphertext) =>
  api.post('/api/decrypt', { nonce, ciphertext, kem_ciphertext: kemCiphertext });

// Sign / Verify
export const signMessage = (message) => api.post('/api/sign', { message });
export const verifySignature = (signerUsername, message, signature) =>
  api.post('/api/verify', { signer_username: signerUsername, message, signature });

// Messages
export const sendMessage = (recipientUsername, plaintext) =>
  api.post('/api/messages/send', { recipient_username: recipientUsername, plaintext });
export const getMessages = () => api.get('/api/messages');
export const getMessage = (id) => api.get(`/api/messages/${id}`);

// Security & Benchmark
export const getSecurityStatus = () => api.get('/api/security/status');
export const getBenchmark = () => api.get('/api/benchmark');
export const getLogs = () => api.get('/api/logs');

export default api;

