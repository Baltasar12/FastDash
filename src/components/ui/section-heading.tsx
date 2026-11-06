type SectionHeadingProps = {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
};

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  id,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <p className="eyebrow">
        <span className="section-index">{index}</span>
        {eyebrow}
      </p>
      <h2 id={id}>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}
