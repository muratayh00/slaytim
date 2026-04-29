const TR_CHAR_MAP: Record<string, string> = {
  '\u015F': 's',
  '\u015E': 's',
  '\u00E7': 'c',
  '\u00C7': 'c',
  '\u011F': 'g',
  '\u011E': 'g',
  '\u00FC': 'u',
  '\u00DC': 'u',
  '\u00F6': 'o',
  '\u00D6': 'o',
  '\u0131': 'i',
  '\u0130': 'i',
};

function normalizeTr(text: string): string {
  return (text || '')
    .split('')
    .map((char) => TR_CHAR_MAP[char] ?? char)
    .join('');
}

export function slugifyTr(text: string): string {
  return normalizeTr(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function splitIdSlug(value: string): { id: number | null; slug: string } {
  const input = (value || '').trim();
  if (!input) return { id: null, slug: '' };

  const match = input.match(/^(\d+)(?:-(.*))?$/);
  if (!match) return { id: null, slug: input.toLowerCase() };

  return {
    id: Number(match[1]),
    slug: (match[2] || '').trim().toLowerCase(),
  };
}

function toCanonicalIdSlug(id: number, slugLike: string): string {
  const slug = slugifyTr(slugLike || '') || String(id);
  return `${id}-${slug}`;
}

export function buildSlidePath(slide: { id: number; slug?: string | null; title?: string | null }): string {
  return `/slides/${toCanonicalIdSlug(slide.id, slide.slug || slide.title || String(slide.id))}`;
}

export function buildTopicPath(topic: { id: number; slug?: string | null; title?: string | null }): string {
  return `/konu/${toCanonicalIdSlug(topic.id, topic.slug || topic.title || String(topic.id))}`;
}

export function buildSlideoPath(slideo: { id: number; slug?: string | null; title?: string | null }): string {
  return `/slideo/${toCanonicalIdSlug(slideo.id, slideo.slug || slideo.title || String(slideo.id))}`;
}

export function buildProfilePath(username: string): string {
  return `/@${encodeURIComponent((username || '').trim())}`;
}

export function buildCategoryPath(slug: string): string {
  return `/kategori/${encodeURIComponent((slug || '').trim().toLowerCase())}`;
}

export function buildTagPath(slug: string): string {
  return `/etiket/${encodeURIComponent(slugifyTr(slug || ''))}`;
}

export function buildCollectionPath(col: { id: number; slug?: string | null; name?: string | null }): string {
  const slug = (col.slug || slugifyTr(col.name || '') || String(col.id)).trim();
  return `/collections/${slug}`;
}

export function buildRoomPath(room: { slug?: string | null; name?: string | null; id?: number | null }): string {
  const slug = (room.slug || slugifyTr(room.name || '') || String(room.id || '')).trim();
  return `/rooms/${slug}`;
}

export function buildTopicCreatePath(roomId?: number | string): string {
  const normalized = typeof roomId === 'string' ? Number(roomId) : roomId;
  if (Number.isInteger(normalized) && Number(normalized) > 0) {
    return `/konu/yeni?roomId=${Number(normalized)}`;
  }
  return '/konu/yeni';
}
