// Short confirmation messages ("Saved", "Moved to Test"), read out by screen readers.
import { useSyncExternalStore } from 'react';

let message = '';
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function toast(text: string) {
  message = text;
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = '';
    listeners.forEach((l) => l());
  }, 5000);
}

export const useToast = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
  );
