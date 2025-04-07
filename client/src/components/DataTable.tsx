import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TextField,
  Button,
  Box,
  CircularProgress,
  TablePagination,
  Link,
  InputAdornment,
} from "@mui/material";
import { Search, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { fetchProperties, updateProperty } from "../api/api";
import { useCensusData } from "../hooks/useCensusData";
import { Property } from "../types/Property";
import CensusDataModal from "./CensusDataModal";
import YearBuiltGraph from "./YearBuiltGraph";

interface EditableProperty extends Property {
  isEditing?: boolean;
}

interface SortConfig {
  key: keyof Property;
  direction: 'asc' | 'desc';
}

const PropertiesTable: React.FC = () => {
  const [properties, setProperties] = useState<EditableProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: censusData,
    loading: censusLoading,
    error: censusError,
    fetchData: fetchCensusData,
    resetData,
  } = useCensusData();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'property_address', // Default sort by address
    direction: 'asc'
  });

  // Fetch properties on mount
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const data = await fetchProperties();
        setProperties(data.map((p) => ({ ...p, isEditing: false })));
      } finally {
        setLoading(false);
      }
    };
    loadProperties();
  }, []);

  // Filter properties based on selected year
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Year filter
      const yearMatch = selectedYear
        ? property.year_built === selectedYear
        : true;

      // Search term filter (case insensitive)
      const searchMatch =
        searchTerm === "" ||
        ["property_address", "city", "state", "county"].some((field) => {
          const value =
            property[field as keyof Property]?.toString().toLowerCase() || "";
          return value.includes(searchTerm.toLowerCase());
        });

      return yearMatch && searchMatch;
    });
  }, [properties, selectedYear, searchTerm]);

  const sortedProperties = useMemo(() => {
    const sortableProperties = [...filteredProperties];
    if (sortConfig.key) {
      sortableProperties.sort((a, b) => {
        // Handle null/undefined values
        if (a[sortConfig.key] == null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (b[sortConfig.key] == null) return sortConfig.direction === 'asc' ? 1 : -1;
        
        // Numeric sorting for year_built, latitude, longitude
        if (typeof a[sortConfig.key] === 'number') {
          return sortConfig.direction === 'asc' 
            ? (a[sortConfig.key] as number) - (b[sortConfig.key] as number)
            : (b[sortConfig.key] as number) - (a[sortConfig.key] as number);
        }
        
        // String sorting for other fields
        return sortConfig.direction === 'asc'
          ? String(a[sortConfig.key]).localeCompare(String(b[sortConfig.key]))
          : String(b[sortConfig.key]).localeCompare(String(a[sortConfig.key]));
      });
    }
    return sortableProperties;
  }, [filteredProperties, sortConfig]);

  // Paginated data
  const paginatedProperties = useMemo(() => {
    return sortedProperties.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedProperties, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when search changes
  };

  // Toggle edit mode for a property
  const toggleEdit = (id: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEditing: !p.isEditing } : p))
    );
  };

  // Handle field updates
  const handleChange = (id: string, field: keyof Property, value: any) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddressClick = (property: Property) => {
    resetData();
    setSelectedProperty(property);
    setModalOpen(true);
    fetchCensusData(property.property_address, property.city, property.state);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleModalExited = () => {
    // Reset data when modal is fully closed
    resetData();
    setSelectedProperty(null);
  };

  // Save updates to Supabase
  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const updates = properties
        .filter((p) => p.isEditing)
        .map(({ isEditing, ...rest }) => rest);

      await Promise.all(updates.map(updateProperty));
      const updatedData = await fetchProperties();
      setProperties(updatedData.map((p) => ({ ...p, isEditing: false })));
    } finally {
      setIsUpdating(false);
    }
  };

  const requestSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0); // Reset to first page when sorting changes
  };
  
  const getSortIndicator = (key: keyof Property) => {
    if (sortConfig.key !== key) return null;

    return sortConfig.direction === 'asc' 
      ? <ArrowUpward fontSize="small" sx={{ ml: 0.5 }} />
      : <ArrowDownward fontSize="small" sx={{ ml: 0.5 }} />;
  };

  const handleExportCSV = () => {
    // all properties to CSV
    exportToCsv(properties);
  }

  const exportToCsv = (data: any, filename = 'properties_export.csv') => {
    // Define the fields we want to include in the CSV
    const fieldsToInclude = [
      'property_address',
      'city',
      'state',
      'zip',
      'county',
      'year_built',
      'longitude',
      'latitude',
      'occupancy_rate',
      'parking_spaces',
      'has_ev_charging',
      'redevelopment_opportunities'
    ];
  
    // Process the data to include only the fields we want
    const processedData = data.map((property: any) => {
      const csvRow = {} as any;
      
      fieldsToInclude.forEach((field) => {
        // Handle special cases for display values
        if (field === 'has_ev_charging') {
          csvRow[field] = property[field] ? 'Yes' : 'No';
        } 
        else if (field === 'occupancy_rate' && property[field] !== null) {
          csvRow[field] = `${property[field]}%`;
        }
        else {
          // Use the raw value or 'N/A' if null/undefined
          csvRow[field] = property[field] ?? 'N/A';
        }
      });
      
      return csvRow;
    });
  
    // Convert to CSV
    const csvRows = [];
    
    // Add headers
    const headers = fieldsToInclude.map(field => {
      // Format headers to match your table display names
      switch(field) {
        case 'property_address': return 'PROPERTYADDRESS';
        case 'year_built': return 'YEARBUILT';
        case 'city': return 'CITY';
        case 'state': return 'STATE';
        case 'zip': return 'ZIP';
        case 'county': return 'COUNTY';
        case 'longitude': return 'LONGITUDE';
        case 'latitude': return 'LATITUDE';
        case 'occupancy_rate': return 'OCCUPANCYRATE';
        case 'parking_spaces': return 'PARKINGSPACES';
        case 'has_ev_charging': return 'HASEVCHARGING';
        case 'redevelopment_opportunities': return 'REDEVELOPMENTOPPORTUNITIES';
        default: return field.charAt(0).toUpperCase() + field.slice(1);
      }
    });
    csvRows.push(headers.join(','));

    // Add data rows
    processedData.forEach((row:any) => {
      const values = fieldsToInclude.map(field => {
        // Escape values that might contain commas or quotes
        const value = row[field];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
  
    // Create and trigger download
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <YearBuiltGraph
        properties={properties}
        onYearClick={setSelectedYear}
        onClearClick={setSelectedYear}
        selectedYear={selectedYear}
      />

      <TableContainer component={Paper}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            mb: 3,
            gap: 2,
          }}
        >
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search by address, city, state, or county..."
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{
              width: 500,
              "& .MuiOutlinedInput-root": {
                height: 40, // Makes the input more compact
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, }}>
            <Button
              variant="contained"
              onClick={() => handleExportCSV()}
              disabled={isUpdating}
            >
              {isUpdating ? <CircularProgress size={24} /> : "Export table as CSV"}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isUpdating || !properties.some((p) => p.isEditing)}
            >
              {isUpdating ? <CircularProgress size={24} /> : "Save Changes"}
            </Button>
          </Box>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              {/* <TableCell>Select</TableCell> */}
              <TableCell
                onClick={() => requestSort('property_address')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Address{getSortIndicator('property_address')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('city')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                City{getSortIndicator('city')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('state')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                State{getSortIndicator('state')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('zip')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Zip{getSortIndicator('zip')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('county')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                County{getSortIndicator('county')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('year_built')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Year Built{getSortIndicator('year_built')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('longitude')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Longitude{getSortIndicator('longitude')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('latitude')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Latitude{getSortIndicator('latitude')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('occupancy_rate')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Occupancy Rate (%){getSortIndicator('occupancy_rate')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('parking_spaces')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Parking Spaces{getSortIndicator('parking_spaces')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('has_ev_charging')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                EV Charging{getSortIndicator('has_ev_charging')}
              </TableCell>
              <TableCell
                onClick={() => requestSort('redevelopment_opportunities')}
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Redevelopment Opportunities{getSortIndicator('redevelopment_opportunities')}
              </TableCell>
              <TableCell
                sx={{
                  width: "max-content",
                  whiteSpace: "nowrap",
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProperties.map((property) => (
              <TableRow key={property.id}>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Link
                    component="button"
                    variant="body1"
                    onClick={() => handleAddressClick(property)}
                    sx={{
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                        cursor: "pointer",
                      },
                    }}
                  >
                    {property.property_address}
                  </Link>
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.city}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.state}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.zip}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.county}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.year_built}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.longitude}
                </TableCell>
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.latitude}
                </TableCell>

                {/* Editable Fields */}
                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.isEditing ? (
                    <TextField
                      type="number"
                      value={property.occupancy_rate || ""}
                      onChange={(e) =>
                        handleChange(
                          property.id,
                          "occupancy_rate",
                          parseFloat(e.target.value)
                        )
                      }
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                    />
                  ) : property.occupancy_rate ? (
                    `${property.occupancy_rate}%`
                  ) : (
                    "N/A"
                  )}
                </TableCell>

                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.isEditing ? (
                    <TextField
                      type="number"
                      value={property.parking_spaces || ""}
                      onChange={(e) =>
                        handleChange(
                          property.id,
                          "parking_spaces",
                          parseInt(e.target.value)
                        )
                      }
                      inputProps={{ min: 0 }}
                    />
                  ) : (
                    property.parking_spaces || "N/A"
                  )}
                </TableCell>

                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  {property.isEditing ? (
                    <Checkbox
                      checked={property.has_ev_charging || false}
                      onChange={(e) =>
                        handleChange(
                          property.id,
                          "has_ev_charging",
                          e.target.checked
                        )
                      }
                    />
                  ) : property.has_ev_charging ? (
                    "Yes"
                  ) : (
                    "No"
                  )}
                </TableCell>

                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "text-wrap",
                    maxWidth: "150px",
                  }}
                >
                  {property.isEditing ? (
                    <TextField
                      value={property.redevelopment_opportunities || ""}
                      onChange={(e) =>
                        handleChange(
                          property.id,
                          "redevelopment_opportunities",
                          e.target.value
                        )
                      }
                      multiline
                    />
                  ) : (
                    property.redevelopment_opportunities || "N/A"
                  )}
                </TableCell>

                <TableCell
                  sx={{
                    width: "max-content",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => toggleEdit(property.id)}
                  >
                    {property.isEditing ? "Cancel" : "Edit"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={properties.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <CensusDataModal
        open={modalOpen}
        onClose={handleCloseModal}
        property={selectedProperty}
        censusData={censusData}
        loading={censusLoading}
        error={censusError}
        onExited={handleModalExited}
      />
    </Box>
  );
};

export default PropertiesTable;
