#!/usr/bin/env node

/**
 * Build Log Analyzer
 * This script analyzes large build logs and extracts the most important information,
 * particularly focusing on errors and warnings.
 * 
 * Usage:
 *   node scripts/analyze-build-logs.mjs <path-to-log-file> [options]
 * 
 * Options:
 *   --errors-only      Only show lines with errors
 *   --warnings-too     Include warnings in the output
 *   --context=5        Number of context lines to include (default: 5)
 *   --output=file.log  Save to file instead of printing to console
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configuration
const DEFAULT_CONTEXT_LINES = 5;
const ERROR_PATTERNS = [
  /error:/i,
  /fatal:/i,
  /failed/i,
  /exception/i,
  /crash/i,
  /\*\* .* FAILED \*\*/i,
  /The following build commands failed/i,
  /exited with code [1-9]/i,
  /\[error\]/i
];
const WARNING_PATTERNS = [
  /warning:/i,
  /⚠️/
];
const SECTION_START_PATTERNS = [
  /=== .* ===/,
  /\*\*\* .* \*\*\*/,
  /##\[.+\]/
];

// Process command line arguments
const args = process.argv.slice(2);
const logFilePath = args[0];
const options = {
  errorsOnly: args.includes('--errors-only'),
  includeWarnings: args.includes('--warnings-too'),
  contextLines: DEFAULT_CONTEXT_LINES,
  outputFile: null
};

// Parse other arguments
args.forEach(arg => {
  if (arg.startsWith('--context=')) {
    options.contextLines = parseInt(arg.split('=')[1], 10) || DEFAULT_CONTEXT_LINES;
  } else if (arg.startsWith('--output=')) {
    options.outputFile = arg.split('=')[1];
  }
});

// Main function
async function analyzeLog(filePath, opts) {
  if (!filePath) {
    console.error('❌ Error: No log file specified');
    console.log('Usage: node analyze-build-logs.mjs <path-to-log-file> [options]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileStats = fs.statSync(filePath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  console.log(`Analyzing log file: ${path.basename(filePath)} (${fileSizeMB} MB)`);

  // Create streams
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let outputStream = process.stdout;
  if (opts.outputFile) {
    outputStream = fs.createWriteStream(opts.outputFile);
  }

  // Analysis variables
  let lineNumber = 0;
  let totalLines = 0;
  let errorLines = 0;
  let warningLines = 0;
  let importantSectionLines = 0;
  let buffer = [];
  let contextBuffer = [];
  let inImportantSection = false;
  let lastSection = '';
  
  // Write header to output
  outputStream.write(`BUILD LOG ANALYSIS: ${path.basename(filePath)}\n`);
  outputStream.write(`Date: ${new Date().toISOString()}\n`);
  outputStream.write(`Options: ${JSON.stringify(opts)}\n\n`);
  outputStream.write(`====== ERROR AND WARNING SUMMARY ======\n\n`);

  // Process the file line by line
  for await (const line of rl) {
    lineNumber++;
    totalLines++;
    
    // Check if this line starts a new section
    const isSectionStart = SECTION_START_PATTERNS.some(pattern => pattern.test(line));
    if (isSectionStart) {
      lastSection = line;
      
      // If the section title contains error or warning, mark it as important
      const isImportantSection = 
        ERROR_PATTERNS.some(pattern => pattern.test(line)) || 
        (opts.includeWarnings && WARNING_PATTERNS.some(pattern => pattern.test(line)));
      
      if (isImportantSection) {
        inImportantSection = true;
        outputStream.write(`\n\n${'-'.repeat(80)}\n${line}\n${'-'.repeat(80)}\n\n`);
      } else {
        inImportantSection = false;
      }
      
      continue;
    }

    const isError = ERROR_PATTERNS.some(pattern => pattern.test(line));
    const isWarning = WARNING_PATTERNS.some(pattern => pattern.test(line));

    // Keep a rolling buffer of the last N lines for context
    contextBuffer.push({ lineNum: lineNumber, text: line });
    if (contextBuffer.length > opts.contextLines) {
      contextBuffer.shift();
    }

    // Process errors and warnings
    if (isError || (isWarning && opts.includeWarnings)) {
      if (isError) errorLines++;
      if (isWarning) warningLines++;

      // Output the buffered context lines (except if they're already in the buffer)
      for (const ctxLine of contextBuffer) {
        if (!buffer.some(l => l.lineNum === ctxLine.lineNum)) {
          buffer.push(ctxLine);
        }
      }
      
      // Add the current line to the buffer
      buffer.push({ lineNum: lineNumber, text: line, highlight: true });
      
      // If not accumulating more context, output the buffer now
      if (opts.errorsOnly) {
        outputStream.write(`\n[Line ${lineNumber}] ${isError ? '🔴 ERROR: ' : '🟡 WARNING: '} ${line}\n`);
        buffer = [];
        contextBuffer = [];
      }
    } else if (inImportantSection) {
      // In important section, always output the line
      importantSectionLines++;
      outputStream.write(`${line}\n`);
    } else if (buffer.length > 0) {
      // Add more context after an error/warning
      buffer.push({ lineNum: lineNumber, text: line });
      
      // When we've collected enough context after the error, output the buffer
      const lastErrorIndex = [...buffer].reverse().findIndex(l => 
        ERROR_PATTERNS.some(p => p.test(l.text)) || 
        (opts.includeWarnings && WARNING_PATTERNS.some(p => p.test(l.text)))
      );
      
      if (lastErrorIndex >= opts.contextLines) {
        // Output the buffer with highlighting
        outputStream.write(`\n${'='.repeat(40)} ERROR/WARNING CONTEXT ${'='.repeat(40)}\n`);
        outputStream.write(`Section: ${lastSection || 'Unknown'}\n\n`);
        
        buffer.forEach(line => {
          const prefix = line.highlight ? 
            (ERROR_PATTERNS.some(p => p.test(line.text)) ? '🔴 ' : '🟡 ') : 
            '   ';
          outputStream.write(`[${line.lineNum}] ${prefix}${line.text}\n`);
        });
        outputStream.write(`${'='.repeat(100)}\n\n`);
        
        // Reset the buffer but keep recent context
        buffer = [];
      }
    }
  }
  
  // Output any remaining buffer
  if (buffer.length > 0 && !opts.errorsOnly) {
    outputStream.write(`\n${'='.repeat(40)} FINAL ERROR/WARNING CONTEXT ${'='.repeat(40)}\n`);
    buffer.forEach(line => {
      const prefix = line.highlight ? 
        (ERROR_PATTERNS.some(p => p.test(line.text)) ? '🔴 ' : '🟡 ') : 
        '   ';
      outputStream.write(`[${line.lineNum}] ${prefix}${line.text}\n`);
    });
    outputStream.write(`${'='.repeat(100)}\n\n`);
  }

  // Write summary
  outputStream.write(`\n\n====== ANALYSIS SUMMARY ======\n`);
  outputStream.write(`Total lines: ${totalLines}\n`);
  outputStream.write(`Error lines: ${errorLines}\n`);
  outputStream.write(`Warning lines: ${warningLines}\n`);
  outputStream.write(`Important section lines: ${importantSectionLines}\n`);
  
  // Close output file if writing to a file
  if (opts.outputFile) {
    outputStream.end();
    console.log(`✅ Analysis complete! Results saved to ${opts.outputFile}`);
  } else {
    console.log(`\n✅ Analysis complete!`);
  }
}

// Run the analysis
analyzeLog(logFilePath, options);
