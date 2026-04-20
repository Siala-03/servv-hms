import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Coffee, Wine, ShoppingBag, Plus, Clock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
// Mock Data
const orders = [
{
  id: 'ORD-1042',
  room: '304',
  guest: 'Eleanor Shellstrop',
  type: 'Room Service',
  items: ['2x Club Sandwich', '1x Fries', '2x Diet Coke'],
  total: '$45.00',
  status: 'Preparing',
  time: '15 mins ago',
  icon: Utensils
},
{
  id: 'ORD-1043',
  room: '215',
  guest: 'Chidi Anagonye',
  type: 'F&B',
  items: ['1x Almond Milk Latte', '1x Blueberry Muffin'],
  total: '$12.50',
  status: 'New',
  time: '2 mins ago',
  icon: Coffee
},
{
  id: 'ORD-1044',
  room: '501',
  guest: 'Tahani Al-Jamil',
  type: 'Minibar',
  items: ['1x Dom Perignon', '2x Sparkling Water'],
  total: '$350.00',
  status: 'Delivered',
  time: '1 hour ago',
  icon: Wine
},
{
  id: 'ORD-1045',
  room: '112',
  guest: 'Jason Mendoza',
  type: 'Amenity',
  items: ['Extra Towels', 'Dental Kit'],
  total: '$0.00',
  status: 'Delivered',
  time: '2 hours ago',
  icon: ShoppingBag
}];

export function Orders() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.4
      }}>
      
      <PageHeader
        title="Order Management"
        subtitle="Manage room service, F&B, and amenity requests."
        actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" />
            New Order
          </button>
        } />
      

      {/* Pipeline View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* New */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              New Orders
            </h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
              1
            </span>
          </div>
          <div className="space-y-3">
            {orders.
            filter((o) => o.status === 'New').
            map((order) =>
            <OrderCard key={order.id} order={order} />
            )}
          </div>
        </div>

        {/* Preparing */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Preparing
            </h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
              1
            </span>
          </div>
          <div className="space-y-3">
            {orders.
            filter((o) => o.status === 'Preparing').
            map((order) =>
            <OrderCard key={order.id} order={order} />
            )}
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 opacity-70">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Delivered Today
            </h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
              2
            </span>
          </div>
          <div className="space-y-3">
            {orders.
            filter((o) => o.status === 'Delivered').
            map((order) =>
            <OrderCard key={order.id} order={order} />
            )}
          </div>
        </div>
      </div>
    </motion.div>);

}
function OrderCard({ order }: {order: any;}) {
  const Icon = order.icon;
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 rounded-md text-gray-600">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-900">Room {order.room}</span>
            <p className="text-xs text-gray-500">{order.guest}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {order.time}
        </span>
      </div>
      <div className="mb-3">
        <ul className="text-sm text-gray-700 space-y-1">
          {order.items.map((item: string, idx: number) =>
          <li key={idx} className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span> {item}
            </li>
          )}
        </ul>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="font-semibold text-gray-900">{order.total}</span>
        {order.status === 'New' &&
        <button className="px-3 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-medium transition-colors">
            Accept
          </button>
        }
        {order.status === 'Preparing' &&
        <button className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-medium transition-colors">
            Mark Ready
          </button>
        }
      </div>
    </div>);

}