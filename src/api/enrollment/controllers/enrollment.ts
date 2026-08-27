import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
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

    if (userRole?.toLowerCase() !== 'student') {
      return ctx.forbidden('Only students can enroll in courses');
    }

    const courseId = ctx.request.body.data?.course;
    if (!courseId) {
      return ctx.badRequest('Course ID is required');
    }

    // Check if already enrolled
    const existing = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: {
        student: { id: user.id },
        course: { documentId: courseId },
      },
    });

    if (existing && existing.length > 0) {
      return ctx.badRequest('You are already enrolled in this course');
    }

    // Create enrollment using Strapi 5 Document Service API
    const enrollment = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        course: courseId,
        student: user.id,
        enrolledAt: new Date().toISOString(),
      },
      populate: {
        course: {
          populate: ['instructor'],
        },
        student: true,
      },
    });

    return ctx.send({ data: enrollment });
  },

  // Students can only see their own enrollments
  async find(ctx) {
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

    if (userRole?.toLowerCase() === 'student') {
      const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
        filters: {
          student: { id: user.id },
        },
        populate: {
          course: {
            populate: ['instructor', 'lessons'],
          },
          student: true,
        },
      });

      return ctx.send({
        data: enrollments,
        meta: {
          pagination: {
            page: 1,
            pageSize: enrollments.length,
            pageCount: 1,
            total: enrollments.length,
          },
        },
      });
    }

    return await super.find(ctx);
  },
}));