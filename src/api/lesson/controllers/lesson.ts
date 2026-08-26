/**
 * lesson controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;

    // Admin and Content Manager can create lessons for any course
    if (userRole === 'Admin' || userRole === 'Content Manager') {
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

    const userRole = user.role?.name || user.role?.type;

    if (userRole === 'Admin' || userRole === 'Content Manager') {
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

    const userRole = user.role?.name || user.role?.type;

    if (userRole === 'Admin' || userRole === 'Content Manager') {
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

