import { Container } from "@/components/ui/container";
import { Navigation } from "@/components/layout/navigation";
import { Wordmark } from "@/components/layout/wordmark";

export function Header() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Wordmark />
        <Navigation />
        <span className="header-edition eyebrow">
          <span className="status-dot" />
          INDEPENDENT BY DESIGN
        </span>
      </Container>
    </header>
  );
}
