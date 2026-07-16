import { api } from '@/platform/api';
import type { StaffContext } from '../types';

/**
 * CONTEXT SERVICE — resolves the staff member's operational context (restaurant,
 * branch, socket rooms). Everything staff-scoped derives from this; the backend
 * enforces tenancy, so the frontend only reads what it's allowed to see.
 */
class ContextService {
  current() {
    return api.get<StaffContext>('/restaurant/context');
  }
}

export const contextService = new ContextService();
