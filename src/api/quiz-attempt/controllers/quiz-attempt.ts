import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;
    if (userRole !== 'Student') {
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
    // answers format: [{ questionId: "abc123", selected: "A" }, ...]
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

    // Save the attempt
    ctx.request.body.data = {
      student: user.id,
      quiz: quizId,
      score,
      totalQuestions,
      answers,
      submittedAt: new Date().toISOString(),
    };

    const response = await super.create(ctx);
    return response;
  },

  // Students see only their own attempts
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