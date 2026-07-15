import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError } from '#core/errors/app-error.js';
import { getStorage } from '#platform/storage/index.js';
import { notificationService } from '#platform/notification/index.js';
import { userService } from '#modules/identity/index.js';

import {
  APPLICATION_STATUS,
  ORG_ERRORS,
  STORAGE_FOLDERS,
} from '../constants/organization.constants.js';
import { toApplicationDTO, toBranchDTO, toOrganizationDTO, toRestaurantDTO } from '../dto/organization.dto.js';
import {
  BranchCreatedEvent,
  InformationRequestedEvent,
  OrganizationApprovedEvent,
  OrganizationRegisteredEvent,
  OrganizationRejectedEvent,
  RestaurantCreatedEvent,
} from '../events/organization.events.js';
import { onboardingApplicationRepository } from '../repositories/onboarding-application.repository.js';
import { entityId } from '../utils/id.util.js';

import { provisioningService } from './provisioning.service.js';

/**
 * Onboarding workflow: public restaurant registration + the Platform Super
 * Admin review/approval lifecycle. Restaurant accounts cannot log in until an
 * application is approved (the owner IAM user is only created on approval).
 */
export class OnboardingService extends BaseService {
  constructor({
    applications = onboardingApplicationRepository,
    provisioning = provisioningService,
    users = userService,
    storage,
    notifications = notificationService,
    eventBus,
  } = {}) {
    super({ name: 'org.onboarding', eventBus });
    this.applications = applications;
    this.provisioning = provisioning;
    this.users = users;
    this.storage = storage ?? null;
    this.notifications = notifications;
  }

  #storage() {
    return this.storage ?? getStorage();
  }

  async #getOrThrow(id) {
    const app = await this.applications.findById(id);
    if (!app) throw new NotFoundError(ORG_ERRORS.APPLICATION_NOT_FOUND);
    return app;
  }

  async #uploadFiles(files = {}) {
    const storage = this.#storage();
    const result = { logo: null, documents: [] };

    if (files.logo) {
      const up = await storage.upload({
        buffer: files.logo.buffer,
        filename: files.logo.originalname ?? 'logo',
        mimeType: files.logo.mimetype,
        folder: STORAGE_FOLDERS.LOGOS,
      });
      result.logo = { key: up.key, url: up.url };
    }
    for (const doc of files.documents ?? []) {
      const up = await storage.upload({
        buffer: doc.buffer,
        filename: doc.originalname ?? 'document',
        mimeType: doc.mimetype,
        folder: STORAGE_FOLDERS.DOCUMENTS,
      });
      result.documents.push({
        type: doc.docType ?? 'other',
        key: up.key,
        url: up.url,
        name: doc.originalname ?? '',
        mimeType: doc.mimetype ?? null,
      });
    }
    return result;
  }

  // --- public ---

  async registerRestaurant(payload, files = {}) {
    const email = payload.email.toLowerCase();
    const existing = await this.applications.findByEmail(email);
    if (existing && existing.status !== APPLICATION_STATUS.REJECTED) {
      throw new ConflictError(ORG_ERRORS.EMAIL_TAKEN);
    }

    const uploaded = await this.#uploadFiles(files);

    const app = await this.applications.create({
      restaurantName: payload.restaurantName,
      brandName: payload.brandName ?? '',
      ownerName: payload.ownerName,
      email,
      phone: payload.phone,
      gstNumber: payload.gstNumber ?? '',
      fssaiLicense: payload.fssaiLicense ?? '',
      businessRegistration: payload.businessRegistration ?? '',
      address: payload.address ?? {},
      restaurantType: payload.restaurantType,
      cuisines: payload.cuisines ?? [],
      numberOfBranches: payload.numberOfBranches ?? 1,
      logo: uploaded.logo ?? { key: null, url: null },
      documents: uploaded.documents,
      status: APPLICATION_STATUS.PENDING,
      submittedAt: new Date(),
    });

    await this.events.publish(
      new OrganizationRegisteredEvent({ applicationId: entityId(app), email, restaurantName: app.restaurantName }),
    );
    this.audit.success('organization.application.received', {
      targetId: entityId(app),
      metadata: { email, restaurantName: app.restaurantName },
    });
    await this.#notify('email', email, 'registration_received', { restaurantName: app.restaurantName });

    return toApplicationDTO(app);
  }

  // --- admin review ---

  async listApplications(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    const page = await this.applications.paginate({
      filter,
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status'],
    });
    return this.paginated(page, toApplicationDTO);
  }

  async getApplication(id) {
    return toApplicationDTO(await this.#getOrThrow(id));
  }

  async approve(id, body = {}, actorId = null) {
    const app = await this.#getOrThrow(id);
    if (app.status === APPLICATION_STATUS.APPROVED) {
      throw new ConflictError(ORG_ERRORS.ALREADY_PROCESSED);
    }

    const provisioned = await this.provisioning.provisionFromApplication(
      app,
      { organizationName: body.organizationName, restaurantName: body.restaurantName },
      actorId,
    );
    const { organization, restaurant, branch, owner, createdUser } = provisioned;
    const organizationId = entityId(organization);

    await this.events.publishMany([
      new OrganizationApprovedEvent({ applicationId: id, organizationId, ownerUserId: owner.id }),
      new RestaurantCreatedEvent({ organizationId, restaurantId: entityId(restaurant) }),
      new BranchCreatedEvent({ organizationId, restaurantId: entityId(restaurant), branchId: entityId(branch) }),
    ]);
    this.audit.success('organization.application.approved', {
      actorId,
      targetId: id,
      metadata: { organizationId, ownerUserId: owner.id },
    });

    // Notifications: approved + welcome; send a set-password link for new users.
    await this.#notify('email', app.email, 'application_approved', { organizationId });
    await this.#notify('email', app.email, 'welcome', { organizationName: organization.name });
    if (createdUser) {
      await this.users.requestPasswordReset(app.email).catch(() => {});
    }

    const updatedApp = await this.applications.findById(id);
    return {
      application: toApplicationDTO(updatedApp),
      organization: toOrganizationDTO(organization),
      restaurant: toRestaurantDTO(restaurant),
      branch: toBranchDTO(branch),
      owner: { id: owner.id, email: owner.email },
    };
  }

  async reject(id, { reason }, actorId = null) {
    const app = await this.#getOrThrow(id);
    if (app.status === APPLICATION_STATUS.APPROVED) {
      throw new ConflictError(ORG_ERRORS.ALREADY_PROCESSED);
    }
    const updated = await this.applications.updateById(id, {
      status: APPLICATION_STATUS.REJECTED,
      rejectionReason: reason,
      reviewedBy: actorId,
      reviewedAt: new Date(),
    });
    await this.events.publish(new OrganizationRejectedEvent({ applicationId: id, reason }));
    this.audit.success('organization.application.rejected', { actorId, targetId: id, metadata: { reason } });
    await this.#notify('email', app.email, 'application_rejected', { reason });
    return toApplicationDTO(updated);
  }

  async requestInformation(id, { requestedInformation, message }, actorId = null) {
    const app = await this.#getOrThrow(id);
    const updated = await this.applications.updateById(id, {
      status: APPLICATION_STATUS.UNDER_REVIEW,
      requestedInformation,
      reviewNotes: message ?? app.reviewNotes,
    });
    await this.events.publish(
      new InformationRequestedEvent({ applicationId: id, requestedInformation }),
    );
    this.audit.success('organization.application.information_requested', {
      actorId,
      targetId: id,
      metadata: { requestedInformation },
    });
    await this.#notify('email', app.email, 'documents_requested', { requestedInformation, message });
    return toApplicationDTO(updated);
  }

  /** Best-effort notification (platform has no provider bound yet → logs). */
  async #notify(channel, to, templateId, data) {
    try {
      await this.notifications.send(channel, { to, templateId, data });
    } catch (err) {
      this.logger.warn({ err, templateId }, 'Notification dispatch failed (continuing)');
    }
  }
}

export const onboardingService = new OnboardingService();
export default onboardingService;
