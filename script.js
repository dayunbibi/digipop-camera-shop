"use strict";

/* =========================================================
   DigiPop Camera Shop
========================================================= */

const CART_STORAGE_KEY = "digipop-cart";
const ORDER_STORAGE_KEY = "digipop-last-order";
const WISHLIST_STORAGE_KEY = "digipop-wishlist";
const RECENTLY_VIEWED_STORAGE_KEY = "digipop-recently-viewed";

/*
  PRODUCTS is the single source of truth for all product data
  (id, name, brand, price, image, page, description, tag, search).
  It is defined in products.js, which every page loads via
  <script src="products.js"> before this file.
*/

/* =========================================================
   General Helpers
========================================================= */

function getCurrentFilename() {
  const pathname = window.location.pathname;

  const filename = pathname.substring(
    pathname.lastIndexOf("/") + 1
  );

  return filename || "index.html";
}

function isInsidePagesFolder() {
  return window.location.pathname.includes("/pages/");
}

function getImagePath(filename) {
  return isInsidePagesFolder()
    ? `../images/${filename}`
    : `images/${filename}`;
}

function getProductPagePath(filename) {
  return isInsidePagesFolder()
    ? filename
    : `pages/${filename}`;
}

function formatPrice(value) {
  return `$${Number(value)
    .toFixed(2)
    .replace(".00", "")}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function getProductIdFromFilename() {
  const filenameMap = {
    "sony-w830.html": "sony-w830",
    "sony-tx30.html": "sony-tx30",
    "canon-elph.html": "canon-elph",
    "nikon-s6900.html": "nikon-s6900"
  };

  return filenameMap[getCurrentFilename()] || null;
}

function getProductIdFromCard(card) {
  if (!card) {
    return null;
  }

  const detailsLink = card.querySelector(
    'a[href*="sony-w830.html"], ' +
    'a[href*="sony-tx30.html"], ' +
    'a[href*="canon-elph.html"], ' +
    'a[href*="nikon-s6900.html"]'
  );

  if (!detailsLink) {
    return null;
  }

  const href = detailsLink.getAttribute("href");

  if (!href) {
    return null;
  }

  const filename = href.split("/").pop();

  const filenameMap = {
    "sony-w830.html": "sony-w830",
    "sony-tx30.html": "sony-tx30",
    "canon-elph.html": "canon-elph",
    "nikon-s6900.html": "nikon-s6900"
  };

  return filenameMap[filename] || null;
}

/* =========================================================
   Product Listing Cards
========================================================= */

function createProductCardHTML(product, options) {
  const cardTag = options.cardTag;

  const searchAttribute = options.includeSearch
    ? ` data-search="${escapeHTML(product.search)}"`
    : "";

  return `
    <${cardTag} class="product-card"${searchAttribute}>
      <span class="tag">${escapeHTML(product.tag)}</span>

      <div class="product-img">
        <img
          src="${escapeHTML(getImagePath(product.image))}"
          alt="${escapeHTML(product.name)}"
        >
      </div>

      <h3>${escapeHTML(product.name)}</h3>

      <p class="brand">${escapeHTML(product.brand)}</p>

      <p class="price">${formatPrice(product.price)}</p>

      <p class="desc">
        ${escapeHTML(product.description.replace(/\.$/, ""))}
      </p>

      <a
        href="${escapeHTML(getProductPagePath(product.page))}"
        class="cart-btn"
      >
        View Details
      </a>
    </${cardTag}>
  `;
}

const PRODUCT_LISTING_PAGES = {
  "index.html": {
    selector: "#camera-product-grid",
    filter: () => true,
    cardTag: "article",
    includeSearch: true,
    mode: "prepend"
  },

  "sony.html": {
    selector: ".brand-product-grid",
    filter: (product) => product.brand === "Sony",
    cardTag: "div",
    includeSearch: false,
    mode: "replace"
  },

  "canon.html": {
    selector: ".brand-product-grid",
    filter: (product) => product.brand === "Canon",
    cardTag: "div",
    includeSearch: false,
    mode: "replace"
  },

  "nikon.html": {
    selector: ".brand-product-grid",
    filter: (product) => product.brand === "Nikon",
    cardTag: "div",
    includeSearch: false,
    mode: "replace"
  },

  "under-200.html": {
    selector: ".budget-product-grid",
    filter: (product) => product.price < 200,
    cardTag: "div",
    includeSearch: false,
    mode: "replace"
  },

  "under-300.html": {
    selector: ".budget-product-grid",
    filter: (product) => product.price < 300,
    cardTag: "div",
    includeSearch: false,
    mode: "replace"
  }
};

function renderProductListingCards() {
  const config =
    PRODUCT_LISTING_PAGES[getCurrentFilename()];

  if (!config) {
    return;
  }

  const container = document.querySelector(
    config.selector
  );

  if (!container) {
    return;
  }

  const cardsHTML = Object.values(PRODUCTS)
    .filter(config.filter)
    .map((product) => {
      return createProductCardHTML(product, {
        cardTag: config.cardTag,
        includeSearch: config.includeSearch
      });
    })
    .join("");

  if (config.mode === "prepend") {
    container.insertAdjacentHTML(
      "afterbegin",
      cardsHTML
    );
  } else {
    container.innerHTML = cardsHTML;
  }
}

/* =========================================================
   Cart Storage
========================================================= */

function getCart() {
  try {
    const savedCart = localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart.filter((item) => {
      return (
        item &&
        typeof item.id === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        PRODUCTS[item.id]
      );
    });
  } catch (error) {
    console.error("Failed to read cart:", error);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cart)
    );

    updateCartCount();
  } catch (error) {
    console.error("Failed to save cart:", error);
  }
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartCount();
}

function getCartItemCount() {
  return getCart().reduce((total, item) => {
    return total + item.quantity;
  }, 0);
}

function getCartSubtotal() {
  return getCart().reduce((total, item) => {
    const product = PRODUCTS[item.id];

    if (!product) {
      return total;
    }

    return total + product.price * item.quantity;
  }, 0);
}

function getDiscount(subtotal) {
  return subtotal >= 400 ? 20 : 0;
}

function getOrderTotals() {
  const subtotal = getCartSubtotal();
  const shipping = 0;
  const discount = getDiscount(subtotal);

  const total = Math.max(
    0,
    subtotal + shipping - discount
  );

  return {
    subtotal,
    shipping,
    discount,
    total
  };
}

/* =========================================================
   Cart Operations
========================================================= */

function addToCart(productId, quantity = 1) {
  const product = PRODUCTS[productId];

  if (!product) {
    console.error(`Unknown product: ${productId}`);
    return;
  }

  const safeQuantity = Math.max(
    1,
    Number.parseInt(quantity, 10) || 1
  );

  const cart = getCart();

  const existingItem = cart.find((item) => {
    return item.id === productId;
  });

  if (existingItem) {
    existingItem.quantity += safeQuantity;
  } else {
    cart.push({
      id: productId,
      quantity: safeQuantity
    });
  }

  saveCart(cart);

  showNotification(
    `${product.name} was added to your cart.`
  );
}

function changeCartQuantity(productId, amount) {
  const cart = getCart();

  const item = cart.find((cartItem) => {
    return cartItem.id === productId;
  });

  if (!item) {
    return;
  }

  item.quantity += amount;

  const updatedCart = cart.filter((cartItem) => {
    return cartItem.quantity > 0;
  });

  saveCart(updatedCart);
  renderCartPage();
  renderCheckoutSummary();
}

function removeFromCart(productId) {
  const updatedCart = getCart().filter((item) => {
    return item.id !== productId;
  });

  saveCart(updatedCart);
  renderCartPage();
  renderCheckoutSummary();
}

/* =========================================================
   Wishlist Storage
========================================================= */

function getWishlist() {
  try {
    const savedWishlist = localStorage.getItem(
      WISHLIST_STORAGE_KEY
    );

    if (!savedWishlist) {
      return [];
    }

    const parsedWishlist = JSON.parse(savedWishlist);

    if (!Array.isArray(parsedWishlist)) {
      return [];
    }

    return parsedWishlist.filter((productId) => {
      return (
        typeof productId === "string" &&
        PRODUCTS[productId]
      );
    });
  } catch (error) {
    console.error(
      "Failed to read wishlist:",
      error
    );

    return [];
  }
}

function saveWishlist(wishlist) {
  try {
    const uniqueWishlist = Array.from(
      new Set(wishlist)
    ).filter((productId) => {
      return PRODUCTS[productId];
    });

    localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(uniqueWishlist)
    );

    updateWishlistUI();
  } catch (error) {
    console.error(
      "Failed to save wishlist:",
      error
    );
  }
}

function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

function toggleWishlist(productId) {
  const product = PRODUCTS[productId];

  if (!product) {
    return;
  }

  const wishlist = getWishlist();

  const alreadySaved = wishlist.includes(
    productId
  );

  let updatedWishlist;

  if (alreadySaved) {
    updatedWishlist = wishlist.filter((id) => {
      return id !== productId;
    });

    showNotification(
      `${product.name} was removed from your wishlist.`
    );
  } else {
    updatedWishlist = [
      ...wishlist,
      productId
    ];

    showNotification(
      `${product.name} was added to your wishlist.`
    );
  }

  saveWishlist(updatedWishlist);

  document.dispatchEvent(
    new CustomEvent(
      "digipop:wishlist-changed"
    )
  );
}

/* =========================================================
   Recently Viewed Storage
========================================================= */

function getRecentlyViewed() {
  try {
    const savedItems = localStorage.getItem(
      RECENTLY_VIEWED_STORAGE_KEY
    );

    if (!savedItems) {
      return [];
    }

    const parsedItems = JSON.parse(savedItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.filter((productId) => {
      return (
        typeof productId === "string" &&
        PRODUCTS[productId]
      );
    });
  } catch (error) {
    console.error(
      "Failed to read recently viewed products:",
      error
    );

    return [];
  }
}

function saveRecentlyViewed(productIds) {
  try {
    const validItems = Array.from(
      new Set(productIds)
    )
      .filter((productId) => {
        return PRODUCTS[productId];
      })
      .slice(0, 4);

    localStorage.setItem(
      RECENTLY_VIEWED_STORAGE_KEY,
      JSON.stringify(validItems)
    );
  } catch (error) {
    console.error(
      "Failed to save recently viewed products:",
      error
    );
  }
}

function recordRecentlyViewed(productId) {
  if (!PRODUCTS[productId]) {
    return;
  }

  const currentItems = getRecentlyViewed();

  const updatedItems = [
    productId,
    ...currentItems.filter((id) => {
      return id !== productId;
    })
  ].slice(0, 4);

  saveRecentlyViewed(updatedItems);
}

function clearRecentlyViewed() {
  try {
    localStorage.removeItem(
      RECENTLY_VIEWED_STORAGE_KEY
    );

    renderRecentlyViewedSection();

    showNotification(
      "Recently viewed history was cleared."
    );
  } catch (error) {
    console.error(
      "Failed to clear recently viewed products:",
      error
    );
  }
}

/* =========================================================
   Header Counts
========================================================= */

function updateCartCount() {
  const itemCount = getCartItemCount();

  const cartLinks = document.querySelectorAll(
    'a[href$="cart.html"]'
  );

  cartLinks.forEach((link) => {
    link.textContent =
      itemCount > 0
        ? `Cart 🛒 (${itemCount})`
        : "Cart 🛒";

    link.setAttribute(
      "aria-label",
      itemCount > 0
        ? `Cart with ${itemCount} items`
        : "Cart"
    );
  });
}

function createWishlistNavigationLink() {
  const nav = document.querySelector(".nav");

  if (!nav) {
    return;
  }

  if (
    nav.querySelector(
      '[data-wishlist-nav="true"]'
    )
  ) {
    return;
  }

  const wishlistLink =
    document.createElement("a");

  wishlistLink.href = isInsidePagesFolder()
    ? "../index.html#products"
    : "#products";

  wishlistLink.dataset.wishlistNav = "true";
  wishlistLink.textContent = "Wishlist ♡";

  wishlistLink.addEventListener(
    "click",
    () => {
      try {
        sessionStorage.setItem(
          "digipop-open-wishlist",
          "true"
        );
      } catch (error) {
        console.error(
          "Failed to save wishlist navigation:",
          error
        );
      }
    }
  );

  const cartLink = nav.querySelector(
    'a[href$="cart.html"]'
  );

  if (cartLink) {
    nav.insertBefore(
      wishlistLink,
      cartLink
    );
  } else {
    nav.appendChild(wishlistLink);
  }
}

function updateWishlistNavigationCount() {
  const wishlistLink = document.querySelector(
    '[data-wishlist-nav="true"]'
  );

  if (!wishlistLink) {
    return;
  }

  const wishlistCount = getWishlist().length;

  wishlistLink.textContent =
    wishlistCount > 0
      ? `Wishlist ♥ (${wishlistCount})`
      : "Wishlist ♡";

  wishlistLink.setAttribute(
    "aria-label",
    wishlistCount > 0
      ? `Wishlist with ${wishlistCount} items`
      : "Wishlist"
  );
}

/* =========================================================
   Wishlist Buttons
========================================================= */

function createProductCardWishlistButtons() {
  const productCards =
    document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    if (
      card.querySelector(
        ".wishlist-card-btn"
      )
    ) {
      return;
    }

    const productId =
      getProductIdFromCard(card);

    if (!productId) {
      return;
    }

    card.dataset.productId = productId;

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "wishlist-card-btn";

    button.dataset.wishlistProduct =
      productId;

    card.appendChild(button);
  });
}

function createDetailWishlistButton() {
  const productId =
    getProductIdFromFilename();

  if (!productId) {
    return;
  }

  const detailButtons = document.querySelector(
    ".detail-buttons"
  );

  if (!detailButtons) {
    return;
  }

  if (
    detailButtons.querySelector(
      ".wishlist-detail-btn"
    )
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "btn secondary wishlist-detail-btn";

  button.dataset.wishlistProduct =
    productId;

  detailButtons.appendChild(button);
}

function updateWishlistButtons() {
  const wishlist = getWishlist();

  const wishlistButtons =
    document.querySelectorAll(
      "[data-wishlist-product]"
    );

  wishlistButtons.forEach((button) => {
    const productId =
      button.dataset.wishlistProduct;

    const product = PRODUCTS[productId];

    if (!product) {
      return;
    }

    const active =
      wishlist.includes(productId);

    button.classList.toggle(
      "is-wishlisted",
      active
    );

    button.setAttribute(
      "aria-pressed",
      String(active)
    );

    if (
      button.classList.contains(
        "wishlist-card-btn"
      )
    ) {
      button.textContent =
        active ? "♥" : "♡";

      button.setAttribute(
        "aria-label",
        active
          ? `Remove ${product.name} from wishlist`
          : `Add ${product.name} to wishlist`
      );
    }

    if (
      button.classList.contains(
        "wishlist-detail-btn"
      )
    ) {
      button.textContent =
        active
          ? "♥ Saved to Wishlist"
          : "♡ Add to Wishlist";
    }
  });
}

function updateWishlistUI() {
  updateWishlistNavigationCount();
  updateWishlistButtons();
}

function initializeWishlistActions() {
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-wishlist-product]"
      );

      if (!button) {
        return;
      }

      const productId =
        button.dataset.wishlistProduct;

      if (!PRODUCTS[productId]) {
        return;
      }

      toggleWishlist(productId);
    }
  );
}

/* =========================================================
   Product Detail
========================================================= */

function initializeProductDetailPage() {
  const productId =
    getProductIdFromFilename();

  if (!productId) {
    return;
  }

  recordRecentlyViewed(productId);

  const addButton = document.querySelector(
    ".detail-buttons .btn.primary"
  );

  if (addButton) {
    addButton.setAttribute("href", "#");
    addButton.setAttribute(
      "role",
      "button"
    );

    addButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        addToCart(productId);

        const originalText =
          addButton.textContent;

        addButton.textContent =
          "Added ✓";

        window.setTimeout(() => {
          addButton.textContent =
            originalText;
        }, 1400);
      }
    );
  }

  createDetailWishlistButton();
}

/* =========================================================
   Notification
========================================================= */

function showNotification(message) {
  document
    .querySelector(".cart-notification")
    ?.remove();

  const notification =
    document.createElement("div");

  notification.className =
    "cart-notification";

  notification.setAttribute(
    "role",
    "status"
  );

  notification.textContent = message;

  Object.assign(notification.style, {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: "9999",
    maxWidth: "340px",
    padding: "16px 20px",
    background: "#c7ff1a",
    color: "#111",
    border: "3px solid #111",
    borderRadius: "18px",
    boxShadow: "6px 6px 0 #111",
    fontWeight: "900",
    lineHeight: "1.4"
  });

  document.body.appendChild(
    notification
  );

  window.setTimeout(() => {
    notification.remove();
  }, 2200);
}

/* =========================================================
   Cart Page
========================================================= */

function createCartItemHTML(item) {
  const product = PRODUCTS[item.id];

  if (!product) {
    return "";
  }

  const itemTotal =
    product.price * item.quantity;

  return `
    <div
      class="cart-item"
      data-product-id="${escapeHTML(product.id)}"
    >
      <a
        href="${escapeHTML(product.page)}"
        class="cart-img"
      >
        <img
          src="${escapeHTML(getImagePath(product.image))}"
          alt="${escapeHTML(product.name)}"
        >
      </a>

      <div class="cart-info">
        <h2>
          <a href="${escapeHTML(product.page)}">
            ${escapeHTML(product.name)}
          </a>
        </h2>

        <p class="cart-brand">
          ${escapeHTML(product.brand)}
        </p>

        <p class="cart-desc">
          ${escapeHTML(product.description)}
        </p>

        <button
          type="button"
          class="remove-cart-item"
          data-action="remove"
          data-product-id="${escapeHTML(product.id)}"
        >
          Remove
        </button>
      </div>

      <div class="cart-qty">
        <span>Qty</span>

        <div class="quantity-controls">
          <button
            type="button"
            data-action="decrease"
            data-product-id="${escapeHTML(product.id)}"
            aria-label="Decrease quantity"
          >
            −
          </button>

          <strong>${item.quantity}</strong>

          <button
            type="button"
            data-action="increase"
            data-product-id="${escapeHTML(product.id)}"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div class="cart-price">
        ${formatPrice(itemTotal)}
      </div>
    </div>
  `;
}

function createCartSummaryHTML(totals) {
  const discountText =
    totals.discount > 0
      ? `-${formatPrice(totals.discount)}`
      : "$0";

  return `
    <h2>Order Summary</h2>

    <div class="summary-row">
      <span>Subtotal</span>
      <strong>
        ${formatPrice(totals.subtotal)}
      </strong>
    </div>

    <div class="summary-row">
      <span>Shipping</span>
      <strong>Free</strong>
    </div>

    <div class="summary-row">
      <span>Discount</span>
      <strong>${discountText}</strong>
    </div>

    <div class="summary-total">
      <span>Total</span>
      <strong>
        ${formatPrice(totals.total)}
      </strong>
    </div>

    <a
      href="checkout.html"
      class="checkout-btn"
    >
      Checkout
    </a>

    <a
      href="../index.html#products"
      class="continue-btn"
    >
      Continue Shopping
    </a>
  `;
}

function renderEmptyCart(
  cartItemsElement,
  cartSummaryElement
) {
  cartItemsElement.innerHTML = `
    <div class="empty-cart-message">
      <div class="empty-cart-icon">
        🛒
      </div>

      <h2>Your cart is empty</h2>

      <p>
        Add a cute digital camera
        to start your order.
      </p>

      <a
        href="../index.html#products"
        class="btn primary"
      >
        Shop Cameras
      </a>
    </div>
  `;

  cartSummaryElement.innerHTML = `
    <h2>Order Summary</h2>

    <div class="summary-total">
      <span>Total</span>
      <strong>$0</strong>
    </div>

    <a
      href="../index.html#products"
      class="continue-btn"
    >
      Shop Cameras
    </a>
  `;
}

function renderCartPage() {
  if (
    getCurrentFilename() !== "cart.html"
  ) {
    return;
  }

  const cartItemsElement =
    document.querySelector(
      ".cart-items"
    );

  const cartSummaryElement =
    document.querySelector(
      ".cart-summary"
    );

  if (
    !cartItemsElement ||
    !cartSummaryElement
  ) {
    return;
  }

  const cart = getCart();

  if (cart.length === 0) {
    renderEmptyCart(
      cartItemsElement,
      cartSummaryElement
    );

    return;
  }

  cartItemsElement.innerHTML = cart
    .map(createCartItemHTML)
    .join("");

  cartSummaryElement.innerHTML =
    createCartSummaryHTML(
      getOrderTotals()
    );
}

function initializeCartActions() {
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-action]"
      );

      if (!button) {
        return;
      }

      const action =
        button.dataset.action;

      const productId =
        button.dataset.productId;

      if (!PRODUCTS[productId]) {
        return;
      }

      if (action === "increase") {
        changeCartQuantity(
          productId,
          1
        );
      }

      if (action === "decrease") {
        changeCartQuantity(
          productId,
          -1
        );
      }

      if (action === "remove") {
        removeFromCart(productId);
      }
    }
  );
}

/* =========================================================
   Checkout Page
========================================================= */

function createCheckoutProductHTML(item) {
  const product = PRODUCTS[item.id];

  if (!product) {
    return "";
  }

  return `
    <div class="summary-product">
      <img
        src="${escapeHTML(getImagePath(product.image))}"
        alt="${escapeHTML(product.name)}"
      >

      <div>
        <h3>
          ${escapeHTML(product.name)}
        </h3>

        <p>Qty ${item.quantity}</p>
      </div>

      <strong>
        ${formatPrice(
          product.price * item.quantity
        )}
      </strong>
    </div>
  `;
}

function renderCheckoutSummary() {
  if (
    getCurrentFilename() !==
    "checkout.html"
  ) {
    return;
  }

  const summaryElement =
    document.querySelector(
      ".checkout-summary"
    );

  if (!summaryElement) {
    return;
  }

  const cart = getCart();

  if (cart.length === 0) {
    summaryElement.innerHTML = `
      <h2>Order Summary</h2>

      <p class="demo-note">
        Your cart is empty.
      </p>

      <a
        href="../index.html#products"
        class="place-order-btn"
      >
        Shop Cameras
      </a>

      <a
        href="cart.html"
        class="back-cart-btn"
      >
        Back to Cart
      </a>
    `;

    return;
  }

  const totals = getOrderTotals();

  const discountText =
    totals.discount > 0
      ? `-${formatPrice(totals.discount)}`
      : "$0";

  summaryElement.innerHTML = `
    <h2>Order Summary</h2>

    ${cart
      .map(createCheckoutProductHTML)
      .join("")}

    <div class="summary-line">
      <span>Subtotal</span>
      <strong>
        ${formatPrice(totals.subtotal)}
      </strong>
    </div>

    <div class="summary-line">
      <span>Shipping</span>
      <strong>Free</strong>
    </div>

    <div class="summary-line">
      <span>Discount</span>
      <strong>${discountText}</strong>
    </div>

    <div class="summary-total">
      <span>Total</span>
      <strong>
        ${formatPrice(totals.total)}
      </strong>
    </div>

    <a
      href="#"
      class="place-order-btn"
      id="place-order-button"
    >
      Place Order
    </a>

    <a
      href="cart.html"
      class="back-cart-btn"
    >
      Back to Cart
    </a>
  `;
}

function getCheckoutFieldValue(id) {
  return (
    document
      .getElementById(id)
      ?.value.trim() || ""
  );
}

function validateCheckoutForm() {
  const requiredFields = [
    ["first-name", "First name"],
    ["last-name", "Last name"],
    ["email", "Email address"],
    ["phone", "Phone number"],
    ["address", "Street address"],
    ["city", "City"],
    ["province", "Province or state"],
    ["postal", "Postal code"]
  ];

  for (
    const [id, label]
    of requiredFields
  ) {
    const field =
      document.getElementById(id);

    if (!field?.value.trim()) {
      window.alert(
        `${label} is required.`
      );

      field?.focus();

      return false;
    }
  }

  const emailField =
    document.getElementById("email");

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      emailField.value.trim()
    )
  ) {
    window.alert(
      "Enter a valid email address."
    );

    emailField.focus();

    return false;
  }

  return true;
}

function createOrderNumber() {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const randomNumber = Math.floor(
    1000 + Math.random() * 9000
  );

  return (
    `DP-${year}${month}${day}-` +
    `${randomNumber}`
  );
}

function placeOrder() {
  const cart = getCart();

  if (cart.length === 0) {
    window.alert(
      "Your cart is empty."
    );

    return;
  }

  if (!validateCheckoutForm()) {
    return;
  }

  const payment =
    document.querySelector(
      'input[name="payment"]:checked'
    );

  const order = {
    orderNumber: createOrderNumber(),
    createdAt: new Date().toISOString(),

    customer: {
      firstName:
        getCheckoutFieldValue(
          "first-name"
        ),

      lastName:
        getCheckoutFieldValue(
          "last-name"
        ),

      email:
        getCheckoutFieldValue(
          "email"
        ),

      phone:
        getCheckoutFieldValue(
          "phone"
        )
    },

    shippingAddress: {
      address:
        getCheckoutFieldValue(
          "address"
        ),

      city:
        getCheckoutFieldValue(
          "city"
        ),

      province:
        getCheckoutFieldValue(
          "province"
        ),

      postalCode:
        getCheckoutFieldValue(
          "postal"
        ),

      country:
        document
          .getElementById("country")
          ?.value || "Canada"
    },

    paymentMethod:
      payment?.value ||
      "demo-payment",

    items: cart,
    totals: getOrderTotals()
  };

  try {
    sessionStorage.setItem(
      ORDER_STORAGE_KEY,
      JSON.stringify(order)
    );
  } catch (error) {
    console.error(
      "Failed to save order:",
      error
    );

    return;
  }

  clearCart();

  window.location.href =
    "order-confirmation.html";
}

function initializeCheckoutPage() {
  if (
    getCurrentFilename() !==
    "checkout.html"
  ) {
    return;
  }

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "#place-order-button"
        );

      if (!button) {
        return;
      }

      event.preventDefault();
      placeOrder();
    }
  );
}

/* =========================================================
   Order Confirmation
========================================================= */

function getLastOrder() {
  try {
    const savedOrder =
      sessionStorage.getItem(
        ORDER_STORAGE_KEY
      );

    return savedOrder
      ? JSON.parse(savedOrder)
      : null;
  } catch (error) {
    console.error(
      "Failed to read order:",
      error
    );

    return null;
  }
}

function formatPaymentMethod(value) {
  const paymentMethods = {
    "credit-card": "Credit Card",
    paypal: "PayPal",
    "demo-payment": "Demo Payment"
  };

  return (
    paymentMethods[value] ||
    "Demo Payment"
  );
}

function renderOrderConfirmation() {
  if (
    getCurrentFilename() !==
    "order-confirmation.html"
  ) {
    return;
  }

  const order = getLastOrder();

  if (!order) {
    return;
  }

  const policyRows = Array.from(
    document.querySelectorAll(
      ".policy-row"
    )
  );

  const orderNumberRow =
    policyRows.find((row) => {
      return row.textContent.includes(
        "Order Number"
      );
    });

  const paymentRow =
    policyRows.find((row) => {
      return row.textContent.includes(
        "Payment"
      );
    });

  const orderNumberElement =
    orderNumberRow?.querySelector(
      "strong"
    );

  const paymentElement =
    paymentRow?.querySelector(
      "strong"
    );

  if (orderNumberElement) {
    orderNumberElement.textContent =
      `#${order.orderNumber}`;
  }

  if (paymentElement) {
    paymentElement.textContent =
      formatPaymentMethod(
        order.paymentMethod
      );
  }

  const summary =
    document.querySelector(
      ".checkout-summary"
    );

  if (!summary) {
    return;
  }

  const discountText =
    order.totals.discount > 0
      ? `-${formatPrice(
          order.totals.discount
        )}`
      : "$0";

  summary.innerHTML = `
    <h2>Order Summary</h2>

    ${order.items
      .map(createCheckoutProductHTML)
      .join("")}

    <div class="summary-line">
      <span>Subtotal</span>
      <strong>
        ${formatPrice(
          order.totals.subtotal
        )}
      </strong>
    </div>

    <div class="summary-line">
      <span>Shipping</span>
      <strong>Free</strong>
    </div>

    <div class="summary-line">
      <span>Discount</span>
      <strong>${discountText}</strong>
    </div>

    <div class="summary-total">
      <span>Total Paid</span>
      <strong>
        ${formatPrice(
          order.totals.total
        )}
      </strong>
    </div>

    <a
      href="../index.html"
      class="place-order-btn"
    >
      Back to Home
    </a>

    <a
      href="shipping.html"
      class="back-cart-btn"
    >
      View Shipping Info
    </a>
  `;
}

/* =========================================================
   Contact Form
========================================================= */

function initializeContactForm() {
  if (
    getCurrentFilename() !==
    "contact.html"
  ) {
    return;
  }

  const sendButton =
    document.querySelector(
      ".send-btn"
    );

  if (!sendButton) {
    return;
  }

  sendButton.addEventListener(
    "click",
    () => {
      const name =
        document.getElementById(
          "name"
        );

      const email =
        document.getElementById(
          "email"
        );

      const topic =
        document.getElementById(
          "topic"
        );

      const message =
        document.getElementById(
          "message"
        );

      if (!name?.value.trim()) {
        window.alert(
          "Enter your name."
        );

        name?.focus();

        return;
      }

      if (
        !email?.value.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.value.trim()
        )
      ) {
        window.alert(
          "Enter a valid email address."
        );

        email?.focus();

        return;
      }

      if (!topic?.value.trim()) {
        window.alert(
          "Enter a message topic."
        );

        topic?.focus();

        return;
      }

      if (!message?.value.trim()) {
        window.alert(
          "Enter your message."
        );

        message?.focus();

        return;
      }

      window.alert(
        "Your message was recorded for this demo."
      );

      name.value = "";
      email.value = "";
      topic.value = "";
      message.value = "";
    }
  );
}

/* =========================================================
   Recently Viewed Section
========================================================= */

function createRecentlyViewedCardHTML(
  productId
) {
  const product = PRODUCTS[productId];

  if (!product) {
    return "";
  }

  return `
    <article class="recent-product-card">
      <a
        href="${escapeHTML(
          getProductPagePath(product.page)
        )}"
        class="recent-product-image"
      >
        <img
          src="${escapeHTML(
            getImagePath(product.image)
          )}"
          alt="${escapeHTML(product.name)}"
        >
      </a>

      <div class="recent-product-info">
        <p class="recent-product-brand">
          ${escapeHTML(product.brand)}
        </p>

        <h3>
          ${escapeHTML(product.name)}
        </h3>

        <p class="recent-product-price">
          ${formatPrice(product.price)}
        </p>

        <a
          href="${escapeHTML(
            getProductPagePath(product.page)
          )}"
          class="recent-product-link"
        >
          View Again
        </a>
      </div>
    </article>
  `;
}

function createRecentlyViewedSection() {
  if (getCurrentFilename() !== "index.html") {
    return null;
  }

  let section = document.getElementById(
    "recently-viewed"
  );

  if (section) {
    return section;
  }

  const reviewsSection =
    document.querySelector(".reviews");

  const productsSection =
    document.getElementById("products");

  if (!reviewsSection && !productsSection) {
    return null;
  }

  section = document.createElement("section");

  section.className =
    "section recently-viewed-section";

  section.id = "recently-viewed";

  section.innerHTML = `
    <div class="recently-viewed-heading">
      <div>
        <h2>Recently Viewed</h2>

        <p class="section-subtitle">
          Cameras you looked at recently
        </p>
      </div>

      <button
        type="button"
        class="recent-clear-btn"
        id="recent-clear-btn"
      >
        Clear History
      </button>
    </div>

    <div
      class="recent-products-grid"
      id="recent-products-grid"
    ></div>
  `;

  if (reviewsSection) {
    reviewsSection.parentNode.insertBefore(
      section,
      reviewsSection
    );
  } else {
    productsSection.insertAdjacentElement(
      "afterend",
      section
    );
  }

  return section;
}

function renderRecentlyViewedSection() {
  if (getCurrentFilename() !== "index.html") {
    return;
  }

  const recentlyViewed =
    getRecentlyViewed();

  let section = document.getElementById(
    "recently-viewed"
  );

  if (recentlyViewed.length === 0) {
    if (section) {
      section.hidden = true;
    }

    return;
  }

  section =
    section ||
    createRecentlyViewedSection();

  if (!section) {
    return;
  }

  section.hidden = false;

  const grid = section.querySelector(
    "#recent-products-grid"
  );

  if (!grid) {
    return;
  }

  grid.innerHTML = recentlyViewed
    .map(createRecentlyViewedCardHTML)
    .join("");

  const clearButton = section.querySelector(
    "#recent-clear-btn"
  );

  if (
    clearButton &&
    !clearButton.dataset.initialized
  ) {
    clearButton.dataset.initialized =
      "true";

    clearButton.addEventListener(
      "click",
      clearRecentlyViewed
    );
  }
}

/* =========================================================
   Dynamic Styles
========================================================= */

function addDynamicStyles() {
  if (
    document.getElementById(
      "digipop-dynamic-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "digipop-dynamic-styles";

  style.textContent = `
    .product-card {
      position: relative;
    }

    .wishlist-card-btn {
      position: absolute;
      top: 18px;
      left: 18px;
      z-index: 5;

      width: 48px;
      height: 48px;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #ffffff;
      color: #111;

      border: 3px solid #111;
      border-radius: 50%;
      box-shadow: 4px 4px 0 #111;

      font-size: 25px;
      font-family: inherit;
      font-weight: 900;

      cursor: pointer;
      transition: 0.2s;
    }

    .wishlist-card-btn:hover {
      transform: translateY(-3px);
      background: #ffe1f2;
    }

    .wishlist-card-btn.is-wishlisted {
      background: #ff4fb8;
      color: #ffffff;
    }

    .wishlist-detail-btn {
      cursor: pointer;
      font-family: inherit;
    }

    .wishlist-detail-btn.is-wishlisted {
      background: #ffb3df;
      color: #111;
    }

    .camera-filter {
      max-width: 900px;
      margin: 0 auto 28px;
      padding: 26px;

      background: #ffffff;
      border: 3px solid #111;
      border-radius: 28px;
      box-shadow: 8px 8px 0 #111;
    }

    .camera-filter h3 {
      margin-bottom: 20px;
      font-size: 24px;
      text-align: center;
    }

    .filter-groups {
      display: grid;
      grid-template-columns:
        1fr 1fr auto auto;

      gap: 16px;
      align-items: end;
    }

    .filter-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 900;
    }

    .filter-group select {
      width: 100%;
      padding: 14px 16px;

      background: #fff7fb;
      border: 3px solid #111;
      border-radius: 16px;

      font: inherit;
      font-weight: 800;

      outline: none;
      cursor: pointer;
    }

    .filter-reset,
    .wishlist-filter-btn {
      padding: 14px 18px;

      border: 3px solid #111;
      border-radius: 16px;

      font: inherit;
      font-weight: 900;

      cursor: pointer;
      transition: 0.2s;
    }

    .filter-reset {
      background: #c7ff1a;
      color: #111;
    }

    .wishlist-filter-btn {
      background: #ffffff;
      color: #111;
    }

    .wishlist-filter-btn.is-active {
      background: #ff4fb8;
      color: #ffffff;
    }

    .filter-reset:hover,
    .wishlist-filter-btn:hover {
      transform: translateY(-2px);
    }

    .recently-viewed-section {
      background: #fff0fa;
      border-top: 3px solid #111;
      border-bottom: 3px solid #111;
    }

    .recently-viewed-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 42px;
    }

    .recently-viewed-heading h2 {
      text-align: left;
      margin-bottom: 10px;
    }

    .recently-viewed-heading
    .section-subtitle {
      margin-bottom: 0;
      text-align: left;
    }

    .recent-clear-btn {
      flex-shrink: 0;
      padding: 13px 20px;

      background: #ffffff;
      color: #111;

      border: 3px solid #111;
      border-radius: 999px;

      font-family: inherit;
      font-size: 15px;
      font-weight: 900;

      cursor: pointer;
      transition: 0.2s;
    }

    .recent-clear-btn:hover {
      background: #111;
      color: #ffffff;
      transform: translateY(-3px);
    }

    .recent-products-grid {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));

      gap: 28px;
    }

    .recent-product-card {
      overflow: hidden;

      background: #ffffff;
      border: 3px solid #111;
      border-radius: 26px;
      box-shadow: 7px 7px 0 #111;

      transition: 0.2s;
    }

    .recent-product-card:hover {
      transform: translateY(-5px);
    }

    .recent-product-image {
      height: 190px;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 18px;

      background: #f4f4f4;
      border-bottom: 3px solid #111;
    }

    .recent-product-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .recent-product-info {
      padding: 22px;
    }

    .recent-product-brand {
      margin-bottom: 7px;

      color: #ff4fb8;
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .recent-product-info h3 {
      min-height: 52px;
      margin-bottom: 10px;

      font-size: 21px;
      line-height: 1.2;
    }

    .recent-product-price {
      margin-bottom: 18px;

      font-size: 25px;
      font-weight: 900;
    }

    .recent-product-link {
      display: block;

      padding: 12px 16px;

      background: #ff4fb8;
      color: #ffffff;

      border: 3px solid #111;
      border-radius: 999px;

      text-align: center;
      text-decoration: none;
      font-weight: 900;

      transition: 0.2s;
    }

    .recent-product-link:hover {
      background: #111;
      transform: translateY(-2px);
    }

    @media (max-width: 1100px) {
      .recent-products-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 950px) {
      .filter-groups {
        grid-template-columns:
          1fr 1fr;
      }
    }

    @media (max-width: 760px) {
      .camera-filter {
        padding: 22px;
        border-radius: 24px;
        box-shadow: 6px 6px 0 #111;
      }

      .filter-groups {
        grid-template-columns: 1fr;
      }

      .filter-reset,
      .wishlist-filter-btn {
        width: 100%;
      }

      .wishlist-card-btn {
        width: 44px;
        height: 44px;
        font-size: 23px;
      }

      .recently-viewed-heading {
        flex-direction: column;
        align-items: stretch;
        margin-bottom: 34px;
      }

      .recently-viewed-heading h2,
      .recently-viewed-heading
      .section-subtitle {
        text-align: center;
      }

      .recent-clear-btn {
        width: 100%;
      }

      .recent-products-grid {
        grid-template-columns: 1fr;
      }

      .recent-product-image {
        height: 230px;
      }

      .recent-product-info h3 {
        min-height: auto;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   Search, Filter and Wishlist View
========================================================= */

function initializeCameraSearchAndFilter() {
  const searchBox =
    document.querySelector(
      ".camera-search"
    );

  const searchInput =
    document.getElementById(
      "camera-search-input"
    );

  const clearButton =
    document.getElementById(
      "camera-search-clear"
    );

  const status =
    document.getElementById(
      "camera-search-status"
    );

  const emptyMessage =
    document.getElementById(
      "camera-search-empty"
    );

  const cards = Array.from(
    document.querySelectorAll(
      "#camera-product-grid .product-card"
    )
  );

  if (
    !searchBox ||
    !searchInput ||
    !clearButton ||
    !status ||
    !emptyMessage ||
    cards.length === 0
  ) {
    return;
  }

  const filterContainer =
    document.createElement("div");

  filterContainer.className =
    "camera-filter";

  filterContainer.innerHTML = `
    <h3>Filter Cameras</h3>

    <div class="filter-groups">
      <div class="filter-group">
        <label for="brand-filter">
          Brand
        </label>

        <select id="brand-filter">
          <option value="all">
            All Brands
          </option>

          <option value="sony">
            Sony
          </option>

          <option value="canon">
            Canon
          </option>

          <option value="nikon">
            Nikon
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="price-filter">
          Maximum Price
        </label>

        <select id="price-filter">
          <option value="all">
            All Prices
          </option>

          <option value="200">
            Under $200
          </option>

          <option value="300">
            Under $300
          </option>

          <option value="500">
            Under $500
          </option>
        </select>
      </div>

      <button
        type="button"
        class="wishlist-filter-btn"
        id="wishlist-filter-btn"
        aria-pressed="false"
      >
        ♡ Show Wishlist
      </button>

      <button
        type="button"
        class="filter-reset"
        id="filter-reset"
      >
        Reset Filters
      </button>
    </div>
  `;

  searchBox.parentNode.insertBefore(
    filterContainer,
    searchBox
  );

  const brandFilter =
    document.getElementById(
      "brand-filter"
    );

  const priceFilter =
    document.getElementById(
      "price-filter"
    );

  const wishlistFilterButton =
    document.getElementById(
      "wishlist-filter-btn"
    );

  const resetButton =
    document.getElementById(
      "filter-reset"
    );

  let wishlistOnly = false;

  const productData = cards
    .map((card) => {
      const productId =
        getProductIdFromCard(card);

      const product =
        PRODUCTS[productId];

      if (!product) {
        return null;
      }

      return {
        card,
        productId,
        brand:
          product.brand.toLowerCase(),
        price: product.price
      };
    })
    .filter(Boolean);

  function applyFilters() {
    const query = normalizeSearchText(
      searchInput.value
    );

    const selectedBrand =
      brandFilter.value;

    const selectedPrice =
      priceFilter.value;

    const wishlist = getWishlist();

    let visibleCount = 0;

    productData.forEach((item) => {
      const searchableText =
        normalizeSearchText(
          item.card.dataset.search ||
          item.card.textContent
        );

      const matchesSearch =
        query === "" ||
        searchableText.includes(query);

      const matchesBrand =
        selectedBrand === "all" ||
        item.brand === selectedBrand;

      const matchesPrice =
        selectedPrice === "all" ||
        item.price <=
          Number(selectedPrice);

      const matchesWishlist =
        !wishlistOnly ||
        wishlist.includes(
          item.productId
        );

      const visible =
        matchesSearch &&
        matchesBrand &&
        matchesPrice &&
        matchesWishlist;

      item.card.hidden = !visible;

      if (visible) {
        visibleCount += 1;
      }
    });

    emptyMessage.classList.toggle(
      "is-visible",
      visibleCount === 0
    );

    if (wishlistOnly) {
      emptyMessage.querySelector(
        "h3"
      ).textContent =
        "No wishlist cameras found";

      emptyMessage.querySelector(
        "p"
      ).textContent =
        "Add cameras to your wishlist or reset the filters.";
    } else {
      emptyMessage.querySelector(
        "h3"
      ).textContent =
        "No cameras found";

      emptyMessage.querySelector(
        "p"
      ).textContent =
        "Try another brand, price range, or search term.";
    }

    const cameraWord =
      visibleCount === 1
        ? "camera"
        : "cameras";

    status.textContent =
      wishlistOnly
        ? `Showing ${visibleCount} wishlist ${cameraWord}`
        : `Showing ${visibleCount} ${cameraWord}`;
  }

  searchInput.addEventListener(
    "input",
    applyFilters
  );

  brandFilter.addEventListener(
    "change",
    applyFilters
  );

  priceFilter.addEventListener(
    "change",
    applyFilters
  );

  clearButton.addEventListener(
    "click",
    () => {
      searchInput.value = "";
      applyFilters();
      searchInput.focus();
    }
  );

  wishlistFilterButton.addEventListener(
    "click",
    () => {
      wishlistOnly =
        !wishlistOnly;

      wishlistFilterButton.classList.toggle(
        "is-active",
        wishlistOnly
      );

      wishlistFilterButton.setAttribute(
        "aria-pressed",
        String(wishlistOnly)
      );

      wishlistFilterButton.textContent =
        wishlistOnly
          ? "♥ Showing Wishlist"
          : "♡ Show Wishlist";

      applyFilters();
    }
  );

  resetButton.addEventListener(
    "click",
    () => {
      searchInput.value = "";
      brandFilter.value = "all";
      priceFilter.value = "all";
      wishlistOnly = false;

      wishlistFilterButton.classList.remove(
        "is-active"
      );

      wishlistFilterButton.setAttribute(
        "aria-pressed",
        "false"
      );

      wishlistFilterButton.textContent =
        "♡ Show Wishlist";

      applyFilters();
    }
  );

  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        searchInput.value = "";
        applyFilters();
      }
    }
  );

  document.addEventListener(
    "digipop:wishlist-changed",
    applyFilters
  );

  try {
    const shouldOpenWishlist =
      sessionStorage.getItem(
        "digipop-open-wishlist"
      ) === "true";

    if (shouldOpenWishlist) {
      wishlistOnly = true;

      wishlistFilterButton.classList.add(
        "is-active"
      );

      wishlistFilterButton.setAttribute(
        "aria-pressed",
        "true"
      );

      wishlistFilterButton.textContent =
        "♥ Showing Wishlist";

      sessionStorage.removeItem(
        "digipop-open-wishlist"
      );
    }
  } catch (error) {
    console.error(
      "Failed to open wishlist filter:",
      error
    );
  }

  applyFilters();
}

/* =========================================================
   Initialize App
========================================================= */

function initializeApp() {
  addDynamicStyles();

  renderProductListingCards();

  createWishlistNavigationLink();
  createProductCardWishlistButtons();

  updateCartCount();
  updateWishlistUI();

  initializeWishlistActions();
  initializeProductDetailPage();
  initializeCartActions();

  renderCartPage();
  renderCheckoutSummary();

  initializeCheckoutPage();
  renderOrderConfirmation();
  initializeContactForm();

  initializeCameraSearchAndFilter();
  renderRecentlyViewedSection();

  updateWishlistUI();
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);