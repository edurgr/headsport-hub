'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Product {
  id: string;
  name: string;
  article: string;
  category: string;
  table_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export default function ProductManagementPage() {
  const { profile } = useAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'bindings', label: 'Bindings' },
    { value: 'boots', label: 'Boots' },
    { value: 'goggles', label: 'Goggles' },
    { value: 'helmet', label: 'Helmets' },
    { value: 'ski', label: 'Skis' },
    // Removed general snowboard - using specific snowboard categories instead
    { value: 'snowboards_boots', label: 'Snowboard Boots' },
    { value: 'snowboards_accessories', label: 'Snowboard Accessories' },
    { value: 'snowboards_bindings', label: 'Snowboard Bindings' },
    { value: 'snowboards_boards', label: 'Snowboard Boards' }
  ];

  useEffect(() => {
    if (profile?.role === 'admin') {
      setPage(1);
      fetchProducts(1, true);
    }
  }, [profile]);

  const fetchProducts = async (pageParam = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else if (pageParam > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('page', String(pageParam));
      params.append('limit', '100');

      const response = await authenticatedFetch(`/api/admin/products?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        const nextItems: Product[] = data.products || [];
        if (pageParam > 1) {
          setProducts(prev => [...prev, ...nextItems]);
        } else {
          setProducts(nextItems);
        }
        const totalPages = data?.pagination?.totalPages ?? 1;
        const currentPage = data?.pagination?.page ?? pageParam;
        setHasMore(currentPage < totalPages);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError('Error fetching products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profile?.role === 'admin') {
        setPage(1);
        fetchProducts(1, true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          const next = page + 1;
          setPage(next);
          fetchProducts(next);
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/products`, {
        method: 'DELETE',
        body: JSON.stringify({ category: product.table_name, productId: product.id })
      });

      if (response.ok) {
        setSuccess('Product deleted successfully');
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete product');
      }
    } catch (err) {
      setError('Error deleting product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowCreateModal(true);
  };

  const handleCreateProduct = async (productData: any) => {
    try {
      const response = await authenticatedFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          category: productData.category,
          productData: productData
        })
      });

      if (response.ok) {
        setSuccess('Product created successfully');
        setShowCreateModal(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create product');
      }
    } catch (err) {
      setError('Error creating product');
    }
  };

  const handleUpdateProduct = async (productData: any) => {
    if (!editingProduct) return;

    try {
      const response = await authenticatedFetch('/api/admin/products', {
        method: 'PUT',
        body: JSON.stringify({
          category: editingProduct.table_name,
          productId: editingProduct.id,
          productData: productData
        })
      });

      if (response.ok) {
        setSuccess('Product updated successfully');
        setShowCreateModal(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update product');
      }
    } catch (err) {
      setError('Error updating product');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const response = await authenticatedFetch('/api/admin/products', {
        method: 'PUT',
        body: JSON.stringify({
          category: product.table_name,
          productId: product.id,
          productData: { is_active: !product.is_active }
        })
      });

      if (response.ok) {
        setSuccess(`Product ${!product.is_active ? 'activated' : 'deactivated'} successfully`);
        fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update product');
      }
    } catch (err) {
      setError('Error updating product');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      accessories: 'bg-gray-100 text-gray-800',
      bindings: 'bg-blue-100 text-blue-800',
      boots: 'bg-green-100 text-green-800',
      goggles: 'bg-yellow-100 text-yellow-800',
      helmet: 'bg-red-100 text-red-800',
      ski: 'bg-purple-100 text-purple-800',
      snowboard: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="alert alert-error text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Access Denied</h1>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={['admin']}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">Product Management</h1>
          <p className="text-[hsl(var(--muted))]">Manage all products across all categories</p>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted))] mb-1">
                Search Products
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                placeholder="Search by name or article..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted))] mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full btn"
              >
                Add New Product
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 alert alert-error">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 alert alert-success">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="card p-0">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
              Products ({products.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'hsl(var(--info))' }}></div>
              <p className="text-[hsl(var(--muted))] mt-2">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center text-[hsl(var(--muted))]">
              <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'hsl(var(--muted))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your search or add a new product</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                <thead style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
                  {products.map((product) => (
                    <tr key={`${product.table_name}-${product.id}`} className="hover:opacity-95">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[hsl(var(--foreground))]">{product.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[hsl(var(--foreground))]">{product.article}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge badge-neutral">
                          {product.table_name.charAt(0).toUpperCase() + product.table_name.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${product.is_active ? 'badge-success' : 'badge-error'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[hsl(var(--foreground))]">
                        {new Date(product.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="hover:opacity-80"
                            style={{ color: 'hsl(var(--info))' }}
                            title="Edit product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleProductStatus(product)}
                            className={`hover:opacity-80`}
                            style={{ color: product.is_active ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}
                            title={product.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {product.is_active ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="hover:opacity-80"
                            style={{ color: 'hsl(var(--error))' }}
                            title="Delete product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={loadMoreRef} className="w-full h-12 flex items-center justify-center">
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'hsl(var(--info))' }}></div>
                ) : !hasMore && products.length > 0 ? (
                  <span className="text-sm text-[hsl(var(--muted))] py-2">No more results</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Product Modal */}
        {showCreateModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => {
              setShowCreateModal(false);
              setEditingProduct(null);
            }}
            onSave={editingProduct ? handleUpdateProduct : handleCreateProduct}
            categories={categories.filter(cat => cat.value !== 'all')}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Product Modal Component
interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (productData: any) => void;
  categories: { value: string; label: string }[];
}

function ProductModal({ product, onClose, onSave, categories }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    article: product?.article || '',
    category: product?.table_name || categories[0]?.value || '',
    is_active: product?.is_active ?? true,
    ...product
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground))] bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md" style={{ backgroundColor: 'hsl(var(--secondary))', borderColor: 'hsl(var(--border))' }}>
        <div className="mt-3">
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
            {product ? 'Edit Product' : 'Create New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted))]">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input mt-1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--muted))]">Article</label>
              <input
                type="text"
                name="article"
                value={formData.article}
                onChange={handleChange}
                required
                className="input mt-1"
              />
            </div>

            {!product && (
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--muted))]">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="input mt-1"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 border rounded"
                style={{ accentColor: 'hsl(var(--foreground))' }}
              />
              <label className="ml-2 block text-sm text-[hsl(var(--foreground))]">Active</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn px-4 py-2 text-sm font-medium"
              >
                {product ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
