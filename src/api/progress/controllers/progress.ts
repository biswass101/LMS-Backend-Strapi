import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async getCourseProgress(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const { courseId } = ctx.params;

    // Get total lessons in this course
    const lessons = await strapi.documents('api::lesson.lesson').findMany({
      filters: { course: { documentId: courseId } },
    });

    const totalLessons = lessons.length;

    if (totalLessons === 0) {
      return ctx.send({ progress: 0, completedLessons: 0, totalLessons: 0 });
    }

    // Get completed lessons for this student in this course
    const completedProgress = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: user.id },
        course: { documentId: courseId },
        completed: true,
      },
    });

    const completedLessons = completedProgress.length;
    const progress = Math.round((completedLessons / totalLessons) * 100);

    return ctx.send({ progress, completedLessons, totalLessons });
  },

  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;
    if (userRole !== 'Student') {
      return ctx.forbidden('Only students can track progress');
    }

    const lessonId = ctx.request.body.data?.lesson;

    const existing = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: user.id },
        lesson: { documentId: lessonId },
      },
    });

    if (existing && existing.length > 0) {
      return ctx.badRequest('You have already marked this lesson');
    }

    ctx.request.body.data = {
      ...ctx.request.body.data,
      student: user.id,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    return await super.create(ctx);
  },

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