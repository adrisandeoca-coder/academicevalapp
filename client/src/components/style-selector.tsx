import { useState } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings2, Info } from "lucide-react";
import {
  type WritingStyle,
  type WritingStylePreset,
  type WritingStyleDimensions,
  writingStylePresets,
  writingStyleLabels,
  writingStyleDescriptions,
  presetStyleDimensions,
} from "@shared/schema";

interface StyleSelectorProps {
  writingStyle: WritingStyle;
  onStyleChange: (style: WritingStyle) => void;
  disabled?: boolean;
}

const dimensionLabels: Record<keyof WritingStyleDimensions, { label: string; leftLabel: string; rightLabel: string }> = {
  formality: { label: "Formality", leftLabel: "Conversational", rightLabel: "Highly Formal" },
  sentenceComplexity: { label: "Sentence Length", leftLabel: "Short & Direct", rightLabel: "Long & Elaborate" },
  hedgingLevel: { label: "Hedging", leftLabel: "Assertive", rightLabel: "Cautious" },
  voice: { label: "Voice", leftLabel: "", rightLabel: "" },
  person: { label: "Person", leftLabel: "", rightLabel: "" },
  density: { label: "Density", leftLabel: "Spacious", rightLabel: "Compressed" },
  jargonTolerance: { label: "Jargon", leftLabel: "Accessible", rightLabel: "Specialist" },
};

const voiceOptions = [
  { value: "passive", label: "Passive" },
  { value: "mixed", label: "Mixed" },
  { value: "active", label: "Active" },
];

const personOptions = [
  { value: "third", label: "Third (The authors)" },
  { value: "first_plural", label: "First Plural (We)" },
  { value: "first_singular", label: "First Singular (I)" },
];

export function StyleSelector({ writingStyle, onStyleChange, disabled }: StyleSelectorProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);

  if (!writingStyle) {
    return null;
  }

  const handlePresetChange = (preset: WritingStylePreset) => {
    if (preset === "custom") {
      onStyleChange({
        preset: "custom",
        dimensions: { ...writingStyle.dimensions },
      });
    } else {
      onStyleChange({
        preset,
        dimensions: { ...presetStyleDimensions[preset] },
      });
    }
  };

  const handleDimensionChange = (key: keyof WritingStyleDimensions, value: number | string) => {
    const newDimensions = { ...writingStyle.dimensions, [key]: value };
    onStyleChange({
      preset: "custom",
      dimensions: newDimensions,
    });
  };

  const presetList = writingStylePresets.filter(p => p !== "custom");

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Select
          value={writingStyle.preset}
          onValueChange={(value) => handlePresetChange(value as WritingStylePreset)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" data-testid="select-writing-style">
            <SelectValue placeholder="Select writing style" />
          </SelectTrigger>
          <SelectContent>
            {presetList.map((preset) => (
              <SelectItem key={preset} value={preset} data-testid={`style-option-${preset}`}>
                <div className="flex flex-col items-start">
                  <span>{writingStyleLabels[preset]}</span>
                </div>
              </SelectItem>
            ))}
            {writingStyle.preset === "custom" && (
              <SelectItem value="custom" data-testid="style-option-custom">
                <span className="text-primary">Custom Style</span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled}
            data-testid="button-customize-style"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Customize Writing Style
              {writingStyle.preset !== "custom" && (
                <Badge variant="secondary" className="text-xs">
                  Based on {writingStyleLabels[writingStyle.preset]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-sm text-muted-foreground">
              Adjust these dimensions to match your target journal or discipline. Changes will switch to "Custom Style".
            </div>

            {(["formality", "sentenceComplexity", "hedgingLevel", "density", "jargonTolerance"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">{dimensionLabels[key].label}</Label>
                  <span className="text-sm text-muted-foreground">
                    {writingStyle.dimensions[key]}/5
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {dimensionLabels[key].leftLabel}
                  </span>
                  <Slider
                    value={[writingStyle.dimensions[key] as number]}
                    onValueChange={([val]) => handleDimensionChange(key, val)}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                    data-testid={`slider-${key}`}
                  />
                  <span className="text-xs text-muted-foreground w-20">
                    {dimensionLabels[key].rightLabel}
                  </span>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Voice</Label>
              <div className="flex gap-2">
                {voiceOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={writingStyle.dimensions.voice === opt.value ? "default" : "outline"}
                    onClick={() => handleDimensionChange("voice", opt.value)}
                    data-testid={`button-voice-${opt.value}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Person</Label>
              <div className="flex flex-wrap gap-2">
                {personOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={writingStyle.dimensions.person === opt.value ? "default" : "outline"}
                    onClick={() => handleDimensionChange("person", opt.value)}
                    data-testid={`button-person-${opt.value}`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Style affects both evaluation feedback and rewrite suggestions</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-xs text-muted-foreground max-w-[120px] truncate hidden sm:block">
            {writingStyleDescriptions[writingStyle.preset].split("(")[0].trim()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{writingStyleDescriptions[writingStyle.preset]}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
