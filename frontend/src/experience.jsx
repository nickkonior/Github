import { OrbitControls, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/**
 * Mapping from wawa-lipsync visemes to available blendshapes
 * This model ONLY has: mouthOpen and mouthSmile
 * 
 * Strategy:
 * - Open mouth sounds (aa, O, U, etc.) -> mouthOpen
 * - Smile sounds (E, I, etc.) -> mouthSmile
 * - Combine both for certain sounds
 */
const visemeToARKitMap = {
  viseme_sil: {}, // Silence
  
  viseme_aa: {
    mouthOpen: 0.9,
  },
  
  viseme_E: {
    mouthSmile: 0.6,
    mouthOpen: 0.3,
  },
  
  viseme_I: {
    mouthSmile: 0.8,
    mouthOpen: 0.2,
  },
  
  viseme_O: {
    mouthOpen: 0.7,
  },
  
  viseme_U: {
    mouthOpen: 0.5,
  },
  
  viseme_PP: {
    mouthOpen: 0.0, // Closed
  },
  
  viseme_FF: {
    mouthOpen: 0.3,
  },
  
  viseme_TH: {
    mouthOpen: 0.4,
  },
  
  viseme_DD: {
    mouthOpen: 0.35,
  },
  
  viseme_kk: {
    mouthOpen: 0.5,
  },
  
  viseme_CH: {
    mouthOpen: 0.3,
  },
  
  viseme_SS: {
    mouthSmile: 0.4,
    mouthOpen: 0.15,
  },
  
  viseme_nn: {
    mouthOpen: 0.25,
  },
  
  viseme_RR: {
    mouthOpen: 0.4,
  },
};

// Smoothing factor for interpolation (0-1, lower = smoother)
const LERP_FACTOR = 0.3;

// Linear interpolation helper
const lerp = (current, target, factor) => current + (target - current) * factor;

export const Experience = ({ viseme }) => {
  const { scene } = useGLTF("/avatar.glb");
  
  // Store references to meshes with morph targets
  const headMeshRef = useRef(null);
  const teethMeshRef = useRef(null);
  const hasTraversed = useRef(false);
  const hasLoggedAnimation = useRef(false);

  /**
   * Traverse the scene to find all meshes with morphTargetInfluences
   * This runs once when the model is loaded
   */
  useEffect(() => {
    if (hasTraversed.current || !scene) return;

    console.log("🔍 Traversing scene to find morph targets...");
    console.log("Scene object:", scene);
    
    let allMeshes = [];
    
    scene.traverse((object) => {
      // Log ALL meshes for debugging
      if (object.isMesh) {
        allMeshes.push({
          name: object.name,
          hasMorphTargets: !!object.morphTargetInfluences,
          morphCount: object.morphTargetInfluences?.length || 0,
        });
        
        console.log(`Found mesh: "${object.name}"`, {
          type: object.type,
          hasMorphTargetInfluences: !!object.morphTargetInfluences,
          hasMorphTargetDictionary: !!object.morphTargetDictionary,
          morphCount: object.morphTargetInfluences?.length || 0,
        });
      }
      
      if (object.isMesh && object.morphTargetInfluences && object.morphTargetDictionary) {
        const blendshapeCount = object.morphTargetInfluences.length;
        
        // THE FIX: Get blendshape names from geometry, not dictionary
        const blendshapeNames = object.geometry?.morphAttributes?.position 
          ? Object.keys(object.geometry.userData?.targetNames || object.morphTargetDictionary)
          : Object.keys(object.morphTargetDictionary);
        
        console.log(`\n✅ Found mesh with morph targets: "${object.name}"`);
        console.log(`   Blendshape count: ${blendshapeCount}`);
        console.log(`   Available blendshapes:`, blendshapeNames);
        console.log(`   Raw dictionary:`, object.morphTargetDictionary);
        console.log(`   Geometry userData:`, object.geometry?.userData);
        
        // Try to identify head vs teeth based on name
        const nameLower = object.name.toLowerCase();
        if (nameLower.includes("teeth")) {
          teethMeshRef.current = object;
          console.log("   → Assigned as TEETH mesh");
        } else if (nameLower.includes("head") || nameLower.includes("wolf3d_head")) {
          // Prioritize Wolf3D_Head over other meshes
          headMeshRef.current = object;
          console.log("   → Assigned as HEAD mesh (priority)");
        } else if (!headMeshRef.current && !nameLower.includes("eye")) {
          // First non-teeth, non-eye mesh with morphs
          headMeshRef.current = object;
          console.log("   → Assigned as HEAD mesh (fallback)");
        }
      }
    });

    console.log("\n📊 Summary of all meshes found:", allMeshes);

    if (!headMeshRef.current) {
      console.error("❌ No mesh with morph targets found in the scene!");
      console.error("Total meshes found:", allMeshes.length);
      console.error("This could mean:");
      console.error("1. The Avaturn model doesn't have blendshapes exported");
      console.error("2. The model file is incorrect");
      console.error("3. The model needs to be re-exported with ARKit blendshapes");
    } else {
      console.log("\n✅ Setup complete!");
      console.log(`Head mesh: ${headMeshRef.current.name}`);
      console.log(`Head morph count: ${headMeshRef.current.morphTargetInfluences.length}`);
      if (teethMeshRef.current) {
        console.log(`Teeth mesh: ${teethMeshRef.current.name}`);
      }
    }

    hasTraversed.current = true;
  }, [scene]);

  /**
   * Animation loop - applies viseme blendshapes with smooth interpolation
   */
  useFrame(() => {
    const headMesh = headMeshRef.current;
    
    if (!headMesh?.morphTargetInfluences || !headMesh?.geometry?.morphAttributes?.position) {
      return;
    }

    const influences = headMesh.morphTargetInfluences;
    
    // Get the actual blendshape names from geometry userData or create proper mapping
    let blendshapeNames = [];
    if (headMesh.geometry.userData?.targetNames) {
      blendshapeNames = headMesh.geometry.userData.targetNames;
    } else if (headMesh.geometry.morphAttributes?.position) {
      // Fallback: Use morphAttribute keys
      blendshapeNames = Object.keys(headMesh.geometry.morphAttributes.position).map((_, i) => {
        // Try to get name from somewhere
        return headMesh.geometry.morphAttributes.position[i]?.name || `morph_${i}`;
      });
    }
    
    // Get target values from the viseme mapping
    const targetBlendshapes = visemeToARKitMap[viseme] || {};

    // Debug log once per viseme change
    const shouldLog = !hasLoggedAnimation.current && viseme !== "";
    if (shouldLog) {
      console.log("🎭 Animation frame");
      console.log("Current viseme:", viseme);
      console.log("Target blendshapes:", targetBlendshapes);
      console.log("Blendshape names:", blendshapeNames);
      console.log("Influences BEFORE:", [...influences]);
      hasLoggedAnimation.current = true;
    }

    // Since we know from logs that index 0 = mouthOpen and index 1 = mouthSmile
    // Let's hardcode this mapping for now
    const indexMap = {
      mouthOpen: 0,
      mouthSmile: 1
    };

    // Reset all influences to 0 first
    for (let i = 0; i < influences.length; i++) {
      influences[i] = lerp(influences[i], 0, LERP_FACTOR);
    }

    // Apply target blendshapes
    Object.entries(targetBlendshapes).forEach(([blendshapeName, targetValue]) => {
      const index = indexMap[blendshapeName];
      
      if (index !== undefined) {
        const currentValue = influences[index];
        const newValue = lerp(currentValue, targetValue, LERP_FACTOR);
        
        if (shouldLog) {
          console.log(`Applying ${blendshapeName}: index=${index}, current=${currentValue}, target=${targetValue}, new=${newValue}`);
        }
        
        influences[index] = newValue;
      }
    });

    if (shouldLog) {
      console.log("Influences AFTER:", [...influences]);
      console.log("mouthOpen should be:", targetBlendshapes.mouthOpen || 0);
      console.log("mouthSmile should be:", targetBlendshapes.mouthSmile || 0);
      
      // Reset flag after 2 seconds to allow logging again
      setTimeout(() => { hasLoggedAnimation.current = false; }, 2000);
    }

    // Simply set the influences - no other updates needed
    headMesh.morphTargetInfluences = influences;

    // Sync teeth mesh if it exists
    const teethMesh = teethMeshRef.current;
    if (teethMesh?.morphTargetInfluences) {
      const teethInfluences = teethMesh.morphTargetInfluences;
      
      // Use the same hardcoded index map
      const indexMap = {
        mouthOpen: 0,
        mouthSmile: 1
      };
      
      // Reset teeth influences first
      for (let i = 0; i < teethInfluences.length; i++) {
        teethInfluences[i] = lerp(teethInfluences[i], 0, LERP_FACTOR);
      }
      
      // Copy values from head mesh using the index map
      Object.entries(targetBlendshapes).forEach(([blendshapeName, targetValue]) => {
        const index = indexMap[blendshapeName];
        
        if (index !== undefined) {
          teethInfluences[index] = lerp(teethInfluences[index], targetValue, LERP_FACTOR);
        }
      });
      
      teethMesh.morphTargetInfluences = teethInfluences;
    }
  });

  return (
    <>
      {/* Camera controls - focused on head and shoulders */}
      <OrbitControls
        target={[0, 1.6, 0]}
        enablePan={false}
        minDistance={0.3}
        maxDistance={2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />

      {/* Lighting setup */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[1, 2, 2]} intensity={0.8} />
      <directionalLight position={[-1, 1, 1]} intensity={0.4} />
      <pointLight position={[0, 1.8, 0.5]} intensity={0.3} />

      {/* Avatar model - positioned to show head clearly */}
      <primitive object={scene} position={[0, 0, 0]} scale={1} rotation={[0, 0, 0]} />
    </>
  );
};

// Preload the model
useGLTF.preload("/avatar.glb"); 