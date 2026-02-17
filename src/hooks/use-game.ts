'use client';

import { createContext, useContext } from 'react';
import type { DocumentData } from 'firebase/firestore';

export interface Game extends DocumentData {
  id: string;
  name: string;
  result: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  openTime: string;
  closeTime: string;
  active: boolean;
  activeDays?: string[];
}

export interface GameContextType {
    game: Game | null;
    loading: boolean;
    now: Date;
}

export const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameLayout');
    }
    return context;
};
