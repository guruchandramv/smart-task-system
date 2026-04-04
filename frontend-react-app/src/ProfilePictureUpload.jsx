import React, { useState } from 'react';
import axios from 'axios';

function ProfilePictureUpload({ userId, onUploadComplete }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        setUploading(true);
        try {
            const response = await axios.post(
                `/api/profile-picture/upload/${userId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            setMessage('Profile picture uploaded successfully!');
            if (onUploadComplete) onUploadComplete();
            // Clear selected file after upload
            setSelectedFile(null);
        } catch (error) {
            console.error('Upload error:', error);
            setMessage(error.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete your profile picture?')) {
            return;
        }

        setUploading(true);
        try {
            await axios.delete(`/api/profile-picture/${userId}`);
            setMessage('Profile picture deleted successfully!');
            setPreview(null);
            setSelectedFile(null);
            if (onUploadComplete) onUploadComplete();
        } catch (error) {
            console.error('Delete error:', error);
            setMessage(error.response?.data?.error || 'Delete failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
            <h3>Profile Picture</h3>

            {preview && (
                <div style={{ marginBottom: '20px' }}>
                    <img
                        src={preview}
                        alt="Preview"
                        style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #ddd'
                        }}
                    />
                </div>
            )}

            <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ marginBottom: '10px' }}
            />

            <div style={{ marginTop: '10px' }}>
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    style={{
                        padding: '10px 20px',
                        marginRight: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed'
                    }}
                >
                    {uploading ? 'Uploading...' : 'Upload Picture'}
                </button>

                <button
                    onClick={handleDelete}
                    disabled={uploading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                >
                    Delete Picture
                </button>
            </div>

            {message && (
                <p style={{
                    marginTop: '10px',
                    color: message.includes('success') ? 'green' : 'red'
                }}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default ProfilePictureUpload;