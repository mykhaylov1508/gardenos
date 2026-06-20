// frontend/src/features/planner/components/ComparePlansModal.tsx
// 🆕 Модальне вікно порівняння 2-3 планів
import { X, Trophy, Sprout, Ruler, Package } from 'lucide-react';

interface Props {
  plans: any[];
  onClose: () => void;
  onLoadPlan: (plan: any) => void;
}

const PLANT_ICONS: Record<string, string> = {
  томат: '🍅', огірок: '🥒', картопля: '🥔', морква: '🥕',
  цибуля: '🧅', часник: '🧄', перець: '🌶️', капуста: '🥬',
  салат: '🥗', базилік: '🌿', кріп: '🌿', петрушка: '🌿',
  шпинат: '🌿', полуниця: '🍓', смородина: '🫐', малина: '🫐',
  кабачок: '🥒', буряк: '🟤', соняшник: '🌻', горох: '🌱',
  квасоля: '🌱', кукурудза: '🌽', редис: '🔴',
};

// Кольори для розрізнення планів
const PLAN_ACCENT_COLORS = [
  { bg: 'rgba(90, 138, 60, 0.15)', border: '#5a8a3c', text: 'text-garden-green', label: 'План А' },
  { bg: 'rgba(74, 127, 165, 0.15)', border: '#4a7fa5', text: 'text-dew-blue', label: 'План Б' },
  { bg: 'rgba(196, 96, 58, 0.15)', border: '#c4603a', text: 'text-terra-cotta', label: 'План В' },
];

// 🎯 ОКРЕМИЙ КОМПОНЕНТ для картки плану
// Це КРИТИЧНО — кожна картка має свій власний рендер з props
function PlanCard({ 
  plan, 
  planIndex, 
  isWinner, 
  onLoad 
}: { 
  plan: any; 
  planIndex: number; 
  isWinner: boolean; 
  onLoad: () => void;
}) {
  const color = PLAN_ACCENT_COLORS[planIndex];
  
  // 🔑 КЛЮЧОВЕ: беремо дані ТІЛЬКИ з plan (props), а не з зовнішнього стану
  const beds = plan?.layout?.beds || [];
  const bedsCount = beds.length;
  const usedPercent = plan?.layout?.usage_percent || 0;
  const width_m = plan?.plot_config?.width_m || 10;
  const length_m = plan?.plot_config?.length_m || 20;
  const waterSource = plan?.plot_config?.water_source;

  // SVG карта — використовує ТІЛЬКИ дані цього конкретного плану
  const renderPlanMap = () => {
    const SVG_WIDTH = 300;
    const SVG_HEIGHT = 200;
    const scale_x = SVG_WIDTH / width_m;
    const scale_y = SVG_HEIGHT / length_m;

    return (
      <svg 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
        className="w-full h-auto bg-cream-paper rounded-lg border border-garden-green/20"
      >
        <rect 
          x={0} y={0} 
          width={SVG_WIDTH} height={SVG_HEIGHT} 
          fill="#f5f0e8" 
          stroke="#2d4a27" 
          strokeWidth={1.5} 
        />
        
        {/* Сітка */}
        {Array.from({ length: Math.floor(width_m / 5) }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={(i + 1) * 5 * scale_x} y1={0}
            x2={(i + 1) * 5 * scale_x} y2={SVG_HEIGHT}
            stroke="#2d4a27" strokeOpacity={0.1} strokeDasharray="2,2"
          />
        ))}
        {Array.from({ length: Math.floor(length_m / 5) }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0} y1={(i + 1) * 5 * scale_y}
            x2={SVG_WIDTH} y2={(i + 1) * 5 * scale_y}
            stroke="#2d4a27" strokeOpacity={0.1} strokeDasharray="2,2"
          />
        ))}

        {/* Вода цього плану */}
        {waterSource && (
          <circle
            cx={(waterSource.x_percent / 100) * SVG_WIDTH}
            cy={(waterSource.y_percent / 100) * SVG_HEIGHT}
            r={8} fill="#4a7fa5" fillOpacity={0.3}
            stroke="#4a7fa5" strokeWidth={1.5}
          />
        )}

        {/* 🔑 Грядки ЦЬОГО ПЛАНУ — беремо з beds (який з props) */}
        {beds.map((bed: any, idx: number) => {
          const x = bed.x_m * scale_x;
          const y = bed.y_m * scale_y;
          const w = bed.width_m * scale_x;
          const h = bed.length_m * scale_y;
          const icon = PLANT_ICONS[bed.name_uk?.toLowerCase()] || '🌱';

          return (
            <g key={`bed-${planIndex}-${idx}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={color.bg}
                stroke={color.border}
                strokeWidth={2}
                rx={3}
              />
              {w > 25 && h > 20 && (
                <text
                  x={x + w / 2} y={y + h / 2 + 5}
                  textAnchor="middle" fontSize={14}
                >
                  {icon}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden flex flex-col ${
        isWinner ? 'border-garden-green shadow-lg' : 'border-gray-200'
      }`}
      style={{ borderColor: isWinner ? undefined : color.border }}
    >
      {/* Заголовок плану */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: color.bg }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color.border }}
          />
          <span className={`font-bold ${color.text}`}>
            {color.label}
          </span>
          {isWinner && (
            <span className="flex items-center gap-1 text-xs bg-garden-green text-white px-2 py-0.5 rounded-full">
              <Trophy className="w-3 h-3" /> Переможець
            </span>
          )}
        </div>
      </div>

      {/* Назва */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-serif text-garden-green text-lg">{plan.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(plan.created_at).toLocaleDateString('uk-UA')}
        </p>
      </div>

      {/* Карта */}
      <div className="p-4">
        {renderPlanMap()}
      </div>

      {/* Метрики — ВСІ з plan (props), не з зовнішнього стану */}
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Ruler className="w-4 h-4" /> Площа
          </span>
          <span className="font-semibold text-garden-green">
            {plan.total_area_m2?.toFixed(0)} м²
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Sprout className="w-4 h-4" /> Використано
          </span>
          <span className="font-semibold text-garden-green">
            {usedPercent}%
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4" /> Грядок
          </span>
          <span className="font-semibold text-garden-green">
            {bedsCount}
          </span>
        </div>
        <div className={`flex items-center justify-between py-2 rounded-lg px-2 ${
          isWinner ? 'bg-garden-green/10' : ''
        }`}>
          <span className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
            📦 Врожай
          </span>
          <span className={`font-bold text-lg ${
            isWinner ? 'text-garden-green' : 'text-garden-green/80'
          }`}>
            {(plan.expected_yield_kg || 0).toFixed(0)} кг
          </span>
        </div>
      </div>

      {/* Список культур — з beds цього плану */}
      <div className="px-4 pb-4">
        <p className="text-xs text-gray-500 mb-2 font-semibold">
          Культури ({bedsCount}):
        </p>
        <div className="flex flex-wrap gap-1">
          {beds.slice(0, 8).map((bed: any, i: number) => (
            <span
              key={`plant-${planIndex}-${i}`}
              className="text-xs px-2 py-0.5 bg-cream-paper rounded-full text-earth-brown"
              title={`${bed.name_uk} — ${bed.planted_quantity} шт`}
            >
              {PLANT_ICONS[bed.name_uk?.toLowerCase()] || '🌱'} {bed.name_uk}
            </span>
          ))}
          {beds.length > 8 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
              +{beds.length - 8}
            </span>
          )}
        </div>
      </div>

      {/* Кнопка */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={onLoad}
          className={`w-full py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
            isWinner
              ? 'bg-garden-green text-white hover:bg-garden-green/90 shadow-md'
              : 'bg-gray-100 text-garden-green hover:bg-gray-200'
          }`}
        >
          {isWinner ? (
            <>
              <Trophy className="w-4 h-4" />
              Обрати цей план
            </>
          ) : (
            'Завантажити план'
          )}
        </button>
      </div>
    </div>
  );
}

// 🎯 ГОЛОВНИЙ КОМПОНЕНТ МОДАЛКИ
export function ComparePlansModal({ plans, onClose, onLoadPlan }: Props) {
  // Визначаємо переможця по врожаю
  const yields = plans.map(p => p?.expected_yield_kg || 0);
  const maxYield = Math.max(...yields);
  const winnerIndex = yields.indexOf(maxYield);

  // 🔍 DEBUG: виводимо в консоль щоб побачити чи плани різні
  console.log('🔍 Порівняння планів:', plans.map((p, i) => ({
    index: i,
    name: p.name,
    id: p.id,
    yield_kg: p.expected_yield_kg,
    beds_count: p.layout?.beds?.length || 0,
    beds_names: p.layout?.beds?.map(b => b.name_uk),
  })));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-serif text-garden-green text-xl flex items-center gap-2">
              ⚖️ Порівняння планів ({plans.length})
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Обери найкращий варіант для свого городу
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 🔑 КЛЮЧОВЕ: кожна PlanCard отримує свій plan через props */}
          <div className={`grid gap-6 ${
            plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          }`}>
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan.id}  // 🔑 Унікальний key для кожного плану
                plan={plan}
                planIndex={idx}
                isWinner={idx === winnerIndex && plans.length > 1}
                onLoad={() => onLoadPlan(plan)}
              />
            ))}
          </div>

          {/* Підказка */}
          <div className="mt-6 p-4 bg-cream-paper rounded-xl text-sm text-earth-brown/80">
            <p className="font-semibold text-garden-green mb-1">💡 Як обрати найкращий план?</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Більше врожаю</strong> — якщо головна мета врожайність</li>
              <li>• <strong>Більше % використання</strong> — якщо хочеш максимально використати ділянку</li>
              <li>• <strong>Різноманіття культур</strong> — якщо хочеш більший асортимент</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}