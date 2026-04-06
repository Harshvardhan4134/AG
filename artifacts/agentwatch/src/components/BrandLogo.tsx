type BrandLogoProps = {
  /** Width and height in pixels */
  size?: number;
  className?: string;
};

/** AgentWatch brand mark — minimalist red cat */
export function BrandLogo({ size = 32, className = "" }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="AgentWatch"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
