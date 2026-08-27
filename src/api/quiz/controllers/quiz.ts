import { factories } from '@strapi/strapi';

function sanitizeQuiz(quiz: any, isStudent: boolean) {
  if (!quiz) return quiz;
  if (isStudent && Array.isArray(quiz.questions)) {
    quiz.questions = quiz.questions.map((q: any) => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });
  }
  return quiz;
}

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async findOne(ctx) {
    const response = await super.findOne(ctx);
    const user = ctx.state.user;

    let userRole = user?.role?.name || user?.role?.type;
    if (user && !userRole) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });
      userRole = fullUser?.role?.name || fullUser?.role?.type;
    }

    const isStudent = !userRole || userRole.toLowerCase() === 'student';

    if (response?.data) {
      sanitizeQuiz(response.data, isStudent);
    }

    return response;
  },

  async find(ctx) {
    const user = ctx.state.user;
    let userRole = user?.role?.name || user?.role?.type;
    if (user && !userRole) {
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

      const quizzes = await strapi.documents('api::quiz.quiz').findMany({
        filters,
        populate: {
          questions: true,
          course: true,
        },
      });

      return ctx.send({
        data: quizzes,
        meta: {
          pagination: {
            page: 1,
            pageSize: quizzes.length,
            pageCount: 1,
            total: quizzes.length,
          },
        },
      });
    }

    const response = await super.find(ctx);
    const isStudent = !userRole || roleNormalized === 'student';

    if (Array.isArray(response?.data)) {
      response.data.forEach((quiz: any) => sanitizeQuiz(quiz, isStudent));
    }

    return response;
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

    if (roleNormalized === 'admin' || roleNormalized === 'contentmanager') {
      return await super.create(ctx);
    }

    const courseId = ctx.request.body.data?.course;
    if (courseId) {
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseId,
        populate: ['instructor'],
      });

      if (!course || course.instructor?.id !== user.id) {
        return ctx.forbidden('You can only create quizzes for your own courses');
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

    const quizId = ctx.params.id;
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizId,
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz || quiz.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only edit quizzes for your own courses');
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

    const quizId = ctx.params.id;
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizId,
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz || quiz.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only delete quizzes for your own courses');
    }

    return await super.delete(ctx);
  },
}));