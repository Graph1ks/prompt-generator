import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  readonly elevation?: "base" | "raised" | "floating";
}

export function Surface({
  elevation = "base",
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={classNames("vg-Surface", className)}
      data-elevation={elevation}
      {...props}
    />
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: "accent" | "neutral" | "ghost";
  readonly size?: "sm" | "md";
}

export function Button({
  tone = "neutral",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames("vg-Button", className)}
      data-tone={tone}
      data-size={size}
      {...props}
    />
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  readonly label: string;
  readonly children: ReactNode;
}

export function IconButton({
  label,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={classNames("vg-IconButton", className)}
      {...props}
    />
  );
}

export interface TextProps extends HTMLAttributes<HTMLElement> {
  readonly as?: "span" | "p" | "small" | "strong";
  readonly tone?: "default" | "muted" | "accent";
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function Text({
  as: Component = "span",
  tone = "default",
  size = "md",
  className,
  ...props
}: TextProps) {
  return (
    <Component
      className={classNames("vg-Text", className)}
      data-tone={tone}
      data-size={size}
      {...props}
    />
  );
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly gap?: "1" | "2" | "3" | "4" | "6" | "8";
}

export function Stack({ gap = "4", className, ...props }: StackProps) {
  return (
    <div
      className={classNames("vg-Stack", className)}
      data-gap={gap}
      {...props}
    />
  );
}

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  readonly gap?: "1" | "2" | "3" | "4" | "6";
  readonly align?: "start" | "center" | "end" | "baseline";
}

export function Cluster({
  gap = "2",
  align = "center",
  className,
  ...props
}: ClusterProps) {
  return (
    <div
      className={classNames("vg-Cluster", className)}
      data-gap={gap}
      data-align={align}
      {...props}
    />
  );
}
