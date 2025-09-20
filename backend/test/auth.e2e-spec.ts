import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { execSync } from 'child_process';
// FIX: Import bcrypt instead of using require.
import * as bcrypt from 'bcrypt';

// FIX: Declare Jest globals to resolve "Cannot find name" errors.
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeAll: any;
declare const afterAll: any;

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Reset the test database
    execSync('DATABASE_URL=postgresql://user:password@localhost:5432/tradepilot_test?schema=public npx prisma migrate reset --force');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test.e2e@example.com',
          password: 'Password123!',
          fullName: 'E2E User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.message).toContain('Registration successful');
        });
    });

    it('should fail if email is already taken', async () => {
      // Create user first
      // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
      await (prisma as any).user.create({
        data: {
          email: 'taken@example.com',
          passwordHash: 'somehash',
        },
      });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'taken@example.com',
          password: 'Password123!',
          fullName: 'Another User',
        })
        .expect(409); // Conflict
    });
  });

  describe('/auth/login (POST)', () => {
    let user: any;
    beforeAll(async () => {
      // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
      user = await (prisma as any).user.create({
        data: {
          email: 'login.test@example.com',
          // FIX: Use imported bcrypt instead of require.
          passwordHash: await bcrypt.hash('Password123!', 10),
          isEmailVerified: true,
          fullName: 'Login User',
        },
      });
    });

    it('should log in a verified user and return tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user.email).toBe('login.test@example.com');
          expect(res.headers['set-cookie']).toBeDefined();
        });
    });

     it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'WrongPassword!',
        })
        .expect(401);
    });
  });

  describe('/users/me (GET)', () => {
    let accessToken: string;
    beforeAll(async () => {
      // FIX: Cast `prisma` to `any` to bypass TypeScript errors.
       await (prisma as any).user.create({
        data: {
          email: 'me.test@example.com',
          // FIX: Use imported bcrypt instead of require.
          passwordHash: await bcrypt.hash('Password123!', 10),
          isEmailVerified: true,
          fullName: 'Me User',
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'me.test@example.com',
          password: 'Password123!',
        });
      accessToken = res.body.data.accessToken;
    });

    it('should get current user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe('me.test@example.com');
          expect(res.body.data.passwordHash).toBeUndefined();
        });
    });

    it('should fail without a token', () => {
        return request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });
});
