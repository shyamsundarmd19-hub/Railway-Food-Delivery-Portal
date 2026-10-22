import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle2,
  Users,
  Building2,
  RefreshCw,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/client';

export default function AdminAnalyticsView({ openAuth }) {
  const { user, isAuthenticated, switchDemoRole } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await adminApi.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-16 px-4 text-center bg-white border border-orange-100 rounded-2xl p-8 shadow-sm">
        <BarChart3 className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900">Admin Platform Analytics</h2>
        <p className="text-xs text-stone-500 mt-1 mb-5">
          Restricted access. Please sign in with an Administrator account to view sales metrics and station performance.
        </p>
        <button
          onClick={() => switchDemoRole('admin')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-orange-200"
        >
          Sign In as Demo Admin
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-orange-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">
              RailFood Executive Analytics
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Live AWS RDS Metrics
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Aggregated revenue, top delivery stations, and order fulfillment breakdown.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-stone-500">
          Calculating platform analytics...
        </div>
      ) : !analytics ? (
        <div className="text-center py-16 text-xs text-stone-500">
          No analytics data available.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metric Cards in Warm Peach / Pale Orange */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Revenue */}
            <div className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  ₹
                </div>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                ₹{analytics.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>Excluding cancelled orders</span>
              </span>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Total Orders
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                {analytics.total_orders}
              </div>
              <span className="text-[11px] font-semibold text-stone-500 block mt-1">
                {analytics.completed_orders} Completed &bull; {analytics.active_orders} In-transit
              </span>
            </div>

            {/* Registered Customers */}
            <div className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Passengers
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                {analytics.total_customers}
              </div>
              <span className="text-[11px] font-semibold text-stone-500 block mt-1">
                Registered Indian Railway travelers
              </span>
            </div>

            {/* Partner Kitchens */}
            <div className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm hover:border-orange-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Station Vendors
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 mt-2">
                {analytics.total_vendors}
              </div>
              <span className="text-[11px] font-semibold text-stone-500 block mt-1">
                FSSAI-certified platform kitchens
              </span>
            </div>
          </div>

          {/* Top Selling Stations & Status Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Top Stations Table (Col 8) */}
            <div className="lg:col-span-8 bg-white border border-orange-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-100">
                <h3 className="font-extrabold text-stone-900 text-base">
                  Top Performing Station Delivery Hubs
                </h3>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                  Station Leaderboard
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-orange-100 text-stone-400 uppercase tracking-wider font-bold">
                      <th className="pb-3">Station Code</th>
                      <th className="pb-3">Station Name</th>
                      <th className="pb-3">City</th>
                      <th className="pb-3 text-center">Orders</th>
                      <th className="pb-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50">
                    {analytics.top_selling_stations?.map((st, idx) => (
                      <tr key={st.station_id} className="hover:bg-orange-50/40 transition">
                        <td className="py-3 font-extrabold text-orange-700">
                          {st.station_code}
                        </td>
                        <td className="py-3 font-bold text-stone-800">{st.station_name}</td>
                        <td className="py-3 text-stone-500">{st.city}</td>
                        <td className="py-3 text-center font-bold text-stone-800">
                          {st.order_count}
                        </td>
                        <td className="py-3 text-right font-extrabold text-stone-900">
                          ₹{st.total_sales.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Breakdown (Col 4) */}
            <div className="lg:col-span-4 bg-white border border-orange-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-orange-100">
                  <h3 className="font-extrabold text-stone-900 text-base">Order Status Ratio</h3>
                  <span className="text-xs font-bold text-stone-400">Fulfillment</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(analytics.status_breakdown || {}).map(([stKey, count]) => {
                    const pct = analytics.total_orders > 0 ? Math.round((count / analytics.total_orders) * 100) : 0;
                    return (
                      <div key={stKey} className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                        <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                          <span className="capitalize text-stone-800">{stKey.replace('_', ' ')}</span>
                          <span className="text-orange-700">{count} orders ({pct}%)</span>
                        </div>
                        {/* Progress Bar in warm orange */}
                        <div className="w-full bg-orange-200/60 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                <strong>AWS Free Tier Tip:</strong> Database queries utilize composite indexes on <code>(station_id, status)</code> for low CPU utilization on RDS PostgreSQL db.t3.micro.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
