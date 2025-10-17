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

  // Simulate payment completion for testing (mimics real payment flow)
  static async simulatePaymentCompletion(userId: string, amount: number, tokens: number) {
    // Simulate the same flow as real payment completion
    console.log(`SIMULATING payment completion: User ${userId}, Amount: $${amount}, Tokens: ${tokens}`);
    
    // Add tokens to user balance (additive purchase)
    const updatedUser = await storage.addTokensPurchase(userId, tokens);

    // Create payment receipt (same as real payments)
    const receipt = await storage.createPaymentReceipt({
      userId,
      amount: amount.toString(),
      currency: 'USD',
      tokensAmount: tokens,
      status: 'completed',
      paymobTransactionId: `sim_txn_${Date.now()}`,
      paymentMethod: 'test_simulation',
      receiptNumber: `SIM-${Date.now()}`
    });

    // Record the transaction
    await storage.createTransaction({
      userId,
      action: 'token_purchase',
      tokensDeducted: -tokens, // Negative indicates addition
      serviceType: 'payment'
    });

    console.log(`SIMULATION COMPLETE: User now has ${updatedUser.tokens}/${updatedUser.totalTokensPurchased} tokens`);
    
    return {
      success: true,
      receipt,
      newBalance: updatedUser.tokens || 0,
      totalPurchased: updatedUser.totalTokensPurchased || 0,
      message: `Successfully added ${tokens} tokens to your account`
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
}