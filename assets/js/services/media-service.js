export function createMediaService(client) {
  return {
    getPublicUrl(path) {
      return client.storage.from('jeni-informa').getPublicUrl(path).data.publicUrl;
    }
  };
}
window.JeniMediaService = { createMediaService };
