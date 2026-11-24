import React, { createContext, useContext, useState } from 'react'
import { es } from './es'
import { en } from './en'

export type Lang = 'es' | 'en'

export const AVAILABLE_LANGS: { code: Lang; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]

type TranslationTree = typeof es
const TRANSLATIONS: Record<Lang, TranslationTree> = { es, en }
const STORAGE_KEY = 'xpid_mobile_lang'

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const result = path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
  return typeof result === 'string' ? result : undefined
}

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const stored = typeof localStorage !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as Lang | null)
    : null
  const [lang, setLangState] = useState<Lang>(stored === 'en' ? 'en' : 'es')

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    try { localStorage.setItem(STORAGE_KEY, newLang) } catch {}
  }

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const tree = TRANSLATIONS[lang] as unknown as Record<string, unknown>
    const fallback = TRANSLATIONS.es as unknown as Record<string, unknown>
    const value = getNestedValue(tree, key) ?? getNestedValue(fallback, key) ?? key
    if (!vars) return value
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
