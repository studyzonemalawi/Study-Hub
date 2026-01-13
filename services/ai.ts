import { GoogleGenAI, Type } from "@google/genai";

// We initialize inside a getter to ensure process.env.API_KEY is available and defined
// This prevents immediate crashes if the environment variable is not yet injected by Vite
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set API_KEY in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'comprehension';
  question: string;
  options?: string[]; // For MCQ
  correctAnswer: string;
  explanation: string;
}

export interface QuizChapter {
  chapterTitle: string;
  questions: QuizQuestion[];
}

export interface EvaluationResult {
  score: number; // 0-100
  strengths: string[];
  improvements: string[];
  feedbackSummary: string;
}

export const aiService = {
  generateQuiz: async (title: string, subject: string, grade: string, docContext: string): Promise<QuizChapter[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert Malawian educator. You are reviewing a specific textbook: "${title}" for ${grade} ${subject}.
      
      Here is a snippet of text from the first few pages of the document:
      """
      ${docContext}
      """
      
      Based on this context and your knowledge of the Malawian curriculum, identify the main chapters/topics covered in this book.
      Generate a comprehensive study quiz divided into chapters. 
      For EACH chapter found:
      - Create 3 multiple choice questions (MCQs).
      - Create at least 3 challenging comprehension questions that require deep understanding.
      
      Ensure the questions are specific to the content of this document.`,
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
                        type: { type: Type.STRING, description: "Must be 'mcq' or 'comprehension'" },
                        question: { type: Type.STRING },
                        options: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING },
                          description: "Only for MCQ. Provide exactly 4 options."
                        },
                        correctAnswer: { type: Type.STRING, description: "For MCQ, the full text of correct option. For comprehension, a concise model answer." },
                        explanation: { type: Type.STRING, description: "Specific context from the book explaining why this is correct." }
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
      const text = response.text;
      const data = JSON.parse(text || '{"chapters": []}');
      return data.chapters;
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  },

  evaluateComprehensionAnswer: async (question: string, userAnswer: string, modelAnswer: string, pointsToCover: string): Promise<EvaluationResult> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a helpful and encouraging Malawian teacher. 
      Evaluate a student's answer to this specific question from their textbook: "${question}"
      
      User's Answer: "${userAnswer}"
      Correct Model Answer: "${modelAnswer}"
      Key points to check for: "${pointsToCover}"
      
      Provide a constructive evaluation with a score out of 100.`,
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

    try {
      const text = response.text;
      return JSON.parse(text || '{}');
    } catch (e) {
      console.error("Failed to parse evaluation response", e);
      return {
        score: 0,
        strengths: [],
        improvements: ["Evaluation failed."],
        feedbackSummary: "Sorry, I couldn't evaluate your answer right now."
      };
    }
  }
};