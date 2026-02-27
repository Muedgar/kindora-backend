import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';
import { User } from './entities';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { UserSerializer } from './serializers';
import { SCHOOL_NOT_FOUND_OR_NOT_MEMBER } from './messages';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(SchoolMember)
    private readonly schoolMemberRepository: Repository<SchoolMember>,
  ) {}

  /**
   * Returns the authenticated user's public identity.
   * Uses UserSerializer to strip sensitive fields (password, version, etc.).
   */
  async getMe(userId: string): Promise<UserSerializer> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });
    return plainToInstance(UserSerializer, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Returns all school memberships for the authenticated user, each with
   * the school details, member summary, assigned roles, and permission slugs.
   *
   * Permissions are deduplicated across all roles the member holds.
   */
  async getMySchools(userId: string) {
    const memberships = await this.schoolMemberRepository.find({
      where: { member: { id: userId } },
      relations: ['school', 'roles', 'roles.role', 'roles.role.permissions'],
    });

    const schools = memberships.map((membership) => {
      const permissions = [
        ...new Set(
          membership.roles
            .flatMap((smr) => smr.role.permissions)
            .map((p) => p.slug),
        ),
      ];

      return {
        school: {
          id: membership.school.id,
          name: membership.school.name,
          countries: membership.school.countries,
          phoneNumber: membership.school.phoneNumber,
          enrollmentCapacity: membership.school.enrollmentCapacity,
        },
        member: {
          status: membership.status,
          isDefault: membership.isDefault,
        },
        roles: membership.roles.map((smr) => ({
          id: smr.role.id,
          name: smr.role.name,
          slug: smr.role.slug,
        })),
        permissions,
      };
    });

    return { schools };
  }

  /**
   * Sets the given school as the user's default (last selected) school.
   * Clears `isDefault` on all other memberships atomically.
   *
   * @throws NotFoundException when the user has no membership in the school.
   */
  async selectSchool(userId: string, schoolId: string): Promise<void> {
    const memberships = await this.schoolMemberRepository.find({
      where: { member: { id: userId } },
      relations: ['school'],
    });

    const target = memberships.find((m) => m.school.id === schoolId);

    if (!target) {
      throw new NotFoundException(SCHOOL_NOT_FOUND_OR_NOT_MEMBER);
    }

    const toSave = memberships.map((m) => {
      m.isDefault = m.id === target.id;
      if (m.id === target.id) {
        m.lastSelectedAt = new Date();
      }
      return m;
    });

    await this.schoolMemberRepository.save(toSave);
  }
}
