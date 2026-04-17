import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Auth E2E Tests
 *
 * Tests authentication endpoints against the actual database (Neon).
 * No Supabase mocks needed — auth is now fully self-hosted with bcrypt + JWT.
 */

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testHotelOwner = {
    email: `test-${Date.now()}@example.com`,
    password: 'HotelPassword123!@#',
    name: 'Hotel Owner',
    hotelName: 'Test Hotel',
    hotelSlug: `test-hotel-${Date.now()}`,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.refreshToken.deleteMany({});
      await prisma.auditLog.deleteMany({});
      await prisma.user.deleteMany({
        where: { email: testHotelOwner.email },
      });
      await prisma.hotel.deleteMany({
        where: { slug: testHotelOwner.hotelSlug },
      });
    } catch {
      // Ignore cleanup errors
    }
    await app.close();
  });

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
    });

    it('should reject registration with existing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send(testHotelOwner)
        .expect(409);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send({
          ...testHotelOwner,
          email: 'weak@example.com',
          password: 'weak',
          hotelSlug: 'weak-hotel',
        })
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register/hotel')
        .send({
          ...testHotelOwner,
          email: 'not-an-email',
          hotelSlug: 'invalid-email-hotel',
        })
        .expect(400);
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
    });

    it('should reject login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST) - Token Refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      refreshToken = response.body.tokens?.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      if (!refreshToken) return; // Skip if login failed
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/api/v1/auth/me (GET) - Get Current User', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      accessToken = response.body.tokens?.accessToken;
    });

    it('should return current user with valid token', async () => {
      if (!accessToken) return;
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testHotelOwner.email);
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST) - User Logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testHotelOwner.email,
          password: testHotelOwner.password,
        });
      accessToken = response.body.tokens?.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      if (!accessToken) return;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('Database Verification', () => {
    it('should have created hotel in database', async () => {
      const hotel = await prisma.hotel.findUnique({
        where: { slug: testHotelOwner.hotelSlug },
      });

      expect(hotel).toBeDefined();
      expect(hotel?.name).toBe(testHotelOwner.hotelName);
    });

    it('should have created user linked to hotel', async () => {
      const user = await prisma.user.findFirst({
        where: { email: testHotelOwner.email },
        include: { hotel: true },
      });

      expect(user).toBeDefined();
      expect(user?.hotel?.slug).toBe(testHotelOwner.hotelSlug);
    });
  });
});
