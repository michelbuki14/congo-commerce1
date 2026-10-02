import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ 
  fallback = '/', 
  className = '', 
  variant = 'ghost',
  children,
  ...props 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (window.history.length > 1 && document.referrer && 
        new URL(document.referrer).origin === window.location.origin) {
      e.preventDefault();
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  const baseStyles = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  
  const variantStyles = {
    ghost: 'text-foreground hover:bg-secondary',
    outline: 'border border-border bg-background hover:bg-secondary',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-label={t('common.back')}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children || t('common.back')}
    </button>
  );
}