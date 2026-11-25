import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InvoiceStamp } from "../../utils/invoiceStamp";

/**
 * Rubber-stamp seal for the invoice page. It "presses" onto the page once
 * (drops in large, then settles with a slight tilt). The PDF draws the same
 * seal in utils/invoicePdf.ts.
 */
export default function InvoiceStampSeal({
  stamp,
  size = 132,
}: {
  stamp: InvoiceStamp;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const topArc = `stamp-top-${id}`;
  const bottomArc = `stamp-bottom-${id}`;
  const wordSize = stamp.word.length > 5 ? 11 : stamp.word.length > 3 ? 20 : 26;

  return (
    <motion.div
      role="img"
      aria-label={`${stamp.word} stamp: ${stamp.caption.toLowerCase()}`}
      className="shrink-0 select-none"
      style={{ width: size, height: size }}
      initial={
        reduceMotion
          ? { opacity: 0.9, rotate: -12 }
          : { opacity: 0, scale: 2.4, rotate: -32 }
      }
      animate={{ opacity: 0.9, scale: 1, rotate: -12 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 260, damping: 15, delay: 0.35 }
      }
    >
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <defs>
          <path id={topArc} d="M 18 60 A 42 42 0 0 1 102 60" />
          <path id={bottomArc} d="M 14 60 A 46 46 0 0 0 106 60" />
        </defs>
        <circle cx="60" cy="60" r="56" fill={stamp.hex} fillOpacity="0.06" />
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke={stamp.hex}
          strokeWidth="3"
        />
        <circle cx="60" cy="60" r="50" fill="none" stroke={stamp.hex} />
        <circle cx="60" cy="60" r="36" fill="none" stroke={stamp.hex} />
        <text
          fill={stamp.hex}
          fontSize="10"
          fontWeight="800"
          letterSpacing="2.5"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            AQUAKART
          </textPath>
        </text>
        <text
          fill={stamp.hex}
          fontSize="7.5"
          fontWeight="800"
          letterSpacing="0.8"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          <textPath
            href={`#${bottomArc}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {stamp.caption}
          </textPath>
        </text>
        <circle cx="17" cy="60" r="2.2" fill={stamp.hex} />
        <circle cx="103" cy="60" r="2.2" fill={stamp.hex} />
        <line
          x1="34"
          x2="86"
          y1={60 - wordSize / 2 - 4}
          y2={60 - wordSize / 2 - 4}
          stroke={stamp.hex}
        />
        <line
          x1="34"
          x2="86"
          y1={60 + wordSize / 2 + 3}
          y2={60 + wordSize / 2 + 3}
          stroke={stamp.hex}
        />
        <text
          x="60"
          y="60"
          fill={stamp.hex}
          fontSize={wordSize}
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {stamp.word}
        </text>
      </svg>
    </motion.div>
  );
}
