import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../components/shared/KpiCard';

describe('KpiCard Component', () => {
  it('renders title, value, and subtext', () => {
    render(
      <KpiCard
        title="Forecast Peak"
        value="5,400.0 MW"
        subtext="Peak generation for delivery day"
      />
    );

    expect(screen.getByText('Forecast Peak')).toBeInTheDocument();
    expect(screen.getByText('5,400.0 MW')).toBeInTheDocument();
    expect(screen.getByText('Peak generation for delivery day')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <KpiCard
        title="Coverage"
        value="100.0%"
        badge={{ text: 'Full', variant: 'positive' }}
      />
    );

    expect(screen.getByText('Full')).toBeInTheDocument();
  });
});
