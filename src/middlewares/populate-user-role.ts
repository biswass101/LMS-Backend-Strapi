import type { Core } from '@strapi/strapi';

const populateUserRole = (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    // Populate user in ctx.state for route guards/controllers
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

    // Ensure role is exposed in API response body (for /api/users/me and /api/auth/local)
    if (ctx.body) {
      // Case 1: /api/users/me returns user object directly
      if (ctx.body.id && ctx.body.username && !ctx.body.role) {
        const targetId = ctx.body.id;
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: targetId },
          populate: ['role'],
        });
        if (fullUser && fullUser.role) {
          ctx.body.role = {
            id: fullUser.role.id,
            name: fullUser.role.name,
            type: fullUser.role.type,
            description: fullUser.role.description,
          };
        }
      }

      // Case 2: /api/auth/local returns { jwt, user }
      if (ctx.body.user && ctx.body.user.id && !ctx.body.user.role) {
        const targetId = ctx.body.user.id;
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: targetId },
          populate: ['role'],
        });
        if (fullUser && fullUser.role) {
          ctx.body.user.role = {
            id: fullUser.role.id,
            name: fullUser.role.name,
            type: fullUser.role.type,
            description: fullUser.role.description,
          };
        }
      }
    }
  };
};

export default populateUserRole;