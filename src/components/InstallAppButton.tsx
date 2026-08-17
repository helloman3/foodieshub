import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInfoModal(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  return (
    <>
      <button type="button" onClick={handleInstall} className="hidden sm:flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-2 text-xs font-bold text-on-secondary-container hover:bg-primary-container transition-colors cursor-pointer" title="Install FoodieHub as an app">
        <span className="material-symbols-outlined text-base">install_desktop</span>
        <span>Install app</span>
      </button>

      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl">download_for_offline</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">Install FoodieHub App</h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              To install FoodieHub on your device, open your browser menu (⋮ or share icon) and select <strong>"Install FoodieHub"</strong> or <strong>"Add to Home Screen"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
