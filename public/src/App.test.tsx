import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders automation assistant heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/🤖 Automation Assistant/i);
  expect(headingElement).toBeInTheDocument();
});
