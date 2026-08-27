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
    const response = await super.find(ctx);
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

    if (Array.isArray(response?.data)) {
      response.data.forEach((quiz: any) => sanitizeQuiz(quiz, isStudent));
    }

    return response;
  },
}));