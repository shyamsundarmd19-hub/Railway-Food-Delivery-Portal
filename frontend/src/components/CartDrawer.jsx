import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Train,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/client';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  updateQuantity,
  selectedTrain,
  coach,
  seatNumber,
  selectedStation,
  onOrderSuccess,
  openAuth,
}) {
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const itemTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(itemTotal * 0.05);
  const packaging = cart.length > 0 ? 20 : 0;
  const finalTotal = itemTotal + gst + packaging;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setErrorMsg('Please login to place your train berth order.');
      if (openAuth) openAuth();
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Cart is empty.');
      return;
    }

    if (!selectedStation) {
      setErrorMsg('Please select a delivery station.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // First vendor_id from cart items
      const vendorId = cart[0].vendor_id;
      const orderPayload = {
        vendor_id: vendorId,
        train_number: selectedTrain,
        coach_number: coach,
        seat_number: seatNumber,
        station_id: selectedStation,
        items: cart.map((i) => ({ menu_id: i.id, quantity: i.quantity })),
      };

      const res = await ordersApi.placeOrder(orderPayload);
      if (onOrderSuccess) {
        onOrderSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Order error:', err);
      const detail = err.response?.data?.detail || 'Failed to place order. Try again.';
      setErrorMsg(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/30 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-150">
        {/* Header */}
        <div className="p-5 border-b border-orange-100 flex items-center justify-between bg-orange-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Train Seat Cart</h3>
              <p className="text-[11px] text-orange-700 font-medium">Train: {selectedTrain}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-orange-200 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-700">Your seat cart is empty</p>
              <p className="text-xs text-stone-400 mt-1">Select meals to be delivered to your coach.</p>
            </div>
          ) : (
            <>
              {/* Item Lines */}
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-orange-50/40 border border-orange-100"
                  >
                    <div className="flex-1 pr-2">
                      <h4 className="text-xs font-bold text-stone-900">{item.item_name}</h4>
                      <p className="text-[11px] text-stone-500">₹{item.price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-orange-200 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item, -1)}
                          className="px-2 py-1 text-stone-600 hover:bg-orange-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-2 text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-orange-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-stone-900 w-14 text-right">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Berth Details Summary */}
              <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-200/80 space-y-2.5">
                <div className="text-xs font-extrabold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Train className="w-3.5 h-3.5 text-orange-600" />
                  <span>Seat Destination</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block">Train Number</span>
                    <span className="font-bold text-stone-900">{selectedTrain}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block">Coach &amp; Seat</span>
                    <span className="font-bold text-orange-800">
                      Coach {coach}, Seat {seatNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill Breakdown */}
              <div className="border-t border-orange-100 pt-3 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span>₹{itemTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sealed Hygienic Packaging</span>
                  <span>₹{packaging.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-700 font-bold">
                  <span>Station Berth Delivery</span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-dashed border-orange-200">
                  <span>Total Amount</span>
                  <span className="text-orange-600">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-orange-100 bg-white">
            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-98 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-orange-200"
            >
              <span>{submitting ? 'Placing Order...' : `Confirm & Place Order (₹${finalTotal.toFixed(2)})`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-stone-400 mt-2">
              Automatic AWS SES Digital Tax Invoice will be emailed to your account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
