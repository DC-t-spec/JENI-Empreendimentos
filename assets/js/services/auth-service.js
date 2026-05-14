export function createAuthService(client) {
  return {
    getCurrentUser: async () => (await client.auth.getUser()).data.user,
    signUp: async (payload) => client.auth.signUp(payload),
    signInWithPassword: async (payload) => client.auth.signInWithPassword(payload),
    signOut: async () => client.auth.signOut()
  };
}
window.JeniAuthService = { createAuthService };
