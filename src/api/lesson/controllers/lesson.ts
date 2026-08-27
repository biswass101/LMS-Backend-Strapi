import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return await super.find(ctx);

    let userRole = user.role?.name || user.role?.type;
    if (!userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

    if (roleNormalized === 'instructor') {
      const queryFilters = (ctx.query.filters as any) || {};
      const courseDocId = queryFilters.course?.documentId?.$eq || queryFilters.course?.documentId || (typeof queryFilters.course === 'string' ? queryFilters.course : undefined);

      const filters: any = {
        course: { instructor: { id: user.id } },
      };

      if (courseDocId) {
        filters.course = {
          ...filters.course,
          documentId: courseDocId,
        };
      }

      const lessons = await strapi.documents('api::lesson.lesson').findMany({
        filters,
        populate: { course: true },
      });

      return ctx.send({
        data: lessons,
        meta: {
          pagination: {
            page: 1,
            pageSize: lessons.length,
            pageCount: 1,
            total: lessons.length,
          },
        },
      });
    }

    return await super.find(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    let userRole = user.role?.name || user.role?.type;
    if (!userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

    // Admin and Content Manager can create lessons for any course
    if (roleNormalized === 'admin' || roleNormalized === 'contentmanager') {
      return await super.create(ctx);
    }

    // Instructor: verify they own the course
    const courseId = ctx.request.body.data?.course;
    if (courseId) {
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseId,
        populate: ['instructor'],
      });

      if (!course || course.instructor?.id !== user.id) {
        return ctx.forbidden('You can only add lessons to your own courses');
      }
    }

    return await super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    let userRole = user.role?.name || user.role?.type;
    if (!userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

    if (roleNormalized === 'admin' || roleNormalized === 'contentmanager') {
      return await super.update(ctx);
    }

    // Get the lesson and check its course's instructor
    const lessonId = ctx.params.id;
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonId,
      populate: { course: { populate: ['instructor'] } },
    });

    if (!lesson || lesson.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only edit lessons in your own courses');
    }

    return await super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    let userRole = user.role?.name || user.role?.type;
    if (!userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

    if (roleNormalized === 'admin' || roleNormalized === 'contentmanager') {
      return await super.delete(ctx);
    }

    const lessonId = ctx.params.id;
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonId,
      populate: { course: { populate: ['instructor'] } },
    });

    if (!lesson || lesson.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only delete lessons in your own courses');
    }

    return await super.delete(ctx);
  },
}));
