"use client";

import { useEffect, useRef } from "react";

import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { clearArticles } from "@/store/articlesSlice";
import { clearOrchestration } from "@/store/orchestrationSlice";
import { resetAllToDefaults } from "@/store/promptsSlice";
import { setFirstLaunchAnswered } from "@/store/sessionSlice";

export function FirstLaunchModal() {
  const dispatch = useAppDispatch();
  const answered = useAppSelector((state) => state.session.firstLaunchAnswered);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!answered) {
      firstButtonRef.current?.focus();
    }
  }, [answered]);

  if (answered) {
    return null;
  }

  async function choose(isFirstTime: boolean) {
    await apiClient.postFirstLaunch(isFirstTime);
    if (isFirstTime) {
      dispatch(clearArticles());
      dispatch(clearOrchestration());
      dispatch(resetAllToDefaults());
    }
    dispatch(setFirstLaunchAnswered(true));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="first-launch-title">
        <div className="stack">
          <h1 id="first-launch-title">Is this your first time?</h1>
          <p>Start with a clean demo, or continue this session.</p>
          <div className="row">
            <button ref={firstButtonRef} className="btn primary" type="button" onClick={() => void choose(true)}>
              Yes, reset demo
            </button>
            <button className="btn" type="button" onClick={() => void choose(false)}>
              No, continue
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
