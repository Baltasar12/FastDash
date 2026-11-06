import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { platformModules } from "@/config/navigation";

export function ModuleList() {
  return (
    <div className="module-list">
      {platformModules.map((module) => (
        <Link className="module-row" href={`/${module.slug}`} key={module.slug}>
          <span className="module-index eyebrow">{module.index}</span>
          <div className="module-name">
            <h3>{module.label}</h3>
            <p>{module.description}</p>
          </div>
          <span className="module-tags eyebrow">{module.tags}</span>
          <span className="module-status">In development</span>
          <ArrowUpRight className="module-arrow" size={24} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
