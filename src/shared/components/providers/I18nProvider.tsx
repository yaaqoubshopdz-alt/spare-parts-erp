/**
 * I18nProvider — initializes i18n and provides language context.
 */
import React, { useEffect } from 'react';
import '../../../i18n/i18n.config';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/app.store';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, i18n]);

  return <>{children}</>;
}
