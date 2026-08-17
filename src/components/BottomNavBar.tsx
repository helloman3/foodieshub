import React from 'react';
import { User } from '../types';

interface BottomNavBarProps {
  currentUser: User;
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export default function BottomNavBar({ currentUser, activeScreen, onNavigate }: BottomNavBarProps) {
  if (currentUser.role === 'Accountant') {
    return (
      <nav id="bottom-navbar" className="bg-surface-bright border-t border-border-light fixed bottom-0 w-full z-50 flex justify-center items-center h-20 px-4 pb-safe font-sans shadow-md md:hidden">
        <button
          type="button"
          onClick={() => onNavigate('billing')}
          className="flex flex-col items-center justify-center px-8 py-1.5 rounded-full bg-primary-container text-on-primary-container font-semibold"
        >
          <span className="material-symbols-outlined text-2xl fill">payments</span>
          <span className="text-[11px] mt-0.5 font-medium">Billing & Invoices</span>
        </button>
      </nav>
    );
  }

  if (currentUser.role === 'Chef') {
    return (
      <nav id="bottom-navbar" className="bg-surface-bright border-t border-border-light fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-4 pb-safe font-sans shadow-md md:hidden">
        {/* Kitchen Button */}
        <button
          type="button"
          onClick={() => onNavigate('kitchen')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
            activeScreen === 'kitchen'
              ? 'bg-primary-container text-on-primary-container font-semibold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeScreen === 'kitchen' ? 'fill' : ''}`}>skillet</span>
          <span className="text-[11px] mt-0.5 font-medium">Kitchen Queue</span>
        </button>

        {/* Stock / Inventory Button */}
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
            activeScreen === 'inventory'
              ? 'bg-primary-container text-on-primary-container font-semibold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeScreen === 'inventory' ? 'fill' : ''}`}>inventory_2</span>
          <span className="text-[11px] mt-0.5 font-medium">Stock Inventory</span>
        </button>
      </nav>
    );
  }

  const isAdmin = currentUser.role === 'Admin';

  return (
    <nav 
      id="bottom-navbar" 
      className="bg-surface-bright border-t border-border-light fixed bottom-0 w-full z-50 flex justify-around items-center h-20 px-1 sm:px-4 md:hidden pb-safe font-sans shadow-md"
    >
      {/* Tables Button */}
      <button
        type="button"
        onClick={() => onNavigate('floorplan')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
          activeScreen === 'floorplan'
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${activeScreen === 'floorplan' ? 'fill' : ''}`}>table_restaurant</span>
        <span className="text-[11px] mt-0.5 font-medium">Tables</span>
      </button>

      {/* Orders Button */}
      <button
        type="button"
        onClick={() => onNavigate('menu')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
          activeScreen === 'menu'
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${activeScreen === 'menu' ? 'fill' : ''}`}>receipt_long</span>
        <span className="text-[11px] mt-0.5 font-medium">Orders</span>
      </button>

      {/* Kitchen Button */}
      <button
        type="button"
        onClick={() => onNavigate('kitchen')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
          activeScreen === 'kitchen'
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${activeScreen === 'kitchen' ? 'fill' : ''}`}>skillet</span>
        <span className="text-[11px] mt-0.5 font-medium">{currentUser.role === 'Waiter' ? 'Ready' : 'Kitchen'}</span>
      </button>

      {/* Billing Button */}
      <button
        type="button"
        onClick={() => onNavigate('billing')}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
          activeScreen === 'billing'
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${activeScreen === 'billing' ? 'fill' : ''}`}>payments</span>
        <span className="text-[11px] mt-0.5 font-medium">Billing</span>
      </button>

      {/* Admin Button */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => onNavigate('admin')}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 sm:px-4 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
            activeScreen === 'admin' ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeScreen === 'admin' ? 'fill' : ''}`}>admin_panel_settings</span>
          <span className="text-[11px] mt-0.5 font-medium">Admin</span>
        </button>
      )}
    </nav>
  );
}
