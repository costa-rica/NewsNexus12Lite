"use client";

import { ArticleTable } from "@/components/ArticleTable";
import { OrchestrationPanel } from "@/components/OrchestrationPanel";
import { RssSearchForm } from "@/components/RssSearchForm";

export function PipelinePage() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="grid min-w-0 gap-5">
        <RssSearchForm />
        <ArticleTable />
      </section>
      <div className="min-w-0 lg:w-[320px]">
        <OrchestrationPanel />
      </div>
    </div>
  );
}
