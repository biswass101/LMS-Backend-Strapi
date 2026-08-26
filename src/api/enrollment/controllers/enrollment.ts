import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;
    if (userRole !== 'Student') {
      return ctx.forbidden('Only students can enroll in courses');
    }

    const courseId = ctx.request.body.data?.course;

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

    // Set student automatically
    ctx.request.body.data = {
      ...ctx.request.body.data,
      student: user.id,
      enrolledAt: new Date().toISOString(),
    };

    return await super.create(ctx);
  },

  // Students can only see their own enrollments
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;

    if (userRole === 'Student') {
      ctx.query = {
        ...ctx.query,
        filters: {
          ...((ctx.query.filters as object) || {}),
          student: { id: user.id },
        },
      };
    }

    return await super.find(ctx);
  },
}));