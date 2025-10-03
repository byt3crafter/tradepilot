import React, { useRef, useEffect } from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  indeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, indeterminate = false, ...props }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        ref={ref}
        className="appearance-none h-4 w-4 rounded-sm border-2 border-future-gray bg-transparent checked:bg-photonic-blue checked:border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-future-panel focus:ring-photonic-blue"
        style={{
          backgroundImage: props.checked && !indeterminate ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")` : 'none',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="ml-3 block text-sm text-future-light">
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
