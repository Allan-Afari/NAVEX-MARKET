import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Building2, MapPin, Star, Plus, X, TrendingUp, Filter,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import VerifiedBadge from "@/components/VerifiedBadge";
import ErrorDisplay from "@/components/ErrorDisplay";
import FormFieldError from "@/components/FormFieldError";
import DealQualityScoreDisplay from "@/components/DealQualityScoreDisplay";
import DealSearchWithFilters from "@/components/DealSearchWithFilters";
import { ValidationRules } from "@/lib/validation";
import { checkComplianceOnDealPost } from "@/lib/complianceWorkflow";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  sector: string | null;
  location: string | null;
  funding_amount: number | null;
  funding_type: string;
  expected_return: string | null;
  stage: string;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
}

interface MarketplaceFilters {
  search: string;
  industry: string;
  rangeIndex: number;
  sortBy: string;
}

const PAGE_SIZE = 12;
const INDUSTRIES = ["Technology", "Agriculture", "Healthcare", "Real Estate", "Manufacturing", "Retail", "Energy", "Education", "Finance"];
const FUNDING_TYPES = ["equity", "loan", "revenue_share", "grant"];
const FUNDING_RANGES = [
  { label: "Any amount", min: 0, max: Infinity },
  { label: "Under GH₵10K", min: 0, max: 10000 },
  { label: "GH₵10K – 100K", min: 10000, max: 100000 },
  { label: "GH₵100K – 1M", min: 100000, max: 1000000 },
  { label: "Over GH₵1M", min: 1000000, max: Infinity },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "funding_desc", label: "Funding amount: high to low" },
  { value: "funding_asc", label: "Funding amount: low to high" },
  { value: "featured", label: "Featured first" },
  { value: "verified", label: "Verified first" },
];

const fetchOpportunities = async ({ pageParam = 0, queryKey }: { pageParam?: number; queryKey: [string, MarketplaceFilters] }) => {
  const [, filters] = queryKey;
  const { search, industry, rangeIndex, sortBy } = filters;
  const range = FUNDING_RANGES[rangeIndex];

  let query = supabase
    .from("deals")
    .select("*")
    .eq("is_removed", false)
    .range(pageParam, pageParam + PAGE_SIZE - 1);

  const filterClauses: string[] = [];

  if (search) {
    const term = `%${search.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    filterClauses.push(`title.ilike.${term},industry.ilike.${term},sector.ilike.${term},location.ilike.${term}`);
  }

  if (industry) {
    filterClauses.push(`industry.eq.${industry},sector.eq.${industry}`);
  }

  if (filterClauses.length > 0) {
    query = query.or(filterClauses.join(","));
  }

  if (range.min > 0 && range.max < Infinity) {
    query = query.gte("funding_amount", range.min).lte("funding_amount", range.max);
  } else if (range.min > 0) {
    query = query.gte("funding_amount", range.min);
  }

  switch (sortBy) {
    case "funding_asc":
      query = query.order("funding_amount", { ascending: true, nulls: "last" });
      break;
    case "funding_desc":
      query = query.order("funding_amount", { ascending: false, nulls: "last" });
      break;
    case "featured":
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error("Marketplace fetch error:", error);
    throw error;
  }

  return data as Opportunity[];
};


const Marketplace = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("investor");
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", industry: "", location: "", funding_amount: "", funding_type: "equity", expected_return: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<MarketplaceFilters>({ search: "", industry: "", rangeIndex: 0, sortBy: "newest" });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setRole(session?.user?.user_metadata?.role || "investor");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null);
      setRole(session?.user?.user_metadata?.role || "investor");
    });
    return () => subscription.unsubscribe();
  }, []);

  const {
    data,
    error,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["opportunities", filters],
    queryFn: fetchOpportunities,
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined),
    keepPreviousData: true,
  });

  const allOpportunities = useMemo(() => data?.pages.flat() ?? [], [data]);

  const creatorIds = useMemo(
    () => [...new Set(allOpportunities.map((deal) => deal.created_by).filter(Boolean))] as string[],
    [allOpportunities]
  );

  const { data: verifiedProfiles } = useQuery({
    queryKey: ["verifiedCreators", creatorIds],
    queryFn: async () => {
      if (!creatorIds.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", creatorIds)
        .eq("verification_status", "verified");
      if (profileError) throw profileError;
      return profiles || [];
    },
    enabled: creatorIds.length > 0,
  });

  const verifiedCreators = useMemo(
    () => new Set((verifiedProfiles || []).map((profile: { id: string }) => profile.id)),
    [verifiedProfiles]
  );

  const sortedOpportunities = useMemo(() => {
    const items = [...allOpportunities];
    switch (filters.sortBy) {
      case "verified":
        return items.sort((a, b) => {
          const aVerified = a.created_by && verifiedCreators.has(a.created_by) ? 1 : 0;
          const bVerified = b.created_by && verifiedCreators.has(b.created_by) ? 1 : 0;
          if (aVerified !== bVerified) return bVerified - aVerified;
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "featured":
        return items.sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "funding_asc":
        return items.sort((a, b) => (a.funding_amount ?? Infinity) - (b.funding_amount ?? Infinity));
      case "funding_desc":
        return items.sort((a, b) => (b.funding_amount ?? 0) - (a.funding_amount ?? 0));
      default:
        return items;
    }
  }, [allOpportunities, filters.sortBy, verifiedCreators]);

  const isBusiness = !!user && role === "business";

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Use standardized validation rules
    if (ValidationRules.title(form.title)) errors.title = ValidationRules.title(form.title)!;
    if (!form.industry) errors.industry = "Industry is required.";
    if (ValidationRules.location(form.location)) errors.location = ValidationRules.location(form.location)!;
    if (ValidationRules.amount(form.funding_amount)) errors.funding_amount = ValidationRules.amount(form.funding_amount)!;
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to post an opportunity.");
      if (!validateForm()) throw new Error("Please fix the highlighted fields.");

      const { data: created, error: insertError } = await supabase
        .from("deals")
        .insert({
          title: form.title.trim(),
          description: form.description || null,
          industry: form.industry || null,
          sector: form.industry || null,
          location: form.location || null,
          funding_amount: Number(form.funding_amount),
          funding_type: form.funding_type,
          expected_return: form.expected_return || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!created) throw new Error("Unable to save opportunity.");

      await supabase.from("deal_activity_log").insert({
        deal_id: created.id,
        user_id: user.id,
        action: "deal_created",
        details: `Created opportunity: ${created.title}`,
      });

      // Trigger automatic compliance check on deal post
      await checkComplianceOnDealPost(
        user.id,
        created.id,
        Number(form.funding_amount) || undefined
      ).catch((err) => {
        console.error("Compliance check failed for deal post:", err);
      });

      return created as Opportunity;
    },
    onSuccess: async () => {
      toast.success("Investment opportunity published!");
      await queryClient.invalidateQueries(["opportunities"]);
      setShowCreate(false);
      setForm({ title: "", description: "", industry: "", location: "", funding_amount: "", funding_type: "equity", expected_return: "" });
      setFormErrors({});
    },
    onError: (err) => {
      const error = err as Error;
      toast.error(error.message || "Could not publish opportunity.");
    },
  });

  const handleCreate = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    createMutation.mutate();
  };

  const formatAmount = (n: number | null) => n ? `GH₵${n.toLocaleString()}` : "Negotiable";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Investment Opportunities" description="Browse verified investment opportunities on Navex Market" />
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Investment Opportunities</h1>
            <p className="text-muted-foreground text-sm">
              {isBusiness ? "Post and manage your funding opportunities" : "Discover verified businesses seeking investment"}
            </p>
          </div>
          {isBusiness && (
            <Button className="gradient-primary text-primary-foreground hover:opacity-90" onClick={() => user ? setShowCreate(true) : navigate("/login") }>
              <Plus className="w-4 h-4 mr-2" /> Post Opportunity
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced Search
          </Button>
        </div>

        {showCreate && isBusiness && (
          <div className="glass rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Investment Opportunity</h2>
              <Button size="icon" variant="ghost" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Series A for Agritech Startup"
                  className="bg-muted/50"
                  aria-invalid={!!formErrors.title}
                />
                <FormFieldError error={formErrors.title} touched={true} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Industry *</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                  className="w-full rounded-md bg-muted/50 border border-border px-3 py-2 text-sm"
                  aria-invalid={!!formErrors.industry}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <FormFieldError error={formErrors.industry} touched={true} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Location *</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Accra, Ghana"
                  className="bg-muted/50"
                  aria-invalid={!!formErrors.location}
                />
                <FormFieldError error={formErrors.location} touched={true} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Funding Required (GH₵) *</label>
                <Input
                  type="number"
                  value={form.funding_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, funding_amount: e.target.value }))}
                  placeholder="e.g., 50000"
                  className="bg-muted/50"
                  aria-invalid={!!formErrors.funding_amount}
                />
                <FormFieldError error={formErrors.funding_amount} touched={true} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Funding Type</label>
                <select
                  value={form.funding_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, funding_type: e.target.value }))}
                  className="w-full rounded-md bg-muted/50 border border-border px-3 py-2 text-sm"
                >
                  {FUNDING_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Expected Return (optional)</label>
                <Input
                  value={form.expected_return}
                  onChange={(e) => setForm((prev) => ({ ...prev, expected_return: e.target.value }))}
                  placeholder="e.g., 20% IRR over 3 years"
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your opportunity in detail..."
                className="bg-muted/50"
                rows={4}
              />
            </div>
            <Button className="gradient-primary text-primary-foreground" onClick={handleCreate} disabled={createMutation.isLoading}>
              <Plus className="w-4 h-4 mr-2" /> {createMutation.isLoading ? "Publishing..." : "Publish Opportunity"}
            </Button>
          </div>
        )}

        {showAdvancedSearch && (
          <div className="mb-6">
            <DealSearchWithFilters onSelectDeal={(dealId) => navigate(`/deals/${dealId}`)} />
          </div>
        )}

        <div className="gap-3 mb-6 flex flex-col">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, industry, or location..."
              className="pl-10 bg-secondary border-border w-full"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Mobile filter toggle */}
          <div className="md:hidden flex gap-2">
            <Button
              size="sm"
              variant={showFilters ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filters {showFilters ? "−" : "+"}
            </Button>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="flex-1 rounded-md bg-secondary border border-border px-2 py-2 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Filters: Desktop */}
          <div className="hidden md:grid md:grid-cols-3 gap-3">
            <select
              value={filters.industry}
              onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
              className="rounded-md bg-secondary border border-border px-3 py-2 text-sm"
            >
              <option value="">All industries</option>
              {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.rangeIndex}
              onChange={(e) => setFilters((prev) => ({ ...prev, rangeIndex: Number(e.target.value) }))}
              className="rounded-md bg-secondary border border-border px-3 py-2 text-sm"
            >
              {FUNDING_RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="rounded-md bg-secondary border border-border px-3 py-2 text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Filters: Mobile collapsible */}
          {showFilters && (
            <div className="md:hidden grid grid-cols-1 gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
              <div>
                <label className="text-xs font-medium mb-1 block">Industry</label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters((prev) => ({ ...prev, industry: e.target.value }))}
                  className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs"
                >
                  <option value="">All industries</option>
                  {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Funding Range</label>
                <select
                  value={filters.rangeIndex}
                  onChange={(e) => setFilters((prev) => ({ ...prev, rangeIndex: Number(e.target.value) }))}
                  className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-xs"
                >
                  {FUNDING_RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <ErrorDisplay
            message="Unable to load opportunities. Please check your connection and try again."
            onRetry={() => refetch()}
            showRetry={true}
          />
        ) : isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="glass rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded mb-4" />
                <div className="h-3 bg-muted rounded mb-3" />
                <div className="h-3 bg-muted rounded mb-6" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedOpportunities.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {allOpportunities.length === 0 ? "Be the first to post an investment opportunity." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedOpportunities.map((opp) => {
                const industry = opp.industry || opp.sector;
                const isVerified = opp.created_by ? verifiedCreators.has(opp.created_by) : false;
                return (
                  <button
                    key={opp.id}
                    onClick={() => navigate(`/deals/${opp.id}`)}
                    className="glass rounded-xl p-5 text-left hover:bg-muted/20 transition-all hover:glow-primary group"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {isVerified && <VerifiedBadge />}
                      {opp.is_featured && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                          <Star className="w-3 h-3 fill-warning" /> Featured
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{opp.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opp.description || "No description"}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {industry && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          <Building2 className="w-2.5 h-2.5" /> {industry}
                        </span>
                      )}
                      {opp.location && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          <MapPin className="w-2.5 h-2.5" /> {opp.location}
                        </span>
                      )}
                      {opp.expected_return && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          <TrendingUp className="w-2.5 h-2.5" /> {opp.expected_return}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatAmount(opp.funding_amount)}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{opp.funding_type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <DealQualityScoreDisplay dealId={opp.id} compact={true} />
                    </div>
                  </button>
                );
              })}
            </div>

            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button onClick={() => fetchNextPage()} disabled={isFetching}>
                  {isFetching ? "Loading more..." : "Load more opportunities"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
