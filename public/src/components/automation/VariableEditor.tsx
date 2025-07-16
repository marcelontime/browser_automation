import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const EditorContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-400);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

const EditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--neutral-200);
`;

const VariableTitle = styled.h3`
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const VariableTypeTag = styled.span<{ type: string }>`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  
  ${props => {
    const colors = {
      email: 'var(--blue-100) var(--blue-700)',
      password: 'var(--red-100) var(--red-700)',
      phone: 'var(--green-100) var(--green-700)',
      date: 'var(--purple-100) var(--purple-700)',
      url: 'var(--indigo-100) var(--indigo-700)',
      number: 'var(--orange-100) var(--orange-700)',
      currency: 'var(--emerald-100) var(--emerald-700)',
      text: 'var(--gray-100) var(--gray-700)',
      name: 'var(--pink-100) var(--pink-700)',
      sensitive: 'var(--red-100) var(--red-700)'
    };
    const [bg, color] = (colors[props.type as keyof typeof colors] || colors.text).split(' ');
    return `background: ${bg}; color: ${color};`;
  }}
`;

const EditorForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  
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

const RequiredIndicator = styled.span`
  color: var(--red-500);
  font-weight: var(--font-semibold);
`;

const Input = styled.input<{ hasError?: boolean }>`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
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

const Select = styled.select<{ hasError?: boolean }>`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: white;
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

const Textarea = styled.textarea<{ hasError?: boolean }>`
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
  
  ${props => props.hasError && `
    border-color: var(--red-500);
    background: var(--red-50);
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: var(--primary-600);
`;

const ExamplesSection = styled.div`
  grid-column: 1 / -1;
`;

const ExamplesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const ExampleTag = styled.span`
  background: var(--neutral-100);
  color: var(--neutral-700);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-family: var(--font-family-mono);
`;

const ValidationSection = styled.div`
  grid-column: 1 / -1;
  background: var(--neutral-50);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--neutral-200);
`;

const ValidationTitle = styled.h4`
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
`;

const ValidationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
`;

const ErrorMessage = styled.div`
  color: var(--red-600);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const SuccessMessage = styled.div`
  color: var(--green-600);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const TestButton = styled.button`
  background: var(--primary-100);
  color: var(--primary-700);
  border: 1px solid var(--primary-300);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-200);
    border-color: var(--primary-400);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface Variable {
  id: string;
  name: string;
  type: string;
  value: string;
  defaultValue?: string;
  description: string;
  examples: string[];
  validation: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[];
    customMessage?: string;
  };
  sensitive: boolean;
  confidenceScore: number;
  category: string;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    rule: string;
    message: string;
  }>;
  warnings: Array<{
    rule: string;
    message: string;
  }>;
}

interface VariableEditorProps {
  variable: Variable;
  onChange: (updates: Partial<Variable>) => void;
  onValidate: (value: string) => ValidationResult;
  showAdvanced?: boolean;
}

const VariableEditor: React.FC<VariableEditorProps> = ({
  variable,
  onChange,
  onValidate,
  showAdvanced = false
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate when value changes
  useEffect(() => {
    if (variable.value) {
      const result = onValidate(variable.value);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [variable.value, onValidate]);

  const handleChange = useCallback((field: keyof Variable, value: any) => {
    onChange({ [field]: value });
  }, [onChange]);

  const handleValidationChange = useCallback((field: string, value: any) => {
    const newValidation = { ...variable.validation, [field]: value };
    onChange({ validation: newValidation });
  }, [variable.validation, onChange]);

  const handleTestValidation = async () => {
    setIsValidating(true);
    try {
      const result = onValidate(variable.value);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [{ rule: 'test_error', message: 'Validation test failed' }],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: '📧',
      password: '🔒',
      phone: '📞',
      date: '📅',
      url: '🔗',
      number: '🔢',
      currency: '💰',
      text: '📝',
      name: '👤',
      sensitive: '🔐'
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  const variableTypes = [
    'text', 'email', 'password', 'phone', 'date', 'url', 'number', 'currency', 'name', 'sensitive'
  ];

  return (
    <EditorContainer>
      <EditorHeader>
        <VariableTitle>
          {getTypeIcon(variable.type)} {variable.name}
          {variable.validation.required && <RequiredIndicator>*</RequiredIndicator>}
        </VariableTitle>
        <VariableTypeTag type={variable.type}>
          {variable.type}
        </VariableTypeTag>
      </EditorHeader>

      <EditorForm>
        <FormGroup>
          <Label>
            Variable Name
            <RequiredIndicator>*</RequiredIndicator>
          </Label>
          <Input
            type="text"
            value={variable.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter variable name"
            hasError={!variable.name}
          />
          {!variable.name && (
            <ErrorMessage>⚠️ Variable name is required</ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label>Variable Type</Label>
          <Select
            value={variable.type}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            {variableTypes.map(type => (
              <option key={type} value={type}>
                {getTypeIcon(type)} {type}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>
            Current Value
            {variable.validation.required && <RequiredIndicator>*</RequiredIndicator>}
          </Label>
          <Input
            type={variable.sensitive ? 'password' : 
                 variable.type === 'email' ? 'email' :
                 variable.type === 'url' ? 'url' :
                 variable.type === 'number' || variable.type === 'currency' ? 'number' :
                 variable.type === 'date' ? 'date' : 'text'}
            value={variable.value}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder={variable.examples[0] || `Enter ${variable.type}...`}
            hasError={Boolean(validationResult && !validationResult.valid)}
            min={variable.validation.min}
            max={variable.validation.max}
            minLength={variable.validation.minLength}
            maxLength={variable.validation.maxLength}
            pattern={variable.validation.pattern}
            required={variable.validation.required}
          />
          {validationResult && !validationResult.valid && (
            <ErrorMessage>
              ⚠️ {validationResult.errors[0]?.message}
            </ErrorMessage>
          )}
          {validationResult && validationResult.valid && (
            <SuccessMessage>
              ✅ Valid {variable.type}
            </SuccessMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label>Default Value</Label>
          <Input
            type="text"
            value={variable.defaultValue || ''}
            onChange={(e) => handleChange('defaultValue', e.target.value)}
            placeholder="Optional default value"
          />
        </FormGroup>

        <FormGroup style={{ gridColumn: '1 / -1' }}>
          <Label>Description</Label>
          <Textarea
            value={variable.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe what this variable represents..."
          />
        </FormGroup>

        <ExamplesSection>
          <Label>Example Values</Label>
          <ExamplesList>
            {variable.examples.map((example, index) => (
              <ExampleTag key={index}>{example}</ExampleTag>
            ))}
          </ExamplesList>
        </ExamplesSection>

        <FormGroup style={{ gridColumn: '1 / -1' }}>
          <CheckboxGroup>
            <Checkbox
              type="checkbox"
              checked={variable.validation.required}
              onChange={(e) => handleValidationChange('required', e.target.checked)}
            />
            <Label>Required field</Label>
          </CheckboxGroup>
          
          <CheckboxGroup>
            <Checkbox
              type="checkbox"
              checked={variable.sensitive}
              onChange={(e) => handleChange('sensitive', e.target.checked)}
            />
            <Label>Sensitive data (will be masked)</Label>
          </CheckboxGroup>
        </FormGroup>

        {showAdvanced && (
          <ValidationSection>
            <ValidationTitle>
              ⚙️ Advanced Validation Rules
              <TestButton 
                onClick={handleTestValidation}
                disabled={isValidating}
                style={{ marginLeft: 'var(--space-3)' }}
              >
                {isValidating ? '🔄 Testing...' : '🧪 Test'}
              </TestButton>
            </ValidationTitle>
            
            <ValidationGrid>
              <FormGroup>
                <Label>Pattern (Regex)</Label>
                <Input
                  type="text"
                  value={variable.validation.pattern || ''}
                  onChange={(e) => handleValidationChange('pattern', e.target.value)}
                  placeholder="^[a-zA-Z0-9]+$"
                />
              </FormGroup>

              <FormGroup>
                <Label>Custom Error Message</Label>
                <Input
                  type="text"
                  value={variable.validation.customMessage || ''}
                  onChange={(e) => handleValidationChange('customMessage', e.target.value)}
                  placeholder="Please enter a valid value"
                />
              </FormGroup>

              {(variable.type === 'text' || variable.type === 'name') && (
                <>
                  <FormGroup>
                    <Label>Min Length</Label>
                    <Input
                      type="number"
                      value={variable.validation.minLength || ''}
                      onChange={(e) => handleValidationChange('minLength', parseInt(e.target.value) || undefined)}
                      min="0"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Max Length</Label>
                    <Input
                      type="number"
                      value={variable.validation.maxLength || ''}
                      onChange={(e) => handleValidationChange('maxLength', parseInt(e.target.value) || undefined)}
                      min="1"
                    />
                  </FormGroup>
                </>
              )}

              {(variable.type === 'number' || variable.type === 'currency') && (
                <>
                  <FormGroup>
                    <Label>Min Value</Label>
                    <Input
                      type="number"
                      value={variable.validation.min || ''}
                      onChange={(e) => handleValidationChange('min', parseFloat(e.target.value) || undefined)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Max Value</Label>
                    <Input
                      type="number"
                      value={variable.validation.max || ''}
                      onChange={(e) => handleValidationChange('max', parseFloat(e.target.value) || undefined)}
                    />
                  </FormGroup>
                </>
              )}
            </ValidationGrid>
          </ValidationSection>
        )}
      </EditorForm>
    </EditorContainer>
  );
};

export default VariableEditor;