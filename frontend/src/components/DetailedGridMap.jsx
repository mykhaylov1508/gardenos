// src/components/DetailedGridMap.jsx
// 🗺 Детальна карта городу з клітинковою сіткою
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CELL_SIZE_M = 0.5; // Кожна клітинка = 0.5×0.5м
const CELL_SIZE_PX = 40; // Розмір клітинки в пікселях

// Кольори для різних типів зон
const ZONE_COLORS = {
  bed: { bg: 'rgba(90, 138, 60, 0.2)', border: '#5a8a3c', label: 'Грядка' },
  greenhouse: { bg: 'rgba(74, 127, 165, 0.2)', border: '#4a7fa5', label: 'Теплиця' },
  orchard: { bg: 'rgba(139, 115, 85, 0.2)', border: '#8b7355', label: 'Сад' },
  flower_bed: { bg: 'rgba(196, 96, 58, 0.2)', border: '#c4603a', label: 'Клумба' },
  berry: { bg: 'rgba(212, 168, 57, 0.2)', border: '#d4a839', label: 'Ягідник' },
  other: { bg: 'rgba(150, 150, 150, 0.2)', border: '#969696', label: 'Інше' },
};

export default function DetailedGridMap({ 
  zones, 
  plants, 
  plotWidth = 20, // ширина ділянки в метрах
  plotLength = 30, // довжина ділянки в метрах
  onZoneClick,
  onZoneDrop,
}) {
  const { user } = useAuth();
  const [hoveredZone, setHoveredZone] = useState(null);
  const [draggingZone, setDraggingZone] = useState(null);
  const gridRef = useRef(null);

  const gridWidth = Math.ceil(plotWidth / CELL_SIZE_M);
  const gridHeight = Math.ceil(plotLength / CELL_SIZE_M);

  // Обчислюємо позицію зони в пікселях
  const getZonePosition = (zone) => ({
    x: (zone.grid_x || 0) * CELL_SIZE_PX,
    y: (zone.grid_y || 0) * CELL_SIZE_PX,
    width: (zone.grid_w || 2) * CELL_SIZE_PX,
    height: (zone.grid_h || 2) * CELL_SIZE_PX,
  });

  // Drag & Drop
  const handleDragStart = (e, zone) => {
    setDraggingZone(zone);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', zone.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (!draggingZone || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Конвертуємо пікселі в координати сітки (snap to grid)
    const newGridX = Math.round(x / CELL_SIZE_PX);
    const newGridY = Math.round(y / CELL_SIZE_PX);

    // Перевіряємо межі
    const clampedX = Math.max(0, Math.min(gridWidth - draggingZone.grid_w, newGridX));
    const clampedY = Math.max(0, Math.min(gridHeight - draggingZone.grid_h, newGridY));

    // Оновлюємо локально
    onZoneDrop?.(draggingZone.id, clampedX, clampedY);

    // Зберігаємо в БД
    await supabase
      .from('my_zones')
      .update({ grid_x: clampedX, grid_y: clampedY })
      .eq('id', draggingZone.id);

    setDraggingZone(null);
  };

  // Рахуємо рослини в кожній зоні
  const plantsByZone = zones.reduce((acc, zone) => {
    acc[zone.id] = plants.filter(p => p.zone_id === zone.id);
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Сітка */}
      <div
        ref={gridRef}
        className="relative bg-cream-paper border-2 border-garden-green/30 rounded-xl overflow-auto"
        style={{
          width: gridWidth * CELL_SIZE_PX + 'px',
          height: gridHeight * CELL_SIZE_PX + 'px',
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Лінії сітки */}
        {Array.from({ length: gridWidth + 1 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-garden-green/10"
            style={{ left: i * CELL_SIZE_PX + 'px' }}
          />
        ))}
        {Array.from({ length: gridHeight + 1 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-garden-green/10"
            style={{ top: i * CELL_SIZE_PX + 'px' }}
          />
        ))}

        {/* Зони */}
        {zones.map((zone) => {
          const pos = getZonePosition(zone);
          const color = ZONE_COLORS[zone.zone_type] || ZONE_COLORS.other;
          const zonePlants = plantsByZone[zone.id] || [];

          return (
            <div
              key={zone.id}
              className={`absolute border-2 rounded-lg cursor-move transition-all hover:shadow-lg ${
                draggingZone?.id === zone.id ? 'opacity-50' : ''
              }`}
              style={{
                left: pos.x + 'px',
                top: pos.y + 'px',
                width: pos.width + 'px',
                height: pos.height + 'px',
                backgroundColor: color.bg,
                borderColor: color.border,
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, zone)}
              onMouseEnter={() => setHoveredZone(zone)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => onZoneClick?.(zone)}
            >
              {/* Назва зони */}
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-garden-green p-1 text-center">
                {zone.name}
              </div>

              {/* Індикатор кількості рослин */}
              {zonePlants.length > 0 && (
                <div className="absolute top-1 right-1 bg-white text-garden-green text-xs font-bold px-1.5 py-0.5 rounded-full shadow">
                  {zonePlants.length}
                </div>
              )}
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hoveredZone && (
          <ZoneTooltip
            zone={hoveredZone}
            plants={plantsByZone[hoveredZone.id] || []}
          />
        )}
      </div>

      {/* Легенда */}
      <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
        <h4 className="text-sm font-bold text-garden-green mb-2">🎨 Легенда</h4>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(ZONE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border-2"
                style={{ backgroundColor: color.bg, borderColor: color.border }}
              />
              <span className="text-gray-700">{color.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tooltip з деталями зони
function ZoneTooltip({ zone, plants }) {
  const color = ZONE_COLORS[zone.zone_type] || ZONE_COLORS.other;

  return (
    <div className="absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-3 pointer-events-none"
      style={{
        left: '100%',
        top: 0,
        marginLeft: '10px',
        minWidth: '200px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded"
          style={{ backgroundColor: color.border }}
        />
        <h3 className="font-bold text-garden-green text-sm">{zone.name}</h3>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="text-gray-600">
          📐 Площа: <span className="font-semibold">{zone.area_m2 || '?'} м²</span>
        </div>
        <div className="text-gray-600">
          🌱 Рослин: <span className="font-semibold">{plants.length}</span>
        </div>
        {zone.description && (
          <div className="text-gray-500 italic mt-2">{zone.description}</div>
        )}
      </div>

      {plants.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Що росте:</p>
          <div className="flex flex-wrap gap-1">
            {plants.slice(0, 5).map(plant => (
              <span
                key={plant.id}
                className="text-xs px-1.5 py-0.5 bg-cream-paper rounded text-earth-brown"
              >
                {plant.plant_library?.name_uk || '?'}
              </span>
            ))}
            {plants.length > 5 && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                +{plants.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}