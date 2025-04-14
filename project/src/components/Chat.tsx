import React, { useState, useEffect } from 'react';
import { useUserStore } from '../lib/store';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send } from 'lucide-react';

interface Message {
  user: string;
  text: string;
  timestamp: number;
}

export default function Chat({ roomId }: { roomId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { name } = useUserStore();

  useEffect(() => {
    const channel = supabase.channel(`chat:${roomId}`);
    
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      setMessages((prev) => [...prev, payload]);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      user: name,
      text: newMessage,
      timestamp: Date.now(),
    };

    supabase.channel(`chat:${roomId}`).send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    setNewMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Chat</h3>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.user === name ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.user === name
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-semibold">{message.user}</p>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-lg"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}