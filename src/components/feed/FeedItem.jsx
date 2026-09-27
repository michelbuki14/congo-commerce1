import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, TrendingUp } from 'lucide-react';

const ICONS = { purchase: ShoppingBag, review: Star, trending: TrendingUp };

export default function FeedItem({ item }) {
  const Icon = ICONS[item.type];
  const body = (
    <div className="flex gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{item.text}</p>
        {item.quote && <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">« {item.quote} »</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">{item.meta}</p>
      </div>
    </div>
  );
  return item.link ? <Link to={item.link} className="block hover:bg-secondary/50">{body}</Link> : body;
}