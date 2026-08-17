import React, { useState, useEffect, useRef } from 'react';
import { Role, StaffAccount, User } from '../types';
import { getProfileAvatar } from '../profileAvatar';
import FoodieHubLogo from './FoodieHubLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  staff: StaffAccount[];
  onCreateStaff: (staff: StaffAccount) => void;
}

const LAST_STAFF_NAME_KEY = 'foodiehub.lastStaffName';

const normalizeStaffName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const getRememberedStaffName = () => {
  try {
    return localStorage.getItem(LAST_STAFF_NAME_KEY) ?? '';
  } catch {
    return '';
  }
};

const rememberStaffName = (name: string) => {
  try {
    localStorage.setItem(LAST_STAFF_NAME_KEY, name.trim());
  } catch {
    // Name autofill is best-effort when browser storage is unavailable.
  }
};

export default function LoginScreen({ onLoginSuccess, staff, onCreateStaff }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<Role>('Waiter');
  const [staffName, setStaffName] = useState<string>(getRememberedStaffName);
  const [pin, setPin] = useState<string>('');
  const [quickPin, setQuickPin] = useState('');
  const [isQuickSignIn, setIsQuickSignIn] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const loginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAdminToken = import.meta.env.VITE_INITIAL_ADMIN_TOKEN as string | undefined;
  const initialAdminPin = import.meta.env.VITE_INITIAL_ADMIN_PIN as string | undefined;
  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, []);

  const scheduleLogin = (user: User, delayMs: number) => {
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
    }
    loginTimeoutRef.current = setTimeout(() => {
      onLoginSuccess({ ...user, avatar: getProfileAvatar(user.name) });
    }, delayMs);
  };

  const effectiveStaff = staff && staff.length > 0 ? staff : [
    { id: 'staff-admin-01', name: 'Alex', role: 'Admin' as Role, pin: '1234', active: true, createdAt: '2026-08-16T00:00:00.000Z' },
    { id: 'staff-waiter-01', name: 'Ram', role: 'Waiter' as Role, pin: '1111', active: true, createdAt: '2026-08-16T00:00:00.000Z' },
    { id: 'staff-chef-01', name: 'Sita', role: 'Chef' as Role, pin: '2222', active: true, createdAt: '2026-08-16T00:00:00.000Z' },
    { id: 'staff-accountant-01', name: 'Hari', role: 'Accountant' as Role, pin: '3333', active: true, createdAt: '2026-08-16T00:00:00.000Z' },
  ];

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setPin('');
    setErrorMessage('');
  };

  const handleKeyPress = (num: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage('');
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleQuickSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const account = effectiveStaff.find((member) => member.active && (normalizeStaffName(member.name) === normalizeStaffName(staffName) || member.pin === quickPin) && member.pin === quickPin);
    if (!account) {
      setErrorMessage('Staff name or PIN is incorrect.');
      setQuickPin('');
      return;
    }
    const signedInName = staffName.trim() || account.name;
    rememberStaffName(signedInName);
    setSuccessMessage(`Signing in ${signedInName}...`);
    scheduleLogin({ name: signedInName, role: account.role, avatar: getProfileAvatar(signedInName) }, 500);
  };

  const verifyPin = (enteredPin: string) => {
    const finalName = staffName.trim();
    if (!finalName) {
      setErrorMessage('Enter your staff name before signing in.');
      setPin('');
      return;
    }

    const account = effectiveStaff.find(
      (member) =>
        member.active &&
        member.role === selectedRole &&
        (normalizeStaffName(member.name) === normalizeStaffName(finalName) || member.pin === enteredPin) &&
        member.pin === enteredPin
    );

    if (!account && setupToken && initialAdminToken && setupToken.trim() === initialAdminToken && enteredPin === initialAdminPin && selectedRole === 'Admin') {
      const newAdmin: StaffAccount = { id: `staff-${Date.now()}`, name: finalName, role: 'Admin', pin: enteredPin, active: true, createdAt: new Date().toISOString() };
      onCreateStaff(newAdmin);
      rememberStaffName(finalName);
      setSuccessMessage(`Signing in ${finalName}...`);
      scheduleLogin({ name: finalName, role: 'Admin', avatar: getProfileAvatar(finalName) }, 600);
      return;
    }

    if (!account) {
      setErrorMessage('Staff name, role, or PIN is incorrect.');
      setPin('');
      return;
    }

    rememberStaffName(finalName);

    if (enteredPin.length >= 4) {
      setSuccessMessage(`Signing in ${finalName}...`);
      scheduleLogin({
        name: finalName,
        role: selectedRole,
        avatar: getProfileAvatar(finalName),
      }, 500);
    }
  };

  return (
    <div id="login-container" className="w-full max-w-[1440px] min-h-screen lg:min-h-[750px] lg:h-full lg:max-h-[900px] lg:rounded-3xl flex flex-col lg:flex-row overflow-hidden bg-surface-container-lowest lg:shadow-sm lg:border lg:border-border-light relative font-sans my-auto">
      {/* Left Side: Ambient Branding */}
      <div id="login-left-branding" className="hidden lg:flex w-1/2 relative bg-surface-variant flex-col justify-between p-12 overflow-hidden shrink-0">
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center opacity-80 mix-blend-multiply transition-transform duration-1000 hover:scale-105" 
            style={{ 
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuC4FBh-YbwubohhSYax6L2wHglizTqrdM3FzIHbd6NjSn0HtEqj3oJZ4VJS09pCOxcg4NrNNqOpEau5zMFasPPhs9nI7vpu5Xpt79IiCGxt_80FNrqdKRlspUDLGtL3l1SxYJgr4kZoGujVQaAEBSuKk5e9aOsXjBCIda4_TzumW8f_pq4qNUyuoYd01C--Pwrcj_3MWyF92IF2P4QLH9h-Sk8ndaCO8GZbwB8FejTdHs42_6zxD57Psw')` 
            }}
          />
        </div>
        <div className="relative z-10">
          <FoodieHubLogo size={52} showText={true} />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-3xl md:text-4xl text-warm-charcoal font-semibold mb-4 leading-tight">Focus on the food.<br />We'll handle the hub.</h1>
          <p className="text-lg text-on-surface-variant">Sign in to start your shift. Your workspace is ready for another great service.</p>
        </div>
      </div>

      {/* Right Side: Login Canvas */}
      <div id="login-right-canvas" className="w-full lg:w-1/2 min-h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-background relative z-10 overflow-y-auto">
        {/* Mobile Logo */}
        <div id="login-mobile-logo" className="lg:hidden flex items-center gap-3 mb-4 shrink-0">
          <FoodieHubLogo size={36} showText={true} />
        </div>

        <div className="w-full max-w-[400px] flex flex-col gap-4 py-4">
          {/* Login Header */}
          <div className="text-center pt-1">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-on-background mb-1 tracking-tight leading-snug">Staff Login</h2>
            <p className="text-xs text-on-surface-variant">Select your role, enter your staff name, and input your PIN.</p>
          </div>

          {staff.length > 0 && (
            <button type="button" onClick={() => { setIsQuickSignIn((enabled) => !enabled); setErrorMessage(''); setSuccessMessage(''); }} className="text-xs font-bold text-primary hover:underline self-center">
              {isQuickSignIn ? 'Use role-based sign in' : 'Quick sign in'}
            </button>
          )}

          {staff.length === 0 && (
            <div className="bg-primary-container/25 border border-primary/20 rounded-xl p-3">
              <p className="text-xs font-bold text-on-primary-container">Initial administrator setup</p>
              <p className="text-[11px] text-on-surface-variant mt-1">Use the administrator token configured by the deployment owner. This step appears only once.</p>
              <input value={setupToken} onChange={(event) => setSetupToken(event.target.value)} placeholder="Administrator token" className="w-full mt-2 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" autoComplete="off" />
            </div>
          )}

          {!isQuickSignIn && <>
          {/* Role Selector (Bento-style chips) */}
          <div id="login-role-selector" className="flex p-1 bg-surface-container-high rounded-xl gap-1">
            <button 
              type="button"
              onClick={() => handleRoleChange('Waiter')}
              className={`flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                selectedRole === 'Waiter' 
                  ? 'bg-surface-container-lowest shadow-sm border border-border-light' 
                  : 'hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${selectedRole === 'Waiter' ? 'text-primary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>room_service</span>
              <span className={`text-xs font-semibold ${selectedRole === 'Waiter' ? 'text-on-background font-bold' : 'text-on-surface-variant'}`}>Waiter</span>
            </button>

            <button type="button" onClick={() => handleRoleChange('Accountant')} className={`flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${selectedRole === 'Accountant' ? 'bg-surface-container-lowest shadow-sm border border-border-light' : 'hover:bg-surface-container-lowest/50'}`}>
              <span className={`material-symbols-outlined text-xl ${selectedRole === 'Accountant' ? 'text-primary' : 'text-on-surface-variant'}`}>calculate</span>
              <span className={`text-xs font-semibold ${selectedRole === 'Accountant' ? 'text-on-background font-bold' : 'text-on-surface-variant'}`}>Accountant</span>
            </button>

            <button 
              type="button"
              onClick={() => handleRoleChange('Chef')}
              className={`flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                selectedRole === 'Chef' 
                  ? 'bg-surface-container-lowest shadow-sm border border-border-light' 
                  : 'hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${selectedRole === 'Chef' ? 'text-primary' : 'text-on-surface-variant'}`}>skillet</span>
              <span className={`text-xs font-semibold ${selectedRole === 'Chef' ? 'text-on-background font-bold' : 'text-on-surface-variant'}`}>Chef</span>
            </button>

            <button 
              type="button"
              onClick={() => handleRoleChange('Admin')}
              className={`flex-1 py-2.5 px-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                selectedRole === 'Admin' 
                  ? 'bg-surface-container-lowest shadow-sm border border-border-light' 
                  : 'hover:bg-surface-container-lowest/50'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${selectedRole === 'Admin' ? 'text-primary' : 'text-on-surface-variant'}`}>admin_panel_settings</span>
              <span className={`text-xs font-semibold ${selectedRole === 'Admin' ? 'text-on-background font-bold' : 'text-on-surface-variant'}`}>Admin</span>
            </button>
          </div>

          {/* Staff Name Input Section */}
          <div id="login-staff-name" className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex justify-between items-center" htmlFor="staff-name-input">
              <span>Staff Name</span>
              <span className="text-[10px] text-on-surface-variant font-normal">Edit or select</span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg">badge</span>
              <input 
                id="staff-name-input"
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name..."
                autoComplete="name"
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-on-surface outline-none transition-all"
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="bg-error-container text-on-error-container text-xs p-3 rounded-lg text-center font-medium border border-error/20">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-primary-container text-on-primary-container text-xs p-3 rounded-lg text-center font-medium border border-primary/20">
              {successMessage}
            </div>
          )}

          {/* PIN Entry Display */}
          <div id="login-pin-display" className="flex justify-center gap-4 py-1">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  index < pin.length 
                    ? 'bg-primary scale-110' 
                    : 'bg-surface-variant border border-outline-variant'
                }`}
              />
            ))}
          </div>

          {/* Number Grid (PIN Pad) */}
          <div id="login-pinpad" className="grid grid-cols-3 gap-x-6 gap-y-3 px-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button 
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="w-14 h-14 mx-auto rounded-full bg-surface-container flex items-center justify-center hover:bg-secondary-container active:scale-95 transition-all duration-150 text-xl font-semibold text-on-background shadow-sm border border-transparent hover:border-outline-variant cursor-pointer"
              >
                {num}
              </button>
            ))}
            {/* Row 4 */}
            <div className="w-14 h-14" /> {/* Empty space */}
            <button 
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-14 h-14 mx-auto rounded-full bg-surface-container flex items-center justify-center hover:bg-secondary-container active:scale-95 transition-all duration-150 text-xl font-semibold text-on-background shadow-sm border border-transparent hover:border-outline-variant cursor-pointer"
            >
              0
            </button>
            <button 
              type="button"
              onClick={handleBackspace}
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-on-surface-variant hover:text-error active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[28px]">backspace</span>
            </button>
          </div>
          </>}

          {isQuickSignIn && (
            <form onSubmit={handleQuickSignIn} className="bg-surface-container-low p-4 rounded-2xl border border-border-light flex flex-col gap-3">
              <div><h3 className="font-display font-bold text-base text-on-surface">Quick sign in</h3><p className="text-xs text-on-surface-variant mt-1">Use your staff name and PIN. Your role is loaded automatically.</p></div>
              <input value={staffName} onChange={(event) => setStaffName(event.target.value)} placeholder="Staff name" className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-3 text-sm outline-none focus:border-primary" autoComplete="name" autoFocus required />
              <input value={quickPin} onChange={(event) => setQuickPin(event.target.value.replace(/\D/g, '').slice(0, 4))} type="password" inputMode="numeric" placeholder="4-digit PIN" className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-3 text-sm tracking-[0.4em] outline-none focus:border-primary" required />
              {errorMessage && <div className="bg-error-container text-on-error-container text-xs p-3 rounded-lg text-center font-medium">{errorMessage}</div>}
              {successMessage && <div className="bg-primary-container text-on-primary-container text-xs p-3 rounded-lg text-center font-medium">{successMessage}</div>}
              <button type="submit" className="primary-action w-full">Sign in</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
