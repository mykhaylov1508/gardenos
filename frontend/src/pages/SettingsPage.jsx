// src/pages/SettingsPage.jsx
import { useAuth } from '../contexts/AuthContext';
import { User, MapPin, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold text-garden-green mb-6">
        ⚙️ Налаштування
      </h2>

      <div className="card mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-garden-green rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-garden-green">
              {profile?.full_name || 'Користувач'}
            </h3>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {profile?.region || 'Регіон не вказано'}
          </div>
        </div>
      </div>

      <button
        onClick={signOut}
        className="w-full card hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-garden-alert"
      >
        <LogOut className="w-5 h-5" />
        Вийти з акаунту
      </button>
    </div>
  );
}