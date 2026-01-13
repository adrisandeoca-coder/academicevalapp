import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Sparkles, ArrowRight, Brain, Copy, CheckCheck, RefreshCw, Lightbulb, Shuffle, Target, FileText, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type RewriteResult, type DiffSegment, type ReadabilityMetrics, type CriteriaScoreComparison } from "@shared/schema";

interface SuggestionPanelProps {
  originalText: string;
  rewriteResult: RewriteResult | null;
  isLoading: boolean;
  error: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
  hasEvaluationResult: boolean;
  originalScore?: number;
}

const loadingSteps = [
  { phase: "Reading", summary: "Analyzing your text structure and content..." },
  { phase: "Evaluating", summary: "Identifying areas for improvement..." },
  { phase: "Planning", summary: "Determining best restructuring approach..." },
  { phase: "Rewriting", summary: "Crafting improved version..." },
  { phase: "Verifying", summary: "Ensuring no new content was added..." },
];

function getPlainLanguageLabel(phase: string): { label: string; icon: typeof Lightbulb; color: string } {
  const phaseMap: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
    "Analyzing Structure": { label: "Reorganized for better flow", icon: Shuffle, color: "text-blue-600 dark:text-blue-400" },
    "Identifying Emphasis Points": { label: "Highlighted key points", icon: Target, color: "text-amber-600 dark:text-amber-400" },
    "Strengthening Problem Framing": { label: "Made the problem clearer", icon: Lightbulb, color: "text-purple-600 dark:text-purple-400" },
    "Clarifying Contribution and Findings": { label: "Clarified your findings", icon: FileText, color: "text-emerald-600 dark:text-emerald-400" },
    "Amplifying Importance": { label: "Emphasized significance", icon: Megaphone, color: "text-rose-600 dark:text-rose-400" },
  };
  
  for (const [key, value] of Object.entries(phaseMap)) {
    if (phase.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(phase.toLowerCase())) {
      return value;
    }
  }
  
  if (phase.toLowerCase().includes("structure") || phase.toLowerCase().includes("reorganiz")) {
    return phaseMap["Analyzing Structure"];
  }
  if (phase.toLowerCase().includes("emphasis") || phase.toLowerCase().includes("highlight")) {
    return phaseMap["Identifying Emphasis Points"];
  }
  if (phase.toLowerCase().includes("problem") || phase.toLowerCase().includes("framing")) {
    return phaseMap["Strengthening Problem Framing"];
  }
  if (phase.toLowerCase().includes("finding") || phase.toLowerCase().includes("contribut") || phase.toLowerCase().includes("clarif")) {
    return phaseMap["Clarifying Contribution and Findings"];
  }
  if (phase.toLowerCase().includes("amplif") || phase.toLowerCase().includes("importan")) {
    return phaseMap["Amplifying Importance"];
  }
  
  return { label: "Improved your text", icon: Sparkles, color: "text-primary" };
}

interface ReadabilityMetricRowProps {
  label: string;
  value: number;
  originalValue: number;
  target: string;
  unit?: string;
  lowerIsBetter?: boolean;
  isGood: (val: number) => boolean;
}

function ReadabilityMetricRow({ label, value, originalValue, target, unit = "", lowerIsBetter = false, isGood }: ReadabilityMetricRowProps) {
  const delta = value - originalValue;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const gotWorse = lowerIsBetter ? delta > 0 : delta < 0;
  const unchanged = Math.abs(delta) < 0.5;
  const meetsTarget = isGood(value);
  
  const formatVal = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);
  
  // Format delta with proper sign: show arrow direction based on improvement
  const formatDelta = () => {
    const absDelta = Math.abs(delta).toFixed(1);
    if (improved) {
      return `+${absDelta}`;  // Positive = improvement
    } else {
      return `-${absDelta}`;  // Negative = got worse
    }
  };
  
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-foreground whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold tabular-nums ${meetsTarget ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
            {formatVal(value)}{unit}
          </span>
          {!unchanged && (
            <span className={`text-xs tabular-nums ${gotWorse ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              ({formatDelta()})
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          target: {target}
        </span>
        {gotWorse && !unchanged ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-700 dark:text-red-400">
            WORSE
          </Badge>
        ) : meetsTarget ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : null}
      </div>
    </div>
  );
}

function ReadabilityComparison({ original, suggested }: { original: ReadabilityMetrics; suggested: ReadabilityMetrics }) {
  const fleschWorse = suggested.fleschScore < original.fleschScore;
  const passiveWorse = suggested.passiveVoicePercent > original.passiveVoicePercent && suggested.passiveVoicePercent > 25;
  const sentenceLengthWorse = suggested.avgSentenceLength > original.avgSentenceLength && suggested.avgSentenceLength > 20;
  const longSentencesWorse = suggested.longSentences.length > original.longSentences.length;
  
  const problemCount = [fleschWorse, passiveWorse, sentenceLengthWorse, longSentencesWorse].filter(Boolean).length;
  
  return (
    <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-500" />
          Readability After Rewrite
        </h4>
        {problemCount > 0 && (
          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {problemCount} issue{problemCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      
      {problemCount > 0 && (
        <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Some readability metrics got worse. Review the suggested text carefully.
          </p>
        </div>
      )}
      
      <div className="space-y-1 divide-y divide-border/50">
        <ReadabilityMetricRow
          label="Flesch Score"
          value={suggested.fleschScore}
          originalValue={original.fleschScore}
          target="30-50"
          lowerIsBetter={false}
          isGood={(v) => v >= 20}
        />
        <ReadabilityMetricRow
          label="Avg Sentence Length"
          value={suggested.avgSentenceLength}
          originalValue={original.avgSentenceLength}
          target="≤20"
          unit=" words"
          lowerIsBetter={true}
          isGood={(v) => v <= 20}
        />
        <ReadabilityMetricRow
          label="Passive Voice"
          value={suggested.passiveVoicePercent}
          originalValue={original.passiveVoicePercent}
          target="<25%"
          unit="%"
          lowerIsBetter={true}
          isGood={(v) => v < 25}
        />
        <ReadabilityMetricRow
          label="Long Sentences"
          value={suggested.longSentences.length}
          originalValue={original.longSentences.length}
          target="0"
          lowerIsBetter={true}
          isGood={(v) => v === 0}
        />
      </div>
      
      <div className="pt-2 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground">
          was: {original.fleschScore.toFixed(1)} Flesch, {original.passiveVoicePercent}% passive, {original.avgSentenceLength.toFixed(1)} avg words/sentence
        </p>
      </div>
    </div>
  );
}

function CriteriaComparison({ comparison }: { comparison: CriteriaScoreComparison[] }) {
  const needsWork = comparison.filter(c => c.suggestedScore < 7);
  const excellent = comparison.filter(c => c.suggestedScore >= 8);
  
  return (
    <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-500" />
          Criteria Scores
        </h4>
        {excellent.length > 0 && (
          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {excellent.length} excellent
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        {comparison.map((crit) => {
          const isExcellent = crit.suggestedScore >= 8;
          const needsImprovement = crit.suggestedScore < 7;
          const improved = crit.delta > 0;
          
          return (
            <div key={crit.name} className="flex items-center gap-3 py-1">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground" title={crit.name}>
                  {crit.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isExcellent ? "text-emerald-600 dark:text-emerald-400" : needsImprovement ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {crit.suggestedScore.toFixed(1)}/10
                </span>
                {crit.delta !== 0 && (
                  <span className={`text-xs ${improved ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {improved ? "+" : ""}{crit.delta.toFixed(1)}
                  </span>
                )}
                {isExcellent && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                {needsImprovement && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    needs work
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-2 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground">
          {excellent.length} criteria excellent (8+), {needsWork.length} still need work (&lt;7)
        </p>
      </div>
    </div>
  );
}

function DiffText({ segments, showRemoved }: { segments: DiffSegment[]; showRemoved: boolean }) {
  return (
    <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.type === "equal") {
          return <span key={index}>{segment.text}</span>;
        }
        if (segment.type === "removed") {
          if (showRemoved) {
            return (
              <span
                key={index}
                className="line-through text-red-600 dark:text-red-400 bg-red-500/10"
              >
                {segment.text}
              </span>
            );
          }
          return null;
        }
        if (segment.type === "added") {
          if (!showRemoved) {
            return (
              <span
                key={index}
                className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
              >
                {segment.text}
              </span>
            );
          }
          return null;
        }
        return null;
      })}
    </p>
  );
}

export function SuggestionPanel({
  originalText,
  rewriteResult,
  isLoading,
  error,
  onAccept,
  onReject,
  onRetry,
  hasEvaluationResult,
  originalScore,
}: SuggestionPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (rewriteResult?.suggestedText) {
      try {
        await navigator.clipboard.writeText(rewriteResult.suggestedText);
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "The suggested text has been copied.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (isLoading) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < loadingSteps.length - 1) return prev + 1;
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!hasEvaluationResult) {
    return null;
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-base font-semibold mb-2">Rewrite Failed</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-retry-rewrite">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary animate-pulse" />
            AI is thinking...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loadingSteps.map((step, index) => (
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

  if (!rewriteResult) {
    return null;
  }

  if (rewriteResult.noImprovementFound) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-semibold mb-2">Your text is already well-written!</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            After multiple attempts, I couldn't find any rewrites that would improve your score of {originalScore?.toFixed(1)}. 
            Your current text is strong as-is.
          </p>
          <Button variant="outline" size="sm" onClick={onReject} data-testid="button-dismiss-no-improvement">
            Got it
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Suggested Rewrite
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              data-testid="button-copy-suggestion"
            >
              {copied ? <CheckCheck className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              data-testid="button-regenerate-rewrite"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              data-testid="button-reject-suggestion"
            >
              <X className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              data-testid="button-accept-suggestion"
            >
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {rewriteResult.thinkingSteps && rewriteResult.thinkingSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              What Changed & Why
            </h4>
            <div className="space-y-2">
              {rewriteResult.thinkingSteps.map((step, index) => {
                const { label, icon: Icon, color } = getPlainLanguageLabel(step.phase);
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${color}`}>{label}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {step.summary.length > 150 ? step.summary.substring(0, 150) + "..." : step.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(originalScore !== undefined || rewriteResult.suggestedScore !== undefined) && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score:</span>
              {originalScore !== undefined && (
                <span className="text-lg font-bold text-muted-foreground">{originalScore.toFixed(1)}</span>
              )}
              {originalScore !== undefined && rewriteResult.suggestedScore !== undefined && (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
              {rewriteResult.suggestedScore !== undefined && (
                <span className={`text-lg font-bold ${
                  originalScore !== undefined && rewriteResult.suggestedScore > originalScore 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-primary"
                }`}>
                  {rewriteResult.suggestedScore.toFixed(1)}
                </span>
              )}
              {originalScore !== undefined && rewriteResult.suggestedScore !== undefined && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    rewriteResult.suggestedScore > originalScore 
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                      : ""
                  }`}
                >
                  {rewriteResult.suggestedScore > originalScore 
                    ? `+${(rewriteResult.suggestedScore - originalScore).toFixed(1)}` 
                    : (rewriteResult.suggestedScore - originalScore).toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewriteResult.originalReadability && rewriteResult.suggestedReadability && (
            <ReadabilityComparison 
              original={rewriteResult.originalReadability} 
              suggested={rewriteResult.suggestedReadability} 
            />
          )}

          {rewriteResult.criteriaComparison && rewriteResult.criteriaComparison.length > 0 && (
            <CriteriaComparison comparison={rewriteResult.criteriaComparison} />
          )}
        </div>

        {rewriteResult.constraintWarning && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {rewriteResult.constraintWarning}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>Original</span>
              <span className="text-xs text-red-500">(strikethrough = removed)</span>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 min-h-[200px] max-h-[400px] overflow-y-auto">
              {rewriteResult.diffSegments && rewriteResult.diffSegments.length > 0 ? (
                <DiffText segments={rewriteResult.diffSegments} showRemoved={true} />
              ) : (
                <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                  {originalText}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <ArrowRight className="w-4 h-4 hidden lg:block" />
              <span>Suggested</span>
              <span className="text-xs text-emerald-600">(bold = added)</span>
            </div>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 min-h-[200px] max-h-[400px] overflow-y-auto">
              {rewriteResult.diffSegments && rewriteResult.diffSegments.length > 0 ? (
                <DiffText segments={rewriteResult.diffSegments} showRemoved={false} />
              ) : (
                <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                  {rewriteResult.suggestedText}
                </p>
              )}
            </div>
          </div>
        </div>

        {rewriteResult.changes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Changes Made ({rewriteResult.changes.length})</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {rewriteResult.changes.map((change, index) => (
                <div key={index} className="text-xs p-2 rounded-md bg-muted/50 border">
                  <span className="line-through text-red-600 dark:text-red-400">{change.original}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{change.new}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
