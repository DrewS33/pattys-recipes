import { useState, useEffect } from 'react';

// ============================================================
// useLocalStorage: a hook that keeps state synced with localStorage
// Works like useState but automatically saves/loads from browser storage
// ============================================================
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Try to load saved value from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Whenever the value changes, save it to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
