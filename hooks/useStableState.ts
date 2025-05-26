/**
 * A specialized hook to provide more stable state management
 * Helps prevent state update issues that can cause white screens
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Works like useState but with additional stability mechanisms
 * Particularly useful for state that drives critical app rendering
 */
export function useStableState<T>(initialValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue);
  const stateRef = useRef<T>(initialValue);
  
  // Keep a ref to the latest state to prevent closure issues
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Wrapped setter that provides additional stability
  const setStableState = useCallback((value: T) => {
    // Only update if actually changed, prevents unnecessary renders
    if (JSON.stringify(value) !== JSON.stringify(stateRef.current)) {
      setState(value);
      stateRef.current = value;
    }
  }, []);
  
  return [state, setStableState];
}

/**
 * Similar to useStableState but designed for boolean flags with guarded state transitions
 */
export function useStableFlag(initialValue: boolean = false): [boolean, () => void, () => void, () => void] {
  const [flag, setFlag] = useState<boolean>(initialValue);
  const flagRef = useRef<boolean>(initialValue);
  
  // Keep ref in sync with state
  useEffect(() => {
    flagRef.current = flag;
  }, [flag]);
  
  const setTrue = useCallback(() => {
    if (!flagRef.current) {
      setFlag(true);
      flagRef.current = true;
    }
  }, []);
  
  const setFalse = useCallback(() => {
    if (flagRef.current) {
      setFlag(false);
      flagRef.current = false;
    }
  }, []);
  
  const toggle = useCallback(() => {
    const newValue = !flagRef.current;
    setFlag(newValue);
    flagRef.current = newValue;
  }, []);
  
  return [flag, setTrue, setFalse, toggle];
}
