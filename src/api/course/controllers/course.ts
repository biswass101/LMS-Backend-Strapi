import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
    async getAdminStats(ctx) {
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

        if (roleNormalized !== 'admin') {
            return ctx.forbidden('Only admins can view platform stats');
        }

        const courses = await strapi.documents('api::course.course').findMany({});
        const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({});

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

    async find(ctx) {
        const user = ctx.state.user;
        if (!user) return await super.find(ctx);

        let userRole = user.role?.name || user.role?.type;
        if (!userRole) {
            const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user.id },
                populate: ['role'],
            });
            userRole = fullUser?.role?.name || fullUser?.role?.type;
        }

        const roleNormalized = (userRole || '').toLowerCase().replace(/[\s_-]/g, '');

        if (roleNormalized === 'instructor') {
            const courses = await strapi.documents('api::course.course').findMany({
                status: 'draft',
                filters: {
                    instructor: { id: user.id },
                },
                populate: {
                    instructor: true,
                    lessons: true,
                },
            });
            return ctx.send({
                data: courses,
                meta: {
                    pagination: {
                        page: 1,
                        pageSize: courses.length,
                        pageCount: 1,
                        total: courses.length,
                    },
                },
            });
        }

        return await super.find(ctx);
    },

    async findOne(ctx) {
        const user = ctx.state.user;
        const courseId = ctx.params.id;

        // For authenticated users (instructors/admins managing courses),
        // look up the course directly via document service to include drafts
        if (user) {
            const course = await strapi.documents('api::course.course').findOne({
                documentId: courseId,
                populate: ['instructor', 'lessons', 'enrollments', 'quizzes'],
            });

            if (!course) {
                return ctx.notFound('Course not found');
            }

            return ctx.send({ data: course });
        }

        return await super.findOne(ctx);
    },

    async create(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized('You must be logged in');

        let userDocId = user.documentId;
        if (!userDocId) {
            const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user.id },
            });
            userDocId = fullUser?.documentId || user.id;
        }

        const data = ctx.request.body.data || {};
        const draft = await strapi.documents('api::course.course').create({
            data: {
                ...data,
                instructor: userDocId,
            },
        });

        await strapi.documents('api::course.course').publish({
            documentId: draft.documentId,
        });

        const course = await strapi.documents('api::course.course').findOne({
            documentId: draft.documentId,
            populate: ['instructor', 'lessons'],
        });

        return ctx.send({ data: course });
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

        // Admin and Content Manager can update any course
        if (roleNormalized === 'admin' || roleNormalized === 'contentmanager') {
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