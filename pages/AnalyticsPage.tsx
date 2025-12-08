import React, { useState } from 'react';
import Card from '../components/Card';
import useAnalyticsData from '../hooks/useAnalyticsData';
import Spinner from '../components/Spinner';
import OverallSummary from '../components/analytics/OverallSummary';
import PerformanceByAsset from '../components/analytics/PerformanceByAsset';
import PerformanceByTime from '../components/analytics/PerformanceByTime';

type AnalyticsTab = 'summary' | 'byAsset' | 'byTime';

const AnalyticsPage: React.FC = () => {
  const { data, isLoading, error } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('summary');

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    if (error) {
      return <div className="text-center text-risk-high py-16">{error}</div>;
    }
    if (!data) {
      return <div className="text-center text-future-gray py-16">Log some closed trades to see your performance analytics.</div>;
    }

    switch (activeTab) {
      case 'summary':
        return <OverallSummary data={data} />;
      case 'byAsset':
        return <PerformanceByAsset data={data.performanceByAsset} />;
      case 'byTime':
        return <PerformanceByTime dayData={data.performanceByDayOfWeek} hourData={data.performanceByHourOfDay} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron text-future-light">Performance Analytics</h1>
        <p className="text-future-gray">A deep dive into your trading habits and results.</p>
      </div>

      {/* Dropdown Selector */}
      <div className="relative mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as AnalyticsTab)}
          className="w-full md:w-auto px-4 py-3 bg-[#0C0D0E] border border-white/10 rounded-lg text-white font-semibold cursor-pointer hover:border-photonic-blue/50 transition-colors appearance-none pr-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1.25rem'
          }}
        >
          <option value="summary">Overall Summary</option>
          <option value="byAsset">Performance by Asset</option>
          <option value="byTime">Performance by Time</option>
        </select>
      </div>

      <Card>
        {renderContent()}
      </Card>
    </div>
  );
};

export default AnalyticsPage;
