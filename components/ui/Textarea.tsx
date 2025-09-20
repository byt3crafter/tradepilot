import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-future-gray mb-2">
        {label}
      </label>
      <textarea
        id={id}
        className="w-full bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-2 text-future-light placeholder-future-gray/50 focus:outline-none focus:ring-2 focus:ring-photonic-blue focus:border-transparent transition-shadow min-h-[100px] resize-y"
        {...props}
      />
    </div>
  );
};

export default Textarea;
