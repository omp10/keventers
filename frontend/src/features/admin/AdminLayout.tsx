import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Spinner } from '@/design-system';
import { AppShell } from '@/shell';
import { useAdminIntegrations } from './useAdminIntegrations';

export function AdminLayout() {
  useAdminIntegrations();
  return <AppShell app="admin" contentWidth="wide"><Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Spinner /></div>}><Outlet /></Suspense></AppShell>;
}
