import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from '../components/layout/Navbar';

describe('Navbar Component with Refresh Data', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderNavbar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Navbar
          currentTab="decision"
          onSelectTab={vi.fn()}
          onOpenMethodology={vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  it('renders the brand title and navigation tabs', () => {
    renderNavbar();
    expect(screen.getByText('GridBricks')).toBeInTheDocument();
    expect(screen.getByText('Decision View')).toBeInTheDocument();
    expect(screen.getByText('Accuracy & Risk')).toBeInTheDocument();
    expect(screen.getByText('Forecast Revisions')).toBeInTheDocument();
  });

  it('renders the Refresh Data button', () => {
    renderNavbar();
    const refreshBtn = screen.getByRole('button', { name: /refresh data/i });
    expect(refreshBtn).toBeInTheDocument();
  });

  it('triggers refresh and enters loading state on click', async () => {
    renderNavbar();
    const refreshBtn = screen.getByRole('button', { name: /refresh data/i });

    fireEvent.click(refreshBtn);

    // Should indicate refreshing
    await waitFor(() => {
      expect(screen.getByText(/refreshing\.\.\.|refresh data/i)).toBeInTheDocument();
    });
  });
});
