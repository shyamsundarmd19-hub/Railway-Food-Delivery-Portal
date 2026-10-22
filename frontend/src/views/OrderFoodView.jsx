import React, { useState, useEffect } from 'react';
import {
  Train,
  MapPin,
  Clock,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { trainsApi, menuApi } from '../api/client';

export default function OrderFoodView({
  cart,
  addToCart,
  selectedStation,
  setSelectedStation,
  selectedTrain,
  setSelectedTrain,
  coach,
  setCoach,
  seatNumber,
  setSeatNumber,
  pnr,
  setPnr,
  openCart,
}) {
  const [stations, setStations] = useState([]);
  const [trains, setTrains] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Fetch initial trains, stations, and menu
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const [trainsRes, stationsRes] = await Promise.all([
          trainsApi.getTrains(),
          trainsApi.getStations(),
        ]);
        setTrains(trainsRes.data || []);
        const loadedStations = stationsRes.data || [];
        setStations(loadedStations);

        // Default to first station if not selected
        const currentStationId = selectedStation || (loadedStations[0]?.id ?? null);
        if (!selectedStation && loadedStations[0]?.id) {
          setSelectedStation(loadedStations[0].id);
        }

        const menuRes = await menuApi.getMenu(currentStationId, 'ALL');
        setMenuItems(menuRes.data || []);
      } catch (err) {
        console.error('Failed to load menu data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Reload menu when station or category filter changes
  useEffect(() => {
    if (!selectedStation) return;
    async function loadMenu() {
      try {
        const res = await menuApi.getMenu(selectedStation, activeCategory);
        setMenuItems(res.data || []);
      } catch (err) {
        console.error('Failed to filter menu:', err);
      }
    }
    loadMenu();
  }, [selectedStation, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Warm Peach Hero & Seat Booking Card */}
      <div className="bg-gradient-to-r from-orange-100/70 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Station-to-Seat Express Catering</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Fresh, piping hot meals delivered <br />
            <span className="text-orange-600">directly to your train berth.</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600">
            Select your train journey details and station stop. Verified FSSAI restaurant partners prepare and board with your order.
          </p>
        </div>

        {/* Seat & Station Selector Form */}
        <div className="mt-6 bg-white p-4 sm:p-5 rounded-xl border border-orange-200 shadow-sm shadow-orange-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* PNR input */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                10-Digit PNR
              </label>
              <input
                type="text"
                value={pnr}
                onChange={(e) => setPnr(e.target.value)}
                placeholder="e.g. 2489104821"
                className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 outline-hidden"
              />
            </div>

            {/* Train selection */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Train
              </label>
              <select
                value={selectedTrain}
                onChange={(e) => setSelectedTrain(e.target.value)}
                className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 outline-hidden"
              >
                {trains.map((t) => (
                  <option key={t.id} value={t.train_number}>
                    {t.train_number} - {t.train_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Coach & Seat */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Coach &amp; Seat No
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  placeholder="Coach (B2)"
                  className="w-20 bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-2.5 py-2 text-xs font-bold text-center text-stone-800 outline-hidden"
                />
                <input
                  type="text"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  placeholder="Seat (42)"
                  className="flex-1 bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 outline-hidden"
                />
              </div>
            </div>

            {/* Delivery Station */}
            <div>
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Delivery Station
              </label>
              <select
                value={selectedStation || ''}
                onChange={(e) => setSelectedStation(Number(e.target.value))}
                className="w-full bg-orange-50 border border-orange-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-2.5 py-2 text-xs font-bold text-orange-950 outline-hidden"
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.station_code} - {st.station_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Station Food Menu
          </h2>
          <p className="text-xs text-stone-500">
            Freshly prepared by certified platform kitchens and delivered to your seat.
          </p>
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: 'All Dishes' },
            { id: 'veg', label: 'Pure Veg 🟢' },
            { id: 'non-veg', label: 'Non-Veg 🔴' },
            { id: 'beverages', label: 'Beverages ☕' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-200'
                  : 'bg-white border border-orange-200 text-stone-700 hover:bg-orange-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-stone-500">
          Loading station menu...
        </div>
      ) : menuItems.length === 0 ? (
        <div className="bg-white border border-orange-100 rounded-2xl p-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-2" />
          <h3 className="font-bold text-stone-800 text-sm">No items found</h3>
          <p className="text-xs text-stone-500 mt-1">
            Try selecting a different station hub or dietary category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-orange-100 rounded-xl p-5 shadow-sm hover:border-orange-300 transition duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* Dietary Indicator */}
                      <span
                        className={`w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0 ${
                          item.category === 'veg'
                            ? 'border-emerald-600'
                            : item.category === 'non-veg'
                            ? 'border-rose-600'
                            : 'border-amber-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.category === 'veg'
                              ? 'bg-emerald-600'
                              : item.category === 'non-veg'
                              ? 'bg-rose-600'
                              : 'bg-amber-600'
                          }`}
                        />
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                        {item.category.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {item.station_code || 'STATION'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 mt-1 leading-snug">
                    {item.item_name}
                  </h3>
                  <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                    {item.vendor_name || 'Verified Kitchen'} &bull; Station {item.station_name}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-extrabold text-stone-900">
                      ₹{item.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">incl. taxes</span>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-300 rounded-lg p-0.5">
                      <button
                        onClick={() => addToCart(item, -1)}
                        className="p-1 text-orange-700 hover:bg-orange-100 rounded"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-orange-950 px-1.5">
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item, 1)}
                        className="p-1 text-orange-700 hover:bg-orange-100 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item, 1)}
                      className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs shadow-orange-200 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Seat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
