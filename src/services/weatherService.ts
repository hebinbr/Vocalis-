import { WeatherData } from '../types';

export interface CityPreset {
  name: string;
  state: string;
  lat: number;
  lon: number;
  typicalCondition?: string;
}

export const BRAZIL_CITY_PRESETS: CityPreset[] = [
  { name: 'São Paulo', state: 'SP', lat: -23.5505, lon: -46.6333, typicalCondition: 'Ameno / Urbano' },
  { name: 'Brasília', state: 'DF', lat: -15.7975, lon: -47.8919, typicalCondition: 'Clima Seco / Cerrado' },
  { name: 'Curitiba', state: 'PR', lat: -25.4284, lon: -49.2733, typicalCondition: 'Frio / Variação Térmica' },
  { name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lon: -43.1729, typicalCondition: 'Quente / Litorâneo' },
  { name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lon: -43.9345, typicalCondition: 'Altitude / Ameno' },
  { name: 'Salvador', state: 'BA', lat: -12.9777, lon: -38.5016, typicalCondition: 'Tropical / Úmido' },
  { name: 'Porto Alegre', state: 'RS', lat: -30.0346, lon: -51.2177, typicalCondition: 'Frio Subtropical' },
  { name: 'Manaus', state: 'AM', lat: -3.1190, lon: -60.0217, typicalCondition: 'Equatorial / Muito Úmido' }
];

export const CLIMATE_SIMULATION_PRESETS: Array<{
  label: string;
  data: WeatherData;
}> = [
  {
    label: 'Ar Seco (< 30% Umidade)',
    data: {
      city: 'Ambiente Seco / Ar-Condicionado',
      temperature: 26,
      relativeHumidity: 28,
      apparentTemperature: 27,
      condition: 'dry',
      conditionLabel: 'Alerta de Ar Seco (28% UR)',
      isAutoDetected: false,
      updatedAt: new Date().toISOString()
    }
  },
  {
    label: 'Clima Frio (< 16°C)',
    data: {
      city: 'Ambiente Frio / Inverno',
      temperature: 13,
      relativeHumidity: 65,
      apparentTemperature: 11,
      condition: 'cold',
      conditionLabel: 'Tempo Frio (13°C)',
      isAutoDetected: false,
      updatedAt: new Date().toISOString()
    }
  },
  {
    label: 'Calor Elevado (> 30°C)',
    data: {
      city: 'Calor Intenso / Verão',
      temperature: 32,
      relativeHumidity: 45,
      apparentTemperature: 35,
      condition: 'hot',
      conditionLabel: 'Calor Elevado (32°C)',
      isAutoDetected: false,
      updatedAt: new Date().toISOString()
    }
  },
  {
    label: 'Condição Ideal (22°C / 60%)',
    data: {
      city: 'Condição Conforto Vocal',
      temperature: 22,
      relativeHumidity: 60,
      apparentTemperature: 22,
      condition: 'moderate',
      conditionLabel: 'Umidade e Temperatura Ideais',
      isAutoDetected: false,
      updatedAt: new Date().toISOString()
    }
  }
];

function classifyCondition(temp: number, humidity: number): { condition: WeatherData['condition']; label: string } {
  if (humidity < 40) {
    return {
      condition: 'dry',
      label: `Ar Seco (${Math.round(humidity)}% UR - Alerta de Mucosa)`
    };
  }
  if (temp < 18) {
    return {
      condition: 'cold',
      label: `Clima Frio (${Math.round(temp)}°C - Rigidez Laríngea)`
    };
  }
  if (temp >= 29) {
    return {
      condition: 'hot',
      label: `Calor Elevado (${Math.round(temp)}°C - Desidratação)`
    };
  }
  if (humidity >= 70) {
    return {
      condition: 'humid',
      label: `Clima Úmido (${Math.round(humidity)}% UR)`
    };
  }
  return {
    condition: 'moderate',
    label: `Ameno & Equilibrado (${Math.round(temp)}°C · ${Math.round(humidity)}% UR)`
  };
}

export async function fetchWeatherForLocation(lat: number, lon: number, cityName = 'Sua Região'): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`;

    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) {
      return getDefaultWeatherData();
    }
    const data = await res.json();
    const current = data?.current || {};
    const temp = Number(current.temperature_2m ?? 23);
    const humidity = Number(current.relative_humidity_2m ?? 55);
    const apparent = Number(current.apparent_temperature ?? temp);

    const { condition, label } = classifyCondition(temp, humidity);

    return {
      city: String(cityName || 'Sua Região'),
      temperature: Math.round(temp),
      relativeHumidity: Math.round(humidity),
      apparentTemperature: Math.round(apparent),
      condition,
      conditionLabel: label,
      isAutoDetected: true,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[Vocalis Weather] Usando dados climáticos padrão:', err);
    return getDefaultWeatherData();
  }
}

export function getDefaultWeatherData(): WeatherData {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem('vocalis_weather_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.temperature === 'number' && typeof parsed.city === 'string') {
          return {
            city: parsed.city,
            temperature: parsed.temperature,
            relativeHumidity: parsed.relativeHumidity ?? 48,
            apparentTemperature: parsed.apparentTemperature ?? parsed.temperature,
            condition: parsed.condition || 'moderate',
            conditionLabel: parsed.conditionLabel || 'Condição Ameno / Padrão',
            isAutoDetected: Boolean(parsed.isAutoDetected),
            updatedAt: parsed.updatedAt || new Date().toISOString()
          };
        }
      }
    }
  } catch {}

  return {
    city: 'São Paulo (Referência)',
    temperature: 24,
    relativeHumidity: 48,
    apparentTemperature: 24,
    condition: 'moderate',
    conditionLabel: 'Condição Apoiada (24°C · 48% UR)',
    isAutoDetected: false,
    updatedAt: new Date().toISOString()
  };
}
