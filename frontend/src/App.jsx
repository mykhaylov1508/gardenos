// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import TodayPage from './pages/TodayPage';
import GardenPage from './pages/GardenPage';
import PlantsPage from './pages/PlantsPage';
import SettingsPage from './pages/SettingsPage';
import NewPlantPage from './pages/NewPlantPage';
import PlantDetailPage from './pages/PlantDetailPage';
import AddEventModal from './components/AddEventModal';
import DashboardPage from './pages/DashboardPage';
import SeasonPage from './pages/SeasonPage';
import MapPage from './pages/MapPage';
import ZonesPage from './pages/ZonesPage';
import ProfilePage from './pages/ProfilePage';


function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-garden-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-garden-green" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Якщо не залогінений — тільки сторінка входу */}
      {!user ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        // Якщо залогінений — доступ до всього через Layout
        <>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TodayPage />} />
            <Route path="/season" element={<SeasonPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/garden" element={<GardenPage />} />
            <Route path="/garden/zones" element={<ZonesPage />} />
            <Route path="/plants" element={<PlantsPage />} />
            <Route path="/plants/new" element={<NewPlantPage />} />
            <Route path="/plants/:id" element={<PlantDetailPage />} />
            <Route path="/settings" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;