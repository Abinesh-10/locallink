import { apiClient } from '@/lib/api-client';

export const authApi = {
  phoneSendOtp: (phone: string, purpose: 'login' | 'verify' = 'login') =>
    apiClient.post('/auth/phone/send-otp', { phone, purpose }),

  phoneVerifyOtp: (phone: string, otp: string, purpose: 'login' | 'verify', fullName?: string) =>
    apiClient.post('/auth/phone/verify-otp', { phone, otp, purpose, fullName }),

  emailRegister: (email: string, password: string, fullName: string) =>
    apiClient.post('/auth/email/register', { email, password, fullName }),

  emailVerifyOtp: (email: string, otp: string) => apiClient.post('/auth/email/verify-otp', { email, otp }),

  emailResendOtp: (email: string) => apiClient.post('/auth/email/resend-otp', { email }),

  emailLogin: (email: string, password: string) => apiClient.post('/auth/email/login', { email, password }),

  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { email, otp, newPassword }),

  logout: () => apiClient.post('/auth/logout'),

  googleLoginUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/v1/auth/google`,
};
