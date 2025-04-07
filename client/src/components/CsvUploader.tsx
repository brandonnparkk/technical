import React, { useState } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { uploadCsv } from '../api/api';

const CsvUploader: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('');

    try {
      const result = await uploadCsv(file);
      console.log(result);
      setMessage(`Successfully uploaded`);
      onUploadSuccess();
    } catch (error) {
      setMessage('Upload failed. Please try again.');
      console.error(error);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Box sx={{ mb: 4, p: 3, border: '1px dashed grey', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        Upload CSV File
      </Typography>
      <input
        accept=".csv"
        style={{ display: 'none' }}
        id="csv-upload"
        type="file"
        onChange={handleFileUpload}
      />
      <label htmlFor="csv-upload">
        <Button
          variant="contained"
          component="span"
          startIcon={<UploadIcon />}
          disabled={isUploading}
        >
          {isUploading ? <CircularProgress size={24} /> : 'Select CSV'}
        </Button>
      </label>
      {message && (
        <Typography variant="body2" sx={{ mt: 2, color: message.includes('failed') ? 'error.main' : 'success.main' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default CsvUploader;