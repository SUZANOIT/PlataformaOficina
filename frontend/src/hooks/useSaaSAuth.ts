import { useContext } from 'react';
import { SaaSAuthContext } from '../context/SaaSAuthProvider';
import type { SaaSAuthContextType } from '../context/SaaSAuthProvider';

export function useSaaSAuth(): SaaSAuthContextType {
  const context = useContext(SaaSAuthContext);
  if (!context) {
    throw new Error('useSaaSAuth deve ser utilizado dentro de um SaaSAuthProvider');
  }
  return context;
}
