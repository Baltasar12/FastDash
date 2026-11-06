import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        [ — ]
      </span>
      <p className="eyebrow">FOUNDATION / PHASE 00</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button asChild variant="outline">
        <Link href="/">
          Back to overview <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
