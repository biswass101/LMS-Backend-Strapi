// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
      const actions = [
        'api::course.course.getAdminStats',
        'api::progress.progress.getCourseProgress',
      ];

      for (const action of actions) {
        for (const role of roles) {
          if (role.type === 'authenticated' || role.type === 'admin' || role.type === 'student' || role.name === 'Admin' || role.name === 'Authenticated' || role.name === 'Student') {
            const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
              where: { action, role: role.id },
            });

            if (!existing) {
              await strapi.db.query('plugin::users-permissions.permission').create({
                data: {
                  action,
                  role: role.id,
                },
              });
              strapi.log.info(`Granted ${action} permission to role: ${role.name}`);
            }
          }
        }
      }
    } catch (err) {
      strapi.log.error('Error auto-assigning permissions in bootstrap:', err);
    }
  },
};
