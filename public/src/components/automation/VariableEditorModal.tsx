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
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const VariableList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const VariableCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  position: relative;
`;

const VariableHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 12px;
`;

const VariableIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background: #fecaca;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  align-items: center;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }
`;

const AddVariableButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #f8fafc;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => props.variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  ` : `
    background: white;
    color: #374151;
    border-color: #d1d5db;
    
    &:hover {
      background: #f9fafb;
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 500;
    color: #374151;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

interface Variable {
  id: string;
  name: string;
  value: string;
  type?: string;
}

interface VariableEditorModalProps {
  isOpen: boolean;
  automation: any;
  onClose: () => void;
  onSave: (variables: Variable[]) => void;
}

const VariableEditorModal: React.FC<VariableEditorModalProps> = ({
  isOpen,
  automation,
  onClose,
  onSave
}) => {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && automation) {
      console.log('📋 VariableEditorModal opened for automation:', automation.id);
      
      // Check if automation has variables property
      if (automation.variables && automation.variables.length > 0) {
        // Load variables from automation object
        console.log('📋 Loading variables from automation object:', automation.variables);
        const simpleVariables = automation.variables.map((v: any, index: number) => ({
          id: v.id || `var_${index}`,
          name: v.name || `Variable ${index + 1}`,
          value: v.value || v.currentValue || v.originalValue || '',
          type: v.type || 'text'
        }));
        setVariables(simpleVariables);
        setError(null);
      } else {
        // Variables not available in automation object, fetch from server
        console.log('📋 Variables not found in automation object, fetching from server...');
        fetchVariablesFromServer(automation.id);
      }
    }
  }, [isOpen, automation]);

  const fetchVariablesFromServer = async (automationId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a temporary WebSocket connection to fetch variables
      // Note: In a real implementation, you might want to pass the WebSocket from the parent
      console.log('📋 Requesting variables for automation:', automationId);
      
      // For now, we'll indicate that variables need to be fetched
      // The parent component should handle this by passing a proper WebSocket or fetch function
      setError('Variables not loaded. Please extract variables first using the Extract button.');
      setVariables([]);
    } catch (err) {
      console.error('❌ Error fetching variables:', err);
      setError('Failed to load variables. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleVariableChange = (id: string, field: 'name' | 'value', newValue: string) => {
    setVariables(prev => prev.map(variable => 
      variable.id === id ? { ...variable, [field]: newValue } : variable
    ));
  };

  const handleDeleteVariable = (id: string) => {
    setVariables(prev => prev.filter(variable => variable.id !== id));
  };

  const handleAddVariable = () => {
    const newVariable: Variable = {
      id: `var_${Date.now()}`,
      name: `Variable ${variables.length + 1}`,
      value: '',
      type: 'text'
    };
    setVariables(prev => [...prev, newVariable]);
  };

  const handleSave = () => {
    console.log('💾 Saving variables:', variables);
    onSave(variables);
    onClose();
  };

  const getVariableIcon = (type?: string) => {
    switch (type) {
      case 'url': return '🔗';
      case 'cpf': return '🆔';
      case 'password': return '🔒';
      case 'email': return '📧';
      case 'phone': return '📱';
      default: return '🔧';
    }
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
          {isLoading ? (
            <EmptyState>
              <div className="icon">⚙️</div>
              <h3>Loading Variables...</h3>
              <p>Please wait while we fetch the variables for this automation.</p>
            </EmptyState>
          ) : error ? (
            <EmptyState>
              <div className="icon">⚠️</div>
              <h3>Variables Not Available</h3>
              <p>{error}</p>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Try using the "Extract" button on the automation to generate variables from recorded steps.
              </p>
              <button 
                onClick={() => fetchVariablesFromServer(automation.id)}
                style={{
                  marginTop: '15px',
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Retry Loading
              </button>
            </EmptyState>
          ) : variables.length === 0 ? (
            <EmptyState>
              <div className="icon">🔧</div>
              <h3>No Variables Found</h3>
              <p>This automation doesn't have any variables yet. Add one below to get started.</p>
            </EmptyState>
          ) : (
            <VariableList>
              {variables.map((variable) => (
                <VariableCard key={variable.id}>
                  <DeleteButton onClick={() => handleDeleteVariable(variable.id)}>
                    🗑️
                  </DeleteButton>
                  
                  <VariableHeader>
                    <VariableIcon>
                      {getVariableIcon(variable.type)} {variable.type || 'text'}
                    </VariableIcon>
                  </VariableHeader>

                  <FormRow>
                    <Label>Variable Name</Label>
                    <Input
                      type="text"
                      value={variable.name}
                      onChange={(e) => handleVariableChange(variable.id, 'name', e.target.value)}
                      placeholder="Enter variable name"
                    />
                  </FormRow>

                  <FormRow style={{ marginTop: '12px' }}>
                    <Label>Value</Label>
                    <Input
                      type={variable.type === 'password' ? 'password' : 'text'}
                      value={variable.value}
                      onChange={(e) => handleVariableChange(variable.id, 'value', e.target.value)}
                      placeholder="Enter variable value"
                    />
                  </FormRow>
                </VariableCard>
              ))}

              <AddVariableButton onClick={handleAddVariable}>
                ➕ Add New Variable
              </AddVariableButton>
            </VariableList>
          )}
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