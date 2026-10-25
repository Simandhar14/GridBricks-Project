import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar, ViewTab } from './components/layout/Navbar';
import { MethodologyDrawer } from './components/layout/MethodologyDrawer';
import { DecisionView } from './components/decision/DecisionView';
import { AccuracyView } from './components/accuracy/AccuracyView';
import { RevisionsView } from './components/revisions/RevisionsView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [currentTab, setCurrentTab] = useState<ViewTab>('decision');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [selectedCutoff, setSelectedCutoff] = useState<string>('09:00');
  const [accuracyStartDate, setAccuracyStartDate] = useState<string>('2026-01-01');
  const [accuracyEndDate, setAccuracyEndDate] = useState<string>('2026-01-31');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  const handleResetToDefault = () => {
    setCurrentTab('decision');
    setSelectedDate('2026-01-15');
    setSelectedCutoff('09:00');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onResetToDefaultView={handleResetToDefault}
      />

      <main key={theme} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'decision' && (
          <DecisionView
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            selectedCutoff={selectedCutoff}
            onChangeCutoff={setSelectedCutoff}
          />
        )}

        {currentTab === 'accuracy' && (
          <AccuracyView
            startDate={accuracyStartDate}
            endDate={accuracyEndDate}
            onChangeStartDate={setAccuracyStartDate}
            onChangeEndDate={setAccuracyEndDate}
            selectedCutoff={selectedCutoff}
            onChangeCutoff={setSelectedCutoff}
          />
        )}

        {currentTab === 'revisions' && (
          <RevisionsView
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            selectedCutoff={selectedCutoff}
            onChangeCutoff={setSelectedCutoff}
          />
        )}
      </main>

      <MethodologyDrawer
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div>
            Data Source: <strong>Elexon BMRS</strong> (FUELHH & WINDFOR streams) • January 2026 Delivery
          </div>
          <div>
            GridBricks Wind Desk • Pure D-1 Look-Ahead Compliant
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

