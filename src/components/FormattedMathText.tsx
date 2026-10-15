import React from "react";
import { renderMathInHtml } from "@/utils/mathRenderer";

interface FormattedMathTextProps {
  text: string;
  className?: string;
}

/**
 * Lightweight React component to render text containing inline or block LaTeX formulas
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({ text, className }) => {
  if (!text) return null;
  if (!text.includes("$") && !text.includes("\\")) {
    return <span className={className}>{text}</span>;
  }
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMathInHtml(text) }}
    />
  );
};

export default FormattedMathText;
