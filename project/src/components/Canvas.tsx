import React, { useRef, useEffect, useState } from 'react';
import { useDrawingStore } from '../lib/store';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface Point {
  x: number;
  y: number;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export default function Canvas({ roomId }: { roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { color, tool, lineWidth, history, currentStep, addToHistory } = useDrawingStore();
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    contextRef.current = context;

    // Create temporary canvas for shape preview
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    temp.style.position = 'absolute';
    temp.style.top = '0';
    temp.style.left = '0';
    temp.style.pointerEvents = 'none';
    canvas.parentElement?.appendChild(temp);
    setTempCanvas(temp);

    const channel = supabase.channel(`room:${roomId}`);
    
    channel.on('broadcast', { event: 'draw' }, ({ payload }) => {
      if (!contextRef.current) return;
      const { points, color, tool, lineWidth, text, imageData, clear } = payload;
      
      if (clear) {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      contextRef.current.strokeStyle = color;
      contextRef.current.fillStyle = color;
      contextRef.current.lineWidth = lineWidth;
      
      if (tool === 'pen' || tool === 'eraser') {
        contextRef.current.beginPath();
        contextRef.current.moveTo(points[0].x, points[0].y);
        contextRef.current.lineTo(points[1].x, points[1].y);
        contextRef.current.stroke();
      } else if (tool === 'rectangle') {
        contextRef.current.strokeRect(
          points[0].x,
          points[0].y,
          points[1].x - points[0].x,
          points[1].y - points[0].y
        );
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
        );
        contextRef.current.beginPath();
        contextRef.current.arc(points[0].x, points[0].y, radius, 0, 2 * Math.PI);
        contextRef.current.stroke();
      } else if (tool === 'text' && text) {
        contextRef.current.font = `${lineWidth * 10}px Arial`;
        contextRef.current.fillText(text, points[0].x, points[0].y);
      } else if (tool === 'image' && imageData) {
        const img = new Image();
        img.onload = () => {
          contextRef.current?.drawImage(img, points[0].x, points[0].y);
        };
        img.src = imageData;
      }

      // Save state for undo/redo
      if (canvas) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        addToHistory(imageData);
      }
    });

    channel.on('broadcast', { event: 'sticky' }, ({ payload }) => {
      setStickyNotes(prev => [...prev, payload]);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      temp.remove();
    };
  }, [roomId, addToHistory]);

  // Update canvas when history changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || currentStep < 0) return;

    if (currentStep >= 0 && currentStep < history.length) {
      context.putImageData(history[currentStep], 0, 0);
    }
  }, [currentStep, history]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    const { offsetX, offsetY } = nativeEvent;
    
    if (tool === 'text') {
      const input = prompt('Enter text:');
      if (input && contextRef.current) {
        contextRef.current.font = `${lineWidth * 10}px Arial`;
        contextRef.current.fillStyle = color;
        contextRef.current.fillText(input, offsetX, offsetY);
        
        supabase.channel(`room:${roomId}`).send({
          type: 'broadcast',
          event: 'draw',
          payload: { 
            points: [{ x: offsetX, y: offsetY }],
            color,
            tool,
            lineWidth,
            text: input
          }
        });

        // Save state for undo/redo
        const canvas = canvasRef.current;
        if (canvas && contextRef.current) {
          const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
          addToHistory(imageData);
        }
      }
      return;
    }

    if (tool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && contextRef.current) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              contextRef.current?.drawImage(img, offsetX, offsetY);
              
              supabase.channel(`room:${roomId}`).send({
                type: 'broadcast',
                event: 'draw',
                payload: {
                  points: [{ x: offsetX, y: offsetY }],
                  tool,
                  imageData: event.target?.result
                }
              });

              // Save state for undo/redo
              const canvas = canvasRef.current;
              if (canvas && contextRef.current) {
                const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
                addToHistory(imageData);
              }
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    if (tool === 'sticky') {
      const text = prompt('Enter sticky note text:');
      if (text) {
        const newNote: StickyNote = {
          id: Math.random().toString(36).substring(7),
          x: offsetX,
          y: offsetY,
          text,
          color
        };
        setStickyNotes(prev => [...prev, newNote]);
        
        supabase.channel(`room:${roomId}`).send({
          type: 'broadcast',
          event: 'sticky',
          payload: newNote
        });
      }
      return;
    }
    
    setStartPoint({ x: offsetX, y: offsetY });
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing || !contextRef.current || !startPoint || !tempCanvas) return;

    const { offsetX, offsetY } = nativeEvent;
    const context = contextRef.current;
    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) return;

    context.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    context.lineWidth = lineWidth;
    tempContext.strokeStyle = context.strokeStyle;
    tempContext.lineWidth = context.lineWidth;

    const points = [startPoint, { x: offsetX, y: offsetY }];

    if (tool === 'pen' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(offsetX, offsetY);
      context.stroke();
      setStartPoint({ x: offsetX, y: offsetY });

      supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'draw',
        payload: { points, color: context.strokeStyle, tool, lineWidth }
      });

      // Save state for undo/redo
      const canvas = canvasRef.current;
      if (canvas) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        addToHistory(imageData);
      }
    } else {
      // Clear temporary canvas
      tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      if (tool === 'rectangle') {
        tempContext.strokeRect(
          startPoint.x,
          startPoint.y,
          offsetX - startPoint.x,
          offsetY - startPoint.y
        );
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2)
        );
        tempContext.beginPath();
        tempContext.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        tempContext.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !startPoint || !contextRef.current || !tempCanvas) return;

    if (tool === 'rectangle' || tool === 'circle') {
      const tempContext = tempCanvas.getContext('2d');
      if (!tempContext) return;

      // Copy from temp canvas to main canvas
      contextRef.current.drawImage(tempCanvas, 0, 0);
      // Clear temp canvas
      tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      supabase.channel(`room:${roomId}`).send({
        type: 'broadcast',
        event: 'draw',
        payload: { 
          points: [startPoint, { x: tempCanvas.width / 2, y: tempCanvas.height / 2 }],
          color: contextRef.current.strokeStyle,
          tool,
          lineWidth
        }
      });

      // Save state for undo/redo
      const canvas = canvasRef.current;
      if (canvas) {
        const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
        addToHistory(imageData);
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="absolute inset-0 bg-white z-0"
      />
      {stickyNotes.map((note) => (
        <div
          key={note.id}
          className="absolute p-4 rounded-lg shadow-lg cursor-move"
          style={{
            left: note.x,
            top: note.y,
            backgroundColor: note.color,
            transform: 'translate(-50%, -50%)',
            zIndex: 20
          }}
        >
          <p className="text-sm whitespace-pre-wrap">{note.text}</p>
        </div>
      ))}
      <div 
        className="w-4 h-4 rounded-full border-2 border-black bg-transparent pointer-events-none absolute z-10"
        style={{ 
          left: startPoint?.x || -100,
          top: startPoint?.y || -100,
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  );
}