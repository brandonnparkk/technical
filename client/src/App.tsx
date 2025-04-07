import React, { useState } from 'react';
import { Container, CssBaseline, Box } from '@mui/material';
import CsvUploader from './components/CsvUploader';
import DataTable from './components/DataTable';

const App: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);  // Trigger re-render
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <CsvUploader onUploadSuccess={handleUploadSuccess} />
        </Box>
        <DataTable key={refreshKey} />
      </Container>
    </>
  );
};

export default App;