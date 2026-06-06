'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function ClearCookiesPage() {
    const router = useRouter();

    useEffect(() => {
        // Clear all auth-related data
        Cookies.remove('token');
        localStorage.removeItem('user');

        // Redirect to login after a short delay
        setTimeout(() => {
            router.push('/auth/login');
        }, 1000);
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-900">Clearing session...</h2>
                <p className="text-gray-500 mt-2">Redirecting to login page...</p>
            </div>
        </div>
    );
}
