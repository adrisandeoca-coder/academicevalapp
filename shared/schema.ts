import { z } from "zod";

// Section types for academic papers
export const sectionTypes = [
  "title",
  "abstract",
  "introduction",
  "literature_review",
  "methodology",
  "results",
  "discussion",
  "conclusion",
  "conclusion_with_limits",
  "conclusion_without_limits",
  "limitations_future_research",
  "paragraph",
  "figure_introduction",
  "figure_theory",
  "figure_methodology",
  "figure_results_quantitative",
  "figure_results_qualitative",
  "figure_discussion",
] as const;

export type SectionType = (typeof sectionTypes)[number];

// Figure section types for easier checking
export const figureSectionTypes = [
  "figure_introduction",
  "figure_theory",
  "figure_methodology",
  "figure_results_quantitative",
  "figure_results_qualitative",
  "figure_discussion",
] as const;

export type FigureSectionType = (typeof figureSectionTypes)[number];

export const isFigureSectionType = (type: SectionType): type is FigureSectionType => {
  return (figureSectionTypes as readonly string[]).includes(type);
};

export const sectionLabels: Record<SectionType, string> = {
  title: "Title",
  abstract: "Abstract",
  introduction: "Introduction",
  literature_review: "Literature Review / Theoretical Background",
  methodology: "Methodology / Research Design",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion (General)",
  conclusion_with_limits: "Conclusion (with Limitations & Future Research)",
  conclusion_without_limits: "Conclusion (without Limitations/Future Research)",
  limitations_future_research: "Limitations & Future Research (Standalone)",
  paragraph: "Single Paragraph",
  figure_introduction: "Figure: Introduction / Problem Setup",
  figure_theory: "Figure: Theory / Literature Review",
  figure_methodology: "Figure: Methodology",
  figure_results_quantitative: "Figure: Results (Quantitative)",
  figure_results_qualitative: "Figure: Results (Qualitative)",
  figure_discussion: "Figure: Discussion / Framework",
};

// Criterion definition
export interface Criterion {
  name: string;
  weight: number;
  description: string;
}

// Writing Style Types
export const writingStylePresets = [
  "engineering",
  "management",
  "information_systems",
  "social_sciences",
  "qualitative",
  "natural_sciences",
  "conference",
  "custom",
] as const;

export type WritingStylePreset = (typeof writingStylePresets)[number];

export const writingStyleLabels: Record<WritingStylePreset, string> = {
  engineering: "Engineering / Technical",
  management: "Management / Business",
  information_systems: "Information Systems",
  social_sciences: "Social Sciences",
  qualitative: "Qualitative Research",
  natural_sciences: "Natural Sciences",
  conference: "Conference Paper",
  custom: "Custom Style",
};

export const writingStyleDescriptions: Record<WritingStylePreset, string> = {
  engineering: "Precise, concise, methods-heavy, minimal hedging (IEEE, ASME, CIRP)",
  management: "Contribution-focused, practitioner implications, moderate formality (AMJ, SMJ, JOM)",
  information_systems: "Blends technical and managerial, theory-driven, structured argumentation (MISQ, ISR)",
  social_sciences: "Reflexive, acknowledges positionality, richer descriptions (ASQ, Organization Studies)",
  qualitative: "First-person acceptable, thick description, interpretive tone (Qualitative Inquiry, JMS)",
  natural_sciences: "Extremely concise, standardized structure (Nature, Science)",
  conference: "More direct, space-constrained, contribution upfront",
  custom: "Your personalized writing style",
};

// Style dimensions for fine-tuning
export interface WritingStyleDimensions {
  formality: number;          // 1-5: Conversational to Highly Formal
  sentenceComplexity: number; // 1-5: Short & Direct to Long & Elaborate
  hedgingLevel: number;       // 1-5: Assertive to Cautious
  voice: "passive" | "active" | "mixed";
  person: "first_singular" | "first_plural" | "third";
  density: number;            // 1-5: Spacious/Explanatory to Dense/Compressed
  jargonTolerance: number;    // 1-5: Accessible to Specialist
}

// Full writing style object
export interface WritingStyle {
  preset: WritingStylePreset;
  dimensions: WritingStyleDimensions;
  name?: string;              // For custom saved voices
  description?: string;       // User's description of the style
}

// Default dimension values for each preset
// NOTE: All presets now default to ACTIVE voice, moderate sentence complexity (2-3), 
// and lower jargon tolerance (2-3) to prioritize readability.
// Users can still customize these values if needed.
export const presetStyleDimensions: Record<WritingStylePreset, WritingStyleDimensions> = {
  engineering: {
    formality: 4,
    sentenceComplexity: 2,  // Reduced from 3 for optimal readability
    hedgingLevel: 2,
    voice: "active",        // Changed from passive - active voice improves readability
    person: "third",
    density: 3,             // Reduced from 4 for better accessibility
    jargonTolerance: 2,     // Reduced from 5 - simpler words preferred
  },
  management: {
    formality: 4,
    sentenceComplexity: 2,  // Reduced from 3 for optimal readability
    hedgingLevel: 3,
    voice: "active",
    person: "first_plural",
    density: 3,
    jargonTolerance: 2,     // Reduced from 4 - simpler words preferred
  },
  information_systems: {
    formality: 4,
    sentenceComplexity: 2,  // Reduced from 4 for optimal readability
    hedgingLevel: 3,
    voice: "active",        // Changed from mixed - active voice improves readability
    person: "first_plural",
    density: 3,             // Reduced from 4 for better accessibility
    jargonTolerance: 2,     // Reduced from 4 - simpler words preferred
  },
  social_sciences: {
    formality: 4,
    sentenceComplexity: 2,  // Reduced from 4 for optimal readability
    hedgingLevel: 4,
    voice: "active",
    person: "first_plural",
    density: 3,
    jargonTolerance: 2,     // Reduced from 3 - simpler words preferred
  },
  qualitative: {
    formality: 3,
    sentenceComplexity: 2,  // Reduced from 3 for optimal readability
    hedgingLevel: 3,
    voice: "active",
    person: "first_singular",
    density: 2,
    jargonTolerance: 2,     // Reduced from 3 - simpler words preferred
  },
  natural_sciences: {
    formality: 5,
    sentenceComplexity: 2,  // Reduced from 3 for optimal readability
    hedgingLevel: 2,
    voice: "active",        // Changed from passive - active voice improves readability
    person: "third",
    density: 3,             // Reduced from 5 for better accessibility
    jargonTolerance: 2,     // Reduced from 5 - simpler words preferred
  },
  conference: {
    formality: 3,
    sentenceComplexity: 2,
    hedgingLevel: 2,
    voice: "active",
    person: "first_plural",
    density: 3,             // Reduced from 4 for better accessibility
    jargonTolerance: 2,     // Reduced from 4 - simpler words preferred
  },
  custom: {
    formality: 3,
    sentenceComplexity: 2,  // Reduced from 3 for optimal readability
    hedgingLevel: 3,
    voice: "active",        // Changed from mixed - active voice improves readability
    person: "first_plural",
    density: 3,
    jargonTolerance: 2,     // Reduced from 3 - simpler words preferred
  },
};

// Zod schema for writing style dimensions
export const writingStyleDimensionsSchema = z.object({
  formality: z.number().min(1).max(5),
  sentenceComplexity: z.number().min(1).max(5),
  hedgingLevel: z.number().min(1).max(5),
  voice: z.enum(["passive", "active", "mixed"]),
  person: z.enum(["first_singular", "first_plural", "third"]),
  density: z.number().min(1).max(5),
  jargonTolerance: z.number().min(1).max(5),
});

export const writingStyleSchema = z.object({
  preset: z.enum(writingStylePresets),
  dimensions: writingStyleDimensionsSchema,
  name: z.string().optional(),
  description: z.string().optional(),
});

// Evaluation request schema (for text-based sections)
export const evaluationRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  sectionType: z.enum(sectionTypes),
  writingStyle: writingStyleSchema.optional(),
  includeEmphasis: z.boolean().optional(),
  paperId: z.string().nullable().optional(),
  customInstructions: z.string().max(500).optional(),
});

export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;

// Figure evaluation request schema (for image-based evaluation)
export const figureEvaluationRequestSchema = z.object({
  imageData: z.string().min(1, "Image data is required"),
  caption: z.string().optional(),
  sectionType: z.enum(figureSectionTypes),
  customInstructions: z.string().max(500).optional(),
});

export type FigureEvaluationRequest = z.infer<typeof figureEvaluationRequestSchema>;

// Readability metrics (deterministic, computed before AI evaluation)
export interface ReadabilityMetrics {
  fleschScore: number;           // 0-100, higher = easier to read
  fleschGrade: string;           // e.g., "College", "Graduate", "Professional"
  avgSentenceLength: number;     // Average words per sentence
  avgWordLength: number;         // Average syllables per word
  passiveVoicePercent: number;   // Percentage of sentences with passive voice
  longSentences: LongSentence[]; // Sentences > 25 words
  totalSentences: number;
  totalWords: number;
}

export interface LongSentence {
  text: string;
  wordCount: number;
  position: number;  // Sentence index in text
}

// Criterion score result
export interface CriterionScore {
  name: string;
  weight: number;
  score: number;
  suggestion: string;
  missing?: string;
}

// Key point/claim extracted from text
export interface KeyPoint {
  id: string;
  statement: string;         // The summarized claim/point (10-20 words)
  sourceQuote: string;       // The exact quote from original text this is based on
  pointType: string;         // Category based on section (e.g., "finding", "method", "claim", "implication")
}

// Support argument - emphasis suggestion derived from original text
export interface SupportArgument {
  id: string;
  sourceQuote: string;           // The exact quote from original text this is based on
  emphasisSuggestion: string;    // How to emphasize/frame this point
  rationale: string;             // Why this deserves more emphasis
  selected?: boolean;            // Whether user has accepted this suggestion
}

// Full evaluation result
export interface EvaluationResult {
  overallScore: number;
  sectionType: SectionType;
  criteria: CriterionScore[];
  generalFeedback: string;
  supportArguments?: SupportArgument[];  // 5 emphasis suggestions derived from text
  keyPoints?: KeyPoint[];                 // Key claims/points extracted from the text
  readabilityMetrics?: ReadabilityMetrics; // Deterministic readability analysis
}

// Support argument schema for rewrite requests
export const supportArgumentSchema = z.object({
  id: z.string(),
  sourceQuote: z.string(),
  emphasisSuggestion: z.string(),
  rationale: z.string(),
});

// Rewrite request schema
export const rewriteRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  sectionType: z.enum(sectionTypes),
  originalScore: z.number().min(1).max(10).optional(),
  shortenMode: z.boolean().optional(),
  writingStyle: writingStyleSchema.optional(),
  selectedEmphasisSuggestions: z.array(supportArgumentSchema).optional(),
  customInstructions: z.string().max(500).optional(),
  evaluationFeedback: z.object({
    criteria: z.array(z.object({
      name: z.string(),
      score: z.number(),
      suggestion: z.string(),
    })),
    generalFeedback: z.string(),
  }).optional(),
});

export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;

// Thinking step for chain of thought display
export interface ThinkingStep {
  phase: string;
  summary: string;
}

// Diff segment for visual diff display
export type DiffSegmentType = "equal" | "added" | "removed";

export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
}

// Change entry for rewrite
export interface ChangeEntry {
  original: string;
  new: string;
}

// Criteria score comparison for rewrite verification
export interface CriteriaScoreComparison {
  name: string;
  originalScore: number;
  suggestedScore: number;
  delta: number;
}

// Rewrite response
export interface RewriteResult {
  suggestedText: string;
  changes: ChangeEntry[];
  constraintWarning: string | null;
  thinkingSteps: ThinkingStep[];
  diffSegments: DiffSegment[];
  suggestedScore?: number;
  noImprovementFound?: boolean;
  originalReadability?: ReadabilityMetrics;
  suggestedReadability?: ReadabilityMetrics;
  criteriaComparison?: CriteriaScoreComparison[];
}

// Restructure suggestion - a sentence that should be moved to a different paragraph
export interface RestructureSuggestion {
  id: string;
  sentence: string;
  fromParagraph: number;
  toParagraph: number;
  reason: string;
}

// Restructure analysis result
export interface RestructureResult {
  suggestions: RestructureSuggestion[];
  overallCoherence: number;
  summary: string;
}

// Restructure request schema
export const restructureRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  sectionType: z.enum(sectionTypes),
  customInstructions: z.string().max(500).optional(),
});

export type RestructureRequest = z.infer<typeof restructureRequestSchema>;

// Section-specific criteria definitions
export const sectionCriteria: Record<SectionType, Criterion[]> = {
  title: [
    { name: "Content", weight: 30, description: "Does it capture the essence? Includes main concepts, theories, methods, findings, or data characteristics?" },
    { name: "Suspense/Interest", weight: 30, description: "Does it generate interest? Contains counter-intuitive, unexpected, humor, or surprise elements?" },
    { name: "Clarity", weight: 25, description: "Is it easy to understand? Uses plain words, avoids jargon, avoids consecutive nouns?" },
    { name: "Brevity", weight: 15, description: "Is it concise? Shorter titles are generally better; message clear without re-reading?" },
  ],
  abstract: [
    { name: "Goal/Purpose", weight: 18, description: "Clearly states the research question or study objective" },
    { name: "Research Design", weight: 18, description: "Briefly explains methodology or approach used" },
    { name: "Main Findings", weight: 22, description: "Summarizes the key results/discoveries" },
    { name: "Implications", weight: 17, description: "States contributions to theory and/or practice" },
    { name: "Completeness", weight: 10, description: "Contains all required elements within word limits" },
    { name: "Sentence Starter Variety", weight: 8, description: "Sentences begin with varied words, avoiding repetitive openers" },
    { name: "No Idea Redundancy", weight: 7, description: "Each sentence adds new information; no repetition of concepts already stated" },
  ],
  introduction: [
    { name: "Hook/Topic Introduction", weight: 12, description: "Opens with engaging description of the area/phenomenon" },
    { name: "Problem Statement", weight: 12, description: "Clearly identifies what is not well understood" },
    { name: "Relevancy of Problem", weight: 12, description: "Answers 'So what? Who cares? Why bother?'" },
    { name: "Current Understanding", weight: 12, description: "Briefly describes what we know (references to key studies)" },
    { name: "Limits of Current Knowledge", weight: 8, description: "Identifies the gap in literature" },
    { name: "Research Question/Aim", weight: 12, description: "Explicit, specific, well-fitted purpose statement" },
    { name: "Contributions", weight: 8, description: "Clear statement of what the paper adds" },
    { name: "Logical Flow", weight: 5, description: "Smooth transitions between elements" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 9, description: "Each paragraph adds new content; avoids restating what was already said" },
  ],
  literature_review: [
    { name: "Focus on Study", weight: 16, description: "Literature serves the paper's story, not just reporting others' work" },
    { name: "State of the Art", weight: 16, description: "Covers relevant, recent, high-impact sources" },
    { name: "Foundation Building", weight: 12, description: "Builds logical bridge from known to unknown" },
    { name: "Author's Voice", weight: 12, description: "Written in own words, not just quotes; author tells the story" },
    { name: "Critical Analysis", weight: 12, description: "Summarizes, analyzes, explains, and evaluates (not just describes)" },
    { name: "Research Ideas/Hypotheses", weight: 12, description: "Clear link to the study's propositions or conceptual model" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Each paragraph introduces new concepts; avoids restating previous points" },
  ],
  methodology: [
    { name: "Research Steps Clarity", weight: 16, description: "What was done is clearly described (replicable)" },
    { name: "Justification", weight: 16, description: "Why this method is appropriate (matches research question, follows accepted practice)" },
    { name: "Data Collection", weight: 16, description: "Clear description of what data, how collected, from whom/where" },
    { name: "Measurement Quality", weight: 12, description: "Valid, reliable measurements; concepts properly operationalized" },
    { name: "Quality Evidence", weight: 12, description: "Evidence that procedures worked well (statistics, checks)" },
    { name: "Rigor", weight: 8, description: "Follows methodological standards; meets assumptions of methods used" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Each paragraph covers new ground; avoids repeating previously stated information" },
  ],
  results: [
    { name: "Clarity of Presentation", weight: 20, description: "Results clearly organized, logical sequence" },
    { name: "Separation from Interpretation", weight: 12, description: "Findings presented distinctly from discussion/meaning" },
    { name: "Completeness", weight: 16, description: "All relevant analyses included; hypotheses addressed" },
    { name: "Visual Communication", weight: 12, description: "Tables/figures are stand-alone, properly captioned, not overloaded" },
    { name: "Statistical Rigor", weight: 12, description: "Appropriate tests, correct reporting of statistics" },
    { name: "Conciseness", weight: 8, description: "Focuses on key findings; avoids unnecessary detail" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Each finding stated once; avoids restating the same result multiple ways" },
  ],
  discussion: [
    { name: "Interpretation", weight: 20, description: "What do the findings mean in the real world?" },
    { name: "Connection to Prior Research", weight: 20, description: "How do findings relate to/extend/contradict existing knowledge?" },
    { name: "Explaining Key Findings", weight: 16, description: "Distinguished findings are explained (especially unexpected ones)" },
    { name: "Critical Distance", weight: 12, description: "Avoids jumping to conclusions; acknowledges alternative interpretations" },
    { name: "Focus on Forest", weight: 12, description: "Emphasizes distinguishing elements, not all individual trees" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Each paragraph adds new insights; avoids restating points from earlier sections" },
  ],
  conclusion: [
    { name: "Theoretical Contributions", weight: 16, description: "Clear statement of what new knowledge is discovered" },
    { name: "Practical Implications", weight: 16, description: "Who benefits, how, when, why (concrete, not vague)" },
    { name: "Limitations", weight: 12, description: "Honest acknowledgment of shortcomings without being masochistic" },
    { name: "Future Research", weight: 12, description: "Concrete suggestions for follow-up studies" },
    { name: "Answer to Research Question", weight: 12, description: "Directly addresses the promise made in introduction" },
    { name: "Positive Closure", weight: 4, description: "Ends with forward-looking, positive final sentence" },
    { name: "No Overclaiming", weight: 8, description: "Claims match evidence; appropriate hedging" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Summarizes without excessive repetition from earlier sections" },
  ],
  conclusion_with_limits: [
    { name: "Theoretical Contributions", weight: 14, description: "Clear statement of what new knowledge is discovered" },
    { name: "Practical Implications", weight: 14, description: "Who benefits, how, when, why (concrete, not vague)" },
    { name: "Limitations", weight: 14, description: "Honest acknowledgment of shortcomings without being masochistic; specific, not generic" },
    { name: "Future Research", weight: 14, description: "Concrete, actionable suggestions for follow-up studies stemming from limitations" },
    { name: "Answer to Research Question", weight: 12, description: "Directly addresses the promise made in introduction" },
    { name: "Positive Closure", weight: 4, description: "Ends with forward-looking, positive final sentence" },
    { name: "No Overclaiming", weight: 8, description: "Claims match evidence; appropriate hedging" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Summarizes without excessive repetition from earlier sections" },
  ],
  conclusion_without_limits: [
    { name: "Theoretical Contributions", weight: 22, description: "Clear statement of what new knowledge is discovered" },
    { name: "Practical Implications", weight: 22, description: "Who benefits, how, when, why (concrete, not vague)" },
    { name: "Answer to Research Question", weight: 16, description: "Directly addresses the promise made in introduction" },
    { name: "Positive Closure", weight: 8, description: "Ends with forward-looking, positive final sentence" },
    { name: "No Overclaiming", weight: 12, description: "Claims match evidence; appropriate hedging" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Summarizes without excessive repetition from earlier sections" },
  ],
  limitations_future_research: [
    { name: "Limitation Specificity", weight: 20, description: "Limitations are specific to this study, not generic disclaimers; acknowledges actual constraints faced" },
    { name: "Limitation Honesty", weight: 15, description: "Honest acknowledgment without being overly apologetic or undermining the research" },
    { name: "Future Research Concreteness", weight: 20, description: "Concrete, actionable research directions; not vague suggestions like 'more research is needed'" },
    { name: "Limitation-Future Link", weight: 15, description: "Future research suggestions logically stem from stated limitations" },
    { name: "Balanced Tone", weight: 10, description: "Neither dismissive of limitations nor masochistic; maintains scholarly confidence" },
    { name: "Sentence Starter Variety", weight: 10, description: "Paragraphs and sentences begin with varied words, not repetitive openers" },
    { name: "No Idea Redundancy", weight: 10, description: "Each point adds new information; avoids restating the same limitation or suggestion" },
  ],
  paragraph: [
    { name: "Main Idea Clarity", weight: 30, description: "Paragraph has one clear, identifiable main idea or topic sentence" },
    { name: "Supporting Sentences", weight: 30, description: "All other sentences directly support, explain, or elaborate the main idea" },
    { name: "Sentence Starter Variety", weight: 20, description: "Sentences begin with varied words/structures, not repetitive openers like 'The... The...' or 'This... This...'" },
    { name: "Internal Coherence", weight: 20, description: "Logical flow between sentences with smooth transitions" },
  ],
  // Figure section types with universal + section-specific criteria
  figure_introduction: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Problem Framing", weight: 25, description: "Clearly visualizes the gap, context, or motivation for the research" },
    { name: "Conceptual Accessibility", weight: 25, description: "Simple enough for broad audience; effectively sets the stage" },
  ],
  figure_theory: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Prior Work Representation", weight: 25, description: "Accurately depicts existing concepts, models, or relationships from literature" },
    { name: "Contribution Positioning", weight: 25, description: "Your novelty, lens, or extension is visually distinguishable from existing work" },
  ],
  figure_methodology: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Process Flow Clarity", weight: 25, description: "Clear sequence of steps, phases, or stages; obvious directionality" },
    { name: "Input-Output Visibility", weight: 25, description: "What goes into each phase and what comes out is apparent" },
  ],
  figure_results_quantitative: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Data-Ink Ratio", weight: 25, description: "Maximizes data representation, minimizes chartjunk (unnecessary gridlines, borders, effects)" },
    { name: "Uncertainty Representation", weight: 25, description: "Error bars, confidence intervals, or variability shown where appropriate" },
  ],
  figure_results_qualitative: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Theme Relationship Clarity", weight: 25, description: "Connections, hierarchies, or patterns between themes are visible" },
    { name: "Appropriate Abstraction", weight: 25, description: "Captures richness without oversimplifying or implying false precision" },
  ],
  figure_discussion: [
    // Universal criteria (50%)
    { name: "Visual Design", weight: 25, description: "Readable, uncluttered, balanced layout, good contrast, clear visual hierarchy" },
    { name: "Standalone Interpretability", weight: 25, description: "Understandable from figure + caption alone; all abbreviations, symbols, and elements explained" },
    // Section-specific criteria (50%)
    { name: "Logical Structure", weight: 25, description: "Clear hierarchy showing relationships between components; obvious reading flow" },
    { name: "Relationship Clarity", weight: 25, description: "Arrows, lines, or positioning clearly indicate how components relate; consistent visual logic" },
  ],
};

// Export auth models for Replit Auth
export * from "./models/auth";

// Export research paper and history models
export * from "./models/research";
