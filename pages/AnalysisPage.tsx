import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/ui/Button';
import { useAnalysis } from '../context/AnalysisContext';
import Spinner from '../components/Spinner';
import { PlusIcon } from '../components/icons/PlusIcon';
import Modal from '../components/ui/Modal';
import { TrackerIcon } from '../components/icons/TrackerIcon';
import AddAnalysisModal from '../components/analysis/AddAnalysisModal';
import AnalysisCard from '../components/analysis/AnalysisCard';
import { Analysis } from '../types';

const AnalysisPage: React.FC = () => {
  const { analyses, isLoading } = useAnalysis();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);

  const openAddModal = () => {
    setEditingAnalysis(null);
    setIsAddModalOpen(true);
  };
  
  const openEditModal = (analysis: Analysis) => {
    setEditingAnalysis(analysis);
    setIsAddModalOpen(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8 h-64">
          <Spinner />
        </div>
      );
    }

    if (analyses.length === 0) {
      return (
        <div className="text-center p-16">
          <div className="border-2 border-dashed border-photonic-blue/20 rounded-lg p-8">
            <TrackerIcon className="w-12 h-12 mx-auto text-future-gray" />
            <h3 className="text-lg font-semibold text-future-light mt-4">Your Analysis Tracker is Empty</h3>
            <p className="text-future-gray mt-2 mb-4">Log your market analysis and trade ideas here.</p>
            <Button onClick={openAddModal} className="w-auto">
              Log Your First Analysis
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {analyses.map(analysis => (
            <AnalysisCard key={analysis.id} analysis={analysis} onEdit={() => openEditModal(analysis)} />
        ))}
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-orbitron text-future-light">Tracker</h1>
          <p className="text-future-gray">Your professional library of market analysis and ideas.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={openAddModal} className="w-auto flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            <span>Log New Analysis</span>
          </Button>
        </div>
      </div>

      <Card>
        {renderContent()}
      </Card>
      
      {isAddModalOpen && (
        <AddAnalysisModal 
          analysisToEdit={editingAnalysis}
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default AnalysisPage;