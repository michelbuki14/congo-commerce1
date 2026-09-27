import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BadgeCheck, Coins, ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import EmptyState from '@/components/EmptyState';
import { useCurrency } from '@/lib/currency';
import { compactNumber } from '@/lib/format';

export default function CreatorShowcase() {
  const { format } = useCurrency();
  const [creators, setCreators] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [people, posts] = await Promise.all([
        base44.entities.Creator.filter({ status: 'active' }, '-total_earnings_usd', 12).catch(() => []),
        base44.entities.Content.filter({ status: 'published' }, '-likes_count', 60).catch(() => []),
      ]);
      setCreators(people);
      setContent(posts);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="mx-auto h-48 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={Sparkles}
      title="Créateurs à l’honneur"
      subtitle="Les créateurs congolais qui font vivre la marketplace, et les produits qu’ils mettent en avant en ce moment."
    >
      {!creators.length ? (
        <EmptyState
          icon={Sparkles}
          title="Aucun créateur publié"
          description="Les créateurs actifs apparaîtront ici dès leur première publication."
          actionTo="/referral-program"
          actionLabel="Rejoindre le programme"
        />
      ) : (
        <div className="space-y-3">
          {creators.map((c) => {
            const posts = content.filter((p) => p.creator_id === c.id).slice(0, 3);
            return (
              <section key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                    <Image src={c.avatar_url} alt={c.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      {c.name}
                      {c.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      @{c.handle} · {c.city}
                      {c.referral_code ? ` · code ${c.referral_code}` : ''}
                    </p>
                    {c.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-xl bg-secondary/60 p-2.5">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">{format(c.total_earnings_usd || 0)}</p>
                    <p className="text-muted-foreground">Commissions</p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-2.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">{compactNumber(c.total_conversions || 0)}</p>
                    <p className="text-muted-foreground">Ventes générées</p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">{compactNumber(c.followers_count || 0)}</p>
                    <p className="text-muted-foreground">Abonnés</p>
                  </div>
                </div>

                {posts.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {posts.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-xl border border-border">
                        <div className="aspect-square bg-secondary">
                          <Image src={p.thumbnail_url || p.media_url} alt={p.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2">
                          <p className="line-clamp-1 text-[11px] font-semibold text-foreground">{p.product_title || p.title}</p>
                          {!!p.product_price_usd && (
                            <p className="text-[11px] text-muted-foreground">{format(p.product_price_usd)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">Aucun contenu publié pour le moment.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <InfoSection title="Vous voulez apparaître ici ?">
        <p>
          Publiez des vidéos produits depuis votre espace créateur : les contenus les plus appréciés sont mis en avant
          sur la page Découvrir et dans cette vitrine.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/creator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Publier un contenu
          </Link>
          <Link to="/discover" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            Voir le fil Découvrir
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}