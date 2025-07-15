# 🧪 Brazilian Insurance Test Script Usage Guide

## Overview
This test script validates our browser automation server (port 7079) against the sophisticated Brazilian insurance automation workflow from `Traducao_PW_Simulador_v32.py`.

## Prerequisites
1. **Server Running**: Ensure your browser automation server is running on port 7079
   ```bash
   npm start
   # Server should be accessible at http://localhost:7079
   ```

2. **Dependencies**: Install required Node.js packages
   ```bash
   npm install ws
   # The script uses WebSocket for communication
   ```

## Basic Usage

### Single Test Scenario
```bash
node test_brazilian_insurance_automation.js
```

**What it does:**
- Connects to your server via WebSocket
- Executes 12-step Brazilian insurance workflow
- Generates detailed test report
- Saves results to `test_reports/` directory

### Extended Test Suite
```bash
node test_brazilian_insurance_automation.js --extended
```

**What it does:**
- Runs multiple scenarios (Lawyer, Doctor, Engineer)
- Tests different person types (Individual vs Company)
- Validates various coverage amounts
- Provides comprehensive success rate analysis

## Test Workflow Steps

### **Authentication Phase**
1. **Navigate** to `https://azut1-br-digital.azurewebsites.net/login`
2. **Handle popups** if present
3. **Fill CPF** field with `381.151.977-85`
4. **Fill password** field with `akad@2025`
5. **Submit login** credentials

### **Form Navigation Phase**
6. **Navigate** to "New Quote" section
7. **Select person type** (Pessoa Física/Jurídica)
8. **Select profession** from dropdown
9. **Fill personal information** (name, email)

### **Insurance Configuration Phase**
10. **Select professional activity** from dropdown
11. **Select coverage amount** (R$ 100.000,00)
12. **Configure claims history** (5-year, 12-month)
13. **Generate quote** and wait for results

## Expected Output

### Success Example
```
🚀 BRAZILIAN INSURANCE AUTOMATION TEST
=====================================
Target: https://azut1-br-digital.azurewebsites.net/login
Workflow: Professional Liability Insurance Quote

🎯 [1/12] Navigate to insurance portal login page
📤 Command: navigate to https://azut1-br-digital.azurewebsites.net/login
📨 Server response: { type: 'navigation_complete', message: 'Navigated to target page' }

🎯 [2/12] Handle initial popup dismissal
📤 Command: if there is a popup or modal, close it
📨 Server response: { type: 'action_completed', message: 'Modal closed' }

... (continues for all 12 steps)

🎉 TEST COMPLETED

📊 TEST REPORT SUMMARY
=====================
Duration: 45.3s
Steps Completed: 12/12
Success Rate: 100.0%
Report saved: test_reports/brazilian_insurance_test_1752432156789.json
```

### Error Example
```
❌ Test execution failed: Connection timeout
❌ ERROR REPORT
===============
Error: Connection timeout
Failed at step: 3/12
Error report saved: test_reports/brazilian_insurance_error_1752432156789.json
```

## Test Reports

### Report Structure
```json
{
  "testName": "Brazilian Insurance Automation Test",
  "duration": "45.3s",
  "totalSteps": 12,
  "completedSteps": 12,
  "successRate": "100.0%",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    {
      "timestamp": "2024-01-15T10:30:01.000Z",
      "step": 1,
      "message": "Navigated to target page",
      "type": "navigation_complete",
      "success": true
    }
  ],
  "testData": {
    "cpf": "381.151.977-85",
    "password": "Akad@2025",
    "nome_completo": "Endosso Simulado",
    "email": "simulador@gmail.com"
  }
}
```

## Integration with Development

### Phase Validation
Use this test to validate each implementation phase:

```bash
# Test Phase 1: Basic navigation
node test_brazilian_insurance_automation.js
# Should complete steps 1-5 (authentication)

# Test Phase 2: Form handling
node test_brazilian_insurance_automation.js
# Should complete steps 6-9 (form navigation)

# Test Phase 3: Business logic
node test_brazilian_insurance_automation.js
# Should complete steps 10-12 (insurance configuration)

# Test Phase 4: Complete workflow
node test_brazilian_insurance_automation.js --extended
# Should complete all scenarios with high success rate
```

### Continuous Integration
```bash
# Add to your CI/CD pipeline
npm test && node test_brazilian_insurance_automation.js --extended
```

## Troubleshooting

### Common Issues

**Connection Refused**
```
❌ Connection error: ECONNREFUSED
```
**Solution**: Ensure server is running on port 7079

**Timeout Errors**
```
❌ Server response timeout
```
**Solution**: Increase timeout values or check server performance

**Authentication Failures**
```
❌ Login failed: Invalid credentials
```
**Solution**: Verify CPF/password are correct for the test environment

**Form Navigation Issues**
```
❌ Element not found: dropdown
```
**Solution**: Check if server supports enhanced form handling

## Performance Benchmarks

### Target Metrics
- **Connection Time**: < 2 seconds
- **Total Test Duration**: < 60 seconds
- **Success Rate**: > 95%
- **Step Completion Time**: < 5 seconds per step

### Performance Optimization
1. **Parallel Processing**: Run multiple test scenarios simultaneously
2. **Caching**: Cache authentication tokens between tests
3. **Timeout Tuning**: Adjust timeouts based on server performance
4. **Resource Management**: Monitor memory usage during extended tests

## Advanced Usage

### Custom Test Scenarios
```javascript
// Create custom test data
const customTester = new BrazilianInsuranceAutomationTester();
customTester.testData = {
    cpf: 'your-custom-cpf',
    profissao: 'Médicos',
    atividade: 'Medicina Especializada',
    importancia_segurada: 'R$ 500.000,00'
};
```

### Test Data Validation
```javascript
// Validate Brazilian documents
const isValidCPF = BrazilianInsuranceTestUtils.validateCPF('381.151.977-85');
const isValidCNPJ = BrazilianInsuranceTestUtils.validateCNPJ('63.375.633/0001-02');
```

## Next Steps

1. **Run Basic Test**: Start with single scenario
2. **Analyze Results**: Check success rate and performance
3. **Identify Issues**: Review error reports
4. **Implement Fixes**: Address server limitations
5. **Run Extended Test**: Validate with multiple scenarios
6. **Monitor Performance**: Track improvements over time

This test script serves as both a validation tool and a benchmark for measuring the progress of our server implementation against real-world complex automation scenarios. 