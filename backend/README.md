# JTradePilot Backend

This is the NestJS backend for the JTradePilot application, providing a complete authentication and user management system.

## Features

-   **User Registration:** Secure sign-up with email verification.
-   **Authentication:** JWT-based (access and refresh tokens) with secure `httpOnly` cookies for refresh tokens.
-   **Password Management:** Forgot/reset password and change password flows.
-   **Email Management:** Securely change user email with verification.
-   **Security:** Rate limiting, CORS, Helmet, and secure password hashing with bcrypt.
-   **Database:** PostgreSQL with Prisma ORM.
-   **Mailing:** Nodemailer for sending transactional emails (dev setup with MailDev).

## Tech Stack

-   **Framework:** [NestJS](https://nestjs.com/)
-   **ORM:** [Prisma](https://www.prisma.io/)
-   **Database:** [PostgreSQL](https://www.postgresql.org/)
-   **Authentication:** [Passport.js](http://www.passportjs.org/) (JWT Strategy)
-   **Validation:** `class-validator` & `class-transformer`
-   **Configuration:** `@nestjs/config` with Joi validation

---

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v20 or higher)
-   [pnpm](https://pnpm.io/)
-   [PostgreSQL](https://www.postgresql.org/) server running locally.
-   [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose (Optional, for MailDev)

### 1. Setup Environment

Clone the repository and navigate into the `backend` directory.

Create an environment file named `.env` by copying the example:

```bash
cp .env.example .env
```

Open the `.env` file and fill in all the required values. Below is a complete list of all variables used by the application, which you can use as a template.

```env
# Application
NODE_ENV=development
PORT=8080
APP_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tradepilot?schema=public"

# JWT Secrets (generate strong, random strings for these)
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# Token Time-to-Live (TTL)
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
EMAIL_VERIFY_TOKEN_TTL=24h
PASSWORD_RESET_TOKEN_TTL=1h

# Email Configuration
EMAIL_FROM_NAME="JTradePilot"
EMAIL_FROM=noreply@jtradepilot.com
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false

# Rate Limiting (Throttler)
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Google Gemini AI
API_KEY=your_gemini_api_key
```