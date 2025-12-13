# Prop Firm Features Documentation

This document describes the Real-Time Drawdown Calculator and Compliance PDF Export features built for prop firm traders.

## Table of Contents
- [Overview](#overview)
- [Real-Time Drawdown Calculator](#real-time-drawdown-calculator)
- [Compliance PDF Export](#compliance-pdf-export)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)

---

## Overview

## Recent Updates

- **Dashboard Restoration**: The dashboard has been restored to its original design, featuring the "Equity", "Profit Target", and "Max Loss" cards.
- **Challenge Progress**: The "Challenge Progress" feature is now integrated into the dashboard without duplicating the main metrics card.
- **PDF Export**: The compliance report export functionality has been fixed to ensure valid PDF generation. It is accessible via the document icon in the dashboard header.
- **Landing Page**: The landing page navigation has been optimized to prevent white flashes during page transitions.

## Features

1. **Real-Time Drawdown Calculator**:
   - Tracks equity, profit targets, and drawdown limits in real-time.
   - Visual progress bars for quick status checks.

2. **git **:
   - Generates a professional PDF report for prop firm challenges.
   - Includes trade history, compliance checklist, and executive summary.
   - Accessible via the "Export Report" button in the dashboard header.

These features support popular prop firms including:
- FTMO
- MyForexFunds (MFF)
- The5%ers
- FundedNext
- And any custom prop firm challenge parameters

---

## Real-Time Drawdown Calculator

### Features

#### 1. Prop Firm Templates
Admins can create and manage templates for different prop firms and challenge types.

**Template Fields:**
- Template Name (e.g., "FTMO $100k Challenge")
- Firm Name (e.g., "FTMO")
- Account Size ($)
- Profit Target ($)
- Max Drawdown ($)
- Daily Drawdown ($)
- Drawdown Type (TRAILING or STATIC)
- Minimum Trading Days
- Active/Inactive status

**Drawdown Types:**
- **TRAILING**: Peak moves up with profits (most common)
- **STATIC**: Peak stays at initial balance

#### 2. Account Template Selection
When creating a PROP_FIRM account, users can:
- Select a pre-configured template from dropdown
- Auto-fill all challenge parameters
- Manually adjust parameters if needed
- Save template reference with account

#### 3. Real-Time Tracking
The Challenge Progress Card displays:

**Profit Target:**
- Current P/L vs target
- Progress percentage with color coding
- Remaining profit to hit target

**Max Drawdown:**
- Current drawdown vs limit
- Percentage of limit used
- Remaining buffer

**Daily Drawdown:**
- Today's drawdown vs daily limit
- Percentage of limit used
- Auto-resets at midnight (user timezone)

**Trading Days:**
- Days traded count
- Progress toward minimum days
- Days remaining

#### 4. Compliance Monitoring
- Real-time compliance status badge (COMPLIANT/VIOLATIONS)
- Automatic violation detection
- Alert messages for rule breaches
- Color-coded progress bars:
  - **Green**: Safe (0-70%)
  - **Yellow**: Warning (70-90%)
  - **Red**: Danger (90-100%)

#### 5. Live Updates
- Auto-refreshes every 30 seconds
- Updates on each new trade
- No manual refresh needed

### Technical Implementation

**Backend:**
```
backend/src/broker-accounts/drawdown.service.ts
- calculateDrawdown(accountId, userId)
- calculateMaxDrawdown(trades, initialBalance, type)
- calculateDailyDrawdown(trades)
- calculateDaysTraded(trades)
```

**Frontend:**
```
components/Dashboard/ChallengeProgressCard.tsx
- Fetches drawdown data every 30s
- Displays 4 metric cards
- Shows compliance status
- Export report button
```

**Endpoints:**
- `GET /api/broker-accounts/:id/drawdown` - Get real-time drawdown calculation

---

## Compliance PDF Export

### Features

#### 1. Professional PDF Reports
Generate branded compliance reports in one click.

**Report Includes:**
- **Cover Page**: Account name, template, firm name, generation date
- **Executive Summary**:
  - Compliance status badge
  - Active violations (if any)
  - Key metrics (Total P/L, Win Rate, Trading Days)
- **Progress Metrics**:
  - Profit target progress with visual bars
  - Max drawdown usage with visual bars
  - Daily drawdown status
  - Trading days completion
- **Trade History Table**:
  - Date, Asset, Direction, Entry, Exit, P/L, Result
  - Formatted and color-coded
- **Trade Journals** (optional):
  - Mindset before trade
  - Exit reasoning
  - Lessons learned
- **AI Analysis** (optional):
  - AI-generated insights
  - Trade analysis notes
- **Compliance Checklist**:
  - Profit Target Achievement (✓/○)
  - Max Drawdown Compliance (✓/✗)
  - Daily Drawdown Compliance (✓/✗)
  - Minimum Trading Days (✓/○)

#### 2. Customization Options

**Date Range Filtering:**
- Select start and end dates
- Leave empty for all trades
- Perfect for weekly/monthly reports

**Optional Inclusions:**
- ☑ Trade Journal Entries
- ☑ AI Analysis Notes
- ☐ Trade Screenshots (coming soon)

#### 3. PDF Design
- Dark-themed professional design
- Gradient cover page with branding
- Clean typography and spacing
- Print-ready A4 format
- Color-coded metrics
- Visual progress bars

### Technical Implementation

**Backend:**
```
backend/src/pdf/pdf.service.ts
- generateComplianceReport(options)
- generateReportHtml(account, drawdownData, options)
- Uses Puppeteer for PDF generation
```

**Frontend:**
```
components/compliance/ComplianceReportModal.tsx
- Date range selection
- Optional inclusions checkboxes
- Generate and download PDF
```

**Endpoints:**
- `GET /api/pdf/compliance-report?accountId=&startDate=&endDate=&includeJournal=&includeAiNotes=`

---

## Installation

### 1. Install Puppeteer

```bash
cd backend
npm install puppeteer
```

### 2. Apply Database Migration

```bash
cd backend
npx prisma migrate deploy
```

Or if database connection issues:

```bash
npx prisma db push
```

### 3. Restart Backend

```bash
npm run start:dev
```

---

## Usage Guide

### For Admins: Creating Templates

1. Navigate to **Admin Panel** (must have ADMIN role)
2. Click **Templates** in sidebar
3. Click **Create Template** button
4. Fill in template details:
   - Name: "FTMO $100k Challenge"
   - Firm Name: "FTMO"
   - Account Size: 100000
   - Profit Target: 10000
   - Daily Drawdown: 5000
   - Max Drawdown: 10000
   - Drawdown Type: TRAILING
   - Min Trading Days: 10
   - Active: ✓
5. Click **Create Template**

**Pre-built Template Examples:**

**FTMO $100k Challenge:**
- Account Size: $100,000
- Profit Target: $10,000 (10%)
- Max Drawdown: $10,000 (10%)
- Daily Drawdown: $5,000 (5%)
- Drawdown Type: TRAILING
- Min Trading Days: 10

**MyForexFunds $50k:**
- Account Size: $50,000
- Profit Target: $3,000 (6%)
- Max Drawdown: $2,500 (5%)
- Daily Drawdown: $1,500 (3%)
- Drawdown Type: STATIC
- Min Trading Days: 5

### For Users: Using Templates

#### Creating a Prop Firm Account

1. Go to **Settings** → **Accounts**
2. Click **Add New Account**
3. Fill in basic details:
   - Account Name: "FTMO Challenge Dec 2025"
   - Account Type: **Prop Firm**
   - Initial Balance: (auto-filled from template)
   - Currency: USD
   - Leverage: 100
4. **Select Template** (appears when type is Prop Firm):
   - Choose from dropdown (e.g., "FTMO $100k Challenge - FTMO ($100,000)")
   - All challenge parameters auto-fill
5. **Trading Objectives** section auto-enables and fills:
   - Profit Target: $10,000 ✓
   - Min Trading Days: 10 ✓
   - Max Overall Loss: $10,000 ✓
   - Max Daily Loss: $5,000 ✓
6. Adjust values if needed (optional)
7. Click **Create Account**

#### Viewing Challenge Progress

1. Select your prop firm account from dropdown
2. Dashboard shows **Challenge Progress Card** with:
   - Compliance status badge
   - Profit Target progress
   - Max Drawdown usage
   - Daily Drawdown (resets daily)
   - Trading Days count
   - Any violations (if present)
3. Card auto-refreshes every 30 seconds

#### Exporting Compliance Report

1. In **Challenge Progress Card**, click **Export Report**
2. In modal, configure report:
   - **Date Range** (optional): Select start/end dates
   - **Include Trade Journals**: ✓ (recommended)
   - **Include AI Notes**: ✓ (recommended)
3. Click **Generate PDF Report**
4. PDF downloads automatically
5. Submit to prop firm or keep for records

---

## API Reference

### Admin Endpoints

#### Get All Templates
```http
GET /api/admin/templates
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "FTMO $100k Challenge",
    "firmName": "FTMO",
    "accountSize": 100000,
    "profitTarget": 10000,
    "dailyDrawdown": 5000,
    "maxDrawdown": 10000,
    "drawdownType": "TRAILING",
    "minTradingDays": 10,
    "isActive": true,
    "createdAt": "2025-12-05T...",
    "updatedAt": "2025-12-05T..."
  }
]
```

#### Get Template by ID
```http
GET /api/admin/templates/{id}
Authorization: Bearer {token}
```

#### Create Template
```http
POST /api/admin/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "FTMO $100k Challenge",
  "firmName": "FTMO",
  "accountSize": 100000,
  "profitTarget": 10000,
  "dailyDrawdown": 5000,
  "maxDrawdown": 10000,
  "drawdownType": "TRAILING",
  "minTradingDays": 10,
  "isActive": true
}
```

#### Update Template
```http
PATCH /api/admin/templates/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": false
}
```

#### Delete Template
```http
DELETE /api/admin/templates/{id}
Authorization: Bearer {token}
```

### User Endpoints

#### Get Drawdown Calculation
```http
GET /api/broker-accounts/{accountId}/drawdown
Authorization: Bearer {token}
```

**Response:**
```json
{
  "accountId": "uuid",
  "accountName": "FTMO Challenge Dec 2025",
  "initialBalance": 100000,
  "currentBalance": 108500,
  "templateName": "FTMO $100k Challenge",
  "firmName": "FTMO",
  "totalProfitLoss": 8500,
  "profitLossPercentage": 8.5,
  "profitTarget": 10000,
  "profitTargetProgress": 85,
  "profitTargetRemaining": 1500,
  "maxDrawdownLimit": 10000,
  "dailyDrawdownLimit": 5000,
  "currentMaxDrawdown": -500,
  "currentDailyDrawdown": -200,
  "maxDrawdownPercentage": 5,
  "dailyDrawdownPercentage": 4,
  "minTradingDays": 10,
  "daysTradedCount": 7,
  "daysTradedProgress": 70,
  "isCompliant": true,
  "violations": [],
  "drawdownType": "TRAILING"
}
```

#### Generate PDF Report
```http
GET /api/pdf/compliance-report?accountId={id}&startDate=2025-12-01&endDate=2025-12-05&includeJournal=true&includeAiNotes=true
Authorization: Bearer {token}
```

**Response:** PDF file download

**Query Parameters:**
- `accountId` (required): Account ID
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `includeJournal` (optional): Include trade journals (true/false)
- `includeAiNotes` (optional): Include AI analysis (true/false)
- `includeScreenshots` (optional): Include screenshots (true/false) - coming soon

---

## Database Schema

### PropFirmTemplate Model

```prisma
model PropFirmTemplate {
  id                String          @id @default(uuid())
  name              String          // e.g., "FTMO $100k Challenge"
  firmName          String          // e.g., "FTMO"
  accountSize       Float           // e.g., 100000
  profitTarget      Float           // e.g., 10000
  dailyDrawdown     Float           // e.g., 5000
  maxDrawdown       Float           // e.g., 10000
  drawdownType      DrawdownType    @default(TRAILING)
  minTradingDays    Int             // e.g., 10
  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  // Relations
  brokerAccounts    BrokerAccount[]
}

enum DrawdownType {
  TRAILING
  STATIC
}
```

### BrokerAccount Update

```prisma
model BrokerAccount {
  // ... existing fields ...

  templateId     String?
  template       PropFirmTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  // ... rest of model ...
}
```

---

## Troubleshooting

### Migration Issues

**Error:** "Migration failed to apply"

**Solution:**
```bash
cd backend
npx prisma migrate resolve --applied {migration_name}
npx prisma migrate deploy
```

Or use db push:
```bash
npx prisma db push
```

### Puppeteer Issues

**Error:** "Failed to launch browser"

**Solution:** Install Chrome/Chromium dependencies:
```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser

# Or use bundled Chromium
npm install puppeteer --save
```

### Template Not Showing

**Issue:** Template dropdown empty on account form

**Solution:**
1. Verify templates exist in Admin Panel → Templates
2. Ensure templates are marked as Active (isActive: true)
3. Check browser console for API errors
4. Verify `/api/admin/templates` endpoint returns templates

### Drawdown Calculation Not Updating

**Issue:** Challenge Progress Card shows stale data

**Solution:**
1. Card auto-refreshes every 30s - wait for next refresh
2. Manually refresh browser if needed
3. Verify trades have exitDate set (only closed trades count)
4. Check `/api/broker-accounts/{id}/drawdown` endpoint directly

---

## Future Enhancements

### Planned Features
- [ ] Trade screenshots in PDF reports
- [ ] Custom PDF branding (logo, colors)
- [ ] Email report delivery
- [ ] Scheduled report generation
- [ ] Multi-phase challenge support
- [ ] Challenge phase progression automation
- [ ] Webhook notifications for violations
- [ ] Mobile app integration

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/TradePilot/issues
- Email: support@jtradepilot.com
- Discord: https://discord.gg/JTradePilot

---

## Changelog

### v1.0.0 (December 5, 2025)
- ✅ PropFirmTemplate model and admin CRUD
- ✅ Template selector in account form
- ✅ Real-time drawdown calculator
- ✅ Challenge Progress Dashboard Card
- ✅ Compliance PDF export with Puppeteer
- ✅ Trailing vs Static drawdown support
- ✅ Daily drawdown midnight reset
- ✅ Compliance monitoring and violations
- ✅ Trade journal and AI notes in PDF
- ✅ Date range filtering for reports

---

**Built with ❤️ for prop firm traders**

*Deadline: December 15, 2025 ✅ DELIVERED December 5, 2025*
