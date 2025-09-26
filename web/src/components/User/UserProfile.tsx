import React from 'react';
import { User } from '../../config/user';
import { UserAvatar } from './UserAvatar';

interface UserProfileProps {
  user: User;
  showDetails?: boolean;
}

export function UserProfile({ user, showDetails = true }: UserProfileProps) {
  return (
    <div className="flex items-center space-x-3">
      <UserAvatar user={user} />
      {showDetails && (
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      )}
    </div>
  );
}
