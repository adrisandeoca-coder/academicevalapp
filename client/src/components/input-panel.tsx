import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, RotateCcw, Minimize2, Upload, Image, X, Lightbulb, FolderOpen, Plus, FileText, Shuffle, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { sectionTypes, sectionLabels, type SectionType, type WritingStyle, isFigureSectionType, type ResearchPaper } from "@shared/schema";
import { StyleSelector } from "./style-selector";

interface InputPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  sectionType: SectionType;
  onSectionTypeChange: (type: SectionType) => void;
  writingStyle: WritingStyle;
  onWritingStyleChange: (style: WritingStyle) => void;
  onEvaluate: () => void;
  isLoading: boolean;
  hasResult: boolean;
  onReset: () => void;
  shortenMode: boolean;
  onShortenModeChange: (enabled: boolean) => void;
  emphasisMode: boolean;
  onEmphasisModeChange: (enabled: boolean) => void;
  restructureMode: boolean;
  onRestructureModeChange: (enabled: boolean) => void;
  imageData: string | null;
  onImageChange: (imageData: string | null) => void;
  figureCaption: string;
  onFigureCaptionChange: (caption: string) => void;
  publications: ResearchPaper[];
  selectedPublication: string | null;
  onPublicationChange: (paperId: string | null) => void;
  onCreatePublication: (title: string) => void;
  isLoadingPublications?: boolean;
  customInstructions: string;
  onCustomInstructionsChange: (instructions: string) => void;
}

export function InputPanel({
  text,
  onTextChange,
  sectionType,
  onSectionTypeChange,
  writingStyle,
  onWritingStyleChange,
  onEvaluate,
  isLoading,
  hasResult,
  onReset,
  shortenMode,
  onShortenModeChange,
  emphasisMode,
  onEmphasisModeChange,
  restructureMode,
  onRestructureModeChange,
  imageData,
  onImageChange,
  figureCaption,
  onFigureCaptionChange,
  publications,
  selectedPublication,
  onPublicationChange,
  onCreatePublication,
  isLoadingPublications,
  customInstructions,
  onCustomInstructionsChange,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPubDialogOpen, setNewPubDialogOpen] = useState(false);
  const [newPubTitle, setNewPubTitle] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const isFigure = isFigureSectionType(sectionType);

  const handleCreatePublication = () => {
    if (newPubTitle.trim()) {
      onCreatePublication(newPubTitle.trim());
      setNewPubTitle("");
      setNewPubDialogOpen(false);
    }
  };

  const selectedPubName = publications?.find(p => p.id === selectedPublication)?.title;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const canEvaluate = isFigure ? !!imageData : !!text.trim();

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {isFigure ? (
            <Image className="w-5 h-5 text-muted-foreground" />
          ) : (
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          )}
          {isFigure ? "Upload Your Figure" : "Input Your Text"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Publication
          </label>
          <div className="flex gap-2">
            <Select
              value={selectedPublication || "none"}
              onValueChange={(value) => onPublicationChange(value === "none" ? null : value)}
              disabled={isLoading || isLoadingPublications}
            >
              <SelectTrigger
                className="flex-1"
                data-testid="select-publication"
              >
                <SelectValue placeholder="Select or create publication..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="publication-option-none">
                  <span className="text-muted-foreground">No publication (standalone)</span>
                </SelectItem>
                {(publications || []).map((pub) => (
                  <SelectItem key={pub.id} value={pub.id} data-testid={`publication-option-${pub.id}`}>
                    <span className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {pub.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={newPubDialogOpen} onOpenChange={setNewPubDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" disabled={isLoading} data-testid="button-new-publication">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Publication</DialogTitle>
                  <DialogDescription>
                    Create a publication to group your evaluations. The AI will remember all text you submit for this publication.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="e.g., Digital Twins Research Paper"
                    value={newPubTitle}
                    onChange={(e) => setNewPubTitle(e.target.value)}
                    data-testid="input-publication-title"
                    onKeyDown={(e) => e.key === "Enter" && handleCreatePublication()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewPubDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePublication} disabled={!newPubTitle.trim()} data-testid="button-create-publication">
                    Create Publication
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {selectedPublication && (
            <p className="text-xs text-muted-foreground">
              AI will remember all text submitted for "{selectedPubName}" and provide context-aware feedback.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Section Type
          </label>
          <Select
            value={sectionType}
            onValueChange={(value) => onSectionTypeChange(value as SectionType)}
            disabled={isLoading}
          >
            <SelectTrigger
              className="w-full"
              data-testid="select-section-type"
            >
              <SelectValue placeholder="Select section type" />
            </SelectTrigger>
            <SelectContent>
              {sectionTypes.map((type) => (
                <SelectItem key={type} value={type} data-testid={`section-option-${type}`}>
                  {sectionLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isFigure && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Writing Style
            </label>
            <StyleSelector
              writingStyle={writingStyle}
              onStyleChange={onWritingStyleChange}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-testid="toggle-custom-instructions"
          >
            {showInstructions ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <MessageSquare className="w-4 h-4" />
            Custom Instructions
            {customInstructions && !showInstructions && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Active</span>
            )}
          </button>
          {showInstructions && (
            <div className="space-y-1">
              <Textarea
                value={customInstructions}
                onChange={(e) => onCustomInstructionsChange(e.target.value.slice(0, 500))}
                placeholder="Add your own guidance, e.g., 'Write for a broader audience', 'Simplify language', 'Emphasize the novelty'..."
                className="min-h-[80px] resize-none text-sm"
                disabled={isLoading}
                data-testid="input-custom-instructions"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Guide the AI's evaluation and rewriting</span>
                <span>{customInstructions.length}/500</span>
              </div>
            </div>
          )}
        </div>

        {isFigure ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Figure Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-figure-file"
              />
              {imageData ? (
                <div className="relative border rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={imageData}
                    alt="Uploaded figure"
                    className="w-full max-h-[280px] object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => onImageChange(null)}
                    disabled={isLoading}
                    data-testid="button-remove-image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  data-testid="dropzone-figure"
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or GIF</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Figure Caption (Optional)
              </label>
              <Input
                value={figureCaption}
                onChange={(e) => onFigureCaptionChange(e.target.value)}
                placeholder="Enter the figure caption for context..."
                disabled={isLoading}
                data-testid="input-figure-caption"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Your Text
              </label>
              <div className="relative">
                <Textarea
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  placeholder="Paste or type your academic text here..."
                  className="min-h-[320px] resize-none text-base leading-relaxed font-serif"
                  disabled={isLoading}
                  data-testid="input-text"
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                  {wordCount} words · {charCount} characters
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="shorten-mode" className="text-sm font-medium cursor-pointer">
                    Also shorten text
                  </Label>
                </div>
                <Switch
                  id="shorten-mode"
                  checked={shortenMode}
                  onCheckedChange={onShortenModeChange}
                  disabled={isLoading}
                  data-testid="switch-shorten-mode"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <Label htmlFor="emphasis-mode" className="text-sm font-medium cursor-pointer">
                    Add emphasis suggestions
                  </Label>
                </div>
                <Switch
                  id="emphasis-mode"
                  checked={emphasisMode}
                  onCheckedChange={onEmphasisModeChange}
                  disabled={isLoading}
                  data-testid="switch-emphasis-mode"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="restructure-mode" className="text-sm font-medium cursor-pointer">
                    Suggest restructuring
                  </Label>
                </div>
                <Switch
                  id="restructure-mode"
                  checked={restructureMode}
                  onCheckedChange={onRestructureModeChange}
                  disabled={isLoading}
                  data-testid="switch-restructure-mode"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={onEvaluate}
            disabled={!canEvaluate || isLoading}
            className="flex-1"
            data-testid="button-evaluate"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {isFigure ? "Evaluate Figure" : (shortenMode ? "Evaluate & Shorten" : "Evaluate")}
              </>
            )}
          </Button>
          {hasResult && (
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isLoading}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
