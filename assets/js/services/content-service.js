export function createContentService(client) {
  return {
    listMySubmissions: async (userId) => client.from('submissions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    createSubmission: async (payload) => client.from('submissions').insert([payload]).select().single(),
    listAdminSubmissions: async () => client.from('submissions').select('*').order('status', { ascending: true }).order('created_at', { ascending: false }),
    updateSubmission: async (id, payload) => client.from('submissions').update(payload).eq('id', id).select().single()
  };
}
window.JeniContentService = { createContentService };
