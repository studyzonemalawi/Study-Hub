
import { GoogleGenAI, Type } from "@google/genai";
import { ExamQuestion } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set API_KEY in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface QuizChapter {
  chapterTitle: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'comprehension';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface EvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  feedbackSummary: string;
}

export const aiService = {
  explainPage: async (text: string, lang: string): Promise<string> => {
    const ai = getAI();
    const prompt = lang === 'Chichewa' 
      ? `Fotokozani mfundo zazikulu za tsambali mwachidule komanso m'chilankhulo chosavuta cha Chichewa: \n\n ${text}`
      : `Explain the key concepts of this textbook page in very simple English, using bullet points for clarity. \n\n ${text}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.7,
      },
    });
    return response.text || "Could not generate explanation.";
  },

  generateQuiz: async (title: string, subject: string, grade: string, docContext: string): Promise<QuizChapter[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert Malawian educator. Review textbook: "${title}" for ${grade} ${subject}.
      Context: ${docContext}
      Generate a study quiz divided into chapters. 
      Each chapter needs: 3 MCQs and 3 comprehension questions.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
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

    try {
      const data = JSON.parse(response.text || '{"chapters": []}');
      return data.chapters;
    } catch (e) {
      console.error("AI parse failed", e);
      return [];
    }
  },

  generateExam: async (level: string, grade: string, subject: string, context: string): Promise<ExamQuestion[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ACT AS: Senior Curriculum Examiner for the Malawi National Examinations Board (MANEB).
      TASK: Formulate a ${subject} examination for ${level} students in ${grade}.
      SOURCE CONTENT:
      """
      ${context}
      """
      CONSTRAINTS:
      1. EXACTLY 12-15 high-quality Multiple Choice Questions.
      2. Content must be factually accurate based ONLY on provided context.
      3. Questions must range from simple recall to complex reasoning.
      4. Distractors must be plausible but clearly incorrect.
      5. Provide a "Focused Tip" for each question explaining the concept clearly.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              minItems: 10,
              maxItems: 15,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING, description: "Focused educational tip for this question." }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{"questions": []}');
      return data.questions;
    } catch (e) {
      console.error("Exam generation error", e);
      throw new Error("Could not process exam content. Please ensure the text is clear.");
    }
  },

  evaluateExam: async (questions: ExamQuestion[], userAnswers: Record<string, string>): Promise<any> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ACT AS: Automated Exam Marking System.
      Mark these results for a Malawian student.
      REFERENCE DATA: ${JSON.stringify(questions)}
      STUDENT ATTEMPT: ${JSON.stringify(userAnswers)}
      
      SCORING: 100 points scale. 
      FEEDBACK: For every question, verify correctness and provide a high-value "Study Tip".`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: {
              type: Type.OBJECT,
              additionalProperties: {
                type: Type.OBJECT,
                properties: {
                  isCorrect: { type: Type.BOOLEAN },
                  tip: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING }
                },
                required: ["isCorrect", "tip", "correctAnswer"]
              }
            }
          },
          required: ["score", "feedback"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Marking error", e);
      return null;
    }
  },

  evaluateComprehensionAnswer: async (question: string, userAnswer: string, modelAnswer: string, pointsToCover: string): Promise<EvaluationResult> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate student's comprehension answer. 
      Q: ${question}
      User: ${userAnswer}
      Key: ${modelAnswer}
      Points: ${pointsToCover}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
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

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return { score: 0, strengths: [], improvements: ["Failed to mark."], feedbackSummary: "Error in AI marking." };
    }
  }
};
