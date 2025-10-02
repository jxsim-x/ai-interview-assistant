import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use the .mjs worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  fullText: string;
  confidence: {
    name: number;
    email: number;
    phone: number;
  };
  nameExtractedFrom?: string; // Debug info
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
  hasEOL?: boolean;
}

interface NameCandidate {
  text: string;
  score: number;
  source: string;
  confidence: number;
}

export class ResumeParser {
  
  static async parseResume(file: File): Promise<ParsedResumeData> {
    console.log('📄 [ADVANCED-PARSER] Starting resume parsing for:', file.name);
    
    try {
      let text = '';
      let textItems: TextItem[] = [];
      
      if (file.type === 'application/pdf') {
        const result = await this.extractFromPDFAdvanced(file);
        text = result.text;
        textItems = result.textItems;
      } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
        text = await this.extractFromDOCX(file);
        textItems = []; // DOCX doesn't have positioning data
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      console.log('✅ [ADVANCED-PARSER] Text extraction successful, length:', text.length);
      
      const personalInfo = this.extractPersonalInfoAdvanced(text, textItems);
      
      console.log('✅ [ADVANCED-PARSER] Personal info extracted:', {
        name: personalInfo.name || 'Not found',
        nameSource: personalInfo.nameExtractedFrom,
        email: personalInfo.email || 'Not found', 
        phone: personalInfo.phone || 'Not found',
        nameConfidence: personalInfo.confidence.name
      });
      
      return personalInfo;
      
    } catch (error) {
      console.error('❌ [ADVANCED-PARSER] Resume parsing failed:', error);
      throw new Error(`Failed to parse resume: ${(error as Error).message}`);
    }
  }

  /**
   * ⭐ ADVANCED: Extract text with positioning data from PDF
   */
  private static async extractFromPDFAdvanced(file: File): Promise<{text: string; textItems: TextItem[]}> {
    console.log('📖 [ADVANCED-PARSER] Extracting text with positioning from PDF...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      let allTextItems: TextItem[] = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📄 [ADVANCED-PARSER] Processing page ${pageNum} of ${pdf.numPages}`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        
        // Extract text items with positioning
        const pageTextItems = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => ({
            str: item.str,
            transform: item.transform,
            width: item.width,
            height: item.height,
            fontName: item.fontName,
            hasEOL: item.hasEOL,
            // Calculate actual coordinates
            x: item.transform[4],
            y: viewport.height - item.transform[5], // Flip Y coordinate
            fontSize: Math.sqrt((item.transform[2] * item.transform[2]) + (item.transform[3] * item.transform[3]))
          }));
        
        allTextItems = allTextItems.concat(pageTextItems as TextItem[]);
        
        // Build text for traditional parsing
        const pageText = pageTextItems.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return { text: fullText.trim(), textItems: allTextItems };
    } catch (error) {
      console.error('❌ [ADVANCED-PARSER] PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF.');
    }
  }

  private static async extractFromDOCX(file: File): Promise<string> {
    console.log('📖 [ADVANCED-PARSER] Extracting text from DOCX...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('⚠️ [ADVANCED-PARSER] DOCX parsing warnings:', result.messages);
      }
      
      return result.value || '';
    } catch (error) {
      console.error('❌ [ADVANCED-PARSER] DOCX extraction failed:', error);
      throw new Error('Failed to extract text from DOCX.');
    }
  }

  /**
   * ⭐ ADVANCED: Multi-pass name extraction with intelligence
   */
  private static extractPersonalInfoAdvanced(text: string, textItems: TextItem[]): ParsedResumeData {
    console.log('🧠 [ADVANCED-PARSER] Starting intelligent name extraction...');
    
    const cleanText = text.replace(/\r?\n/g, '\n').replace(/\s+/g, ' ').trim();
    
    // Extract email and phone (reliable patterns)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const emails = cleanText.match(emailRegex) || [];
    
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = cleanText.match(phoneRegex) || [];
    
    // ⭐ ADVANCED: Multi-pass name extraction
    const nameResult = this.advancedNameExtraction(cleanText, textItems, emails[0]);
    
    return {
      name: nameResult.name,
      email: emails[0] || '',
      phone: phones[0] || '',
      fullText: cleanText,
      nameExtractedFrom: nameResult.source,
      confidence: {
        name: nameResult.confidence,
        email: emails.length > 0 ? 0.9 : 0,
        phone: phones.length > 0 ? 0.8 : 0
      }
    };
  }

  /**
   * ⭐ ADVANCED: Intelligent multi-pass name extraction
   */
  private static advancedNameExtraction(text: string, textItems: TextItem[], email?: string): {name: string; confidence: number; source: string} {
    console.log('🎯 [ADVANCED-PARSER] Starting multi-pass name extraction...');
    
    const candidates: NameCandidate[] = [];
    const lines = text.split(/[\r?\n]+/).map(line => line.trim()).filter(line => line.length > 0);
    
    // PASS 1: Font size analysis (if PDF positioning available)
    if (textItems.length > 0) {
      console.log('📊 [ADVANCED-PARSER] Pass 1: Font size analysis');
      const fontSizeCandidates = this.extractByFontSize(textItems);
      candidates.push(...fontSizeCandidates);
    }
    
    // PASS 2: Positional intelligence
    console.log('📍 [ADVANCED-PARSER] Pass 2: Positional analysis');
    const positionalCandidates = this.extractByPosition(lines);
    candidates.push(...positionalCandidates);
    
    // PASS 3: Email prefix matching
    if (email) {
      console.log('📧 [ADVANCED-PARSER] Pass 3: Email prefix matching');
      const emailCandidates = this.extractFromEmailPrefix(email, lines);
      candidates.push(...emailCandidates);
    }
    
    // PASS 4: Pattern recognition
    console.log('🔍 [ADVANCED-PARSER] Pass 4: Pattern recognition');
    const patternCandidates = this.extractByPatterns(lines);
    candidates.push(...patternCandidates);
    
    // Score and select best candidate
    const bestCandidate = this.selectBestNameCandidate(candidates);
    
    console.log('🏆 [ADVANCED-PARSER] Best candidate selected:', bestCandidate);
    
    return bestCandidate;
  }

  /**
   * ⭐ NEW: Extract names by font size analysis
   */
  private static extractByFontSize(textItems: TextItem[]): NameCandidate[] {
    const candidates: NameCandidate[] = [];
    
    // Calculate median font size
    const fontSizes = textItems.map((item: any) => item.fontSize || 12);
    const medianFontSize = fontSizes.sort((a, b) => a - b)[Math.floor(fontSizes.length / 2)];
    
    console.log('📏 [ADVANCED-PARSER] Median font size:', medianFontSize);
    
    // Group text by similar font sizes and positions
    const largeTextItems = textItems.filter((item: any) => 
      (item.fontSize || 12) > medianFontSize * 1.2 && 
      (item.y || 0) > (600) // Top 20% of page (assuming ~800pt page height)
    );
    
    largeTextItems.forEach((item: any) => {
      const text = item.str.trim();
      if (this.isValidNameCandidate(text) && !this.containsResumeKeywords(text)) {
        candidates.push({
          text: this.cleanNameString(text),
          score: (item.fontSize || 12) / medianFontSize,
          source: 'font-size-analysis',
          confidence: 0.85
        });
      }
    });
    
    return candidates;
  }

  /**
   * ⭐ NEW: Extract names by document position
   */
  private static extractByPosition(lines: string[]): NameCandidate[] {
    const candidates: NameCandidate[] = [];
    
    // Analyze first 5 lines with position weighting
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      if (this.containsResumeKeywords(line)) continue;
      
      // Check for explicit name labels
      const nameLabels = [
        /^name\s*:?\s*(.+)$/i,
        /^full\s*name\s*:?\s*(.+)$/i,
        /^candidate\s*:?\s*(.+)$/i
      ];
      
      for (const pattern of nameLabels) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const extractedName = this.cleanNameString(match[1]);
          if (this.isValidNameCandidate(extractedName)) {
            candidates.push({
              text: extractedName,
              score: 10 - i, // Higher score for earlier lines
              source: `explicit-label-line-${i + 1}`,
              confidence: 0.95
            });
          }
        }
      }
      
      // Check if entire line looks like a name
      if (this.isValidNameCandidate(line)) {
        const positionMultiplier = i === 0 ? 10 : i === 1 ? 7 : i === 2 ? 5 : 3;
        candidates.push({
          text: this.cleanNameString(line),
          score: positionMultiplier,
          source: `position-line-${i + 1}`,
          confidence: 0.7 - (i * 0.1)
        });
      }
    }
    
    return candidates;
  }

  /**
   * ⭐ NEW: Extract name from email prefix
   */
  private static extractFromEmailPrefix(email: string, lines: string[]): NameCandidate[] {
    const candidates: NameCandidate[] = [];
    
    const emailPrefix = email.split('@')[0];
    const possibleNames = [
      emailPrefix.replace(/[._-]/g, ' '),
      emailPrefix.replace(/([a-z])([A-Z])/g, '$1 $2'), // camelCase
      emailPrefix.replace(/\d+/g, '').replace(/[._-]/g, ' ') // remove numbers
    ];
    
    possibleNames.forEach(possibleName => {
      const cleanName = this.cleanNameString(possibleName);
      if (this.isValidNameCandidate(cleanName)) {
        candidates.push({
          text: cleanName,
          score: 6,
          source: 'email-prefix-analysis',
          confidence: 0.6
        });
      }
    });
    
    return candidates;
  }

  /**
   * ⭐ NEW: Extract by advanced patterns
   */
  private static extractByPatterns(lines: string[]): NameCandidate[] {
    const candidates: NameCandidate[] = [];
    
    // Look for centered text or text with leading whitespace
    lines.forEach((line, index) => {
      if (index > 10) return; // Only check first 10 lines
      
      const trimmed = line.trim();
      const leadingSpaces = line.length - line.trimStart().length;
      
      // Check for centered-looking text (significant leading whitespace)
      if (leadingSpaces > 10 && this.isValidNameCandidate(trimmed) && !this.containsResumeKeywords(trimmed)) {
        candidates.push({
          text: this.cleanNameString(trimmed),
          score: 8 - Math.floor(index / 2),
          source: `centered-text-line-${index + 1}`,
          confidence: 0.75
        });
      }
    });
    
    return candidates;
  }

  /**
   * ⭐ NEW: Select best name candidate using scoring
   */
  private static selectBestNameCandidate(candidates: NameCandidate[]): {name: string; confidence: number; source: string} {
    if (candidates.length === 0) {
      return { name: '', confidence: 0, source: 'no-candidates-found' };
    }
    
    // Remove duplicates and calculate final scores
    const uniqueCandidates = candidates.reduce((acc, current) => {
      const existing = acc.find(c => c.text.toLowerCase() === current.text.toLowerCase());
      if (existing) {
        // Combine scores for duplicate candidates
        existing.score += current.score * 0.5;
        existing.confidence = Math.max(existing.confidence, current.confidence);
        existing.source += ` + ${current.source}`;
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as NameCandidate[]);
    
    // Sort by score and confidence
    uniqueCandidates.sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence));
    
    console.log('🏆 [ADVANCED-PARSER] Top 3 candidates:');
    uniqueCandidates.slice(0, 3).forEach((candidate, index) => {
      console.log(`  ${index + 1}. "${candidate.text}" (score: ${candidate.score.toFixed(1)}, confidence: ${candidate.confidence.toFixed(2)}, source: ${candidate.source})`);
    });
    
    const winner = uniqueCandidates[0];
    return {
      name: winner.text,
      confidence: winner.confidence,
      source: winner.source
    };
  }

  /**
   * ⭐ ENHANCED: Better name validation
   */
  private static isValidNameCandidate(text: string): boolean {
    if (!text || text.length < 2 || text.length > 60) return false;
    
    const words = text.trim().split(/\s+/);
    
    // Should have 2-4 words
    if (words.length < 2 || words.length > 6) return false;
    
    // Each word validation
    for (const word of words) {
      if (word.length < 1 || word.length > 30) return false;
      if (!/^[A-Za-z.''-]+$/.test(word)) return false; // Allow apostrophes and hyphens
    }
    
    // First word should start with capital
    if (!/^[A-Za-z]/.test(words[0])) return false;
    
    // Should not be all caps (unless 2 words)
    //if (words.length > 2 && text === text.toUpperCase()) return false;
    
    return true;
  }

  /**
   * ⭐ ENHANCED: Comprehensive exclusion dictionary
   */
  private static containsResumeKeywords(text: string): boolean {
    const keywords = [
      // Document types
      'resume', 'cv', 'curriculum', 'vitae',
      // Sections
      'experience', 'education', 'skills', 'objective', 'summary', 'contact',
      'employment', 'work', 'position', 'references', 'projects', 'certification',
      // Contact info
      'address', 'phone', 'email', 'linkedin', 'github', 'portfolio', 'website',
      // Technical terms
      'software', 'developer', 'engineer', 'manager', 'analyst', 'programmer',
      'javascript', 'python', 'react', 'node', 'database', 'api', 'frontend', 'backend',
      // Companies (common ones)
      'microsoft', 'google', 'amazon', 'facebook', 'apple', 'netflix', 'uber',
      // Time indicators
      'years', 'months', 'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'present', 'current', 'ago',
      // Education
      'university', 'college', 'school', 'degree', 'bachelor', 'master', 'phd',
      'graduation', 'gpa', 'honors'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * ⭐ ENHANCED: Better name cleaning
   */
  private static cleanNameString(name: string): string {
    return name
      .replace(/[^\w\s.'-]/g, ' ') // Keep letters, spaces, dots, apostrophes, hyphens
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => {
        // Proper case: first letter cap, rest lower (except for names like O'Connor)
        if (word.includes("'")) {
          return word.split("'").map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join("'");
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      return {
        valid: false,
        error: 'Only PDF and DOCX files are supported.'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 5MB'
      };
    }
    
    if (file.size < 100) {
      return {
        valid: false,
        error: 'File appears to be empty'
      };
    }
    
    return { valid: true };
  }
}
