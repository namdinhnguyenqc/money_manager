import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

const TransactionContext = createContext();

export function useTransactions() {
  return useContext(TransactionContext);
}

export function TransactionProvider({ children }) {
  // Profiles hardcoded for the "2 Accounts" MVP
  const [profiles] = useState([
    { id: 'profile-a', name: 'Thành viên 1', color: 'bg-blue-500' },
    { id: 'profile-b', name: 'Thành viên 2', color: 'bg-rose-500' }
  ]);

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('money_mgr_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    // Persist user-scoped transactions
    const currentUser = getCurrentUser();
    const scoped = transactions.filter(t => !currentUser || t.userId === currentUser.id);
    localStorage.setItem('money_mgr_transactions', JSON.stringify(scoped));
  }, [transactions]);

  const addTransaction = (transaction) => {
    const currentUser = getCurrentUser();
    const newTx = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      userId: currentUser?.id || null
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <TransactionContext.Provider value={{
      profiles,
      transactions,
      addTransaction,
      deleteTransaction
    }}>
      {children}
    </TransactionContext.Provider>
  );
}
