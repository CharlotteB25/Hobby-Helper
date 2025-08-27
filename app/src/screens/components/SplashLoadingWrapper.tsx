import React, { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";

interface Props {
  loadFunction: () => Promise<void>;
  children: React.ReactNode;
}

const SplashLoadingWrapper: React.FC<Props> = ({ loadFunction, children }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await loadFunction();
        await new Promise((resolve) => setTimeout(resolve, 500)); // Artificial delay for smoothness
      } catch (err) {
        console.error("Error during screen load:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return <>{children}</>;
};

export default SplashLoadingWrapper;
