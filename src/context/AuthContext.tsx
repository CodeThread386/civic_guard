'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createWallet, checkUserExists, registerUserOnChain, getWalletFromPrivateKey } from '@/lib/blockchain';

export type UserRole = 'user' | 'verifier';

export type AuthState = {
  email: string;
  role: UserRole;
  address: string;
  privateKey: string;
  isAuthenticated: boolean;
  blockchainPending?: boolean;
};

const STORAGE_KEY = 'civicguard_auth';

function loadStoredAuth(): Partial<AuthState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AuthState>;
  } catch {
    return null;
  }
}

function saveAuth(state: Partial<AuthState>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save auth', e);
  }
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

const defaultState: AuthState = {
  email: '',
  role: 'user',
  address: '',
  privateKey: '',
  isAuthenticated: false,
};

type AuthContextType = {
  auth: AuthState;
  authLoaded: boolean;
  login: (email: string, role: UserRole, otpVerified: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, role: UserRole) => Promise<{ success: boolean; wallet?: { address: string; privateKey: string }; error?: string }>;
  logout: () => void;
  completeSignup: (privateKey: string, isVerifier: boolean) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(defaultState);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored?.email && stored?.address && stored?.privateKey && stored?.role) {
      setAuth({
        ...defaultState,
        ...stored,
        isAuthenticated: true,
      });
    }
    setAuthLoaded(true);
  }, []);

  const login = useCallback(async (
    email: string,
    role: UserRole,
    otpVerified: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!otpVerified) return { success: false, error: 'OTP must be verified first' };

    const normalizedEmail = email.toLowerCase().trim();
    let stored = loadStoredAuth();

    if (!stored?.address || !stored?.privateKey || stored.email?.toLowerCase() !== normalizedEmail) {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.address || !data.privateKey) {
        return { success: false, error: data.error || 'No account found. Please sign up first.' };
      }
      stored = {
        email: normalizedEmail,
        role: data.role || role,
        address: data.address,
        privateKey: data.privateKey,
      };
      saveAuth(stored);
    }

    try {
      const addr = stored!.address!;
      const exists = await checkUserExists(addr);
      if (!exists) {
        return { success: false, error: 'Account not found on blockchain. Please sign up again.' };
      }
    } catch (e) {
      return { success: false, error: 'Blockchain unavailable. Try again later.' };
    }

    setAuth({
      email: stored!.email!,
      role: (stored!.role as UserRole) || role,
      address: stored!.address!,
      privateKey: stored!.privateKey!,
      isAuthenticated: true,
    });
    saveAuth(stored);
    return { success: true };
  }, []);

  const signup = useCallback(async (
    email: string,
    role: UserRole
  ): Promise<{ success: boolean; wallet?: { address: string; privateKey: string }; error?: string }> => {
    const wallet = createWallet();
    return {
      success: true,
      wallet: { address: wallet.address, privateKey: wallet.privateKey },
    };
  }, []);

  const completeSignup = useCallback(async (privateKey: string, isVerifier: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const wallet = getWalletFromPrivateKey(privateKey);
      const res = await fetch('/api/fund-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Failed to fund wallet';
        return { success: false, error: msg };
      }
      await registerUserOnChain(privateKey, isVerifier);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        return { success: false, error: 'Cannot reach blockchain. Is Hardhat node running? Run: npx hardhat node' };
      }
      if (msg.includes('Contract not deployed') || msg.includes('NEXT_PUBLIC_CONTRACT')) {
        return { success: false, error: 'Contract not configured. Run: npm run setup-demo (with Hardhat node running)' };
      }
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    setAuth(defaultState);
    clearAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, authLoaded, login, signup, logout, completeSignup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
