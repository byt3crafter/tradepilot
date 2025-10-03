
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
// FIX: Use named imports for Prisma types to resolve module export errors.
import { Trade, Playbook } from '@prisma/client';

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

    async getTradeAnalysis(trade: Trade, playbook: Playbook, pastMistakes: string) {
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
                ? `From the image, identify the trading instrument. Then, select the BEST matching symbol from this list of available assets: [${availableAssets.join(', ')}]. For example, if the chart shows 'US 100 Cash CFD' and the list includes 'USTEC' or 'NAS100', you must choose one from the list. The goal is to return a symbol that exists in the provided list.`
                : `Find the trading instrument symbol from the image. Extract the common ticker symbol. For example, if you see 'US 100 Cash CFD', extract 'NAS100' or 'US100'. If you see 'EURUSD', extract 'EURUSD'. Your goal is to identify the most common, short ticker symbol for the instrument shown.`;


            const textPart = {
                text: `
                **Task:** You are an expert trading analyst. Your task is to extract structured data from a trading confirmation image (like a deal ticket or a chart with a position tool). This could be an entry or an exit confirmation.

                **Data Extraction Rules:**
                - **asset**: Identify the trading instrument/symbol (e.g., 'USTEC', 'EURUSD'). ${assetInstruction}
                - **direction**: Determine the trade direction. From a deal ticket, use 'Opening direction' or 'Direction'.
                - **entryPrice**: Extract the entry price (e.g., from 'Entry price' or 'Opening price').
                - **entryDate**: Extract the opening date and time.
                - **exitPrice**: Extract the closing price.
                - **exitDate**: Extract the closing time.
                - **lotSize**: Extract the trade size or quantity (e.g., from 'Requested quantity', 'Closing Quantity', or 'Lots').
                - **stopLoss**: Extract the Stop Loss price, if present.
                - **takeProfit**: Extract the Take Profit price, if present.
                - **profitLoss**: Extract the 'Realised net P&L USD' or similar net profit/loss value.
                - **commission**: Extract the realised commission, if present.
                - **swap**: Extract the realised swap, if present.

                **CRITICAL INSTRUCTION:**
                Your response must be in the specified JSON format. For any field where the information is NOT clearly visible in the image, you MUST return 'null' for that field. DO NOT invent, guess, or return placeholder data like -999999.
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
                        entryDate: { type: Type.STRING, description: 'Full date and time string from the chart, e.g., "Sep 26, 2025 10:29 UTC+2".' },
                        lotSize: { type: Type.NUMBER },
                        commission: { type: Type.NUMBER },
                        swap: { type: Type.NUMBER },
                        exitPrice: { type: Type.NUMBER },
                        exitDate: { type: Type.STRING },
                        profitLoss: { type: Type.NUMBER },
                    },
                    required: ["asset", "direction"]
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
