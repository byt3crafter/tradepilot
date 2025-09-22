# tradePilot Backend

This is the NestJS backend for the tradePilot application, providing a complete authentication and user management system.

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
EMAIL_FROM_NAME="tradePilot"
EMAIL_FROM=noreply@tradepilot.com
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false

# Rate Limiting (Throttler)
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Paddle Billing
PADDLE_ENV=sandbox # or production
PADDLE_API_KEY=your_paddle_api_key
PADDLE_CLIENT_SIDE_TOKEN=your_paddle_client_side_token
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
PADDLE_PRICE_ID=your_paddle_price_id
```

### 2. Install Dependencies

```bash
pnpm install
```

> **Note on pnpm Build Scripts:**
> `pnpm` has a security feature that prevents packages from running build scripts (`postinstall`) by default. This project relies on scripts from packages like `prisma` and `bcrypt` to function correctly. The `backend/package.json` file is already configured to allow these specific, trusted scripts to run. If you encounter warnings about ignored build scripts, ensure your `package.json` includes the `pnpm.allowedUnsafeBuiltDependencies` setting.

### 3. Prepare the Database (Crucial Step)

Before you can run migrations, you must enable the `citext` extension in your PostgreSQL database. This is required for case-insensitive emails.

> **Note:** The `citext` extension is part of the `postgresql-contrib` package, which may not be installed by default. If you see an error like `extension "citext" is not available`, you must install this package on your database server first.
> 
> - **For Debian/Ubuntu:** `sudo apt-get update && sudo apt-get install postgresql-contrib`
> - **For RHEL/CentOS/Fedora:** `sudo dnf install postgresql-contrib`
> 
> After installing, you may need to restart your PostgreSQL service.

Once the extension package is installed, you need to enable it for your specific `tradepilot` database.

> **IMPORTANT:** You must run the following command against the **exact same database** specified in your `.env` file's `DATABASE_URL`. A common mistake is running this on a different database (e.g., `postgres` or `tradepilot_db` when your app uses `tradepilot`).

1.  **Find your `DATABASE_URL`** in the `.env` file.
2.  **Run the `psql` command** below, replacing `"YOUR_DATABASE_URL_FROM_.ENV"` with your actual URL.

```bash
psql "YOUR_DATABASE_URL_FROM_.ENV" -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

**Example:**

If your `.env` file contains:
`DATABASE_URL="postgresql://user:password@localhost:5432/tradepilot"`

Then you should run this exact command:
```bash
psql "postgresql://user:password@localhost:5432/tradepilot" -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

> **Troubleshooting:** If `pnpm prisma:migrate` still fails with `type "citext" does not exist`, it means the extension was not enabled on the correct database. Please carefully double-check your `DATABASE_URL` and re-run the `psql` command.

### 4. Run Database Migrations

Now that the extension is enabled, create the database tables with Prisma Migrate.

```bash
pnpm prisma:migrate
```

You can optionally seed the database with test users:
```bash
pnpm seed
```

### 5. Start the Application

```bash
pnpm dev
```

The application will be running on `http://localhost:8080`.

---

## API Endpoints

All successful responses are wrapped in a `{ "success": true, "data": { ... } }` structure.

-   `POST /auth/register` - Register a new user.
-   `GET /auth/verify-email?token=...` - Verify user's email address.
-   `POST /auth/resend-verification` - Resend the verification email.
-   `POST /auth/login` - Log in a user.
-   `POST /auth/refresh` - Get a new access token using the refresh token cookie.
-   `POST /auth/logout` - Log out a user.
-   `POST /auth/forgot-password` - Request a password reset link.
-   `POST /auth/reset-password` - Reset password with a valid token.
-   `PATCH /auth/change-password` - Change password for an authenticated user.
-   `PATCH /auth/change-email` - Request an email change for an authenticated user.
-   `GET /users/me` - Get the profile of the currently authenticated user.

### Example `curl` Commands

**Register:**
```bash
curl -X POST http://localhost:8080/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "Password123!",
  "fullName": "Test User"
}'
```

**Login:**
```bash
curl -X POST http://localhost:8080/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "Password123!"
}'
```

Update database: pnpm prisma:migrate
Run app: pnpm dev
Run: ngrok http http://localhost:8080
