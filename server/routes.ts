import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { evaluationRequestSchema, rewriteRequestSchema, figureEvaluationRequestSchema, restructureRequestSchema, sectionCriteria, sectionLabels, type SectionType, type CriterionScore, type EvaluationResult, type RewriteResult, type RestructureResult, type RestructureSuggestion, type DiffSegment, type ThinkingStep, type WritingStyle, type WritingStyleDimensions, type ReadabilityMetrics, researchPapers, paperSections, evaluationHistory, rewriteHistory, insertPaperSchema, insertSectionSchema, writingStyleLabels } from "@shared/schema";
import { analyzeReadability } from "./readability";

function buildStylePrompt(style?: WritingStyle): string {
  if (!style) return "";
  
  const d = style.dimensions;
  const styleLabel = writingStyleLabels[style.preset];
  
  const formalityDesc = ["very conversational", "conversational", "moderately formal", "formal", "highly formal"][d.formality - 1];
  const complexityDesc = ["very short and direct sentences", "short sentences", "moderate sentence length", "longer sentences", "complex, elaborate sentences"][d.sentenceComplexity - 1];
  const hedgingDesc = ["very assertive (e.g., 'X causes Y')", "assertive", "moderately hedged", "cautious (e.g., 'X may influence Y')", "very cautious (e.g., 'X may potentially contribute to Y')"][d.hedgingLevel - 1];
  const voiceDesc = d.voice === "passive" ? "passive voice preferred" : d.voice === "active" ? "active voice preferred" : "mixed voice (both passive and active)";
  const personDesc = d.person === "third" ? "third person (e.g., 'The authors')" : d.person === "first_plural" ? "first person plural (e.g., 'We')" : "first person singular (e.g., 'I')";
  const densityDesc = ["spacious/explanatory prose", "readable with explanations", "moderate density", "dense prose", "highly compressed prose"][d.density - 1];
  const jargonDesc = ["accessible to general readers", "minimal jargon", "moderate technical language", "technical jargon acceptable", "specialist-level jargon expected"][d.jargonTolerance - 1];

  return `

TARGET WRITING STYLE: ${styleLabel}
The user is targeting the following academic writing style. Evaluate their text against this style and provide feedback that helps them match it:
- Formality: ${formalityDesc}
- Sentence complexity: ${complexityDesc}
- Hedging level: ${hedgingDesc}
- Voice: ${voiceDesc}
- Person: ${personDesc}
- Density: ${densityDesc}
- Jargon tolerance: ${jargonDesc}

When providing suggestions, guide the user toward this target style. For example, if they're writing too informally for a "formal" target, suggest specific ways to increase formality.`;
}
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { writingExamples, type WritingExample } from "@shared/models/research";

// Cache for writing examples to avoid repeated DB queries
let examplesCache: WritingExample[] | null = null;
let examplesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getWritingExamples(): Promise<WritingExample[]> {
  const now = Date.now();
  if (examplesCache && now - examplesCacheTime < CACHE_TTL) {
    return examplesCache;
  }
  
  try {
    examplesCache = await db.select().from(writingExamples).where(eq(writingExamples.isActive, 1));
    examplesCacheTime = now;
    return examplesCache;
  } catch (error) {
    console.error("Failed to fetch writing examples:", error);
    return [];
  }
}

function getRelevantExamples(examples: WritingExample[], sectionType: string, discipline?: string): WritingExample[] {
  // Map conclusion variants to base conclusion for examples
  const normalizedSection = sectionType.startsWith("conclusion") ? "conclusion" : sectionType;
  
  // First try to find exact match for discipline + section
  if (discipline) {
    const exactMatch = examples.filter(e => e.discipline === discipline && e.sectionType === normalizedSection);
    if (exactMatch.length > 0) return exactMatch.slice(0, 2);
  }
  
  // Fall back to any example for this section type
  const sectionMatch = examples.filter(e => e.sectionType === normalizedSection);
  if (sectionMatch.length > 0) return sectionMatch.slice(0, 2);
  
  return [];
}

function buildExamplesPrompt(examples: WritingExample[]): string {
  if (examples.length === 0) return "";
  
  return `

HIGH-QUALITY EXAMPLES - Use these as reference for excellent academic writing:
${examples.map((ex, i) => `
Example ${i + 1} (${ex.discipline}, ${ex.sectionType}):
"${ex.excerpt}"
${ex.annotation ? `\nWhy this works: ${ex.annotation}` : ""}`).join("\n")}

Learn from these examples: notice the specific numbers, clear structure, active voice, and concrete details. Your feedback should guide the user toward writing like these examples.`;
}

function computeWordDiff(original: string, suggested: string): DiffSegment[] {
  const originalWords = original.split(/(\s+)/);
  const suggestedWords = suggested.split(/(\s+)/);
  
  const m = originalWords.length;
  const n = suggestedWords.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalWords[i - 1] === suggestedWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const segments: DiffSegment[] = [];
  let i = m, j = n;
  const ops: Array<{ type: "equal" | "added" | "removed"; text: string }> = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalWords[i - 1] === suggestedWords[j - 1]) {
      ops.unshift({ type: "equal", text: originalWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "added", text: suggestedWords[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "removed", text: originalWords[i - 1] });
      i--;
    }
  }
  
  for (const op of ops) {
    if (segments.length > 0 && segments[segments.length - 1].type === op.type) {
      segments[segments.length - 1].text += op.text;
    } else {
      segments.push({ type: op.type, text: op.text });
    }
  }
  
  return segments;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PastEvaluation {
  sectionType: string;
  originalText: string;
  overallScore: number;
  generalFeedback: string;
  createdAt: Date | null;
}

async function evaluateText(text: string, sectionType: SectionType, pastContext?: PastEvaluation[], writingStyle?: WritingStyle, includeEmphasis?: boolean, isFullPublicationContext?: boolean, customInstructions?: string, readabilityMetrics?: ReadabilityMetrics): Promise<EvaluationResult> {
  const criteria = sectionCriteria[sectionType];
  const sectionLabel = sectionLabels[sectionType];
  const styleSection = buildStylePrompt(writingStyle);
  
  // Fetch writing examples for few-shot learning
  const allExamples = await getWritingExamples();
  const discipline = writingStyle?.preset === "engineering" ? "engineering" 
    : writingStyle?.preset === "natural_sciences" ? "natural_sciences"
    : writingStyle?.preset === "social_sciences" ? "social_sciences"
    : writingStyle?.preset === "management" ? "business_management"
    : writingStyle?.preset === "information_systems" ? "information_systems"
    : undefined;
  const relevantExamples = getRelevantExamples(allExamples, sectionType, discipline);
  const examplesSection = buildExamplesPrompt(relevantExamples);

  // Build readability context for AI
  const readabilitySection = readabilityMetrics ? `

PRE-COMPUTED READABILITY METRICS (deterministic analysis):
- Flesch Reading Ease Score: ${readabilityMetrics.fleschScore} (${readabilityMetrics.fleschGrade})
- Average sentence length: ${readabilityMetrics.avgSentenceLength} words (target: 15-20 for academic writing)
- Average syllables per word: ${readabilityMetrics.avgWordLength} (lower = more accessible)
- Passive voice usage: ${readabilityMetrics.passiveVoicePercent}%
- Total: ${readabilityMetrics.totalWords} words, ${readabilityMetrics.totalSentences} sentences
${readabilityMetrics.longSentences.length > 0 ? `- Long sentences (>25 words): ${readabilityMetrics.longSentences.length} found` : '- No excessively long sentences detected'}

Use these metrics to inform your evaluation. Reference specific metrics in your feedback when relevant (e.g., "Your average sentence length of 32 words makes the text harder to follow...").` : "";

  // Narrative flow guidance - lighter version for non-narrative sections
  const narrativeSections = ["abstract", "introduction", "discussion", "conclusion", "conclusion_with_limits", "conclusion_without_limits", "limitations_future_research"];
  const isNarrativeSection = narrativeSections.includes(sectionType);

  // Build narrative flow guidance - stronger for narrative sections, lighter for others
  const storytellingSection = isNarrativeSection ? `

STORYTELLING & READABILITY FOCUS (High Priority for this section):
This is a narrative section that benefits from clear storytelling. Evaluate with emphasis on:
- Clear narrative arc: Does the text flow logically from setup → tension/gap → resolution/contribution?
- Reader engagement: Is the opening compelling? Does it draw the reader in?
- Accessibility: Is the language accessible to a broader academic audience, not just specialists?
- Clarity over complexity: Favor clear, direct language over unnecessarily complex phrasing
- Transitions: Are ideas connected with smooth transitions that guide the reader?

When suggesting improvements, encourage:
- Strong opening hooks that establish context quickly
- Clear "so what?" framing that shows why the work matters
- Accessible language that doesn't sacrifice precision` : `

NARRATIVE FLOW (applies to all sections):
Even technical sections benefit from logical flow. Consider:
- Does each paragraph have a clear main idea?
- Do ideas connect with clear transitions?
- Is the information presented in a logical sequence?`;

  // Custom instructions from user
  const customInstructionsSection = customInstructions ? `

USER-PROVIDED CUSTOM INSTRUCTIONS (prioritize these):
${customInstructions}` : "";

  // Section-specific point types for key point extraction
  const sectionPointTypes: Record<string, string[]> = {
    abstract: ["purpose", "method", "finding", "implication"],
    introduction: ["context", "problem", "gap", "objective", "contribution"],
    literature_review: ["prior_work", "theory", "finding", "gap"],
    methodology: ["approach", "data_source", "procedure", "measure"],
    results: ["finding", "comparison", "pattern", "statistic"],
    discussion: ["interpretation", "comparison", "implication", "limitation"],
    conclusion: ["contribution", "implication", "limitation", "future_work"],
    title: ["topic", "method", "scope"],
    paragraph: ["main_idea", "support", "evidence"],
  };

  const pointTypes = sectionPointTypes[sectionType] || ["claim", "point", "statement"];

  const keyPointsSection = `

3. "keyPoints": An array of 3-7 key points/claims extracted from the text. Each must have:
   - "id": A unique identifier (e.g., "kp1", "kp2", etc.)
   - "statement": A concise summary of the point (10-20 words) - must capture the essence without adding new information
   - "sourceQuote": The EXACT quote from the original text this point is based on (verbatim, 15-50 words)
   - "pointType": One of: ${pointTypes.map(t => `"${t}"`).join(", ")}

CRITICAL RULES FOR keyPoints:
- Extract the MAIN claims, findings, or statements that form the outline of this section
- Each keyPoint MUST be derived from and traceable to a specific quote in the original text
- The sourceQuote MUST appear verbatim in the user's text - NEVER paraphrase, summarize, or invent quotes
- The statement should summarize the quote concisely WITHOUT adding any new data, citations, or claims
- Order keyPoints by their appearance in the text (first to last)
- Choose pointType based on what the point represents in this section context`;

  const emphasisSection = includeEmphasis ? `

4. "supportArguments": An array of EXACTLY 5 emphasis suggestions. Each suggestion helps the user highlight the importance/relevance of their existing claims. Each must have:
   - "id": A unique identifier (e.g., "arg1", "arg2", etc.)
   - "sourceQuote": The EXACT quote from the original text that this suggestion is based on (must be verbatim from the input)
   - "emphasisSuggestion": How to reframe or amplify this point to show its importance/relevance (15-30 words)
   - "rationale": Why this point deserves more emphasis - what makes it significant (10-20 words)

CRITICAL RULES FOR supportArguments:
- Each suggestion MUST be derived from a specific quote in the original text
- The sourceQuote MUST appear verbatim in the user's text - never paraphrase or invent quotes
- NEVER suggest adding new data, citations, statistics, or claims not already in the text
- Focus on EMPHASIS and FRAMING: show WHY existing points matter, highlight their significance
- Examples of good emphasis suggestions:
  * "This finding could be positioned as addressing a critical gap by adding 'This addresses a persistent challenge in...'"
  * "Frame this contribution more prominently by leading with its practical impact"
  * "Highlight the novelty by contrasting with conventional approaches"` : "";

  let contextSection = "";
  if (pastContext && pastContext.length > 0) {
    const filteredContext = pastContext
      .filter(p => p.originalText && p.originalText.trim().length > 0);
    
    // When in full publication context mode, include ALL past text (no slice)
    // Otherwise, limit to 3 for standalone evaluations
    const validContext = isFullPublicationContext 
      ? filteredContext 
      : filteredContext.slice(0, 3);
    
    if (validContext.length > 0) {
      const contextLabel = isFullPublicationContext 
        ? "FULL PUBLICATION HISTORY - Past text from this research paper:"
        : "RESEARCH HISTORY - Past submitted text:";
      
      // Send ONLY past TEXT, not past AI feedback (avoids reinforcing AI's own biases)
      contextSection = `\n\n${contextLabel}
The user has previously submitted the following sections. Review their writing to understand their style, recurring patterns, and the paper's overall narrative:

${validContext.map((p) => `--- Past ${sectionLabels[p.sectionType as SectionType] || p.sectionType} ---
${p.originalText.substring(0, 600)}${p.originalText.length > 600 ? '...' : ''}`).join('\n\n')}

Use this context to:
- Identify recurring writing patterns (good or problematic)
- Ensure consistency across sections${isFullPublicationContext ? '\n- Maintain narrative coherence with other parts of the publication' : ''}
- Provide feedback that accounts for the user's writing style`;
    }
  }

  const systemPrompt = `You are an expert academic writing evaluator with deep knowledge of scholarly publication standards. Your task is to evaluate academic text against specific criteria and provide HYPERSPECIFIC, actionable feedback.${contextSection}${styleSection}${readabilitySection}${storytellingSection}${examplesSection}${customInstructionsSection}

You must respond with a valid JSON object containing:
1. "criteria": An array of criterion evaluations, each with:
   - "name": The exact criterion name
   - "score": A number from 1-10 (1-2: Poor, 3-4: Below Average, 5-6: Average, 7-8: Good, 9-10: Excellent)
   - "suggestion": A HYPERSPECIFIC suggestion that:
     * Quotes exact phrases from the text that need improvement (use quotation marks)
     * Provides a concrete rewritten example of how to fix it
     * Names specific elements to add (e.g., "Add a transition like 'Building on this...' before the third sentence")
     * References specific sentence positions (e.g., "The opening sentence lacks..." or "Between sentences 2 and 3, add...")
   - "missing": A specific label (5-10 words) describing exactly what's missing. Instead of vague labels like "data collection", be specific: "sample size and recruitment criteria", "statistical significance values (p-values)", "comparison to Smith et al. 2023 findings". If score is 8+, set to null or empty string.

2. "generalFeedback": A brief overall assessment (2-3 sentences) highlighting the main strengths and areas for improvement.${keyPointsSection}${emphasisSection}

HYPERSPECIFIC FEEDBACK REQUIREMENTS:
- ALWAYS quote problematic phrases directly from the text
- ALWAYS provide concrete rewrite examples (e.g., "Change 'The results show...' to 'The regression analysis revealed a statistically significant correlation (r=0.78)...'")
- NEVER give generic advice like "add more detail" or "be more specific" - instead say EXACTLY what to add
- Reference sentence positions when possible ("The second sentence needs...", "After 'methodology section,' add...")

Scoring guide:
- 1-2 (Poor): Major issues; criterion barely addressed
- 3-4 (Below Average): Significant gaps; needs substantial work
- 5-6 (Average): Meets basic requirements; room for improvement
- 7-8 (Good): Well executed; minor refinements needed
- 9-10 (Excellent): Publication-ready quality; exceptional execution

SPECIAL ATTENTION FOR REDUNDANCY CRITERIA:
- "Sentence Starter Variety": Check if sentences/paragraphs begin with the same words (e.g., multiple sentences starting with "The...", "This...", "It..."). Penalize heavily if 3+ consecutive sentences or paragraphs start the same way.
- "No Idea Redundancy": Check if the same concept, claim, or point is stated multiple times across different paragraphs. Technical term consistency is GOOD (using the same term for the same concept), but restating the same idea in different words is BAD.

For Paragraph section type specifically:
- "Main Idea Clarity": Every paragraph should have ONE clear main idea, typically in the topic sentence.
- "Supporting Sentences": All other sentences must directly support, explain, or provide evidence for that main idea.

Be constructive but honest. Provide specific suggestions tied to the text.`;

  const userPrompt = `Evaluate this ${sectionLabel} section of an academic paper:

---
${text}
---

Evaluate against these criteria:
${criteria.map((c, i) => `${i + 1}. ${c.name} (${c.weight}% weight): ${c.description}`).join("\n")}

Respond with a JSON object containing "criteria" (array with name, score, suggestion, missing for each), "keyPoints" (array of 3-7 key claims/points extracted from the text)${includeEmphasis ? ', "supportArguments" (array of 5 emphasis suggestions as described above),' : ','} and "generalFeedback" (string).`;

  let content: string | null = null;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });
      
      content = response.choices[0]?.message?.content;
      if (content) break;
      
      lastError = new Error(`Attempt ${attempt}: Empty response from AI`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`AI evaluation attempt ${attempt} failed:`, lastError.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  if (!content) {
    throw lastError || new Error("No response from AI after 3 attempts");
  }

  const parsed_response = JSON.parse(content) as {
    criteria: Array<{ name: string; score: number; suggestion: string; missing?: string }>;
    generalFeedback: string;
    keyPoints?: Array<{ id: string; statement: string; sourceQuote: string; pointType: string }>;
    supportArguments?: Array<{ id: string; sourceQuote: string; emphasisSuggestion: string; rationale: string }>;
  };

  const criteriaScores: CriterionScore[] = criteria.map((c, index) => {
    const normalizedName = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const firstWord = c.name.toLowerCase().split(/[\s\/]/)[0];
    
    const aiCriterion = parsed_response.criteria.find(
      (ac) => ac.name.toLowerCase() === c.name.toLowerCase()
    ) || parsed_response.criteria.find(
      (ac) => ac.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
    ) || parsed_response.criteria.find(
      (ac) => ac.name.toLowerCase().includes(firstWord) || firstWord.includes(ac.name.toLowerCase().split(/[\s\/]/)[0])
    ) || parsed_response.criteria[index];
    
    const score = Math.max(1, Math.min(10, Math.round(aiCriterion?.score ?? 5)));
    
    return {
      name: c.name,
      weight: c.weight,
      score,
      suggestion: aiCriterion?.suggestion || `Consider reviewing the ${c.name.toLowerCase()} aspect of your text to improve this criterion.`,
      missing: score < 8 ? (aiCriterion?.missing || undefined) : undefined,
    };
  });

  const overallScore = criteriaScores.reduce(
    (sum, c) => sum + (c.score * c.weight) / 100,
    0
  );

  const supportArguments = (parsed_response.supportArguments || []).slice(0, 5).map((arg: any, index: number) => ({
    id: arg.id || `arg${index + 1}`,
    sourceQuote: arg.sourceQuote || "",
    emphasisSuggestion: arg.emphasisSuggestion || "",
    rationale: arg.rationale || "",
    selected: false,
  }));

  // Validate keyPoints - only keep ones where sourceQuote actually appears in the original text
  const rawKeyPoints = (parsed_response.keyPoints || []).slice(0, 7);
  const validatedKeyPoints = rawKeyPoints
    .filter((kp: any) => {
      if (!kp.sourceQuote || typeof kp.sourceQuote !== 'string') return false;
      // Normalize whitespace for comparison
      const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
      const normalizedQuote = kp.sourceQuote.replace(/\s+/g, ' ').toLowerCase();
      // Check if quote exists in original text (with whitespace normalization)
      return normalizedText.includes(normalizedQuote);
    })
    .map((kp: any, index: number) => ({
      id: kp.id || `kp${index + 1}`,
      statement: kp.statement || "",
      sourceQuote: kp.sourceQuote || "",
      pointType: kp.pointType || "claim",
    }));

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    sectionType: sectionType as SectionType,
    criteria: criteriaScores,
    generalFeedback: parsed_response.generalFeedback || "Evaluation complete.",
    supportArguments: supportArguments.length > 0 ? supportArguments : undefined,
    keyPoints: validatedKeyPoints.length > 0 ? validatedKeyPoints : undefined,
  };
}

const figureSectionContext: Record<string, string> = {
  figure_introduction: "This figure is for an INTRODUCTION / PROBLEM SETUP section. It should visualize the research gap, context, or motivation. Focus on whether it effectively frames the problem and is accessible to a broad academic audience.",
  figure_theory: "This figure is for a THEORY / LITERATURE REVIEW section. It should represent prior work, existing models, or theoretical frameworks. Focus on whether it accurately depicts existing concepts and clearly positions the author's contribution.",
  figure_methodology: "This figure is for a METHODOLOGY section. It should show research processes, workflows, or procedures. Focus on whether the sequence of steps is clear, with obvious directionality and visible inputs/outputs.",
  figure_results_quantitative: "This figure is for a QUANTITATIVE RESULTS section. It likely contains charts, graphs, or statistical visualizations. Focus on data-ink ratio (minimize chartjunk), appropriate chart type, and whether uncertainty (error bars, confidence intervals) is properly shown.",
  figure_results_qualitative: "This figure is for a QUALITATIVE RESULTS section. It may show themes, categories, or conceptual relationships. Focus on whether theme relationships are visible and whether abstraction level appropriately captures richness without oversimplifying.",
  figure_discussion: "This figure is for a DISCUSSION / FRAMEWORK section. It likely presents a conceptual framework, model, or synthesis. Focus on logical structure, clear hierarchy, and whether relationships between components are clearly indicated.",
};

async function evaluateFigure(imageData: string, sectionType: SectionType, caption?: string, customInstructions?: string): Promise<EvaluationResult> {
  const criteria = sectionCriteria[sectionType];
  const sectionLabel = sectionLabels[sectionType];
  const sectionContext = figureSectionContext[sectionType] || "";

  const customInstructionsSection = customInstructions ? `

USER-PROVIDED CUSTOM INSTRUCTIONS (prioritize these):
${customInstructions}` : "";

  const systemPrompt = `You are an expert academic figure evaluator with deep knowledge of data visualization, scientific communication, and scholarly publication standards. Your task is to evaluate academic figures and provide HYPERSPECIFIC, actionable feedback tailored to the figure's purpose within the paper.

${sectionContext}${customInstructionsSection}

You must respond with a valid JSON object containing:
1. "criteria": An array of criterion evaluations, each with:
   - "name": The exact criterion name (must match exactly)
   - "score": A number from 1-10
   - "suggestion": A HYPERSPECIFIC suggestion that:
     * Identifies the EXACT visual element that needs improvement (e.g., "The box labeled 'Analysis' lacks connecting arrows to subsequent steps")
     * Provides a concrete fix (e.g., "Add directional arrows from 'Analysis' to 'Results' to show the workflow progression")
     * References specific parts of the figure (e.g., "The top-left quadrant showing...", "The third bar from the left...")
   - "missing": A specific label (5-10 words) describing exactly what's missing. Be VERY specific to this figure type. Examples:
     * For methodology: "directional arrows between phases", "input labels for data collection step"
     * For quantitative: "error bars on treatment group", "axis units (e.g., mm or kg)"
     * For qualitative: "lines connecting related themes", "hierarchy indicators between categories"
     * If score is 8+, set to null.

2. "generalFeedback": A 2-3 sentence assessment highlighting main strengths and priority improvements for this specific figure type.

HYPERSPECIFIC FEEDBACK REQUIREMENTS:
- Reference exact visual elements you can see (boxes, arrows, labels, bars, lines, colors, text)
- Suggest specific improvements with concrete examples relevant to this figure type
- Mention accessibility issues (colorblind-friendly palettes, contrast ratios, font sizes)
- Consider publication standards (resolution, readability at print size)

Scoring guide:
- 1-2 (Poor): Major issues; figure is confusing or unprofessional for its intended purpose
- 3-4 (Below Average): Significant gaps; missing key elements for this section type
- 5-6 (Average): Functional but needs polish to serve its purpose effectively
- 7-8 (Good): Publication-ready with minor refinements
- 9-10 (Excellent): Exceptional quality, optimally designed for its section context`;

  const captionContext = caption 
    ? `\n\nFIGURE CAPTION PROVIDED BY USER:\n"${caption}"\n\nEvaluate if this caption adequately explains the figure and supports standalone interpretability.` 
    : "\n\nNo caption was provided. Note this in your Standalone Interpretability evaluation - a good caption is essential.";

  const userPrompt = `Evaluate this academic figure for use in a ${sectionLabel} section.${captionContext}

Evaluate against these criteria (UNIVERSAL + SECTION-SPECIFIC):
${criteria.map((c, i) => `${i + 1}. ${c.name} (${c.weight}% weight): ${c.description}`).join("\n")}

Respond with a JSON object containing "criteria" (array with name, score, suggestion, missing for each) and "generalFeedback" (string).`;

  let content: string | null = null;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageData, detail: "high" } }
            ]
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });
      
      content = response.choices[0]?.message?.content;
      if (content) break;
      
      lastError = new Error(`Attempt ${attempt}: Empty response from AI`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`Figure evaluation attempt ${attempt} failed:`, lastError.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  if (!content) {
    throw lastError || new Error("No response from AI after 3 attempts");
  }

  const parsed_response = JSON.parse(content) as {
    criteria: Array<{ name: string; score: number; suggestion: string; missing?: string }>;
    generalFeedback: string;
  };

  const criteriaScores: CriterionScore[] = criteria.map((c, index) => {
    const aiCriterion = parsed_response.criteria.find(
      (ac) => ac.name.toLowerCase() === c.name.toLowerCase()
    ) || parsed_response.criteria[index];
    
    const score = Math.max(1, Math.min(10, Math.round(aiCriterion?.score ?? 5)));
    
    return {
      name: c.name,
      weight: c.weight,
      score,
      suggestion: aiCriterion?.suggestion || `Consider reviewing the ${c.name.toLowerCase()} aspect of your figure.`,
      missing: score < 8 ? (aiCriterion?.missing || undefined) : undefined,
    };
  });

  const overallScore = criteriaScores.reduce(
    (sum, c) => sum + (c.score * c.weight) / 100,
    0
  );

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    sectionType: sectionType,
    criteria: criteriaScores,
    generalFeedback: parsed_response.generalFeedback || "Evaluation complete.",
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);
  
  app.post("/api/evaluate", async (req: any, res) => {
    try {
      const parsed = evaluationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { text, sectionType, writingStyle, includeEmphasis, paperId, customInstructions } = parsed.data;
      
      // Compute deterministic readability metrics before AI evaluation
      const readabilityMetrics = analyzeReadability(text);
      
      let pastContext: PastEvaluation[] = [];
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        
        if (paperId) {
          // When a publication is selected, fetch ALL evaluations from that publication
          // This gives the AI full memory of everything submitted for this paper
          const pastEvaluations = await db
            .select({
              sectionType: evaluationHistory.sectionType,
              originalText: evaluationHistory.originalText,
              overallScore: evaluationHistory.overallScore,
              generalFeedback: evaluationHistory.generalFeedback,
              createdAt: evaluationHistory.createdAt,
            })
            .from(evaluationHistory)
            .where(and(
              eq(evaluationHistory.userId, userId),
              eq(evaluationHistory.paperId, paperId)
            ))
            .orderBy(evaluationHistory.createdAt); // Chronological order for paper context
          pastContext = pastEvaluations;
        } else {
          // No publication selected - use last 5 evaluations across all papers
          const pastEvaluations = await db
            .select({
              sectionType: evaluationHistory.sectionType,
              originalText: evaluationHistory.originalText,
              overallScore: evaluationHistory.overallScore,
              generalFeedback: evaluationHistory.generalFeedback,
              createdAt: evaluationHistory.createdAt,
            })
            .from(evaluationHistory)
            .where(eq(evaluationHistory.userId, userId))
            .orderBy(desc(evaluationHistory.createdAt))
            .limit(5);
          pastContext = pastEvaluations;
        }
      }
      
      const result = await evaluateText(text, sectionType, pastContext.length > 0 ? pastContext : undefined, writingStyle, includeEmphasis, !!paperId, customInstructions, readabilityMetrics);
      
      // Include readability metrics in the response
      res.json({
        ...result,
        readabilityMetrics,
      });
    } catch (error) {
      console.error("Evaluation error:", error);
      res.status(500).json({
        error: "Failed to evaluate text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/evaluate-figure", async (req: any, res) => {
    try {
      const parsed = figureEvaluationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { imageData, caption, sectionType, customInstructions } = parsed.data;
      const result = await evaluateFigure(imageData, sectionType, caption, customInstructions);
      res.json(result);
    } catch (error) {
      console.error("Figure evaluation error:", error);
      res.status(500).json({
        error: "Failed to evaluate figure",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/restructure", async (req, res) => {
    try {
      const parsed = restructureRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { text, sectionType, customInstructions } = parsed.data;
      const sectionLabel = sectionLabels[sectionType];
      
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
      
      if (paragraphs.length < 2) {
        return res.json({
          suggestions: [],
          overallCoherence: 10,
          summary: "Text has only one paragraph. No restructuring needed."
        } as RestructureResult);
      }

      const customInstructionsSection = customInstructions ? `

USER-PROVIDED CUSTOM INSTRUCTIONS (consider these when analyzing structure):
${customInstructions}` : "";

      const systemPrompt = `You are an expert academic writing editor. Analyze the paragraph structure of academic text and identify sentences that would flow better in a different paragraph.${customInstructionsSection}

Your job is to identify sentences that:
1. Break the logical flow of their current paragraph
2. Would fit more naturally in another paragraph based on topic/theme
3. Are out of place given the paragraph's main idea

CRITICAL CONSTRAINTS:
- Only suggest moving COMPLETE sentences that already exist in the text
- Never suggest adding, removing, or modifying content
- Only suggest moves that genuinely improve coherence
- Be conservative - only suggest moves that clearly improve the structure
- If the structure is already coherent, return an empty suggestions array

Respond with a JSON object containing:
{
  "suggestions": [
    {
      "id": "unique-id",
      "sentence": "The exact sentence to move (must be verbatim from text)",
      "fromParagraph": 1,
      "toParagraph": 3,
      "reason": "Brief explanation of why this move improves coherence"
    }
  ],
  "overallCoherence": 7.5,
  "summary": "Brief assessment of the text's current structure"
}

Notes:
- Paragraph numbers are 1-indexed
- overallCoherence is a score from 1-10 (10 = perfectly structured)
- Only include suggestions if they genuinely improve the text
- Maximum 5 suggestions`;

      const userPrompt = `Analyze this ${sectionLabel} section for paragraph coherence. Identify any sentences that should be moved to a different paragraph.

TEXT (${paragraphs.length} paragraphs):
${paragraphs.map((p, i) => `--- Paragraph ${i + 1} ---\n${p.trim()}`).join('\n\n')}

Remember: Only suggest moves that clearly improve coherence. If the structure is good, return empty suggestions.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || '{"suggestions":[],"overallCoherence":8,"summary":"Unable to analyze"}';
      const rawResult = JSON.parse(content);
      
      const validSuggestions: RestructureSuggestion[] = [];
      for (const s of rawResult.suggestions || []) {
        const sentenceNorm = s.sentence?.replace(/\s+/g, ' ').trim().toLowerCase();
        const textNorm = text.replace(/\s+/g, ' ').toLowerCase();
        
        if (sentenceNorm && textNorm.includes(sentenceNorm)) {
          validSuggestions.push({
            id: s.id || crypto.randomUUID(),
            sentence: s.sentence,
            fromParagraph: s.fromParagraph,
            toParagraph: s.toParagraph,
            reason: s.reason
          });
        }
      }

      const result: RestructureResult = {
        suggestions: validSuggestions,
        overallCoherence: rawResult.overallCoherence || 8,
        summary: rawResult.summary || "Analysis complete"
      };

      res.json(result);
    } catch (error) {
      console.error("Restructure analysis error:", error);
      res.status(500).json({
        error: "Failed to analyze structure",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/rewrite", async (req, res) => {
    try {
      const parsed = rewriteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { text, sectionType, originalScore, shortenMode, writingStyle, selectedEmphasisSuggestions, customInstructions, evaluationFeedback } = parsed.data;
      const sectionLabel = sectionLabels[sectionType];
      const criteria = sectionCriteria[sectionType];
      const styleSection = buildStylePrompt(writingStyle);
      
      // Fetch writing examples for few-shot learning in rewrite
      const allExamples = await getWritingExamples();
      const discipline = writingStyle?.preset === "engineering" ? "engineering" 
        : writingStyle?.preset === "natural_sciences" ? "natural_sciences"
        : writingStyle?.preset === "social_sciences" ? "social_sciences"
        : writingStyle?.preset === "management" ? "business_management"
        : writingStyle?.preset === "information_systems" ? "information_systems"
        : undefined;
      const relevantExamples = getRelevantExamples(allExamples, sectionType, discipline);
      const examplesSection = relevantExamples.length > 0 ? `

REFERENCE EXAMPLES - Learn from these high-quality academic writing examples:
${relevantExamples.slice(0, 1).map(ex => `
"${ex.excerpt}"
What makes this excellent: ${ex.annotation || "Clear, specific, well-structured academic writing."}`).join("")}

Aim to achieve this level of clarity, specificity, and structure in your rewrite.` : "";
      
      // Compute readability metrics on original text
      const originalReadability = analyzeReadability(text);
      
      const MAX_RETRIES = 3;

      // Build evaluation-driven improvement instructions
      const lowScoringCriteria = evaluationFeedback?.criteria.filter(c => c.score < 8) || [];
      const evaluationInstructions = evaluationFeedback && lowScoringCriteria.length > 0 ? `
EVALUATION FEEDBACK TO ADDRESS:
The original text was evaluated and received the following feedback. Your rewrite MUST specifically address these issues:

${lowScoringCriteria.map(c => `- ${c.name} (Score: ${c.score}/10): ${c.suggestion}`).join("\n")}

General feedback: ${evaluationFeedback.generalFeedback}

PRIORITY: Focus your rewrite on fixing the lowest-scoring criteria above. Each suggestion contains specific advice - implement it.
` : "";

      // Custom instructions from user
      const customInstructionsSection = customInstructions ? `
USER-PROVIDED CUSTOM INSTRUCTIONS (prioritize these above all else):
${customInstructions}

Apply these instructions when rewriting the text.
` : "";

      // Narrative sections benefit from storytelling
      const narrativeSections = ["abstract", "introduction", "discussion", "conclusion", "conclusion_with_limits", "conclusion_without_limits", "limitations_future_research"];
      const isNarrativeSection = narrativeSections.includes(sectionType);
      const storytellingInstructions = isNarrativeSection ? `
STORYTELLING & READABILITY FOCUS:
- Create a clear narrative arc that guides the reader
- Use accessible language that doesn't sacrifice precision
- Favor clear, direct phrasing over unnecessarily complex language
- Ensure smooth transitions between ideas
- Make the "so what?" clear - why does this matter?
` : "";

      // Build readability improvement instructions based on detected issues
      const readabilityIssues: string[] = [];
      if (originalReadability.passiveVoicePercent > 30) {
        readabilityIssues.push(`- HIGH PASSIVE VOICE (${originalReadability.passiveVoicePercent}%): Convert passive constructions to active voice where possible. Example: "The results were analyzed" → "We analyzed the results"`);
      } else if (originalReadability.passiveVoicePercent > 20) {
        readabilityIssues.push(`- MODERATE PASSIVE VOICE (${originalReadability.passiveVoicePercent}%): Consider converting some passive sentences to active voice for better readability`);
      }
      if (originalReadability.longSentences.length > 0) {
        const exampleSentence = originalReadability.longSentences[0];
        readabilityIssues.push(`- LONG SENTENCES (${originalReadability.longSentences.length} found): Break down sentences over 25 words. Example issue: "${exampleSentence.text}" (${exampleSentence.wordCount} words)`);
      }
      if (originalReadability.avgSentenceLength > 25) {
        readabilityIssues.push(`- HIGH AVERAGE SENTENCE LENGTH (${originalReadability.avgSentenceLength} words): Target 15-20 words average. Split complex sentences without losing meaning.`);
      }
      if (originalReadability.fleschScore < 30) {
        readabilityIssues.push(`- LOW READABILITY SCORE (${originalReadability.fleschScore}): Text is very difficult to read. Simplify vocabulary and sentence structure while maintaining academic rigor.`);
      } else if (originalReadability.fleschScore < 50) {
        readabilityIssues.push(`- MODERATE READABILITY SCORE (${originalReadability.fleschScore}): Text is fairly difficult. Consider simplifying some complex phrases.`);
      }

      // Calculate specific targets based on current values
      const fleschTarget = Math.max(40, Math.min(60, originalReadability.fleschScore + 15));
      const sentenceLengthTarget = Math.min(18, Math.max(15, originalReadability.avgSentenceLength - 5));
      const passiveTarget = Math.min(20, Math.max(10, originalReadability.passiveVoicePercent - 10));

      // Always include readability guidance with current metrics AND explicit targets
      const readabilityInstructions = `
READABILITY ANALYSIS - CURRENT vs TARGET:
┌────────────────────────┬──────────────┬──────────────┐
│ Metric                 │ Current      │ TARGET       │
├────────────────────────┼──────────────┼──────────────┤
│ Flesch Reading Ease    │ ${originalReadability.fleschScore.toString().padEnd(12)} │ ${fleschTarget}+ (aim for 40-60) │
│ Avg Sentence Length    │ ${originalReadability.avgSentenceLength.toFixed(1).padEnd(12)} │ ≤${sentenceLengthTarget} words   │
│ Passive Voice          │ ${originalReadability.passiveVoicePercent}%${' '.repeat(10 - originalReadability.passiveVoicePercent.toString().length)} │ ≤${passiveTarget}%        │
│ Long Sentences (>25w)  │ ${originalReadability.longSentences.length.toString().padEnd(12)} │ 0            │
└────────────────────────┴──────────────┴──────────────┘

YOUR MISSION: Transform the current metrics to meet or exceed the TARGET values.
${readabilityIssues.length > 0 ? `
SPECIFIC ISSUES TO ADDRESS:
${readabilityIssues.join("\n")}` : ""}

HOW TO HIT THESE TARGETS:
- Flesch ${fleschTarget}+: Use simpler words (1-2 syllables), shorter sentences, active voice
- Sentence Length ≤${sentenceLengthTarget}: Break long sentences at natural pause points, split complex ideas
- Passive ≤${passiveTarget}%: Convert "was analyzed by researchers" → "researchers analyzed"
- Long Sentences = 0: Every sentence over 25 words MUST be split or shortened

MAINTAIN while improving readability:
- Scholarly tone and precise terminology
- All technical content and nuance
- Academic rigor (don't oversimplify substance)
- Educated reader audience
`;

      const emphasisInstructions = selectedEmphasisSuggestions && selectedEmphasisSuggestions.length > 0 ? `
EMPHASIS AMPLIFICATION - The user has selected specific points to emphasize:
${selectedEmphasisSuggestions.map((s, i) => `${i + 1}. From quote: "${s.sourceQuote}"
   Emphasis suggestion: ${s.emphasisSuggestion}
   Rationale: ${s.rationale}`).join("\n")}

When rewriting, AMPLIFY these points by:
- Adding framing language that highlights their significance (e.g., "Critically," "Notably," "This finding is particularly important because...")
- Positioning these claims more prominently within paragraphs
- Making explicit WHY these points matter
- BUT NEVER add new data, citations, or claims - only reframe/emphasize what's already there
` : "";

      const shortenInstructions = shortenMode ? `
SHORTEN MODE ACTIVATED - ADDITIONAL PRIORITY:
- SIGNIFICANTLY reduce the word count while preserving ALL key information
- Target: reduce by 20-40% if possible
- Combine sentences, remove filler words, eliminate redundancy aggressively
- Use concise academic phrasing
- Remove unnecessary modifiers and qualifiers
- Every word must earn its place
` : "";

      const systemPrompt = `You are an expert academic writing editor. Your task is to rewrite academic text to improve its quality while following STRICT constraints.
${customInstructionsSection}${evaluationInstructions}${readabilityInstructions}${storytellingInstructions}${examplesSection}${shortenInstructions}${emphasisInstructions}${styleSection}
CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ONLY use information that is EXPLICITLY present in the original text
2. NEVER add new citations, references, or author names that are not in the original
3. NEVER add statistics, numbers, percentages, or data that are not in the original
4. NEVER add claims, findings, or conclusions that are not stated in the original
5. NEVER invent names of theories, frameworks, methods, or concepts not in the original
6. NEVER add dates, years, or timeframes not in the original
7. If you cannot improve the text without adding new information, return the original text unchanged

What you CAN do:
- Restructure sentences for better flow and clarity
- Improve word choice and academic tone
- Fix grammar and punctuation
- Combine or split sentences for readability
- Reorder information for logical flow
- Remove redundant ideas (concepts stated multiple times)
- Vary sentence starters (avoid multiple sentences/paragraphs starting with "The...", "This...", "It...")
- Make implicit connections explicit (if clearly implied)${shortenMode ? "\n- AGGRESSIVELY remove filler and condense" : ""}

SPECIAL FOCUS - Fix these common issues:
1. Repetitive sentence starters: If sentences or paragraphs start with the same word, vary the openings
2. Idea redundancy: If the same concept is stated in multiple places, consolidate or remove duplicates
3. For paragraphs: Ensure one clear main idea with all other sentences supporting it

You must respond with a valid JSON object containing:
1. "thinkingSteps": An array of your analysis steps, each with:
   - "phase": A short label (e.g., "Analyzing Structure", "Identifying Issues", "Improving Clarity", "Enhancing Flow")
   - "summary": A HYPERSPECIFIC description quoting exact phrases. BAD: "Found repetition issues". GOOD: "Found 3 sentences starting with 'The results' in paragraph 2, and 'significant impact' repeated 4 times across paragraphs 1 and 3"
2. "suggestedText": The rewritten version of the text
3. "changes": An array of HYPERSPECIFIC change descriptions. Each must:
   - Quote the EXACT original phrase that was changed
   - Show the EXACT new phrase that replaced it
   - Example: "Changed 'The study shows results that are significant' to 'This analysis demonstrates statistically meaningful findings'"
   - Example: "Varied sentence starters: 'The data... The results... The findings...' became 'The data... Subsequently, results... These findings...'"
   - NEVER use vague descriptions like "improved clarity" or "enhanced flow"
4. "constraintWarning": null if successful, or a string explaining if you couldn't improve without adding new content

Include 3-5 thinking steps that show your analysis process. Before outputting, verify each sentence of your rewrite contains ONLY information from the original. If any new information was added, remove it.`;

      const generateRewrite = async (attemptNumber: number, previousScore?: number) => {
        let userPrompt = `Rewrite this ${sectionLabel} section to improve its quality for academic publication.

ORIGINAL TEXT (this is your ONLY source of information - do not add anything not present here):
---
${text}
---

Optimize for these criteria:
${criteria.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

Remember: You can ONLY restructure, clarify, and improve what's already written. Do NOT add any new citations, data, claims, or information.`;

        if (attemptNumber > 1 && previousScore !== undefined && originalScore !== undefined) {
          userPrompt += `

IMPORTANT: Your previous rewrite attempt scored ${previousScore}/10, which is LOWER than the original score of ${originalScore}/10. 
You MUST produce a better rewrite that scores HIGHER than ${originalScore}. Focus on:
- Improving sentence variety and flow
- Eliminating redundancy
- Strengthening clarity and structure
- Being more conservative with changes if needed`;
        }

        userPrompt += `

Respond with JSON containing:
- "thinkingSteps" (array of {phase, summary})
- "suggestedText" 
- "changes" (array of {original, new} objects, showing exact phrase changes)
- "constraintWarning" (null or warning string)`;

        let content: string | null = null;
        for (let retryAttempt = 1; retryAttempt <= 2; retryAttempt++) {
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-5.2",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
              max_completion_tokens: 4096,
            });
            content = response.choices[0]?.message?.content;
            if (content) break;
          } catch (err) {
            console.log(`Rewrite attempt ${retryAttempt} failed:`, err);
            if (retryAttempt < 2) await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (!content) {
          throw new Error("No response from AI after retries");
        }

        const parsed_response = JSON.parse(content) as {
          thinkingSteps: Array<{ phase: string; summary: string }>;
          suggestedText: string;
          changes: Array<{ original: string; new: string } | string>;
          constraintWarning: string | null;
        };

        const normalizedChanges = (parsed_response.changes || []).map((c) => {
          if (typeof c === 'string') {
            const match = c.match(/['""]([^'"]+)['""].*?['""]([^'"]+)['""]/);
            if (match) {
              return { original: match[1], new: match[2] };
            }
            return { original: c, new: c };
          }
          return c;
        });

        return {
          thinkingSteps: parsed_response.thinkingSteps || [
            { phase: "Analysis", summary: "Analyzed text structure and content" },
            { phase: "Improvement", summary: "Applied writing improvements" },
          ],
          suggestedText: parsed_response.suggestedText || text,
          changes: normalizedChanges,
          constraintWarning: parsed_response.constraintWarning || null,
        };
      }

      let bestResult: {
        thinkingSteps: ThinkingStep[];
        suggestedText: string;
        changes: Array<{ original: string; new: string }>;
        constraintWarning: string | null;
        suggestedScore?: number;
        suggestedCriteria?: Array<{ name: string; score: number }>;
      } | null = null;
      
      let previousScore: number | undefined;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const rewriteResult = await generateRewrite(attempt, previousScore);
        
        let suggestedScore: number | undefined;
        let suggestedCriteria: Array<{ name: string; score: number }> | undefined;
        
        if (rewriteResult.suggestedText && rewriteResult.suggestedText !== text) {
          try {
            const evaluation = await evaluateText(rewriteResult.suggestedText, sectionType);
            suggestedScore = evaluation.overallScore;
            suggestedCriteria = evaluation.criteria.map(c => ({ name: c.name, score: c.score }));
          } catch (evalError) {
            console.error("Failed to evaluate suggested text:", evalError);
          }
        }

        if (suggestedScore !== undefined) {
          if (originalScore === undefined || suggestedScore >= originalScore) {
            bestResult = { ...rewriteResult, suggestedScore, suggestedCriteria };
            break;
          }
          
          if (bestResult === null || suggestedScore > (bestResult.suggestedScore || 0)) {
            bestResult = { ...rewriteResult, suggestedScore, suggestedCriteria };
          }
          
          previousScore = suggestedScore;
          console.log(`Rewrite attempt ${attempt}: score ${suggestedScore} < original ${originalScore}, retrying...`);
        } else {
          console.log(`Rewrite attempt ${attempt}: evaluation failed, continuing to next attempt...`);
        }
      }

      let noImprovementFound = false;
      
      if (!bestResult || bestResult.suggestedScore === undefined) {
        noImprovementFound = true;
        bestResult = {
          thinkingSteps: [
            { phase: "Analysis Complete", summary: "Analyzed text structure and attempted multiple rewrites" },
            { phase: "Quality Check", summary: "Could not verify improvement - keeping your original text" },
          ],
          suggestedText: text,
          changes: [],
          constraintWarning: null,
          suggestedScore: originalScore,
        };
      } else if (originalScore !== undefined && bestResult.suggestedScore < originalScore) {
        noImprovementFound = true;
        bestResult = {
          thinkingSteps: [
            { phase: "Analysis Complete", summary: "Analyzed text structure and evaluated multiple rewrite options" },
            { phase: "Quality Check", summary: `After ${MAX_RETRIES} attempts, no rewrite could improve upon your original score of ${originalScore}` },
          ],
          suggestedText: text,
          changes: [],
          constraintWarning: null,
          suggestedScore: originalScore,
        };
      }

      const diffSegments = computeWordDiff(text, bestResult.suggestedText);
      
      // Compute readability on suggested text for comparison
      const suggestedReadability = bestResult.suggestedText !== text 
        ? analyzeReadability(bestResult.suggestedText) 
        : originalReadability;

      // Build criteria comparison from original evaluation and rewritten evaluation
      let criteriaComparison: Array<{ name: string; originalScore: number; suggestedScore: number; delta: number }> | undefined;
      
      if (evaluationFeedback?.criteria && bestResult.suggestedCriteria && bestResult.suggestedCriteria.length > 0) {
        criteriaComparison = evaluationFeedback.criteria.map(origCrit => {
          const suggestedCrit = bestResult!.suggestedCriteria?.find(s => s.name === origCrit.name);
          const suggestedScore = suggestedCrit?.score ?? origCrit.score;
          return {
            name: origCrit.name,
            originalScore: origCrit.score,
            suggestedScore,
            delta: Math.round((suggestedScore - origCrit.score) * 10) / 10,
          };
        });
      }

      const result: RewriteResult = {
        suggestedText: bestResult.suggestedText,
        changes: bestResult.changes,
        constraintWarning: bestResult.constraintWarning,
        thinkingSteps: bestResult.thinkingSteps,
        diffSegments,
        suggestedScore: bestResult.suggestedScore,
        noImprovementFound,
        originalReadability,
        suggestedReadability,
        criteriaComparison,
      };

      res.json(result);
    } catch (error) {
      console.error("Rewrite error:", error);
      res.status(500).json({
        error: "Failed to rewrite text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/papers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const papers = await db
        .select()
        .from(researchPapers)
        .where(eq(researchPapers.userId, userId))
        .orderBy(desc(researchPapers.updatedAt));
      res.json(papers);
    } catch (error) {
      console.error("Error fetching papers:", error);
      res.status(500).json({ error: "Failed to fetch papers" });
    }
  });

  app.post("/api/papers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPaperSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const [paper] = await db.insert(researchPapers).values(parsed.data).returning();
      res.json(paper);
    } catch (error) {
      console.error("Error creating paper:", error);
      res.status(500).json({ error: "Failed to create paper" });
    }
  });

  app.get("/api/papers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [paper] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, req.params.id), eq(researchPapers.userId, userId)));
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      const sections = await db
        .select()
        .from(paperSections)
        .where(eq(paperSections.paperId, paper.id))
        .orderBy(paperSections.orderIndex);
      res.json({ ...paper, sections });
    } catch (error) {
      console.error("Error fetching paper:", error);
      res.status(500).json({ error: "Failed to fetch paper" });
    }
  });

  app.put("/api/papers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, req.params.id), eq(researchPapers.userId, userId)));
      if (!existing) {
        return res.status(404).json({ error: "Paper not found" });
      }
      const [paper] = await db
        .update(researchPapers)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(researchPapers.id, req.params.id))
        .returning();
      res.json(paper);
    } catch (error) {
      console.error("Error updating paper:", error);
      res.status(500).json({ error: "Failed to update paper" });
    }
  });

  app.delete("/api/papers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, req.params.id), eq(researchPapers.userId, userId)));
      if (!existing) {
        return res.status(404).json({ error: "Paper not found" });
      }
      await db.delete(researchPapers).where(eq(researchPapers.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting paper:", error);
      res.status(500).json({ error: "Failed to delete paper" });
    }
  });

  app.post("/api/papers/:id/sections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [paper] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, req.params.id), eq(researchPapers.userId, userId)));
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      const parsed = insertSectionSchema.safeParse({ ...req.body, paperId: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const [section] = await db.insert(paperSections).values(parsed.data).returning();
      res.json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ error: "Failed to create section" });
    }
  });

  app.get("/api/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit) || 50;
      const history = await db
        .select()
        .from(evaluationHistory)
        .where(eq(evaluationHistory.userId, userId))
        .orderBy(desc(evaluationHistory.createdAt))
        .limit(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/history/evaluation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sectionType, originalText, overallScore, criteriaScores, generalFeedback, paperId, sectionId, keyPoints } = req.body;
      
      const [record] = await db.insert(evaluationHistory).values({
        userId,
        paperId: paperId || null,
        sectionId: sectionId || null,
        sectionType,
        originalText,
        overallScore,
        criteriaScores,
        generalFeedback,
        keyPoints: keyPoints || null,
      }).returning();
      
      res.json(record);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });

  app.post("/api/history/rewrite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { evaluationId, originalText, suggestedText, originalScore, suggestedScore, changes, accepted } = req.body;
      
      const [evaluation] = await db
        .select()
        .from(evaluationHistory)
        .where(and(eq(evaluationHistory.id, evaluationId), eq(evaluationHistory.userId, userId)));
      
      if (!evaluation) {
        return res.status(404).json({ error: "Evaluation not found" });
      }
      
      const [record] = await db.insert(rewriteHistory).values({
        evaluationId,
        originalText,
        suggestedText,
        originalScore,
        suggestedScore,
        changes,
        accepted: accepted ? 1 : 0,
      }).returning();
      
      res.json(record);
    } catch (error) {
      console.error("Error saving rewrite:", error);
      res.status(500).json({ error: "Failed to save rewrite" });
    }
  });

  app.get("/api/history/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [record] = await db
        .select()
        .from(evaluationHistory)
        .where(and(eq(evaluationHistory.id, req.params.id), eq(evaluationHistory.userId, userId)));
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      const rewrites = await db
        .select()
        .from(rewriteHistory)
        .where(eq(rewriteHistory.evaluationId, record.id))
        .orderBy(desc(rewriteHistory.createdAt));
      res.json({ ...record, rewrites });
    } catch (error) {
      console.error("Error fetching history record:", error);
      res.status(500).json({ error: "Failed to fetch record" });
    }
  });

  app.get("/api/publications/:id/map", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paperId = req.params.id;
      
      const [paper] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, paperId), eq(researchPapers.userId, userId)));
      
      if (!paper) {
        return res.status(404).json({ error: "Publication not found" });
      }
      
      const evaluations = await db
        .select()
        .from(evaluationHistory)
        .where(and(eq(evaluationHistory.paperId, paperId), eq(evaluationHistory.userId, userId)))
        .orderBy(desc(evaluationHistory.createdAt));
      
      interface KeyPointData {
        id: string;
        statement: string;
        sourceQuote: string;
        pointType: string;
      }
      
      const sectionMap = new Map<string, { 
        scores: number[]; 
        count: number; 
        lastUpdated: Date | null;
        keyPoints: KeyPointData[];
      }>();
      
      for (const e of evaluations) {
        const existing = sectionMap.get(e.sectionType) || { scores: [], count: 0, lastUpdated: null, keyPoints: [] };
        existing.scores.push(e.overallScore);
        existing.count++;
        
        // Use keyPoints from the most recent evaluation (first one since ordered by desc)
        if (existing.keyPoints.length === 0 && e.keyPoints && Array.isArray(e.keyPoints)) {
          existing.keyPoints = e.keyPoints as KeyPointData[];
        }
        
        if (!existing.lastUpdated || (e.createdAt && e.createdAt > existing.lastUpdated)) {
          existing.lastUpdated = e.createdAt;
        }
        sectionMap.set(e.sectionType, existing);
      }
      
      const sections = Array.from(sectionMap.entries()).map(([sectionType, data]) => ({
        id: sectionType,
        sectionType,
        label: sectionLabels[sectionType as SectionType] || sectionType,
        score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        count: data.count,
        lastUpdated: data.lastUpdated?.toISOString() || new Date().toISOString(),
        keyPoints: data.keyPoints,
      }));
      
      const totalScore = evaluations.reduce((sum, e) => sum + e.overallScore, 0);
      const avgScore = evaluations.length > 0 ? totalScore / evaluations.length : 0;
      
      res.json({
        publication: paper,
        sections,
        totalEvaluations: evaluations.length,
        avgScore,
      });
    } catch (error) {
      console.error("Error fetching publication map:", error);
      res.status(500).json({ error: "Failed to fetch publication map" });
    }
  });

  app.post("/api/publications/:id/coherence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paperId = req.params.id;
      
      const [paper] = await db
        .select()
        .from(researchPapers)
        .where(and(eq(researchPapers.id, paperId), eq(researchPapers.userId, userId)));
      
      if (!paper) {
        return res.status(404).json({ error: "Publication not found" });
      }
      
      const evaluations = await db
        .select()
        .from(evaluationHistory)
        .where(and(eq(evaluationHistory.paperId, paperId), eq(evaluationHistory.userId, userId)))
        .orderBy(desc(evaluationHistory.createdAt));
      
      if (evaluations.length < 2) {
        return res.status(400).json({ error: "Need at least 2 sections to analyze coherence" });
      }
      
      const sectionTexts = new Map<string, { text: string; feedback: string; score: number }>();
      for (const e of evaluations) {
        if (!sectionTexts.has(e.sectionType)) {
          sectionTexts.set(e.sectionType, {
            text: e.originalText,
            feedback: e.generalFeedback,
            score: e.overallScore,
          });
        }
      }
      
      const sectionsForAnalysis = Array.from(sectionTexts.entries())
        .map(([type, data]) => `### ${sectionLabels[type as SectionType] || type} (Score: ${data.score.toFixed(1)}/10)\n${data.text.substring(0, 800)}${data.text.length > 800 ? '...' : ''}`)
        .join('\n\n');
      
      const systemPrompt = `You are an expert academic writing reviewer analyzing the COHERENCE between different sections of a research paper. Your task is to evaluate how well the sections work together as a unified whole.

Analyze:
1. Logical flow between sections - do ideas build naturally?
2. Consistency of terminology, concepts, and claims
3. Alignment of research question (intro) with methodology, results, and conclusions
4. Whether the paper tells a coherent story
5. Gaps or disconnects between sections

You must respond with a valid JSON object containing:
1. "overallScore": A score from 1-10 for overall coherence
2. "summary": A 2-3 sentence summary of the paper's coherence (plain language)
3. "strengths": An array of 2-3 specific coherence strengths
4. "improvements": An array of 2-3 specific areas to improve coherence
5. "insights": An array of section-pair analyses, each with:
   - "fromSection": The source section type
   - "toSection": The target section type  
   - "score": Coherence score for this transition (1-10)
   - "feedback": Brief feedback on how well these sections connect

Focus on actionable insights. Be constructive and specific.`;

      const userPrompt = `Analyze the coherence between these sections from "${paper.title}":

${sectionsForAnalysis}

Provide a coherence analysis in JSON format.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(content);
      res.json({
        overallScore: result.overallScore || 5,
        summary: result.summary || "Analysis complete.",
        insights: result.insights || [],
        strengths: result.strengths || [],
        improvements: result.improvements || [],
      });
    } catch (error) {
      console.error("Error analyzing coherence:", error);
      res.status(500).json({ error: "Failed to analyze coherence" });
    }
  });

  return httpServer;
}
