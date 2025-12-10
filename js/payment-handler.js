// payment-handler.js
// This file handles all payment-related functionality

let currentOrderId = null;
let currentOrderNumber = null;

// Modal elements
const paymentModal = document.getElementById('paymentModal');
const paymentModalBackdrop = document.getElementById('paymentModalBackdrop');
const paymentModalClose = document.getElementById('paymentModalClose');
const customerForm = document.getElementById('customerDetailsForm');
const formError = document.getElementById('formError');

const paymentProcessingModal = document.getElementById('paymentProcessingModal');
const displayOrderNumber = document.getElementById('displayOrderNumber');
const displayAmount = document.getElementById('displayAmount');

const resultModal = document.getElementById('resultModal');
const resultModalBackdrop = document.getElementById('resultModalBackdrop');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const resultModalClose = document.getElementById('resultModalClose');

// Open payment modal when UPI Pay button is clicked
const upiPayBtn = document.getElementById('upiPayBtn');
if (upiPayBtn) {
  upiPayBtn.addEventListener('click', () => {
    const cart = getCart();
    
    if (!cart || cart.length === 0) {
      showError('Your cart is empty!');
      return;
    }
    
    openPaymentModal();
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
    address: formData.get('address').trim()
  };
  
  // Validate
  if (!customerData.name || !customerData.email || !customerData.phone || !customerData.address) {
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
    // Create order in database
    const orderData = await createOrder(customerData);
    
    if (orderData) {
      currentOrderId = orderData.orderId;
      currentOrderNumber = orderData.orderNumber;
      
      // Close customer form modal
      closePaymentModal();
      
      // Open payment processing modal
      openPaymentProcessingModal(orderData.orderNumber, orderData.totalAmount);
    }
  } catch (error) {
    console.error('Error creating order:', error);
    showError('Failed to create order. Please try again.');
  } finally {
    submitBtnText.style.display = 'inline-block';
    submitBtnLoader.style.display = 'none';
    submitBtn.disabled = false;
  }
});

// Create order in Supabase
async function createOrder(customerData) {
  try {
    const cart = getCart();
    const deliveryCharge = 50;
    
    // Calculate total
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const totalAmount = subtotal + deliveryCharge;
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Insert order into database
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          customer_address: customerData.address,
          total_amount: totalAmount,
          payment_status: 'initiated'
        }
      ])
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Insert order items
    const orderItems = cart.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      product_name: item.name,
      product_size: item.size,
      product_image: item.image,
      price: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity
    }));
    
    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    console.log('Order created successfully:', orderNumber);
    
    return {
      orderId: orderData.id,
      orderNumber: orderNumber,
      totalAmount: totalAmount
    };
    
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
}

// Open payment processing modal
function openPaymentProcessingModal(orderNumber, amount) {
  displayOrderNumber.textContent = orderNumber;
  displayAmount.textContent = amount;
  
  paymentProcessingModal.classList.add('open');
  paymentModalBackdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Update order status to 'pending'
  updateOrderStatus(currentOrderId, 'pending');
}

// Close payment processing modal
function closePaymentProcessingModal() {
  paymentProcessingModal.classList.remove('open');
  paymentModalBackdrop.classList.remove('show');
  document.body.style.overflow = '';
}

// Update order status in database
async function updateOrderStatus(orderId, status) {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ 
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) throw error;
    
    console.log('Order status updated to:', status);
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

// Simulate successful payment
document.getElementById('simulateSuccessBtn').addEventListener('click', async () => {
  closePaymentProcessingModal();
  await handlePaymentSuccess();
});

// Simulate failed payment
document.getElementById('simulateFailureBtn').addEventListener('click', async () => {
  closePaymentProcessingModal();
  await handlePaymentFailure();
});

// Handle successful payment
async function handlePaymentSuccess() {
  try {
    // Update order status to success
    await updateOrderStatus(currentOrderId, 'success');
    
    // Send emails
    await sendOrderEmails(currentOrderId, 'success');
    
    // Clear cart
    localStorage.removeItem(CART_KEY);
    updateFloatingCart(0);
    renderCartDrawerItems();
    renderProducts();
    
    // Show success modal
    showResultModal('success', 'Payment Successful!', `Your order <span>${currentOrderNumber}</span> has been confirmed. <br> You will receive a confirmation email shortly. <br> Please copy your order number for future reference`);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailure() {
  try {
    // Update order status to failed
    await updateOrderStatus(currentOrderId, 'failed');
    
    // Send failure notification email
    await sendOrderEmails(currentOrderId, 'failed');
    
    // Show failure modal
    showResultModal('failure', 'Payment Failed', `Unfortunately, your payment for order ${currentOrderNumber} could not be processed. Please try again.`);
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

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
}

resultModalClose.addEventListener('click', closeResultModal);
resultModalBackdrop.addEventListener('click', closeResultModal);

// Send order emails
// async function sendOrderEmails(orderId, status) {
//   try {
//     // Fetch order details
//     const { data: order, error: orderError } = await supabaseClient
//       .from('orders')
//       .select(`
//         *,
//         order_items (*)
//       `)
//       .eq('id', orderId)
//       .single();
    
//     if (orderError) throw orderError;
    
//     // In production, you would call your backend API to send emails
//     // For now, we'll just log the email data
//     console.log('Email would be sent to:', order.customer_email);
//     console.log('Order details:', order);
    
//     // You can integrate with services like:
//     // - SendGrid
//     // - Mailgun
//     // - AWS SES
//     // - Supabase Edge Functions
    
//   } catch (error) {
//     console.error('Error sending emails:', error);
//   }
// }

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

// Public functions for manual payment status update (for testing)
window.setPaymentSuccess = async function(orderId) {
  if (!orderId) {
    console.error('Please provide orderId');
    return;
  }
  await updateOrderStatus(orderId, 'success');
  await sendOrderEmails(orderId, 'success');
  console.log('Payment status set to SUCCESS');
};

window.setPaymentFailure = async function(orderId) {
  if (!orderId) {
    console.error('Please provide orderId');
    return;
  }
  await updateOrderStatus(orderId, 'failed');
  await sendOrderEmails(orderId, 'failed');
  console.log('Payment status set to FAILED');
};
