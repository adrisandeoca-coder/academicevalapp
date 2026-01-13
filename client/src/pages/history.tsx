import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { FileText, History, Home, LogOut, User, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, ChevronDown, FolderOpen, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { ResearchPaper } from "@shared/schema";

interface EvaluationRecord {
  id: string;
  sectionType: string;
  originalText: string;
  overallScore: number;
  criteriaScores: any;
  generalFeedback: string;
  createdAt: string;
  paperId: string | null;
}

interface GroupedEvaluations {
  publication: ResearchPaper | null;
  evaluations: EvaluationRecord[];
  avgScore: number;
}

const sectionLabels: Record<string, string> = {
  title: "Title",
  abstract: "Abstract",
  introduction: "Introduction",
  literature_review: "Literature Review",
  methodology: "Methodology",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  paragraph: "Paragraph",
};

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 4) return "text-orange-500 dark:text-orange-400";
  return "text-red-500 dark:text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 6) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (score >= 4) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function ScoreChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
        <TrendingUp className="w-3 h-3" />
        +{diff.toFixed(1)}
      </span>
    );
  } else if (diff < 0) {
    return (
      <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs">
        <TrendingDown className="w-3 h-3" />
        {diff.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <Minus className="w-3 h-3" />
      0
    </span>
  );
}

export default function HistoryPage() {
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["standalone"]));
  
  const { data: history, isLoading } = useQuery<EvaluationRecord[]>({
    queryKey: ["/api/history"],
  });

  const { data: publications } = useQuery<ResearchPaper[]>({
    queryKey: ["/api/papers"],
    enabled: !!user,
  });

  const groupedEvaluations: GroupedEvaluations[] = (() => {
    if (!history) return [];
    
    const groups = new Map<string, { pub: ResearchPaper | null; evals: EvaluationRecord[] }>();
    
    groups.set("standalone", { pub: null, evals: [] });
    
    for (const record of history) {
      if (record.paperId) {
        if (!groups.has(record.paperId)) {
          const pub = publications?.find(p => p.id === record.paperId) || null;
          groups.set(record.paperId, { pub, evals: [] });
        }
        groups.get(record.paperId)!.evals.push(record);
      } else {
        groups.get("standalone")!.evals.push(record);
      }
    }
    
    return Array.from(groups.entries())
      .filter(([_, v]) => v.evals.length > 0)
      .map(([key, v]) => ({
        publication: v.pub,
        evaluations: v.evals,
        avgScore: v.evals.reduce((sum, e) => sum + e.overallScore, 0) / v.evals.length,
      }))
      .sort((a, b) => {
        if (!a.publication && b.publication) return 1;
        if (a.publication && !b.publication) return -1;
        const aDate = new Date(a.evaluations[0]?.createdAt || 0);
        const bDate = new Date(b.evaluations[0]?.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
  })();

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "User";
  };

  const stats = history ? {
    totalEvaluations: history.length,
    avgScore: history.length > 0 
      ? (history.reduce((sum, e) => sum + e.overallScore, 0) / history.length).toFixed(1)
      : "0.0",
    recentTrend: history.length >= 2 
      ? history[0].overallScore - history[1].overallScore 
      : 0,
    sectionBreakdown: history.reduce((acc, e) => {
      acc[e.sectionType] = (acc[e.sectionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Research History
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Track your writing progress over time
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild data-testid="link-home">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Evaluate
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                      {user?.email && (
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer" data-testid="menu-item-profile">
                    <a href="#" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => logout()}
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="card-stat-evaluations">
            <CardHeader className="pb-2">
              <CardDescription>Total Evaluations</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? <Skeleton className="h-9 w-16" /> : stats?.totalEvaluations || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across all section types
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-average">
            <CardHeader className="pb-2">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-3xl flex items-baseline gap-2">
                {isLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <>
                    <span className={getScoreColor(parseFloat(stats?.avgScore || "0"))}>
                      {stats?.avgScore}
                    </span>
                    <span className="text-lg text-muted-foreground">/10</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Weighted across all criteria
              </p>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-trend">
            <CardHeader className="pb-2">
              <CardDescription>Recent Trend</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : stats && stats.recentTrend !== 0 ? (
                  stats.recentTrend > 0 ? (
                    <>
                      <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">Improving</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-8 h-8 text-red-500 dark:text-red-400" />
                      <span className="text-red-500 dark:text-red-400">Declining</span>
                    </>
                  )
                ) : (
                  <>
                    <Minus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-muted-foreground">Stable</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Compared to previous evaluation
              </p>
            </CardContent>
          </Card>
        </div>

        {stats && Object.keys(stats.sectionBreakdown).length > 0 && (
          <Card data-testid="card-section-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Section Breakdown
              </CardTitle>
              <CardDescription>Evaluations by section type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.sectionBreakdown).map(([section, count]) => (
                  <Badge key={section} variant="secondary" className="text-sm" data-testid={`badge-section-${section}`}>
                    {sectionLabels[section] || section}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-history-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Evaluation History
            </CardTitle>
            <CardDescription>Your past evaluations grouped by publication</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : groupedEvaluations.length > 0 ? (
              <div className="space-y-4">
                {groupedEvaluations.map((group, groupIndex) => {
                  const groupKey = group.publication?.id || `standalone-${groupIndex}`;
                  const isExpanded = expandedGroups.has(groupKey);
                  
                  return (
                    <Collapsible
                      key={groupKey}
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(groupKey)}
                      data-testid={`group-${groupKey}`}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getScoreBgColor(group.avgScore)}`}>
                              <span className={`text-sm font-bold ${getScoreColor(group.avgScore)}`}>
                                {group.avgScore.toFixed(1)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {group.publication ? (
                                  <FileText className="w-4 h-4 text-primary" />
                                ) : (
                                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">
                                  {group.publication?.title || "Standalone Evaluations"}
                                </span>
                                {group.publication && (
                                  <Link 
                                    href={`/publication/${group.publication.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`link-publication-${group.publication.id}`}
                                  >
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View
                                    </Button>
                                  </Link>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {group.evaluations.length} evaluation{group.evaluations.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 ml-4 pl-4 border-l-2 border-border space-y-3">
                          {group.evaluations.map((record, index) => (
                            <div
                              key={record.id}
                              className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg border hover-elevate transition-colors"
                              data-testid={`history-item-${record.id}`}
                            >
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getScoreBgColor(record.overallScore)} shrink-0`}>
                                <span className={`text-lg font-bold ${getScoreColor(record.overallScore)}`}>
                                  {record.overallScore.toFixed(1)}
                                </span>
                              </div>
                              
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{sectionLabels[record.sectionType] || record.sectionType}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                                  </span>
                                  {index < group.evaluations.length - 1 && (
                                    <ScoreChangeIndicator 
                                      current={record.overallScore} 
                                      previous={group.evaluations[index + 1].overallScore} 
                                    />
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {record.originalText.substring(0, 200)}
                                  {record.originalText.length > 200 && "..."}
                                </p>
                                
                                <p className="text-sm">
                                  {record.generalFeedback}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No evaluations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start evaluating your academic writing to build your research history.
                </p>
                <Button asChild data-testid="button-start-evaluating">
                  <Link href="/">Start Evaluating</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
