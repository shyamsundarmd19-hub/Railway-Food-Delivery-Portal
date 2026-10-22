import React, { useState } from 'react';
import { Train, User, Lock, Mail, Phone, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthView({ onSuccess }) {
  const { login, register, switchDemoRole, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('passenger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isRegister) {
      if (!name || !email || !phone || !password) {
        setErrorMsg('Please fill in all required fields.');
        return;
      }
      const res = await register({ name, email, phone, password, role });
      if (res.success) {
        if (onSuccess) onSuccess(res.user);
      } else {
        setErrorMsg(res.error);
      }
    } else {
      if (!email || !password) {
        setErrorMsg('Please enter email and password.');
        return;
      }
      const res = await login(email, password);
      if (res.success) {
        if (onSuccess) onSuccess(res.user);
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  const handleQuickDemo = async (demoRole) => {
    setErrorMsg('');
    const res = await switchDemoRole(demoRole);
    if (res.success && onSuccess) {
      onSuccess(res.user);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      {/* Brand Card */}
      <div className="bg-white border border-orange-100 rounded-2xl p-6 sm:p-8 shadow-sm shadow-orange-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-orange-200">
            <Train className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            {isRegister ? 'Join RailFood' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Station-to-Seat Express Railway Catering Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-orange-50 border border-orange-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              !isRegister
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              isRegister
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'passenger', label: 'Passenger 🚆' },
                { id: 'vendor', label: 'Vendor 👨‍🍳' },
                { id: 'admin', label: 'Admin 🛡️' },
              ].map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition ${
                    role === r.id
                      ? 'bg-orange-100 border-orange-400 text-orange-800'
                      : 'bg-white border-orange-200 text-stone-600 hover:bg-orange-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@railfood.app"
                className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 outline-hidden"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-orange-200 flex items-center justify-center gap-2"
          >
            <span>{isRegister ? 'Create RailFood Account' : 'Sign In to RailFood'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Logins Box */}
        <div className="mt-6 pt-5 border-t border-orange-100">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider text-center mb-3">
            Quick 1-Click Demo Accounts
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('passenger')}
              className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 rounded-lg text-[11px] font-semibold text-center transition"
            >
              Passenger Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('vendor')}
              className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 rounded-lg text-[11px] font-semibold text-center transition"
            >
              Vendor Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 rounded-lg text-[11px] font-semibold text-center transition"
            >
              Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
