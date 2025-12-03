'use client';

import { useState, useEffect } from 'react';

export interface UIState {
  isLoading: boolean;
  error: string | null;
  notification: string | null;
}

class Store {
  private state: UIState = {
    isLoading: false,
    error: null,
    notification: null
  };

  private listeners: Set&lt;() =&gt; void&gt; = new Set();

  getState(): UIState {
    return { ...this.state };
  }

  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  setNotification(notification: string | null): void {
    this.state.notification = notification;
    this.notify();
  }

  subscribe(listener: () =&gt; void): () =&gt; void {
    this.listeners.add(listener);
    return () =&gt; this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener =&gt; listener());
  }
}

export const store = new Store();

export function useStore(): UIState {
  const [state, setState] = useState(store.getState());

  useEffect(() =&gt; {
    return store.subscribe(() =&gt; setState(store.getState()));
  }, []);

  return state;
}

export function useLoading(): [boolean, (loading: boolean) =&gt; void] {
  const state = useStore();
  return [state.isLoading, store.setLoading.bind(store)];
}
