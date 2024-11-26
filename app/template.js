"use client";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }) {
  const path = usePathname();

  const variants = {
    hidden: { opacity: 0, x: 0, y: 0 },
    enter: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: -100, y: 0 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={path}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 100,
          duration: 0.3,
        }}
        className="main-content"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
