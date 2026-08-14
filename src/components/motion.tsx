import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Fast, purposeful motion (0.3–0.4s) — never decorative. Mirrors the page/stagger
// pattern: a page fades up on mount, lists stagger their children in.
//
// Every helper here collapses to no movement when the viewer has asked for
// reduced motion. The CSS in index.css covers transitions and keyframes;
// Framer's transforms are driven from JS and have to be opted out separately.

const pageV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const still: Variants = { hidden: { opacity: 1 }, show: { opacity: 1 } };

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? still : pageV} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? still : containerV}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? still : itemV} className={className}>
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
