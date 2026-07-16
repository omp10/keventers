import type { Money } from '@/features/ordering';

export type AdminStatus = 'active' | 'pending' | 'suspended' | 'disabled' | 'rejected';
export type PlatformKpis = { revenue: Money; restaurants: number; branches: number; customers: number; orders: number; paymentsToday: Money; health?: string; growth?: number };
export type Organization = { id: string; name: string; slug?: string; status: AdminStatus; subscription?: { plan?: string; status?: string; trialEndsAt?: string }; restaurantCount?: number; branchCount?: number; ownerEmail?: string; createdAt?: string };
export type OnboardingApplication = { id: string; businessName: string; ownerName?: string; email?: string; city?: string; status: AdminStatus; submittedAt?: string; documents?: { name: string; url: string }[] };
export type PlatformUser = { id: string; name?: string; email: string; type?: string; status: AdminStatus; roles?: string[]; lastLoginAt?: string; createdAt?: string };
export type PlatformPayment = { id: string; orderId?: string; provider?: string; status: string; amount: Money; createdAt: string };
export type NotificationRecord = { id: string; title?: string; channel?: string; status: string; recipient?: string; createdAt?: string };
export type OnboardingFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'file';
export type OnboardingFieldDefinition = {
  key: string; label: string; phase: 'application' | 'setup'; type: OnboardingFieldType;
  required: boolean; enabled: boolean; helpText: string; placeholder: string;
  options: string[]; acceptedFileTypes: string[]; maxFileSizeMb: number; multiple: boolean; order?: number;
};
export type OnboardingFormConfig = { fields: OnboardingFieldDefinition[]; updatedAt: string | null };
