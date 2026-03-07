import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('edukno_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('edukno_token');
            localStorage.removeItem('edukno_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──
export const authAPI = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateMe: (data: any) => api.put('/auth/me', data),
};

// ── Content ──
export const contentAPI = {
    list: (params?: any) => api.get('/content/', { params }),
    get: (id: string) => api.get(`/content/${id}`),
    create: (data: any) => api.post('/content/', data),
    update: (id: string, data: any) => api.put(`/content/${id}`, data),
    delete: (id: string) => api.delete(`/content/${id}`),
    upvote: (id: string) => api.post(`/content/${id}/upvote`),
    recordView: (id: string) => api.post(`/content/${id}/view`),
    categories: () => api.get('/content/categories'),
    download: (id: string) => api.post(`/content/${id}/download`),
    bookmark: (id: string) => api.post(`/content/${id}/bookmark`),
    unbookmark: (id: string) => api.delete(`/content/${id}/bookmark`),
    bookmarkStatus: (id: string) => api.get(`/content/${id}/bookmark/status`),
    getBookmarks: () => api.get('/content/bookmarks'),
};

// ── Search ──
export const searchAPI = {
    search: (q: string, params?: any) => api.get('/search/', { params: { q, ...params } }),
    autocomplete: (q: string) => api.get('/search/autocomplete', { params: { q } }),
};

// ── Recommendations ──
export const recommendAPI = {
    getPersonalized: (limit?: number) => api.get('/recommendations/', { params: { limit } }),
    getTrending: (limit?: number) => api.get('/recommendations/trending', { params: { limit } }),
};

// ── Chatbot ──
export const chatbotAPI = {
    chat: (message: string, context?: any, history?: any[]) =>
        api.post('/chatbot/chat', { message, context, history }),
    suggestions: () => api.get('/chatbot/suggestions'),
};

// ── Gamification ──
export const gamificationAPI = {
    badges: () => api.get('/gamification/badges'),
    leaderboard: (timeframe?: string, limit?: number) =>
        api.get('/gamification/leaderboard', { params: { timeframe, limit } }),
    stats: () => api.get('/gamification/stats'),
    checkBadges: () => api.post('/gamification/check-badges'),
};

// ── Analytics ──
export const analyticsAPI = {
    overview: () => api.get('/analytics/overview'),
    content: () => api.get('/analytics/content'),
    users: () => api.get('/analytics/users'),
    search: () => api.get('/analytics/search'),
};

export default api;
