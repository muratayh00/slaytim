'use client';

interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt?: string;
}

interface BadgeDisplayProps {
  badges: Badge[];
  limit?: number;
  showAll?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  starter: 'Başlangıç',
  creator: 'İçerik Üreticisi',
  quality: 'Kalite',
  engagement: 'Etkileşim',
  community: 'Topluluk',
  hidden: 'Gizli',
};

export default function BadgeDisplay({ badges, limit, showAll }: BadgeDisplayProps) {
  const displayed = limit ? badges.slice(0, limit) : badges;

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <span className="text-2xl block mb-2">🏅</span>
        Henüz rozet kazanılmadı
      </div>
    );
  }

  if (!showAll) {
    return (
      <div className="flex flex-wrap gap-2">
        {displayed.map(badge => (
          <BadgePill key={badge.key} badge={badge} />
        ))}
        {limit && badges.length > limit && (
          <span className="flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
            +{badges.length - limit} daha
          </span>
        )}
      </div>
    );
  }

  // Group by category
  const grouped = badges.reduce((acc, badge) => {
    const cat = badge.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, catBadges]) => (
        <div key={cat}>
          <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            {CATEGORY_LABELS[cat] || cat}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catBadges.map(badge => (
              <BadgeCard key={badge.key} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgePill({ badge }: { badge: Badge }) {
  return (
    <div
      title={badge.description}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary cursor-default"
    >
      <span>{badge.icon}</span>
      {badge.name}
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
        {badge.icon}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{badge.name}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{badge.description}</p>
      </div>
    </div>
  );
}
