// =========================================
// // 6. CUSTOM CONFIRM DIALOG
// =========================================
async function showConfirm(title, message, type = "warning") {
  return new Promise((resolve) => {
    const old = document.querySelector(".custom-confirm-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "custom-confirm-overlay";
    overlay.innerHTML = `
      <div class="custom-confirm-box">
        <div class="custom-confirm-icon">${icon(type === "danger" ? "trash-2" : "triangle-alert", "icon-lg")}</div>
        <div class="custom-confirm-title">${escHtml(title)}</div>
        <div class="custom-confirm-message">${escHtml(message)}</div>
        <div class="custom-confirm-actions">
          <button class="btn btn-primary" id="confirmYes">Ya</button>
          <button class="btn btn-danger" id="confirmNo">Batal</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    refreshIcons();
    setTimeout(() => overlay.classList.add("active"), 10);

    const close = (res) => {
      overlay.classList.remove("active");
      setTimeout(() => overlay.remove(), 200);
      resolve(res);
    };

    document.getElementById("confirmYes").onclick = () => close(true);
    document.getElementById("confirmNo").onclick = () => close(false);
  });
}

// =========================================
// // 7. SKELETON LOADING HELPERS
// =========================================

/**
 * Shows skeleton placeholders inside a container element.
 * @param {string|HTMLElement} containerId - Container element ID or element
 * @param {string} type - 'card', 'list', 'text', 'block', 'row'
 * @param {number} count - Number of skeleton items
 */
function showSkeleton(containerId, type = "card", count = 3) {
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
  if (!container) return;

  let html = "";

  if (type === "card") {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton skeleton-card"></div>`;
    }
  } else if (type === "list") {
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-row">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex:1">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>`;
    }
  } else if (type === "text") {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton skeleton-text ${i === count - 1 ? "short" : "long"}"></div>`;
    }
  } else if (type === "block") {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton skeleton-block"></div>`;
    }
  } else if (type === "row") {
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton skeleton-row" style="height:60px;border-radius:12px;"></div>`;
    }
  } else if (type === "stat") {
    for (let i = 0; i < count; i++) {
      html += `
        <div class="glass p-6">
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton skeleton-heading" style="width:40%;height:2.5rem;margin-top:0.5rem;"></div>
        </div>`;
    }
  } else if (type === "schedule") {
    for (let i = 0; i < count; i++) {
      html += `
        <div class="item-row">
          <div class="skeleton skeleton-text" style="width:60%"></div>
          <div class="skeleton skeleton-text short" style="width:30%;margin-top:0.5rem;"></div>
          <div class="skeleton skeleton-text short" style="width:20%;margin-top:0.5rem;"></div>
        </div>`;
    }
  }

  container.innerHTML = html;
}

/**
 * Hides skeleton and shows real content
 * @param {string|HTMLElement} containerId
 * @param {string} contentHtml
 */
function hideSkeleton(containerId, contentHtml = "") {
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
  if (!container) return;
  container.innerHTML = contentHtml;
}

// =========================================
// // 8. PAGINATION UTILITY
// =========================================

/**
 * Creates paginated view for a data array
 * @param {Array} data - Full data array
 * @param {number} page - Current page (0-indexed)
 * @param {number} perPage - Items per page
 * @returns {{ items: Array, total: number, page: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
function paginate(data, page = 0, perPage = 10) {
  const total = data.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * perPage;
  const end = Math.min(start + perPage, total);
  return {
    items: data.slice(start, end),
    total,
    page: safePage,
    totalPages,
    hasNext: safePage < totalPages - 1,
    hasPrev: safePage > 0,
    start: start + 1,
    end,
  };
}

/**
 * Renders pagination controls
 * @param {number} page - Current page (0-indexed)
 * @param {number} totalPages - Total pages
 * @param {function} onPageChange - Callback with new page number
 * @returns {string} HTML string
 */
function renderPagination(page, totalPages, onPageChange) {
  if (totalPages <= 1) return "";

  let html = '<div class="pagination">';

  // Previous
  html += `<button onclick="window._paginateTo(${page - 1})" ${page === 0 ? "disabled" : ""}>${icon("chevron-left")}</button>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(0, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(0, endPage - maxVisible + 1);
  }

  if (startPage > 0) {
    html += `<button onclick="window._paginateTo(0)">1</button>`;
    if (startPage > 1) html += `<span class="page-info">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button onclick="window._paginateTo(${i})" class="${i === page ? "active" : ""}">${i + 1}</button>`;
  }

  if (endPage < totalPages - 1) {
    if (endPage < totalPages - 2) html += `<span class="page-info">...</span>`;
    html += `<button onclick="window._paginateTo(${totalPages - 1})">${totalPages}</button>`;
  }

  // Next
  html += `<button onclick="window._paginateTo(${page + 1})" ${page >= totalPages - 1 ? "disabled" : ""}>${icon("chevron-right")}</button>`;

  html += `<span class="page-info">${page * 10 + 1}ΓÇô${Math.min((page + 1) * 10, (page + 1) * 10)} dari ${totalPages * 10 > total ? total : (page + 1) * 10 > total ? total : (page + 1) * 10}</span>`;

  html += "</div>";
  return html;
}

// Global pagination callback registry
window._paginateTo = function (page) {
  if (window._onPaginate) window._onPaginate(page);
};

/**
 * Sets the pagination callback
 * @param {function} cb - Callback receiving (page: number)
 */
function setPaginationCallback(cb) {
  window._onPaginate = cb;
}

// =========================================
// // 9. SEARCH/FILTER UTILITY
// =========================================

/**
 * Filters an array of objects by searching multiple fields
 * @param {Array} data - Array of objects
 * @param {string} query - Search query
 * @param {Array<string>} fields - Field names to search in
 * @returns {Array} Filtered array
 */
function searchData(data, query, fields = ["full_name", "title"]) {
  if (!query || !query.trim()) return data;
  const q = query.toLowerCase().trim();
  return data.filter((item) =>
    fields.some((field) => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(q);
    }),
  );
}

/**
 * Creates a search input with filter functionality
 * @param {string} placeholder - Input placeholder
 * @param {function} onSearch - Callback with (query: string)
 * @returns {string} HTML string
 */
function renderSearchInput(placeholder = "Cari...", onSearch) {
  const id = "searchInput_" + Math.random().toString(36).slice(2, 8);
  // Debounced search
  const handler = `clearTimeout(window._searchTimer); window._searchTimer = setTimeout(() => { document.dispatchEvent(new CustomEvent('search-${id}', { detail: document.getElementById('${id}').value })) }, 300)`;
  return `<div class="search-wrapper">
    <span class="search-icon">${icon("search")}</span>
    <input type="text" id="${id}" placeholder="${escHtml(placeholder)}" class="input-field px-4 py-3 rounded-lg" oninput="${handler}" style="padding-left:40px;">
  </div>`;
}

