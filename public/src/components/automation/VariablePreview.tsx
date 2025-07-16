import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

const PreviewContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--transition-fast);
`;

const PreviewHeader = styled.div`
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

const ModeToggle = styled.div`
  display: flex;
  background: var(--neutral-100);
  border-radius: var(--radius-md);
  padding: var(--space-1);
`;

const ModeButton = styled.button<{ active: boolean }>`
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  ${props => props.active ? `
    background: var(--primary-600);
    color: white;
  ` : `
    background: transparent;
    color: var(--neutral-600);
    
    &:hover {
      background: var(--neutral-200);
    }
  `}
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--neutral-700);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const VariableCard = styled.div`
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--neutral-100);
    border-color: var(--primary-300);
  }
`;

const VariableName = styled.div`
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
  margin-bottom: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const VariableType = styled.span<{ type: string }>`
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

const VariableValue = styled.div<{ sensitive?: boolean }>`
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--neutral-600);
  background: white;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--neutral-200);
  margin-top: var(--space-2);
  
  ${props => props.sensitive && `
    background: var(--red-50);
    border-color: var(--red-200);
    color: var(--red-700);
  `}
`;

const ActionPreview = styled.div`
  background: var(--neutral-900);
  color: var(--neutral-100);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow-x: auto;
`;

const ActionStep = styled.div`
  margin-bottom: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--neutral-700);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`;

const StepNumber = styled.span`
  color: var(--primary-400);
  font-weight: var(--font-semibold);
  margin-right: var(--space-2);
`;

const StepAction = styled.span`
  color: var(--green-400);
  margin-right: var(--space-2);
`;

const StepTarget = styled.span`
  color: var(--blue-400);
  margin-right: var(--space-2);
`;

const StepValue = styled.span<{ isVariable?: boolean }>`
  ${props => props.isVariable ? `
    color: var(--yellow-400);
    background: var(--yellow-900);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
  ` : `
    color: var(--neutral-300);
  `}
`;

const DependencyGraph = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const DependencyItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
`;

const DependencyArrow = styled.div`
  color: var(--primary-500);
  font-size: var(--text-lg);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
`;

const StatCard = styled.div`
  background: var(--primary-50);
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--primary-700);
`;

const StatLabel = styled.div`
  font-size: var(--text-xs);
  color: var(--primary-600);
  margin-top: var(--space-1);
`;

interface Variable {
  id: string;
  name: string;
  type: string;
  value: string;
  defaultValue?: string;
  description: string;
  examples: string[];
  sensitive: boolean;
  dependencies?: string[];
}

interface AutomationStep {
  id: string;
  action: string;
  target: string;
  value?: string;
  variableId?: string;
}

interface VariablePreviewProps {
  variables: Variable[];
  automationSteps: AutomationStep[];
  onVariableChange?: (variableId: string, value: string) => void;
}

const VariablePreview: React.FC<VariablePreviewProps> = ({
  variables,
  automationSteps,
  onVariableChange
}) => {
  const [previewMode, setPreviewMode] = useState<'execution' | 'dependencies'>('execution');

  const variableMap = useMemo(() => {
    return variables.reduce((map, variable) => {
      map[variable.id] = variable;
      return map;
    }, {} as Record<string, Variable>);
  }, [variables]);

  const processedSteps = useMemo(() => {
    return automationSteps.map(step => {
      if (step.variableId && variableMap[step.variableId]) {
        const variable = variableMap[step.variableId];
        return {
          ...step,
          processedValue: variable.value || variable.defaultValue || variable.examples[0] || '',
          variable
        };
      }
      return { ...step, processedValue: step.value || '' };
    });
  }, [automationSteps, variableMap]);

  const dependencyChains = useMemo(() => {
    const chains: Array<{ from: Variable; to: Variable; relationship: string }> = [];
    
    variables.forEach(variable => {
      if (variable.dependencies) {
        variable.dependencies.forEach(depId => {
          const dependency = variableMap[depId];
          if (dependency) {
            chains.push({
              from: dependency,
              to: variable,
              relationship: 'depends on'
            });
          }
        });
      }
    });
    
    return chains;
  }, [variables, variableMap]);

  const stats = useMemo(() => {
    const totalVariables = variables.length;
    const sensitiveVariables = variables.filter(v => v.sensitive).length;
    const requiredVariables = variables.filter(v => !v.value && !v.defaultValue).length;
    const stepsWithVariables = processedSteps.filter(s => s.variableId).length;
    
    return {
      totalVariables,
      sensitiveVariables,
      requiredVariables,
      stepsWithVariables
    };
  }, [variables, processedSteps]);

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

  const maskSensitiveValue = (value: string, sensitive: boolean) => {
    if (!sensitive) return value;
    return value.replace(/./g, '•');
  };

  return (
    <PreviewContainer>
      <PreviewHeader>
        <Title>👁️ Variable Preview</Title>
        <ModeToggle>
          <ModeButton 
            active={previewMode === 'execution'} 
            onClick={() => setPreviewMode('execution')}
          >
            Execution
          </ModeButton>
          <ModeButton 
            active={previewMode === 'dependencies'} 
            onClick={() => setPreviewMode('dependencies')}
          >
            Dependencies
          </ModeButton>
        </ModeToggle>
      </PreviewHeader>

      {previewMode === 'execution' ? (
        <PreviewGrid>
          <Section>
            <SectionTitle>📋 Variables</SectionTitle>
            {variables.map(variable => (
              <VariableCard key={variable.id}>
                <VariableName>
                  {getTypeIcon(variable.type)} {variable.name}
                  <VariableType type={variable.type}>{variable.type}</VariableType>
                </VariableName>
                <VariableValue sensitive={variable.sensitive}>
                  {maskSensitiveValue(
                    variable.value || variable.defaultValue || variable.examples[0] || 'No value set',
                    variable.sensitive
                  )}
                </VariableValue>
              </VariableCard>
            ))}
          </Section>

          <Section>
            <SectionTitle>🎬 Automation Preview</SectionTitle>
            <ActionPreview>
              {processedSteps.map((step, index) => (
                <ActionStep key={step.id}>
                  <StepNumber>{index + 1}.</StepNumber>
                  <StepAction>{step.action.toUpperCase()}</StepAction>
                  <StepTarget>"{step.target}"</StepTarget>
                  {step.processedValue && (
                    <>
                      with{' '}
                      <StepValue isVariable={!!step.variableId}>
                        {step.variableId ? `{{${variables.find(v => v.id === step.variableId)?.name || 'Unknown Variable'}}}` : `"${step.processedValue}"`}
                      </StepValue>
                    </>
                  )}
                </ActionStep>
              ))}
            </ActionPreview>
          </Section>
        </PreviewGrid>
      ) : (
        <Section>
          <SectionTitle>🔗 Variable Dependencies</SectionTitle>
          {dependencyChains.length > 0 ? (
            <DependencyGraph>
              {dependencyChains.map((chain, index) => (
                <DependencyItem key={index}>
                  <VariableCard style={{ margin: 0, flex: 1 }}>
                    <VariableName>
                      {getTypeIcon(chain.from.type)} {chain.from.name}
                    </VariableName>
                  </VariableCard>
                  <DependencyArrow>→</DependencyArrow>
                  <VariableCard style={{ margin: 0, flex: 1 }}>
                    <VariableName>
                      {getTypeIcon(chain.to.type)} {chain.to.name}
                    </VariableName>
                  </VariableCard>
                </DependencyItem>
              ))}
            </DependencyGraph>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--neutral-500)', 
              padding: 'var(--space-8)' 
            }}>
              No variable dependencies detected
            </div>
          )}
        </Section>
      )}

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.totalVariables}</StatValue>
          <StatLabel>Total Variables</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.sensitiveVariables}</StatValue>
          <StatLabel>Sensitive</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.requiredVariables}</StatValue>
          <StatLabel>Need Values</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.stepsWithVariables}</StatValue>
          <StatLabel>Variable Steps</StatLabel>
        </StatCard>
      </StatsGrid>
    </PreviewContainer>
  );
};

export default VariablePreview;