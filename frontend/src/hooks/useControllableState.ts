import { useCallback, useState } from 'react';

/**
 * Controlled/uncontrolled state — the standard headless pattern so every
 * component supports BOTH `value`/`onChange` (controlled) and `defaultValue`
 * (uncontrolled) with one implementation. Used by Switch, Tabs, Accordion, etc.
 */
export function useControllableState<T>(params: {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}): [T, (next: T) => void] {
  const { value, defaultValue, onChange } = params;
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<T | undefined>(defaultValue);

  const state = (isControlled ? value : uncontrolled) as T;

  const setState = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [state, setState];
}
