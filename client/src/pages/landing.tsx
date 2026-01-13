import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Target, History, Sparkles, Shield, Zap } from "lucide-react";

export default function Landing() {
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
            <a href="/api/login">
              <Button data-testid="button-login">Sign In</Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-5xl font-serif font-bold tracking-tight">
                  Elevate Your Academic Writing
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Get instant AI-powered feedback on your research papers. Our evaluator scores your text against 
                  section-specific criteria used by top journal reviewers, then suggests improvements that preserve 
                  your original meaning.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/api/login">
                    <Button size="lg" data-testid="button-get-started">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Get Started Free
                    </Button>
                  </a>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Free to use</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Instant feedback</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-8 lg:p-10">
                  <div className="space-y-4">
                    <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Abstract Score</span>
                        <span className="text-2xl font-bold text-primary">8.2</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '82%' }} />
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                      <div className="text-sm font-medium mb-2">Suggested Improvement</div>
                      <p className="text-sm text-muted-foreground">
                        "Consider strengthening your main findings statement by quantifying the impact..."
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                          +0.8 score improvement
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI rewrite ready for your review
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl lg:text-3xl font-serif font-bold mb-4">
                Built for Researchers
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Whether you're writing your first paper or your hundredth, get the feedback you need to publish with confidence.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Section-Specific Criteria</h4>
                  <p className="text-sm text-muted-foreground">
                    Evaluate titles, abstracts, introductions, methodology, results, discussion, and conclusions 
                    against the exact criteria journal reviewers use.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">AI-Powered Rewrites</h4>
                  <p className="text-sm text-muted-foreground">
                    Get intelligent rewrite suggestions that improve your score while preserving your original 
                    meaning. Never adds citations, data, or claims you didn't write.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Research Memory</h4>
                  <p className="text-sm text-muted-foreground">
                    Save your papers and track your writing history. The AI remembers your past work to provide 
                    personalized insights across your research.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl lg:text-3xl font-serif font-bold mb-4">
              Ready to improve your academic writing?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join researchers who use AI to get their papers published faster.
            </p>
            <a href="/api/login">
              <Button size="lg" data-testid="button-cta-bottom">
                Start Evaluating Free
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground text-center">
            Academic Writing Evaluator - AI-powered feedback for scholarly papers
          </p>
        </div>
      </footer>
    </div>
  );
}
