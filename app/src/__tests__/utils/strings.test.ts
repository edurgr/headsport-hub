/**
 * Tests for string utility functions
 */
import { normalize, formatDisplayName, generateSlug, isValidEmail, emailRegex } from '@/utils/strings';

describe('String utilities', () => {
  it('should handle basic string operations', () => {
    const testString = 'Hello World'
    
    expect(testString.toLowerCase()).toBe('hello world')
    expect(testString.toUpperCase()).toBe('HELLO WORLD')
    expect(testString.split(' ')).toEqual(['Hello', 'World'])
  })

  it('should normalize strings correctly', () => {
    expect(normalize('Café')).toBe('cafe')
    expect(normalize('Naïve')).toBe('naive')
    expect(normalize('RÉSUMÉ')).toBe('resume')
  })

  it('should handle email validation patterns', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'admin+test@company.org'
    ]
    
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'test@',
      ''
    ]
    
    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true)
      expect(isValidEmail(email)).toBe(true)
    })
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false)
      expect(isValidEmail(email)).toBe(false)
    })
  })

  it('should handle string formatting for display', () => {
    expect(formatDisplayName()).toBe('Anonymous')
    expect(formatDisplayName('')).toBe('Anonymous')
    expect(formatDisplayName('john doe')).toBe('John Doe')
    expect(formatDisplayName('JANE SMITH')).toBe('Jane Smith')
    expect(formatDisplayName('  bob  jones  ')).toBe('Bob Jones')
  })

  it('should handle slug generation', () => {
    expect(generateSlug('Hello World')).toBe('hello-world')
    expect(generateSlug('Test@#$%^&*()Title')).toBe('testtitle')
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces')
    expect(generateSlug('Special-Characters_Here')).toBe('special-characters-here')
  })
})
