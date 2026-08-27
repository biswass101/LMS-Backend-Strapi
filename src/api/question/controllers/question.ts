import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
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

    const quizId = ctx.request.body.data?.quiz;
    if (quizId) {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: quizId,
        populate: { course: { populate: ['instructor'] } },
      });

      if (!quiz || quiz.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only add questions to quizzes in your own courses');
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

    const questionId = ctx.params.id;
    const question = await strapi.documents('api::question.question').findOne({
      documentId: questionId,
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!question || question.quiz?.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only edit questions in your own courses');
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

    const questionId = ctx.params.id;
    const question = await strapi.documents('api::question.question').findOne({
      documentId: questionId,
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!question || question.quiz?.course?.instructor?.id !== user.id) {
      return ctx.forbidden('You can only delete questions in your own courses');
    }

    return await super.delete(ctx);
  },
}));