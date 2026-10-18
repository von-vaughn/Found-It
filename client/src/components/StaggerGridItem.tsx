import React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

const gridVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

interface StaggerGridProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Grid container that orchestrates a single smooth left-to-right,
 * top-to-bottom cascade across its `StaggerItem` children via
 * motion's `staggerChildren`. Give it a `key` derived from the
 * active filters so the cascade replays when the result set changes.
 * Respects prefers-reduced-motion.
 */
export const StaggerGrid: React.FC<StaggerGridProps> = ({
  className,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={gridVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  className?: string;
  children: React.ReactNode;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  className,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
};
