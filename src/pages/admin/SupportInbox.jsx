import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import ChatInbox from '@/components/chat/ChatInbox';
import { useTranslation } from 'react-i18next';
import { ADMIN_LINKS } from '@/lib/navLinks';

export default function SupportInbox() {
  const { t } = useTranslation();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    base44.entities.ChatThread.filter({ type: 'support' }, '-updated_date', 200).then(setThreads);
    return base44.entities.ChatThread.subscribe((e) => {
      if (e.data?.type !== 'support') return;
      setThreads((prev) => [e.data, ...prev.filter((t) => t.id !== e.id)]);
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-5 md:px-6">
      <DashboardNav title={t('supportInbox.title')} links={ADMIN_LINKS} />
      <ChatInbox threads={threads} activeId={activeId} onSelect={setActiveId} role="support" senderName="Support Congo Commerce" emptyText={t('supportInbox.empty')} />
    </div>
  );
}