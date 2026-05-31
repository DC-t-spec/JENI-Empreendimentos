export function createContentService(client) {
  return {
    listMySubmissions: async (userId) => client.from('submissions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    createSubmission: async (payload) => client.from('submissions').insert([payload]).select().single(),
    listAdminSubmissions: async () => client.from('submissions').select('*').order('status', { ascending: true }).order('created_at', { ascending: false }),
    updateSubmission: async (id, payload) => client.from('submissions').update(payload).eq('id', id).select().single(),

    listPublishedContent: async (limit = 40) => client
      .from('content_items')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit),

    getPublishedBySlug: async (slug) => client
      .from('content_items')
      .select('*')
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle(),

    getPublishedById: async (id) => client
      .from('content_items')
      .select('*')
      .eq('status', 'published')
      .eq('id', id)
      .maybeSingle(),

    listCategories: async (ids = []) => ids.length
      ? client.from('categories').select('id,name,slug').in('id', ids)
      : client.from('categories').select('id,name,slug'),

    listAuthors: async (ids = []) => ids.length
      ? client.from('profiles').select('id,display_name,full_name').in('id', ids)
      : client.from('profiles').select('id,display_name,full_name')
  };
}
window.JeniContentService = { createContentService };
