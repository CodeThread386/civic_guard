'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { User, ShieldCheck } from 'lucide-react';

type AuthMode = 'choose' | 'login' | 'signup';
type Step = 'mode' | 'role' | 'email' | 'otp' | 'complete';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, completeSignup, logout } = useAuth();
  const [mode, setMode] = useState<AuthMode | null>(null);

  useEffect(() => {
    const r = searchParams.get('role');
    const m = searchParams.get('mode');
    if (r === 'verifier') {
      setRole('verifier');
      setMode('login'); // Issuer: login only, no signup
    } else if (r === 'user') {
      setRole('user');
      setMode(m === 'login' || m === 'signup' ? m : null);
    }
  }, [searchParams]);
  const [role, setRole] = useState<'user' | 'verifier' | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [wallet, setWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const step =
    !role ? 'role'
      : role === 'user' && !mode ? 'mode'
        : !email ? 'email'
          : !otpSent ? 'email'
            : !otpVerified ? 'otp'
              : mode === 'signup' && !wallet ? 'email'
                : 'complete';

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpSent(true);
      if (data.devOtp) setDevOtp(data.devOtp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setOtpVerified(true);

      if (mode === 'signup') {
        // Reject signup if email already registered - prevents confusion
        const lookupRes = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (lookupRes.ok) {
          setError('This email is already registered. Please use Login instead.');
          setOtpVerified(false);
          setLoading(false);
          return;
        }
        const signupResult = await signup(email, role!);
        if (signupResult.wallet) {
          setWallet(signupResult.wallet);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!wallet) return;
    setLoading(true);
    setError('');
    try {
      const result = await completeSignup(wallet.privateKey, role === 'verifier');
      if (!result.success) throw new Error(result.error || 'Blockchain registration failed');
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          address: wallet.address,
          privateKey: wallet.privateKey,
          role,
        }),
      });
      if (role === 'verifier') {
        await fetch('/api/verifiers/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: wallet.address,
            name: `Verifier ${wallet.address.slice(0, 8)}...`,
            documentTypes: ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'],
          }),
        });
      }
      localStorage.setItem('civicguard_auth', JSON.stringify({
        email: email.trim(),
        role,
        address: wallet.address,
        privateKey: wallet.privateKey,
      }));
      window.location.href = role === 'verifier' ? '/issuer' : '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await login(email, role!, otpVerified);
      if (!result.success) throw new Error(result.error);
      window.location.href = role === 'verifier' ? '/issuer' : '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    const credential = credentialResponse.credential;
    if (!credential || !role) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          role,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      localStorage.setItem('civicguard_auth', JSON.stringify({
        email: data.email,
        role: data.role,
        address: data.address,
        privateKey: data.privateKey,
        blockchainPending: data.blockchainPending || false,
      }));
      window.location.href = data.role === 'verifier' ? '/issuer' : '/dashboard';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed';
      if (msg.includes('ECONNREFUSED') || msg.includes('127.0.0.1:8545')) {
        setError('Blockchain not reachable. Start Hardhat: npx hardhat node. Then try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900/20 to-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">CivicGuard</h1>

        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-center">Volunteer — Login or Sign up</p>
            <div className="flex gap-4">
              <a
                href="/auth?role=user&mode=login"
                className="flex-1 py-3 px-4 bg-teal-600/80 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors cursor-pointer text-center no-underline"
              >
                Login
              </a>
              <a
                href="/auth?role=user&mode=signup"
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors cursor-pointer text-center no-underline"
              >
                Sign Up
              </a>
            </div>
            <a href="/" className="block w-full py-2 text-slate-500 hover:text-slate-400 text-sm text-center">
              Back to home
            </a>
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-center">Select your role</p>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/auth?role=user"
                className="flex flex-col items-center gap-2 py-6 px-4 bg-slate-700/50 hover:bg-teal-600/30 border border-slate-600 hover:border-teal-500 rounded-xl transition-colors cursor-pointer no-underline"
              >
                <User className="w-10 h-10 text-teal-400" />
                <span className="font-medium text-white">Volunteer</span>
                <span className="text-xs text-slate-400">Request & store documents</span>
              </a>
              <a
                href="/auth?role=verifier"
                className="flex flex-col items-center gap-2 py-6 px-4 bg-slate-700/50 hover:bg-teal-600/30 border border-slate-600 hover:border-teal-500 rounded-xl transition-colors cursor-pointer no-underline"
              >
                <ShieldCheck className="w-10 h-10 text-teal-400" />
                <span className="font-medium text-white">Issuer</span>
                <span className="text-xs text-slate-400">Verify & issue documents</span>
              </a>
            </div>
            <a href="/" className="block w-full py-2 text-slate-500 hover:text-slate-400 text-sm text-center">
              Back to home
            </a>
          </div>
        )}

        {step === 'email' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-center">
              {role === 'verifier'
                ? 'Issuer login — enter your registered email'
                : mode === 'signup'
                  ? 'Enter your email to create an account'
                  : 'Enter your email to receive OTP'}
            </p>
            {role === 'verifier' && (
              <p className="text-amber-400/80 text-xs text-center">
                Default issuer: rarealriree@gmail.com (use OTP to login)
              </p>
            )}
            {typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (role !== 'verifier' || mode === 'login') && (
              <>
                <div className="flex flex-col items-center gap-2">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Add http://localhost:3000 to Authorized JavaScript origins in Google Cloud Console → Credentials.')}
                    useOneTap={false}
                    theme="filled_black"
                    size="large"
                    text={role === 'verifier' || mode === 'login' ? 'signin_with' : 'signup_with'}
                    shape="rectangular"
                  />
                  <p className="text-slate-500 text-xs text-center">
                    Add both <code className="bg-slate-700 px-1 rounded">http://localhost</code> and <code className="bg-slate-700 px-1 rounded">http://localhost:3000</code> to Authorized JavaScript origins in Google Cloud Console → Credentials.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-slate-800/50 px-2 text-slate-500">or continue with email</span>
                  </div>
                </div>
              </>
            )}
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            {role === 'verifier' ? (
              <a href="/" className="block w-full py-2 text-slate-500 hover:text-slate-400 text-sm text-center">
                Back to home
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setEmail('');
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm cursor-pointer"
              >
                Back
              </button>
            )}
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-center">
              Enter the 6-digit OTP sent to {email}
            </p>
            {process.env.NODE_ENV === 'development' && devOtp && (
              <p className="text-amber-400/80 text-sm text-center">Dev OTP: {devOtp}</p>
            )}
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl tracking-widest"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
              }}
              className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm cursor-pointer"
            >
              Resend OTP
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            {mode === 'signup' && wallet ? (
              <>
                <p className="text-slate-400 text-center">
                  Your wallet has been created. Complete registration on the blockchain.
                </p>
                <div className="p-4 bg-slate-800/80 rounded-lg text-sm text-slate-300 break-all">
                  <p><span className="text-slate-500">Address:</span> {wallet.address}</p>
                </div>
                <p className="text-amber-400/80 text-xs text-center">
                  Save your credentials securely. We store them locally for this session.
                </p>
                <p className="text-slate-500 text-xs text-center">
                  Ensure <code className="bg-slate-700 px-1 rounded">npx hardhat node</code> is running in another terminal.
                </p>
                <button
                  type="button"
                  onClick={handleCompleteSignup}
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Registering...' : 'Complete Sign Up'}
                </button>
              </>
            ) : (
              <>
                <p className="text-green-400 text-center">OTP verified successfully!</p>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Logging in...' : 'Continue to Dashboard'}
                </button>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
