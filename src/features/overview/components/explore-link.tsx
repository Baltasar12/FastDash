"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function ExploreLink() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="explore-link"
      whileHover={reduceMotion ? undefined : { y: -3 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <Link className={buttonVariants()} href="#platform">
        Explore SECTOR <ArrowUpRight size={19} aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
