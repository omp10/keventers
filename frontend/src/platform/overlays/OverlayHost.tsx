import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/design-system';
import { useOverlayStore, type DrawerSide } from './store';

const drawerSideToPanel: Record<DrawerSide, 'left' | 'right' | 'top' | 'bottom'> = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
};

/**
 * OverlayHost — renders every manager-driven modal + drawer. Mount ONCE near the
 * app root (inside AppProviders). Pages never render these directly; they call the
 * `modals`/`drawers` API.
 */
export function OverlayHost() {
  const modals = useOverlayStore((s) => s.modals);
  const drawers = useOverlayStore((s) => s.drawers);
  const closeModal = useOverlayStore((s) => s.closeModal);
  const closeDrawer = useOverlayStore((s) => s.closeDrawer);

  return (
    <>
      {modals.map((m) => {
        const close = () => closeModal(m.id);
        return (
          <Dialog key={m.id} open onOpenChange={(o) => !o && m.dismissible !== false && close()}>
            <DialogContent size={m.size ?? 'md'} showClose={m.dismissible !== false}>
              {(m.title || m.description) && (
                <DialogHeader>
                  {m.title && <DialogTitle>{m.title}</DialogTitle>}
                  {m.description && <DialogDescription>{m.description}</DialogDescription>}
                </DialogHeader>
              )}
              {typeof m.content === 'function' ? m.content(close) : m.content}
            </DialogContent>
          </Dialog>
        );
      })}

      {drawers.map((d) => {
        const close = () => closeDrawer(d.id);
        return (
          <Drawer key={d.id} open onOpenChange={(o) => !o && d.dismissible !== false && close()} direction={d.side ?? 'right'}>
            <DrawerContent side={drawerSideToPanel[d.side ?? 'right']}>
              {d.title && (
                <DrawerHeader>
                  <DrawerTitle>{d.title}</DrawerTitle>
                </DrawerHeader>
              )}
              {typeof d.content === 'function' ? d.content(close) : d.content}
            </DrawerContent>
          </Drawer>
        );
      })}
    </>
  );
}
