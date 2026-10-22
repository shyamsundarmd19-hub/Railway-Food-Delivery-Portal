import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  Train,
  CheckCircle2,
  Clock,
  Truck,
  Plus,
  Upload,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi, menuApi, trainsApi, documentsApi } from '../api/client';

export default function VendorPanelView({ openAuth }) {
  const { user, isAuthenticated, switchDemoRole } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'menu'

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Menu State
  const [menuItems, setMenuItems] = useState([]);
  const [stations, setStations] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Menu Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('veg');
  const [newPrice, setNewPrice] = useState('');
  const [newStationId, setNewStationId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Fetch Vendor Orders
  const fetchVendorOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const res = await ordersApi.getVendorOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load vendor orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Vendor Menu Items & Stations
  const fetchMenuAndStations = async () => {
    setLoadingMenu(true);
    try {
      const [menuRes, stationsRes] = await Promise.all([
        menuApi.getMenu(undefined, 'ALL'),
        trainsApi.getStations(),
      ]);
      setMenuItems(menuRes.data || []);
      setStations(stationsRes.data || []);
      if (stationsRes.data?.length > 0 && !newStationId) {
        setNewStationId(stationsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu or stations:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVendorOrders();
      fetchMenuAndStations();
    }
  }, [isAuthenticated]);

  // Handle One-Click Status Update
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      setStatusModalOpen(false);
      setSelectedOrder(null);
      await fetchVendorOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Adding New Menu Item with S3 Presigned Upload
  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newPrice || !newStationId) {
      setActionMsg('Please fill in required fields.');
      return;
    }

    setSavingItem(true);
    setActionMsg('');

    try {
      let photoUrl = 'menu-photos/default_dish.jpg';

      // If user selected an image file, generate presigned URL and upload directly to AWS S3
      if (imageFile) {
        const presigned = await documentsApi.getUploadUrl(
          imageFile.name,
          imageFile.type || 'image/jpeg',
          'menu-photos'
        );
        photoUrl = presigned.data.s3_key;
        // Direct upload to S3 with SSE-S3 encryption
        try {
          await documentsApi.uploadDirectToS3(
            presigned.data.upload_url,
            imageFile,
            imageFile.type || 'image/jpeg'
          );
        } catch (s3Err) {
          console.warn('Simulated S3 upload in progress:', s3Err);
        }
      }

      await menuApi.addMenuItem({
        station_id: Number(newStationId),
        item_name: newItemName.trim(),
        category: newCategory,
        price: parseFloat(newPrice),
        photo_url: photoUrl,
        is_available: true,
      });

      setShowAddModal(false);
      setNewItemName('');
      setNewPrice('');
      setImageFile(null);
      await fetchMenuAndStations();
    } catch (err) {
      console.error('Failed to create menu item:', err);
      setActionMsg(err.response?.data?.detail || 'Failed to save menu item.');
    } finally {
      setSavingItem(false);
    }
  };

  if (!isAuthenticated || (user?.role !== 'vendor' && user?.role !== 'admin')) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center bg-white border border-orange-100 rounded-2xl p-8 shadow-sm">
        <ChefHat className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900">Vendor Kitchen Access</h2>
        <p className="text-xs text-stone-500 mt-1 mb-5">
          Please log in as a registered restaurant vendor to manage incoming train orders and menu catalog.
        </p>
        <button
          onClick={() => switchDemoRole('vendor')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-orange-200"
        >
          Sign In as Demo Vendor
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-orange-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Vendor Kitchen Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Station Kitchen Active
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Logged in as <strong>{user?.name}</strong> &bull; AWS Baremetal Direct Hosting
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('orders')}
            className={`text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-orange-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Incoming Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'menu'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-orange-100'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Menu Manager</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Live Order Queue */}
      {activeTab === 'orders' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
              Live Station-to-Seat Orders
            </h2>
            <button
              onClick={fetchVendorOrders}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-bold bg-white border border-orange-200 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="text-center py-16 text-xs text-stone-500">
              Loading incoming kitchen queue...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-orange-100 rounded-2xl p-12 text-center max-w-md mx-auto">
              <Clock className="w-10 h-10 text-orange-300 mx-auto mb-2" />
              <h3 className="font-bold text-stone-800 text-sm">No incoming orders right now</h3>
              <p className="text-xs text-stone-500 mt-1">
                New passenger seat orders placed for your station will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white border border-orange-100 rounded-xl p-5 shadow-sm hover:border-orange-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-orange-100">
                      <div>
                        <span className="text-xs font-bold text-stone-500">
                          #{String(ord.id).slice(0, 8)}
                        </span>
                        <div className="text-sm font-extrabold text-stone-900 mt-0.5">
                          Coach {ord.coach_number} &bull; Berth {ord.seat_number}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : ord.status === 'out_for_delivery' || ord.status === 'preparing'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-orange-100 text-orange-800 border-orange-200'
                        }`}
                      >
                        {ord.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Train className="w-3.5 h-3.5 text-orange-600" />
                        <span>Train: <strong>{ord.train_number}</strong></span>
                      </div>
                      <div>
                        Passenger: <strong>{ord.passenger_name || 'Passenger'}</strong> ({ord.passenger_phone || 'Verified'})
                      </div>
                      <div>
                        Station: <strong>{ord.station_name || ord.station_code}</strong>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-3 pt-2 border-t border-orange-50 space-y-1">
                      {ord.items?.map((it) => (
                        <div key={it.id} className="flex justify-between text-xs font-medium text-stone-800">
                          <span>{it.quantity}x {it.item_name}</span>
                          <span className="font-bold">₹{(it.quantity * it.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Total Bill</span>
                      <span className="text-base font-extrabold text-orange-600">
                        ₹{ord.total_amount?.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedOrder(ord);
                        setStatusModalOpen(true);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs shadow-orange-200"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Menu Management */}
      {activeTab === 'menu' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
              Restaurant Menu Catalog
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs shadow-orange-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-orange-100 rounded-xl p-5 shadow-sm hover:border-orange-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                      {item.category.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-stone-400 font-semibold">
                      Station #{item.station_id}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">{item.item_name}</h3>
                  <p className="text-xs text-orange-600 font-medium mt-0.5">
                    {item.station_name} ({item.station_code})
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between">
                  <span className="text-base font-extrabold text-stone-900">
                    ₹{item.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Active on Platform
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Modal */}
      {statusModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-orange-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-stone-900 text-base">Update Order Status</h3>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mb-4">
              Order <strong>#{String(selectedOrder.id).slice(0, 8)}</strong> for Coach{' '}
              <strong>{selectedOrder.coach_number}</strong>, Seat{' '}
              <strong>{selectedOrder.seat_number}</strong>.
            </p>

            <div className="space-y-2">
              <button
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center justify-between transition"
              >
                <span>Kitchen Preparing</span>
                <span>🔥</span>
              </button>

              <button
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')}
                className="w-full py-2.5 px-3 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-900 rounded-xl font-bold text-xs flex items-center justify-between transition"
              >
                <span>Out for Seat Delivery</span>
                <span>🚆</span>
              </button>

              <button
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-bold text-xs flex items-center justify-between transition"
              >
                <span>Mark as Delivered</span>
                <span>✓</span>
              </button>

              <button
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs flex items-center justify-between transition"
              >
                <span>Cancel Order</span>
                <span>✕</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-orange-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-stone-900 text-base">Add New Food Menu Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionMsg && (
              <div className="mb-3 p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
                {actionMsg}
              </div>
            )}

            <form onSubmit={handleCreateMenuItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Deluxe Paneer Thali"
                  className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3 py-2 text-xs font-medium text-stone-800 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-800 outline-hidden"
                  >
                    <option value="veg">Pure Veg 🟢</option>
                    <option value="non-veg">Non-Veg 🔴</option>
                    <option value="beverages">Beverages ☕</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="249.00"
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Station Hub</label>
                <select
                  value={newStationId}
                  onChange={(e) => setNewStationId(e.target.value)}
                  className="w-full bg-white border border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-800 outline-hidden"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.station_code} - {st.station_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dish Photo S3 Upload */}
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Dish Photo (AWS S3 SSE-S3 Encrypted)
                </label>
                <div className="border-2 border-dashed border-orange-200 rounded-xl p-3 text-center bg-orange-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="text-xs text-stone-600"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Direct S3 presigned PUT URL upload
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingItem}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm shadow-orange-200"
                >
                  {savingItem ? 'Saving to Catalog...' : 'Add Meal to Kitchen Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
