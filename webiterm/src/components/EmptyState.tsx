type EmptyStateProps = {
  title: string;
  description: string;
  hint?: string;
  align?: "start" | "center";
};

export function EmptyState({ title, description, hint, align = "start" }: EmptyStateProps) {
  const alignment = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex max-w-md flex-col gap-2 ${alignment}`}>
      <h2 className="text-[15px] font-medium tracking-tight text-ink">{title}</h2>
      <p className="text-[13px] leading-relaxed text-muted">{description}</p>
      {hint ? <p className="text-[12px] leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}
