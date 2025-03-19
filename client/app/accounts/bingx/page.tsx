// client/app/accounts/bingx/page.tsx
import { useState } from 'react';
import axios from 'axios';

const BingxAccountPage = () => {
    const [apiKey, setApiKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/accounts/bingx', { apiKey, secretKey });
            setMessage(response.data.message);
        } catch (error) {
            setMessage('Failed to add BingX account');
            console.error(error);
        }
    };

    return (
        <div>
            <h1>Add BingX Account</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    API Key:
                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
                </label>
                <br />
                <label>
                    Secret Key:
                    <input type="text" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required />
                </label>
                <br />
                <button type="submit">Add Account</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default BingxAccountPage;
