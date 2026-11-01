/**
 * Split oversized JSON tables (sources) into ≤49MB part files for GitHub.
 *
 *   yarn data:split
 */
import { MAX_PART_BYTES, readTable, writeTable } from "../src/db/json-table";

const sources = readTable("sources");
console.log(`sources ${sources.length} rows — rewriting with max part ${MAX_PART_BYTES} bytes…`);
const result = writeTable("sources", sources);
console.log(`완료: parts=${result.parts}, total≈${(result.bytes / 1e6).toFixed(1)}MB`);
