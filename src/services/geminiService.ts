import { GoogleGenerativeAI } from '@google/generative-ai';
import { questionBanks, isCustomSubject } from './questionBanks';

class GeminiService {
  private genai!: GoogleGenerativeAI;
  private model: any;
  private isInitialized: boolean = false;
  private initError: string | null = null;

  constructor() {
    console.log('🤖 [GEMINI] Initializing Gemini service...');
    
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    if (!apiKey) {
      this.initError = 'GEMINI_API_KEY not found in environment variables';
      console.error('❌ [GEMINI]', this.initError);
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      this.initError = 'Invalid API key format. Should start with "AIza"';
      console.error('❌ [GEMINI]', this.initError);
      return;
    }

    try {
      this.genai = new GoogleGenerativeAI(apiKey);
      this.model = this.genai.getGenerativeModel({ 
        model: "gemini-2.5-flash"
      });
      this.isInitialized = true;
      console.log('✅ [GEMINI] Service initialized successfully');
    } catch (error) {
      this.initError = `Failed to initialize Gemini: ${error}`;
      console.error('❌ [GEMINI]', this.initError);
    }
  }

  /**
   * Get interview questions (AI first, fallback to bank)
   */
  async getInterviewQuestions(
    subject: string, 
    difficulty: 'easy' | 'medium' | 'hard', 
    count: number = 2
  ): Promise<string[]> {
    console.log(`🎯 [GEMINI] Getting ${count} ${difficulty} questions for ${subject}`);

    // Try AI generation first for custom subjects or if service is available
    if (this.isInitialized && (isCustomSubject(subject) || Math.random() > 0.3)) {
      try {
        const aiQuestions = await this.generateQuestionsWithAI(subject, difficulty, count);
        if (aiQuestions.length >= count) {
          console.log('✅ [GEMINI] AI generation successful');
          return aiQuestions.slice(0, count);
        }
      } catch (error) {
        console.warn('⚠️ [GEMINI] AI generation failed, falling back:', error);
      }
    }

    // Fallback to question bank
    console.log('📚 [GEMINI] Using question bank fallback');
    return this.getQuestionsFromBank(subject, difficulty, count);
  }

  /**
   * Generate questions using AI
   */
  private async generateQuestionsWithAI(
    subject: string, 
    difficulty: string, 
    count: number
  ): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error(this.initError || 'Service not initialized');
    }

    const difficultyGuide = {
      easy: 'basic concepts and fundamental knowledge that entry-level candidates should know- time limit is 20 seconds each for a question ',
      medium: 'intermediate concepts requiring practical experience and deeper understanding-time limit is 60 seconds each for a question',
      hard: 'advanced concepts requiring expertise, problem-solving, and architectural thinking -timelimit is 120 seconds each for a question'
    };

    const prompt = `Generate exactly ${count} interview questions for a ${subject} position.

Difficulty: ${difficulty} (${difficultyGuide[difficulty as keyof typeof difficultyGuide]})

Requirements:
- Each question should be practical and job-relevant
- Appropriate for ${difficulty} level candidates
- Focus on real-world scenarios, not just theory
- Avoid generic questions that apply to any role
- Use industry level questions asked during top tech company interviews
- Make questions specific to ${subject}
- Each question should end with a question mark
- Return one question per line, no numbering

Generate ${count} questions now:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      const questions = response
        .split('\n')
        .map((q: string)=> q.trim())
        .filter((q: string) => q.length > 15 && q.includes('?'))
        .map((q: string) => q.replace(/^\d+\.?\s*/, '')) // Remove numbering
        .slice(0, count);

      if (questions.length < count) {
        throw new Error(`Generated only ${questions.length} of ${count} requested questions`);
      }

      return questions;
    } catch (error) {
      console.error('❌ [GEMINI] AI generation error:', error);
      throw error;
    }
  }

  /**
   * Get questions from predefined bank
   */
  private getQuestionsFromBank(
    subject: string, 
    difficulty: 'easy' | 'medium' | 'hard', 
    count: number
  ): string[] {
    if (isCustomSubject(subject)) {
      const genericQuestions = {
        easy: [
            `What is ${subject}? Explain in one sentence.`,
            `Name 3 key technologies used in ${subject}.`,
            `What's the main purpose of ${subject}?`,
            `Which companies use ${subject} technology?`,
            `What's one advantage of using ${subject}?`
        ],
        medium: [
            `Describe one real-world use case of ${subject}.`,
            `What's the difference between ${subject} and its alternatives?`,
            `Explain a time you used ${subject} in a project.`,
            `What tools or frameworks work best with ${subject}?`,
            `How would you debug a common ${subject} issue?`
        ],
        hard: [
            `Design a scalable ${subject} system for 1 million users. What are the key considerations?`,
            `Compare two approaches to implementing ${subject}. What are the trade-offs?`,
            `How would you optimize ${subject} performance in a production environment?`,
            `Explain the architecture you'd choose for a ${subject} project and why.`,
            `What are 3 critical challenges in ${subject} and how would you solve them?`
        ]
      };
      return this.shuffleArray(genericQuestions[difficulty]).slice(0, count);
    }

    if (questionBanks[subject] && questionBanks[subject][difficulty]) {
      const questions = questionBanks[subject][difficulty];
      return this.shuffleArray([...questions]).slice(0, count);
    }

  // Fallback with time-appropriate question
  const fallbackQuestions = {
    easy: `What is ${subject}?`,
    medium: `Describe a practical use case for ${subject}.`,
    hard: `Design a scalable solution using ${subject}.`
  };
  return [fallbackQuestions[difficulty]];
}

  /**
   * Score answer using AI
   */
async scoreAnswer(
  question: string, 
  answer: string, 
  difficulty: string,
  subject: string = 'General'
): Promise<number> {
  console.log(`🎯 [GEMINI] Scoring ${difficulty} answer for ${subject}`);

  const trimmedAnswer = answer.trim();
  
  // ✅ STRICT: Completely blank answers get 0
  if (!trimmedAnswer || trimmedAnswer.length === 0) {
    console.warn('⚠️ [GEMINI] Blank answer detected, returning 0 score');
    return 0; // ✅ Changed from 10 to 0
  }

  // ✅ STRICT: Very minimal answers (1-2 chars) get 5
  if (trimmedAnswer.length <= 2) {
    console.warn(`⚠️ [GEMINI] Extremely short answer (${trimmedAnswer.length} chars), returning 5`);
    return 5;
  }

  const wordCount = trimmedAnswer.split(/\s+/).length;
  
  // ✅ Updated minimum word requirements
  const minWords = difficulty === 'easy' ? 2 : 5;
  
  if (wordCount < minWords) {
    console.warn(`⚠️ [GEMINI] Answer too short (${wordCount} words), returning 15`);
    return 15; // Low but not zero for attempting
  }

  if (this.isInitialized) {
    try {
      return await this.scoreAnswerWithAI(question, answer, difficulty, subject);
    } catch (error) {
      console.warn('⚠️ [GEMINI] AI scoring failed, using fallback:', error);
    }
  }

  return this.fallbackScoreAnswer(answer, difficulty);
}

  /**
   * AI-powered answer scoring
   */
private async scoreAnswerWithAI(
  question: string, 
  answer: string, 
  difficulty: string,
  subject: string
): Promise<number> {
  // Time-aware expectations
  const timeExpectations = {
    easy: '20 seconds - Quick, concise answer (2-3 sentences)',
    medium: '60 seconds - Brief explanation with 1 example (4-6 sentences)',
    hard: '120 seconds - Comprehensive analysis with reasoning (8-12 sentences)'
  };

  const prompt = `You are an expert technical interviewer evaluating a ${subject} interview answer.

**Interview Context:**
- Question Difficulty: ${difficulty}
- Time Limit: ${timeExpectations[difficulty as keyof typeof timeExpectations]}
- Subject Area: ${subject}

**Question Asked:**
${question}

**Candidate's Answer:**
${answer}

**Scoring Rubric (0-100 scale):**

For ${difficulty.toUpperCase()} level questions:

${difficulty === 'easy' ? `
**EASY (20 seconds):**
- 85-100: Correct, clear, concise definition or fact
- 70-84: Mostly correct, minor inaccuracy
- 50-69: Partially correct, missing key details
- 30-49: Vague or mostly incorrect
- 0-29: Wrong or irrelevant
` : ''}

${difficulty === 'medium' ? `
**MEDIUM (60 seconds):**
- 85-100: Clear explanation + practical example + correct terminology
- 70-84: Good explanation with minor gaps, example present
- 50-69: Basic understanding shown, example weak or missing
- 30-49: Incomplete understanding, significant gaps
- 0-29: Misunderstanding or off-topic
` : ''}

${difficulty === 'hard' ? `
**HARD (120 seconds):**
- 85-100: Comprehensive solution + trade-offs discussed + scalability considered
- 70-84: Solid approach with reasoning, minor gaps in depth
- 50-69: Basic solution outlined, lacks depth or misses key points
- 30-49: Incomplete solution or flawed reasoning
- 0-29: Incorrect approach or fundamental misunderstanding
` : ''}

**Evaluation Criteria:**
1. **Technical Accuracy (40%)**: Is the answer factually correct?
2. **Completeness (30%)**: Does it address all parts of the question within time constraints?
3. **Clarity (20%)**: Is the explanation clear and well-structured?
4. **Depth (10%)**: For medium/hard, are examples/reasoning provided?

**Special Considerations:**
- Time expired answers: If marked "Time expired", score based on content provided (max 70)
- Length appropriateness: Penalize if answer is way too short or unnecessarily verbose for time limit
- Relevance: Answer must directly address the question

**Output Format:**
Return ONLY a single integer between 0-100. No explanation, no text, just the number.

Score:`;

  try {
    const result = await this.model!.generateContent(prompt);
    const response = result.response;
    const scoreText = response.text().trim();
    
    // Extract numeric score
    const score = parseInt(scoreText.match(/\d+/)?.[0] || '50');
    
    // Validate score is in valid range
    const validScore = Math.max(0, Math.min(100, score));
    
    console.log(`✅ [GEMINI] AI Score: ${validScore}/100`);
    return validScore;
  } catch (error) {
    console.error('❌ [GEMINI] AI scoring error:', error);
    throw error;
  }
}

  /**
   * Fallback scoring algorithm
   */
private fallbackScoreAnswer(answer: string, difficulty: string): number {
  console.log('📊 [GEMINI] Using fallback scoring algorithm');
  
  const trimmedAnswer = answer.trim();
  const words = trimmedAnswer.split(/\s+/).length;
  
  // ✅ SAFEST APPROACH: Use includes() and RegExp constructor for backticks
  const hasTripleBacktick = trimmedAnswer.includes('```');
  const hasSingleBacktick = trimmedAnswer.includes('`');
  const hasFunction = /function\s+\w+/i.test(trimmedAnswer);
  const hasConst = /const\s+\w+/i.test(trimmedAnswer);
  const hasLet = /let\s+\w+/i.test(trimmedAnswer);
  const hasClass = /class\s+\w+/i.test(trimmedAnswer);
  
  // Combined code snippet detection
  const hasCodeSnippet = hasTripleBacktick || hasSingleBacktick || hasFunction || hasConst || hasLet || hasClass;
  
  const hasTechnicalTerms = /API|database|server|client|framework|library|architecture|performance|scalable|component|state|props|hook|async|promise|callback|useState|useEffect|render|DOM/i.test(trimmedAnswer);
  const hasExamples = /example|for instance|such as|like|e\.g\.|i\.e\./i.test(trimmedAnswer);
  
  let baseScore = 35; // Start with base passing score
  
  // ✅ Realistic word count expectations
  if (difficulty === 'easy') {
    // 20 seconds: 2-50 words acceptable
    if (words >= 2 && words <= 50) {
      baseScore += 25;
    } else if (words > 50) {
      baseScore += 15;
    } else if (words === 1) {
      baseScore += 10; // Single word might be correct
    }
  } else if (difficulty === 'medium') {
    // 60 seconds: 15-100 words ideal
    if (words >= 15 && words <= 100) {
      baseScore += 25;
    } else if (words >= 5 && words < 15) {
      baseScore += 15;
    } else if (words > 100) {
      baseScore += 18;
    }
  } else {
    // 120 seconds: 30-200 words ideal
    if (words >= 30 && words <= 200) {
      baseScore += 25;
    } else if (words >= 15 && words < 30) {
      baseScore += 15;
    } else if (words > 200) {
      baseScore += 20;
    } else if (words >= 5) {
      baseScore += 10;
    }
  }
  
  // Technical content bonuses
  if (hasTechnicalTerms) baseScore += 12;
  if (hasCodeSnippet) {
    if (difficulty === 'medium' || difficulty === 'hard') {
      baseScore += 10;
    } else {
      baseScore += 5;
    }
  }
  if (hasExamples && (difficulty === 'medium' || difficulty === 'hard')) {
    baseScore += 8;
  }
  
  // Difficulty adjustment
  if (difficulty === 'hard' && words >= 20) baseScore += 5;
  if (difficulty === 'medium' && words >= 10) baseScore += 3;
  
  // Cap at 85, minimum 20
  const finalScore = Math.min(85, Math.max(20, baseScore));
  
  console.log(`📊 [GEMINI] Fallback score: ${finalScore}/100 (${words} words, ${difficulty})`);
  
  return finalScore;
}

  /**
   * Utility functions
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  getError(): string | null {
    return this.initError;
  }
}

export const geminiService = new GeminiService();
