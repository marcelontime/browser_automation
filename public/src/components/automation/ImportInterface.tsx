import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';

const ImportContainer = styled.div`
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 900px;
  margin: 0 auto;
`;

const ImportHeader = styled.div`
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

const ImportContent = styled.div`
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

const DropZone = styled.div<{ isDragOver: boolean; hasFile: boolean }>`
  border: 2px dashed var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  
  ${props => props.isDragOver && `
    border-color: var(--primary-500);
    background: var(--primary-50);
  `}
  
  ${props => props.hasFile && `
    border-color: var(--green-500);
    background: var(--green-50);
  `}
  
  &:hover {
    border-color: var(--primary-400);
    background: var(--primary-25);
  }
`;

const DropZoneContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
`;

const DropZoneIcon = styled.div`
  font-size: 48px;
  color: var(--neutral-400);
`;

const DropZoneText = styled.div`
  font-size: var(--text-lg);
  color: var(--neutral-600);
  font-weight: var(--font-medium);
`;

const DropZoneSubtext = styled.div`
  font-size: var(--text-sm);
  color: var(--neutral-500);
`;

const PreviewCard = styled.div`
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
`;

const PreviewTitle = styled.h4`
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--neutral-800);
`;

const PreviewMeta = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-600);
`;

const PreviewStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-3);
  margin: var(--space-3) 0;
`;

const StatItem = styled.div`
  text-align: center;
  padding: var(--space-2);
  background: white;
  border-radius: var(--radius-sm);
`;

const StatValue = styled.div`
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--primary-600);
`;

const StatLabel = styled.div`
  font-size: var(--text-xs);
  color: var(--neutral-600);
  margin-top: var(--space-1);
`;

const VariableMappingSection = styled.div`
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`;

const VariableMapping = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 300px;
  overflow-y: auto;
`;

const VariableMappingItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--neutral-200);
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

const MappingArrow = styled.div`
  color: var(--primary-500);
  font-size: var(--text-lg);
`;

const Input = styled.input<{ hasError?: boolean }>`
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  
  &:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  ${props => props.hasError && `
    border-color: var(--red-500);
    background: var(--red-50);
  `}
`;

const ConflictWarning = styled.div`
  background: var(--yellow-50);
  border: 1px solid var(--yellow-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--yellow-800);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const ErrorMessage = styled.div`
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

const SuccessMessage = styled.div`
  background: var(--green-50);
  border: 1px solid var(--green-200);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--green-700);
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

const HiddenFileInput = styled.input`
  display: none;
`;

interface ImportPackage {
  name: string;
  description: string;
  version: string;
  author: string;
  variables: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
  metadata: any;
}

interface ImportInterfaceProps {
  onImport: (packageData: any, options: any) => Promise<any>;
  onCancel: () => void;
}

const ImportInterface: React.FC<ImportInterfaceProps> = ({
  onImport,
  onCancel
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [packageData, setPackageData] = useState<ImportPackage | null>(null);
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setPackageFile(file);
    setError(null);
    setIsValidating(true);

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      
      // Validate package structure
      if (!parsed.name || !parsed.version) {
        throw new Error('Invalid package format');
      }

      setPackageData(parsed);
      
      // Initialize variable mapping
      if (parsed.variables) {
        const mapping: Record<string, string> = {};
        parsed.variables.forEach((variable: any) => {
          mapping[variable.id] = variable.name;
        });
        setVariableMapping(mapping);
      }

      // Validate for conflicts
      const validation = await onImport(parsed, { validateOnly: true });
      setConflicts(validation.conflicts);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process package file');
      setPackageData(null);
    } finally {
      setIsValidating(false);
    }
  }, [onImport]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleVariableMappingChange = useCallback((variableId: string, newName: string) => {
    setVariableMapping(prev => ({
      ...prev,
      [variableId]: newName
    }));
  }, []);

  const handleImport = async () => {
    if (!packageData) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await onImport(packageData, {
        variableMapping,
        conflictResolution: 'rename'
      });
      
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const openFileDialog = () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    input?.click();
  };

  const hasConflicts = conflicts && (conflicts.summary.critical > 0 || conflicts.summary.warnings > 0);
  const canImport = packageData && !isValidating && !isImporting && (!hasConflicts || conflicts.summary.critical === 0);

  return (
    <ImportContainer>
      <ImportHeader>
        <Title>📥 Import Automation</Title>
      </ImportHeader>

      <ImportContent>
        {!packageData && !importResult && (
          <Section>
            <SectionTitle>📁 Select Package File</SectionTitle>
            
            <DropZone
              isDragOver={isDragOver}
              hasFile={!!packageFile}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <DropZoneContent>
                <DropZoneIcon>
                  {isValidating ? '🔄' : packageFile ? '✅' : '📦'}
                </DropZoneIcon>
                <DropZoneText>
                  {isValidating ? 'Validating package...' :
                   packageFile ? `Selected: ${packageFile.name}` :
                   'Drop automation package here or click to browse'}
                </DropZoneText>
                <DropZoneSubtext>
                  Supports .json files exported from automation sharing
                </DropZoneSubtext>
              </DropZoneContent>
            </DropZone>

            <HiddenFileInput
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
            />
          </Section>
        )}

        {error && (
          <ErrorMessage>
            ❌ {error}
          </ErrorMessage>
        )}

        {packageData && !importResult && (
          <>
            <Section>
              <SectionTitle>📋 Package Preview</SectionTitle>
              
              <PreviewCard>
                <PreviewHeader>
                  <PreviewTitle>{packageData.name}</PreviewTitle>
                  <PreviewMeta>v{packageData.version} by {packageData.author}</PreviewMeta>
                </PreviewHeader>
                
                <div>{packageData.description}</div>
                
                <PreviewStats>
                  <StatItem>
                    <StatValue>{packageData.variables?.length || 0}</StatValue>
                    <StatLabel>Variables</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{packageData.metadata?.originalAutomation?.stepCount || 0}</StatValue>
                    <StatLabel>Steps</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{packageData.variables?.filter(v => v.sensitive).length || 0}</StatValue>
                    <StatLabel>Sensitive</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{packageData.variables?.filter(v => v.required).length || 0}</StatValue>
                    <StatLabel>Required</StatLabel>
                  </StatItem>
                </PreviewStats>
              </PreviewCard>
            </Section>

            {packageData.variables && packageData.variables.length > 0 && (
              <Section>
                <SectionTitle>🔧 Variable Mapping</SectionTitle>
                
                <VariableMappingSection>
                  <VariableMapping>
                    {packageData.variables.map(variable => (
                      <VariableMappingItem key={variable.id}>
                        <VariableInfo>
                          <VariableName>
                            {variable.sensitive && '🔒'} {variable.name}
                          </VariableName>
                          <VariableDetails>
                            {variable.type} • {variable.description}
                            {variable.required && ' • Required'}
                          </VariableDetails>
                        </VariableInfo>
                        
                        <MappingArrow>→</MappingArrow>
                        
                        <Input
                          type="text"
                          value={variableMapping[variable.id] || variable.name}
                          onChange={(e) => handleVariableMappingChange(variable.id, e.target.value)}
                          placeholder="New variable name"
                        />
                      </VariableMappingItem>
                    ))}
                  </VariableMapping>
                </VariableMappingSection>
              </Section>
            )}

            {hasConflicts && (
              <Section>
                <SectionTitle>⚠️ Import Conflicts</SectionTitle>
                
                {conflicts.summary.critical > 0 && (
                  <ErrorMessage>
                    ❌ {conflicts.summary.critical} critical conflict(s) must be resolved before importing
                  </ErrorMessage>
                )}
                
                {conflicts.summary.warnings > 0 && (
                  <ConflictWarning>
                    ⚠️ {conflicts.summary.warnings} warning(s) detected - import will proceed with automatic resolution
                  </ConflictWarning>
                )}
              </Section>
            )}
          </>
        )}

        {importResult && (
          <Section>
            <SectionTitle>🎉 Import Complete</SectionTitle>
            
            <SuccessMessage>
              ✅ Successfully imported "{importResult.automation.name}" with {importResult.variables.imported} variables
            </SuccessMessage>
            
            <PreviewCard>
              <PreviewTitle>Import Summary</PreviewTitle>
              <div>
                <strong>Automation ID:</strong> {importResult.automation.id}<br/>
                <strong>Created:</strong> {new Date(importResult.automation.created).toLocaleString()}<br/>
                <strong>Variables:</strong> {importResult.variables.successful} successful, {importResult.variables.failed} failed
              </div>
            </PreviewCard>
          </Section>
        )}
      </ImportContent>

      <ActionButtons>
        <div>
          {packageData && !importResult && (
            <Button onClick={() => {
              setPackageData(null);
              setPackageFile(null);
              setVariableMapping({});
              setConflicts(null);
              setError(null);
            }}>
              ← Back
            </Button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button onClick={onCancel}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          
          {packageData && !importResult && (
            <Button 
              variant="primary" 
              onClick={handleImport}
              disabled={!canImport}
            >
              {isImporting ? '🔄 Importing...' : '📥 Import'}
            </Button>
          )}
        </div>
      </ActionButtons>
    </ImportContainer>
  );
};

export default ImportInterface;