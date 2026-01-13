import { db } from "./db";
import { writingExamples } from "@shared/models/research";

const examples = [
  // ENGINEERING - Abstract examples
  {
    discipline: "engineering",
    sectionType: "abstract",
    title: "High-quality engineering abstract",
    excerpt: `This study develops a novel machine learning framework for predicting structural fatigue in composite materials. We analyzed 2,847 specimens under cyclic loading conditions across five temperature ranges. The framework combines convolutional neural networks with physics-based damage models, achieving 94.3% prediction accuracy—a 12% improvement over existing methods. Our approach reduces testing time by 60% while maintaining reliability standards. These findings enable faster certification of aerospace components and reduce development costs by an estimated $2.3M per aircraft program.`,
    annotation: "Strong engineering abstract: states the problem, method, key metrics (2,847 specimens, 94.3% accuracy), comparative improvement (12%), and concrete practical impact ($2.3M savings). Uses active voice and short sentences.",
    qualityScore: 9.2,
    sourceJournal: "Composites Part B: Engineering",
  },
  {
    discipline: "engineering",
    sectionType: "introduction",
    title: "High-quality engineering introduction",
    excerpt: `Autonomous vehicles must detect pedestrians within 50 milliseconds to enable safe braking. Current LiDAR systems achieve this speed but fail in adverse weather—rain reduces detection accuracy by up to 40%. This limitation has stalled autonomous vehicle deployment in regions with frequent precipitation. We present a multi-sensor fusion approach that maintains 95% accuracy across weather conditions. Our system combines radar persistence with camera context, processing data in 23 milliseconds. This advancement addresses a critical barrier to widespread autonomous vehicle adoption.`,
    annotation: "Excellent introduction: opens with specific requirement (50ms), identifies clear problem (40% accuracy loss), states the gap (deployment stalled), presents solution with specific metrics (95%, 23ms), and closes with significance.",
    qualityScore: 9.0,
    sourceJournal: "IEEE Transactions on Intelligent Transportation Systems",
  },
  // MEDICINE - Abstract examples
  {
    discipline: "medicine",
    sectionType: "abstract",
    title: "High-quality medical abstract",
    excerpt: `Background: Sepsis causes 11 million deaths annually. Early detection remains challenging. Methods: We conducted a multicenter randomized trial across 14 hospitals (n=3,241 patients) comparing our AI-based early warning system against standard clinical protocols. Results: The AI system detected sepsis 4.2 hours earlier than conventional methods (p<0.001). Mortality decreased from 23.4% to 17.8% (absolute reduction 5.6%, NNT=18). No adverse events occurred. Conclusions: AI-based sepsis detection significantly reduces mortality. Implementation should be prioritized in intensive care settings.`,
    annotation: "Exemplary medical abstract: structured format, specific numbers (11M deaths, 3,241 patients, 4.2 hours earlier), statistical significance (p<0.001), clinically meaningful metrics (NNT=18), and clear recommendation.",
    qualityScore: 9.4,
    sourceJournal: "The Lancet Digital Health",
  },
  {
    discipline: "medicine",
    sectionType: "conclusion",
    title: "High-quality medical conclusion",
    excerpt: `This trial demonstrates that cognitive behavioral therapy combined with exercise reduces depression severity more effectively than either intervention alone. The 34% greater improvement in PHQ-9 scores translates to clinically meaningful quality of life gains. Importantly, benefits persisted at 12-month follow-up, suggesting durable treatment effects. Clinicians should consider combined protocols for moderate-to-severe depression. Future research should examine optimal exercise intensity and whether telehealth delivery maintains efficacy.`,
    annotation: "Strong conclusion: summarizes key finding, translates to clinical meaning, addresses durability, provides actionable recommendation, and suggests specific future directions.",
    qualityScore: 9.0,
    sourceJournal: "JAMA Psychiatry",
  },
  // SOCIAL SCIENCES - Examples
  {
    discipline: "social_sciences",
    sectionType: "abstract",
    title: "High-quality social sciences abstract",
    excerpt: `Income inequality affects children's educational outcomes, yet mechanisms remain unclear. Using longitudinal data from the National Child Development Study (n=12,537), we examined how neighborhood income composition influences academic achievement across childhood. Results reveal that neighborhood income diversity—not absolute poverty—predicts achievement gaps. Children in economically homogeneous neighborhoods (whether wealthy or poor) score 0.4 standard deviations lower on reading assessments than peers in mixed-income areas. This relationship persists after controlling for family income, parental education, and school quality. Policies promoting mixed-income housing may reduce educational inequality more effectively than income transfers alone.`,
    annotation: "Excellent social science abstract: positions within debate, specifies data source and sample size, presents counterintuitive finding, quantifies effect (0.4 SD), addresses confounds, and offers policy implication.",
    qualityScore: 9.1,
    sourceJournal: "American Sociological Review",
  },
  {
    discipline: "social_sciences",
    sectionType: "methodology",
    title: "High-quality social sciences methodology",
    excerpt: `We employed a mixed-methods sequential design. First, we analyzed survey responses from 2,341 participants recruited through stratified random sampling across six metropolitan areas. The survey measured perceived discrimination using the validated 12-item Everyday Discrimination Scale (α=0.89). Second, we conducted semi-structured interviews with 45 purposively selected participants representing extreme cases. Interviews lasted 60-90 minutes and were recorded, transcribed, and coded using thematic analysis. Two researchers coded independently; inter-rater reliability reached κ=0.84. This design allowed us to quantify patterns while exploring the lived experience behind the numbers.`,
    annotation: "Strong methodology: clear design rationale, specific sampling, validated instruments with reliability coefficients, interview details, and inter-rater reliability. Justifies mixed-methods approach.",
    qualityScore: 9.0,
    sourceJournal: "Social Science Research",
  },
  // BUSINESS & MANAGEMENT - Examples
  {
    discipline: "business_management",
    sectionType: "abstract",
    title: "High-quality management abstract",
    excerpt: `How do firms maintain innovation while exploiting existing capabilities? This paradox challenges established organizations. Drawing on 847 firms across 12 industries over a 10-year period, we find that structural ambidexterity—separating exploration and exploitation into distinct units—outperforms contextual ambidexterity when environmental dynamism is high. However, the relationship reverses in stable environments. Our findings reconcile conflicting prior results by introducing environmental dynamism as a boundary condition. Managers should align their ambidexterity approach with industry volatility rather than adopting one-size-fits-all solutions.`,
    annotation: "Excellent management abstract: opens with compelling paradox, specifies sample (847 firms, 12 industries, 10 years), presents nuanced finding with boundary condition, reconciles prior research, and offers actionable managerial insight.",
    qualityScore: 9.2,
    sourceJournal: "Academy of Management Journal",
  },
  {
    discipline: "business_management",
    sectionType: "discussion",
    title: "High-quality management discussion",
    excerpt: `Our finding that psychological safety mediates the relationship between leader humility and team innovation extends Edmondson's (1999) work in three ways. First, we identify leader humility as a previously overlooked antecedent. Second, we demonstrate this mechanism operates across cultures—contrary to the assumption that Asian teams would respond differently. Third, the effect strengthens in high-pressure contexts, suggesting psychological safety matters most when stakes are highest. One unexpected finding warrants attention: the relationship weakened in teams with more than 12 members, possibly because intimacy required for psychological safety becomes difficult at scale.`,
    annotation: "Strong discussion: explicitly extends prior work with numbered contributions, addresses cultural boundary, notes unexpected finding with tentative explanation, and avoids overclaiming.",
    qualityScore: 9.1,
    sourceJournal: "Strategic Management Journal",
  },
  // INFORMATION SYSTEMS - Examples
  {
    discipline: "information_systems",
    sectionType: "abstract",
    title: "High-quality IS abstract",
    excerpt: `Enterprise systems often fail to deliver expected benefits. We propose that implementation success depends on the fit between system capabilities and organizational learning style. Analyzing 156 ERP implementations across manufacturing firms, we find that firms with exploitative learning orientations achieve 23% higher ROI from structured systems, while exploratory firms benefit more from flexible platforms. This capability-learning fit explains 34% of variance in implementation success—more than technical factors alone. Our findings challenge the "one best way" approach to enterprise system selection and suggest that alignment with organizational learning should guide technology choices.`,
    annotation: "Excellent IS abstract: identifies practical problem, proposes theoretical mechanism (capability-learning fit), quantifies findings (23% ROI, 34% variance), and challenges prevailing assumption with practical guidance.",
    qualityScore: 9.0,
    sourceJournal: "MIS Quarterly",
  },
  // NATURAL SCIENCES - Examples
  {
    discipline: "natural_sciences",
    sectionType: "abstract",
    title: "High-quality natural sciences abstract",
    excerpt: `The origin of water on Earth remains debated. We report hydrogen isotope measurements from 42 carbonaceous chondrite samples using secondary ion mass spectrometry. Our data show that the D/H ratio of the solar nebula (δD = -865‰) is significantly lower than previously assumed. This finding implies that terrestrial water could not have been delivered entirely by comets, as their D/H ratios exceed Earth's oceans. Instead, our results support a model where 70-80% of Earth's water originated from asteroid parent bodies. This resolves a longstanding discrepancy between dynamical models and isotopic evidence.`,
    annotation: "Excellent natural science abstract: concise, specific measurements (42 samples, δD = -865‰), clear method (SIMS), quantified conclusion (70-80%), and states the scientific significance.",
    qualityScore: 9.3,
    sourceJournal: "Science",
  },
  // HUMANITIES - Examples
  {
    discipline: "humanities",
    sectionType: "introduction",
    title: "High-quality humanities introduction",
    excerpt: `Virginia Woolf's Mrs Dalloway has been read as a critique of empire, a study of trauma, and an experiment in consciousness. Less attention has been paid to its engagement with urban infrastructure. This essay argues that Woolf uses London's sewage system as a structuring metaphor for the novel's treatment of memory and repression. The underground pipes that carry waste mirror the psychological channels through which characters process—and fail to process—traumatic experience. By attending to this material dimension, we gain new insight into Woolf's modernist aesthetics and its relationship to municipal modernity.`,
    annotation: "Strong humanities introduction: positions within existing scholarship, identifies gap, presents clear thesis (sewage as metaphor), signals method (material reading), and claims significance (new insight into aesthetics).",
    qualityScore: 8.9,
    sourceJournal: "PMLA",
  },
  // LIMITATIONS & FUTURE RESEARCH examples
  {
    discipline: "social_sciences",
    sectionType: "limitations_future_research",
    title: "High-quality limitations section",
    excerpt: `Several limitations merit consideration. First, our cross-sectional design cannot establish causality. While theory suggests discrimination leads to disengagement, reverse causality remains possible—disengaged employees may perceive more discrimination. Longitudinal studies could address this. Second, our sample overrepresents large organizations; small firm dynamics may differ. Third, we relied on self-reported discrimination, which captures perception rather than objective events. Future research might combine self-reports with audit studies. Despite these constraints, our large sample and validated measures provide a foundation for future work addressing these gaps.`,
    annotation: "Excellent limitations: specific, not generic (names the design issue, sample bias, measurement concern), offers concrete solutions (longitudinal, audit studies), maintains confidence without dismissiveness.",
    qualityScore: 9.0,
    sourceJournal: "Academy of Management Journal",
  },
  {
    discipline: "engineering",
    sectionType: "limitations_future_research",
    title: "High-quality engineering limitations",
    excerpt: `Three limitations constrain generalization. First, we tested only aluminum alloys; behavior in titanium or composite materials may differ. Second, experiments used constant-amplitude loading, while real-world fatigue involves variable loads. Third, our model assumes crack initiation occurs at surface defects, which held for our specimens but may not apply to internal porosity from additive manufacturing. Future work should extend testing to aerospace-grade titanium alloys under spectrum loading, and incorporate X-ray computed tomography to characterize internal defects before testing.`,
    annotation: "Strong technical limitations: specific to the study (aluminum only, constant loading, surface defects), explains why each matters, and proposes concrete next steps with specific methods (spectrum loading, CT scanning).",
    qualityScore: 9.1,
    sourceJournal: "International Journal of Fatigue",
  },
];

async function seedExamples() {
  console.log("Seeding writing examples...");
  
  for (const example of examples) {
    try {
      await db.insert(writingExamples).values(example);
      console.log(`✓ Added: ${example.discipline} - ${example.sectionType}`);
    } catch (error: any) {
      if (error.code === "23505") {
        console.log(`- Skipped (already exists): ${example.discipline} - ${example.sectionType}`);
      } else {
        console.error(`✗ Failed: ${example.discipline} - ${example.sectionType}`, error.message);
      }
    }
  }
  
  console.log("Seeding complete!");
}

seedExamples()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
