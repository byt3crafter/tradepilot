import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-5 h-5 border-2 border-future-dark border-t-photonic-blue rounded-full animate-spin mx-auto"></div>
  );
};

export default Spinner;