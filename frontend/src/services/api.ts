import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to headers
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth data
            Cookies.remove('token');
            localStorage.removeItem('user');

            // Prevent infinite redirect loops if we are already on the login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
                const pathname = window.location.pathname;
                const segments = pathname.split('/');
                const locale = ['en', 'ar'].includes(segments[1]) ? segments[1] : 'en';
                window.location.href = `/${locale}/auth/login`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;

