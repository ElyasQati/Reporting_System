// Parse only INSERT data from phpMyAdmin exports. SQL is never executed.
export function parseLegacySql(
  source: string,
): Record<string, Record<string, string | number | null>[]> {
  const tables: Record<string, Record<string, string | number | null>[]> = {};
  const inserts =
    /INSERT\s+INTO\s+`(classes|curricula|reports)`\s*\(([^)]+)\)\s*VALUES\s*((?:'(?:\\.|''|[^'\\])*'|[^';])*);/gi;
  for (const match of source.matchAll(inserts)) {
    const columns = [...match[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const rows: Record<string, string | number | null>[] = [];
    let quoted = false,
      escaped = false,
      inRow = false,
      token = "",
      values: (string | number | null)[] = [],
      wasQuoted = false;
    const flush = () => {
      const raw = token.trim();
      values.push(
        wasQuoted ? token : raw.toUpperCase() === "NULL" ? null : Number(raw),
      );
      token = "";
      wasQuoted = false;
    };
    for (let index = 0; index < match[3].length; index++) {
      const character = match[3][index];
      if (escaped) {
        token +=
          character === "n" ? "\n" : character === "r" ? "\r" : character;
        escaped = false;
        continue;
      }
      if (quoted && character === "\\") {
        escaped = true;
        continue;
      }
      if (character === "'") {
        if (quoted && match[3][index + 1] === "'") {
          token += "'";
          index++;
          continue;
        }
        if (!quoted && !wasQuoted) token = token.trimStart();
        quoted = !quoted;
        wasQuoted = true;
        continue;
      }
      if (quoted) {
        token += character;
        continue;
      }
      if (character === "(") {
        inRow = true;
        values = [];
        token = "";
        wasQuoted = false;
      } else if (character === ")" && inRow) {
        flush();
        if (values.length !== columns.length)
          throw new Error("Invalid legacy SQL row");
        rows.push(Object.fromEntries(columns.map((c, i) => [c, values[i]])));
        inRow = false;
      } else if (character === "," && inRow) flush();
      else if (inRow && (!wasQuoted || character.trim())) token += character;
    }
    tables[match[1]] = [...(tables[match[1]] ?? []), ...rows];
  }
  return tables;
}
