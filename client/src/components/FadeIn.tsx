import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const playedFadeKeys = new Set<string>();

interface FadeInProps {
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  /** When set, the fade-in only plays on the first mount for this key in the session. */
  onceKey?: string;
  children: React.ReactNode;
}

/**
 * Subtle mount fade-in wrapper that shares the stagger grid's easing curve
 * and falls back to a static container when prefers-reduced-motion is enabled.
 */
export const FadeIn: React.FC<FadeInProps> = ({
  className,
  delay = 0,
  y = 8,
  duration = 0.35,
  onceKey,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const [shouldAnimate] = useState(() =>
    onceKey ? !playedFadeKeys.has(onceKey) : true,
  );

  useEffect(() => {
    if (!onceKey || !shouldAnimate) return;
    const timer = window.setTimeout(() => {
      playedFadeKeys.add(onceKey);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [onceKey, shouldAnimate]);

  if (reduceMotion || !shouldAnimate) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (onceKey) playedFadeKeys.add(onceKey);
      }}
    >
      {children}
    </motion.div>
  );
};
