import React from 'react';
import styled, { css } from 'styled-components';
import { useBreakpoint, getGridColumns, Breakpoint } from '../../utils/responsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  minItemWidth?: number;
  gap?: number;
  columns?: Partial<Record<Breakpoint, number>>;
  className?: string;
}

interface ResponsiveGridItemProps {
  children: React.ReactNode;
  span?: Partial<Record<Breakpoint, number>>;
  className?: string;
}

const GridContainer = styled.div<{
  $columns: number;
  $gap: number;
  $minItemWidth: number;
}>`
  display: grid;
  gap: ${props => props.$gap}px;
  
  /* Auto-fit grid with minimum item width */
  grid-template-columns: repeat(
    auto-fit, 
    minmax(${props => props.$minItemWidth}px, 1fr)
  );
  
  /* Override with specific column count if provided */
  ${props => props.$columns > 0 && css`
    grid-template-columns: repeat(${props.$columns}, 1fr);
  `}
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    gap: ${props => Math.max(12, props.$gap * 0.75)}px;
    grid-template-columns: 1fr;
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    gap: ${props => Math.max(16, props.$gap * 0.875)}px;
    grid-template-columns: repeat(auto-fit, minmax(${props => props.$minItemWidth * 0.9}px, 1fr));
  }
  
  @media (min-width: 1536px) {
    gap: ${props => props.$gap * 1.25}px;
  }
`;

const GridItem = styled.div<{
  $span: number;
}>`
  ${props => props.$span > 1 && css`
    grid-column: span ${props.$span};
  `}
  
  /* Prevent items from being too narrow */
  min-width: 0;
  
  /* Responsive span adjustments */
  @media (max-width: 640px) {
    grid-column: span 1 !important;
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    ${props => props.$span > 2 && css`
      grid-column: span 2;
    `}
  }
`;

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  minItemWidth = 300,
  gap = 24,
  columns,
  className
}) => {
  const { currentBreakpoint } = useBreakpoint();
  
  // Determine column count
  let columnCount = 0;
  if (columns && columns[currentBreakpoint]) {
    columnCount = columns[currentBreakpoint]!;
  } else {
    // Fallback to auto-calculated columns
    columnCount = getGridColumns(currentBreakpoint, minItemWidth);
  }

  return (
    <GridContainer
      $columns={columnCount}
      $gap={gap}
      $minItemWidth={minItemWidth}
      className={className}
    >
      {children}
    </GridContainer>
  );
};

export const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  children,
  span,
  className
}) => {
  const { currentBreakpoint } = useBreakpoint();
  
  // Determine span for current breakpoint
  let itemSpan = 1;
  if (span && span[currentBreakpoint]) {
    itemSpan = span[currentBreakpoint]!;
  } else if (span) {
    // Fallback to smaller breakpoints
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (span[bp] !== undefined) {
        itemSpan = span[bp]!;
        break;
      }
    }
  }

  return (
    <GridItem $span={itemSpan} className={className}>
      {children}
    </GridItem>
  );
};

// Masonry grid for items with varying heights
const MasonryContainer = styled.div<{
  $columns: number;
  $gap: number;
}>`
  column-count: ${props => props.$columns};
  column-gap: ${props => props.$gap}px;
  column-fill: balance;
  
  @media (max-width: 640px) {
    column-count: 1;
    column-gap: ${props => Math.max(12, props.$gap * 0.75)}px;
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    column-count: ${props => Math.max(1, Math.floor(props.$columns / 2))};
    column-gap: ${props => Math.max(16, props.$gap * 0.875)}px;
  }
  
  @media (min-width: 1536px) {
    column-gap: ${props => props.$gap * 1.25}px;
  }
`;

const MasonryItem = styled.div`
  break-inside: avoid;
  margin-bottom: var(--space-6);
  
  @media (max-width: 640px) {
    margin-bottom: var(--space-4);
  }
  
  @media (min-width: 1536px) {
    margin-bottom: var(--space-8);
  }
`;

interface ResponsiveMasonryProps {
  children: React.ReactNode;
  columns?: Partial<Record<Breakpoint, number>>;
  gap?: number;
  className?: string;
}

export const ResponsiveMasonry: React.FC<ResponsiveMasonryProps> = ({
  children,
  columns = { xs: 1, sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5 },
  gap = 24,
  className
}) => {
  const { currentBreakpoint } = useBreakpoint();
  
  // Determine column count
  let columnCount = columns[currentBreakpoint] || 3;

  return (
    <MasonryContainer
      $columns={columnCount}
      $gap={gap}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <MasonryItem key={index}>
          {child}
        </MasonryItem>
      ))}
    </MasonryContainer>
  );
};

// Flexible grid that adapts to content
const FlexGridContainer = styled.div<{
  $minItemWidth: number;
  $gap: number;
}>`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.$gap}px;
  
  > * {
    flex: 1 1 ${props => props.$minItemWidth}px;
    min-width: ${props => props.$minItemWidth}px;
  }
  
  @media (max-width: 640px) {
    gap: ${props => Math.max(12, props.$gap * 0.75)}px;
    
    > * {
      flex: 1 1 100%;
      min-width: 100%;
    }
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    gap: ${props => Math.max(16, props.$gap * 0.875)}px;
    
    > * {
      flex: 1 1 ${props => props.$minItemWidth * 0.8}px;
      min-width: ${props => props.$minItemWidth * 0.8}px;
    }
  }
  
  @media (min-width: 1536px) {
    gap: ${props => props.$gap * 1.25}px;
  }
`;

interface ResponsiveFlexGridProps {
  children: React.ReactNode;
  minItemWidth?: number;
  gap?: number;
  className?: string;
}

export const ResponsiveFlexGrid: React.FC<ResponsiveFlexGridProps> = ({
  children,
  minItemWidth = 300,
  gap = 24,
  className
}) => {
  return (
    <FlexGridContainer
      $minItemWidth={minItemWidth}
      $gap={gap}
      className={className}
    >
      {children}
    </FlexGridContainer>
  );
};

// Container with responsive max-width
const ResponsiveContainerDiv = styled.div<{
  $maxWidth: string;
  $padding: string;
}>`
  width: 100%;
  max-width: ${props => props.$maxWidth};
  margin: 0 auto;
  padding: 0 ${props => props.$padding};
  
  @media (max-width: 640px) {
    padding: 0 var(--space-4);
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    padding: 0 var(--space-6);
  }
  
  @media (min-width: 1536px) {
    padding: 0 var(--space-8);
  }
`;

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  padding?: string;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = '1400px',
  padding = 'var(--space-6)',
  className
}) => {
  return (
    <ResponsiveContainerDiv
      $maxWidth={maxWidth}
      $padding={padding}
      className={className}
    >
      {children}
    </ResponsiveContainerDiv>
  );
};