import React from 'react';

const AiIdeaGeneratorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // This feature is deprecated.
  React.useEffect(() => {
    onClose();
  }, [onClose]);
  return null;
};

export default AiIdeaGeneratorModal;
