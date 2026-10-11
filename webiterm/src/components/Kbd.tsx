export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-[10px] leading-none tracking-normal text-faint">
      {children}
    </kbd>
  );
}
