import React, { useState } from 'react';
import { ChecklistItem, ChecklistItemType } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ArrowUpIcon } from '../icons/ArrowUpIcon';
import { ArrowDownIcon } from '../icons/ArrowDownIcon';

interface ChecklistInputProps {
  title: string;
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

const ChecklistInput: React.FC<ChecklistInputProps> = ({ title, items, onChange }) => {
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `new-${Date.now()}`, // Temporary ID for local state
        text: newItemText.trim(),
        // The type doesn't matter here as the backend assigns it based on the list
        type: ChecklistItemType.ENTRY_CRITERIA,
      };
      onChange([...items, newItem]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    onChange(items.filter((_, index) => index !== indexToRemove));
  };

  const handleItemTextChange = (indexToChange: number, newText: string) => {
    const newItems = items.map((item, index) =>
      index === indexToChange ? { ...item, text: newText } : item
    );
    onChange(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-future-light mb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id || index} className="flex items-center gap-2 group">
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-future-gray hover:text-photonic-blue disabled:opacity-30"
              >
                <ArrowUpIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === items.length - 1}
                className="text-future-gray hover:text-photonic-blue disabled:opacity-30"
              >
                <ArrowDownIcon className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleItemTextChange(index, e.target.value)}
              className="flex-grow bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-1.5 text-sm text-future-light placeholder-future-gray/50 focus:outline-none focus:ring-1 focus:ring-photonic-blue"
            />
            <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-risk-high hover:bg-risk-high/10 rounded-md">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 pl-6">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
          placeholder="Add a rule..."
          className="flex-grow bg-future-dark border border-photonic-blue/30 rounded-md px-3 py-1.5 text-sm text-future-light placeholder-future-gray/50 focus:outline-none focus:ring-1 focus:ring-photonic-blue"
        />
        <button type="button" onClick={handleAddItem} className="p-1.5 text-momentum-green hover:bg-momentum-green/10 rounded-md">
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChecklistInput;

