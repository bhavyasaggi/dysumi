import type { FeatherIconNames } from "feather-icons";
import FeatherSprite from "feather-icons/dist/feather-sprite.svg";
import type React from "react";

export interface IconProps {
  readonly title: string;
  readonly icon: FeatherIconNames;
  readonly width?: string | number;
  readonly height?: string | number;
  readonly viewBox?: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: string | number;
  readonly strokeLinecap?: "round" | "square";
  readonly strokeLinejoin?: "bevel" | "miter" | "round";
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export default function Icon({
  title,
  icon,
  width,
  height,
  viewBox,
  fill,
  stroke,
  strokeWidth,
  strokeLinecap,
  strokeLinejoin,
  className,
  style,
}: IconProps) {
  return (
    <svg
      className={className}
      fill={fill ?? "none"}
      height={height ?? 24}
      stroke={stroke ?? "currentColor"}
      strokeLinecap={strokeLinecap ?? "round"}
      strokeLinejoin={strokeLinejoin ?? "round"}
      strokeWidth={strokeWidth ?? 2}
      style={style}
      viewBox={viewBox ?? "0 0 24 24"}
      width={width ?? 24}
    >
      <title>{title || `icon ${icon || "??"}`}</title>
      <use href={`${FeatherSprite}#${icon}`} />
    </svg>
  );
}
