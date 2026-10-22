import React from 'react';
import {
  Train,
  ShoppingBag,
  User,
  LogOut,
  UtensilsCrossed,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, setCurrentView, cartCount, openCart }) {
  const { user, isAuthenticated, logout, switchDemoRole } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-orange-100 shadow-xs">
      {/* Top Banner */}
      <div className="bg-orange-500 text-white text-[11px] py-1 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-orange-200" />
        <span>Station-to-Seat Express Catering &bull; Warm &amp; Fresh at Your Train Berth</span>
        <span className="hidden sm:inline opacity-80">&bull; FSSAI Hygiene Certified</span>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => setCurrentView('order-food')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shadow-sm shadow-orange-300 group-hover:scale-105 transition">
            <Train className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-orange-600">
                RailFood
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Seat Delivery
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Express catering to your berth</p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-orange-50/70 border border-orange-100 p-1 rounded-xl">
          <button
            onClick={() => setCurrentView('order-food')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              currentView === 'order-food'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'text-stone-700 hover:text-orange-600 hover:bg-orange-100/60'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Order Food</span>
          </button>

          <button
            onClick={() => setCurrentView('my-orders')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              currentView === 'my-orders'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'text-stone-700 hover:text-orange-600 hover:bg-orange-100/60'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Track Orders</span>
          </button>

          <button
            onClick={() => setCurrentView('vendor-panel')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              currentView === 'vendor-panel'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'text-stone-700 hover:text-orange-600 hover:bg-orange-100/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Vendor Kitchen</span>
          </button>

          <button
            onClick={() => setCurrentView('admin-analytics')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              currentView === 'admin-analytics'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'text-stone-700 hover:text-orange-600 hover:bg-orange-100/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </nav>

        {/* Right Actions: Cart & Auth */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher for Demo */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] bg-orange-50 border border-orange-200/80 rounded-lg p-0.5">
            <span className="text-stone-500 font-semibold px-2">Role:</span>
            <button
              onClick={() => {
                switchDemoRole('passenger');
                setCurrentView('order-food');
              }}
              className={`px-2 py-0.5 rounded font-medium transition ${
                user?.role === 'passenger' || !user
                  ? 'bg-orange-500 text-white'
                  : 'text-stone-600 hover:bg-orange-100'
              }`}
            >
              Passenger
            </button>
            <button
              onClick={() => {
                switchDemoRole('vendor');
                setCurrentView('vendor-panel');
              }}
              className={`px-2 py-0.5 rounded font-medium transition ${
                user?.role === 'vendor'
                  ? 'bg-orange-500 text-white'
                  : 'text-stone-600 hover:bg-orange-100'
              }`}
            >
              Vendor
            </button>
            <button
              onClick={() => {
                switchDemoRole('admin');
                setCurrentView('admin-analytics');
              }}
              className={`px-2 py-0.5 rounded font-medium transition ${
                user?.role === 'admin'
                  ? 'bg-orange-500 text-white'
                  : 'text-stone-600 hover:bg-orange-100'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Cart Button */}
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm shadow-orange-200"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Seat Cart</span>
            {cartCount > 0 && (
              <span className="bg-white text-orange-600 text-[11px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                {cartCount}
              </span>
            )}
          </button>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-stone-800 leading-tight">{user.name}</span>
                <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition border border-orange-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('auth')}
              className="flex items-center gap-1.5 text-xs font-bold bg-white text-orange-600 border border-orange-200 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="md:hidden flex items-center justify-around bg-orange-50/50 border-t border-orange-100 py-1.5 px-2 text-xs">
        <button
          onClick={() => setCurrentView('order-food')}
          className={`px-2.5 py-1 rounded-md font-semibold ${
            currentView === 'order-food' ? 'text-orange-600 bg-white shadow-2xs' : 'text-stone-600'
          }`}
        >
          Menu
        </button>
        <button
          onClick={() => setCurrentView('my-orders')}
          className={`px-2.5 py-1 rounded-md font-semibold ${
            currentView === 'my-orders' ? 'text-orange-600 bg-white shadow-2xs' : 'text-stone-600'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setCurrentView('vendor-panel')}
          className={`px-2.5 py-1 rounded-md font-semibold ${
            currentView === 'vendor-panel' ? 'text-orange-600 bg-white shadow-2xs' : 'text-stone-600'
          }`}
        >
          Vendor
        </button>
        <button
          onClick={() => setCurrentView('admin-analytics')}
          className={`px-2.5 py-1 rounded-md font-semibold ${
            currentView === 'admin-analytics' ? 'text-orange-600 bg-white shadow-2xs' : 'text-stone-600'
          }`}
        >
          Analytics
        </button>
      </div>
    </header>
  );
}
