import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  
  &:hover {
    color: #374151;
  }
`;

const VariableForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const VariableGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VariableLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VariableInput = styled.input`
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &.error {
    border-color: #ef4444;
  }
`;

const VariableDescription = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
`;

const ValidationMessage = styled.div<{ type: 'error' | 'warning' }>`
  font-size: 12px;
  margin-top: 4px;
  color: ${props => props.type === 'error' ? '#ef4444' : '#f59e0b'};
`;

const VariableTypeTag = styled.span<{ type: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.type) {
      case 'email': return '#dbeafe';
      case 'password': return '#fef3c7';
      case 'url': return '#d1fae5';
      case 'phone': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'email': return '#1e40af';
      case 'password': return '#92400e';
      case 'url': return '#065f46';
      case 'phone': return '#3730a3';
      default: return '#374151';
    }
  }};
`;

const ExampleValues = styled.div`
  margin-top: 8px;
`;

const ExampleLabel = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const ExampleValue = styled.button`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  margin-right: 8px;
  margin-bottom: 4px;
  
  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    border: 1px solid #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
    
    &:disabled {
      background: #9ca3af;
      border-color: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
`;

interface Variable {
  id: string;
  name: string;
  type: string;
  value?: string;
  description?: string;
  validation?: {
    pattern?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  };
  examples?: string[];
}

interface Automation {
  id: string;
  name: string;
  variables?: Variable[];
}

interface VariableInputModalProps {
  isOpen: boolean;
  automation: Automation | null;
  onClose: () => void;
  onSubmit: (variables: Record<string, string>) => void;
}

const VariableInputModal: React.FC<VariableInputModalProps> = ({
  isOpen,
  automation,
  onClose,
  onSubmit
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values when automation changes
  useEffect(() => {
    if (automation && automation.variables) {
      const initialValues: Record<string, string> = {};
      automation.variables.forEach(variable => {
        initialValues[variable.name] = variable.value || '';
      });
      setValues(initialValues);
      setErrors({});
    }
  }, [automation]);

  const validateVariable = (variable: Variable, value: string) => {
    const validation = variable.validation || {};
    const errors: string[] = [];

    // Required validation
    if (validation.required && !value.trim()) {
      errors.push('This field is required');
    }

    // Length validation
    if (value && validation.minLength && value.length < validation.minLength) {
      errors.push(`Minimum length is ${validation.minLength} characters`);
    }

    if (value && validation.maxLength && value.length > validation.maxLength) {
      errors.push(`Maximum length is ${validation.maxLength} characters`);
    }

    // Pattern validation
    if (value && validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push(getPatternErrorMessage(variable.type));
      }
    }

    return errors;
  };

  const getPatternErrorMessage = (type: string) => {
    switch (type) {
      case 'email':
        return 'Please enter a valid email address';
      case 'phone':
        return 'Please enter a valid phone number';
      case 'url':
        return 'Please enter a valid URL';
      default:
        return 'Invalid format';
    }
  };

  const handleInputChange = (variableName: string, value: string) => {
    setValues(prev => ({ ...prev, [variableName]: value }));
    
    // Clear error when user starts typing
    if (errors[variableName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[variableName];
        return newErrors;
      });
    }
  };

  const handleExampleClick = (variableName: string, exampleValue: string) => {
    handleInputChange(variableName, exampleValue);
  };

  const validateForm = () => {
    if (!automation || !automation.variables) return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    automation.variables.forEach(variable => {
      const value = values[variable.name] || '';
      const validationErrors = validateVariable(variable, value);
      
      if (validationErrors.length > 0) {
        newErrors[variable.name] = validationErrors[0];
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Filter out empty values
      const filteredValues = Object.entries(values)
        .filter(([_, value]) => value.trim() !== '')
        .reduce((acc, [key, value]) => {
          acc[key] = value.trim();
          return acc;
        }, {} as Record<string, string>);

      onSubmit(filteredValues);
      onClose();
    } catch (error) {
      console.error('Error submitting variables:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !automation) {
    return null;
  }

  const variables = automation.variables || [];

  if (variables.length === 0) {
    return (
      <ModalOverlay onClick={onClose}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Edit Variables - {automation.name}</ModalTitle>
            <CloseButton onClick={onClose}>&times;</CloseButton>
          </ModalHeader>
          
          <EmptyState>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              No Variables Found
            </div>
            <div style={{ fontSize: '14px' }}>
              This automation doesn't have any variables to configure.
            </div>
          </EmptyState>

          <ButtonGroup>
            <Button onClick={onClose}>Close</Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edit Variables - {automation.name}</ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <VariableForm onSubmit={handleSubmit}>
          {variables.map(variable => (
            <VariableGroup key={variable.id}>
              <VariableLabel>
                {variable.name}
                <VariableTypeTag type={variable.type}>
                  {variable.type}
                </VariableTypeTag>
                {variable.validation?.required && (
                  <span style={{ color: '#ef4444' }}>*</span>
                )}
              </VariableLabel>
              
              <VariableInput
                type={variable.type === 'password' ? 'password' : 'text'}
                value={values[variable.name] || ''}
                onChange={e => handleInputChange(variable.name, e.target.value)}
                placeholder={`Enter ${variable.name.toLowerCase()}`}
                className={errors[variable.name] ? 'error' : ''}
              />
              
              {variable.description && (
                <VariableDescription>{variable.description}</VariableDescription>
              )}
              
              {errors[variable.name] && (
                <ValidationMessage type="error">
                  {errors[variable.name]}
                </ValidationMessage>
              )}
              
              {variable.examples && variable.examples.length > 0 && (
                <ExampleValues>
                  <ExampleLabel>Examples:</ExampleLabel>
                  {variable.examples.map((example, index) => (
                    <ExampleValue
                      key={index}
                      type="button"
                      onClick={() => handleExampleClick(variable.name, example)}
                    >
                      {example}
                    </ExampleValue>
                  ))}
                </ExampleValues>
              )}
            </VariableGroup>
          ))}

          <ButtonGroup>
            <Button type="button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save & Run'}
            </Button>
          </ButtonGroup>
        </VariableForm>
      </ModalContent>
    </ModalOverlay>
  );
};

export default VariableInputModal;