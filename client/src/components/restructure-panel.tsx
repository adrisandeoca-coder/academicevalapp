import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, ArrowRight, Check, X, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type RestructureResult, type RestructureSuggestion } from "@shared/schema";

interface RestructurePanelProps {
  restructureResult: RestructureResult | null;
  isLoading: boolean;
  error: string | null;
  onApplySuggestion: (suggestion: RestructureSuggestion) => void;
  onApplyAll: () => void;
  appliedSuggestions: Set<string>;
}

function getCoherenceColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 4) return "text-orange-500 dark:text-orange-400";
  return "text-red-500 dark:text-red-400";
}

function getCoherenceBg(score: number): string {
  if (score >= 8) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 6) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (score >= 4) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

export function RestructurePanel({
  restructureResult,
  isLoading,
  error,
  onApplySuggestion,
  onApplyAll,
  appliedSuggestions,
}: RestructurePanelProps) {
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Card className="h-full" data-testid="card-restructure-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            Analyzing Structure
          </CardTitle>
          <CardDescription>
            Checking paragraph coherence and sentence placement...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Analyzing paragraphs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full" data-testid="card-restructure-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            Restructure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <X className="w-8 h-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!restructureResult) {
    return (
      <Card className="h-full" data-testid="card-restructure-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" />
            Restructure Suggestions
          </CardTitle>
          <CardDescription>
            Enable "Suggest restructuring" and evaluate your text to see suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
            <Shuffle className="w-12 h-12 opacity-30" />
            <p className="text-sm text-center">
              The AI will analyze your paragraph structure and suggest<br />
              where sentences might fit better for improved coherence.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingSuggestions = restructureResult.suggestions.filter(s => !appliedSuggestions.has(s.id));
  const allApplied = pendingSuggestions.length === 0 && restructureResult.suggestions.length > 0;

  return (
    <Card className="h-full" data-testid="card-restructure-results">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-blue-500" />
              Restructure Suggestions
            </CardTitle>
            <CardDescription className="mt-1">
              {restructureResult.summary}
            </CardDescription>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getCoherenceBg(restructureResult.overallCoherence)}`}>
            <span className={`text-lg font-bold ${getCoherenceColor(restructureResult.overallCoherence)}`}>
              {restructureResult.overallCoherence.toFixed(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {restructureResult.suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-sm text-center text-muted-foreground">
              Your paragraph structure looks good!<br />
              No restructuring needed.
            </p>
          </div>
        ) : (
          <>
            {pendingSuggestions.length > 1 && (
              <Button
                onClick={onApplyAll}
                variant="outline"
                className="w-full"
                data-testid="button-apply-all-restructure"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply All ({pendingSuggestions.length} suggestions)
              </Button>
            )}
            
            {allApplied && (
              <div className="flex items-center justify-center gap-2 py-4 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">All suggestions applied!</span>
              </div>
            )}

            <div className="space-y-3">
              {restructureResult.suggestions.map((suggestion) => {
                const isApplied = appliedSuggestions.has(suggestion.id);
                
                return (
                  <div
                    key={suggestion.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isApplied 
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                        : "bg-muted/30 hover-elevate"
                    }`}
                    data-testid={`restructure-suggestion-${suggestion.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            Paragraph {suggestion.fromParagraph}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                          <Badge variant="secondary" className="text-xs">
                            Paragraph {suggestion.toParagraph}
                          </Badge>
                          {isApplied && (
                            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300">
                              <Check className="w-3 h-3 mr-1" />
                              Applied
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm font-serif leading-relaxed bg-background/50 p-2 rounded border-l-2 border-blue-300">
                          "{suggestion.sentence}"
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </p>
                      </div>
                      
                      {!isApplied && (
                        <Button
                          size="sm"
                          onClick={() => onApplySuggestion(suggestion)}
                          data-testid={`button-apply-${suggestion.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Apply
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
