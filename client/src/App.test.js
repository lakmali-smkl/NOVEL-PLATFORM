import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './ThemeContext';

test('renders the navbar brand without crashing', () => {
  render(
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  );
  expect(screen.getAllByText(/novelverse/i).length).toBeGreaterThan(0);
});
