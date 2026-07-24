export default function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="command-layout"
      className="bg-background min-h-screen"
    >
      {children}
    </div>
  );
}
