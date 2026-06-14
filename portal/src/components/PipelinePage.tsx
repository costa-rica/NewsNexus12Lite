"use client";

import { ArticleTable } from "@/components/ArticleTable";
import { OrchestrationPanel } from "@/components/OrchestrationPanel";
import { RssSearchForm } from "@/components/RssSearchForm";

export function PipelinePage() {
  return (
    <div className="page-grid">
      <section className="stack">
        <RssSearchForm />
        <ArticleTable />
      </section>
      <OrchestrationPanel />
    </div>
  );
}
