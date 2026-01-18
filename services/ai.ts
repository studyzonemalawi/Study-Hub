
import { GoogleGenAI, Type } from "@google/genai";
import { ExamQuestion } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing.");
  return new GoogleGenAI({ apiKey });
};

export interface QuizChapter { chapterTitle: string; questions: QuizQuestion[]; }
export interface QuizQuestion { id: string; type: 'mcq' | 'comprehension'; question: string; options?: string[]; correctAnswer: string; explanation: string; }
export interface EvaluationResult { score: number; strengths: string[]; improvements: string[]; feedbackSummary: string; }

export const aiService = {
  explainPage: async (text: string, lang: string): Promise<string> => {
    const ai = getAI();
    const prompt = lang === 'Chichewa' 
      ? `Fotokozani mwachidule mfundo zazikulu za tsambali pogwiritsa ntchito Chichewa chosavuta: \n\n ${text}`
      : `Explain the key concepts of this textbook page in very simple English using bullet points. \n\n ${text}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.5 },
    });
    return response.text || "No explanation available.";
  },

  generateQuiz: async (title: string, subject: string, grade: string, docContext: string): Promise<QuizChapter[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Expert Malawian educator. Review: "${title}" for ${grade} ${subject}. Context: ${docContext}. Generate a quiz with 3 MCQs and 3 comprehension questions per chapter.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterTitle: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING },
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      },
                      required: ["id", "type", "question", "correctAnswer", "explanation"]
                    }
                  }
                },
                required: ["chapterTitle", "questions"]
              }
            }
          },
          required: ["chapters"]
        }
      }
    });
    return JSON.parse(response.text || '{"chapters": []}').chapters;
  },

  generateExam: async (level: string, grade: string, subject: string, context: string): Promise<ExamQuestion[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Senior MANEB Examiner. Create a ${subject} exam for ${grade}. Content: ${context}. Exactly 12 MCQs.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });
    return JSON.parse(response.text || '{"questions": []}').questions;
  },

  evaluateExam: async (questions: ExamQuestion[], userAnswers: Record<string, string>): Promise<any> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Mark results: ${JSON.stringify(questions)} Attempt: ${JSON.stringify(userAnswers)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: {
              type: Type.OBJECT,
              additionalProperties: {
                type: Type.OBJECT,
                properties: { isCorrect: { type: Type.BOOLEAN }, tip: { type: Type.STRING }, correctAnswer: { type: Type.STRING } },
                required: ["isCorrect", "tip", "correctAnswer"]
              }
            }
          },
          required: ["score", "feedback"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  evaluateComprehensionAnswer: async (question: string, userAnswer: string, modelAnswer: string, pointsToCover: string): Promise<EvaluationResult> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate: Q: ${question} User: ${userAnswer} Key: ${modelAnswer}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            feedbackSummary: { type: Type.STRING }
          },
          required: ["score", "strengths", "improvements", "feedbackSummary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
};
