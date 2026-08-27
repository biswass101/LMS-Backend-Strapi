import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
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
    const isManager = roleNormalized === 'admin' || roleNormalized === 'contentmanager';

    const reqStatus = ctx.query.status;

    // Public blog page or non-draft query: ALWAYS return ONLY published posts for everyone
    if (reqStatus !== 'draft' || !isManager) {
      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        status: 'published',
        populate: { author: { fields: ['id', 'username', 'email'] } },
        sort: { createdAt: 'desc' },
      });
      return ctx.send({
        data: posts,
        meta: {
          pagination: {
            page: 1,
            pageSize: posts.length,
            pageCount: 1,
            total: posts.length,
          },
        },
      });
    }

    // Admin / Content Manager request ONLY on /dashboard/manage-blog (which passes status=draft):
    const draftPosts = await strapi.documents('api::blog-post.blog-post').findMany({
      status: 'draft',
      populate: { author: { fields: ['id', 'username', 'email'] } },
      sort: { createdAt: 'desc' },
    });

    const publishedPosts = await strapi.documents('api::blog-post.blog-post').findMany({
      status: 'published',
      populate: { author: { fields: ['id', 'username', 'email'] } },
    });

    const publishedMap = new Map<string, any>();
    for (const p of publishedPosts) {
      publishedMap.set(p.documentId, p);
    }

    const mergedPosts = draftPosts.map((draft) => {
      const pub = publishedMap.get(draft.documentId);
      return {
        ...draft,
        publishedAt: pub ? pub.publishedAt : null,
      };
    });

    return ctx.send({
      data: mergedPosts,
      meta: {
        pagination: {
          page: 1,
          pageSize: mergedPosts.length,
          pageCount: 1,
          total: mergedPosts.length,
        },
      },
    });
  },

  async findOne(ctx) {
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
    const isManager = roleNormalized === 'admin' || roleNormalized === 'contentmanager';

    const postId = ctx.params.id;
    
    const post = await strapi.documents('api::blog-post.blog-post').findOne({
      documentId: postId,
      status: isManager ? undefined : 'published',
      populate: { author: { fields: ['id', 'username', 'email'] } },
    });

    if (!post) {
      return ctx.notFound('Blog post not found');
    }

    return ctx.send({ data: post });
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

    if (roleNormalized !== 'admin' && roleNormalized !== 'contentmanager') {
      return ctx.forbidden('Only Admin and Content Manager can create blog posts');
    }

    let userDocId = user.documentId;
    if (!userDocId) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
      });
      userDocId = fullUser?.documentId || user.id;
    }

    const data = ctx.request.body.data || {};
    const post = await strapi.documents('api::blog-post.blog-post').create({
      data: {
        ...data,
        author: userDocId,
      },
      populate: ['author'],
    });

    return ctx.send({ data: post });
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

    if (roleNormalized !== 'admin' && roleNormalized !== 'contentmanager') {
      return ctx.forbidden('You do not have permission to update blog posts');
    }

    const postId = ctx.params.id;
    const bodyData = ctx.request.body?.data || {};

    if (bodyData.publishedAt === null) {
      const unpublished = await strapi.documents('api::blog-post.blog-post').unpublish({
        documentId: postId,
      });
      return ctx.send({ data: unpublished });
    } else if (bodyData.publishedAt) {
      const published = await strapi.documents('api::blog-post.blog-post').publish({
        documentId: postId,
      });
      return ctx.send({ data: published });
    }

    const updated = await strapi.documents('api::blog-post.blog-post').update({
      documentId: postId,
      data: bodyData,
      populate: ['author'],
    });

    return ctx.send({ data: updated });
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

    if (roleNormalized !== 'admin' && roleNormalized !== 'contentmanager') {
      return ctx.forbidden('You do not have permission to delete blog posts');
    }

    const postId = ctx.params.id;
    await strapi.documents('api::blog-post.blog-post').delete({
      documentId: postId,
    });

    return ctx.send({ message: 'Blog post deleted successfully' });
  },
}));