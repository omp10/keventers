/**
 * SERVICE LAYER — reusable, typed API bindings. Pages call hooks; hooks call
 * these services; services call the API Platform. No business logic lives here.
 */
export { BaseService } from './base.service';
export { authService, type AuthTokens, type AuthUser, type AuthSession } from './auth.service';
export {
  restaurantService, menuService, orderService, paymentService,
  customerService, notificationService, analyticsService,
} from './domain.services';
