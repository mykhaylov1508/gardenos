// src/components/InstallButton.jsx
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import InstallButton from './InstallButton';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Перевіряємо чи це iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Перевіряємо чи вже встановлено як PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone;
    
    // Перевіряємо чи користувач вже закривав банер
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    
    if (isStandalone || wasDismissed) {
      return; // Вже встановлено або користувач закрив
    }

    if (isIOSDevice) {
      // На iOS показуємо інструкцію (там немає нативного банера)
      setShowButton(true);
      return;
    }

    // Слухаємо подію beforeinstallprompt (Android/Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (isIOS) {
      // Показуємо інструкцію для iOS
      alert(
        'Щоб встановити GardenOS на iPhone:\n\n' +
        '1. Натисни кнопку "Поділитись" ⬆️ внизу Safari\n' +
        '2. Прокрути вниз і вибери "На екран домівки"\n' +
        '3. Натисни "Додати"\n\n' +
        'Працює тільки з Safari (не Chrome)'
      );
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    setShowButton(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }

  if (!showButton || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-garden-green p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-garden-green rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🌿</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-bold text-garden-green text-sm">
            Встанови GardenOS
          </p>
          <p className="text-xs text-gray-600 truncate">
            {isIOS ? 'Додай на робочий стіл' : 'Працює як додаток на телефоні'}
          </p>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleInstall}
            className="bg-garden-green text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-opacity-90 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {isIOS ? 'Інструкція' : 'Встановити'}
          </button>
        </div>
      </div>
      <InstallButton />
    </div>
  );
}