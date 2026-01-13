import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InputPanel } from "@/components/input-panel";
import { ResultsPanel } from "@/components/results-panel";
import { SuggestionPanel } from "@/components/suggestion-panel";
import { RestructurePanel } from "@/components/restructure-panel";
import { type SectionType, type EvaluationResult, type RewriteResult, type RestructureResult, type RestructureSuggestion, type FigureSectionType, type WritingStyle, type SupportArgument, type ResearchPaper, isFigureSectionType, presetStyleDimensions } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { FileText, History, LogOut, User } from "lucide-react";

export default function Home() {
  const [text, setText] = useState("");
  const [sectionType, setSectionType] = useState<SectionType>("abstract");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [originalTextForRewrite, setOriginalTextForRewrite] = useState("");
  const [shortenMode, setShortenMode] = useState(false);
  const [emphasisMode, setEmphasisMode] = useState(false);
  const [restructureMode, setRestructureMode] = useState(false);
  const [restructureResult, setRestructureResult] = useState<RestructureResult | null>(null);
  const [appliedRestructures, setAppliedRestructures] = useState<Set<string>>(new Set());
  const [imageData, setImageData] = useState<string | null>(null);
  const [figureCaption, setFigureCaption] = useState("");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>({
    preset: "engineering",
    dimensions: { ...presetStyleDimensions.engineering },
  });
  const [selectedArguments, setSelectedArguments] = useState<string[]>([]);
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  const isFigure = isFigureSectionType(sectionType);

  const { data: publications = [], isLoading: isLoadingPublications } = useQuery<ResearchPaper[]>({
    queryKey: ["/api/papers"],
    enabled: !!user,
  });

  const createPublicationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/papers", { title, userId: user?.id });
      return (await response.json()) as ResearchPaper;
    },
    onSuccess: (newPaper) => {
      queryClient.invalidateQueries({ queryKey: ["/api/papers"] });
      setSelectedPublication(newPaper.id);
      toast({
        title: "Publication created",
        description: `"${newPaper.title}" is now your active publication. All evaluations will be grouped under it.`,
      });
    },
  });

  const saveEvaluationMutation = useMutation({
    mutationFn: async (data: {
      sectionType: string;
      originalText: string;
      overallScore: number;
      criteriaScores: any;
      generalFeedback: string;
      paperId?: string | null;
      keyPoints?: any;
    }) => {
      const response = await apiRequest("POST", "/api/history/evaluation", data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      if (variables.paperId) {
        queryClient.invalidateQueries({ queryKey: [`/api/publications/${variables.paperId}/map`] });
      }
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async (data: { text: string; sectionType: SectionType; writingStyle?: WritingStyle; includeEmphasis?: boolean; paperId?: string | null; customInstructions?: string }) => {
      const response = await apiRequest("POST", "/api/evaluate", data);
      return (await response.json()) as EvaluationResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setRewriteResult(null);
      setOriginalTextForRewrite(text);
      
      // Auto-select all emphasis suggestions if any
      const allSuggestionIds = data.supportArguments?.map(arg => arg.id) || [];
      setSelectedArguments(allSuggestionIds);
      
      saveEvaluationMutation.mutate({
        sectionType: data.sectionType,
        originalText: text,
        overallScore: data.overallScore,
        criteriaScores: data.criteria,
        generalFeedback: data.generalFeedback,
        paperId: selectedPublication,
        keyPoints: data.keyPoints,
      });
      
      // Auto-trigger rewrite (with emphasis suggestions if enabled)
      const allSuggestions = data.supportArguments || [];
      rewriteMutation.mutate({ 
        text, 
        sectionType, 
        originalScore: data.overallScore, 
        shortenMode, 
        writingStyle,
        selectedEmphasisSuggestions: allSuggestions.length > 0 ? allSuggestions : undefined,
        customInstructions: customInstructions || undefined,
        evaluationFeedback: {
          criteria: data.criteria.map(c => ({ name: c.name, score: c.score, suggestion: c.suggestion })),
          generalFeedback: data.generalFeedback,
        }
      });
      
      // Trigger restructure analysis if enabled
      if (restructureMode) {
        restructureMutation.mutate({ text, sectionType, customInstructions: customInstructions || undefined });
      }
    },
  });

  const figureEvaluateMutation = useMutation({
    mutationFn: async (data: { imageData: string; caption?: string; sectionType: FigureSectionType; customInstructions?: string }) => {
      const response = await apiRequest("POST", "/api/evaluate-figure", data);
      return (await response.json()) as EvaluationResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setRewriteResult(null);
      
      saveEvaluationMutation.mutate({
        sectionType: data.sectionType,
        originalText: figureCaption || "[Figure uploaded]",
        overallScore: data.overallScore,
        criteriaScores: data.criteria,
        generalFeedback: data.generalFeedback,
      });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async (data: { 
      text: string; 
      sectionType: SectionType; 
      originalScore?: number; 
      shortenMode?: boolean; 
      writingStyle?: WritingStyle; 
      selectedEmphasisSuggestions?: SupportArgument[];
      customInstructions?: string;
      evaluationFeedback?: { criteria: { name: string; score: number; suggestion: string }[]; generalFeedback: string };
    }) => {
      const response = await apiRequest("POST", "/api/rewrite", data);
      return (await response.json()) as RewriteResult;
    },
    onSuccess: (data) => {
      setRewriteResult(data);
    },
  });

  const restructureMutation = useMutation({
    mutationFn: async (data: { text: string; sectionType: SectionType; customInstructions?: string }) => {
      const response = await apiRequest("POST", "/api/restructure", data);
      return (await response.json()) as RestructureResult;
    },
    onSuccess: (data) => {
      setRestructureResult(data);
      setAppliedRestructures(new Set());
    },
  });

  const handleEvaluate = () => {
    if (isFigure) {
      if (imageData) {
        figureEvaluateMutation.mutate({ 
          imageData, 
          caption: figureCaption || undefined, 
          sectionType: sectionType as FigureSectionType,
          customInstructions: customInstructions || undefined
        });
      }
    } else {
      if (text.trim()) {
        evaluateMutation.mutate({ 
          text, 
          sectionType, 
          writingStyle, 
          includeEmphasis: emphasisMode, 
          paperId: selectedPublication,
          customInstructions: customInstructions || undefined
        });
      }
    }
  };

  const handleRequestRewrite = () => {
    if (isFigure) return;
    if (text.trim()) {
      setOriginalTextForRewrite(text);
      const selectedSuggestions = result?.supportArguments?.filter((arg) => selectedArguments.includes(arg.id)) || [];
      rewriteMutation.mutate({ 
        text, 
        sectionType, 
        originalScore: result?.overallScore, 
        shortenMode, 
        writingStyle,
        selectedEmphasisSuggestions: selectedSuggestions.length > 0 ? selectedSuggestions : undefined,
        customInstructions: customInstructions || undefined,
        evaluationFeedback: result ? {
          criteria: result.criteria.map(c => ({ name: c.name, score: c.score, suggestion: c.suggestion })),
          generalFeedback: result.generalFeedback,
        } : undefined
      });
    }
  };

  const handleAcceptRewrite = () => {
    if (rewriteResult) {
      setText(rewriteResult.suggestedText);
      setRewriteResult(null);
      setResult(null);
      toast({
        title: "Suggestion accepted",
        description: "Your text has been updated. You can evaluate again to see the new score.",
      });
    }
  };

  const handleRejectRewrite = () => {
    setRewriteResult(null);
    rewriteMutation.reset();
  };

  const applyRestructureSuggestion = (suggestion: RestructureSuggestion) => {
    const paragraphs = text.split(/\n\n/);
    const fromIdx = suggestion.fromParagraph - 1;
    const toIdx = suggestion.toParagraph - 1;
    
    if (fromIdx < 0 || fromIdx >= paragraphs.length || toIdx < 0 || toIdx >= paragraphs.length) {
      toast({ title: "Error", description: "Invalid paragraph index", variant: "destructive" });
      return;
    }
    
    const sentencePattern = suggestion.sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\s*${sentencePattern}\\s*`, 'i');
    
    if (!regex.test(paragraphs[fromIdx])) {
      toast({ title: "Error", description: "Sentence not found in source paragraph. Text may have changed.", variant: "destructive" });
      return;
    }
    
    paragraphs[fromIdx] = paragraphs[fromIdx].replace(regex, ' ').trim() || '\u200B';
    paragraphs[toIdx] = (paragraphs[toIdx] === '\u200B' ? '' : paragraphs[toIdx].trim()) + ' ' + suggestion.sentence;
    paragraphs[toIdx] = paragraphs[toIdx].trim();
    
    const newText = paragraphs.join('\n\n').replace(/\u200B/g, '');
    setText(newText);
    
    setAppliedRestructures(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestion.id);
      return newSet;
    });
    toast({ title: "Applied", description: "Sentence moved to the suggested paragraph" });
  };

  const applyAllRestructures = () => {
    if (!restructureResult) return;
    
    const pending = restructureResult.suggestions.filter(s => !appliedRestructures.has(s.id));
    if (pending.length === 0) return;
    
    const paragraphs = text.split(/\n\n/);
    const successfullyApplied: string[] = [];
    const failedSuggestions: RestructureSuggestion[] = [];
    
    const removals: Array<{ paraIdx: number; sentence: string; id: string }> = [];
    const additions: Array<{ paraIdx: number; sentence: string }> = [];
    
    for (const suggestion of pending) {
      const fromIdx = suggestion.fromParagraph - 1;
      const toIdx = suggestion.toParagraph - 1;
      
      if (fromIdx >= 0 && fromIdx < paragraphs.length && toIdx >= 0 && toIdx < paragraphs.length) {
        const sentencePattern = suggestion.sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\s*${sentencePattern}\\s*`, 'i');
        
        if (regex.test(paragraphs[fromIdx])) {
          removals.push({ paraIdx: fromIdx, sentence: suggestion.sentence, id: suggestion.id });
          additions.push({ paraIdx: toIdx, sentence: suggestion.sentence });
          successfullyApplied.push(suggestion.id);
        } else {
          failedSuggestions.push(suggestion);
        }
      } else {
        failedSuggestions.push(suggestion);
      }
    }
    
    for (const removal of removals) {
      const sentencePattern = removal.sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\s*${sentencePattern}\\s*`, 'i');
      paragraphs[removal.paraIdx] = paragraphs[removal.paraIdx].replace(regex, ' ').trim() || '\u200B';
    }
    
    for (const addition of additions) {
      const target = paragraphs[addition.paraIdx] === '\u200B' ? '' : paragraphs[addition.paraIdx].trim();
      paragraphs[addition.paraIdx] = (target + ' ' + addition.sentence).trim();
    }
    
    const newText = paragraphs
      .map(p => p.trim())
      .map(p => p === '\u200B' ? '' : p)
      .filter(p => p)
      .join('\n\n')
      .trim();
    setText(newText);
    
    setRestructureResult(null);
    setAppliedRestructures(new Set());
    
    if (successfullyApplied.length > 0 && failedSuggestions.length === 0) {
      toast({ title: "Applied", description: `${successfullyApplied.length} sentence(s) moved` });
    } else if (successfullyApplied.length > 0) {
      toast({ 
        title: "Partially applied", 
        description: `${successfullyApplied.length} moved, ${failedSuggestions.length} could not be matched. Re-analyze to see updated structure.`,
        variant: "default"
      });
    } else {
      toast({ title: "No changes", description: "No sentences could be matched. Text may have changed.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setResult(null);
    setRewriteResult(null);
    setRestructureResult(null);
    setAppliedRestructures(new Set());
    setText("");
    setImageData(null);
    setFigureCaption("");
    setSelectedArguments([]);
    evaluateMutation.reset();
    figureEvaluateMutation.reset();
    rewriteMutation.reset();
    restructureMutation.reset();
  };

  const handleArgumentToggle = (argumentId: string, selected: boolean) => {
    setSelectedArguments((prev) => 
      selected 
        ? [...prev, argumentId] 
        : prev.filter((id) => id !== argumentId)
    );
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
                  Academic Writing Evaluator
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  AI-powered feedback for scholarly papers
                </p>
              </div>
            </div>
            
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
                <DropdownMenuItem asChild className="cursor-pointer" data-testid="menu-item-history">
                  <Link href="/history" className="flex items-center">
                    <History className="mr-2 h-4 w-4" />
                    <span>History</span>
                  </Link>
                </DropdownMenuItem>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InputPanel
            text={text}
            onTextChange={setText}
            sectionType={sectionType}
            onSectionTypeChange={setSectionType}
            writingStyle={writingStyle}
            onWritingStyleChange={setWritingStyle}
            onEvaluate={handleEvaluate}
            isLoading={evaluateMutation.isPending || figureEvaluateMutation.isPending}
            hasResult={!!result}
            onReset={handleReset}
            shortenMode={shortenMode}
            onShortenModeChange={setShortenMode}
            emphasisMode={emphasisMode}
            onEmphasisModeChange={setEmphasisMode}
            restructureMode={restructureMode}
            onRestructureModeChange={setRestructureMode}
            imageData={imageData}
            onImageChange={setImageData}
            figureCaption={figureCaption}
            onFigureCaptionChange={setFigureCaption}
            publications={publications}
            selectedPublication={selectedPublication}
            onPublicationChange={setSelectedPublication}
            onCreatePublication={(title) => createPublicationMutation.mutate(title)}
            isLoadingPublications={isLoadingPublications}
            customInstructions={customInstructions}
            onCustomInstructionsChange={setCustomInstructions}
          />
          {!isFigure && (
            <SuggestionPanel
              originalText={originalTextForRewrite || text}
              rewriteResult={rewriteResult}
              isLoading={rewriteMutation.isPending}
              error={rewriteMutation.error?.message || null}
              onAccept={handleAcceptRewrite}
              onReject={handleRejectRewrite}
              onRetry={handleRequestRewrite}
              hasEvaluationResult={!!result}
              originalScore={result?.overallScore}
            />
          )}
          {restructureMode && !isFigure && (
            <RestructurePanel
              restructureResult={restructureResult}
              isLoading={restructureMutation.isPending}
              error={restructureMutation.error?.message || null}
              onApplySuggestion={applyRestructureSuggestion}
              onApplyAll={applyAllRestructures}
              appliedSuggestions={appliedRestructures}
            />
          )}
        </div>
        <ResultsPanel
          result={result}
          isLoading={evaluateMutation.isPending || figureEvaluateMutation.isPending}
          error={evaluateMutation.error?.message || figureEvaluateMutation.error?.message || null}
          sectionType={sectionType}
          selectedArguments={selectedArguments}
          onArgumentToggle={handleArgumentToggle}
        />
      </main>
    </div>
  );
}
