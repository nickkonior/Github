import { useEffect, useRef } from "react";
import { Lipsync } from "wawa-lipsync";

export default function App() {
  const audioRef = useRef(null);
  const lipsyncRef = useRef(null);

  useEffect(() => {
    lipsyncRef.current = new Lipsync();
    lipsyncRef.current.connectAudio(audioRef.current);
  }, []);

  const playAudio = async () => {
    await audioRef.current.play();
  };

  const analyzeAudio = () => {
    lipsyncRef.current.processAudio();
    console.log("Viseme:", lipsyncRef.current.viseme);
    requestAnimationFrame(analyzeAudio);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Wawa Lipsync – Test</h1>

      <audio
        ref={audioRef}
        src="/audio_test/tzellos_cloned1.wav"
        preload="auto"
        crossOrigin="anonymous"
      />

      <br /><br />

      <button
        onClick={() => {
          playAudio();
          analyzeAudio();
        }}
      >
        ▶️ Play + Lipsync
      </button>
    </div>
  );
}
