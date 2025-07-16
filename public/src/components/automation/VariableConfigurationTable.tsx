import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid var(--neutral-200);
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const TableHeaderContainer = styled.div`
  background: var(--neutral-50);
  padding: var(--space-6);
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TableTitle = styled.h3`
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const TableControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const SearchInput = styled.input`
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  width: 200px;
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const FilterSelect = styled.select`
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  background: white;
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: var(--neutral-100);
`;

const TableRow = styled.tr<{ isError?: boolean }>`
  border-bottom: 1px solid var(--neutral-200);
  transition: background-color var(--transition-fast);
  
  &:hover {
    background: var(--neutral-50);
  }
  
  ${props => props.isError && `
    background: var(--red-50);
    border-color: var(--red-200);
  `}
`;

const TableHeader = styled.th`
  padding: var(--space-4);
  text-align: left;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  border-bottom: 2px solid var(--neutral-200);
`;

const TableCell = styled.td`
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--neutral-700);
  vertical-align: top;
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

const VariableInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: var(--space-2) var(--space-3);
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

const VariableSelect = styled.select<{ hasError?: boolean }>`
  width: 100%;
  padding: var(--space-2) var(--space-3);
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

const ErrorMessage = styled.div`
  color: var(--red-600);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
`;

const ExampleText = styled.div`
  color: var(--neutral-500);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  font-style: italic;
`;

const RequiredIndicator = styled.span`
  color: var(--red-500);
  font-weight: var(--font-semibold);
`;

const ConfidenceBar = styled.div<{ confidence: number }>`
  width: 100%;
  height: 4px;
  background: var(--neutral-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.confidence * 100}%;
    background: ${props =>
    props.confidence >= 0.8 ? 'var(--green-500)' :
      props.confidence >= 0.6 ? 'var(--yellow-500)' :
        'var(--red-500)'
  };
    transition: width var(--transition-fast);
  }
`;

const ValidationStatus = styled.div<{ isValid: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: ${props => props.isValid ? 'var(--green-600)' : 'var(--red-600)'};
`;

const TableFooter = styled.div`
  background: var(--neutral-50);
  padding: var(--space-4);
  border-top: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ValidationSummary = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--text-sm);
`;

const SummaryItem = styled.div<{ type: 'valid' | 'error' | 'warning' }>`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: ${props =>
    props.type === 'valid' ? 'var(--green-600)' :
      props.type === 'error' ? 'var(--red-600)' :
        'var(--yellow-600)'
  };
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--space-3);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid;
  
  ${props => props.variant === 'primary' ? `
    background: var(--primary-600);
    color: white;
    border-color: var(--primary-600);
    
    &:hover:not(:disabled) {
      background: var(--primary-700);
      border-color: var(--primary-700);
    }
    
    &:disabled {
      background: var(--neutral-400);
      border-color: var(--neutral-400);
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: var(--neutral-700);
    border-color: var(--neutral-300);
    
    &:hover {
      background: var(--neutral-50);
      border-color: var(--neutral-400);
    }
  `}
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

interface VariableConfigurationTableProps {
  variables: Variable[];
  onVariableUpdate: (id: string, updates: Partial<Variable>) => void;
  onValidationTest: (variable: Variable) => Promise<ValidationResult>;
  readonly?: boolean;
  onExecute?: () => void;
  onCancel?: () => void;
}

const VariableConfigurationTable: React.FC<VariableConfigurationTableProps> = ({
  variables,
  onVariableUpdate,
  onValidationTest,
  readonly = false,
  onExecute,
  onCancel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);

  // Filter and search variables
  const filteredVariables = useMemo(() => {
    return variables.filter(variable => {
      const matchesSearch = variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || variable.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [variables, searchTerm, filterType]);

  // Get unique variable types for filter
  const variableTypes = useMemo(() => {
    const types = new Set(variables.map(v => v.type));
    return Array.from(types).sort();
  }, [variables]);

  // Validate all variables when they change
  useEffect(() => {
    const validateAllVariables = async () => {
      setIsValidating(true);
      const results = new Map<string, ValidationResult>();

      for (const variable of variables) {
        try {
          const result = await onValidationTest(variable);
          results.set(variable.id, result);
        } catch (error) {
          results.set(variable.id, {
            valid: false,
            errors: [{ rule: 'validation_error', message: 'Validation failed' }],
            warnings: []
          });
        }
      }

      setValidationResults(results);
      setIsValidating(false);
    };

    if (variables.length > 0) {
      validateAllVariables();
    }
  }, [variables, onValidationTest]);

  const handleVariableChange = (id: string, field: keyof Variable, value: any) => {
    onVariableUpdate(id, { [field]: value });
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

  const renderVariableInput = (variable: Variable) => {
    const validation = validationResults.get(variable.id);
    const hasError = Boolean(validation && !validation.valid);

    if (variable.validation.options && variable.validation.options.length > 0) {
      return (
        <VariableSelect
          value={variable.value}
          onChange={(e) => handleVariableChange(variable.id, 'value', e.target.value)}
          hasError={hasError}
          disabled={readonly}
        >
          <option value="">Select an option...</option>
          {variable.validation.options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </VariableSelect>
      );
    }

    const inputType = variable.sensitive ? 'password' :
      variable.type === 'email' ? 'email' :
        variable.type === 'url' ? 'url' :
          variable.type === 'number' || variable.type === 'currency' ? 'number' :
            variable.type === 'date' ? 'date' : 'text';

    return (
      <VariableInput
        type={inputType}
        value={variable.value}
        onChange={(e) => handleVariableChange(variable.id, 'value', e.target.value)}
        placeholder={variable.examples[0] || `Enter ${variable.type}...`}
        hasError={hasError}
        disabled={readonly}
        min={variable.validation.min}
        max={variable.validation.max}
        minLength={variable.validation.minLength}
        maxLength={variable.validation.maxLength}
        pattern={variable.validation.pattern}
        required={variable.validation.required}
      />
    );
  };

  const validVariables = Array.from(validationResults.values()).filter(r => r.valid).length;
  const errorVariables = Array.from(validationResults.values()).filter(r => !r.valid).length;
  const warningVariables = Array.from(validationResults.values()).filter(r => r.warnings.length > 0).length;

  const canExecute = errorVariables === 0 && variables.length > 0;

  return (
    <TableContainer>
      <TableHeaderContainer>
        <TableTitle>
          🔧 Configure Variables
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-normal)', color: 'var(--neutral-500)' }}>
            ({filteredVariables.length} of {variables.length})
          </span>
        </TableTitle>
        <TableControls>
          <SearchInput
            type="text"
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FilterSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {variableTypes.map(type => (
              <option key={type} value={type}>
                {getTypeIcon(type)} {type}
              </option>
            ))}
          </FilterSelect>
        </TableControls>
      </TableHeaderContainer>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Variable</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Value</TableHeader>
            <TableHeader>Examples</TableHeader>
            <TableHeader>Validation</TableHeader>
            <TableHeader>Confidence</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredVariables.map((variable) => {
            const validation = validationResults.get(variable.id);
            const hasError = Boolean(validation && !validation.valid);

            return (
              <TableRow key={variable.id} isError={hasError}>
                <TableCell>
                  <div>
                    <strong>{variable.name}</strong>
                    {variable.validation.required && <RequiredIndicator> *</RequiredIndicator>}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)', marginTop: 'var(--space-1)' }}>
                      {variable.description}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <VariableTypeTag type={variable.type}>
                    {getTypeIcon(variable.type)} {variable.type}
                  </VariableTypeTag>
                </TableCell>

                <TableCell>
                  {renderVariableInput(variable)}
                  {validation && validation.errors.length > 0 && (
                    <ErrorMessage>
                      ⚠️ {validation.errors[0].message}
                    </ErrorMessage>
                  )}
                  {variable.examples.length > 0 && (
                    <ExampleText>
                      e.g., {variable.examples[0]}
                    </ExampleText>
                  )}
                </TableCell>

                <TableCell>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-600)' }}>
                    {variable.examples.slice(0, 2).map((example, index) => (
                      <div key={index} style={{ marginBottom: 'var(--space-1)' }}>
                        • {example}
                      </div>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <ValidationStatus isValid={validation?.valid !== false}>
                    {validation?.valid !== false ? '✅ Valid' : '❌ Invalid'}
                  </ValidationStatus>
                  {validation && validation.warnings.length > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--yellow-600)', marginTop: 'var(--space-1)' }}>
                      ⚠️ {validation.warnings.length} warning(s)
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <ConfidenceBar confidence={variable.confidenceScore} />
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)', marginTop: 'var(--space-1)' }}>
                    {Math.round(variable.confidenceScore * 100)}%
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>

      {variables.length === 0 && (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--neutral-500)' }}>
          <div style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>📝</div>
          <div>No variables detected in this automation</div>
          <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Variables will be automatically detected when you record actions with form inputs
          </div>
        </div>
      )}

      <TableFooter>
        <ValidationSummary>
          <SummaryItem type="valid">
            ✅ {validVariables} Valid
          </SummaryItem>
          {errorVariables > 0 && (
            <SummaryItem type="error">
              ❌ {errorVariables} Errors
            </SummaryItem>
          )}
          {warningVariables > 0 && (
            <SummaryItem type="warning">
              ⚠️ {warningVariables} Warnings
            </SummaryItem>
          )}
          {isValidating && (
            <div style={{ color: 'var(--neutral-500)', fontSize: 'var(--text-sm)' }}>
              🔄 Validating...
            </div>
          )}
        </ValidationSummary>

        {!readonly && (onExecute || onCancel) && (
          <ActionButtons>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onExecute && (
              <Button
                variant="primary"
                onClick={onExecute}
                disabled={!canExecute || isValidating}
              >
                {canExecute ? '▶️ Execute Automation' : '⚠️ Fix Errors to Execute'}
              </Button>
            )}
          </ActionButtons>
        )}
      </TableFooter>
    </TableContainer>
  );
};

export default VariableConfigurationTable;