import React from 'react';
import { Property } from '../types/Property';
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '80vh',
  overflowY: 'auto'
};

interface CensusDataModalProps {
  open: boolean;
  onClose: () => void;
  property: Property | null;
  censusData: any;
  loading: boolean;
  error: string | null;
  onExited: () => void;
}

const CensusDataModal: React.FC<CensusDataModalProps> = ({
  open,
  onClose,
  property,
  censusData,
  loading,
  error,
  onExited
}) => {
  return (
    <Modal open={open} onClose={onClose} onTransitionExited={onExited}>
      <Box sx={modalStyle}>
        <Typography variant="h6" gutterBottom>
          Census Data for {property?.property_address}
        </Typography>
        
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {censusData && (
          <TableContainer component={Paper}>
            <IconButton
              onClick={onClose}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            ><CloseIcon/></IconButton>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">Total Housing Units</TableCell>
                  <TableCell align="right">{censusData.totalHousingUnits?.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Owner Occupied</TableCell>
                  <TableCell align="right">{censusData.ownerOccupied?.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Renter Occupied</TableCell>
                  <TableCell align="right">{censusData.renterOccupied?.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Owner Occupancy Rate</TableCell>
                  <TableCell align="right">
                    {((censusData.ownerOccupied / censusData.totalHousingUnits) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">Renter Occupancy Rate</TableCell>
                  <TableCell align="right">
                    {((censusData.renterOccupied / censusData.totalHousingUnits) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Modal>
  );
};

export default CensusDataModal;