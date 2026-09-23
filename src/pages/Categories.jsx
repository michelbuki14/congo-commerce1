import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import SectionHeader from '@/components/SectionHeader';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cats, products] = await Promise.all([
        base44.entities.Category.list('sort_order', 40),
        base44.entities.Product.filter({ status: 'published' }, '-created_date', 200),
      ]);
      const map = {};
      products.forEach((p) => {
        if (!p.category_id) return;
        map[p.category_id] = (map[p.category_id] || 0) + 1;
      });
      setCategories(cats);
      setCounts(map);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 pb-6">
      <SectionHeader title="Toutes les catégories" subtitle="Mode, beauté, maison, électronique et plus" />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/search?category=${c.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                <Image
                  src={c.image_url}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-2.5">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{counts[c.id] || 0} articles</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}