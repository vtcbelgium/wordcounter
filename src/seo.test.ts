/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import robotsTxt from "../public/robots.txt?raw";
import sitemapXml from "../public/sitemap.xml?raw";

const SITE_URL = "https://wordcounter.othrys.be/";

interface FaqEntry {
  name: string;
  acceptedAnswer: { "@type": string; text: string };
}

function jsonLdBlocks(): Array<Record<string, unknown>> {
  const blocks = indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  return Array.from(blocks, (match) => JSON.parse(match[1]));
}

function faqEntries(): FaqEntry[] {
  const faqPage = jsonLdBlocks().find((block) => block["@type"] === "FAQPage");
  return (faqPage?.mainEntity ?? []) as FaqEntry[];
}

// Body markup with tags removed and whitespace collapsed, as a reader sees it
function visibleText(): string {
  const body = indexHtml.slice(indexHtml.indexOf("<body>"));
  return body
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

describe("robots.txt", () => {
  it("allows crawling of the whole site", () => {
    expect(robotsTxt).toMatch(/^User-agent: \*$/m);
    expect(robotsTxt).toMatch(/^Allow: \/$/m);
    expect(robotsTxt).not.toMatch(/^Disallow:/m);
  });

  it("references the sitemap", () => {
    expect(robotsTxt).toMatch(/^Sitemap: https:\/\/wordcounter\.othrys\.be\/sitemap\.xml$/m);
  });
});

describe("sitemap.xml", () => {
  it("lists the homepage with priority and daily changefreq", () => {
    expect(sitemapXml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemapXml).toContain(`<loc>${SITE_URL}</loc>`);
    expect(sitemapXml).toContain("<changefreq>daily</changefreq>");
    expect(sitemapXml).toMatch(/<priority>(0\.\d|1\.0)<\/priority>/);
  });

  it("uses the canonical homepage URL", () => {
    expect(indexHtml).toContain(`<link rel="canonical" href="${SITE_URL}" />`);
  });
});

describe("structured data", () => {
  it("keeps every JSON-LD block parseable and on schema.org", () => {
    const blocks = jsonLdBlocks();

    expect(blocks.map((block) => block["@type"])).toEqual(["WebApplication", "FAQPage"]);
    for (const block of blocks) {
      expect(block["@context"]).toBe("https://schema.org");
    }
  });

  it("covers ARI, WPM and Unicode in the FAQPage schema", () => {
    const questions = faqEntries().map((entry) => entry.name);

    expect(questions).toEqual([
      expect.stringContaining("ARI"),
      expect.stringContaining("WPM"),
      expect.stringContaining("Unicode"),
    ]);
  });

  it("mirrors each FAQPage entry in the visible page content", () => {
    const text = visibleText();

    for (const entry of faqEntries()) {
      expect(entry.acceptedAnswer["@type"]).toBe("Answer");
      expect(text).toContain(entry.name);
      expect(text).toContain(entry.acceptedAnswer.text);
    }
  });
});

describe("google ecosystem hygiene", () => {
  it("includes Googlebot snippet and image preview directives", () => {
    expect(indexHtml).toMatch(/<meta\s+name="robots"\s+content="[^"]*max-image-preview:large[^"]*"/);
    expect(indexHtml).toMatch(/<meta\s+name="robots"\s+content="[^"]*max-snippet:-1[^"]*"/);
  });

  it("includes theme-color for mobile search UX", () => {
    expect(indexHtml).toMatch(/<meta\s+name="theme-color"\s+content="#[0-9a-fA-F]{6}"/);
  });

  it("provides complete WebApplication metadata for rich snippets", () => {
    const webApp = jsonLdBlocks().find((b) => b["@type"] === "WebApplication") as Record<string, unknown>;
    expect(webApp).toBeDefined();
    expect(webApp.operatingSystem).toBe("All");
    expect(webApp.browserRequirements).toContain("JavaScript");
    expect(webApp.offers).toEqual(expect.objectContaining({ price: "0" }));
  });

  it("defines standard 1200x630 OpenGraph card with alt text", () => {
    expect(indexHtml).toContain('<meta property="og:image:width" content="1200" />');
    expect(indexHtml).toContain('<meta property="og:image:height" content="630" />');
    expect(indexHtml).toContain('property="og:image:alt"');
  });
});
