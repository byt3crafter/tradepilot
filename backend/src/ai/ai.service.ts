
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
// FIX: Standardized to named imports to resolve type errors.
// Changed to namespace import to resolve module export errors.
import * as Prisma from '@prisma/client';

const base64ToGenaiPart = (base64Data: string) => {
    const match = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Invalid base64 string format for AI service");
    return {
        inlineData: {
            mimeType: match[1],
            data: match[2],
        },
    };
};

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenAI;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('API_KEY');
        if (!apiKey) {
            this.logger.error('API_KEY is not configured in the environment.');
            throw new InternalServerErrorException('API_KEY is not configured.');
        }
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async getTradeAnalysis(trade: Prisma.Trade, playbook: Prisma.Playbook, pastMistakes: string) {
        if (!trade.screenshotBeforeUrl || !trade.screenshotAfterUrl) {
            throw new Error("Screenshots are missing for AI analysis.");
        }

        try {
            const beforeImagePart = base64ToGenaiPart(trade.screenshotBeforeUrl);
            const afterImagePart = base64ToGenaiPart(trade.screenshotAfterUrl);

            const textPart = {
              text: `
                **Your Task:**
                Analyze the "Before Entry" and "After Exit" screenshots. Based on the trader's stated playbook, objectively evaluate the trade execution.
                ${pastMistakes ? `Pay close attention to see if any of these recurring past mistakes were made: ${pastMistakes}.` : ''}
                The analysis must be strictly based on the provided playbook and visual evidence.
                Provide a concise summary and list the good points and mistakes in JSON format.

                **Playbook:**
                - Name: ${playbook.name}
                - Core Idea: ${playbook.coreIdea}

                **Trade Details:**
                - Asset: ${trade.asset}
                - Direction: ${trade.direction}
                - Entry Price: ${trade.entryPrice}
                - Exit Price: ${trade.exitPrice}
                - Result: ${trade.result}
            `};
            
            const response = await this.genAI.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [textPart, beforeImagePart, afterImagePart] },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    summary: {
                      type: Type.STRING,
                      description: 'A brief, one-sentence summary of the trade execution quality.',
                    },
                    mistakes: {
                      type: Type.ARRAY,
                      description: 'List of mistakes made during the trade.',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          mistake: {
                            type: Type.STRING,
                            description: 'Short description of a mistake.',
                          },
                          reasoning: {
                            type: Type.STRING,
                            description: 'Explain why it was a mistake based on the playbook.',
                          },
                        },
                      },
                    },
                    goodPoints: {
                      type: Type.ARRAY,
                      description: 'List of good points about the trade execution.',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          point: {
                            type: Type.STRING,
                            description: 'Short description of a good point.',
                          },
                          reasoning: {
                            type: Type.STRING,
                            description: 'Explain why it was good based on the playbook.',
                          },
                        },
                      },
                    },
                  },
                },
              },
            });
            
            if (!response.text) {
                this.logger.error('AI analysis returned an empty response from Gemini API.');
                throw new InternalServerErrorException('AI analysis returned an empty response.');
            }
            const jsonText = response.text.trim();
            
            return JSON.parse(jsonText);

        } catch (error) {
            this.logger.error('Error getting trade analysis from Gemini', error.stack);
            throw new InternalServerErrorException('Failed to analyze trade with AI.');
        }
    }
    
    async getChartAnalysis(screenshotBase64: string, availableAssets?: string[]) {
        try {
            const imagePart = base64ToGenaiPart(screenshotBase64);
            
            const assetInstruction = availableAssets && availableAssets.length > 0
                ? `From the chart, identify the trading instrument. Then, select the BEST matching symbol from this list of available assets: [${availableAssets.join(', ')}]. For example, if the chart shows 'US 100 Cash CFD' and the list includes 'USTEC' or 'NAS100', you must choose one from the list. The goal is to return a symbol that exists in the provided list.`
                : `Find the trading instrument symbol at the top left of the chart. Extract the common ticker symbol. For example, if you see 'US 100 Cash CFD', extract 'NAS100' or 'US100'. If you see 'EURUSD', extract 'EURUSD'. Your goal is to identify the most common, short ticker symbol for the instrument shown.`;


            const textPart = {
                text: `
                **Task:** You are an expert trading data extractor. Your task is to extract structured data from a single trading-related screenshot. The image could be a chart with a visual position tool OR a text-based list/row of position details.

                **Priority 1: Text-Based Details Extraction**
                First, scan the image for text labels like "Symbol", "Quantity", "Volume", "Direction", "Entry", "TP", "SL", "Closing Time", "Closing Price", "Net USD", "Net P/L", "Commissions", and "Swap". If you find them, extract the data from here.
                - **asset**: The ticker symbol (e.g., 'USTEC', 'EURUSD').
                - **lotSize**: From the "Quantity" or "Volume" label, extract the numeric value only (e.g., from "3 Lots" or "3 Indices", extract 3).
                - **direction**: 'Buy' or 'Sell'.
                - **entryPrice**: The value next to "Entry".
                - **stopLoss**: The value next to "SL".
                - **takeProfit**: The value next to "TP".
                - **entryDate**: From the "Created (UTC...)" label, extract the full date and time.
                - **exitDate**: From the "Closing Time (UTC...)" label, extract the full date and time.
                - **exitPrice**: From "Closing Price".
                - **profitLoss**: From "Net USD" or "Net P/L", extract the numeric value.
                - **commission**: From "Commissions".
                - **swap**: From "Swap".

                **Priority 2: Chart-Based Visual Tool Extraction**
                If text-based details are NOT present, analyze the visual 'Long Position' or 'Short Position' tool on the chart.
                - **Step 1: Determine Trade Direction**
                  - If the green area is ABOVE the entry price, the direction is 'Buy'.
                  - If the red area is ABOVE the entry price, the direction is 'Sell'.
                - **Step 2: Extract Price Levels**
                  - **entryPrice**: The price where the red and green areas meet.
                  - **stopLoss**: For a 'Buy', it's the BOTTOM of the RED area. For a 'Sell', it's the TOP of the RED area.
                  - **takeProfit**: For a 'Buy', it's the TOP of the GREEN area. For a 'Sell', it's the BOTTOM of the GREEN area.
                - **Step 3: Extract Asset Symbol**
                  - ${assetInstruction}
                - **Step 4: Extract Date & Time**
                  - Find the date and time from the top of the chart. Map this to 'entryDate'.

                **Final Output:**
                Your response must be in the specified JSON format. If a piece of information is not visible, return null for that field. Prioritize text-based extraction over visual extraction if both seem present.
                `
            };

            const response = await this.genAI.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [textPart, imagePart] },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        asset: { type: Type.STRING },
                        direction: { type: Type.STRING, enum: ["Buy", "Sell"] },
                        entryPrice: { type: Type.NUMBER },
                        stopLoss: { type: Type.NUMBER },
                        takeProfit: { type: Type.NUMBER },
                        entryDate: { type: Type.STRING, description: 'Full entry date and time string.' },
                        lotSize: { type: Type.NUMBER },
                        exitPrice: { type: Type.NUMBER },
                        exitDate: { type: Type.STRING, description: 'Full exit date and time string.' },
                        profitLoss: { type: Type.NUMBER },
                        commission: { type: Type.NUMBER },
                        swap: { type: Type.NUMBER },
                    },
                }
              }
            });

            if (!response.text) {
                this.logger.error('AI chart analysis returned empty response');
                throw new InternalServerErrorException('AI chart analysis returned empty response.');
            }
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);

        } catch (error) {
            this.logger.error('Error getting chart analysis from Gemini', error.stack);
            throw new InternalServerErrorException('Failed to get AI chart analysis.');
        }
    }


    async getPreTradeCheck(playbook: any, screenshotBase64: string, asset: string) {
        try {
            const imagePart = base64ToGenaiPart(screenshotBase64);
            const entryCriteria = playbook.setups
                .flatMap((setup: any) => setup.checklistItems)
                .filter((item: any) => item.type === 'ENTRY_CRITERIA')
                .map((item: any) => `- ${item.text}`)
                .join('\n');

            if (!entryCriteria) {
                return []; // No rules to check
            }

            const textPart = {
                text: `
                **Task:** You are a trading co-pilot. Analyze the provided chart screenshot for asset ${asset}.
                Check if the setup meets the following entry criteria from the trader's playbook.
                Your response must be in JSON format. For each rule, state if it is met ('Yes', 'No', or 'Indeterminate') and provide brief reasoning.

                **Entry Criteria:**
                ${entryCriteria}
                `
            };
            
            const response = await this.genAI.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts: [textPart, imagePart] },
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            rule: { type: Type.STRING },
                            met: { type: Type.STRING, enum: ['Yes', 'No', 'Indeterminate'] },
                            reasoning: { type: Type.STRING },
                        }
                    }
                  }
              }
            });

            if (!response.text) {
                this.logger.error('AI pre-trade check returned empty response');
                throw new InternalServerErrorException('AI pre-trade check returned empty response.');
            }
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);

        } catch (error) {
            this.logger.error('Error getting pre-trade check from Gemini', error.stack);
            throw new InternalServerErrorException('Failed to get AI sanity check.');
        }
    }
    
    private async generateDebrief(context: string, systemInstruction: string, errorContext: string) {
        try {
            const response = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: context,
                config: { systemInstruction },
            });
            if (!response.text) {
                this.logger.error(`AI ${errorContext} returned an empty response.`);
                throw new InternalServerErrorException(`AI ${errorContext} returned an empty response.`);
            }
            return response.text;
        } catch (error) {
            this.logger.error(`Error getting ${errorContext} from Gemini`, error.stack);
            throw new InternalServerErrorException(`Failed to generate ${errorContext}.`);
        }
    }

    async getWeeklyDebrief(context: string) {
        const systemInstruction = "You are a professional trading coach named tradePilot AI. Analyze the following weekly performance summary for a trader. Provide a concise, insightful, and encouraging debrief. Identify the single biggest strength and the single most critical area for improvement. Conclude with one piece of actionable advice for the upcoming week. Speak directly to the trader. Keep the entire response to 3-4 paragraphs.";
        return this.generateDebrief(context, systemInstruction, 'weekly debrief');
    }

    async getDailyDebrief(context: string) {
        const systemInstruction = "You are a professional trading coach named tradePilot AI. Analyze the following summary of the trader's performance for today. Provide a concise, insightful debrief. Identify the single biggest strength and the single most critical area for improvement from today's session. Conclude with one piece of actionable advice for tomorrow's session. Speak directly to the trader. Keep the entire response to 2-3 paragraphs.";
        return this.generateDebrief(context, systemInstruction, 'daily debrief');
    }
}