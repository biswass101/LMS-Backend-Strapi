import type { Core } from '@strapi/strapi';

const populateUserRole = (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.state.user) {
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: ctx.state.user.id },
        populate: ['role'],
      });
      if (user) {
        ctx.state.user.role = user.role;
      }
    }
    await next();
  };
};

export default populateUserRole;