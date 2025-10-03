
import { Direction, ParsedTradeData } from "../types";

const cleanNumber = (value?: string | null): number | null => {
    if (!value) return null;
    // Handles '1.00 Lots', '100 005.53', '-6.42' etc.
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

// Handles "02/10/2025 18:15:54.433" -> DD/MM/YYYY
const parseCustomDateHtml = (dateString: string): string => {
    if (!dateString) throw new Error("Date string is empty");
    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) throw new Error(`Invalid date format: ${dateString}`);
    
    const [day, month, year] = datePart.split('/');
    
    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), ...timePart.split(':').map(Number) as [number, number, number]));
    return date.toISOString();
};


export const parseCTraderHtmlReport = (htmlContent: string): ParsedTradeData[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const deals: ParsedTradeData[] = [];

    let historyTable: HTMLTableElement | null = null;
    const allTitles = doc.querySelectorAll('strong');
    for (const title of allTitles) {
        if (title.textContent?.trim() === 'History') {
            const table = title.closest('table');
            if (table) {
                historyTable = table;
                break;
            }
        }
    }

    if (!historyTable) {
        throw new Error("Could not find 'History' table in the HTML report.");
    }

    const rows = historyTable.querySelectorAll('tr');

    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        // Check if it's a data row (has enough cells and isn't a header/footer)
        if (cells.length < 8 || cells[0].classList.contains('totals-title') || cells[1].classList.contains('cell-header')) {
            continue;
        }

        try {
            const closingTimeRaw = cells[3]?.textContent?.trim();
            if (!closingTimeRaw) continue; // Skip if no closing time
            
            // CRITICAL: cTrader HTML History report does not include an 'Opening time'.
            // As a pragmatic solution, we use the closing time for both entry and exit
            // to allow the trade to be imported. The user can edit it later if needed.
            const exitDate = parseCustomDateHtml(closingTimeRaw);
            const entryDate = exitDate;

            const trade: ParsedTradeData = {
                asset: cells[1]?.textContent?.trim() || '',
                direction: cells[2]?.textContent?.trim() as Direction,
                entryDate: entryDate,
                exitDate: exitDate,
                entryPrice: cleanNumber(cells[4]?.textContent)!,
                exitPrice: cleanNumber(cells[5]?.textContent)!,
                lotSize: cleanNumber(cells[6]?.textContent),
                profitLoss: cleanNumber(cells[7]?.textContent),
            };

            // Basic validation
            if (trade.asset && trade.direction && trade.entryDate && trade.exitDate && trade.entryPrice !== null && trade.exitPrice !== null) {
                deals.push(trade);
            }
        } catch (e) {
            console.warn(`Skipping malformed HTML row:`, row.innerHTML, e);
        }
    }

    return deals;
};
