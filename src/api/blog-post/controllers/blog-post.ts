import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;
    if (userRole !== 'Admin' && userRole !== 'Content Manager') {
      return ctx.forbidden('Only Admin and Content Manager can create blog posts');
    }

    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: user.id,
    };

    return await super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;

    // Admin can update any post
    if (userRole === 'Admin') {
      return await super.update(ctx);
    }

    // Content Manager can update their own posts
    if (userRole === 'Content Manager') {
      const postId = ctx.params.id;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: postId,
        populate: ['author'],
      });

      if (!post || post.author?.id !== user.id) {
        return ctx.forbidden('You can only edit your own blog posts');
      }

      return await super.update(ctx);
    }

    return ctx.forbidden('You do not have permission to update blog posts');
  },

  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in');

    const userRole = user.role?.name || user.role?.type;

    if (userRole === 'Admin') {
      return await super.delete(ctx);
    }

    if (userRole === 'Content Manager') {
      const postId = ctx.params.id;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: postId,
        populate: ['author'],
      });

      if (!post || post.author?.id !== user.id) {
        return ctx.forbidden('You can only delete your own blog posts');
      }

      return await super.delete(ctx);
    }

    return ctx.forbidden('You do not have permission to delete blog posts');
  },
}));