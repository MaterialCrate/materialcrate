import React from "react";
import Link from "next/link";

const MENTION_REGEX = /(@[A-Za-z0-9._]+)/g;
const MENTION_PART_REGEX = /^@([A-Za-z0-9._]+)$/;

export function renderTextWithMentions(text: string): React.ReactNode[] {
  const parts = text.split(MENTION_REGEX);
  return parts.map((part, index) => {
    const match = MENTION_PART_REGEX.exec(part);
    return match
      ? React.createElement(
          Link,
          {
            key: `${part}-${index}`,
            href: `/user/${encodeURIComponent(match[1])}`,
            className: "text-[#1A66FF] font-medium",
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          part,
        )
      : React.createElement("span", { key: `${part}-${index}` }, part);
  });
}
