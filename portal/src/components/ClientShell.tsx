"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { FirstLaunchModal } from "@/components/FirstLaunchModal";
import { RightSidebar } from "@/components/RightSidebar";
import { ToastArea } from "@/components/ToastArea";
import { persistor, store } from "@/store";
import { initSession } from "@/store/sessionSlice";

function InitSession() {
  useEffect(() => {
    void store.dispatch(initSession());
  }, []);
  return null;
}

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <InitSession />
        <main className="shell">{children}</main>
        <RightSidebar />
        <FirstLaunchModal />
        <ToastArea />
      </PersistGate>
    </Provider>
  );
}
