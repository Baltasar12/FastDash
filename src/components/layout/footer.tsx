import { ArrowUp } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/layout/wordmark";

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <Wordmark />
          <p>A different view of the race.</p>
          <a className="text-link" href="#top">
            Back to top <ArrowUp size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="footer-bottom">
          <p>An independent Formula 1 project. Free to explore.</p>
          <p>Not affiliated with Formula 1, the FIA, or any team.</p>
          <span className="eyebrow">BUILT FOR THE CURIOUS.</span>
        </div>
      </Container>
    </footer>
  );
}
