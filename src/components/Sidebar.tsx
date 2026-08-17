import React from 'react';
import { User } from '../types';
import { getAvatarFallback } from '../profileAvatar';
import FoodieHubLogo from './FoodieHubLogo';

interface SidebarProps {
  currentUser: User;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeScreen, onNavigate, onLogout }: SidebarProps) {
  const isAccountant = currentUser.role === 'Accountant';
  const isChef = currentUser.role === 'Chef';
  const isWaiter = currentUser.role === 'Waiter';
  const isAdmin = currentUser.role === 'Admin';

  return (
    <nav 
      id="sidebar-nav" 
      className="bg-surface-container-low h-full w-72 rounded-r-xl border-r border-border-light fixed left-0 top-0 z-40 hidden md:flex flex-col transition-all duration-300 ease-in-out font-sans"
    >
      {/* Header Profile Area (Clickable to open Profile Dashboard) */}
      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className={`p-5 border-b border-border-light flex items-center gap-3.5 text-left transition-all cursor-pointer hover:bg-surface-container ${
          activeScreen === 'profile' ? 'bg-primary/10 border-l-4 border-l-primary' : ''
        }`}
        title="Open Staff Profile Dashboard"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary-container flex-shrink-0 border border-outline-variant shadow-2xs">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getAvatarFallback(currentUser.name);
            }}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface truncate">{currentUser.name}</h2>
            <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward_ios</span>
          </div>
          <p className="text-xs text-on-surface-variant truncate">{currentUser.role === 'Admin' ? 'General Manager' : currentUser.role}</p>
          <span className="text-[10px] font-semibold text-green-700 block mt-0.5">● Shift Active</span>
        </div>
      </button>

      {/* Brand title */}
      <div className="p-5 pb-2">
        <FoodieHubLogo size={32} showText={true} />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1.5 px-2">
        {/* Floor Plan (Hidden for Accountant and Chef) */}
        {(!isAccountant && !isChef) && (
          <button
            type="button"
            onClick={() => onNavigate('floorplan')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'floorplan'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'floorplan' ? 'fill' : ''}`}>grid_view</span>
            <span>Floor Plan</span>
          </button>
        )}

        {/* Active Orders / Menu (Hidden for Accountant and Chef) */}
        {(!isAccountant && !isChef) && (
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'menu'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'menu' ? 'fill' : ''}`}>receipt_long</span>
            <span>Take Orders</span>
          </button>
        )}

        {/* Kitchen View (For Chef and Admin ONLY; hidden for Waiter and Accountant) */}
        {(isChef || isAdmin) && (
          <button
            type="button"
            onClick={() => onNavigate('kitchen')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'kitchen'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'kitchen' ? 'fill' : ''}`}>skillet</span>
            <span>Kitchen Queue</span>
          </button>
        )}

        {/* Billing & Receipts (For Accountant, Admin, and Waiter; HIDDEN for Chef) */}
        {!isChef && (
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'billing'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'billing' ? 'fill' : ''}`}>payments</span>
            <span>Billing & Receipts</span>
          </button>
        )}

        {/* Admin / Inventory & Stock (For Admin and Chef) */}
        {(isAdmin || isChef) && (
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'inventory'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'inventory' ? 'fill' : ''}`}>inventory_2</span>
            <span>Inventory & Stock</span>
          </button>
        )}

        {/* Administration (Admin only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer text-left ${
              activeScreen === 'admin'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className={`material-symbols-outlined ${activeScreen === 'admin' ? 'fill' : ''}`}>admin_panel_settings</span>
            <span>Administration</span>
          </button>
        )}
      </div>

      {/* Footer / Logout */}
      <div className="p-6 mt-auto border-t border-outline-variant/30 flex flex-col gap-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 px-4 border border-outline/30 hover:border-error hover:text-error text-on-surface-variant rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Logout Shift
        </button>
        <div className="text-[10px] text-outline text-center">
          FoodieHub
        </div>
      </div>
    </nav>
  );
}
