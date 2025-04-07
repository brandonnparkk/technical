import React from 'react';
import { Container, CssBaseline, Box } from '@mui/material';
import CsvUploader from './components/CsvUploader';
import DataTable from './components/DataTable';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <CsvUploader />
        </Box>
        <DataTable />
      </Container>
    </>
  );
};

export default App;