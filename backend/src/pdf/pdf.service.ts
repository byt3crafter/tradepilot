import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { DrawdownService } from '../broker-accounts/drawdown.service';

export interface ComplianceReportOptions {
  accountId: string;
  userId: string;
  startDate?: Date;
  endDate?: Date;
  includeScreenshots?: boolean;
  includeJournal?: boolean;
  includeAiNotes?: boolean;
}

@Injectable()
export class PdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drawdownService: DrawdownService,
  ) { }

  async generateComplianceReport(options: ComplianceReportOptions): Promise<Buffer> {
    const { accountId, userId, startDate, endDate, includeScreenshots, includeJournal, includeAiNotes } = options;

    // Fetch account data
    const account = await this.prisma.brokerAccount.findFirst({
      where: { id: accountId, userId },
      include: {
        template: true,
        objectives: true,
        trades: {
          where: {
            exitDate: {
              not: null,
              ...(startDate && endDate ? { gte: startDate, lte: endDate } : {}),
            },
          },
          include: {
            tradeJournal: includeJournal,
            aiAnalysis: includeAiNotes,
          },
          orderBy: { exitDate: 'asc' },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Get drawdown calculation
    const drawdownData = await this.drawdownService.calculateDrawdown(accountId, userId);

    // Generate HTML content
    const html = this.generateReportHtml(account, drawdownData, options);

    // Generate PDF using Puppeteer
    console.log('Launching Puppeteer...');
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      console.log('Puppeteer launched successfully.');

      const page = await browser.newPage();
      console.log('New page created. Setting content...');
      await page.setContent(html, { waitUntil: 'networkidle0' });
      console.log('Content set. Generating PDF...');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });
      console.log('PDF generated successfully.');

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Puppeteer Error:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private generateReportHtml(account: any, drawdownData: any, options: ComplianceReportOptions): string {
    const { includeScreenshots, includeJournal, includeAiNotes } = options;
    const trades = account.trades;

    // Calculate summary stats
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => (t.profitLoss ?? 0) > 0).length;
    const losingTrades = trades.filter((t: any) => (t.profitLoss ?? 0) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPL = trades.reduce((sum: number, t: any) => sum + (t.profitLoss ?? 0), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compliance Report - ${account.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      background: #ffffff;
    }
    .page {
      padding: 40px;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }

    /* Cover Page */
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .cover h1 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .cover .subtitle {
      font-size: 24px;
      opacity: 0.9;
      margin-bottom: 40px;
    }
    .cover .meta {
      font-size: 16px;
      opacity: 0.8;
    }

    /* Headers */
    h2 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #1a1a1a;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    h3 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #333;
    }

    /* Compliance Badge */
    .compliance-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin: 20px 0;
    }
    .compliance-badge.pass {
      background: #d4edda;
      color: #155724;
      border: 2px solid #c3e6cb;
    }
    .compliance-badge.fail {
      background: #f8d7da;
      color: #721c24;
      border: 2px solid #f5c6cb;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6c757d;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .stat-sublabel {
      font-size: 14px;
      color: #6c757d;
      margin-top: 5px;
    }

    /* Progress Bar */
    .progress-container {
      margin: 15px 0;
    }
    .progress-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
      color: #495057;
    }
    .progress-bar-bg {
      width: 100%;
      height: 12px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #667eea;
      transition: width 0.3s;
    }
    .progress-bar-fill.success { background: #28a745; }
    .progress-bar-fill.warning { background: #ffc107; }
    .progress-bar-fill.danger { background: #dc3545; }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }
    th {
      background: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      color: #495057;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e9ecef;
    }
    tr:hover { background: #f8f9fa; }

    .trade-win { color: #28a745; font-weight: 600; }
    .trade-loss { color: #dc3545; font-weight: 600; }

    /* Violations */
    .violations {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .violations h3 {
      color: #856404;
      margin-top: 0;
    }
    .violations ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .violations li {
      color: #856404;
      margin: 5px 0;
    }

    /* Footer */
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover">
    <h1>Compliance Report</h1>
    <div class="subtitle">${account.name}</div>
    ${account.template ? `<div class="meta">${account.template.name} • ${account.template.firmName}</div>` : ''}
    <div class="meta" style="margin-top: 20px;">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <!-- Summary Page -->
  <div class="page">
    <h2>Executive Summary</h2>

    <div class="compliance-badge ${drawdownData.isCompliant ? 'pass' : 'fail'}">
      ${drawdownData.isCompliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
    </div>

    ${drawdownData.violations.length > 0 ? `
      <div class="violations">
        <h3>Active Violations</h3>
        <ul>
          ${drawdownData.violations.map((v: string) => `<li>${v}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" style="color: ${totalPL >= 0 ? '#28a745' : '#dc3545'}">
          ${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)}
        </div>
        <div class="stat-sublabel">${drawdownData.profitLossPercentage.toFixed(2)}%</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Total Trades</div>
        <div class="stat-value">${totalTrades}</div>
        <div class="stat-sublabel">${winningTrades}W / ${losingTrades}L</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">${winRate.toFixed(1)}%</div>
        <div class="stat-sublabel">${winningTrades} winners</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Trading Days</div>
        <div class="stat-value">${drawdownData.daysTradedCount}</div>
        ${drawdownData.minTradingDays ? `<div class="stat-sublabel">of ${drawdownData.minTradingDays} required</div>` : ''}
      </div>
    </div>

    ${drawdownData.profitTarget ? `
      <div class="progress-container">
        <div class="progress-label">
          <span>Profit Target</span>
          <span>$${drawdownData.totalProfitLoss.toFixed(2)} / $${drawdownData.profitTarget.toFixed(2)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${drawdownData.profitTargetProgress >= 100 ? 'success' : drawdownData.profitTargetProgress >= 70 ? 'warning' : ''}"
               style="width: ${Math.min(drawdownData.profitTargetProgress || 0, 100)}%"></div>
        </div>
      </div>
    ` : ''}

    ${drawdownData.maxDrawdownLimit ? `
      <div class="progress-container">
        <div class="progress-label">
          <span>Max Drawdown</span>
          <span>$${Math.abs(drawdownData.currentMaxDrawdown).toFixed(2)} / $${drawdownData.maxDrawdownLimit.toFixed(2)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${drawdownData.maxDrawdownPercentage >= 90 ? 'danger' : drawdownData.maxDrawdownPercentage >= 70 ? 'warning' : 'success'}"
               style="width: ${Math.min(drawdownData.maxDrawdownPercentage || 0, 100)}%"></div>
        </div>
      </div>
    ` : ''}

    ${drawdownData.dailyDrawdownLimit ? `
      <div class="progress-container">
        <div class="progress-label">
          <span>Daily Drawdown</span>
          <span>$${Math.abs(drawdownData.currentDailyDrawdown).toFixed(2)} / $${drawdownData.dailyDrawdownLimit.toFixed(2)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${drawdownData.dailyDrawdownPercentage >= 90 ? 'danger' : drawdownData.dailyDrawdownPercentage >= 70 ? 'warning' : 'success'}"
               style="width: ${Math.min(drawdownData.dailyDrawdownPercentage || 0, 100)}%"></div>
        </div>
      </div>
    ` : ''}
  </div>

  <!-- Trade History -->
  <div class="page">
    <h2>Trade History</h2>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Asset</th>
          <th>Direction</th>
          <th>Entry</th>
          <th>Exit</th>
          <th>P/L</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${trades.map((trade: any) => `
          <tr>
            <td>${new Date(trade.exitDate).toLocaleDateString()}</td>
            <td>${trade.asset}</td>
            <td>${trade.direction}</td>
            <td>$${trade.entryPrice.toFixed(2)}</td>
            <td>${trade.exitPrice ? '$' + trade.exitPrice.toFixed(2) : '-'}</td>
            <td class="${(trade.profitLoss ?? 0) >= 0 ? 'trade-win' : 'trade-loss'}">
              ${(trade.profitLoss ?? 0) >= 0 ? '+' : ''}$${(trade.profitLoss ?? 0).toFixed(2)}
            </td>
            <td>${trade.result || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${includeJournal && trades.some((t: any) => t.tradeJournal) ? `
      <h3>Trade Journal Entries</h3>
      ${trades.filter((t: any) => t.tradeJournal).map((trade: any) => `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
          <strong>${trade.asset} - ${new Date(trade.exitDate).toLocaleDateString()}</strong>
          <p style="margin: 10px 0;"><strong>Mindset Before:</strong> ${trade.tradeJournal.mindsetBefore}</p>
          <p style="margin: 10px 0;"><strong>Exit Reasoning:</strong> ${trade.tradeJournal.exitReasoning}</p>
          <p style="margin: 10px 0;"><strong>Lessons Learned:</strong> ${trade.tradeJournal.lessonsLearned}</p>
        </div>
      `).join('')}
    ` : ''}
  </div>

  <!-- Compliance Checklist -->
  <div class="page">
    <h2>Compliance Checklist</h2>

    <table>
      <thead>
        <tr>
          <th style="width: 60%;">Requirement</th>
          <th>Status</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${drawdownData.profitTarget ? `
          <tr>
            <td>Profit Target Achievement</td>
            <td>${drawdownData.profitTargetProgress >= 100 ? '✓' : '○'}</td>
            <td>${drawdownData.profitTargetProgress.toFixed(1)}% complete</td>
          </tr>
        ` : ''}

        ${drawdownData.maxDrawdownLimit ? `
          <tr>
            <td>Max Drawdown Compliance</td>
            <td>${Math.abs(drawdownData.currentMaxDrawdown) <= drawdownData.maxDrawdownLimit ? '✓' : '✗'}</td>
            <td>$${Math.abs(drawdownData.currentMaxDrawdown).toFixed(2)} / $${drawdownData.maxDrawdownLimit.toFixed(2)}</td>
          </tr>
        ` : ''}

        ${drawdownData.dailyDrawdownLimit ? `
          <tr>
            <td>Daily Drawdown Compliance</td>
            <td>${Math.abs(drawdownData.currentDailyDrawdown) <= drawdownData.dailyDrawdownLimit ? '✓' : '✗'}</td>
            <td>$${Math.abs(drawdownData.currentDailyDrawdown).toFixed(2)} / $${drawdownData.dailyDrawdownLimit.toFixed(2)}</td>
          </tr>
        ` : ''}

        ${drawdownData.minTradingDays ? `
          <tr>
            <td>Minimum Trading Days</td>
            <td>${drawdownData.daysTradedCount >= drawdownData.minTradingDays ? '✓' : '○'}</td>
            <td>${drawdownData.daysTradedCount} / ${drawdownData.minTradingDays} days</td>
          </tr>
        ` : ''}
      </tbody>
    </table>

    <div class="footer">
      <p>Generated by JTradePilot • ${new Date().toLocaleString()}</p>
      <p style="margin-top: 5px;">This report is for informational purposes only and does not constitute financial advice.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
