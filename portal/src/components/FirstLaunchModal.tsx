"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal/Modal";
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
    <Modal isOpen={!answered} onClose={() => void choose(false)} titleId="first-launch-title" className="max-w-md">
      <div className="grid gap-5 p-6 pr-14">
        <div>
          <h1 id="first-launch-title" className="text-title-sm font-semibold text-gray-900 dark:text-white">
            Is this your first time?
          </h1>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">Start with a clean demo, or continue this session.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button ref={firstButtonRef} type="button" onClick={() => void choose(true)}>
            Yes, reset demo
          </Button>
          <Button variant="outline" type="button" onClick={() => void choose(false)}>
            No, continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
