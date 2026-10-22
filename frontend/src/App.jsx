import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import OrderFoodView from './views/OrderFoodView';
import MyOrdersView from './views/MyOrdersView';
import VendorPanelView from './views/VendorPanelView';
import AdminAnalyticsView from './views/AdminAnalyticsView';
import AuthView from './views/AuthView';
import { Train, CheckCircle2, FileText, X, ArrowRight } from 'lucide-react';
import { ordersApi } from './api/client';

function MainLayout() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('order-food'); // 'order-food' | 'my-orders' | 'vendor-panel' | 'admin-analytics' | 'auth'
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Seat Journey Selection State
  const [selectedTrain, setSelectedTrain] = useState('12301');
  const [coach, setCoach] = useState('B2');
  const [seatNumber, setSeatNumber] = useState('42');
  const [pnr, setPnr] = useState('2489104821');
  const [selectedStation, setSelectedStation] = useState(null);

  // Cart State
  const [cart, setCart] = useState([]);

  // Newly placed order modal state
  const [recentOrder, setRecentOrder] = useState(null);

  // Cart Handlers
  const addToCart = (item, delta = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter((i) => i.id !== item.id);
        }
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i));
      }
      if (delta > 0) {
        return [...prev, { ...item, quantity: 1 }];
      }
      return prev;
    });
  };

  const handleOrderSuccess = (orderData) => {
    setCart([]);
    setRecentOrder(orderData);
  };

  return (
    <div className="min-h-screen bg-orange-50/50 text-stone-800 flex flex-col justify-between">
      <div>
        {/* Navigation Bar */}
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          openCart={() => setIsCartOpen(true)}
        />

        {/* View Switcher */}
        <main className="pb-16">
          {currentView === 'order-food' && (
            <OrderFoodView
              cart={cart}
              addToCart={addToCart}
              selectedStation={selectedStation}
              setSelectedStation={setSelectedStation}
              selectedTrain={selectedTrain}
              setSelectedTrain={setSelectedTrain}
              coach={coach}
              setCoach={setCoach}
              seatNumber={seatNumber}
              setSeatNumber={setSeatNumber}
              pnr={pnr}
              setPnr={setPnr}
              openCart={() => setIsCartOpen(true)}
            />
          )}

          {currentView === 'my-orders' && (
            <MyOrdersView openAuth={() => setCurrentView('auth')} />
          )}

          {currentView === 'vendor-panel' && (
            <VendorPanelView openAuth={() => setCurrentView('auth')} />
          )}

          {currentView === 'admin-analytics' && (
            <AdminAnalyticsView openAuth={() => setCurrentView('auth')} />
          )}

          {currentView === 'auth' && (
            <AuthView
              onSuccess={() => {
                if (user?.role === 'vendor') setCurrentView('vendor-panel');
                else if (user?.role === 'admin') setCurrentView('admin-analytics');
                else setCurrentView('order-food');
              }}
            />
          )}
        </main>
      </div>

      {/* Cart Drawer Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        updateQuantity={addToCart}
        selectedTrain={selectedTrain}
        coach={coach}
        seatNumber={seatNumber}
        selectedStation={selectedStation}
        onOrderSuccess={handleOrderSuccess}
        openAuth={() => {
          setIsCartOpen(false);
          setCurrentView('auth');
        }}
      />

      {/* Post-Order Success Dialog */}
      {recentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-orange-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <button
                onClick={() => setRecentOrder(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-left mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                Order Confirmed
              </span>
              <h3 className="text-xl font-extrabold text-stone-900 mt-1">
                Order #{String(recentOrder.id).slice(0, 8)}
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Dispatched to verified kitchen at <strong>{recentOrder.station_name}</strong>. Your meal will be delivered directly to <strong>Coach {recentOrder.coach_number}, Seat {recentOrder.seat_number}</strong> on Train {recentOrder.train_number}.
              </p>
            </div>

            {/* Email Invoice Badge */}
            <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Digital Tax Invoice &amp; Order Confirmation dispatched via AWS SES.</span>
            </div>

            <div className="mt-6 flex gap-2">
              <a
                href={ordersApi.getInvoicePdfUrl(recentOrder.id)}
                download
                className="flex-1 bg-white border border-orange-200 hover:bg-orange-50 text-orange-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tax Invoice (PDF)</span>
              </a>
              <button
                onClick={() => {
                  setRecentOrder(null);
                  setCurrentView('my-orders');
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shadow-orange-200"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-orange-600" />
            <span className="font-bold text-stone-800">RailFood Station-to-Seat Portal</span>
            <span>&bull; Pale Orange &amp; Warm Peach Theme</span>
          </div>
          <div className="flex gap-4 text-stone-500">
            <span>Baremetal EC2 + RDS + S3 + SES</span>
            <span>&bull;</span>
            <span className="text-orange-600 font-semibold">Zero Docker Direct Hosting</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
