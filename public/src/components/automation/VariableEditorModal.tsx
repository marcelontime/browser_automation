import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: var(--space-6);
  border-bottom: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--neutral-50);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: var(--text-xl);
  color: var(--neutral-500);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  
  &:hover {
    background: var(--neutral-200);
    color: var(--neutral-700);
  }
`;

const ModalBody = styled.div`
  padding: var(--space-6);
  overflow-y: auto;
  flex: 1;
`;

const VariableList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const VariableCard = styled.div`
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  background: var(--neutral-50);
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--primary-400);
    background: white;
  }
`;

const VariableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
`;

const VariableType = styled.span`
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
`;

const DeleteVariableButton = styled.button`
  background: var(--red-100);
  color: var(--red-600);
  border: none;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  
  &:hover {
    background: var(--red-200);
  }
`;

const VariableForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  
  @media (max-width: 640px) {
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
`;

const Input = styled.input`
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
`;

const Select = styled.select`
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
`;

const ExampleValue = styled.div`
  background: var(--neutral-100);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--neutral-600);
  border: 1px solid var(--neutral-200);
`;

const AddVariableButton = styled.button`
  background: var(--primary-100);
  color: var(--primary-700);
  border: 1px dashed var(--primary-300);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--primary-200);
    border-color: var(--primary-400);
  }
`;

const ModalFooter = styled.div`
  padding: var(--space-6);
  border-top: 1px solid var(--neutral-200);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  background: var(--neutral-50);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: var(--space-3) var(--space-5);
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
    
    &:hover {
      background: var(--primary-700);
      border-color: var(--primary-700);
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
  type: 'email' | 'password' | 'text' | 'url' | 'number' | 'phone' | 'cpf';
  originalValue: string;
  currentValue: string;
  description?: string;
  validation?: string;
  required: boolean;
}

interface VariableEditorModalProps {
  isOpen: boolean;
  automation: any;
  variables: Variable[];
  onClose: () => void;
  onSave: (variables: Variable[]) => void;
}

const VariableEditorModal: React.FC<VariableEditorModalProps> = ({
  isOpen,
  automation,
  variables: initialVariables,
  onClose,
  onSave
}) => {
  const [variables, setVariables] = useState<Variable[]>(initialVariables);

  useEffect(() => {
    setVariables(initialVariables);
  }, [initialVariables]);

  if (!isOpen) return null;

  const handleVariableChange = (id: string, field: keyof Variable, value: string | boolean) => {
    setVariables(prev => prev.map(variable => 
      variable.id === id ? { ...variable, [field]: value } : variable
    ));
  };

  const handleDeleteVariable = (id: string) => {
    setVariables(prev => prev.filter(variable => variable.id !== id));
  };

  const handleAddVariable = () => {
    const newVariable: Variable = {
      id: Date.now().toString(),
      name: `VAR_${variables.length + 1}`,
      type: 'text',
      originalValue: '',
      currentValue: '',
      required: false
    };
    setVariables(prev => [...prev, newVariable]);
  };

  const handleSave = () => {
    onSave(variables);
    onClose();
  };

  const getFieldTypeIcon = (type: string) => {
    const icons = {
      email: '📧',
      password: '🔒',
      text: '📝',
      url: '🔗',
      number: '🔢',
      phone: '📞',
      cpf: '🆔'
    };
    return icons[type as keyof typeof icons] || '📝';
  };

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            🔧 Edit Variables - {automation?.name}
          </ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalBody>
          <VariableList>
            {variables.map((variable) => (
              <VariableCard key={variable.id}>
                <VariableHeader>
                  <VariableType>
                    {getFieldTypeIcon(variable.type)} {variable.type}
                  </VariableType>
                  <DeleteVariableButton onClick={() => handleDeleteVariable(variable.id)}>
                    🗑️
                  </DeleteVariableButton>
                </VariableHeader>

                <VariableForm>
                  <FormGroup>
                    <Label>Variable Name</Label>
                    <Input
                      type="text"
                      value={variable.name}
                      onChange={(e) => handleVariableChange(variable.id, 'name', e.target.value)}
                      placeholder="Enter variable name"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Field Type</Label>
                    <Select
                      value={variable.type}
                      onChange={(e) => handleVariableChange(variable.id, 'type', e.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="password">Password</option>
                      <option value="url">URL</option>
                      <option value="number">Number</option>
                      <option value="phone">Phone</option>
                      <option value="cpf">CPF</option>
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>Current Value</Label>
                    <Input
                      type={variable.type === 'password' ? 'password' : 'text'}
                      value={variable.currentValue}
                      onChange={(e) => handleVariableChange(variable.id, 'currentValue', e.target.value)}
                      placeholder="Enter new value"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Original Recorded Value</Label>
                    <ExampleValue>
                      {variable.originalValue || 'No recorded value'}
                    </ExampleValue>
                  </FormGroup>

                  <FormGroup style={{ gridColumn: '1 / -1' }}>
                    <Label>Description (Optional)</Label>
                    <Input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) => handleVariableChange(variable.id, 'description', e.target.value)}
                      placeholder="Describe what this variable is used for"
                    />
                  </FormGroup>

                  <FormGroup style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) => handleVariableChange(variable.id, 'required', e.target.checked)}
                      />
                      <span>Required field</span>
                    </label>
                  </FormGroup>
                </VariableForm>
              </VariableCard>
            ))}

            <AddVariableButton onClick={handleAddVariable}>
              ➕ Add New Variable
            </AddVariableButton>
          </VariableList>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Variables
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default VariableEditorModal; 