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

const defaultProducts = [
  {
    name: 'Smart Panel Upgrade',
    description: 'Increase capacity, safety, and monitoring with a modern smart-ready panel.'
  },
  {
    name: 'EV Fast Charger Bundle',
    description: 'Level 2 charger + dedicated circuit + permit assistance for reliable home charging.'
  },
  {
    name: 'Whole-Home Surge Shield',
    description: 'Protect electronics and appliances from sudden voltage spikes and outages.'
  }
];

const storageKey = 'amped-products';
const adminSessionKey = 'amped-admin-auth';
const adminUsername = 'Adm1n';
const adminPassword = '!2345678';

const productList = document.querySelector('#product-list');
const adminModal = document.querySelector('#admin-modal');
const adminOpenBtn = document.querySelector('#admin-open');
const adminCloseBtn = document.querySelector('#admin-close');
const adminLoginForm = document.querySelector('#admin-login');
const adminProductsForm = document.querySelector('#admin-products');
const adminLogoutBtn = document.querySelector('#admin-logout');
const adminMessage = document.querySelector('#admin-message');

const loadProducts = () => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return defaultProducts;
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed;
    }
  } catch {
    return defaultProducts;
  }

  return defaultProducts;
};

const saveProducts = (products) => {
  localStorage.setItem(storageKey, JSON.stringify(products));
};

const renderProducts = () => {
  if (!productList) {
    return;
  }

  const products = loadProducts();
  productList.innerHTML = '';

  products.forEach((product) => {
    const article = document.createElement('article');
    article.className = 'product-card';
    article.innerHTML = `<h3>${product.name}</h3><p>${product.description}</p>`;
    productList.append(article);
  });
};

const isAdminAuthenticated = () => localStorage.getItem(adminSessionKey) === 'true';

const setAdminState = (authenticated) => {
  if (!adminLoginForm || !adminProductsForm || !adminMessage) {
    return;
  }

  adminLoginForm.hidden = authenticated;
  adminProductsForm.hidden = !authenticated;
  adminMessage.textContent = authenticated
    ? 'Logged in. Update product cards and click save.'
    : 'Sign in to manage product cards.';
  adminMessage.className = authenticated ? 'success' : '';
};

const openAdminModal = () => {
  if (!adminModal) {
    return;
  }

  adminModal.hidden = false;
  const authenticated = isAdminAuthenticated();
  setAdminState(authenticated);

  if (authenticated && adminProductsForm) {
    const products = loadProducts();
    adminProductsForm.elements.name1.value = products[0].name;
    adminProductsForm.elements.desc1.value = products[0].description;
    adminProductsForm.elements.name2.value = products[1].name;
    adminProductsForm.elements.desc2.value = products[1].description;
    adminProductsForm.elements.name3.value = products[2].name;
    adminProductsForm.elements.desc3.value = products[2].description;
  }
};

const closeAdminModal = () => {
  if (adminModal) {
    adminModal.hidden = true;
  }
};

if (adminOpenBtn) {
  adminOpenBtn.addEventListener('click', openAdminModal);
}

if (adminCloseBtn) {
  adminCloseBtn.addEventListener('click', closeAdminModal);
}

if (adminLoginForm && adminMessage) {
  adminLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const username = formData.get('username')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (username === adminUsername && password === adminPassword) {
      localStorage.setItem(adminSessionKey, 'true');
      setAdminState(true);
      openAdminModal();
      return;
    }

    adminMessage.textContent = 'Invalid credentials. Please try again.';
    adminMessage.className = 'error';
  });
}

if (adminProductsForm && adminMessage) {
  adminProductsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const updatedProducts = [
      {
        name: adminProductsForm.elements.name1.value.trim(),
        description: adminProductsForm.elements.desc1.value.trim()
      },
      {
        name: adminProductsForm.elements.name2.value.trim(),
        description: adminProductsForm.elements.desc2.value.trim()
      },
      {
        name: adminProductsForm.elements.name3.value.trim(),
        description: adminProductsForm.elements.desc3.value.trim()
      }
    ];

    saveProducts(updatedProducts);
    renderProducts();
    adminMessage.textContent = 'Product cards updated successfully.';
    adminMessage.className = 'success';
  });
}

if (adminLogoutBtn && adminMessage) {
  adminLogoutBtn.addEventListener('click', () => {
    localStorage.removeItem(adminSessionKey);
    setAdminState(false);
    adminMessage.textContent = 'Logged out successfully.';
    adminMessage.className = 'success';
  });
}

renderProducts();
