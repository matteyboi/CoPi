import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('./data/syllabusData', async () => {
  const actual = await vi.importActual('./data/syllabusData');

  return {
    ...actual,
    initializeData: vi.fn().mockResolvedValue({
      syllabus: actual.syllabus,
      progressHistory: actual.progressHistory,
      oralSessions: actual.oralSessions,
    }),
  };
});

import App from './App';

test('renders loading state then hydrates app data', async () => {
  render(<App />);

  expect(screen.getByText(/loading your flight training data/i)).toBeInTheDocument();

  await waitForElementToBeRemoved(() =>
    screen.queryByText(/loading your flight training data/i)
  );

  expect(screen.queryByText(/loading your flight training data/i)).not.toBeInTheDocument();
});
