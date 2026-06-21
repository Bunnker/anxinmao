export type KnowledgePosterDisplayMode = "inline" | "preview" | "collapsed";

export type KnowledgePosterRiskTone = "red" | "yellow" | "green" | "care";

export type KnowledgePosterAttachment = {
  id: string;
  title: string;
  image: string;
  displayMode: KnowledgePosterDisplayMode;
  riskTone: KnowledgePosterRiskTone;
  sourceDocs?: string[];
  reason?: string;
};

const DISPLAY_MODES = new Set<KnowledgePosterDisplayMode>([
  "inline",
  "preview",
  "collapsed",
]);

const RISK_TONES = new Set<KnowledgePosterRiskTone>([
  "red",
  "yellow",
  "green",
  "care",
]);

function isSafeKnowledgePosterImagePath(image: string): boolean {
  if (
    !image.startsWith("/") ||
    image.startsWith("//") ||
    image.includes("\\") ||
    image.includes("\0")
  ) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(image);
    return (
      decoded.startsWith("/") &&
      !decoded.startsWith("//") &&
      !decoded.includes("\\") &&
      !decoded.includes("\0")
    );
  } catch {
    return false;
  }
}

function hasValidOptionalMetadata(
  value: Partial<KnowledgePosterAttachment>,
): boolean {
  return (
    (value.reason === undefined || typeof value.reason === "string") &&
    (value.sourceDocs === undefined ||
      (Array.isArray(value.sourceDocs) &&
        value.sourceDocs.every((item) => typeof item === "string")))
  );
}

export function isKnowledgePosterAttachment(
  raw: unknown,
): raw is KnowledgePosterAttachment {
  if (!raw || typeof raw !== "object") return false;
  const value = raw as Partial<KnowledgePosterAttachment>;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    typeof value.image === "string" &&
    isSafeKnowledgePosterImagePath(value.image) &&
    DISPLAY_MODES.has(value.displayMode as KnowledgePosterDisplayMode) &&
    RISK_TONES.has(value.riskTone as KnowledgePosterRiskTone) &&
    hasValidOptionalMetadata(value)
  );
}
