'use client';

import { useEffect, useState, useCallback, useMemo } from 'react'; // Import useCallback
import type { ReactElement } from 'react';

import { Product } from '@/types';

import ResponsiveSelect from './ResponsiveSelect';

interface ProductSearchProps {
  onSelect: (product: Product | null) => void; // Allow null for clearing selection
  selectedProduct?: Product | null;
}

export default function ProductSearch({ onSelect, selectedProduct }: ProductSearchProps): ReactElement {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Products state seems unused based on the provided code, consider removing if not needed elsewhere
  // const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    // Defined inside useEffect as it's only used here and doesn't depend on props/state
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
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
          // Default to skis if available, otherwise first category or 'all'
          const defaultCat = data.categories.includes('skis') ? 'skis' : data.categories[0] || 'all';
          setSelectedCategory(defaultCat);
        } else {
           throw new Error("No categories found in response");
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Provide a more robust fallback or error state handling
        setCategories(['skis', 'bindings', 'accessories', 'boots', 'goggles', 'helmet', 'snowboards']); // Example fallback
        setSelectedCategory('skis');
      }
    };
    fetchCategories();
  }, []); // Empty dependency array means this runs only once on mount

  const fetchProducts = useCallback(async () => { // CORREGIDO: useCallback añadido
    // Only fetch if there's a category selected (other than 'all') OR a search query
    if (selectedCategory === 'all' && !searchQuery.trim()) {
      setFilteredProducts([]); // Clear results if no filters/search
      setIsOpen(false); // Close dropdown if no reason to fetch
      return;
    }

    setLoading(true);
    setIsOpen(true); // Ensure dropdown is open when fetching
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      params.append('limit', '50'); // Limit results for performance

      const url = `/api/equipment?${params.toString()}`;

      const response = await fetch(url, { cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.items && Array.isArray(data.items)) {
        setFilteredProducts(data.items);
      } else {
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setFilteredProducts([]); // Clear results on error
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]); // CORREGIDO: Dependencias de useCallback

  // Fetch products when category or search changes (debounced)
  useEffect(() => {
    // Debounce the fetchProducts call
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300); // 300ms debounce timer

    // Cleanup function to clear timeout if dependencies change before timer runs out
    return () => {
      clearTimeout(handler);
    };
  }, [fetchProducts]); // CORREGIDO: useEffect depende ahora de la función estable fetchProducts


  const handleProductSelect = (product: Product) => {
    onSelect(product);
    setIsOpen(false);
    setSearchQuery(product.name || ''); // Populate search with selected product name
    setFilteredProducts([]); // Clear dropdown results
  };

  const handleInputFocus = () => {
    // Open dropdown on focus only if there are already results or a query/category is set
    if (filteredProducts.length > 0 || searchQuery.trim() || selectedCategory !== 'all') {
        // Fetch products immediately on focus if needed, or rely on the debounced useEffect
        // fetchProducts(); // Optionally fetch immediately on focus
      setIsOpen(true);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Let the debounced useEffect handle fetching and opening
  };

  const handleCategoryChange = (value: string) => { // Updated for ResponsiveSelect
    setSelectedCategory(value);
     // Let the debounced useEffect handle fetching and opening
  };


  // Centralized label lookup
  const getCategoryLabel = useCallback((categoryValue: string): string => {
     const labels: { [key: string]: string } = {
       all: 'All Categories',
       skis: 'Skis',
       bindings: 'Bindings',
       accessories: 'Accessories',
       boots: 'Boots',
       goggles: 'Goggles',
       helmet: 'Helmets',
       snowboards: 'Snowboards', // Keep generic if used
       bags: 'Bags',
       poles: 'Poles',
       skins: 'Skins',
       'snowboard boots': 'Snowboard Boots', // Use consistent naming if possible
       'protection helmets': 'Protection Helmets',
       'protection goggles': 'Protection Goggles',
       // Add other specific snowboard categories if they exist in your API results
       snowboards_boots: 'Snowboard Boots',
       snowboards_accessories: 'Snowboard Accessories',
       snowboards_bindings: 'Snowboard Bindings',
       snowboards_boards: 'Snowboard Boards',
     };
     // Attempt to find specific label, then generic, then fallback to value
     return labels[categoryValue] || categoryValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words as fallback
   }, []); // This function doesn't depend on component state/props

  return (
    <div className="relative">
      {/* Category Dropdown */}
       <div className="mb-3">
         <label htmlFor="product-category-select" className="sr-only">Category</label> {/* Accessibility label */}
         <ResponsiveSelect
            id="product-category-select" // ID for label association
            ariaLabel="Select Product Category" // More descriptive aria-label
            value={selectedCategory}
            onChange={handleCategoryChange} // Use updated handler
            options={[
              { value: 'all', label: getCategoryLabel('all') }, // Use getter for consistency
              ...categories.map((c) => ({ value: c, label: getCategoryLabel(c) })),
            ]}
             // Use theme classes or consistent styling
            className="w-full input input-bordered"
          />
       </div>


      {/* Product Search Input */}
      <div className="relative mb-3">
        <label htmlFor="product-search-input" className="sr-only">Search Products</label> {/* Accessibility label */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {/* Search Icon */}
          <svg className="w-5 h-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input
          id="product-search-input" // ID for label association
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)} // Close dropdown on blur with delay
          placeholder="Search by name or article #"
           // Use theme classes or consistent styling
          className="w-full input input-bordered pl-10"
        />
         {searchQuery && ( // Clear button inside input
            <button
              onClick={() => { setSearchQuery(''); setIsOpen(false); setFilteredProducts([]); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
      </div>


      {/* Product Results List */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"> {/* Adjusted max-h */}
          {loading ? (
            <div className="p-4 text-center text-[var(--muted)] flex items-center justify-center space-x-2">
              <span className="loading loading-spinner loading-sm"></span> {/* Use theme spinner */}
              <span>Searching...</span>
            </div>
          ) : filteredProducts.length > 0 ? (
            <ul> {/* Use ul for semantic list */}
              {filteredProducts.map((product) => (
                <li key={product.id}> {/* Use li for list items */}
                  <button // Use button for accessibility
                    onClick={() => handleProductSelect(product)}
                    className="w-full text-left px-4 py-2 hover:bg-[var(--surface)] cursor-pointer border-b border-[var(--border)] last:border-b-0 focus:outline-none focus:bg-[var(--surface)]"
                  >
                    <div className="font-medium text-base sm:text-sm">{product.name}</div>
                    <div className="text-sm text-[var(--muted)]">SKU: {product.sku}</div>
                    {product.category && (
                      <div className="text-xs text-[var(--muted)] capitalize">{getCategoryLabel(product.category)}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (searchQuery.trim() || selectedCategory !== 'all') && !loading ? ( // Show only if searched/filtered and not loading
            <div className="p-4 text-center text-[var(--muted)]">
              No products found.
            </div>
          ) : null } {/* Don't show anything if empty query/category and not loading */}
        </div>
      )}

      {/* Selected Product Display */}
      {selectedProduct && !isOpen && ( // Only show when dropdown is closed
        <div className="mt-3 p-3 card card-compact bg-base-200"> {/* Use theme card styles */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{selectedProduct.name}</div>
              <div className="text-sm text-base-content/70">SKU: {selectedProduct.sku}</div> {/* Use theme muted text */}
              {selectedProduct.category && (
                <div className="text-xs text-base-content/70 capitalize"> {/* Use theme muted text */}
                  {getCategoryLabel(selectedProduct.category)}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                onSelect(null); // Clear selection
                setSearchQuery(''); // Clear search input
                setSelectedCategory('all'); // Reset category
                setFilteredProducts([]); // Clear any lingering results
              }}
              className="btn btn-xs btn-ghost text-error" // Use theme button styles
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}