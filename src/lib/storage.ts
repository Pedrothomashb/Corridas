import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@corridas/v1/';

export const KEYS = {
  pilots: PREFIX + 'pilots',
  races: PREFIX + 'races',
  current: PREFIX + 'current',
} as const;

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch (e) {
    console.warn('Falha ao ler', key, e);
    return fallback;
  }
}

export async function save(key: string, value: unknown): Promise<void> {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Falha ao salvar', key, e);
  }
}
