/**
 * VAULTRIX — data.js
 * Product data store. Single source of truth for localStorage I/O.
 * All other scripts access products ONLY through this module.
 */

(function (global) {
  'use strict';

  // Storage key — never change this after deployment
  const STORAGE_KEY = 'vaultrix_products';

  // ─── HELPERS ───────────────────────────────────────────────

  /**
   * Generate a UUID v4 string.
   * Uses crypto.randomUUID() when available (modern browsers),
   * falls back to Math.random() for older environments.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback: RFC 4122 v4 UUID via Math.random
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Safe JSON parse. Returns fallback on any error.
   * @param {string} raw
   * @param {*} fallback
   * @returns {*}
   */
  function safeJSONParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Validate that a product object has all required fields with correct types.
   * Returns an array of error strings; empty array = valid.
   * @param {Object} product
   * @returns {string[]}
   */
  function validateProduct(product) {
    const errors = [];
    const VALID_CATEGORIES = [
      'Template', 'Preset', 'Ebook', 'Toolkit',
      'Font', 'Mockup', 'UI Kit', 'Illustration', 'Other'
    ];
    const VALID_STATUSES = ['in-stock', 'out-of-stock'];

    if (!product || typeof product !== 'object') {
      return ['Product must be an object.'];
    }

    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      errors.push('name is required and must be a non-empty string.');
    } else if (product.name.length > 60) {
      errors.push('name must be 60 characters or fewer.');
    }

    if (!product.category || !VALID_CATEGORIES.includes(product.category)) {
      errors.push('category must be one of: ' + VALID_CATEGORIES.join(', '));
    }

    if (!product.price || typeof product.price !== 'string' || product.price.trim().length === 0) {
      errors.push('price is required and must be a non-empty string (e.g. "$29" or "$29.99").');
    }

    if (!VALID_STATUSES.includes(product.status)) {
      errors.push('status must be exactly "in-stock" or "out-of-stock".');
    }

    if (!product.coverImage || typeof product.coverImage !== 'string' || product.coverImage.trim().length === 0) {
      errors.push('coverImage is required and must be a URL string.');
    }

    if (!product.description || typeof product.description !== 'string') {
      errors.push('description is required and must be a string.');
    } else if (product.description.length > 800) {
      errors.push('description must be 800 characters or fewer.');
    }

    if (!Array.isArray(product.screenshots) || product.screenshots.length === 0) {
      errors.push('screenshots must be a non-empty array of URLs (1–5).');
    } else if (product.screenshots.length > 5) {
      errors.push('screenshots may contain at most 5 URLs.');
    }

    if (!product.buyLink || typeof product.buyLink !== 'string' || product.buyLink.trim().length === 0) {
      errors.push('buyLink is required and must be a URL string.');
    }

    if (typeof product.featured !== 'boolean') {
      errors.push('featured must be a boolean (true or false).');
    }

    return errors;
  }

  // ─── CORE STORE API ────────────────────────────────────────

  /**
   * Load all products from localStorage.
   * Always returns a plain array (never null/undefined).
   * @returns {Object[]}
   */
  function getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeJSONParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * Persist the full products array to localStorage.
   * @param {Object[]} products
   * @returns {boolean} success
   */
  function _saveAll(products) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      return true;
    } catch (err) {
      console.error('[VaultrixData] Failed to save to localStorage:', err);
      return false;
    }
  }

  /**
   * Get a single product by its id.
   * @param {string} id
   * @returns {Object|null}
   */
  function getById(id) {
    const all = getAll();
    return all.find(function (p) { return p.id === id; }) || null;
  }

  /**
   * Add a new product to the store.
   * Automatically assigns: id (uuid), dateAdded (ISO 8601 timestamp).
   * Validates all required fields before writing.
   * @param {Object} productData — all fields except id and dateAdded
   * @returns {{ success: boolean, product: Object|null, errors: string[] }}
   */
  function add(productData) {
    const now = new Date().toISOString();
    const product = Object.assign({}, productData, {
      id: generateId(),
      dateAdded: now,
    });

    const errors = validateProduct(product);
    if (errors.length > 0) {
      return { success: false, product: null, errors: errors };
    }

    const all = getAll();
    all.unshift(product); // Most recent first
    const saved = _saveAll(all);

    if (!saved) {
      return { success: false, product: null, errors: ['Storage write failed.'] };
    }

    return { success: true, product: product, errors: [] };
  }

  /**
   * Update an existing product by id.
   * Merges provided fields into existing product.
   * Re-validates after merge. Does NOT update dateAdded.
   * @param {string} id
   * @param {Object} updates — partial product fields to update
   * @returns {{ success: boolean, product: Object|null, errors: string[] }}
   */
  function update(id, updates) {
    const all = getAll();
    const index = all.findIndex(function (p) { return p.id === id; });

    if (index === -1) {
      return { success: false, product: null, errors: ['Product with id "' + id + '" not found.'] };
    }

    // Merge; guard id and dateAdded against overwrite
    const updated = Object.assign({}, all[index], updates, {
      id: all[index].id,
      dateAdded: all[index].dateAdded,
    });

    const errors = validateProduct(updated);
    if (errors.length > 0) {
      return { success: false, product: null, errors: errors };
    }

    all[index] = updated;
    const saved = _saveAll(all);

    if (!saved) {
      return { success: false, product: null, errors: ['Storage write failed.'] };
    }

    return { success: true, product: updated, errors: [] };
  }

  /**
   * Delete a product by id.
   * @param {string} id
   * @returns {{ success: boolean, errors: string[] }}
   */
  function remove(id) {
    const all = getAll();
    const index = all.findIndex(function (p) { return p.id === id; });

    if (index === -1) {
      return { success: false, errors: ['Product with id "' + id + '" not found.'] };
    }

    all.splice(index, 1);
    const saved = _saveAll(all);

    if (!saved) {
      return { success: false, errors: ['Storage write failed.'] };
    }

    return { success: true, errors: [] };
  }

  /**
   * Toggle a product's status between 'in-stock' and 'out-of-stock'.
   * @param {string} id
   * @returns {{ success: boolean, product: Object|null, errors: string[] }}
   */
  function toggleStock(id) {
    const product = getById(id);
    if (!product) {
      return { success: false, product: null, errors: ['Product not found.'] };
    }
    const newStatus = product.status === 'in-stock' ? 'out-of-stock' : 'in-stock';
    return update(id, { status: newStatus });
  }

  /**
   * Toggle a product's featured flag.
   * @param {string} id
   * @returns {{ success: boolean, product: Object|null, errors: string[] }}
   */
  function toggleFeatured(id) {
    const product = getById(id);
    if (!product) {
      return { success: false, product: null, errors: ['Product not found.'] };
    }
    return update(id, { featured: !product.featured });
  }

  /**
   * Return only featured products.
   * @returns {Object[]}
   */
  function getFeatured() {
    return getAll().filter(function (p) { return p.featured === true; });
  }

  /**
   * Return computed marketplace stats.
   * @returns {{ total: number, available: number, sold: number }}
   */
  function getStats() {
    const all = getAll();
    const sold = all.filter(function (p) { return p.status === 'out-of-stock'; }).length;
    return {
      total: all.length,
      available: all.length - sold,
      sold: sold,
    };
  }

  /**
   * Filter products by category and/or stock status.
   * @param {Object} filters
   * @param {string} [filters.category] — e.g. "Template" or "All"
   * @param {string} [filters.stock]    — "all" | "in-stock" | "out-of-stock"
   * @param {string} [filters.query]   — free-text search (name + description)
   * @param {string} [filters.sort]    — "newest" | "oldest" | "az" | "za"
   * @returns {Object[]}
   */
  function filter(filters) {
    filters = filters || {};
    var results = getAll();

    // Category filter
    if (filters.category && filters.category !== 'All') {
      results = results.filter(function (p) {
        return p.category === filters.category;
      });
    }

    // Stock filter
    if (filters.stock && filters.stock !== 'all') {
      results = results.filter(function (p) {
        return p.status === filters.stock;
      });
    }

    // Text search (name + description, case-insensitive)
    if (filters.query && filters.query.trim().length > 0) {
      var q = filters.query.trim().toLowerCase();
      results = results.filter(function (p) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    var sort = filters.sort || 'newest';
    if (sort === 'newest') {
      results.sort(function (a, b) { return new Date(b.dateAdded) - new Date(a.dateAdded); });
    } else if (sort === 'oldest') {
      results.sort(function (a, b) { return new Date(a.dateAdded) - new Date(b.dateAdded); });
    } else if (sort === 'az') {
      results.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sort === 'za') {
      results.sort(function (a, b) { return b.name.localeCompare(a.name); });
    }

    return results;
  }

  /**
   * Completely clear the store (for admin reset, testing).
   * @returns {boolean} success
   */
  function clearAll() {
    return _saveAll([]);
  }

  // ─── PUBLIC API ────────────────────────────────────────────

  global.VaultrixData = {
    getAll:         getAll,
    getById:        getById,
    add:            add,
    update:         update,
    remove:         remove,
    toggleStock:    toggleStock,
    toggleFeatured: toggleFeatured,
    getFeatured:    getFeatured,
    getStats:       getStats,
    filter:         filter,
    clearAll:       clearAll,
    // Exposed for testing/admin
    _generateId:    generateId,
    _validate:      validateProduct,
  };

}(window));
