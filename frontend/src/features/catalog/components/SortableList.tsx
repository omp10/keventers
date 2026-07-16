import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type SortableRenderProps = {
  index: number;
  isDragging: boolean;
  moveUp: () => void;
  moveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

/**
 * SortableList — a reusable drag-and-drop reorderable list. Uses native HTML5 DnD
 * (no dependency) with keyboard-accessible move up/down fallbacks (WCAG). Commits a
 * new order via `onReorder(orderedIds)` — the BACKEND persists it. Used by the
 * category tree, variants, add-ons, and the media gallery.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, props: SortableRenderProps) => ReactNode;
  className?: string;
}) {
  const [list, setList] = useState<T[]>(items);
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => setList(items), [items]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const commit = (next: T[]) => {
    setList(next);
    onReorder(next.map(getId));
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {list.map((item, index) => (
        <div
          key={getId(item)}
          draggable
          onDragStart={() => {
            dragFrom.current = index;
            setDragging(index);
          }}
          onDragEnd={() => {
            dragFrom.current = null;
            setDragging(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragFrom.current === null || dragFrom.current === index) return;
            setList((cur) => {
              const next = [...cur];
              const [it] = next.splice(dragFrom.current!, 1);
              next.splice(index, 0, it);
              dragFrom.current = index;
              return next;
            });
          }}
          onDrop={(e) => {
            e.preventDefault();
            commit(list);
          }}
          className={cn('rounded-lg transition', dragging === index && 'opacity-60')}
        >
          {renderItem(item, {
            index,
            isDragging: dragging === index,
            moveUp: () => commit(move(index, index - 1)),
            moveDown: () => commit(move(index, index + 1)),
            canMoveUp: index > 0,
            canMoveDown: index < list.length - 1,
          })}
        </div>
      ))}
    </div>
  );
}
