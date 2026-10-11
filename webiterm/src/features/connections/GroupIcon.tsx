import { getGroupIcon } from "./groupIconCatalog";

type GroupIconProps = {
  iconId: string;
  color: string;
  size?: number;
  className?: string;
};

export function GroupIcon({ iconId, color, size = 16, className = "" }: GroupIconProps) {
  const icon = getGroupIcon(iconId);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {icon.paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
