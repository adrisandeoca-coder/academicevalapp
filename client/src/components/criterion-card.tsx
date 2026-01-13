import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { type CriterionScore } from "@shared/schema";

interface CriterionCardProps {
  criterion: CriterionScore;
}

function getScoreColor(score: number): string {
  if (score >= 9) return "bg-emerald-500";
  if (score >= 7) return "bg-blue-500";
  if (score >= 5) return "bg-amber-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreBgColor(score: number): string {
  if (score >= 9) return "bg-emerald-500/10";
  if (score >= 7) return "bg-blue-500/10";
  if (score >= 5) return "bg-amber-500/10";
  if (score >= 3) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function getScoreTextColor(score: number): string {
  if (score >= 9) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 7) return "text-blue-600 dark:text-blue-400";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  if (score >= 3) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function CriterionCard({ criterion }: CriterionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scorePercentage = (criterion.score / 10) * 100;

  return (
    <Card
      className={`overflow-visible p-4 cursor-pointer transition-all duration-150 hover-elevate ${
        expanded ? getScoreBgColor(criterion.score) : ""
      }`}
      onClick={() => setExpanded(!expanded)}
      data-testid={`criterion-card-${criterion.name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h5 className="font-semibold text-sm leading-tight">{criterion.name}</h5>
            <p className="text-xs text-muted-foreground mt-0.5">{criterion.weight}% weight</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-2xl font-bold ${getScoreTextColor(criterion.score)}`}>
              {criterion.score}
            </span>
            <span className="text-sm text-muted-foreground">/10</span>
          </div>
        </div>

        {criterion.missing && (
          <Badge 
            variant="outline" 
            className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            data-testid={`badge-missing-${criterion.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Missing: {criterion.missing}
          </Badge>
        )}

        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getScoreColor(
              criterion.score
            )}`}
            style={{ width: `${scorePercentage}%` }}
          />
        </div>

        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          data-testid={`button-expand-${criterion.name.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide suggestion
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              View suggestion
            </>
          )}
        </button>

        {expanded && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm font-serif leading-relaxed text-foreground/90">
              {criterion.suggestion}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
