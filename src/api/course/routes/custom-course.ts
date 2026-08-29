export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/stats',
      handler: 'course.getAdminStats',
      config: {
        policies: [],
        middlewares: ['global::populate-user-role'],
      },
    },
    {
      method: 'GET',
      path: '/instructors',
      handler: 'course.getInstructors',
      config: {
        policies: [],
        middlewares: ['global::populate-user-role'],
      },
    },
  ],
};