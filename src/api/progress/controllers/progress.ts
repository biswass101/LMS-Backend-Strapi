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

    let userRole = user.role?.name || user.role?.type;
    if (!userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

    if (roleNormalized !== 'student') {
      return ctx.forbidden('Only students can track progress');
    }

    const lessonId = ctx.request.body.data?.lesson;
    const courseId = ctx.request.body.data?.course;

    const existing = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: user.id },
        lesson: { documentId: lessonId },
      },
    });

    if (existing && existing.length > 0) {
      return ctx.badRequest('You have already marked this lesson');
    }

    const newProgress = await strapi.documents('api::progress.progress').create({
      data: {
        student: user.id,
        lesson: lessonId,
        course: courseId,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      populate: {
        lesson: true,
        course: true,
        student: {
          fields: ['id', 'username', 'email'],
        },
      },
    });

    return ctx.send({ data: newProgress });
  },

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

    const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');
    const filters: any = {};

    if (roleNormalized === 'student') {
      filters.student = { id: user.id };
    } else if (roleNormalized === 'instructor') {
      // Instructors can see the progress of students enrolled in their own courses
      filters.course = { instructor: { id: user.id } };
    }

    const progresses = await strapi.documents('api::progress.progress').findMany({
      filters,
      populate: {
        lesson: true,
        course: true,
        student: {
          fields: ['id', 'username', 'email'],
        },
      },
    });

    return ctx.send({
      data: progresses,
      meta: {
        pagination: {
          page: 1,
          pageSize: progresses.length,
          pageCount: 1,
          total: progresses.length,
        },
      },
    });
  },
}));