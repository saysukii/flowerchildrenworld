/** First letter of each name part is uppercase. The rest stays lowercase. */
export function formatPersonName(value: string) {
  return value
    .trim()
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return part
        .split("-")
        .map((piece) => (piece ? piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase() : piece))
        .join("-");
    })
    .join("");
}
