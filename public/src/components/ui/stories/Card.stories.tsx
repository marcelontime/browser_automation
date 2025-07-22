import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../enhanced-card';
import { EnhancedButton } from '../enhanced-button';
import { Badge } from '../badge';
import { ThemeProvider } from '../theme-provider';
import { PlayIcon, EditIcon, DeleteIcon, BotIcon } from '../icons';

const meta: Meta<typeof EnhancedCard> = {
  title: 'Design System/EnhancedCard',
  component: EnhancedCard,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ padding: '2rem', maxWidth: '600px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Enhanced card component with multiple variants and interactive capabilities.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'glass', 'gradient'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
    },
    hover: {
      control: 'boolean',
    },
    interactive: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnhancedCard>;

export const Default: Story = {
  args: {
    children: (
      <CardContent>
        <p>This is a default card with some content.</p>
      </CardContent>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>This is a card description that provides more context.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here. This can include any type of content you need.</p>
        </CardContent>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card with Footer</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This card has a footer with actions.</p>
        </CardContent>
        <CardFooter>
          <EnhancedButton variant="primary" size="sm">Primary Action</EnhancedButton>
          <EnhancedButton variant="outline" size="sm">Secondary</EnhancedButton>
        </CardFooter>
      </>
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <EnhancedCard variant="default">
        <CardContent>Default Card</CardContent>
      </EnhancedCard>
      
      <EnhancedCard variant="elevated">
        <CardContent>Elevated Card</CardContent>
      </EnhancedCard>
      
      <EnhancedCard variant="outlined">
        <CardContent>Outlined Card</CardContent>
      </EnhancedCard>
      
      <EnhancedCard variant="glass">
        <CardContent>Glass Card</CardContent>
      </EnhancedCard>
      
      <EnhancedCard variant="gradient">
        <CardContent>Gradient Card</CardContent>
      </EnhancedCard>
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    interactive: true,
    hover: true,
    onClick: () => alert('Card clicked!'),
    children: (
      <CardContent>
        <p>This is an interactive card. Click me!</p>
      </CardContent>
    ),
  },
};

export const AutomationCard: Story = {
  render: () => (
    <EnhancedCard hover>
      <CardHeader actions={
        <Badge variant="success" size="sm">Ready</Badge>
      }>
        <CardTitle size="lg">Login Automation</CardTitle>
        <CardDescription>
          Automated login process for the company portal with variable support
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
            <span>🏃‍♂️</span>
            <span>Last run: 2 hours ago</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
            <span>📋</span>
            <span>5 steps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
            <span>🔧</span>
            <span>3 variables</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter justify="between">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <EnhancedButton variant="primary" size="sm" icon={<PlayIcon size={14} />}>
            Run
          </EnhancedButton>
          <EnhancedButton variant="ghost" size="sm" icon={<EditIcon size={14} />} />
          <EnhancedButton variant="ghost" size="sm" icon={<DeleteIcon size={14} />} />
        </div>
        <Badge variant="outline" size="sm">95% success</Badge>
      </CardFooter>
    </EnhancedCard>
  ),
};

export const DashboardStats: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <EnhancedCard hover>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'var(--primary-100)', 
              color: 'var(--primary-600)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BotIcon size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neutral-900)', marginBottom: '0.25rem' }}>
            24
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', fontWeight: '500' }}>
            Total Automations
          </div>
        </CardContent>
      </EnhancedCard>
      
      <EnhancedCard hover>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'var(--success-100)', 
              color: 'var(--success-600)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayIcon size={24} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neutral-900)', marginBottom: '0.25rem' }}>
            3
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', fontWeight: '500' }}>
            Currently Running
          </div>
        </CardContent>
      </EnhancedCard>
    </div>
  ),
};

export const PaddingVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <EnhancedCard padding="none">
        <div style={{ padding: '1rem', background: 'var(--neutral-100)' }}>
          No Padding (custom content padding)
        </div>
      </EnhancedCard>
      
      <EnhancedCard padding="sm">
        <div>Small Padding</div>
      </EnhancedCard>
      
      <EnhancedCard padding="md">
        <div>Medium Padding (default)</div>
      </EnhancedCard>
      
      <EnhancedCard padding="lg">
        <div>Large Padding</div>
      </EnhancedCard>
      
      <EnhancedCard padding="xl">
        <div>Extra Large Padding</div>
      </EnhancedCard>
    </div>
  ),
};