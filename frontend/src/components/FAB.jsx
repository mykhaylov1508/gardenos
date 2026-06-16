// src/components/FAB.jsx
import { useState } from 'react';
import { Plus, X, Droplet, AlertCircle, Apple } from 'lucide-react';
import QuickLogModal from './QuickLogModal';

export default function FAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState(null);

  const actions = [
    {
      id: 'water',
      label: 'Полив',
      icon: Droplet,
      color: 'bg-garden-water',
      emoji: '💧',
    },
    {
      id: 'problem',
      label: 'Проблема',
      icon: AlertCircle,
      color: 'bg-garden-alert',
      emoji: '🏥',
    },
    {
      id: 'harvest',
      label: 'Збір',
      icon: Apple,
      color: 'bg-garden-harvest',
      emoji: '🍎',
    },
  ];

  function handleActionClick(actionId) {
    setActionType(actionId);
    setIsOpen(false);
  }

  function handleCloseModal() {
    setActionType(null);
  }

  return (
    <>
      {/* Плаваюча кнопка */}
      <div className="fixed bottom-24 right-6 z-40">
        {/* Меню дій (розкривається) */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-fade-in">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  className="flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 hover:shadow-xl transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-garden-green pr-2">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Головна кнопка */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 bg-garden-green text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          {isOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <Plus className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* Модальне вікно швидкого запису */}
      {actionType && (
        <QuickLogModal
          actionType={actionType}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}