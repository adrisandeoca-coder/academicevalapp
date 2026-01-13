import { analyzeReadability } from "./readability";

// Test cases with known Flesch scores from literature
const testCases = [
  {
    name: "Simple conversational text",
    text: "The cat sat on the mat. It was a nice day. The sun was out. Birds were singing. Life was good.",
    expectedRange: [80, 100], // Very short, simple sentences = very high score
  },
  {
    name: "Standard academic abstract",
    text: "This study examines the relationship between organizational culture and employee performance. We collected data from 500 participants across 12 companies. Results indicate a significant positive correlation between collaborative culture and job satisfaction. The findings suggest that managers should prioritize team building activities.",
    expectedRange: [0, 30], // Academic vocabulary with multi-syllable words = low score is normal
  },
  {
    name: "Dense theoretical text",
    text: "The epistemological implications of poststructuralist theory necessitate a reconceptualization of traditional methodological frameworks. Deconstructive analysis reveals the inherent instability of signification, problematizing essentialist assumptions underlying conventional research paradigms. Contemporary scholarship must therefore embrace methodological pluralism to adequately address the complexities of social phenomena.",
    expectedRange: [0, 15], // Extremely dense theoretical jargon
  },
  {
    name: "Text with abbreviations",
    text: "According to Dr. Smith, the experiment was successful. The results, i.e., the measured values, were within acceptable ranges. Prof. Jones et al. confirmed similar findings in their 2023 study. Fig. 1 shows the methodology used.",
    expectedRange: [40, 70], // Mixed vocabulary, shorter sentences
  },
  {
    name: "Text with numbers and data",
    text: "The temperature was 98.6 degrees. The sample size was 2,500 participants. We observed a p-value of 0.05 in our statistical analysis. The correlation coefficient was r = 0.78.",
    expectedRange: [30, 60], // Technical vocabulary with numbers
  },
  {
    name: "Single very long sentence",
    text: "Despite the numerous challenges that researchers face when attempting to conduct longitudinal studies in organizational settings, including issues related to participant attrition, measurement consistency over time, and the difficulties inherent in controlling for confounding variables that may emerge during extended data collection periods, the benefits of such approaches in terms of establishing causal relationships and understanding developmental trajectories are widely recognized in the methodological literature.",
    expectedRange: [0, 15], // One extremely long sentence = very difficult
  },
  {
    name: "Quoted workplace content",
    text: 'The study found that "employee engagement directly impacts productivity." Participants reported feeling "more motivated when given autonomy." One manager stated, "We saw immediate improvements after the training program."',
    expectedRange: [0, 40], // Academic framing with multi-syllable words
  },
];

console.log("=== Flesch Score Calculation Audit ===\n");

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = analyzeReadability(test.text);
  const inRange = result.fleschScore >= test.expectedRange[0] && result.fleschScore <= test.expectedRange[1];
  
  const status = inRange ? "✓ PASS" : "✗ FAIL";
  if (inRange) passed++; else failed++;
  
  console.log(`${status}: ${test.name}`);
  console.log(`  Flesch Score: ${result.fleschScore} (expected: ${test.expectedRange[0]}-${test.expectedRange[1]})`);
  console.log(`  Grade: ${result.fleschGrade}`);
  console.log(`  Avg Sentence Length: ${result.avgSentenceLength} words`);
  console.log(`  Avg Syllables/Word: ${result.avgWordLength}`);
  console.log(`  Total: ${result.totalWords} words, ${result.totalSentences} sentences`);
  if (result.longSentences.length > 0) {
    console.log(`  Long sentences: ${result.longSentences.length}`);
  }
  console.log("");
}

console.log("=== Summary ===");
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

// Additional diagnostic: Show formula components
console.log("\n=== Formula Diagnostics ===");
const sampleText = "This study examines the relationship between organizational culture and employee performance. We collected data from 500 participants across 12 companies.";
const sample = analyzeReadability(sampleText);
console.log(`Sample text: "${sampleText.substring(0, 50)}..."`);
console.log(`Words: ${sample.totalWords}, Sentences: ${sample.totalSentences}`);
console.log(`ASL (words/sentence): ${sample.avgSentenceLength}`);
console.log(`ASW (syllables/word): ${sample.avgWordLength}`);
console.log(`Flesch = 206.835 - (1.015 * ${sample.avgSentenceLength}) - (84.6 * ${sample.avgWordLength})`);
const computed = 206.835 - (1.015 * sample.avgSentenceLength) - (84.6 * sample.avgWordLength);
console.log(`Computed: ${computed.toFixed(1)}, Reported: ${sample.fleschScore}`);
