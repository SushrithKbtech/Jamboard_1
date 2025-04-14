import { create } from 'zustand';

interface DrawingState {
  color: string;
  tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image' | 'sticky';
  lineWidth: number;
  history: ImageData[];
  currentStep: number;
  setColor: (color: string) => void;
  setTool: (tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image' | 'sticky') => void;
  setLineWidth: (width: number) => void;
  addToHistory: (imageData: ImageData) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  color: '#000000',
  tool: 'pen',
  lineWidth: 2,
  history: [],
  currentStep: -1,
  setColor: (color) => set({ color }),
  setTool: (tool) => set({ tool }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  addToHistory: (imageData) => set((state) => {
    const newHistory = state.history.slice(0, state.currentStep + 1);
    return {
      history: [...newHistory, imageData],
      currentStep: state.currentStep + 1
    };
  }),
  undo: () => set((state) => ({
    currentStep: Math.max(-1, state.currentStep - 1)
  })),
  redo: () => set((state) => ({
    currentStep: Math.min(state.history.length - 1, state.currentStep + 1)
  })),
  clearHistory: () => set({ history: [], currentStep: -1 })
}));

interface UserState {
  name: string;
  roomId: string | null;
  setName: (name: string) => void;
  setRoomId: (roomId: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  name: '',
  roomId: null,
  setName: (name) => set({ name }),
  setRoomId: (roomId) => set({ roomId }),
}));