import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function GoogleLoginButton() {
    const { login } = useAuth();
    const router = useRouter();

    const handleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            if (!credentialResponse.credential) {
                toast.error('Google login failed: No credential received');
                return;
            }

            const response = await api.post('/auth/google', {
                token: credentialResponse.credential,
            });

            const data = response.data as any;
            login(data.token, data);
            toast.success('Logged in with Google successfully');
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            toast.error(err.response?.data?.message || 'Google login failed');
        }
    };

    // If client ID is missing/placeholder, rendering the button might still work visually, 
    // but clicking it will fail.
    // We can also prevent rendering or show a disabled state if we could detect it, 
    // but the provider doesn't expose the client ID easily here. 
    // We'll rely on the Google button's internal error handling which mimics the 'onError' callback.

    return (
        <div className="flex justify-center w-full mt-4">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => {
                    toast.error('Google Login Failed');
                }}
                theme="outline"
                size="large"
                width="350px"
                text="continue_with"
                shape="pill"
            />
        </div>
    );
}
