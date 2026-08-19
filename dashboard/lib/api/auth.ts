import { apiRequest } from './client';
import { AuthResult } from '../types';

export function requestOtp(mobile: string): Promise<{ message: string }> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { mobile } });
}

export function verifyOtp(mobile: string, code: string): Promise<AuthResult> {
  return apiRequest('/auth/otp/verify', { method: 'POST', body: { mobile, code } });
}
