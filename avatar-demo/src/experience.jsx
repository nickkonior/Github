import { OrbitControls, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";

/**
 * Mapping from wawa-lipsync visemes to ARKit blendshapes
 * Each viseme maps to one or more ARKit blendshapes with intensity values
 */
const VISEME_TO_ARKIT_MAP = {
  // Silence - neutral mouth
  viseme_sil: {},
  
  // "aa" sound (as in "father") - open jaw, open mouth
  viseme_aa: {
    jawOpen: 0.7,
    mouthOpen: 0.6,
  },
  
  // "E" sound (as in "bed") - slight smile, medium jaw
  viseme_E: {
    jawOpen: 0.3,
    mouthSmileLeft: 0.4,
    mouthSmileRight: 0.4,
    mouthOpen: 0.3,
  },
  
  // "I" sound (as in "see") - wide smile
  viseme_I: {
    jawOpen: 0.2,
    mouthSmileLeft: 0.6,
    mouthSmileRight: 0.6,
  },
  
  // "O" sound (as in "go") - rounded lips, open jaw
  viseme_O: {
    jawOpen: 0.5,
    mouthFunnel: 0.5,
    mouthPucker: 0.3,
  },
  
  // "U" sound (as in "food") - pursed/puckered lips
  viseme_U: {
    jawOpen: 0.2,
    mouthPucker: 0.7,
    mouthFunnel: 0.4,
  },
  
  // "PP" sound (p, b, m) - lips pressed together
  viseme_PP: {
    mouthClose: 0.8,
    mouthPressLeft: 0.5,
    mouthPressRight: 0.5,
  },
  
  // "FF" sound (f, v) - lower lip tucked under teeth
  viseme_FF: {
    mouthFunnel: 0.3,
    mouthLowerDownLeft: 0.4,
    mouthLowerDownRight: 0.4,
  },
  
  // "TH" sound (th) - tongue between teeth
  viseme_TH: {
    jawOpen: 0.2,
    mouthOpen: 0.2,
    mouthLowerDownLeft: 0.3,
    mouthLowerDownRight: 0.3,
  },
  
  // "DD" sound (t, d) - tongue tap
  viseme_DD: {
    jawOpen: 0.25,
    mouthOpen: 0.2,
  },
  
  // "kk" sound (k, g) - back of tongue
  viseme_kk: {
    jawOpen: 0.3,
    mouthOpen: 0.25,
  },
  
  // "CH" sound (ch, j, sh) - teeth close, lips forward
  viseme_CH: {
    jawOpen: 0.15,
    mouthFunnel: 0.4,
    mouthShrugUpper: 0.3,
  },
  
  // "SS" sound (s, z) - teeth close together
  viseme_SS: {
    jawOpen: 0.1,
    mouthSmileLeft: 0.2,
    mouthSmileRight: 0.2,
  },
  
  // "nn" sound (n, l) - tongue to roof
  viseme_nn: {
    jawOpen: 0.2,
    mouthOpen: 0.15,
  },
  
  // "RR" sound (r) - lips slightly rounded
  viseme_RR: {
    jawOpen: 0.25,
    mouthPucker: 0.2,
    mouthOpen: 0.2,
  },
};

// Smoothing factor for interpolation (0 = instant, 1 = no change)
const LERP_FACTOR = 0.35;

// Linear interpolation helper
const lerp = (start, end, factor) => start + (end - start) * factor;

export const Experience = ({ viseme }) => {
  const { nodes, scene } = useGLTF("/model.glb");
  
  // Store current blendshape values for smooth interpolation
  const currentInfluences = useRef({});
  
  // Find the mesh with morph targets (ARKit blendshapes)
  const headMesh = useMemo(() => {
    // Common node names for Avaturn/RPM models
    const possibleNames = ["Wolf3D_Head", "Wolf3D_Avatar", "Head", "head"];
    
    for (const name of possibleNames) {
      if (nodes[name]?.morphTargetDictionary) {
        console.log("Found morph targets on:", name);
        console.log("Available blendshapes:", Object.keys(nodes[name].morphTargetDictionary));
        return nodes[name];
      }
    }
    
    // Fallback: find any mesh with morph targets
    const meshWithMorphs = Object.values(nodes).find(
      (node) => node.morphTargetDictionary && node.morphTargetInfluences
    );
    
    if (meshWithMorphs) {
      console.log("Found morph targets on fallback mesh");
      console.log("Available blendshapes:", Object.keys(meshWithMorphs.morphTargetDictionary));
    }
    
    return meshWithMorphs;
  }, [nodes]);

  // Also check for teeth mesh (some models have separate teeth)
  const teethMesh = useMemo(() => {
    return nodes.Wolf3D_Teeth || nodes.Teeth || null;
  }, [nodes]);

  // Initialize current influences
  useEffect(() => {
    if (headMesh?.morphTargetDictionary) {
      Object.keys(headMesh.morphTargetDictionary).forEach((key) => {
        currentInfluences.current[key] = 0;
      });
    }
  }, [headMesh]);

  // Use useFrame for smooth real-time animation
  useFrame(() => {
    if (!headMesh?.morphTargetDictionary || !headMesh?.morphTargetInfluences) {
      return;
    }

    const dictionary = headMesh.morphTargetDictionary;
    const influences = headMesh.morphTargetInfluences;
    
    // Get target values from the mapping
    const targetBlendshapes = VISEME_TO_ARKIT_MAP[viseme] || {};

    // Update all blendshapes with interpolation
    Object.keys(dictionary).forEach((blendshapeName) => {
      const index = dictionary[blendshapeName];
      const targetValue = targetBlendshapes[blendshapeName] || 0;
      const currentValue = currentInfluences.current[blendshapeName] || 0;
      
      // Smooth interpolation
      const newValue = lerp(currentValue, targetValue, LERP_FACTOR);
      
      // Update stored value and mesh
      currentInfluences.current[blendshapeName] = newValue;
      influences[index] = newValue;
    });

    // Also update teeth if they have matching morph targets
    if (teethMesh?.morphTargetDictionary && teethMesh?.morphTargetInfluences) {
      Object.keys(teethMesh.morphTargetDictionary).forEach((blendshapeName) => {
        const index = teethMesh.morphTargetDictionary[blendshapeName];
        const value = currentInfluences.current[blendshapeName] || 0;
        teethMesh.morphTargetInfluences[index] = value;
      });
    }
  });

  return (
    <>
      {/* Camera controls - target the head area */}
      <OrbitControls 
        target={[0, 0.5, 0]} 
        enablePan={false}
        minDistance={0.5}
        maxDistance={3}
      />
      
      {/* Lighting for better visibility */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, 5]} intensity={0.4} />
      
      {/* Avatar model - positioned to show head and upper body */}
      <primitive 
        object={scene} 
        position={[0, -0.5, 0]} 
        scale={1} 
      />
    </>
  );
};