import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import { searchDeals, getFilterOptions, trackDealView } from "@/lib/dealSearch";
import type { DealSearchFilters } from "@/lib/dealSearch";

interface DealSearchWithFiltersProps {
  onSelectDeal?: (dealId: string) => void;
}

const DealSearchWithFilters = ({
  onSelectDeal,
}: DealSearchWithFiltersProps) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<DealSearchFilters>({});
  const [results, setResults] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    stages: [],
    industries: [],
    locations: [],
    dealTypes: [],
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const options = await getFilterOptions();
    setFilterOptions(options);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const searchFilters: DealSearchFilters = {
        query,
        ...filters,
        limit: 20,
      };

      const result = await searchDeals(searchFilters);
      setResults(result.deals);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDeal = async (dealId: string) => {
    await trackDealView(dealId);
    onSelectDeal?.(dealId);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuery("");
    setResults([]);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deal Discovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Box */}
          <div className="flex gap-2">
            <Input
              placeholder="Search deals by title or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} size="icon">
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0"
                >
                  Clear All
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Stage Filter */}
                <div>
                  <label className="text-sm font-medium block mb-2">Stage</label>
                  <Select
                    value={filters.stage?.[0] || ""}
                    onValueChange={(value) =>
                      handleFilterChange("stage", value ? [value] : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any stage</SelectItem>
                      {filterOptions.stages.map((stage: string) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Industry
                  </label>
                  <Select
                    value={filters.industry?.[0] || ""}
                    onValueChange={(value) =>
                      handleFilterChange("industry", value ? [value] : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any industry</SelectItem>
                      {filterOptions.industries.map((industry: string) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Location
                  </label>
                  <Select
                    value={filters.location?.[0] || ""}
                    onValueChange={(value) =>
                      handleFilterChange("location", value ? [value] : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any location</SelectItem>
                      {filterOptions.locations.map((location: string) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Min Amount ($)
                  </label>
                  <Input
                    type="number"
                    placeholder="Minimum amount"
                    value={filters.minAmount || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "minAmount",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((deal) => (
              <div
                key={deal.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleSelectDeal(deal.id)}
              >
                <div className="flex-1">
                  <h4 className="font-semibold">{deal.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {deal.description}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{deal.stage}</Badge>
                    <Badge variant="outline">{deal.industry}</Badge>
                    {deal.target_raise && (
                      <Badge variant="outline">
                        ${(deal.target_raise / 1000000).toFixed(1)}M
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Searching deals...
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && results.length === 0 && (query || activeFilterCount > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              No deals found. Try adjusting your filters.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DealSearchWithFilters;
