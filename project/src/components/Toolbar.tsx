import React from 'react';
import { useDrawingStore, useUserStore } from '../lib/store';
import { supabase } from '../lib/supabaseClient';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle,
  Type,
  Image,
  StickyNote,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

export default function Toolbar() {
  const { setColor, setTool, setLineWidth, clearHistory } = useDrawingStore();
  const { roomId } = useUserStore();

  const handleClear = () => {
    if (!confirm('Are you sure you want to clear the canvas?')) return;
    
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    clearHistory();

    supabase.channel(`room:${roomId}`).send({
      type: 'broadcast',
      event: 'draw',
      payload: { clear: true }
    });

    toast.success('Canvas cleared');
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 flex items-center space-x-4 z-50">
      {roomId && (
        <div className="px-3 py-1 bg-gray-100 rounded-md mr-4">
          Room: <span className="font-mono font-bold">{roomId}</span>
        </div>
      )}
      
      <div className="flex space-x-2">
        {colors.map((color) => (
          <button
            key={color}
            className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-colors"
            style={{ backgroundColor: color }}
            onClick={() => setColor(color)}
          />
        ))}
      </div>
      
      <div className="h-8 w-px bg-gray-300" />
      
      <div className="flex space-x-2">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('pen')}
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('eraser')}
        >
          <Eraser className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('rectangle')}
        >
          <Square className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('circle')}
        >
          <Circle className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('text')}
        >
          <Type className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('image')}
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setTool('sticky')}
        >
          <StickyNote className="w-5 h-5" />
        </button>
      </div>
      
      <div className="h-8 w-px bg-gray-300" />
      
      <div className="flex space-x-2">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
          onClick={handleClear}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      <div className="h-8 w-px bg-gray-300" />
      
      <select
        className="p-2 border rounded-lg"
        onChange={(e) => setLineWidth(Number(e.target.value))}
        defaultValue="2"
      >
        <option value="1">Thin</option>
        <option value="2">Medium</option>
        <option value="4">Thick</option>
      </select>
    </div>
  );
}