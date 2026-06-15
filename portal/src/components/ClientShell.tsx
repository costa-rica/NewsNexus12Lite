"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { FirstLaunchModal } from "@/components/FirstLaunchModal";
import { DescriptionModal } from "@/components/DescriptionModal";
import { ExplanationModal } from "@/components/ExplanationModal";
import { RightSidebar } from "@/components/RightSidebar";
import { TopBar } from "@/components/TopBar";
import { ToastArea } from "@/components/ToastArea";
import { ThemeProvider } from "@/context/ThemeContext";
import { persistor, store } from "@/store";
import { initSession } from "@/store/sessionSlice";

function InitSession() {
  useEffect(() => {
    void store.dispatch(initSession());
  }, []);
  return null;
}

function ShellContent({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <InitSession />
      <TopBar />
      <main className="min-h-[calc(100vh-4rem)] px-4 py-6 xl:px-6">{children}</main>
      <RightSidebar />
      <FirstLaunchModal />
      <DescriptionModal />
      <ExplanationModal />
      <ToastArea />
    </ThemeProvider>
  );
}

export function ClientShell({ children }: { children: ReactNode }) {
  const shell = <ShellContent>{children}</ShellContent>;

  return (
    <Provider store={store}>
      <PersistGate loading={shell} persistor={persistor}>
        {shell}
      </PersistGate>
    </Provider>
  );
}
