import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const existing = window.localStorage.getItem(key);
      if (existing != null) {
        return JSON.parse(existing);
      }
    } catch (error) {
      console.warn('Failed to read local storage', error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to persist local storage', error);
    }
  }, [key, value]);

  return [value, setValue];
}
