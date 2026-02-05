import { useEffect, useRef, useState } from "react"; // Προσθέσαμε το useState
import { Lipsync } from "wawa-lipsync";
import { Canvas } from "@react-three/fiber"; // ΝΕΟ: Για τα 3D
import { Experience } from "./experience";     // ΝΕΟ: Το αρχείο που φτιάξαμε

export default function App() {
  const audioRef = useRef(null);
  const lipsyncRef = useRef(null);
  const [viseme, setViseme] = useState(""); // ΝΕΟ: Εδώ αποθηκεύουμε την κίνηση για να τη στείλουμε στο Avatar

  useEffect(() => {
    if (!lipsyncRef.current) { // Μικρή ασφάλεια για να μην κρασάρει
        lipsyncRef.current = new Lipsync();
        // Συνδέουμε τον ήχο μόνο αν υπάρχει το audioRef
        if(audioRef.current) {
            lipsyncRef.current.connectAudio(audioRef.current);
        }
    }
  }, []);

  const playAudio = async () => {
    await audioRef.current.play();
    analyzeAudio(); // Ξεκινάμε την ανάλυση
  };

  const analyzeAudio = () => {
    lipsyncRef.current.processAudio();
    
    // Κρατάμε την παλιά σου λειτουργικότητα (Logs)
    console.log("Viseme:", lipsyncRef.current.viseme); 
    
    // ΝΕΟ: Ενημερώνουμε και το Avatar
    setViseme(lipsyncRef.current.viseme);

    // Συνεχίζουμε τη λούπα όσο παίζει ο ήχος
    if(!audioRef.current.paused) {
        requestAnimationFrame(analyzeAudio);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
        
      {/* ΝΕΟ: Ο χώρος του 3D Avatar (Πιάνει όλη την οθόνη από πίσω) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
          <Canvas camera={{ position: [0, 0.9, 1.8], fov: 65 }}>
            {/* Περνάμε το viseme στο Avatar */}
            <Experience viseme={viseme} />
          </Canvas>
      </div>

      {/* ΤΟ ΠΑΛΙΟ UI ΣΟΥ (Το βάζουμε από πάνω με zIndex) */}
      <div style={{ position: "relative", zIndex: 10, padding: 20, color: "white", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <h1>Wawa Lipsync – Test</h1>

        <audio
          ref={audioRef}
          src="/audio_test/tzellos_cloned1.wav"
          preload="auto"
          crossOrigin="anonymous"
        />

        <br /><br />

        <button
          onClick={playAudio}
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
        >
          ▶️ Play + Lipsync
        </button>
        
        {/* Ένας δείκτης για να βλέπουμε τι διαβάζει */}
        <p>Current Viseme: {viseme}</p>
      </div>
    </div>
  );
}