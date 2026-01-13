import { researchPapers, paperSections, evaluationHistory, rewriteHistory, type ResearchPaper, type InsertPaper, type PaperSection, type InsertSection, type EvaluationHistoryRecord, type InsertEvaluation, type RewriteHistoryRecord, type InsertRewrite } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getPapers(userId: string): Promise<ResearchPaper[]>;
  getPaper(id: string, userId: string): Promise<ResearchPaper | undefined>;
  createPaper(paper: InsertPaper): Promise<ResearchPaper>;
  updatePaper(id: string, paper: Partial<InsertPaper>): Promise<ResearchPaper | undefined>;
  deletePaper(id: string): Promise<void>;
  
  getSections(paperId: string): Promise<PaperSection[]>;
  createSection(section: InsertSection): Promise<PaperSection>;
  
  getEvaluationHistory(userId: string, limit?: number): Promise<EvaluationHistoryRecord[]>;
  createEvaluation(evaluation: InsertEvaluation): Promise<EvaluationHistoryRecord>;
  
  getRewriteHistory(evaluationId: string): Promise<RewriteHistoryRecord[]>;
  createRewrite(rewrite: InsertRewrite): Promise<RewriteHistoryRecord>;
}

export class DatabaseStorage implements IStorage {
  async getPapers(userId: string): Promise<ResearchPaper[]> {
    return db
      .select()
      .from(researchPapers)
      .where(eq(researchPapers.userId, userId))
      .orderBy(desc(researchPapers.updatedAt));
  }

  async getPaper(id: string, userId: string): Promise<ResearchPaper | undefined> {
    const [paper] = await db
      .select()
      .from(researchPapers)
      .where(and(eq(researchPapers.id, id), eq(researchPapers.userId, userId)));
    return paper;
  }

  async createPaper(paper: InsertPaper): Promise<ResearchPaper> {
    const [created] = await db.insert(researchPapers).values(paper).returning();
    return created;
  }

  async updatePaper(id: string, paper: Partial<InsertPaper>): Promise<ResearchPaper | undefined> {
    const [updated] = await db
      .update(researchPapers)
      .set({ ...paper, updatedAt: new Date() })
      .where(eq(researchPapers.id, id))
      .returning();
    return updated;
  }

  async deletePaper(id: string): Promise<void> {
    await db.delete(researchPapers).where(eq(researchPapers.id, id));
  }

  async getSections(paperId: string): Promise<PaperSection[]> {
    return db
      .select()
      .from(paperSections)
      .where(eq(paperSections.paperId, paperId))
      .orderBy(paperSections.orderIndex);
  }

  async createSection(section: InsertSection): Promise<PaperSection> {
    const [created] = await db.insert(paperSections).values(section).returning();
    return created;
  }

  async getEvaluationHistory(userId: string, limit = 50): Promise<EvaluationHistoryRecord[]> {
    return db
      .select()
      .from(evaluationHistory)
      .where(eq(evaluationHistory.userId, userId))
      .orderBy(desc(evaluationHistory.createdAt))
      .limit(limit);
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<EvaluationHistoryRecord> {
    const [created] = await db.insert(evaluationHistory).values(evaluation).returning();
    return created;
  }

  async getRewriteHistory(evaluationId: string): Promise<RewriteHistoryRecord[]> {
    return db
      .select()
      .from(rewriteHistory)
      .where(eq(rewriteHistory.evaluationId, evaluationId))
      .orderBy(desc(rewriteHistory.createdAt));
  }

  async createRewrite(rewrite: InsertRewrite): Promise<RewriteHistoryRecord> {
    const [created] = await db.insert(rewriteHistory).values(rewrite).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
