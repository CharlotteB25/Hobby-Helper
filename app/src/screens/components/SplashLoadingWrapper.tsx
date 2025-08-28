// src/screens/components/SplashLoadingWrapper.tsx
import React, { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

interface Props {
  loadFunction: () => Promise<void>;
  children: React.ReactNode;
}

const SplashLoadingWrapper: React.FC<Props> = ({ loadFunction, children }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await loadFunction();
        await new Promise((r) => setTimeout(r, 500)); // optional smoothing
      } catch (err) {
        console.error("Error during screen load:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFunction]);

  if (loading) {
    return <SplashScreen mode="visual" />;
    {
      /* ← just visual, no redirects */
    }
  }

  return <>{children}</>;
};

export default SplashLoadingWrapper;
