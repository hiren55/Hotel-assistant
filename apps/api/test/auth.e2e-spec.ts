import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

// Use the same JWT secret as configured in the app
const TEST_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'test-secret';

// Helper to generate a valid JWT token for testing
function generateTestToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_JWT_SECRET,
  );
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Generate unique IDs for test users
  const testUserId = uuidv4();
  const testHotelOwnerId = uuidv4();

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const testHotelOwner = {
    email: 'hotel@example.com',
    password: 'HotelPassword123!',
    name: 'Hotel Owner',
    hotelName: 'Test Hotel',
    hotelSlug: 'test-hotel',
  };

  // Mock Supabase responses
  const mockSupabaseService = {
    onModuleInit: jest.fn(),
    getClient: jest.fn(),
    getAdminClient: jest.fn(),

    signUp: jest.fn().mockImplementation((email: string, _password: string, metadata?: Record<string, unknown>) => {
      // Simulate email already exists
      if (email === testHotelOwner.email && mockSupabaseService._userExists) {
        return Promise.resolve({
          user: null,
          session: null,
          error: new Error('User already registered'),
        });
      }

      const userId = email === testHotelOwner.email ? testHotelOwnerId : testUserId;
      return Promise.resolve({
        user: {
          id: userId,
          email,
          user_metadata: metadata || {},
        },
        session: {
          access_token: generateTestToken(userId, email),
          refresh_token: `mock-refresh-token-${userId}`,
          expires_in: 3600,
        },
        error: null,
      });
    }),

    signInWithPassword: jest.fn().mockImplementation((email: string, password: string) => {
      // Check if user exists and password matches
      if (email === testHotelOwner.email && password === testHotelOwner.password && mockSupabaseService._userExists) {
        return Promise.resolve({
          user: {
            id: testHotelOwnerId,
            email,
            user_metadata: { name: testHotelOwner.name },
          },
          session: {
            access_token: generateTestToken(testHotelOwnerId, email),
            refresh_token: `mock-refresh-token-${testHotelOwnerId}`,
            expires_in: 3600,
          },
          error: null,
        });
      }

      return Promise.resolve({
        user: null,
        session: null,
        error: new Error('Invalid login credentials'),
      });
    }),

    refreshSession: jest.fn().mockImplementation((refreshToken: string) => {
      if (refreshToken && refreshToken.startsWith('mock-refresh-token-')) {
        const userId = refreshToken.replace('mock-refresh-token-', '');
        return Promise.resolve({
          user: { id: userId },
          session: {
            access_token: generateTestToken(userId, testHotelOwner.email),
            refresh_token: `mock-refresh-token-new-${userId}`,
            expires_in: 3600,
          },
          error: null,
        });
      }

      return Promise.resolve({
        user: null,
        session: null,
        error: new Error('Invalid refresh token'),
      });
    }),

    signOut: jest.fn().mockResolvedValue({ error: null }),

    getUser: jest.fn().mockImplementation((accessToken: string) => {
      // Try to decode the JWT to get user info
      try {
        const decoded = jwt.verify(accessToken, TEST_JWT_SECRET) as { sub: string; email: string };
        return Promise.resolve({
          user: {
            id: decoded.sub,
            email: decoded.email,
          },
          error: null,
        });
      } catch {
        return Promise.resolve({
          user: null,
          error: new Error('Invalid token'),
        });
      }
    }),

    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    updateUserPassword: jest.fn().mockResolvedValue({ error: null }),

    // Internal state for testing
    _userExists: false,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(mockSupabaseService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply same config as main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Clean up test data before running tests
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    // Delete test users and hotels
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testUser.email, testHotelOwner.email],
        },
      },
    });
    await prisma.hotel.deleteMany({
      where: {
        slug: testHotelOwner.hotelSlug,
      },
    });
    // Reset mock state
    mockSupabaseService._userExists = false;
  }

  describe('/api/v1/auth/register/hotel (POST) - Hotel Owner Registration', () => {
    it('should register a new hotel owner successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send(testHotelOwner)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testHotelOwner.email);
      expect(response.body.user.name).toBe(testHotelOwner.name);
      expect(response.body.user.role).toBe('hotel_owner');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Mark user as existing for subsequent tests
      mockSupabaseService._userExists = true;

      console.log('✅ Hotel owner registration successful');
      console.log('   User ID:', response.body.user.id);
      console.log('   Hotel ID:', response.body.user.hotelId);
    });

    it('should reject registration with existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send(testHotelOwner)
        .expect(409);

      expect(response.body.message).toContain('already registered');
      console.log('✅ Duplicate email rejected correctly');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send({
          ...testHotelOwner,
          email: 'weak@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      console.log('✅ Weak password rejected correctly');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send({
          ...testHotelOwner,
          email: 'not-an-email',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      console.log('✅ Invalid email rejected correctly');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send({
          email: 'missing@example.com',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      console.log('✅ Missing fields rejected correctly');
    });
  });

  describe('/api/v1/auth/login (POST) - User Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testHotelOwner.email);
      expect(response.body.tokens).toHaveProperty('accessToken');

      console.log('✅ Login successful');
      console.log('   Access Token:', response.body.tokens.accessToken.substring(0, 20) + '...');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
      console.log('✅ Wrong password rejected correctly');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
      console.log('✅ Non-existent user rejected correctly');
    });
  });

  describe('/api/v1/auth/refresh (POST) - Token Refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Login to get refresh token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      refreshToken = response.body.tokens?.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      console.log('✅ Token refresh successful');
    });

    it('should reject refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      console.log('✅ Invalid refresh token rejected correctly');
    });
  });

  describe('/api/v1/auth/me (GET) - Get Current User', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get access token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      accessToken = response.body.tokens?.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testHotelOwner.email);

      console.log('✅ Get current user successful');
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      console.log('✅ Get current user without token rejected correctly');
    });
  });

  describe('/api/v1/auth/logout (POST) - User Logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get access token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      accessToken = response.body.tokens?.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
      console.log('✅ Logout successful');
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);

      console.log('✅ Logout without token rejected correctly');
    });
  });

  describe('Database Verification', () => {
    it('should have created hotel in database', async () => {
      const hotel = await prisma.hotel.findUnique({
        where: { slug: testHotelOwner.hotelSlug },
      });

      expect(hotel).toBeDefined();
      expect(hotel?.name).toBe(testHotelOwner.hotelName);

      console.log('✅ Hotel verified in database');
      console.log('   Hotel Name:', hotel?.name);
      console.log('   Hotel Slug:', hotel?.slug);
    });

    it('should have created user linked to hotel', async () => {
      const user = await prisma.user.findFirst({
        where: { email: testHotelOwner.email },
        include: { hotel: true },
      });

      expect(user).toBeDefined();
      expect(user?.hotel?.slug).toBe(testHotelOwner.hotelSlug);

      console.log('✅ User linked to hotel verified');
      console.log('   User Email:', user?.email);
      console.log('   User Role:', user?.role);
    });

    it('should have created audit log for registration', async () => {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'register_hotel_owner',
        },
      });

      expect(auditLog).toBeDefined();

      console.log('✅ Audit log created for registration');
    });
  });
});
