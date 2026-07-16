import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { commandRegistry } from '@/platform/command';
import { searchRegistry, type SearchProvider } from '@/platform/search';
import { couponService, customerService, paymentReportService, qrService, staffService, tableService } from './services';

/** Registers F4.3 actions and backend-powered global search with the shared platform. */
export function useManagementIntegrations() {
  const navigate = useNavigate();

  useEffect(() => commandRegistry.registerMany([
    { id: 'mgmt:invite-staff', title: 'Invite staff', icon: 'add', section: 'Restaurant actions', access: { anyPermission: ['staff:create', 'user:manage'] }, run: () => navigate('/dashboard/staff?invite=1') },
    { id: 'mgmt:generate-qr', title: 'Generate QR', icon: 'qr', section: 'Restaurant actions', access: { anyPermission: ['qr:create', 'table:manage'] }, run: () => navigate('/dashboard/qr?generate=1') },
    { id: 'mgmt:create-coupon', title: 'Create coupon', icon: 'gift', section: 'Restaurant actions', access: { anyPermission: ['coupon:create', 'pricing:manage'] }, run: () => navigate('/dashboard/coupons?create=1') },
    { id: 'mgmt:open-customer', title: 'Open customer directory', icon: 'users', section: 'Restaurant actions', access: { anyPermission: ['customer:read'] }, run: () => navigate('/dashboard/customers') },
    { id: 'mgmt:search-staff', title: 'Search staff', icon: 'search', section: 'Search', access: { anyPermission: ['staff:read', 'user:read'] }, run: () => navigate('/dashboard/staff?focus=search') },
    { id: 'mgmt:search-customer', title: 'Search customers', icon: 'search', section: 'Search', access: { anyPermission: ['customer:read'] }, run: () => navigate('/dashboard/customers?focus=search') },
    { id: 'mgmt:search-qr', title: 'Search QR codes', icon: 'qr', section: 'Search', access: { anyPermission: ['qr:read', 'table:read'] }, run: () => navigate('/dashboard/qr?focus=search') },
    { id: 'mgmt:search-coupon', title: 'Search coupons', icon: 'gift', section: 'Search', access: { anyPermission: ['coupon:read'] }, run: () => navigate('/dashboard/coupons?focus=search') },
  ]), [navigate]);

  useEffect(() => {
    const providers: SearchProvider[] = [
      { id: 'mgmt-staff', label: 'Staff', icon: 'user', access: { anyPermission: ['staff:read', 'user:read'] }, search: async (q) => (await staffService.list({ q }, 1, 6)).items.map((x) => ({ id: `staff:${x.id}`, title: x.name, subtitle: `${x.role} · ${x.email}`, icon: 'user', group: 'Staff', href: `/dashboard/staff?staff=${x.id}` })) },
      { id: 'mgmt-customers', label: 'Customers', icon: 'users', access: { anyPermission: ['customer:read'] }, search: async (q) => (await customerService.list({ q }, 1, 6)).items.map((x) => ({ id: `customer:${x.id}`, title: x.name ?? 'Guest', subtitle: x.phone ?? x.email, icon: 'users', group: 'Customers', href: `/dashboard/customers?customer=${x.id}` })) },
      { id: 'mgmt-coupons', label: 'Coupons', icon: 'gift', access: { anyPermission: ['coupon:read'] }, search: async (q) => (await couponService.list({ q }, 1, 6)).items.map((x) => ({ id: `coupon:${x.id}`, title: x.code, subtitle: x.status, icon: 'gift', group: 'Coupons', href: `/dashboard/coupons?coupon=${x.id}` })) },
      { id: 'mgmt-tables', label: 'Tables', icon: 'grid', access: { anyPermission: ['table:read'] }, search: async (q) => (await tableService.list({ q })).slice(0, 6).map((x) => ({ id: `table:${x.id}`, title: x.label, subtitle: `${x.status} · capacity ${x.capacity}`, icon: 'grid', group: 'Tables', href: '/dashboard/tables' })) },
      { id: 'mgmt-qr', label: 'QR codes', icon: 'qr', access: { anyPermission: ['qr:read', 'table:read'] }, search: async (q) => (await qrService.list({ q })).slice(0, 6).map((x) => ({ id: `qr:${x.id}`, title: x.code, subtitle: x.tableLabel ?? x.type, icon: 'qr', group: 'QR codes', href: `/dashboard/qr?qr=${x.id}` })) },
      { id: 'mgmt-payments', label: 'Payments', icon: 'payment', access: { anyPermission: ['payment:read'] }, search: async (q) => (await paymentReportService.list({ q }, 1, 6)).items.map((x) => ({ id: `payment:${x.id}`, title: x.orderNumber ?? x.id, subtitle: `${x.provider} · ${x.status}`, icon: 'payment', group: 'Payments', href: '/dashboard/payments' })) },
    ];
    const cleanup = providers.map((provider) => searchRegistry.register(provider));
    return () => cleanup.forEach((fn) => fn());
  }, []);
}
