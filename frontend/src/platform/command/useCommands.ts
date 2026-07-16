import { useEffect } from 'react';

import { useCommandContext } from './CommandProvider';
import { commandRegistry, type AppCommand } from './registry';

/** Open/close/toggle the command palette imperatively. */
export function useCommandPalette() {
  const { open, close, toggle } = useCommandContext();
  return { open, close, toggle };
}

/** Register commands for the lifetime of a component (auto-unregistered). */
export function useRegisterCommands(commands: AppCommand[], deps: unknown[] = []) {
  useEffect(() => commandRegistry.registerMany(commands), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Register a single command for the lifetime of a component. */
export function useRegisterCommand(command: AppCommand, deps: unknown[] = []) {
  useEffect(() => commandRegistry.register(command), deps); // eslint-disable-line react-hooks/exhaustive-deps
}
