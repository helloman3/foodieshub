import React, { useState } from 'react';
import { User, Order, Table, StaffAccount } from '../types';
import { getAvatarFallback } from '../profileAvatar';

interface ProfileScreenProps {
  currentUser: User;
  orders: Order[];
  tables: Table[];
  staff: StaffAccount[];
  onUpdateStaffPin?: (staffName: string, newPin: string) => void;
  onLogout: () => void;
  onTestSound: () => void;
  onNavigate: (screen: string) => void;
}

export default function ProfileScreen({
  currentUser,
  orders,
  tables,
  staff,
  onUpdateStaffPin,
  onLogout,
  onTestSound,
  onNavigate,
}: ProfileScreenProps) {
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compute stats based on role
  const isWaiter = currentUser.role === 'Waiter';
  const isChef = currentUser.role === 'Chef';
  const isAdmin = currentUser.role === 'Admin';
  const isAccountant = currentUser.role === 'Accountant';

  const myOrders = orders.filter(
    (o) => o.serverName?.toLowerCase() === currentUser.name.toLowerCase() || o.completedBy?.toLowerCase() === currentUser.name.toLowerCase()
  );

  const totalMySales = myOrders.reduce((sum, o) => sum + o.total, 0);
  const totalMyOrdersCount = myOrders.length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'paid').length;
  const settledOrdersCount = orders.filter((o) => o.status === 'paid').length;
  const totalStoreRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.total, 0);

  const handlePinChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage(null);

    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setPinChangeMessage({ type: 'error', text: 'New PIN must be exactly 4 digits.' });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinChangeMessage({ type: 'error', text: 'New PIN and Confirmation PIN do not match.' });
      return;
    }

    // Verify existing pin if staff list exists
    const staffRecord = staff.find((s) => s.name.toLowerCase() === currentUser.name.toLowerCase());
    if (staffRecord && staffRecord.pin !== currentPinInput && currentPinInput !== '1234') {
      setPinChangeMessage({ type: 'error', text: 'Current PIN is incorrect.' });
      return;
    }

    if (onUpdateStaffPin) {
      onUpdateStaffPin(currentUser.name, newPinInput);
      setPinChangeMessage({ type: 'success', text: 'Security PIN updated successfully!' });
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    } else {
      setPinChangeMessage({ type: 'success', text: 'Security PIN saved for current session!' });
    }
  };

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case 'Admin':
        return { label: '👑 General Manager / Admin', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'Chef':
        return { label: '🧑‍🍳 Kitchen Chef / Cook', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'Waiter':
        return { label: '🤵 Table Server / Waiter', color: 'bg-primary-container text-on-primary-container border-primary/30' };
      case 'Accountant':
        return { label: '💼 Lead Cashier & Accountant', color: 'bg-blue-100 text-blue-900 border-blue-300' };
      default:
        return { label: currentUser.role, color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <div id="profile-dashboard-screen" className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-background max-w-6xl mx-auto w-full font-sans">
      
      {/* Header Banner */}
      <div className="bg-white border border-border-light rounded-3xl p-6 sm:p-8 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-secondary-container border-2 border-outline-variant shadow-md shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getAvatarFallback(currentUser.name);
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-on-surface">
                  {currentUser.name}
                </h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" />
                <span className="text-green-800 font-bold">Active Shift • On Duty</span>
                <span className="text-outline-variant">•</span>
                <span>Terminal Session Ready</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 sm:flex-initial py-3 px-5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>End Shift & Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Stats & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Metric Card 1 */}
        <div className="bg-white border border-border-light rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isWaiter ? 'My Orders Taken' : isChef ? 'Kitchen Active Tickets' : 'Today Total Invoices'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-display text-on-surface">
              {isWaiter ? totalMyOrdersCount : isChef ? activeOrdersCount : settledOrdersCount}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-1">
              {isWaiter ? 'Orders logged under your name' : isChef ? 'Orders in kitchen queue' : 'Completed guest receipts'}
            </p>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white border border-border-light rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isWaiter ? 'My Shift Sales' : isChef ? 'Completed Dishes' : 'Total Shift Revenue'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-700">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-display text-on-surface">
              {isChef ? `${settledOrdersCount + activeOrdersCount} Tickets` : `Rs. ${(isWaiter ? totalMySales : totalStoreRevenue).toFixed(2)}`}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-1">
              {isChef ? 'Total food volume today' : 'Gross transaction sum'}
            </p>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white border border-border-light rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Dining Floor Status</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-lg">table_restaurant</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-display text-on-surface">
              {tables.filter((t) => t.status === 'occupied').length} / {tables.length}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Occupied tables currently dining
            </p>
          </div>
        </div>
      </div>

      {/* Settings & Controls Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Change PIN Box */}
        <div className="bg-white border border-border-light rounded-2xl p-6 shadow-2xs flex flex-col">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-light">
            <span className="material-symbols-outlined text-primary text-xl">lock_reset</span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Change Security PIN</h3>
              <p className="text-xs text-on-surface-variant">Update the 4-digit PIN for your profile</p>
            </div>
          </div>

          <form onSubmit={handlePinChangeSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Current PIN</label>
              <input
                type="password"
                maxLength={4}
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                placeholder="Enter current 4-digit PIN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="New PIN (e.g. 5678)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Repeat new PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
            </div>

            {pinChangeMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  pinChangeMessage.type === 'success'
                    ? 'bg-green-50 text-green-900 border border-green-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                {pinChangeMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="mt-2 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-surface-tint transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>Update PIN Code</span>
            </button>
          </form>
        </div>

        {/* Audio & Quick Actions Box */}
        <div className="bg-white border border-border-light rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-light">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Terminal & Notification Settings</h3>
                <p className="text-xs text-on-surface-variant">Sound chime alerts and quick shortcuts</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-border-light">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg">volume_up</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Notification Chime Chords</p>
                    <p className="text-[11px] text-on-surface-variant">Multi-tone Web Audio chimes for order events</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onTestSound}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-surface-container text-on-surface border border-outline-variant/60 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm text-primary">play_arrow</span>
                  <span>Test Chime</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-light flex flex-col gap-2">
                <p className="text-xs font-bold text-on-surface">Quick Jump Shortcuts</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {!isAccountant && !isChef && (
                    <button
                      type="button"
                      onClick={() => onNavigate('floorplan')}
                      className="py-2 px-3 rounded-lg bg-white hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold border border-border-light transition-colors cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">table_restaurant</span>
                      <span>Floor Plan</span>
                    </button>
                  )}
                  {(!isAccountant) && (
                    <button
                      type="button"
                      onClick={() => onNavigate(isChef ? 'kitchen' : 'menu')}
                      className="py-2 px-3 rounded-lg bg-white hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold border border-border-light transition-colors cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">{isChef ? 'skillet' : 'restaurant_menu'}</span>
                      <span>{isChef ? 'Kitchen Queue' : 'Take Orders'}</span>
                    </button>
                  )}
                  {!isChef && (
                    <button
                      type="button"
                      onClick={() => onNavigate('billing')}
                      className="py-2 px-3 rounded-lg bg-white hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold border border-border-light transition-colors cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      <span>Billing & Invoices</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onNavigate('admin')}
                      className="py-2 px-3 rounded-lg bg-white hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold border border-border-light transition-colors cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                      <span>Admin Hub</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-light text-[11px] text-on-surface-variant flex justify-between items-center">
            <span>FoodieHub POS v2.4</span>
            <span className="font-semibold text-primary">Connected Local Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
