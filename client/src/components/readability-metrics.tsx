import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  AlignLeft, 
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import type { ReadabilityMetrics as ReadabilityMetricsType } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ReadabilityMetricsPanelProps {
  metrics: ReadabilityMetricsType;
}

interface FleschInfo {
  color: string;
  bg: string;
  label: string;
  description: string;
  icon: "green" | "yellow" | "red";
}

function getFleschInfo(score: number): FleschInfo {
  if (score > 50) {
    return {
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      label: "Accessible",
      description: "Accessible to broader audience (practitioner journals, industry)",
      icon: "green"
    };
  }
  if (score >= 30) {
    return {
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      label: "Standard",
      description: "Standard academic readability (most journals)",
      icon: "green"
    };
  }
  if (score >= 20) {
    return {
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      label: "Dense",
      description: "Dense scientific writing — appropriate for specialist journals only",
      icon: "yellow"
    };
  }
  return {
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    label: "Very Difficult",
    description: "Very difficult to read — consider simplifying",
    icon: "red"
  };
}

function getFleschColor(score: number): string {
  return getFleschInfo(score).color;
}

function getFleschBg(score: number): string {
  return getFleschInfo(score).bg;
}

function getSentenceLengthStatus(avgLength: number): { color: string; status: string; icon: typeof CheckCircle2 } {
  if (avgLength <= 20) {
    return { color: "text-green-600 dark:text-green-400", status: "Good", icon: CheckCircle2 };
  }
  if (avgLength <= 25) {
    return { color: "text-yellow-600 dark:text-yellow-400", status: "Moderate", icon: Info };
  }
  return { color: "text-red-500 dark:text-red-400", status: "Too Long", icon: AlertTriangle };
}

function getPassiveVoiceStatus(percent: number): { color: string; status: string; bg: string } {
  if (percent <= 20) {
    return { color: "text-green-600 dark:text-green-400", status: "Low", bg: "bg-green-100 dark:bg-green-900/30" };
  }
  if (percent <= 40) {
    return { color: "text-yellow-600 dark:text-yellow-400", status: "Moderate", bg: "bg-yellow-100 dark:bg-yellow-900/30" };
  }
  return { color: "text-red-500 dark:text-red-400", status: "High", bg: "bg-red-100 dark:bg-red-900/30" };
}

export function ReadabilityMetricsPanel({ metrics }: ReadabilityMetricsPanelProps) {
  const [longSentencesOpen, setLongSentencesOpen] = useState(false);
  
  const sentenceStatus = getSentenceLengthStatus(metrics.avgSentenceLength);
  const passiveStatus = getPassiveVoiceStatus(metrics.passiveVoicePercent);
  const SentenceIcon = sentenceStatus.icon;

  return (
    <Card data-testid="card-readability-metrics">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4 text-blue-500" />
          Readability Metrics
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                These metrics are computed instantly using established formulas. 
                They provide consistent, objective measurements alongside AI feedback.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg ${getFleschBg(metrics.fleschScore)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Flesch Score</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-xs space-y-1">
                    <p className="font-medium mb-1">Academic Targets:</p>
                    <p><span className="text-green-500">50+</span>: Broader audience (industry)</p>
                    <p><span className="text-green-500">30-50</span>: Standard academic</p>
                    <p><span className="text-yellow-500">20-30</span>: Dense/specialist only</p>
                    <p><span className="text-red-500">&lt;20</span>: Very difficult</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getFleschColor(metrics.fleschScore)}`}>
                {metrics.fleschScore}
              </span>
              <Badge 
                variant="secondary" 
                className={`text-[10px] ${getFleschInfo(metrics.fleschScore).color} ${getFleschInfo(metrics.fleschScore).bg}`}
              >
                {getFleschInfo(metrics.fleschScore).label}
              </Badge>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground mt-1 cursor-help truncate">
                  {getFleschInfo(metrics.fleschScore).description}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{getFleschInfo(metrics.fleschScore).description}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Avg Sentence</span>
              <SentenceIcon className={`w-3 h-3 ${sentenceStatus.color}`} />
            </div>
            <div className={`text-2xl font-bold ${sentenceStatus.color}`}>
              {metrics.avgSentenceLength}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              words ({sentenceStatus.status})
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Passive Voice</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={Math.min(metrics.passiveVoicePercent, 100)} 
                className="w-20 h-2" 
              />
              <Badge variant="secondary" className={`text-xs ${passiveStatus.color} ${passiveStatus.bg}`}>
                {metrics.passiveVoicePercent}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Words</span>
            <span className="font-medium">{metrics.totalWords}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Sentences</span>
            <span className="font-medium">{metrics.totalSentences}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Syllables/Word</span>
            <span className="font-medium">{metrics.avgWordLength}</span>
          </div>
        </div>

        {metrics.longSentences.length > 0 && (
          <Collapsible open={longSentencesOpen} onOpenChange={setLongSentencesOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-yellow-600 dark:text-yellow-400 hover:text-yellow-700"
                data-testid="button-toggle-long-sentences"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{metrics.longSentences.length} long sentence{metrics.longSentences.length > 1 ? 's' : ''} found</span>
                </div>
                {longSentencesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {metrics.longSentences.map((sentence, index) => {
                const isCritical = sentence.wordCount > 35;
                const bgClass = isCritical 
                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800";
                const badgeClass = isCritical
                  ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                  : "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
                const advice = isCritical ? "Split this sentence" : "Consider shortening";
                
                return (
                  <div 
                    key={index} 
                    className={`p-2 rounded ${bgClass}`}
                    data-testid={`long-sentence-${index}`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{sentence.position}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className={`text-xs ${badgeClass}`}>
                          {sentence.wordCount} words
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${badgeClass}`}>
                          {advice}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      "{sentence.text}"
                    </p>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {metrics.longSentences.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>No excessively long sentences</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
