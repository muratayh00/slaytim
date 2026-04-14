const STORAGE_KEY = 'recent_topics';
const MAX_TOPICS = 15;

export interface RecentTopic {
  id: number;
  title: string;
}

export function getRecentTopics(): RecentTopic[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecentTopic(id: number, title: string): void {
  if (typeof window === 'undefined') return;
  const topics = getRecentTopics().filter(t => t.id !== id);
  topics.unshift({ id, title });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topics.slice(0, MAX_TOPICS)));
  window.dispatchEvent(new Event('recent-topics-updated'));
}
