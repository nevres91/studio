"use client";

// import { useState, useEffect, useCallback } from 'react';

// function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
//   const [storedValue, setStoredValue] = useState<T>(initialValue);

//   useEffect(() => {
//     // This effect runs only on the client after hydration
//     if (typeof window !== 'undefined') {
//       try {
//         const item = window.localStorage.getItem(key);
//         if (item) {
//           setStoredValue(JSON.parse(item));
//         } else {
//           // If no item in localStorage, then the initialValue is correct,
//           // and we write it to localStorage.
//           window.localStorage.setItem(key, JSON.stringify(initialValue));
//           setStoredValue(initialValue); // Ensure state is also initialValue if not found
//         }
//       } catch (error) {
//         console.error(`Error reading localStorage key "${key}":`, error);
//         // If error, stick with initialValue and write it
//         window.localStorage.setItem(key, JSON.stringify(initialValue));
//         setStoredValue(initialValue);
//       }
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [key]); // initialValue is part of closure, not a dep itself for this effect

//   const setValue = useCallback(
//     (value: T | ((val: T) => T)) => {
//       try {
//         const valueToStore = value instanceof Function ? value(storedValue) : value;
//         setStoredValue(valueToStore);
//         if (typeof window !== 'undefined') {
//           window.localStorage.setItem(key, JSON.stringify(valueToStore));
//         }
//       } catch (error) {
//         console.error(`Error setting localStorage key "${key}":`, error);
//       }
//     },
//     [key, storedValue]
//   );

//   return [storedValue, setValue];
// }

// export default useLocalStorage;
