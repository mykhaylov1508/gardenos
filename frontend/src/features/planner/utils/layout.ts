// frontend/src/features/planner/utils/layout.ts
// 🌿 GardenOS v2.0 - Алгоритм розміщення рослин на ділянці

import { PLANT_SPACING, WATER_NEEDS, PLANT_HEIGHTS } from '../constants';
import { checkCompatibility } from './compatibility';

export interface LayoutInput {
  plot_width_m: number;
  plot_length_m: number;
  water_source?: { x_m: number; y_m: number };
  north_direction?: 'top' | 'bottom' | 'left' | 'right';
  plants: PlantToLayout[];
}

export interface PlantToLayout {
  plant_id: string;
  name_uk: string;
  quantity: number;
  good_companions: string[];
  bad_companions: string[];
}

export interface BedPlacement {
  plant_id: string;
  name_uk: string;
  x_m: number;
  y_m: number;
  width_m: number;
  length_m: number;
  planted_quantity: number;
  placement_reason: string;
}

export interface LayoutResult {
  beds: BedPlacement[];
  empty_spaces: EmptyZone[];
  total_used_area_m2: number;
  total_empty_area_m2: number;
  usage_percent: number;
  warnings: string[];
}

interface EmptyZone {
  x_m: number;
  y_m: number;
  width_m: number;
  length_m: number;
  area_m2: number;
}

const PATHWAY_WIDTH_M = 0.6;

export function generateLayout(input: LayoutInput): LayoutResult {
  const { plot_width_m, plot_length_m, water_source, north_direction = 'top' } = input;
  
  const warnings: string[] = [];
  const beds: BedPlacement[] = [];
  const sorted_plants = prioritizePlants(input.plants, water_source, north_direction);
  
  let free_zones: EmptyZone[] = [
    {
      x_m: 0,
      y_m: 0,
      width_m: plot_width_m,
      length_m: plot_length_m,
      area_m2: plot_width_m * plot_length_m,
    },
  ];
  
  for (const plant of sorted_plants) {
    const bed_size = calculateBedSize(plant.name_uk, plant.quantity);
    
    const best_spot = findBestSpot(
      bed_size,
      free_zones,
      plant,
      beds,
      water_source,
      north_direction
    );
    
    if (!best_spot) {
      warnings.push(`⚠️ Для "${plant.name_uk}" (${plant.quantity} шт) не вистачило місця.`);
      continue;
    }
    
    const bed: BedPlacement = {
      plant_id: plant.plant_id,
      name_uk: plant.name_uk,
      x_m: best_spot.x_m,
      y_m: best_spot.y_m,
      width_m: bed_size.width_m,
      length_m: bed_size.length_m,
      planted_quantity: plant.quantity,
      placement_reason: generatePlacementReason(
        plant.name_uk,
        best_spot,
        water_source,
        north_direction
      ),
    };
    
    beds.push(bed);
    free_zones = subtractZone(free_zones, bed);
  }
  
  const total_used_area_m2 = beds.reduce((sum, b) => sum + b.width_m * b.length_m, 0);
  const total_area_m2 = plot_width_m * plot_length_m;
  const total_empty_area_m2 = total_area_m2 - total_used_area_m2;
  
  return {
    beds,
    empty_spaces: free_zones.filter(z => z.area_m2 >= 1),
    total_used_area_m2: Math.round(total_used_area_m2 * 100) / 100,
    total_empty_area_m2: Math.round(total_empty_area_m2 * 100) / 100,
    usage_percent: Math.round((total_used_area_m2 / total_area_m2) * 100),
    warnings,
  };
}

function prioritizePlants(
  plants: PlantToLayout[],
  water_source: { x_m: number; y_m: number } | undefined,
  north_direction: string
): PlantToLayout[] {
  return [...plants].sort((a, b) => {
    if (water_source) {
      const a_water = WATER_NEEDS[a.name_uk as keyof typeof WATER_NEEDS];
      const b_water = WATER_NEEDS[b.name_uk as keyof typeof WATER_NEEDS];
      if (a_water === 'high' && b_water !== 'high') return -1;
      if (b_water === 'high' && a_water !== 'high') return 1;
    }
    
    const a_height = PLANT_HEIGHTS[a.name_uk as keyof typeof PLANT_HEIGHTS] || 0;
    const b_height = PLANT_HEIGHTS[b.name_uk as keyof typeof PLANT_HEIGHTS] || 0;
    
    if (a_height !== b_height) return b_height - a_height;
    return b.quantity - a.quantity;
  });
}

function calculateBedSize(
  plant_name: string,
  quantity: number
): { width_m: number; length_m: number } {
  const spacing = PLANT_SPACING[plant_name as keyof typeof PLANT_SPACING] 
    || { between: 0.4, rows: 0.6 };
  
  const MAX_BED_WIDTH_M = 1.2;
  const plants_per_row = Math.max(1, Math.floor(MAX_BED_WIDTH_M / spacing.between));
  const rows = Math.ceil(quantity / plants_per_row);
  
  const width_m = Math.min(
    MAX_BED_WIDTH_M,
    plants_per_row * spacing.between + 0.3
  );
  
  let length_m = rows * spacing.rows;
  
  if (rows > 3) {
    const internal_paths = Math.floor((rows - 1) / 3) * PATHWAY_WIDTH_M;
    length_m += internal_paths;
  }
  
  length_m += 0.3;
  
  return {
    width_m: Math.round(width_m * 100) / 100,
    length_m: Math.round(length_m * 100) / 100,
  };
}

/**
 * 🔍 КЛЮЧОВА ФУНКЦІЯ: шукає найкраще місце
 * ПРОБУЄМО 8 ПОЗИЦІЙ в кожній зоні для оптимального розміщення
 */
function findBestSpot(
  bed_size: { width_m: number; length_m: number },
  free_zones: EmptyZone[],
  plant: PlantToLayout,
  existing_beds: BedPlacement[],
  water_source: { x_m: number; y_m: number } | undefined,
  north_direction: string
): { x_m: number; y_m: number; score: number } | null {
  let best_spot: { x_m: number; y_m: number; score: number } | null = null;
  
  for (const zone of free_zones) {
    if (bed_size.width_m > zone.width_m || bed_size.length_m > zone.length_m) {
      continue;
    }
    
    // 🎯 КЛЮЧОВЕ: 8 позицій в зоні (кути + середини сторін)
    const positions = [
      // 4 кути
      { x: zone.x_m, y: zone.y_m }, // верх-лівий
      { x: zone.x_m + zone.width_m - bed_size.width_m, y: zone.y_m }, // верх-правий
      { x: zone.x_m, y: zone.y_m + zone.length_m - bed_size.length_m }, // низ-лівий
      { x: zone.x_m + zone.width_m - bed_size.width_m, y: zone.y_m + zone.length_m - bed_size.length_m }, // низ-правий
      // 4 середини сторін
      { x: zone.x_m + (zone.width_m - bed_size.width_m) / 2, y: zone.y_m }, // верх-центр
      { x: zone.x_m + (zone.width_m - bed_size.width_m) / 2, y: zone.y_m + zone.length_m - bed_size.length_m }, // низ-центр
      { x: zone.x_m, y: zone.y_m + (zone.length_m - bed_size.length_m) / 2 }, // ліво-центр
      { x: zone.x_m + zone.width_m - bed_size.width_m, y: zone.y_m + (zone.length_m - bed_size.length_m) / 2 }, // право-центр
    ];
    
    for (const pos of positions) {
      const x_m = pos.x;
      const y_m = pos.y;
      
      let score = 100;
      
      // 💧 Фактор 1: Близькість до води (для вологолюбних)
      if (water_source) {
        const water_need = WATER_NEEDS[plant.name_uk as keyof typeof WATER_NEEDS];
        if (water_need === 'high') {
          const bed_center_x = x_m + bed_size.width_m / 2;
          const bed_center_y = y_m + bed_size.length_m / 2;
          
          const distance_to_water = Math.sqrt(
            Math.pow(bed_center_x - water_source.x_m, 2) + 
            Math.pow(bed_center_y - water_source.y_m, 2)
          );
          
          // БОНУС до 100 балів за близькість (дуже сильний вплив!)
          const water_bonus = Math.max(0, 100 - distance_to_water * 8);
          score += water_bonus;
        }
      }
      
      // 🌳 Фактор 2: Висота (ставимо високі з північної сторони)
      const plant_height = PLANT_HEIGHTS[plant.name_uk as keyof typeof PLANT_HEIGHTS] || 0;
      if (plant_height > 80) {
        const zone_center_y = zone.y_m + zone.length_m / 2;
        const zone_center_x = zone.x_m + zone.width_m / 2;
        
        if (north_direction === 'top' && y_m < zone_center_y) score += 30;
        if (north_direction === 'bottom' && y_m > zone_center_y) score += 30;
        if (north_direction === 'left' && x_m < zone_center_x) score += 30;
        if (north_direction === 'right' && x_m > zone_center_x) score += 30;
      }
      
      // 🤝 Фактор 3: Сумісність із сусідами
      for (const existing of existing_beds) {
        const existing_center_x = existing.x_m + existing.width_m / 2;
        const existing_center_y = existing.y_m + existing.length_m / 2;
        const bed_center_x = x_m + bed_size.width_m / 2;
        const bed_center_y = y_m + bed_size.length_m / 2;
        
        const distance = Math.sqrt(
          Math.pow(bed_center_x - existing_center_x, 2) + 
          Math.pow(bed_center_y - existing_center_y, 2)
        );
        
        if (distance < 5) {
          const compat = checkCompatibility(plant.name_uk, existing.name_uk);
          if (compat.level === 'good') score += 20;
          if (compat.level === 'bad') score -= 50;
        }
      }
      
      if (!best_spot || score > best_spot.score) {
        best_spot = { x_m, y_m, score };
      }
    }
  }
  
  return best_spot;
}

function subtractZone(zones: EmptyZone[], bed: BedPlacement): EmptyZone[] {
  const new_zones: EmptyZone[] = [];
  
  for (const zone of zones) {
    const overlap = !(
      bed.x_m + bed.width_m <= zone.x_m ||
      bed.x_m >= zone.x_m + zone.width_m ||
      bed.y_m + bed.length_m <= zone.y_m ||
      bed.y_m >= zone.y_m + zone.length_m
    );
    
    if (!overlap) {
      new_zones.push(zone);
      continue;
    }
    
    if (bed.x_m > zone.x_m) {
      const left_zone: EmptyZone = {
        x_m: zone.x_m,
        y_m: zone.y_m,
        width_m: bed.x_m - zone.x_m,
        length_m: zone.length_m,
        area_m2: 0,
      };
      left_zone.area_m2 = left_zone.width_m * left_zone.length_m;
      if (left_zone.area_m2 >= 0.5) new_zones.push(left_zone);
    }
    
    const bed_right = bed.x_m + bed.width_m;
    const zone_right = zone.x_m + zone.width_m;
    if (bed_right < zone_right) {
      const right_zone: EmptyZone = {
        x_m: bed_right,
        y_m: zone.y_m,
        width_m: zone_right - bed_right,
        length_m: zone.length_m,
        area_m2: 0,
      };
      right_zone.area_m2 = right_zone.width_m * right_zone.length_m;
      if (right_zone.area_m2 >= 0.5) new_zones.push(right_zone);
    }
    
    if (bed.y_m > zone.y_m) {
      const top_zone: EmptyZone = {
        x_m: zone.x_m,
        y_m: zone.y_m,
        width_m: zone.width_m,
        length_m: bed.y_m - zone.y_m,
        area_m2: 0,
      };
      top_zone.area_m2 = top_zone.width_m * top_zone.length_m;
      if (top_zone.area_m2 >= 0.5) new_zones.push(top_zone);
    }
    
    const bed_bottom = bed.y_m + bed.length_m;
    const zone_bottom = zone.y_m + zone.length_m;
    if (bed_bottom < zone_bottom) {
      const bottom_zone: EmptyZone = {
        x_m: zone.x_m,
        y_m: bed_bottom,
        width_m: zone.width_m,
        length_m: zone_bottom - bed_bottom,
        area_m2: 0,
      };
      bottom_zone.area_m2 = bottom_zone.width_m * bottom_zone.length_m;
      if (bottom_zone.area_m2 >= 0.5) new_zones.push(bottom_zone);
    }
  }
  
  return new_zones;
}

function generatePlacementReason(
  plant_name: string,
  spot: { x_m: number; y_m: number },
  water_source: { x_m: number; y_m: number } | undefined,
  north_direction: string
): string {
  const reasons: string[] = [];
  
  const water_need = WATER_NEEDS[plant_name as keyof typeof WATER_NEEDS];
  const height = PLANT_HEIGHTS[plant_name as keyof typeof PLANT_HEIGHTS] || 0;
  
  if (water_source && water_need === 'high') {
    const distance = Math.sqrt(
      Math.pow(spot.x_m - water_source.x_m, 2) + 
      Math.pow(spot.y_m - water_source.y_m, 2)
    );
    if (distance < 5) {
      reasons.push(`близько до джерела води (потребує частого поливу)`);
    }
  }
  
  if (height > 100) {
    if (north_direction === 'top' && spot.y_m < 3) {
      reasons.push(`з північної сторони (щоб не затінювала нижчі рослини)`);
    }
  }
  
  if (reasons.length === 0) {
    reasons.push(`оптимальне місце з урахуванням сумісності з сусідами`);
  }
  
  const name_cap = plant_name.charAt(0).toUpperCase() + plant_name.slice(1);
  return `${name_cap} розміщено тут: ${reasons.join(', ')}.`;
}