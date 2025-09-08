'use client';

import { useEffect, useState } from 'react';

import { Product } from '@/types';

import ResponsiveSelect from './ResponsiveSelect';

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  selectedProduct?: Product | null;
}

export default function ProductSearch({ onSelect, selectedProduct }: ProductSearchProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category or search changes
  useEffect(() => {
    if (searchQuery.trim() || selectedCategory !== 'all') {
      fetchProducts();
    } else {
      setFilteredProducts([]);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/equipment/categories', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
        // Default to skis when available
        setSelectedCategory(
          data.categories.includes('skis') ? 'skis' : data.categories[0] || 'all'
        );
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to minimal categories for this phase
      setCategories([
        'skis',
        'bindings',
        'accessories',
        'boots',
        'goggles',
        'helmet',
        'snowboards',
      ]);
      setSelectedCategory('skis');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/api/equipment?';
      if (selectedCategory !== 'all') {
        url += `category=${selectedCategory}&`;
      }
      if (searchQuery.trim()) {
        url += `q=${encodeURIComponent(searchQuery.trim())}&`;
      }
      url += 'limit=100';

      const response = await fetch(url, { cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.items) {
        setFilteredProducts(data.items);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    onSelect(product);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputFocus = () => {
    if (searchQuery.trim() || selectedCategory !== 'all') {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setIsOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      skis: 'Skis',
      bindings: 'Bindings',
      accessories: 'Accessories',
      boots: 'Boots',
      goggles: 'Goggles',
      helmet: 'Helmets',
      snowboards: 'Snowboards',
      bags: 'Bags',
      poles: 'Poles',
      skins: 'Skins',
      'snowboard boots': 'Snowboard Boots',
      'protection helmets': 'Protection Helmets',
      'protection goggles': 'Protection Goggles',
    };
    return labels[category] || category;
  };

  return (
    <div className="relative">
      {/* Category and Product Selection Row */}
      <div className="flex flex-wrap gap-3 mb-3">
        {/* Category Dropdown */}
        <div className="min-w-[9rem] w-full xs:w-auto sm:w-32">
          <ResponsiveSelect
            ariaLabel="Category"
            value={selectedCategory}
            onChange={v => handleCategoryChange({ target: { value: v } } as any)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(c => ({ value: c, label: getCategoryLabel(c) })),
            ]}
            className="w-full px-3 h-11 sm:h-9 bg-white border border-[var(--border)] rounded-md"
          />
        </div>

        {/* Product Search Input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Select product..."
            className="w-full px-3 h-11 sm:h-9 bg-white border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search by name or article #"
          className="w-full pl-10 pr-4 h-11 sm:h-9 bg-white border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-sm"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />
        <svg
          className="w-5 h-5 text-[var(--muted)] absolute left-3 top-3 sm:top-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Product Results List */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border border-[var(--border)] rounded-md shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[var(--muted)]">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching products...
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="py-2">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="px-4 py-3.5 hover:bg-[var(--surface)] cursor-pointer border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="font-medium text-base sm:text-sm">{product.name}</div>
                  <div className="text-sm text-[var(--muted)]">SKU: {product.sku}</div>
                  {product.category && (
                    <div className="text-xs text-[var(--muted)] capitalize">{product.category}</div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery.trim() || selectedCategory !== 'all' ? (
            <div className="p-4 text-center text-[var(--muted)]">
              No products found. Try adjusting your search or category.
            </div>
          ) : null}
        </div>
      )}

      {/* Selected Product Display */}
      {selectedProduct && (
        <div className="mt-3 p-3 surface-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selectedProduct.name}</div>
              <div className="text-sm text-[var(--muted)]">SKU: {selectedProduct.sku}</div>
              {selectedProduct.category && (
                <div className="text-xs text-[var(--muted)] capitalize">
                  {selectedProduct.category}
                </div>
              )}
            </div>
            <button
              onClick={() => onSelect(null as any)}
              className="text-[var(--accent)] hover:opacity-90 text-sm"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
