// src/components/Layout.jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  CalendarCheck, 
  Map as MapIcon, 
  Sprout, 
  Settings,
  LogOut,
  Loader2,
  Home,
  Calendar,
  BookOpen
} from 'lucide-react';

export default function Layout() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-garden-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green" />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  // Стиль для активної/неактивної вкладки
  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
      isActive
        ? 'text-garden-green bg-white shadow-sm'
        : 'text-gray-400 hover:text-garden-green'
    }`;

  return (
    <div className="min-h-screen bg-garden-cream pb-24">
      {/* Верхній хедер */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-garden-green rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-garden-green leading-tight">
                GardenOS
              </h1>
              <p className="text-xs text-gray-500 leading-tight">
                {profile?.region || 'Твій город'}
              </p>
            </div>
          </div>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-400 hover:text-garden-green hover:bg-garden-cream rounded-lg transition-all"
              title="Налаштування"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-garden-alert hover:bg-red-50 rounded-lg transition-all"
              title="Вийти"
            >
              <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Основний контент (сюди рендеряться сторінки) */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Нижня навігація */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-4xl mx-auto px-2 py-2 flex justify-around">
          <NavLink to="/" end className={tabClass}>
            <Home className="w-6 h-6" />
            <span className="text-xs font-semibold">Головна</span>
          </NavLink>
          <NavLink to="/tasks" className={tabClass}>
            <CalendarCheck className="w-6 h-6" />
            <span className="text-xs font-semibold">Задачі</span>
          </NavLink>
          <NavLink to="/season" className={tabClass}>
            <Calendar className="w-6 h-6" />
            <span className="text-xs font-semibold">Сезон</span>
          </NavLink>
          <NavLink to="/map" className={tabClass}>
            <MapIcon className="w-6 h-6" />
            <span className="text-xs font-semibold">Карта</span>
          </NavLink>
          <NavLink to="/plants" className={tabClass}>
            <BookOpen className="w-6 h-6" />
            <span className="text-xs font-semibold">Бібліотека</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}