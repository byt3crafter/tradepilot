import React from 'react';

interface MetaTraderIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const MetaTraderIcon: React.FC<MetaTraderIconProps> = ({ className = '', ...props }) => (
  <img
    src="/metatrader.png"
    alt="MetaTrader"
    className={`${className}`}
    {...props}
  />
);
