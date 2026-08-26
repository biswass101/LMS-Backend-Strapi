import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
    async getAdminStats(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized('You must be logged in');

        const userRole = user.role?.name || user.role?.type;
        if (userRole !== 'Admin') {
            return ctx.forbidden('Only admins can view platform stats');
        }

        const courses = await strapi.documents('api::course.course').findMany({});
        const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({});

        // Get users by role
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
            populate: ['role'],
        });

        const roleCounts: Record<string, number> = {};
        for (const u of users) {
            const roleName = u.role?.name || 'Unknown';
            roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
        }

        return ctx.send({
            totalCourses: courses.length,
            totalEnrollments: enrollments.length,
            totalUsers: users.length,
            usersByRole: roleCounts,
        });
    },
    async create(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized('You must be logged in');

        // Automatically set the instructor to the logged-in user
        ctx.request.body.data = {
            ...ctx.request.body.data,
            instructor: user.id,
        };

        const response = await super.create(ctx);
        return response;
    },

    async update(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized('You must be logged in');

        const userRole = user.role?.name || user.role?.type;

        // Admin and Content Manager can update any course
        if (userRole === 'Admin' || userRole === 'Content Manager') {
            return await super.update(ctx);
        }

        // Instructor can only update their own courses
        const courseId = ctx.params.id;
        const course = await strapi.documents('api::course.course').findOne({
            documentId: courseId,
            populate: ['instructor'],
        });

        if (!course || course.instructor?.id !== user.id) {
            return ctx.forbidden('You can only update your own courses');
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

        const courseId = ctx.params.id;
        const course = await strapi.documents('api::course.course').findOne({
            documentId: courseId,
            populate: ['instructor'],
        });

        if (!course || course.instructor?.id !== user.id) {
            return ctx.forbidden('You can only delete your own courses');
        }

        return await super.delete(ctx);
    },
}));