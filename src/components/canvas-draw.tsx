'use client';

import { useRef, useEffect, useState, type MouseEvent, type TouchEvent } from 'react';
import { Button } from './ui/button';
import { RotateCcw } from 'lucide-react';

type CanvasDrawProps = {
  onDraw: () => void;
  onClear: () => void;
};

export function CanvasDraw({ onDraw, onClear }: CanvasDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#6750A4';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, []);

  const getCoords = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!context) return;
    const { x, y } = getCoords(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    onDraw();
  };

  const draw = (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const { x, y } = getCoords(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      onClear();
    }
  };

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        width={350}
        height={150}
        className="w-full h-auto bg-secondary rounded-md cursor-crosshair border-2 border-dashed border-transparent has-[:active]:border-primary"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClear}
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-accent/20"
        aria-label="Clear signature"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
