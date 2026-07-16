import { useCallback, useMemo, useState } from 'react';

/** Open/close state for modals, drawers, popovers, menus. */
export function useDisclosure(defaultOpen = false) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((v) => !v), []);
  return useMemo(() => ({ isOpen, onOpen, onClose, onToggle, setOpen }), [isOpen, onOpen, onClose, onToggle]);
}
