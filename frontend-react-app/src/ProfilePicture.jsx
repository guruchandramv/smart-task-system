import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfilePicture({ userId, size = 50, className = '' }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchProfilePicture = async () => {
            try {
                setLoading(true);
                const response = await axios.get(
                    `/api/profile-picture/${userId}`,
                    { responseType: 'blob' }
                );
                const url = URL.createObjectURL(response.data);
                setImageUrl(url);
                setError(false);
            } catch (err) {
                console.error('Error loading profile picture:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchProfilePicture();
        }

        // Cleanup object URL
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [userId]);

    if (loading) {
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: '#f0f0f0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                className={className}
            >
                <span>...</span>
            </div>
        );
    }

    if (error || !imageUrl) {
        // Default placeholder - show first letter of email or username
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: size * 0.4,
                    fontWeight: 'bold'
                }}
                className={className}
            >
                {/* You can customize this to show user's initial */}
                👤
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt="Profile"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                objectFit: 'cover'
            }}
            className={className}
        />
    );
}

export default ProfilePicture;