import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const UsernameDisplay: React.FC = () => {
  const { publicKey } = useWallet();
  const [username, setUsername] = React.useState<string>('');

  React.useEffect(() => {
    if (publicKey) {
      const storedData = localStorage.getItem(`user_${publicKey.toString()}`);
      if (storedData) {
        const userData = JSON.parse(storedData);
        setUsername(userData.username);
      }
    }
  }, [publicKey]);

  if (!username) return null;

  return (
    <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
      @{username}
    </div>
  );
};

export default UsernameDisplay;