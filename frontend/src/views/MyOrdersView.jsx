import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Train,
  FileText,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  Truck,
  CookingPot,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/client';

export default function MyOrdersView({ openAuth }) {
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const res = await ordersApi.getPassengerOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>Out for Berth Delivery</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <CookingPot className="w-3.5 h-3.5" />
            <span>Kitchen Preparing</span>
          </span>
        );
      case 'ordered':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Ordered</span>
          </span>
        );
    }
  };

  const getStepProgress = (status) => {
    const s = status?.toLowerCase();
    if (s === 'delivered') return 4;
    if (s === 'out_for_delivery') return 3;
    if (s === 'preparing') return 2;
    return 1; // 'ordered'
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center bg-white border border-orange-100 rounded-2xl p-8 shadow-sm">
        <ClipboardList className="w-12 h-12 text-orange-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900">Track Your Train Meals</h2>
        <p className="text-xs text-stone-500 mt-1 mb-5">
          Please sign in to view your live orders and delivery progress.
        </p>
        <button
          onClick={openAuth}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-orange-200"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-100">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            My Train Berth Orders
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time status tracking and downloadable tax invoices for {user?.name}.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-stone-500">
          Loading your active orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-orange-100 rounded-2xl p-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-2" />
          <h3 className="font-bold text-stone-800 text-sm">No orders found yet</h3>
          <p className="text-xs text-stone-500 mt-1">
            Browse the station menu and order piping hot meals directly to your train coach.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const step = getStepProgress(order.status);
            return (
              <div
                key={order.id}
                className="bg-white border border-orange-100 rounded-2xl p-6 shadow-sm hover:border-orange-300 transition"
              >
                {/* Top Order Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-orange-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-stone-900">
                        Order #{String(order.id).slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        &bull; {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1.5 font-medium">
                      <Train className="w-3.5 h-3.5 text-orange-600" />
                      <span>Train {order.train_number}</span>
                      <span>&bull;</span>
                      <span className="text-orange-700 font-bold">
                        Coach {order.coach_number}, Seat {order.seat_number}
                      </span>
                      <span>&bull;</span>
                      <span>Station: {order.station_name || order.station_code}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <a
                      href={ordersApi.getInvoicePdfUrl(order.id)}
                      download
                      className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice PDF</span>
                    </a>
                  </div>
                </div>

                {/* Visual Step Tracker (Ordered -> Preparing -> Out for Delivery -> Delivered) */}
                <div className="my-6 px-2 sm:px-6">
                  <div className="relative flex items-center justify-between">
                    {/* Background track line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-orange-100 rounded-full z-0" />
                    {/* Active track line */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 rounded-full transition-all duration-300 z-0"
                      style={{
                        width:
                          step === 1 ? '10%' : step === 2 ? '40%' : step === 3 ? '70%' : '100%',
                      }}
                    />

                    {/* Step 1: Ordered */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          step >= 1
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-white border-2 border-orange-200 text-stone-400'
                        }`}
                      >
                        1
                      </div>
                      <span className="text-[11px] font-bold text-stone-800 mt-1.5">Ordered</span>
                    </div>

                    {/* Step 2: Preparing */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          step >= 2
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-white border-2 border-orange-200 text-stone-400'
                        }`}
                      >
                        2
                      </div>
                      <span className="text-[11px] font-bold text-stone-800 mt-1.5">Preparing</span>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          step >= 3
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-white border-2 border-orange-200 text-stone-400'
                        }`}
                      >
                        3
                      </div>
                      <span className="text-[11px] font-bold text-stone-800 mt-1.5">Out for Seat</span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          step >= 4
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-white border-2 border-orange-200 text-stone-400'
                        }`}
                      >
                        ✓
                      </div>
                      <span className="text-[11px] font-bold text-stone-800 mt-1.5">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="bg-orange-50/40 rounded-xl p-3 border border-orange-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    {order.items?.map((it) => (
                      <span
                        key={it.id}
                        className="bg-white border border-orange-200/80 px-2.5 py-1 rounded-md text-stone-800 font-semibold"
                      >
                        {it.quantity}x {it.item_name} (₹{it.unit_price})
                      </span>
                    ))}
                  </div>
                  <div className="font-extrabold text-stone-900 text-sm">
                    Total: <span className="text-orange-600">₹{order.total_amount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
