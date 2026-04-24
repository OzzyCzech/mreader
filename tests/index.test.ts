import { describe, expect, test } from "bun:test";
import type { Article } from "../src/index.js";
import { formatArticle, readFromHtml } from "../src/index.js";

const baseArticle: Article = {
	title: "Test Article",
	author: "John Doe",
	content: "# Hello\n\nThis is content.",
	excerpt: "A test excerpt",
	published: "2025-01-01",
	source: "https://example.com",
	url: "https://example.com/article",
};

describe("formatArticle", () => {
	test("includes YAML frontmatter by default", () => {
		const result = formatArticle(baseArticle);
		expect(result).toStartWith("---\n");
		expect(result).toContain('title: "Test Article"');
		expect(result).toContain('author: "John Doe"');
		expect(result).toContain('published: "2025-01-01"');
		expect(result).toContain('url: "https://example.com/article"');
		expect(result).toContain("---\n\n# Hello");
	});

	test("omits frontmatter when disabled", () => {
		const result = formatArticle(baseArticle, false);
		expect(result).toBe("# Hello\n\nThis is content.");
		expect(result).not.toContain("---");
	});

	test("omits null fields from frontmatter", () => {
		const article: Article = {
			...baseArticle,
			author: null,
			excerpt: null,
			published: null,
			source: null,
		};
		const result = formatArticle(article);
		expect(result).not.toContain("author:");
		expect(result).not.toContain("description:");
		expect(result).not.toContain("published:");
		expect(result).not.toContain("source:");
	});

	test("escapes special YAML characters in title", () => {
		const article: Article = {
			...baseArticle,
			title: 'Foo: "Bar"\nbaz',
		};
		const result = formatArticle(article);
		expect(result).toContain('title: "Foo: \\"Bar\\"\\nbaz"');
	});

	test("escapes backslashes in values", () => {
		const article: Article = {
			...baseArticle,
			title: "path\\to\\file",
		};
		const result = formatArticle(article);
		expect(result).toContain('title: "path\\\\to\\\\file"');
	});
});

describe("readFromHtml", () => {
	test("extracts article from simple HTML", async () => {
		const html = `
			<!DOCTYPE html>
			<html>
			<head><title>Test Page</title></head>
			<body>
				<article>
					<h1>Test Page</h1>
					<p>This is a paragraph of text that is long enough to be considered article content by the extractor. It needs to be sufficiently long to pass the content length threshold that article extractors typically use for identifying main content.</p>
					<p>Here is another paragraph with more text content to ensure the extractor picks this up as the main article body. Multiple paragraphs help establish this as real content.</p>
				</article>
			</body>
			</html>
		`;
		const article = await readFromHtml(html, "https://example.com/test");
		expect(article.title).toBe("Test Page");
		expect(article.content).toContain("paragraph of text");
		expect(article.url).toBe("https://example.com/test");
	});

	test("throws on non-extractable HTML", async () => {
		expect(
			readFromHtml("<html><body></body></html>", "https://example.com"),
		).rejects.toThrow("Failed to extract article");
	});
});
