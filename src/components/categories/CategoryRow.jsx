import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function CategoryRow({ category, isFirst, isLast, onMove, onEdit, onToggle, onDelete }) {
  const { t } = useTranslation();
  const btn = 'rounded-md p-1.5 hover:bg-secondary disabled:opacity-30';
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex flex-col">
        <button className={btn} disabled={isFirst} onClick={() => onMove(-1)} aria-label={t('categoryRow.moveUp')}><ArrowUp className="h-3.5 w-3.5" /></button>
        <button className={btn} disabled={isLast} onClick={() => onMove(1)} aria-label={t('categoryRow.moveDown')}><ArrowDown className="h-3.5 w-3.5" /></button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{category.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">/{category.slug}{category.description ? ` · ${category.description}` : ''}</p>
      </div>
      <Switch checked={category.active !== false} onCheckedChange={onToggle} aria-label={t('categoryRow.visible')} />
      <button className={btn} onClick={onEdit} aria-label={t('categoryRow.edit')}><Pencil className="h-4 w-4" /></button>
      <button className={btn} onClick={onDelete} aria-label={t('categoryRow.delete')}><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}