// payment-handler.js - PhonePe Integration

let currentOrderId = null;
let currentOrderNumber = null;
let currentMerchantTxnId = null;

// Modal elements
const paymentModal = document.getElementById('paymentModal');
const paymentModalBackdrop = document.getElementById('paymentModalBackdrop');
const paymentModalClose = document.getElementById('paymentModalClose');
const customerForm = document.getElementById('customerDetailsForm');
const formError = document.getElementById('formError');

const resultModal = document.getElementById('resultModal');
const resultModalBackdrop = document.getElementById('resultModalBackdrop');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const resultModalClose = document.getElementById('resultModalClose');

// Open payment modal when UPI Pay button is clicked
// const upiPayBtn = document.getElementById('upiPayBtn');
// if (upiPayBtn) {
//   upiPayBtn.addEventListener('click', () => {
//     const cart = getCart();

//     if (!cart || cart.length === 0) {
//       showError('Your cart is empty!');
//       return;
//     }

//     openPaymentModal();
//   });
// }

// Payment Handler
const upiPayBtn = document.getElementById('upiPayBtn');

if (upiPayBtn) {
  upiPayBtn.addEventListener('click', async () => {
    const cart = getCart();
    if (!cart.length) {
      alert('Your cart is empty!');
      return;
    }

    // Get customer details from cart form
    const name = document.getElementById('cartCustomerName').value.trim();
    const email = document.getElementById('cartCustomerEmail').value.trim();
    const phone = document.getElementById('cartCustomerPhone').value.trim();
    const state = document.getElementById('cartCustomerState').value;
    const city = document.getElementById('cartCustomerCity').value.trim();
    const pincode = document.getElementById('cartCustomerPincode').value.trim();
    const address = document.getElementById('cartCustomerAddress').value.trim();
    const formError = document.getElementById('cartFormError');

    // Validate
    if (!name || !email || !phone || !state || !city || !pincode || !address) {
      formError.textContent = 'Please fill all required fields!';
      formError.classList.add('show');
      return;
    }

    if (!email.includes('@')) {
      formError.textContent = 'Please enter a valid email address!';
      formError.classList.add('show');
      return;
    }

    formError.classList.remove('show');

    // Calculate delivery
    const delivery = state === 'Tamil Nadu' ? 50 : 100;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmount = subtotal + delivery;

    // Prepare order data
    const orderNumber = `ORD-${Date.now()}`;
    const merchantTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const orderData = {
      orderNumber,
      merchantTransactionId,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerState: state,
      customerCity: city,
      customerPincode: pincode,
      customerAddress: address,
      totalAmount,
      items: cart
    };

    console.log('Order Data:', orderData);

    try {
      // Show loading
      upiPayBtn.disabled = true;
      upiPayBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

      // Call initiate-payment function
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderData })
      });

      const result = await response.json();
      console.log('Payment Response:', result);

      if (result.success && result.paymentUrl) {
        // Redirect to PhonePe
        window.location.href = result.paymentUrl;
      } else {
        let errorMessage = result.error || 'Payment initiation failed';
        if (typeof errorMessage === 'object') {
          errorMessage = errorMessage.message || JSON.stringify(errorMessage);
        }
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Payment Error:', error);
      alert('Payment failed: ' + (error.message || JSON.stringify(error)));
      upiPayBtn.disabled = false;
      upiPayBtn.innerHTML = '<span>Proceed to Checkout</span><i class="fa-solid fa-indian-rupee-sign"></i>';
    }
  });
}

// Open payment modal
function openPaymentModal() {
  paymentModal.classList.add('open');
  paymentModalBackdrop.classList.add('show');
  paymentModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

// Close payment modal
function closePaymentModal() {
  paymentModal.classList.remove('open');
  paymentModalBackdrop.classList.remove('show');
  paymentModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  customerForm.reset();
  hideError();
}

// Close modal handlers
paymentModalClose.addEventListener('click', closePaymentModal);
paymentModalBackdrop.addEventListener('click', closePaymentModal);

// Form submission
customerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  // Get form data
  const formData = new FormData(customerForm);
  const customerData = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim(),
    state: formData.get('state').trim(),
    city: formData.get('city').trim(),
    pincode: formData.get('pincode').trim(),
    address: formData.get('address').trim()
  };

  // Validate
  if (!customerData.name || !customerData.email || !customerData.phone || !customerData.state || !customerData.city || !customerData.pincode || !customerData.address) {
    showError('Please fill in all required fields');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerData.email)) {
    showError('Please enter a valid email address');
    return;
  }

  // Show loading
  const submitBtn = document.getElementById('submitOrderBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitBtnLoader = document.getElementById('submitBtnLoader');

  submitBtnText.style.display = 'none';
  submitBtnLoader.style.display = 'inline-block';
  submitBtn.disabled = true;

  try {
    // Get cart
    const cart = getCart();

    // Calculate total
    const deliveryCharge = customerData.state === 'Tamil Nadu' ? 50 : 100;
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const totalAmount = subtotal + deliveryCharge;

    // Generate IDs
    currentOrderNumber = generateOrderNumber();
    currentMerchantTxnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare order data
    const orderData = {
      orderNumber: currentOrderNumber,
      merchantTransactionId: currentMerchantTxnId,
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerPhone: customerData.phone,
      customerState: customerData.state,
      customerCity: customerData.city,
      customerPincode: customerData.pincode,
      customerAddress: customerData.address,
      totalAmount: totalAmount,
      items: cart
    };

    // Call Node.js Backend to initiate payment
    const response = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderData })
    });

    const result = await response.json();

    if (result.success && result.paymentUrl) {
      currentOrderId = result.orderId;

      // Store transaction ID in localStorage for verification
      localStorage.setItem('pending_txn_id', currentMerchantTxnId);

      // Close modal
      closePaymentModal();

      // Redirect to PhonePe payment page
      window.location.href = result.paymentUrl;

    } else {
      let errorMessage = result.error || 'Failed to initiate payment';
      if (typeof errorMessage === 'object') {
        errorMessage = errorMessage.message || JSON.stringify(errorMessage);
      }
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Error initiating payment:', error);
    showError('Payment failed: ' + (error.message || 'Please try again.'));
  } finally {
    submitBtnText.style.display = 'inline-block';
    submitBtnLoader.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// Show result modal
function showResultModal(type, title, message) {
  resultIcon.innerHTML = type === 'success'
    ? '<i class="fa-solid fa-check-circle"></i>'
    : '<i class="fa-solid fa-times-circle"></i>';
  resultIcon.className = `result-icon ${type}`;
  resultTitle.textContent = title;
  resultMessage.innerHTML = message;

  resultModal.classList.add('open');
  resultModalBackdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Close result modal
function closeResultModal() {
  resultModal.classList.remove('open');
  resultModalBackdrop.classList.remove('show');
  document.body.style.overflow = '';

  // Clear cart if success
  const isSuccess = resultIcon.classList.contains('success');
  if (isSuccess) {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem('pending_txn_id');
    updateFloatingCart(0);
    renderCartDrawerItems();
    renderProducts();
  }
}

resultModalClose.addEventListener('click', closeResultModal);
resultModalBackdrop.addEventListener('click', closeResultModal);

// Show error message
function showError(message) {
  formError.textContent = message;
  formError.classList.add('show');
}

// Hide error message
function hideError() {
  formError.classList.remove('show');
  formError.textContent = '';
}