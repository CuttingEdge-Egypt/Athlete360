// Payment callback endpoints to add to athlete360.ai Express server
// Add these routes to your main server file (app.js, index.js, or server.js)

// Paymob transaction processed callback (webhook)
app.post('/api/payments/paymob-processed', async (req, res) => {
  try {
    console.log('📥 Paymob processed callback received:', req.body);
    
    const transaction = req.body;
    
    // Verify the transaction and update user tokens
    if (transaction.success === true && transaction.pending === false) {
      console.log('✅ Payment confirmed by Paymob:', transaction);
      
      // Extract amount and calculate tokens
      const amountInCents = transaction.amount_cents || 0;
      const amount = amountInCents / 100;
      
      // Map packages to tokens (matching your pricing)
      const tokensToAdd = amount === 25 ? 1000 : amount === 15 ? 500 : amount === 50 ? 2500 : 0;
      
      if (tokensToAdd > 0) {
        console.log(`💰 Processing payment: ${amount} EGP = ${tokensToAdd} tokens`);
        
        // TODO: Add your token crediting logic here
        // Example:
        // const userId = transaction.merchant_order_id.split('_')[1]; // Extract user ID
        // await addTokensToUser(userId, tokensToAdd);
        
        console.log(`✅ Payment processed: ${tokensToAdd} tokens added`);
      }
    } else {
      console.log('⏳ Payment pending or failed:', transaction);
    }
    
    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('❌ Error processing Paymob callback:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Paymob transaction response callback (redirect)
app.get('/api/payments/paymob-response', async (req, res) => {
  try {
    console.log('🔄 Paymob response callback received:', req.query);
    
    const { success, pending, id } = req.query;
    
    if (success === 'true' && pending === 'false') {
      // Payment successful - redirect to success page
      res.redirect('/payment-success?status=success&transaction=' + id);
    } else if (pending === 'true') {
      // Payment pending (3DS or OTP) - redirect to pending page
      res.redirect('/payment-success?status=pending&transaction=' + id);
    } else {
      // Payment failed - redirect to failure page
      res.redirect('/payment-success?status=failed&transaction=' + id);
    }
  } catch (error) {
    console.error('❌ Error handling Paymob response:', error);
    res.redirect('/payment-success?status=error');
  }
});

// Payment success page with different statuses
app.get('/payment-success', async (req, res) => {
  const { status, transaction } = req.query;
  
  let title, icon, message, buttonText;
  
  switch (status) {
    case 'success':
      title = 'Payment Successful!';
      icon = '✅';
      message = 'Your tokens have been added to your account.';
      buttonText = 'Return to Dashboard';
      break;
    case 'pending':
      title = 'Payment Pending';
      icon = '⏳';
      message = 'Your payment is being processed. This may take a few minutes.';
      buttonText = 'Return to Dashboard';
      break;
    case 'failed':
      title = 'Payment Failed';
      icon = '❌';
      message = 'Your payment could not be processed. Please try again.';
      buttonText = 'Try Again';
      break;
    default:
      title = 'Payment Complete';
      icon = 'ℹ️';
      message = 'Thank you for your payment.';
      buttonText = 'Return to Dashboard';
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .icon { font-size: 48px; margin-bottom: 20px; }
        .title { font-size: 24px; margin-bottom: 20px; color: #374151; }
        .message { font-size: 18px; color: #6b7280; margin-bottom: 30px; }
        .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .transaction { font-size: 12px; color: #9ca3af; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <div class="title">${title}</div>
        <div class="message">${message}</div>
        <a href="/" class="button">${buttonText}</a>
        ${transaction ? `<div class="transaction">Transaction: ${transaction}</div>` : ''}
      </div>
      <script>
        ${status === 'success' ? "setTimeout(() => { window.location.href = '/'; }, 5000);" : ""}
      </script>
    </body>
    </html>
  `);
});