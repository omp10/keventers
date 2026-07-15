import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError } from '#core/errors/app-error.js';

import { IDENTITY_ERRORS, STAFF_STATUS, USER_TYPE } from '../constants/identity.constants.js';
import { toStaffDTO, toUserDTO } from '../dto/identity.dto.js';
import { StaffCreatedEvent } from '../events/identity.events.js';
import { staffRepository } from '../repositories/staff.repository.js';
import { userRepository } from '../repositories/user.repository.js';

import { userService } from './user.service.js';

/**
 * Staff business logic. A staff member is a User (type=staff) plus a Staff
 * record. Creation reuses UserService (so user rules/events fire once) and
 * compensates by soft-deleting the user if the staff record fails — safe on
 * standalone MongoDB where multi-doc transactions aren't available.
 */
export class StaffService extends BaseService {
  constructor({ staff = staffRepository, users = userRepository, userSvc = userService, eventBus } = {}) {
    super({ name: 'identity.staff', eventBus });
    this.staff = staff;
    this.users = users;
    this.userService = userSvc;
  }

  async createStaff(data, actorId = null) {
    if (await this.staff.existsByEmployeeId(data.employeeId)) {
      throw new ConflictError(IDENTITY_ERRORS.EMPLOYEE_ID_TAKEN);
    }

    const user = await this.userService.createUser(
      {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        type: USER_TYPE.STAFF,
        roles: data.roles ?? [],
      },
      actorId,
    );

    let staff;
    try {
      staff = await this.staff.create({
        userId: user.id,
        employeeId: data.employeeId,
        designation: data.designation ?? '',
        department: data.department ?? '',
        reportsTo: data.reportsTo ?? null,
        joinedAt: data.joinedAt ?? new Date(),
        status: STAFF_STATUS.ACTIVE,
      });
    } catch (err) {
      // Compensation: undo the user we just created.
      await this.users.softDeleteById(user.id).catch(() => {});
      throw err;
    }

    await this.events.publish(new StaffCreatedEvent({ staffId: staff.id, userId: user.id }));
    this.audit.success('identity.staff.created', {
      actorId,
      targetId: staff.id,
      metadata: { employeeId: staff.employeeId, userId: user.id },
    });
    return { staff: toStaffDTO(staff), user: toUserDTO(user) };
  }

  async getStaff(id) {
    const staff = await this.staff.findById(id);
    if (!staff) throw new NotFoundError(IDENTITY_ERRORS.STAFF_NOT_FOUND);
    return toStaffDTO(staff);
  }

  async listStaff(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.department) filter.department = query.department;
    const page = await this.staff.paginate({
      filter,
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'department'],
    });
    return this.paginated(page, toStaffDTO);
  }

  async updateStaff(id, data, actorId = null) {
    const staff = await this.staff.findById(id);
    if (!staff) throw new NotFoundError(IDENTITY_ERRORS.STAFF_NOT_FOUND);
    const updated = await this.staff.updateById(id, data);
    this.audit.success('identity.staff.updated', { actorId, targetId: id });
    return toStaffDTO(updated);
  }
}

export const staffService = new StaffService();
export default staffService;
