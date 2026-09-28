// The body of a <script type="application/ld+json"> (spec §11.3 structured data).
// The data is JSON.stringify'd with every "<" written as <, so no string in it (a post
// title, an FAQ answer) can close the script element ("</script>") or open an HTML comment
// ("<!--") inside it. JSON parsers read < back as "<". Every ld+json script uses this;
// tests/json-ld.test.mjs checks that.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
