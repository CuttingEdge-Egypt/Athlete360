import { storage } from './storage';
import type { InsertTransaction, UpsertUser, InsertReferral } from '@shared/schema';

export class TestingService {
  // Get test scenarios for frontend
  static getTestScenarios() {
    return {
      tokenPackages: [
        { tokens: 100, price: 5 },
        { tokens: 500, price: 20 },
        { tokens: 1000, price: 35 },
        { tokens: 2500, price: 80 }
      ],
      referralEmails: [
        'friend1@test.com',
        'friend2@test.com', 
        'friend3@test.com',
        'colleague@example.com'
      ]
    };
  }

  // Simulate payment completion for testing
  static async simulatePaymentCompletion(userId: string, amount: number, tokens: number) {
    // Create a mock payment record
    const mockTransaction = {
      userId,
      amount,
      tokens,
      status: 'completed' as const,
      paymobTransactionId: `test_txn_${Date.now()}`,
      paymentMethod: 'test_card',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add tokens to user balance (additive purchase)
    await storage.addTokensPurchase(userId, tokens);

    // Record the transaction
    await storage.createTransaction({
      userId,
      action: 'token_purchase',
      tokensDeducted: -tokens, // Negative indicates addition
      serviceType: 'payment'
    });

    const updatedUser = await storage.getUser(userId);
    
    return {
      ...mockTransaction,
      newBalance: updatedUser?.tokens || 0,
      totalPurchased: updatedUser?.totalTokensPurchased || 0
    };
  }

  // Simulate successful referral signup
  static async simulateReferralSignup(referrerUserId: string, newUserEmail: string) {
    // Create a test user account
    const testUser = await storage.upsertUser({
      id: `test_${Date.now()}`,
      email: newUserEmail,
      firstName: 'Test',
      lastName: 'User'
    });

    // Process referral bonus for referrer (additive bonus)
    await storage.addTokensPurchase(referrerUserId, 100);

    // Create referral record
    await storage.createTransaction({
      userId: referrerUserId,
      action: 'referral_bonus',
      tokensDeducted: -100, // Negative indicates addition
      serviceType: 'referral'
    });

    // Create the actual referral record
    await storage.createReferral({
      referrerId: referrerUserId,
      referredUserId: testUser.id,
      bonusTokens: 100,
      status: 'completed'
    });

    const updatedReferrer = await storage.getUser(referrerUserId);
    
    return {
      newUser: testUser,
      referralBonus: 100,
      referrerNewBalance: updatedReferrer?.tokens || 0,
      referrerTotalPurchased: updatedReferrer?.totalTokensPurchased || 0
    };
  }

  // Generate test credit card data for simulation
  static generateTestCard() {
    const testCards = [
      { number: '4242424242424242', brand: 'visa', last4: '4242' },
      { number: '5555555555554444', brand: 'mastercard', last4: '4444' },
      { number: '378282246310005', brand: 'amex', last4: '0005' },
    ];
    
    return testCards[Math.floor(Math.random() * testCards.length)];
  }

  // Simulate card validation for testing
  static validateTestCard(cardNumber: string, expiry: string, cvv: string) {
    const testCardNumbers = [
      '4242424242424242', // Visa
      '5555555555554444', // Mastercard
      '378282246310005',  // Amex
      '4000000000000002'  // Declined card for testing failures
    ];

    if (!testCardNumbers.includes(cardNumber)) {
      return { valid: false, error: 'Invalid test card number' };
    }

    if (cardNumber === '4000000000000002') {
      return { valid: false, error: 'Test card declined' };
    }

    // Simple expiry validation (MM/YY format)
    const [month, year] = expiry.split('/');
    if (!month || !year || month < '01' || month > '12') {
      return { valid: false, error: 'Invalid expiry date' };
    }

    // Simple CVV validation
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      return { valid: false, error: 'Invalid CVV' };
    }

    return { valid: true };
  }

  // Create test scenarios
  static getTestScenarios() {
    return {
      cards: {
        success: '4242424242424242',
        declined: '4000000000000002',
        networkError: '4000000000000127',
        insufficientFunds: '4000000000009995'
      },
      referral: {
        codes: ['TEST1234', 'DEMO5678', 'SIMU9012'],
        emails: ['test1@example.com', 'test2@example.com', 'demo@example.com']
      },
      tokens: {
        packages: [
          { tokens: 100, price: 5 },
          { tokens: 500, price: 20 },
          { tokens: 1000, price: 35 },
          { tokens: 2500, price: 80 }
        ]
      }
    };
  }
}