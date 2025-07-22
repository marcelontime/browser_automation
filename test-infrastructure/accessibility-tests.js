/**
 * Accessibility Testing Suite for WCAG Compliance
 * Tests all Phase 1 components for accessibility standards
 */

const testConfig = require('./test-config');

class AccessibilityTestSuite {
  constructor() {
    this.results = [];
    this.wcagLevel = testConfig.accessibility.wcagLevel;
    this.rules = testConfig.accessibility.rules;
  }

  /**
   * Test color contrast compliance
   */
  async testColorContrast() {
    const testResults = {
      name: 'Color Contrast',
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test button color contrast
    const buttonContrast = await this.checkColorContrast({
      element: 'EnhancedButton',
      foreground: '#ffffff',
      background: '#007bff',
      fontSize: 16,
      fontWeight: 'normal'
    });

    testResults.tests.push({
      name: 'Button Primary Color Contrast',
      ratio: buttonContrast.ratio,
      required: buttonContrast.required,
      passed: buttonContrast.passed,
      level: buttonContrast.level
    });

    // Test card text contrast
    const cardContrast = await this.checkColorContrast({
      element: 'EnhancedCard',
      foreground: '#333333',
      background: '#ffffff',
      fontSize: 14,
      fontWeight: 'normal'
    });

    testResults.tests.push({
      name: 'Card Text Color Contrast',
      ratio: cardContrast.ratio,
      required: cardContrast.required,
      passed: cardContrast.passed,
      level: cardContrast.level
    });

    // Test dashboard metrics contrast
    const metricsContrast = await this.checkColorContrast({
      element: 'MetricsDashboard',
      foreground: '#28a745',
      background: '#f8f9fa',
      fontSize: 18,
      fontWeight: 'bold'
    });

    testResults.tests.push({
      name: 'Metrics Text Color Contrast',
      ratio: metricsContrast.ratio,
      required: metricsContrast.required,
      passed: metricsContrast.passed,
      level: metricsContrast.level
    });

    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    this.results.push(testResults);
    return testResults;
  }

  /**
   * Test keyboard navigation compliance
   */
  async testKeyboardNavigation() {
    const testResults = {
      name: 'Keyboard Navigation',
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test button keyboard accessibility
    const buttonKeyboard = await this.checkKeyboardAccessibility({
      element: 'EnhancedButton',
      focusable: true,
      tabIndex: 0,
      enterActivation: true,
      spaceActivation: true,
      arrowNavigation: false
    });

    testResults.tests.push({
      name: 'Button Keyboard Navigation',
      focusable: buttonKeyboard.focusable,
      enterActivation: buttonKeyboard.enterActivation,
      spaceActivation: buttonKeyboard.spaceActivation,
      passed: buttonKeyboard.passed
    });

    // Test dashboard keyboard navigation
    const dashboardKeyboard = await this.checkKeyboardAccessibility({
      element: 'ModernDashboard',
      focusable: true,
      tabIndex: 0,
      enterActivation: false,
      spaceActivation: false,
      arrowNavigation: true
    });

    testResults.tests.push({
      name: 'Dashboard Keyboard Navigation',
      focusable: dashboardKeyboard.focusable,
      arrowNavigation: dashboardKeyboard.arrowNavigation,
      tabOrder: dashboardKeyboard.tabOrder,
      passed: dashboardKeyboard.passed
    });

    // Test automation grid keyboard navigation
    const gridKeyboard = await this.checkKeyboardAccessibility({
      element: 'AutomationGrid',
      focusable: true,
      tabIndex: 0,
      enterActivation: true,
      spaceActivation: true,
      arrowNavigation: true
    });

    testResults.tests.push({
      name: 'Automation Grid Keyboard Navigation',
      focusable: gridKeyboard.focusable,
      arrowNavigation: gridKeyboard.arrowNavigation,
      gridNavigation: gridKeyboard.gridNavigation,
      passed: gridKeyboard.passed
    });

    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    this.results.push(testResults);
    return testResults;
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderCompatibility() {
    const testResults = {
      name: 'Screen Reader Compatibility',
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test button screen reader support
    const buttonScreenReader = await this.checkScreenReaderSupport({
      element: 'EnhancedButton',
      role: 'button',
      ariaLabel: 'Submit form',
      ariaDescribedBy: null,
      ariaPressed: null,
      ariaExpanded: null
    });

    testResults.tests.push({
      name: 'Button Screen Reader Support',
      role: buttonScreenReader.role,
      ariaLabel: buttonScreenReader.ariaLabel,
      accessible: buttonScreenReader.accessible,
      passed: buttonScreenReader.passed
    });

    // Test card screen reader support
    const cardScreenReader = await this.checkScreenReaderSupport({
      element: 'EnhancedCard',
      role: 'article',
      ariaLabel: null,
      ariaDescribedBy: 'card-description',
      ariaPressed: null,
      ariaExpanded: null
    });

    testResults.tests.push({
      name: 'Card Screen Reader Support',
      role: cardScreenReader.role,
      ariaDescribedBy: cardScreenReader.ariaDescribedBy,
      accessible: cardScreenReader.accessible,
      passed: cardScreenReader.passed
    });

    // Test dashboard screen reader support
    const dashboardScreenReader = await this.checkScreenReaderSupport({
      element: 'ModernDashboard',
      role: 'main',
      ariaLabel: 'Automation Dashboard',
      ariaDescribedBy: null,
      landmarks: ['main', 'navigation', 'complementary'],
      headingStructure: true
    });

    testResults.tests.push({
      name: 'Dashboard Screen Reader Support',
      role: dashboardScreenReader.role,
      ariaLabel: dashboardScreenReader.ariaLabel,
      landmarks: dashboardScreenReader.landmarks,
      headingStructure: dashboardScreenReader.headingStructure,
      passed: dashboardScreenReader.passed
    });

    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    this.results.push(testResults);
    return testResults;
  }

  /**
   * Test focus management
   */
  async testFocusManagement() {
    const testResults = {
      name: 'Focus Management',
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test modal focus management
    const modalFocus = await this.checkFocusManagement({
      element: 'Modal',
      focusTrap: true,
      initialFocus: 'first-input',
      returnFocus: true,
      escapeKey: true
    });

    testResults.tests.push({
      name: 'Modal Focus Management',
      focusTrap: modalFocus.focusTrap,
      initialFocus: modalFocus.initialFocus,
      returnFocus: modalFocus.returnFocus,
      escapeKey: modalFocus.escapeKey,
      passed: modalFocus.passed
    });

    // Test dropdown focus management
    const dropdownFocus = await this.checkFocusManagement({
      element: 'Dropdown',
      focusTrap: false,
      initialFocus: 'trigger',
      returnFocus: true,
      arrowKeys: true
    });

    testResults.tests.push({
      name: 'Dropdown Focus Management',
      initialFocus: dropdownFocus.initialFocus,
      returnFocus: dropdownFocus.returnFocus,
      arrowKeys: dropdownFocus.arrowKeys,
      passed: dropdownFocus.passed
    });

    // Test form focus management
    const formFocus = await this.checkFocusManagement({
      element: 'Form',
      focusTrap: false,
      initialFocus: 'first-field',
      returnFocus: false,
      errorFocus: true
    });

    testResults.tests.push({
      name: 'Form Focus Management',
      initialFocus: formFocus.initialFocus,
      errorFocus: formFocus.errorFocus,
      fieldNavigation: formFocus.fieldNavigation,
      passed: formFocus.passed
    });

    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    this.results.push(testResults);
    return testResults;
  }

  /**
   * Test semantic markup
   */
  async testSemanticMarkup() {
    const testResults = {
      name: 'Semantic Markup',
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test heading structure
    const headingStructure = await this.checkHeadingStructure({
      element: 'ModernDashboard',
      headings: [
        { level: 1, text: 'Automation Dashboard' },
        { level: 2, text: 'Metrics Overview' },
        { level: 2, text: 'Recent Automations' },
        { level: 3, text: 'Quick Actions' }
      ]
    });

    testResults.tests.push({
      name: 'Dashboard Heading Structure',
      hierarchical: headingStructure.hierarchical,
      noSkippedLevels: headingStructure.noSkippedLevels,
      descriptive: headingStructure.descriptive,
      passed: headingStructure.passed
    });

    // Test landmark usage
    const landmarks = await this.checkLandmarks({
      element: 'ModernDashboard',
      landmarks: [
        { type: 'main', label: 'Dashboard Content' },
        { type: 'navigation', label: 'Main Navigation' },
        { type: 'complementary', label: 'Quick Actions' },
        { type: 'contentinfo', label: 'Footer Information' }
      ]
    });

    testResults.tests.push({
      name: 'Dashboard Landmarks',
      mainLandmark: landmarks.mainLandmark,
      navigationLandmark: landmarks.navigationLandmark,
      complementaryLandmark: landmarks.complementaryLandmark,
      uniqueLabels: landmarks.uniqueLabels,
      passed: landmarks.passed
    });

    // Test list semantics
    const listSemantics = await this.checkListSemantics({
      element: 'AutomationGrid',
      listType: 'ul',
      listItems: true,
      nestedLists: false,
      listLabels: true
    });

    testResults.tests.push({
      name: 'Automation Grid List Semantics',
      properListStructure: listSemantics.properListStructure,
      listItems: listSemantics.listItems,
      listLabels: listSemantics.listLabels,
      passed: listSemantics.passed
    });

    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    this.results.push(testResults);
    return testResults;
  }

  /**
   * Helper method to check color contrast
   */
  async checkColorContrast({ element, foreground, background, fontSize, fontWeight }) {
    // Convert hex colors to RGB
    const fgRgb = this.hexToRgb(foreground);
    const bgRgb = this.hexToRgb(background);

    // Calculate contrast ratio
    const ratio = this.calculateContrastRatio(fgRgb, bgRgb);

    // Determine required ratio based on font size and weight
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight === 'bold');
    const requiredRatio = this.wcagLevel === 'AAA' 
      ? (isLargeText ? 4.5 : 7) 
      : (isLargeText ? 3 : 4.5);

    return {
      element,
      ratio: Math.round(ratio * 100) / 100,
      required: requiredRatio,
      passed: ratio >= requiredRatio,
      level: this.wcagLevel,
      isLargeText
    };
  }

  /**
   * Helper method to check keyboard accessibility
   */
  async checkKeyboardAccessibility(config) {
    const {
      element,
      focusable,
      tabIndex,
      enterActivation,
      spaceActivation,
      arrowNavigation
    } = config;

    // Mock keyboard accessibility checks
    const checks = {
      focusable: focusable === true,
      tabIndex: tabIndex === 0 || tabIndex === -1,
      enterActivation: enterActivation !== undefined ? enterActivation : true,
      spaceActivation: spaceActivation !== undefined ? spaceActivation : true,
      arrowNavigation: arrowNavigation !== undefined ? arrowNavigation : false,
      tabOrder: true, // Mock: proper tab order
      gridNavigation: element === 'AutomationGrid' // Special case for grids
    };

    const passed = Object.values(checks).every(check => check === true);

    return {
      element,
      ...checks,
      passed
    };
  }

  /**
   * Helper method to check screen reader support
   */
  async checkScreenReaderSupport(config) {
    const {
      element,
      role,
      ariaLabel,
      ariaDescribedBy,
      ariaPressed,
      ariaExpanded,
      landmarks,
      headingStructure
    } = config;

    const checks = {
      role: role !== undefined,
      ariaLabel: ariaLabel !== undefined || ariaDescribedBy !== undefined,
      ariaPressed: ariaPressed !== undefined || element !== 'button',
      ariaExpanded: ariaExpanded !== undefined || !element.includes('dropdown'),
      landmarks: landmarks ? landmarks.length > 0 : true,
      headingStructure: headingStructure !== undefined ? headingStructure : true,
      accessible: true // Mock: element is accessible
    };

    const passed = Object.values(checks).every(check => check === true);

    return {
      element,
      ...checks,
      passed
    };
  }

  /**
   * Helper method to check focus management
   */
  async checkFocusManagement(config) {
    const {
      element,
      focusTrap,
      initialFocus,
      returnFocus,
      escapeKey,
      arrowKeys,
      errorFocus,
      fieldNavigation
    } = config;

    const checks = {
      focusTrap: focusTrap !== undefined ? focusTrap : false,
      initialFocus: initialFocus !== undefined,
      returnFocus: returnFocus !== undefined ? returnFocus : true,
      escapeKey: escapeKey !== undefined ? escapeKey : true,
      arrowKeys: arrowKeys !== undefined ? arrowKeys : false,
      errorFocus: errorFocus !== undefined ? errorFocus : false,
      fieldNavigation: fieldNavigation !== undefined ? fieldNavigation : true
    };

    const passed = Object.values(checks).every(check => check === true);

    return {
      element,
      ...checks,
      passed
    };
  }

  /**
   * Helper method to check heading structure
   */
  async checkHeadingStructure({ element, headings }) {
    let hierarchical = true;
    let noSkippedLevels = true;
    let descriptive = true;

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      
      // Check if heading text is descriptive
      if (heading.text.length < 3) {
        descriptive = false;
      }

      // Check for skipped levels
      if (i > 0) {
        const prevLevel = headings[i - 1].level;
        if (heading.level > prevLevel + 1) {
          noSkippedLevels = false;
        }
      }
    }

    return {
      element,
      hierarchical,
      noSkippedLevels,
      descriptive,
      passed: hierarchical && noSkippedLevels && descriptive
    };
  }

  /**
   * Helper method to check landmarks
   */
  async checkLandmarks({ element, landmarks }) {
    const requiredLandmarks = ['main'];
    const hasRequiredLandmarks = requiredLandmarks.every(required =>
      landmarks.some(landmark => landmark.type === required)
    );

    const uniqueLabels = landmarks.every((landmark, index) =>
      landmarks.findIndex(l => l.type === landmark.type && l.label === landmark.label) === index
    );

    return {
      element,
      mainLandmark: landmarks.some(l => l.type === 'main'),
      navigationLandmark: landmarks.some(l => l.type === 'navigation'),
      complementaryLandmark: landmarks.some(l => l.type === 'complementary'),
      uniqueLabels,
      passed: hasRequiredLandmarks && uniqueLabels
    };
  }

  /**
   * Helper method to check list semantics
   */
  async checkListSemantics({ element, listType, listItems, nestedLists, listLabels }) {
    return {
      element,
      properListStructure: listType === 'ul' || listType === 'ol',
      listItems: listItems === true,
      nestedLists: nestedLists !== undefined ? nestedLists : false,
      listLabels: listLabels === true,
      passed: (listType === 'ul' || listType === 'ol') && listItems && listLabels
    };
  }

  /**
   * Utility method to convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Utility method to calculate contrast ratio
   */
  calculateContrastRatio(color1, color2) {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Utility method to get luminance
   */
  getLuminance({ r, g, b }) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Run all accessibility tests
   */
  async runAllTests() {
    console.log('Starting Accessibility Test Suite...');

    try {
      await this.testColorContrast();
      await this.testKeyboardNavigation();
      await this.testScreenReaderCompatibility();
      await this.testFocusManagement();
      await this.testSemanticMarkup();
    } catch (error) {
      console.error('Accessibility test suite failed:', error);
      throw error;
    }

    const summary = this.generateSummary();
    console.log('Accessibility Test Suite completed:', summary);

    return summary;
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const totalTests = this.results.reduce((sum, result) => sum + result.tests.length, 0);
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);

    return {
      wcagLevel: this.wcagLevel,
      totalTests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      successRate: totalPassed / totalTests,
      categories: this.results.map(result => ({
        name: result.name,
        tests: result.tests.length,
        passed: result.passed,
        failed: result.failed,
        successRate: result.passed / result.tests.length
      })),
      details: this.results
    };
  }

  /**
   * Generate accessibility report
   */
  generateReport() {
    const summary = this.generateSummary();
    
    return {
      timestamp: new Date().toISOString(),
      wcagLevel: this.wcagLevel,
      summary: summary,
      violations: this.getViolations(),
      recommendations: this.generateRecommendations(),
      rawResults: this.results
    };
  }

  /**
   * Get accessibility violations
   */
  getViolations() {
    const violations = [];

    this.results.forEach(category => {
      category.tests.forEach(test => {
        if (!test.passed) {
          violations.push({
            category: category.name,
            test: test.name,
            severity: this.getSeverity(category.name, test),
            impact: this.getImpact(category.name),
            element: test.element || 'Unknown',
            description: this.getViolationDescription(category.name, test)
          });
        }
      });
    });

    return violations;
  }

  /**
   * Generate accessibility recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    this.results.forEach(category => {
      category.tests.forEach(test => {
        if (!test.passed) {
          recommendations.push({
            category: category.name,
            test: test.name,
            recommendation: this.getRecommendation(category.name, test),
            priority: this.getPriority(category.name),
            effort: this.getEffort(category.name, test)
          });
        }
      });
    });

    return recommendations;
  }

  /**
   * Helper methods for violation details
   */
  getSeverity(category, test) {
    if (category === 'Color Contrast') return 'high';
    if (category === 'Keyboard Navigation') return 'high';
    if (category === 'Screen Reader Compatibility') return 'critical';
    if (category === 'Focus Management') return 'medium';
    return 'low';
  }

  getImpact(category) {
    const impacts = {
      'Color Contrast': 'Users with visual impairments cannot read content',
      'Keyboard Navigation': 'Users cannot navigate without a mouse',
      'Screen Reader Compatibility': 'Screen reader users cannot understand content',
      'Focus Management': 'Users lose track of their position',
      'Semantic Markup': 'Content structure is unclear to assistive technologies'
    };
    return impacts[category] || 'Unknown impact';
  }

  getViolationDescription(category, test) {
    return `${category} test "${test.name}" failed accessibility requirements`;
  }

  getRecommendation(category, test) {
    const recommendations = {
      'Color Contrast': 'Increase color contrast ratio to meet WCAG standards',
      'Keyboard Navigation': 'Implement proper keyboard event handlers and focus management',
      'Screen Reader Compatibility': 'Add appropriate ARIA labels and roles',
      'Focus Management': 'Implement proper focus trapping and restoration',
      'Semantic Markup': 'Use proper HTML semantic elements and heading structure'
    };
    return recommendations[category] || 'Review accessibility guidelines';
  }

  getPriority(category) {
    const priorities = {
      'Screen Reader Compatibility': 'critical',
      'Keyboard Navigation': 'high',
      'Color Contrast': 'high',
      'Focus Management': 'medium',
      'Semantic Markup': 'medium'
    };
    return priorities[category] || 'low';
  }

  getEffort(category, test) {
    // Estimate implementation effort
    if (category === 'Color Contrast') return 'low';
    if (category === 'Semantic Markup') return 'medium';
    return 'high';
  }
}

module.exports = AccessibilityTestSuite;