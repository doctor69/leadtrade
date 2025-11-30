import { useState, useEffect } from 'react';
import { DataTable } from "./ui/datatable";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ChevronDown, ChevronRight, Table, Grid3X3 } from 'lucide-react';

interface DataTableViewProps {
  columns: any[];
  data: any[];
  mobileCardRenderer?: (item: any, index: number) => React.ReactNode;
  title?: string;
  description?: string;
}

export const DataTableView = ({ 
  columns, 
  data, 
  mobileCardRenderer,
  title,
  description 
}: DataTableViewProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !mobileCardRenderer) {
        setViewMode('table'); // Force table view if no card renderer
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileCardRenderer]);

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Default mobile card renderer if none provided
  const defaultMobileCardRenderer = (item: any, index: number) => {
    const isExpanded = expandedRows.has(index);
    const primaryColumns = columns.slice(0, 2); // Show first 2 columns by default
    const secondaryColumns = columns.slice(2);

    return (
      <Card key={index} className="mb-3">
        <CardContent className="p-4">
          {/* Primary info always visible */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              {primaryColumns.map((column, colIndex) => (
                <div key={colIndex} className="mb-1">
                  {typeof column.cell === 'function' 
                    ? column.cell({ row: { original: item, getValue: (key: string) => item[key] } })
                    : item[column.accessorKey]
                  }
                </div>
              ))}
            </div>
            {secondaryColumns.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleRowExpansion(index)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Secondary info - collapsible */}
          {isExpanded && secondaryColumns.length > 0 && (
            <div className="pt-2 border-t space-y-2">
              {secondaryColumns.map((column, colIndex) => (
                <div key={colIndex} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">
                    {column.header}:
                  </span>
                  <div className="text-sm">
                    {typeof column.cell === 'function' 
                      ? column.cell({ row: { original: item, getValue: (key: string) => item[key] } })
                      : item[column.accessorKey]
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const cardRenderer = mobileCardRenderer || defaultMobileCardRenderer;

  return (
    <div className="space-y-4">
      {/* Header with view mode toggle */}
      {(title || description || (mobileCardRenderer && !isMobile)) && (
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          
          {/* View mode toggle - only show if card renderer is available and not mobile */}
          {mobileCardRenderer && !isMobile && (
            <div className="flex space-x-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center space-x-1"
              >
                <Table className="h-3 w-3" />
                <span>Table</span>
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="flex items-center space-x-1"
              >
                <Grid3X3 className="h-3 w-3" />
                <span>Cards</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' || !mobileCardRenderer ? (
        <div className={isMobile ? 'overflow-x-auto' : ''}>
          <DataTable columns={columns} data={data} />
          
          {/* Mobile scroll hint */}
          {isMobile && data.length > 0 && (
            <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 mr-1" />
              Scroll horizontally to see more columns
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => cardRenderer(item, index))}
          
          {data.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center h-24 text-center text-muted-foreground">
                No data available
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
