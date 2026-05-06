import type { BenchmarkRun, BenchmarkConfig } from "../../types";
import { reportTable } from "./table";
import { reportJSON } from "./json";
import { reportCSV } from "./csv";
import { reportHTML } from "./html";

export function reportResults(format: BenchmarkConfig["format"], run: BenchmarkRun): void {
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

export { reportTable, reportJSON, reportCSV, reportHTML };
