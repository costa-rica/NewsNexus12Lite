import { Router } from "express";

import { isStageName } from "./orchestration";

export const articlesRouter = Router();

articlesRouter.get("/:articleId", (req, res) => {
  const article = res.locals.session.articles.find((item) => item.id === req.params.articleId);
  if (!article) {
    res.status(404).json({ result: false, error: "Article not found." });
    return;
  }
  res.json({ result: true, data: { article } });
});

articlesRouter.get("/:articleId/explanations/:stage", (req, res) => {
  if (!isStageName(req.params.stage)) {
    res.status(400).json({ result: false, error: "Invalid stage." });
    return;
  }
  const article = res.locals.session.articles.find((item) => item.id === req.params.articleId);
  if (!article) {
    res.status(404).json({ result: false, error: "Article not found." });
    return;
  }
  const result = article.pipeline[req.params.stage];
  if (result.status === "pending" || result.status === "running") {
    res.status(404).json({ result: false, error: "Explanation is not available yet." });
    return;
  }
  if (result.status === "failed") {
    res.status(422).json({ result: false, error: result.error ?? "Stage failed." });
    return;
  }

  res.json({
    result: true,
    data: {
      stage: req.params.stage,
      score: result.score ?? result.locationScore ?? result.semanticScore,
      assignedState: result.assignedState,
      confidence: result.confidence,
      reasoning: result.reasoning ?? result.finalReasoning,
      explanation: result.explanation,
      promptInput: result.promptInput ?? result.gateway?.promptInput,
      promptOutput: result.promptOutput ?? result.gateway?.promptOutput,
      gateway: result.gateway,
      hazards: result.hazards,
      finalStatus: result.finalStatus,
      createdAt: result.completedAt
    }
  });
});

export default articlesRouter;
