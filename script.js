const year = document.querySelector('#year');
if (year) {
  year.textContent = new Date().getFullYear();
}

const quoteForm = document.querySelector('#quote-form');
const formMessage = document.querySelector('#form-message');

if (quoteForm && formMessage) {
  quoteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(quoteForm);
    const customerName = formData.get('name')?.toString().trim() || 'there';

    formMessage.textContent = `Thanks, ${customerName}! Your request has been received. We will contact you shortly.`;
    quoteForm.reset();
  });
}

const PRODUCTS_STORAGE_KEY = 'ampedup_products';
const ADMIN_SESSION_KEY = 'ampedup_admin_logged_in';
const DEFAULT_ADMIN_USERNAME = 'Adm1n';
const DEFAULT_ADMIN_PASSWORD = '!2345678';

const defaultProducts = [
  {
    name: 'Smart Panel Upgrade Kit',
    category: 'Panel Systems',
    price: 'From $1,499',
    description: 'Modern, app-enabled load management panel upgrade for safer and smarter power distribution.'
  },
  {
    name: 'Level 2 EV Charger Bundle',
    category: 'EV Charging',
    price: 'From $699',
    description: 'High-speed home charging package with permit-ready installation and circuit protection.'
  },
  {
    name: 'Whole-Home Surge Protection',
    category: 'Safety',
    price: 'From $349',
    description: 'Protect appliances and electronics from voltage spikes with layered surge defense.'
  }
];

const productsGrid = document.querySelector('#products-grid');
const adminProductsList = document.querySelector('#admin-products-list');
const adminEditorWrap = document.querySelector('#admin-editor-wrap');
const adminLoginForm = document.querySelector('#admin-login-form');
const adminProductForm = document.querySelector('#admin-product-form');
const adminLoginMessage = document.querySelector('#admin-login-message');
const adminProductMessage = document.querySelector('#admin-product-message');
const adminLogoutButton = document.querySelector('#admin-logout');
const clearProductsButton = document.querySelector('#clear-products');

function getProducts() {
  const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!storedProducts) {
    return defaultProducts;
  }

  try {
    const parsed = JSON.parse(storedProducts);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

function renderProducts() {
  if (!productsGrid) {
    return;
  }

  const products = getProducts();

  productsGrid.innerHTML = products
    .map(
      (product) => `
      <article class="card product-card">
        <div class="product-meta">
          <span class="product-category">${product.category}</span>
          <span class="product-price">${product.price}</span>
        </div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
      </article>
    `
    )
    .join('');
}

function renderAdminProductList() {
  if (!adminProductsList) {
    return;
  }

  const products = getProducts();
  adminProductsList.innerHTML = products
    .map((product) => `<li><strong>${product.name}</strong> (${product.category}) — ${product.price}</li>`)
    .join('');
}

function setAdminStatus(isLoggedIn) {
  if (!adminEditorWrap) {
    return;
  }

  adminEditorWrap.hidden = !isLoggedIn;
  localStorage.setItem(ADMIN_SESSION_KEY, isLoggedIn ? 'true' : 'false');
}

function showMessage(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('status-error', isError);
}

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const username = formData.get('username')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (username === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD) {
      setAdminStatus(true);
      showMessage(adminLoginMessage, 'Login successful. You can now update product content.');
      adminLoginForm.reset();
      renderAdminProductList();
      return;
    }

    setAdminStatus(false);
    showMessage(adminLoginMessage, 'Invalid username or password.', true);
  });
}

if (adminProductForm) {
  adminProductForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (localStorage.getItem(ADMIN_SESSION_KEY) !== 'true') {
      showMessage(adminProductMessage, 'Please login before updating products.', true);
      return;
    }

    const formData = new FormData(adminProductForm);
    const newProduct = {
      name: formData.get('name')?.toString().trim(),
      category: formData.get('category')?.toString().trim(),
      price: formData.get('price')?.toString().trim(),
      description: formData.get('description')?.toString().trim()
    };

    const hasEmptyValue = Object.values(newProduct).some((value) => !value);
    if (hasEmptyValue) {
      showMessage(adminProductMessage, 'Please complete all product fields.', true);
      return;
    }

    const products = getProducts();
    products.unshift(newProduct);
    saveProducts(products);

    renderProducts();
    renderAdminProductList();
    adminProductForm.reset();
    showMessage(adminProductMessage, 'Product added and published to the website.');
  });
}

if (clearProductsButton) {
  clearProductsButton.addEventListener('click', () => {
    saveProducts(defaultProducts);
    renderProducts();
    renderAdminProductList();
    showMessage(adminProductMessage, 'Products reset to defaults.');
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener('click', () => {
    setAdminStatus(false);
    showMessage(adminLoginMessage, 'Logged out successfully.');
    showMessage(adminProductMessage, '');
  });
}

renderProducts();
renderAdminProductList();
setAdminStatus(localStorage.getItem(ADMIN_SESSION_KEY) === 'true');
