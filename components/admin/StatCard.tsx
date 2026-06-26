/**
 * StatCard — thin shim around the kit StatTile.
 * Keeps the same public API so AdminPage.tsx doesn't need to change imports.
 */
import React from 'react';
import { StatTile } from '../ui';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: 'profit' | 'loss' | 'blue' | 'neutral';
}

const ACCENT_COLOR: Record<string, string> = {
  profit: 'text-jtp-profit',
  loss:   'text-jtp-loss',
  blue:   'text-jtp-blue',
  neutral: 'text-jtp-text',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, accent = 'neutral' }) => (
  <StatTile
    label={title.toUpperCase()}
    value={String(value)}
    valueColor={ACCENT_COLOR[accent]}
  />
);

export default StatCard;
