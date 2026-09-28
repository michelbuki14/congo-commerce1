import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import DashboardNav from '@/components/DashboardNav';
import ChatInbox from '@/components/chat/ChatInbox';
import { SELLER_LINKS } from '@/lib/navLinks';

export default function SellerMessages() {
  const { t } = useTranslation();
  const { seller, loading } = useActiveSeller();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!seller) return;
    base44.entities.ChatThread.filter({ seller_id: seller.id }, '-updated_date', 100).then(setThreads);
    return base44.entities.ChatThread.subscribe((e) => {
      if (e.data?.seller_id !== seller.id) return;
      setThreads((prev) => [e.data, ...prev.filter((t) => t.id !== e.id)]);
    });
  }, [seller?.id]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-5 md:px-6">
      <DashboardNav title={t('sellerMessages.title')} links={SELLER_LINKS} />
      {loading ? <p className="text-sm text-muted-foreground">{t('sellerMessages.loading')}</p> : !seller ? (
        <p className="text-sm text-muted-foreground">{t('sellerMessages.noShop')}</p>
      ) : (
        <ChatInbox threads={threads} activeId={activeId} onSelect={setActiveId} role="seller" senderName={seller.name} emptyText={t('sellerMessages.empty')} />
      )}
    </div>
  );
}