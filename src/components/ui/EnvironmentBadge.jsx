import { useTranslation } from 'react-i18next';

export default function EnvironmentBadge() {
  const { t } = useTranslation();
  // VITE_ENV_MODE can be 'production', 'sandbox', 'development', 'staging'
  // Default to 'production' if not set
  const envMode = import.meta.env.VITE_ENV_MODE || 'production';

  // Only show badge in non-production environments
  if (envMode === 'production') return null;

  const variants = {
    sandbox: { label: t('env.sandbox', 'Sandbox'), className: 'bg-amber-100 text-amber-900 border-amber-300' },
    development: { label: t('env.development', 'Dev'), className: 'bg-blue-100 text-blue-900 border-blue-300' },
    staging: { label: t('env.staging', 'Staging'), className: 'bg-purple-100 text-purple-900 border-purple-300' },
    test: { label: t('env.test', 'Test'), className: 'bg-red-100 text-red-900 border-red-300' },
  };

  const variant = variants[envMode] || { label: envMode, className: 'bg-secondary text-secondary-foreground border-border' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${variant.className}`}
      aria-label={t('env.modeLabel', { mode: variant.label })}
      title={t('env.modeTooltip', { mode: variant.label })}
    >
      <span className="relative flex h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {variant.label}
    </span>
  );
}