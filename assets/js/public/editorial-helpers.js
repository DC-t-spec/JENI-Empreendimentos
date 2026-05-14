export function buildSeoMeta({ title, description }) {
  return {
    title: title || 'JENI Informa',
    description: description || 'Conteúdo editorial JENI Informa'
  };
}

export function buildRelatedContent(items = [], currentId) {
  return items.filter((item) => item.id !== currentId).slice(0, 3);
}
