import type { IconName } from '@/design-system';
import type { AccessRule } from '@/platform/permissions';

/**
 * COMMAND PALETTE PLATFORM — a registry of commands (actions + navigation) that
 * any module contributes to. The provider renders them through the F1
 * CommandPalette, permission-filtered. Modules register; they never own palette UI.
 */
export type AppCommand = {
  id: string;
  title: string;
  icon?: IconName;
  shortcut?: string;
  keywords?: string[];
  /** Section heading in the palette (e.g. 'Navigation', 'Actions'). */
  section?: string;
  /** Ordering hint within a section (lower first). */
  order?: number;
  /** Hide unless the user satisfies this rule. */
  access?: AccessRule;
  run: () => void;
};

class CommandRegistry {
  private commands = new Map<string, AppCommand>();
  private listeners = new Set<() => void>();
  private snapshot: AppCommand[] = [];

  register(command: AppCommand): () => void {
    this.commands.set(command.id, command);
    this.emit();
    return () => this.unregister(command.id);
  }
  registerMany(commands: AppCommand[]): () => void {
    commands.forEach((c) => this.commands.set(c.id, c));
    this.emit();
    return () => {
      commands.forEach((c) => this.commands.delete(c.id));
      this.emit();
    };
  }
  unregister(id: string) {
    this.commands.delete(id);
    this.emit();
  }
  all(): AppCommand[] {
    return this.snapshot;
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.snapshot = [...this.commands.values()];
    this.listeners.forEach((l) => l());
  }
}

export const commandRegistry = new CommandRegistry();
