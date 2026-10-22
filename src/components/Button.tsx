import { useContext, useEffect } from "react";
import type { CSSProperties, MouseEventHandler } from "react";
import { useTheme } from "../App";
// import useLocalStorage from "../actions";
export const Button = ({
  type,
  title,
  disabled,
  active,
  color,
  colorDarkMode,
  onClick,
  onMouseDown,
  "aria-label": ariaLabel,
  className,
  children,
  style,
}: {
  type?: "button" | "submit" | "reset";
  title?: string;
  disabled?: boolean;
  active?: boolean;
  color: string;
  colorDarkMode?: string;
  onClick?: (e) => void;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  className?: string;
  style?: any;
  children: React.ReactNode;
}) => {
  const { theme, isDarkMode } = useTheme();
  const isNeutralMode = theme === "neutral";
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={
        {
          ...style,
          "--button-accent": color,
          "--button-bg": isNeutralMode ? "var(--item-bg)" : isDarkMode
            ? active
              ? "color-mix(in srgb, var(--button-accent) 18%, var(--sectionheader-bg))"
              : "var(--sectionheader-bg)"
            : (colorDarkMode ?? color),
          "--button-hover-bg": isNeutralMode ? "var(--item-bg)" : isDarkMode
            ? "color-mix(in srgb, var(--button-accent) 18%, var(--button-bg))"
            : "color-mix(in srgb, var(--button-bg) 88%, white)",
          "--button-active-bg": isNeutralMode ? "var(--item-bg-active)" : isDarkMode
            ? "color-mix(in srgb, var(--button-accent) 30%, var(--button-bg))"
            : "color-mix(in srgb, var(--button-bg) 84%, black)",
          "--button-border-color": isDarkMode
            ? "color-mix(in srgb, var(--button-accent) 25%, transparent)"
            : "transparent",
          margin: style?.margin ? style.margin : "1px",
          color: isNeutralMode ? "var(--button-neutral-text)" : isDarkMode ? (colorDarkMode ?? color) : "",
          boxShadow: isNeutralMode ? "var(--neutral-surface-shadow)" : style?.boxShadow,
          borderWidth: isDarkMode ? "2px" : undefined,
          borderStyle: isDarkMode ? "solid" : undefined,
        } as CSSProperties
      }
      className={`sectionHeaderButton themedButton ${className}`}
    >
      {children}
    </button>
  );
};

export const Chip = ({
  style,
  color,
  colorDarkMode,
  darkModeAccent,
  darkModeTextColor,
  onClick,
  isOpen,
  i,
  animated,
  minWidth,
  children,
}: {
  style?: any;
  color: string;
  colorDarkMode?: string;
  darkModeAccent?: string;
  darkModeTextColor?: string;
  onClick?: () => void;
  isOpen?: boolean;
  i?: number;
  animated?: boolean;
  minWidth?: string;
  children: React.ReactNode;
}) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      onClick={onClick}
      style={{
        ...style,
        transition: animated
          ? `opacity .3s ease-in-out ${100 + (i ?? 0) * 50}ms, transform .3s ease-in-out ${100 + (i ?? 0) * 50}ms`
          : undefined,
        background: isDarkMode ? "var(--sectionheader-bg)" : (colorDarkMode ?? color),
        color: isDarkMode ? (darkModeAccent ?? darkModeTextColor ?? colorDarkMode ?? color) : "",
        border: isDarkMode && darkModeAccent
          ? `2px solid color-mix(in srgb, ${darkModeAccent} 25%, transparent)`
          : undefined,
        // outline: isDarkMode ? `2px solid ${colorDarkMode ?? color}40` : "",
        minHeight: "25px",
        minWidth: minWidth ?? "3.7rem",
      }}
      className={`dropdown-item-label ${isOpen ? "open" : animated && "close"}`}
    >
      {children}
    </div>
  );
};
