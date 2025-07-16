import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const BuilderContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--transition-fast);
`;

const BuilderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--neutral-200);
`;

const Title = styled.h3`
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const PresetSelector = styled.select`
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const RuleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-700);
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const Input = styled.input<{ hasError?: boolean }>`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  ${props => props.hasError && `
    border-color: var(--red-500);
    background: var(--red-50);
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
`;

const Textarea = styled.textarea`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  resize: vertical;
  min-height: 80px;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const TestSection = styled.div`
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
`;

const TestHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: var(--space-3);
`;

const TestTitle = styled.h4`
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  flex: 1;
`;

const TestButton = styled.button`
  background: var(--primary-600);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-700);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TestInput = styled.input`
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin-right: var(--space-2);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
  }
`;

const TestResults = styled.div`
  margin-top: var(--space-3);
`;

const TestResult = styled.div<{ success: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
  
  ${props => props.success ? `
    background: var(--green-50);
    color: var(--green-700);
    border: 1px solid var(--green-200);
  ` : `
    background: var(--red-50);
    color: var(--red-700);
    border: 1px solid var(--red-200);
  `}
`;

const PresetTemplates = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-6);
`;

const PresetCard = styled.button`
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-50);
    border-color: var(--primary-300);
  }
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const PresetTitle = styled.div`
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  margin-bottom: var(--space-1);
`;

const PresetDescription = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-600);
  margin-bottom: var(--space-2);
`;

const PresetPattern = styled.code`
  font-size: var(--text-xs);
  color: var(--primary-600);
  background: var(--primary-100);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
`;

const ErrorMessage = styled.div`
  color: var(--red-600);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

interface ValidationRule {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: boolean;
  customMessage?: string;
  options?: string[];
}

interface ValidationRuleBuilderProps {
  rule: ValidationRule;
  variableType: string;
  onChange: (rule: ValidationRule) => void;
  onTest?: (pattern: string, value: string) => boolean;
}

const ValidationRuleBuilder: React.FC<ValidationRuleBuilderProps> = ({
  rule,
  variableType,
  onChange,
  onTest
}) => {
  const [testValue, setTestValue] = useState('');
  const [testResults, setTestResults] = useState<Array<{ value: string; success: boolean; message: string }>>([]);
  const [patternError, setPatternError] = useState('');

  const presetTemplates = [
    {
      id: 'email',
      title: 'Email Address',
      description: 'Standard email validation',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      examples: ['user@example.com', 'test.email+tag@domain.co.uk']
    },
    {
      id: 'phone',
      title: 'Phone Number',
      description: 'US phone number format',
      pattern: '^\\+?1?[-.\\s]?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}$',
      examples: ['(555) 123-4567', '+1-555-123-4567', '555.123.4567']
    },
    {
      id: 'url',
      title: 'URL/Website',
      description: 'HTTP/HTTPS URLs',
      pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
      examples: ['https://example.com', 'http://www.site.org/path']
    },
    {
      id: 'date',
      title: 'Date (MM/DD/YYYY)',
      description: 'US date format',
      pattern: '^(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])\\/(19|20)\\d{2}$',
      examples: ['12/25/2023', '01/01/2024']
    },
    {
      id: 'ssn',
      title: 'Social Security Number',
      description: 'XXX-XX-XXXX format',
      pattern: '^\\d{3}-\\d{2}-\\d{4}$',
      examples: ['123-45-6789']
    },
    {
      id: 'zipcode',
      title: 'ZIP Code',
      description: 'US ZIP code (5 or 9 digits)',
      pattern: '^\\d{5}(-\\d{4})?$',
      examples: ['12345', '12345-6789']
    },
    {
      id: 'currency',
      title: 'Currency Amount',
      description: 'Dollar amounts with optional cents',
      pattern: '^\\$?\\d{1,3}(,\\d{3})*(\\.\\d{2})?$',
      examples: ['$1,234.56', '1234.56', '$1,000']
    },
    {
      id: 'alphanumeric',
      title: 'Alphanumeric Only',
      description: 'Letters and numbers only',
      pattern: '^[a-zA-Z0-9]+$',
      examples: ['ABC123', 'test123']
    }
  ];

  const validatePattern = useCallback((pattern: string) => {
    try {
      new RegExp(pattern);
      setPatternError('');
      return true;
    } catch (error) {
      setPatternError('Invalid regular expression pattern');
      return false;
    }
  }, []);

  const handlePatternChange = useCallback((pattern: string) => {
    onChange({ ...rule, pattern });
    validatePattern(pattern);
  }, [rule, onChange, validatePattern]);

  const handlePresetSelect = useCallback((preset: any) => {
    const newRule = {
      ...rule,
      pattern: preset.pattern,
      customMessage: `Please enter a valid ${preset.title.toLowerCase()}`
    };
    onChange(newRule);
    validatePattern(preset.pattern);
  }, [rule, onChange, validatePattern]);

  const handleTest = useCallback(() => {
    if (!testValue.trim()) return;

    const success = onTest ? onTest(rule.pattern || '', testValue) : testWithBuiltInLogic();
    const message = success ? 'Valid' : (rule.customMessage || 'Invalid format');
    
    setTestResults(prev => [
      { value: testValue, success, message },
      ...prev.slice(0, 4) // Keep only last 5 results
    ]);
  }, [testValue, rule.pattern, rule.customMessage, onTest]);

  const testWithBuiltInLogic = useCallback(() => {
    if (!rule.pattern) return true;
    
    try {
      const regex = new RegExp(rule.pattern);
      return regex.test(testValue);
    } catch {
      return false;
    }
  }, [rule.pattern, testValue]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTest();
    }
  }, [handleTest]);

  return (
    <BuilderContainer>
      <BuilderHeader>
        <Title>🔧 Validation Rule Builder</Title>
        <PresetSelector 
          onChange={(e) => {
            const preset = presetTemplates.find(p => p.id === e.target.value);
            if (preset) handlePresetSelect(preset);
          }}
          defaultValue=""
        >
          <option value="">Choose a preset...</option>
          {presetTemplates.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.title}
            </option>
          ))}
        </PresetSelector>
      </BuilderHeader>

      <PresetTemplates>
        {presetTemplates.slice(0, 4).map(preset => (
          <PresetCard key={preset.id} onClick={() => handlePresetSelect(preset)}>
            <PresetTitle>{preset.title}</PresetTitle>
            <PresetDescription>{preset.description}</PresetDescription>
            <PresetPattern>{preset.pattern}</PresetPattern>
          </PresetCard>
        ))}
      </PresetTemplates>

      <RuleGrid>
        <FormGroup>
          <Label>Regular Expression Pattern</Label>
          <Input
            type="text"
            value={rule.pattern || ''}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder="^[a-zA-Z0-9]+$"
            hasError={!!patternError}
          />
          {patternError && (
            <ErrorMessage>⚠️ {patternError}</ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label>Custom Error Message</Label>
          <Input
            type="text"
            value={rule.customMessage || ''}
            onChange={(e) => onChange({ ...rule, customMessage: e.target.value })}
            placeholder="Please enter a valid value"
          />
        </FormGroup>

        {(variableType === 'text' || variableType === 'name') && (
          <>
            <FormGroup>
              <Label>Minimum Length</Label>
              <Input
                type="number"
                value={rule.minLength || ''}
                onChange={(e) => onChange({ ...rule, minLength: parseInt(e.target.value) || undefined })}
                min="0"
                placeholder="0"
              />
            </FormGroup>

            <FormGroup>
              <Label>Maximum Length</Label>
              <Input
                type="number"
                value={rule.maxLength || ''}
                onChange={(e) => onChange({ ...rule, maxLength: parseInt(e.target.value) || undefined })}
                min="1"
                placeholder="100"
              />
            </FormGroup>
          </>
        )}

        {(variableType === 'number' || variableType === 'currency') && (
          <>
            <FormGroup>
              <Label>Minimum Value</Label>
              <Input
                type="number"
                value={rule.min || ''}
                onChange={(e) => onChange({ ...rule, min: parseFloat(e.target.value) || undefined })}
                placeholder="0"
              />
            </FormGroup>

            <FormGroup>
              <Label>Maximum Value</Label>
              <Input
                type="number"
                value={rule.max || ''}
                onChange={(e) => onChange({ ...rule, max: parseFloat(e.target.value) || undefined })}
                placeholder="1000"
              />
            </FormGroup>
          </>
        )}
      </RuleGrid>

      <TestSection>
        <TestHeader>
          <TestTitle>🧪 Test Your Validation Rule</TestTitle>
        </TestHeader>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <TestInput
            type="text"
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a test value..."
          />
          <TestButton onClick={handleTest} disabled={!testValue.trim()}>
            Test
          </TestButton>
        </div>

        <TestResults>
          {testResults.map((result, index) => (
            <TestResult key={index} success={result.success}>
              {result.success ? '✅' : '❌'} 
              <code>{result.value}</code> - {result.message}
            </TestResult>
          ))}
        </TestResults>
      </TestSection>
    </BuilderContainer>
  );
};

export default ValidationRuleBuilder;