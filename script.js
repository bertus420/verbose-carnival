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
