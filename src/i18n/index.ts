import { en, type Message } from './en'
import { zhTW } from './zh-TW'
import { readLocal } from '../game/storage'

export type Language = 'en' | 'zh-TW'
export const languageKey = 'space-mission.language'
export type { Message }

export function preferredLanguage(): Language {
  const saved = readLocal(languageKey)
  if (saved === 'en' || saved === 'zh-TW') return saved
  for (const language of navigator.languages) {
    if (/^zh(?:-TW|-Hant|-HK|-MO)(?:-|$)/i.test(language) || /^zh$/i.test(language)) return 'zh-TW'
    if (/^en(?:-|$)/i.test(language)) return 'en'
  }
  return 'en'
}

export function translator(language: Language) {
  const dictionary = language === 'zh-TW' ? zhTW : en
  return (key: Message, values: Record<string, string | number> = {}) =>
    dictionary[key].replace(/\{(\w+)\}/g, (token, name: string) => String(values[name] ?? token))
}

export type Translate = ReturnType<typeof translator>
