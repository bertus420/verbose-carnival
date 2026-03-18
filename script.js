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

const productList = document.querySelector('#product-list');
const adminModal = document.querySelector('#admin-modal');
const adminOpenBtn = document.querySelector('#admin-open');
const adminCloseBtn = document.querySelector('#admin-close');
const adminLoginForm = document.querySelector('#admin-login');
const adminProductsForm = document.querySelector('#admin-products');
const adminLogoutBtn = document.querySelector('#admin-logout');
const adminMessage = document.querySelector('#admin-message');

const showAdminMessage = (message, type = '') => {
  if (!adminMessage) {
    return;
  }

  adminMessage.textContent = message;
  adminMessage.className = type;
};

const fetchProducts = async () => {
  const response = await fetch('/api/products', { credentials: 'same-origin' });
  const data = await response.json();
  return data.products || [];
};

const renderProducts = async () => {
  if (!productList) {
    return;
  }

  const products = await fetchProducts();
  productList.innerHTML = '';

  products.forEach((product) => {
    const article = document.createElement('article');
    article.className = 'product-card';
    article.innerHTML = `<h3>${product.name}</h3><p>${product.description}</p>`;
    productList.append(article);
  });
};

const checkAdminSession = async () => {
  const response = await fetch('/api/session', { credentials: 'same-origin' });
  const data = await response.json();
  return data.authenticated === true;
};

const setAdminState = async () => {
  if (!adminLoginForm || !adminProductsForm) {
    return;
  }

  const authenticated = await checkAdminSession();
  adminLoginForm.hidden = authenticated;
  adminProductsForm.hidden = !authenticated;

  if (!authenticated) {
    showAdminMessage('Sign in to manage product cards.');
    return;
  }

  const products = await fetchProducts();
  adminProductsForm.elements.name1.value = products[0]?.name || '';
  adminProductsForm.elements.desc1.value = products[0]?.description || '';
  adminProductsForm.elements.name2.value = products[1]?.name || '';
  adminProductsForm.elements.desc2.value = products[1]?.description || '';
  adminProductsForm.elements.name3.value = products[2]?.name || '';
  adminProductsForm.elements.desc3.value = products[2]?.description || '';
  showAdminMessage('Logged in. Update product cards and click save.', 'success');
};

const openAdminModal = async () => {
  if (!adminModal) {
    return;
  }

  adminModal.hidden = false;
  await setAdminState();
};

const closeAdminModal = () => {
  if (adminModal) {
    adminModal.hidden = true;
  }
};

if (adminOpenBtn) {
  adminOpenBtn.addEventListener('click', () => {
    openAdminModal().catch(() => {
      showAdminMessage('Unable to open admin panel. Try refreshing.', 'error');
    });
  });
}

if (adminCloseBtn) {
  adminCloseBtn.addEventListener('click', closeAdminModal);
}

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(adminLoginForm);
    const username = formData.get('username')?.toString().trim() || '';
    const password = formData.get('password')?.toString() || '';

    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      showAdminMessage('Invalid credentials. Please try again.', 'error');
      return;
    }

    await setAdminState();
  });
}

if (adminProductsForm) {
  adminProductsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const products = [
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

    const response = await fetch('/api/admin/products', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ products })
    });

    if (!response.ok) {
      showAdminMessage('Unable to save product updates.', 'error');
      return;
    }

    await renderProducts();
    showAdminMessage('Product cards updated successfully.', 'success');
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    await setAdminState();
    showAdminMessage('Logged out successfully.', 'success');
  });
}

renderProducts().catch(() => {
  if (productList) {
    productList.innerHTML = '<p>Unable to load products at the moment.</p>';
  }
});
