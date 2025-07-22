#!/usr/bin/env node

/**
 * Foundation Testing Suite Execution Script
 * Runs comprehensive tests for Phase 1 components
 */

const FoundationTestRunner = require('./test-infrastructure/foundation-test-runner');
const { program } = require('commander');

// Configure command line options
program
  .name('foundation-tests')
  .description('Run comprehensive foundation testing suite')
  .version('1.0.0')
  .option('-u, --unit', 'Run unit tests only')
  .option('-p, --performance', 'Run performance tests only')
  .option('-a, --accessibility', 'Run accessibility tests only')
  .option('-i, --integration', 'Run integration tests only')
  .option('--no-report', 'Skip report generation')
  .option('-o, --output <dir>', 'Output directory for reports', 'test-results')
  .option('--ci', 'Run in CI mode (exit with error code on failure)')
  .option('--verbose', 'Enable verbose logging')
  .parse();

const options = program.opts();

async function main() {
  try {
    console.log('🚀 Foundation Testing Suite');
    console.log('============================');
    
    if (options.verbose) {
      console.log('Options:', options);
    }

    // Configure test runner options
    const runnerOptions = {
      runUnit: options.unit || (!options.performance && !options.accessibility && !options.integration),
      runPerformance: options.performance || (!options.unit && !options.accessibility && !options.integration),
      runAccessibility: options.accessibility || (!options.unit && !options.performance && !options.integration),
      runIntegration: options.integration || (!options.unit && !options.performance && !options.accessibility),
      generateReport: options.report !== false,
      outputDir: options.output,
      verbose: options.verbose
    };

    // If specific test type is selected, run only that type
    if (options.unit || options.performance || options.accessibility || options.integration) {
      runnerOptions.runUnit = !!options.unit;
      runnerOptions.runPerformance = !!options.performance;
      runnerOptions.runAccessibility = !!options.accessibility;
      runnerOptions.runIntegration = !!options.integration;
    }

    // Create and run test suite
    const testRunner = new FoundationTestRunner(runnerOptions);
    const results = await testRunner.runAllTests();

    // Display results summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Overall Status: ${results.summary.overallStatus === 'passed' ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Tests: ${results.summary.totalTests}`);
    console.log(`Passed: ${results.summary.totalPassed}`);
    console.log(`Failed: ${results.summary.totalFailed}`);
    console.log(`Success Rate: ${Math.round(results.summary.successRate * 100)}%`);
    console.log(`Duration: ${results.duration}ms`);

    // Display suite breakdown
    console.log('\n📋 Suite Breakdown');
    console.log('==================');
    Object.values(results.suites).forEach(suite => {
      const status = suite.status === 'passed' ? '✅' : '❌';
      console.log(`${status} ${suite.name}: ${suite.tests?.passed || 0}/${suite.tests?.total || 0} (${suite.duration}ms)`);
    });

    // Display recommendations
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations');
      console.log('==================');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Display report locations
    if (runnerOptions.generateReport) {
      console.log('\n📄 Reports Generated');
      console.log('====================');
      console.log(`📊 HTML Report: ${runnerOptions.outputDir}/foundation-test-report.html`);
      console.log(`📋 JSON Report: ${runnerOptions.outputDir}/foundation-test-report.json`);
      console.log(`📝 Markdown Report: ${runnerOptions.outputDir}/foundation-test-report.md`);
    }

    // Exit with appropriate code for CI
    if (options.ci) {
      process.exit(results.summary.overallStatus === 'passed' ? 0 : 1);
    }

  } catch (error) {
    console.error('\n❌ Foundation Testing Suite Failed');
    console.error('===================================');
    console.error('Error:', error.message);
    
    if (options.verbose) {
      console.error('Stack trace:', error.stack);
    }

    if (options.ci) {
      process.exit(1);
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main();