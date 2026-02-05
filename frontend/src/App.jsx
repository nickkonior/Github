import { useEffect, useRef, useState } from "react";
import { Lipsync } from "wawa-lipsync";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./experience";

export default function App() {
  const audioRef = useRef(null);
  const lipsyncRef = useRef(null);
  const [viseme, setViseme] = useState("");

  useEffect(() => {
    if (!lipsyncRef.current) {
      // Μικρή ασφάλεια για να μην κρασάρει
      lipsyncRef.current = new Lipsync();
      // Συνδέουμε τον ήχο μόνο αν υπάρχει το audioRef
      if (audioRef.current) {
        lipsyncRef.current.connectAudio(audioRef.current);
      }
    }
  }, []);

  const playAudio = async () => {
    await audioRef.current.play();
    analyzeAudio(); //start
  };

  const analyzeAudio = () => {
    lipsyncRef.current.processAudio();
    // Logs
    console.log("Viseme:", lipsyncRef.current.viseme);
    setViseme(lipsyncRef.current.viseme);
    // loop while sound is playing
    if (!audioRef.current.paused) {
      requestAnimationFrame(analyzeAudio);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <Canvas camera={{ position: [0, 0.9, 1.8], fov: 65 }}>
          <Experience viseme={viseme} />
        </Canvas>
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: 20,
          color: "white",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <h1>Wawa Lipsync – Test</h1>

        <audio
          ref={audioRef}
          src="/audio_test/tzellos_cloned1.wav"
          preload="auto"
          crossOrigin="anonymous"
        />

        <br />
        <br />

        <button
          onClick={playAudio}
          style={{ 
            padding: "10px 20px", 
            fontSize: "16px", 
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            marginRight: "10px"
          }}
        >
          ▶️ Play + Lipsync
        </button>

        <p>Current Viseme: {viseme}</p>
      </div>
    </div>
  );
}
