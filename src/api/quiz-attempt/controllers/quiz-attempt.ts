import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
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
      return ctx.forbidden('Only students can take quizzes');
    }

    const { quiz: quizId, answers } = ctx.request.body.data || {};

    if (!quizId || !answers) {
      return ctx.badRequest('Quiz ID and answers are required');
    }

    // Fetch the quiz with its questions
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizId,
      populate: ['questions'],
    });

    if (!quiz) {
      return ctx.notFound('Quiz not found');
    }

    // Auto-grade: compare student answers with correct answers
    let score = 0;
    const totalQuestions = quiz.questions?.length || 0;

    for (const answer of answers) {
      const question = quiz.questions?.find(
        (q: any) => q.documentId === answer.questionId
      );
      if (question && question.correctAnswer === answer.selected) {
        score++;
      }
    }

    // Save the attempt using Document Service API
    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        student: user.id,
        quiz: quizId,
        score,
        totalQuestions,
        answers,
        submittedAt: new Date().toISOString(),
      },
      populate: {
        quiz: {
          populate: ['course'],
        },
        student: true,
      },
    });

    return ctx.send({ data: attempt });
  },

  // Students see only their own attempts
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
      const queryFilters = (ctx.query.filters as any) || {};
      const quizDocumentId = queryFilters.quiz?.documentId?.$eq || queryFilters.quiz?.documentId || (typeof queryFilters.quiz === 'string' ? queryFilters.quiz : undefined);

      const filters: any = {
        student: { id: user.id },
      };

      if (quizDocumentId) {
        filters.quiz = { documentId: quizDocumentId };
      }

      const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
        filters,
        populate: {
          quiz: {
            populate: ['course'],
          },
          student: true,
        },
      });

      return ctx.send({
        data: attempts,
        meta: {
          pagination: {
            page: 1,
            pageSize: attempts.length,
            pageCount: 1,
            total: attempts.length,
          },
        },
      });
    }

    return await super.find(ctx);
  },
}));