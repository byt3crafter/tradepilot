import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useSubscription } from '../../context/SubscriptionContext';
import { useView } from '../../context/ViewContext';

const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, hideUpgradeModal } = useSubscription();
  const { navigateTo } = useView();

  const handleUpgrade = () => {
    console.log('[UpgradeModal] Navigating to standalone subscription page...');
    navigateTo('pricing');
    hideUpgradeModal();
  };

  if (!isUpgradeModalOpen) {
    return null;
  }

  return (
    <Modal title="Upgrade Required" onClose={hideUpgradeModal} size="md">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-future-light mb-2">Your Trial Has Ended</h3>
        <p className="text-future-gray mb-6">
          Please upgrade to the Pro plan to continue logging new trades and using premium features.
        </p>
        <Button onClick={handleUpgrade} className="w-full">
          Go to Subscription Page
        </Button>
      </div>
    </Modal>
  );
};

export default UpgradeModal;