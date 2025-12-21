'use client';

import { motion } from 'framer-motion';
import React from 'react';

/**
 * Pre-built animations for CRM dashboard
 * Provides smooth, professional transitions and entrance effects
 */

// Animation variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    transition: { duration: 0.2 } 
  },
};

export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.3, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.2 } 
  },
};

export const slideLeftVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.4, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    x: -30, 
    transition: { duration: 0.2 } 
  },
};

export const slideRightVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.4, ease: 'easeOut' } 
  },
  exit: { 
    opacity: 0, 
    x: 30, 
    transition: { duration: 0.2 } 
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4 } 
  },
};

/**
 * Animated page wrapper for smooth page transitions
 */
interface AnimatedPageProps {
  children: React.ReactNode;
  variants?: any;
  className?: string;
}

export function AnimatedPage({
  children,
  variants = slideInVariants,
  className = '',
}: AnimatedPageProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated container for list items with stagger effect
 */
interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({
  children,
  className = '',
  staggerDelay = 0.1,
}: AnimatedListProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated item (for use within AnimatedList)
 */
interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
  variants?: any;
  onClick?: () => void;
}

export function AnimatedItem({
  children,
  className = '',
  variants = itemVariants,
  onClick,
}: AnimatedItemProps) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated button with hover/tap effects
 */
interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AnimatedButton({
  children,
  className = '',
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}
      whileTap={{ y: 0, boxShadow: '0 5px 10px rgba(0,0,0,0.2)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Fade in animation for background elements
 */
interface FadeInWhenVisibleProps {
  children: React.ReactNode;
  className?: string;
}

export function FadeInWhenVisible({
  children,
  className = '',
}: FadeInWhenVisibleProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, amount: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Smooth number counter animation
 */
interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function Counter({
  from = 0,
  to,
  duration = 2,
  prefix = '',
  suffix = '',
}: CounterProps) {
  return (
    <motion.span>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(to)}
        </motion.span>
        {suffix}
      </motion.div>
    </motion.span>
  );
}

/**
 * Loading spinner with rotation animation
 */
export function AnimatedLoadingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
    />
  );
}

/**
 * Pulsing animation for badges/indicators
 */
interface PulseProps {
  children: React.ReactNode;
  className?: string;
}

export function Pulse({ children, className = '' }: PulseProps) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.6, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shake animation for errors/alerts
 */
interface ShakeProps {
  children: React.ReactNode;
  trigger?: boolean;
}

export function Shake({ children, trigger = false }: ShakeProps) {
  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      animate={trigger ? 'shake' : 'initial'}
      variants={shakeVariants}
    >
      {children}
    </motion.div>
  );
}

/**
 * Collapse/expand animation
 */
interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapse({ isOpen, children, className = '' }: CollapseProps) {
  return (
    <motion.div
      initial={false}
      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}
