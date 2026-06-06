/**
 * VAULTRIX — app.js
 * Customer page logic.
 * Depends on: data.js (VaultrixData must be loaded first)
 */

(function () {
  'use strict';

  // ─── STATE ─────────────────────────────────────────────────
  var state = {
    category:   'All',
    stock:       'all',
    sort:        'newest',
    query:       '',
    activeModal: null,      // currently open product object
    activeThumb: 0,         // index of selected screenshot
  };

  // ─── DOM REFS ───────────────────────────────────────────────
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var productGrid        = $('#productGrid');
  var emptyState         = $('#emptyState');
  var noResultsState     = $('#noResultsState');
  var featuredScroll     = $('#featuredScroll');
  var featuredEmpty      = $('#featuredEmpty');
  var heroBarCount       = $('#heroBarCount');
  var statTotal          = $('#statTotal');
  var statAvailable      = $('#statAvailable');
  var statSold           = $('#statSold');

  // Filter bar
  var categoryPills      = $$('[data-category]');
  var stockBtns          = $$('[data-stock]');
  var sortSelect         = $('#sortSelect');

  // Mobile filter sheet
  var mobileFilterBtn    = $('#mobileFilterBtn');
  var filterSheet        = $('#filterSheet');
  var filterSheetBackdrop= $('#filterSheetBackdrop');
  var filterSheetPanel   = filterSheet ? filterSheet.querySelector('.filter-sheet__panel') : null;
  var filterSheetClose   = $('#filterSheetClose');
  var filterSheetApply   = $('#filterSheetApply');
  var mobileCategoryPills= $$('[data-mobile-category]');
  var mobileStockBtns    = $$('[data-mobile-stock]');
  var mobileSortSelect   = $('#mobileSortSelect');

  // Nav
  var searchToggle       = $('#searchToggle');
  var navSearchInput     = $('#navSearchInput');
  var mobileSearch       = $('#mobileSearch');
  var mobileSearchInput  = $('#mobileSearchInput');
  var hamburgerBtn       = $('#hamburgerBtn');
  var mobileMenu         = $('#mobileMenu');
  var menuClose          = $('#menuClose');

  // Modal
  var modalBackdrop      = $('#modalBackdrop');
  var productModal       = $('#productModal');
  var modalClose         = $('#modalClose');
  var modalMainImg       = $('#modalMainImg');
  var modalThumbs        = $('#modalThumbs');
  var modalCategoryChip  = $('#modalCategoryChip');
  var modalStockBadge    = $('#modalStockBadge');
  var modalProductName   = $('#modalProductName');
  var modalPrice         = $('#modalPrice');
  var modalDesc          = $('#modalDesc');
  var modalCta           = $('#modalCta');

  // ─── UTILITIES ─────────────────────────────────────────────

  function truncate(str, max) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max).trimEnd() + '…';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── STATS ─────────────────────────────────────────────────

  function updateStats() {
    var stats = VaultrixData.getStats();
    if (statTotal)     statTotal.textContent     = stats.total;
    if (statAvailable) statAvailable.textContent = stats.available;
    if (statSold)      statSold.textContent      = stats.sold;
  }

  // ─── RENDER PRODUCT GRID ────────────────────────────────────

  function renderGrid() {
    var products = VaultrixData.filter({
      category: state.category,
      stock:    state.stock,
      sort:     state.sort,
      query:    state.query,
    });

    // Update hero bar count
    if (heroBarCount) {
      heroBarCount.textContent = products.length + (products.length === 1 ? ' item' : ' items');
    }

    // Handle empty states
    var allProducts = VaultrixData.getAll();
    var hasNoProducts = allProducts.length === 0;
    var hasNoResults  = !hasNoProducts && products.length === 0;

    if (emptyState)      emptyState.hidden      = !hasNoProducts;
    if (noResultsState)  noResultsState.hidden  = !hasNoResults;

    if (hasNoProducts || hasNoResults) {
      if (productGrid) productGrid.innerHTML = '';
      return;
    }

    // Render cards
    if (!productGrid) return;
    productGrid.innerHTML = '';

    products.forEach(function (product, i) {
      var card = buildProductCard(product, i);
      productGrid.appendChild(card);
    });
  }

  /**
   * Build a product card DOM element.
   * @param {Object} product
   * @param {number} index — for stagger animation delay
   * @returns {HTMLElement}
   */
  function buildProductCard(product, index) {
    var isOOS = product.status === 'out-of-stock';
    var shortDesc = truncate(product.description, 60);

    var article = document.createElement('article');
    article.className = 'product-card';
    article.setAttribute('role', 'listitem');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', product.name);
    article.style.animationDelay = (index * 60) + 'ms';
    article.dataset.productId = product.id;

    var imgSrc = product.coverImage || '';
    var imgHtml = imgSrc
      ? '<img class="product-card__img" src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">'
      : '<div class="product-card__img-placeholder"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4" y="8" width="32" height="24" rx="4" stroke="#E8E8E8" stroke-width="2"/><path d="M4 28L12 20L18 26L26 16L36 28" stroke="#E8E8E8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="16" r="3" stroke="#E8E8E8" stroke-width="2"/></svg></div>';

    article.innerHTML =
      '<div class="product-card__img-zone">' +
        imgHtml +
        '<span class="product-card__stock-badge product-card__stock-badge--' + (isOOS ? 'out-of-stock' : 'in-stock') + '">' +
          (isOOS ? 'SOLD' : 'IN STOCK') +
        '</span>' +
        '<span class="product-card__category-chip">' + escapeHtml(product.category) + '</span>' +
      '</div>' +
      '<div class="product-card__content">' +
        '<p class="product-card__name" title="' + escapeHtml(product.name) + '">' + escapeHtml(product.name) + '</p>' +
        '<p class="product-card__price' + (isOOS ? ' product-card__price--oos' : '') + '">' + escapeHtml(product.price) + '</p>' +
        '<p class="product-card__desc" title="' + escapeHtml(product.description) + '">' + escapeHtml(shortDesc) + '</p>' +
        '<button class="product-card__btn' + (isOOS ? ' product-card__btn--oos' : '') + '" ' +
          (isOOS ? 'disabled aria-disabled="true"' : '') + ' data-action="view-details" data-id="' + escapeHtml(product.id) + '">' +
          (isOOS ? 'Sold' : 'View Details') +
        '</button>' +
      '</div>';

    // Click on card (not button) — open modal for in-stock
    article.addEventListener('click', function (e) {
      // Don't double-fire if the button was clicked
      if (e.target.closest('[data-action="view-details"]')) return;
      if (!isOOS) openModal(product.id);
    });

    // Keyboard: Enter / Space opens modal
    article.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !isOOS) {
        e.preventDefault();
        openModal(product.id);
      }
    });

    // Button click
    var btn = article.querySelector('[data-action="view-details"]');
    if (btn && !isOOS) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openModal(product.id);
      });
    }

    return article;
  }

  // ─── RENDER FEATURED SCROLL ─────────────────────────────────

  function renderFeatured() {
    if (!featuredScroll) return;
    var featured = VaultrixData.getFeatured();

    if (featured.length === 0) {
      featuredScroll.innerHTML = '';
      if (featuredEmpty) featuredEmpty.hidden = false;
      return;
    }

    if (featuredEmpty) featuredEmpty.hidden = true;
    featuredScroll.innerHTML = '';

    featured.forEach(function (product, i) {
      var card = buildFeaturedCard(product, i);
      featuredScroll.appendChild(card);
    });
  }

  function buildFeaturedCard(product, index) {
    var isOOS = product.status === 'out-of-stock';
    var imgSrc = product.coverImage || '';

    var article = document.createElement('article');
    article.className = 'featured-card';
    article.setAttribute('role', 'listitem');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', product.name + ' (featured)');
    article.style.animationDelay = (index * 80) + 'ms';
    article.dataset.productId = product.id;

    var imgHtml = imgSrc
      ? '<img class="featured-card__img" src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">'
      : '<div class="product-card__img-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;"></div>';

    article.innerHTML =
      '<div class="featured-card__img-zone">' +
        imgHtml +
        '<span class="product-card__stock-badge product-card__stock-badge--' + (isOOS ? 'out-of-stock' : 'in-stock') + '">' +
          (isOOS ? 'SOLD' : 'IN STOCK') +
        '</span>' +
      '</div>' +
      '<div class="featured-card__content">' +
        '<p class="featured-card__name" title="' + escapeHtml(product.name) + '">' + escapeHtml(product.name) + '</p>' +
        '<p class="featured-card__price' + (isOOS ? ' product-card__price--oos' : '') + '">' + escapeHtml(product.price) + '</p>' +
        '<button class="featured-card__btn' + (isOOS ? ' product-card__btn--oos' : '') + '" ' +
          (isOOS ? 'disabled aria-disabled="true"' : '') + '>' +
          (isOOS ? 'Sold' : 'View Details') +
        '</button>' +
      '</div>';

    if (!isOOS) {
      article.addEventListener('click', function () { openModal(product.id); });
      article.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(product.id); }
      });
    }

    return article;
  }

  // ─── MODAL ─────────────────────────────────────────────────

  function openModal(productId) {
    var product = VaultrixData.getById(productId);
    if (!product) return;

    state.activeModal = product;
    state.activeThumb = 0;

    populateModal(product);

    // Show backdrop and modal
    if (modalBackdrop) {
      modalBackdrop.hidden = false;
      // Force reflow before adding class for transition
      void modalBackdrop.offsetWidth;
      modalBackdrop.classList.add('modal-backdrop--visible');
    }

    if (productModal) {
      productModal.hidden = false;
      void productModal.offsetWidth;
      productModal.classList.add('modal--visible');
    }

    // Trap focus and lock body scroll
    document.body.style.overflow = 'hidden';

    // Focus the modal close button
    setTimeout(function () {
      if (modalClose) modalClose.focus();
    }, 300);

    // Keyboard: Escape closes
    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('modal-backdrop--visible');
    }
    if (productModal) {
      productModal.classList.remove('modal--visible');
    }

    // Wait for transition to finish, then hide
    setTimeout(function () {
      if (modalBackdrop) modalBackdrop.hidden = true;
      if (productModal)  productModal.hidden  = true;
    }, 300);

    document.body.style.overflow = '';
    state.activeModal = null;
    document.removeEventListener('keydown', handleModalKeydown);
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function populateModal(product) {
    var isOOS = product.status === 'out-of-stock';

    // Badges
    if (modalCategoryChip) modalCategoryChip.textContent = product.category;

    if (modalStockBadge) {
      modalStockBadge.textContent = isOOS ? 'SOLD' : 'IN STOCK';
      modalStockBadge.className = 'modal__stock-badge modal__stock-badge--' + (isOOS ? 'out-of-stock' : 'in-stock');
    }

    // Name
    if (modalProductName) modalProductName.textContent = product.name;

    // Price
    if (modalPrice) {
      modalPrice.textContent = product.price;
      modalPrice.className = 'modal__price' + (isOOS ? ' modal__price--oos' : '');
    }

    // Description
    if (modalDesc) modalDesc.textContent = product.description;

    // CTA
    if (modalCta) {
      if (isOOS) {
        modalCta.textContent = 'This Product Has Sold';
        modalCta.className = 'modal__cta modal__cta--oos';
        modalCta.disabled = true;
        modalCta.removeEventListener('click', handleCtaClick);
      } else {
        modalCta.textContent = 'BUY NOW';
        modalCta.className = 'modal__cta';
        modalCta.disabled = false;
        modalCta.removeEventListener('click', handleCtaClick);
        modalCta.addEventListener('click', handleCtaClick);
      }
    }

    // Images — screenshots (include coverImage as first if not duplicate)
    var screenshots = product.screenshots && product.screenshots.length > 0
      ? product.screenshots
      : [product.coverImage];

    // Main image
    if (modalMainImg) {
      modalMainImg.src = screenshots[0] || '';
      modalMainImg.alt = product.name + ' screenshot 1';
    }

    // Thumbnails
    if (modalThumbs) {
      modalThumbs.innerHTML = '';
      screenshots.forEach(function (url, idx) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = product.name + ' screenshot ' + (idx + 1);
        img.className = 'modal__thumb' + (idx === 0 ? ' modal__thumb--active' : '');
        img.setAttribute('role', 'listitem');
        img.setAttribute('tabindex', '0');
        img.addEventListener('click', function () { selectThumb(idx, screenshots); });
        img.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectThumb(idx, screenshots); }
        });
        modalThumbs.appendChild(img);
      });
    }
  }

  function handleCtaClick() {
    if (state.activeModal && state.activeModal.buyLink) {
      window.open(state.activeModal.buyLink, '_blank', 'noopener,noreferrer');
    }
  }

  function selectThumb(idx, screenshots) {
    state.activeThumb = idx;

    // Update main image with fade
    if (modalMainImg) {
      modalMainImg.classList.add('modal__main-img--fade');
      setTimeout(function () {
        modalMainImg.src = screenshots[idx] || '';
        modalMainImg.alt = (state.activeModal ? state.activeModal.name : 'Product') + ' screenshot ' + (idx + 1);
        modalMainImg.classList.remove('modal__main-img--fade');
      }, 150);
    }

    // Update active thumbnail
    if (modalThumbs) {
      var thumbs = modalThumbs.querySelectorAll('.modal__thumb');
      thumbs.forEach(function (t, i) {
        t.classList.toggle('modal__thumb--active', i === idx);
      });
    }
  }

  // ─── FILTER LOGIC ───────────────────────────────────────────

  function applyFilters() {
    renderGrid();
  }

  // Sync desktop and mobile filter states
  function syncCategoryPills(value) {
    state.category = value;

    // Desktop pills
    categoryPills.forEach(function (btn) {
      var isActive = btn.dataset.category === value;
      btn.classList.toggle('pill--active', isActive);
    });

    // Mobile sheet pills
    mobileCategoryPills.forEach(function (btn) {
      var isActive = btn.dataset.mobileCategory === value;
      btn.classList.toggle('pill--active', isActive);
    });
  }

  function syncStockBtns(value) {
    state.stock = value;

    stockBtns.forEach(function (btn) {
      btn.classList.toggle('stock-toggle__btn--active', btn.dataset.stock === value);
    });

    mobileStockBtns.forEach(function (btn) {
      btn.classList.toggle('stock-toggle__btn--active', btn.dataset.mobileStock === value);
    });
  }

  function syncSort(value) {
    state.sort = value;
    if (sortSelect)       sortSelect.value = value;
    if (mobileSortSelect) mobileSortSelect.value = value;
  }

  // ─── EVENT LISTENERS ────────────────────────────────────────

  function bindEvents() {

    // ── Nav Search (desktop) ──
    if (searchToggle && navSearchInput) {
      searchToggle.addEventListener('click', function () {
        var isOpen = navSearchInput.classList.contains('nav__search-input--open');
        if (isOpen) {
          navSearchInput.classList.remove('nav__search-input--open');
          navSearchInput.value = '';
          state.query = '';
          searchToggle.setAttribute('aria-expanded', 'false');
          applyFilters();
        } else {
          navSearchInput.classList.add('nav__search-input--open');
          searchToggle.setAttribute('aria-expanded', 'true');
          setTimeout(function () { navSearchInput.focus(); }, 260);
        }
      });

      navSearchInput.addEventListener('input', function () {
        state.query = navSearchInput.value.trim();
        applyFilters();
        // Mirror to mobile input if visible
        if (mobileSearchInput) mobileSearchInput.value = navSearchInput.value;
      });

      navSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          navSearchInput.classList.remove('nav__search-input--open');
          navSearchInput.value = '';
          state.query = '';
          searchToggle.setAttribute('aria-expanded', 'false');
          applyFilters();
        }
      });
    }

    // ── Nav Search (mobile) ──
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', function () {
        // On mobile, search icon shows inline search below nav
        // hamburger is separate; handled below
      });
    }

    // ── Mobile Search Input ──
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', function () {
        state.query = mobileSearchInput.value.trim();
        applyFilters();
      });
    }

    // ── Hamburger + Mobile Menu ──
    if (hamburgerBtn && mobileMenu) {
      hamburgerBtn.addEventListener('click', function () {
        mobileMenu.hidden = false;
        void mobileMenu.offsetWidth;
        mobileMenu.classList.add('mobile-menu--open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        // Focus the close button
        setTimeout(function () { if (menuClose) menuClose.focus(); }, 320);
      });
    }

    function closeMobileMenu() {
      if (mobileMenu) {
        mobileMenu.classList.remove('mobile-menu--open');
        setTimeout(function () { mobileMenu.hidden = true; }, 320);
      }
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    if (menuClose) {
      menuClose.addEventListener('click', closeMobileMenu);
    }

    // Mobile menu links close the menu
    if (mobileMenu) {
      mobileMenu.querySelectorAll('.mobile-menu__link').forEach(function (link) {
        link.addEventListener('click', closeMobileMenu);
      });

      // Keyboard: Escape closes
      mobileMenu.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMobileMenu();
      });
    }

    // ── Category Pills (desktop) ──
    categoryPills.forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncCategoryPills(btn.dataset.category);
        applyFilters();
      });
    });

    // ── Stock Toggle Buttons (desktop) ──
    stockBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        syncStockBtns(btn.dataset.stock);
        applyFilters();
      });
    });

    // ── Sort Dropdown (desktop) ──
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        syncSort(sortSelect.value);
        applyFilters();
      });
    }

    // ── Mobile Filter Sheet ──
    if (mobileFilterBtn && filterSheet) {
      mobileFilterBtn.addEventListener('click', function () {
        filterSheet.hidden = false;
        void filterSheet.offsetWidth;
        if (filterSheetBackdrop) filterSheetBackdrop.classList.add('filter-sheet__backdrop--visible');
        if (filterSheetPanel) filterSheetPanel.classList.add('filter-sheet__panel--open');
        mobileFilterBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      });
    }

    function closeFilterSheet() {
      if (filterSheetBackdrop) filterSheetBackdrop.classList.remove('filter-sheet__backdrop--visible');
      if (filterSheetPanel) filterSheetPanel.classList.remove('filter-sheet__panel--open');
      if (mobileFilterBtn) mobileFilterBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (filterSheet) filterSheet.hidden = true;
      }, 300);
    }

    if (filterSheetBackdrop) {
      filterSheetBackdrop.addEventListener('click', closeFilterSheet);
    }

    if (filterSheetClose) {
      filterSheetClose.addEventListener('click', closeFilterSheet);
    }

    // Mobile category pills in sheet
    mobileCategoryPills.forEach(function (btn) {
      btn.addEventListener('click', function () {
        mobileCategoryPills.forEach(function (b) { b.classList.remove('pill--active'); });
        btn.classList.add('pill--active');
      });
    });

    // Mobile stock btns in sheet
    mobileStockBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        mobileStockBtns.forEach(function (b) { b.classList.remove('stock-toggle__btn--active'); });
        btn.classList.add('stock-toggle__btn--active');
      });
    });

    // Apply button: sync sheet selections to state and apply
    if (filterSheetApply) {
      filterSheetApply.addEventListener('click', function () {
        // Read active mobile category pill
        var activeCatBtn = mobileCategoryPills.find(function (b) { return b.classList.contains('pill--active'); });
        if (activeCatBtn) syncCategoryPills(activeCatBtn.dataset.mobileCategory);

        // Read active mobile stock btn
        var activeStockBtn = mobileStockBtns.find(function (b) { return b.classList.contains('stock-toggle__btn--active'); });
        if (activeStockBtn) syncStockBtns(activeStockBtn.dataset.mobileStock);

        // Mobile sort
        if (mobileSortSelect) syncSort(mobileSortSelect.value);

        applyFilters();
        closeFilterSheet();
      });
    }

    // ── Modal Close ──
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', function (e) {
        // Only close if clicking the backdrop itself, not the modal
        if (e.target === modalBackdrop) closeModal();
      });
    }

  } // end bindEvents

  // ─── INIT ───────────────────────────────────────────────────

  function init() {
    // Render stats
    updateStats();

    // Render product grid
    renderGrid();

    // Render featured section
    renderFeatured();

    // Bind all event listeners
    bindEvents();

    // Mobile search below nav: show on mobile when hamburger area search icon tapped
    // For mobile, the search icon in nav__right is hidden; instead we show mobileSearch when
    // the nav search toggle (if visible) is used. On true mobile, search bar is always visible
    // via mobileSearch element. Show it by default on mobile.
    function checkMobileSearchVisibility() {
      if (window.innerWidth <= 560 && mobileSearch) {
        mobileSearch.hidden = false;
      } else if (window.innerWidth > 560 && mobileSearch) {
        mobileSearch.hidden = true;
      }
    }

    checkMobileSearchVisibility();
    window.addEventListener('resize', checkMobileSearchVisibility);

    // Listen for storage events so multiple tabs stay in sync
    window.addEventListener('storage', function (e) {
      if (e.key === 'vaultrix_products') {
        updateStats();
        renderGrid();
        renderFeatured();
      }
    });
  }

  // ─── BOOT ───────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
