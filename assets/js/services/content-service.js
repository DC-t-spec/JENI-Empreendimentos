export function createContentService(client) {
  return {
    listContentItems: async () => client
      .from('content_items')
      .select('*')
      .order('updated_at', { ascending: false }),

    createContentItem: async (payload) => client
      .from('content_items')
      .insert([payload])
      .select()
      .single(),

    updateContentItem: async (id, payload) => client
      .from('content_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single(),

    listPublishedContent: async (limit = 40) => client
      .from('content_items')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
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
