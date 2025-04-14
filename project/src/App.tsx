import React, { useState } from 'react';
import { useUserStore } from './lib/store';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Chat from './components/Chat';
import UserList from './components/UserList';
import { Toaster } from 'react-hot-toast';

function App() {
  const { name, setName, roomId, setRoomId } = useUserStore();
  const [isJoining, setIsJoining] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setRoomId(roomInput);
  };

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    setRoomId(newRoomId);
  };

  const handleSetName = (inputName: string) => {
    setName(inputName);
    localStorage.setItem('userName', inputName);
  };

  if (!name) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Welcome to Jamboard</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
            if (input.value.trim()) handleSetName(input.value);
          }}>
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              className="w-full p-3 border rounded-lg mb-4"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Join or Create Room</h1>
          
          {isJoining ? (
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter room code"
                className="w-full p-3 border rounded-lg mb-4"
                required
              />
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setIsJoining(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join Room
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setIsJoining(true)}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Join Room
              </button>
              <button
                onClick={handleCreateRoom}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                Create New Room
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Toolbar />
      <Canvas roomId={roomId} />
      <Chat roomId={roomId} />
      <UserList roomId={roomId} />
      <Toaster />
    </div>
  );
}

export default App;