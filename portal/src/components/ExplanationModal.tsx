"use client";

import { Modal } from "@/components/ui/modal/Modal";
import { STAGES } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { closeExplanationModal } from "@/store/uiSlice";

export function ExplanationModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isExplanationModalOpen);
  const selected = useAppSelector((state) => state.ui.selectedExplanation);
  const stageLabel = STAGES.find((stage) => stage.key === selected?.stage)?.label ?? selected?.stage ?? "Explanation";

  return (
    <Modal isOpen={isOpen} onClose={() => dispatch(closeExplanationModal())} titleId="explanation-modal-title">
      <div className="grid max-h-[calc(100vh-2rem)] gap-5 overflow-y-auto p-6 pr-14">
        <div>
          <h2 id="explanation-modal-title" className="text-title-sm font-semibold text-gray-900 dark:text-white">
            {stageLabel}
          </h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">Pipeline reasoning and prompt context.</p>
        </div>
        {selected ? (
          <div className="grid gap-4">
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">Reasoning</h3>
              <p className="whitespace-pre-wrap text-theme-sm leading-6 text-gray-600 dark:text-gray-300">
                {selected.reasoning ?? selected.finalStatus ?? "No reasoning returned."}
              </p>
            </section>
            <dl className="grid gap-3 text-theme-sm sm:grid-cols-3">
              {selected.score !== undefined ? (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">Score</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{selected.score.toFixed(2)}</dd>
                </div>
              ) : null}
              {selected.confidence !== undefined ? (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">Confidence</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{selected.confidence}</dd>
                </div>
              ) : null}
              {selected.assignedState ? (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <dt className="text-gray-500 dark:text-gray-400">Assigned State</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{selected.assignedState}</dd>
                </div>
              ) : null}
            </dl>
            {selected.promptInput ? (
              <section>
                <h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">Prompt Input</h3>
                <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-theme-xs leading-5 text-gray-100 dark:border-gray-800">
                  {selected.promptInput}
                </pre>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">No explanation selected.</p>
        )}
      </div>
    </Modal>
  );
}
