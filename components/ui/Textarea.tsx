
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-xs font-semibold text-future-gray mb-2 font-orbitron uppercase tracking-wider">
        {label}
      </label>
      <textarea
        id={id}
        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-primary placeholder-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-tech-mono text-sm min-h-[100px] resize-y"
        {...props}
      />
    </div>
  );
};

export default Textarea;
