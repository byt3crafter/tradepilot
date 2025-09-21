


import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// FIX: Switched to @google/genai and imported GoogleGenAI and Type as per the new SDK guidelines.
import { GoogleGenAI, Type } from '@google/genai';
// FIX: Removed unavailable Prisma types to prevent compilation errors.
// import { Trade, Strategy } from '@prisma/client';

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
    // FIX: Updated to use GoogleGenAI type from the new SDK.
    private genAI: GoogleGenAI;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new InternalServerErrorException('GEMINI_API_KEY is not configured.');
        }
        // FIX: Updated to use new GoogleGenAI({apiKey}) initialization.
        this.genAI = new GoogleGenAI({ apiKey });
    }

    // FIX: Refactored to use a single API call with JSON output as per new SDK guidelines.
    // FIX: Use `any` for Trade and Strategy types due to import issues.
    async getTradeAnalysis(trade: any, strategy: any, pastMistakes: string) {
        if (!trade.screenshotBeforeUrl || !trade.screenshotAfterUrl) {
            throw new Error("Screenshots are missing for AI analysis.");
        }

        try {
            const beforeImagePart = base64ToGenaiPart(trade.screenshotBeforeUrl);
            const afterImagePart = base64ToGenaiPart(trade.screenshotAfterUrl);

            const textPart = {
              text: `
                **Your Task:**
                Analyze the "Before Entry" and "After Exit" screenshots. Based on the trader's stated strategy, objectively evaluate the trade execution.
                ${pastMistakes ? `Pay close attention to see if any of these recurring past mistakes were made: ${pastMistakes}.` : ''}
                The analysis must be strictly based on the provided strategy and visual evidence.
                Provide a concise summary and list the good points and mistakes in JSON format.

                **Strategy:**
                - Name: ${strategy.name}
                - Description: ${strategy.description}

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
                            description: 'Explain why it was a mistake based on the strategy.',
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
                            description: 'Explain why it was good based on the strategy.',
                          },
                        },
                      },
                    },
                  },
                },
              },
            });
            
            // FIX: Safely access the .text property to handle potential undefined values.
            const text = response.text;
            if (!text) {
                this.logger.error('AI analysis returned an empty response from Gemini API.');
                throw new InternalServerErrorException('AI analysis returned an empty response.');
            }
            const jsonText = text.trim();
            
            return JSON.parse(jsonText);

        } catch (error) {
            this.logger.error('Error getting trade analysis from Gemini', error.stack);
            throw new InternalServerErrorException('Failed to analyze trade with AI.');
        }
    }
}