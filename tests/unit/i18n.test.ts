import { describe, it, expect } from 'vitest'
import { t, translations, SUPPORTED_LOCALES } from '@/lib/i18n'

describe('i18n', () => {
  describe('translations', () => {
    it('should have all supported locales', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(translations[locale.code]).toBeDefined()
      })
    })

    it('should have English as default', () => {
      expect(translations.en).toBeDefined()
      expect(Object.keys(translations.en).length).toBeGreaterThan(0)
    })

    it('should have all keys in English available in other languages', () => {
      const englishKeys = Object.keys(translations.en)

      SUPPORTED_LOCALES.filter(l => l.code !== 'en').forEach(locale => {
        const localeKeys = Object.keys(translations[locale.code])
        englishKeys.forEach(key => {
          expect(localeKeys).toContain(key)
        })
      })
    })
  })

  describe('t function', () => {
    it('should return English translation by default', () => {
      expect(t('nav.dashboard')).toBe('Dashboard')
    })

    it('should return Spanish translation when locale is es', () => {
      expect(t('nav.dashboard', 'es')).toBe('Panel')
    })

    it('should return French translation when locale is fr', () => {
      expect(t('nav.dashboard', 'fr')).toBe('Tableau de bord')
    })

    it('should fall back to English for missing translations', () => {
      // @ts-ignore - Testing invalid key behavior
      expect(t('invalid.key', 'en')).toBe('invalid.key')
    })
  })

  describe('SUPPORTED_LOCALES', () => {
    it('should have required properties for each locale', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(locale).toHaveProperty('code')
        expect(locale).toHaveProperty('name')
        expect(locale).toHaveProperty('flag')
      })
    })

    it('should include English', () => {
      expect(SUPPORTED_LOCALES.find(l => l.code === 'en')).toBeDefined()
    })
  })
})
