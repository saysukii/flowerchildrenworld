export function PageLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-label text-[11px]" style={{ color: "#3AB819" }}>
      {children}
    </span>
  );
}
