import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, AlertCircle, FileText, Brain, Check, Lightbulb, Quote, ArrowRight, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { CriterionCard } from "./criterion-card";
import { ReadabilityMetricsPanel } from "./readability-metrics";
import { type EvaluationResult, type SectionType, type SupportArgument, sectionLabels, sectionCriteria } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const evaluationSteps = [
  { phase: "Reading", summary: "Parsing your academic text..." },
  { phase: "Analyzing", summary: "Examining structure against criteria..." },
  { phase: "Scoring", summary: "Calculating weighted scores..." },
  { phase: "Generating", summary: "Creating improvement suggestions..." },
];

interface ResultsPanelProps {
  result: EvaluationResult | null;
  isLoading: boolean;
  error: string | null;
  sectionType: SectionType;
  selectedArguments?: string[];
  onArgumentToggle?: (argumentId: string, selected: boolean) => void;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 9) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 7) return { label: "Good", color: "text-blue-600 dark:text-blue-400" };
  if (score >= 5) return { label: "Average", color: "text-amber-600 dark:text-amber-400" };
  if (score >= 3) return { label: "Below Average", color: "text-orange-600 dark:text-orange-400" };
  return { label: "Needs Work", color: "text-red-600 dark:text-red-400" };
}

function getScoreRingColor(score: number): string {
  if (score >= 9) return "stroke-emerald-500";
  if (score >= 7) return "stroke-blue-500";
  if (score >= 5) return "stroke-amber-500";
  if (score >= 3) return "stroke-orange-500";
  return "stroke-red-500";
}

export function ResultsPanel({ result, isLoading, error, sectionType, selectedArguments = [], onArgumentToggle }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < evaluationSteps.length - 1) return prev + 1;
          return prev;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleCopy = async () => {
    if (!result) return;

    const text = `Academic Writing Evaluation - ${sectionLabels[result.sectionType]}
Overall Score: ${result.overallScore.toFixed(1)}/10

Criteria Breakdown:
${result.criteria.map((c) => `- ${c.name} (${c.weight}%): ${c.score}/10\n  ${c.suggestion}`).join("\n\n")}

General Feedback:
${result.generalFeedback}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Evaluation results have been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Evaluation Failed</h3>
          <p className="text-muted-foreground max-w-md">
            {error || "Something went wrong. Please try again."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
            AI is evaluating...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {evaluationSteps.map((step, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                  index === currentStep
                    ? "bg-primary/10 border border-primary/20"
                    : index < currentStep
                    ? "bg-muted/50 opacity-60"
                    : "opacity-30"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-muted-foreground/30 text-muted-foreground"
                      : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{step.phase}</p>
                  <p className="text-xs text-muted-foreground">{step.summary}</p>
                </div>
                {index === currentStep && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    const criteria = sectionCriteria[sectionType];
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold mb-3">
            Ready to Evaluate Your {sectionLabels[sectionType]}
          </h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Paste your text and click "Evaluate" to receive AI-powered feedback
            against {criteria.length} academic writing criteria.
          </p>
          <div className="w-full max-w-sm space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Evaluation Criteria Preview
            </p>
            {criteria.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
              >
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.weight}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { label: scoreLabel, color: scoreLabelColor } = getScoreLabel(result.overallScore);
  const scorePercentage = (result.overallScore / 10) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Evaluation Results
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-testid="button-copy-results"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Results
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-lg bg-muted/30">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/50"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={getScoreRingColor(result.overallScore)}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: "stroke-dashoffset 0.5s ease-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{result.overallScore.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Overall Score
            </p>
            <p className={`text-2xl font-semibold ${scoreLabelColor}`}>{scoreLabel}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {sectionLabels[result.sectionType]}
            </p>
          </div>
        </div>

        {result.readabilityMetrics && (
          <ReadabilityMetricsPanel metrics={result.readabilityMetrics} />
        )}

        <div>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Criteria Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.criteria.map((criterion) => (
              <CriterionCard key={criterion.name} criterion={criterion} />
            ))}
          </div>
        </div>

        {result.generalFeedback && (
          <div className="p-6 rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              General Feedback
            </h4>
            <p className="font-serif text-base leading-relaxed text-foreground/90">
              {result.generalFeedback}
            </p>
          </div>
        )}

        {result.supportArguments && result.supportArguments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Emphasis Suggestions
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Select suggestions below to amplify key points in your text. These are derived from your existing content - no new claims will be added.
            </p>
            <div className="space-y-3">
              {result.supportArguments.map((arg) => {
                const isSelected = selectedArguments.includes(arg.id);
                return (
                  <div
                    key={arg.id}
                    data-testid={`argument-card-${arg.id}`}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => onArgumentToggle?.(arg.id, !isSelected)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`arg-${arg.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => onArgumentToggle?.(arg.id, !!checked)}
                        data-testid={`checkbox-argument-${arg.id}`}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            <Quote className="w-3 h-3 mr-1" />
                            Your Claim
                          </Badge>
                          <p className="text-sm text-muted-foreground italic pl-1">
                            "{arg.sourceQuote}"
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs font-normal">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Emphasis Angle
                          </Badge>
                          <p className="text-sm font-medium text-foreground pl-1">
                            {arg.emphasisSuggestion}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Why This Works
                          </Badge>
                          <p className="text-xs text-muted-foreground pl-1">
                            {arg.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedArguments.length > 0 && (
              <p className="text-sm text-primary font-medium">
                {selectedArguments.length} suggestion{selectedArguments.length > 1 ? 's' : ''} selected - these will be included in your rewrite
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
