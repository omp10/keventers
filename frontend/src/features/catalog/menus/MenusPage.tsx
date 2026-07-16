import { useState } from 'react';

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  Icon,
  Input,
  Spinner,
  Textarea,
} from '@/design-system';
import { ScheduleField } from '../components';
import { useMenus, useMenuMutations } from '../hooks';
import type { Schedule } from '../types';
import { MenuCard, type MenuAction } from './MenuCard';

/** Menus overview — grid of menu cards with create / schedule flows. */
export function MenusPage() {
  const { data: menus = [], isLoading } = useMenus();
  const mutations = useMenuMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [scheduling, setScheduling] = useState(false);

  const handleAction = (id: string, action: MenuAction) => {
    switch (action) {
      case 'setActive':
        void mutations.setActive(id);
        break;
      case 'publish':
        void mutations.publish(id);
        break;
      case 'duplicate':
        void mutations.duplicate(id);
        break;
      case 'archive':
        void mutations.archive(id);
        break;
      case 'schedule':
        setSchedule({});
        setScheduleFor(id);
        break;
    }
  };

  const submitCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await mutations.create({ name: name.trim(), description: description.trim() || undefined });
      setCreateOpen(false);
      setName('');
      setDescription('');
    } finally {
      setCreating(false);
    }
  };

  const submitSchedule = async () => {
    if (!scheduleFor) return;
    setScheduling(true);
    try {
      await mutations.schedule(scheduleFor, schedule);
      setScheduleFor(null);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Menus</h1>
          <p className="mt-1 text-sm text-foreground-muted">Organise what customers can order and when.</p>
        </div>
        <Button variant="primary" leftIcon="add" onClick={() => setCreateOpen(true)}>New menu</Button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Spinner />
        </div>
      ) : menus.length === 0 ? (
        <EmptyState
          icon={<Icon name="utensils" className="mb-4 h-10 w-10 text-foreground-subtle" />}
          title="No menus yet"
          description="Create your first menu to start grouping categories and products."
          action={<Button variant="primary" leftIcon="add" onClick={() => setCreateOpen(true)}>New menu</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} onAction={(action) => handleAction(menu.id, action)} />
          ))}
        </div>
      )}

      {/* Create menu */}
      <Drawer open={createOpen} onOpenChange={setCreateOpen} direction="right">
        <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold text-foreground">New menu</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Breakfast"
                className="mt-1.5"
                autoFocus
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Description
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — what this menu is for"
                rows={3}
                className="mt-1.5"
              />
            </label>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={creating} disabled={!name.trim()} onClick={() => void submitCreate()}>
              Create menu
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Schedule menu */}
      <Drawer open={scheduleFor !== null} onOpenChange={(o) => !o && setScheduleFor(null)} direction="right">
        <DrawerContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold text-foreground">Schedule menu</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <p className="text-sm text-foreground-muted">Set when this menu becomes available.</p>
            <ScheduleField value={schedule} onChange={setSchedule} />
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" onClick={() => setScheduleFor(null)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={scheduling} onClick={() => void submitSchedule()}>Save schedule</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
