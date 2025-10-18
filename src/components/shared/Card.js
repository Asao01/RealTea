"use client";

import { motion } from "framer-motion";
import { usePerformance } from "../../context/PerformanceContext";

/**
 * Reusable Card Component
 * Consistent styling across the app
 */
export default function Card({ 
  children, 
  variant = "default",
  hover = true,
  className = "",
  onClick,
  ...props 
}) {
  const { shouldAnimate } = usePerformance();

  const baseStyles = "rounded-xl border shadow-md overflow-hidden transition-all duration-500";
  
  const variants = {
    default: "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]",
    gold: "border-gold-primary/30 bg-gradient-to-br from-gold-primary/5 to-gold-secondary/5",
    highlighted: "border-gold-primary bg-white dark:bg-[#1a1a1a] shadow-gold-primary/20",
  };

  const hoverStyles = hover ? "hover:border-gold-primary hover:shadow-xl hover:shadow-gold-primary/20" : "";
  const clickableStyles = onClick ? "cursor-pointer" : "";

  const cardClasses = `${baseStyles} ${variants[variant]} ${hoverStyles} ${clickableStyles} ${className}`;

  const MotionCard = shouldAnimate && (hover || onClick) ? motion.div : 'div';
  const animationProps = shouldAnimate && (hover || onClick) ? {
    whileHover: { y: -4, scale: 1.01 },
    transition: { duration: 0.3 },
  } : {};

  return (
    <MotionCard
      className={cardClasses}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      {children}
    </MotionCard>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`p-5 pb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return (
    <div className={`p-5 pt-0 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`p-5 pt-3 border-t border-gray-200 dark:border-gray-800 ${className}`}>
      {children}
    </div>
  );
}

