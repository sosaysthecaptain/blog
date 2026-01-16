"use client";

import { createContext, useContext, ReactNode } from "react";
import { useMusicQueue, MusicQueueState, MusicQueueActions } from "@/hooks/useMusicQueue";

type MusicQueueContextType = MusicQueueState & MusicQueueActions;

const MusicQueueContext = createContext<MusicQueueContextType | null>(null);

export function MusicQueueProvider({ children }: { children: ReactNode }) {
  const musicQueue = useMusicQueue();

  return (
    <MusicQueueContext.Provider value={musicQueue}>
      {children}
    </MusicQueueContext.Provider>
  );
}

export function useMusicQueueContext() {
  const context = useContext(MusicQueueContext);
  if (!context) {
    throw new Error("useMusicQueueContext must be used within a MusicQueueProvider");
  }
  return context;
}
