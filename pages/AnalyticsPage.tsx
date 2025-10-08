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

      <div className="border-b border-photonic-blue/20 mb-4">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'summary' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
          >
            Overall Summary
          </button>
          <button
            onClick={() => setActiveTab('byAsset')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'byAsset' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
          >
            By Asset
          </button>
          <button
            onClick={() => setActiveTab('byTime')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'byTime' ? 'text-photonic-blue border-b-2 border-photonic-blue' : 'text-future-gray hover:text-future-light'}`}
          >
            By Time
          </button>
        </nav>
      </div>

      <Card>
        {renderContent()}
      </Card>
    </div>
  );
};

export default AnalyticsPage;
