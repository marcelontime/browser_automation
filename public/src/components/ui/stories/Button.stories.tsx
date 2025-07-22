import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedButton } from '../enhanced-button';
import { ThemeProvider } from '../theme-provider';
import { PlayIcon, PauseIcon, StopIcon, EditIcon, DeleteIcon } from '../icons';

const meta: Meta<typeof EnhancedButton> = {
  title: 'Design System/EnhancedButton',
  component: EnhancedButton,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Enhanced button component with multiple variants, sizes, and states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'success', 'warning', 'gradient'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    rounded: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnhancedButton>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive Button',
    variant: 'destructive',
  },
};

export const Success: Story = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning Button',
    variant: 'warning',
  },
};

export const Gradient: Story = {
  args: {
    children: 'Gradient Button',
    variant: 'gradient',
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <EnhancedButton size="xs">Extra Small</EnhancedButton>
      <EnhancedButton size="sm">Small</EnhancedButton>
      <EnhancedButton size="md">Medium</EnhancedButton>
      <EnhancedButton size="lg">Large</EnhancedButton>
      <EnhancedButton size="xl">Extra Large</EnhancedButton>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <EnhancedButton icon={<PlayIcon />}>Play</EnhancedButton>
      <EnhancedButton icon={<PauseIcon />} variant="secondary">Pause</EnhancedButton>
      <EnhancedButton icon={<StopIcon />} variant="destructive">Stop</EnhancedButton>
      <EnhancedButton icon={<EditIcon />} variant="outline">Edit</EnhancedButton>
      <EnhancedButton icon={<DeleteIcon />} variant="ghost">Delete</EnhancedButton>
    </div>
  ),
};

export const IconPositions: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <EnhancedButton icon={<PlayIcon />} iconPosition="left">Left Icon</EnhancedButton>
      <EnhancedButton icon={<PlayIcon />} iconPosition="right">Right Icon</EnhancedButton>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <EnhancedButton>Normal</EnhancedButton>
      <EnhancedButton loading>Loading</EnhancedButton>
      <EnhancedButton disabled>Disabled</EnhancedButton>
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
};

export const Rounded: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <EnhancedButton rounded>Rounded Button</EnhancedButton>
      <EnhancedButton rounded variant="secondary">Rounded Secondary</EnhancedButton>
      <EnhancedButton rounded variant="outline">Rounded Outline</EnhancedButton>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
      <EnhancedButton variant="primary">Primary</EnhancedButton>
      <EnhancedButton variant="secondary">Secondary</EnhancedButton>
      <EnhancedButton variant="outline">Outline</EnhancedButton>
      <EnhancedButton variant="ghost">Ghost</EnhancedButton>
      <EnhancedButton variant="destructive">Destructive</EnhancedButton>
      <EnhancedButton variant="success">Success</EnhancedButton>
      <EnhancedButton variant="warning">Warning</EnhancedButton>
      <EnhancedButton variant="gradient">Gradient</EnhancedButton>
    </div>
  ),
};