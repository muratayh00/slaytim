// Minimal layout for embeddable pages — no Navbar, no global chrome
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
