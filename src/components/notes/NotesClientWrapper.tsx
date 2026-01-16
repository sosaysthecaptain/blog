"use client";

import { ReactNode } from "react";
import { MusicQueueProvider, useMusicQueueContext } from "@/contexts/MusicQueueContext";
import MusicPlayer from "@/components/notes/MusicPlayer";

function MusicPlayerContainer() {
  const musicQueue = useMusicQueueContext();

  return (
    <MusicPlayer
      currentSong={musicQueue.currentSong}
      isPlaying={musicQueue.isPlaying}
      currentTime={musicQueue.currentTime}
      duration={musicQueue.duration}
      volume={musicQueue.volume}
      isMuted={musicQueue.isMuted}
      queue={musicQueue.queue}
      currentIndex={musicQueue.currentIndex}
      onPlayPause={musicQueue.togglePlayPause}
      onNext={musicQueue.next}
      onPrevious={musicQueue.previous}
      onSeek={musicQueue.seek}
      onVolumeChange={musicQueue.setVolume}
      onToggleMute={musicQueue.toggleMute}
      onPlayFromQueue={musicQueue.playFromQueue}
      onRemoveFromQueue={musicQueue.removeFromQueue}
      onReorderQueue={musicQueue.reorderQueue}
      onClearQueue={musicQueue.clearQueue}
    />
  );
}

export default function NotesClientWrapper({ children }: { children: ReactNode }) {
  return (
    <MusicQueueProvider>
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col">{children}</div>
        <MusicPlayerContainer />
      </div>
    </MusicQueueProvider>
  );
}
