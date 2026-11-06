export const platformModules = [
  {
    slug: "calendar",
    label: "Calendar",
    index: "01",
    category: "THE SEASON",
    description: "A season in perspective.",
    detail:
      "Explore the rhythm of a season, from the opening lights to the final lap.",
    tags: "RACE WEEKENDS / CIRCUITS",
  },
  {
    slug: "championship",
    label: "Championship",
    index: "02",
    category: "THE BIG PICTURE",
    description: "Every point has a story.",
    detail:
      "Follow drivers, constructors and the momentum behind a championship.",
    tags: "STANDINGS / COMPARISONS",
  },
  {
    slug: "race-center",
    label: "Race Center",
    index: "03",
    category: "THE RACE",
    description: "Look past the result.",
    detail:
      "Unpack race pace, strategy and the moments that shape a Grand Prix.",
    tags: "PACE / STRATEGY / RESULTS",
  },
  {
    slug: "telemetry-lab",
    label: "Telemetry Lab",
    index: "04",
    category: "THE FINE MARGINS",
    description: "Find the difference.",
    detail:
      "Get closer to a lap through speed, braking and driver comparisons.",
    tags: "TELEMETRY / LAP ANALYSIS",
  },
] as const;

export const navigation = [
  { href: "/", label: "Overview" },
  ...platformModules.map(({ slug, label }) => ({ href: `/${slug}`, label })),
];

export function getPlatformModule(slug: string) {
  return platformModules.find((module) => module.slug === slug);
}
