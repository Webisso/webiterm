import logoUrl from "../assets/logo.png";

type AppLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function AppLogo({ size = 48, className = "", alt = "WebiTerm" }: AppLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] object-cover ${className}`}
      draggable={false}
    />
  );
}
