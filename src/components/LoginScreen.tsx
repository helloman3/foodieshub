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
  const [setupToken, setSetupToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // First-boot master admin setup states
  const [initialAdminName, setInitialAdminName] = useState('Admin');
  const [initialAdminPinInput, setInitialAdminPinInput] = useState('');

  const loginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAdminToken = import.meta.env.VITE_INITIAL_ADMIN_TOKEN as string | undefined;

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

  const effectiveStaff = staff || [];
  const roleStaffList = effectiveStaff.filter((m) => m.active && m.role === selectedRole);

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setPin('');
    setErrorMessage('');
    const matching = effectiveStaff.filter((m) => m.active && m.role === role);
    if (matching.length === 1) {
      setStaffName(matching[0].name);
    }
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

  const handleCreateMasterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const name = initialAdminName.trim() || 'Admin';
    const pinVal = initialAdminPinInput.trim();

    if (pinVal.length !== 4 || !/^\d{4}$/.test(pinVal)) {
      setErrorMessage('Master PIN must be exactly 4 digits (e.g. 1234).');
      return;
    }

    if (initialAdminToken && setupToken.trim() !== initialAdminToken) {
      setErrorMessage('Administrator setup token is invalid.');
      return;
    }

    const newAdmin: StaffAccount = {
      id: `staff-admin-${Date.now()}`,
      name,
      role: 'Admin',
      pin: pinVal,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onCreateStaff(newAdmin);
    rememberStaffName(name);
    setSuccessMessage(`Master Admin "${name}" created successfully!`);
    scheduleLogin({ name, role: 'Admin', avatar: getProfileAvatar(name) }, 600);
  };

  const verifyPin = (enteredPin: string) => {
    const finalName = staffName.trim();

    // Find accounts matching the selected role and PIN
    const matchingRoleAccounts = effectiveStaff.filter(
      (member) => member.active && member.role === selectedRole && member.pin === enteredPin
    );

    let account: StaffAccount | undefined;
    if (finalName) {
      account = matchingRoleAccounts.find(
        (member) => normalizeStaffName(member.name) === normalizeStaffName(finalName)
      ) || matchingRoleAccounts[0];
    } else {
      account = matchingRoleAccounts[0];
    }

    if (!account) {
      setErrorMessage(finalName ? 'Staff name, role, or PIN is incorrect.' : 'Incorrect PIN for selected role.');
      setPin('');
      return;
    }

    const resolvedName = account.name;
    rememberStaffName(resolvedName);
    setStaffName(resolvedName);

    if (enteredPin.length >= 4) {
      setSuccessMessage(`Signing in ${resolvedName}...`);
      scheduleLogin({
        name: resolvedName,
        role: account.role,
        avatar: getProfileAvatar(resolvedName),
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
          {/* ======================================================== */}
          {/* SCENARIO A: FIRST-BOOT MASTER ADMIN PROVISIONING */}
          {/* ======================================================== */}
          {effectiveStaff.length === 0 ? (
            <form onSubmit={handleCreateMasterAdmin} className="flex flex-col gap-4 bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-on-background">Initialize Master Admin</h2>
                <p className="text-xs text-on-surface-variant mt-1">No staff accounts found. Create your Master Admin account to launch the POS.</p>
              </div>

              {/* Feedback Messages */}
              {errorMessage && (
                <div className="bg-error-container text-on-error-container text-xs p-3 rounded-xl text-center font-medium border border-error/20">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="bg-primary-container text-on-primary-container text-xs p-3 rounded-xl text-center font-medium border border-primary/20">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider" htmlFor="init-admin-name">
                  Admin Full Name
                </label>
                <input
                  id="init-admin-name"
                  type="text"
                  value={initialAdminName}
                  onChange={(e) => setInitialAdminName(e.target.value)}
                  placeholder="e.g. Alex (or Admin)"
                  className="input-field"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider" htmlFor="init-admin-pin">
                  Set 4-Digit Security PIN
                </label>
                <input
                  id="init-admin-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={initialAdminPinInput}
                  onChange={(e) => setInitialAdminPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 1234"
                  className="input-field text-center font-mono text-base tracking-widest"
                  required
                />
              </div>

              {initialAdminToken && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider" htmlFor="init-admin-token">
                    Administrator Setup Token (.env)
                  </label>
                  <input
                    id="init-admin-token"
                    type="password"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="Enter token from .env.local"
                    className="input-field"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-xs font-bold hover:bg-surface-tint transition-all shadow-sm cursor-pointer mt-2"
              >
                Provision Master Admin & Launch
              </button>
            </form>
          ) : (
            /* ======================================================== */
            /* SCENARIO B: NORMAL ROLE-BASED STAFF LOGIN */
            /* ======================================================== */
            <>
              {/* Login Header */}
              <div className="text-center pt-1">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-on-background mb-1 tracking-tight leading-snug">Staff Login</h2>
                <p className="text-xs text-on-surface-variant">Select your role, tap your name, and enter your PIN.</p>
              </div>

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
                  <span className="text-[10px] text-on-surface-variant font-normal">{roleStaffList.length} registered</span>
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

                {/* Quick staff chips for the selected role */}
                {roleStaffList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {roleStaffList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setStaffName(m.name);
                          setPin('');
                          setErrorMessage('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          normalizeStaffName(staffName) === normalizeStaffName(m.name)
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                        }`}
                      >
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                    className="h-12 w-full rounded-2xl bg-surface-container-low hover:bg-surface-container-highest active:bg-primary active:text-on-primary font-display font-semibold text-lg text-on-surface transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    {num}
                  </button>
                ))}

                <div className="flex items-center justify-center">
                  <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">POS</span>
                </div>

                <button 
                  type="button"
                  onClick={() => handleKeyPress('0')}
                  className="h-12 w-full rounded-2xl bg-surface-container-low hover:bg-surface-container-highest active:bg-primary active:text-on-primary font-display font-semibold text-lg text-on-surface transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                >
                  0
                </button>

                <button 
                  type="button"
                  onClick={handleBackspace}
                  className="h-12 w-full rounded-2xl bg-surface-container-low hover:bg-surface-container-highest active:bg-error-container font-semibold text-on-surface-variant transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">backspace</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
