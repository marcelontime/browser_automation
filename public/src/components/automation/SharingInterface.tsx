import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const SharingContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 800px;
  margin: 0 auto;
`;

const SharingHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--neutral-200);
`;

const Title = styled.h2`
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  
  ${props => {
    if (props.completed) {
      return `
        background: var(--green-600);
        color: white;
      `;
    } else if (props.active) {
      return `
        background: var(--primary-600);
        color: white;
      `;
    } else {
      return `
        background: var(--neutral-200);
        color: var(--neutral-600);
      `;
    }
  }}
`;

const StepConnector = styled.div<{ completed: boolean }>`
  width: 24px;
  height: 2px;
  background: ${props => props.completed ? 'var(--green-600)' : 'var(--neutral-200)'};
`;

const SharingContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const FormGrid = styled.div`
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
`;

const Input = styled.input`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Textarea = styled.textarea`
  padding: var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: var(--primary-600);
`;

const VariableList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

const VariableItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--neutral-50);
  border-radius: var(--radius-md);
`;

const VariableInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const VariableName = styled.div`
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
`;

const VariableDetails = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-600);
`;

const SensitiveWarning = styled.div`
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--red-700);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--neutral-200);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--primary-600);
          color: white;
          border: none;
          
          &:hover {
            background: var(--primary-700);
          }
          
          &:disabled {
            background: var(--neutral-300);
            cursor: not-allowed;
          }
        `;
      case 'danger':
        return `
          background: var(--red-600);
          color: white;
          border: none;
          
          &:hover {
            background: var(--red-700);
          }
        `;
      default:
        return `
          background: white;
          color: var(--neutral-700);
          border: 1px solid var(--neutral-300);
          
          &:hover {
            background: var(--neutral-50);
            border-color: var(--neutral-400);
          }
        `;
    }
  }}
`;

const SharePreview = styled.div`
  background: var(--neutral-900);
  color: var(--neutral-100);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  overflow-x: auto;
`;

const ShareLink = styled.div`
  background: var(--green-50);
  border: 1px solid var(--green-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
`;

const ShareUrl = styled.code`
  flex: 1;
  background: white;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--green-300);
  font-size: var(--text-sm);
  word-break: break-all;
`;

interface Variable {
  id: string;
  name: string;
  type: string;
  description: string;
  sensitive: boolean;
  required: boolean;
}

interface SharingInterfaceProps {
  automation: {
    id: string;
    name: string;
    description: string;
  };
  variables: Variable[];
  onShare: (shareData: any) => Promise<string>;
  onCancel: () => void;
}

const SharingInterface: React.FC<SharingInterfaceProps> = ({
  automation,
  variables,
  onShare,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [shareData, setShareData] = useState({
    name: automation.name,
    description: automation.description,
    version: '1.0.0',
    author: '',
    tags: '',
    includeVariables: true,
    includeSensitiveData: false,
    selectedVariables: new Set(variables.map(v => v.id))
  });
  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Variables' },
    { number: 3, title: 'Share' }
  ];

  const sensitiveVariables = variables.filter(v => v.sensitive);
  const hasSelectedSensitive = Array.from(shareData.selectedVariables).some(id => 
    variables.find(v => v.id === id)?.sensitive
  );

  const handleInputChange = useCallback((field: string, value: any) => {
    setShareData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleVariableToggle = useCallback((variableId: string) => {
    setShareData(prev => {
      const newSelected = new Set(prev.selectedVariables);
      if (newSelected.has(variableId)) {
        newSelected.delete(variableId);
      } else {
        newSelected.add(variableId);
      }
      return { ...prev, selectedVariables: newSelected };
    });
  }, []);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const sharePackage = {
        ...shareData,
        automationId: automation.id,
        selectedVariables: Array.from(shareData.selectedVariables),
        tags: shareData.tags.split(',').map(t => t.trim()).filter(t => t)
      };
      
      const url = await onShare(sharePackage);
      setShareUrl(url);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error sharing automation:', error);
      // Handle error
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Show success message
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return shareData.name.trim() && shareData.author.trim();
      case 2:
        return shareData.selectedVariables.size > 0 || !shareData.includeVariables;
      default:
        return true;
    }
  };

  return (
    <SharingContainer>
      <SharingHeader>
        <Title>📤 Share Automation</Title>
        <StepIndicator>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <Step 
                active={currentStep === step.number}
                completed={currentStep > step.number}
              >
                {currentStep > step.number ? '✓' : step.number}
              </Step>
              {index < steps.length - 1 && (
                <StepConnector completed={currentStep > step.number} />
              )}
            </React.Fragment>
          ))}
        </StepIndicator>
      </SharingHeader>

      <SharingContent>
        {currentStep === 1 && (
          <Section>
            <SectionTitle>📝 Basic Information</SectionTitle>
            <FormGrid>
              <FormGroup>
                <Label>Automation Name</Label>
                <Input
                  type="text"
                  value={shareData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter a descriptive name"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Version</Label>
                <Input
                  type="text"
                  value={shareData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  placeholder="1.0.0"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Author</Label>
                <Input
                  type="text"
                  value={shareData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Your name or organization"
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Tags (comma-separated)</Label>
                <Input
                  type="text"
                  value={shareData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="form, registration, automation"
                />
              </FormGroup>
            </FormGrid>
            
            <FormGroup>
              <Label>Description</Label>
              <Textarea
                value={shareData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this automation does and how to use it"
              />
            </FormGroup>
          </Section>
        )}

        {currentStep === 2 && (
          <Section>
            <SectionTitle>🔧 Variable Configuration</SectionTitle>
            
            <CheckboxGroup>
              <Checkbox
                type="checkbox"
                checked={shareData.includeVariables}
                onChange={(e) => handleInputChange('includeVariables', e.target.checked)}
              />
              <Label>Include variables in shared automation</Label>
            </CheckboxGroup>

            {shareData.includeVariables && (
              <>
                <VariableList>
                  {variables.map(variable => (
                    <VariableItem key={variable.id}>
                      <VariableInfo>
                        <VariableName>
                          {variable.sensitive && '🔒'} {variable.name}
                        </VariableName>
                        <VariableDetails>
                          {variable.type} • {variable.description}
                          {variable.required && ' • Required'}
                        </VariableDetails>
                      </VariableInfo>
                      <Checkbox
                        type="checkbox"
                        checked={shareData.selectedVariables.has(variable.id)}
                        onChange={() => handleVariableToggle(variable.id)}
                      />
                    </VariableItem>
                  ))}
                </VariableList>

                {sensitiveVariables.length > 0 && (
                  <>
                    <CheckboxGroup>
                      <Checkbox
                        type="checkbox"
                        checked={shareData.includeSensitiveData}
                        onChange={(e) => handleInputChange('includeSensitiveData', e.target.checked)}
                      />
                      <Label>Include sensitive variable definitions (not values)</Label>
                    </CheckboxGroup>

                    {hasSelectedSensitive && !shareData.includeSensitiveData && (
                      <SensitiveWarning>
                        ⚠️ You have selected sensitive variables but chosen not to include sensitive data. 
                        These variables will be excluded from the share package.
                      </SensitiveWarning>
                    )}
                  </>
                )}
              </>
            )}
          </Section>
        )}

        {currentStep === 3 && shareUrl && (
          <Section>
            <SectionTitle>🎉 Share Complete</SectionTitle>
            
            <ShareLink>
              <ShareUrl>{shareUrl}</ShareUrl>
              <Button onClick={copyToClipboard}>
                📋 Copy
              </Button>
            </ShareLink>

            <SharePreview>
              {JSON.stringify({
                name: shareData.name,
                version: shareData.version,
                author: shareData.author,
                variables: shareData.selectedVariables.size,
                includeSensitive: shareData.includeSensitiveData
              }, null, 2)}
            </SharePreview>
          </Section>
        )}
      </SharingContent>

      <ActionButtons>
        <div>
          {currentStep > 1 && currentStep < 3 && (
            <Button onClick={() => setCurrentStep(prev => prev - 1)}>
              ← Back
            </Button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          
          {currentStep < 2 && (
            <Button 
              variant="primary" 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next →
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button 
              variant="primary" 
              onClick={handleShare}
              disabled={!canProceed() || isSharing}
            >
              {isSharing ? '🔄 Sharing...' : '📤 Share'}
            </Button>
          )}
          
          {currentStep === 3 && (
            <Button variant="primary" onClick={onCancel}>
              Done
            </Button>
          )}
        </div>
      </ActionButtons>
    </SharingContainer>
  );
};

export default SharingInterface;