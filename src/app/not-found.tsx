import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <Container>
      <h1 className="not-found-heading">Off the racing line.</h1>
      <EmptyState
        title="This page couldn’t be found."
        description="Return to the overview to find your next starting point."
      />
    </Container>
  );
}
