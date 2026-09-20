const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TARGET_DIRS = [
  path.join(ROOT, "src", "components", "tabs"),
  path.join(ROOT, "src", "components", "modular"),
];
const BASELINE_FILE = path.join(__dirname, "ui-consistency-baseline.json");
const strict = process.argv.includes("--strict");

const patterns = {
  input: /<(?:motion\.)?input\b/g,
  select: /<(?:motion\.)?select\b/g,
  textarea: /<(?:motion\.)?textarea\b/g,
  button: /<(?:motion\.)?button\b/g,
};

const findFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
};

const baseline = fs.existsSync(BASELINE_FILE)
  ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"))
  : {};

const rows = TARGET_DIRS.flatMap(findFiles)
  .map((file) => {
    const source = fs.readFileSync(file, "utf8");
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");
    const counts = Object.fromEntries(
      Object.entries(patterns).map(([name, regex]) => [
        name,
        (source.match(regex) || []).length,
      ]),
    );
    return {
      file: relativePath,
      ...counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    };
  })
  .sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));

const regressions = [];
for (const row of rows) {
  const allowed = baseline[row.file] || {
    input: 0,
    select: 0,
    textarea: 0,
    button: 0,
  };

  for (const type of Object.keys(patterns)) {
    if (row[type] > (allowed[type] || 0)) {
      regressions.push({
        file: row.file,
        type,
        current: row[type],
        baseline: allowed[type] || 0,
      });
    }
  }
}

const debt = rows.filter((row) => row.total > 0);
const clean = rows.filter((row) => row.total === 0);

console.log("\nAQUACRM25 UI consistency audit");
console.log("================================");
console.log(`Scanned: ${rows.length} tab/modular TSX files`);
console.log(`Clean:   ${clean.length}`);
console.log(`Debt:    ${debt.length}`);
console.log(
  `Raw controls remaining: ${debt.reduce((sum, row) => sum + row.total, 0)}`,
);

if (debt.length) {
  console.log("\nRemaining raw controls (highest first):");
  console.log(
    "File".padEnd(72) +
      " input select textarea button total",
  );
  for (const row of debt) {
    console.log(
      row.file.padEnd(72) +
        String(row.input).padStart(5) +
        String(row.select).padStart(7) +
        String(row.textarea).padStart(9) +
        String(row.button).padStart(7) +
        String(row.total).padStart(6),
    );
  }
}

if (regressions.length) {
  console.error("\nUI consistency regression detected:");
  regressions.forEach((item) => {
    console.error(
      `- ${item.file}: ${item.type} increased from ${item.baseline} to ${item.current}`,
    );
  });
  process.exit(1);
}

if (strict && debt.length) {
  console.error(
    "\nStrict UI consistency check failed: replace remaining raw controls with shared liquid primitives.",
  );
  process.exit(1);
}

console.log(
  "\nNo UI consistency regressions. Use --strict to require zero raw controls.",
);
