import React from 'react';

interface CTraderIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const CTraderIcon: React.FC<CTraderIconProps> = ({ className = '', ...props }) => (
  <img
    src="/ctrader.png"
    alt="cTrader"
    className={`${className}`}
    {...props}
  />
);
