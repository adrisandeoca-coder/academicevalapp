import { sql, relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, real, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const researchPapers = pgTable(
  "research_papers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("IDX_papers_user").on(table.userId)]
);

export const paperSections = pgTable(
  "paper_sections",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    paperId: varchar("paper_id").notNull().references(() => researchPapers.id, { onDelete: "cascade" }),
    sectionType: varchar("section_type", { length: 50 }).notNull(),
    content: text("content").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("IDX_sections_paper").on(table.paperId)]
);

export const evaluationHistory = pgTable(
  "evaluation_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    paperId: varchar("paper_id").references(() => researchPapers.id, { onDelete: "set null" }),
    sectionId: varchar("section_id").references(() => paperSections.id, { onDelete: "set null" }),
    sectionType: varchar("section_type", { length: 50 }).notNull(),
    originalText: text("original_text").notNull(),
    overallScore: real("overall_score").notNull(),
    criteriaScores: jsonb("criteria_scores").notNull(),
    generalFeedback: text("general_feedback").notNull(),
    keyPoints: jsonb("key_points"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_evaluations_user").on(table.userId),
    index("IDX_evaluations_paper").on(table.paperId),
  ]
);

export const rewriteHistory = pgTable(
  "rewrite_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    evaluationId: varchar("evaluation_id").notNull().references(() => evaluationHistory.id, { onDelete: "cascade" }),
    originalText: text("original_text").notNull(),
    suggestedText: text("suggested_text").notNull(),
    originalScore: real("original_score"),
    suggestedScore: real("suggested_score"),
    changes: jsonb("changes"),
    accepted: integer("accepted").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_rewrites_evaluation").on(table.evaluationId)]
);

export const researchPapersRelations = relations(researchPapers, ({ one, many }) => ({
  user: one(users, {
    fields: [researchPapers.userId],
    references: [users.id],
  }),
  sections: many(paperSections),
  evaluations: many(evaluationHistory),
}));

export const paperSectionsRelations = relations(paperSections, ({ one }) => ({
  paper: one(researchPapers, {
    fields: [paperSections.paperId],
    references: [researchPapers.id],
  }),
}));

export const evaluationHistoryRelations = relations(evaluationHistory, ({ one, many }) => ({
  user: one(users, {
    fields: [evaluationHistory.userId],
    references: [users.id],
  }),
  paper: one(researchPapers, {
    fields: [evaluationHistory.paperId],
    references: [researchPapers.id],
  }),
  rewrites: many(rewriteHistory),
}));

export const rewriteHistoryRelations = relations(rewriteHistory, ({ one }) => ({
  evaluation: one(evaluationHistory, {
    fields: [rewriteHistory.evaluationId],
    references: [evaluationHistory.id],
  }),
}));

// Academic disciplines for writing examples
export const academicDisciplines = [
  "engineering",
  "medicine",
  "social_sciences", 
  "business_management",
  "information_systems",
  "natural_sciences",
  "humanities",
  "law",
  "education",
] as const;

export type AcademicDiscipline = (typeof academicDisciplines)[number];

export const disciplineLabels: Record<AcademicDiscipline, string> = {
  engineering: "Engineering / Technical",
  medicine: "Medicine / Health Sciences",
  social_sciences: "Social Sciences",
  business_management: "Business & Management",
  information_systems: "Information Systems",
  natural_sciences: "Natural Sciences",
  humanities: "Humanities",
  law: "Law",
  education: "Education",
};

// High-quality academic writing examples for AI few-shot learning
export const writingExamples = pgTable(
  "writing_examples",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    discipline: varchar("discipline", { length: 50 }).notNull(),
    sectionType: varchar("section_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    excerpt: text("excerpt").notNull(),
    annotation: text("annotation"),
    qualityScore: real("quality_score").default(9.0),
    sourceJournal: varchar("source_journal", { length: 200 }),
    isActive: integer("is_active").default(1),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_examples_discipline").on(table.discipline),
    index("IDX_examples_section").on(table.sectionType),
    index("IDX_examples_discipline_section").on(table.discipline, table.sectionType),
  ]
);

export const insertWritingExampleSchema = createInsertSchema(writingExamples).omit({ id: true, createdAt: true });
export type WritingExample = typeof writingExamples.$inferSelect;
export type InsertWritingExample = z.infer<typeof insertWritingExampleSchema>;

export const insertPaperSchema = createInsertSchema(researchPapers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSectionSchema = createInsertSchema(paperSections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEvaluationSchema = createInsertSchema(evaluationHistory).omit({ id: true, createdAt: true });
export const insertRewriteSchema = createInsertSchema(rewriteHistory).omit({ id: true, createdAt: true });

export type ResearchPaper = typeof researchPapers.$inferSelect;
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type PaperSection = typeof paperSections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type EvaluationHistoryRecord = typeof evaluationHistory.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type RewriteHistoryRecord = typeof rewriteHistory.$inferSelect;
export type InsertRewrite = z.infer<typeof insertRewriteSchema>;
