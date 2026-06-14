"use client";

import { ArticleRow } from "@/components/ArticleRow";
import { useAppSelector } from "@/hooks/store";

export function ArticleTable() {
  const { items, lastSearchHadResults } = useAppSelector((state) => state.articles);

  if (items.length === 0) {
    return (
      <div className="table-wrap">
        <p>{lastSearchHadResults === false ? "No articles found for this query." : "Run a search to load articles for processing."}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Source</th>
            <th>Description</th>
            <th>Location Score</th>
            <th>Assigned State</th>
            <th>Semantic Score</th>
            <th>AI Approval Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((article) => (
            <ArticleRow key={article.id} article={article} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
