import { NextRequest } from 'next/server';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedData?: any;
}

// Sanitizar strings para prevenir XSS
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers
    .trim()
    .substring(0, 1000); // Limitar longitud
}

// Validar email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Validar UUID
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validar parámetros de paginación
export function validatePagination(page: string, limit: string): ValidationResult {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
    return { isValid: false, error: 'Invalid page number' };
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { isValid: false, error: 'Invalid limit (max 100)' };
  }

  return {
    isValid: true,
    sanitizedData: { page: pageNum, limit: limitNum },
  };
}

// Validar filtros de fecha
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  if (!startDate && !endDate) {
    return { isValid: true };
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && isNaN(start.getTime())) {
    return { isValid: false, error: 'Invalid start date' };
  }

  if (end && isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid end date' };
  }

  if (start && end && start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  // Verificar que las fechas no sean muy antiguas o futuras
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  if (start && (start < oneYearAgo || start > oneYearFromNow)) {
    return { isValid: false, error: 'Start date out of valid range' };
  }

  if (end && (end < oneYearAgo || end > oneYearFromNow)) {
    return { isValid: false, error: 'End date out of valid range' };
  }

  return { isValid: true };
}

// Validar datos de producto
export function validateProductData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid product data' };
  }

  const { name, article, category, is_active } = data;

  // Validar nombre
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    return { isValid: false, error: 'Invalid product name' };
  }

  // Validar artículo
  if (!article || typeof article !== 'string' || article.length < 1 || article.length > 50) {
    return { isValid: false, error: 'Invalid product article' };
  }

  // Validar categoría (using current schema)
  const validCategories = [
    'accessories',
    'bindings',
    'boots',
    'goggles',
    'helmet',
    'ski',
    'snowboard',
  ];
  if (!category || !validCategories.includes(category)) {
    return { isValid: false, error: 'Invalid product category' };
  }

  // Validar is_active
  if (typeof is_active !== 'boolean') {
    return { isValid: false, error: 'Invalid active status' };
  }

  return {
    isValid: true,
    sanitizedData: {
      name: sanitizeString(name),
      article: sanitizeString(article),
      category,
      is_active,
    },
  };
}

// Validar parámetros de búsqueda
export function validateSearchParams(search: string): ValidationResult {
  if (!search) {
    return { isValid: true, sanitizedData: '' };
  }

  if (typeof search !== 'string' || search.length > 100) {
    return { isValid: false, error: 'Invalid search parameter' };
  }

  // Remover caracteres peligrosos
  const sanitized = sanitizeString(search);

  return { isValid: true, sanitizedData: sanitized };
}

// Función principal para validar request
export function validateRequest(req: NextRequest, requiredParams: string[] = []): ValidationResult {
  try {
    const url = new URL(req.url);
    const params: any = {};

    // Validar parámetros requeridos
    for (const param of requiredParams) {
      const value = url.searchParams.get(param);
      if (!value) {
        return { isValid: false, error: `Missing required parameter: ${param}` };
      }
      params[param] = value;
    }

    // Validar paginación si está presente
    const page = url.searchParams.get('page');
    const limit = url.searchParams.get('limit');

    if (page || limit) {
      const paginationResult = validatePagination(page || '1', limit || '50');
      if (!paginationResult.isValid) {
        return paginationResult;
      }
    }

    // Validar fechas si están presentes
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (startDate || endDate) {
      const dateResult = validateDateRange(startDate || '', endDate || '');
      if (!dateResult.isValid) {
        return dateResult;
      }
    }

    // Validar búsqueda si está presente
    const search = url.searchParams.get('search');
    if (search) {
      const searchResult = validateSearchParams(search);
      if (!searchResult.isValid) {
        return searchResult;
      }
    }

    return { isValid: true, sanitizedData: params };
  } catch {
    return { isValid: false, error: 'Invalid request parameters' };
  }
}
