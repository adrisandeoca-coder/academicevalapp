import type { ReadabilityMetrics, LongSentence } from "@shared/schema";
import { syllable } from "syllable";

const LONG_SENTENCE_THRESHOLD = 25;

function countSyllables(word: string): number {
  // Use the well-tested syllable library for accurate counting
  // It uses a combination of dictionary lookup and heuristics
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) return 0;
  
  try {
    const count = syllable(cleaned);
    return Math.max(1, count);
  } catch {
    // Fallback: simple vowel group counting
    let count = 0;
    let prevVowel = false;
    for (const char of cleaned) {
      const isVowel = 'aeiouy'.includes(char);
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }
    return Math.max(1, count);
  }
}

function splitIntoSentences(text: string): string[] {
  // Common abbreviations that shouldn't end sentences
  const abbreviations = [
    'e\\.g', 'i\\.e', 'et al', 'etc', 'vs', 'cf', 'viz', 'ibid',
    'Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'Jr', 'Sr', 'St',
    'Fig', 'Figs', 'Tab', 'Eq', 'Eqs', 'Vol', 'No', 'pp', 'ed', 'eds',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
    'Inc', 'Corp', 'Ltd', 'Co', 'Dept', 'Univ', 'Rev', 'Int', 'J',
    'approx', 'ca', 'c\\.f', 'n\\.b', 'N\\.B', 'P\\.S'
  ];
  
  // Protect abbreviations by replacing their periods with a placeholder
  let processed = text;
  abbreviations.forEach(abbr => {
    const pattern = new RegExp(`\\b(${abbr})\\.(?=\\s|$)`, 'gi');
    processed = processed.replace(pattern, '$1{{ABBR}}');
  });
  
  // Protect decimal numbers (e.g., 3.14, 0.05)
  processed = processed.replace(/(\d)\.(\d)/g, '$1{{DEC}}$2');
  
  // Protect URLs and domains
  processed = processed.replace(/(\w)\.(com|org|edu|gov|net|io)\b/gi, '$1{{DOM}}$2');
  
  // Split on sentence-ending punctuation followed by:
  // - Optional closing quotes/brackets/parens
  // - Whitespace
  // - Capital letter, digit, or end of string
  const sentences = processed
    .replace(/([.!?])(['"\)\]]*)\s+(?=[A-Z0-9]|$)/g, '$1$2|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    // Restore placeholders
    .map(s => s.replace(/\{\{ABBR\}\}/g, '.').replace(/\{\{DEC\}\}/g, '.').replace(/\{\{DOM\}\}/g, '.'))
    .filter(s => s.length > 0 && /[a-zA-Z]/.test(s));
  
  return sentences;
}

function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter(w => w.length > 0).length;
}

function isPassiveVoice(sentence: string): boolean {
  const passivePatterns = [
    /\b(am|is|are|was|were|be|been|being)\s+(\w+ed|done|made|given|taken|seen|known|shown|found|used|called)\b/i,
    /\b(has|have|had)\s+been\s+\w+ed\b/i,
    /\bwill\s+be\s+\w+ed\b/i,
    /\bcan\s+be\s+\w+ed\b/i,
    /\bmay\s+be\s+\w+ed\b/i,
    /\bmust\s+be\s+\w+ed\b/i,
    /\bshould\s+be\s+\w+ed\b/i,
    /\bwould\s+be\s+\w+ed\b/i,
    /\bcould\s+be\s+\w+ed\b/i,
  ];
  
  return passivePatterns.some(pattern => pattern.test(sentence));
}

function getFleschGrade(score: number): string {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (College)";
  if (score >= 10) return "Very Difficult (Graduate)";
  return "Extremely Difficult (Professional)";
}

export function analyzeReadability(text: string): ReadabilityMetrics {
  const sentences = splitIntoSentences(text);
  const totalSentences = sentences.length;
  
  if (totalSentences === 0) {
    return {
      fleschScore: 0,
      fleschGrade: "Unable to analyze",
      avgSentenceLength: 0,
      avgWordLength: 0,
      passiveVoicePercent: 0,
      longSentences: [],
      totalSentences: 0,
      totalWords: 0,
    };
  }
  
  const words = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  const totalWords = words.length;
  
  if (totalWords === 0) {
    return {
      fleschScore: 0,
      fleschGrade: "Unable to analyze",
      avgSentenceLength: 0,
      avgWordLength: 0,
      passiveVoicePercent: 0,
      longSentences: [],
      totalSentences: 0,
      totalWords: 0,
    };
  }
  
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  
  // Calculate raw Flesch score
  const rawFleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  // Log warning if score goes negative - this usually indicates sentence detection issues
  if (rawFleschScore < 0) {
    console.warn(`Flesch score went negative (${rawFleschScore.toFixed(1)}). ASL: ${avgSentenceLength.toFixed(1)}, ASW: ${avgSyllablesPerWord.toFixed(2)}, Sentences: ${totalSentences}, Words: ${totalWords}`);
  }
  
  // Clamp to valid range 0-100 (negatives indicate possible sentence detection issues)
  const fleschScore = Math.max(0, Math.min(100, rawFleschScore));
  
  const passiveSentences = sentences.filter(s => isPassiveVoice(s)).length;
  const passiveVoicePercent = Math.round((passiveSentences / totalSentences) * 100);
  
  const longSentences: LongSentence[] = [];
  sentences.forEach((sentence, index) => {
    const wordCount = countWords(sentence);
    if (wordCount > LONG_SENTENCE_THRESHOLD) {
      let displayText = sentence;
      if (sentence.length > 150) {
        const words = sentence.split(/\s+/);
        let truncated = '';
        for (const word of words) {
          if (truncated.length + word.length + 1 > 147) break;
          truncated += (truncated ? ' ' : '') + word;
        }
        displayText = truncated + '...';
      }
      longSentences.push({
        text: displayText,
        wordCount,
        position: index + 1,
      });
    }
  });
  
  return {
    fleschScore: Math.round(fleschScore * 10) / 10,
    fleschGrade: getFleschGrade(fleschScore),
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgSyllablesPerWord * 100) / 100,
    passiveVoicePercent,
    longSentences: longSentences.slice(0, 5),
    totalSentences,
    totalWords,
  };
}
