'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestOtp, verifyOtp } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/Button';

const MOBILE_PATTERN = /^[0-9]{10}$/;

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    if (!MOBILE_PATTERN.test(mobile)) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await requestOtp(mobile);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyOtp(mobile, code);
      // Same login endpoint every role uses (backend/src/auth) — the
      // dashboard just refuses to seat a trekker account here, rather than
      // signing them in and letting every subsequent request 403.
      if (result.user.role !== 'officer' && result.user.role !== 'admin') {
        setError(
          'This account isn’t authorized for the dashboard — sign in with an officer or admin account.',
        );
        return;
      }
      signIn(result.accessToken, result.user);
      router.replace('/applications');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Trek Permit</h1>
        <p className="mt-1 mb-8 text-sm text-gray-500">Department dashboard &mdash; officers and admins</p>

        {step === 'mobile' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Mobile number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button
              type="submit"
              disabled={!MOBILE_PATTERN.test(mobile)}
              loading={isSubmitting}
              className="w-full"
            >
              Send code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to <span className="font-medium">{mobile}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button
              type="submit"
              disabled={!/^[0-9]{6}$/.test(code)}
              loading={isSubmitting}
              className="w-full"
            >
              Verify
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('mobile');
                setCode('');
                setError(null);
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
