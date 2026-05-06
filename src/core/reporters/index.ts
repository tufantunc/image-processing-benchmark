import type { BenchmarkRun } from "../../types";
import { reportTable } from "./table";
import { reportJSON } from "./json";
import { reportCSV } from "./csv";

export function reportResults(format: string, run: BenchmarkRun): void {
  switch (format) {
    case "json":
      console.log(reportJSON(run));
      break;
    case "csv":
      console.log(reportCSV(run.results));
      break;
    case "html":
      console.log(reportHTML(run));
      break;
    default:
      reportTable(run.results);
      break;
  }
}

function reportHTML(_run: BenchmarkRun): string {
  throw new Error("HTML reporter not yet implemented");
}

export { reportTable, reportJSON, reportCSV };
