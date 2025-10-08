import { useCallback, useMemo } from 'react';

// Central list of common indices. This is now the single source of truth for formatting.
// It is more robust than relying on user-configurable `pipSize` which may not be set.
const INDEX_SYMBOLS = [
    'US30', 'SPX500', 'NAS100', 'DE40', 'UK100', 'GER30', 'FRA40', 'JP225', 'HK50', 'AUS200', 'USTEC', 'DAX', 'FTSE',
    'DOW', 'SP500', 'NDX', 'DJI', 'STOXX50'
];

export const usePriceFormatter = (assetSymbol?: string) => {

  const isIndex = useMemo(() => {
    if (!assetSymbol) return false;
    const upperAsset = assetSymbol.toUpperCase();
    
    // An asset is considered an index if its symbol is found in our master list.
    // This is simpler and more reliable than checking pipSize.
    return INDEX_SYMBOLS.some(indexSymbol => upperAsset.includes(indexSymbol));
  }, [assetSymbol]);

  const priceDecimals = useMemo(() => (isIndex ? 2 : 5), [isIndex]);

  const formatPrice = useCallback((price: number | null | undefined): string => {
    if (price === null || price === undefined || isNaN(price)) {
      return '–';
    }
    // Using try-catch as a safeguard against potential issues with toFixed
    try {
      return price.toFixed(priceDecimals);
    } catch (e) {
      console.error(`Failed to format price: ${price} with ${priceDecimals} decimals`, e);
      return '–'; // Return a safe default
    }
  }, [priceDecimals]);

  return { formatPrice, priceDecimals };
};
