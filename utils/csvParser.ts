import { Direction } from "../types";

export interface ParsedTradeData {
  asset: string;
  direction: Direction;
  entryDate: string; // ISO string
  exitDate: string; // ISO string
  entryPrice: number;
  exitPrice: number;
  lotSize: number | null;
  profitLoss: number | null;
}

const cleanNumber = (value: string): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

// Handles "29 Sep 2025 09:56:59.018"
const parseCustomDate = (dateString: string): string => {
    if (!dateString) throw new Error("Date string is empty");
    const parts = dateString.split(' ');
    if (parts.length < 4) throw new Error(`Invalid date format: ${dateString}`);
    
    const day = parts[0];
    const monthStr = parts[1];
    const year = parts[2];
    const time = parts[3];

    const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const month = monthMap[monthStr];
    if (month === undefined) throw new Error(`Invalid month: ${monthStr}`);

    const date = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${day}T${time}Z`);
    return date.toISOString();
};


export const parseBrokerReport = (fileContent: string): ParsedTradeData[] => {
    const lines = fileContent.split('\n').map(l => l.trim()).filter(Boolean);
    const deals: ParsedTradeData[] = [];

    const dealsHeaderIndex = lines.findIndex(line => line.trim() === 'Deals');
    if (dealsHeaderIndex === -1) {
        throw new Error("Could not find 'Deals' section in the report.");
    }
    
    const headerLine = lines[dealsHeaderIndex + 1];
    if (!headerLine) {
        throw new Error("Report format is invalid. Missing header row under 'Deals'.");
    }
    
    // Normalize headers for easier mapping
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    const headerMap: { [key: string]: number } = {};
    headers.forEach((h, i) => {
        // e.g., 'opening time (utc+2)' -> 'opening time'
        const normalizedHeader = h.replace(/\s*\(.*\)\s*/, '');
        headerMap[normalizedHeader] = i;
    });

    // Check for essential headers
    const requiredHeaders = ['symbol', 'opening direction', 'opening time', 'closing time', 'entry price', 'closing price', 'net usd'];
    for (const h of requiredHeaders) {
        if (headerMap[h] === undefined) {
            throw new Error(`Missing required column in report: '${h}'`);
        }
    }

    let currentLineIndex = dealsHeaderIndex + 2;
    while (currentLineIndex < lines.length) {
        const line = lines[currentLineIndex];
        // Stop when we hit an empty line with commas (summary line) or a new section header
        if (!line.trim() || line.startsWith(',,,') || /^[A-Za-z]+$/.test(line.split(',')[0])) {
            break;
        }

        const values = line.split(',');

        try {
            const profitLoss = cleanNumber(values[headerMap['net usd']]);
            
            const lotSizeString = values[headerMap['closing quantity']];
            const lotSize = lotSizeString ? cleanNumber(lotSizeString.replace('Lots', '')) : null;

            const trade: ParsedTradeData = {
                asset: values[headerMap['symbol']].trim(),
                direction: values[headerMap['opening direction']].trim() as Direction,
                entryDate: parseCustomDate(values[headerMap['opening time']].trim()),
                exitDate: parseCustomDate(values[headerMap['closing time']].trim()),
                entryPrice: cleanNumber(values[headerMap['entry price']])!,
                exitPrice: cleanNumber(values[headerMap['closing price']])!,
                lotSize: lotSize,
                profitLoss: profitLoss,
            };

            // Basic validation
            if (trade.asset && trade.direction && trade.entryDate && trade.exitDate && trade.entryPrice !== null && trade.exitPrice !== null) {
                deals.push(trade);
            }
        } catch (e) {
            console.warn(`Skipping malformed row: ${line}`, e);
        }
        
        currentLineIndex++;
    }

    return deals;
};