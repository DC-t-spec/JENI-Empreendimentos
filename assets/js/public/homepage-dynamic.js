export function markDynamicSectionLoading(sectionId, isLoading = true) {
  const el = document.querySelector(`[data-home-section=\"${sectionId}\"]`);
  if (!el) return;
  el.dataset.loading = isLoading ? 'true' : 'false';
}

export function normalizeHomepageItems(items = []) {
  return items.filter(Boolean).sort((a, b) => (a.position || 999) - (b.position || 999));
}
