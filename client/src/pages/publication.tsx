import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Lightbulb,
  Link2,
  TrendingUp
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ResearchPaper } from "@shared/schema";

interface KeyPoint {
  id: string;
  statement: string;
  sourceQuote: string;
  pointType: string;
}

interface SectionNode {
  id: string;
  sectionType: string;
  label: string;
  score: number;
  count: number;
  lastUpdated: string;
  keyPoints: KeyPoint[];
}

interface PublicationMapData {
  publication: ResearchPaper;
  sections: SectionNode[];
  totalEvaluations: number;
  avgScore: number;
}

interface CoherenceInsight {
  fromSection: string;
  toSection: string;
  score: number;
  feedback: string;
}

interface CoherenceResult {
  overallScore: number;
  summary: string;
  insights: CoherenceInsight[];
  strengths: string[];
  improvements: string[];
}

const sectionOrder = [
  "title",
  "abstract", 
  "introduction",
  "literature_review",
  "methodology",
  "results",
  "discussion",
  "conclusion",
];

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
  figure_introduction: "Fig: Introduction",
  figure_theory: "Fig: Theory",
  figure_methodology: "Fig: Methodology",
  figure_results_quantitative: "Fig: Results (Quant)",
  figure_results_qualitative: "Fig: Results (Qual)",
  figure_discussion: "Fig: Discussion",
};

function getScoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#eab308";
  if (score >= 4) return "#f97316";
  return "#ef4444";
}

function getScoreTextColor(score: number): string {
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

const pointTypeLabels: Record<string, string> = {
  purpose: "Purpose",
  method: "Method",
  finding: "Finding",
  implication: "Implication",
  context: "Context",
  problem: "Problem",
  gap: "Gap",
  objective: "Objective",
  contribution: "Contribution",
  prior_work: "Prior Work",
  theory: "Theory",
  approach: "Approach",
  data_source: "Data Source",
  procedure: "Procedure",
  measure: "Measure",
  comparison: "Comparison",
  pattern: "Pattern",
  statistic: "Statistic",
  interpretation: "Interpretation",
  limitation: "Limitation",
  future_work: "Future Work",
  main_idea: "Main Idea",
  support: "Support",
  evidence: "Evidence",
  topic: "Topic",
  scope: "Scope",
  claim: "Claim",
  point: "Point",
  statement: "Statement",
};

const pointTypeColors: Record<string, string> = {
  purpose: "#8b5cf6",
  method: "#3b82f6",
  finding: "#22c55e",
  implication: "#f59e0b",
  context: "#6b7280",
  problem: "#ef4444",
  gap: "#f97316",
  objective: "#06b6d4",
  contribution: "#10b981",
  prior_work: "#64748b",
  theory: "#8b5cf6",
  approach: "#3b82f6",
  data_source: "#14b8a6",
  procedure: "#0ea5e9",
  measure: "#6366f1",
  comparison: "#ec4899",
  pattern: "#a855f7",
  statistic: "#2563eb",
  interpretation: "#d946ef",
  limitation: "#f97316",
  future_work: "#84cc16",
  main_idea: "#8b5cf6",
  support: "#3b82f6",
  evidence: "#22c55e",
  topic: "#6b7280",
  scope: "#64748b",
  claim: "#8b5cf6",
  point: "#3b82f6",
  statement: "#6b7280",
};

function buildMindmapNodes(data: PublicationMapData, expandedSections: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  nodes.push({
    id: "root",
    type: "default",
    position: { x: 600, y: 30 },
    data: { 
      label: (
        <div className="text-center p-2">
          <div className="font-bold text-sm">{data.publication.title}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.totalEvaluations} evaluations
          </div>
          <div className="text-xs font-bold mt-1" style={{ color: getScoreColor(data.avgScore) }}>
            Avg: {data.avgScore.toFixed(1)}/10
          </div>
        </div>
      )
    },
    style: {
      background: "hsl(var(--card))",
      border: "2px solid hsl(var(--primary))",
      borderRadius: "12px",
      padding: "8px",
      width: 200,
    },
  });

  const coreSections = data.sections.filter(s => sectionOrder.includes(s.sectionType));
  const figureSections = data.sections.filter(s => s.sectionType.startsWith("figure_"));

  const sortedCoreSections = coreSections.sort((a, b) => 
    sectionOrder.indexOf(a.sectionType) - sectionOrder.indexOf(b.sectionType)
  );

  // Calculate layout - vertical for sections, with key points branching right
  const sectionStartY = 180;
  const sectionSpacingY = 140;
  const sectionX = 250;
  const keyPointStartX = 550;
  const keyPointSpacingY = 60;

  sortedCoreSections.forEach((section, sectionIndex) => {
    const sectionY = sectionStartY + sectionIndex * sectionSpacingY;
    const nodeId = `section-${section.sectionType}`;
    const keyPoints = section.keyPoints || [];
    const isExpanded = expandedSections.has(section.sectionType);
    
    nodes.push({
      id: nodeId,
      type: "default",
      position: { x: sectionX, y: sectionY },
      data: {
        sectionType: section.sectionType,
        hasKeyPoints: keyPoints.length > 0,
        label: (
          <div className="text-center p-2 cursor-pointer select-none">
            <div className="font-semibold text-sm">{section.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: getScoreColor(section.score) }}>
              {section.score.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {section.count} eval{section.count !== 1 ? "s" : ""}
            </div>
            {keyPoints.length > 0 && (
              <div className="text-xs mt-1.5 text-primary flex items-center justify-center gap-1 font-medium">
                {isExpanded ? "▼" : "▶"} {keyPoints.length} points
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: "hsl(var(--card))",
        border: `2px solid ${getScoreColor(section.score)}`,
        borderRadius: "10px",
        padding: "6px",
        width: 180,
        minHeight: 90,
        cursor: keyPoints.length > 0 ? "pointer" : "default",
      },
    });

    edges.push({
      id: `edge-root-${nodeId}`,
      source: "root",
      target: nodeId,
      type: "smoothstep",
      style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    });

    // Add key points as child nodes branching to the right (only when expanded)
    if (isExpanded) {
      keyPoints.forEach((kp, kpIndex) => {
        const kpNodeId = `kp-${section.sectionType}-${kp.id}`;
        const kpY = sectionY - (keyPoints.length - 1) * keyPointSpacingY / 2 + kpIndex * keyPointSpacingY;
        const color = pointTypeColors[kp.pointType] || "#6b7280";
        
        nodes.push({
          id: kpNodeId,
          type: "default",
          position: { x: keyPointStartX, y: kpY },
          data: {
            label: (
              <div className="text-left p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] uppercase font-semibold" style={{ color }}>
                    {pointTypeLabels[kp.pointType] || kp.pointType}
                  </span>
                </div>
                <div className="text-xs leading-relaxed line-clamp-3">
                  {kp.statement}
                </div>
              </div>
            ),
          },
          style: {
            background: "hsl(var(--card))",
            border: `1px solid ${color}50`,
            borderRadius: "8px",
            padding: "4px",
            width: 280,
            fontSize: "12px",
          },
        });

        edges.push({
          id: `edge-${nodeId}-${kpNodeId}`,
          source: nodeId,
          target: kpNodeId,
          type: "smoothstep",
          style: { stroke: color, strokeWidth: 1, opacity: 0.6 },
        });
      });
    }
  });

  // Add figure sections below, without key points
  if (figureSections.length > 0) {
    const figureY = sectionStartY + sortedCoreSections.length * sectionSpacingY + 50;
    const figureStartX = 100;
    
    figureSections.forEach((section, index) => {
      const x = figureStartX + index * 140;
      const nodeId = `figure-${section.sectionType}`;
      
      nodes.push({
        id: nodeId,
        type: "default",
        position: { x, y: figureY },
        data: {
          label: (
            <div className="text-center p-1">
              <div className="font-medium text-xs">{section.label}</div>
              <div className="text-sm font-bold mt-1" style={{ color: getScoreColor(section.score) }}>
                {section.score.toFixed(1)}
              </div>
            </div>
          ),
        },
        style: {
          background: "hsl(var(--muted))",
          border: `1px solid ${getScoreColor(section.score)}`,
          borderRadius: "6px",
          padding: "2px",
          width: 120,
        },
      });

      edges.push({
        id: `edge-root-${nodeId}`,
        source: "root",
        target: nodeId,
        type: "smoothstep",
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "5,5" },
      });
    });
  }

  return { nodes, edges };
}

export default function PublicationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: mapData, isLoading: isMapLoading, error: mapError } = useQuery<PublicationMapData>({
    queryKey: [`/api/publications/${id}/map`],
    enabled: !!id && !!user,
  });

  const [coherenceResult, setCoherenceResult] = useState<CoherenceResult | null>(null);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Check if this is a section node with key points
    if (node.id.startsWith('section-') && node.data?.hasKeyPoints) {
      const sectionType = node.data.sectionType as string;
      setExpandedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(sectionType)) {
          newSet.delete(sectionType);
        } else {
          newSet.add(sectionType);
        }
        return newSet;
      });
    }
  }, []);

  const coherenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/publications/${id}/coherence`);
      return response.json();
    },
    onSuccess: (data: CoherenceResult) => {
      setCoherenceResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Coherence Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (mapData) {
      const { nodes: newNodes, edges: newEdges } = buildMindmapNodes(mapData, expandedSections);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [mapData, expandedSections, setNodes, setEdges]);

  if (isMapLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[500px] w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (mapError || !mapData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Publication Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This publication doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link href="/history">Back to History</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCoherence = coherenceResult;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild data-testid="button-back">
                <Link href="/history">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {mapData.publication.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Publication Overview & Coherence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm" data-testid="badge-avg-score">
                <BarChart3 className="w-3 h-3 mr-1" />
                Avg: {mapData.avgScore.toFixed(1)}/10
              </Badge>
              <Badge variant="outline" className="text-sm">
                {mapData.totalEvaluations} evaluations
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
          <div>
            <Card data-testid="card-mindmap">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Publication Structure
                </CardTitle>
                <CardDescription className="text-xs">
                  Click sections to expand key points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] w-full rounded-lg border bg-muted/30">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    fitView
                    attributionPosition="bottom-left"
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.3}
                    maxZoom={1.5}
                    defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                  >
                    <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
                    <Controls showInteractive={false} />
                    <MiniMap 
                      nodeStrokeColor={() => "hsl(var(--muted-foreground))"}
                      nodeColor={() => "hsl(var(--card))"}
                      maskColor="hsl(var(--background) / 0.8)"
                      style={{ width: 100, height: 80 }}
                    />
                  </ReactFlow>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card data-testid="card-coherence">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  Coherence Analysis
                </CardTitle>
                <CardDescription>
                  How well do your sections work together?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeCoherence && !coherenceMutation.isPending && (
                  <div className="text-center py-4">
                    {mapData.sections.length >= 2 ? (
                      <>
                        <Lightbulb className="w-8 h-8 mx-auto text-primary mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Analyze how sections connect and flow
                        </p>
                        <Button 
                          onClick={() => coherenceMutation.mutate()}
                          size="sm"
                          data-testid="button-analyze-coherence"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze Coherence
                        </Button>
                      </>
                    ) : (
                      <div className="py-2">
                        <div className="flex justify-center items-center gap-4 mb-3 opacity-50">
                          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground flex items-center justify-center text-xs text-muted-foreground">
                            A
                          </div>
                          <div className="w-8 border-t border-dashed border-muted-foreground" />
                          <div className="text-lg text-muted-foreground">?</div>
                          <div className="w-8 border-t border-dashed border-muted-foreground" />
                          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground flex items-center justify-center text-xs text-muted-foreground">
                            I
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add another section to analyze coherence between them
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          asChild
                        >
                          <Link href="/">
                            <FileText className="w-3 h-3 mr-1" />
                            Add Section
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {coherenceMutation.isPending && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing section coherence...
                    </p>
                  </div>
                )}

                {activeCoherence && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${getScoreBgColor(activeCoherence.overallScore)} flex items-center justify-between`}>
                      <div>
                        <p className="text-sm font-medium">Overall Coherence</p>
                        <p className="text-xs text-muted-foreground">Cross-section alignment</p>
                      </div>
                      <span className={`text-2xl font-bold ${getScoreTextColor(activeCoherence.overallScore)}`}>
                        {activeCoherence.overallScore.toFixed(1)}/10
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Summary</p>
                      <p className="text-sm text-muted-foreground">{activeCoherence.summary}</p>
                    </div>

                    {activeCoherence.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Strengths
                        </p>
                        <ul className="space-y-1">
                          {activeCoherence.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground pl-5">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeCoherence.improvements.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                          Areas to Improve
                        </p>
                        <ul className="space-y-1">
                          {activeCoherence.improvements.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground pl-5">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => coherenceMutation.mutate()}
                      className="w-full"
                      data-testid="button-reanalyze"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-analyze
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-section-list">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Section Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mapData.sections.map((section) => (
                    <div 
                      key={section.id} 
                      className="p-2 rounded-md hover-elevate border space-y-1.5"
                      data-testid={`section-${section.sectionType}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{section.label}</p>
                        <span className={`text-sm font-bold ${getScoreTextColor(section.score)}`}>
                          {section.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(section.score / 10) * 100}%`,
                              backgroundColor: getScoreColor(section.score)
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {section.count} eval{section.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {section.keyPoints.length} key point{section.keyPoints.length !== 1 ? "s" : ""} identified
                        </p>
                      )}
                    </div>
                  ))}
                  {mapData.sections.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">
                        No sections evaluated yet
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
