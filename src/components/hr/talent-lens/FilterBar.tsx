import React from 'react';
import { Input, Select, Space, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

interface FilterBarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  fitScoreFilter: string;
  onFitScoreFilterChange: (value: string) => void;
  onReset: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchText,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  fitScoreFilter,
  onFitScoreFilterChange,
  onReset,
}) => {
  return (
    <Space wrap style={{ width: '100%', marginBottom: 16 }}>
      <Search
        placeholder="Search by name, skills, company..."
        allowClear
        enterButton={<SearchOutlined />}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 300 }}
      />
      
      <Select
        placeholder="Filter by Status"
        value={statusFilter}
        onChange={onStatusFilterChange}
        style={{ width: 150 }}
        allowClear
      >
        <Option value="all">All Status</Option>
        <Option value="new">New</Option>
        <Option value="reviewing">Reviewing</Option>
        <Option value="shortlisted">Shortlisted</Option>
        <Option value="rejected">Rejected</Option>
        <Option value="offered">Offered</Option>
      </Select>

      <Select
        placeholder="Filter by Fit Score"
        value={fitScoreFilter}
        onChange={onFitScoreFilterChange}
        style={{ width: 180 }}
        allowClear
      >
        <Option value="all">All Scores</Option>
        <Option value="excellent">Excellent (80-100)</Option>
        <Option value="good">Good (60-79)</Option>
        <Option value="moderate">Moderate (40-59)</Option>
        <Option value="poor">Poor (0-39)</Option>
      </Select>

      <Button icon={<ReloadOutlined />} onClick={onReset}>
        Reset Filters
      </Button>
    </Space>
  );
};

export default FilterBar;








