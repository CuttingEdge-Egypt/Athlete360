import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { z } from "zod";


// Validation schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  referralCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export async function setupLocalAuth(app: Express) {
  // Configure passport local strategy
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[LOCAL AUTH] Attempting login for email: ${normalizedEmail}`);
        
        const user = await storage.getUserByEmail(normalizedEmail);
        if (!user) {
          console.log(`[LOCAL AUTH] User not found: ${normalizedEmail}`);
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (user.authProvider !== 'local') {
          console.log(`[LOCAL AUTH] User ${normalizedEmail} uses ${user.authProvider} auth, not local`);
          return done(null, false, { message: 'Please use your original login method' });
        }

        if (!user.passwordHash) {
          console.log(`[LOCAL AUTH] User ${normalizedEmail} has no password hash`);
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          console.log(`[LOCAL AUTH] Invalid password for user: ${normalizedEmail}`);
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log(`[LOCAL AUTH] Successful login for user: ${normalizedEmail}`);
        
        // Create user session object compatible with existing code
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl
          },
          access_token: 'local_auth_token',
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        };
        
        return done(null, sessionUser);
      } catch (error) {
        console.error('[LOCAL AUTH] Login error:', error);
        return done(error);
      }
    }
  ));

  // Local signup with card route
  app.post('/api/auth/signup-with-card', async (req, res) => {
    try {
      console.log(`[LOCAL AUTH] Signup with card attempt for:`, req.body.email);
      
      const validation = signupSchema.extend({
        cardLast4: z.string().length(4, "Card last 4 digits must be exactly 4 digits"),
        cardBrand: z.enum(['Visa', 'Mastercard', 'American Express', 'Discover'], {
          errorMap: () => ({ message: "Unsupported card brand" })
        }),
        cardToken: z.string().min(1, "Card token is required"),
        paymobCustomerId: z.string().min(1, "Customer ID is required"),
        expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Invalid expiry month format"),
        expiryYear: z.string().regex(/^20\d{2}$/, "Invalid expiry year format"),
        cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
        cardholderName: z.string()
          .min(2, "Cardholder name must be at least 2 characters")
          .regex(/^[a-zA-Z\s\-'\.]+$/, "Cardholder name contains invalid characters")
      }).safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.errors
        });
      }

      const { password, firstName, lastName, referralCode, cardLast4, cardBrand, cardToken, paymobCustomerId, expiryMonth, expiryYear, cvv, cardholderName } = validation.data;
      const email = validation.data.email.toLowerCase().trim();

      // Additional validation for expiry date
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expMonth = parseInt(expiryMonth);
      const expYear = parseInt(expiryYear);
      
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return res.status(400).json({
          message: "Card has expired",
          errors: [{ path: ['expiryDate'], message: "Card has expired" }]
        });
      }

      // Validate CVV length based on card brand
      const expectedCvvLength = cardBrand === 'American Express' ? 4 : 3;
      if (cvv.length !== expectedCvvLength) {
        return res.status(400).json({
          message: "Invalid CVV length",
          errors: [{ path: ['cvv'], message: `CVV must be ${expectedCvvLength} digits for ${cardBrand} cards` }]
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create new user with local auth and payment info
      const userId = await storage.createLocalUserWithCard({
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: 'local',
        emailVerified: true,
        referralCode,
        cardToken,
        cardLast4,
        cardBrand,
        paymobCustomerId
      });

      console.log(`[LOCAL AUTH] Created new user with card: ${userId} for email: ${email}`);

      // Auto-login the new user
      const newUser = await storage.getUser(userId);
      const sessionUser = {
        claims: {
          sub: newUser!.id,
          email: newUser!.email,
          first_name: newUser!.firstName,
          last_name: newUser!.lastName,
          profile_image_url: newUser!.profileImageUrl
        },
        access_token: 'local_auth_token',
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      req.login(sessionUser, (err) => {
        if (err) {
          console.error('[LOCAL AUTH] Auto-login after signup failed:', err);
          return res.status(500).json({ message: "Signup successful but login failed" });
        }

        // Process referral bonus if provided
        if (referralCode) {
          storage.getUserByReferralCode(referralCode).then(async (referrer) => {
            if (referrer) {
              console.log(`[REFERRAL] Processing bonus for referrer: ${referrer.firstName} (${referrer.email})`);
              
              // Add 100 bonus tokens to the referrer
              await storage.addTokensPurchase(referrer.id, 100);
              
              // Create referral record
              await storage.createReferral({
                referrerId: referrer.id,
                referredUserId: userId,
                bonusTokens: 100,
                status: "completed"
              });

              // Create transaction for referrer
              await storage.createTransaction({
                userId: referrer.id,
                action: "Referral Bonus",
                tokensDeducted: -100,
                serviceType: "referral"
              });
            }
          }).catch(err => console.error('[REFERRAL] Error processing bonus:', err));
        }

        res.json({
          message: "Signup successful",
          user: newUser,
          success: true
        });
      });

    } catch (error) {
      console.error('[LOCAL AUTH] Signup with card error:', error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Basic local signup route (without card)
  app.post('/api/auth/signup', async (req, res) => {
    try {
      console.log(`[LOCAL AUTH] Signup attempt for:`, req.body.email);
      
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.errors
        });
      }

      const { password, firstName, lastName, referralCode } = validation.data;
      const email = validation.data.email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create new user with local auth
      const userId = await storage.createLocalUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: 'local',
        emailVerified: true, // For simplicity, marking as verified
        referralCode
      });

      console.log(`[LOCAL AUTH] Created new user: ${userId} for email: ${email}`);

      // Auto-login the new user
      const newUser = await storage.getUser(userId);
      const sessionUser = {
        claims: {
          sub: newUser!.id,
          email: newUser!.email,
          first_name: newUser!.firstName,
          last_name: newUser!.lastName,
          profile_image_url: newUser!.profileImageUrl
        },
        access_token: 'local_auth_token',
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      };

      req.login(sessionUser, (err) => {
        if (err) {
          console.error('[LOCAL AUTH] Auto-login after signup failed:', err);
          return res.status(500).json({ message: "Signup successful but login failed" });
        }

        // Process referral bonus if provided
        if (referralCode) {
          storage.getUserByReferralCode(referralCode).then(async (referrer) => {
            if (referrer) {
              console.log(`[REFERRAL] Processing bonus for referrer: ${referrer.firstName} (${referrer.email})`);
              
              // Add 100 bonus tokens to the referrer
              await storage.addTokensPurchase(referrer.id, 100);
              
              // Create referral record
              await storage.createReferral({
                referrerId: referrer.id,
                referredUserId: userId,
                bonusTokens: 100,
                status: "completed"
              });

              // Create transaction for referrer
              await storage.createTransaction({
                userId: referrer.id,
                action: "Referral Bonus",
                tokensDeducted: -100,
                serviceType: "referral"
              });
            }
          }).catch(err => console.error('[REFERRAL] Error processing bonus:', err));
        }

        res.json({
          message: "Signup successful",
          user: newUser,
          success: true
        });
      });

    } catch (error) {
      console.error('[LOCAL AUTH] Signup error:', error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Local login route
  app.post('/api/auth/login', (req, res, next) => {
    if (req.body.email) req.body.email = req.body.email.toLowerCase().trim();
    console.log(`[LOCAL AUTH] Login attempt for:`, req.body.email);
    
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.errors
      });
    }

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('[LOCAL AUTH] Authentication error:', err);
        return res.status(500).json({ message: "Login failed" });
      }

      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('[LOCAL AUTH] Login session creation failed:', loginErr);
          return res.status(500).json({ message: "Login failed" });
        }

        console.log(`[LOCAL AUTH] Login successful for: ${user.claims.email}`);
        
        // Return user data
        storage.getUser(user.claims.sub).then(userData => {
          res.json({
            message: "Login successful",
            user: userData,
            success: true
          });
        }).catch(err => {
          console.error('[LOCAL AUTH] Error fetching user data after login:', err);
          res.status(500).json({ message: "Login successful but failed to fetch user data" });
        });
      });
    })(req, res, next);
  });



  // Note: /api/logout is handled in routes.ts as a unified handler for both auth types
}

// Updated authentication middleware that supports both Replit and local auth
export const isAuthenticatedUniversal: RequestHandler = async (req, res, next) => {
  console.log(`[AUTH DEBUG] Universal auth check for ${req.path}`);
  console.log(`[AUTH DEBUG] req.isAuthenticated(): ${req.isAuthenticated()}`);
  console.log(`[AUTH DEBUG] Session ID:`, req.sessionID);
  console.log(`[AUTH DEBUG] Session:`, req.session);
  console.log(`[AUTH DEBUG] Headers:`, req.headers.cookie);

  if (!req.isAuthenticated()) {
    console.log(`[AUTH DEBUG] Not authenticated`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  console.log(`[AUTH DEBUG] User exists:`, !!user);
  console.log(`[AUTH DEBUG] User access token:`, user?.access_token);

  // For local auth, we don't need to refresh tokens
  if (user?.access_token === 'local_auth_token') {
    console.log(`[AUTH DEBUG] Local auth user, proceeding`);
    return next();
  }

  // For Replit auth, check token expiration (existing logic)
  if (!user?.expires_at) {
    console.log(`[AUTH DEBUG] No expires_at for Replit user`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log(`[AUTH DEBUG] Replit token still valid, proceeding`);
    return next();
  }

  // Token refresh logic for Replit auth (existing logic)
  console.log(`[AUTH DEBUG] Replit token expired, attempting refresh`);
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log(`[AUTH DEBUG] No refresh token available`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Import here to avoid circular dependency  
    const replitAuth = await import("./replitAuth");
    const client = await import("openid-client");
    
    console.log(`[AUTH DEBUG] Attempting token refresh...`);
    const config = await (replitAuth as any).getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    
    // Update user session (reuse existing function)
    user.claims = tokenResponse.claims();
    user.access_token = tokenResponse.access_token;
    user.refresh_token = tokenResponse.refresh_token;
    user.expires_at = user.claims?.exp;
    
    console.log(`[AUTH DEBUG] Token refreshed successfully`);
    return next();
  } catch (error) {
    console.log(`[AUTH DEBUG] Token refresh failed:`, error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};