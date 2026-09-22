import axios from 'axios';
import Cookies from 'js-cookie';
import { authCookieOptions } from '../lib/authCookie';

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
            Cookies.remove('token', authCookieOptions());
            localStorage.removeItem('user');

            // Prevent infinite redirect loops and don't redirect on storefront paths
            const isAuthPage = typeof window !== 'undefined' && window.location.pathname.includes('/auth/login');
            const isStorePage = typeof window !== 'undefined' && (
                window.location.pathname.includes('/store/') ||
                (window.location.hostname.split('.').length > 2 && !window.location.hostname.startsWith('www.'))
            );
            const isAdminApp = typeof window !== 'undefined' && (
                window.location.port === '3002' ||
                window.location.hostname.startsWith('admin.')
            );
            // A brand-new invitee visiting the staff accept-invite page has
            // no token yet by design — any 401 from an unrelated call on
            // that page (e.g. a dashboard-chrome component that shouldn't
            // even be rendering there, see merchant/layout.tsx) must not
            // yank them to login before they've had a chance to accept.
            const isStaffAcceptPage = typeof window !== 'undefined' && window.location.pathname.includes('/merchant/staff/accept');

            if (typeof window !== 'undefined') {
                if (isAdminApp) {
                    window.location.href = '/';
                } else if (!isAuthPage && !isStorePage && !isStaffAcceptPage) {
                    const pathname = window.location.pathname;
                    const segments = pathname.split('/');
                    const locale = ['en', 'ar'].includes(segments[1]) ? segments[1] : 'en';
                    window.location.href = `/${locale}/auth/login`;
                }
            }
        }
        return Promise.reject(error);
    }
);

// Verbose Axios Debug Logger to trace failed backend calls during SSR/Vercel deployments
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error && error.isAxiosError) {
            console.error(`================ [AXIOS ERROR DEBUG] ===============`);
            console.error(`URL: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
            console.error(`Status: ${error.response?.status} (${error.response?.statusText})`);
            console.error(`Response Body:`, JSON.stringify(error.response?.data, null, 2));
            console.error(`Request Headers:`, error.config?.headers);
            console.error(`====================================================`);
        }
        return Promise.reject(error);
    }
);

export default api;

