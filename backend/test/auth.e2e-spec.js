"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const child_process_1 = require("child_process");
const bcrypt = require("bcryptjs");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('AuthController (e2e)', () => {
    let app;
    let prisma;
    (0, globals_1.beforeAll)(async () => {
        (0, child_process_1.execSync)('DATABASE_URL=postgresql://user:password@localhost:5432/tradepilot_test?schema=public npx prisma migrate reset --force');
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        prisma = app.get(prisma_service_1.PrismaService);
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        await app.init();
    });
    (0, globals_1.afterAll)(async () => {
        await app.close();
    });
    (0, globals_1.describe)('/auth/register (POST)', () => {
        (0, globals_1.it)('should register a new user', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                email: 'test.e2e@example.com',
                password: 'Password123!',
                fullName: 'E2E User',
            })
                .expect(201)
                .expect((res) => {
                (0, globals_1.expect)(res.body.success).toBe(true);
                (0, globals_1.expect)(res.body.data.message).toContain('Registration successful');
            });
        });
        (0, globals_1.it)('should fail if email is already taken', async () => {
            await prisma.user.create({
                data: {
                    email: 'taken@example.com',
                    passwordHash: 'somehash',
                    fullName: 'Taken User',
                },
            });
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                email: 'taken@example.com',
                password: 'Password123!',
                fullName: 'Another User',
            })
                .expect(409);
        });
    });
    (0, globals_1.describe)('/auth/login (POST)', () => {
        (0, globals_1.beforeAll)(async () => {
            await prisma.user.create({
                data: {
                    email: 'login.test@example.com',
                    passwordHash: await bcrypt.hash('Password123!', 10),
                    isEmailVerified: true,
                    fullName: 'Login User',
                },
            });
        });
        (0, globals_1.it)('should log in a verified user and return tokens', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                email: 'login.test@example.com',
                password: 'Password123!',
            })
                .expect(200)
                .expect((res) => {
                (0, globals_1.expect)(res.body.success).toBe(true);
                (0, globals_1.expect)(res.body.data.accessToken).toBeDefined();
                (0, globals_1.expect)(res.body.data.user.email).toBe('login.test@example.com');
                (0, globals_1.expect)(res.headers['set-cookie']).toBeDefined();
            });
        });
        (0, globals_1.it)('should fail with invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                email: 'login.test@example.com',
                password: 'WrongPassword!',
            })
                .expect(401);
        });
    });
    (0, globals_1.describe)('/users/me (GET)', () => {
        let accessToken;
        (0, globals_1.beforeAll)(async () => {
            await prisma.user.create({
                data: {
                    email: 'me.test@example.com',
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
        (0, globals_1.it)('should get current user profile with a valid token', () => {
            return request(app.getHttpServer())
                .get('/users/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                (0, globals_1.expect)(res.body.success).toBe(true);
                (0, globals_1.expect)(res.body.data.email).toBe('me.test@example.com');
            });
        });
        (0, globals_1.it)('should fail without a token', () => {
            return request(app.getHttpServer())
                .get('/users/me')
                .expect(401);
        });
    });
});
//# sourceMappingURL=auth.e2e-spec.js.map