import React from 'react';
import { User } from '../../config/user';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  return (
    <div className={`bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center ${sizeClasses[size]}`}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={`rounded-full ${sizeClasses[size]}`}
        />
      ) : (
        <span className="text-white font-medium">{user.initials}</span>
      )}
    </div>
  );
}
