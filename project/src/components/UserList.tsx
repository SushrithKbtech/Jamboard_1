import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUserStore } from '../lib/store';

interface User {
  name: string;
  joinedAt: number;
}

export default function UserList({ roomId }: { roomId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const { name } = useUserStore();

  useEffect(() => {
    const channel = supabase.channel(`room-${roomId}`, {
      config: {
        presence: {
          key: name,
        },
      },
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const userList = Object.values(state).flat().map((user: any) => ({
        name: user.name,
        joinedAt: user.joinedAt,
      }));
      setUsers(userList);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('User joined:', newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('User left:', leftPresences);
    });

    const setupPresence = async () => {
      try {
        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              name: name,
              joinedAt: Date.now(),
            });
          }
        });
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };

    setupPresence();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, name]);

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5" />
        <h3 className="font-semibold">Users in Room ({users.length})</h3>
      </div>
      <div className="space-y-1">
        {users.map((user, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}