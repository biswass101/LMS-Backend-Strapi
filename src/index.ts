// import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: any }) {
    try {
      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();

      const normalizeRole = (role: any) =>
        (role.type || '').toLowerCase().replace(/[\s_-]/g, '');

      const isAdmin = (role: any) =>
        role.name === 'Admin' || normalizeRole(role) === 'admin';

      const isContentManager = (role: any) =>
        role.name === 'Content Manager' || normalizeRole(role) === 'contentmanager';

      const isInstructor = (role: any) =>
        role.name === 'Instructor' || normalizeRole(role) === 'instructor';

      const isStudent = (role: any) =>
        role.name === 'Student' ||
        normalizeRole(role) === 'student' ||
        normalizeRole(role) === 'authenticated';

      const permissionMap: { action: string; check: (role: any) => boolean }[] = [
        // Admin only
        { action: 'api::course.course.getAdminStats', check: isAdmin },

        // Admin + Content Manager
        { action: 'api::course.course.getInstructors', check: (r) => isAdmin(r) || isContentManager(r) },

        // All authenticated roles
        { action: 'api::progress.progress.getCourseProgress', check: (r) => isAdmin(r) || isContentManager(r) || isInstructor(r) || isStudent(r) },
      ];

      for (const { action, check } of permissionMap) {
        for (const role of roles) {
          if (!check(role)) continue;
          const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: role.id },
          });
          if (!existing) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: { action, role: role.id },
            });
            strapi.log.info(`Granted ${action} to role: ${role.name}`);
          }
        }
      }
    } catch (err) {
      strapi.log.error('Error auto-assigning permissions in bootstrap:', err);
    }
  },
};
