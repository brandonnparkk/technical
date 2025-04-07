import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, Link } from "@mui/material";
import { Property } from "../types/Property";

interface YearData {
  year: number;
  count: number;
  isSelected: boolean;
}

interface YearBuiltGraphProps {
  properties: Property[];
  onYearClick: (year: number | null) => void;
  onClearClick: (year: number | null) => void;
  selectedYear: number | null;
}

const YearBuiltGraph: React.FC<YearBuiltGraphProps> = ({
  properties,
  onYearClick,
  onClearClick,
  selectedYear,
}) => {
  const processYearData = (): YearData[] => {
    const yearCounts: Record<number, number> = {};

    properties.forEach((property) => {
      const year = property.year_built;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    return Object.entries(yearCounts)
      .map(([year, count]) => ({
        year: parseInt(year),
        count,
        isSelected: selectedYear === parseInt(year),
      }))
      .sort((a, b) => a.year - b.year);
  };

  const yearData = processYearData();

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      const clickedYear = data.activePayload[0].payload.year;
      onYearClick(clickedYear === selectedYear ? null : clickedYear);
    }
  };

  const handleClearClick = () => {
    if (selectedYear) {
      onClearClick(null);
    }
  };

  const getFillOpacity = (data: { payload: YearData }) => {
    return data.payload.isSelected ? 1 : 0.6;
  };

  const formatTooltip = (value: number, name: string, props: any) => {
    return [`${value} properties`, "Count"];
  };

  return (
    <Box sx={{ mb: 4, p: 2, border: "1px solid #eee", borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        Properties by Year Built
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={yearData} onClick={handleBarClick}>
          <XAxis
            dataKey="year"
            label={{
              value: "Year Built",
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            label={{ value: "Properties", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Bar
            dataKey="count"
            fill="#8884d8"
            style={{ cursor: "pointer" }}
            fillOpacity={getFillOpacity as any}
          />
        </BarChart>
      </ResponsiveContainer>
      {selectedYear && (
        <Box
          sx={{
            mt: 1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" component="div">
            Showing properties built in{" "}
            <Box component="span" sx={{ fontWeight: "bold" }}>
              {selectedYear}
            </Box>
            .
          </Typography>
          <Link
            component="button"
            variant="body2"
            onClick={handleClearClick}
            sx={{
              color: "primary.main",
              fontWeight: "bold",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          >
            Click to clear filter
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default YearBuiltGraph;
