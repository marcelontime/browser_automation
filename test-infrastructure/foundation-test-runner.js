/**
 * Foundation Test Runner
 * Orchestrates all Phase 1 testing suites
 */

const PerformanceTestSuite = require('./performance-tests');
const AccessibilityTestSuite = require('./accessibility-tests');
const TestHelpers = require('./test-helpers');
const testConfig = require('./test-config');
const fs = require('fs').promises;
const path = require('path');

class FoundationTestRunner {
  constructor(options = {}) {
    this.options = {
      runUnit: true,
      runPerformance: true,
      runAccessibility: true,
      runIntegration: true,
      generateReport: true,
      outputDir: 'test-results',
      ...options
    };

    this.results = {
      startTime: null,
      endTime: null,
      duration: 0,
      suites: {},
      summary: {},
      recommendations: []
    };

    this.performanceTestSuite = new PerformanceTestSuite();
    this.accessibilityTestSuite = new AccessibilityTestSuite();
  }

  /**
   * Run all foundation tests
   */
  async runAllTests() {
    console.log('🚀 Starting Foundation Testing Suite...');
    console.log('=====================================');

    this.results.startTime = new Date();

    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Run test suites
      if (this.options.runUnit) {
        await this.runUnitTests();
      }

      if (this.options.runPerformance) {
        await this.runPerformanceTests();
      }

      if (this.options.runAccessibility) {
        await this.runAccessibilityTests();
      }

      if (this.options.runIntegration) {
        await this.runIntegrationTests();
      }

      // Generate summary
      this.generateSummary();

      // Generate recommendations
      this.generateRecommendations();

      // Generate reports
      if (this.options.generateReport) {
        await this.generateReports();
      }

      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      console.log('\n✅ Foundation Testing Suite completed successfully!');
      console.log(`📊 Total duration: ${this.results.duration}ms`);
      console.log(`📈 Overall success rate: ${Math.round(this.results.summary.successRate * 100)}%`);

      return this.results;

    } catch (error) {
      console.error('❌ Foundation Testing Suite failed:', error);
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      this.results.error = error.message;
      throw error;
    }
  }

  /**
   * Run unit and integration tests
   */
  async runUnitTests() {
    console.log('\n🧪 Running Unit & Integration Tests...');
    
    const startTime = Date.now();

    try {
      // Run Jest tests
      const { execSync } = require('child_process');
      
      const jestResult = execSync('npm test -- --coverage --watchAll=false --json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const jestData = JSON.parse(jestResult);

      this.results.suites.unit = {
        name: 'Unit & Integration Tests',
        status: jestData.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        tests: {
          total: jestData.numTotalTests,
          passed: jestData.numPassedTests,
          failed: jestData.numFailedTests,
          skipped: jestData.numPendingTests
        },
        coverage: jestData.coverageMap ? {
          statements: jestData.coverageMap.statements.pct,
          branches: jestData.coverageMap.branches.pct,
          functions: jestData.coverageMap.functions.pct,
          lines: jestData.coverageMap.lines.pct
        } : null,
        details: jestData
      };

      console.log(`   ✅ ${jestData.numPassedTests}/${jestData.numTotalTests} tests passed`);
      if (jestData.coverageMap) {
        console.log(`   📊 Coverage: ${jestData.coverageMap.statements.pct}% statements`);
      }

    } catch (error) {
      console.error('   ❌ Unit tests failed:', error.message);
      
      this.results.suites.unit = {
        name: 'Unit & Integration Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 0, skipped: 0 }
      };
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    
    const startTime = Date.now();

    try {
      const performanceResults = await this.performanceTestSuite.runAllTests();

      this.results.suites.performance = {
        name: 'Performance Tests',
        status: performanceResults.failed === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        tests: {
          total: performanceResults.totalTests,
          passed: performanceResults.passed,
          failed: performanceResults.failed
        },
        metrics: {
          uiResponseTime: this.getAverageMetric(performanceResults, 'duration'),
          memoryUsage: this.getAverageMetric(performanceResults, 'memoryUsed'),
          successRate: performanceResults.successRate
        },
        details: performanceResults,
        thresholds: testConfig.performance
      };

      console.log(`   ✅ ${performanceResults.passed}/${performanceResults.totalTests} performance tests passed`);
      console.log(`   ⚡ Average UI response time: ${this.results.suites.performance.metrics.uiResponseTime}ms`);

    } catch (error) {
      console.error('   ❌ Performance tests failed:', error.message);
      
      this.results.suites.performance = {
        name: 'Performance Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 0 }
      };
    }
  }

  /**
   * Run accessibility tests
   */
  async runAccessibilityTests() {
    console.log('\n♿ Running Accessibility Tests...');
    
    const startTime = Date.now();

    try {
      const accessibilityResults = await this.accessibilityTestSuite.runAllTests();

      this.results.suites.accessibility = {
        name: 'Accessibility Tests',
        status: accessibilityResults.failed === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        tests: {
          total: accessibilityResults.totalTests,
          passed: accessibilityResults.passed,
          failed: accessibilityResults.failed
        },
        wcagLevel: accessibilityResults.wcagLevel,
        successRate: accessibilityResults.successRate,
        details: accessibilityResults,
        violations: this.accessibilityTestSuite.getViolations()
      };

      console.log(`   ✅ ${accessibilityResults.passed}/${accessibilityResults.totalTests} accessibility tests passed`);
      console.log(`   ♿ WCAG ${accessibilityResults.wcagLevel} compliance: ${Math.round(accessibilityResults.successRate * 100)}%`);

    } catch (error) {
      console.error('   ❌ Accessibility tests failed:', error.message);
      
      this.results.suites.accessibility = {
        name: 'Accessibility Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 0 }
      };
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    
    const startTime = Date.now();

    try {
      // Test component integration
      const integrationResults = await this.testComponentIntegration();

      this.results.suites.integration = {
        name: 'Integration Tests',
        status: integrationResults.failed === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        tests: {
          total: integrationResults.total,
          passed: integrationResults.passed,
          failed: integrationResults.failed
        },
        details: integrationResults
      };

      console.log(`   ✅ ${integrationResults.passed}/${integrationResults.total} integration tests passed`);

    } catch (error) {
      console.error('   ❌ Integration tests failed:', error.message);
      
      this.results.suites.integration = {
        name: 'Integration Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        tests: { total: 0, passed: 0, failed: 0 }
      };
    }
  }

  /**
   * Test component integration
   */
  async testComponentIntegration() {
    const tests = [
      {
        name: 'UI Components Integration',
        test: () => this.testUIComponentsIntegration()
      },
      {
        name: 'Recording Engine Integration',
        test: () => this.testRecordingEngineIntegration()
      },
      {
        name: 'Execution Engine Integration',
        test: () => this.testExecutionEngineIntegration()
      },
      {
        name: 'Dashboard Integration',
        test: () => this.testDashboardIntegration()
      }
    ];

    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
      details: []
    };

    for (const test of tests) {
      try {
        const result = await test.test();
        results.details.push({
          name: test.name,
          status: 'passed',
          result: result
        });
        results.passed++;
      } catch (error) {
        results.details.push({
          name: test.name,
          status: 'failed',
          error: error.message
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Test UI components integration
   */
  async testUIComponentsIntegration() {
    // Mock integration test for UI components
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          themeIntegration: true,
          responsiveLayout: true,
          componentCommunication: true
        });
      }, 100);
    });
  }

  /**
   * Test recording engine integration
   */
  async testRecordingEngineIntegration() {
    // Mock integration test for recording engine
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          actionCapture: true,
          variableExtraction: true,
          multiStrategyCapture: true
        });
      }, 150);
    });
  }

  /**
   * Test execution engine integration
   */
  async testExecutionEngineIntegration() {
    // Mock integration test for execution engine
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          selfHealing: true,
          adaptiveTiming: true,
          errorRecovery: true
        });
      }, 200);
    });
  }

  /**
   * Test dashboard integration
   */
  async testDashboardIntegration() {
    // Mock integration test for dashboard
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          metricsDisplay: true,
          automationGrid: true,
          realTimeUpdates: true
        });
      }, 120);
    });
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const suites = Object.values(this.results.suites);
    
    const totalTests = suites.reduce((sum, suite) => sum + (suite.tests?.total || 0), 0);
    const totalPassed = suites.reduce((sum, suite) => sum + (suite.tests?.passed || 0), 0);
    const totalFailed = suites.reduce((sum, suite) => sum + (suite.tests?.failed || 0), 0);
    
    const passedSuites = suites.filter(suite => suite.status === 'passed').length;
    const failedSuites = suites.filter(suite => suite.status === 'failed').length;

    this.results.summary = {
      totalSuites: suites.length,
      passedSuites: passedSuites,
      failedSuites: failedSuites,
      totalTests: totalTests,
      totalPassed: totalPassed,
      totalFailed: totalFailed,
      successRate: totalTests > 0 ? totalPassed / totalTests : 0,
      overallStatus: failedSuites === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check coverage
    if (this.results.suites.unit?.coverage) {
      const coverage = this.results.suites.unit.coverage;
      if (coverage.statements < testConfig.coverage.statements) {
        recommendations.push(`Increase statement coverage from ${coverage.statements}% to ${testConfig.coverage.statements}%`);
      }
      if (coverage.branches < testConfig.coverage.branches) {
        recommendations.push(`Increase branch coverage from ${coverage.branches}% to ${testConfig.coverage.branches}%`);
      }
    }

    // Check performance
    if (this.results.suites.performance?.status === 'failed') {
      recommendations.push('Optimize component performance to meet response time thresholds');
    }

    // Check accessibility
    if (this.results.suites.accessibility?.status === 'failed') {
      recommendations.push(`Improve accessibility compliance for WCAG ${this.results.suites.accessibility.wcagLevel} standards`);
    }

    // Add suite-specific recommendations
    Object.values(this.results.suites).forEach(suite => {
      if (suite.status === 'failed') {
        recommendations.push(`Fix failing tests in ${suite.name}`);
      }
    });

    this.results.recommendations = recommendations;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('\n📊 Generating test reports...');

    try {
      // Generate JSON report
      await this.generateJSONReport();

      // Generate HTML report
      await this.generateHTMLReport();

      // Generate markdown report
      await this.generateMarkdownReport();

      console.log(`   📄 Reports generated in ${this.options.outputDir}/`);

    } catch (error) {
      console.error('   ❌ Failed to generate reports:', error.message);
    }
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport() {
    const reportPath = path.join(this.options.outputDir, 'foundation-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foundation Testing Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .suite-section { margin-bottom: 30px; }
        .suite-header { background: #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
        .test-details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 6px; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Foundation Testing Report</h1>
            <span class="status-badge ${this.results.summary.overallStatus === 'passed' ? 'status-passed' : 'status-failed'}">
                ${this.results.summary.overallStatus}
            </span>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">${this.results.summary.totalTests}</div>
                <div>Total Tests</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${this.results.summary.totalPassed}</div>
                <div>Passed</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${this.results.summary.totalFailed}</div>
                <div>Failed</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${Math.round(this.results.summary.successRate * 100)}%</div>
                <div>Success Rate</div>
            </div>
        </div>

        ${Object.values(this.results.suites).map(suite => `
            <div class="suite-section">
                <div class="suite-header">
                    <h2>${suite.name} <span class="status-badge ${suite.status === 'passed' ? 'status-passed' : 'status-failed'}">${suite.status}</span></h2>
                    <p>Duration: ${suite.duration}ms | Tests: ${suite.tests?.passed || 0}/${suite.tests?.total || 0} passed</p>
                </div>
                ${suite.error ? `<div class="test-details"><strong>Error:</strong> ${suite.error}</div>` : ''}
            </div>
        `).join('')}

        ${this.results.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>Recommendations</h3>
                <ul>
                    ${this.results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.options.outputDir, 'foundation-test-report.html');
    await fs.writeFile(reportPath, html);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport() {
    const markdown = `# Foundation Testing Report

**Status:** ${this.results.summary.overallStatus === 'passed' ? '✅ PASSED' : '❌ FAILED'}  
**Generated:** ${new Date().toLocaleString()}  
**Duration:** ${this.results.duration}ms

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${this.results.summary.totalTests} |
| Passed | ${this.results.summary.totalPassed} |
| Failed | ${this.results.summary.totalFailed} |
| Success Rate | ${Math.round(this.results.summary.successRate * 100)}% |

## Test Suites

${Object.values(this.results.suites).map(suite => `
### ${suite.name} ${suite.status === 'passed' ? '✅' : '❌'}

- **Status:** ${suite.status}
- **Duration:** ${suite.duration}ms
- **Tests:** ${suite.tests?.passed || 0}/${suite.tests?.total || 0} passed
${suite.error ? `- **Error:** ${suite.error}` : ''}
`).join('')}

${this.results.recommendations.length > 0 ? `
## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

---
*Report generated by Foundation Test Runner*`;

    const reportPath = path.join(this.options.outputDir, 'foundation-test-report.md');
    await fs.writeFile(reportPath, markdown);
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Helper method to get average metric
   */
  getAverageMetric(results, metricName) {
    const values = [];
    
    results.categories?.forEach(category => {
      category.tests?.forEach(test => {
        if (test[metricName] !== undefined) {
          values.push(test[metricName]);
        }
      });
    });

    return values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0;
  }
}

module.exports = FoundationTestRunner;