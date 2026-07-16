import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { PublicController } from '../controllers/public.controller.js';
import { registrationUpload } from '../middleware/upload.middleware.js';
import { registerRestaurantSchema } from '../validators/onboarding.validators.js';

const router = Router();

router.get('/onboarding-form', PublicController.getOnboardingForm);

/**
 * @openapi
 * /api/v1/public/register-restaurant:
 *   post:
 *     tags: [Onboarding/Public]
 *     summary: Submit a public restaurant registration (multipart form-data)
 *     description: >
 *       Collects business details plus an optional logo and documents. Does NOT
 *       activate the restaurant — it creates a PENDING application for admin review.
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [restaurantName, ownerName, email, phone, city, state, pincode]
 *             properties:
 *               restaurantName: { type: string }
 *               brandName: { type: string }
 *               ownerName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               gstNumber: { type: string }
 *               fssaiLicense: { type: string }
 *               businessRegistration: { type: string }
 *               line1: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               pincode: { type: string }
 *               restaurantType: { type: string }
 *               cuisines: { type: string, description: "comma-separated" }
 *               numberOfBranches: { type: integer }
 *               logo: { type: string, format: binary }
 *               documents: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: Application received (PENDING) }
 *       409: { description: An application already exists for this email }
 */
router.post(
  '/register-restaurant',
  registrationUpload,
  validate({ body: registerRestaurantSchema }),
  PublicController.registerRestaurant,
);

export default router;
